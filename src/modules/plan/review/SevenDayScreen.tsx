/**
 * modules/plan/review/SevenDayScreen.tsx
 *
 * The 7-Day Weekly Review screen. Loads the past 7 body weight logs and the
 * current nutrition plan, passes them to the weekly-review engine (analyzeWeek),
 * and displays the analysis: actual vs predicted weight change, whether water
 * retention was detected, and the calibrated real maintenance calories. If the
 * user accepts the recalibration, adjustPlan() updates the calorie target and
 * saves it via userProfileStorage so next week starts from a more accurate baseline.
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
import {
  analyzeWeek,
  adjustPlan,
} from '@/engine/weekly-review';
import type {
  DailyLog,
  WeeklyAnalysisResult,
  Insight,
  InsightType,
} from '@/engine/weekly-review';

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

function signedKcal(n: number): string {
  return (n > 0 ? '+' : '') + n.toLocaleString();
}

function signedKg(n: number): string {
  return (n > 0 ? '+' : '') + n.toFixed(2);
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   colors.success,
  medium: colors.gold,
  low:    colors.danger,
};

const INSIGHT_ICON: Record<InsightType, { name: string; color: string }> = {
  info:       { name: 'information-circle-outline', color: colors.info },
  warning:    { name: 'warning-outline',            color: colors.gold },
  success:    { name: 'checkmark-circle-outline',   color: colors.success },
  adjustment: { name: 'trending-up-outline',        color: colors.primary },
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={sub.sectionLabel}>{text}</Text>;
}

const sub = StyleSheet.create({
  sectionLabel: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: 8,
  },
});

// ── Day grid ─────────────────────────────────────────────────────────────────

interface DayStatus {
  dietLogged: boolean;
  weightLogged: boolean;
  isToday: boolean;
}

function DayGrid({ days }: { days: DayStatus[] }) {
  return (
    <View style={dg.card}>
      <View style={dg.row}>
        {DAY_LABELS.map((label, i) => {
          const d = days[i];
          return (
            <View key={i} style={dg.col}>
              <Text style={[dg.dayLabel, d.isToday && dg.todayLabel]}>{label}</Text>
              {/* Diet dot */}
              <View style={[dg.dot, d.dietLogged ? dg.dotDiet : dg.dotEmpty]} />
              {/* Weight dot */}
              <View style={[dg.dot, d.weightLogged ? dg.dotWeight : dg.dotEmpty]} />
            </View>
          );
        })}
      </View>
      <View style={dg.legend}>
        <View style={dg.legendItem}>
          <View style={[dg.dot, dg.dotDiet]} />
          <Text style={dg.legendText}>Diet</Text>
        </View>
        <View style={dg.legendItem}>
          <View style={[dg.dot, dg.dotWeight]} />
          <Text style={dg.legendText}>Weight</Text>
        </View>
        <View style={dg.legendItem}>
          <View style={[dg.dot, dg.dotEmpty]} />
          <Text style={dg.legendText}>Not logged</Text>
        </View>
      </View>
    </View>
  );
}

const dg = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    ...typography.label,
    color: colors.text.muted,
    fontSize: 12,
  },
  todayLabel: {
    color: colors.primary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDiet: {
    backgroundColor: colors.primary,
  },
  dotWeight: {
    backgroundColor: colors.info,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    ...typography.caption,
    color: colors.text.muted,
  },
});

// ── Calorie summary ───────────────────────────────────────────────────────────

function CalorieSummary({ result }: { result: WeeklyAnalysisResult }) {
  const isDeficit = result.totalSurplusDeficit <= 0;
  const netColor  = isDeficit ? colors.primary : colors.danger;

  return (
    <View style={cs.card}>
      <View style={cs.topRow}>
        <View style={cs.block}>
          <Text style={cs.blockLabel}>AVG DAILY</Text>
          <Text style={cs.bigNum}>{result.avgDailyCaloriesEaten.toLocaleString()}</Text>
          <Text style={cs.unit}>kcal eaten</Text>
        </View>
        <View style={cs.vDivider} />
        <View style={cs.block}>
          <Text style={cs.blockLabel}>TARGET</Text>
          <Text style={cs.bigNum}>{Math.round(result.totalGoalCalories / 7).toLocaleString()}</Text>
          <Text style={cs.unit}>kcal goal</Text>
        </View>
      </View>
      <View style={cs.netRow}>
        <Text style={cs.netLabel}>WEEKLY NET</Text>
        <Text style={[cs.netValue, { color: netColor }]}>
          {signedKcal(result.totalSurplusDeficit)} kcal
        </Text>
        <Text style={cs.netSub}>
          {isDeficit ? 'deficit' : 'surplus'} across {result.dietLoggedDays} logged days
        </Text>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  block: { flex: 1, gap: 2 },
  blockLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigNum: {
    fontFamily: typography.fonts.display,
    fontSize: 40,
    lineHeight: 52,
    color: colors.text.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.muted,
  },
  vDivider: {
    width: 1,
    height: 52,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.md,
    alignSelf: 'center',
  },
  netRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: 12,
    gap: 3,
  },
  netLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netValue: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 36,
  },
  netSub: {
    ...typography.caption,
    color: colors.text.muted,
  },
});

// ── Weight tracker ────────────────────────────────────────────────────────────

function WeightTracker({ result }: { result: WeeklyAnalysisResult }) {
  const hasWeight =
    result.startWeightKg !== null && result.endWeightKg !== null;
  const hasBoth =
    hasWeight && result.expectedWeightChangeKg !== null;

  if (!hasWeight) {
    return (
      <View style={wt.card}>
        <Text style={wt.emptyText}>Log your weight at least twice this week to see change tracking.</Text>
      </View>
    );
  }

  const actualColor =
    result.waterRetentionSuspected ? colors.gold : colors.text.primary;

  return (
    <View style={wt.card}>
      <View style={wt.scaleRow}>
        <View style={wt.scaleBlock}>
          <Text style={wt.scaleLabel}>START</Text>
          <Text style={wt.scaleNum}>{result.startWeightKg!.toFixed(1)}</Text>
          <Text style={wt.unit}>kg</Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={20}
          color={colors.text.muted}
          style={{ alignSelf: 'center', marginBottom: 4 }}
        />
        <View style={wt.scaleBlock}>
          <Text style={wt.scaleLabel}>END</Text>
          <Text style={[wt.scaleNum, { color: actualColor }]}>
            {result.endWeightKg!.toFixed(1)}
          </Text>
          <Text style={wt.unit}>kg</Text>
        </View>
        <View style={wt.changeBadge}>
          <Text style={[wt.changeBig, { color: actualColor }]}>
            {signedKg(result.actualWeightChangeKg!)} kg
          </Text>
          <Text style={wt.changeLabel}>actual change</Text>
        </View>
      </View>

      {hasBoth && (
        <View style={wt.comparison}>
          <View style={wt.compRow}>
            <Text style={wt.compLabel}>Expected (calorie math)</Text>
            <Text style={wt.compValue}>
              {signedKg(result.expectedWeightChangeKg!)} kg
            </Text>
          </View>
          <View style={wt.compRow}>
            <Text style={wt.compLabel}>Actual</Text>
            <Text style={[wt.compValue, { color: actualColor }]}>
              {signedKg(result.actualWeightChangeKg!)} kg
            </Text>
          </View>
          {result.waterRetentionSuspected && (
            <View style={wt.retentionFlag}>
              <Ionicons name="water-outline" size={14} color={colors.gold} />
              <Text style={wt.retentionText}>
                Large discrepancy — water retention likely, not fat change
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const wt = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: 12,
  },
  emptyText: {
    ...typography.footnote,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  scaleBlock: { alignItems: 'center', gap: 2 },
  scaleLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scaleNum: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    lineHeight: 42,
    color: colors.text.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.muted,
  },
  changeBadge: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  changeBig: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 36,
  },
  changeLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  comparison: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: 10,
    gap: 8,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compLabel: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  compValue: {
    ...typography.footnote,
    fontFamily: typography.fonts.semibold,
    fontWeight: '600',
    color: colors.text.primary,
  },
  retentionFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  retentionText: {
    ...typography.caption,
    color: colors.gold,
    flex: 1,
  },
});

// ── Calibration card ──────────────────────────────────────────────────────────

function CalibrationCard({ result }: { result: WeeklyAnalysisResult }) {
  const hasCalibration = result.impliedMaintenanceCal !== null;
  const confidenceColor = CONFIDENCE_COLOR[result.confidence];
  const deltaSign = result.maintenanceDelta >= 0 ? '+' : '';

  return (
    <View style={cal.card}>
      <View style={cal.headerRow}>
        <Text style={cal.title}>CALIBRATION</Text>
        <View style={[cal.confBadge, { borderColor: confidenceColor }]}>
          <Text style={[cal.confText, { color: confidenceColor }]}>
            {result.confidence.toUpperCase()} CONFIDENCE
          </Text>
        </View>
      </View>

      {hasCalibration ? (
        <>
          <View style={cal.mainRow}>
            <View style={cal.mainBlock}>
              <Text style={cal.mainLabel}>IMPLIED MAINTENANCE</Text>
              <Text style={cal.mainNum}>
                {result.impliedMaintenanceCal!.toLocaleString()}
                <Text style={cal.mainUnit}> kcal</Text>
              </Text>
            </View>
            <View style={cal.mainBlock}>
              <Text style={cal.mainLabel}>NEW ESTIMATE</Text>
              <Text style={[cal.mainNum, { color: colors.primary }]}>
                {result.newMaintenanceEstimate.toLocaleString()}
                <Text style={cal.mainUnit}> kcal</Text>
              </Text>
            </View>
          </View>
          {result.maintenanceDelta !== 0 && (
            <View style={cal.deltaRow}>
              <Ionicons
                name={result.maintenanceDelta > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={colors.primary}
              />
              <Text style={cal.deltaText}>
                {`${deltaSign}${result.maintenanceDelta} kcal/day from previous estimate`}
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text style={cal.incompleteText}>
          {result.dietLoggedDays < 5
            ? `Need ${5 - result.dietLoggedDays} more logged days to calibrate.`
            : 'Need at least 2 weight logs to calibrate.'}
        </Text>
      )}
    </View>
  );
}

const cal = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
  },
  confBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confText: {
    ...typography.caption,
    fontFamily: typography.fonts.semibold,
    fontWeight: '600',
  },
  mainRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mainBlock: { flex: 1, gap: 3 },
  mainLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  mainNum: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text.primary,
  },
  mainUnit: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.text.muted,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deltaText: {
    ...typography.caption,
    color: colors.primary,
  },
  incompleteText: {
    ...typography.footnote,
    color: colors.text.muted,
  },
});

// ── Insights ──────────────────────────────────────────────────────────────────

function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <View style={ins.container}>
      {insights.map((insight, i) => {
        const { name, color } = INSIGHT_ICON[insight.type];
        return (
          <View key={i} style={ins.row}>
            <Ionicons name={name as any} size={16} color={color} style={{ marginTop: 1 }} />
            <Text style={ins.text}>{insight.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const ins = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  text: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 20,
  },
});

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
