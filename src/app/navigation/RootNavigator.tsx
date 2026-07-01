/**
 * app/navigation/RootNavigator.tsx
 *
 * Decides whether to show Onboarding or the Main app on launch/remount.
 * isAuthenticated is the gate — signed out always means Onboarding, full stop.
 * Local ("guest") storage is deliberately not a usable mode: it's just a
 * write-through cache (services/storage/localEnvelope.ts), never a way to use
 * the app without an account. See OnboardingNavigator for where a signed-out
 * user actually lands (Login directly if this device has used an account
 * before, else the full first-run flow).
 *
 * Once signed in, loadUserProfile() reads straight from the database (that's
 * what makes it "existing account, new device" safe too — no separate pull
 * step needed, see localEnvelope.ts). No profile means this account hasn't
 * finished onboarding yet. Screens that finish onboarding (ExecutionPlanScreen)
 * still navigate here via reset() on completion; this only controls where a
 * fresh mount lands.
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { useAuth } from '@/app/providers/AuthProvider';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { colors } from '@/theme/colors';
import type { RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        setInitialRoute('Onboarding');
        return;
      }
      const profile = await loadUserProfile();
      setInitialRoute(profile ? 'Main' : 'Onboarding');
    })();
    // Intentionally runs once per mount, not on every auth change — this decides
    // where a fresh launch lands. Re-deciding mid-session would yank a user out of
    // an in-progress onboarding flow the moment they sign up (see AuthProvider's
    // remount-key comment for why sign-up from signed-out doesn't remount this).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.app }} />;
  }

  return (
    <Root.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Root.Screen name="Onboarding" component={OnboardingNavigator} />
      <Root.Screen name="Main"       component={MainTabNavigator} />
    </Root.Navigator>
  );
}
