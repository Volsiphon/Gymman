import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/app/navigation';
import { computeBodyStats } from '@/engine/body-metrics';
import { classifyGoal } from '@/engine/goal-engine';
import { calcCalorieTarget, calcMacros } from '@/engine/nutrition';
import {
  loadUserProfile,
  profileToStats,
  saveUserProfile,
} from '@/services/storage/local/userProfileStorage';
import type { UserProfile } from '@/services/storage/local/userProfileStorage';
import type { BodyCompositionStats } from '@/engine/body-metrics';
import {
  runPhase1,
  runPhase2,
  runPhase3,
} from '@/services/ai/goalAnalysis';
import type {
  Phase1Result,
  Phase2Result,
  Phase3Result,
  Phase3InfeasibleResult,
} from '@/services/ai/goalAnalysis';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'GoalAnalysis'>;
};

// ─── Card index constants ─────────────────────────────────────────────────────

const CARD = {
  WHAT_YOU_SAID:           0,
  WHAT_WE_MEAN:            1,
  WHY_WE_THINK:            2,
  CURRENT_REALITY:         3,
  ADVANTAGES:              4,
  CHALLENGES:              5,
  WHAT_MUST_CHANGE:        6,
  TIMELINE:                7,
  SCIENTIFIC_TRANSLATION:  8,
  REALITY_ASSESSMENT:      9,
  OPTIMISED_GOAL:          10,
  FIRST_MILESTONE:         11,
  LONG_TERM_VISION:        12,
} as const;

const TOTAL_CARDS = 13;

// Phase 2 fires when card 0 is shown; Phase 3 fires when card 3 is shown
const PHASE2_TRIGGER = CARD.WHAT_YOU_SAID;
const PHASE3_TRIGGER = CARD.CURRENT_REALITY;

// ─── Card header config ───────────────────────────────────────────────────────

const CARD_META: Record<number, { label: string; icon: string; iconColor: string }> = {
  [CARD.WHAT_YOU_SAID]:          { label: 'WHAT YOU SAID',             icon: 'chatbubble-outline',       iconColor: colors.text.muted },
  [CARD.WHAT_WE_MEAN]:           { label: 'WHAT WE BELIEVE YOU MEAN',  icon: 'bulb-outline',             iconColor: colors.gold },
  [CARD.WHY_WE_THINK]:           { label: 'WHY WE THINK THAT',         icon: 'telescope-outline',         iconColor: colors.info },
  [CARD.CURRENT_REALITY]:        { label: 'YOUR CURRENT REALITY',       icon: 'body-outline',             iconColor: colors.primaryLight },
  [CARD.ADVANTAGES]:             { label: 'YOUR BIGGEST ADVANTAGES',    icon: 'trending-up-outline',      iconColor: colors.success },
  [CARD.CHALLENGES]:             { label: 'YOUR BIGGEST CHALLENGES',    icon: 'warning-outline',          iconColor: colors.gold },
  [CARD.WHAT_MUST_CHANGE]:       { label: 'WHAT MUST CHANGE',          icon: 'swap-horizontal-outline',  iconColor: colors.primary },
  [CARD.TIMELINE]:               { label: 'ESTIMATED TIMELINE',         icon: 'time-outline',             iconColor: colors.info },
  [CARD.SCIENTIFIC_TRANSLATION]: { label: 'SCIENTIFIC TRANSLATION',     icon: 'flask-outline',            iconColor: colors.primaryLight },
  [CARD.REALITY_ASSESSMENT]:     { label: 'REALITY ASSESSMENT',         icon: 'checkmark-circle-outline', iconColor: colors.success },
  [CARD.OPTIMISED_GOAL]:         { label: 'YOUR OPTIMISED GOAL',        icon: 'flag-outline',             iconColor: colors.primary },
  [CARD.FIRST_MILESTONE]:        { label: 'FIRST MILESTONE',            icon: 'ribbon-outline',           iconColor: colors.gold },
  [CARD.LONG_TERM_VISION]:       { label: 'LONG-TERM VISION',           icon: 'eye-outline',              iconColor: colors.info },
};

// ─── Card component ───────────────────────────────────────────────────────────

function CardShell({
  cardIndex,
  children,
  anim,
}: {
  cardIndex: number;
  children: React.ReactNode;
  anim: Animated.Value;
}) {
  const meta = CARD_META[cardIndex];
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: meta.iconColor + '20' }]}>
          <Ionicons name={meta.icon as any} size={16} color={meta.iconColor} />
        </View>
        <Text style={styles.cardLabel}>{meta.label}</Text>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardBody}>{children}</View>
    </Animated.View>
  );
}

function CardText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').filter(Boolean).map((p, i) => (
        <Text key={i} style={[styles.cardBodyText, i > 0 && { marginTop: spacing.sm }]}>{p}</Text>
      ))}
    </>
  );
}

// ─── Option A/B selector ──────────────────────────────────────────────────────

function OptionCard({
  letter,
  title,
  description,
  selected,
  onSelect,
}: {
  letter: 'A' | 'B';
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const accentColor = letter === 'A' ? colors.primary : colors.gold;
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && { borderColor: accentColor, backgroundColor: accentColor + '12' }]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.optionHeader}>
        <View style={[styles.optionBadge, { backgroundColor: accentColor + '22' }]}>
          <Text style={[styles.optionBadgeText, { color: accentColor }]}>OPTION {letter}</Text>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={18} color={accentColor} />}
      </View>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

// ─── Loading placeholder ──────────────────────────────────────────────────────

function CardLoading({ cardIndex }: { cardIndex: number }) {
  const meta = CARD_META[cardIndex];
  return (
    <View style={[styles.card, styles.cardLoading]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: meta.iconColor + '20' }]}>
          <Ionicons name={meta.icon as any} size={16} color={meta.iconColor} />
        </View>
        <Text style={styles.cardLabel}>{meta.label}</Text>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardLoadingBody}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.cardLoadingText}>Analysing…</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function GoalAnalysisScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [calcs, setCalcs]       = useState<BodyCompositionStats | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [pathChoice, setPathChoice] = useState<'a' | 'b' | null>(null);

  const [p1, setP1] = useState<Phase1Result | null>(null);
  const [p2, setP2] = useState<Phase2Result | null>(null);
  const [p3, setP3] = useState<Phase3Result | null>(null);

  const phase2Fired = useRef(false);
  const phase3Fired = useRef(false);
  const isAnimating = useRef(false);
  const cardAnim = useRef(new Animated.Value(1)).current;

  // ── Boot: load profile, compute engine values, fire Phase 1 ─────────────────

  useEffect(() => {
    (async () => {
      const p = await loadUserProfile();
      if (!p) return;

      const s = profileToStats(p);
      const c = computeBodyStats(s);
      const goalType = classifyGoal(p.goalText, c.bfPercent, s.sex);
      const calorieTarget = calcCalorieTarget(c.tdee, goalType);
      const { proteinG, fatsG, carbsG } = calcMacros(calorieTarget, c.lbmKg, goalType);

      const enriched: UserProfile = {
        ...p,
        bmr: c.bmr,
        tdee: c.tdee,
        bfPercent: c.bfPercent,
        fatMassKg: c.fatMassKg,
        lbmKg: c.lbmKg,
        goalType,
        calorieTarget,
        proteinG,
        carbsG,
        fatsG,
        goalOffset: calorieTarget - c.tdee,
      };

      await saveUserProfile(enriched);
      setProfile(enriched);
      setCalcs(c);

      // Phase 1 fires immediately
      const result = await runPhase1(enriched, c);
      setP1(result);
    })();
  }, []);

  // ── Phase 2 — fires when card 0 (whatYouSaid) is displayed ──────────────────

  useEffect(() => {
    if (!profile || !calcs || !p1 || cardIndex < PHASE2_TRIGGER || phase2Fired.current) return;
    phase2Fired.current = true;
    runPhase2(profile, calcs, p1).then(setP2);
  }, [cardIndex, p1, profile, calcs]);

  // ── Phase 3 — fires when card 3 (currentReality) is displayed ───────────────

  useEffect(() => {
    if (!profile || !calcs || !p1 || !p2 || cardIndex < PHASE3_TRIGGER || phase3Fired.current) return;
    phase3Fired.current = true;
    runPhase3(profile, calcs, p1, p2).then(async (result) => {
      setP3(result);
      // Persist target data once we have it
      if (result.feasible) {
        await saveUserProfile({
          targetWeightKg: result.optimisedGoal.targetWeightKg || undefined,
          targetBFPercent: result.optimisedGoal.targetBFPercent || undefined,
        });
      }
    });
  }, [cardIndex, p1, p2, profile, calcs]);

  // ── Navigation between cards ─────────────────────────────────────────────────

  function advanceCard() {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Animated.timing(cardAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setCardIndex(i => Math.min(i + 1, TOTAL_CARDS - 1));
      cardAnim.setValue(0);
      Animated.timing(cardAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start(() => {
        isAnimating.current = false;
      });
    });
  }

  function isCurrentCardReady(idx: number): boolean {
    if (idx <= CARD.WHY_WE_THINK)            return p1 !== null;
    if (idx <= CARD.TIMELINE)                return p2 !== null;
    return p3 !== null;
  }

  function canAdvance(): boolean {
    if (cardIndex >= TOTAL_CARDS - 1) return false;
    if (cardIndex === CARD.OPTIMISED_GOAL && p3 && !p3.feasible) return pathChoice !== null;
    return isCurrentCardReady(cardIndex) && isCurrentCardReady(cardIndex + 1);
  }

  // ── Card content resolver ────────────────────────────────────────────────────

  function renderCardContent(idx: number): React.ReactNode {
    switch (idx) {
      case CARD.WHAT_YOU_SAID:
        return <CardText text={p1?.whatYouSaid ?? ''} />;
      case CARD.WHAT_WE_MEAN:
        return <CardText text={p1?.whatWeMean ?? ''} />;
      case CARD.WHY_WE_THINK:
        return <CardText text={p1?.whyWeThinkThat ?? ''} />;
      case CARD.CURRENT_REALITY:
        return <CardText text={p2?.currentReality ?? ''} />;
      case CARD.ADVANTAGES:
        return <CardText text={p2?.advantages ?? ''} />;
      case CARD.CHALLENGES:
        return <CardText text={p2?.challenges ?? ''} />;
      case CARD.WHAT_MUST_CHANGE:
        return <CardText text={p2?.whatMustChange ?? ''} />;
      case CARD.TIMELINE:
        return <CardText text={p2?.timeline ?? ''} />;
      case CARD.SCIENTIFIC_TRANSLATION:
        return <CardText text={p3?.scientificTranslation ?? ''} />;
      case CARD.REALITY_ASSESSMENT:
        return <CardText text={p3?.realityAssessment ?? ''} />;
      case CARD.OPTIMISED_GOAL:
        return renderOptimisedGoalCard();
      case CARD.FIRST_MILESTONE:
        return renderMilestoneCard();
      case CARD.LONG_TERM_VISION:
        return renderVisionCard();
      default:
        return null;
    }
  }

  function renderOptimisedGoalCard(): React.ReactNode {
    if (!p3) return null;
    if (p3.feasible) {
      return (
        <>
          <View style={styles.targetRow}>
            <View style={styles.targetChip}>
              <Text style={styles.targetChipLabel}>TARGET WEIGHT</Text>
              <Text style={styles.targetChipValue}>{p3.optimisedGoal.targetWeightKg} kg</Text>
            </View>
            <View style={styles.targetChip}>
              <Text style={styles.targetChipLabel}>TARGET BF%</Text>
              <Text style={styles.targetChipValue}>{p3.optimisedGoal.targetBFPercent}%</Text>
            </View>
          </View>
          <CardText text={p3.optimisedGoal.description} />
        </>
      );
    }

    const inf = p3 as Phase3InfeasibleResult;
    return (
      <View style={styles.optionsList}>
        <Text style={styles.optionsIntro}>
          The literal goal isn't achievable naturally — but what you're after IS. Choose your path:
        </Text>
        <OptionCard
          letter="A"
          title={inf.optionA.title}
          description={inf.optionA.description}
          selected={pathChoice === 'a'}
          onSelect={() => {
            setPathChoice('a');
            saveUserProfile({
              targetWeightKg: inf.optionA.targetWeightKg || undefined,
              targetBFPercent: inf.optionA.targetBFPercent || undefined,
              goalPathChoice: 'a',
            });
          }}
        />
        <OptionCard
          letter="B"
          title={inf.optionB.title}
          description={inf.optionB.description}
          selected={pathChoice === 'b'}
          onSelect={() => {
            setPathChoice('b');
            saveUserProfile({
              targetWeightKg: inf.optionB.targetWeightKg || undefined,
              targetBFPercent: inf.optionB.targetBFPercent || undefined,
              goalPathChoice: 'b',
            });
          }}
        />
      </View>
    );
  }

  function renderMilestoneCard(): React.ReactNode {
    if (!p3) return null;
    if (p3.feasible) return <CardText text={p3.firstMilestone} />;
    const inf = p3 as Phase3InfeasibleResult;
    const text = pathChoice === 'b' ? inf.firstMilestoneB : inf.firstMilestoneA;
    return <CardText text={text} />;
  }

  function renderVisionCard(): React.ReactNode {
    if (!p3) return null;
    if (p3.feasible) return <CardText text={p3.longTermVision} />;
    const inf = p3 as Phase3InfeasibleResult;
    const text = pathChoice === 'b' ? inf.longTermVisionB : inf.longTermVisionA;
    return <CardText text={text} />;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const isLastCard = cardIndex >= TOTAL_CARDS - 1;
  const ready = isCurrentCardReady(cardIndex);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Analysis</Text>
        <Text style={styles.headerCount}>{cardIndex + 1} / {TOTAL_CARDS}</Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === cardIndex && styles.dotActive, i < cardIndex && styles.dotDone]}
          />
        ))}
      </View>

      {/* Card area */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {ready
          ? (
            <CardShell cardIndex={cardIndex} anim={cardAnim}>
              {renderCardContent(cardIndex)}
            </CardShell>
          )
          : <CardLoading cardIndex={cardIndex} />
        }
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isLastCard ? (
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('ExecutionPlan')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>See my execution plan</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.cta, !canAdvance() && styles.ctaDisabled]}
            onPress={advanceCard}
            disabled={!canAdvance()}
            activeOpacity={0.85}
          >
            {!isCurrentCardReady(cardIndex + 1) ? (
              <>
                <ActivityIndicator size="small" color={colors.text.inverse} style={{ marginRight: 8 }} />
                <Text style={styles.ctaText}>Preparing next…</Text>
              </>
            ) : (
              <>
                <Text style={styles.ctaText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.text.inverse} style={{ marginLeft: 4 }} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  headerCount:  { ...typography.footnote, color: colors.text.muted },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border.default,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  dotDone: {
    backgroundColor: colors.primary + '55',
  },

  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  cardLoading: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.elevated,
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    ...typography.label,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardBodyText: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  cardLoadingBody: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cardLoadingText: {
    ...typography.callout,
    color: colors.text.muted,
  },

  // ── Optimised goal target chips ───────────────────────────────────────────────
  targetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  targetChip: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.sm,
    alignItems: 'center',
  },
  targetChipLabel: {
    ...typography.label,
    color: colors.text.muted,
    marginBottom: 3,
  },
  targetChipValue: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Option A/B ────────────────────────────────────────────────────────────────
  optionsList: {
    gap: spacing.md,
  },
  optionsIntro: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
    marginBottom: spacing.xs,
  },
  optionCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  optionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  optionBadgeText: {
    ...typography.label,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  optionTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionDesc: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // ── Footer ────────────────────────────────────────────────────────────────────
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
  cta: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  ctaText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
});
