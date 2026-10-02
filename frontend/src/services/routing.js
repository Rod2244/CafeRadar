const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchDrivingRoute({ origin, destination, signal }) {
  const coordinates = [
    `${origin.lng},${origin.lat}`,
    `${destination.lng},${destination.lat}`,
  ].join(';');
  const response = await fetch(`${OSRM_BASE_URL}/${coordinates}?overview=full&geometries=geojson&steps=false`, { signal });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 'Ok' || !payload.routes?.[0]) {
    throw new Error(payload.message || 'A driving route could not be found.');
  }

  const route = payload.routes[0];
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}