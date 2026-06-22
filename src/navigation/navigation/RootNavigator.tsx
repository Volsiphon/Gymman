import React from 'react';
import { OnboardingNavigator } from './OnboardingNavigator';

export function RootNavigator() {
  // TODO: read onboarding completion flag from store — if complete, render MainTabNavigator
  return <OnboardingNavigator />;
}
