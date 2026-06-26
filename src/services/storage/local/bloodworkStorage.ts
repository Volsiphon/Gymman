import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gymman_bloodwork_logs';

export type MetricDef = {
  key: string;
  label: string;
  unit: string;
  tier: 1 | 2 | 3;
  category: string;
};

export const METRICS: MetricDef[] = [
  // ── Tier 1 · General Health ───────────────────────────────────────────────
  { key: 'cbc',             label: 'Complete Blood Count (CBC)',    unit: 'report',    tier: 1, category: 'General Health' },
  { key: 'cmp',             label: 'Comprehensive Metabolic Panel', unit: 'report',    tier: 1, category: 'General Health' },
  // ── Tier 1 · Metabolic ────────────────────────────────────────────────────
  { key: 'hba1c',           label: 'HbA1c',                         unit: '%',         tier: 1, category: 'Metabolic' },
  { key: 'fastingGlucose',  label: 'Fasting Glucose',               unit: 'mg/dL',     tier: 1, category: 'Metabolic' },
  { key: 'fastingInsulin',  label: 'Fasting Insulin',               unit: 'µIU/mL',    tier: 1, category: 'Metabolic' },
  // ── Tier 1 · Lipids ───────────────────────────────────────────────────────
  { key: 'totalChol',       label: 'Total Cholesterol',             unit: 'mg/dL',     tier: 1, category: 'Lipids' },
  { key: 'hdl',             label: 'HDL',                           unit: 'mg/dL',     tier: 1, category: 'Lipids' },
  { key: 'ldl',             label: 'LDL',                           unit: 'mg/dL',     tier: 1, category: 'Lipids' },
  { key: 'triglycerides',   label: 'Triglycerides',                 unit: 'mg/dL',     tier: 1, category: 'Lipids' },
  { key: 'apob',            label: 'ApoB',                          unit: 'mg/dL',     tier: 1, category: 'Lipids' },
  { key: 'lpa',             label: 'Lipoprotein(a)',                 unit: 'nmol/L',    tier: 1, category: 'Lipids' },
  // ── Tier 1 · Hormones ────────────────────────────────────────────────────
  { key: 'totalT',          label: 'Total Testosterone',            unit: 'ng/dL',     tier: 1, category: 'Hormones' },
  { key: 'freeT',           label: 'Free Testosterone',             unit: 'pg/mL',     tier: 1, category: 'Hormones' },
  { key: 'shbg',            label: 'SHBG',                          unit: 'nmol/L',    tier: 1, category: 'Hormones' },
  { key: 'lh',              label: 'LH',                            unit: 'mIU/mL',    tier: 1, category: 'Hormones' },
  { key: 'fsh',             label: 'FSH',                           unit: 'mIU/mL',    tier: 1, category: 'Hormones' },
  { key: 'estradiol',       label: 'Estradiol (sensitive assay)',    unit: 'pg/mL',     tier: 1, category: 'Hormones' },
  { key: 'prolactin',       label: 'Prolactin',                     unit: 'ng/mL',     tier: 1, category: 'Hormones' },
  // ── Tier 1 · Thyroid ─────────────────────────────────────────────────────
  { key: 'tsh',             label: 'TSH',                           unit: 'mIU/L',     tier: 1, category: 'Thyroid' },
  { key: 'freeT4',          label: 'Free T4',                       unit: 'ng/dL',     tier: 1, category: 'Thyroid' },
  { key: 'freeT3',          label: 'Free T3',                       unit: 'pg/mL',     tier: 1, category: 'Thyroid' },
  // ── Tier 1 · Micronutrients ───────────────────────────────────────────────
  { key: 'vitD',            label: 'Vitamin D (25-OH)',             unit: 'ng/mL',     tier: 1, category: 'Micronutrients' },
  { key: 'vitB12',          label: 'Vitamin B12',                   unit: 'pg/mL',     tier: 1, category: 'Micronutrients' },
  { key: 'folate',          label: 'Folate',                        unit: 'ng/mL',     tier: 1, category: 'Micronutrients' },
  { key: 'ferritin',        label: 'Ferritin',                      unit: 'ng/mL',     tier: 1, category: 'Micronutrients' },
  { key: 'iron',            label: 'Iron',                          unit: 'µg/dL',     tier: 1, category: 'Micronutrients' },
  { key: 'tibc',            label: 'TIBC',                          unit: 'µg/dL',     tier: 1, category: 'Micronutrients' },
  { key: 'transferrinSat',  label: 'Transferrin Saturation',        unit: '%',         tier: 1, category: 'Micronutrients' },
  { key: 'magnesium',       label: 'Magnesium (RBC)',               unit: 'mg/dL',     tier: 1, category: 'Micronutrients' },
  { key: 'zinc',            label: 'Zinc',                          unit: 'µg/dL',     tier: 1, category: 'Micronutrients' },
  // ── Tier 1 · Inflammation ────────────────────────────────────────────────
  { key: 'hsCrp',           label: 'hs-CRP',                        unit: 'mg/L',      tier: 1, category: 'Inflammation' },
  // ── Tier 2 · Performance ─────────────────────────────────────────────────
  { key: 'igf1',            label: 'IGF-1',                         unit: 'ng/mL',     tier: 2, category: 'Performance' },
  { key: 'dheas',           label: 'DHEA-S',                        unit: 'µg/dL',     tier: 2, category: 'Performance' },
  { key: 'cortisol',        label: 'Morning Cortisol',              unit: 'µg/dL',     tier: 2, category: 'Performance' },
  { key: 'ck',              label: 'Creatine Kinase (CK)',          unit: 'U/L',       tier: 2, category: 'Performance' },
  { key: 'cystatinC',       label: 'Cystatin C',                    unit: 'mg/L',      tier: 2, category: 'Performance' },
  { key: 'ggt',             label: 'GGT',                           unit: 'U/L',       tier: 2, category: 'Performance' },
  { key: 'homocysteine',    label: 'Homocysteine',                  unit: 'µmol/L',    tier: 2, category: 'Performance' },
  { key: 'omega3',          label: 'Omega-3 Index',                 unit: '%',         tier: 2, category: 'Performance' },
  // ── Tier 3 · Advanced ────────────────────────────────────────────────────
  { key: 'reverseT3',       label: 'Reverse T3',                    unit: 'ng/dL',     tier: 3, category: 'Advanced' },
  { key: 'tpoAb',           label: 'TPO Antibodies',                unit: 'IU/mL',     tier: 3, category: 'Advanced' },
  { key: 'thyroglobulinAb', label: 'Thyroglobulin Antibodies',      unit: 'IU/mL',     tier: 3, category: 'Advanced' },
  { key: 'ceruloplasmin',   label: 'Ceruloplasmin',                 unit: 'mg/dL',     tier: 3, category: 'Advanced' },
  { key: 'copper',          label: 'Copper',                        unit: 'µg/dL',     tier: 3, category: 'Advanced' },
  { key: 'selenium',        label: 'Selenium',                      unit: 'µg/L',      tier: 3, category: 'Advanced' },
  { key: 'acth',            label: 'ACTH',                          unit: 'pg/mL',     tier: 3, category: 'Advanced' },
  { key: 'cPeptide',        label: 'C-Peptide',                     unit: 'ng/mL',     tier: 3, category: 'Advanced' },
  { key: 'ana',             label: 'ANA',                           unit: 'titer',     tier: 3, category: 'Advanced' },
];

export type BloodworkLog = {
  id: string;
  date: string;
  metrics: Record<string, string>;
  notes: string;
};

export async function saveBloodworkLog(log: BloodworkLog): Promise<void> {
  const all = await loadBloodworkLogs();
  const updated = [log, ...all.filter(l => l.id !== log.id)];
  updated.sort((a, b) => b.date.localeCompare(a.date));
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function loadBloodworkLogs(): Promise<BloodworkLog[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as BloodworkLog[]; } catch { return []; }
}

export async function deleteBloodworkLog(id: string): Promise<void> {
  const all = await loadBloodworkLogs();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(l => l.id !== id)));
}

export function bloodworkContextString(logs: BloodworkLog[]): string {
  if (logs.length === 0) return '';
  const lines = logs.slice(0, 6).map(log => {
    const filled = Object.entries(log.metrics)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => {
        const def = METRICS.find(m => m.key === k);
        return def ? `${def.label}: ${v} ${def.unit}` : null;
      })
      .filter(Boolean)
      .join(', ');
    const notePart = log.notes ? ` | Notes: ${log.notes}` : '';
    return `[${log.date}] ${filled}${notePart}`;
  });
  return `\n\nUser's bloodwork history (newest first):\n${lines.join('\n')}`;
}
