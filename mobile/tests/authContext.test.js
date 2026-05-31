import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth, hasScannerRole } from '../src/store/AuthContext';
import { getApiBaseUrl, resetApiBaseUrl } from '../src/config/env';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'dede.auth.token';
const API_BASE_URL_KEY = 'dede.api.baseUrl';

// Renders the provider with a probe that captures the latest context value.
function mountAuth() {
  const ref = {};
  function Probe() {
    ref.current = useAuth();
    return null;
  }
  return { ref, Probe };
}

beforeEach(() => {
  if (SecureStore.__reset) SecureStore.__reset();
});

afterEach(() => {
  resetApiBaseUrl();
});

describe('hasScannerRole', () => {
  test('true when any allowed role is present', () => {
    expect(hasScannerRole(['USER', 'ADMIN'])).toBe(true);
    expect(hasScannerRole(['SCANNER'])).toBe(true);
    expect(hasScannerRole(['ORGANIZER'])).toBe(true);
  });

  test('false otherwise', () => {
    expect(hasScannerRole(['USER'])).toBe(false);
    expect(hasScannerRole([])).toBe(false);
    expect(hasScannerRole(null)).toBe(false);
  });
});

describe('AuthProvider', () => {
  test('bootstraps to unauthenticated when no token is stored', async () => {
    const { ref, Probe } = mountAuth();
    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });
    expect(ref.current.bootstrapping).toBe(false);
    expect(ref.current.isAuthenticated).toBe(false);
    expect(ref.current.roles).toEqual([]);
  });

  test('bootstraps to authenticated when a token already exists', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'existing-jwt');
    const { ref, Probe } = mountAuth();
    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });
    expect(ref.current.isAuthenticated).toBe(true);
    expect(ref.current.token).toBe('existing-jwt');
  });

  test('signIn persists the token and exposes the role list', async () => {
    const { ref, Probe } = mountAuth();
    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });
    await act(async () => {
      await ref.current.signIn('jwt-xyz', { roles: ['SCANNER'] });
    });
    expect(ref.current.isAuthenticated).toBe(true);
    expect(ref.current.roles).toEqual(['SCANNER']);
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBe('jwt-xyz');
  });

  test('applies a persisted API base URL override on boot', async () => {
    await SecureStore.setItemAsync(API_BASE_URL_KEY, 'http://192.168.9.9:8080');
    const { Probe } = mountAuth();
    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });
    expect(getApiBaseUrl()).toBe('http://192.168.9.9:8080');
  });

  test('signOut clears the token and resets state', async () => {
    const { ref, Probe } = mountAuth();
    await act(async () => {
      TestRenderer.create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });
    await act(async () => {
      await ref.current.signIn('jwt-xyz', { roles: ['ADMIN'] });
    });
    await act(async () => {
      await ref.current.signOut();
    });
    expect(ref.current.isAuthenticated).toBe(false);
    expect(ref.current.user).toBeNull();
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
  });
});
