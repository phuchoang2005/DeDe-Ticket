import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, setToken } from '../storage/secureStore';
import { getStoredApiBaseUrl } from '../storage/serverConfig';
import { setApiBaseUrl } from '../config/env';

// Roles allowed to use the scanner, matching the backend scan endpoint and the
// web SPA's scannerRoles. The login flow (Phase 1) uses hasScannerRole to reject
// other accounts before calling signIn.
export const SCANNER_ROLES = ['SCANNER', 'ADMIN', 'ORGANIZER'];

export function hasScannerRole(roles) {
  return Array.isArray(roles) && roles.some((r) => SCANNER_ROLES.includes(r));
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  // True until the persisted token has been read once on launch, so the
  // navigator can hold on a splash instead of flashing the login screen.
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Apply any persisted API base URL override before the app makes requests.
      const storedUrl = await getStoredApiBaseUrl();
      if (storedUrl) setApiBaseUrl(storedUrl);

      const stored = await getToken();
      if (!active) return;
      setTokenState(stored || null);
      setBootstrapping(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (jwt, profile) => {
    await setToken(jwt);
    setTokenState(jwt);
    setUser(profile || null);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      roles: (user && user.roles) || [],
      isAuthenticated: Boolean(token),
      bootstrapping,
      signIn,
      signOut,
    }),
    [token, user, bootstrapping, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
