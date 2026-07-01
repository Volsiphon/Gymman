/**
 * modules/progress/utils.ts
 *
 * Date helpers shared by ProgressScreen (log list) and WeightChart (axis
 * labels). fmtDate renders "Today" / "Yesterday" / "12 Jun".
 */

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtDate(iso: string): string {
  if (iso === todayIso()) return 'Today';
  if (iso === yesterdayIso()) return 'Yesterday';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}
