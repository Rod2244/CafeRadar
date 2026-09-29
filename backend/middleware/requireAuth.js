import { createSupabaseClient } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication is required.' });
  }

  try {
    const { data, error } = await createSupabaseClient().auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired.' });
    req.user = data.user;
    req.authToken = token;
    return next();
  } catch (error) {
    if (error?.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(503).json({ error: error.message });
    }
    return res.status(503).json({ error: 'Authentication service is unavailable.' });
  }
}