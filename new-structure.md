# Gymman — Ideal Project Structure

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
│
├── src/
│   ├── app/                     ← The spine of the app
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx        ← Onboarded? → Main. Else → Onboarding
│   │   │   ├── OnboardingNavigator.tsx  ← Linear stack, no tab bar
│   │   │   ├── MainTabNavigator.tsx     ← 5 bottom tabs
│   │   │   ├── PlanNavigator.tsx        ← Stack inside the Plan tab
│   │   │   └── types.ts                 ← All navigation param lists in one place
│   │   └── providers/
│   │       ├── ThemeProvider.tsx
│   │       ├── AuthProvider.tsx
│   │       └── SubscriptionProvider.tsx
│   │
│   ├── modules/                 ← Every feature the user sees
│   │   │
│   │   ├── onboarding/          ← First-launch flow, never revisited
│   │   │   ├── screens/
│   │   │   │   ├── LanguageSelectionScreen.tsx   ← First screen, renders static text
│   │   │   │   ├── WelcomeScreen.tsx
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── PhysicalStatsScreen.tsx
│   │   │   │   ├── PhotoCaptureScreen.tsx        ← Optional step
│   │   │   │   ├── GoalDescriptionScreen.tsx
│   │   │   │   ├── GoalAnalysisScreen.tsx        ← AI analyses the goal live
│   │   │   │   ├── StatsRevealScreen.tsx         ← Shows calculated BMR/TDEE/body fat
│   │   │   │   └── ExecutionPlanScreen.tsx       ← Final screen: here is your plan
│   │   │   ├── components/                       ← UI pieces only used in onboarding
│   │   │   ├── utils/
│   │   │   │   ├── fitnessCalculations.ts        ← BMR/TDEE helpers for the reveal screen
│   │   │   │   └── physicalStatsParser.ts        ← Parses freeform stat text from AI
│   │   │   └── index.ts
│   │   │
│   │   ├── plan/                ← The entire Plan tab and everything reachable from it
│   │   │   │
│   │   │   ├── home/            ← PlanScreen: the Plan tab's root/dashboard
│   │   │   │   ├── PlanScreen.tsx
│   │   │   │   └── components/
│   │   │   │       ├── PlanHeader.tsx              ← GYMMAN brand + STREAK pill + 7-DAY pill
│   │   │   │       ├── TodayTargets.tsx            ← Calories / Goal Weight / Macros card
│   │   │   │       ├── SectionCard.tsx             ← Tappable card → Diet / Training / Burn
│   │   │   │       ├── BloodworkButton.tsx         ← Red pill → Bloodwork screen
│   │   │   │       ├── FlameCol.tsx                ← Single animated flame column
│   │   │   │       ├── StreakModal.tsx              ← Full streak breakdown sheet
│   │   │   │       └── StreakCelebrationModal.tsx  ← Pop-up when a new flame lights
│   │   │   │
│   │   │   ├── diet/            ← Diet logging + AI nutrition coach
│   │   │   │   ├── DietScreen.tsx
│   │   │   │   └── components/
│   │   │   │       ├── TodayTab.tsx           ← Calorie/macro summary + food log list
│   │   │   │       ├── DietCoachTab.tsx       ← AI chat that writes to the log
│   │   │   │       ├── HistoryTab.tsx         ← Past days' summaries
│   │   │   │       ├── ManualLogModal.tsx     ← Bottom sheet: log a meal by hand
│   │   │   │       ├── ChatHistoryPanel.tsx   ← Full-screen list of past chat sessions
│   │   │   │       └── MacroBar.tsx           ← Reusable progress bar for one macro
│   │   │   │
│   │   │   ├── training/        ← AI trainer + routine management + workout logging
│   │   │   │   ├── TrainingScreen.tsx
│   │   │   │   └── components/
│   │   │   │       ├── TrainerIntroView.tsx   ← AI trainer intro + chat (Trainer tab)
│   │   │   │       ├── RoutineDisplay.tsx     ← Weekly routine card grid (Routine tab)
│   │   │   │       ├── DayCard.tsx            ← One training day: exercises + weight inputs
│   │   │   │       ├── TodayWorkoutView.tsx   ← Log today's actual sets (Today tab)
│   │   │   │       └── HistoryView.tsx        ← Past workout sessions (History tab)
│   │   │   │
│   │   │   ├── calory-burn/     ← Daily activity burn logging + Dynamic Mode
│   │   │   │   ├── CaloryBurnScreen.tsx
│   │   │   │   └── components/
│   │   │   │       ├── TodayTab.tsx           ← Activity list + Dynamic Mode toggle + AI bar
│   │   │   │       ├── HistoryTab.tsx         ← Past days' activity summaries
│   │   │   │       └── ManualAddModal.tsx     ← Bottom sheet: add activity by hand
│   │   │   │
│   │   │   ├── bloodwork/       ← Blood marker tracker (accessible from Plan home)
│   │   │   │   ├── BloodworkScreen.tsx
│   │   │   │   └── components/
│   │   │   │       ├── PrepTipsCard.tsx       ← Expandable "before your draw" tips
│   │   │   │       ├── AddLogModal.tsx        ← Full-screen form: enter lab values
│   │   │   │       └── LogDetailModal.tsx     ← Full-screen view of a past log entry
│   │   │   │
│   │   │   └── review/          ← 7-day weekly review + plan calibration
│   │   │       ├── SevenDayScreen.tsx
│   │   │       └── components/
│   │   │           ├── DayGrid.tsx            ← M–S dots: diet logged / weight logged
│   │   │           ├── CalorieSummary.tsx     ← Avg daily eaten vs. target, weekly net
│   │   │           ├── WeightTracker.tsx      ← Start/end weight, actual vs. expected change
│   │   │           ├── CalibrationCard.tsx    ← Implied maintenance, confidence level
│   │   │           └── InsightsList.tsx       ← Bullet insights from the engine
│   │   │
│   │   ├── progress/            ← Daily body weight log + trend chart
│   │   │   ├── ProgressScreen.tsx
│   │   │   └── components/
│   │   │       └── WeightChart.tsx            ← Custom SVG-style line chart
│   │   │
│   │   ├── photos/              ← Transformation photo storage
│   │   │   └── PhotosScreen.tsx              ← Camera + gallery + grid + full-screen viewer
│   │   │
│   │   ├── coach/               ← Master AI coach with full app context
│   │   │   ├── CoachScreen.tsx
│   │   │   └── components/
│   │   │       └── ChatView.tsx              ← Reusable stateless chat UI used only here
│   │   │
│   │   └── shop/                ← Vetted gym products marketplace
│   │       └── ShopScreen.tsx
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
│   │   ├── calorie-engine/
│   │   │   ├── maintenance-cal.ts   ← TDEE with/without logged activity
│   │   │   ├── target-cal.ts        ← Calorie target from goal type + timeline
│   │   │   ├── dynamic-adjustor.ts  ← Recalculate target when Dynamic Mode is on
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
│   │   │   ├── client.ts              ← Groq API connection: groqChat, groqVisionChat
│   │   │   ├── nutritionCoach.ts      ← Diet AI: parses food, estimates macros, edits the log
│   │   │   ├── trainerCoach.ts        ← Training AI: builds routines, coaches form
│   │   │   ├── masterCoach.ts         ← Coach tab: full journey context, can modify targets
│   │   │   ├── goalAnalyzer.ts        ← Onboarding: interprets goal text, realism check
│   │   │   ├── onboardingCoach.ts     ← Onboarding conversation flow AI
│   │   │   ├── statParser.ts          ← Parses stat data from AI responses during onboarding
│   │   │   └── chatManager.ts         ← Session management: new chat, history, context limits
│   │   │
│   │   ├── storage/
│   │   │   ├── local/           ← AsyncStorage wrappers, one file per data domain
│   │   │   │   │
│   │   │   │   │   USER
│   │   │   │   ├── userStorage.ts          ← Name, basic profile
│   │   │   │   ├── profileStorage.ts       ← Nutrition goals (calories, macros)
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
│   │   │   │   ├── bloodworkStorage.ts     ← Blood marker logs (dated entries)
│   │   │   │   │
│   │   │   │   │   PROGRESS
│   │   │   │   ├── bodyWeightStorage.ts    ← Daily body weight entries
│   │   │   │   │
│   │   │   │   │   PHOTOS
│   │   │   │   └── photoStorage.ts         ← Transformation photo metadata + URIs
│   │   │   │
│   │   │   └── cloud/           ← Cloud mirrors — same signatures as local/, switch by tier
│   │   │       ├── userCloud.ts
│   │   │       ├── planCloud.ts
│   │   │       └── photoCloud.ts
│   │   │
│   │   ├── auth/
│   │   │   └── authService.ts         ← Login, logout, session, Google OAuth
│   │   ├── sync/
│   │   │   └── syncService.ts         ← Migrates local data to cloud on upgrade
│   │   └── weeklyReview/
│   │       └── weeklyReviewService.ts ← Reads data → calls engine → writes adjusted targets
│   │
│   ├── contexts/                ← React Contexts for cross-cutting computed state
│   │   └── GoalsContext.tsx     ← Dynamic calorie goals: bridges CaloryBurn ↔ Diet ↔ PlanHome
│   │                               (Provided at MainTabNavigator level, consumed by 3 screens)
│   │
│   ├── store/                   ← Global state that must cross module boundaries
│   │   ├── user/                ← UserProfile, body metrics, goals, onboarding flag
│   │   ├── plan/                ← Plan-level shared state
│   │   ├── streak/              ← Streak counts (read by Plan home, written by 3 sub-modules)
│   │   ├── subscription/        ← free / premium / max tier (read by almost everything)
│   │   ├── language/            ← Persisted language choice
│   │   └── index.ts
│   │
│   ├── shared/                  ← ONLY what 2+ unrelated modules actually use
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
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
│   │       ├── subscriptionLimits.ts  ← All free/premium/max limits in one file
│   │       └── appConstants.ts
│   │
│   ├── theme/                   ← Design tokens only. No logic, no components.
│   │   ├── colors.ts            ← Full color palette. Hex values live ONLY here.
│   │   ├── typography.ts        ← Font families, sizes, weights, line heights
│   │   ├── spacing.ts           ← Spacing scale, border radii, button/input heights
│   │   └── index.ts
│   │
│   ├── types/                   ← Shared TypeScript contracts
│   │   ├── user.ts              ← UserProfile, OnboardingData, BodyMetrics, Goal, SubscriptionTier
│   │   ├── plan.ts              ← FoodEntry, Routine, RoutineDay, Exercise, WorkoutLog, BurnActivity
│   │   ├── coaching.ts          ← ChatMessage, ChatSession, CoachContext, ContextWindowConfig
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
│   └── config/
│       └── keys.ts      ← API keys and environment config (never commit secrets here)
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
| `engine/` | Pure math functions | Nothing from src/ |
| `services/` | I/O: AI, storage, auth | `engine/`, `types/`, `theme/` (never) |
| `store/` | Global runtime state | `types/` |
| `contexts/` | React Contexts for computed cross-module state | `services/`, `store/`, `engine/` |
| `shared/` | Components, hooks, utils used by ≥ 2 modules | `theme/`, `types/`, `store/` |
| `modules/` | All UI and feature logic | `services/`, `engine/`, `store/`, `contexts/`, `shared/`, `theme/`, `types/` |
| `app/` | Navigation + Providers | `modules/`, `store/`, `contexts/` |

---

## Module-by-module breakdown

### `modules/onboarding/`

The first-launch flow. Runs once, then never again. Completely sealed — nothing outside touches it.

**Screens in order:**
```
LanguageSelectionScreen → WelcomeScreen → LoginScreen → PhysicalStatsScreen
→ PhotoCaptureScreen (optional) → GoalDescriptionScreen → GoalAnalysisScreen
→ StatsRevealScreen → ExecutionPlanScreen
```

`utils/physicalStatsParser.ts` and `utils/fitnessCalculations.ts` are onboarding-only helpers. They live inside this module (not in `shared/`) because nothing else uses them.

---

### `modules/plan/`

The Plan tab is a **stack** navigator, not a tab. `PlanScreen` is the root hub. Tapping a section card navigates deeper into the same stack. Everything reachable from the Plan tab is a sub-folder of `modules/plan/`.

```
Plan tab → PlanNavigator (stack)
├── PlanHome       → modules/plan/home/PlanScreen.tsx
├── Diet           → modules/plan/diet/DietScreen.tsx
├── Training       → modules/plan/training/TrainingScreen.tsx
├── CaloryBurn     → modules/plan/calory-burn/CaloryBurnScreen.tsx
├── Bloodwork      → modules/plan/bloodwork/BloodworkScreen.tsx
└── SevenDay       → modules/plan/review/SevenDayScreen.tsx
```

**Why Bloodwork is here, not its own top-level module:**
Bloodwork is not a bottom tab. It's a screen you navigate to from PlanScreen. It belongs in `plan/` for the same reason `Diet` belongs in `plan/` — same navigator, same domain.

**Why the streak lives in `plan/home/` and not its own module:**
The streak *UI* — the flames, the celebration modal, the streak detail sheet — is all rendered by and owned by `PlanScreen`. The streak *data* flows through `store/streak/` (so CaloryBurn and Training can write to it, and PlanHome can read it). No separate screens, no separate navigator. `plan/home/components/` holds all of it.

**Why the 7-day review is `plan/review/` and not `engine/weekly-review/`:**
`engine/weekly-review/` contains the pure math. `plan/review/SevenDayScreen.tsx` is the UI that calls that math and displays it. The naming mirrors the relationship: `engine/` computes, `modules/` displays.

---

### `modules/progress/`

Single screen. Daily body weight log + line chart. The chart component is extracted into `components/WeightChart.tsx` because it is complex enough to deserve its own file, even if only used once inside this module.

---

### `modules/photos/`

Single screen. The entire feature — camera, gallery, grid, full-screen viewer — lives in one file. If it grows, extract components here. Today it does not need to.

---

### `modules/coach/`

Single screen. The Master AI Coach. `ChatView.tsx` lives inside `coach/components/` — not in `shared/` — because only this module uses it. The `ChatInterface.tsx` in `shared/` is the generic, stateless chat bubble layout used by *both* the nutrition coach UI and the trainer coach UI. `ChatView` is a stateful wrapper that connects to `masterCoachChat` specifically.

---

### `modules/shop/`

Single screen. Local product data, no external calls.

---

## `services/ai/` — one file per role

Each AI file has a distinct job and distinct system prompt. They never overlap.

| File | Who calls it | What it does |
|---|---|---|
| `client.ts` | all other ai/ files | Groq API connection — swap providers by changing only this file |
| `nutritionCoach.ts` | `modules/plan/diet/` | Parses food, estimates macros, writes log actions, handles food photos |
| `trainerCoach.ts` | `modules/plan/training/` | Builds routines, coaches form, handles progressive overload logic |
| `masterCoach.ts` | `modules/coach/` | Full journey context, can propose changes to targets with user approval |
| `goalAnalyzer.ts` | `modules/onboarding/` | Interprets goal text during onboarding, runs realism check |
| `onboardingCoach.ts` | `modules/onboarding/` | Conversational AI for the onboarding flow |
| `statParser.ts` | `modules/onboarding/` | Parses structured stat data returned by AI during onboarding |
| `chatManager.ts` | any AI coach | Session management: new chat, load history, enforce context limits |

---

## `services/storage/local/` — one file per data domain

The original architecture planned 3 files. The real app needs 14. That is not a mistake — it is correct design. Fine-grained files mean:
- Reading `caloryBurnStorage.ts` tells you exactly what gets persisted for calory burn, with no noise from unrelated features.
- A bug in diet storage cannot affect workout storage.
- When you add a new feature, you add a new file — you do not modify an existing one.

The comments in the tree above group them by the module that owns them. This grouping is the natural reading order.

---

## `contexts/GoalsContext.tsx`

This is the bridge between **Calory Burn** and **Diet**.

When Dynamic Mode is on, the user's diet calorie target changes throughout the day based on what they actually burned. Three screens consume this: `PlanScreen` (to display today's targets), `DietScreen` (to show the calorie goal in the macros card), and `CaloryBurnScreen` (to toggle and write dynamic mode).

It is a React Context, not a Zustand slice, because it computes a derived value from multiple storage reads on each focus event — it does not need to be globally persistent between app restarts. It is provided at `MainTabNavigator` level, so it wraps exactly the three screens that need it.

---

## `shared/` — the strict rule

Something belongs in `shared/` if and only if **two or more unrelated modules** need it. If a module is the only user, the component lives inside that module.

**Currently in `shared/` (correctly):**
- `CollapsibleTabBar.tsx` — used by `diet/`, `training/`, AND `calory-burn/`
- `ChatInterface.tsx` — the stateless chat bubble layout used by diet and training coaches
- `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx` — universal primitives
- All hooks and utils

**Moved out of `shared/` (they had only one real user):**
- `ChatView.tsx` → `modules/coach/components/` — only the Coach tab uses it
- `TodayWorkoutView.tsx` → `modules/plan/training/components/` — only Training uses it
- `HistoryView.tsx` → `modules/plan/training/components/` — only Training uses it
- `TrainerIntroView.tsx` → `modules/plan/training/components/` — only Training uses it

---

## `types/` — merged for clarity

`workoutLog.ts` and `routine.ts` both describe training-domain data. They merge into `plan.ts`, alongside `FoodEntry`, `BurnActivity`, etc. One file per domain:

| File | Types it contains |
|---|---|
| `user.ts` | `UserProfile`, `OnboardingData`, `BodyMetrics`, `Goal`, `SubscriptionTier` |
| `plan.ts` | `FoodEntry`, `Routine`, `RoutineDay`, `Exercise`, `WorkoutLog`, `WorkoutSet`, `BurnActivity` |
| `coaching.ts` | `ChatMessage`, `ChatSession`, `CoachContext`, `ContextWindowConfig` |
| `shop.ts` | `Product`, `CartItem`, `Order`, `VettedBadge` |

---

## Navigation hierarchy

```
App.tsx
└── RootNavigator
    ├── OnboardingNavigator          (until onboarding is complete)
    │   ├── LanguageSelectionScreen
    │   ├── WelcomeScreen
    │   ├── LoginScreen
    │   ├── PhysicalStatsScreen
    │   ├── PhotoCaptureScreen
    │   ├── GoalDescriptionScreen
    │   ├── GoalAnalysisScreen
    │   ├── StatsRevealScreen
    │   └── ExecutionPlanScreen
    │
    └── MainTabNavigator             (5 bottom tabs, after onboarding)
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
        ├── Coach tab         ← Master AI chat
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
| The master AI Coach | `modules/coach/` |
| The shop | `modules/shop/` |
| Any body composition formula | `engine/body-metrics/` |
| Any calorie calculation | `engine/calorie-engine/` |
| The 7-day recalibration math | `engine/weekly-review/` |
| Nutrition AI system prompt or food logic | `services/ai/nutritionCoach.ts` |
| Trainer AI system prompt | `services/ai/trainerCoach.ts` |
| Master Coach personality | `services/ai/masterCoach.ts` |
| Swap the AI provider for the whole app | `services/ai/client.ts` |
| How diet data is saved/loaded | `services/storage/local/dietLogStorage.ts` |
| How workout data is saved/loaded | `services/storage/local/workoutStorage.ts` |
| Dynamic Mode ↔ Diet calorie link | `contexts/GoalsContext.tsx` |
| Free vs premium feature limits | `shared/constants/subscriptionLimits.ts` |
| The collapsible tab bar | `shared/components/CollapsibleTabBar.tsx` |
| Colors, fonts, spacing | `src/theme/` |
| API keys | `src/config/keys.ts` |
| English copy | `locales/en/` |
| Malayalam copy | `locales/ml/` |
| Manglish copy | `locales/manglish/` |
