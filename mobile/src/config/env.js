import Constants from 'expo-constants';

// Backend base URL for the app. On a phone this must be the dev machine's LAN
// IP and port, never localhost (that resolves to the phone itself).
//
// Resolution order:
//   1. EXPO_PUBLIC_API_BASE_URL (from .env / build env, inlined by Expo)
//   2. expo.extra.apiBaseUrl (set dynamically by app.config.js from the same var)
//   3. FALLBACK_API_BASE_URL below
//   4. setApiBaseUrl(...) at runtime (the in-app server setting, Phase 3)
const FALLBACK_API_BASE_URL = 'http://192.168.2.18:8080';

function configuredBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
  return normalizeBaseUrl(fromEnv || extra.apiBaseUrl || FALLBACK_API_BASE_URL);
}

let activeBaseUrl = configuredBaseUrl();

export function getApiBaseUrl() {
  return activeBaseUrl;
}

// Runtime override used by the in-app server-URL setting (Phase 3). Returns the
// normalized value that is now active.
export function setApiBaseUrl(url) {
  activeBaseUrl = normalizeBaseUrl(url);
  return activeBaseUrl;
}

// Restore the configured default (drops any runtime override).
export function resetApiBaseUrl() {
  activeBaseUrl = configuredBaseUrl();
  return activeBaseUrl;
}

// Trim whitespace and any trailing slash so callers can safely append `/v1/...`.
export function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).trim().replace(/\/+$/, '');
}
