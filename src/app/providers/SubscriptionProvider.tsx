/**
 * app/providers/SubscriptionProvider.tsx
 *
 * Provides the user's subscription tier to the whole app via useSubscription().
 * Currently backed by AsyncStorage so the tier can be set in dev without a
 * payment backend. When RevenueCat is integrated, replace the AsyncStorage load
 * with an entitlement check and call setTier() with the result — the rest stays
 * the same. setCurrentTier() from the AI client is kept in sync automatically.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionTier } from '@/types/subscription';
import { setCurrentTier } from '@/services/ai/client';

const TIER_KEY = 'gymman_subscription_tier';

interface SubscriptionCtx {
  tier: SubscriptionTier;
  /** Persist a new tier (dev / future payment hook). */
  setTier: (t: SubscriptionTier) => Promise<void>;
}

const Context = createContext<SubscriptionCtx>({
  tier: 'free',
  setTier: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, _setTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    AsyncStorage.getItem(TIER_KEY).then(v => {
      const t = (v as SubscriptionTier | null) ?? 'free';
      _setTier(t);
      setCurrentTier(t);
    });
  }, []);

  async function setTier(t: SubscriptionTier) {
    _setTier(t);
    setCurrentTier(t);
    await AsyncStorage.setItem(TIER_KEY, t);
  }

  return <Context.Provider value={{ tier, setTier }}>{children}</Context.Provider>;
}

export function useSubscription(): SubscriptionCtx {
  return useContext(Context);
}
