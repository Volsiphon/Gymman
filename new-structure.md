# Gymman — Project Structure

This file is the single source of truth for how the codebase is organized. It describes what **is**, not what might be — if reality and this document disagree, one of them is a bug.

## Guiding principles

1. **Where it lives tells you what it is.** A file's folder path should answer: "what domain does this serve?" before you even open it.
2. **A module owns everything it needs.** Screens, sub-components, local logic — all inside the module. Nothing bleeds out. Nothing sneaks in.
3. **Shared means ≥ 2 unrelated modules need it.** If only one module uses a component, that component belongs *inside* that module, not in `shared/`.
4. **Layers never talk upward.** `engine/` never imports from `services/`. `services/` never imports from `modules/`. `modules/` can import from all three below it. Violations of this are bugs, not judgment calls.
5. **The navigation tree is the module tree.** Every stack and every tab maps 1:1 to a module (or sub-folder of a module). If a screen exists in navigation, it has a home in `modules/`.

---

## Full tree

```
gymman/
├── App.tsx                      ← Root entry: wraps providers, mounts RootNavigator
├── supabase/
│   └── schema.sql               ← user_data + entitlements tables, RLS, storage bucket
│                                   (run manually once in the Supabase SQL editor)
│
├── src/
│   ├── app/                     ← The spine of the app
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx        ← Authenticated + onboarded? → Main. Else → Onboarding
│   │   │   ├── OnboardingNavigator.tsx  ← Linear stack, no tab bar (starts at Login for returning devices)
│   │   │   ├── MainTabNavigator.tsx     ← 5 bottom tabs (provides GoalsContext)
│   │   │   ├── PlanNavigator.tsx        ← Stack inside the Plan tab
│   │   │   └── types.ts                 ← All navigation param lists in one place
│   │   └── providers/
│   │       ├── ThemeProvider.tsx
│   │       ├── AuthProvider.tsx         ← Supabase session context; remounts app on sign-out
│   │       └── SubscriptionProvider.tsx ← Tier from `entitlements` when signed in, local override otherwise
│   │
│   ├── modules/                 ← Every feature the user sees
│   │   │
│   │   ├── onboarding/          ← First-launch flow, never revisited
│   │   │   ├── screens/
│   │   │   │   ├── LanguageSelectionScreen.tsx   ← First screen, renders static text
│   │   │   │   ├── WelcomeScreen.tsx
│   │   │   │   ├── LoginScreen.tsx               ← Email/Google/phone; skips to Main if profile exists
│   │   │   │   ├── GoalDescriptionScreen.tsx     ← User types their goal in their own words
│   │   │   │   ├── OnboardingChatScreen.tsx      ← AI chat that collects physical stats
│   │   │   │   ├── PhotoCaptureScreen.tsx        ← Optional step
│   │   │   │   ├── GoalAnalysisScreen.tsx        ← AI analyses the goal live (3-phase)
│   │   │   │   ├── StatsRevealScreen.tsx         ← Calculated BMR/TDEE/body fat (calls engine/ directly)
│   │   │   │   └── ExecutionPlanScreen.tsx       ← Final screen: here is your plan
│   │   │   └── index.ts
│   │   │
│   │   ├── plan/                ← The entire Plan tab and everything reachable from it
│   │   │   │
│   │   │   ├── home/            ← PlanScreen: the Plan tab's root/dashboard
│   │   │   │   ├── PlanScreen.tsx
│   │   │   │   ├── PlaceholderDetailScreen.tsx  ← "Being built" screen for unimplemented plan sub-screens
│   │   │   │   ├── components/
│   │   │   │   │   ├── PlanHeader.tsx              ← GYMMAN brand + STREAK pill + 7-DAY pill
│   │   │   │   │   ├── TodayTargets.tsx            ← Calories / Goal Weight / Macros card
│   │   │   │   │   ├── TargetsCarousel.tsx         ← Swipeable targets card carousel
│   │   │   │   │   ├── BodyCompositionCard.tsx     ← BMI / body fat / lean mass display
│   │   │   │   │   ├── SectionCard.tsx             ← Tappable card → Diet / Training / Burn
│   │   │   │   │   ├── BloodworkButton.tsx         ← Red pill → Bloodwork screen
│   │   │   │   │   ├── AccountModal.tsx            ← Account sheet: profile, sign-out, tier
│   │   │   │   │   ├── FlameCol.tsx                ← Single animated flame column
│   │   │   │   │   ├── StreakModal.tsx             ← Full streak breakdown sheet
│   │   │   │   │   └── StreakCelebrationModal.tsx  ← Pop-up when a new flame lights
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── diet/            ← Diet logging + AI nutrition coach
│   │   │   │   ├── DietScreen.tsx         ← Owns today's log state, switches the three tabs
│   │   │   │   ├── utils.ts               ← uid() + applyDietActions() log reducer
│   │   │   │   ├── components/
│   │   │   │   │   ├── TodayTab.tsx           ← Calorie/macro summary + food log list
│   │   │   │   │   ├── DietCoachTab.tsx       ← AI chat that writes to the log via [DIET:] actions
│   │   │   │   │   ├── HistoryTab.tsx         ← Past days' summaries (placeholder data for now)
│   │   │   │   │   ├── ManualLogModal.tsx     ← Bottom sheet: log a meal by hand
│   │   │   │   │   ├── ChatHistoryPanel.tsx   ← Full-screen list of past nutrition chats
│   │   │   │   │   └── MacroBar.tsx           ← Progress bar for one macro
│   │   │   │   ├── data/
│   │   │   │   │   └── kerala-foods-library.json
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── training/        ← AI trainer + routine management + workout logging
│   │   │   │   ├── TrainingScreen.tsx     ← Orchestrates the four tabs
│   │   │   │   ├── components/
│   │   │   │   │   ├── TrainerIntroView.tsx   ← AI trainer intro + chat (Trainer tab)
│   │   │   │   │   ├── RoutineDisplay.tsx     ← Weekly routine: chip selector + DayCards (Routine tab)
│   │   │   │   │   ├── DayCard.tsx            ← One training day: exercises + weight inputs
│   │   │   │   │   ├── TodayWorkoutView.tsx   ← Log today's actual sets (Today tab)
│   │   │   │   │   └── HistoryView.tsx        ← Past workout sessions (History tab)
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── calory-burn/     ← Daily activity burn logging + Dynamic Mode
│   │   │   │   ├── CaloryBurnScreen.tsx   ← Owns activity state + inline AI activity parser
│   │   │   │   ├── components/
│   │   │   │   │   ├── TodayTab.tsx           ← Dynamic Mode toggle + activity list + AI bar
│   │   │   │   │   ├── HistoryTab.tsx         ← Past days' activity summaries
│   │   │   │   │   └── ManualAddModal.tsx     ← Bottom sheet: add activity by hand
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── bloodwork/       ← Blood marker tracker (accessible from Plan home)
│   │   │   │   ├── BloodworkScreen.tsx    ← Summary card + past logs list
│   │   │   │   ├── utils.ts               ← TIER_GROUPS + date/count helpers shared by screen + modals
│   │   │   │   ├── components/
│   │   │   │   │   ├── PrepTipsCard.tsx       ← Expandable "before your draw" tips
│   │   │   │   │   ├── AddLogModal.tsx        ← Full-screen form: enter lab values by tier
│   │   │   │   │   └── LogDetailModal.tsx     ← Full-screen view of a past log entry
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── review/          ← 7-day weekly review + plan calibration
│   │   │       ├── SevenDayScreen.tsx     ← Calls the engine, lays out the cards (placeholder data for now)
│   │   │       ├── components/
│   │   │       │   ├── DayGrid.tsx            ← M–S dots: diet logged / weight logged
│   │   │       │   ├── CalorieSummary.tsx     ← Avg daily eaten vs. target, weekly net
│   │   │       │   ├── WeightTracker.tsx      ← Start/end weight, actual vs. expected change
│   │   │       │   ├── CalibrationCard.tsx    ← Implied maintenance, confidence level
│   │   │       │   └── InsightsList.tsx       ← Bullet insights from the engine
│   │   │       └── index.ts
│   │   │
│   │   ├── progress/            ← Daily body weight log + trend chart
│   │   │   ├── ProgressScreen.tsx
│   │   │   ├── utils.ts               ← Date formatting shared by screen + chart
│   │   │   ├── components/
│   │   │   │   └── WeightChart.tsx        ← Custom line chart built from plain Views
│   │   │   └── index.ts
│   │   │
│   │   ├── photos/              ← Transformation photo storage
│   │   │   ├── PhotosScreen.tsx       ← Camera + gallery + grid + full-screen viewer
│   │   │   └── index.ts               (cloud photo upload for premium/ultra via photoCloud)
│   │   │
│   │   ├── coach/               ← Master AI coach with full app context
│   │   │   ├── CoachScreen.tsx        ← Voice input (Whisper) + speech output live here
│   │   │   ├── components/
│   │   │   │   ├── ChatView.tsx           ← Stateful chat UI wired to masterCoach
│   │   │   │   └── ChatHistoryPanel.tsx   ← Past master-coach chats (masterChatStorage)
│   │   │   └── index.ts
│   │   │
│   │   └── shop/                ← Vetted gym products marketplace
│   │       ├── ShopScreen.tsx         ← Local product data, no external calls
│   │       └── index.ts
│   │
│   ├── engine/                  ← Pure math. No UI. No storage. No API calls.
│   │   │                           Given numbers → returns numbers. Always testable in isolation.
│   │   ├── body-metrics/
│   │   │   ├── bmr.ts           ← Basal Metabolic Rate (Mifflin-St Jeor)
│   │   │   ├── tdee.ts          ← Total Daily Energy Expenditure
│   │   │   ├── body-fat.ts      ← Body fat % (Navy method)
│   │   │   ├── bmi.ts           ← Body Mass Index
│   │   │   ├── lean-mass.ts     ← Lean body mass
│   │   │   └── index.ts
│   │   ├── goal-engine/
│   │   │   ├── goal-classifier.ts   ← Cut / bulk / recomp / maintain
│   │   │   ├── realism-check.ts     ← Is this timeline achievable?
│   │   │   ├── path-calculator.ts   ← Weeks to goal at current deficit/surplus
│   │   │   └── index.ts
│   │   ├── nutrition/
│   │   │   ├── maintenance-cal.ts   ← TDEE with/without logged activity
│   │   │   ├── target-cal.ts        ← Calorie target from goal type + timeline
│   │   │   ├── dynamic-adjustor.ts  ← Recalculate target when Dynamic Mode is on
│   │   │   ├── macros.ts            ← Protein/fat/carb targets from calorie goal + LBM
│   │   │   └── index.ts
│   │   └── weekly-review/
│   │       ├── data-analyzer.ts     ← Crunch a week of logs: surplus, trend, confidence
│   │       ├── plan-adjustor.ts     ← Given analysis, what should next week's target be?
│   │       └── index.ts
│   │
│   ├── services/                ← Everything that talks to the outside world
│   │   │                           Modules call services. Services never call modules.
│   │   │
│   │   ├── ai/                  ← One file per coach/role — different prompts, different rules
│   │   │   ├── client.ts              ← Groq API connection: aiChat, aiVisionChat
│   │   │   ├── rateLimiter.ts         ← Daily counters for AI messages + photo scans, per tier
│   │   │   ├── whisper.ts             ← Voice input: audio file → Groq Whisper → transcript
│   │   │   ├── nutritionCoach.ts      ← Diet AI: parses food, estimates macros, edits the log
│   │   │   ├── trainerCoach.ts        ← Training AI: builds routines, coaches form
│   │   │   ├── masterCoach.ts         ← Coach tab: full journey context, can modify targets
│   │   │   ├── goalAnalysis.ts        ← Onboarding: 3-phase goal interpretation, realism check, prescription
│   │   │   ├── executionPlan.ts       ← Onboarding: generates personalised training + diet execution content
│   │   │   ├── onboardingChat.ts      ← Onboarding: structured questionnaire chat AI (stat collection)
│   │   │   ├── onboardingCoach.ts     ← Onboarding: acknowledgment AI (warm replies after each answer)
│   │   │   ├── statParser.ts          ← Onboarding: AI-based field parser (groqParseField)
│   │   │   └── physicalStatsParser.ts ← Onboarding: regex fallback parsers when the API is down
│   │   │
│   │   ├── storage/
│   │   │   ├── localEnvelope.ts ← THE storage primitive. Every local/ file goes through this.
│   │   │   │                       Signed in: Supabase `user_data` is the source of truth,
│   │   │   │                       AsyncStorage is a per-user write-through cache with an
│   │   │   │                       offline pending-write queue. Signed out: AsyncStorage only.
│   │   │   │
│   │   │   ├── local/           ← One file per data domain (never consolidate these)
│   │   │   │   │
│   │   │   │   │   USER
│   │   │   │   ├── userProfileStorage.ts   ← Complete UserProfile: physical stats + computed values
│   │   │   │   ├── profileStorage.ts       ← Nutrition goals (calories, macros) — quick-access targets
│   │   │   │   ├── userBioStorage.ts       ← BMR, goal offset (computed during onboarding)
│   │   │   │   │
│   │   │   │   │   PLAN — DIET
│   │   │   │   ├── dietLogStorage.ts       ← Today's food log (resets daily)
│   │   │   │   ├── dietChatStorage.ts      ← Nutrition coach chat sessions
│   │   │   │   │
│   │   │   │   │   PLAN — TRAINING
│   │   │   │   ├── planStorage.ts          ← Saved training routines
│   │   │   │   ├── workoutStorage.ts       ← Completed workout session logs
│   │   │   │   ├── exerciseWeightStorage.ts ← Per-exercise working weights
│   │   │   │   ├── trainerChatStorage.ts   ← AI trainer chat sessions
│   │   │   │   ├── historyStorage.ts       ← General training history
│   │   │   │   │
│   │   │   │   │   PLAN — CALORY BURN
│   │   │   │   ├── caloryBurnStorage.ts    ← Daily activity logs + dynamic mode flag
│   │   │   │   │
│   │   │   │   │   PLAN — BLOODWORK
│   │   │   │   ├── bloodworkStorage.ts     ← Blood marker logs + the METRICS catalogue
│   │   │   │   │
│   │   │   │   │   PROGRESS
│   │   │   │   ├── bodyWeightStorage.ts    ← Daily body weight entries
│   │   │   │   │
│   │   │   │   │   PHOTOS
│   │   │   │   ├── photoStorage.ts         ← Transformation photo metadata + URIs
│   │   │   │   │
│   │   │   │   │   COACH
│   │   │   │   └── masterChatStorage.ts    ← Master coach chat sessions
│   │   │   │
│   │   │   └── cloud/
│   │   │       ├── client.ts          ← Supabase client singleton (session persisted to AsyncStorage)
│   │   │       └── photoCloud.ts      ← Binary photo upload/list to Supabase Storage (premium/ultra only)
│   │   │
│   │   ├── auth/
│   │   │   └── authService.ts         ← Sign up/in/out, session, Supabase Auth
│   │   │                                 (Google OAuth + phone SMS: code-complete, provider setup pending)
│   │   └── weeklyReview/
│   │       └── weeklyReviewService.ts ← STUB: will bridge SevenDayScreen ↔ engine ↔ storage
│   │
│   ├── contexts/                ← React Contexts for cross-cutting computed state
│   │   └── GoalsContext.tsx     ← Dynamic calorie goals: bridges CaloryBurn ↔ Diet ↔ PlanHome
│   │                               (Provided at MainTabNavigator level, consumed by 3 screens)
│   │
│   ├── store/                   ← Global state that must cross module boundaries
│   │   ├── user/                ← (stubs — see todo.txt; wire up when needed)
│   │   ├── plan/
│   │   ├── streak/
│   │   ├── subscription/
│   │   ├── language/
│   │   └── index.ts
│   │
│   ├── shared/                  ← ONLY what 2+ unrelated modules actually use
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx              ← LabeledInput (login + forms)
│   │   │   ├── Modal.tsx
│   │   │   ├── ChatInterface.tsx      ← Generic chat bubble UI (nutrition + trainer share it)
│   │   │   └── CollapsibleTabBar.tsx  ← Tab strip used by Diet, Training, AND Calory Burn
│   │   ├── hooks/
│   │   │   ├── useSubscription.ts     ← Reads subscription tier from store
│   │   │   ├── usePremiumGate.ts      ← Shows upgrade prompt on gated features
│   │   │   └── useLocalDate.ts        ← Consistent today's date (streak + history accuracy)
│   │   ├── utils/
│   │   │   ├── dateUtils.ts
│   │   │   └── formatters.ts
│   │   └── constants/
│   │       └── appConstants.ts        ← App-wide magic numbers and string keys
│   │
│   ├── theme/                   ← Design tokens only. No logic, no components.
│   │   ├── colors.ts            ← Full color palette. Hex values live ONLY here.
│   │   ├── typography.ts        ← Font families, sizes, weights, line heights
│   │   ├── spacing.ts           ← Spacing scale, border radii, button/input heights
│   │   └── index.ts
│   │
│   ├── types/                   ← Shared TypeScript contracts
│   │   ├── user.ts              ← UserProfile, OnboardingData, BodyMetrics, Goal, NutritionGoals
│   │   ├── plan.ts              ← FoodEntry, Routine, RoutineDay, Exercise, WorkoutLog, ActivityEntry
│   │   ├── coaching.ts          ← ChatMessage, ChatSession, DietChat, CoachContext
│   │   ├── subscription.ts      ← SubscriptionTier
│   │   ├── shop.ts              ← Product, CartItem, Order, VettedBadge
│   │   └── index.ts
│   │
│   ├── i18n/
│   │   ├── index.ts             ← Configures i18next, sets fallback to English
│   │   └── languageDetector.ts  ← Reads persisted language from store on startup
│   │
│   ├── locales/
│   │   ├── en/
│   │   ├── ml/          ← Malayalam (Unicode) — needs Noto Sans Malayalam in assets/fonts/
│   │   └── manglish/    ← Phonetic Malayalam in Latin script, no special font needed
│   │
│   └── config/          ← Bottom-layer app configuration. Anyone may import from here.
│       ├── keys.ts                ← API keys and environment config (never commit secrets)
│       └── subscriptionLimits.ts  ← All free/premium/ultra limits in one file
│
└── assets/
    ├── fonts/           ← Custom typefaces, including Noto Sans Malayalam
    ├── images/          ← Static images: logo, illustrations, shop product photos
    ├── animations/      ← Lottie JSON files for celebrations and loading states
    └── icons/           ← App icon variants for iOS and Android
```

---

## Layer reference

| Layer | What it contains | What it may import |
|---|---|---|
| `config/` | Keys, environment, tier limits | Nothing (plus `types/`) |
| `theme/` | Design tokens | Nothing |
| `types/` | TypeScript contracts | Nothing |
| `engine/` | Pure math functions | Nothing from src/ |
| `services/` | I/O: AI, storage, auth | `engine/`, `types/`, `config/` |
| `store/` | Global runtime state | `types/` |
| `contexts/` | React Contexts for computed cross-module state | `services/`, `store/`, `engine/` |
| `shared/` | Components, hooks, utils used by ≥ 2 modules | `theme/`, `types/`, `store/` |
| `modules/` | All UI and feature logic | `services/`, `engine/`, `store/`, `contexts/`, `shared/`, `theme/`, `types/`, `config/` |
| `app/` | Navigation + Providers | `modules/`, `store/`, `contexts/`, `services/` |

---

## Module anatomy — the standard shape

Every module follows the same pattern:

```
modules/feature/
├── FeatureScreen.tsx        ← Owns the state, orchestrates the tabs/sections
├── utils.ts                 ← (optional) helpers shared by the screen and its components
├── components/              ← UI pieces only used inside this module
│   └── SomeComponent.tsx
└── index.ts                 ← The only exit point. Exports the screen, nothing else.
```

The screen file holds state and handlers; `components/` holds the presentational pieces it composes. A component's single-use helpers live inside the component file; helpers used by both the screen and a component go in the module's `utils.ts`. Nothing inside `components/` is ever imported from outside the module.

`plan/` is the exception in shape only: it's a stack navigator, so it holds one sub-folder per stack screen (`home/`, `diet/`, `training/`, `calory-burn/`, `bloodwork/`, `review/`), and each sub-folder follows the standard shape.

---

## Module-by-module notes

### `modules/onboarding/`

The first-launch flow. Runs once, then never again (except Login, which the RootNavigator returns to after sign-out).

**Screens in order:**
```
LanguageSelectionScreen → WelcomeScreen → LoginScreen → GoalDescriptionScreen
→ OnboardingChatScreen (AI chat collects physical stats) → PhotoCaptureScreen (optional)
→ GoalAnalysisScreen → StatsRevealScreen → ExecutionPlanScreen
```

All body-composition math comes straight from `engine/` (`computeBodyStats`, `classifyGoal`, `calcCalorieTarget`, `calcMacros`) — there is no onboarding-local calculation file. The AI helpers it uses all live in `services/ai/` (goalAnalysis, executionPlan, onboardingChat, onboardingCoach, statParser, physicalStatsParser).

### `modules/plan/`

The Plan tab is a **stack** navigator, not a tab. `PlanScreen` is the root hub. Tapping a section card navigates deeper into the same stack.

```
Plan tab → PlanNavigator (stack)
├── PlanHome       → modules/plan/home/PlanScreen.tsx
├── Diet           → modules/plan/diet/DietScreen.tsx
├── Training       → modules/plan/training/TrainingScreen.tsx
├── CaloryBurn     → modules/plan/calory-burn/CaloryBurnScreen.tsx
├── Bloodwork      → modules/plan/bloodwork/BloodworkScreen.tsx
└── SevenDay       → modules/plan/review/SevenDayScreen.tsx
```

**Why Bloodwork is here, not its own top-level module:** it's not a bottom tab; it's a screen you navigate to from PlanScreen. Same navigator, same domain.

**Why the streak lives in `plan/home/` and not its own module:** the streak *UI* — flames, celebration modal, detail sheet — is rendered and owned by `PlanScreen`. The streak *data* flows through `store/streak/`. No separate screens, no separate navigator.

**Why the 7-day review is `plan/review/` and not `engine/weekly-review/`:** `engine/weekly-review/` is the pure math; `plan/review/` is the UI that calls it and displays it. `engine/` computes, `modules/` displays.

### `modules/coach/` vs the shared ChatInterface

`ChatView.tsx` and `ChatHistoryPanel.tsx` live inside `coach/components/` — not `shared/` — because only this module uses them. The `ChatInterface.tsx` in `shared/` is the generic, stateless chat bubble layout used by *both* the nutrition and trainer coach UIs. Note the diet module has its own `ChatHistoryPanel.tsx` too — same name, different storage backend (dietChatStorage vs masterChatStorage), each private to its module. The Coach screen also owns the voice features: mic input through `services/ai/whisper.ts`, spoken replies through expo-speech.

### `modules/progress/`, `modules/photos/`, `modules/shop/`

Single-screen modules. Progress extracts `WeightChart` because the chart math deserves its own file. Photos keeps everything in one file (camera, gallery, grid, viewer) — extract components only when it grows. Shop is local product data with no external calls.

---

## `services/ai/` — one file per role

Each AI file has a distinct job and distinct system prompt. They never overlap.

| File | Who calls it | What it does |
|---|---|---|
| `client.ts` | all other ai/ files + modules | Groq API connection — swap providers by changing only this file |
| `rateLimiter.ts` | any screen that sends AI messages | Daily counters (AI messages, photo scans) checked against `config/subscriptionLimits.ts` |
| `whisper.ts` | `modules/coach/` | Voice input: recorded m4a → Groq Whisper → transcript |
| `nutritionCoach.ts` | `modules/plan/diet/` | Parses food, estimates macros, writes log actions, handles food photos |
| `trainerCoach.ts` | `modules/plan/training/` | Builds routines, coaches form, progressive overload logic |
| `masterCoach.ts` | `modules/coach/` | Full journey context, can propose target changes with user approval |
| `goalAnalysis.ts` | `modules/onboarding/` | 3-phase goal analysis: interpretation, reality check, prescription |
| `executionPlan.ts` | `modules/onboarding/` | Generates personalised training + diet execution content |
| `onboardingChat.ts` | `modules/onboarding/` | Structured questionnaire AI — collects physical stats one field at a time |
| `onboardingCoach.ts` | `modules/onboarding/` | Acknowledgment AI — warm coach replies after each answer |
| `statParser.ts` | `modules/onboarding/` | AI-based field parser (groqParseField) for precise structured parsing |
| `physicalStatsParser.ts` | `onboardingChat.ts` | Regex fallback parsers for when the API is down |

One deliberate exception: `calory-burn/CaloryBurnScreen.tsx` keeps a small inline AI activity parser (system prompt + JSON extraction) instead of a services/ai file. It's ~10 lines, used by exactly one screen, and modules may call `aiChat` directly.

---

## Storage — how data persistence actually works

### The model (read this first)

**One account, database-primary.** For a signed-in user, Supabase's `user_data` table (`user_id, domain, payload jsonb`) is the source of truth for every text domain — routines, diet logs, bloodwork, calory burn, photo metadata, progress, profile, targets. AsyncStorage is a **write-through cache**: it makes the app open instantly and tolerate brief offline stretches, but it is never authoritative and never needs conflict resolution — the server wins when reachable. Signed out (pre-login onboarding), AsyncStorage is all there is.

There is **no sync engine**. An earlier push/pull/last-write-wins design (`services/sync/`) was built and deliberately removed as overcomplicated. Do not reintroduce it; the direct read/write model in `localEnvelope.ts` covers every case, including per-day keys (each day is just its own `domain` string).

### `services/storage/localEnvelope.ts`

The single primitive every domain file goes through. It handles, in one place:
- **Cache keys scoped by userId** so two accounts on one device never see each other's data.
- **"Cloud says empty" ≠ "cloud unreachable"** — a successful read that finds no row returns null and does *not* fall back to cache (this distinction fixed a real cross-account bug; the file's header comment tells the story).
- **Offline pending-write queue** — a failed cloud write still lands in the local cache instantly (UI never sees a failure) and drains on the next successful call or app foreground. Queue entries are tagged per-userId.
- **Legacy key migration** — old raw AsyncStorage keys are found once, migrated forward, and pushed to the cloud.

### `services/storage/local/` — one file per data domain

15 files, one per domain. That is deliberate design, not sprawl:
- Reading `caloryBurnStorage.ts` tells you exactly what gets persisted for calory burn, with no noise.
- A bug in diet storage cannot affect workout storage.
- Adding a feature means adding a file, not modifying one.

Public function signatures stay domain-shaped (`loadTodayLog()`, `saveBodyWeight()`); the envelope is purely internal plumbing.

### `services/storage/cloud/`

Only two files: `client.ts` (the Supabase client singleton) and `photoCloud.ts` (the one true exception to "text goes through the envelope" — actual photo *bytes* upload to a private Storage bucket, premium/ultra only, automatic by tier).

### Auth and entitlements

- `services/auth/authService.ts` — Supabase email/Google/phone sign-in. Google needs an OAuth client ID in the Supabase dashboard; phone needs an SMS provider. Both code-complete, untested against live providers.
- `app/providers/AuthProvider.tsx` — session context; gates rendering until the initial session check resolves; forces a clean remount on sign-out.
- `app/providers/SubscriptionProvider.tsx` — reads tier from the `entitlements` table when signed in, falls back to the local dev-override tier otherwise. This is the seam a future Play Store IAP handler or Razorpay/UPI webhook writes into without touching the provider again.
- `supabase/schema.sql` — the full table/RLS/bucket setup. Run manually once; not part of the app build.

---

## `contexts/GoalsContext.tsx`

The bridge between **Calory Burn** and **Diet**. When Dynamic Mode is on, the user's diet calorie target changes throughout the day based on what they actually burned. Three screens consume it: `PlanScreen` (today's targets), `DietScreen` (calorie goal in the macros card), and `CaloryBurnScreen` (toggles dynamic mode and calls `refresh()` on every change).

It's a React Context, not a store slice, because it computes a derived value from multiple storage reads on each focus event — it doesn't need to persist between app restarts. It is provided at `MainTabNavigator` level, wrapping exactly the screens that need it.

---

## `shared/` — the strict rule

Something belongs in `shared/` if and only if **two or more unrelated modules** need it. If a module is the only user, the component lives inside that module.

**Currently in `shared/` (correctly):**
- `CollapsibleTabBar.tsx` — used by `diet/`, `training/`, AND `calory-burn/`
- `ChatInterface.tsx` — the stateless chat bubble layout used by diet and training coaches
- `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx` — universal primitives
- All hooks and utils

**Deliberately NOT in `shared/`:**
- `ChatView.tsx`, `ChatHistoryPanel.tsx` → `modules/coach/components/` — only Coach uses them
- `TrainerIntroView.tsx`, `TodayWorkoutView.tsx`, `HistoryView.tsx`, `RoutineDisplay.tsx`, `DayCard.tsx` → `modules/plan/training/components/`
- Every tab/modal of diet, calory-burn, bloodwork, review → their own module's `components/`
- `subscriptionLimits.ts` → `src/config/` — it's tier configuration, not UI, and `services/` needs it too (shared/ would be an upward import for a service)

---

## `types/` — one file per domain

| File | Types it contains |
|---|---|
| `user.ts` | `UserProfile`, `OnboardingData`, `BodyMetrics`, `Goal`, `NutritionGoals`, `UserPhysicalStats` |
| `plan.ts` | `FoodEntry`, `Routine`, `RoutineDay`, `Exercise`, `WorkoutLog`, `ActivityEntry`, `DayActivities`, `WeightLog` |
| `coaching.ts` | `ChatMessage`, `ChatSession`, `DietChat`, `StoredDietMessage`, `CoachContext` |
| `subscription.ts` | `SubscriptionTier` |
| `shop.ts` | `Product`, `CartItem`, `Order`, `VettedBadge` |

---

## Navigation hierarchy

```
App.tsx
└── RootNavigator                    (auth + onboarding gate)
    ├── OnboardingNavigator          (until authenticated + onboarded;
    │   │                             starts at Login if this device has seen an account before)
    │   ├── LanguageSelectionScreen
    │   ├── WelcomeScreen
    │   ├── LoginScreen
    │   ├── GoalDescriptionScreen
    │   ├── OnboardingChatScreen
    │   ├── PhotoCaptureScreen
    │   ├── GoalAnalysisScreen
    │   ├── StatsRevealScreen
    │   └── ExecutionPlanScreen
    │
    └── MainTabNavigator             (5 bottom tabs; provides GoalsContext)
        │
        ├── Plan tab → PlanNavigator (stack)
        │   ├── PlanHome      ← Dashboard: streak, targets, section cards
        │   ├── Diet          ← Today / Coach / History
        │   ├── Training      ← Trainer / Routine / Today / History
        │   ├── CaloryBurn    ← Today / History
        │   ├── Bloodwork     ← Log viewer + entry form
        │   └── SevenDay      ← Weekly analysis + calibration
        │
        ├── Progress tab      ← Weight chart + daily log
        ├── Photos tab        ← Camera + grid + full-screen
        ├── Coach tab         ← Master AI chat (voice in/out)
        └── Shop tab          ← Product grid
```

---

## Quick lookup: where to open when you want to change something

| I want to change… | Open |
|---|---|
| The tab bar or which screens exist | `app/navigation/MainTabNavigator.tsx` |
| The onboarding flow order | `app/navigation/OnboardingNavigator.tsx` |
| Anything in the onboarding UX | `modules/onboarding/screens/` |
| The Plan hub screen (streak, targets, section cards) | `modules/plan/home/PlanScreen.tsx` |
| The streak flames or streak modal | `modules/plan/home/components/` |
| Diet logging or food coach | `modules/plan/diet/` |
| Training AI or routine display | `modules/plan/training/` |
| Calory burn logging or Dynamic Mode | `modules/plan/calory-burn/` |
| Bloodwork tracker | `modules/plan/bloodwork/` |
| 7-day weekly review | `modules/plan/review/` |
| Body weight chart or logging | `modules/progress/` |
| Transformation photos | `modules/photos/` |
| The master AI Coach (incl. voice) | `modules/coach/` |
| The shop | `modules/shop/` |
| Any body composition formula | `engine/body-metrics/` |
| Any calorie calculation | `engine/nutrition/` |
| The 7-day recalibration math | `engine/weekly-review/` |
| Nutrition AI system prompt or food logic | `services/ai/nutritionCoach.ts` |
| Trainer AI system prompt | `services/ai/trainerCoach.ts` |
| Master Coach personality | `services/ai/masterCoach.ts` |
| Swap the AI provider for the whole app | `services/ai/client.ts` |
| AI daily message / photo-scan limits | `services/ai/rateLimiter.ts` + `config/subscriptionLimits.ts` |
| How any data is cached / synced to Supabase | `services/storage/localEnvelope.ts` |
| How diet data is saved/loaded | `services/storage/local/dietLogStorage.ts` |
| How workout data is saved/loaded | `services/storage/local/workoutStorage.ts` |
| Sign in / sign up / sign out | `services/auth/authService.ts` + `app/providers/AuthProvider.tsx` |
| Dynamic Mode ↔ Diet calorie link | `contexts/GoalsContext.tsx` |
| Free vs premium feature limits | `config/subscriptionLimits.ts` |
| The collapsible tab bar | `shared/components/CollapsibleTabBar.tsx` |
| Colors, fonts, spacing | `src/theme/` |
| API keys | `src/config/keys.ts` |
| Database tables / RLS / buckets | `supabase/schema.sql` |
| English copy | `locales/en/` |
| Malayalam copy | `locales/ml/` |
| Manglish copy | `locales/manglish/` |
