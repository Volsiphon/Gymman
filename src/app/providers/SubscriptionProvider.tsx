/**
 * app/providers/SubscriptionProvider.tsx
 *
 * Provides the user's subscription tier to the whole app via useSubscription().
 * If the user is signed in (AuthProvider), the tier comes from the `entitlements`
 * table in Supabase — the seam a future Play Store/App Store IAP receipt handler
 * or a Razorpay/UPI webhook can both write into without this provider changing.
 * If signed out, or the entitlements lookup fails/returns nothing, falls back to
 * the local AsyncStorage tier exactly as before (keeps the dev override working
 * and keeps the app usable fully offline). setCurrentTier() from the AI client is
 * kept in sync automatically either way.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionTier } from '@/types/subscription';
import { setCurrentTier } from '@/services/ai/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/storage/cloud/client';

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

async function loadLocalTier(): Promise<SubscriptionTier> {
  const v = await AsyncStorage.getItem(TIER_KEY);
  return (v as SubscriptionTier | null) ?? 'free';
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { userId, isAuthenticated } = useAuth();
  const [tier, _setTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    let cancelled = false;

    async function resolveTier() {
      let resolved: SubscriptionTier | null = null;

      if (isAuthenticated && userId) {
        const { data, error } = await supabase
          .from('entitlements')
          .select('tier, expires_at')
          .eq('user_id', userId)
          .maybeSingle();

        const expired = !!data?.expires_at && new Date(data.expires_at) < new Date();
        if (!error && data && !expired) resolved = data.tier as SubscriptionTier;
      }

      resolved ??= await loadLocalTier();
      if (!cancelled) {
        _setTier(resolved);
        setCurrentTier(resolved);
      }
    }

    resolveTier();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId]);

  async function setTier(t: SubscriptionTier) {
    _setTier(t);
    setCurrentTier(t);
    await AsyncStorage.setItem(TIER_KEY, t);

    if (isAuthenticated && userId) {
      await supabase.from('entitlements').upsert({
        user_id: userId,
        tier: t,
        source: 'manual',
        updated_at: new Date().toISOString(),
      });
    }
  }

  return <Context.Provider value={{ tier, setTier }}>{children}</Context.Provider>;
}

export function useSubscription(): SubscriptionCtx {
  return useContext(Context);
}
