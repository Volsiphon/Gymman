/**
 * modules/plan/diet/components/ManualLogModal.tsx
 *
 * Bottom-sheet form for logging a meal by hand: food name, portion, and the
 * four macro values. Calls onAdd with a MealEntry, then closes itself.
 */

import React, { useState } from 'react';
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
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MealEntry } from '@/services/ai/nutritionCoach';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.success;

export function ManualLogModal({ onClose, onAdd }: { onClose: () => void; onAdd: (meal: MealEntry) => void }) {
  const insets = useSafeAreaInsets();
  const [name,     setName]     = useState('');
  const [amount,   setAmount]   = useState('');
  const [calories, setCalories] = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [fats,     setFats]     = useState('');

  const canAdd = name.trim().length > 0 && calories.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      name:     name.trim(),
      amount:   amount.trim() || '1 serving',
      calories: parseFloat(calories) || 0,
      protein:  parseFloat(protein)  || 0,
      carbs:    parseFloat(carbs)    || 0,
      fats:     parseFloat(fats)     || 0,
    });
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={ml.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ml.sheetWrap}>
        <View style={[ml.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={ml.handle} />

          <View style={ml.headerRow}>
            <Text style={ml.headerTitle}>Log Food Manually</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={ml.form}>
            {/* Food name */}
            <Text style={ml.fieldLabel}>FOOD NAME</Text>
            <TextInput
              style={ml.input}
              placeholder="e.g. Puttu, Chicken curry, Rice…"
              placeholderTextColor={colors.text.disabled}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />

            {/* Amount */}
            <Text style={ml.fieldLabel}>AMOUNT / PORTION</Text>
            <TextInput
              style={ml.input}
              placeholder="e.g. 1 bowl, 200g, 2 pieces…"
              placeholderTextColor={colors.text.disabled}
              value={amount}
              onChangeText={setAmount}
              returnKeyType="next"
            />

            {/* Macro grid */}
            <Text style={ml.fieldLabel}>MACROS</Text>
            <View style={ml.macroGrid}>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Calories</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={ml.macroUnit}>kcal</Text>
              </View>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Protein</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={ml.macroUnit}>g</Text>
              </View>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Carbs</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={ml.macroUnit}>g</Text>
              </View>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Fats</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={fats}
                  onChangeText={setFats}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <Text style={ml.macroUnit}>g</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[ml.addBtn, !canAdd && ml.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color={canAdd ? colors.text.inverse : colors.text.disabled} />
              <Text style={[ml.addBtnText, !canAdd && ml.addBtnTextDisabled]}>Add to Today's Log</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ml = StyleSheet.create({
  overlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.overlay },
  sheetWrap:{ flex: 1, justifyContent: 'flex-end' },
  sheet:    { backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  handle:   { width: 36, height: 4, backgroundColor: colors.border.subtle, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, marginBottom: 20 },
  headerTitle: { ...typography.title3, color: colors.text.primary },

  form: { paddingHorizontal: spacing.screenPadding, paddingBottom: 8, gap: 6 },

  fieldLabel: { ...typography.label, color: colors.text.muted, marginTop: 12, marginBottom: 6 },
  input:      { backgroundColor: colors.bg.elevated, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 13, ...typography.callout, color: colors.text.primary },

  macroGrid:  { flexDirection: 'row', gap: 10 },
  macroCell:  { flex: 1, gap: 4 },
  macroLabel: { ...typography.caption, color: colors.text.muted, textAlign: 'center' },
  macroInput: { textAlign: 'center', paddingHorizontal: 8 },
  macroUnit:  { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  addBtn:         { backgroundColor: ACCENT, borderRadius: radius.button, height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  addBtnDisabled: { backgroundColor: colors.bg.elevated },
  addBtnText:     { ...typography.subhead, color: colors.text.inverse, fontWeight: '700' },
  addBtnTextDisabled: { color: colors.text.disabled },
});
