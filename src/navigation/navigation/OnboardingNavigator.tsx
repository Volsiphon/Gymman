import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageSelectionScreen, LoginScreen, WelcomeScreen, PhysicalStatsScreen, PhotoCaptureScreen, GoalDescriptionScreen, GoalAnalysisScreen, StatsRevealScreen, ExecutionPlanScreen } from '@/modules/onboarding';
import type { UserPhysicalStats } from '@/modules/onboarding';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export type OnboardingStackParamList = {
  LanguageSelection: undefined;
  Login: undefined;
  Welcome: undefined;
  GoalDescription: undefined;
  PhysicalStats: { goalText: string };
  PhotoCapture: { stats: UserPhysicalStats; goalText: string };
  GoalAnalysis: { stats: UserPhysicalStats; goalText: string; startOnAnalysis?: boolean };
  StatsReveal: { stats: UserPhysicalStats; goalText: string };
  ExecutionPlan: { stats: UserPhysicalStats; goalText: string; targetWeightKg?: number };
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();


export function OnboardingNavigator() {
  return (
    <Stack.Navigator
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
      <Stack.Screen name="PhysicalStats" component={PhysicalStatsScreen} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
      <Stack.Screen name="GoalAnalysis" component={GoalAnalysisScreen} />
      <Stack.Screen name="StatsReveal" component={StatsRevealScreen} />
      <Stack.Screen name="ExecutionPlan" component={ExecutionPlanScreen} />
    </Stack.Navigator>
  );
}
