import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MasterChat } from '@/services/storage/local/masterChatStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

interface Props {
  visible: boolean;
  chats: MasterChat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function chatPreview(chat: MasterChat): string {
  const first = chat.messages.find(m => m.role === 'user');
  if (!first) return 'New conversation';
  const t = first.content.trim();
  return t.length > 55 ? t.slice(0, 52) + '…' : t;
}

export function ChatHistoryPanel({
  visible,
  chats,
  activeChatId,
  onSelect,
  onDelete,
  onClose,
}: Props) {
  const renderItem = useCallback(
    ({ item }: { item: MasterChat }) => {
      const isActive = item.id === activeChatId;
      return (
        <TouchableOpacity
          style={[s.row, isActive && s.rowActive]}
          onPress={() => { onSelect(item.id); onClose(); }}
          activeOpacity={0.7}
        >
          <View style={s.rowBody}>
            <Text style={s.rowPreview} numberOfLines={1}>{chatPreview(item)}</Text>
            <Text style={s.rowDate}>{formatDate(item.startedAt)}</Text>
          </View>
          {isActive && (
            <Ionicons name="checkmark" size={16} color={colors.primary} style={s.activeCheck} />
          )}
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [activeChatId, onSelect, onDelete, onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Chat history</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        {chats.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No conversations yet</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={c => c.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position:            'absolute',
    bottom:              0,
    left:                0,
    right:               0,
    maxHeight:           '75%',
    backgroundColor:     colors.bg.card,
    borderTopLeftRadius:  radius.card + 4,
    borderTopRightRadius: radius.card + 4,
    paddingBottom:       spacing.xl,
  },
  handle: {
    width:         36,
    height:        4,
    borderRadius:  2,
    backgroundColor: colors.border.default,
    alignSelf:     'center',
    marginTop:     spacing.sm,
    marginBottom:  spacing.xs,
  },
  sheetHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  sheetTitle: {
    ...typography.title3,
    color: colors.text.primary,
  },
  list: {
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  rowActive: {
    backgroundColor: colors.primaryMuted,
  },
  rowBody: {
    flex: 1,
    gap:  2,
  },
  rowPreview: {
    ...typography.callout,
    color: colors.text.primary,
  },
  rowDate: {
    ...typography.caption,
    color: colors.text.muted,
  },
  activeCheck: {
    marginRight: spacing.sm,
  },
  deleteBtn: {
    padding: 4,
  },
  empty: {
    padding:    spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.callout,
    color: colors.text.muted,
  },
});
