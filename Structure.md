# Gymman — Project Structure

## The guiding principle

Every feature is a self-contained island. You can open, rewrite, or delete any module without
touching anything outside it. This is the rule every structural decision below was made to serve.

---

## Top-level map

```
gymman/
├── assets/          Static files: fonts, images, Lottie animations, icons
├── src/
│   ├── app/         App entry point, navigation tree, global providers
│   ├── modules/     Every feature of the app, each in its own sealed folder
│   ├── engine/      Pure calculation brain — body metrics, goals, calories, weekly review
│   ├── services/    Everything that talks to the outside world (AI, storage, auth, sync)
│   ├── store/       Global state that must cross module boundaries
│   ├── shared/      Components, hooks, utils, and constants used by 2+ unrelated modules
│   ├── theme/       Design tokens: colors, typography, spacing
│   ├── types/       TypeScript types shared across the entire app
│   ├── i18n/        Translation engine configuration
│   └── locales/     Translation files: en / ml / manglish
├── App.tsx          Root entry point
├── Structure.md     This file
├── package.json
└── tsconfig.json
```

---

## `src/modules/` — the core of the app

This is where everything the user sees and interacts with lives. Each module maps directly
to a named section of Gymman.

```
modules/
├── onboarding/      First-launch flow: language → login → stats → goal → AI analysis → execution plan
├── plan/
│   ├── diet/        Diet tracking, AI nutrition coach, Kerala food library
│   ├── training/    Training routines, AI trainer coach, workout logs
│   └── calory-burn/ Daily activity calory burn logging, Dynamic Mode toggle
├── progress/        Daily weight log and weight change graph
├── photos/          Transformation photo storage, folder system
├── coach/           Master AI coach with full user journey context
├── shop/            Vetted gym product marketplace
├── account/         User profile, RPG strength/aesthetics ranking
└── streak/          Daily streak logic and UI (cross-tab, visible in Plan header and Account)
```

### Every module follows the exact same internal shape

```
module/
├── screens/     Full-screen views — registered in navigation
├── components/  UI pieces used only inside this module
├── hooks/       Business logic and local state for this module
└── index.ts     The only exit point — exports only what navigation imports
```

The `index.ts` is the gate. Navigation imports `OnboardingNavigator` from `modules/onboarding`,
never from `modules/onboarding/screens/GoalDescriptionScreen` directly. This means you can
completely reorganize a module's internals without breaking anything outside it.

### Why `streak/` is its own module

The streak counter is displayed in the Plan tab header AND in the Account tab. It is written
to by three separate modules (diet, training, calory-burn). It has its own display logic
(1-flame / 2-flame / 3-flame, grace period, lifetime record). This is too much cross-cutting
concern to bury inside any single module — it needs to be its own island.

---

## `src/engine/` — the calculation brain

The engine contains pure functions only. No UI. No API calls. No reading from or writing to
storage. Given inputs, it returns outputs. This makes every formula independently testable
without spinning up any part of the app.

```
engine/
├── body-metrics/    BMR (Mifflin-St Jeor), TDEE, body fat % (Navy method), BMI, lean mass
├── goal-engine/     Goal classification, realism check, path-to-goal calculator
├── calorie-engine/  Maintenance cal (with/without activity), target cal, dynamic daily adjustor
└── weekly-review/   Pure math for the 7-day recalibration: given 7 days of data, what should change?
```

### Why engine/ is separate from services/

`services/` handles I/O — it reads from storage, calls AI, sends network requests.
`engine/` handles logic — it computes an answer from numbers. These are different jobs.
The weekly review is the clearest example: `engine/weekly-review/` figures out *what* to change.
`services/weeklyReview/weeklyReviewService.ts` orchestrates *making* that change — reading data,
calling the engine, calling AI if needed, writing the result back to storage.

Keeping them apart means you can test every formula in the engine without mocking any network
or storage dependency. And you can change the AI provider in services without touching a single
formula.

---

## `src/services/` — infrastructure, not features

Services do one thing: talk to the outside world. Modules call services. Services never call
modules back. This one-way dependency is what keeps modules self-contained.

```
services/
├── ai/
│   ├── client.ts              Shared AI API connection — one place to configure or swap providers
│   ├── nutritionCoach.ts      Diet AI: system prompt, food clarification logic, context rules
│   ├── trainerCoach.ts        Training AI: routine guidance, progressive overload nudge logic
│   ├── masterCoach.ts         Master Coach: full journey context, app-control permissions
│   ├── goalAnalyzer.ts        Onboarding: interprets user goal text, realism check, redirect logic
│   └── chatManager.ts         Chat session management: new chat, history, context window limits
├── storage/
│   ├── local/                 AsyncStorage wrappers — used by free users
│   │   ├── userStorage.ts
│   │   ├── planStorage.ts
│   │   └── photoStorage.ts
│   └── cloud/                 Cloud database wrappers — used by premium users, mirrors local/ exactly
│       ├── userCloud.ts
│       ├── planCloud.ts
│       └── photoCloud.ts
├── auth/
│   └── authService.ts         Login, logout, session management, Google OAuth
├── sync/
│   └── syncService.ts         Moves local data to cloud when a user upgrades to premium
└── weeklyReview/
    └── weeklyReviewService.ts Orchestrates the 7-day cycle: reads data → calls engine → adjusts targets
```

### Why one AI file per coach?

Each coach has a different system prompt, different context window rules, and different permissions.
Only `masterCoach.ts` can modify app settings (maintenance calories, goals), and only after
user confirmation. Only `goalAnalyzer.ts` runs the realism check during onboarding. Keeping
them in separate files means adjusting the trainer's tone never risks contaminating the nutrition
coach or the goal analyzer. All four coaches use the same `client.ts` underneath — to switch
AI providers for the entire app, you change one file.

### Why local/ and cloud/ mirror each other?

Both storage layers expose identical function signatures. `userStorage.ts` and `userCloud.ts`
both export a `saveUserProfile()` that takes the same arguments. The sync service and the
modules never need to know which layer they're hitting — the switch happens based on
subscription tier. Free users get local. Premium users get cloud. The modules don't change.

---

## `src/store/` — shared state

State that belongs to one module stays inside that module's hook. State that must be read
by multiple unrelated modules goes in the store.

```
store/
├── user/          UserProfile, body metrics, goals, onboarding completion flag
├── plan/          Diet log state, training state, calory burn state
├── streak/        Streak counts — needed by Plan header, Account tab, and the streak module
├── subscription/  Free / premium / max tier — needed by almost every module to gate features
├── language/      Persisted language choice — read by i18n on startup, written by Account screen
└── index.ts
```

The streak is the clearest example of why this layer exists. Logging a workout in `training`
increments a streak counter displayed in the Plan tab header AND the Account tab. Without a
shared store, the training module would need to know about the account module, breaking
modularity. The store is the neutral ground both modules read from.

---

## `src/shared/` — the toolkit

The rule for adding something here: two or more unrelated modules need it. If only one
module uses a component or utility, it lives inside that module, not here.

```
shared/
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── ChatInterface.tsx        The reusable chat UI used by Diet coach, Training coach, and Master Coach
├── hooks/
│   ├── useSubscription.ts       Reads the current subscription tier from the store
│   ├── usePremiumGate.ts        Shows an upgrade prompt when a free user hits a premium feature
│   └── useLocalDate.ts          Consistent date logic — critical for streak accuracy and history limits
├── utils/
│   ├── dateUtils.ts
│   └── formatters.ts
└── constants/
    ├── subscriptionLimits.ts    All free/premium/max limits defined in one place
    └── appConstants.ts
```

### Why `ChatInterface.tsx` lives in shared/

Three sections — Diet, Training, and Coach — each show an AI chat interface. The UI is
identical in all three: chat bubbles, input bar, typing indicator, new chat button. Only the
AI logic behind them differs, and that lives in `services/ai/`. One shared component means a
visual change to the chat UI applies to all three coaches at once. No duplication, no drift.

### Why `subscriptionLimits.ts` is a single file

Free users get 30 days of diet history. Free users get 3 days of Coach context. Photo folders
are premium-only. These limits are referenced in many different places. Centralizing them means
a pricing decision requires editing one file. Every module reads from the same source of truth.

---

## `src/i18n/` — the translation engine

```
i18n/
├── index.ts            Configures i18next: loads locale files, sets fallback language (English)
└── languageDetector.ts Reads the persisted language choice from store/language/ on app start
```

Every string visible to the user comes from a translation key, never hardcoded. Adding a
fourth language later means adding one new folder under `locales/` — nothing else changes.

---

## `src/locales/` — translation files

```
locales/
├── en/          English
├── ml/          Malayalam (Unicode script — requires a Malayalam font in assets/fonts/)
└── manglish/    Manglish (Latin script; phonetic Malayalam mixed with English)
```

Each language folder contains the same set of files, split by app section:

```
en/
├── common.json      Shared labels: button text, error messages, loading states
├── onboarding.json
├── diet.json
├── training.json
├── caloryBurn.json
├── progress.json
├── photos.json
├── coach.json
├── shop.json
├── account.json
└── streak.json
```

**Why split by section, not one big file?** When writing the Malayalam version of the Diet
section, you open `locales/ml/diet.json`. You do not scroll through 1,500 lines of unrelated
strings. A mistake in `shop.json` cannot corrupt `onboarding.json`.

**These are not translations — they are parallel originals.** The English file and the Malayalam
file share the same key names, but the values are written independently by someone who thinks
in that language. The Malayalam version of an onboarding screen is authored from scratch in
Malayalam — not derived from the English text.

**A note on Malayalam:** Malayalam script requires a Malayalam-capable font (e.g. Noto Sans
Malayalam) placed in `assets/fonts/` and registered in `theme/typography.ts`. When the active
language is `ml`, the app switches to this font automatically.

**A note on Manglish:** Manglish uses the Latin alphabet. No special font is needed. From the
app's technical perspective it renders exactly like English — only the string values differ.

---

## `src/app/` — the spine

```
app/
├── navigation/
│   ├── RootNavigator.tsx        Entry decision: onboarded? → Onboarding or Main
│   ├── OnboardingNavigator.tsx  Linear stack through the first-launch flow (no tab bar)
│   ├── MainTabNavigator.tsx     5 bottom tabs: Plan, Progress, Photos, Coach, Shop
│   ├── PlanNavigator.tsx        Top-tab navigation within Plan: Diet / Training / Calory Burn
│   └── index.ts
└── providers/
    ├── ThemeProvider.tsx        Colors, fonts, spacing — wraps the entire app
    ├── AuthProvider.tsx         Auth state, session persistence
    └── SubscriptionProvider.tsx Subscription tier, exposes premium gate context
```

Adding a new bottom tab only touches `MainTabNavigator`. Adding a new onboarding step only
touches `OnboardingNavigator`. Restructuring Plan sub-tabs only touches `PlanNavigator`.

---

## `src/theme/` — design tokens

```
theme/
├── colors.ts       Named color palette (no hex codes anywhere else in the codebase)
├── typography.ts   Font families, sizes, weights, line heights — including Malayalam font switch
├── spacing.ts      Spacing scale used for all padding and margin
└── index.ts
```

No raw hex values or magic numbers live inside component files. When the visual direction is
finalized, these four files are the only thing that changes to apply it across the entire app.

---

## `src/types/` — shared contracts

```
types/
├── user.ts       UserProfile, OnboardingData, BodyMetrics, Goal, SubscriptionTier
├── plan.ts       FoodEntry, DietPlan, WorkoutSet, CoreRoutine, BurnActivity
├── coaching.ts   ChatMessage, ChatSession, CoachContext, ContextWindowConfig
├── shop.ts       Product, CartItem, Order, VettedBadge
└── index.ts
```

Types are the contract between every layer. If `FoodEntry` changes, TypeScript immediately
shows every file that needs to be updated. No layer defines its own version of the same shape.

---

## `assets/` — static files

```
assets/
├── fonts/        Custom typefaces — including Noto Sans Malayalam for the ml locale
├── images/       Static images: logo, illustrations, placeholder art
├── animations/   Lottie JSON files — streak celebrations, loading states, animated intro
└── icons/        App icon variants for iOS and Android store listings
```

---

## The navigation hierarchy, visualized

```
App.tsx
└── RootNavigator
    ├── OnboardingNavigator          (shown until onboarding is complete)
    │   ├── LanguageSelectionScreen  ← first screen, renders static text in all 3 languages (no i18n loaded yet)
    │   ├── LoginScreen
    │   ├── PhysicalStatsScreen
    │   ├── PhotoCaptureScreen       (optional)
    │   ├── GoalDescriptionScreen
    │   ├── GoalAnalysisScreen
    │   ├── StatsRevealScreen
    │   └── ExecutionPlanScreen
    │
    └── MainTabNavigator             (shown after onboarding)
        ├── Plan tab → PlanNavigator
        │   ├── Diet        (AiNutritionCoach / DietPlan / Today / History)
        │   ├── Training    (AiTrainer / CoreRoutine / TodaysLog / History)
        │   └── Calory Burn (BurnLog / History)
        ├── Progress tab
        ├── Photos tab
        ├── Coach tab
        └── Shop tab
```

---

## Quick reference: what to open when you want to change something

| You want to change...              | Open this                                  | Guaranteed safe to ignore      |
|------------------------------------|--------------------------------------------|--------------------------------|
| The onboarding flow                | `modules/onboarding/`                      | Everything else                |
| Diet tracking or food library      | `modules/plan/diet/`                       | Everything else                |
| Training routine logic             | `modules/plan/training/`                   | Everything else                |
| Calory burn logging                | `modules/plan/calory-burn/`                | Everything else                |
| The Master Coach personality       | `services/ai/masterCoach.ts`               | All other coaches              |
| Any body composition formula       | `engine/body-metrics/`                     | All UI, all services           |
| The 7-day recalibration logic      | `engine/weekly-review/`                    | All UI, all services           |
| Free vs premium feature limits     | `shared/constants/subscriptionLimits.ts`   | All feature code               |
| The chat UI across all coaches     | `shared/components/ChatInterface.tsx`      | All AI logic files             |
| Colors, fonts, spacing             | `src/theme/`                               | All component logic            |
| Local ↔ cloud storage              | `services/storage/`                        | All modules                    |
| English copy                       | `locales/en/`                              | All other languages            |
| Malayalam copy                     | `locales/ml/`                              | All other languages            |
| Manglish copy                      | `locales/manglish/`                        | All other languages            |
| Add a new language                 | Add `locales/xx/`, register in `i18n/`     | Everything else                |
| Navigation structure               | `src/app/navigation/`                      | All feature modules            |
| Subscription tier definitions      | `store/subscription/` + `subscriptionLimits.ts` | All feature logic         |
