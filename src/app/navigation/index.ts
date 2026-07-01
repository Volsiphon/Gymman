/**
 * app/navigation/index.ts
 *
 * Barrel export for the navigation layer. Anything else in the app that needs a
 * navigator or navigation type imports from here — not directly from the individual
 * navigator files. This keeps import paths short and makes refactoring easier.
 */

export { RootNavigator } from './RootNavigator';
export { OnboardingNavigator } from './OnboardingNavigator';
export type { OnboardingStackParamList, RootStackParamList, MainTabParamList, PlanStackParamList } from './types';
