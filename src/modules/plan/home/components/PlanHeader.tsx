/**
 * modules/plan/home/components/PlanHeader.tsx
 *
 * The top bar of PlanScreen: the GYMMAN logo on the left, a STREAK pill button on
 * the right (glows gold when any flame is lit), and a 7-DAY pill below it. Tapping
 * STREAK opens StreakModal; tapping 7-DAY navigates to the weekly review screen.
 * The flamesLit prop controls whether the streak pill is highlighted.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export function PlanHeader({
  onStreak,
  onSevenDay,
  onAccount,
  flamesLit,
}: {
  onStreak:   () => void;
  onSevenDay: () => void;
  onAccount:  () => void;
  flamesLit:  number;
}) {
  return (
    <View style={s.row}>
      <View style={s.brand}>
        <Ionicons name="flame" size={20} color={colors.primary} />
        <Text style={s.appName}>GYMMAN</Text>
      </View>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.accountBtn} onPress={onAccount} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="person-circle-outline" size={22} color={colors.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.pill, flamesLit > 0 && s.pillLit]} onPress={onStreak}>
          <Ionicons name="flame" size={11} color={flamesLit > 0 ? colors.primary : colors.text.muted} />
          <Text style={[s.pillText, flamesLit > 0 && s.pillTextLit]}>STREAK</Text>
          {flamesLit > 0 && <Text style={s.flameCount}>{flamesLit}/3</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.pill} onPress={onSevenDay}>
          <Text style={s.pillText}>7-DAY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenPadding, paddingVertical: 12, gap: 10 },
  brand:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appName:     { fontFamily: typography.fonts.display, fontSize: 20, color: colors.text.primary, letterSpacing: 1 },
  btnRow:      { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'flex-end', alignItems: 'center' },
  accountBtn:  { padding: 2 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.subtle },
  pillLit:     { borderColor: colors.primaryBorder, backgroundColor: colors.primaryMuted },
  pillText:    { ...typography.label, color: colors.text.muted },
  pillTextLit: { color: colors.primary },
  flameCount:  { ...typography.label, color: colors.primary, fontSize: 10 },
});
