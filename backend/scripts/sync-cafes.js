import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const batchSize = 500;

function getOverpassEndpoints() {
  const configured = (process.env.OVERPASS_URLS || process.env.OVERPASS_URL || '')
    .split(',')
    .map((endpoint) => endpoint.trim())
    .filter(Boolean);

  return [...new Set([
    ...configured,
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ])];
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before syncing cafes.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeCafe(element) {
  const tags = element.tags || {};
  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  const name = tags.name || tags['name:en'] || tags.brand;

  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const address = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter(Boolean).join(' ');
  const socketTags = Object.entries(tags).filter(([key]) => (
    key === 'socket' || key.startsWith('socket:') || key === 'plug'
  ));
  const socketValue = socketTags.map(([, value]) => value).find((value) => value === 'yes' || value === 'no');
  const wifiValue = ['yes', 'wlan'].includes(tags.internet_access) || tags.internet === 'yes'
    ? true
    : tags.internet_access === 'no' || tags.internet === 'no' ? false : null;

  return {
    osm_id: `${element.type}/${element.id}`,
    name: name.trim(),
    address: address || null,
    latitude,
    longitude,
    opening_hours: tags.opening_hours || null,
    has_wifi: wifiValue,
    has_outlets: socketValue === 'yes' ? true : socketValue === 'no' ? false : null,
    accepts_gcash: tags['payment:gcash'] === 'yes' ? true : tags['payment:gcash'] === 'no' ? false : null,
  };
}

async function fetchOverpassData(query) {
  const deadline = Date.now() + 180000;
  let lastError = null;

  for (const endpoint of getOverpassEndpoints()) {
    const requests = [
      {
        label: 'POST',
        run: (timeoutMs) => fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'CafeRadar/1.0',
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(timeoutMs),
        }),
      },
      {
        label: 'GET',
        run: (timeoutMs) => fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'CafeRadar/1.0' },
          signal: AbortSignal.timeout(timeoutMs),
        }),
      },
    ];

    for (const request of requests) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;

      try {
        const response = await request.run(Math.min(100000, remainingMs));
        if (!response.ok) {
          const details = (await response.text()).slice(0, 300);
          throw new Error(`HTTP ${response.status} from ${endpoint} (${request.label})${details ? `: ${details}` : ''}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        console.warn(`Overpass ${request.label} failed for ${endpoint}:`, error.message || error);
      }
    }

    if (Date.now() >= deadline) break;
  }

  throw lastError || new Error('All configured Overpass endpoints failed.');
}

async function syncCafesFromOverpass() {
  const query = `[out:json][timeout:90];
    area["ISO3166-1"="PH"][admin_level=2]->.ph;
    (
      node["amenity"="cafe"](area.ph);
      way["amenity"="cafe"](area.ph);
      relation["amenity"="cafe"](area.ph);
    );
    out center tags;`;

  console.log(`Fetching Philippine cafes from ${getOverpassEndpoints().length} Overpass endpoint(s)...`);
  const data = await fetchOverpassData(query);
  const cafes = (Array.isArray(data.elements) ? data.elements : []).map(normalizeCafe).filter(Boolean);
  console.log(`Upserting ${cafes.length} named cafes in batches of ${batchSize}...`);

  for (let offset = 0; offset < cafes.length; offset += batchSize) {
    const batch = cafes.slice(offset, offset + batchSize);
    const osmIds = batch.map((cafe) => cafe.osm_id);
    const { data: existing, error: lookupError } = await supabase
      .from('cafes')
      .select('osm_id,has_wifi,has_outlets,accepts_gcash')
      .in('osm_id', osmIds);
    if (lookupError) throw new Error(`Could not read existing custom attributes: ${lookupError.message}`);

    const existingByOsmId = new Map((existing || []).map((cafe) => [cafe.osm_id, cafe]));
    const mergedBatch = batch.map((cafe) => {
      const previous = existingByOsmId.get(cafe.osm_id);
      return {
        ...cafe,
        has_wifi: cafe.has_wifi ?? previous?.has_wifi ?? null,
        has_outlets: cafe.has_outlets ?? previous?.has_outlets ?? null,
        accepts_gcash: cafe.accepts_gcash ?? previous?.accepts_gcash ?? null,
      };
    });
    const { error } = await supabase.from('cafes').upsert(mergedBatch, { onConflict: 'osm_id' });
    if (error) throw new Error(`Supabase batch ${Math.floor(offset / batchSize) + 1} failed: ${error.message}`);
    console.log(`Synced ${Math.min(offset + batch.length, cafes.length)} / ${cafes.length}`);
  }

  console.log('Cafe sync complete.');
}

syncCafesFromOverpass().catch((error) => {
  console.error('Cafe sync failed:', error.message || error);
  process.exitCode = 1;
});