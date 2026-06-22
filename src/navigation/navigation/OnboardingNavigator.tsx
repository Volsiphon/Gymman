import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageSelectionScreen, LoginScreen, PhysicalStatsScreen, PhotoCaptureScreen } from '@/modules/onboarding';
import type { UserPhysicalStats } from '@/modules/onboarding';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export type OnboardingStackParamList = {
  LanguageSelection: undefined;
  Login: undefined;
  PhysicalStats: undefined;
  PhotoCapture: { stats: UserPhysicalStats };
  GoalDescription: undefined;
  GoalAnalysis: undefined;
  StatsReveal: undefined;
  ExecutionPlan: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// Placeholder shown for screens not yet built — replaced as each is completed
function PlaceholderScreen({ route }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.app, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ ...typography.body, color: colors.text.muted }}>{route.name}</Text>
    </View>
  );
}

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
      <Stack.Screen name="PhysicalStats" component={PhysicalStatsScreen} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
      <Stack.Screen name="GoalDescription" component={PlaceholderScreen} />
      <Stack.Screen name="GoalAnalysis" component={PlaceholderScreen} />
      <Stack.Screen name="StatsReveal" component={PlaceholderScreen} />
      <Stack.Screen name="ExecutionPlan" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
