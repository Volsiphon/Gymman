/**
 * types/plan.ts
 *
 * Types for everything inside the Plan tab: training routines and workout logs,
 * calory burn activity entries, body weight progress entries, and transformation photos.
 */

// ─── Routine ──────────────────────────────────────────────────────────────────

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest?: string;
  section?: string;
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
  repsActual?: number;
}

export interface ExerciseLog {
  name: string;
  targetSets: number;
  targetReps: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayName: string;
  focus: string;
  exercises: ExerciseLog[];
  completedAt: number;
}

export interface RoutineChangeEvent {
  id: string;
  date: string;
  summary: string;
  routineId: string;
  changedAt: number;
}

// ─── Calory burn ──────────────────────────────────────────────────────────────

export type ActivityEntry = {
  id: string;
  name: string;
  caloriesBurned: number;
};

export type DayActivities = {
  date: string;
  activities: ActivityEntry[];
};

// ─── Body weight progress ─────────────────────────────────────────────────────

export type WeightLog = { date: string; kg: number };

// ─── Transformation photos ────────────────────────────────────────────────────

export type PhotoEntry = {
  id: string;
  uri: string;
  date: string;      // YYYY-MM-DD
  timestamp: number;
  section: string;   // defaults to 'General'
};
