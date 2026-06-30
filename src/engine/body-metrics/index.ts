export type { Sex } from './bmr';
export { calcBMR } from './bmr';
export type { ActivityLevel } from './tdee';
export { ACTIVITY_MULTIPLIERS, calcTDEE } from './tdee';
export { calcBMI } from './bmi';
export type { BFCategory, BFColor, BodyFatResult } from './body-fat';
export { calcBodyFat } from './body-fat';
export type { LeanMassResult } from './lean-mass';
export { calcLeanMass, calcFFMI, describeBuild } from './lean-mass';

import { calcBMR, type Sex } from './bmr';
import { calcTDEE, type ActivityLevel } from './tdee';
import { calcBMI } from './bmi';
import { calcBodyFat } from './body-fat';
import { calcLeanMass, calcFFMI, describeBuild } from './lean-mass';

export interface BodyMetricsInput {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  neckCm?: number;
  waistCm?: number;
  hipCm?: number;
  activityLevel: ActivityLevel;
}

export interface BodyCompositionStats {
  bfPercent: number;
  lbmKg: number;
  fatMassKg: number;
  bmi: number;
  bmr: number;
  tdee: number;
  ffmi: number;
  bfCategory: string;
  bfColor: 'success' | 'gold' | 'danger';
  buildDescription: string;
  estimationMethod: 'navy' | 'estimated';
}

export function computeBodyStats(s: BodyMetricsInput): BodyCompositionStats {
  const bmi = calcBMI(s.weightKg, s.heightCm);
  const bmr = calcBMR(s.weightKg, s.heightCm, s.age, s.sex);
  const tdee = calcTDEE(bmr, s.activityLevel);
  const { bfPercent, estimationMethod, bfCategory, bfColor } = calcBodyFat({
    sex: s.sex,
    heightCm: s.heightCm,
    age: s.age,
    bmi,
    neckCm: s.neckCm,
    waistCm: s.waistCm,
    hipCm: s.hipCm,
  });
  const { lbmKg, fatMassKg } = calcLeanMass(s.weightKg, bfPercent);
  const ffmi = calcFFMI(lbmKg, s.heightCm);
  const buildDescription = describeBuild(ffmi, bfPercent, s.sex);

  return { bfPercent, lbmKg, fatMassKg, bmi, bmr, tdee, ffmi, bfCategory, bfColor, buildDescription, estimationMethod };
}
