/**
 * app/navigation/OnboardingNavigator.tsx
 *
 * The linear stack the user walks through before their profile exists: language
 * selection → login → welcome → goal description → onboarding chat (physical stats
 * collected via AI conversation) → optional photo capture → AI goal analysis →
 * stats reveal → execution plan. Each screen is pushed in order; there is no
 * back-navigation once stats are saved so the user can't re-enter bad data.
 *
 * Initial route isn't always LanguageSelection: if this device has cached profile
 * data from before (loadUserProfile — signed out, this reads the local cache only,
 * since there's no session to read the database through), it starts at Login
 * directly instead. That's the "kick them out to the login screen" behavior after
 * signOut() — RootNavigator sends signed-out users here, and a returning device
 * shouldn't have to re-pick a language or sit through Welcome just to log back in.
 * A genuinely fresh device (no cached profile) still gets the full first-run flow.
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageSelectionScreen, LoginScreen, WelcomeScreen, OnboardingChatScreen, PhotoCaptureScreen, GoalDescriptionScreen, GoalAnalysisScreen, StatsRevealScreen, ExecutionPlanScreen } from '@/modules/onboarding';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { colors } from '@/theme/colors';

import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof OnboardingStackParamList | null>(null);

  useEffect(() => {
    loadUserProfile().then(profile => {
      setInitialRoute(profile ? 'Login' : 'LanguageSelection');
    });
  }, []);

  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.app }} />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg.app },
      }}
    >
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="GoalDescription" component={GoalDescriptionScreen} />
      <Stack.Screen name="OnboardingChat" component={OnboardingChatScreen} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
      <Stack.Screen name="StatsReveal" component={StatsRevealScreen} />
      <Stack.Screen name="GoalAnalysis" component={GoalAnalysisScreen} />
      <Stack.Screen name="ExecutionPlan" component={ExecutionPlanScreen} />
    </Stack.Navigator>
  );
}
