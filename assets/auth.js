// Authentification via Supabase Auth (mots de passe hashés, JWT, refresh auto)
// NB : isAuthenticated() est synchrone — lit le token stocké par Supabase JS

const PROJECT_REF = (typeof SUPABASE_URL === 'string')
  ? SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0]
  : '';
const AUTH_TOKEN_KEY = `sb-${PROJECT_REF}-auth-token`;

function getStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function isAuthenticated() {
  const s = getStoredSession();
  if (!s?.access_token) return false;
  // expires_at en secondes Unix
  if (s.expires_at && s.expires_at < Date.now() / 1000) return false;
  return true;
}

function checkAuth() {
  if (!isAuthenticated()) window.location.href = 'login.html';
}

async function doLogin(email, password) {
  if (!sb) return { ok: false, error: 'Supabase non disponible' };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { ok: !error, error: error?.message };
}

async function logout() {
  if (sb) {
    try { await sb.auth.signOut(); } catch (e) { console.warn(e); }
  }
  if (PROJECT_REF) localStorage.removeItem(AUTH_TOKEN_KEY);
  window.location.href = 'login.html';
}

async function updatePassword(newPassword) {
  if (!sb) return { ok: false, error: 'Supabase non disponible' };
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return { ok: !error, error: error?.message };
}

async function getCurrentUser() {
  if (!sb) return null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  } catch { return null; }
}
