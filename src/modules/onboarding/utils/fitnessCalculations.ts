import type { UserPhysicalStats } from './physicalStatsParser';

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

export function computeBodyStats(s: UserPhysicalStats): BodyCompositionStats {
  const heightM = s.heightCm / 100;
  const bmi = Math.round(s.weightKg / (heightM * heightM) * 10) / 10;

  // ── Body fat % ──────────────────────────────────────────────────────────────
  // US Navy method when neck + waist (+ hip for women) are available.
  // Fallback: Deurenberg BMI formula.
  let bfPercent: number;
  let estimationMethod: 'navy' | 'estimated';

  const hasNavy =
    s.neckCm != null && s.waistCm != null &&
    (s.sex === 'male' || s.hipCm != null);

  if (hasNavy) {
    estimationMethod = 'navy';
    if (s.sex === 'male') {
      bfPercent =
        86.010 * Math.log10(s.waistCm! - s.neckCm!) -
        70.041 * Math.log10(s.heightCm) + 36.76;
    } else {
      bfPercent =
        163.205 * Math.log10(s.waistCm! + s.hipCm! - s.neckCm!) -
        97.684 * Math.log10(s.heightCm) - 78.387;
    }
  } else {
    estimationMethod = 'estimated';
    bfPercent = 1.20 * bmi + 0.23 * s.age - (s.sex === 'male' ? 16.2 : 5.4);
  }

  bfPercent = Math.round(clamp(bfPercent, 4, 55) * 10) / 10;

  const lbmKg     = Math.round(s.weightKg * (1 - bfPercent / 100) * 10) / 10;
  const fatMassKg = Math.round((s.weightKg - lbmKg) * 10) / 10;

  // ── BMR (Mifflin-St Jeor) ───────────────────────────────────────────────────
  const bmr = Math.round(
    10 * s.weightKg + 6.25 * s.heightCm - 5 * s.age + (s.sex === 'male' ? 5 : -161)
  );

  // ── TDEE ────────────────────────────────────────────────────────────────────
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extreme: 1.9,
  };
  const tdee = Math.round(bmr * (multipliers[s.activityLevel] ?? 1.55));

  // ── FFMI (Fat-Free Mass Index) ───────────────────────────────────────────────
  const ffmi = Math.round(lbmKg / (heightM * heightM) * 10) / 10;

  const { bfCategory, bfColor } = categorizeBF(bfPercent, s.sex);
  const buildDescription = describeBuild(ffmi, bfPercent, s.sex);

  return {
    bfPercent, lbmKg, fatMassKg, bmi, bmr, tdee, ffmi,
    bfCategory, bfColor, buildDescription, estimationMethod,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function categorizeBF(
  bf: number, sex: string,
): { bfCategory: string; bfColor: 'success' | 'gold' | 'danger' } {
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

function describeBuild(ffmi: number, bf: number, sex: string): string {
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
