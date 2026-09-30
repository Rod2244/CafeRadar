export function validateCafeLocation(req, res, next) {
  const body = req.body || {};
  const lat = Number(body.lat ?? body.latitude);
  const lng = Number(body.lng ?? body.longitude);
  const radius = Number(body.radius ?? 10000);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90.' });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Longitude must be between -180 and 180.' });
  }

  if (!Number.isFinite(radius) || radius <= 0) {
    return res.status(400).json({ error: 'Radius must be a positive number.' });
  }

  req.location = {
    lat,
    lng,
    radius: Math.min(Math.max(radius, 500), 50000),
  };

  return next();
}
