/**
 * services/ai/onboardingChat.ts
 *
 * Orchestrates the onboarding questionnaire chat. Each user message is sent to
 * Groq with a large structured prompt that tells the AI which question is active,
 * what's already been collected, and what JSON format to return. The AI replies
 * with an action object: proceed (got the value), skip (user skipped an optional
 * field), correction (user corrected an earlier answer), unclear, or off-topic.
 *
 * localFallback() runs when Groq is unavailable — it tries the regex parsers from
 * physicalStatsParser.ts and returns a minimal result if they match.
 */

import { groqChat, type ChatMessage } from './client';
import type { UserPhysicalStats, QuestionKey } from '@/types/user';
import {
  extractName, extractAge, extractWeight, extractHeight,
  extractNeck, extractWaist, extractHip, estimateActivityLevel,
} from './physicalStatsParser';

export type OnboardingAction = 'proceed' | 'skip' | 'off-topic' | 'unclear' | 'correction';

export interface OnboardingChatResult {
  action: OnboardingAction;
  reply: string;
  collected?: Partial<UserPhysicalStats>;
  next?: QuestionKey | 'done';
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  extreme: 'Athlete Level',
};

function summarizeCollected(c: Partial<UserPhysicalStats>): string {
  return [
    c.name          && `Name: ${c.name}`,
    c.age           && `Age: ${c.age}`,
    c.sex           && `Sex: ${c.sex}`,
    c.weightKg      && `Weight: ${c.weightKg} kg`,
    c.heightCm      && `Height: ${c.heightCm} cm`,
    c.neckCm        && `Neck: ${c.neckCm} cm`,
    c.waistCm       && `Waist: ${c.waistCm} cm`,
    c.hipCm         && `Hips: ${c.hipCm} cm`,
    c.country       && `Country: ${c.country}`,
    c.dietary       && `Dietary: ${c.dietary}`,
    c.activityLevel && `Activity: ${ACTIVITY_LABELS[c.activityLevel]}`,
  ].filter(Boolean).join('\n') || '(none yet)';
}

// ─── Local fallback (used when the API is unavailable or rate-limited) ────────

function nextAfterMeasurement(q: 'neck' | 'waist' | 'hip', sex?: string): QuestionKey {
  if (q === 'neck') return 'waist';
  if (q === 'waist') return (sex === 'female' || sex === 'other') ? 'hip' : 'country';
  return 'country';
}

function localFallback({
  currentQ,
  collected,
  userRaw,
}: {
  currentQ: QuestionKey;
  collected: Partial<UserPhysicalStats>;
  userRaw: string;
}): OnboardingChatResult | null {
  switch (currentQ) {
    case 'name': {
      const name = extractName(userRaw);
      if (name) return { action: 'proceed', reply: `Hey ${name}!`, collected: { name }, next: 'age' };
      return null;
    }
    case 'age': {
      const age = extractAge(userRaw);
      if (age !== null) return { action: 'proceed', reply: 'Got it.', collected: { age }, next: 'sex' };
      return null;
    }
    case 'weight': {
      const w = extractWeight(userRaw);
      if (w) return { action: 'proceed', reply: `Noted — ${w.display}.`, collected: { weightKg: w.kg }, next: 'height' };
      return null;
    }
    case 'height': {
      const h = extractHeight(userRaw);
      if (h) return { action: 'proceed', reply: `Got it — ${h.display}.`, collected: { heightCm: h.cm }, next: 'neck' };
      return null;
    }
    case 'neck': {
      const v = extractNeck(userRaw);
      if (v === 'skip') return { action: 'skip', reply: 'No problem.', next: 'waist' };
      if (v !== null) return { action: 'proceed', reply: 'Got it.', collected: { neckCm: v }, next: 'waist' };
      return null;
    }
    case 'waist': {
      const v = extractWaist(userRaw);
      const next = nextAfterMeasurement('waist', collected.sex);
      if (v === 'skip') return { action: 'skip', reply: 'No problem.', next };
      if (v !== null) return { action: 'proceed', reply: 'Got it.', collected: { waistCm: v }, next };
      return null;
    }
    case 'hip': {
      const v = extractHip(userRaw);
      if (v === 'skip') return { action: 'skip', reply: 'No problem.', next: 'country' };
      if (v !== null) return { action: 'proceed', reply: 'Got it.', collected: { hipCm: v }, next: 'country' };
      return null;
    }
    case 'country': {
      const t = userRaw.trim();
      if (t.length >= 2) return { action: 'proceed', reply: 'Got it.', collected: { country: t }, next: 'dietary' };
      return null;
    }
    case 'dietary': {
      const t = userRaw.trim();
      if (t.length >= 1) return { action: 'proceed', reply: 'Almost done — just need to know how active you are.', collected: { dietary: t }, next: 'activityLevel' };
      return null;
    }
    case 'activityDescription': {
      const level = estimateActivityLevel(userRaw);
      return { action: 'proceed', reply: 'Got it.', collected: { activityLevel: level }, next: 'done' };
    }
    default:
      return null;
  }
}

export async function onboardingChat({
  currentQ,
  collected,
  userRaw,
  goalText,
  history,
}: {
  currentQ: QuestionKey;
  collected: Partial<UserPhysicalStats>;
  userRaw: string;
  goalText: string;
  history: ChatMessage[];
}): Promise<OnboardingChatResult> {
  const system = `You are Gymman — a direct, warm fitness coach running a structured onboarding questionnaire. You collect physical stats one field at a time to build a personalized plan.

User's fitness goal (stated before this chat): "${goalText}"
Only reference this when it genuinely adds something meaningful.

Data collected so far:
${summarizeCollected(collected)}

Current question being asked: ${currentQ}
User's sex (affects routing): ${collected.sex ?? 'unknown'}

━━━ FIELD PARSING RULES ━━━
name      → Extract 1–2 words, title-cased. Accept "my name is X", "I'm X", "call me X", or bare name.
age       → Integer 10–100. Convert word-form: "twenty" → 20, "mid-twenties" → 25, "I'm 25 years old" → 25.
weight    → {"weightKg": number}. Convert lbs (× 0.4536, round to 1 dp) or stones. Range 20–350 kg. Handle "about 70 kg", "seventy kilos", "155 lbs".
height    → {"heightCm": number}. Convert: ft/in (ft×30.48 + in×2.54), meters (×100). Range 100–250 cm. Handle "175 cm", "5'10\"", "1.75m", "five ten".
neck      → Number in cm (25–65). Convert inches (×2.54). Skippable: "skip", "no", "don't know", "idk", "pass", "n/a" → skip.
waist     → Number in cm (50–170). Convert inches. Skippable.
hip       → Number in cm (60–180). Convert inches. Skippable.
country   → Normalized string. Always include country name even with only a city. "Kannur" → "Kannur, Kerala, India", "Kerala" → "Kerala, India", "UK" → "United Kingdom".
dietary   → Accept exactly what the user typed (trimmed). Any preference is valid.
activityDescription → Infer activityLevel from their day description. Return {"activityLevel":"<level>"} where level is one of:
  sedentary (desk job, no or almost no exercise)
  light (walks/yoga/stretching, 1–3x/week gym)
  moderate (regular gym/sports 3–5x/week)
  active (daily intense training, or physically demanding job)
  extreme (twice-a-day training, competitive athlete, military)

━━━ NEXT QUESTION ROUTING ━━━
name → age → [sex set via buttons] → weight → height → neck → waist →
  if sex is female or other: → hip → country
  if sex is male or unknown: → country
country → dietary → [activityLevel set via buttons]
activityDescription → done

━━━ CORRECTION DETECTION ━━━
If the user corrects a previously collected field while on a different question (e.g. "actually my weight is 75" while being asked about country), apply the correction and return the current question as "next" so the questionnaire stays on track.

━━━ RESPONSE FORMAT ━━━
Always return a single valid JSON object. No markdown, no extra text.

Valid answer:
{"action":"proceed","reply":"<1–2 warm sentences>","collected":{<only the new or corrected field(s)>},"next":"<next question key or done>"}

Skippable field skipped (neck/waist/hip only):
{"action":"skip","reply":"No problem.","next":"<next question>"}

Correction to a previously collected field:
{"action":"correction","reply":"<one sentence confirming the update>","collected":{<updated field>},"next":"${currentQ}"}

Off-topic or joke / clearly impossible answer:
{"action":"off-topic","reply":"<1-2 sentences: engage briefly if it's genuinely funny, then end with a soft transition word or phrase like 'anyway', 'but back to it', or 'where were we'. STOP there. Do NOT ask the question or say what comes next — the question is sent as a separate message.>"}

Genuine but ambiguous attempt:
{"action":"unclear","reply":"<one short clarifying question>"}

━━━ TONE RULES ━━━
- 1–2 short sentences max. When nothing meaningful to add: just "Got it." or "Perfect."
- Warm and direct. Not clinical. Not over-enthusiastic.
- No emojis. No bullet points. No jargon (no BMR, TDEE, body fat %).
- For weight: echo the value → "Noted — 70 kg." or "Noted — 165 lbs (74.8 kg)."
- For height: echo → "Got it — 175 cm." or "Got it — 5'10\\" (177 cm)."
- For name: greet briefly by name.
- For country: acknowledge briefly. If Kerala or anywhere in India, note naturally that you have a local food library for them — don't make it stiff.
- For dietary: acknowledge in one sentence, then add a brief natural transition: "Almost done — just need to know how active you are."`;

  let raw = '';
  try {
    raw = await groqChat([
      { role: 'system', content: system },
      ...history.slice(-8),
      { role: 'user', content: `User replied: "${userRaw}"\n\nReturn the JSON response.` },
    ]);
  } catch (err) {
    console.warn('[onboardingChat] API unavailable, trying local fallback:', err);
    return localFallback({ currentQ, collected, userRaw })
      ?? { action: 'unclear', reply: "Could you be a bit more specific? I want to make sure I get this right." };
  }

  try {
    const cleaned = raw.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    return JSON.parse(cleaned) as OnboardingChatResult;
  } catch (err) {
    console.error('[onboardingChat] JSON parse failed. Raw model output:\n', raw);
    return localFallback({ currentQ, collected, userRaw })
      ?? { action: 'unclear', reply: "I didn't quite catch that — could you try again?" };
  }
}
