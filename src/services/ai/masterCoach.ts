/**
 * services/ai/masterCoach.ts
 *
 * The Master AI Coach — fully context-aware, action-capable.
 *
 * On each message it classifies the user's query by keyword to decide which
 * data streams to load (weight history, diet log, training, burn, bloodwork),
 * then builds a compact context block and injects it into the system prompt.
 * The AI can also mutate user data by embedding structured commands in its reply:
 *
 *   Diet:    [DIET:ADD ...] [DIET:REMOVE ...] [DIET:UPDATE ...] [DIET:CLEAR]
 *   Burn:    [BURN:ADD name="..." calories=N]
 *   Workout: [WORKOUT:SET exercise="..." set=N reps=N result="done|short|skipped"]
 *            [WORKOUT:DONE]
 *
 * CoachScreen parses these, applies them to the relevant storage, and strips
 * them from the text before showing the reply to the user.
 */

import { aiChat, type ChatMessage } from './client';
import { loadUserProfile }           from '@/services/storage/local/userProfileStorage';
import { loadBodyWeightLogs }        from '@/services/storage/local/bodyWeightStorage';
import { loadTodayLog }              from '@/services/storage/local/dietLogStorage';
import { loadWorkoutLogs }           from '@/services/storage/local/workoutStorage';
import { loadRoutines }              from '@/services/storage/local/planStorage';
import { loadTodayActivities, loadActivityHistory } from '@/services/storage/local/caloryBurnStorage';
import { loadBloodworkLogs, METRICS } from '@/services/storage/local/bloodworkStorage';
import { parseDietActions, type DietAction } from './nutritionCoach';
import type { SetResult } from '@/types/plan';

// ─── Query classifier ─────────────────────────────────────────────────────────

type ContextNeeds = {
  weight:    boolean;
  diet:      boolean;
  training:  boolean;
  burn:      boolean;
  bloodwork: boolean;
};

function classifyQuery(message: string): ContextNeeds {
  const m = message.toLowerCase();
  return {
    weight:    /weight|kg|lb|lost|gained|heavier|lighter|progress|bmi|body.?fat|lean.?mass|scale|how.?much.?have.?i/.test(m),
    diet:      /eat|ate|food|diet|calor|macro|protein|carb|fat|meal|breakfast|lunch|dinner|snack|log|banana|chicken|rice|puttu|appam|parotta|biryani|curry|idli|dosa|chapati|drink|juice|coffee|tea|hunger|what.?should.?i|suggest/.test(m),
    training:  /workout|exercise|gym|train|routine|bench|squat|deadlift|sets?|reps?|push|pull|leg|muscle|session|lift|press|curl|row|shoulder|back|chest|arm|today.*gym|gym.*today|did.*workout|session.*done|finished.*gym/.test(m),
    burn:      /burn|cardio|walk|run|cycl|swim|step|activity|jog|hiit|sport|bike|played|played/.test(m),
    bloodwork: /blood|testosterone|vitamin|hba1c|cholesterol|glucose|insulin|thyroid|hormone|ferritin|crp|hdl|ldl|triglyceride|b12|zinc|cortisol|panel|lab/.test(m),
  };
}

// ─── Bloodwork trend builder ──────────────────────────────────────────────────

const NORMAL_RANGES: Record<string, { min: number; max: number }> = {
  hba1c:          { min: 4.0,  max: 5.6  },
  fastingGlucose: { min: 70,   max: 99   },
  totalChol:      { min: 0,    max: 200  },
  hdl:            { min: 40,   max: 999  },
  ldl:            { min: 0,    max: 130  },
  triglycerides:  { min: 0,    max: 150  },
  totalT:         { min: 300,  max: 1000 },
  tsh:            { min: 0.4,  max: 4.0  },
  vitD:           { min: 30,   max: 100  },
  hsCrp:          { min: 0,    max: 1.0  },
  ferritin:       { min: 12,   max: 300  },
};

type BloodworkLogs = Awaited<ReturnType<typeof loadBloodworkLogs>>;

function buildBloodworkContext(logs: BloodworkLogs): string {
  if (logs.length === 0) return '';
  const sorted  = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const latest   = sorted[0];
  const previous = sorted[1];
  const lines: string[] = [`Bloodwork (latest: ${latest.date}, ${sorted.length} panel(s) on record):`];

  for (const [key, value] of Object.entries(latest.metrics)) {
    if (!value.trim()) continue;
    const def = METRICS.find(m => m.key === key);
    if (!def) continue;
    const num     = parseFloat(value);
    if (isNaN(num)) { lines.push(`  ${def.label}: ${value} ${def.unit}`); continue; }
    const prevNum = previous?.metrics[key] ? parseFloat(previous.metrics[key]) : NaN;
    const trend   = !isNaN(prevNum)
      ? (num > prevNum + 0.01 ? ' ↑' : num < prevNum - 0.01 ? ' ↓' : ' →')
      : '';
    const range = NORMAL_RANGES[key];
    const flag  = range
      ? (num < range.min ? ' [LOW]' : num > range.max ? ' [HIGH]' : ' [normal]')
      : '';
    lines.push(`  ${def.label}: ${value} ${def.unit}${trend}${flag}`);
  }
  if (latest.notes) lines.push(`  Notes: ${latest.notes}`);
  return lines.join('\n');
}

// ─── Context block assembler ──────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayDayName(): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

async function buildContextBlock(needs: ContextNeeds): Promise<string> {
  const date    = todayStr();
  const dayName = todayDayName();
  const blocks: string[] = [];

  // Profile — always
  const profile = await loadUserProfile();
  if (profile) {
    blocks.push(
      `━━━ USER PROFILE ━━━
Name: ${profile.name} | Age: ${profile.age} | Sex: ${profile.sex}
Current weight: ${profile.weightKg} kg | Height: ${profile.heightCm} cm
Goal: ${profile.goalText}
Daily targets: ${profile.calorieTarget ?? '?'} kcal | P:${profile.proteinG ?? '?'}g C:${profile.carbsG ?? '?'}g F:${profile.fatsG ?? '?'}g
Dietary preference: ${profile.dietary} | Activity level: ${profile.activityLevel}`,
    );
  }

  // Weight history
  if (needs.weight) {
    const logs = await loadBodyWeightLogs();
    if (logs.length > 0) {
      const first = logs[0];
      const last  = logs[logs.length - 1];
      const diff  = (last.kg - first.kg).toFixed(1);
      const sign  = parseFloat(diff) > 0 ? '+' : '';
      const entries = logs
        .map((l, i) => {
          const tag = i === 0 ? ' ← start' : i === logs.length - 1 ? ' ← latest' : '';
          return `  ${l.date}: ${l.kg} kg${tag}`;
        })
        .join('\n');
      blocks.push(
        `━━━ WEIGHT HISTORY (${logs.length} entries, ${sign}${diff} kg total change) ━━━\n${entries}`,
      );
    }
  }

  // Diet
  if (needs.diet) {
    const log = await loadTodayLog();
    const targets = {
      calories: profile?.calorieTarget ?? 1700,
      protein:  profile?.proteinG      ?? 130,
      carbs:    profile?.carbsG        ?? 170,
      fats:     profile?.fatsG         ?? 47,
    };
    const totals = log.reduce(
      (a, e) => ({ calories: a.calories + e.calories, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fats: a.fats + e.fats }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
    const logLines = log.length === 0
      ? '  (nothing logged yet today)'
      : log.map((e, i) => `  ${i + 1}. [id:${e.id}] ${e.name} (${e.amount}) — ${Math.round(e.calories)} kcal | P:${Math.round(e.protein)}g C:${Math.round(e.carbs)}g F:${Math.round(e.fats)}g`).join('\n');
    blocks.push(
      `━━━ TODAY'S DIET (${date}) ━━━
${logLines}
Consumed: ${Math.round(totals.calories)} / ${targets.calories} kcal | P:${Math.round(totals.protein)}/${targets.protein}g C:${Math.round(totals.carbs)}/${targets.carbs}g F:${Math.round(totals.fats)}/${targets.fats}g
Remaining: ${Math.round(targets.calories - totals.calories)} kcal`,
    );
  }

  // Training
  if (needs.training) {
    const [routines, workoutLogs] = await Promise.all([loadRoutines(), loadWorkoutLogs()]);
    if (routines.length > 0) {
      const routine  = routines[routines.length - 1];
      const todayDay = routine.days.find(d => d.day === dayName);

      const todayBlock = todayDay
        ? todayDay.isRest
          ? `\nToday (${dayName}): Rest day`
          : `\nToday (${dayName}): ${todayDay.focus}\n${todayDay.exercises.map(e => `  - ${e.name}: ${e.sets} sets × ${e.reps}${e.rest ? ` (rest ${e.rest})` : ''}`).join('\n')}`
        : '';

      const fullRoutine = routine.days
        .map(d => {
          if (d.isRest) return `  ${d.day}: Rest`;
          return `  ${d.day} — ${d.focus}:\n${d.exercises.map(e => `    - ${e.name}: ${e.sets}×${e.reps}`).join('\n')}`;
        })
        .join('\n');

      const recentSessions = workoutLogs
        .slice(-5)
        .reverse()
        .map(log => {
          const label = new Date(log.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const exLines = log.exercises
            .map(ex => {
              const sets = ex.sets.map(s => s.result === 'done' ? '✓' : s.result === 'short' ? `${s.repsActual}r` : '✗').join(' ');
              return `    ${ex.name} (${ex.targetSets}×${ex.targetReps}): ${sets}`;
            })
            .join('\n');
          return `  ${label} — ${log.dayName} (${log.focus})\n${exLines}`;
        })
        .join('\n\n');

      blocks.push(
        `━━━ TRAINING ━━━
Routine: "${routine.name}"${todayBlock}

Full routine:
${fullRoutine}

Recent sessions (newest first):
${recentSessions || '  (no sessions logged yet)'}`,
      );
    }
  }

  // Calory burn
  if (needs.burn) {
    const [todayActs, weekHistory] = await Promise.all([loadTodayActivities(), loadActivityHistory(7)]);
    const todayBurn  = todayActs.reduce((s, a) => s + a.caloriesBurned, 0);
    const todayLines = todayActs.length === 0
      ? '  (nothing logged today)'
      : todayActs.map(a => `  [id:${a.id}] ${a.name}: ${a.caloriesBurned} kcal`).join('\n');
    const weekLines = weekHistory
      .map(d => {
        const burn = d.activities.reduce((s, a) => s + a.caloriesBurned, 0);
        return `  ${d.date}: ${d.activities.map(a => a.name).join(', ')} → ${burn} kcal`;
      })
      .join('\n');
    blocks.push(
      `━━━ CALORY BURN ━━━
Today (${date}): ${todayBurn} kcal burned
${todayLines}

Last 7 days:
${weekLines || '  (no activity logged this week)'}`,
    );
  }

  // Bloodwork
  if (needs.bloodwork) {
    const logs  = await loadBloodworkLogs();
    const bwCtx = buildBloodworkContext(logs);
    if (bwCtx) blocks.push(`━━━ ${bwCtx}`);
  }

  return blocks.join('\n\n');
}

// ─── Action types ─────────────────────────────────────────────────────────────

export type MasterAction =
  | { type: 'diet'; action: DietAction }
  | { type: 'burn_add'; name: string; calories: number }
  | { type: 'workout_set'; exercise: string; set: number; reps: number; result: SetResult }
  | { type: 'workout_done' };

function parseAttr(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|([\d.]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) result[m[1]] = m[2] ?? m[3];
  return result;
}

export function parseMasterActions(text: string): MasterAction[] {
  const actions: MasterAction[] = [];

  // Diet — reuse existing parser
  for (const da of parseDietActions(text)) {
    actions.push({ type: 'diet', action: da });
  }

  // [BURN:ADD name="..." calories=N]
  const burnRe = /\[BURN:ADD ([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = burnRe.exec(text)) !== null) {
    const v = parseAttr(m[1]);
    if (v.name && v.calories) {
      actions.push({ type: 'burn_add', name: v.name, calories: parseFloat(v.calories) });
    }
  }

  // [WORKOUT:SET exercise="..." set=N reps=N result="done|short|skipped"]
  const wkRe = /\[WORKOUT:SET ([^\]]+)\]/g;
  while ((m = wkRe.exec(text)) !== null) {
    const v      = parseAttr(m[1]);
    const result = (['done', 'short', 'skipped'] as const).includes(v.result as SetResult)
      ? (v.result as SetResult)
      : 'done';
    if (v.exercise && v.set) {
      actions.push({
        type:     'workout_set',
        exercise: v.exercise,
        set:      parseInt(v.set, 10),
        reps:     parseInt(v.reps ?? '0', 10),
        result,
      });
    }
  }

  if (text.includes('[WORKOUT:DONE]')) {
    actions.push({ type: 'workout_done' });
  }

  // Deduplicate DIET:ADD and BURN:ADD by name within the same reply
  const seenDiet = new Set<string>();
  const seenBurn = new Set<string>();
  return actions.filter(a => {
    if (a.type === 'diet' && a.action.type === 'add') {
      const key = a.action.entry.name.toLowerCase();
      if (seenDiet.has(key)) return false;
      seenDiet.add(key);
    }
    if (a.type === 'burn_add') {
      const key = a.name.toLowerCase();
      if (seenBurn.has(key)) return false;
      seenBurn.add(key);
    }
    return true;
  });
}

export function stripMasterActions(text: string): string {
  return text
    .replace(/\[DIET:[^\]]+\]/g, '')
    .replace(/\[BURN:[^\]]+\]/g, '')
    .replace(/\[WORKOUT:[^\]]+\]/g, '')
    .replace(/\[No Command Needed\]/gi, '')
    .replace(/\[N\/A\]/gi, '')
    .replace(/\[NONE\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(contextBlock: string): string {
  return `You are Gymman Coach — a master AI fitness, nutrition, and health coach with complete, live access to the user's entire health journey. You are direct, evidence-based, specific, and concise. Use metric units. Reference the user's actual logged data when it's relevant to the question.

${contextBlock}

━━━ YOUR ACTION CAPABILITIES ━━━
You can control the user's app data directly. Embed commands at the end of your reply when the user logs something or asks you to.

LOG FOOD — when the user mentions eating or drinking anything:
First check TODAY'S DIET log above. If the same item (matching name) is already there, do NOT add it — tell the user it's already logged and show what was recorded. Only re-add if they say they ate it again.
[DIET:ADD name="Food Name" amount="portion" calories=N protein=N carbs=N fats=N]
[DIET:REMOVE id="id-from-log-above"]
[DIET:UPDATE id="id-from-log-above" calories=N protein=N carbs=N fats=N]
[DIET:CLEAR]
[DIET:DONE]
Deep Kerala cuisine knowledge — puttu, appam, parotta, meen curry, sadhya, idli, beef fry, etc.

LOG CALORY BURN — when the user mentions any physical activity:
First check TODAY'S CALORY BURN log above. If the same activity is already logged, do NOT add it again — tell the user it's already there. Only re-add if they confirm they did it again.
[BURN:ADD name="30 min walk" calories=150]

LOG WORKOUT SETS — when the user tells you their set result during a gym session:
[WORKOUT:SET exercise="Bench Press" set=1 reps=10 result="done"]
[WORKOUT:SET exercise="Bench Press" set=2 reps=8 result="short"]
result options: done (hit target reps), short (partial reps, use actual count), skipped
[WORKOUT:DONE]  ← emit only when the entire session is finished

━━━ BEHAVIOUR RULES ━━━
- Log food the moment it's mentioned, no confirmation needed. Assume Kerala serving sizes when not specified.
- For workouts: log each set as the user reports it. Emit WORKOUT:DONE when session is over.
- For burn: log any physical activity immediately.
- For plan changes (routine edits, calorie target adjustments): confirm the change first, then act.
- When referencing data, be specific — name the actual numbers, dates, and trends the user has logged.
- TRAINING ROUTINES: Do NOT build or output full training routines here. If the user wants to create or modify their routine, tell them to go to Plan → Training where the dedicated Trainer Coach can build and save the program properly. You can discuss workout principles and help them think it through.
- DUPLICATE LOGGING: Before issuing any log command, check the existing log shown above. Do not log the same item twice unless the user explicitly confirms they did it again.
- NO JUNK MARKERS: If no action command is needed, just reply with plain text. Never include [No Command Needed], [N/A], [NONE], or any placeholder markers.
- Keep responses under 350 words. For detailed questions, give a thorough answer but stay under 600 words.`;
}

// ─── Main chat function ───────────────────────────────────────────────────────

export async function masterCoachChat(
  history: ChatMessage[],
): Promise<{ display: string; actions: MasterAction[] }> {
  const lastUserMsg  = [...history].reverse().find(m => m.role === 'user')?.content ?? '';
  const needs        = classifyQuery(lastUserMsg);
  const contextBlock = await buildContextBlock(needs);
  const system       = buildSystemPrompt(contextBlock);

  const rawReply = await aiChat([
    { role: 'system', content: system },
    ...history.filter(m => m.role !== 'system'),
  ], 4096);

  return {
    display: stripMasterActions(rawReply),
    actions: parseMasterActions(rawReply),
  };
}
