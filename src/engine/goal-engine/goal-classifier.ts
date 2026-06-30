// BodyGoalType covers all possible goal outcomes from a user's free-text description.
export type BodyGoalType =
  | 'fat-loss'
  | 'muscle-gain'
  | 'recomp'
  | 'non-body-comp-minor'   // e.g. posture
  | 'non-body-comp-major';  // e.g. injury rehab

const MAJOR_KEYWORDS = [
  'injury', 'injuri', 'surgery', 'sciatica', 'arthritis',
  'herniat', 'disc', 'fracture', 'ligament', 'chronic pain', 'chronic', 'rehab',
];
const POSTURE_KEYWORDS = [
  'posture', 'slouch', 'hunch', 'rounded shoulder', 'forward head',
];
const BODY_COMP_KEYWORDS = [
  'lose', 'gain', 'fat', 'muscle', 'weight', 'bulk', 'cut', 'lean', 'slim',
];
const GAIN_KEYWORDS = [
  'gain', 'build', 'muscle', 'bulk', 'mass', 'bigger', 'stronger', 'strength', 'grow',
];
const LOSS_KEYWORDS = [
  'lose', 'loss', 'cut', 'lean', 'slim', 'shred', 'fat', 'weight', 'thinner', 'reduce', 'drop',
];

export function classifyGoal(goalText: string, bfPercent: number, sex: string): BodyGoalType {
  const lower = goalText.toLowerCase();

  if (MAJOR_KEYWORDS.some(k => lower.includes(k))) return 'non-body-comp-major';
  if (
    POSTURE_KEYWORDS.some(k => lower.includes(k)) &&
    !BODY_COMP_KEYWORDS.some(k => lower.includes(k))
  ) {
    return 'non-body-comp-minor';
  }

  const gainScore = GAIN_KEYWORDS.filter(k => lower.includes(k)).length;
  const lossScore = LOSS_KEYWORDS.filter(k => lower.includes(k)).length;

  if (gainScore > lossScore) return 'muscle-gain';
  if (lossScore > gainScore) return 'fat-loss';

  // Tie-break on body composition: high BF → lean out first
  const likelyHighBF = sex === 'female' ? bfPercent > 28 : bfPercent > 20;
  return likelyHighBF ? 'fat-loss' : 'recomp';
}
