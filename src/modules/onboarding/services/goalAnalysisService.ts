import { ANTHROPIC_API_KEY } from '@/config/keys';
import type { UserPhysicalStats } from '@/modules/onboarding/utils/physicalStatsParser';
import type { BodyCompositionStats } from '@/modules/onboarding/utils/fitnessCalculations';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface RealisticPath {
  targetWeightKg: number;
  targetBFPercent: number;
  timelineRange: string;
  whatItLooksLike: string;
  earlyWins: string;
}

export interface AlternativeGoal {
  title: string;
  description: string;
  targetWeightKg: number;
  targetBFPercent: number;
  timelineMonths: number;
}

export interface FoundationPath {
  description: string;
  targetWeightKg: number;
  targetBFPercent: number;
  timelineMonths: number;
  note: string;
}

export interface GoalAnalysisResult {
  interpretedGoal: string;
  isRealistic: boolean;
  coachNote: string;
  realisticPath?: RealisticPath;
  alternativeGoal?: AlternativeGoal;
  foundationPath: FoundationPath;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(s: UserPhysicalStats, goalText: string, c: BodyCompositionStats): string {
  return `Analyse this fitness client and their goal. Respond ONLY with a valid JSON object — no markdown, no text outside the JSON.

CLIENT:
Name: ${s.name}, ${s.age} years old, ${s.sex}
Height: ${s.heightCm} cm | Weight: ${s.weightKg} kg
Estimated Body Fat: ~${c.bfPercent}% (${c.bfCategory})
Lean Body Mass: ${c.lbmKg} kg | Fat Mass: ${c.fatMassKg} kg
Build: ${c.buildDescription}
Maintenance Calories: ~${c.tdee} kcal/day | BMR at rest: ~${c.bmr} kcal
Activity Level: ${s.activityLevel}

THEIR GOAL IN THEIR OWN WORDS:
"${goalText}"

RESPOND WITH THIS JSON SCHEMA:
{
  "interpretedGoal": "One sentence — what they actually want at their core, which may differ from what they said",
  "isRealistic": boolean,
  "coachNote": "3–4 sentences. Honest, direct, specific to their numbers. Speak like a real experienced coach — not a wellness app. If goal is unrealistic or misguided, say exactly why without shaming them. If someone lean wants to cut more to see abs, explain why that approach undermines them.",
  "realisticPath": {
    "targetWeightKg": number,
    "targetBFPercent": number,
    "timelineRange": "e.g. '6–9 months'",
    "whatItLooksLike": "Concrete description of how they'll look and feel at the target",
    "earlyWins": "When they'll first see real change, well before the final goal"
  },
  "alternativeGoal": {
    "title": "Short title",
    "description": "Why this fits them better",
    "targetWeightKg": number,
    "targetBFPercent": number,
    "timelineMonths": number
  },
  "foundationPath": {
    "description": "Their optimal natural foundation — what to build first. Specific to their numbers.",
    "targetWeightKg": number,
    "targetBFPercent": number,
    "timelineMonths": number,
    "note": "Why getting here first unlocks everything else"
  }
}

Rules:
- realisticPath required when isRealistic is true
- alternativeGoal required when isRealistic is false
- foundationPath always required
- All numbers must be specific to this person, not generic ranges
- If someone already lean (male <14% / female <21%) wants more weight loss to see abs, mark unrealistic — the real answer is muscle gain`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function analyzeGoal(
  stats: UserPhysicalStats,
  goalText: string,
  calcs: BodyCompositionStats,
): Promise<GoalAnalysisResult> {
  if (!ANTHROPIC_API_KEY) {
    return ruleBasedFallback(stats, goalText, calcs);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Upgrade to claude-sonnet-4-6 for richer coaching responses in production
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1400,
        system: 'You are a veteran fitness coach. Honest, direct, expert. You speak clearly but never condescendingly. Respond only with the requested JSON — no markdown fences, no text outside the object.',
        messages: [{ role: 'user', content: buildPrompt(stats, goalText, calcs) }],
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const raw: string = data.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]) as GoalAnalysisResult;
  } catch (e) {
    console.warn('[GoalAnalysis] AI call failed, using fallback:', e);
    return ruleBasedFallback(stats, goalText, calcs);
  }
}

// ─── Rule-based fallback ──────────────────────────────────────────────────────
// Covers the most common cases when no API key is set.

function ruleBasedFallback(
  s: UserPhysicalStats,
  goalText: string,
  c: BodyCompositionStats,
): GoalAnalysisResult {
  const lower = goalText.toLowerCase();
  const wantsLean   = /slim|lean|thin|weight|fat|cut|abs|shred|tone|lose/i.test(lower);
  const wantsMuscle = /muscle|big|bulk|mass|strong|strength|build|gain|bigger/i.test(lower);
  const isMale = s.sex === 'male';

  const isAlreadyLean    = isMale ? c.bfPercent < 14 : c.bfPercent < 21;
  const isAboveAverage   = isMale ? c.bfPercent > 22 : c.bfPercent > 29;

  // Lean person wanting to cut more → misguided, needs muscle
  if (isAlreadyLean && wantsLean) {
    return {
      interpretedGoal: 'Look more aesthetic and defined',
      isRealistic: false,
      coachNote: `${s.name}, you're already at ${c.bfPercent}% body fat — that's the lean range. Cutting more weight from here won't reveal abs; it'll make you look worse. What you're missing is muscle mass. The path to looking aesthetic at your stats is building, not cutting further.`,
      alternativeGoal: {
        title: 'Build lean muscle',
        description: 'Add muscle mass while keeping your current leanness. This is what actually creates the defined, athletic look you want.',
        targetWeightKg: Math.round(s.weightKg * 1.06),
        targetBFPercent: Math.round(c.bfPercent + 1),
        timelineMonths: 9,
      },
      foundationPath: {
        description: `Build to a solid athletic base — around ${Math.round(s.weightKg * 1.08)} kg at ~${c.bfPercent}% body fat with noticeably more muscle.`,
        targetWeightKg: Math.round(s.weightKg * 1.08),
        targetBFPercent: c.bfPercent,
        timelineMonths: 6,
        note: 'More muscle at your current leanness equals the look you actually want. No cutting needed.',
      },
    };
  }

  // Above-average BF, wants to look better or lose fat
  if (isAboveAverage && (wantsLean || !wantsMuscle)) {
    const targetBF = isMale ? 12 : 20;
    const targetWeight = Math.round(c.lbmKg / (1 - targetBF / 100));
    const lossKg = +(s.weightKg - targetWeight).toFixed(1);
    const months = Math.ceil(lossKg / 2.5);
    return {
      interpretedGoal: 'Look and feel visibly leaner, more confident in their own skin',
      isRealistic: true,
      coachNote: `You have ${c.fatMassKg} kg of fat and ${c.lbmKg} kg of lean mass. The game plan is protecting the muscle while losing the fat. A daily deficit of 400–500 kcal off your ${c.tdee} kcal maintenance gets you there at a healthy rate — roughly ${lossKg} kg down to reach the target. You'll look noticeably different long before you hit the finish line.`,
      realisticPath: {
        targetWeightKg: targetWeight,
        targetBFPercent: targetBF,
        timelineRange: `${months}–${months + 2} months`,
        whatItLooksLike: `At ${targetWeight} kg and ~${targetBF}% body fat you'll be visibly lean with muscle definition showing through. A genuinely different person in the mirror.`,
        earlyWins: 'Within 4–6 weeks: clothes fit differently, face looks leaner, energy is better. Visible abs start appearing around 15–18% for men, 22–25% for women.',
      },
      foundationPath: {
        description: `Get to ${Math.round(targetWeight + 3)} kg at ~${targetBF + 3}% body fat first — this is your halfway point where you'll already look significantly different.`,
        targetWeightKg: Math.round(targetWeight + 3),
        targetBFPercent: targetBF + 3,
        timelineMonths: Math.ceil(months / 2),
        note: "Hit this and you'll have proof it works. The rest is just continuing what you've built.",
      },
    };
  }

  // Muscle gain goal
  if (wantsMuscle) {
    const targetBF = Math.min(c.bfPercent + 3, isMale ? 20 : 28);
    const targetWeight = Math.round(s.weightKg * 1.08);
    return {
      interpretedGoal: 'Build visible muscle mass and get stronger',
      isRealistic: true,
      coachNote: `Building real muscle takes longer than most people expect. A natural lifter adds roughly 1–2 kg of actual muscle per month in their first year. At ${c.lbmKg} kg lean mass you have a solid base. Eat at a slight surplus — ${c.tdee + 300}–${c.tdee + 500} kcal/day — and push progressively harder in the gym.`,
      realisticPath: {
        targetWeightKg: targetWeight,
        targetBFPercent: targetBF,
        timelineRange: '8–12 months',
        whatItLooksLike: `At ${targetWeight} kg with considerably more muscle, you'll be noticeably bigger and stronger. Shoulders wider, arms thicker, chest fuller.`,
        earlyWins: 'Strength numbers go up fast in the first 6–8 weeks. Visible size changes take 10–12 weeks minimum — but people around you will notice before you do.',
      },
      foundationPath: {
        description: `First 3 months: build the training habit, master the movements, eat at maintenance plus ~250 kcal. This is where your body learns to grow efficiently.`,
        targetWeightKg: Math.round(s.weightKg * 1.03),
        targetBFPercent: c.bfPercent,
        timelineMonths: 3,
        note: "Most people skip this and bulk too hard too fast. Don't.",
      },
    };
  }

  // Generic fallback — general improvement
  const targetBF = isMale ? 14 : 22;
  const targetWeight = Math.round(c.lbmKg / (1 - targetBF / 100));
  return {
    interpretedGoal: 'Improve overall fitness, health, and appearance',
    isRealistic: true,
    coachNote: `Your stats give us a clear baseline. From here the plan is straightforward: improve body composition — less fat, more functional muscle — and build habits that actually stick. Your ${c.tdee} kcal maintenance is the anchor for everything nutrition-related.`,
    realisticPath: {
      targetWeightKg: targetWeight,
      targetBFPercent: targetBF,
      timelineRange: '6–10 months',
      whatItLooksLike: 'A leaner, stronger version of you. More energy, better movement, and a body you\'re proud to be in.',
      earlyWins: 'Energy and sleep quality improve within 2–3 weeks of consistent training and eating right.',
    },
    foundationPath: {
      description: 'Establish consistent training 3–4 days/week and nail the nutrition basics first.',
      targetWeightKg: Math.round((s.weightKg + targetWeight) / 2),
      targetBFPercent: Math.round((c.bfPercent + targetBF) / 2),
      timelineMonths: 4,
      note: 'Consistency beats intensity every time, especially at the start.',
    },
  };
}
