import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Photos'>;

export function PhotosScreen(_: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Photos</Text>
      </View>

      <View style={s.body}>
        <View style={s.emptyGrid}>
          <Ionicons name="camera-outline" size={40} color={colors.text.muted} />
          <Text style={s.emptyTitle}>Start your visual journey</Text>
          <Text style={s.emptyDesc}>
            Progress photos are the most honest record of your transformation. One photo now is worth more than any number later.
          </Text>
        </View>

        <TouchableOpacity style={s.addBtn} activeOpacity={0.85}>
          <Ionicons name="camera" size={18} color={colors.text.inverse} style={{ marginRight: 6 }} />
          <Text style={s.addBtnText}>Take a photo</Text>
        </TouchableOpacity>

        <Text style={s.hint}>
          Photos are stored privately on your device. You choose what the AI sees.
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
    alignItems: 'stretch',
  },
  emptyGrid: {
    flex: 1,
    maxHeight: 280,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.footnote,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  addBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
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
