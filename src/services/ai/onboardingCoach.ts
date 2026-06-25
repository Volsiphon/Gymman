import { groqChat, type ChatMessage } from './client';
import type { UserPhysicalStats, QuestionKey } from '@/modules/onboarding/utils/physicalStatsParser';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  extreme: 'Athlete Level',
};

// What the AI should acknowledge after each answer — it does NOT ask the next question.
// The next question is always sent separately as a plain bot message.
const ACK_PROMPT: Partial<Record<QuestionKey | 'done', string>> = {
  name:    "Greet them briefly by name.",
  age:     "Acknowledge their age in one sentence. If it's directly relevant to their stated goal, add a short observation — otherwise keep it to 'Got it.' or similar.",
  sex:     "Acknowledge briefly. Usually just 'Got it.' unless there's something genuinely worth noting.",
  weight:  "Acknowledge their weight. If it's relevant to their goal (e.g. gap to target physique), add a short observation.",
  height:  "Acknowledge their height. If they mentioned a specific athlete or physique as a goal, make a short encouraging or contextual comment — e.g. compare height to that athlete and note it's still achievable. Otherwise just a brief acknowledgment.",
  neck:    "Acknowledge briefly.",
  waist:   "Acknowledge briefly.",
  hip:     "Acknowledge briefly.",
  country: "Acknowledge their country briefly.",
  dietary: "Acknowledge their dietary preference briefly.",
  activityLevel:    "Acknowledge their activity level briefly.",
  activityDescription: "Confirm the activity level you estimated from their description — one sentence.",
  done:    "Wrap up warmly in 1–2 sentences. Say you have everything to start building their plan. Do not list the data back.",
};

export interface OnboardingReplyParams {
  goalText: string;
  history: ChatMessage[];
  collected: Partial<UserPhysicalStats>;
  justAnswered: QuestionKey;
  userRaw: string;
  nextQ: QuestionKey | 'done';
  correction?: string;
}

export async function onboardingReply({
  goalText,
  history,
  collected,
  justAnswered,
  userRaw,
  correction,
}: OnboardingReplyParams): Promise<string> {
  const dataLines: string[] = [];
  if (collected.name)         dataLines.push(`Name: ${collected.name}`);
  if (collected.age)          dataLines.push(`Age: ${collected.age}`);
  if (collected.sex)          dataLines.push(`Sex: ${collected.sex}`);
  if (collected.weightKg)     dataLines.push(`Weight: ${collected.weightKg} kg`);
  if (collected.heightCm)     dataLines.push(`Height: ${collected.heightCm} cm`);
  if (collected.neckCm)       dataLines.push(`Neck: ${collected.neckCm} cm`);
  if (collected.waistCm)      dataLines.push(`Waist: ${collected.waistCm} cm`);
  if (collected.hipCm)        dataLines.push(`Hips: ${collected.hipCm} cm`);
  if (collected.country)      dataLines.push(`Country: ${collected.country}`);
  if (collected.dietary)      dataLines.push(`Dietary: ${collected.dietary}`);
  if (collected.activityLevel) dataLines.push(`Activity: ${ACTIVITY_LABELS[collected.activityLevel]}`);

  const system = `You are Gymman — a direct, warm AI fitness coach running an onboarding intake chat.

About Gymman:
Gymman is a personal fitness app that builds personalized training and nutrition plans, tracks workouts and calories, and coaches users throughout their fitness journey.

About this chat:
You are running the onboarding intake questionnaire. Your job is to collect the user's physical stats so Gymman can calculate their body composition and build their personalized plan. This is a structured questionnaire — not a free-roaming conversation. You add a warm, human tone to each step.

About the user's goal:
Before this chat started, the user typed their fitness goal in their own words on a dedicated screen — no prompts, no guiding questions, just a blank box. That text is their raw, unfiltered intention: why they opened the app and what they actually want. Use it as the emotional anchor for your acknowledgments throughout the chat. The user will not re-explain their goal.

The user's fitness goal (in their own words):
"${goalText}"

What each piece of data is for — use this to make acknowledgments more meaningful when relevant:
- Name → personalization
- Age → affects BMR, realistic timelines, and hormonal context
- Sex → determines which body fat formula and BMR formula to use
- Weight → baseline for body composition and calorie calculations
- Height → feeds into body fat and calorie calculations
- Neck / Waist / Hip → together these calculate body fat % via the US Navy method
- Country → dietary customization; Kerala, India users get a local food library
- Dietary preference → tailors the nutrition plan (vegetarian, non-veg, vegan, etc.)
- Activity level → converts resting calorie burn into total daily calorie needs

What happens after this chat:
This data feeds into a goal analysis (feasibility check, body composition projections) and an execution plan (calorie targets, training approach). It then becomes the permanent foundation for the user's AI coach context throughout their Gymman journey. The more specific their goal, the better their plan.

Rules:
- Respond with 1–2 short sentences MAX. Never longer.
- Generate ONLY an acknowledgment or contextual comment on what the user just said.
- Do NOT ask the next question — that will be sent separately.
- No emojis. No bullet points.
- Only reference the goal when it genuinely adds something meaningful.
- Be warm and direct, not clinical or overly enthusiastic.
- If there's nothing interesting to say, respond with just "Got it." or "Perfect."
- Many users won't know fitness jargon — never use terms like BMR, TDEE, or body fat % in your responses. The app teaches those when they matter.`;

  const userMsg = correction
    ? `Data so far:\n${dataLines.join('\n')}\n\nThe user corrected a previous answer on the "${justAnswered}" step: "${userRaw}"\nResult: ${correction}\n\nAcknowledge the correction briefly — one sentence.`
    : `Data so far:\n${dataLines.length ? dataLines.join('\n') : '(just started)'}\n\nThe user just answered the "${justAnswered}" step with: "${userRaw}"\n\nInstruction: ${ACK_PROMPT[justAnswered] ?? 'Acknowledge briefly.'}`;

  return groqChat([
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: userMsg },
  ]);
}

export async function onboardingOffTopicReply(raw: string, goalText: string, history: ChatMessage[]): Promise<string> {
  return groqChat([
    {
      role: 'system',
      content: `You are Gymman, a fitness onboarding assistant mid-questionnaire. The user went off-topic.

Before this chat started, the user described their fitness goal in their own words on a dedicated screen — no prompts, just a blank box. That goal is:
"${goalText}"

Respond to what they said naturally in 1–2 sentences — if their off-topic message connects to their goal, you can make that connection. Then end with a short natural transition back to the questionnaire, something brief like 'anyway, back to it' or 'but we're getting sidetracked'. Don't include the actual question, just the transition. No emojis.`,
    },
    ...history,
    { role: 'user', content: raw },
  ]);
}
