import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Shop'>;

const PILLARS = [
  { icon: 'shield-checkmark-outline', text: 'Third-party tested products only' },
  { icon: 'close-circle-outline',     text: 'No clones, no fake supplements' },
  { icon: 'star-outline',             text: 'Verified return policies and support' },
  { icon: 'person-outline',           text: 'Coach recommends based on your goals' },
] as const;

export function ShopScreen(_: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Shop</Text>
      </View>

      <View style={s.body}>
        <View style={s.hero}>
          <Ionicons name="bag-outline" size={40} color={colors.text.muted} />
          <Text style={s.heroTitle}>Coming soon</Text>
          <Text style={s.heroDesc}>
            A curated marketplace for gym products — every item tested and vetted. No fakes, no clones, no questionable brands.
          </Text>
        </View>

        <View style={s.pillarList}>
          {PILLARS.map((p) => (
            <View key={p.text} style={s.pillarRow}>
              <Ionicons name={p.icon as any} size={16} color={colors.success} />
              <Text style={s.pillarText}>{p.text}</Text>
            </View>
          ))}
        </View>
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
  hero: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  heroTitle: {
    ...typography.title3,
    color: colors.text.primary,
  },
  heroDesc: {
    ...typography.callout,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  pillarList: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  pillarText: {
    ...typography.callout,
    color: colors.text.secondary,
  },
});
