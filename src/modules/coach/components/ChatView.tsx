/**
 * modules/coach/components/ChatView.tsx
 *
 * Stateful chat component for the Master Coach screen. Manages the message
 * array, typing indicator, and the send flow.
 *
 * Voice input [MVP]: press-and-hold the mic → records via expo-av → transcribes
 * via Groq Whisper → auto-sends.  Voice replies [MVP]: tap the speaker icon to
 * toggle TTS via expo-speech (device voice — English only, no Malayalam).
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
import { Ionicons }   from '@expo/vector-icons';
import { Audio }      from 'expo-av';
import * as Speech    from 'expo-speech';

import type { ChatMessage } from '@/types/coaching';
import { transcribeAudio }  from '@/services/ai/whisper';
import { colors }           from '@/theme/colors';
import { typography }       from '@/theme/typography';
import { spacing, radius }  from '@/theme/spacing';

export interface DisplayMessage {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

interface Props {
  onSend:            (history: ChatMessage[]) => Promise<string>;
  accent?:           string;
  welcomeMessage?:   string;
  placeholder?:      string;
  /** Pre-populate with a saved conversation (no welcome shown when provided and non-empty) */
  initialMessages?:  DisplayMessage[];
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

  const [messages,       setMessages]       = useState<DisplayMessage[]>(initialState);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);

  // MVP: voice
  const [isRecording,    setIsRecording]    = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceReplyOn,   setVoiceReplyOn]   = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const listRef = useRef<FlatList>(null);

  // Core send — accepts an optional override so voice path can bypass input state
  const send = useCallback(async (overrideText?: string) => {
    const msg = (overrideText ?? input).trim();
    if (!msg || loading) return;

    Speech.stop();
    const userMsg: DisplayMessage = { id: `u-${Date.now()}`, role: 'user', content: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const history: ChatMessage[] = next.map(m => ({ role: m.role, content: m.content }));
      const reply = await onSend(history);
      const withReply: DisplayMessage[] = [
        ...next,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply },
      ];
      setMessages(withReply);
      onMessagesChange?.(withReply);
      if (voiceReplyOn) Speech.speak(reply, { language: 'en', rate: 1.0 });
    } catch {
      const withErr: DisplayMessage[] = [
        ...next,
        { id: `err-${Date.now()}`, role: 'assistant',
          content: "Couldn't reach the server. Check your connection and try again." },
      ];
      setMessages(withErr);
      onMessagesChange?.(withErr);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, onSend, onMessagesChange, voiceReplyOn]);

  // MVP: start recording on press-in
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      Speech.stop();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }, []);

  // MVP: stop and transcribe on press-out
  const stopAndTranscribe = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri) {
        const transcript = await transcribeAudio(uri);
        if (transcript) await send(transcript);
      }
    } catch {
      recordingRef.current = null;
    } finally {
      setIsTranscribing(false);
    }
  }, [send]);

  const canSend = input.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? [s.userBubble, { backgroundColor: accent }] : s.aiBubble]}>
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
        {/* Text field or recording badge */}
        {isRecording ? (
          <View style={s.recordingBadge}>
            <View style={s.recordingDot} />
            <Text style={s.recordingText}>Listening…  release to send</Text>
          </View>
        ) : (
          <TextInput
            style={s.input}
            placeholder={placeholder}
            placeholderTextColor={colors.text.disabled}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!isTranscribing && !loading}
          />
        )}

        {/* MVP: voice reply toggle */}
        <TouchableOpacity
          style={s.voiceToggleBtn}
          onPress={() => { setVoiceReplyOn(v => !v); Speech.stop(); }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={voiceReplyOn ? 'volume-high' : 'volume-mute'}
            size={16}
            color={voiceReplyOn ? accent : colors.text.disabled}
          />
        </TouchableOpacity>

        {/* Send (typing) or Mic (idle) */}
        {canSend ? (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: accent }]}
            onPress={() => send()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color={colors.text.inverse} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              s.actionBtn,
              isRecording    ? s.actionBtnRecording    :
              isTranscribing ? s.actionBtnTranscribing :
                               s.actionBtnDisabled,
            ]}
            onPressIn={startRecording}
            onPressOut={stopAndTranscribe}
            activeOpacity={0.85}
            disabled={isTranscribing || loading}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={colors.text.disabled} />
            ) : (
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic'}
                size={18}
                color={isRecording ? '#FF3B30' : colors.text.muted}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* MVP label — shown when in mic mode */}
      {!canSend && !loading && (
        <View style={s.mvpBar}>
          <Text style={s.mvpText}>Voice · Beta  ·  Hold mic to speak</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  list: {
    padding:       spacing.md,
    paddingBottom: spacing.sm,
    gap:           spacing.sm,
  },

  bubble: {
    maxWidth:     '82%',
    borderRadius: radius.lg,
    padding:      spacing.md,
  },
  aiBubble: {
    backgroundColor:         colors.bg.card,
    alignSelf:               'flex-start',
    borderBottomLeftRadius:  radius.sm,
  },
  userBubble: {
    alignSelf:                'flex-end',
    borderBottomRightRadius:  radius.sm,
  },
  bubbleText: {
    ...typography.callout,
    color: colors.text.primary,
  },
  userBubbleText: {
    color: colors.text.inverse,
  },

  typingRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
  },
  typingText: {
    ...typography.caption,
    color: colors.text.muted,
  },

  inputRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    gap:               spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    backgroundColor:   colors.bg.card,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    colors.border.subtle,
  },
  input: {
    flex:              1,
    minHeight:         40,
    maxHeight:         120,
    backgroundColor:   colors.bg.elevated,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   10,
    ...typography.callout,
    color:             colors.text.primary,
  },
  recordingBadge: {
    flex:              1,
    height:            40,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    backgroundColor:   colors.bg.elevated,
    borderRadius:      radius.full,
    paddingHorizontal: spacing.md,
    borderWidth:       1,
    borderColor:       '#FF3B30',
  },
  recordingDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  voiceToggleBtn: {
    width:           32,
    height:          36,
    alignItems:      'center',
    justifyContent:  'center',
  },
  actionBtn: {
    width:           36,
    height:          36,
    borderRadius:    radius.full,
    alignItems:      'center',
    justifyContent:  'center',
  },
  actionBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  actionBtnRecording: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  actionBtnTranscribing: {
    backgroundColor: colors.bg.elevated,
  },

  mvpBar: {
    alignItems:        'center',
    paddingVertical:   4,
    paddingBottom:     6,
    backgroundColor:   colors.bg.card,
  },
  mvpText: {
    ...typography.caption,
    color: colors.text.disabled,
  },
});
