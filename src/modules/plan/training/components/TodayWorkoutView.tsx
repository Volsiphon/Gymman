import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadRoutines } from '@/services/storage/local/planStorage';
import { getLogForDate, saveWorkoutLog } from '@/services/storage/local/workoutStorage';
import type { RoutineDay, WorkoutLog, ExerciseLog, SetLog, SetResult } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Local state types ────────────────────────────────────────────────────────

type SetState = 'pending' | 'done' | 'skipped';
type SetEntry = { state: SetState; repsNote: string };
type ExerciseEntry = { name: string; targetReps: string; targetSets: number; sets: SetEntry[] };

function initEntries(day: RoutineDay): ExerciseEntry[] {
  return (day.exercises ?? []).map((ex) => ({
    name: ex.name,
    targetReps: ex.reps,
    targetSets: ex.sets,
    sets: Array.from({ length: ex.sets }, () => ({ state: 'pending' as SetState, repsNote: '' })),
  }));
}

function cycleState(s: SetState): SetState {
  if (s === 'pending') return 'done';
  if (s === 'done') return 'skipped';
  return 'pending';
}

function toSetLog(entry: SetEntry): SetLog {
  if (entry.state === 'skipped' || entry.state === 'pending') {
    return { result: 'skipped' };
  }
  const n = parseInt(entry.repsNote);
  if (entry.repsNote.trim() && !isNaN(n)) {
    return { result: 'short', repsActual: n };
  }
  return { result: 'done' };
}

// ─── Set row ──────────────────────────────────────────────────────────────────

function SetRow({
  num,
  entry,
  targetReps,
  onTap,
  onRepsChange,
}: {
  num: number;
  entry: SetEntry;
  targetReps: string;
  onTap: () => void;
  onRepsChange: (v: string) => void;
}) {
  const { state, repsNote } = entry;
  const isDone = state === 'done';
  const isSkipped = state === 'skipped';

  return (
    <View style={[sr.row, isDone && sr.rowDone, isSkipped && sr.rowSkipped]}>
      <TouchableOpacity style={sr.tapLeft} onPress={onTap} activeOpacity={0.7}>
        <View style={sr.iconWrap}>
          {isDone && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
          {isSkipped && <Ionicons name="close-circle" size={22} color={colors.danger} />}
          {!isDone && !isSkipped && <View style={sr.pendingCircle} />}
        </View>
        <Text style={[sr.setLabel, isSkipped && sr.textMuted]}>SET {num}</Text>
      </TouchableOpacity>

      <View style={sr.right}>
        {isDone ? (
          <TextInput
            style={sr.repsInput}
            value={repsNote}
            onChangeText={onRepsChange}
            placeholder={`${targetReps} reps`}
            placeholderTextColor={colors.text.disabled}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        ) : (
          <Text style={[sr.repsTarget, isSkipped && sr.textMuted]}>
            {isSkipped ? '— skipped' : `${targetReps} reps`}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Completed session (read-only) ───────────────────────────────────────────

function resultLabel(set: SetLog): string {
  if (set.result === 'skipped') return '✗ Skip';
  if (set.result === 'short') return `⚡ ${set.repsActual}r`;
  return '✓ Done';
}

function resultChipStyle(result: SetResult) {
  if (result === 'skipped') return [chip.base, chip.skipped];
  if (result === 'short') return [chip.base, chip.short];
  return [chip.base, chip.done];
}

function resultTextStyle(result: SetResult) {
  if (result === 'skipped') return [chip.text, chip.textSkipped];
  if (result === 'short') return [chip.text, chip.textShort];
  return [chip.text, chip.textDone];
}

function CompletedSession({ log }: { log: WorkoutLog }) {
  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.completedBadge}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={s.completedBadgeText}>Session logged</Text>
      </View>

      <Text style={s.dayTitle}>{log.dayName}</Text>
      <Text style={s.focusLabel}>{log.focus}</Text>

      {log.exercises.map((ex, i) => {
        const done = ex.sets.filter((s) => s.result !== 'skipped').length;
        const total = ex.sets.length;
        return (
          <View key={i} style={s.exCard}>
            <View style={s.exCardTop}>
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={[s.completionBadge, done < total && s.completionBadgeLow]}>
                {done}/{total}
              </Text>
            </View>
            <Text style={s.exTarget}>{ex.targetSets} sets · {ex.targetReps} reps</Text>
            <View style={s.chipRow}>
              {ex.sets.map((set, j) => (
                <View key={j} style={resultChipStyle(set.result)}>
                  <Text style={resultTextStyle(set.result)}>{resultLabel(set)}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Active logging session ───────────────────────────────────────────────────

function ActiveSession({ day, onComplete }: { day: RoutineDay; onComplete: () => void }) {
  const [entries, setEntries] = useState<ExerciseEntry[]>(() => initEntries(day));
  const [saving, setSaving] = useState(false);

  function toggleSet(exIdx: number, setIdx: number) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i !== exIdx ? e : {
          ...e,
          sets: e.sets.map((s, j) =>
            j !== setIdx ? s : { ...s, state: cycleState(s.state) },
          ),
        },
      ),
    );
  }

  function updateReps(exIdx: number, setIdx: number, v: string) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i !== exIdx ? e : {
          ...e,
          sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, repsNote: v }),
        },
      ),
    );
  }

  const canLog = entries.some((e) => e.sets.some((s) => s.state !== 'pending'));

  async function handleLog() {
    if (!canLog || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      const exercises: ExerciseLog[] = entries.map((e) => ({
        name: e.name,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        sets: e.sets.map(toSetLog),
      }));
      const log: WorkoutLog = {
        id: `log-${now}`,
        date: todayString(),
        dayName: day.day,
        focus: day.focus,
        exercises,
        completedAt: now,
      };
      await saveWorkoutLog(log);
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.dayTitle}>{day.day}</Text>
        <Text style={s.focusLabel}>{day.focus}</Text>
        <Text style={s.hint}>Tap a set to mark it done. Tap again to skip.</Text>

        {entries.map((ex, exIdx) => (
          <View key={exIdx} style={s.exCard}>
            <Text style={s.exName}>{ex.name}</Text>
            <Text style={s.exTarget}>{ex.targetSets} sets · {ex.targetReps} reps</Text>
            <View style={s.setList}>
              {ex.sets.map((set, setIdx) => (
                <SetRow
                  key={setIdx}
                  num={setIdx + 1}
                  entry={set}
                  targetReps={ex.targetReps}
                  onTap={() => toggleSet(exIdx, setIdx)}
                  onRepsChange={(v) => updateReps(exIdx, setIdx, v)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.logBtn, !canLog && s.logBtnDisabled]}
          onPress={handleLog}
          disabled={!canLog || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.text.inverse} />
            : <Text style={[s.logBtnText, !canLog && s.logBtnTextDisabled]}>Log Session</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TodayWorkoutView() {
  const todayName = DAY_NAMES[new Date().getDay()];
  const dateStr = todayString();

  const [loading, setLoading] = useState(true);
  const [routineDay, setRoutineDay] = useState<RoutineDay | null>(null);
  const [existingLog, setExistingLog] = useState<WorkoutLog | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [noRoutine, setNoRoutine] = useState(false);

  async function load() {
    const [routines, log] = await Promise.all([loadRoutines(), getLogForDate(dateStr)]);
    if (routines.length === 0) {
      setNoRoutine(true);
    } else {
      const current = routines[routines.length - 1];
      setRoutineDay((current.days ?? []).find((d) => d.day === todayName) ?? null);
      setExistingLog(log);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (noRoutine) {
    return (
      <View style={s.center}>
        <Ionicons name="barbell-outline" size={36} color={colors.text.muted} />
        <Text style={s.emptyTitle}>No routine yet</Text>
        <Text style={s.emptyDesc}>Build your routine in the Trainer tab first.</Text>
      </View>
    );
  }

  if (!routineDay || routineDay.isRest) {
    return (
      <View style={s.center}>
        <Ionicons name="moon-outline" size={36} color={colors.text.muted} />
        <Text style={s.emptyTitle}>Rest day</Text>
        <Text style={s.emptyDesc}>Recovery is part of the program.</Text>
      </View>
    );
  }

  if (sessionDone) {
    load();
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (existingLog) return <CompletedSession log={existingLog} />;

  return <ActiveSession day={routineDay} onComplete={() => setSessionDone(true)} />;
}

// ─── Set row styles ───────────────────────────────────────────────────────────

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
    marginBottom: 6,
    overflow: 'hidden',
  },
  rowDone: {
    backgroundColor: colors.success + '14',
    borderColor: colors.success + '55',
  },
  rowSkipped: {
    backgroundColor: colors.bg.app,
    borderColor: colors.border.subtle,
    opacity: 0.5,
  },
  tapLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flex: 0,
  },
  iconWrap: { width: 24, alignItems: 'center' },
  pendingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  setLabel: {
    fontFamily: typography.fonts.display,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.text.secondary,
  },
  textMuted: { color: colors.text.muted },
  right: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: spacing.md,
  },
  repsTarget: {
    ...typography.callout,
    color: colors.text.muted,
  },
  repsInput: {
    height: 34,
    minWidth: 110,
    backgroundColor: colors.bg.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.success + '44',
    textAlign: 'center',
    ...typography.callout,
    color: colors.text.primary,
  },
});

// ─── Set result chip styles ───────────────────────────────────────────────────

const chip = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  done: { backgroundColor: colors.success + '18', borderColor: colors.success + '55' },
  short: { backgroundColor: '#EAB30818', borderColor: '#EAB30855' },
  skipped: { backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle },
  text: { fontSize: 12, fontWeight: '600' },
  textDone: { color: colors.success },
  textShort: { color: '#EAB308' },
  textSkipped: { color: colors.text.muted },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: spacing.md,
  },
  emptyTitle: { ...typography.title3, color: colors.text.primary, textAlign: 'center' },
  emptyDesc: { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },

  scroll: { padding: spacing.md, paddingBottom: spacing.xl },

  completedBadge: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.xs, marginBottom: spacing.sm,
  },
  completedBadgeText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  dayTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 22, color: colors.text.primary, letterSpacing: 0.3,
  },
  focusLabel: {
    ...typography.callout, color: colors.text.secondary,
    marginTop: 2, marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption, color: colors.text.muted,
    marginBottom: spacing.md,
  },

  exCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exName: { ...typography.callout, color: colors.text.primary, fontWeight: '600', flex: 1 },
  exTarget: { ...typography.caption, color: colors.text.muted, marginTop: 2, marginBottom: spacing.sm },
  completionBadge: {
    ...typography.caption, fontWeight: '700',
    color: colors.success,
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  completionBadgeLow: { color: colors.danger, backgroundColor: colors.danger + '18' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  setList: { marginTop: spacing.xs },

  footer: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  logBtn: {
    height: 52, borderRadius: radius.button,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  logBtnDisabled: { backgroundColor: colors.bg.elevated },
  logBtnText: {
    fontFamily: typography.fonts.display,
    fontSize: 16, letterSpacing: 0.5, color: colors.text.inverse,
  },
  logBtnTextDisabled: { color: colors.text.disabled },
});
