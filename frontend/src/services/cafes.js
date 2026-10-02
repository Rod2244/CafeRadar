import { apiUrl } from './api';

export async function fetchNearbyCafes({ lat, lng, radius = 10000, signal }) {
  const response = await fetch(apiUrl('/api/cafes/nearby'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lng, radius }),
    signal,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load nearby cafes.');
  }

  return Array.isArray(payload.cafes) ? payload.cafes : [];
}

export async function submitCafeCheckin({ cafeId, businessLevel, accessToken }) {
  const response = await fetch(apiUrl(`/api/cafes/${encodeURIComponent(cafeId)}/checkins`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ businessLevel }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not save your check-in.');
  return payload.checkin;
}

export async function fetchSavedCafes(accessToken, signal) {
  const response = await fetch(apiUrl('/api/cafes/saved'), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load your saved cafes.');
  return Array.isArray(payload.cafes) ? payload.cafes : [];
}

export async function updateCafeSaved({ cafeId, saved, accessToken }) {
  const response = await fetch(apiUrl(`/api/cafes/${encodeURIComponent(cafeId)}/saved`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ saved }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not update your saved cafes.');
  return payload;
}
