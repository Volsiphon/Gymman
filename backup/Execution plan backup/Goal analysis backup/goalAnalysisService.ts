import { groqChat } from '@/services/ai/client';
import type { UserPhysicalStats } from '@/modules/onboarding/utils/physicalStatsParser';
import type { BodyCompositionStats } from '@/engine/body-metrics';

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
  journey: GoalJourney;
}

export interface FoundationGoal {
  title: string;
  rationale: string;
  goalSimplified: string;
  journey: GoalJourney;
}

export interface GoalAnalysisResult {
  goalType: GoalType;
  subGoalType?: SubGoalType;

  // Section 1 — verdict (fitness path only)
  realisticVerdict?: string;

  // Section 3 — complete analysis
  goalInterpretation: string;

  // ── Rehabilitation path ────────────────────────────────────────────────────
  rehabilitationGuidance?: string;

  // ── Fitness path ──────────────────────────────────────────────────────────
  isFeasible?: boolean;

  // When isFeasible = true
  goalSimplified?: string;       // Section 2
  situationAnalysis?: string;    // Section 4
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
${s.age} years old, ${s.sex}
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

  "realisticVerdict": "2-3 sentences. State directly whether this goal is achievable. If yes: confirm it and name the rough timeframe (match journey.timelineText). Then add one concrete, specific note about early progress — something they'll actually notice well before the finish line (e.g. clothes fitting differently, visible change in the mirror, energy shifts — by weeks 4-6). Tight and genuine, no filler. If not feasible (isFeasible=false): one clear sentence on the physiological reason for this specific person, then pivot to what IS achievable that captures most of what they're after.",

  "isFeasible": true | false,
  // NOTE — isFeasible = false only when physically impossible regardless of time (e.g. drug-level body composition naturally, wrong direction entirely). Hard goals that take a long time = feasible.

  // INCLUDE ONLY when isFeasible = true:
  "goalSimplified": "For fat_loss and muscle_gain goals: 3-4 sentences in this exact format — 'To get [what they described], you'd need to [lose about X kg of fat / gain about X kg of muscle] — not just weight on the scale, but specifically [body fat / lean muscle]. That takes you from [current weight] kg to roughly [target] kg. At a steady [X kg/week] pace, that's roughly [Y weeks] of consistent work.' No extra padding or additional sentences beyond the format. For recomp/athletic/other: 3 concrete sentences — what specifically needs to change, what it achieves, and why it's worth the effort. Jargon-free.",

  "goalInterpretation": "2-3 paragraphs. The complete analysis behind the simplified goal. PARAGRAPH 1: What does their specific goal phrase actually mean? If they named a public figure (CR7, Arnold, Zac Efron, Eddie Hall, etc.): describe that person's actual physique at their prime — approximate real stats (height, weight, body fat %, level of muscle development, training background). If they described a look or capability (lean, athletic, aesthetic, strong, defined, etc.): translate it into precise physical terms — what body fat % range, what level of muscle mass, what physical capabilities. This paragraph describes the REFERENCE itself — no mention of the user yet. PARAGRAPH 2: Bridge to this person. Given their starting stats, what does reaching that reference actually require in physical terms? How much fat needs to go, how much muscle needs to come on, or both? Use real numbers from their profile — not just scale weight but the actual body composition change. This is the analysis that produced the simplified numbers above. PARAGRAPH 3 (ONLY if target body fat % would go below 10% for males or 15% for females): Open with a clear warning. State the recommended minimum body fat % for their sex. Explain in plain terms what consistently staying below that threshold causes — hormonal disruption, immune function impact, energy and mood effects. Factual and non-alarmist. DO NOT use the words 'bulk', 'cut', or 'recomp' anywhere in this section.",

  "situationAnalysis": "3 paragraphs. PARAGRAPH 1: This person's specific starting position. Given their age, sex, current body fat %, lean mass, build, and activity level — what advantages do they have going in? What might be a challenge for them specifically? Give an honest, grounded read. No generic encouragement. PARAGRAPH 2: The individual framing. The real goal is to become the best version of yourself — not a copy of someone else. You can absolutely achieve an aesthetic, strong, or athletic physique, but it will be YOUR version. If they referenced someone specific (e.g. CR7): name it directly — 'You won't look exactly like CR7, but you'll look like a version of you that is genuinely athletic, defined, and capable. That's the more interesting outcome.' The #YOU framing: your body, your story, your result. PARAGRAPH 3: Genetics as speed, not ceiling. With consistent training and the right approach, all body types can reach their own aesthetic or strength potential. What genetics mostly affects is how fast you get there — not whether you can. The destination is accessible to everyone; the path just looks different. Close on a grounded note of genuine possibility — not a pep talk, just honest.",

  "journey": {
    "targetWeightKg": number,
    "targetBFPercent": number,
    "timelineText": "e.g. '10–12 weeks' or '6–8 months'",
    "earlyWins": "1 sentence — something specific they will feel or see noticeably in the first 4–6 weeks."
  },

  // INCLUDE ONLY when isFeasible = false — BOTH required:
  "alternativeGoal": {
    "title": "Punchy ambitious title — not a consolation prize",
    "salesPitch": "2-3 sentences. Sell this goal with genuine energy — what they'll look like, what they'll be capable of, why this is the real version of what they're after.",
    "goalSimplified": "3-4 sentences in the same format as the feasible goalSimplified above, applied to the alternative goal's specific numbers.",
    "journey": { "targetWeightKg": number, "targetBFPercent": number, "timelineText": "...", "earlyWins": "..." }
  },
  "foundationGoal": {
    "title": "Short title for their scientifically optimal natural peak",
    "rationale": "2 sentences. Why reaching their natural best is the right first milestone. Frame positively — this is the foundation every serious athlete builds first.",
    "goalSimplified": "2-3 sentences. What their natural best actually looks like and why it's genuinely worth chasing.",
    "journey": { "targetWeightKg": number, "targetBFPercent": number, "timelineText": "...", "earlyWins": "..." }
  },

  // ALWAYS include:
  "educationTitle": "HOW [RELEVANT TOPIC] ACTUALLY WORKS",
  "educationContent": "4-5 paragraphs. Physiology education relevant to their specific goal. Fat loss: caloric deficit, muscle sparing, what the scale actually measures. Muscle gain: progressive overload, protein synthesis, monthly natural limits. Both together: why they can't happen at full speed simultaneously. Athletic performance: adaptation specificity. Write like a smart coach explaining real biology — not a textbook, not a wellness app."
}

RULES:
- NEVER address or refer to the client by name in any generated text. Always use 'you' and 'your'.
- All numbers must be specific to this client: ${s.weightKg} kg, ${c.bfPercent}%, ${c.lbmKg} kg LBM, ${c.tdee} kcal.
- goalInterpretation is NEVER generic. If a public figure is named, describe their actual physique.
- subGoalType MUST be one of: "fat_loss" | "muscle_gain" | "recomp" | "athletic" | "other".
- Do NOT include goalSimplified / situationAnalysis / journey at root when isFeasible = false.
- Do NOT include alternativeGoal / foundationGoal when isFeasible = true.
- Both alternativeGoal AND foundationGoal are required when isFeasible = false.
- Do NOT include fields named feasibilityNote or personalizedBreakdown.
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

function emergencyFallback(): GoalAnalysisResult {
  return {
    goalType: 'fitness',
    subGoalType: 'other',
    realisticVerdict: 'We weren\'t able to connect to the analysis engine right now. Your profile data is intact — continue and we\'ll build your plan from your numbers.',
    goalInterpretation:
      'We weren\'t able to connect to the analysis engine right now. Your profile data is intact — tap the button below to continue, and we\'ll build your plan from your numbers.',
    isFeasible: true,
    educationTitle: STANDARD_EDU_TITLE,
    educationContent: STANDARD_EDU_CONTENT,
  };
}
