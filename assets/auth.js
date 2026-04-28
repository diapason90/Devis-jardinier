// Authentification ChrisGarden Pro (localStorage + sessionStorage)

const AUTH_KEY     = 'chrisgarden_auth';
const SESSION_KEY  = 'chrisgarden_session';
const DEFAULT_LOGIN    = 'admin';
const DEFAULT_PASSWORD = 'chrisgarden2026';

function getCredentials() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : { login: DEFAULT_LOGIN, password: DEFAULT_PASSWORD };
  } catch {
    return { login: DEFAULT_LOGIN, password: DEFAULT_PASSWORD };
  }
}

function setCredentials(login, password) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ login, password }));
}

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

// Redirige vers login.html si non authentifié
function checkAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
  }
}

// Retourne true si les identifiants sont corrects
function doLogin(login, password) {
  const creds = getCredentials();
  if (login.trim() === creds.login && password === creds.password) {
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  }
  return false;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}
