import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Progress'>;

export function ProgressScreen(_: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Progress</Text>
      </View>

      <View style={s.body}>
        {/* Chart placeholder */}
        <View style={s.chartArea}>
          <Ionicons name="trending-up-outline" size={32} color={colors.text.muted} />
          <Text style={s.chartLabel}>Weight graph appears here</Text>
          <Text style={s.chartSub}>Log your weight for a few days to see the trend</Text>
        </View>

        <View style={s.divider} />

        <TouchableOpacity style={s.logBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color={colors.text.inverse} style={{ marginRight: 6 }} />
          <Text style={s.logBtnText}>Log today's weight</Text>
        </TouchableOpacity>

        <Text style={s.hint}>
          Weigh yourself first thing in the morning before eating or drinking — same conditions every day give the most accurate trend.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  chartArea: {
    height: 200,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chartLabel: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  chartSub: {
    ...typography.footnote,
    color: colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  logBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
  hint: {
    ...typography.footnote,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
