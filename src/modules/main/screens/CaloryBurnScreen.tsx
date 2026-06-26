import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
import { CollapsibleTabBar } from '@/shared/components/CollapsibleTabBar';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'CaloryBurn'>;
};

const ACCENT = colors.gold;

const TABS = [
  {
    id: 'today',
    icon: 'add-circle-outline',
    label: 'Today',
    desc: "Log your activities and see how many calories you've burned. Enable Dynamic Mode to link this to your diet targets.",
  },
  {
    id: 'history',
    icon: 'time-outline',
    label: 'History',
    desc: 'Your activity and calory burn data over time. Spot patterns in how much you move on different days.',
  },
] as const;

type TabId = typeof TABS[number]['id'];

export function CaloryBurnScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<TabId>('today');

  const current = TABS.find((t) => t.id === active)!;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Calory Burn</Text>
        <View style={{ width: 24 }} />
      </View>

      <CollapsibleTabBar
        tabs={TABS}
        active={active}
        onSelect={(id) => setActive(id as TabId)}
        accent={ACCENT}
      />

      {/* Placeholder content */}
      <View style={s.content}>
        <View style={[s.contentIcon, { backgroundColor: ACCENT + '18' }]}>
          <Ionicons name={current.icon as any} size={32} color={ACCENT} />
        </View>
        <Text style={s.contentTitle}>{current.label}</Text>
        <Text style={s.contentDesc}>{current.desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  headerTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: spacing.md,
  },
  contentIcon: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTitle: {
    ...typography.title3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  contentDesc: {
    ...typography.callout,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
