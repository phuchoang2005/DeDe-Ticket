jest.mock('../src/services/authService', () => ({ login: jest.fn() }));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import LoginScreen, { NO_ACCESS_MESSAGE } from '../src/screens/LoginScreen';
import { login } from '../src/services/authService';
import { getApiBaseUrl, resetApiBaseUrl } from '../src/config/env';
import { getStoredApiBaseUrl } from '../src/storage/serverConfig';

const TOKEN_KEY = 'dede.auth.token';
const METRICS = { frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

// Resource-constrained CI runners can take longer than the 5s default to finish
// the async React Native render + mock setup, so give this suite extra headroom.
jest.setTimeout(20000);

beforeEach(() => {
  if (SecureStore.__reset) SecureStore.__reset();
  login.mockReset();
});

afterEach(() => {
  resetApiBaseUrl();
});

// Mounts LoginScreen inside the real AuthProvider, plus a probe that exposes the
// live auth state so we can assert what the login flow did.
async function mount() {
  const ref = {};
  function Probe() {
    ref.current = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AuthProvider>
          <LoginScreen />
          <Probe />
        </AuthProvider>
      </SafeAreaProvider>,
    );
  });
  return { tree, ref };
}

function findWithHandler(tree, testID, prop) {
  return tree.root.find(
    (n) => n.props && n.props.testID === testID && typeof n.props[prop] === 'function',
  );
}

function setInput(tree, testID, value) {
  act(() => {
    findWithHandler(tree, testID, 'onChangeText').props.onChangeText(value);
  });
}

async function pressButton(tree, testID) {
  await act(async () => {
    await findWithHandler(tree, testID, 'onPress').props.onPress();
  });
}

function errorText(tree) {
  const nodes = tree.root.findAll((n) => n.props && n.props.testID === 'login-error');
  return nodes.length ? nodes[0].props.children : null;
}

describe('LoginScreen', () => {
  test('logs a scanner-role user in and persists the token', async () => {
    login.mockResolvedValue({ token: 'jwt-1', user: { id: 1, email: 'scanner@dede.test', roles: ['SCANNER'] } });
    const { tree, ref } = await mount();

    setInput(tree, 'email-input', 'scanner@dede.test');
    setInput(tree, 'password-input', 'scan1234');
    await pressButton(tree, 'login-button');

    expect(login).toHaveBeenCalledWith('scanner@dede.test', 'scan1234');
    expect(ref.current.isAuthenticated).toBe(true);
    expect(ref.current.roles).toEqual(['SCANNER']);
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBe('jwt-1');
  });

  test('rejects a user without a scanner role and does not log in', async () => {
    login.mockResolvedValue({ token: 'jwt-2', user: { id: 2, email: 'demo@dede.test', roles: ['USER'] } });
    const { tree, ref } = await mount();

    setInput(tree, 'email-input', 'demo@dede.test');
    setInput(tree, 'password-input', 'demo1234');
    await pressButton(tree, 'login-button');

    expect(errorText(tree)).toBe(NO_ACCESS_MESSAGE);
    expect(ref.current.isAuthenticated).toBe(false);
    expect(await SecureStore.getItemAsync(TOKEN_KEY)).toBeNull();
  });

  test('validates that both fields are filled before calling the API', async () => {
    const { tree } = await mount();
    await pressButton(tree, 'login-button');
    expect(login).not.toHaveBeenCalled();
    expect(errorText(tree)).toMatch(/email/i);
  });

  test('surfaces the API error message on failure', async () => {
    login.mockRejectedValue(Object.assign(new Error('Email hoặc mật khẩu không đúng.'), { code: 'INVALID_CREDENTIALS' }));
    const { tree, ref } = await mount();

    setInput(tree, 'email-input', 'scanner@dede.test');
    setInput(tree, 'password-input', 'wrong');
    await pressButton(tree, 'login-button');

    expect(errorText(tree)).toBe('Email hoặc mật khẩu không đúng.');
    expect(ref.current.isAuthenticated).toBe(false);
  });

  test('demo quick-fill populates credentials without calling the API', async () => {
    const { tree } = await mount();
    await act(async () => {
      findWithHandler(tree, 'demo-Scanner', 'onPress').props.onPress();
    });
    expect(findWithHandler(tree, 'email-input', 'onChangeText').props.value).toBe('scanner@dede.test');
    expect(findWithHandler(tree, 'password-input', 'onChangeText').props.value).toBe('scan1234');
    expect(login).not.toHaveBeenCalled();
  });

  test('server settings: saving a new URL applies it at runtime and persists it', async () => {
    const { tree } = await mount();
    await act(async () => {
      findWithHandler(tree, 'open-server-settings', 'onPress').props.onPress();
    });
    setInput(tree, 'server-url-input', 'http://10.0.0.5:8080/');
    await act(async () => {
      await findWithHandler(tree, 'save-server-url', 'onPress').props.onPress();
    });
    expect(getApiBaseUrl()).toBe('http://10.0.0.5:8080');
    expect(await getStoredApiBaseUrl()).toBe('http://10.0.0.5:8080');
  });
});
