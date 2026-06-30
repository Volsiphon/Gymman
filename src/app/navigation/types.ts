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
