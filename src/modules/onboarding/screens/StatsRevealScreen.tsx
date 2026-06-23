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
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'StatsReveal'>;
  route: RouteProp<OnboardingStackParamList, 'StatsReveal'>;
};

// ─── Activity level display labels ───────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'sedentary',
  light: 'lightly active',
  moderate: 'moderately active',
  active: 'very active',
  extreme: 'athlete-level active',
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  extreme: 1.9,
};

// ─── Section types ────────────────────────────────────────────────────────────

interface Section {
  icon: string;
  iconColor: string;
  title: string;
  lines: { label?: string; value: string; accent?: boolean }[];
  note?: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function StatsRevealScreen({ navigation, route }: Props) {
  const { stats } = route.params;
  const insets = useSafeAreaInsets();
  const calcs = computeBodyStats(stats);

  const multiplier = ACTIVITY_MULTIPLIERS[stats.activityLevel] ?? 1.55;
  const activityLabel = ACTIVITY_LABELS[stats.activityLevel] ?? stats.activityLevel;
  const methodLabel = calcs.estimationMethod === 'navy'
    ? 'the US Navy circumference method'
    : 'the Deurenberg BMI formula';
  const methodAccuracy = calcs.estimationMethod === 'navy'
    ? '±3–4% on honest measurements'
    : '±5–7% — less precise, but workable';

  // Sections derived from actual stats
  const sections: Section[] = [
    {
      icon: 'flame-outline',
      iconColor: colors.primaryLight,
      title: 'Why your maintenance is ~' + calcs.tdee + ' kcal',
      lines: [
        {
          label: 'Step 1 — Basal Metabolic Rate',
          value: `Your body burns ${calcs.bmr} kcal just existing — lying still, breathing, keeping organs running. This was calculated using the Mifflin-St Jeor formula: 10 × weight + 6.25 × height − 5 × age${stats.sex === 'male' ? ' + 5' : ' − 161'}.`,
        },
        {
          label: 'Step 2 — Activity multiplier',
          value: `You described yourself as ${activityLabel}. That maps to a multiplier of ${multiplier}x. ${calcs.bmr} × ${multiplier} = ${calcs.tdee} kcal.`,
          accent: true,
        },
        {
          label: 'What this means',
          value: `Eat less than ${calcs.tdee} kcal and you lose weight. Eat more and you gain. The distance between these two determines everything — how fast, how sustainable, and what you retain.`,
        },
      ],
      note: 'The activity multiplier is the shakiest part of this equation. Most people overestimate how active they are. If the plan feels off after a few weeks, this is the first number we revisit.',
    },
    {
      icon: 'body-outline',
      iconColor: calcs.bfColor === 'success' ? colors.success : calcs.bfColor === 'gold' ? colors.gold : colors.danger,
      title: 'Why your body fat is ~' + calcs.bfPercent + '%',
      lines: [
        {
          label: 'Method used',
          value: `Your body fat was estimated using ${methodLabel}. Accuracy: ${methodAccuracy}.`,
        },
        ...(calcs.estimationMethod === 'navy'
          ? [
              {
                label: 'How it works',
                value: `The Navy method uses neck, waist${stats.sex !== 'male' ? ', and hip' : ''} circumferences plugged into a log formula. It's the most accurate non-scan method available without a lab. Small measurement errors compound — a 1 cm mistake shifts the result by ~1%.`,
              },
            ]
          : [
              {
                label: "Why it's less precise",
                value: `Without neck and waist measurements, we fell back to the Deurenberg BMI formula. BMI doesn't distinguish muscle from fat — two people at the same BMI can have very different body compositions. Treat this as a directional estimate only.`,
              },
            ]),
        {
          label: 'What your number means',
          value: `${calcs.bfPercent}% puts you in the ${calcs.bfCategory.toLowerCase()} range. ${
            calcs.bfCategory === 'Athletic'
              ? "You're already lean. The aesthetic gains from here come from adding muscle, not losing more fat."
              : calcs.bfCategory === 'Fit'
              ? "You're in good shape. Small improvements here have outsized visual impact."
              : calcs.bfCategory === 'Average'
              ? "There's meaningful room to improve. The good news: you'll see visible changes relatively quickly."
              : "There's a lot of room to improve, and the results will be dramatic. Early progress tends to be the fastest."
          }`,
          accent: true,
        },
      ],
    },
    {
      icon: 'barbell-outline',
      iconColor: colors.info,
      title: 'Your ' + calcs.lbmKg + ' kg lean mass — what it is and why it matters',
      lines: [
        {
          label: 'What it is',
          value: `Lean body mass is everything that isn't fat — muscle, bone, organs, water, connective tissue. Yours is ${calcs.lbmKg} kg out of ${stats.weightKg} kg total.`,
        },
        {
          label: 'Why the plan protects it',
          value: `When you lose weight, you want to lose fat. In practice, hard cuts without enough protein and training also consume muscle. Every program here is designed to preserve your ${calcs.lbmKg} kg while reducing the ${calcs.fatMassKg} kg of fat.`,
        },
        {
          label: 'FFMI: ' + calcs.ffmi,
          value: `Your Fat-Free Mass Index — lean mass relative to height — is ${calcs.ffmi}. This gives us a measure of your muscular development independent of how lean or heavy you are. Average is around 18–19 for men, 15–16 for women. It shapes the build target in your plan.`,
          accent: true,
        },
      ],
    },
    {
      icon: 'alert-circle-outline',
      iconColor: colors.gold,
      title: 'The honest part: these are educated starting points',
      lines: [
        {
          value: `Every number on this screen is an estimate. A well-calibrated and science backed estimate — but an estimate. Body fat formulas have inherent error margins. And your daily activity "sedentary" and "light" or whatever is too rough and general. Your metabolism may run slightly hotter or cooler than the formula predicts.`,
        },
        {
          label: 'How you calibrate them',
          value: `But Gymman has a solution for you. Just log your daily weight in the app early morning before you eat anything. Use the Calory Burn section in the app to track your actual daily activity level. Log what you eat, log your workouts. Everything is easy and simple in our app. Real numbers emerge from real data. After 3–4 weeks of logging honest food intake and tracking your weight daily, we at Gymman would automatically change your data to the real data. Then, it won't be mere estimates. It will be data backed strategy.`,
          accent: true,
        },
        {
          label: 'What never changes',
          value: `The direction is never wrong. Whether your maintenance is ${calcs.tdee - 80} or ${calcs.tdee + 80} kcal, the principles are identical. You eat at a deficit to lose fat, a surplus to build muscle, and you protect lean mass either way. And Gymman will always tell you what to do to reach your goal. If confused, just ask Gymman. We have an In-Built 24/7 coach for that very reason.`,
        },
      ],
      note: 'Think of the first week as data collection, not just execution. The more honestly you log, the faster the numbers become truly yours.',
    },
    {
      icon: 'trending-up-outline',
      iconColor: colors.success,
      title: 'What gets sharper over time',
      lines: [
        {
          value: `Week 1–2: Baseline is set. The app tracks everything about you, and creates your completely realistic numbers and plans.`,
        },
        {
          value: `Week 3–4: Weight trend emerges. If you're losing ~0.5 kg/week on a 500 kcal deficit, the numbers are accurate. If not — we recalibrate. The app always does a weekly check, so forever, our algorithm will keep becoming better at working for you.`,
          accent: true,
        },
        {
          value: `Month 2+: You stop using the formula. Your logged history becomes the data source. Now, Gymman knows you better than you do yourself. And it will help you reach that fitness goal. By hook or by crook.`,
        },
        {
          label: 'The goal',
          value: `A coach's job in session 1 is to build the best possible starting model with the information available. That's what these numbers are. The model gets better. You get sharper. The plan will evolve with you.`,
          accent: true,
        },
      ],
    },
  ];

  // Staggered entrance animations
  const sectionAnims = useRef(sections.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = sectionAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 320,
        delay: 100 + i * 100,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start();
  }, []);

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
        <Text style={styles.headerTitle}>Behind the Numbers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Here's how the coach thinks.</Text>
          <Text style={styles.heroSub}>
            Every number we showed you came from somewhere. This is the reasoning — the formulas, the assumptions, and where the estimates still have room to sharpen.
          </Text>
        </View>

        {/* Sections */}
        <View style={styles.sectionList}>
          {sections.map((section, si) => (
            <Animated.View
              key={si}
              style={{
                opacity: sectionAnims[si],
                transform: [
                  {
                    translateY: sectionAnims[si].interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.sectionCard}>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: section.iconColor + '20' }]}>
                    <Ionicons name={section.icon as any} size={18} color={section.iconColor} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>

                {/* Lines */}
                <View style={styles.lineList}>
                  {section.lines.map((line, li) => (
                    <View
                      key={li}
                      style={[
                        styles.line,
                        line.accent && styles.lineAccent,
                        li > 0 && styles.lineWithDivider,
                      ]}
                    >
                      {line.label && (
                        <Text style={styles.lineLabel}>{line.label}</Text>
                      )}
                      <Text style={[styles.lineValue, line.accent && styles.lineValueAccent]}>
                        {line.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Footer note */}
                {section.note && (
                  <View style={styles.noteRow}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.noteText}>{section.note}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('GoalAnalysis', { stats, goalText: route.params.goalText, startOnAnalysis: true })}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Analyse my goal</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} style={{ marginLeft: 6 }} />
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
    marginBottom: spacing.xl,
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

  sectionList: {
    gap: spacing.md,
  },

  sectionCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
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
  sectionTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },

  lineList: {
    gap: 0,
  },
  line: {
    gap: 4,
    paddingVertical: spacing.sm,
  },
  lineWithDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  lineAccent: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  lineLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lineValue: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  lineValueAccent: {
    color: colors.text.primary,
  },

  noteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  noteText: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },

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
});
