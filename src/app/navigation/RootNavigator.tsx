/**
 * app/navigation/RootNavigator.tsx
 *
 * The top-level navigator that decides whether to show Onboarding or the Main App.
 * On every launch it checks AsyncStorage for a saved user profile. If one exists,
 * it jumps straight to MainTabNavigator. If not, it shows OnboardingNavigator so the
 * user can complete setup. This is the only navigator that ever touches the profile
 * check — all other navigators assume the user is already set up.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Root.Screen name="Onboarding" component={OnboardingNavigator} />
      <Root.Screen name="Main"       component={MainTabNavigator} />
    </Root.Navigator>
  );
}
