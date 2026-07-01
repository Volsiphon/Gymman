/**
 * modules/plan/diet/components/ChatHistoryPanel.tsx
 *
 * Full-screen modal listing past nutrition-coach chat sessions, grouped by
 * date (Today / Yesterday / Previous 7 Days / Older). Selecting a chat
 * restores it in DietCoachTab; each row can also be deleted.
 *
 * Not to be confused with modules/coach/components/ChatHistoryPanel.tsx,
 * which is the master coach's equivalent backed by masterChatStorage.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { DietChat } from '@/types/coaching';
import { loadDietChats, deleteDietChat } from '@/services/storage/local/dietChatStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.success;

function formatChatDate(ts: number): string {
  const d    = new Date(ts);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (daysAgo < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatChatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

type ChatGroup = { label: string; chats: DietChat[] };

function groupChatsByDate(chats: DietChat[]): ChatGroup[] {
  const now    = new Date();
  const yest   = new Date(now); yest.setDate(yest.getDate() - 1);
  const weekAgo= new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: ChatGroup[] = [
    { label: 'Today',            chats: [] },
    { label: 'Yesterday',        chats: [] },
    { label: 'Previous 7 Days',  chats: [] },
    { label: 'Older',            chats: [] },
  ];
  for (const chat of chats) {
    const d = new Date(chat.startedAt);
    if      (d.toDateString() === now.toDateString())  groups[0].chats.push(chat);
    else if (d.toDateString() === yest.toDateString()) groups[1].chats.push(chat);
    else if (d >= weekAgo)                             groups[2].chats.push(chat);
    else                                               groups[3].chats.push(chat);
  }
  return groups.filter(g => g.chats.length > 0);
}

export function ChatHistoryPanel({
  visible,
  activeChatId,
  onClose,
  onSelect,
  onNewChat,
}: {
  visible: boolean;
  activeChatId: string;
  onClose: () => void;
  onSelect: (chat: DietChat) => void;
  onNewChat: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<DietChat[]>([]);

  useEffect(() => {
    if (visible) loadDietChats().then(setChats);
  }, [visible]);

  async function handleDelete(id: string) {
    await deleteDietChat(id);
    setChats(prev => prev.filter(c => c.id !== id));
  }

  const groups = groupChatsByDate(chats);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[hp.root, { paddingTop: insets.top }]}>
        <View style={hp.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-down" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={hp.title}>Nutrition Coach Chats</Text>
          <TouchableOpacity onPress={onNewChat} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {chats.length === 0 ? (
          <View style={hp.empty}>
            <Ionicons name="chatbubble-outline" size={44} color={colors.text.disabled} />
            <Text style={hp.emptyTitle}>No saved chats yet</Text>
            <Text style={hp.emptyHint}>Start a conversation with your nutrition coach.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={hp.list} showsVerticalScrollIndicator={false}>
            {groups.map(group => (
              <View key={group.label}>
                <Text style={hp.groupLabel}>{group.label}</Text>
                {group.chats.map(chat => (
                  <TouchableOpacity
                    key={chat.id}
                    style={[hp.row, chat.id === activeChatId && hp.rowActive]}
                    onPress={() => onSelect(chat)}
                    activeOpacity={0.7}
                  >
                    <View style={hp.rowContent}>
                      <Text style={hp.rowTitle} numberOfLines={1}>{chat.title}</Text>
                      <Text style={hp.rowMeta}>
                        {formatChatDate(chat.startedAt)} · {formatChatTime(chat.startedAt)}
                        {' · '}{chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(chat.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.text.disabled} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const hp = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg.app },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  list:  { paddingBottom: 40 },

  groupLabel: {
    ...typography.label,
    color: colors.text.muted,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.xs,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowActive: {
    borderColor: ACCENT + '66',
    backgroundColor: ACCENT + '0C',
  },
  rowContent: { flex: 1 },
  rowTitle:   { ...typography.callout, color: colors.text.primary, fontWeight: '500' },
  rowMeta:    { ...typography.caption, color: colors.text.muted, marginTop: 3, lineHeight: 16 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: 40 },
  emptyTitle: { ...typography.title3, color: colors.text.muted },
  emptyHint:  { ...typography.callout, color: colors.text.disabled, textAlign: 'center' },
});
