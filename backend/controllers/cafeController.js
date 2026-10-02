const DEFAULT_RADIUS_METERS = 10000;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85';
const CACHE_FRESH_MS = 5 * 60 * 1000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const nearbyCafeCache = new Map();
const cacheRefreshes = new Set();

function getNearbyCafeCacheKey(lat, lng, radius) {
  return `${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}:${radius}`;
}

function cacheNearbyCafes(key, cafes) {
  nearbyCafeCache.delete(key);
  nearbyCafeCache.set(key, { cafes, cachedAt: Date.now() });

  while (nearbyCafeCache.size > 200) {
    nearbyCafeCache.delete(nearbyCafeCache.keys().next().value);
  }
}

function markCafesCached(cafes) {
  return cafes.map((cafe) => ({ ...cafe, source: 'cached' }));
}

function getOverpassEndpoints() {
  const configured = (process.env.OVERPASS_URLS || process.env.OVERPASS_URL || '')
    .split(',')
    .map((endpoint) => endpoint.trim())
    .filter(Boolean);

  const urls = [
    ...configured,
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ];

  return [...new Set(urls)].filter(Boolean);
}

const FALLBACK_CAFES = [
  {
    id: 'osm-node-9773250038',
    name: 'Cafe Corner',
    address: '466 Mayor M.S. Jaldon Street, Armor Village, Santa Maria, Zamboanga City',
    coordinates: { lat: 6.915796, lng: 122.0719364 },
    rating: 4.5,
    reviewCount: 78,
    wifiSpeed: 'Fast',
    wifiCategory: 'fast',
    outlets: 'Plentiful',
    noiseLevel: 'Quiet',
    coffeeStyles: ['Espresso', 'Cold Brew'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'outlets', 'quiet'],
    isOpen: true,
    tagline: 'Fallback café list while the live map feed is offline.',
  },
  {
    id: 'osm-node-4916163222',
    name: 'Villagio Cafe',
    address: 'La Purisima Street, Santa Catalina, Zamboanga City',
    coordinates: { lat: 6.9066352, lng: 122.0762909 },
    rating: 4.7,
    reviewCount: 101,
    wifiSpeed: 'Fast',
    wifiCategory: 'fast',
    outlets: 'Plentiful',
    noiseLevel: 'Balanced',
    coffeeStyles: ['Espresso', 'Matcha'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'outlets', 'food'],
    isOpen: true,
    tagline: 'Popular for study sessions and good espresso.',
  },
  {
    id: 'osm-node-14056402891',
    name: 'Wakahers Cafe',
    address: 'Governor Camins Avenue, Santa Maria, Zamboanga City',
    coordinates: { lat: 6.920166, lng: 122.068441 },
    rating: 4.4,
    reviewCount: 61,
    wifiSpeed: 'Reliable',
    wifiCategory: 'fast',
    outlets: 'Some',
    noiseLevel: 'Moderate',
    coffeeStyles: ['Cold Brew'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'parking'],
    isOpen: true,
    tagline: 'A casual stop with dependable Wi-Fi.',
  },
  {
    id: 'osm-way-1528157745',
    name: "Lorain's Café",
    address: 'Governor Camins Avenue, Santa Maria, Zamboanga City',
    coordinates: { lat: 6.9211287, lng: 122.0755422 },
    rating: 4.8,
    reviewCount: 112,
    wifiSpeed: 'Fast',
    wifiCategory: 'fast',
    outlets: 'Plentiful',
    noiseLevel: 'Quiet',
    coffeeStyles: ['Espresso', 'Cold Brew'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'outlets', 'quiet'],
    isOpen: true,
    tagline: 'One of the best quiet work spots in the area.',
  },
  {
    id: 'osm-node-13227091364',
    name: 'Dwntwn Café',
    address: 'N.S. Valderosa Street, Santa Catalina, Zamboanga City',
    coordinates: { lat: 6.9027396, lng: 122.0785779 },
    rating: 4.3,
    reviewCount: 54,
    wifiSpeed: 'Moderate',
    wifiCategory: 'standard',
    outlets: 'Some',
    noiseLevel: 'Busy',
    coffeeStyles: ['Espresso'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'food'],
    isOpen: null,
    tagline: 'Good for quick coffee breaks in the city.',
  },
  {
    id: 'osm-node-13926659545',
    name: 'HAYA Café',
    address: 'Veterans Avenue, Santa Catalina, Zamboanga City',
    coordinates: { lat: 6.9150392, lng: 122.0793581 },
    rating: 4.6,
    reviewCount: 88,
    wifiSpeed: 'Fast',
    wifiCategory: 'fast',
    outlets: 'Plentiful',
    noiseLevel: 'Quiet',
    coffeeStyles: ['Matcha', 'Cold Brew'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'outlets', 'quiet'],
    isOpen: true,
    tagline: 'Nice for focused work and specialty drinks.',
  },
  {
    id: 'osm-node-13974830026',
    name: 'Starbucks',
    address: 'Mayor Vitaliano D. Agan Avenue, Santa Maria, Zamboanga City',
    coordinates: { lat: 6.9178122, lng: 122.0758447 },
    rating: 4.5,
    reviewCount: 144,
    wifiSpeed: 'Fast',
    wifiCategory: 'fast',
    outlets: 'Plentiful',
    noiseLevel: 'Moderate',
    coffeeStyles: ['Espresso', 'Cold Brew'],
    image: FALLBACK_IMAGE,
    amenities: ['wifi', 'outlets', 'food'],
    isOpen: true,
    tagline: 'Reliable choice with broad amenities.',
  },
];

function haversineDistanceInMeters(first, second) {
  const earthRadius = 6371000;
  const latitudeDifference = ((second.lat - first.lat) * Math.PI) / 180;
  const longitudeDifference = ((second.lng - first.lng) * Math.PI) / 180;
  const firstLat = (first.lat * Math.PI) / 180;
  const secondLat = (second.lat * Math.PI) / 180;
  const value = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function normalizeOverpassCafe(element) {
  const tags = element?.tags || {};
  const lat = Number(element?.lat ?? element?.center?.lat);
  const lng = Number(element?.lon ?? element?.center?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const displayName = (() => {
    const candidate = [tags.name, tags.brand, tags.operator, tags['shop:name']]
      .find((value) => typeof value === 'string' && value.trim() && !/^cafe$/i.test(value.trim()));

    if (candidate) return candidate.trim();
    if (tags.name && /^cafe$/i.test(tags.name.trim())) return 'Local Cafe';
    return 'Local Cafe';
  })();

  const addressParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:unit'],
    tags['addr:city'],
  ].filter(Boolean);

  const formattedAddress = addressParts.length
    ? addressParts.join(' ').trim()
    : [tags['brand'], tags['name'], tags['addr:city']]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Address not provided';

  const rawAmenities = Object.entries(tags).map(([key, value]) => `${key}=${value}`);

  return {
    id: `osm-${element.type}-${element.id}`,
    name: displayName,
    tagline: tags.brand ? 'Live café listing from OpenStreetMap.' : 'Nearby café from OpenStreetMap.',
    address: formattedAddress,
    distance: '—',
    isOpen: null,
    rating: null,
    reviewCount: 0,
    wifiSpeed: tags.internet === 'yes' ? 'Likely available' : 'Not listed',
    wifiCategory: tags.internet === 'yes' ? 'fast' : 'unknown',
    outlets: tags.socket === 'yes' || tags['socket:outlets'] ? 'Plentiful' : 'Not listed',
    noiseLevel: tags.noise === 'quiet' ? 'Quiet' : tags.noise === 'loud' ? 'Busy' : 'Not listed',
    coffeeStyles: [],
    image: FALLBACK_IMAGE,
    amenities: rawAmenities.slice(0, 8),
    coordinates: { lat, lng },
    peakHours: [],
    reviews: [],
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    source: 'overpass',
  };
}

function buildFallbackNearbyCafes(lat, lng, radius = DEFAULT_RADIUS_METERS) {
  return FALLBACK_CAFES
    .map((cafe) => {
      const distance = haversineDistanceInMeters({ lat, lng }, cafe.coordinates);
      return {
        ...cafe,
        distance: distance < 100 ? '<0.1 km' : `${(distance / 1000).toFixed(1)} km`,
      };
    })
    .filter((cafe) => haversineDistanceInMeters({ lat, lng }, cafe.coordinates) <= radius);
}

async function fetchNearbyFromOverpass(lat, lng, radius) {
  const deadline = Date.now() + 10000;
  const query = `[out:json][timeout:10];(
    node["amenity"="cafe"](around:${Number(radius)},${lat},${lng});
    way["amenity"="cafe"](around:${Number(radius)},${lat},${lng});
    relation["amenity"="cafe"](around:${Number(radius)},${lat},${lng});
  );
  out center tags;`;

  let lastError = null;

  for (const endpoint of getOverpassEndpoints()) {
    const requestAttempts = [
      {
        label: 'POST form body',
        request: async (timeoutMs) => fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'CafeRadar/1.0',
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(timeoutMs),
        }),
      },
      {
        label: 'GET query string',
        request: async (timeoutMs) => fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CafeRadar/1.0',
          },
          signal: AbortSignal.timeout(timeoutMs),
        }),
      },
    ];

    for (const attempt of requestAttempts) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;

      try {
        const response = await attempt.request(Math.min(5000, remainingMs));

        if (!response.ok) {
          throw new Error(`Overpass endpoint responded with ${response.status}.`);
        }

        const data = await response.json();
        const elements = Array.isArray(data.elements) ? data.elements : [];

        return elements
          .map((element) => normalizeOverpassCafe(element))
          .filter(Boolean)
          .sort((first, second) => {
            const firstDistance = haversineDistanceInMeters({ lat, lng }, first.coordinates);
            const secondDistance = haversineDistanceInMeters({ lat, lng }, second.coordinates);
            return firstDistance - secondDistance;
          });
      } catch (error) {
        lastError = error;
        console.warn(`Overpass request failed for ${endpoint} using ${attempt.label}:`, error.message || error);
      }
    }

    if (Date.now() >= deadline) break;
  }

  throw lastError || new Error('All Overpass endpoints failed.');
}

export async function getNearbyCafes(req, res) {
  const { lat, lng, radius } = req.location;
  const searchRadius = radius ?? DEFAULT_RADIUS_METERS;
  const cacheKey = getNearbyCafeCacheKey(lat, lng, searchRadius);
  const cached = nearbyCafeCache.get(cacheKey);
  const cacheAge = cached ? Date.now() - cached.cachedAt : Infinity;

  if (cached && cacheAge <= CACHE_FRESH_MS) {
    return res.status(200).json({ source: 'cache', cafes: markCafesCached(cached.cafes), location: { lat, lng }, radius: searchRadius });
  }

  if (cached && cacheAge <= CACHE_MAX_AGE_MS) {
    if (!cacheRefreshes.has(cacheKey)) {
      cacheRefreshes.add(cacheKey);
      fetchNearbyFromOverpass(lat, lng, searchRadius)
        .then((places) => {
          if (places.length > 0) cacheNearbyCafes(cacheKey, places);
        })
        .catch((error) => {
          console.warn('Background Overpass refresh failed:', error.message || error);
        })
        .finally(() => cacheRefreshes.delete(cacheKey));
    }

    return res.status(200).json({ source: 'stale-cache', cafes: markCafesCached(cached.cafes), location: { lat, lng }, radius: searchRadius });
  }

  try {
    const places = await fetchNearbyFromOverpass(lat, lng, searchRadius);
    if (places && places.length > 0) {
      cacheNearbyCafes(cacheKey, places);
      return res.status(200).json({ source: 'overpass', cafes: places, location: { lat, lng }, radius: searchRadius });
    }

    const fallbackCafes = buildFallbackNearbyCafes(lat, lng, searchRadius);
    return res.status(200).json({ source: 'fallback', cafes: fallbackCafes, location: { lat, lng }, radius: searchRadius });
  } catch (error) {
    const fallbackCafes = buildFallbackNearbyCafes(lat, lng, searchRadius);
    console.warn('Overpass API failed, using fallback cafe dataset:', error.message || error);
    return res.status(200).json({ source: 'fallback', cafes: fallbackCafes, location: { lat, lng }, radius: searchRadius });
  }
}
