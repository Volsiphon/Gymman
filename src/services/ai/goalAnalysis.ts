/**
 * services/ai/goalAnalysis.ts
 *
 * Runs the three-phase Goal Analysis shown after onboarding on the GoalAnalysis screen.
 *
 * Phase 1 — Interpretation: the AI reads the user's raw goal text and says what it
 *   actually means in physical terms (e.g. "I want to look like Virat Kohli" becomes
 *   a specific body fat and lean mass target).
 *
 * Phase 2 — Reality: honest assessment of where the user is right now, their
 *   advantages, their challenges, and what must change.
 *
 * Phase 3 — Prescription: defines the specific optimised goal. If the goal is
 *   biologically feasible, returns one target. If not (e.g. wants a physique that
 *   requires PEDs), returns two options — an evidence-based option and a "pursue
 *   the dream the smartest way" option.
 *
 * Each phase is a separate Groq call so the prompts stay focused and token usage is
 * spread across three smaller requests rather than one massive one.
 */

import { groqChat } from './client';
import type { BodyCompositionStats } from '@/engine/body-metrics';
import type { UserProfile } from '@/types/user';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface Phase1Result {
  whatYouSaid: string;
  whatWeMean: string;
  whyWeThinkThat: string;
}

export interface Phase2Result {
  currentReality: string;
  advantages: string;
  challenges: string;
  whatMustChange: string;
  timeline: string;
}

export interface OptimisedGoalData {
  targetWeightKg: number;
  targetBFPercent: number;
  description: string;
}

export interface Phase3FeasibleResult {
  feasible: true;
  scientificTranslation: string;
  realityAssessment: string;
  optimisedGoal: OptimisedGoalData;
  firstMilestone: string;
  longTermVision: string;
}

export interface Phase3InfeasibleResult {
  feasible: false;
  scientificTranslation: string;
  realityAssessment: string;
  optionA: OptimisedGoalData & { title: string };
  optionB: OptimisedGoalData & { title: string };
  firstMilestoneA: string;
  firstMilestoneB: string;
  longTermVisionA: string;
  longTermVisionB: string;
}

export type Phase3Result = Phase3FeasibleResult | Phase3InfeasibleResult;

// ─── Shared context builder ───────────────────────────────────────────────────

function clientContext(p: UserProfile, c: BodyCompositionStats): string {
  return `CLIENT PROFILE:
Age: ${p.age} | Sex: ${p.sex} | Country: ${p.country}
Weight: ${p.weightKg} kg | Height: ${p.heightCm} cm
Body Fat: ${c.bfPercent.toFixed(1)}% (${c.bfCategory}) | Fat Mass: ${c.fatMassKg.toFixed(1)} kg | Lean Mass: ${c.lbmKg.toFixed(1)} kg
BMI: ${c.bmi.toFixed(1)} | FFMI: ${c.ffmi.toFixed(1)} | Build: ${c.buildDescription}
BMR: ${Math.round(c.bmr)} kcal | TDEE: ${Math.round(c.tdee)} kcal
Activity: ${p.activityLevel}${p.activityDescription ? ` — "${p.activityDescription}"` : ''}
Dietary: ${p.dietary}
Goal type (engine-classified): ${p.goalType ?? 'unclassified'}
Calorie target: ${p.calorieTarget ? `${Math.round(p.calorieTarget)} kcal` : 'not yet set'}
Macros: ${p.proteinG ? `${Math.round(p.proteinG)}g protein / ${Math.round(p.carbsG ?? 0)}g carbs / ${Math.round(p.fatsG ?? 0)}g fats` : 'not yet set'}

THEIR GOAL IN THEIR OWN WORDS:
"${p.goalText}"`;
}

// ─── Phase 1 — Interpretation ─────────────────────────────────────────────────
// Cards: What You Said | What We Mean | Why We Think That

export async function runPhase1(
  profile: UserProfile,
  calcs: BodyCompositionStats,
): Promise<Phase1Result> {
  const prompt = `${clientContext(profile, calcs)}

Your job is interpretation only. Read the goal text carefully and respond with a JSON object.

Rules:
- NEVER address the user by name
- Use "you" and "your" throughout
- Write like a sharp, honest coach — not a wellness app
- whatYouSaid: Quote their goal back clearly in 1-2 sentences, naming exactly what they said (the feel, the look, the reference, the person they named). Don't add anything yet.
- whatWeMean: In 2-3 sentences, translate what they actually want into real physical terms. If they named a celebrity, describe what that physique actually represents physically. If vague (aesthetic, look better, feel good), decode it into something measurable. Focus on the underlying desire, not the literal words.
- whyWeThinkThat: In 2-3 sentences, explain your interpretation reasoning. What signals in their goal text led you here? What are they NOT saying that you're reading between the lines?

Respond ONLY with valid JSON:
{
  "whatYouSaid": "...",
  "whatWeMean": "...",
  "whyWeThinkThat": "..."
}`;

  return callAI<Phase1Result>(prompt, phase1Fallback());
}

// ─── Phase 2 — Reality ────────────────────────────────────────────────────────
// Cards: Current Reality | Advantages | Challenges | What Must Change | Timeline

export async function runPhase2(
  profile: UserProfile,
  calcs: BodyCompositionStats,
  p1: Phase1Result,
): Promise<Phase2Result> {
  const prompt = `${clientContext(profile, calcs)}

INTERPRETATION (from Phase 1):
What they mean: ${p1.whatWeMean}

Your job is honest reality analysis. Respond with a JSON object.

Rules:
- All numbers must come from the client profile above — never invent stats
- Write like a knowledgeable coach, not a motivational poster
- currentReality: 2-3 sentences. Describe where this person actually stands right now in plain English — their body composition, energy balance, and starting position. Use their real numbers. Make it feel personal, not generic.
- advantages: 2-3 sentences. What does this specific person genuinely have going for them? Age, muscle base, metabolic rate, body fat headroom, activity level. Specific to them, not generic encouragement.
- challenges: 2-3 sentences. What will genuinely be hard for this person? Honest. Not discouraging — just real. Specific to their numbers and situation.
- whatMustChange: 3-4 sentences. Concretely, what needs to shift — training style, nutrition approach, lifestyle habits. Specific to their goal type (${profile.goalType ?? 'fitness'}). Not a workout plan, but the category of change required.
- timeline: 2-3 sentences. Given their goal type and starting stats, what is a realistic timeframe? Name phases if relevant (e.g. fat loss phase then building phase). Ground it in their specific numbers.

Respond ONLY with valid JSON:
{
  "currentReality": "...",
  "advantages": "...",
  "challenges": "...",
  "whatMustChange": "...",
  "timeline": "..."
}`;

  return callAI<Phase2Result>(prompt, phase2Fallback());
}

// ─── Phase 3 — Prescription ───────────────────────────────────────────────────
// Cards: Scientific Translation | Reality Assessment | Optimised Goal (or A/B) | Milestone | Vision

export async function runPhase3(
  profile: UserProfile,
  calcs: BodyCompositionStats,
  p1: Phase1Result,
  p2: Phase2Result,
): Promise<Phase3Result> {
  const prompt = `${clientContext(profile, calcs)}

INTERPRETATION:
What they mean: ${p1.whatWeMean}
Why we think that: ${p1.whyWeThinkThat}

REALITY ANALYSIS:
Current reality: ${p2.currentReality}
Advantages: ${p2.advantages}
Challenges: ${p2.challenges}
What must change: ${p2.whatMustChange}
Timeline: ${p2.timeline}

Your job is prescription — defining what success actually looks like for this person, grounded in biology.

FEASIBILITY: Determine whether the goal is biologically achievable for a natural athlete. Mark isFeasible = false ONLY when the literal goal is physically impossible (e.g. requiring sub-5% body fat naturally long-term, or drug-level muscle mass). Ambitious but achievable goals that take a long time are FEASIBLE.

Rules:
- scientificTranslation: 2-3 sentences. Convert their goal into specific measurable targets — approximate body fat % target, lean mass target, weight range. Show the math briefly. Ground it in their current numbers.
- realityAssessment: 3 sentences. One sentence each on: biological feasibility, individual feasibility for THIS person, and genetic context (treat as uncertainty, not ceiling — acknowledge variation without discouraging).

IF isFeasible = true:
- optimisedGoal: The Prime Self target — the best realistic version of their goal. Include targetWeightKg and targetBFPercent as numbers. description: 2-3 sentences painting what this person looks and feels like when they get there.
- firstMilestone: 1-2 sentences. The first concrete win at 4-8 weeks — something visible or measurable.
- longTermVision: 2-3 sentences. What full consistent execution looks like at 12+ months.

IF isFeasible = false:
- Provide optionA (evidence-optimised Prime Self goal — not a consolation, a genuine peak) and optionB (keeping original inspiration as horizon, pursuing it the smartest way possible).
- Both options need: title (punchy), description (2 sentences selling it genuinely), targetWeightKg, targetBFPercent.
- firstMilestoneA, firstMilestoneB: 1-2 sentences each.
- longTermVisionA, longTermVisionB: 2 sentences each.

Respond ONLY with valid JSON matching exactly one of these schemas:

FEASIBLE:
{
  "isFeasible": true,
  "scientificTranslation": "...",
  "realityAssessment": "...",
  "optimisedGoal": { "targetWeightKg": number, "targetBFPercent": number, "description": "..." },
  "firstMilestone": "...",
  "longTermVision": "..."
}

INFEASIBLE:
{
  "isFeasible": false,
  "scientificTranslation": "...",
  "realityAssessment": "...",
  "optionA": { "title": "...", "targetWeightKg": number, "targetBFPercent": number, "description": "..." },
  "optionB": { "title": "...", "targetWeightKg": number, "targetBFPercent": number, "description": "..." },
  "firstMilestoneA": "...",
  "firstMilestoneB": "...",
  "longTermVisionA": "...",
  "longTermVisionB": "..."
}`;

  const raw = await callAI<any>(prompt, null);
  if (!raw) return phase3Fallback();

  if (raw.isFeasible === false) {
    return {
      feasible: false,
      scientificTranslation: raw.scientificTranslation ?? '',
      realityAssessment: raw.realityAssessment ?? '',
      optionA: raw.optionA,
      optionB: raw.optionB,
      firstMilestoneA: raw.firstMilestoneA ?? '',
      firstMilestoneB: raw.firstMilestoneB ?? '',
      longTermVisionA: raw.longTermVisionA ?? '',
      longTermVisionB: raw.longTermVisionB ?? '',
    } satisfies Phase3InfeasibleResult;
  }

  return {
    feasible: true,
    scientificTranslation: raw.scientificTranslation ?? '',
    realityAssessment: raw.realityAssessment ?? '',
    optimisedGoal: raw.optimisedGoal,
    firstMilestone: raw.firstMilestone ?? '',
    longTermVision: raw.longTermVision ?? '',
  } satisfies Phase3FeasibleResult;
}

// ─── Shared AI caller ─────────────────────────────────────────────────────────

async function callAI<T>(prompt: string, fallback: T): Promise<T> {
  try {
    const raw = await groqChat([
      {
        role: 'system',
        content: 'You are a veteran fitness coach and physiologist. Honest, direct, deeply knowledgeable. Respond ONLY with the requested JSON — no markdown, no text outside the object.',
      },
      { role: 'user', content: prompt },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

function phase1Fallback(): Phase1Result {
  return {
    whatYouSaid: "We couldn't reach the analysis engine right now. Your data is intact.",
    whatWeMean: "We'll interpret your goal as a general fitness improvement target and build your plan from your numbers.",
    whyWeThinkThat: "This is a fallback — the AI analysis will be available when connectivity is restored.",
  };
}

function phase2Fallback(): Phase2Result {
  return {
    currentReality: "Your current body composition data has been captured and is ready for planning.",
    advantages: "You have everything needed to start — your numbers give us a solid foundation.",
    challenges: "Every goal has its friction points. We'll address yours as we build your plan.",
    whatMustChange: "Consistent training and aligned nutrition are the two levers that move everything else.",
    timeline: "Meaningful body composition change typically takes 3–6 months of consistent work.",
  };
}

function phase3Fallback(): Phase3FeasibleResult {
  return {
    feasible: true,
    scientificTranslation: "Your goal has been translated into a measurable body composition target based on your current numbers.",
    realityAssessment: "Your goal is biologically achievable. Individual results depend on consistency and execution. Genetics affect speed, not the destination.",
    optimisedGoal: {
      targetWeightKg: 0,
      targetBFPercent: 0,
      description: "We'll refine your specific target as we get more data from your first few weeks.",
    },
    firstMilestone: "In the first 4–6 weeks you'll notice energy shifts, improved training capacity, and early body composition changes.",
    longTermVision: "Sustained consistency over 12 months produces the kind of transformation that becomes your new baseline.",
  };
}
