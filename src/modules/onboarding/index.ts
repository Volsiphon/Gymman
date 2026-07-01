/**
 * modules/onboarding/index.ts
 *
 * Public export barrel for the onboarding module. OnboardingNavigator imports all
 * its screens from here. Nothing inside screens/ should be imported directly from
 * outside this module — always go through this barrel.
 */

export { LanguageSelectionScreen } from './screens/LanguageSelectionScreen';
export { LoginScreen } from './screens/LoginScreen';
export { WelcomeScreen } from './screens/WelcomeScreen';
export { OnboardingChatScreen } from './screens/OnboardingChatScreen';
export { PhotoCaptureScreen } from './screens/PhotoCaptureScreen';
export { GoalDescriptionScreen } from './screens/GoalDescriptionScreen';
export { GoalAnalysisScreen } from './screens/GoalAnalysisScreen';
export { StatsRevealScreen } from './screens/StatsRevealScreen';
export { ExecutionPlanScreen } from './screens/ExecutionPlanScreen';
export type { UserPhysicalStats } from '@/types/user';
