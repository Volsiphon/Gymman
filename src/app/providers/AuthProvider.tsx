/**
 * app/providers/AuthProvider.tsx
 *
 * Wraps the app and exposes the current Supabase auth session via context.
 * RootNavigator requires isAuthenticated to show Main at all — signing out
 * always lands back on the login screen. One account at a time; there is no
 * switcher, so a "signed in" transition is always either a fresh sign-up/login
 * or a resumed session, never a switch between two already-known accounts.
 *
 * Also gates rendering: shows a loading view instead of `children` until the
 * initial session check resolves, so nothing in the app renders before we know
 * whether anyone's signed in. (services/storage/localEnvelope.ts reads the
 * session itself on every call — it doesn't depend on this provider pushing
 * anything, so there's no ordering race there.)
 *
 * Wraps `children` in a View keyed by a remount counter, bumped whenever a
 * *previously signed-in* session goes away (sign-out) — not on the very first
 * sign-in from signed-out, so mid-onboarding sign-up doesn't lose progress
 * (LoginScreen sits partway through the onboarding flow). Signing out forces a
 * clean remount since a screen could be holding rendered data from the account
 * that just left.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  getSession,
  onAuthStateChange,
  signOut as authSignOut,
} from '@/services/auth/authService';
import { colors } from '@/theme/colors';

interface AuthCtx {
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const Context = createContext<AuthCtx>({
  userId: null,
  email: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [remountKey, setRemountKey] = useState(0);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    getSession().then(session => {
      const initialUserId = session?.user.id ?? null;
      prevUserIdRef.current = initialUserId;
      setUserId(initialUserId);
      setEmail(session?.user.email ?? null);
      setIsLoading(false);
    });

    const unsubscribe = onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      const prevUserId = prevUserIdRef.current;
      prevUserIdRef.current = nextUserId;

      setUserId(nextUserId);
      setEmail(session?.user.email ?? null);
      setIsLoading(false);

      // Force a clean remount on sign-out (a screen could be holding rendered
      // data from the account that just left) — but not on the very first
      // sign-in from signed-out, so mid-onboarding sign-up doesn't lose progress.
      if (prevUserId !== null && prevUserId !== nextUserId) {
        setRemountKey(k => k + 1);
      }
    });

    return unsubscribe;
  }, []);

  async function signOut() {
    await authSignOut();
  }

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.app }} />;
  }

  return (
    <Context.Provider value={{ userId, email, isAuthenticated: !!userId, isLoading, signOut }}>
      <View key={remountKey} style={{ flex: 1 }}>
        {children}
      </View>
    </Context.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(Context);
}
