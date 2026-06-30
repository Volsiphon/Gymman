import type { Sex } from './bmr';

export type BFCategory = 'Athletic' | 'Fit' | 'Average' | 'Above average';
export type BFColor = 'success' | 'gold' | 'danger';

export interface BodyFatResult {
  bfPercent: number;
  estimationMethod: 'navy' | 'estimated';
  bfCategory: BFCategory;
  bfColor: BFColor;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function calcBodyFat(params: {
  sex: Sex;
  heightCm: number;
  age: number;
  bmi: number;
  neckCm?: number;
  waistCm?: number;
  hipCm?: number;
}): BodyFatResult {
  const { sex, heightCm, age, bmi, neckCm, waistCm, hipCm } = params;

  const hasNavy = neckCm != null && waistCm != null && (sex === 'male' || hipCm != null);

  let bfPercent: number;
  let estimationMethod: 'navy' | 'estimated';

  if (hasNavy) {
    estimationMethod = 'navy';
    if (sex === 'male') {
      bfPercent =
        86.010 * Math.log10(waistCm! - neckCm!) -
        70.041 * Math.log10(heightCm) + 36.76;
    } else {
      bfPercent =
        163.205 * Math.log10(waistCm! + hipCm! - neckCm!) -
        97.684 * Math.log10(heightCm) - 78.387;
    }
  } else {
    estimationMethod = 'estimated';
    bfPercent = 1.20 * bmi + 0.23 * age - (sex === 'male' ? 16.2 : 5.4);
  }

  bfPercent = Math.round(clamp(bfPercent, 4, 55) * 10) / 10;

  const { bfCategory, bfColor } = categorizeBF(bfPercent, sex);
  return { bfPercent, estimationMethod, bfCategory, bfColor };
}

function categorizeBF(bf: number, sex: Sex): { bfCategory: BFCategory; bfColor: BFColor } {
  if (sex === 'male') {
    if (bf < 14) return { bfCategory: 'Athletic',      bfColor: 'success' };
    if (bf < 18) return { bfCategory: 'Fit',           bfColor: 'success' };
    if (bf < 25) return { bfCategory: 'Average',       bfColor: 'gold'    };
    return         { bfCategory: 'Above average', bfColor: 'danger'  };
  } else {
    if (bf < 21) return { bfCategory: 'Athletic',      bfColor: 'success' };
    if (bf < 25) return { bfCategory: 'Fit',           bfColor: 'success' };
    if (bf < 32) return { bfCategory: 'Average',       bfColor: 'gold'    };
    return         { bfCategory: 'Above average', bfColor: 'danger'  };
  }
}
