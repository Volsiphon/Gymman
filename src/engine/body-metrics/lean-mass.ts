import type { Sex } from './bmr';

export interface LeanMassResult {
  lbmKg: number;
  fatMassKg: number;
}

export function calcLeanMass(weightKg: number, bfPercent: number): LeanMassResult {
  const lbmKg     = Math.round(weightKg * (1 - bfPercent / 100) * 10) / 10;
  const fatMassKg = Math.round((weightKg - lbmKg) * 10) / 10;
  return { lbmKg, fatMassKg };
}

export function calcFFMI(lbmKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((lbmKg / (heightM * heightM)) * 10) / 10;
}

export function describeBuild(ffmi: number, bf: number, sex: Sex): string {
  if (sex === 'male') {
    if (ffmi >= 20 && bf < 18) return 'Muscular and lean';
    if (ffmi >= 18 && bf < 25) return 'Athletic build';
    if (bf < 15)               return 'Lean build';
    if (bf < 22)               return 'Average build';
    return                            'Softer / fuller build';
  } else {
    if (ffmi >= 16 && bf < 25) return 'Athletic build';
    if (bf < 22)               return 'Lean build';
    if (bf < 30)               return 'Average build';
    return                            'Softer / fuller build';
  }
}
