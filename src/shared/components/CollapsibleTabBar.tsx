import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export interface TabItem {
  id: string;
  label: string;
  icon: string;
}

interface Props {
  tabs: readonly TabItem[];
  active: string;
  onSelect: (id: string) => void;
  accent: string;
}

export function CollapsibleTabBar({ tabs, active, onSelect, accent }: Props) {
  const [folded, setFolded] = useState(false);

  return (
    <View style={[cs.bar, folded ? cs.barFolded : cs.barExpanded]}>
      <View style={cs.row}>
        {tabs.map((tab) => {
          const on = tab.id === active;
          if (folded) {
            return (
              <TouchableOpacity
                key={tab.id}
                style={[cs.pill, on && { backgroundColor: accent + '28', borderColor: accent + '77' }]}
                onPress={() => onSelect(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[cs.pillText, on && { color: accent }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={tab.id}
              style={[cs.tile, on && { backgroundColor: accent + '22', borderColor: accent + '99' }]}
              onPress={() => onSelect(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon as any} size={20} color={on ? accent : colors.text.muted} />
              <Text style={[cs.tileLabel, on && { color: accent }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setFolded((f) => !f)}
          style={cs.toggleBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={folded ? 'chevron-down' : 'chevron-up'}
            size={14}
            color={colors.text.muted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  barExpanded: { paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.md },
  barFolded: { paddingHorizontal: spacing.screenPadding, paddingVertical: 8 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  tile: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileLabel: {
    ...typography.caption,
    color: colors.text.muted,
    fontWeight: '500',
    textAlign: 'center',
  },

  pill: {
    flex: 1,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.muted,
    letterSpacing: 0.2,
  },

  toggleBtn: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
