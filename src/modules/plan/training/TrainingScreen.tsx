/**
 * modules/plan/training/TrainingScreen.tsx
 *
 * The Training Plan sub-screen — the orchestrator for the full workout feature.
 * Renders three tab views (controlled by CollapsibleTabBar): TrainerIntroView
 * (where the AI builds the routine via chat), TodayWorkoutView (where the user
 * logs today's sets and reps), and HistoryView (where they see the routine
 * changelog). Loads the current routine from planStorage.ts on focus and passes
 * it down as props to each sub-view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import { TrainerIntroView } from './components/TrainerIntroView';
import { TodayWorkoutView } from './components/TodayWorkoutView';
import { HistoryView } from './components/HistoryView';
import { CollapsibleTabBar } from '@/shared/components/CollapsibleTabBar';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { loadRoutines, deleteRoutine } from '@/services/storage/local/planStorage';
import { loadWeights, saveWeight, weightKey } from '@/services/storage/local/exerciseWeightStorage';
import type { Routine, RoutineDay } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Training'>;
};

const ACCENT = colors.primary;
const REST_BLUE = '#3B82F6';

const TABS = [
  { id: 'trainer',  icon: 'fitness-outline',  label: 'Trainer'  },
  { id: 'routine',  icon: 'list-outline',      label: 'Routine'  },
  { id: 'today',    icon: 'pencil-outline',    label: 'Today'    },
  { id: 'history',  icon: 'time-outline',      label: 'History'  },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Day card ─────────────────────────────────────────────────────────────────

type DayCardProps = {
  day: RoutineDay;
  routineId: string;
  weights: Record<string, string>;
  onWeightChange: (key: string, value: string) => void;
  onWeightBlur: (key: string, value: string) => void;
};

function DayCard({ day, routineId, weights, onWeightChange, onWeightBlur }: DayCardProps) {
  if (day.isRest) {
    return (
      <View style={dc.card}>
        <View style={dc.restHeader}>
          <Text style={dc.restDayName}>{day.day}</Text>
        </View>
        <View style={dc.badgeWrap}>
          <View style={dc.restBadge}>
            <Ionicons name="moon-outline" size={12} color={REST_BLUE} />
            <Text style={dc.restLabel}>Rest Day</Text>
          </View>
        </View>
      </View>
    );
  }

  const exercises = day.exercises ?? [];

  return (
    <View style={dc.card}>
      {/* Lime header */}
      <View style={dc.limeHeader}>
        <Text style={dc.dayName}>{day.day}</Text>
      </View>
      {/* Focus badge overlapping the header bottom edge */}
      <View style={dc.badgeWrap}>
        <View style={dc.focusBadge}>
          <Text style={dc.focusText}>{day.focus}</Text>
        </View>
      </View>
      {/* Exercises */}
      {exercises.length > 0 && (
        <View style={dc.exList}>
          {(() => {
            let lastSection: string | undefined;
            return exercises.map((ex, i) => {
              const showSection = ex.section !== undefined && ex.section !== lastSection;
              lastSection = ex.section;
              const wKey = weightKey(routineId, ex.name);
              const isLast = i === exercises.length - 1;
              const nextEx = exercises[i + 1];
              const nextChangesSection = nextEx && nextEx.section !== ex.section;
              return (
                <React.Fragment key={i}>
                  {showSection && (
                    <View style={dc.sectionHeader}>
                      <Text style={dc.sectionLabel}>{ex.section}</Text>
                    </View>
                  )}
                  <View style={[dc.exRow, !isLast && !nextChangesSection && dc.exBorder]}>
                    <Text style={dc.exName} numberOfLines={1}>{ex.name}</Text>
                    <View style={dc.exMeta}>
                      <View style={dc.metaBox}>
                        <Text style={dc.metaBoxLabel}>SETS</Text>
                        <Text style={dc.metaBoxVal}>{ex.sets}</Text>
                      </View>
                      <View style={dc.metaBox}>
                        <Text style={dc.metaBoxLabel}>REPS</Text>
                        <Text style={dc.metaBoxVal}>{ex.reps}</Text>
                      </View>
                      <TextInput
                        style={dc.weightInput}
                        value={weights[wKey] ?? ''}
                        onChangeText={(v) => onWeightChange(wKey, v)}
                        onBlur={() => onWeightBlur(wKey, weights[wKey] ?? '')}
                        placeholder="kg"
                        placeholderTextColor={colors.text.disabled}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                </React.Fragment>
              );
            });
          })()}
        </View>
      )}
    </View>
  );
}

// ─── Routine display ──────────────────────────────────────────────────────────

function RoutineDisplay({
  routines,
  onDelete,
}: {
  routines: Routine[];
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(routines[routines.length - 1]?.id ?? null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const selected = routines.find((r) => r.id === selectedId) ?? routines[routines.length - 1];

  useEffect(() => {
    loadWeights().then(setWeights);
  }, []);

  function handleWeightChange(key: string, value: string) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  async function handleWeightBlur(key: string, value: string) {
    const colonIdx = key.indexOf(':');
    const rId = key.slice(0, colonIdx);
    const exName = key.slice(colonIdx + 1);
    await saveWeight(rId, exName, value);
  }

  if (!selected) return null;

  return (
    <View style={{ flex: 1 }}>
      {routines.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rd.selectorRow}
        >
          {routines.map((r) => {
            const on = r.id === selectedId;
            return (
              <TouchableOpacity
                key={r.id}
                style={[rd.chip, on && rd.chipOn]}
                onPress={() => setSelectedId(r.id)}
                activeOpacity={0.7}
              >
                <Text style={[rd.chipText, on && rd.chipTextOn]}>{r.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={rd.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={rd.routineHeader}>
          <Text style={rd.routineName}>{selected.name}</Text>
          <TouchableOpacity
            onPress={() => onDelete(selected.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={17} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
        {(selected.days ?? []).map((day) => (
          <DayCard
            key={day.day}
            day={day}
            routineId={selected.id}
            weights={weights}
            onWeightChange={handleWeightChange}
            onWeightBlur={handleWeightBlur}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function TrainingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<TabId>('trainer');
  const [userName, setUserName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    loadUserProfile().then(p => { setUserName(p?.name ?? ''); setNameLoaded(true); });
  }, []);

  const refreshRoutines = useCallback(() => {
    loadRoutines().then(setRoutines);
  }, []);

  useEffect(() => {
    if (active === 'routine') refreshRoutines();
  }, [active, refreshRoutines]);

  async function handleDelete(id: string) {
    await deleteRoutine(id);
    refreshRoutines();
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Training</Text>
        <View style={{ width: 24 }} />
      </View>

      <CollapsibleTabBar
        tabs={TABS}
        active={active}
        onSelect={(id) => setActive(id as TabId)}
        accent={ACCENT}
      />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {active === 'trainer' && (
          nameLoaded
            ? <TrainerIntroView userName={userName} accent={ACCENT} />
            : <View style={{ flex: 1 }} />
        )}

        {active === 'routine' && (
          routines.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="list-outline" size={36} color={colors.text.muted} />
              <Text style={s.emptyTitle}>No routine yet</Text>
              <Text style={s.emptyDesc}>Go to the Trainer tab to build your first routine.</Text>
            </View>
          ) : (
            <RoutineDisplay routines={routines} onDelete={handleDelete} />
          )
        )}

        {active === 'today' && <TodayWorkoutView />}

        {active === 'history' && <HistoryView editable />}
      </View>

    </View>
  );
}

// ─── Day card styles ──────────────────────────────────────────────────────────

const dc = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },

  // Lime header (workout days)
  limeHeader: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    paddingTop: 9,
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
  },
  dayName: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    letterSpacing: 0.5,
    color: '#0D0D0D',
    textAlign: 'center',
  },

  // Blue header (rest days)
  restHeader: {
    backgroundColor: REST_BLUE,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: spacing.md,
  },
  restDayName: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Badge row — overlaps header bottom edge via negative margin
  badgeWrap: {
    alignItems: 'center',
    marginTop: -13,
    marginBottom: 10,
  },
  focusBadge: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: ACCENT + '88',
  },
  focusText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.2,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg.card,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: REST_BLUE + '88',
  },
  restLabel: { fontSize: 12, color: REST_BLUE, fontWeight: '600' },

  // Section headers within a day
  sectionHeader: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: ACCENT,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Exercise list
  exList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  exRow: {
    flexDirection: 'column',
    paddingVertical: 8,
  },
  exBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  exName: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '400',
    marginBottom: 6,
  },
  exMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaBox: {
    width: 58,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  metaBoxLabel: {
    fontSize: 8,
    letterSpacing: 1,
    color: colors.text.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaBoxVal: {
    fontSize: 17,
    color: colors.text.primary,
    fontWeight: '500',
    lineHeight: 22,
  },
  weightInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    textAlign: 'center',
    fontSize: 17,
    color: colors.text.primary,
  },
});

// ─── Routine display styles ───────────────────────────────────────────────────

const rd = StyleSheet.create({
  selectorRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipOn: { backgroundColor: ACCENT + '22', borderColor: ACCENT + '99' },
  chipText: { ...typography.callout, color: colors.text.secondary },
  chipTextOn: { color: ACCENT, fontWeight: '600' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  routineName: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    letterSpacing: 0.3,
    color: colors.text.primary,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: { ...typography.subhead, color: colors.text.secondary },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.title3, color: colors.text.primary, textAlign: 'center' },
  emptyDesc: { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },
});
