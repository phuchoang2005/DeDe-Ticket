import * as SecureStore from 'expo-secure-store';
import { getStoredApiBaseUrl, saveApiBaseUrl, clearStoredApiBaseUrl } from '../src/storage/serverConfig';

beforeEach(() => {
  if (SecureStore.__reset) SecureStore.__reset();
});

describe('serverConfig', () => {
  test('save then get round-trips the url', async () => {
    await saveApiBaseUrl('http://host:8080');
    expect(await getStoredApiBaseUrl()).toBe('http://host:8080');
  });

  test('get returns null when nothing is stored', async () => {
    expect(await getStoredApiBaseUrl()).toBeNull();
  });

  test('saveApiBaseUrl ignores empty values', async () => {
    await saveApiBaseUrl('');
    expect(await getStoredApiBaseUrl()).toBeNull();
  });

  test('clear removes the stored url', async () => {
    await saveApiBaseUrl('http://x:8080');
    await clearStoredApiBaseUrl();
    expect(await getStoredApiBaseUrl()).toBeNull();
  });
});
