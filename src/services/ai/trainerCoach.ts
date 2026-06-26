import { groqChat, type ChatMessage } from './client';
import type { Routine, RoutineDay, Exercise } from '@/types/routine';
import type { WorkoutLog } from '@/types/workoutLog';

// ─── Patch types ──────────────────────────────────────────────────────────────

export type PatchOp =
  | { op: 'update'; day: string; exercise: string; sets?: number; reps?: string; rest?: string; section?: string }
  | { op: 'swap';   day: string; exercise: string; to: string }
  | { op: 'add';    day: string; exercise: string; sets: number; reps: string; rest?: string; section?: string; after?: string }
  | { op: 'remove'; day: string; exercise: string };

export const PATCH_DONE_MARKER = '[PATCH_DONE]';

// ─── Patch parser ─────────────────────────────────────────────────────────────

function parsePatchKV(kv: string): PatchOp | null {
  const vals: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|(\S+?)(?=\s+\w+=|$))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kv)) !== null) {
    vals[m[1]] = m[2] ?? m[3];
  }
  const { op, day, exercise } = vals;
  if (!op || !day || !exercise) return null;

  if (op === 'update') {
    return {
      op: 'update', day, exercise,
      ...(vals.sets    !== undefined ? { sets:    parseInt(vals.sets, 10) } : {}),
      ...(vals.reps    !== undefined ? { reps:    vals.reps    } : {}),
      ...(vals.rest    !== undefined ? { rest:    vals.rest    } : {}),
      ...(vals.section !== undefined ? { section: vals.section } : {}),
    };
  }
  if (op === 'swap' && vals.to) {
    return { op: 'swap', day, exercise, to: vals.to };
  }
  if (op === 'add') {
    return {
      op: 'add', day, exercise,
      sets: parseInt(vals.sets ?? '3', 10),
      reps: vals.reps ?? '10',
      ...(vals.rest    !== undefined ? { rest:    vals.rest    } : {}),
      ...(vals.section !== undefined ? { section: vals.section } : {}),
      ...(vals.after   !== undefined ? { after:   vals.after   } : {}),
    };
  }
  if (op === 'remove') {
    return { op: 'remove', day, exercise };
  }
  return null;
}

export function extractPatches(text: string): PatchOp[] {
  const patches: PatchOp[] = [];
  const re = /\[PATCH ([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const p = parsePatchKV(m[1]);
    if (p) patches.push(p);
  }
  return patches;
}

function nameMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = norm(a);
  const nb = norm(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function applyPatchesToRoutine(routine: Routine, patches: PatchOp[]): Routine {
  const days: RoutineDay[] = (routine.days ?? []).map((d) => ({
    ...d,
    exercises: (d.exercises ?? []).map((e) => ({ ...e })),
  }));

  for (const patch of patches) {
    const dayIdx = days.findIndex((d) => d.day.toLowerCase() === patch.day.toLowerCase());
    if (dayIdx === -1) {
      console.warn('[applyPatch] no day match for:', patch.day, '| available:', days.map((d) => d.day));
      continue;
    }
    const day = days[dayIdx];

    switch (patch.op) {
      case 'update': {
        let matched = false;
        day.exercises = day.exercises.map((ex) => {
          if (!nameMatch(ex.name, patch.exercise)) return ex;
          matched = true;
          return {
            ...ex,
            ...(patch.sets    !== undefined ? { sets:    patch.sets    } : {}),
            ...(patch.reps    !== undefined ? { reps:    patch.reps    } : {}),
            ...(patch.rest    !== undefined ? { rest:    patch.rest    } : {}),
            ...(patch.section !== undefined ? { section: patch.section } : {}),
          };
        });
        if (!matched) console.warn('[applyPatch] update: no exercise match for:', patch.exercise, '| available:', day.exercises.map((e) => e.name));
        break;
      }

      case 'swap': {
        let matched = false;
        day.exercises = day.exercises.map((ex) => {
          if (!nameMatch(ex.name, patch.exercise)) return ex;
          matched = true;
          return { ...ex, name: patch.to };
        });
        if (!matched) console.warn('[applyPatch] swap: no exercise match for:', patch.exercise);
        break;
      }

      case 'add': {
        const newEx: Exercise = {
          name: patch.exercise,
          sets: patch.sets,
          reps: patch.reps,
          ...(patch.rest    ? { rest:    patch.rest    } : {}),
          ...(patch.section ? { section: patch.section } : {}),
        };
        if (patch.after) {
          const afterIdx = day.exercises.findIndex(
            (ex) => nameMatch(ex.name, patch.after as string),
          );
          day.exercises.splice(afterIdx >= 0 ? afterIdx + 1 : day.exercises.length, 0, newEx);
        } else {
          day.exercises.push(newEx);
        }
        break;
      }

      case 'remove':
        day.exercises = day.exercises.filter((ex) => !nameMatch(ex.name, patch.exercise));
        break;
    }
  }

  return { ...routine, days };
}

// ─── Routine builder (first-time trainer) ────────────────────────────────────

const BUILD_SYSTEM = `You are Gymman's AI Personal Trainer — specialized in building personalized weekly workout routines.

You have already walked the user through the fundamentals: muscle group splits, recovery and overtraining (48–72h rest per group), hypertrophy sets/reps (3–4 sets × 8–12 reps), progressive overload, and compound-before-isolation. They understand these basics — don't re-explain them unless they ask.

Your mission: help them build their complete weekly training routine.

━━━ EXISTING ROUTINE ━━━
If the user indicates they already have a routine, ask exactly this (word for word):
"Describe your routine to me: what days of the week you train, which muscle groups you target each day, how many rest days, the specific exercises you do, and the number of sets and reps for each exercise."
Then give honest, direct feedback and propose improvements.

━━━ BUILDING FROM SCRATCH ━━━
If the user does not have a routine, gather info one question at a time:
1. How many days per week can you train?
2. How long is each session?
3. What equipment do you have access to?
4. What's your training experience? (beginner / intermediate / advanced)
5. Any injuries or physical limitations?

Once you have all of that, create the complete weekly plan.

━━━ OUTPUT FORMAT ━━━
Format the finalized routine exactly like this:

**Monday — Chest & Triceps**
- Bench Press: 4 sets × 8-10 reps (rest: 90s)
- Incline Dumbbell Press: 3 sets × 10-12 reps

**Tuesday — Rest**

If a session includes warmup or cooldown blocks, use section markers inside the day:

**Monday — Chest & Triceps**
*Warmup*
- Light Cardio: 1 set × 5 min
*Main Work*
- Bench Press: 4 sets × 8-10 reps
*Cooldown*
- Foam Rolling: 1 set × 5 min

Always include all 7 days. Mark non-training days as "Rest". Use metric units.

━━━ MARKERS ━━━
When presenting the complete final routine (all 7 days, all exercises), include both markers at the very end:
[CHANGE_SUMMARY: one sentence — e.g. "First routine created — 4-day upper/lower split"]
[ROUTINE_READY]

Only use these when the full routine is written out. Never for partial plans or follow-up questions.`;

// ─── Routine coach (modifier, history-aware) ──────────────────────────────────

function formatRoutineForPrompt(routine: Routine): string {
  return (routine.days ?? [])
    .map((d) => {
      if (d.isRest) return `  ${d.day}: Rest`;
      let lastSection: string | undefined;
      const lines: string[] = [];
      (d.exercises ?? []).forEach((e) => {
        if (e.section && e.section !== lastSection) {
          lines.push(`    [${e.section}]`);
          lastSection = e.section;
        }
        lines.push(`    - ${e.name}: ${e.sets} × ${e.reps}${e.rest ? ` (rest ${e.rest})` : ''}`);
      });
      return `  ${d.day} — ${d.focus}:\n${lines.join('\n')}`;
    })
    .join('\n');
}

function formatWorkoutHistoryForPrompt(logs: WorkoutLog[]): string {
  if (logs.length === 0) return '  (no sessions logged yet)';
  return logs
    .slice(-10)
    .reverse()
    .map((log) => {
      const dateLabel = new Date(log.completedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      const exercises = log.exercises
        .map((ex) => {
          const sets = ex.sets
            .map((s) => {
              if (s.result === 'skipped') return '✗';
              if (s.result === 'short') return `${s.repsActual}r`;
              return '✓';
            })
            .join(' ');
          return `    ${ex.name} (${ex.targetSets}×${ex.targetReps}): ${sets}`;
        })
        .join('\n');
      return `  ${dateLabel} — ${log.dayName} — ${log.focus}\n${exercises}`;
    })
    .join('\n\n');
}

// ─── Parser (for full routine output) ────────────────────────────────────────

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function parseRoutineFromText(text: string): RoutineDay[] {
  const result: RoutineDay[] = [];

  for (let i = 0; i < DAYS_ORDER.length; i++) {
    const day = DAYS_ORDER[i];
    const nextDay = DAYS_ORDER[i + 1];

    const headerPattern = new RegExp(`\\*{0,2}${day}\\*{0,2}\\s*[—\\-:]+\\s*([^\\n*]+)`, 'i');
    const headerMatch = text.match(headerPattern);

    if (!headerMatch) {
      result.push({ day, focus: 'Rest', isRest: true, exercises: [] });
      continue;
    }

    const focus = headerMatch[1].trim().replace(/\*+/g, '').trim();
    const isRest = /^rest/i.test(focus) || focus === '';

    if (isRest) {
      result.push({ day, focus: 'Rest', isRest: true, exercises: [] });
      continue;
    }

    const sectionStart = text.indexOf(headerMatch[0]) + headerMatch[0].length;
    const nextPattern = nextDay
      ? new RegExp(`\\*{0,2}${nextDay}\\*{0,2}\\s*[—\\-:]+`, 'i')
      : null;
    const nextIdx = nextPattern ? text.search(nextPattern) : -1;
    const dayText =
      nextIdx > sectionStart ? text.slice(sectionStart, nextIdx) : text.slice(sectionStart);

    const exercises: Exercise[] = [];
    let currentSection: string | undefined;

    for (const line of dayText.split('\n')) {
      const sectionMatch = line.match(/^\s*\*([^*\n]+)\*\s*$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        continue;
      }
      if (!/^[\s\-*•]+\S/.test(line)) continue;

      const clean = line.replace(/^[\s\-*•]+/, '').replace(/\*+/g, '').trim();
      if (!clean) continue;

      const colonIdx = clean.indexOf(':');
      const name = colonIdx > 0 ? clean.slice(0, colonIdx).trim() : clean.split(/\s+\d/)[0].trim();
      const setsReps = clean.match(/(\d+)\s*(?:sets?)?\s*[×x]\s*(\d+(?:[–\-]\d+)?)\s*(?:reps?)?/i);
      const sets = setsReps ? parseInt(setsReps[1], 10) : 3;
      const reps = setsReps ? setsReps[2] : '10';
      const restMatch = clean.match(/rest[:\s]+(\d+\s*(?:s|sec|min|m)\w*)/i);
      const rest = restMatch ? restMatch[1].trim() : undefined;

      if (name && name.length > 0) {
        exercises.push({ name: name || clean, sets, reps, rest, section: currentSection });
      }
    }

    result.push({ day, focus, isRest: false, exercises });
  }

  return result;
}

// ─── Chat functions ───────────────────────────────────────────────────────────

export async function trainerCoachChat(history: ChatMessage[]): Promise<string> {
  return groqChat([{ role: 'system', content: BUILD_SYSTEM }, ...history]);
}

export async function routineCoachChat(
  history: ChatMessage[],
  routines: Routine[],
  workoutLogs: WorkoutLog[] = [],
): Promise<string> {
  const routineSection = routines
    .map((r, i) => `Routine ${i + 1} — "${r.name}":\n${formatRoutineForPrompt(r)}`)
    .join('\n\n');

  const historySection = formatWorkoutHistoryForPrompt(workoutLogs);

  const system = `You are Gymman's Routine Coach — a coach who has been with this user from the beginning. You know their full program and every session they've logged.

━━━ CURRENT ROUTINE ━━━
${routineSection}

━━━ TRAINING HISTORY (recent sessions) ━━━
${historySection}

━━━ YOUR ROLE ━━━
You know everything about exercise science, movement mechanics, muscle anatomy, and training programming. Use the history to give smarter advice — notice if the user is consistently skipping sets, doing short reps, plateauing, or progressing well. Reference specific patterns when relevant.

Be specific and direct. Keep responses short — 1-2 sentences max unless the user asks a detailed question. No padding, no encouragement, no explaining your reasoning unprompted.

━━━ MAKING CHANGES — TWO-STEP RULE ━━━
When the user asks to change anything:
1. CONFIRM: One short line — state exactly what you'll change and ask "Apply?" Example: "Bench Press: 4 → 3 sets on Monday. Apply?"
2. APPLY: Only after they confirm — one short line ("Done, changed Bench Press to 3 sets."), then patch markers, then [PATCH_DONE].

Keep both steps to one sentence each. No explanations, no reasoning, no extra text.
NEVER output patch markers during the confirmation step. Only after explicit approval.

━━━ PATCH FORMAT (for targeted changes) ━━━
Use [PATCH ...] for any change to a specific exercise or day. Multiple patches can be stacked.

Supported operations:

Update sets/reps/rest/section of an exercise:
[PATCH op=update day=Monday exercise="Bench Press" sets=3]
[PATCH op=update day=Monday exercise="Bench Press" reps=10-12]

Swap (rename) an exercise:
[PATCH op=swap day=Monday exercise="Leg Press" to="Romanian Deadlift"]

Add a new exercise (optionally after another):
[PATCH op=add day=Monday exercise="Cable Fly" sets=3 reps=12-15 after="Bench Press"]

Remove an exercise:
[PATCH op=remove day=Monday exercise="Leg Press"]

Always end with:
[CHANGE_SUMMARY: one sentence describing what changed]
[PATCH_DONE]

━━━ FULL ROUTINE OUTPUT (only for complete restructures) ━━━
Only use the full routine format + [ROUTINE_READY] if the user is asking for a completely new split or a wholesale program rebuild — not for individual exercise tweaks. Format:

**Monday — Chest & Triceps**
*Warmup*
- Exercise: sets × reps
*Main Work*
- Exercise: sets × reps

[CHANGE_SUMMARY: ...]
[ROUTINE_READY]`;

  return groqChat([{ role: 'system', content: system }, ...history]);
}
