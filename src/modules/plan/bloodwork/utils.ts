/**
 * modules/plan/bloodwork/utils.ts
 *
 * Helpers shared by BloodworkScreen and its modals. TIER_GROUPS arranges the
 * METRICS catalogue (from bloodworkStorage) into the three-tier display order
 * used by both the entry form and the detail view.
 */

import { METRICS } from '@/services/storage/local/bloodworkStorage';
import { colors } from '@/theme/colors';

export const TIER_DEFS = [
  {
    tier:     1 as const,
    label:    'Tier 1 — Essential',
    sub:      'Recommended for everyone serious about training',
    color:    colors.danger,
  },
  {
    tier:     2 as const,
    label:    'Tier 2 — Performance',
    sub:      'Recovery and optimization markers',
    color:    colors.gold,
  },
  {
    tier:     3 as const,
    label:    'Tier 3 — Advanced',
    sub:      'Only if indicated by symptoms, family history, or physician',
    color:    colors.info,
  },
] as const;

// Pre-compute category groups per tier once at module load
export const TIER_GROUPS = TIER_DEFS.map(td => ({
  ...td,
  categories: [...new Set(METRICS.filter(m => m.tier === td.tier).map(m => m.category))].map(cat => ({
    category: cat,
    metrics:  METRICS.filter(m => m.tier === td.tier && m.category === cat),
  })),
}));

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function filledCount(metrics: Record<string, string>): number {
  return Object.values(metrics).filter(v => v.trim()).length;
}
