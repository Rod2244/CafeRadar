import { createSupabaseClient } from '../lib/supabase.js';
import { recordAuthEvent, syncUserProfile } from '../services/authPersistence.js';

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    pending_email: user.new_email || null,
    user_metadata: user.user_metadata,
  };
}

function publicSession(session) {
  if (!session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
  };
}

function sendServiceUnavailable(res, error) {
  if (error?.code === 'SUPABASE_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Authentication service is unavailable.' });
}

async function persistAuthUser(user, req, eventType) {
  const persistenceClient = createSupabaseClient();
  const profileSynced = await syncUserProfile(persistenceClient, user);
  if (profileSynced && eventType) {
    await recordAuthEvent(persistenceClient, req, user, eventType);
  }
}

export async function signUp(req, res) {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const middleInitial = typeof body.middleInitial === 'string' ? body.middleInitial.trim().toUpperCase() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
  }
  if (middleInitial && !/^[A-Z]$/.test(middleInitial)) {
    return res.status(400).json({ error: 'Middle initial must be a single letter.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          middle_initial: middleInitial || null,
          last_name: lastName,
          full_name: [firstName, middleInitial ? `${middleInitial}.` : '', lastName].filter(Boolean).join(' '),
        },
      },
    });

    if (error) return res.status(400).json({ error: error.message });
    if (data.user) {
      await persistAuthUser(data.user, req, 'sign_up');
    }
    return res.status(data.session ? 201 : 202).json({
      user: publicUser(data.user),
      session: publicSession(data.session),
      message: data.session ? 'Account created.' : 'Check your email to confirm your account.',
    });
  } catch (error) {
    return sendServiceUnavailable(res, error);
  }
}

export async function signIn(req, res) {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    await persistAuthUser(data.user, req, 'sign_in');
    return res.status(200).json({ user: publicUser(data.user), session: publicSession(data.session) });
  } catch (error) {
    return sendServiceUnavailable(res, error);
  }
}

export async function refreshSession(req, res) {
  const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
  if (!refreshToken) return res.status(400).json({ error: 'A refresh token is required.' });

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    await persistAuthUser(data.user, req, null);
    return res.status(200).json({ user: publicUser(data.user), session: publicSession(data.session) });
  } catch (error) {
    return sendServiceUnavailable(res, error);
  }
}

export function getCurrentUser(req, res) {
  return persistAuthUser(req.user, req, null)
    .then(() => res.status(200).json({ user: publicUser(req.user) }))
    .catch((error) => sendServiceUnavailable(res, error));
}

export async function updateProfile(req, res) {
  const body = req.body || {};
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const middleName = typeof body.middleName === 'string' ? body.middleName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';

  if (!firstName || !lastName || !email || !refreshToken) {
    return res.status(400).json({ error: 'First name, last name, email, and a session refresh token are required.' });
  }
  if (middleName.length > 100) {
    return res.status(400).json({ error: 'Middle name must be 100 characters or fewer.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    const supabase = createSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: req.authToken,
      refresh_token: refreshToken,
    });
    if (sessionError || !sessionData.session) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const emailChanged = email !== (req.user.email || '').toLowerCase();
    const userMetadata = {
      first_name: firstName,
      middle_name: middleName || null,
      middle_initial: middleName ? middleName[0].toUpperCase() : null,
      last_name: lastName,
      full_name: [firstName, middleName, lastName].filter(Boolean).join(' '),
    };
    const attributes = { data: userMetadata };
    if (emailChanged) attributes.email = email;

    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error) return res.status(400).json({ error: error.message });
    if (!data.user) return res.status(500).json({ error: 'Could not update your profile.' });

    await persistAuthUser(data.user, req, 'profile_update');
    const { data: updatedSession } = await supabase.auth.getSession();
    return res.status(200).json({
      user: publicUser(data.user),
      session: publicSession(updatedSession.session),
      emailChangePending: emailChanged && data.user.email?.toLowerCase() !== email,
    });
  } catch (error) {
    return sendServiceUnavailable(res, error);
  }
}

export async function signOut(req, res) {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.admin.signOut(req.authToken, 'local');
    if (error) return res.status(500).json({ error: 'Could not end the current session.' });
    await recordAuthEvent(createSupabaseClient(), req, req.user, 'sign_out');
    return res.status(200).json({ message: 'Signed out.' });
  } catch (error) {
    return sendServiceUnavailable(res, error);
  }
}