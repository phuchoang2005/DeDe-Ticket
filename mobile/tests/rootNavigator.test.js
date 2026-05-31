import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from '../src/store/AuthContext';
import RootNavigator from '../src/navigation/RootNavigator';

const TOKEN_KEY = 'dede.auth.token';
const METRICS = { frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

beforeEach(() => {
  if (SecureStore.__reset) SecureStore.__reset();
});

async function render() {
  let tree;
  await act(async () => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>,
    );
  });
  // Let the navigation container settle after the bootstrap state resolves.
  await act(async () => {});
  return JSON.stringify(tree.toJSON());
}

describe('RootNavigator auto-login', () => {
  test('with a stored token, boots into the Scan screen and bypasses Login', async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, 'existing-jwt');
    const json = await render();
    expect(json).toContain('Camera sau');
    expect(json).not.toContain('Chào mừng trở lại');
  });

  test('without a token, shows the Login screen', async () => {
    const json = await render();
    expect(json).toContain('Chào mừng trở lại');
    expect(json).not.toContain('Camera sau');
  });
});
