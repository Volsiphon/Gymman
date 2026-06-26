import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
import { loadNutritionGoals, type NutritionGoals } from '@/services/storage/local/profileStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'PlanHome'>;
};

// ─── Header ──────────────────────────────────────────────────────────────────

function PlanHeader({
  onStatus,
  onSevenDay,
}: {
  onStatus: () => void;
  onSevenDay: () => void;
}) {
  return (
    <View style={hd.row}>
      <View style={hd.brand}>
        <Ionicons name="flame" size={20} color={colors.primary} />
        <Text style={hd.appName}>GYMMAN</Text>
      </View>
      <View style={hd.btnRow}>
        <TouchableOpacity style={hd.pill} onPress={onStatus}>
          <Text style={hd.pillText}>STATUS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={hd.pill} onPress={onSevenDay}>
          <Text style={hd.pillText}>7-DAY</Text>
        </TouchableOpacity>
      </View>
      <Text style={hd.greeting}>Hey, Bam</Text>
    </View>
  );
}

const hd = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    gap: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  appName: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  btnRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pillText: {
    ...typography.label,
    color: colors.text.muted,
  },
  greeting: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
});

// ─── Streak card ─────────────────────────────────────────────────────────────

const STREAK_FLAMES = [
  { key: 'diet',     label: 'DIET',     color: colors.success },
  { key: 'gym',      label: 'GYM',      color: colors.primary },
  { key: 'activity', label: 'ACTIVITY', color: colors.gold    },
] as const;

interface FlameState {
  diet:     boolean;
  gym:      boolean;
  activity: boolean;
}

function FlameCol({ color, lit, label }: { color: string; lit: boolean; label: string }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (lit) {
      opacity.setValue(1);
      anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.13, duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.80, duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 0.96, duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
          ]),
        ]),
      );
      anim.start();
    } else {
      scale.setValue(1);
      opacity.setValue(0.28);
    }
    return () => { anim?.stop(); };
  }, [lit]);

  return (
    <View style={fl.col}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Ionicons name="flame" size={34} color={lit ? color : colors.text.primary} />
      </Animated.View>
      <Text style={[fl.label, lit && { color }]}>{label}</Text>
    </View>
  );
}

function StreakCard({ flames, fullStreak, weekDots }: {
  flames:    FlameState;
  fullStreak: number;
  weekDots:  boolean[];
}) {
  return (
    <View style={sk.card}>

      {/* ── Header ── */}
      <View style={sk.headerRow}>
        <View style={sk.headerLeft}>
          <View style={sk.titleRow}>
            <Ionicons name="flame" size={15} color={colors.primary} />
            <Text style={sk.title}>DAY STREAK</Text>
          </View>
          <Text style={sk.sub}>Light all three to complete the day</Text>
        </View>
        <View style={sk.badge}>
          <Ionicons name="flame" size={13} color={colors.primary} />
          <Text style={sk.badgeLabel}>FULL STREAKS</Text>
          <View style={sk.badgeDivider} />
          <Text style={sk.badgeNum}>{fullStreak}</Text>
          <Text style={sk.badgeDays}>DAYS</Text>
        </View>
      </View>

      {/* ── Three flames ── */}
      <View style={sk.flameRow}>
        {STREAK_FLAMES.map((f, i) => (
          <React.Fragment key={f.key}>
            {i > 0 && <View style={sk.vSep} />}
            <FlameCol color={f.color} lit={flames[f.key]} label={f.label} />
          </React.Fragment>
        ))}
      </View>

      {/* ── Weekly analysis ── */}
      <View style={sk.analysisSection}>
        <View style={sk.analysisHeader}>
          <Ionicons name="trending-up" size={13} color={colors.primary} />
          <Text style={sk.analysisTitle}>WEEKLY ANALYSIS</Text>
        </View>
        <View style={sk.analysisRow}>
          <View style={sk.dotRow}>
            {weekDots.map((complete, i) => (
              <View
                key={i}
                style={[sk.dot, complete && { backgroundColor: colors.primary }]}
              />
            ))}
          </View>
          <View style={sk.legend}>
            <View style={sk.legendItem}>
              <View style={[sk.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={sk.legendText}>COMPLETE</Text>
            </View>
            <View style={sk.legendItem}>
              <View style={[sk.legendDot, { backgroundColor: colors.bg.elevated }]} />
              <Text style={sk.legendText}>INCOMPLETE</Text>
            </View>
          </View>
        </View>
      </View>

    </View>
  );
}

const fl = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 5,
  },
  label: {
    ...typography.label,
    color: colors.text.disabled,
    fontSize: 10,
    letterSpacing: 1,
  },
});

const sk = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },

  // header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerLeft: { gap: 3, flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text.primary,
  },
  sub: {
    ...typography.caption,
    color: colors.text.muted,
  },

  // badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeLabel: {
    ...typography.label,
    color: colors.primary,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  badgeDivider: {
    width: 1,
    height: 13,
    backgroundColor: colors.primaryBorder,
  },
  badgeNum: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text.primary,
  },
  badgeDays: {
    ...typography.label,
    color: colors.text.muted,
    fontSize: 8,
  },

  // flames
  flameRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  vSep: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border.subtle,
  },

  // weekly analysis
  analysisSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    padding: 10,
    gap: 6,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analysisTitle: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.bg.elevated,
  },
  legend: { gap: 4 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 10,
  },
});

// ─── Today's Targets card ─────────────────────────────────────────────────────

interface Targets {
  calories: number;
  goalWeight: number;
  protein: number;
  carbs: number;
  fats: number;
}

function TodayTargets({ targets }: { targets: Targets }) {
  const macros = [
    { label: 'PROTEIN', value: targets.protein },
    { label: 'CARBS',   value: targets.carbs },
    { label: 'FATS',    value: targets.fats },
  ];
  const hasGoalWeight = targets.goalWeight > 0;
  return (
    <View style={tt.card}>
      <Text style={tt.heading}>TODAY'S TARGETS</Text>

      <View style={tt.topRow}>
        <View style={tt.statBlock}>
          <Text style={tt.statLabel}>CALORIES</Text>
          <View style={tt.statValueRow}>
            <Text style={[tt.statNum, { color: colors.primary }]}>{targets.calories}</Text>
            <Text style={tt.unit}>kcal</Text>
          </View>
        </View>
        <View style={tt.vDivider} />
        <View style={tt.statBlock}>
          <Text style={tt.statLabel}>GOAL WEIGHT</Text>
          <View style={tt.statValueRow}>
            {hasGoalWeight ? (
              <>
                <Text style={[tt.statNum, { color: colors.danger }]}>{targets.goalWeight}</Text>
                <Text style={tt.unit}>kg</Text>
              </>
            ) : (
              <Text style={[tt.statNum, { color: colors.text.disabled, fontSize: 36 }]}>--</Text>
            )}
          </View>
        </View>
      </View>

      <View style={tt.macroRow}>
        {macros.map((m, i) => (
          <View key={m.label} style={[tt.macroBox, i > 0 && { marginLeft: 8 }]}>
            <Text style={tt.macroVal}>
              {m.value}<Text style={tt.macroG}>g</Text>
            </Text>
            <Text style={tt.macroLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const tt = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  heading: {
    ...typography.label,
    color: colors.text.muted,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: { flex: 1, gap: 2 },
  statLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statNum: {
    fontFamily: typography.fonts.display,
    fontSize: 48,
    lineHeight: 62,
  },
  unit: {
    ...typography.subhead,
    color: colors.text.muted,
    marginBottom: 6,
  },
  vDivider: {
    width: 1,
    height: 62,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  macroVal: {
    fontFamily: typography.fonts.bold,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  macroG: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.muted,
  },
  macroLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle: string;
  done: boolean;
  accentColor: string;
  onPress: () => void;
}

function SectionCard({ title, subtitle, done, accentColor, onPress }: SectionProps) {
  return (
    <TouchableOpacity style={cd.card} onPress={onPress} activeOpacity={0.8}>
      <View style={cd.textBlock}>
        <Text style={cd.title}>{title}</Text>
        <Text style={cd.sub}>{subtitle}</Text>
      </View>
      <View style={cd.right}>
        {done && <View style={[cd.doneDot, { backgroundColor: accentColor }]} />}
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  textBlock: { flex: 1, gap: 5 },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 17,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  sub: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const DEFAULT_GOALS: NutritionGoals = { calories: 1700, protein: 130, carbs: 170, fats: 47 };

export function PlanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);

  useFocusEffect(
    React.useCallback(() => {
      loadNutritionGoals().then(saved => { if (saved) setGoals(saved); });
    }, []),
  );

  const sections: SectionProps[] = [
    {
      title:       'DIET',
      subtitle:    'Log intake, or get an AI meal plan from your local cuisine.',
      done:        false,
      accentColor: colors.success,
      onPress:     () => navigation.navigate('Diet'),
    },
    {
      title:       'TRAINING ROUTINE',
      subtitle:    'Plan your week, or grab a free routine.',
      done:        false,
      accentColor: colors.primary,
      onPress:     () => navigation.navigate('Training'),
    },
    {
      title:       'CALORY BURN',
      subtitle:    'Track active calories beyond your TDEE.',
      done:        false,
      accentColor: colors.gold,
      onPress:     () => navigation.navigate('CaloryBurn'),
    },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PlanHeader
        onStatus={() => {/* placeholder */}}
        onSevenDay={() => navigation.navigate('SevenDay')}
      />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: spacing.tabBarHeight + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StreakCard
          flames={{ diet: false, gym: false, activity: false }}
          fullStreak={0}
          weekDots={Array(7).fill(false)}
        />
        <TodayTargets targets={{
          calories:   goals.calories,
          protein:    goals.protein,
          carbs:      goals.carbs,
          fats:       goals.fats,
          goalWeight: goals.goalWeightKg ?? 0,
        }} />

        {sections.map((sec) => (
          <SectionCard key={sec.title} {...sec} />
        ))}

        <Text style={s.proTip}>
          <Text style={s.proTipLabel}>Pro tip: </Text>
          Ask your coach in the Coach tab if anything feels off — it adjusts your plan live.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    gap: spacing.sm + 4,
  },
  proTip: {
    ...typography.callout,
    color: colors.text.muted,
    paddingHorizontal: 4,
    paddingTop: 4,
    lineHeight: 22,
  },
  proTipLabel: {
    fontFamily: typography.fonts.bold,
    fontWeight: '700',
    color: colors.danger,
  },
});
