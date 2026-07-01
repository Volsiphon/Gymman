/**
 * modules/plan/bloodwork/components/AddLogModal.tsx
 *
 * Full-screen form for entering lab values: a date row, the three collapsible
 * metric tiers (Essential / Performance / Advanced) with one input per marker,
 * and a free-text notes field. Only filled-in values are saved.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BloodworkLog } from '@/services/storage/local/bloodworkStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { TIER_GROUPS, todayIso, uid, filledCount } from '../utils';

const ACCENT       = colors.danger;
const ACCENT_MUTED = colors.dangerMuted;

type AddLogModalProps = {
  onClose: () => void;
  onSave:  (log: BloodworkLog) => void;
};

export function AddLogModal({ onClose, onSave }: AddLogModalProps) {
  const insets = useSafeAreaInsets();
  const [date,          setDate]          = useState(todayIso());
  const [values,        setValues]        = useState<Record<string, string>>({});
  const [notes,         setNotes]         = useState('');
  const [openTiers,     setOpenTiers]     = useState<Set<number>>(new Set([1]));

  const setVal = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleTier = useCallback((tier: number) => {
    setOpenTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  }, []);

  const filled   = filledCount(values);
  const canSave  = filled > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ id: uid(), date: date.trim() || todayIso(), metrics: values, notes: notes.trim() });
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[am.root, { backgroundColor: colors.bg.app, paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <View style={am.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={am.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={am.title}>New Log</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[am.save, !canSave && am.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* ── Date row ── */}
        <View style={am.dateRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.text.muted} />
          <Text style={am.dateLabel}>DATE</Text>
          <TextInput
            style={am.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.disabled}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setDate(todayIso())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={am.todayChip}>Today</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={am.scroll}
            contentContainerStyle={[am.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={am.hint}>Fill in whatever values you have from your lab report. Leave the rest blank.</Text>

            {TIER_GROUPS.map(({ tier, label, sub, color, categories }) => {
              const isOpen   = openTiers.has(tier);
              const tierFill = categories.reduce((n, g) =>
                n + g.metrics.filter(m => (values[m.key] ?? '').trim()).length, 0);

              return (
                <View key={tier} style={am.tierBlock}>
                  <TouchableOpacity
                    style={am.tierHeader}
                    onPress={() => toggleTier(tier)}
                    activeOpacity={0.75}
                  >
                    <View style={[am.tierDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[am.tierLabel, { color }]}>{label}</Text>
                      <Text style={am.tierSub}>{sub}</Text>
                    </View>
                    {tierFill > 0 && (
                      <View style={[am.badge, { backgroundColor: color + '22' }]}>
                        <Text style={[am.badgeText, { color }]}>{tierFill}</Text>
                      </View>
                    )}
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.text.muted} />
                  </TouchableOpacity>

                  {isOpen && categories.map(({ category, metrics }) => (
                    <View key={category} style={am.catBlock}>
                      <Text style={am.catLabel}>{category.toUpperCase()}</Text>
                      {metrics.map(m => (
                        <View key={m.key} style={am.metricRow}>
                          <Text style={am.metricName} numberOfLines={1}>{m.label}</Text>
                          <TextInput
                            style={am.metricInput}
                            value={values[m.key] ?? ''}
                            onChangeText={v => setVal(m.key, v)}
                            placeholder={m.unit}
                            placeholderTextColor={colors.text.disabled}
                            returnKeyType="next"
                            keyboardType="default"
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}

            {/* Notes */}
            <View style={am.notesBlock}>
              <Text style={am.catLabel}>NOTES</Text>
              <TextInput
                style={am.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How you felt, doctor's comments, anything worth remembering…"
                placeholderTextColor={colors.text.disabled}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  cancel:      { ...typography.callout, color: colors.text.muted },
  title:       { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  save:        { ...typography.callout, color: ACCENT, fontWeight: '600' },
  saveDisabled:{ color: colors.text.disabled },

  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.screenPadding, paddingVertical: 12, backgroundColor: colors.bg.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  dateLabel:   { ...typography.label, color: colors.text.muted },
  dateInput:   { flex: 1, ...typography.callout, color: colors.text.primary, padding: 0 },
  todayChip:   { ...typography.caption, color: ACCENT, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ACCENT_MUTED, borderRadius: radius.badge },

  scroll:        { flex: 1 },
  scrollContent: { padding: spacing.screenPadding, gap: spacing.sm },
  hint:          { ...typography.footnote, color: colors.text.muted, textAlign: 'center', paddingVertical: spacing.xs },

  tierBlock:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md },
  tierDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  tierLabel:  { ...typography.subhead, fontWeight: '600' },
  tierSub:    { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  badge:      { borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  badgeText:  { ...typography.label, fontWeight: '700' },

  catBlock:   { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 },
  catLabel:   { ...typography.label, color: colors.text.muted, marginTop: 12, marginBottom: 4 },
  metricRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.elevated, borderRadius: radius.input, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  metricName: { ...typography.footnote, color: colors.text.secondary, flex: 1 },
  metricInput:{ ...typography.callout, color: colors.text.primary, width: 90, textAlign: 'right', padding: 0 },

  notesBlock:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md },
  notesInput:  { ...typography.callout, color: colors.text.primary, backgroundColor: colors.bg.elevated, borderRadius: radius.input, padding: 12, minHeight: 88 },
});
