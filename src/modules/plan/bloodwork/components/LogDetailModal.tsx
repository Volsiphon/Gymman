/**
 * modules/plan/bloodwork/components/LogDetailModal.tsx
 *
 * Full-screen read-only view of one past bloodwork entry: recorded markers
 * grouped by tier, notes, and a confirm-guarded delete button.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { METRICS, type BloodworkLog } from '@/services/storage/local/bloodworkStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { TIER_GROUPS, formatDate, filledCount } from '../utils';

type DetailProps = {
  log:      BloodworkLog;
  onClose:  () => void;
  onDelete: () => void;
};

export function LogDetailModal({ log, onClose, onDelete }: DetailProps) {
  const insets = useSafeAreaInsets();
  const count  = filledCount(log.metrics);

  const groupedFilled = TIER_GROUPS.map(td => ({
    ...td,
    items: METRICS
      .filter(m => m.tier === td.tier && (log.metrics[m.key] ?? '').trim())
      .map(m => ({ def: m, val: log.metrics[m.key] })),
  })).filter(g => g.items.length > 0);

  const confirmDelete = () => {
    Alert.alert(
      'Delete Log',
      'Remove this bloodwork entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[dm.root, { paddingTop: insets.top }]}>
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-down" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={dm.headerCenter}>
            <Text style={dm.headerDate}>{formatDate(log.date)}</Text>
            <Text style={dm.headerSub}>{count} marker{count !== 1 ? 's' : ''} recorded</Text>
          </View>
          <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[dm.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {groupedFilled.map(({ tier, label, color, items }) => (
            <View key={tier} style={dm.section}>
              <Text style={[dm.tierLabel, { color }]}>{label}</Text>
              {items.map(({ def, val }) => (
                <View key={def.key} style={dm.row}>
                  <Text style={dm.name}>{def.label}</Text>
                  <Text style={dm.val}>
                    {val}
                    <Text style={dm.unit}> {def.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {log.notes ? (
            <View style={dm.section}>
              <Text style={[dm.tierLabel, { color: colors.text.muted }]}>NOTES</Text>
              <Text style={dm.notes}>{log.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bg.app },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  headerCenter:{ flex: 1, alignItems: 'center', gap: 2 },
  headerDate:  { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  headerSub:   { ...typography.caption, color: colors.text.muted },
  scroll:      { padding: spacing.screenPadding, gap: spacing.md },
  section:     { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  tierLabel:   { ...typography.label, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 8 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  name:        { ...typography.callout, color: colors.text.secondary, flex: 1, marginRight: 12 },
  val:         { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  unit:        { ...typography.caption, color: colors.text.muted, fontWeight: '400' },
  notes:       { ...typography.callout, color: colors.text.secondary, paddingHorizontal: spacing.md, paddingBottom: spacing.md, lineHeight: 22 },
});
