export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
export type Sex = 'male' | 'female' | 'nonbinary' | 'unspecified';
export type QuestionKey =
  | 'name' | 'age' | 'sex' | 'weight' | 'height'
  | 'activityLevel' | 'activityDescription' | 'neck' | 'waist' | 'hip';

export interface UserPhysicalStats {
  name: string;
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  neckCm?: number;
  waistCm?: number;
  hipCm?: number;
}

const titleCase = (s: string) =>
  s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

export function extractName(raw: string): string | null {
  const t = raw.trim();
  const prefixed = t.match(
    /(?:my name is|i(?:'?m| am)|call me|it(?:'?s| is))\s+([a-zA-Z][a-zA-Z ]{0,29})/i,
  );
  if (prefixed) {
    return titleCase(prefixed[1].trim().split(/\s+/).slice(0, 2).join(' '));
  }
  if (/^[a-zA-Z]+(?: [a-zA-Z]+)?$/.test(t) && t.length >= 2) return titleCase(t);
  return null;
}

export function extractAge(raw: string): number | null {
  const m = raw.match(/\b(\d{1,3})\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 10 && n <= 100 ? n : null;
}

export function extractWeight(raw: string): { kg: number; display: string } | null {
  const lbs = raw.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i);
  if (lbs) {
    const v = parseFloat(lbs[1]);
    const kg = Math.round(v * 0.453592 * 10) / 10;
    return { kg, display: `${v} lbs (${kg} kg)` };
  }
  const kgm = raw.match(/(\d+(?:\.\d+)?)\s*(?:kgs?|kilos?|kilograms?)?(?:\s|$)/i);
  if (kgm) {
    const v = parseFloat(kgm[1]);
    if (v >= 20 && v <= 350) return { kg: v, display: `${v} kg` };
  }
  return null;
}

export function extractHeight(raw: string): { cm: number; display: string } | null {
  const fi = raw.match(/(\d+)\s*(?:'|ft\.?|feet?)\s*(\d+)?\s*(?:"|in\.?|inches?)?/i);
  if (fi) {
    const ft = parseInt(fi[1], 10);
    const inch = fi[2] ? parseInt(fi[2], 10) : 0;
    if (ft < 3 || ft > 8) return null;
    const cm = Math.round(ft * 30.48 + inch * 2.54);
    return { cm, display: `${ft}'${inch > 0 ? inch + '"' : ''} (${cm} cm)` };
  }
  const mtr = raw.match(/(\d+\.\d+)\s*m(?:eters?)?(?:\s|$)/i);
  if (mtr) {
    const v = parseFloat(mtr[1]);
    if (v >= 1.0 && v <= 2.5) {
      const cm = Math.round(v * 100);
      return { cm, display: `${v}m (${cm} cm)` };
    }
  }
  const cmm = raw.match(/\b(\d{2,3})\s*(?:cm|centimeters?)?(?:\s|$)/i);
  if (cmm) {
    const v = parseInt(cmm[1], 10);
    if (v >= 100 && v <= 250) return { cm: v, display: `${v} cm` };
  }
  return null;
}

function extractCircumference(raw: string, minCm: number, maxCm: number): number | 'skip' | null {
  if (/\b(skip|no|nope|don.?t know|idk|pass|later|n\/?a)\b/i.test(raw)) return 'skip';
  const inch = raw.match(/(\d+(?:\.\d+)?)\s*(?:"|in\.?|inches?)/i);
  if (inch) {
    const cm = Math.round(parseFloat(inch[1]) * 2.54 * 10) / 10;
    if (cm >= minCm && cm <= maxCm) return cm;
  }
  const cm = raw.match(/(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)?(?:\s|$)/i);
  if (cm) {
    const v = parseFloat(cm[1]);
    if (v >= minCm && v <= maxCm) return v;
  }
  return null;
}

export function extractNeck(raw: string) { return extractCircumference(raw, 25, 65); }
export function extractWaist(raw: string) { return extractCircumference(raw, 50, 170); }
export function extractHip(raw: string) { return extractCircumference(raw, 60, 180); }

export function isGibberish(raw: string, q: QuestionKey): boolean {
  const t = raw.trim();
  if (!t) return true;
  if (/^(.)\1{4,}/.test(t)) return true;
  if (/^[^a-zA-Z0-9]+$/.test(t)) return true;
  if (q === 'name') {
    if (t.length < 2 || /^\d+$/.test(t)) return true;
    if (t.length > 6 && !/[aeiou]/i.test(t)) return true;
  }
  if (q === 'age' && !/\d/.test(t)) return true;
  if (['weight', 'height', 'neck', 'waist', 'hip'].includes(q) && !/\d/.test(t)) return true;
  return false;
}

export function estimateActivityLevel(desc: string): ActivityLevel {
  const s = desc.toLowerCase();
  const scores: Record<ActivityLevel, number> = {
    sedentary: 0, light: 0, moderate: 0, active: 0, extreme: 0,
  };
  if (/\b(sit|desk|office|couch|sofa|tv|no exercise|never|rarely|lazy|mostly home)\b/.test(s)) scores.sedentary += 2;
  if (/\b(walk|yoga|stretch|light exercise|once|twice a week)\b/.test(s)) scores.light += 2;
  if (/\b(gym|workout|exercise|jog|run|swim|cycling|3-4 times|few times a week)\b/.test(s)) scores.moderate += 2;
  if (/\b(every day|daily|intense|sports|cricket|football|basketball|physical work|construction|labor|stand)\b/.test(s)) scores.active += 2;
  if (/\b(athlete|competitive|marathon|twice a day|military|army)\b/.test(s)) scores.extreme += 3;
  const max = Math.max(...Object.values(scores));
  if (!max) return 'moderate';
  return Object.entries(scores).find(([, v]) => v === max)![0] as ActivityLevel;
}
