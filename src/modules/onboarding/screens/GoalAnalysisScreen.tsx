import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { OnboardingStackParamList } from '@/navigation/navigation';
import { computeBodyStats } from '@/modules/onboarding/utils/fitnessCalculations';
import type { BodyCompositionStats } from '@/modules/onboarding/utils/fitnessCalculations';
import {
  analyzeGoal,
  type GoalAnalysisResult,
  type GoalJourney,
} from '@/modules/onboarding/services/goalAnalysisService';
import type { UserPhysicalStats } from '@/modules/onboarding/utils/physicalStatsParser';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'GoalAnalysis'>;
  route: RouteProp<OnboardingStackParamList, 'GoalAnalysis'>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Paragraphs({ text, style }: { text: string; style?: object }) {
  const parts = text.split('\n\n').filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <Text key={i} style={[styles.bodyText, style, i > 0 && { marginTop: spacing.sm }]}>
          {p}
        </Text>
      ))}
    </>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  iconColor,
  label,
  title,
  children,
  accent,
}: {
  icon: string;
  iconColor: string;
  label: string;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View>{children}</View>
    </View>
  );
}

// ─── Verdict card (Section 1) ─────────────────────────────────────────────────

function VerdictCard({
  verdict,
  isFeasible,
  journey,
}: {
  verdict: string;
  isFeasible?: boolean;
  journey?: GoalJourney;
}) {
  const feasible = isFeasible !== false;
  const accentColor = feasible ? colors.success : colors.gold;
  const badgeIcon = feasible ? 'checkmark-circle-outline' : 'alert-circle-outline';
  const badgeLabel = feasible ? 'ACHIEVABLE' : "LET'S REDIRECT";

  return (
    <View style={[styles.card, { borderColor: accentColor + '55' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '22' }]}>
          <Ionicons name={badgeIcon as any} size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>FEASIBILITY CHECK</Text>
          <Text style={[styles.cardTitle, { color: accentColor }]}>{badgeLabel}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <Text style={styles.bodyText}>{verdict}</Text>
      {journey && feasible && (
        <>
          <View style={[styles.cardDivider, { marginTop: spacing.md }]} />
          <View style={styles.verdictMeta}>
            <Ionicons name="time-outline" size={14} color={colors.gold} />
            <Text style={styles.verdictMetaText}>
              Timeline:{' '}
              <Text style={{ color: colors.gold, fontWeight: '600' }}>{journey.timelineText}</Text>
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Journey card ─────────────────────────────────────────────────────────────

function JourneyCard({
  stats,
  calcs,
  journey,
}: {
  stats: UserPhysicalStats;
  calcs: BodyCompositionStats;
  journey: GoalJourney;
}) {
  const targetFatKg =
    Math.round((journey.targetWeightKg * journey.targetBFPercent) / 100 * 10) / 10;
  const targetLeanKg =
    Math.round((journey.targetWeightKg - targetFatKg) * 10) / 10;

  const rows: { label: string; now: string; target: string }[] = [
    {
      label: 'Body Weight',
      now: `${stats.weightKg} kg`,
      target: `${journey.targetWeightKg} kg`,
    },
    {
      label: 'Body Fat',
      now: `${calcs.bfPercent}%`,
      target: `${journey.targetBFPercent}%`,
    },
    {
      label: 'Fat Mass',
      now: `${calcs.fatMassKg} kg`,
      target: `${targetFatKg} kg`,
    },
    {
      label: 'Lean Mass',
      now: `${calcs.lbmKg} kg`,
      target: `${targetLeanKg} kg`,
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.success + '22' }]}>
          <Ionicons name="trending-up-outline" size={18} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>YOUR JOURNEY</Text>
          <Text style={styles.cardTitle}>Now and Target</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />

      {/* Column headers */}
      <View style={styles.journeyRow}>
        <Text style={[styles.journeyCell, { flex: 2 }]} />
        <Text style={[styles.journeyColHead, { flex: 2, textAlign: 'right' }]}>NOW</Text>
        <View style={{ width: 28 }} />
        <Text style={[styles.journeyColHead, { flex: 2, textAlign: 'left', color: colors.success }]}>
          TARGET
        </Text>
      </View>

      {rows.map((row, i) => (
        <View key={i} style={[styles.journeyRow, i > 0 && styles.journeyRowBorder]}>
          <Text style={[styles.journeyRowLabel, { flex: 2 }]}>{row.label}</Text>
          <Text style={[styles.journeyNow, { flex: 2, textAlign: 'right' }]}>{row.now}</Text>
          <View style={{ width: 28, alignItems: 'center' }}>
            <Ionicons name="arrow-forward" size={12} color={colors.text.muted} />
          </View>
          <Text style={[styles.journeyTarget, { flex: 2, textAlign: 'left' }]}>{row.target}</Text>
        </View>
      ))}

      <View style={[styles.cardDivider, { marginTop: spacing.md }]} />

      <View style={styles.journeyMeta}>
        <Ionicons name="flash-outline" size={14} color={colors.info} />
        <Text style={styles.journeyMetaText}>{journey.earlyWins}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function GoalAnalysisScreen({ navigation, route }: Props) {
  const { stats, goalText } = route.params;
  const insets = useSafeAreaInsets();
  const calcs = computeBodyStats(stats);

  const [result, setResult] = useState<GoalAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeGoal(stats, goalText, calcs)
      .then(setResult)
      .catch(() => setError('Something went wrong analysing your goal. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const journey: GoalJourney | undefined =
    result?.journey ??
    result?.alternativeGoal?.journey ??
    undefined;

  const isRehab = result?.goalType === 'rehabilitation';

  function runAnalysis() {
    setError(null);
    setLoading(true);
    analyzeGoal(stats, goalText, calcs)
      .then(setResult)
      .catch(() => setError('Something went wrong analysing your goal. Please try again.'))
      .finally(() => setLoading(false));
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Analysis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Analysing your goal…</Text>
            <Text style={styles.loadingSubText}>
              We're breaking down what your goal actually means and what it'll take to get there.
            </Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runAnalysis}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {result && !loading && (
          <View style={styles.content}>

            {/* ── Disclaimer ──────────────────────────────────────────────── */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.text.muted} />
              <Text style={styles.disclaimerText}>
                Don't be put off if you don't recognise terms like calories or body fat — Gymman
                will walk you through everything before it actually matters for you.
              </Text>
            </View>

            {/* ── Section 1: Verdict ───────────────────────────────────────── */}
            {!isRehab && result.realisticVerdict && (
              <VerdictCard
                verdict={result.realisticVerdict}
                isFeasible={result.isFeasible}
                journey={journey}
              />
            )}

            {/* ── Section 2: Simplified goal ───────────────────────────────── */}
            {!isRehab && result.isFeasible !== false && result.goalSimplified && (
              <SectionCard
                icon="flag-outline"
                iconColor={colors.primaryLight}
                label="YOUR GOAL, SIMPLIFIED"
                title="What you're actually after"
              >
                <Paragraphs text={result.goalSimplified} />
              </SectionCard>
            )}

            {/* ── Section 2 (infeasible): Alternative simplified ───────────── */}
            {!isRehab && result.isFeasible === false && result.alternativeGoal && (
              <SectionCard
                icon="rocket-outline"
                iconColor={colors.primaryLight}
                label="YOUR ACTUAL TARGET"
                title={result.alternativeGoal.title}
                accent
              >
                <Text style={styles.salesPitch}>{result.alternativeGoal.salesPitch}</Text>
                <View style={styles.cardDivider} />
                <Paragraphs text={result.alternativeGoal.goalSimplified} />
              </SectionCard>
            )}

            {/* ── Section 3: Complete analysis ─────────────────────────────── */}
            <SectionCard
              icon="telescope-outline"
              iconColor={colors.info}
              label={isRehab ? 'UNDERSTANDING YOUR GOAL' : 'WHAT YOUR GOAL REALLY MEANS'}
              title={isRehab ? 'Understanding your goal' : 'The full picture'}
            >
              <Paragraphs text={result.goalInterpretation} />
            </SectionCard>

            {/* ── Rehab guidance ───────────────────────────────────────────── */}
            {isRehab && result.rehabilitationGuidance && (
              <SectionCard
                icon="medkit-outline"
                iconColor={colors.gold}
                label="WHAT WE RECOMMEND"
                title="Your next step"
              >
                <Paragraphs text={result.rehabilitationGuidance} />
              </SectionCard>
            )}

            {/* ── Section 4: Your Situation ────────────────────────────────── */}
            {!isRehab && result.situationAnalysis && (
              <SectionCard
                icon="person-outline"
                iconColor={colors.gold}
                label="YOUR SITUATION"
                title="What this means for you"
              >
                <Paragraphs text={result.situationAnalysis} />
              </SectionCard>
            )}

            {/* ── Foundation goal (infeasible path only) ───────────────────── */}
            {!isRehab && result.isFeasible === false && result.foundationGoal && (
              <SectionCard
                icon="layers-outline"
                iconColor={colors.info}
                label="YOUR NATURAL PEAK"
                title={result.foundationGoal.title}
              >
                <Text style={styles.rationaleText}>{result.foundationGoal.rationale}</Text>
                <View style={styles.cardDivider} />
                <Paragraphs text={result.foundationGoal.goalSimplified} />
              </SectionCard>
            )}

            {/* ── Journey: Now and Target ───────────────────────────────────── */}
            {journey && !isRehab && (
              <JourneyCard stats={stats} calcs={calcs} journey={journey} />
            )}

            {/* ── Education ────────────────────────────────────────────────── */}
            <View style={styles.educationBlock}>
              <Text style={styles.educationTitle}>{result.educationTitle}</Text>
              <Paragraphs text={result.educationContent} style={styles.educationBody} />
            </View>

            {/* ── Transition text ──────────────────────────────────────────── */}
            <Text style={styles.transitionText}>
              It's completely okay if you still don't fully grasp your goal — that's exactly
              what we're here for. Let's keep going and make it even clearer.
            </Text>

          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      {result && !loading && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {!isRehab && (
            <Text style={styles.footerHint}>
              Now that you know what your goal actually means, let's see how you can
              execute it. First, let's check your numbers — the scary stuff like calories
              and such. Don't worry, we'll teach you.
            </Text>
          )}
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ExecutionPlan', { stats, goalText, targetWeightKg: journey?.targetWeightKg })}
          >
            <Text style={styles.ctaBtnText}>
              {isRehab ? 'Back to onboarding' : 'Check my numbers'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.inverse}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },

  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },

  // ── Loading / error ──────────────────────────────────────────────────────────
  loadingBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.title3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  loadingSubText: {
    ...typography.callout,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  errorBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.callout,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  retryBtnText: {
    ...typography.subhead,
    color: colors.text.primary,
  },

  // ── Content wrapper ──────────────────────────────────────────────────────────
  content: {
    gap: spacing.md,
  },

  // ── Disclaimer ───────────────────────────────────────────────────────────────
  disclaimer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
  },
  disclaimerText: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  cardAccent: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.bg.elevated,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardLabel: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: 2,
  },
  cardTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    lineHeight: 21,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.sm,
  },

  // ── Body text ─────────────────────────────────────────────────────────────────
  bodyText: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
  },

  // ── Verdict card meta ────────────────────────────────────────────────────────
  verdictMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verdictMetaText: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 19,
  },

  // ── Sales pitch / rationale ───────────────────────────────────────────────────
  salesPitch: {
    ...typography.callout,
    color: colors.primaryLight,
    lineHeight: 23,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  rationaleText: {
    ...typography.callout,
    color: colors.info,
    lineHeight: 23,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },

  // ── Education block ───────────────────────────────────────────────────────────
  educationBlock: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  educationTitle: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  educationBody: {
    color: colors.text.secondary,
  },

  // ── Journey card ──────────────────────────────────────────────────────────────
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  journeyRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  journeyColHead: {
    ...typography.label,
    color: colors.text.muted,
  },
  journeyCell: {
    flex: 2,
  },
  journeyRowLabel: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  journeyNow: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  journeyTarget: {
    ...typography.subhead,
    color: colors.success,
    fontWeight: '600',
  },
  journeyMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  journeyMetaText: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 19,
  },

  // ── Transition text ───────────────────────────────────────────────────────────
  transitionText: {
    ...typography.callout,
    color: colors.text.muted,
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    fontStyle: 'italic',
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.bg.app,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    gap: spacing.sm,
  },
  footerHint: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ctaBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ctaBtnText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
});
