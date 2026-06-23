import { groqChat } from '@/services/ai/client';
import type { UserPhysicalStats } from '@/modules/onboarding/utils/physicalStatsParser';
import type { BodyCompositionStats } from '@/modules/onboarding/utils/fitnessCalculations';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalType = 'fitness' | 'rehabilitation';
export type SubGoalType = 'fat_loss' | 'muscle_gain' | 'recomp' | 'athletic' | 'other';

// ─── Hardcoded education for weight/muscle goals ──────────────────────────────

const STANDARD_EDU_TITLE = 'HOW MUSCLE AND FAT ARE ACTUALLY BUILT';
const STANDARD_EDU_CONTENT =
  `Every day, your body needs a certain amount of energy (measured in calories) just to keep running — heartbeat, breathing, digestion, walking around. Think of this like your body's "running cost."\n\n` +
  `Eat more than that running cost, and your body has leftover energy. If you're training and eating enough protein, some of that leftover gets used to build new muscle. If you're not training, or you're eating way more than needed, that leftover mostly gets stored as fat instead.\n\n` +
  `Eat less than that running cost, and your body has to make up the difference from somewhere — it starts breaking down stored fat for energy. That's fat loss. But go too low for too long without enough protein, and it'll start breaking down muscle too, which is the opposite of what most people actually want.\n\n` +
  `So the whole game is: eat slightly more than your running cost (with training + protein) to build muscle, eat slightly less (with enough protein) to lose fat while keeping the muscle you have, or eat right around it to roughly stay the same.`;

const STANDARD_EDU_GOAL_TYPES: SubGoalType[] = ['fat_loss', 'muscle_gain', 'recomp'];

export interface GoalJourney {
  targetWeightKg: number;
  targetBFPercent: number;
  timelineText: string;
  earlyWins: string;
}

export interface AlternativeGoal {
  title: string;
  salesPitch: string;
  goalSimplified: string;
  personalizedBreakdown: string;
  journey: GoalJourney;
}

export interface FoundationGoal {
  title: string;
  rationale: string;
  goalSimplified: string;
  personalizedBreakdown: string;
  journey: GoalJourney;
}

export interface GoalAnalysisResult {
  goalType: GoalType;
  subGoalType?: SubGoalType;
  goalInterpretation: string;

  // ── Rehabilitation path ────────────────────────────────────────────────────
  rehabilitationGuidance?: string;

  // ── Fitness path ──────────────────────────────────────────────────────────
  isFeasible?: boolean;
  feasibilityNote?: string;

  // When isFeasible = true
  goalSimplified?: string;
  personalizedBreakdown?: string;
  journey?: GoalJourney;

  // When isFeasible = false
  alternativeGoal?: AlternativeGoal;
  foundationGoal?: FoundationGoal;

  // Always present
  educationTitle: string;
  educationContent: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(s: UserPhysicalStats, goalText: string, c: BodyCompositionStats): string {
  return `You are a veteran fitness coach and physiologist. Analyse this client's goal. Respond ONLY with valid JSON — no markdown, no text outside the object.

CLIENT:
${s.name}, ${s.age} years old, ${s.sex}
Height: ${s.heightCm} cm | Weight: ${s.weightKg} kg
Body Fat: ~${c.bfPercent}% (${c.bfCategory}) | LBM: ${c.lbmKg} kg | Fat Mass: ${c.fatMassKg} kg
Build: ${c.buildDescription} | TDEE: ~${c.tdee} kcal/day | BMR: ~${c.bmr} kcal
Activity: ${s.activityLevel}

THEIR GOAL:
"${goalText}"

STEP 1: Classify the goal.
goalType = "rehabilitation" if the goal involves: posture correction, back/neck/joint pain, injury recovery, sciatica, herniated disc, chronic pain, limited mobility, scoliosis, arthritis, or any condition needing clinical assessment.
goalType = "fitness" for everything else: weight loss, muscle gain, body recomposition, athletic performance, general fitness.

STEP 2: Respond with the correct JSON schema.

─── REHABILITATION SCHEMA ─────────────────────────────────────────────────────
{
  "goalType": "rehabilitation",
  "goalInterpretation": "1-2 paragraphs. Acknowledge their goal warmly. Describe what genuine improvement in this area looks like and why it matters for daily life. Specific, not dismissive.",
  "rehabilitationGuidance": "3-4 sentences. Direct them to a real professional (physiotherapist, orthopaedic specialist, or GP) and explain WHY — wrong movement under pain or injury can cause permanent damage, and AI cannot safely prescribe rehab protocols. Mention that once they have a professional plan, our Rehabilitation Coach feature can help them manage and understand it. If the issue sounds minor (mild postural awareness rather than injury), you may share general educational context but be explicit that no routine will be built without professional clearance. Mention affordable access options (public health systems, online physio services). Warm and practical, not alarming.",
  "educationTitle": "WHY [THEIR SPECIFIC AREA] NEEDS PROFESSIONAL GUIDANCE",
  "educationContent": "4-5 paragraphs. Educate on the anatomy/physiology behind their issue. Explain what a professional assessment actually looks for and why self-directed rehab can cause harm. Make them feel informed and empowered, not scared."
}

─── FITNESS SCHEMA ────────────────────────────────────────────────────────────
{
  "goalType": "fitness",
  "subGoalType": "fat_loss" | "muscle_gain" | "recomp" | "athletic" | "other",
  "goalInterpretation": "2 rich paragraphs. PARAGRAPH 1 — start from their exact words. If a public figure is named (CR7, Arnold, Zac Efron, Eddie Hall, etc.): describe that person's ACTUAL physique — body fat %, muscle mass, training history, what it physically took to build. If a vague word is used (lean, fit, strong, aesthetic, athletic): describe in concrete physical terms what that look or capability actually requires. This paragraph is pure description of the GOAL itself — no mention of the user yet. PARAGRAPH 2 — bridge to the user. Explain what this goal means AS A FITNESS OBJECTIVE: what category it falls into (fat loss, muscle gain, recomposition, etc.) and WHY. Connect their words directly to the concrete physical work involved. The user should finish this box thinking: 'I understand what I'm actually chasing now, and why it's classified the way it is.'",
  "isFeasible": true | false,
  "feasibilityNote": "2-3 sentences. If feasible: given their stats, confirm yes — include rough timeline and what achieving it actually means for them. If NOT feasible: exact physiological reason why, specific to this person's starting point. NOTE — isFeasible = false only when physically impossible regardless of training duration (e.g. drug-level body composition naturally, impossible muscle gains). Hard goals that take a long time = feasible. Lean person wanting more leanness when they actually need muscle = infeasible (wrong direction).",

  // INCLUDE ONLY when isFeasible = true:
  "goalSimplified": "3-4 sentences. Start with the simplest possible version of what they're chasing — their words, stripped of any framing. Then connect directly to their profile: what does this mean FOR THEM specifically? Name the rough change in plain terms (lose roughly X kg of fat, build X kg of muscle) and what it achieves — not the detailed plan, just the simple version a friend would explain over text. Zero jargon, conversational tone.",
  "personalizedBreakdown": "3-4 sentences. Lead with what specifically has to change — not just 'weight on the scale' but specifically fat or muscle. Give the concrete from-to numbers (current weight/BF% → target weight/BF%). State the realistic weekly pace and total duration. End with what they'd actually look like at the target — a concrete physical statement, not vague encouragement.",
  "journey": {
    "targetWeightKg": number,
    "targetBFPercent": number,
    "timelineText": "e.g. '8–12 months'",
    "earlyWins": "1 sentence — what they will feel or see in the first 4–6 weeks."
  },

  // INCLUDE ONLY when isFeasible = false — BOTH are required:
  "alternativeGoal": {
    "title": "Punchy ambitious title — not a consolation prize",
    "salesPitch": "2-3 sentences. SELL this goal with genuine energy. What they'll look like, what they'll feel capable of, why this is the real version of what they're actually after.",
    "goalSimplified": "3-4 sentences. Plain language — what are they actually going to look like and be capable of at this goal? Connect briefly to their current profile to make it feel personal.",
    "personalizedBreakdown": "3-4 sentences. Specific from-to numbers (current weight/BF% → target), realistic weekly pace, total duration, and what they'd look like physically at the finish.",
    "journey": { "targetWeightKg": number, "targetBFPercent": number, "timelineText": "...", "earlyWins": "..." }
  },
  "foundationGoal": {
    "title": "Short title for their scientifically optimal natural peak",
    "rationale": "2-3 sentences. The 'reach your limits before breaking them' message — before chasing anything beyond natural science, the first step is reaching their OWN calculated best. Once there, a real professional can assess what's possible next. Frame positively: this is the foundation every elite athlete builds before going further.",
    "goalSimplified": "3-4 sentences. Plain language — what does 'your natural best' actually look like for this person? What will they be capable of, what will they look like, why is this worth chasing in itself?",
    "personalizedBreakdown": "3-4 sentences. Specific from-to numbers (current weight/BF% → target), realistic weekly pace, total duration, and what they'd look like physically at the finish.",
    "journey": { "targetWeightKg": number, "targetBFPercent": number, "timelineText": "...", "earlyWins": "..." }
  },

  // ALWAYS include:
  "educationTitle": "HOW [RELEVANT TOPIC] ACTUALLY WORKS",
  "educationContent": "4-5 paragraphs. Physiology education relevant to their specific goal. Fat loss: caloric deficit, muscle sparing, what the scale actually measures. Muscle gain: progressive overload, protein synthesis, monthly natural limits. Both together: why they can't happen at full speed simultaneously. Athletic performance: adaptation specificity. Write like a smart coach explaining real biology — not a textbook, not a wellness app."
}

RULES:
- All numbers must be specific to this client: ${s.weightKg} kg, ${c.bfPercent}%, ${c.lbmKg} kg LBM, ${c.tdee} kcal.
- goalInterpretation is NEVER generic. If a public figure is named, describe their actual physique.
- subGoalType MUST be one of: "fat_loss" (primary goal is reducing body fat), "muscle_gain" (primary goal is building muscle), "recomp" (lose fat and gain muscle simultaneously), "athletic" (performance, endurance, sport-specific), "other" (anything that doesn't fit).
- Do NOT include goalSimplified / personalizedBreakdown / journey at root when isFeasible = false.
- Do NOT include alternativeGoal / foundationGoal when isFeasible = true.
- Both alternativeGoal AND foundationGoal are required when isFeasible = false.
- Tone: direct, knowledgeable coach. Not condescending. Not a wellness app.`;
}

// ─── Education override ───────────────────────────────────────────────────────

function applyStandardEducation(result: GoalAnalysisResult): GoalAnalysisResult {
  if (
    result.goalType === 'fitness' &&
    result.subGoalType &&
    STANDARD_EDU_GOAL_TYPES.includes(result.subGoalType)
  ) {
    result.educationTitle = STANDARD_EDU_TITLE;
    result.educationContent = STANDARD_EDU_CONTENT;
  }
  return result;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function analyzeGoal(
  stats: UserPhysicalStats,
  goalText: string,
  calcs: BodyCompositionStats,
): Promise<GoalAnalysisResult> {
  try {
    const raw = await groqChat([
      {
        role: 'system',
        content: 'You are a veteran fitness coach and physiologist. Honest, direct, deeply knowledgeable. Respond only with the requested JSON — no markdown fences, no text outside the object.',
      },
      { role: 'user', content: buildPrompt(stats, goalText, calcs) },
    ]);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]) as GoalAnalysisResult;
    return applyStandardEducation(result);
  } catch (e) {
    console.warn('[GoalAnalysis] AI call failed:', e);
    return emergencyFallback();
  }
}

// ─── Emergency fallback ───────────────────────────────────────────────────────
// Only fires when the AI call fails entirely. Provides just enough structure
// for the screen to render without crashing.

function emergencyFallback(): GoalAnalysisResult {
  return {
    goalType: 'fitness',
    subGoalType: 'other',
    goalInterpretation:
      'We weren\'t able to connect to the analysis engine right now. Your profile data is intact — tap the button below to continue, and we\'ll build your plan from your numbers.',
    isFeasible: true,
    educationTitle: STANDARD_EDU_TITLE,
    educationContent: STANDARD_EDU_CONTENT,
  };
}
