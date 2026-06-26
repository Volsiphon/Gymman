import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadWorkoutLogs } from '@/services/storage/local/workoutStorage';
import { loadRoutineChanges } from '@/services/storage/local/historyStorage';
import type { WorkoutLog, RoutineChangeEvent, SetResult } from '@/types/workoutLog';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type HistoryItem =
  | { type: 'workout'; data: WorkoutLog; timestamp: number }
  | { type: 'change'; data: RoutineChangeEvent; timestamp: number };

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Mini set row (read-only, mirrors Today tab) ──────────────────────────────

function MiniSetRow({ num, result, repsActual }: {
  num: number;
  result: SetResult;
  repsActual?: number;
}) {
  const isDone = result === 'done';
  const isShort = result === 'short';
  const isSkipped = result === 'skipped';

  return (
    <View style={[mr.row, isDone && mr.rowDone, isShort && mr.rowShort, isSkipped && mr.rowSkipped]}>
      <View style={mr.icon}>
        {isDone && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
        {isShort && <Ionicons name="flash" size={16} color="#EAB308" />}
        {isSkipped && <Ionicons name="close-circle" size={16} color={colors.danger} />}
      </View>
      <Text style={[mr.setLabel, isSkipped && mr.textMuted]}>SET {num}</Text>
      <Text style={[mr.result, isDone && mr.resultDone, isShort && mr.resultShort, isSkipped && mr.resultSkipped]}>
        {isDone ? 'Done' : isShort ? `${repsActual} reps` : 'Skipped'}
      </Text>
    </View>
  );
}

// ─── Workout history card ─────────────────────────────────────────────────────

function WorkoutCard({ log }: { log: WorkoutLog }) {
  const [expanded, setExpanded] = useState(false);

  const totalSets = log.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const doneSets = log.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.result !== 'skipped').length,
    0,
  );
  const allDone = doneSets === totalSets;

  return (
    <View style={wc.card}>
      {/* Collapsed header */}
      <TouchableOpacity
        style={wc.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={wc.headerLeft}>
          <Text style={wc.date}>{formatDate(log.completedAt)}</Text>
          <Text style={wc.focus}>{log.focus}</Text>
          <View style={wc.statRow}>
            <View style={[wc.statBadge, !allDone && wc.statBadgeLow]}>
              <Text style={[wc.statText, !allDone && wc.statTextLow]}>
                {doneSets}/{totalSets} sets
              </Text>
            </View>
            <Text style={wc.metaDot}>·</Text>
            <Text style={wc.meta}>{log.exercises.length} exercises</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.text.muted}
        />
      </TouchableOpacity>

      {/* Expanded exercise breakdown */}
      {expanded && (
        <View style={wc.body}>
          <View style={wc.divider} />
          {log.exercises.map((ex, i) => {
            const exDone = ex.sets.filter((s) => s.result !== 'skipped').length;
            const exAllDone = exDone === ex.sets.length;
            return (
              <View key={i} style={wc.exCard}>
                {/* Exercise header */}
                <View style={wc.exTop}>
                  <Text style={wc.exName} numberOfLines={1}>{ex.name}</Text>
                  <Text style={[wc.exBadge, !exAllDone && wc.exBadgeLow]}>
                    {exDone}/{ex.sets.length}
                  </Text>
                </View>
                <Text style={wc.exTarget}>{ex.targetSets} sets · {ex.targetReps} reps</Text>
                {/* Mini set rows */}
                <View style={wc.setList}>
                  {ex.sets.map((set, j) => (
                    <MiniSetRow
                      key={j}
                      num={j + 1}
                      result={set.result}
                      repsActual={set.repsActual}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Golden routine change card ───────────────────────────────────────────────

function ChangeCard({ event }: { event: RoutineChangeEvent }) {
  return (
    <View style={cc.card}>
      <View style={cc.iconWrap}>
        <Ionicons name="sparkles" size={14} color={colors.gold} />
      </View>
      <View style={cc.content}>
        <Text style={cc.summary}>{event.summary}</Text>
        <Text style={cc.date}>{formatShortDate(event.changedAt)}</Text>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HistoryView() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    Promise.all([loadWorkoutLogs(), loadRoutineChanges()]).then(([logs, changes]) => {
      const workoutItems: HistoryItem[] = logs.map((log) => ({
        type: 'workout',
        data: log,
        timestamp: log.completedAt,
      }));
      const changeItems: HistoryItem[] = changes.map((c) => ({
        type: 'change',
        data: c,
        timestamp: c.changedAt,
      }));
      const merged = [...workoutItems, ...changeItems].sort((a, b) => b.timestamp - a.timestamp);
      setItems(merged);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="time-outline" size={36} color={colors.text.muted} />
        <Text style={s.emptyTitle}>Nothing logged yet</Text>
        <Text style={s.emptyDesc}>
          Your training sessions and routine changes will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      {items.map((item) =>
        item.type === 'workout' ? (
          <WorkoutCard key={item.data.id} log={item.data as WorkoutLog} />
        ) : (
          <ChangeCard key={item.data.id} event={item.data as RoutineChangeEvent} />
        ),
      )}
    </ScrollView>
  );
}

// ─── Mini set row styles ──────────────────────────────────────────────────────

const mr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  rowDone: {
    backgroundColor: colors.success + '14',
    borderColor: colors.success + '44',
  },
  rowShort: {
    backgroundColor: '#EAB30814',
    borderColor: '#EAB30844',
  },
  rowSkipped: {
    backgroundColor: colors.bg.app,
    borderColor: colors.border.subtle,
    opacity: 0.45,
  },
  icon: { width: 18, alignItems: 'center' },
  setLabel: {
    fontFamily: typography.fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.text.secondary,
    width: 38,
  },
  textMuted: { color: colors.text.muted },
  result: {
    flex: 1,
    ...typography.caption,
    textAlign: 'right',
  },
  resultDone: { color: colors.success },
  resultShort: { color: '#EAB308', fontWeight: '600' },
  resultSkipped: { color: colors.text.muted },
});

// ─── Workout card styles ──────────────────────────────────────────────────────

const wc = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: { flex: 1, gap: 4 },
  date: { ...typography.callout, color: colors.text.primary, fontWeight: '600' },
  focus: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statBadge: {
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statBadgeLow: { backgroundColor: colors.danger + '18' },
  statText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  statTextLow: { color: colors.danger },
  metaDot: { ...typography.caption, color: colors.text.muted },
  meta: { ...typography.caption, color: colors.text.muted },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  body: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },

  exCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
  },
  exTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  exName: { ...typography.callout, color: colors.text.primary, fontWeight: '600', flex: 1 },
  exBadge: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  exBadgeLow: { color: colors.danger, backgroundColor: colors.danger + '18' },
  exTarget: { ...typography.caption, color: colors.text.muted, marginBottom: spacing.xs },
  setList: { gap: 0 },
});

// ─── Change card styles ───────────────────────────────────────────────────────

const cc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold + '55',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.gold + '88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  summary: { ...typography.callout, color: colors.gold, fontWeight: '500' },
  date: { ...typography.caption, color: colors.gold + 'AA' },
});

// ─── Screen-level styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.title3, color: colors.text.primary, textAlign: 'center' },
  emptyDesc: { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
});
