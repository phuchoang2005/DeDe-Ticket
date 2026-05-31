import * as SecureStore from 'expo-secure-store';

// Persisted runtime override for the API base URL, set from the in-app server
// settings. Not secret, but kept alongside the other persisted values.
const API_BASE_URL_KEY = 'dede.api.baseUrl';

export async function getStoredApiBaseUrl() {
  try {
    return await SecureStore.getItemAsync(API_BASE_URL_KEY);
  } catch {
    return null;
  }
}

export async function saveApiBaseUrl(url) {
  if (!url) return;
  try {
    await SecureStore.setItemAsync(API_BASE_URL_KEY, url);
  } catch {
    // Persisting is best-effort; the in-memory override still applies.
  }
}

export async function clearStoredApiBaseUrl() {
  try {
    await SecureStore.deleteItemAsync(API_BASE_URL_KEY);
  } catch {
    // Nothing stored.
  }
}
