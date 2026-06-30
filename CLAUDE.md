# Gymman — Claude Instructions

## What this app is

Gymman is a React Native (Expo) gym companion app for Kerala, India users. Features: diet logging with AI nutrition coach (vision-enabled), training routines with AI trainer, calory burn tracking with Dynamic Mode, bloodwork logging, 7-day weekly review with calorie calibration, body weight progress chart, transformation photos, master AI coach, and a gym products shop. Supports English, Malayalam, and Manglish.

Tech: React Native + Expo, React Navigation, Groq AI API, AsyncStorage, TypeScript.

## The authoritative structure guide

**`new-structure.md` in the project root is the single source of truth for how this codebase is organized.** Read it before creating or moving any file. The reorganization is being executed in 4 phases (see the phase plan in the conversation history). Until all phases are complete, some files may still be in their old locations.

## The 5 rules — never break these

1. **Where it lives tells you what it is.** A file's folder path must answer "what domain does this serve?" before you open it.

2. **A module owns everything it needs.** Screens, sub-components, local logic — all inside the module. Nothing bleeds out, nothing sneaks in.

3. **`shared/` only if ≥ 2 unrelated modules need it.** If only one module uses a component or util, it lives *inside* that module, not in `shared/`. This is a hard rule.

4. **Layers never import upward:**

   | Layer | May import from |
   |---|---|
   | `engine/` | Nothing from `src/` |
   | `services/` | `engine/`, `types/` |
   | `store/` | `types/` |
   | `contexts/` | `services/`, `store/`, `engine/` |
   | `shared/` | `theme/`, `types/`, `store/` |
   | `modules/` | `services/`, `engine/`, `store/`, `contexts/`, `shared/`, `theme/`, `types/` |
   | `app/` | `modules/`, `store/`, `contexts/` |

5. **The navigation tree is the module tree.** Every screen in a navigator has a home in `modules/`. If you create a screen, it goes in a module. If you create a navigator, it goes in `app/navigation/`.

## Module structure — every module follows this shape

```
modules/feature/
├── FeatureScreen.tsx        ← or sub-folders (home/, diet/, etc.) for complex modules
├── components/              ← UI pieces only used inside this module
│   └── SomeComponent.tsx
└── index.ts                 ← the only exit point
```

The `plan/` module is the exception because it's a stack navigator with multiple sub-screens. It uses sub-folders: `plan/home/`, `plan/diet/`, `plan/training/`, `plan/calory-burn/`, `plan/bloodwork/`, `plan/review/`.

## Quick file lookup

| I want to change… | File |
|---|---|
| Plan hub (streak, targets, section cards) | `modules/plan/home/PlanScreen.tsx` |
| Streak flames + modals | `modules/plan/home/components/` |
| Diet logging or nutrition AI | `modules/plan/diet/` |
| Training routines or trainer AI | `modules/plan/training/` |
| Calory burn + Dynamic Mode | `modules/plan/calory-burn/` |
| Bloodwork tracker | `modules/plan/bloodwork/` |
| 7-day weekly review | `modules/plan/review/` |
| Body weight chart | `modules/progress/` |
| Transformation photos | `modules/photos/` |
| Master AI coach | `modules/coach/` |
| Shop | `modules/shop/` |
| Onboarding flow | `modules/onboarding/screens/` |
| Any body composition formula | `engine/body-metrics/` |
| Weekly review math | `engine/weekly-review/` |
| Calorie calculation logic | `engine/calorie-engine/` |
| Nutrition AI system prompt | `services/ai/nutritionCoach.ts` |
| Trainer AI system prompt | `services/ai/trainerCoach.ts` |
| Master coach personality | `services/ai/masterCoach.ts` |
| Swap the AI provider globally | `services/ai/client.ts` |
| Dynamic Mode ↔ Diet calorie bridge | `contexts/GoalsContext.tsx` |
| Free vs premium limits | `shared/constants/subscriptionLimits.ts` |
| CollapsibleTabBar (plan sub-screens) | `shared/components/CollapsibleTabBar.tsx` |
| Colors / fonts / spacing | `src/theme/` |
| Navigation types | `src/app/navigation/types.ts` |
| API keys | `src/config/keys.ts` |

## Key facts about specific features

- **Streak** has no standalone module. The UI (flames, modals) lives in `modules/plan/home/components/`. Data flows through `store/streak/`.
- **Bloodwork** is a Plan stack screen, not a bottom tab. It lives in `modules/plan/bloodwork/`.
- **GoalsContext** is a React Context (not a store slice) that bridges CaloryBurn → Diet → PlanHome. It's provided at `MainTabNavigator` level.
- **ChatView** (`modules/coach/components/`) is a stateful wrapper specific to the Coach screen. **ChatInterface** (`shared/components/`) is the generic stateless bubble layout shared by the nutrition and trainer coaches.
- **Kerala food library** lives at `modules/plan/diet/data/kerala-foods-library.json`.

## Storage layer

Storage is fine-grained: one file per data domain in `services/storage/local/`. Do not consolidate them. When adding a new feature that persists data, add a new `featureStorage.ts` file — do not append to an existing one.

## Git commits

- No `Co-Authored-By` line in any commit message. Ever.
- Commit messages: short imperative subject line, focus on the *why* not the *what*.

## What not to do

- Do not put screen components in `shared/`. Screens belong in modules.
- Do not import from `modules/` inside `services/` or `engine/`.
- Do not create a new `screens/` sub-folder inside a single-screen module — the screen goes at the module root.
- Do not put feature-specific logic in `shared/utils/` — utils there must be truly generic.
- Do not hardcode hex colors or font sizes in component files — use `theme/colors.ts` and `theme/typography.ts`.
