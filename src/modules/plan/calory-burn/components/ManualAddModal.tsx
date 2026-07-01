/**
 * modules/plan/calory-burn/components/ManualAddModal.tsx
 *
 * Bottom-sheet form for adding an activity by hand: name + calories burned.
 * For users who already know the number; the AI bar on TodayTab estimates it
 * otherwise.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityEntry } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.gold;

export function ManualAddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (entry: Omit<ActivityEntry, 'id'>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name,     setName]     = useState('');
  const [calories, setCalories] = useState('');

  const canAdd = name.trim().length > 0 && calories.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ name: name.trim(), caloriesBurned: parseFloat(calories) || 0 });
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={mm.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={mm.sheetWrap}
      >
        <View style={[mm.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={mm.handle} />

          <View style={mm.headerRow}>
            <Text style={mm.headerTitle}>Add Activity</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          <View style={mm.form}>
            <Text style={mm.fieldLabel}>ACTIVITY</Text>
            <TextInput
              style={mm.input}
              placeholder="e.g. Running 5 km, Gym session…"
              placeholderTextColor={colors.text.disabled}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />

            <Text style={mm.fieldLabel}>CALORIES BURNED</Text>
            <TextInput
              style={mm.input}
              placeholder="e.g. 350"
              placeholderTextColor={colors.text.disabled}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Text style={mm.hint}>Not sure? Use "Tell AI" to estimate automatically.</Text>

            <TouchableOpacity
              style={[mm.addBtn, !canAdd && mm.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={canAdd ? colors.text.inverse : colors.text.disabled}
              />
              <Text style={[mm.addBtnText, !canAdd && mm.addBtnTextDisabled]}>
                Add Activity
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mm = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.overlay },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet:     { backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  handle:    { width: 36, height: 4, backgroundColor: colors.border.subtle, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, marginBottom: 20 },
  headerTitle: { ...typography.title3, color: colors.text.primary },

  form:       { paddingHorizontal: spacing.screenPadding, paddingBottom: 8, gap: 6 },
  fieldLabel: { ...typography.label, color: colors.text.muted, marginTop: 12, marginBottom: 6 },
  input:      { backgroundColor: colors.bg.elevated, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 13, ...typography.callout, color: colors.text.primary },
  hint:       { ...typography.caption, color: colors.text.disabled, marginTop: 4 },

  addBtn:             { backgroundColor: ACCENT, borderRadius: radius.button, height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  addBtnDisabled:     { backgroundColor: colors.bg.elevated },
  addBtnText:         { ...typography.subhead, color: colors.text.inverse, fontWeight: '700' },
  addBtnTextDisabled: { color: colors.text.disabled },
});
