import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageSelectionScreen, LoginScreen, WelcomeScreen, OnboardingChatScreen, PhotoCaptureScreen, GoalDescriptionScreen, GoalAnalysisScreen, StatsRevealScreen, ExecutionPlanScreen } from '@/modules/onboarding';
import { colors } from '@/theme/colors';

export type OnboardingStackParamList = {
  LanguageSelection: undefined;
  Login: undefined;
  Welcome: undefined;
  GoalDescription: undefined;
  OnboardingChat: { goalText: string };
  PhotoCapture: undefined;
  GoalAnalysis: undefined;
  StatsReveal: undefined;
  ExecutionPlan: undefined;
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
      <Stack.Screen name="OnboardingChat" component={OnboardingChatScreen} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
      <Stack.Screen name="StatsReveal" component={StatsRevealScreen} />
      <Stack.Screen name="GoalAnalysis" component={GoalAnalysisScreen} />
      <Stack.Screen name="ExecutionPlan" component={ExecutionPlanScreen} />
    </Stack.Navigator>
  );
}
