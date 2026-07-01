/**
 * modules/plan/review/SevenDayScreen.tsx
 *
 * The 7-Day Weekly Review screen. Loads the past 7 body weight logs and the
 * current nutrition plan, passes them to the weekly-review engine (analyzeWeek),
 * and displays the analysis card by card: DayGrid, CalorieSummary, WeightTracker,
 * CalibrationCard, InsightsList, and the recommended next-week target from
 * adjustPlan(). Currently runs on placeholder data until real store wiring lands.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { analyzeWeek, adjustPlan } from '@/engine/weekly-review';
import type { DailyLog } from '@/engine/weekly-review';
import { DayGrid, type DayStatus } from './components/DayGrid';
import { CalorieSummary } from './components/CalorieSummary';
import { WeightTracker } from './components/WeightTracker';
import { CalibrationCard } from './components/CalibrationCard';
import { InsightsList } from './components/InsightsList';

// ─── Placeholder data ─────────────────────────────────────────────────────────
// Replaced by real store data when diet/weight logging is built.

const PLACEHOLDER_LOGS: DailyLog[] = [
  { date: '2026-06-19', caloriesEaten: 2200, proteinG: 160, carbsG: 230, fatsG: 70, weightKg: 72.0, trainingDone: true  },
  { date: '2026-06-20', caloriesEaten: 2450, proteinG: 170, carbsG: 260, fatsG: 75, weightKg: null,  trainingDone: false },
  { date: '2026-06-21', caloriesEaten: null,  proteinG: null, carbsG: null, fatsG: null, weightKg: null, trainingDone: false },
  { date: '2026-06-22', caloriesEaten: 2300, proteinG: 165, carbsG: 245, fatsG: 72, weightKg: null,  trainingDone: true  },
  { date: '2026-06-23', caloriesEaten: 2100, proteinG: 155, carbsG: 220, fatsG: 68, weightKg: 71.6,  trainingDone: true  },
  { date: '2026-06-24', caloriesEaten: null,  proteinG: null, carbsG: null, fatsG: null, weightKg: null, trainingDone: false },
  { date: '2026-06-25', caloriesEaten: null,  proteinG: null, carbsG: null, fatsG: null, weightKg: null, trainingDone: false },
];

const PLACEHOLDER_MAINTENANCE = 2400;
const PLACEHOLDER_GOAL_CAL    = 1900;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(weekStartDate: string): string {
  const start = new Date(weekStartDate);
  const end   = new Date(weekStartDate);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={v.sectionLabel}>{text}</Text>;
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'SevenDay'>;
};

export function SevenDayScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const result = analyzeWeek({
    weekStartDate:         '2026-06-19',
    days:                  PLACEHOLDER_LOGS,
    currentMaintenanceCal: PLACEHOLDER_MAINTENANCE,
    goalCaloriesPerDay:    PLACEHOLDER_GOAL_CAL,
  });

  const adjustment = adjustPlan(
    {
      goalCaloriesPerDay: PLACEHOLDER_GOAL_CAL,
      maintenanceCal:     PLACEHOLDER_MAINTENANCE,
      goalType:           'cut',
    },
    result,
  );

  const today = new Date();
  const dayStatuses: DayStatus[] = PLACEHOLDER_LOGS.map((d) => {
    const date = new Date(d.date);
    return {
      dietLogged:   d.caloriesEaten !== null,
      weightLogged: d.weightKg !== null,
      isToday:
        date.getDate()     === today.getDate()     &&
        date.getMonth()    === today.getMonth()    &&
        date.getFullYear() === today.getFullYear(),
    };
  });

  return (
    <View style={[v.root, { paddingTop: insets.top }]}>
      {/* Screen header */}
      <View style={v.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={v.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={v.headerTitle}>7-DAY REVIEW</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          v.scroll,
          { paddingBottom: spacing.tabBarHeight + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={v.weekHeader}>
          <Text style={v.weekRange}>{formatDateRange(result.weekStartDate)}</Text>
          <Text style={v.weekSub}>{result.dietLoggedDays}/7 days logged</Text>
        </View>

        <SectionLabel text="THIS WEEK" />
        <DayGrid days={dayStatuses} />

        <SectionLabel text="CALORIES" />
        <CalorieSummary result={result} />

        <SectionLabel text="WEIGHT" />
        <WeightTracker result={result} />

        <SectionLabel text="CALIBRATION" />
        <CalibrationCard result={result} />

        {result.insights.length > 0 && (
          <>
            <SectionLabel text="INSIGHTS" />
            <InsightsList insights={result.insights} />
          </>
        )}

        <View style={v.nextWeek}>
          <Text style={v.nextLabel}>NEXT WEEK TARGET</Text>
          <Text style={v.nextNum}>
            {adjustment.newGoalCaloriesPerDay.toLocaleString()}
            <Text style={v.nextUnit}> kcal/day</Text>
          </Text>
          <Text style={v.nextReason}>{adjustment.reason}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const v = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 17,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    gap: spacing.sm + 4,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: 8,
  },
  weekHeader: {
    paddingHorizontal: 4,
    gap: 2,
  },
  weekRange: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text.primary,
  },
  weekSub: {
    ...typography.caption,
    color: colors.text.muted,
  },
  nextWeek: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.md,
    gap: 4,
  },
  nextLabel: {
    ...typography.label,
    color: colors.primary,
  },
  nextNum: {
    fontFamily: typography.fonts.display,
    fontSize: 36,
    lineHeight: 46,
    color: colors.primary,
  },
  nextUnit: {
    fontFamily: typography.fonts.regular,
    fontSize: 16,
    color: colors.text.muted,
  },
  nextReason: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
});
