import * as SecureStore from 'expo-secure-store';

// The JWT lives only here, never in plain storage and never logged.
const TOKEN_KEY = 'dede.auth.token';

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // Secure store unavailable: treat as logged out rather than crashing.
    return null;
  }
}

export async function setToken(token) {
  if (!token) {
    return clearToken();
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Nothing stored, or store unavailable: nothing to do.
  }
}
