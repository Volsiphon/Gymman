# Gymman — Intern Project Rebuild Guide

**Who this is for:** you have the Gymman codebase in front of you and you want to *actually understand it* — not by skimming, but by rebuilding it from scratch, using the existing code as your answer key.

**Why rebuild instead of read:** reading code gives you a false sense of understanding. Rebuilding forces you to make every decision the original author made, and the gaps between your version and the original are exactly the things you didn't know you didn't know.

**The two documents you need open at all times:**
- `new-structure.md` — the map. Where every file lives and why.
- This file — the route. What order to walk the map in.

---

## The meta-rule for every single file

1. **Read** the original file top to bottom until you can explain what it does to someone else. Every file starts with a header comment explaining its job — start there.
2. **Close it.** Write your own version from scratch in your rebuild project.
3. **Compare.** Diff your version against the original. Every difference is a lesson: sometimes yours is just stylistically different (fine), sometimes the original handles an edge case you missed (that's the gold).
4. Only move to the next file when your version *works*, not when it merely compiles.

The order below follows the dependency graph from the bottom up. You never build a file whose imports you haven't built yet. That's the whole trick — at no point are you writing code on top of something you don't understand.

---

## Phase 1 — The contracts: `src/types/` (day 1)

**Zero dependencies. Pure reading. Start here.**

These files are just TypeScript interfaces describing every piece of data in the app. Reading them first tells you what the entire app is *made of* before you write a single function.

Order:
1. `types/user.ts` — UserProfile, NutritionGoals, body metrics. The center of everything.
2. `types/plan.ts` — Routine, RoutineDay, Exercise, ActivityEntry, WeightLog. What the Plan tab tracks.
3. `types/coaching.ts` — ChatMessage, DietChat. How every AI conversation is shaped.
4. `types/subscription.ts` — SubscriptionTier. Three lines, but half the app checks it.
5. `types/shop.ts` — Product. The simplest.
6. `types/index.ts` — the barrel that re-exports them.

**What you learn:** interfaces, union types, optional fields, why one file per domain beats one giant `types.ts`.

## Phase 2 — Visual foundation: `src/theme/` (day 1)

The simplest files in the project: no logic, no imports, just named values.

Order: `colors.ts` → `spacing.ts` → `typography.ts` → `index.ts`.

**What you learn:** design tokens. Notice the rule this enables: *hex values live only in colors.ts*. Every component from Phase 7 onward will say `colors.text.muted`, never `'#8A8A8E'`. When you later want a light theme, you touch one file.

## Phase 3 — Configuration: `src/config/` (day 1)

1. `config/keys.ts` — API keys read from env. Learn what `EXPO_PUBLIC_` means and why secrets never get committed.
2. `config/subscriptionLimits.ts` — every free/premium/ultra limit in one table. Note the trick: `Infinity` means unlimited, so callers can always write `count < limit` with no special cases.

**What you learn:** config is a bottom layer — anything may import it, it imports (almost) nothing.

## Phase 4 — The math brain: `src/engine/` (days 2–4)

Pure TypeScript functions. No React, no storage, no API. Given numbers → returns numbers. This is the best place in the whole project to practice TypeScript, because you can run every function in isolation (`npx tsx`) without ever launching the app.

Order (each folder's `index.ts` last):
1. `engine/body-metrics/` — `bmr.ts` → `tdee.ts` → `bmi.ts` → `body-fat.ts` → `lean-mass.ts`. Real formulas (Mifflin-St Jeor, Navy method). Check your outputs against an online calculator.
2. `engine/goal-engine/` — `goal-classifier.ts` → `realism-check.ts` → `path-calculator.ts`. Turning "I want to lose 8kg by December" into a verdict.
3. `engine/nutrition/` — `maintenance-cal.ts` → `target-cal.ts` → `macros.ts` → `dynamic-adjustor.ts`. The calorie pipeline.
4. `engine/weekly-review/` — `data-analyzer.ts` → `plan-adjustor.ts`. The most sophisticated math in the app: implied maintenance from a week of logs, confidence scoring, water-retention detection.

**What you learn:** why pure functions are the easiest code you'll ever test, and every fitness formula the app relies on.

**Checkpoint:** you should be able to compute your own BMR, TDEE, calorie target, and macros with your Phase 4 code.

## Phase 5 — Persistence: `src/services/storage/` (days 5–7)

This is where async programming starts. Do it in this order:

1. `storage/cloud/client.ts` — the Supabase client singleton. Small.
2. **`storage/localEnvelope.ts` — read this one twice.** It is the single most important infrastructure file in the app. Every domain storage file goes through it. It handles: per-user cache keys, "cloud says empty" vs "cloud unreachable" (the header comment explains the real bug this distinction fixed — read that story), the offline pending-write queue, and legacy key migration. For your rebuild, start with a simple AsyncStorage-only version and add the cloud layer after Phase 9 (auth) exists.
3. `storage/local/` — now the 15 domain files. Each is a thin, readable wrapper: `bodyWeightStorage.ts` (simplest) → `dietLogStorage.ts` → `caloryBurnStorage.ts` (per-day keys) → `planStorage.ts` → `exerciseWeightStorage.ts` → `workoutStorage.ts` → `historyStorage.ts` → `bloodworkStorage.ts` (also owns the METRICS catalogue) → `photoStorage.ts` → `profileStorage.ts` → `userBioStorage.ts` → `userProfileStorage.ts` → the three chat storages.

**What you learn:** async/await, the "one file per domain" discipline (a diet bug can't corrupt workouts), and the write-through-cache model: *database is truth, cache is speed*.

**Rule to internalize:** new persisted feature = new `featureStorage.ts` file. Never append to an existing one.

## Phase 6 — Language: `src/i18n/` + `src/locales/` (day 8)

`i18n/index.ts` (i18next setup, namespaces) → `i18n/languageDetector.ts` → `locales/en/*.json`. Copy the Malayalam/Manglish files rather than rewriting them.

**What you learn:** why every user-facing string goes through `t('diet.emptyLog')` instead of being hardcoded — one JSON file per feature per language.

## Phase 7 — Shared UI toolkit: `src/shared/` (days 9–10)

Your first React Native components — the primitives everything else composes.

1. `shared/components/` — `Button.tsx` → `Card.tsx` → `Input.tsx` → `Modal.tsx` → `ChatInterface.tsx` (the generic chat bubble layout) → `CollapsibleTabBar.tsx` (the tab strip Diet/Training/CaloryBurn all use).
2. `shared/hooks/` — `useLocalDate.ts` → `useSubscription.ts` → `usePremiumGate.ts`.
3. `shared/utils/` — `dateUtils.ts`, `formatters.ts`.
4. `shared/constants/appConstants.ts`.

**What you learn:** JSX, StyleSheet, props, custom hooks — and the hard rule that governs this folder: *something lives in `shared/` only if two or more unrelated modules use it.* One user = it lives inside that module.

## Phase 8 — The skeleton: `src/app/navigation/` (day 11)

1. `navigation/types.ts` — every param list in one place.
2. `RootNavigator.tsx` — the single decision: authenticated + onboarded → Main, else → Onboarding.
3. `OnboardingNavigator.tsx` — linear stack (note: starts at Login if the device has seen an account before).
4. `MainTabNavigator.tsx` — 5 tabs (also provides GoalsContext — stub that for now).
5. `PlanNavigator.tsx` — the stack inside the Plan tab.

Use empty placeholder screens for everything.

**Checkpoint:** the app launches and you can tap between five empty tabs. This is the moment it becomes an app.

## Phase 9 — Identity: providers + auth (days 12–13)

1. `services/auth/authService.ts` — sign up/in/out against Supabase Auth.
2. `app/providers/AuthProvider.tsx` — session context; blocks rendering until the initial session check resolves; remounts the app on sign-out.
3. `app/providers/SubscriptionProvider.tsx` — tier from the `entitlements` table when signed in, local dev override otherwise.
4. `app/providers/ThemeProvider.tsx` — small.
5. `supabase/schema.sql` — read it: two tables (`user_data`, `entitlements`), row-level security, one storage bucket. Now go back and add the cloud path to your Phase 5 envelope.
6. `App.tsx` — wire the providers around RootNavigator.

**What you learn:** React Context, auth session lifecycles, RLS ("a row is only visible to the user who owns it" enforced by the database, not your code).

## Phase 10 — The AI layer: `src/services/ai/` (days 14–16)

Build the plumbing before the screens that use it:

1. `client.ts` — `aiChat` / `aiVisionChat`, the only file that knows Groq exists. Swap providers here and nothing else changes.
2. `rateLimiter.ts` — daily counters checked against `config/subscriptionLimits.ts`.
3. `nutritionCoach.ts` — **the most instructive AI file.** Read how the system prompt makes the model emit `[DIET:ADD ...]` action commands, and how `parseDietActions` / `stripDietActions` turn free text into typed log operations. This "AI emits actions, app parses them" pattern is the core AI trick of the whole app.
4. `trainerCoach.ts` — same pattern for routines.
5. `masterCoach.ts` — how a system prompt is assembled from the user's whole journey (profile, logs, bloodwork).
6. The onboarding five: `onboardingChat.ts` → `onboardingCoach.ts` → `statParser.ts` → `physicalStatsParser.ts` (the offline regex fallback) → `goalAnalysis.ts` → `executionPlan.ts`.
7. `whisper.ts` — audio file in, transcript out.

**What you learn:** prompt engineering as an engineering discipline — one file per role, structured output parsing, graceful fallbacks when the API is down.

## Phase 11 — First real feature, simplest first: `modules/progress/` (day 17)

One screen, one chart, one storage file. `utils.ts` → `components/WeightChart.tsx` (a line chart built from rotated plain Views — no chart library; work through the coordinate math) → `ProgressScreen.tsx`.

**What you learn:** the standard module anatomy you'll now repeat seven times — *screen owns state, components are presentational, `index.ts` exports only the screen.*

## Phase 12 — Onboarding: `modules/onboarding/` (days 18–21)

The most important module to understand deeply, because it touches everything: forms, AI calls, engine math, storage writes, navigation. Build the screens in user-journey order:

```
LanguageSelectionScreen → WelcomeScreen → LoginScreen → GoalDescriptionScreen
→ OnboardingChatScreen → PhotoCaptureScreen → GoalAnalysisScreen
→ StatsRevealScreen → ExecutionPlanScreen
```

The heavy ones are `OnboardingChatScreen` (AI-driven form: chat that fills a typed stats object, with regex fallback) and `ExecutionPlanScreen` (multi-step AI-generated plan). `StatsRevealScreen` is where your Phase 4 engine finally meets the UI.

**Checkpoint:** a new user can go from app install to a personalised plan.

## Phase 13 — The Plan tab (days 22–28)

Build the sub-modules in complexity order. Each follows the Phase 11 anatomy; each has an AI service you already built in Phase 10.

1. `plan/home/` — PlanScreen + its components (header, targets carousel, section cards, streak flames + modals, account modal). Mostly composition.
2. `plan/calory-burn/` — TodayTab / HistoryTab / ManualAddModal + the inline AI activity parser in the screen. First use of `GoalsContext.refresh()`.
3. `contexts/GoalsContext.tsx` — build it for real now (Dynamic Mode: burned calories flow into the diet target). Read the file's comments for why it's a Context and not a store slice.
4. `plan/bloodwork/` — utils (tier grouping) → PrepTipsCard → AddLogModal → LogDetailModal → screen.
5. `plan/diet/` — the richest module: utils (the `applyDietActions` reducer) → MacroBar → ManualLogModal → TodayTab → HistoryTab → ChatHistoryPanel → DietCoachTab (chat + photo analysis + rate limits + persistence) → DietScreen.
6. `plan/training/` — DayCard → RoutineDisplay → TrainerIntroView (AI builds the routine) → TodayWorkoutView → HistoryView → TrainingScreen.
7. `plan/review/` — the five cards (DayGrid, CalorieSummary, WeightTracker, CalibrationCard, InsightsList) → SevenDayScreen calling your Phase 4 weekly-review engine.

## Phase 14 — The rest of the tabs (days 29–32)

1. `modules/photos/` — camera, gallery, grid, viewer in one file; premium photo-byte upload via `storage/cloud/photoCloud.ts` (build that now).
2. `modules/shop/` — mostly layout. A rest day.
3. `modules/coach/` — the finale: ChatHistoryPanel → ChatView → CoachScreen with voice input (your Phase 10 `whisper.ts`) and spoken replies (expo-speech). The master coach pulls context from nearly every storage file you've built — if you got here honestly, you'll recognize every import.

**Checkpoint:** feature parity. Everything works.

---

## The architecture rules you must never break while rebuilding

These come from `new-structure.md`; they're what keeps the codebase intern-readable:

1. **Layers never import upward.** `engine/` imports nothing. `services/` never imports from `modules/`. If you're in a service and you want something from `shared/`, the thing is in the wrong place (that's exactly why `subscriptionLimits.ts` lives in `config/`, not `shared/`).
2. **A module's `components/` folder is private.** The only thing a module exports is its screen, through `index.ts`.
3. **`shared/` requires ≥ 2 unrelated consumers.** Yes, even if you're "sure" someone else will need it later.
4. **One storage file per domain.** New feature that persists data = new storage file.
5. **Hex colors and font sizes live only in `theme/`.**
6. **The navigation tree is the module tree.** New screen → new home in `modules/`.

## Rough calendar

| Week | Phases | You end the week with |
|---|---|---|
| 1 | 1–4 | All types, theme, config, and a fully tested math engine |
| 2 | 5–8 | Storage, i18n, shared UI kit, and a navigable empty app |
| 3 | 9–10 | Auth + the entire AI service layer |
| 4 | 11–12 | Progress tab + complete onboarding |
| 5 | 13 | The whole Plan tab |
| 6 | 14 | Photos, Shop, Coach — feature parity |

Six weeks is honest for someone new to React Native who is actually doing the read–close–rebuild–compare loop. Rushing it defeats the point: the goal isn't a second copy of Gymman, it's that at the end, *nothing in this codebase is mysterious to you.*
