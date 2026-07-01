/**
 * modules/plan/diet/utils.ts
 *
 * Log-reducer helpers shared by DietScreen and its tabs. The AI coach emits
 * [DIET:] action commands (parsed in services/ai/nutritionCoach.ts); this is
 * where those actions are applied to today's food log.
 */

import type { LogItem, DietAction } from '@/services/ai/nutritionCoach';

export function uid() { return Math.random().toString(36).slice(2, 9); }

export function applyDietActions(log: LogItem[], actions: DietAction[]): LogItem[] {
  let next = [...log];
  for (const action of actions) {
    switch (action.type) {
      case 'add':    next = [...next, { ...action.entry, id: uid() }]; break;
      case 'remove': next = next.filter(e => e.id !== action.id); break;
      case 'update': next = next.map(e => e.id === action.id ? { ...e, ...action.patch } : e); break;
      case 'clear':  next = []; break;
    }
  }
  return next;
}
