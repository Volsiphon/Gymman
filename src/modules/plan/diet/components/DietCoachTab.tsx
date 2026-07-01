/**
 * modules/plan/diet/components/DietCoachTab.tsx
 *
 * The AI nutrition coach chat. Sends the conversation plus today's log to
 * nutritionCoachChat; replies can carry [DIET:] action commands, which are
 * parsed here and dispatched up to DietScreen via onDietActions. Also handles
 * food-photo analysis (camera/library → aiVisionChat), daily rate limits per
 * subscription tier, and chat session persistence via dietChatStorage.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  nutritionCoachChat,
  parseDietActions,
  stripDietActions,
  VISION_SYSTEM,
  type LogItem,
  type DietAction,
} from '@/services/ai/nutritionCoach';
import { aiVisionChat } from '@/services/ai/client';
import { checkImageLogAllowed, recordImageLog, checkAiMessageAllowed, recordAiMessage } from '@/services/ai/rateLimiter';
import type { SubscriptionTier } from '@/types/subscription';
import type { ChatMessage, DietChat, StoredDietMessage } from '@/types/coaching';
import type { NutritionGoals } from '@/types/user';
import { loadDietChats, saveDietChat } from '@/services/storage/local/dietChatStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { uid } from '../utils';
import { ChatHistoryPanel } from './ChatHistoryPanel';

const ACCENT = colors.success;

type DietMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  actionCount?: number;
};

const WELCOME_MSG: DietMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your nutrition coach. Tell me what you ate and I'll log it directly — I can add, remove, or correct anything in today's log.\n\nYou can also send a photo of your food and I'll estimate the macros.",
};

const SUGGESTIONS = [
  'I had puttu & kadala curry for breakfast',
  '2 parottas with beef fry just now',
  'I drank 2 glasses of milk this morning',
  'Remove everything, I want to start over',
];

function makeChatTitle(messages: DietMessage[]): string {
  const first = messages.find(m => m.role === 'user' && m.id !== 'welcome');
  if (!first) return 'New Chat';
  const t = first.content.trim();
  return t.length > 45 ? t.slice(0, 42) + '…' : t;
}

type DietCoachProps = {
  log: LogItem[];
  goals: NutritionGoals;
  tier: SubscriptionTier;
  onDietActions: (actions: DietAction[]) => void;
};

export function DietCoachTab({ log, goals, tier, onDietActions }: DietCoachProps) {
  const [messages,    setMessages]    = useState<DietMessage[]>([WELCOME_MSG]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const listRef        = useRef<FlatList>(null);
  const historyRef     = useRef<ChatMessage[]>([]);
  const logRef         = useRef<LogItem[]>(log);
  const chatIdRef      = useRef<string>(uid());
  const startedAtRef   = useRef<number>(Date.now());

  useEffect(() => { logRef.current = log; }, [log]);

  // Load most recent chat on mount
  useEffect(() => {
    loadDietChats().then(chats => {
      if (chats.length === 0) return;
      const last = chats[0];
      chatIdRef.current  = last.id;
      startedAtRef.current = last.startedAt;
      historyRef.current = last.messages.map(m => ({ role: m.role, content: m.content }));
      if (last.messages.length > 0) {
        setMessages(last.messages.map(m => ({
          id: m.id, role: m.role, content: m.content, actionCount: m.actionCount,
        })));
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
      }
    });
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const persistMessages = useCallback((updated: DietMessage[]) => {
    const stored: StoredDietMessage[] = updated
      .filter(m => m.id !== 'welcome')
      .map(m => ({ id: m.id, role: m.role, content: m.content, actionCount: m.actionCount }));
    if (stored.length === 0) return;
    saveDietChat({
      id: chatIdRef.current,
      title: makeChatTitle(updated),
      startedAt: startedAtRef.current,
      messages: stored,
    });
  }, []);

  const handleAIReply = useCallback((reply: string) => {
    const actions = parseDietActions(reply);
    if (actions.length > 0) onDietActions(actions);
    const displayText = stripDietActions(reply);
    historyRef.current = [...historyRef.current, { role: 'assistant', content: displayText }];
    const newMsg: DietMessage = { id: uid(), role: 'assistant', content: displayText, actionCount: actions.length };
    setMessages(prev => {
      const updated = [...prev, newMsg];
      persistMessages(updated);
      return updated;
    });
  }, [onDietActions, persistMessages]);

  const startNewChat = useCallback(() => {
    chatIdRef.current    = uid();
    startedAtRef.current = Date.now();
    historyRef.current   = [];
    setMessages([WELCOME_MSG]);
    setInput('');
    setHistoryOpen(false);
  }, []);

  const openHistoryChat = useCallback((chat: DietChat) => {
    chatIdRef.current    = chat.id;
    startedAtRef.current = chat.startedAt;
    historyRef.current   = chat.messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(
      chat.messages.length > 0
        ? chat.messages.map(m => ({ id: m.id, role: m.role, content: m.content, actionCount: m.actionCount }))
        : [WELCOME_MSG],
    );
    setHistoryOpen(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
  }, []);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const allowed = await checkAiMessageAllowed(tier);
    if (!allowed) {
      Alert.alert(
        'Daily limit reached',
        tier === 'free'
          ? 'Free users get 20 AI messages per day. Upgrade to Premium for much more.'
          : "You've used today's AI message allowance. Try again tomorrow.",
      );
      return;
    }

    setInput('');
    const newHistory: ChatMessage[] = [...historyRef.current, { role: 'user', content: text }];
    historyRef.current = newHistory;
    setMessages(prev => [...prev, { id: uid(), role: 'user', content: text }]);
    setLoading(true);
    scrollToEnd();

    try {
      const reply = await nutritionCoachChat(newHistory, logRef.current, goals);
      await recordAiMessage();
      handleAIReply(reply);
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: "Couldn't reach the server. Check your connection and try again." }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [input, loading, goals, tier, scrollToEnd, handleAIReply]);

  const sendImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return;

    const allowed = await checkImageLogAllowed(tier);
    if (!allowed) {
      Alert.alert(
        'Photo scan limit reached',
        tier === 'free'
          ? 'Free users can scan 1 food photo per day. Upgrade to Premium for unlimited scans.'
          : "You've reached today's photo scan limit. Resets at midnight.",
      );
      return;
    }

    setMessages(prev => [...prev, { id: uid(), role: 'user', content: 'What food is in this photo? Log it to today.', imageUri: asset.uri }]);
    setLoading(true);
    scrollToEnd();
    try {
      const reply = await aiVisionChat(VISION_SYSTEM, 'Identify this food and log it to today.', asset.base64, asset.mimeType ?? 'image/jpeg');
      await recordImageLog();
      handleAIReply(reply);
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: "Couldn't analyse the photo. Try again or describe the food instead." }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [tier, scrollToEnd, handleAIReply]);

  const openCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph your food.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) sendImage(result.assets[0]);
  }, [sendImage]);

  const openLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo access needed', 'Allow photo library access in Settings to pick a food photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) sendImage(result.assets[0]);
  }, [sendImage]);

  const canSend    = input.trim().length > 0 && !loading;
  const chatTitle  = makeChatTitle(messages);
  const isNewChat  = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={dc.coachHeader}>
        <TouchableOpacity onPress={() => setHistoryOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="time-outline" size={20} color={colors.text.muted} />
        </TouchableOpacity>
        <Text style={dc.coachTitle} numberOfLines={1}>{chatTitle}</Text>
        <TouchableOpacity onPress={startNewChat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={dc.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[dc.msgWrap, isUser ? dc.msgWrapUser : dc.msgWrapAI]}>
              {!isUser && (
                <View style={dc.aiLabel}>
                  <View style={dc.aiBadge}><Text style={dc.aiBadgeText}>N</Text></View>
                  <Text style={dc.aiName}>Nutrition Coach</Text>
                </View>
              )}
              {item.imageUri && (
                <Image source={{ uri: item.imageUri }} style={[dc.imageBubble, { alignSelf: isUser ? 'flex-end' : 'flex-start' }]} />
              )}
              <View style={[dc.bubble, isUser ? [dc.userBubble, { backgroundColor: ACCENT }] : dc.aiBubble]}>
                <Text style={[dc.bubbleText, isUser && dc.userBubbleText]}>{item.content}</Text>
              </View>
              {!isUser && (item.actionCount ?? 0) > 0 && (
                <View style={dc.actionPill}>
                  <Ionicons name="checkmark-circle" size={13} color={ACCENT} />
                  <Text style={dc.actionPillText}>Log updated</Text>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={dc.typingRow}>
              <View style={dc.aiBadge}><Text style={dc.aiBadgeText}>N</Text></View>
              <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 4 }} />
            </View>
          ) : null
        }
      />

      {isNewChat && !loading && (
        <View style={dc.suggestions}>
          <Text style={dc.suggestLabel}>Try saying:</Text>
          {SUGGESTIONS.map((s, i) => (
            <TouchableOpacity key={i} style={dc.suggestChip} onPress={() => send(s)} activeOpacity={0.7}>
              <Text style={dc.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={dc.inputWrap}>
        <View style={dc.inputRow}>
          <TouchableOpacity onPress={openCamera}  style={dc.mediaBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="camera-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openLibrary} style={dc.mediaBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="image-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TextInput
            style={dc.input}
            placeholder="Tell your coach what you ate…"
            placeholderTextColor={colors.text.disabled}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[dc.sendBtn, !canSend && dc.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color={canSend ? colors.text.inverse : colors.text.disabled} />
          </TouchableOpacity>
        </View>
        <Text style={dc.disclaimer}>AI estimates — verify weight-sensitive macros manually</Text>
      </View>

      <ChatHistoryPanel
        visible={historyOpen}
        activeChatId={chatIdRef.current}
        onClose={() => setHistoryOpen(false)}
        onSelect={openHistoryChat}
        onNewChat={startNewChat}
      />
    </KeyboardAvoidingView>
  );
}

const dc = StyleSheet.create({
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  coachTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },

  list: { padding: spacing.md, paddingBottom: spacing.sm, gap: 12 },

  msgWrap:     { gap: 6 },
  msgWrapUser: { alignItems: 'flex-end' },
  msgWrapAI:   { alignItems: 'flex-start' },

  aiLabel:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 2 },
  aiBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: colors.text.inverse },
  aiName:      { ...typography.caption, color: colors.text.muted, fontWeight: '600' },

  imageBubble: { width: 180, height: 180, borderRadius: radius.lg, marginBottom: 4, backgroundColor: colors.bg.elevated },

  bubble:         { maxWidth: '85%', borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 11 },
  aiBubble:       { backgroundColor: colors.bg.card, borderBottomLeftRadius: radius.sm },
  userBubble:     { borderBottomRightRadius: radius.sm },
  bubbleText:     { ...typography.callout, color: colors.text.primary, lineHeight: 22 },
  userBubbleText: { color: colors.text.inverse },

  actionPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 2 },
  actionPillText: { ...typography.caption, color: ACCENT, fontWeight: '600' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8 },

  suggestions:  { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 },
  suggestLabel: { ...typography.caption, color: colors.text.muted, textAlign: 'center', marginBottom: 4 },
  suggestChip:  { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  suggestText:  { ...typography.callout, color: colors.text.secondary },

  inputWrap: { backgroundColor: colors.bg.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 6 },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 6, backgroundColor: colors.bg.elevated, borderRadius: radius.xl, paddingHorizontal: 10, paddingVertical: 8 },
  mediaBtn:  { paddingHorizontal: 4, paddingBottom: 2 },
  input:     { flex: 1, ...typography.callout, color: colors.text.primary, maxHeight: 120, padding: 0 },
  sendBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { backgroundColor: colors.bg.card },
  disclaimer: { ...typography.caption, color: colors.text.disabled, textAlign: 'center', marginTop: 4, marginBottom: 2 },
});
