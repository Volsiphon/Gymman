/**
 * app/navigation/types.ts
 *
 * TypeScript type definitions for every navigation stack in the app. React Navigation
 * uses these to ensure you can't navigate to a screen that doesn't exist or pass the
 * wrong params to a screen. If you add a new screen to any navigator, you must add it
 * here too so TypeScript can catch mistyped screen names at compile time.
 *
 * Four stacks: OnboardingStackParamList (the intro flow), RootStackParamList (the
 * top-level split between onboarding and main app), MainTabParamList (the bottom tabs),
 * and PlanStackParamList (the Plan tab's sub-screens reached by tapping section cards).
 */

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

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Plan: undefined;
  Progress: undefined;
  Photos: undefined;
  Coach: undefined;
  Shop: undefined;
};

export type PlanStackParamList = {
  PlanHome: undefined;
  Diet: undefined;
  Training: undefined;
  CaloryBurn: undefined;
  Bloodwork: undefined;
  SevenDay: undefined;
  PlaceholderDetail: { title: string; description?: string };
};
