/**
 * modules/plan/home/components/StreakCelebrationModal.tsx
 *
 * A semi-transparent overlay modal that auto-pops when the user earns a new streak
 * milestone (more flames lit than yesterday, or streak count increased). It shows a
 * congratulatory message with the new flame count and streak length, and is dismissed
 * by tapping anywhere. PlanScreen controls when this appears via the ack mechanism —
 * once dismissed it won't show again until the next real milestone.
 *
 * Also exports the CelebData type that PlanScreen uses to pass celebration data in.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { FlameCol } from './FlameCol';
import type { FlameState } from './FlameCol';
import { STREAK_FLAMES } from './FlameCol';

export type CelebData = {
  flames:         FlameState;
  fullStreak:     number;
  prevFlameCount: number;
  prevFullStreak: number;
};

export function StreakCelebrationModal({
  visible,
  data,
  onDismiss,
}: {
  visible:   boolean;
  data:      CelebData | null;
  onDismiss: () => void;
}) {
  if (!data) return null;

  const { flames, fullStreak, prevFlameCount, prevFullStreak } = data;
  const flameCount = [flames.diet, flames.gym, flames.activity].filter(Boolean).length;
  const streakRose = fullStreak > prevFullStreak;
  const newFlames  = flameCount > prevFlameCount;
  const allThree   = flameCount === 3;

  const heading = allThree
    ? 'FULL DAY 🔥'
    : streakRose
    ? `DAY ${fullStreak} STREAK`
    : `${flameCount}/3 TODAY`;

  const sub = allThree
    ? 'All three flames burning. Perfect day.'
    : streakRose && newFlames
    ? `Streak extended to ${fullStreak} day${fullStreak !== 1 ? 's' : ''}. Keep it up.`
    : streakRose
    ? `Streak extended to ${fullStreak} day${fullStreak !== 1 ? 's' : ''}.`
    : `${STREAK_FLAMES.filter(f => flames[f.key]).map(f => f.label).join(' + ')} lit. ${3 - flameCount} to go.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.flameRow}>
            {STREAK_FLAMES.map((f, i) => (
              <React.Fragment key={f.key}>
                {i > 0 && <View style={s.vSep} />}
                <FlameCol
                  color={f.color}
                  lit={flames[f.key]}
                  label={f.label}
                  onPress={onDismiss}
                />
              </React.Fragment>
            ))}
          </View>

          <View style={s.msgBlock}>
            <Text style={s.heading}>{heading}</Text>
            <Text style={s.sub}>{sub}</Text>
          </View>

          <TouchableOpacity style={s.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={s.btnText}>Nice!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  card:     { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.primaryBorder, width: '100%', overflow: 'hidden' },
  flameRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  vSep:     { width: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
  msgBlock: { alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 6 },
  heading:  { fontFamily: typography.fonts.display, fontSize: 26, color: colors.text.primary, letterSpacing: 0.5, textAlign: 'center' },
  sub:      { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },
  btn:      { margin: spacing.md, marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.button, height: spacing.buttonHeight, alignItems: 'center', justifyContent: 'center' },
  btnText:  { ...typography.subhead, color: colors.text.inverse, fontWeight: '700' },
});
