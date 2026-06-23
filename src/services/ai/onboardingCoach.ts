import { groqChat } from './client';
import type { UserPhysicalStats, QuestionKey } from '@/modules/onboarding/utils/physicalStatsParser';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  extreme: 'Athlete Level',
};

const NEXT_PROMPT: Partial<Record<QuestionKey | 'done', string>> = {
  age: 'Ask how old they are.',
  sex: 'Ask their sex or gender. Buttons will appear for them to choose — just lead into the topic naturally.',
  weight: 'Ask how much they weigh (kg or lbs).',
  height: 'Ask how tall they are.',
  neck: "Ask for their neck circumference — mention it helps estimate body fat. Let them know they can skip if they don't know.",
  waist: "Ask for their waist measurement at the narrowest point. They can skip if they prefer.",
  hip: "Ask for their hip measurement at the widest point. They can skip.",
  country: "Ask which country or region they're in — explain it's so you can suggest food that's actually available to them.",
  dietary: "Ask about their dietary preferences (vegetarian, vegan, halal, kosher, etc., or no restrictions). They can list more than one.",
  activityLevel: 'You now have all the physical data you need. Acknowledge that briefly, then lead into asking about their activity level. Buttons will appear for them to choose — just set it up naturally.',
  activityDescription: 'Ask them to describe a typical day from morning to night so you can figure out their activity level.',
  done: "Wrap up warmly and briefly — you have everything you need to start building their plan. Don't recite the data back.",
};

export interface OnboardingReplyParams {
  goalText: string;
  collected: Partial<UserPhysicalStats>;
  justAnswered: QuestionKey;
  userRaw: string;
  nextQ: QuestionKey | 'done';
  correction?: string;
}

export async function onboardingReply({
  goalText,
  collected,
  justAnswered,
  userRaw,
  nextQ,
  correction,
}: OnboardingReplyParams): Promise<string> {
  const dataLines: string[] = [];
  if (collected.name) dataLines.push(`Name: ${collected.name}`);
  if (collected.age) dataLines.push(`Age: ${collected.age}`);
  if (collected.sex) dataLines.push(`Sex: ${collected.sex}`);
  if (collected.weightKg) dataLines.push(`Weight: ${collected.weightKg} kg`);
  if (collected.heightCm) dataLines.push(`Height: ${collected.heightCm} cm`);
  if (collected.neckCm) dataLines.push(`Neck: ${collected.neckCm} cm`);
  if (collected.waistCm) dataLines.push(`Waist: ${collected.waistCm} cm`);
  if (collected.hipCm) dataLines.push(`Hips: ${collected.hipCm} cm`);
  if (collected.country) dataLines.push(`Country: ${collected.country}`);
  if (collected.dietary) dataLines.push(`Dietary: ${collected.dietary}`);
  if (collected.activityLevel) dataLines.push(`Activity: ${ACTIVITY_LABELS[collected.activityLevel]}`);

  const system = `You are Gymman — a direct, warm AI fitness coach running an onboarding intake chat. You are collecting physical data from a new user to build their personalised training and nutrition plan.

The user's fitness goal (in their own words):
"${goalText}"

Rules:
- Keep every response to 1–3 short sentences. Never longer.
- No emojis. No bullet points.
- Acknowledge the user's answer naturally, then lead into the next question (or wrap up).
- Never robotically repeat data back word-for-word.
- Only reference the goal when it genuinely adds something — don't force it.
- Be warm and direct, not clinical or overly enthusiastic.`;

  const userMsg = correction
    ? `Data collected so far:\n${dataLines.join('\n')}\n\nWhile answering the "${justAnswered}" step, the user made a correction: "${userRaw}"\nResult: ${correction}\n\nAcknowledge the correction briefly and naturally, then re-ask the same question we were on: ${NEXT_PROMPT[justAnswered] ?? 'Continue.'}`
    : `Data collected so far:\n${dataLines.length ? dataLines.join('\n') : '(just started)'}\n\nThe user just answered the "${justAnswered}" step with: "${userRaw}"\n\nWhat to do next: ${NEXT_PROMPT[nextQ] ?? 'Continue the conversation naturally.'}`;

  return groqChat([
    { role: 'system', content: system },
    { role: 'user', content: userMsg },
  ]);
}
