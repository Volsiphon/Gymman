import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/app/navigation';
import { computeBodyStats } from '@/engine/body-metrics';
import type { BodyCompositionStats } from '@/engine/body-metrics';
import { classifyGoal } from '@/engine/goal-engine';
import { calcCalorieTarget, calcMacros } from '@/engine/nutrition';
import { loadUserProfile, profileToStats, saveUserProfile } from '@/services/storage/local/userProfileStorage';
import type { UserProfile } from '@/services/storage/local/userProfileStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'StatsReveal'>;
};

// ─── Info definitions ─────────────────────────────────────────────────────────

type InfoEntry = { term: string; text: string };

const INFOS: Record<string, InfoEntry> = {
  measurements: {
    term: 'Body Measurements',
    text: "Neck, waist, and hip measurements let us estimate your body fat using the US Navy formula — the most accurate method short of a lab scan. A 1 cm measurement error shifts the result by roughly 1%, so honest numbers give better results.",
  },
  activityLevel: {
    term: 'Activity Level',
    text: "How active you are on a typical day. This gets multiplied by your BMR to estimate the total calories you burn daily. That's why our system does weekly result and process analysis to make sure all your data is dynamic and on point. We make sure you progress without any errors in the plan.",
  },
  goalType: {
    term: 'Goal Classification',
    text: "How we interpreted your goal. Fat Loss means your plan runs at a calorie deficit to burn stored fat. Muscle Gain means a small surplus to fuel new muscle growth. Recomposition means eating at roughly maintenance to slowly swap fat for muscle. Non-body-comp goals are referred to professionals.",
  },
  bmi: {
    term: 'BMI — Body Mass Index',
    text: "A rough measure of body size based only on your height and weight. Useful as a quick screening number, but it can't tell muscle from fat — a very muscular person will often score 'overweight' by BMI even if they're lean. We use it as one input, not as a verdict.",
  },
  bodyFat: {
    term: 'Body Fat %',
    text: "What percentage of your total bodyweight is fat. The rest — muscle, bone, organs, water — is lean mass. Lower isn't always better: your body needs some fat for hormones and organ protection. The healthy range differs by sex and age.",
  },
  fatMass: {
    term: 'Fat Mass',
    text: "The actual weight of the fat in your body. When you 'lose fat', this is the number that drops — not just the scale, which can swing up or down with water and muscle too.",
  },
  leanMass: {
    term: 'Lean Mass (LBM)',
    text: "Everything in your body that isn't fat — muscles, bones, organs, and water. Protecting this matters because muscle burns more calories at rest, keeps you strong, and shapes how you look at any weight. Your plan is built around preserving it.",
  },
  ffmi: {
    term: 'FFMI — Fat-Free Mass Index',
    text: "A measure of how much muscle you carry relative to your height, with body fat taken out of the equation. Think of it as a muscularity score. The average is around 18–19 for men and 15–16 for women. It tells us how much room you have to grow.",
  },
  build: {
    term: 'Build',
    text: "A plain-language description of your overall body composition based on your lean mass and fat levels. Two people at the same weight can have very different builds — this gives your plan a more useful starting picture than a single number.",
  },
  bfMethod: {
    term: 'Body Fat Estimation Method',
    text: "How we calculated your body fat percentage. The Navy method uses neck, waist, and hip measurements and is the most accurate non-scan approach available. If those weren't provided, we used a formula based on BMI — less precise, but still useful as a direction.",
  },
  bmr: {
    term: 'BMR — Basal Metabolic Rate',
    text: "The calories your body burns just to stay alive — even if you lay in bed all day. This covers breathing, keeping your heart beating, and running your organs. Think of it as your body's minimum fuel cost before any movement.",
  },
  tdee: {
    term: 'TDEE — Total Daily Energy Expenditure',
    text: "The total calories you burn in a day, including activity. Eat exactly this and your weight holds steady. Eat less and you lose weight. Eat more and you gain. Everything in your nutrition plan is built around this number.",
  },
  calorieTarget: {
    term: 'Calorie Target',
    text: "The daily calories we recommend you eat to reach your goal. It's your maintenance (TDEE) adjusted up or down depending on whether you're trying to lose fat or build muscle. A starting estimate — it sharpens after a week of real data.",
  },
  vsMaintenance: {
    term: 'vs Maintenance',
    text: "How much above or below your maintenance this target sits. A deficit means your body draws on stored fat for energy — that's fat loss. A surplus gives it extra fuel to build muscle. Zero means your weight is expected to hold steady.",
  },
  protein: {
    term: 'Protein',
    text: "The most important number in your plan. Protein builds and repairs muscle, and it's the only macro that can't be substituted when your body runs low. Without enough, especially during a deficit, your body starts breaking down muscle for fuel. Hit this number before worrying about anything else.",
  },
  carbs: {
    term: 'Carbohydrates',
    text: "Your body's preferred fuel — especially for intense exercise. Carbs are stored in muscles as glycogen and burned first during workouts. They also power your brain. Once protein and fat are accounted for, the remaining calories go here.",
  },
  fats: {
    term: 'Dietary Fats',
    text: "Essential for hormone production, vitamin absorption, and brain function. Don't cut these too low — dropping below around 0.3–0.4 g per kg of bodyweight can disrupt hormones and mood. We set them at 25% of your calories, which is a solid healthy baseline.",
  },
};

// ─── Display helpers ──────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  extreme: 'Athlete-Level',
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  'fat-loss': 'Fat Loss',
  'muscle-gain': 'Muscle Gain',
  'recomp': 'Recomposition',
  'non-body-comp-minor': 'Posture / Minor',
  'non-body-comp-major': 'Rehabilitation',
};

const SEX_LABELS: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };

function fmt(n: number | undefined, unit = '', decimals = 1): string {
  if (n === undefined || n === null) return '—';
  return `${Number(n).toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}

function fmtInt(n: number | undefined, unit = ''): string {
  if (n === undefined || n === null) return '—';
  return `${Math.round(n)}${unit ? ' ' + unit : ''}`;
}

// ─── Row ─────────────────────────────────────────────────────────────────────

type RowProps = {
  label: string;
  value: string;
  accent?: string;
  info?: InfoEntry;
  onInfo?: (entry: InfoEntry) => void;
};

function Row({ label, value, accent, info, onInfo }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {info && onInfo && (
          <TouchableOpacity
            onPress={() => onInfo(info)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={styles.infoBtn}
          >
            <Ionicons name="information-circle-outline" size={14} color={colors.text.disabled} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.rowValue, accent ? { color: accent } : null]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  icon,
  iconColor,
  title,
  children,
  anim,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  children: React.ReactNode;
  anim: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.rows}>{children}</View>
    </Animated.View>
  );
}

// ─── Info Modal ───────────────────────────────────────────────────────────────

function InfoModal({
  entry,
  onClose,
  bottomInset,
}: {
  entry: InfoEntry | null;
  onClose: () => void;
  bottomInset: number;
}) {
  return (
    <Modal
      visible={entry !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modal.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[modal.sheet, { paddingBottom: bottomInset + spacing.lg }]}>
        {/* Handle */}
        <View style={modal.handle} />

        {/* Header */}
        <View style={modal.header}>
          <View style={modal.termIcon}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
          </View>
          <Text style={modal.term}>{entry?.term}</Text>
        </View>

        {/* Explanation */}
        <Text style={modal.text}>{entry?.text}</Text>

        {/* CTA */}
        <TouchableOpacity style={modal.btn} onPress={onClose} activeOpacity={0.8}>
          <Text style={modal.btnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function StatsRevealScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calcs, setCalcs] = useState<BodyCompositionStats | null>(null);
  const [activeInfo, setActiveInfo] = useState<InfoEntry | null>(null);

  const anims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    loadUserProfile().then(async p => {
      if (!p) return;
      const s = profileToStats(p);
      const c = computeBodyStats(s);
      // Compute and persist nutrition values if GoalAnalysis hasn't run yet
      if (!p.calorieTarget) {
        const goalType = classifyGoal(p.goalText, c.bfPercent, s.sex);
        const calorieTarget = calcCalorieTarget(c.tdee, goalType);
        const { proteinG, fatsG, carbsG } = calcMacros(calorieTarget, c.lbmKg, goalType);
        const patch = {
          bmr: c.bmr, tdee: c.tdee, bfPercent: c.bfPercent,
          fatMassKg: c.fatMassKg, lbmKg: c.lbmKg,
          goalType, calorieTarget, proteinG, carbsG, fatsG,
          goalOffset: calorieTarget - c.tdee,
        };
        await saveUserProfile(patch);
        p = { ...p, ...patch };
      }
      setProfile(p);
      setCalcs(c);
    });
  }, []);

  useEffect(() => {
    if (!profile || !calcs) return;
    Animated.parallel(
      anims.map((anim, i) =>
        Animated.timing(anim, { toValue: 1, duration: 300, delay: i * 80, useNativeDriver: true }),
      ),
    ).start();
  }, [profile, calcs]);

  if (!profile || !calcs) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const bfAccent =
    calcs.bfColor === 'success' ? colors.success
    : calcs.bfColor === 'gold' ? colors.gold
    : colors.danger;

  const goalOffset = profile.goalOffset;
  const offsetLabel =
    goalOffset === undefined ? '—'
    : goalOffset === 0 ? '0 kcal (maintenance)'
    : goalOffset > 0 ? `+${goalOffset} kcal (surplus)`
    : `${goalOffset} kcal (deficit)`;

  const i = (key: string) => ({
    info: INFOS[key],
    onInfo: setActiveInfo,
  });

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
        <Text style={styles.headerTitle}>Your Stats</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Section 1: Personal ──────────────────────────────────────────── */}
        <Section icon="person-outline" iconColor={colors.primaryLight} title="Personal" anim={anims[0]}>
          <Row label="Name"    value={profile.name} />
          <Row label="Age"     value={`${profile.age} years`} />
          <Row label="Sex"     value={SEX_LABELS[profile.sex] ?? profile.sex} />
          {profile.neckCm  && <Row label="Neck"  value={fmt(profile.neckCm, 'cm')}  {...i('measurements')} />}
          {profile.waistCm && <Row label="Waist" value={fmt(profile.waistCm, 'cm')} {...i('measurements')} />}
          {profile.hipCm   && <Row label="Hip"   value={fmt(profile.hipCm, 'cm')}   {...i('measurements')} />}
          <Row label="Country" value={profile.country} />
          <Row label="Dietary" value={profile.dietary} />
        </Section>

        {/* ── Section 2: Body Composition ──────────────────────────────────── */}
        <Section icon="body-outline" iconColor={colors.gold} title="Body Composition" anim={anims[1]}>
          <Row label="Weight"    value={fmt(profile.weightKg, 'kg')} />
          <Row label="Height"    value={fmtInt(profile.heightCm, 'cm')} />
          <Row label="BMI"       value={fmt(calcs.bmi)}                                                    {...i('bmi')} />
          <Row label="Body Fat"  value={`${fmt(calcs.bfPercent)}%  (${calcs.bfCategory})`} accent={bfAccent} {...i('bodyFat')} />
          <Row label="Fat Mass"  value={fmt(calcs.fatMassKg, 'kg')}                                        {...i('fatMass')} />
          <Row label="Lean Mass" value={fmt(calcs.lbmKg, 'kg')} accent={colors.success}                   {...i('leanMass')} />
          <Row label="FFMI"      value={fmt(calcs.ffmi)}                                                   {...i('ffmi')} />
          <Row label="Build"     value={calcs.buildDescription}                                            {...i('build')} />
          <Row label="BF Method" value={calcs.estimationMethod === 'navy' ? 'US Navy (circumference)' : 'Deurenberg (BMI-based)'} {...i('bfMethod')} />
        </Section>

        {/* ── Section 4: Nutrition Plan ────────────────────────────────────── */}
        <Section icon="nutrition-outline" iconColor={colors.success} title="Nutrition Plan" anim={anims[2]}>
          <Row label="BMR"            value={fmtInt(calcs.bmr, 'kcal')}              {...i('bmr')} />
          <Row label="TDEE"           value={fmtInt(calcs.tdee, 'kcal')}             {...i('tdee')} />
          <Row label="Calorie Target" value={fmtInt(profile.calorieTarget, 'kcal')} accent={colors.primary} {...i('calorieTarget')} />
          <Row label="vs Maintenance" value={offsetLabel}                             {...i('vsMaintenance')} />
          <Row label="Protein"        value={fmtInt(profile.proteinG, 'g')} accent={colors.info}  {...i('protein')} />
          <Row label="Carbs"          value={fmtInt(profile.carbsG, 'g')}            {...i('carbs')} />
          <Row label="Fats"           value={fmtInt(profile.fatsG, 'g')}             {...i('fats')} />
          {profile.targetWeightKg && (
            <Row label="Target Weight" value={fmt(profile.targetWeightKg, 'kg')} accent={colors.success} />
          )}
        </Section>

        {/* ── Section 5: Lifestyle & Goal ──────────────────────────────────── */}
        <Section icon="leaf-outline" iconColor={colors.info} title="Lifestyle & Goal" anim={anims[3]}>
          <Row label="Activity Level" value={ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel} {...i('activityLevel')} />
          {profile.activityDescription && (
            <Row label="How you described it" value={profile.activityDescription} />
          )}
          <Row label="Goal" value={profile.goalText} />
          {profile.goalType && (
            <Row
              label="Classified As"
              value={GOAL_TYPE_LABELS[profile.goalType] ?? profile.goalType}
              accent={colors.primary}
              {...i('goalType')}
            />
          )}
          {(() => {
            const goalType = profile.goalType ?? 'recomp';
            const target = profile.targetWeightKg;
            const lbm = calcs.lbmKg;
            const fat = calcs.fatMassKg;

            const fatToLose =
              (goalType === 'fat-loss' && target)
                ? Math.max(0, Math.round((fat - (target - lbm)) * 10) / 10)
                : null;

            const muscleToGain =
              (goalType === 'muscle-gain' && target)
                ? Math.max(0, Math.round(((target - fat) - lbm) * 10) / 10)
                : null;

            return (
              <>
                <Row
                  label="Fat to Lose"
                  value={
                    fatToLose !== null
                      ? `${fatToLose} kg to go`
                      : "You don't need to lose fat right now"
                  }
                  accent={fatToLose ? colors.danger : colors.text.muted}
                />
                <Row
                  label="Muscle to Gain"
                  value={
                    muscleToGain !== null
                      ? `${muscleToGain} kg to go`
                      : "Not your primary focus right now"
                  }
                  accent={muscleToGain ? colors.success : colors.text.muted}
                />
              </>
            );
          })()}
        </Section>

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('GoalAnalysis')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Analyse my goal</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Info modal */}
      <InfoModal
        entry={activeInfo}
        onClose={() => setActiveInfo(null)}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  loader: {
    flex: 1,
    backgroundColor: colors.bg.app,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: { ...typography.subhead, color: colors.text.secondary },

  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  // ── Section card ─────────────────────────────────────────────────────────────
  section: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // ── Rows ─────────────────────────────────────────────────────────────────────
  rows: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
    gap: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  rowLabel: {
    ...typography.callout,
    color: colors.text.muted,
  },
  infoBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowValue: {
    ...typography.callout,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
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
  },
  continueBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  continueBtnText: { ...typography.bodyMedium, color: colors.text.inverse },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.bg.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border.default,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  termIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  term: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  text: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
  },
  btn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
});
