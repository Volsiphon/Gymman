// ─── Routine ──────────────────────────────────────────────────────────────────

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest?: string;
  section?: string; // e.g. 'Warmup', 'Main Work', 'Cooldown'
}

export interface RoutineDay {
  day: string;
  focus: string;
  isRest: boolean;
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  name: string;
  days: RoutineDay[];
  rawText: string;
  createdAt: number;
}

// ─── Workout log ──────────────────────────────────────────────────────────────

export type SetResult = 'done' | 'short' | 'skipped';

export interface SetLog {
  result: SetResult;
  repsActual?: number; // only populated for 'short'
}

export interface ExerciseLog {
  name: string;
  targetSets: number;
  targetReps: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  date: string;         // "2026-06-25"
  dayName: string;      // "Wednesday"
  focus: string;        // "Back & Biceps"
  exercises: ExerciseLog[];
  completedAt: number;
}

export interface RoutineChangeEvent {
  id: string;
  date: string;         // "2026-06-25"
  summary: string;      // "First routine created — 4-day PPL split"
  routineId: string;
  changedAt: number;
}
