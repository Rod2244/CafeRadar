import { apiUrl } from './api';

const SESSION_STORAGE_KEY = 'caferadar.auth.session';

async function request(path, { method = 'GET', body, accessToken } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Authentication request failed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function signUp({ firstName, middleInitial, lastName, email, password }) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { firstName, middleInitial, lastName, email, password },
  });
}

export function signIn({ email, password }) {
  return request('/api/auth/signin', { method: 'POST', body: { email, password } });
}

export async function updateProfile({ firstName, middleName, lastName, email }) {
  const session = getStoredSession();
  if (!session?.access_token || !session?.refresh_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const result = await request('/api/auth/profile', {
    method: 'PUT',
    accessToken: session.access_token,
    body: {
      firstName,
      middleName,
      lastName,
      email,
      refreshToken: session.refresh_token,
    },
  });

  return result;
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function storeSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function restoreSession() {
  const session = getStoredSession();
  if (!session?.access_token) return null;

  try {
    const { user } = await request('/api/auth/me', { accessToken: session.access_token });
    return { user, session };
  } catch (error) {
    if (error.status !== 401) throw error;
    if (!session.refresh_token) {
      clearStoredSession();
      return null;
    }
  }

  try {
    const result = await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refresh_token },
    });
    storeSession(result.session);
    return result;
  } catch (error) {
    if (error.status === 401) clearStoredSession();
    throw error;
  }
}

export function signOut(accessToken) {
  return request('/api/auth/signout', { method: 'POST', accessToken });
}