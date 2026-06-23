import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'PlanHome'>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ─── Tracker bar ─────────────────────────────────────────────────────────────

const TRACKER_ITEMS = [
  { icon: 'nutrition-outline', label: 'Diet',     value: '—',          color: colors.success, done: false },
  { icon: 'barbell-outline',   label: 'Training', value: 'Not logged', color: colors.primary, done: false },
  { icon: 'flame-outline',     label: 'Cal Burn', value: '—',          color: colors.gold,    done: false },
] as const;

function TrackerBar() {
  return (
    <View style={tr.bar}>
      {TRACKER_ITEMS.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={tr.sep} />}
          <View style={tr.cell}>
            <Ionicons
              name={item.icon as any}
              size={13}
              color={item.done ? item.color : colors.text.disabled}
            />
            <View style={tr.text}>
              <Text style={tr.cellLabel}>{item.label}</Text>
              <Text style={[tr.cellValue, item.done && { color: item.color }]}>
                {item.value}
              </Text>
            </View>
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={item.done ? colors.success : colors.border.strong}
            />
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const tr = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.xs,
  },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    gap: 6,
  },
  text: { flex: 1, gap: 1 },
  cellLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cellValue: {
    ...typography.footnote,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionProps {
  accent: string;
  icon: string;
  title: string;
  stat: string;
  meta: string;
  onPress: () => void;
}

function SectionCard({ accent, icon, title, stat, meta, onPress }: SectionProps) {
  return (
    <TouchableOpacity style={cd.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[cd.iconCircle, { backgroundColor: accent + '22' }]}>
        <Ionicons name={icon as any} size={22} color={accent} />
      </View>

      <View style={cd.textBlock}>
        <Text style={cd.title}>{title}</Text>
        <Text style={cd.meta}>{meta}</Text>
      </View>

      <Text style={[cd.stat, { color: accent }]}>{stat}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
  },
  meta: {
    ...typography.caption,
    color: colors.text.muted,
  },
  stat: {
    ...typography.footnote,
    fontWeight: '600',
    flexShrink: 0,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export function PlanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const sections: SectionProps[] = [
    {
      accent:  colors.success,
      icon:    'nutrition-outline',
      title:   'Diet',
      stat:    '0/2,100 kcal',
      meta:    'P 0g  ·  C 0g  ·  F 0g',
      onPress: () => navigation.navigate('Diet'),
    },
    {
      accent:  colors.primary,
      icon:    'barbell-outline',
      title:   'Training',
      stat:    'Rest day',
      meta:    'Nothing logged today',
      onPress: () => navigation.navigate('Training'),
    },
    {
      accent:  colors.gold,
      icon:    'flame-outline',
      title:   'Calory Burn',
      stat:    '0 kcal',
      meta:    'Dynamic mode: off',
      onPress: () => navigation.navigate('CaloryBurn'),
    },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.date}>{getTodayLabel()}</Text>
        </View>
        <View style={s.streakBadge}>
          <Ionicons name="flame" size={16} color={colors.text.muted} />
          <Text style={s.streakNum}>0</Text>
          <Text style={s.streakDay}>day</Text>
        </View>
      </View>

      {/* Tracker */}
      <TrackerBar />

      {/* Section cards */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: spacing.tabBarHeight + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((sec) => (
          <SectionCard key={sec.title} {...sec} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  greeting: {
    ...typography.title3,
    color: colors.text.primary,
  },
  date: {
    ...typography.footnote,
    color: colors.text.muted,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.card,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  streakNum: {
    ...typography.subhead,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  streakDay: {
    ...typography.caption,
    color: colors.text.muted,
  },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm + 4,
  },
});
