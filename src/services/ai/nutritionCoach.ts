/**
 * services/ai/nutritionCoach.ts
 *
 * The Diet Coach AI service. Two responsibilities:
 *
 * 1. System prompt builder (buildNutritionSystem): Generates a dynamic system prompt
 *    that includes today's live food log and macro progress. This is rebuilt on every
 *    message so the AI always sees the current log state — it knows what's already
 *    been logged and can suggest meals that fit the remaining calories.
 *
 * 2. Action parser (parseDietActions / stripDietActions): The AI embeds structured
 *    [DIET:ADD ...], [DIET:REMOVE ...], [DIET:UPDATE ...], [DIET:CLEAR] commands in
 *    its reply. The parser extracts these and the screen applies them as mutations to
 *    today's food log. This is how the AI controls the log — it "speaks" in commands.
 *
 * Also exports VISION_SYSTEM for food photo analysis via groqVisionChat().
 */

import { aiChat, type ChatMessage } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MealEntry = {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type LogItem = MealEntry & { id: string };

export type DietAction =
  | { type: 'add'; entry: MealEntry }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; patch: Partial<MealEntry> }
  | { type: 'clear' };

// ─── Action parser ────────────────────────────────────────────────────────────

function parseAttr(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([\d.]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    result[m[1]] = m[2] ?? m[3];
  }
  return result;
}

export function parseDietActions(text: string): DietAction[] {
  const actions: DietAction[] = [];

  // [DIET:ADD name="..." amount="..." calories=N protein=N carbs=N fats=N]
  const addRe = /\[DIET:ADD ([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = addRe.exec(text)) !== null) {
    const v = parseAttr(m[1]);
    if (v.name && v.calories) {
      actions.push({
        type: 'add',
        entry: {
          name:     v.name,
          amount:   v.amount   ?? '',
          calories: parseFloat(v.calories),
          protein:  parseFloat(v.protein  ?? '0'),
          carbs:    parseFloat(v.carbs    ?? '0'),
          fats:     parseFloat(v.fats     ?? '0'),
        },
      });
    }
  }

  // [DIET:REMOVE id="..."]
  const removeRe = /\[DIET:REMOVE ([^\]]+)\]/g;
  while ((m = removeRe.exec(text)) !== null) {
    const v = parseAttr(m[1]);
    if (v.id) actions.push({ type: 'remove', id: v.id });
  }

  // [DIET:UPDATE id="..." ...fields...]
  const updateRe = /\[DIET:UPDATE ([^\]]+)\]/g;
  while ((m = updateRe.exec(text)) !== null) {
    const v = parseAttr(m[1]);
    if (!v.id) continue;
    const patch: Partial<MealEntry> = {};
    if (v.name)     patch.name     = v.name;
    if (v.amount)   patch.amount   = v.amount;
    if (v.calories) patch.calories = parseFloat(v.calories);
    if (v.protein)  patch.protein  = parseFloat(v.protein);
    if (v.carbs)    patch.carbs    = parseFloat(v.carbs);
    if (v.fats)     patch.fats     = parseFloat(v.fats);
    actions.push({ type: 'update', id: v.id, patch });
  }

  if (text.includes('[DIET:CLEAR]')) {
    actions.push({ type: 'clear' });
  }

  return actions;
}

export function stripDietActions(text: string): string {
  return text
    .replace(/\[DIET:[^\]]+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Dynamic system prompt ────────────────────────────────────────────────────

export function buildNutritionSystem(
  log: LogItem[],
  goals: { calories: number; protein: number; carbs: number; fats: number },
): string {
  const totals = log.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein,
      carbs:    acc.carbs    + e.carbs,
      fats:     acc.fats     + e.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  const logSection = log.length === 0
    ? '(nothing logged yet)'
    : log
        .map(
          (e, i) =>
            `${i + 1}. [id:${e.id}] ${e.name} (${e.amount}) — ${Math.round(e.calories)} kcal | P:${Math.round(e.protein)}g C:${Math.round(e.carbs)}g F:${Math.round(e.fats)}g`,
        )
        .join('\n');

  return `You are Gymman's AI Nutrition Coach — a Kerala food expert with full, live control over the user's daily food log.

━━━ TODAY'S LOG ━━━
${logSection}

━━━ TODAY'S PROGRESS ━━━
Consumed: ${Math.round(totals.calories)} / ${goals.calories} kcal
Protein:  ${Math.round(totals.protein)}/${goals.protein}g
Carbs:    ${Math.round(totals.carbs)}/${goals.carbs}g
Fats:     ${Math.round(totals.fats)}/${goals.fats}g
Remaining: ${Math.round(goals.calories - totals.calories)} kcal

━━━ LOG CONTROL ━━━
Issue these commands at the end of your reply to directly change the log.

ADD food:
[DIET:ADD name="Food Name" amount="portion" calories=N protein=N carbs=N fats=N]

REMOVE (use the id from the log above):
[DIET:REMOVE id="the-id-here"]

UPDATE (use the id, include only fields that change):
[DIET:UPDATE id="the-id-here" amount="new amount" calories=N protein=N carbs=N fats=N]

CLEAR entire log:
[DIET:CLEAR]

Always close your action block with:
[DIET:DONE]

━━━ BEHAVIOUR ━━━
- When user says what they ate → add it immediately, no confirmation needed
- When they give exact weight/grams → use those exact values for macros
- When no portion given → assume a typical Kerala serving size and say what you assumed
- For removes/updates → confirm in one sentence what changed
- Keep replies short (1-2 sentences + actions). No filler.
- Only issue DIET actions when the user is actually logging or modifying food — not for general nutrition questions.
- Deep knowledge of Kerala cuisine: puttu, appam, parotta, meen curry, sadhya, beef fry, etc.`;
}

// ─── Vision system prompt ─────────────────────────────────────────────────────

export const VISION_SYSTEM = `You are a nutrition analyst specialising in South Indian and Kerala cuisine.

The user has photographed their food. Identify what it is, estimate the portion, and calculate macros.

Reply format:
**[Food Name]** (~[estimated portion])
[N] kcal | P: [N]g | C: [N]g | F: [N]g
[One sentence: note or confidence level]

Then immediately log it:
[DIET:ADD name="Food Name" amount="estimated portion" calories=N protein=N carbs=N fats=N]
[DIET:DONE]

If you can't identify the food clearly, give your best estimate — never refuse. Typical Kerala foods: puttu, appam, parotta, meen curry, rice, biryani, etc.`;

// ─── Chat function (caller provides system via buildNutritionSystem) ───────────

export async function nutritionCoachChat(
  history: ChatMessage[],
  log: LogItem[],
  goals: { calories: number; protein: number; carbs: number; fats: number },
): Promise<string> {
  return aiChat([{ role: 'system', content: buildNutritionSystem(log, goals) }, ...history]);
}
