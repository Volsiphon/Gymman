import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { OnboardingStackParamList } from '@/navigation/navigation';
import { computeBodyStats } from '@/modules/onboarding/utils/fitnessCalculations';
import {
  analyzeGoal,
  type GoalAnalysisResult,
} from '@/modules/onboarding/services/goalAnalysisService';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'GoalAnalysis'>;
  route: RouteProp<OnboardingStackParamList, 'GoalAnalysis'>;
};

// ─── Stat card data ───────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string;
  unit: string;
  color: string;
  explanation: string;
}

function buildStatCards(
  calcs: ReturnType<typeof computeBodyStats>,
): StatCard[] {
  return [
    {
      label: 'Body Fat',
      value: calcs.bfPercent.toString(),
      unit: '%',
      color:
        calcs.bfColor === 'success'
          ? colors.success
          : calcs.bfColor === 'gold'
          ? colors.gold
          : colors.danger,
      explanation: `${calcs.bfCategory} range. This is the percentage of your total weight that is fat. Everything else — muscle, bone, organs, water — is lean mass.`,
    },
    {
      label: 'Lean Body Mass',
      value: calcs.lbmKg.toString(),
      unit: 'kg',
      color: colors.info,
      explanation: `Your ${calcs.lbmKg} kg of lean mass is your actual body — muscle, bones, organs. This is the part worth protecting. When you lose weight, the goal is to lose fat, not this.`,
    },
    {
      label: 'Fat Mass',
      value: calcs.fatMassKg.toString(),
      unit: 'kg',
      color:
        calcs.bfColor === 'danger' ? colors.danger : colors.text.secondary,
      explanation: `${calcs.fatMassKg} kg of stored fat. Your body needs some fat to function — roughly 5% for men and 12% for women as an absolute minimum. The rest is optional.`,
    },
    {
      label: 'Maintenance',
      value: calcs.tdee.toString(),
      unit: 'kcal',
      color: colors.primaryLight,
      explanation: `You burn roughly ${calcs.tdee} calories a day just existing and moving around. Eat less than this to lose fat. Eat more to gain muscle. This number changes as your body changes.`,
    },
    {
      label: 'Current Build',
      value: calcs.buildDescription,
      unit: '',
      color: colors.text.primary,
      explanation: `Estimated from your body fat (${calcs.bfPercent}%) and lean mass index (${calcs.ffmi}). ${calcs.estimationMethod === 'navy' ? 'Calculated using the US Navy body measurement formula.' : 'Estimated from your BMI since full measurements were not provided.'}`,
    },
  ];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Page = 'stats' | 'analysis';

export function GoalAnalysisScreen({ navigation, route }: Props) {
  const { stats, goalText } = route.params;
  const insets = useSafeAreaInsets();
  const calcs = computeBodyStats(stats);
  const statCards = buildStatCards(calcs);

  const [page, setPage] = useState<Page>('stats');
  const [analysis, setAnalysis] = useState<GoalAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState(false);
  const [chosenAlternative, setChosenAlternative] = useState(false);

  // Expanded explanation card
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Page-level fade animation
  const statsOpacity = useRef(new Animated.Value(1)).current;
  const analysisOpacity = useRef(new Animated.Value(0)).current;

  // Stat card entrance animation — staggered
  const cardAnims = useRef(statCards.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Staggered card entrance
    const anims = cardAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 120 + i * 80,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start();

    // Fire AI analysis in background with 1.5s minimum wait
    const start = Date.now();
    analyzeGoal(stats, goalText, calcs)
      .then(result => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 1500 - elapsed);
        setTimeout(() => setAnalysis(result), remaining);
      })
      .catch(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 1500 - elapsed);
        setTimeout(() => setAnalysisError(true), remaining);
      });
  }, []);

  function goToAnalysis() {
    Animated.parallel([
      Animated.timing(statsOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(analysisOpacity, { toValue: 1, duration: 300, delay: 160, useNativeDriver: true }),
    ]).start(() => setPage('analysis'));
  }

  // ─── Render stat cards (page 1) ─────────────────────────────────────────────

  function renderStatCards() {
    return (
      <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: statsOpacity }]}
      pointerEvents={page === 'stats' ? 'auto' : 'none'}
    >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>Here's where you're starting from.</Text>
            <Text style={styles.heroSub}>
              We ran your measurements through some formulas. Tap any card to understand what it means.
            </Text>
          </View>

          <View style={styles.cardList}>
            {statCards.map((card, i) => {
              const isExpanded = expandedCard === i;
              return (
                <Animated.View
                  key={i}
                  style={{
                    opacity: cardAnims[i],
                    transform: [
                      {
                        translateY: cardAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.statCard, isExpanded && styles.statCardExpanded]}
                    onPress={() => setExpandedCard(isExpanded ? null : i)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.statCardRow}>
                      <View style={styles.statCardLeft}>
                        <Text style={styles.statLabel}>{card.label}</Text>
                        <View style={styles.statValueRow}>
                          <Text style={[styles.statValue, { color: card.color }]}>
                            {card.value}
                          </Text>
                          {card.unit !== '' && (
                            <Text style={[styles.statUnit, { color: card.color }]}>
                              {card.unit}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'information-circle-outline'}
                        size={20}
                        color={colors.text.muted}
                      />
                    </View>

                    {isExpanded && (
                      <Text style={styles.explanation}>{card.explanation}</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={goToAnalysis}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>See your goal analysis</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ─── Render analysis (page 2) ────────────────────────────────────────────────

  function renderAnalysis() {
    if (analysisError) {
      return (
        <Animated.View
        style={[StyleSheet.absoluteFill, styles.centeredFlex, { opacity: analysisOpacity }]}
        pointerEvents={page === 'analysis' ? 'auto' : 'none'}
      >
          <Ionicons name="wifi-outline" size={40} color={colors.text.muted} />
          <Text style={[styles.heroTitle, { marginTop: spacing.md, textAlign: 'center' }]}>
            Couldn't reach the coach
          </Text>
          <Text style={[styles.heroSub, { textAlign: 'center', marginTop: spacing.sm }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.continueBtn, { marginTop: spacing.xl }]}
            onPress={() => navigation.navigate('StatsReveal')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue anyway</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (!analysis) {
      return (
        <Animated.View
        style={[StyleSheet.absoluteFill, styles.centeredFlex, { opacity: analysisOpacity }]}
        pointerEvents={page === 'analysis' ? 'auto' : 'none'}
      >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { marginTop: spacing.lg }]}>
            Analysing your goal...
          </Text>
          <Text style={styles.loadingSubText}>
            Reading your numbers. One moment.
          </Text>
        </Animated.View>
      );
    }

    const { isRealistic, interpretedGoal, coachNote, realisticPath, alternativeGoal, foundationPath } = analysis;

    return (
      <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: analysisOpacity }]}
      pointerEvents={page === 'analysis' ? 'auto' : 'none'}
    >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Interpreted goal */}
          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>What you're really after</Text>
            <View style={styles.interpretedCard}>
              <Text style={styles.interpretedText}>"{interpretedGoal}"</Text>
            </View>
          </View>

          {/* Coach verdict badge */}
          <View style={[styles.verdictBadge, isRealistic ? styles.verdictGreen : styles.verdictAmber]}>
            <Ionicons
              name={isRealistic ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={isRealistic ? colors.success : colors.gold}
            />
            <Text style={[styles.verdictText, { color: isRealistic ? colors.success : colors.gold }]}>
              {isRealistic ? 'This goal is achievable' : 'This goal needs a rethink'}
            </Text>
          </View>

          {/* Coach note */}
          <View style={styles.coachCard}>
            <Text style={styles.coachLabel}>From your coach</Text>
            <Text style={styles.coachNote}>{coachNote}</Text>
          </View>

          {/* Realistic path */}
          {isRealistic && realisticPath && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your journey</Text>
              <View style={styles.journeyCard}>
                <View style={styles.journeyRow}>
                  <View style={styles.journeyPoint}>
                    <Text style={styles.journeyPointLabel}>Now</Text>
                    <Text style={styles.journeyValue}>{stats.weightKg} kg</Text>
                    <Text style={styles.journeyValueSub}>{calcs.bfPercent}% BF</Text>
                  </View>
                  <View style={styles.journeyArrow}>
                    <View style={styles.journeyLine} />
                    <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
                    <Text style={styles.journeyTimeline}>{realisticPath.timelineRange}</Text>
                  </View>
                  <View style={styles.journeyPoint}>
                    <Text style={styles.journeyPointLabel}>Target</Text>
                    <Text style={[styles.journeyValue, { color: colors.success }]}>
                      {realisticPath.targetWeightKg} kg
                    </Text>
                    <Text style={[styles.journeyValueSub, { color: colors.success }]}>
                      {realisticPath.targetBFPercent}% BF
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.journeyDescLabel}>What it looks like</Text>
                <Text style={styles.journeyDesc}>{realisticPath.whatItLooksLike}</Text>

                <View style={[styles.earlyWinsRow]}>
                  <Ionicons name="flash" size={14} color={colors.gold} />
                  <Text style={styles.earlyWinsText}>{realisticPath.earlyWins}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Unrealistic path — two choices */}
          {!isRealistic && !chosenAlternative && alternativeGoal && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What do you want to do?</Text>

              <TouchableOpacity
                style={styles.choiceCard}
                onPress={() => navigation.navigate('StatsReveal')}
                activeOpacity={0.85}
              >
                <Ionicons name="flame-outline" size={20} color={colors.primaryLight} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>I don't care. I must achieve this.</Text>
                  <Text style={styles.choiceSub}>
                    We'll build a plan around your original goal. It's harder — but you decide.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceCard, { marginTop: spacing.sm }]}
                onPress={() => setChosenAlternative(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="bulb-outline" size={20} color={colors.gold} />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>Show me a better goal suited to me</Text>
                  <Text style={styles.choiceSub}>
                    See an alternative goal your coach recommends based on your actual numbers.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Alternative goal card */}
          {!isRealistic && chosenAlternative && alternativeGoal && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>A better fit for you</Text>
              <View style={styles.altGoalCard}>
                <Text style={styles.altGoalTitle}>{alternativeGoal.title}</Text>
                <Text style={styles.altGoalDesc}>{alternativeGoal.description}</Text>
                <View style={styles.altGoalStats}>
                  <View style={styles.altGoalStat}>
                    <Text style={styles.altGoalStatValue}>{alternativeGoal.targetWeightKg} kg</Text>
                    <Text style={styles.altGoalStatLabel}>Target weight</Text>
                  </View>
                  <View style={styles.altGoalStat}>
                    <Text style={styles.altGoalStatValue}>{alternativeGoal.targetBFPercent}%</Text>
                    <Text style={styles.altGoalStatLabel}>Body fat</Text>
                  </View>
                  <View style={styles.altGoalStat}>
                    <Text style={styles.altGoalStatValue}>{alternativeGoal.timelineMonths}mo</Text>
                    <Text style={styles.altGoalStatLabel}>Timeline</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Foundation path — always shown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start here first</Text>
            <View style={styles.foundationCard}>
              <Text style={styles.foundationDesc}>{foundationPath.description}</Text>
              <View style={styles.foundationStats}>
                <View style={styles.altGoalStat}>
                  <Text style={styles.altGoalStatValue}>{foundationPath.targetWeightKg} kg</Text>
                  <Text style={styles.altGoalStatLabel}>First target</Text>
                </View>
                <View style={styles.altGoalStat}>
                  <Text style={styles.altGoalStatValue}>{foundationPath.targetBFPercent}%</Text>
                  <Text style={styles.altGoalStatLabel}>Body fat</Text>
                </View>
                <View style={styles.altGoalStat}>
                  <Text style={styles.altGoalStatValue}>{foundationPath.timelineMonths}mo</Text>
                  <Text style={styles.altGoalStatLabel}>Timeline</Text>
                </View>
              </View>
              <View style={styles.foundationNote}>
                <Ionicons name="lock-open-outline" size={14} color={colors.info} />
                <Text style={styles.foundationNoteText}>{foundationPath.note}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('StatsReveal')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Build my plan</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ─── Root ────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {page === 'stats' ? 'Your Numbers' : 'Goal Analysis'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>
        {renderStatCards()}
        {renderAnalysis()}
      </View>
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

  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
  },

  heroBlock: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  heroSub: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // ─── Stat cards ───────────────────────────────────────────────────────────
  cardList: {
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  statCardExpanded: {
    borderColor: colors.border.strong,
  },
  statCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCardLeft: {
    gap: 4,
    flex: 1,
  },
  statLabel: {
    ...typography.footnote,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    ...typography.title2,
    fontWeight: '700',
  },
  statUnit: {
    ...typography.callout,
    fontWeight: '500',
  },
  explanation: {
    ...typography.footnote,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: spacing.md,
  },

  // ─── Footer ───────────────────────────────────────────────────────────────
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
  },
  continueBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  continueBtnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },

  // ─── Loading / error ──────────────────────────────────────────────────────
  centeredFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
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
    marginTop: spacing.xs,
  },

  // ─── Analysis ─────────────────────────────────────────────────────────────
  interpretedCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  interpretedText: {
    ...typography.callout,
    color: colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 24,
  },

  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  verdictGreen: {
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  verdictAmber: {
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  verdictText: {
    ...typography.footnote,
    fontWeight: '600',
  },

  coachCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  coachLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  coachNote: {
    ...typography.callout,
    color: colors.text.primary,
    lineHeight: 24,
  },

  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // ─── Journey card ─────────────────────────────────────────────────────────
  journeyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyPoint: {
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  journeyPointLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  journeyValue: {
    ...typography.title3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  journeyValueSub: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  journeyArrow: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  journeyLine: {
    height: 1,
    backgroundColor: colors.border.default,
    width: '60%',
    marginBottom: 2,
  },
  journeyTimeline: {
    ...typography.caption,
    color: colors.text.disabled,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  journeyDescLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  journeyDesc: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  earlyWinsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.goldMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  earlyWinsText: {
    ...typography.footnote,
    color: colors.text.secondary,
    lineHeight: 18,
    flex: 1,
  },

  // ─── Choice cards ─────────────────────────────────────────────────────────
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  choiceText: {
    flex: 1,
    gap: 4,
  },
  choiceTitle: {
    ...typography.callout,
    color: colors.text.primary,
    fontWeight: '600',
  },
  choiceSub: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 18,
  },

  // ─── Alt goal card ────────────────────────────────────────────────────────
  altGoalCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  altGoalTitle: {
    ...typography.title3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  altGoalDesc: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  altGoalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  altGoalStat: {
    alignItems: 'center',
    gap: 4,
  },
  altGoalStatValue: {
    ...typography.title3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  altGoalStatLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },

  // ─── Foundation card ──────────────────────────────────────────────────────
  foundationCard: {
    backgroundColor: colors.infoMuted,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    padding: spacing.md,
    gap: spacing.md,
  },
  foundationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(6, 182, 212, 0.2)',
  },
  foundationDesc: {
    ...typography.callout,
    color: colors.text.primary,
    lineHeight: 22,
  },
  foundationNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  foundationNoteText: {
    ...typography.footnote,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
  },
});
