/**
 * modules/plan/home/components/AccountModal.tsx
 *
 * Full-sheet account overview. Three sections:
 *   1. Subscription — current tier badge + upgrade CTA
 *   2. Your Numbers — every stat we know from onboarding + computed body comp
 *   3. Streak & Week — full streak badge + Mon–Sun activity dots
 *
 * Opens from the account icon in PlanHeader (to the left of the STREAK pill).
 */

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/app/providers/SubscriptionProvider';
import type { UserProfile, NutritionGoals } from '@/types/user';
import type { FlameState } from './FlameCol';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null, unit: string, decimals = 0): string | null {
  if (n == null || isNaN(n)) return null;
  return `${n.toFixed(decimals)} ${unit}`;
}

function fmtKcal(n: number | undefined | null): string | null {
  if (n == null || isNaN(n)) return null;
  return `${Math.round(n).toLocaleString()} kcal`;
}

function activityLabel(a: string): string {
  const map: Record<string, string> = {
    sedentary: 'Sedentary',
    light:     'Lightly Active',
    moderate:  'Moderately Active',
    very:      'Very Active',
    extra:     'Extremely Active',
  };
  return map[a] ?? a;
}

function goalLabel(g: string | undefined): string | null {
  if (!g) return null;
  const map: Record<string, string> = {
    lose_fat:      'Lose Fat',
    gain_muscle:   'Gain Muscle',
    body_recomp:   'Body Recomp',
    maintain:      'Maintain',
  };
  return map[g] ?? g;
}

function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon?: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={s.sectionLabelRow}>
      {icon && <Ionicons name={icon} size={12} color={colors.text.muted} />}
      <Text style={s.sectionLabelText}>{label}</Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ── Main component ────────────────────────────────────────────────────────────

const TIER_META = {
  free: {
    label:    'FREE',
    color:    colors.text.muted,
    bg:       colors.bg.elevated,
    border:   colors.border.default,
    upgradeTo: 'premium' as const,
    upgradeLabel: 'Upgrade to Premium',
  },
  premium: {
    label:    'PREMIUM',
    color:    colors.gold,
    bg:       colors.goldMuted,
    border:   'rgba(234,179,8,0.30)',
    upgradeTo: 'ultra' as const,
    upgradeLabel: 'Upgrade to Ultra',
  },
  ultra: {
    label:    'ULTRA',
    color:    colors.primary,
    bg:       colors.primaryMuted,
    border:   colors.primaryBorder,
    upgradeTo: null,
    upgradeLabel: null,
  },
} as const;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AccountModal({
  visible,
  onClose,
  profile,
  goals,
  fullStreak,
  weekDots,
  flames,
}: {
  visible:    boolean;
  onClose:    () => void;
  profile:    UserProfile | null;
  goals:      NutritionGoals;
  fullStreak: number;
  weekDots:   boolean[];
  flames:     FlameState;
}) {
  const insets      = useSafeAreaInsets();
  const { tier, setTier } = useSubscription();
  const meta        = TIER_META[tier];
  const todayDow    = (new Date().getDay() + 6) % 7;

  function handleSwitchTier() {
    Alert.alert(
      'Switch Tier (Dev)',
      `Currently on ${tier.toUpperCase()}`,
      [
        { text: tier === 'free'    ? '✓ Free'    : 'Free',    onPress: () => setTier('free') },
        { text: tier === 'premium' ? '✓ Premium' : 'Premium', onPress: () => setTier('premium') },
        { text: tier === 'ultra'   ? '✓ Ultra'   : 'Ultra',   onPress: () => setTier('ultra') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  const computedBMI = profile ? bmi(profile.weightKg, profile.heightCm) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>

        {/* Handle */}
        <View style={s.handleRow}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Ionicons name="person-circle-outline" size={18} color={colors.text.muted} />
            <Text style={s.headerTitle}>ACCOUNT</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── User identity row ─────────────────────────────────── */}
          <View style={s.identityRow}>
            <View style={s.avatarCircle}>
              <Ionicons name="person" size={28} color={colors.text.muted} />
            </View>
            <View style={s.identityText}>
              <Text style={s.userName}>{profile?.name ?? 'You'}</Text>
              <View style={[s.tierBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Text style={[s.tierLabel, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
          </View>

          {/* ── Subscription card ─────────────────────────────────── */}
          <View style={[s.subCard, { borderColor: meta.border }]}>
            <View style={s.subCardLeft}>
              <Text style={[s.subTierText, { color: meta.color }]}>{meta.label}</Text>
              {tier === 'free' && (
                <Text style={s.subDesc}>20 AI messages/day · 1 photo scan/day · 1 photo section</Text>
              )}
              {tier === 'premium' && (
                <Text style={s.subDesc}>200 AI messages/day · Unlimited scans · 5 photo sections</Text>
              )}
              {tier === 'ultra' && (
                <Text style={s.subDesc}>Unlimited everything · Claude & GPT models · Unlimited sections</Text>
              )}
            </View>
            <View style={s.subActions}>
              {meta.upgradeLabel && (
                <TouchableOpacity style={s.upgradeBtn} onPress={handleSwitchTier} activeOpacity={0.8}>
                  <Text style={s.upgradeBtnText}>{meta.upgradeLabel}</Text>
                  <Ionicons name="arrow-forward" size={13} color={colors.text.inverse} />
                </TouchableOpacity>
              )}
              {tier === 'ultra' && (
                <View style={s.unlockBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={s.unlockText}>All features unlocked</Text>
                </View>
              )}
              <TouchableOpacity style={s.devBtn} onPress={handleSwitchTier} activeOpacity={0.75}>
                <Ionicons name="swap-vertical-outline" size={12} color={colors.text.disabled} />
                <Text style={s.devBtnText}>Dev · Switch Tier</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Your Numbers ──────────────────────────────────────── */}
          <SectionLabel icon="barbell-outline" label="YOUR NUMBERS" />

          {/* Nutrition */}
          <View style={s.card}>
            <Text style={s.cardSectionHead}>NUTRITION TARGETS</Text>
            {goals.calories > 0 && <StatRow label="Calorie Target" value={`${goals.calories.toLocaleString()} kcal`} />}
            {goals.protein > 0  && <><Divider /><StatRow label="Protein"  value={`${goals.protein} g`} /></>}
            {goals.carbs > 0    && <><Divider /><StatRow label="Carbs"    value={`${goals.carbs} g`} /></>}
            {goals.fats > 0     && <><Divider /><StatRow label="Fats"     value={`${goals.fats} g`} /></>}
            {profile?.bmr  != null && <><Divider /><StatRow label="BMR"  value={fmtKcal(profile.bmr)!} /></>}
            {profile?.tdee != null && <><Divider /><StatRow label="TDEE" value={fmtKcal(profile.tdee)!} /></>}
          </View>

          {/* Body */}
          {profile && (
            <View style={s.card}>
              <Text style={s.cardSectionHead}>BODY & GOAL</Text>
              <StatRow label="Weight"   value={fmt(profile.weightKg, 'kg', 1)!} />
              <Divider />
              <StatRow label="Height"   value={fmt(profile.heightCm, 'cm', 0)!} />
              <Divider />
              <StatRow label="Age"      value={`${profile.age}`} />
              <Divider />
              <StatRow label="Sex"      value={profile.sex === 'male' ? 'Male' : 'Female'} />
              {computedBMI != null && <><Divider /><StatRow label="BMI" value={computedBMI.toFixed(1)} /></>}
              {profile.bfPercent != null && <><Divider /><StatRow label="Body Fat"  value={`${profile.bfPercent.toFixed(1)} %`} /></>}
              {profile.lbmKg     != null && <><Divider /><StatRow label="Lean Mass" value={fmt(profile.lbmKg, 'kg', 1)!} /></>}
              {profile.fatMassKg != null && <><Divider /><StatRow label="Fat Mass"  value={fmt(profile.fatMassKg, 'kg', 1)!} /></>}
              {goalLabel(profile.goalType) && <><Divider /><StatRow label="Goal" value={goalLabel(profile.goalType)!} /></>}
              {profile.targetWeightKg  != null && <><Divider /><StatRow label="Target Weight" value={fmt(profile.targetWeightKg, 'kg', 1)!} /></>}
              {profile.targetBFPercent != null && <><Divider /><StatRow label="Target Body Fat" value={`${profile.targetBFPercent.toFixed(1)} %`} /></>}
              <Divider />
              <StatRow label="Activity"   value={activityLabel(profile.activityLevel)} />
              <Divider />
              <StatRow label="Dietary"    value={profile.dietary} />
            </View>
          )}

          {/* Measurements (optional) */}
          {profile && (profile.neckCm || profile.waistCm || profile.hipCm) && (
            <View style={s.card}>
              <Text style={s.cardSectionHead}>MEASUREMENTS</Text>
              {profile.neckCm  != null && <StatRow label="Neck"  value={fmt(profile.neckCm, 'cm', 1)!} />}
              {profile.waistCm != null && <><Divider /><StatRow label="Waist" value={fmt(profile.waistCm, 'cm', 1)!} /></>}
              {profile.hipCm   != null && <><Divider /><StatRow label="Hips"  value={fmt(profile.hipCm, 'cm', 1)!} /></>}
            </View>
          )}

          {/* ── Streak & Week ─────────────────────────────────────── */}
          <SectionLabel icon="flame-outline" label="STREAK & WEEK" />

          {/* Streak badge */}
          <View style={s.streakCard}>
            <View style={s.streakLeft}>
              <Text style={s.streakNum}>{fullStreak}</Text>
              <Text style={s.streakUnit}>{fullStreak === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={s.streakRight}>
              <Text style={s.streakTitle}>FULL STREAK</Text>
              <Text style={s.streakSub}>Consecutive days with all three flames lit</Text>
              <View style={s.flameRow}>
                {(['diet', 'gym', 'activity'] as const).map((k, i) => (
                  <Ionicons
                    key={k}
                    name="flame"
                    size={16}
                    color={flames[k]
                      ? i === 0 ? colors.flame.one : i === 1 ? colors.flame.two : colors.flame.three
                      : colors.text.disabled}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Week dots */}
          <View style={s.weekCard}>
            <View style={s.weekHeaderRow}>
              <Ionicons name="trending-up" size={12} color={colors.primary} />
              <Text style={s.cardSectionHead}>THIS WEEK</Text>
            </View>
            <View style={s.weekRow}>
              {weekDots.map((complete, i) => {
                const isToday = i === todayDow;
                return (
                  <View key={i} style={s.dayCol}>
                    <View style={[
                      s.dot,
                      complete   && { backgroundColor: colors.primary },
                      isToday    && s.dotToday,
                    ]} />
                    <Text style={[s.dayLabel, isToday && { color: colors.primary }]}>
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg.app },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle },

  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingBottom: 12 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { fontFamily: typography.fonts.display, fontSize: 20, color: colors.text.primary, letterSpacing: 0.5 },

  scroll: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.sm, gap: spacing.sm },

  // Identity
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  avatarCircle: {
    width: spacing.avatarLg, height: spacing.avatarLg, borderRadius: radius.full,
    backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  identityText: { gap: 6 },
  userName:  { ...typography.title2, color: colors.text.primary },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  tierLabel: { ...typography.label, letterSpacing: 0.8, fontSize: 11 },

  // Subscription card
  subCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, padding: spacing.md, gap: spacing.sm,
  },
  subCardLeft:  { gap: 4 },
  subTierText:  { fontFamily: typography.fonts.display, fontSize: 22, letterSpacing: 1 },
  subDesc:      { ...typography.footnote, color: colors.text.muted, lineHeight: 18 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary, borderRadius: radius.button,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  upgradeBtnText: { ...typography.bodyMedium, color: colors.text.inverse },
  unlockBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  unlockText:     { ...typography.footnote, color: colors.primary },
  subActions: { gap: spacing.sm },
  devBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.default,
  },
  devBtnText: { ...typography.caption, color: colors.text.disabled },

  // Section label
  sectionLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: spacing.sm, paddingBottom: 2 },
  sectionLabelText: { ...typography.label, color: colors.text.muted, letterSpacing: 0.8 },

  // Card
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden',
  },
  cardSectionHead: {
    ...typography.label, color: colors.text.muted, letterSpacing: 0.8,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },

  // Stat row
  statRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 13,
  },
  statLabel: { ...typography.body, color: colors.text.secondary },
  statValue: { ...typography.bodyMedium, color: colors.text.primary },
  divider:   { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginHorizontal: spacing.md },

  // Streak
  streakCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.primaryBorder,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  streakLeft:  { alignItems: 'center', paddingVertical: 4, gap: 2 },
  streakNum:   { fontFamily: typography.fonts.display, fontSize: 52, color: colors.primary, includeFontPadding: false },
  streakUnit:  { ...typography.label, color: colors.primary, letterSpacing: 1 },
  streakRight: { flex: 1, gap: 6 },
  streakTitle: { ...typography.label, color: colors.primary },
  streakSub:   { ...typography.caption, color: colors.text.muted, lineHeight: 16 },
  flameRow:    { flexDirection: 'row', gap: 4 },

  // Week
  weekCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, gap: spacing.md,
  },
  weekHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:        { alignItems: 'center', gap: 5, flex: 1 },
  dot:           { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg.elevated },
  dotToday:      { borderWidth: 2, borderColor: colors.primaryBorder },
  dayLabel:      { ...typography.caption, color: colors.text.disabled, fontSize: 9 },
});
