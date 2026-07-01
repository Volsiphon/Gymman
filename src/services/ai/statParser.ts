/**
 * services/ai/statParser.ts
 *
 * AI-powered field parser for the onboarding questionnaire. When a regex in
 * physicalStatsParser.ts can't extract a value — unusual phrasing, edge case,
 * or a country name that needs normalising — this sends a focused Groq call
 * to parse just that one field. Returns a typed result (value / skip / joke /
 * off-topic / unclear) so the screen knows exactly how to respond.
 */

import { groqChat } from './client';
import type { QuestionKey } from '@/types/user';

export type FieldParseResult =
  | { kind: 'value'; value: number | string | WeightValue | HeightValue }
  | { kind: 'skip' }
  | { kind: 'joke'; reply: string }
  | { kind: 'off-topic' }
  | { kind: 'unclear'; reply: string };

export interface WeightValue { kg: number; display: string }
export interface HeightValue { cm: number; display: string }

// Fields that fall back to Groq when regex fails, plus country which always uses Groq
export const AI_PARSEABLE = new Set<QuestionKey>([
  'name', 'age', 'weight', 'height', 'neck', 'waist', 'hip', 'country',
]);

const SKIPPABLE = new Set<QuestionKey>(['neck', 'waist', 'hip']);

const FIELD_QUESTION: Partial<Record<QuestionKey, string>> = {
  name:    'What is your name?',
  age:     'How old are you?',
  weight:  'How much do you weigh?',
  height:  'How tall are you?',
  neck:    'What is your neck circumference? (they can skip)',
  waist:   'What is your waist measurement at the narrowest point? (they can skip)',
  hip:     'What is your hip measurement at the widest point? (they can skip)',
  country: 'Which country or region are you in?',
};

const FIELD_FORMAT: Partial<Record<QuestionKey, string>> = {
  name:    'A string: 1–2 words, title-cased. e.g. "Arjun" or "John Doe".',
  age:     'A number (integer, 10–100). Convert word-form: "twenty" → 20, "mid-twenties" → 25.',
  weight:  'An object {"kg":number,"display":string}. Convert lbs/stones if needed. Examples: {"kg":70,"display":"70 kg"} or {"kg":74.8,"display":"165 lbs (74.8 kg)"}.',
  height:  'An object {"cm":number,"display":string}. Convert feet/inches or meters. Examples: {"cm":175,"display":"175 cm"} or {"cm":177,"display":"5\'10\\" (177 cm)"}.',
  neck:    'A number in cm (range 25–65). Convert inches if mentioned. e.g. 38',
  waist:   'A number in cm (range 50–170). Convert inches if mentioned. e.g. 80',
  hip:     'A number in cm (range 60–180). Convert inches if mentioned. e.g. 95',
  country: 'A string with the real country/region. Normalize vague references: "around Kannur" → "Kannur, Kerala, India", "somewhere in Kerala" → "Kerala, India", "South India" → "South India".',
};

export async function groqParseField(
  question: QuestionKey,
  raw: string,
): Promise<FieldParseResult> {
  const format = FIELD_FORMAT[question];
  if (!format) return { kind: 'value', value: raw.trim() };

  const canSkip = SKIPPABLE.has(question);

  const lines = [
    `Question: "${FIELD_QUESTION[question]}"`,
    `User replied: "${raw}"`,
    '',
    'Reply ONLY with a valid JSON object — no markdown, no extra text. Choose one format:',
    canSkip
      ? '{"kind":"skip"}  ← use if they want to skip or don\'t know'
      : null,
    '{"kind":"value","value":<value>}  ← use if you can extract a valid answer',
    '{"kind":"joke","reply":"<1–2 sentences: react to the joke naturally, no mention of editing>"}  ← clearly impossible or joke answer (e.g. "from Mars", "300 years old")',
    '{"kind":"off-topic"}  ← message has nothing to do with the question (random questions, unrelated comments, anything not attempting to answer)',
    '{"kind":"unclear","reply":"<one short clarifying question>"}  ← user was clearly trying to answer but their phrasing is genuinely ambiguous (e.g. "about five and a half" for height)',
    '',
    `Value format for this field: ${format}`,
    '',
    'Parsing notes:',
    '- Word-form numbers are valid: "twenty" → 20, "one seventy five" → 175',
    '- Approximations are fine: "around 70 kg" → 70, "about five ten" → 177 cm',
    '- For country, always include country name in the output even if they only gave a city',
  ].filter((l): l is string => l !== null).join('\n');

  try {
    const text = await groqChat([
      {
        role: 'system',
        content: 'You are a JSON-only field parser for a fitness app. Output nothing but a single valid JSON object.',
      },
      { role: 'user', content: lines },
    ]);

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(cleaned) as FieldParseResult;
  } catch {
    return { kind: 'unclear', reply: "I didn't quite get that — could you try phrasing it differently?" };
  }
}
