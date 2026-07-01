/**
 * modules/coach/components/ChatView.tsx
 *
 * Stateful chat component specific to the Master Coach screen. Manages the message
 * array, the "typing…" indicator, and the send flow (calls masterCoach.ts, appends
 * the AI reply). Unlike the generic ChatInterface in shared/, this component knows
 * about the coach's conversation format and injects bloodwork context into the
 * first message. Lives inside the coach module because only CoachScreen uses it.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/types/coaching';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onSend: (history: ChatMessage[]) => Promise<string>;
  accent?: string;
  welcomeMessage?: string;
  placeholder?: string;
  /** Pre-populate with a saved conversation (no welcome shown when provided and non-empty) */
  initialMessages?: DisplayMessage[];
  /** Called with the full message list after every new exchange */
  onMessagesChange?: (msgs: DisplayMessage[]) => void;
}

export function ChatView({
  onSend,
  accent = colors.primary,
  welcomeMessage,
  placeholder = 'Message…',
  initialMessages,
  onMessagesChange,
}: Props) {
  const initialState: DisplayMessage[] =
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : welcomeMessage
        ? [{ id: 'welcome', role: 'assistant', content: welcomeMessage }]
        : [];

  const [messages, setMessages] = useState<DisplayMessage[]>(initialState);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: DisplayMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const history: ChatMessage[] = next.map((m) => ({ role: m.role, content: m.content }));
      const reply = await onSend(history);
      const withReply: DisplayMessage[] = [
        ...next,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply },
      ];
      setMessages(withReply);
      onMessagesChange?.(withReply);
    } catch {
      const withErr: DisplayMessage[] = [
        ...next,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Couldn't reach the server. Check your connection and try again.",
        },
      ];
      setMessages(withErr);
      onMessagesChange?.(withErr);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, onSend, onMessagesChange]);

  const canSend = input.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              s.bubble,
              item.role === 'user'
                ? [s.userBubble, { backgroundColor: accent }]
                : s.aiBubble,
            ]}
          >
            <Text style={[s.bubbleText, item.role === 'user' && s.userBubbleText]}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={s.typingRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={s.typingText}>Thinking…</Text>
            </View>
          ) : null
        }
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[s.sendBtn, canSend ? { backgroundColor: accent } : s.sendBtnDisabled]}
          onPress={send}
          activeOpacity={0.8}
          disabled={!canSend}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={canSend ? colors.text.inverse : colors.text.disabled}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  aiBubble: {
    backgroundColor: colors.bg.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: radius.sm,
  },
  bubbleText: {
    ...typography.callout,
    color: colors.text.primary,
  },
  userBubbleText: {
    color: colors.text.inverse,
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingText: {
    ...typography.caption,
    color: colors.text.muted,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.callout,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
});
