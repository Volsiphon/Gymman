/**
 * modules/plan/calory-burn/components/TodayTab.tsx
 *
 * The Calory Burn screen's default tab: Dynamic Mode toggle (with the live
 * dynamic-maintenance card when on), today's activity list with per-item
 * delete, a manual-add button, and the AI input bar for describing activities
 * in plain words. All state lives in CaloryBurnScreen; this is presentational.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityEntry } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.gold;

type TodayTabProps = {
  activities: ActivityEntry[];
  dynamicMode: boolean;
  bmr: number | null;
  goalOffset: number;
  aiInput: string;
  aiLoading: boolean;
  onToggleDynamic: (val: boolean) => void;
  onRemove: (id: string) => void;
  onManualAdd: () => void;
  onAiInputChange: (text: string) => void;
  onAiSend: () => void;
};

export function TodayTab({
  activities,
  dynamicMode,
  bmr,
  goalOffset,
  aiInput,
  aiLoading,
  onToggleDynamic,
  onRemove,
  onManualAdd,
  onAiInputChange,
  onAiSend,
}: TodayTabProps) {
  const totalBurned = activities.reduce((s, a) => s + a.caloriesBurned, 0);
  const baseCal     = bmr !== null ? Math.round(bmr * 1.2) : null;
  const dynamicMaintenance = baseCal !== null ? baseCal + totalBurned : null;
  const dynamicTarget      = dynamicMaintenance !== null ? dynamicMaintenance + goalOffset : null;

  const showInfoModal = () => {
    Alert.alert(
      'Dynamic Mode',
      "When on, your rough activity level is replaced with what you actually burned today. Your calorie target in the Diet section updates live based on this.\n\nWhen off, your profile's activity level is used as usual.",
      [{ text: 'Got it' }],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={tt.root}
        contentContainerStyle={tt.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dynamic Mode toggle */}
        <View style={tt.toggleCard}>
          <View style={tt.toggleLeft}>
            <Text style={tt.toggleTitle}>Dynamic Mode</Text>
            <Text style={tt.toggleSub}>Link burned calories to diet target</Text>
          </View>
          <View style={tt.toggleRight}>
            <TouchableOpacity
              onPress={showInfoModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={tt.infoBtn}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.text.muted} />
            </TouchableOpacity>
            <Switch
              value={dynamicMode}
              onValueChange={onToggleDynamic}
              trackColor={{ false: colors.bg.elevated, true: ACCENT + '55' }}
              thumbColor={dynamicMode ? ACCENT : colors.text.disabled}
            />
          </View>
        </View>

        {/* Dynamic Maintenance card — only visible when mode is ON */}
        {dynamicMode && (
          bmr === null ? (
            <View style={tt.noBioCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.gold} />
              <Text style={tt.noBioText}>
                Complete onboarding to enable dynamic calorie tracking.
              </Text>
            </View>
          ) : (
            <View style={tt.maintCard}>
              <Text style={tt.maintLabel}>DYNAMIC MAINTENANCE</Text>
              <Text style={tt.maintNumber}>
                {dynamicMaintenance?.toLocaleString()} kcal
              </Text>
              <View style={tt.maintRow}>
                <View style={tt.maintPill}>
                  <Text style={tt.maintPillLabel}>Base (BMR × 1.2)</Text>
                  <Text style={tt.maintPillVal}>{baseCal?.toLocaleString()} kcal</Text>
                </View>
                <Text style={tt.plus}>+</Text>
                <View style={tt.maintPill}>
                  <Text style={tt.maintPillLabel}>Burned Today</Text>
                  <Text style={[tt.maintPillVal, { color: ACCENT }]}>{totalBurned} kcal</Text>
                </View>
              </View>
              {dynamicTarget !== null && (
                <View style={tt.targetSection}>
                  <View style={tt.targetRow}>
                    <Ionicons name="restaurant-outline" size={13} color={colors.text.muted} />
                    <Text style={tt.targetText}>
                      Your diet target today:{' '}
                      <Text style={tt.targetNum}>{dynamicTarget.toLocaleString()} kcal</Text>
                    </Text>
                  </View>
                  {goalOffset !== 0 && (
                    <Text style={tt.offsetHint}>
                      {dynamicMaintenance?.toLocaleString()} maintenance{' '}
                      {goalOffset > 0 ? `+ ${goalOffset}` : `− ${Math.abs(goalOffset)}`} kcal goal {goalOffset > 0 ? 'surplus' : 'deficit'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )
        )}

        {/* Activity log */}
        <View style={tt.section}>
          <View style={tt.sectionHeader}>
            <Text style={tt.sectionTitle}>TODAY'S ACTIVITIES</Text>
            <Text style={tt.sectionCount}>
              {totalBurned > 0 ? `${totalBurned} kcal burned` : `${activities.length} logged`}
            </Text>
          </View>

          {activities.length === 0 ? (
            <View style={tt.emptyCard}>
              <Ionicons name="flame-outline" size={32} color={colors.text.disabled} />
              <Text style={tt.emptyText}>Nothing logged yet</Text>
              <Text style={tt.emptyHint}>
                Describe your activities below or add them manually.
              </Text>
            </View>
          ) : (
            activities.map((item) => (
              <View key={item.id} style={tt.actRow}>
                <View style={tt.actIconWrap}>
                  <Ionicons name="flame-outline" size={16} color={ACCENT} />
                </View>
                <View style={tt.actLeft}>
                  <Text style={tt.actName}>{item.name}</Text>
                </View>
                <Text style={tt.actCal}>{item.caloriesBurned} kcal</Text>
                <TouchableOpacity
                  onPress={() => onRemove(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={tt.deleteBtn}
                >
                  <Ionicons name="close-circle" size={18} color={colors.text.disabled} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Add manually button */}
        <TouchableOpacity style={tt.manualBtn} onPress={onManualAdd} activeOpacity={0.85}>
          <Ionicons name="pencil-outline" size={18} color={colors.text.secondary} />
          <Text style={tt.manualBtnText}>Add Manually</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* AI input bar */}
      <View style={tt.inputWrap}>
        <View style={tt.inputRow}>
          <TextInput
            style={tt.input}
            placeholder="Describe what you did — AI will estimate…"
            placeholderTextColor={colors.text.disabled}
            value={aiInput}
            onChangeText={onAiInputChange}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={onAiSend}
          />
          <TouchableOpacity
            style={[tt.sendBtn, (!aiInput.trim() || aiLoading) && tt.sendBtnDisabled]}
            onPress={onAiSend}
            disabled={!aiInput.trim() || aiLoading}
            activeOpacity={0.85}
          >
            {aiLoading
              ? <ActivityIndicator size="small" color={colors.text.disabled} />
              : <Ionicons name="arrow-up" size={18} color={aiInput.trim() ? colors.text.inverse : colors.text.disabled} />
            }
          </TouchableOpacity>
        </View>
        <Text style={tt.disclaimer}>AI estimates are approximations — adjust if needed</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const tt = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.screenPadding, paddingBottom: 20, gap: spacing.md },

  // Dynamic toggle
  toggleCard:  { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md, flexDirection: 'row', alignItems: 'center' },
  toggleLeft:  { flex: 1 },
  toggleTitle: { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  toggleSub:   { ...typography.caption, color: colors.text.muted, marginTop: 3 },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBtn:     { padding: 2 },

  // No bio warning
  noBioCard: { backgroundColor: colors.goldMuted, borderRadius: radius.card, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noBioText: { ...typography.callout, color: colors.gold, flex: 1, lineHeight: 20 },

  // Dynamic maintenance card
  maintCard:      { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md, gap: 12, borderWidth: 1, borderColor: ACCENT + '33' },
  maintLabel:     { ...typography.label, color: colors.text.muted },
  maintNumber:    { fontFamily: typography.fonts.display, fontSize: 40, lineHeight: 52, color: ACCENT },
  maintRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  maintPill:      { flex: 1, backgroundColor: colors.bg.elevated, borderRadius: radius.md, padding: 10, gap: 4 },
  maintPillLabel: { ...typography.caption, color: colors.text.muted },
  maintPillVal:   { ...typography.subhead, color: colors.text.primary, fontWeight: '600', lineHeight: 22 },
  plus:           { ...typography.subhead, color: colors.text.muted, fontWeight: '600' },
  targetSection:  { gap: 4, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  targetRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  targetText:     { ...typography.caption, color: colors.text.muted, flex: 1 },
  targetNum:      { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  offsetHint:     { ...typography.caption, color: colors.text.disabled, paddingLeft: 19 },

  // Section
  section:       { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { ...typography.label, color: colors.text.muted },
  sectionCount:  { ...typography.caption, color: colors.text.muted },

  emptyCard: { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { ...typography.callout, color: colors.text.muted },
  emptyHint: { ...typography.caption, color: colors.text.disabled, textAlign: 'center' },

  actRow:      { backgroundColor: colors.bg.card, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actIconWrap: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: ACCENT + '18', alignItems: 'center', justifyContent: 'center' },
  actLeft:     { flex: 1 },
  actName:     { ...typography.callout, color: colors.text.primary, fontWeight: '500' },
  actCal:      { ...typography.subhead, color: ACCENT, fontWeight: '600' },
  deleteBtn:   { padding: 2 },

  manualBtn:     { backgroundColor: colors.bg.card, borderRadius: radius.card, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border.default },
  manualBtnText: { ...typography.subhead, color: colors.text.secondary, fontWeight: '600' },

  inputWrap: { backgroundColor: colors.bg.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 6 },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 6, backgroundColor: colors.bg.elevated, borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 8 },
  input:     { flex: 1, ...typography.callout, color: colors.text.primary, maxHeight: 100, padding: 0 },
  sendBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { backgroundColor: colors.bg.card },
  disclaimer: { ...typography.caption, color: colors.text.disabled, textAlign: 'center', marginTop: 4, marginBottom: 2 },
});
