import { apiUrl } from './api';

export async function fetchNearbyCafes({ lat, lng, radius = 10000 }) {
  const response = await fetch(apiUrl('/api/cafes/nearby'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lng, radius }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load nearby cafes.');
  }

  return Array.isArray(payload.cafes) ? payload.cafes : [];
}
