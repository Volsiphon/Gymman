/**
 * modules/plan/bloodwork/components/PrepTipsCard.tsx
 *
 * Expandable "before your draw" card: fasting, timing, training, alcohol,
 * hydration, and biotin tips for accurate lab results. Starts expanded when
 * the user has no logs yet.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const PREP_TIPS = [
  { icon: 'time-outline'    as const, text: 'Fast for 8–12 hours beforehand (water is fine).' },
  { icon: 'sunny-outline'   as const, text: 'Get tested 7–10 AM, especially for testosterone and cortisol.' },
  { icon: 'barbell-outline' as const, text: 'Avoid intense training 24–48 h before — CK and some hormones shift after hard sessions.' },
  { icon: 'wine-outline'    as const, text: 'No alcohol for 24–48 hours.' },
  { icon: 'water-outline'   as const, text: 'Stay well hydrated the morning of the draw.' },
  { icon: 'flask-outline'   as const, text: 'High-dose biotin users: pause 2–3 days before — it interferes with several lab assays.' },
];

export function PrepTipsCard({ startExpanded }: { startExpanded: boolean }) {
  const [open, setOpen] = useState(startExpanded);

  return (
    <View style={pt.card}>
      <TouchableOpacity style={pt.header} onPress={() => setOpen(v => !v)} activeOpacity={0.75}>
        <View style={pt.iconWrap}>
          <Ionicons name="time-outline" size={17} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pt.title}>BEFORE YOUR DRAW</Text>
          <Text style={pt.sub}>How to get accurate, consistent results</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.muted} />
      </TouchableOpacity>

      {open && (
        <>
          <View style={pt.dividerTop} />
          {PREP_TIPS.map((tip, i) => (
            <View key={i} style={pt.row}>
              <View style={pt.rowIcon}>
                <Ionicons name={tip.icon} size={14} color={colors.gold} />
              </View>
              <Text style={pt.rowText}>{tip.text}</Text>
            </View>
          ))}
          <View style={pt.noteSep} />
          <View style={pt.note}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
            <Text style={pt.noteText}>
              Got a DEXA scan, VO₂ max test, or blood pressure reading? Share it in the{' '}
              <Text style={pt.noteHighlight}>Coach tab</Text>
              {' '}— it complements your bloodwork and helps refine your plan.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const pt = StyleSheet.create({
  card:      { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md },
  iconWrap:  { width: 32, height: 32, borderRadius: radius.full, backgroundColor: 'rgba(234,179,8,0.12)', alignItems: 'center', justifyContent: 'center' },
  title:     { ...typography.label, color: colors.gold },
  sub:       { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  dividerTop:{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginHorizontal: spacing.md },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 9 },
  rowIcon:   { width: 20, alignItems: 'center', paddingTop: 1 },
  rowText:   { ...typography.callout, color: colors.text.secondary, flex: 1, lineHeight: 20 },
  noteSep:   { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginHorizontal: spacing.md, marginTop: 4 },
  note:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.md, paddingTop: 10 },
  noteText:  { ...typography.footnote, color: colors.text.muted, flex: 1, lineHeight: 18 },
  noteHighlight: { color: colors.primary, fontFamily: typography.fonts.semibold },
});
