/**
 * modules/plan/home/components/StreakModal.tsx
 *
 * The full-sheet modal that slides up when the user taps the STREAK pill. Shows
 * the current streak count in days, the three flame columns, a condition row for
 * each flame explaining how to light it, and the Mon–Sun dot row showing which
 * days of the current week had a full streak. Tapping a flame column shows an
 * Alert explaining what that flame requires.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { FlameCol } from './FlameCol';
import type { FlameState } from './FlameCol';
import { STREAK_FLAMES } from './FlameCol';

export function StreakModal({
  visible,
  flames,
  fullStreak,
  weekDots,
  onClose,
}: {
  visible:    boolean;
  flames:     FlameState;
  fullStreak: number;
  weekDots:   boolean[];
  onClose:    () => void;
}) {
  const insets = useSafeAreaInsets();

  const handleFlamePress = (f: typeof STREAK_FLAMES[number]) => {
    const status = flames[f.key] ? '✅ Already lit today!' : '🔲 Not lit yet.';
    Alert.alert(
      `${f.label} Flame`,
      `${status}\n\nCondition:\n${f.condition}\n\nHow to complete it:\n${f.howTo}`,
      [{ text: 'Got it' }],
    );
  };

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDow   = (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>

        <View style={s.handleRow}>
          <View style={s.handle} />
        </View>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <Ionicons name="flame" size={17} color={colors.primary} />
            <Text style={s.title}>DAY STREAK</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Full streak badge */}
          <View style={s.badgeCard}>
            <View style={s.badgeLeft}>
              <Text style={s.badgeNum}>{fullStreak}</Text>
              <Text style={s.badgeDays}>{fullStreak === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={s.badgeRight}>
              <Text style={s.badgeTitle}>FULL STREAK</Text>
              <Text style={s.badgeSub}>Consecutive days with all three flames lit</Text>
            </View>
          </View>

          {/* Three flames + condition rows */}
          <View style={s.flameCard}>
            <Text style={s.sectionLabel}>TODAY — TAP A FLAME TO SEE ITS CONDITION</Text>
            <View style={s.flameRow}>
              {STREAK_FLAMES.map((f, i) => (
                <React.Fragment key={f.key}>
                  {i > 0 && <View style={s.vSep} />}
                  <FlameCol
                    color={f.color}
                    lit={flames[f.key]}
                    label={f.label}
                    onPress={() => handleFlamePress(f)}
                  />
                </React.Fragment>
              ))}
            </View>
            {STREAK_FLAMES.map(f => (
              <TouchableOpacity
                key={f.key}
                style={s.condRow}
                onPress={() => handleFlamePress(f)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={flames[f.key] ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={flames[f.key] ? f.color : colors.text.disabled}
                />
                <Text style={[s.condText, flames[f.key] && { color: f.color }]}>
                  {f.condition}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.text.disabled} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Weekly dots (Mon–Sun) */}
          <View style={s.weekCard}>
            <View style={s.weekHeader}>
              <Ionicons name="trending-up" size={13} color={colors.primary} />
              <Text style={s.sectionLabel}>THIS WEEK</Text>
            </View>
            <View style={s.weekRow}>
              {weekDots.map((complete, i) => {
                const isToday = i === todayDow;
                return (
                  <View key={i} style={s.dayCol}>
                    <View style={[
                      s.dot,
                      complete && { backgroundColor: colors.primary },
                      isToday && s.dotToday,
                    ]} />
                    <Text style={[s.dayLabel, isToday && s.dayLabelToday]}>
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={s.weekLegend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={s.legendText}>ALL THREE LIT</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: colors.bg.elevated }]} />
                <Text style={s.legendText}>INCOMPLETE</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg.app },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingBottom: 12 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:     { fontFamily: typography.fonts.display, fontSize: 20, color: colors.text.primary, letterSpacing: 0.5 },

  scroll: { padding: spacing.screenPadding, gap: spacing.md },

  badgeCard:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.primaryBorder, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeLeft:  { alignItems: 'center', paddingVertical: 4, gap: 2 },
  badgeNum:   { fontFamily: typography.fonts.display, fontSize: 52, color: colors.primary, includeFontPadding: false },
  badgeDays:  { ...typography.label, color: colors.primary, letterSpacing: 1 },
  badgeRight: { flex: 1, gap: 4 },
  badgeTitle: { ...typography.label, color: colors.primary },
  badgeSub:   { ...typography.caption, color: colors.text.muted, lineHeight: 16 },

  flameCard:    { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  sectionLabel: { ...typography.label, color: colors.text.muted, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4 },
  flameRow:     { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  vSep:         { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border.subtle },

  condRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  condText: { ...typography.footnote, color: colors.text.muted, flex: 1, lineHeight: 18 },

  weekCard:      { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, gap: spacing.md },
  weekHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:        { alignItems: 'center', gap: 5, flex: 1 },
  dot:           { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg.elevated },
  dotToday:      { borderWidth: 2, borderColor: colors.primaryBorder },
  dayLabel:      { ...typography.caption, color: colors.text.disabled, fontSize: 9 },
  dayLabelToday: { color: colors.primary },
  weekLegend:    { flexDirection: 'row', gap: spacing.md },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendText:    { ...typography.caption, color: colors.text.muted, fontSize: 9 },
});
