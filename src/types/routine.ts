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
