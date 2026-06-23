import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
import { ChatView } from '@/shared/components/ChatView';
import { nutritionCoachChat } from '@/services/ai/nutritionCoach';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Diet'>;
};

const ACCENT = colors.success;

const TABS = [
  {
    id: 'coach',
    icon: 'chatbubble-ellipses-outline',
    label: 'Coach',
    desc: 'Ask your AI nutritionist anything — macros, meal ideas, or how to log a specific food accurately.',
  },
  {
    id: 'plan',
    icon: 'document-text-outline',
    label: 'Plan',
    desc: 'Your fixed daily meal plan. Build one with your coach or add foods from the Kerala food library.',
  },
  {
    id: 'today',
    icon: 'today-outline',
    label: 'Today',
    desc: "Log everything you ate today. Your coach asks the right questions to make sure the data is accurate.",
  },
  {
    id: 'history',
    icon: 'time-outline',
    label: 'History',
    desc: 'Review your nutrition data. Free users get 30 days. Premium keeps it all.',
  },
] as const;

type TabId = typeof TABS[number]['id'];

export function DietScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<TabId>('coach');

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
        <Text style={s.headerTitle}>Diet</Text>
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
      {active === 'coach' ? (
        <ChatView
          onSend={nutritionCoachChat}
          accent={ACCENT}
          welcomeMessage="Hi! I'm your nutrition coach. Tell me what you've eaten, ask about macros, or get meal ideas that fit your targets."
          placeholder="Ask about food…"
        />
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
