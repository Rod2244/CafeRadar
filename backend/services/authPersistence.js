export async function syncUserProfile(supabase, user) {
  try {
    const metadata = user.user_metadata || {};
    const fullNameParts = typeof metadata.full_name === 'string'
      ? metadata.full_name.trim().split(/\s+/).filter(Boolean)
      : [];
    const firstName = metadata.first_name || fullNameParts.shift() || user.email?.split('@')[0] || 'CafeRadar';
    const lastName = metadata.last_name || fullNameParts.join(' ') || firstName;

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      email_verified_at: user.email_confirmed_at || null,
      status: user.email_confirmed_at ? 'active' : 'pending',
      first_name: firstName,
      last_name: lastName,
      middle_name: metadata.middle_name || metadata.middle_initial || null,
    }, { onConflict: 'id' });

    if (error) {
      const details = user.email ? error.message.split(user.email).join('[redacted email]') : error.message;
      console.warn('Could not sync Supabase user profile:', error.code || 'unknown error', details);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Could not sync Supabase user profile:', error?.code || 'network error');
    return false;
  }
}

export async function recordAuthEvent(supabase, req, user, eventType) {
  try {
    const { error } = await supabase.from('auth_audit_logs').insert({
      user_id: user.id,
      email: user.email,
      event_type: eventType,
      ip_address: req.ip,
    });

    if (error) console.warn('Could not write auth audit event:', error.code || 'unknown error');
  } catch (error) {
    console.warn('Could not write auth audit event:', error?.code || 'network error');
  }
}