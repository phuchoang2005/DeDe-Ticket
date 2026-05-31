import { normalizeBaseUrl, getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } from '../src/config/env';

describe('normalizeBaseUrl', () => {
  test('trims whitespace and strips trailing slashes', () => {
    expect(normalizeBaseUrl('  http://x:8080/// ')).toBe('http://x:8080');
  });

  test('empty input returns empty string', () => {
    expect(normalizeBaseUrl('')).toBe('');
    expect(normalizeBaseUrl(null)).toBe('');
  });
});

describe('api base url override', () => {
  afterEach(() => resetApiBaseUrl());

  test('setApiBaseUrl changes the active value and normalizes it', () => {
    setApiBaseUrl('http://10.0.0.9:8080/');
    expect(getApiBaseUrl()).toBe('http://10.0.0.9:8080');
  });

  test('resetApiBaseUrl restores the configured default from app config', () => {
    setApiBaseUrl('http://other:1234');
    resetApiBaseUrl();
    expect(getApiBaseUrl()).toBe('http://test.local:8080');
  });

  test('EXPO_PUBLIC_API_BASE_URL takes precedence over app config', () => {
    const prev = process.env.EXPO_PUBLIC_API_BASE_URL;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://env-wins:9000/';
    try {
      resetApiBaseUrl();
      expect(getApiBaseUrl()).toBe('http://env-wins:9000');
    } finally {
      if (prev === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
      else process.env.EXPO_PUBLIC_API_BASE_URL = prev;
    }
  });
});
