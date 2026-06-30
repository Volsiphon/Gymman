import { groqChat } from './client';
import type { UserProfile } from '@/services/storage/local/userProfileStorage';

export interface TrainingContent {
  approach: string;
  phases: string | null;
  keyFocus: string;
}

export interface DietContent {
  approach: string;
  keyFocus: string;
  commonStruggle: string;
}

export interface ExecutionContent {
  training: TrainingContent;
  diet: DietContent;
}

export async function generateExecutionContent(
  profile: UserProfile,
): Promise<ExecutionContent> {
  const gt = profile.goalType ?? 'recomp';

  const prompt = `CLIENT PROFILE:
Age: ${profile.age} | Sex: ${profile.sex}
Weight: ${profile.weightKg} kg → Target: ${profile.targetWeightKg ?? 'not set'} kg
Body Fat: ${profile.bfPercent?.toFixed(1) ?? '?'}% → Target BF: ${profile.targetBFPercent?.toFixed(1) ?? '?'}%
Lean Mass: ${profile.lbmKg?.toFixed(1) ?? '?'} kg | TDEE: ${Math.round(profile.tdee ?? 0)} kcal
Activity: ${profile.activityLevel}${profile.activityDescription ? ` — "${profile.activityDescription}"` : ''}
Dietary preference: ${profile.dietary}
Goal type (engine-classified): ${gt}
Calorie target: ${Math.round(profile.calorieTarget ?? 0)} kcal
Protein: ${Math.round(profile.proteinG ?? 0)}g | Carbs: ${Math.round(profile.carbsG ?? 0)}g | Fats: ${Math.round(profile.fatsG ?? 0)}g

THEIR GOAL IN THEIR OWN WORDS:
"${profile.goalText}"

Generate a personalised execution guide for this person. Be specific to their numbers and goal type — not generic fitness advice.

Rules:
- Do NOT re-state numbers that will already be displayed (calories, macros, TDEE) — those appear elsewhere in the UI
- Write like a knowledgeable, honest coach — not a wellness app
- training.phases: return null if this is a single-phase pursuit; otherwise describe the natural phase sequence for their goal

Respond ONLY with valid JSON:
{
  "training": {
    "approach": "2-3 sentences. What kind of training protocol this person needs — style, frequency emphasis, role of cardio. Specific to their goal type and starting point, not generic.",
    "phases": null or "If this goal has natural phases (e.g. first build a base, then cut; or strength phase then hypertrophy phase), describe those phases and when the shift happens. Return null for single-phase goals.",
    "keyFocus": "2-3 sentences. The single most important training principle they must not miss for their specific goal. Concrete to their situation."
  },
  "diet": {
    "approach": "2-3 sentences. Dietary strategy — eating pattern, food quality principles, practical approach. Tailored to their dietary preference (${profile.dietary}) and goal type.",
    "keyFocus": "1-2 sentences. The nutritional non-negotiable for their goal. Be specific.",
    "commonStruggle": "1-2 sentences. What people with this exact goal type most commonly fail at nutritionally. Honest and specific."
  }
}`;

  try {
    const raw = await groqChat([
      {
        role: 'system',
        content:
          'You are a senior fitness coach and sports nutritionist. Specific, honest, data-driven. Respond ONLY with the requested JSON — no markdown, no text outside the object.',
      },
      { role: 'user', content: prompt },
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return buildFallback(profile);
    return JSON.parse(match[0]) as ExecutionContent;
  } catch {
    return buildFallback(profile);
  }
}

function buildFallback(profile: UserProfile): ExecutionContent {
  const gt = profile.goalType ?? 'recomp';

  const trainingApproach =
    gt === 'fat-loss'
      ? 'Resistance training 3–4 days per week is your foundation — it preserves the muscle you have while the deficit does the fat burning. Cardio is a support tool, not the main driver; overloading it eats into recovery.'
      : gt === 'muscle-gain'
      ? 'Progressive overload resistance training, training each muscle group twice per week with compound movements as the backbone. Keep cardio minimal — it competes with recovery and your calorie surplus.'
      : 'Resistance training twice per week per muscle group at maintenance calories. The pace is slower than a dedicated cut or bulk — but you\'re losing fat and gaining muscle simultaneously.';

  const trainingPhases =
    gt === 'muscle-gain'
      ? 'Months 1–3: strength foundation — master the movements, build base strength. Months 4+: shift to higher volume hypertrophy work. Once you\'re satisfied with size, a 6–10 week cut reveals what you built.'
      : gt === 'recomp'
      ? null
      : null;

  const trainingKeyFocus =
    gt === 'fat-loss'
      ? 'Protect your lean mass at all costs — it\'s the metabolic engine that determines how many calories you burn at rest. Losing it during a cut makes everything harder, both now and long term.'
      : 'Progressive overload is the signal. Without consistently lifting more over time — more weight, more reps, more volume — your body has no reason to build. Track your lifts.';

  const dietApproach =
    gt === 'fat-loss'
      ? 'Consistency beats perfection. Hit your calorie target and protein most days — the occasional 200 kcal variance doesn\'t matter, chronic under-logging does. Cook as much of your own food as possible; it\'s the highest-leverage habit for hitting your macros.'
      : gt === 'muscle-gain'
      ? 'Eat enough to support growth without piling on excess fat. Time your largest meals around training when possible. Don\'t fear carbs — they fuel training and recovery. The surplus should feel like slightly more food than comfortable, not a binge.'
      : 'Consistency at maintenance. This is harder than a cut or bulk because the margin for error is tighter. Hit protein every day without fail — it\'s what makes recomp possible.';

  const dietKeyFocus =
    gt === 'fat-loss'
      ? `Protein first, every day without exception. ${Math.round(profile.proteinG ?? 0)}g protects your lean mass and keeps hunger lower than carbs or fats at the same calorie level.`
      : `Protein is the raw material for new muscle. Hit ${Math.round(profile.proteinG ?? 0)}g before optimising anything else — carb timing, meal frequency, supplements are all secondary to this.`;

  const commonStruggle =
    gt === 'fat-loss'
      ? 'Underestimating what they eat. Oils, sauces, and restaurant food have 2–3x more calories than people assume. Log everything for the first month — you\'ll be surprised.'
      : gt === 'muscle-gain'
      ? 'Not eating enough consistently. People get one big training day right but under-eat on rest days thinking they don\'t need the calories — muscle isn\'t built only on training days.'
      : 'Hitting protein consistently. It\'s the hardest macro to reach because high-protein foods take more prep than carb-heavy convenience food.';

  return {
    training: {
      approach: trainingApproach,
      phases: trainingPhases,
      keyFocus: trainingKeyFocus,
    },
    diet: {
      approach: dietApproach,
      keyFocus: dietKeyFocus,
      commonStruggle: commonStruggle,
    },
  };
}
