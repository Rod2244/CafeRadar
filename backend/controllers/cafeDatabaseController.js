import { createSupabaseClient } from '../lib/supabase.js';

const DEFAULT_RADIUS_METERS = 10000;
const CHECKIN_LEVELS = new Set(['quiet', 'moderate', 'busy', 'very_busy']);

function formatCafe(row) {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  const distance = row.distance_meters == null ? null : Number(row.distance_meters);
  const amenities = [];

  if (row.has_wifi) amenities.push('Wi-Fi');
  if (row.has_outlets) amenities.push('Power outlets');
  if (row.accepts_gcash) amenities.push('GCash');
  if (row.opening_hours) amenities.push(`Hours: ${row.opening_hours}`);

  return {
    id: row.id,
    osmId: row.osm_id,
    name: row.name,
    tagline: row.business_level
      ? `Community reports this cafe is ${row.business_level.replace('_', ' ')}.`
      : 'Cafe listing from OpenStreetMap. No recent busyness reports.',
    address: row.address || 'Address not provided',
    distance: distance == null ? '—' : distance < 100 ? '<0.1 km' : `${(distance / 1000).toFixed(1)} km`,
    distanceMeters: distance,
    isOpen: null,
    rating: null,
    reviewCount: 0,
    wifiSpeed: row.has_wifi ? 'Available' : 'Not listed',
    wifiCategory: row.has_wifi ? 'available' : 'unknown',
    hasWifi: Boolean(row.has_wifi),
    outlets: row.has_outlets ? 'Available' : 'Not listed',
    hasOutlets: Boolean(row.has_outlets),
    acceptsGcash: Boolean(row.accepts_gcash),
    openingHours: row.opening_hours || null,
    noiseLevel: 'Not listed',
    coffeeStyles: [],
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85',
    amenities,
    coordinates: { lat, lng },
    peakHours: [],
    reviews: [],
    osmUrl: row.osm_id ? `https://www.openstreetmap.org/${row.osm_id}` : null,
    source: 'database',
    busyness: row.business_level || null,
    checkinCount: Number(row.checkin_count) || 0,
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getSavedCafes(req, res) {
  try {
    const { data, error } = await createSupabaseClient()
      .from('user_saved_cafes')
      .select('created_at,cafes(id,osm_id,name,address,latitude,longitude,opening_hours,has_wifi,has_outlets,accepts_gcash)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const cafes = (data || [])
      .map((savedCafe) => savedCafe.cafes)
      .filter(Boolean)
      .map((cafe) => formatCafe({ ...cafe, distance_meters: null }));

    return res.status(200).json({ cafes });
  } catch (error) {
    console.error('Saved cafe lookup failed:', error.message || error);
    return res.status(503).json({ error: 'Could not load your saved cafes.' });
  }
}

export async function setCafeSaved(req, res) {
  const { cafeId } = req.params;
  const { saved } = req.body || {};

  if (!isUuid(cafeId)) return res.status(400).json({ error: 'A valid cafe ID is required.' });
  if (typeof saved !== 'boolean') return res.status(400).json({ error: 'The saved value must be true or false.' });

  try {
    const query = createSupabaseClient().from('user_saved_cafes');
    const result = saved
      ? await query.upsert({ user_id: req.user.id, cafe_id: cafeId, created_at: new Date().toISOString() }, { onConflict: 'user_id,cafe_id' })
      : await query.delete().eq('user_id', req.user.id).eq('cafe_id', cafeId);

    if (result.error) throw result.error;
    return res.status(200).json({ cafeId, saved });
  } catch (error) {
    console.error('Saved cafe update failed:', error.message || error);
    return res.status(503).json({ error: 'Could not update your saved cafes.' });
  }
}

export async function getNearbyCafes(req, res) {
  const { lat, lng, radius = DEFAULT_RADIUS_METERS } = req.location;

  try {
    const { data, error } = await createSupabaseClient().rpc('get_nearby_cafes', {
      user_lat: lat,
      user_lng: lng,
      radius_meters: radius,
    });

    if (error) throw error;

    return res.status(200).json({
      source: 'database',
      cafes: (data || []).map(formatCafe),
      location: { lat, lng },
      radius,
    });
  } catch (error) {
    console.error('Nearby cafe database query failed:', error.message || error);
    return res.status(503).json({ error: 'Cafe data is temporarily unavailable.' });
  }
}

export async function submitCafeCheckin(req, res) {
  const { cafeId } = req.params;
  const { businessLevel } = req.body || {};

  if (!isUuid(cafeId)) {
    return res.status(400).json({ error: 'A valid cafe ID is required.' });
  }
  if (!CHECKIN_LEVELS.has(businessLevel)) {
    return res.status(400).json({ error: 'Choose quiet, moderate, busy, or very busy.' });
  }

  try {
    const supabase = createSupabaseClient();
    const { error: checkinError } = await supabase
      .from('cafe_checkins')
      .upsert({
        cafe_id: cafeId,
        user_id: req.user.id,
        busyness_level: businessLevel,
        created_at: new Date().toISOString(),
      }, { onConflict: 'cafe_id,user_id' });

    if (checkinError) throw checkinError;

    const { data, error } = await supabase.rpc('get_cafe_busyness', { target_cafe_id: cafeId });
    if (error) throw error;

    return res.status(200).json({ checkin: data?.[0] || null });
  } catch (error) {
    console.error('Cafe check-in failed:', error.message || error);
    return res.status(503).json({ error: 'Could not save your cafe check-in.' });
  }
}