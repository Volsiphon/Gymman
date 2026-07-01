# Gymman — Claude Instructions

## What this app is

Gymman is a React Native (Expo) gym companion app for Kerala, India users. Features: diet logging with AI nutrition coach (vision-enabled), training routines with AI trainer, calory burn tracking with Dynamic Mode, bloodwork logging, 7-day weekly review with calorie calibration, body weight progress chart, transformation photos, master AI coach, and a gym products shop. Supports English, Malayalam, and Manglish.

Tech: React Native + Expo, React Navigation, Groq AI API, AsyncStorage, TypeScript.

## The authoritative structure guide

**`new-structure.md` in the project root is the single source of truth for how this codebase is organized.** Read it before creating or moving any file. The reorganization is complete — the tree in that file matches reality. Keep it that way: when you add, move, or delete a file, update `new-structure.md` in the same change. `Intern_Project_Rebuild.md` is the learning-order companion guide; keep its file references valid too.

## The 5 rules — never break these

1. **Where it lives tells you what it is.** A file's folder path must answer "what domain does this serve?" before you open it.

2. **A module owns everything it needs.** Screens, sub-components, local logic — all inside the module. Nothing bleeds out, nothing sneaks in.

3. **`shared/` only if ≥ 2 unrelated modules need it.** If only one module uses a component or util, it lives *inside* that module, not in `shared/`. This is a hard rule.

4. **Layers never import upward:**

   | Layer | May import from |
   |---|---|
   | `config/` | `types/` only |
   | `engine/` | Nothing from `src/` |
   | `services/` | `engine/`, `types/`, `config/` |
   | `store/` | `types/` |
   | `contexts/` | `services/`, `store/`, `engine/` |
   | `shared/` | `theme/`, `types/`, `store/` |
   | `modules/` | `services/`, `engine/`, `store/`, `contexts/`, `shared/`, `theme/`, `types/`, `config/` |
   | `app/` | `modules/`, `store/`, `contexts/`, `services/` |

5. **The navigation tree is the module tree.** Every screen in a navigator has a home in `modules/`. If you create a screen, it goes in a module. If you create a navigator, it goes in `app/navigation/`.

## Module structure — every module follows this shape

```
modules/feature/
├── FeatureScreen.tsx        ← owns state, orchestrates; sub-folders (home/, diet/, …) for complex modules
├── utils.ts                 ← (optional) helpers shared by the screen and its components
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
| Calorie calculation logic | `engine/nutrition/` |
| Nutrition AI system prompt | `services/ai/nutritionCoach.ts` |
| Trainer AI system prompt | `services/ai/trainerCoach.ts` |
| Master coach personality | `services/ai/masterCoach.ts` |
| Swap the AI provider globally | `services/ai/client.ts` |
| Dynamic Mode ↔ Diet calorie bridge | `contexts/GoalsContext.tsx` |
| Free vs premium limits | `config/subscriptionLimits.ts` |
| AI daily message/photo-scan limits | `services/ai/rateLimiter.ts` |
| Data caching + Supabase persistence | `services/storage/localEnvelope.ts` |
| Sign in / sessions | `services/auth/authService.ts` + `app/providers/AuthProvider.tsx` |
| CollapsibleTabBar (plan sub-screens) | `shared/components/CollapsibleTabBar.tsx` |
| Colors / fonts / spacing | `src/theme/` |
| Navigation types | `src/app/navigation/types.ts` |
| API keys | `src/config/keys.ts` |

## Key facts about specific features

- **Streak** has no standalone module. The UI (flames, modals) lives in `modules/plan/home/components/`. Data flows through `store/streak/`.
- **Bloodwork** is a Plan stack screen, not a bottom tab. It lives in `modules/plan/bloodwork/`.
- **GoalsContext** is a React Context (not a store slice) that bridges CaloryBurn → Diet → PlanHome. It's provided at `MainTabNavigator` level.
- **ChatView** (`modules/coach/components/`) is a stateful wrapper specific to the Coach screen. **ChatInterface** (`shared/components/`) is the generic stateless bubble layout shared by the nutrition and trainer coaches.
- **Two ChatHistoryPanels exist on purpose**: `modules/plan/diet/components/` (dietChatStorage) and `modules/coach/components/` (masterChatStorage). Each is private to its module.
- **Kerala food library** lives at `modules/plan/diet/data/kerala-foods-library.json`.

## Storage layer

Storage is fine-grained: one file per data domain in `services/storage/local/`. Do not consolidate them. When adding a new feature that persists data, add a new `featureStorage.ts` file — do not append to an existing one.

All local storage files go through `services/storage/localEnvelope.ts`: for a signed-in user the Supabase `user_data` table is the source of truth and AsyncStorage is a per-user write-through cache with an offline queue; signed out, AsyncStorage is all there is. **There is no sync engine** — a push/pull design was built and deliberately removed. Do not reintroduce one; new domains just work through the envelope.

## Git commits

- No `Co-Authored-By` line in any commit message. Ever.
- Commit messages: short imperative subject line, focus on the *why* not the *what*.

## What not to do

- Do not put screen components in `shared/`. Screens belong in modules.
- Do not import from `modules/` inside `services/` or `engine/`.
- Do not create a new `screens/` sub-folder inside a single-screen module — the screen goes at the module root.
- Do not put feature-specific logic in `shared/utils/` — utils there must be truly generic.
- Do not hardcode hex colors or font sizes in component files — use `theme/colors.ts` and `theme/typography.ts`.
