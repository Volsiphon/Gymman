# Goal Analysis — Backup & Restore Guide

Backed up on: 2026-06-30
Reason: Shelved to rebuild from scratch.

---

## What's in this folder

| File | Original location |
|---|---|
| `GoalAnalysisScreen.tsx` | `src/modules/onboarding/screens/GoalAnalysisScreen.tsx` |
| `goalAnalysisService.ts` | `src/modules/onboarding/services/goalAnalysisService.ts` |

---

## What was removed from the codebase

These four changes were made when shelving Goal Analysis. Reversing them restores it fully.

### 1. `src/modules/onboarding/screens/GoalAnalysisScreen.tsx`
Copy `GoalAnalysisScreen.tsx` from this folder back to:
`src/modules/onboarding/screens/GoalAnalysisScreen.tsx`

### 2. `src/modules/onboarding/services/goalAnalysisService.ts`
Copy `goalAnalysisService.ts` from this folder back to:
`src/modules/onboarding/services/goalAnalysisService.ts`

### 3. `src/modules/onboarding/index.ts`
Add this line back (with the other screen exports):
```ts
export { GoalAnalysisScreen } from './screens/GoalAnalysisScreen';
```

### 4. `src/app/navigation/OnboardingNavigator.tsx`
Three things to restore:

a) Add `GoalAnalysisScreen` back to the import line:
```ts
import { ..., GoalAnalysisScreen, ... } from '@/modules/onboarding';
```

b) Add `GoalAnalysis: undefined` back to `OnboardingStackParamList`:
```ts
export type OnboardingStackParamList = {
  ...
  GoalAnalysis: undefined;
  StatsReveal: undefined;
  ...
};
```

c) Add the screen back between PhotoCapture and StatsReveal:
```tsx
<Stack.Screen name="GoalAnalysis" component={GoalAnalysisScreen} />
```

### 5. `src/modules/onboarding/screens/PhotoCaptureScreen.tsx`
Both navigation calls currently point to `'StatsReveal'`. Change them back to `'GoalAnalysis'`:
```ts
navigation.navigate('GoalAnalysis')
```
There are two of them — one on the Continue button, one on the Skip link.

---

## What Goal Analysis does (for reference when rebuilding)

The screen:
1. Loads the user profile from storage
2. Calls `computeBodyStats` (engine/body-metrics) to get BF%, LBM, BMR, TDEE
3. Sends stats + goal text to Groq via `analyzeGoal` (goalAnalysisService)
4. Classifies the goal type via `classifyGoal` (engine/goal-engine)
5. Computes calorie target + macros via `calcCalorieTarget` / `calcMacros` (engine/nutrition)
6. Saves everything back to the user profile:
   - bmr, tdee, bfPercent, fatMassKg, lbmKg
   - goalType, calorieTarget, proteinG, carbsG, fatsG, goalOffset
   - targetWeightKg (from the AI's journey object)
7. Displays the AI result in section cards and navigates to StatsReveal

Without Goal Analysis running, StatsReveal's Nutrition Plan section shows `—` for
calorieTarget, macros, goalType, and targetWeightKg because nothing has written
those fields to the profile yet.
