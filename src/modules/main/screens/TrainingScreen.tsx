import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
import { TrainerIntroView } from '@/shared/components/TrainerIntroView';
import { loadUserName } from '@/services/storage/local/userStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Training'>;
};

const ACCENT = colors.primary;

const TABS = [
  {
    id: 'trainer',
    icon: 'fitness-outline',
    label: 'Trainer',
    desc: 'Your AI trainer helps you build a personalised routine from scratch or refine what you already have.',
  },
  {
    id: 'routine',
    icon: 'list-outline',
    label: 'Routine',
    desc: 'Your weekly schedule from Monday to Sunday — exercises, weights, sets, reps, and rest days.',
  },
  {
    id: 'today',
    icon: 'pencil-outline',
    label: 'Today',
    desc: "Log today's sets and reps as you train. Tracks your current weights and progression.",
  },
  {
    id: 'history',
    icon: 'time-outline',
    label: 'History',
    desc: 'Your training logs over time. Spot trends, track progression, and see how far you have come.',
  },
] as const;

type TabId = typeof TABS[number]['id'];

export function TrainingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<TabId>('trainer');
  const [userName, setUserName] = useState<string>('');
  const [nameLoaded, setNameLoaded] = useState(false);

  useEffect(() => {
    loadUserName().then((name) => {
      setUserName(name ?? '');
      setNameLoaded(true);
    });
  }, []);

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
        <Text style={s.headerTitle}>Training</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab nav */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
          const on = tab.id === active;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tabBtn, on && { backgroundColor: ACCENT + '22', borderColor: ACCENT + '99' }]}
              onPress={() => setActive(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon as any} size={22} color={on ? ACCENT : colors.text.muted} />
              <Text style={[s.tabLabel, on && { color: ACCENT }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {active === 'trainer' ? (
        nameLoaded ? (
          <TrainerIntroView userName={userName} accent={ACCENT} />
        ) : (
          <View style={{ flex: 1 }} />
        )
      ) : (
        <View style={s.content}>
          <View style={[s.contentIcon, { backgroundColor: ACCENT + '18' }]}>
            <Ionicons name={current.icon as any} size={32} color={ACCENT} />
          </View>
          <Text style={s.contentTitle}>{current.label}</Text>
          <Text style={s.contentDesc}>{current.desc}</Text>
        </View>
      )}
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

  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  tabBtn: {
    flex: 1,
    height: 68,
    borderRadius: 14,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabLabel: {
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '500',
    textAlign: 'center',
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
