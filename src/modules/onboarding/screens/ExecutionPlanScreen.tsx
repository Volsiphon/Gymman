import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { OnboardingStackParamList } from '@/navigation/navigation';
import { computeBodyStats } from '@/modules/onboarding/utils/fitnessCalculations';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'ExecutionPlan'>;
  route: RouteProp<OnboardingStackParamList, 'ExecutionPlan'>;
};

type GoalType =
  | 'fat-loss'
  | 'muscle-gain'
  | 'recomp'
  | 'non-body-comp-minor'
  | 'non-body-comp-major';

function classifyGoal(goalText: string, bfPercent: number, sex: string): GoalType {
  const lower = goalText.toLowerCase();

  const majorKeywords = [
    'injury', 'injuri', 'surgery', 'sciatica', 'arthritis',
    'herniat', 'disc', 'fracture', 'ligament', 'chronic pain',
    'chronic', 'rehab',
  ];
  const postureKeywords = [
    'posture', 'slouch', 'hunch', 'rounded shoulder', 'forward head',
  ];
  const bodyCompKeywords = [
    'lose', 'gain', 'fat', 'muscle', 'weight', 'bulk', 'cut', 'lean', 'slim',
  ];

  if (majorKeywords.some(k => lower.includes(k))) return 'non-body-comp-major';
  if (
    postureKeywords.some(k => lower.includes(k)) &&
    !bodyCompKeywords.some(k => lower.includes(k))
  ) {
    return 'non-body-comp-minor';
  }

  const gainScore = [
    'gain', 'build', 'muscle', 'bulk', 'mass', 'bigger', 'stronger', 'strength', 'grow',
  ].filter(k => lower.includes(k)).length;
  const lossScore = [
    'lose', 'loss', 'cut', 'lean', 'slim', 'shred', 'fat', 'weight', 'thinner', 'reduce', 'drop',
  ].filter(k => lower.includes(k)).length;

  if (gainScore > lossScore) return 'muscle-gain';
  if (lossScore > gainScore) return 'fat-loss';

  const likelyHighBF = sex === 'female' ? bfPercent > 28 : bfPercent > 20;
  return likelyHighBF ? 'fat-loss' : 'recomp';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ExecutionPlanScreen({ navigation, route }: Props) {
  const { stats, goalText } = route.params;
  const insets = useSafeAreaInsets();
  const calcs = computeBodyStats(stats);

  const goalType = classifyGoal(goalText, calcs.bfPercent, stats.sex);
  const isBodyComp =
    goalType !== 'non-body-comp-minor' && goalType !== 'non-body-comp-major';

  const calorieTarget =
    goalType === 'fat-loss'
      ? calcs.tdee - 500
      : goalType === 'muscle-gain'
      ? calcs.tdee + 250
      : calcs.tdee;

  const proteinGrams = Math.round(
    calcs.lbmKg *
      (goalType === 'fat-loss' ? 2.2 : goalType === 'muscle-gain' ? 1.8 : 2.0),
  );

  const weeklyProgressLabel =
    goalType === 'fat-loss'
      ? '~0.5 kg of fat per week'
      : goalType === 'muscle-gain'
      ? '~0.2–0.3 kg of lean mass per month'
      : 'gradual body composition shift';

  const anims = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.parallel(
      anims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 320,
          delay: 80 + i * 90,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  function a(i: number) {
    return {
      opacity: anims[i],
      transform: [
        {
          translateY: anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [16, 0],
          }),
        },
      ],
    };
  }

  // ─── Energy state visual ─────────────────────────────────────────────────────

  function renderEnergyStates() {
    const states: {
      label: string;
      icon: React.ComponentProps<typeof Ionicons>['name'];
      color: string;
      active: boolean;
      desc: string;
    }[] = [
      {
        label: 'Deficit',
        icon: 'trending-down-outline',
        color: colors.danger,
        active: goalType === 'fat-loss',
        desc: `< ${calcs.tdee} kcal`,
      },
      {
        label: 'Maintain',
        icon: 'remove-outline',
        color: colors.gold,
        active: goalType === 'recomp',
        desc: `${calcs.tdee} kcal`,
      },
      {
        label: 'Surplus',
        icon: 'trending-up-outline',
        color: colors.success,
        active: goalType === 'muscle-gain',
        desc: `> ${calcs.tdee} kcal`,
      },
    ];

    return (
      <View style={styles.energyRow}>
        {states.map((s, i) => (
          <View
            key={i}
            style={[
              styles.energyChip,
              s.active && {
                backgroundColor: s.color + '22',
                borderColor: s.color + '55',
              },
            ]}
          >
            <Ionicons
              name={s.icon}
              size={16}
              color={s.active ? s.color : colors.text.disabled}
            />
            <Text style={[styles.energyLabel, s.active && { color: s.color }]}>
              {s.label}
            </Text>
            <Text style={[styles.energyDesc, s.active && { color: s.color + 'BB' }]}>
              {s.desc}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // ─── Body composition path ───────────────────────────────────────────────────

  function renderBodyComp() {
    const heroTitle =
      goalType === 'fat-loss'
        ? "Here's how you lose the fat."
        : goalType === 'muscle-gain'
        ? "Here's how you build the muscle."
        : "Here's how you recomp your body.";

    const heroSub =
      goalType === 'fat-loss'
        ? `You want less fat. The mechanic is simple: eat less than you burn. Everything below is built around that principle.`
        : goalType === 'muscle-gain'
        ? `You want more muscle. The mechanic: eat more than you burn and give your body a reason to build. Everything below serves that.`
        : `You want to shift your body composition without a major weight change. Slower than a cut or bulk — but you lose fat and gain muscle at the same time.`;

    const deficitLabel =
      goalType === 'fat-loss'
        ? `Eat below ${calcs.tdee} kcal and your body burns stored fat to cover the gap. A 500 kcal daily deficit = roughly 0.5 kg of fat gone per week.`
        : goalType === 'muscle-gain'
        ? `Eat above ${calcs.tdee} kcal and your body has surplus energy to build new tissue. Keep it small — too big and the extra goes to fat, not muscle.`
        : `Eat at exactly ${calcs.tdee} kcal. Your body taps into fat stores to fund muscle-building. It's the slowest path but the most efficient one.`;

    return (
      <>
        <Animated.View style={[styles.hero, a(0)]}>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
        </Animated.View>

        {/* The mechanic */}
        <Animated.View style={[styles.card, a(1)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons name="flash-outline" size={18} color={colors.primaryLight} />
            </View>
            <Text style={styles.cardTitle}>The core mechanic: energy balance</Text>
          </View>
          <Text style={styles.cardBody}>
            Your body runs on calories. Every day you burn roughly {calcs.tdee} kcal just existing and moving around. That number is your maintenance — the tipping point between losing weight and gaining it.
          </Text>
          {renderEnergyStates()}
          <Text style={styles.cardBody}>{deficitLabel}</Text>
        </Animated.View>

        {/* Calorie target */}
        <Animated.View style={[styles.card, a(2)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>Your daily calorie target</Text>
          </View>

          <View style={styles.targetBox}>
            <Text style={styles.targetNumber}>{calorieTarget}</Text>
            <Text style={styles.targetUnit}>kcal / day</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
            <Text style={styles.metaText}>
              {Math.abs(calorieTarget - calcs.tdee)} kcal{' '}
              {goalType === 'fat-loss'
                ? 'below'
                : goalType === 'muscle-gain'
                ? 'above'
                : 'at'}{' '}
              your maintenance of {calcs.tdee} kcal. Expected pace: {weeklyProgressLabel}.
            </Text>
          </View>

          <View style={styles.warningNote}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.gold} />
            <Text style={styles.warningNoteText}>
              This is a starting estimate. Your real maintenance could be 80–150 kcal off in either direction. Log your food and morning weight for 7 days — Gymman recalibrates automatically to your actual metabolism.
            </Text>
          </View>
        </Animated.View>

        {/* Protein */}
        <Animated.View style={[styles.card, a(3)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="barbell-outline" size={18} color={colors.info} />
            </View>
            <Text style={styles.cardTitle}>Protein — your most important number</Text>
          </View>

          <View style={styles.targetBox}>
            <Text style={[styles.targetNumber, { color: colors.info }]}>{proteinGrams}</Text>
            <Text style={styles.targetUnit}>grams / day</Text>
          </View>

          <Text style={styles.cardBody}>
            {goalType === 'fat-loss'
              ? `A deficit tells your body to break down stored energy — but without enough protein, it breaks down muscle too. ${proteinGrams}g a day keeps your ${calcs.lbmKg} kg of lean mass intact. This number matters more than the calorie count.`
              : goalType === 'muscle-gain'
              ? `Protein is the raw material for new muscle. Without enough, the calorie surplus just becomes fat. ${proteinGrams}g/day gives your body what it needs to actually build.`
              : `In a recomp, protein does double duty — protecting existing muscle while also providing material for new growth. ${proteinGrams}g/day is your non-negotiable floor.`}
          </Text>
          <Text style={styles.cardMeta}>
            {(proteinGrams / calcs.lbmKg).toFixed(1)} g per kg of lean mass ·{' '}
            {calcs.lbmKg} kg lean body mass
          </Text>
        </Animated.View>

        {/* Week 1 */}
        <Animated.View style={[styles.card, a(4)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.gold + '20' }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.gold} />
            </View>
            <Text style={styles.cardTitle}>What to actually do in week 1</Text>
          </View>

          <View style={styles.stepList}>
            {[
              `Eat close to ${calorieTarget} kcal daily. Within 100–150 kcal either side is fine — precision comes with time.`,
              `Hit ${proteinGrams}g of protein. When in doubt, prioritise this over the calorie number.`,
              `Weigh yourself every morning before eating or drinking. One number, one time. Log it in the app.`,
              `After 7 days, Gymman compares your weight trend against your reported intake and recalibrates your real maintenance. Week 1 is calibration — the plan sharpens after.`,
            ].map((text, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </>
    );
  }

  // ─── Non-body-comp path ──────────────────────────────────────────────────────

  function renderNonBodyComp() {
    const isMinor = goalType === 'non-body-comp-minor';

    return (
      <>
        <Animated.View style={[styles.hero, a(0)]}>
          <Text style={styles.heroTitle}>
            {isMinor
              ? 'This one needs a professional first.'
              : 'This one is outside what we safely build plans for.'}
          </Text>
          <Text style={styles.heroSub}>
            {isMinor
              ? `Posture problems are structural. A 30-minute physio assessment tells you more than any app. We can share some general thoughts — but we won't build a routine.`
              : `Injuries, chronic conditions, and rehab paths carry real risk. An AI-generated routine for these can cause genuine, lasting harm. We won't do that.`}
          </Text>
        </Animated.View>

        {/* Why no plan */}
        <Animated.View style={[styles.card, a(1)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.dangerMuted }]}>
              <Ionicons name="shield-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.cardTitle}>Why Gymman won't build this plan</Text>
          </View>
          <Text style={styles.cardBody}>
            {isMinor
              ? `Posture corrections depend on the root cause — tight hip flexors, weak glutes, thoracic kyphosis, anterior pelvic tilt. Each has a different fix. The wrong correction makes it worse. No app can safely diagnose this without seeing you move.`
              : `Injury rehabilitation is medical territory. The wrong exercise, the wrong load, the wrong progression — any of these can re-injure or create compensation patterns. A physiotherapist can see and feel what is happening. An AI cannot.`}
          </Text>
        </Animated.View>

        {/* What to do */}
        <Animated.View style={[styles.card, a(2)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.successMuted }]}>
              <Ionicons name="medical-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>What actually helps</Text>
          </View>
          <Text style={styles.cardBody}>
            See a physiotherapist. In Kerala, government physiotherapy clinics are often free or near-free. Private clinics typically charge ₹300–₹800 for an initial consultation — far less than most people expect.
          </Text>
          <View style={styles.infoNote}>
            <Ionicons name="location-outline" size={14} color={colors.info} />
            <Text style={[styles.noteText, { color: colors.info }]}>
              District hospitals and medical college OPDs across Kerala have physiotherapy departments. Your nearest PHC can give you a referral at no cost.
            </Text>
          </View>
        </Animated.View>

        {/* What Gymman can do */}
        <Animated.View style={[styles.card, a(3)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="people-outline" size={18} color={colors.primaryLight} />
            </View>
            <Text style={styles.cardTitle}>Where Gymman fits in</Text>
          </View>
          <Text style={styles.cardBody}>
            Once you have a professional's assessment and plan, bring it to Gymman's Rehabilitation Coach. We'll help you manage execution — tracking sessions, monitoring progress, adjusting around your limitations, and making sure you don't push too far too fast.
          </Text>
          <View style={[styles.primaryNote]}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryLight} />
            <Text style={[styles.noteText, { color: colors.primaryLight }]}>
              Get the professional plan first. Then bring it here — Gymman manages the execution safely.
            </Text>
          </View>
        </Animated.View>

        {/* Minor posture: general thoughts */}
        {isMinor && (
          <Animated.View style={[styles.card, a(4)]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.goldMuted }]}>
                <Ionicons name="bulb-outline" size={18} color={colors.gold} />
              </View>
              <Text style={styles.cardTitle}>Some general thoughts on posture</Text>
            </View>
            <Text style={styles.cardBody}>
              These are broadly safe for most people with sedentary-lifestyle posture issues. Not a personalised routine — just evidence-backed starting points.
            </Text>
            <View style={styles.stepList}>
              {[
                'Strengthen your core with planks, dead bugs, and bird dogs — not crunches. A weak core is the root of most chronic poor posture.',
                'Improve thoracic mobility with foam rolling your upper back and cat-cow stretches. Low-risk and genuinely effective.',
                'Set your screen at eye level. Most desk-related forward head posture is purely an ergonomics issue.',
                'Walk more. Prolonged sitting is often the actual root cause — not a structural deficiency.',
              ].map((text, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{text}</Text>
                </View>
              ))}
            </View>
            <View style={styles.warningNote}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.gold} />
              <Text style={styles.warningNoteText}>
                These are general thoughts, not a diagnosis. If anything causes pain, stop. See a physiotherapist before going further.
              </Text>
            </View>
          </Animated.View>
        )}
      </>
    );
  }

  // ─── Root ─────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Execution Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {isBodyComp ? renderBodyComp() : renderNonBodyComp()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => {
            navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' as never }] });
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>
            {isBodyComp ? "Start tracking — let's go" : "I'll get professional help first"}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.text.inverse}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('GoalDescription')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh-outline"
            size={15}
            color={colors.text.muted}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.ghostBtnText}>Re-describe my goal</Text>
        </TouchableOpacity>
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

  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
  },

  hero: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.title1,
    color: colors.text.primary,
  },
  heroSub: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
  },

  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  cardBody: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  cardMeta: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 18,
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },

  // ─── Energy states ────────────────────────────────────────────────────────
  energyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  energyChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
  },
  energyLabel: {
    ...typography.caption,
    color: colors.text.disabled,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  energyDesc: {
    ...typography.caption,
    color: colors.text.disabled,
    fontSize: 10,
  },

  // ─── Target display ───────────────────────────────────────────────────────
  targetBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  targetNumber: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  targetUnit: {
    ...typography.callout,
    color: colors.text.muted,
    fontWeight: '500',
  },

  // ─── Inline meta ──────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  metaText: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 18,
  },

  // ─── Notes ────────────────────────────────────────────────────────────────
  warningNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.goldMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold + '30',
  },
  warningNoteText: {
    ...typography.footnote,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  infoNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.infoMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  primaryNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  noteText: {
    ...typography.footnote,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },

  // ─── Step list ────────────────────────────────────────────────────────────
  stepList: {
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepBadgeText: {
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '600',
  },
  stepText: {
    ...typography.callout,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 22,
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
  ghostBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  ghostBtnText: {
    ...typography.footnote,
    color: colors.text.muted,
  },
});
