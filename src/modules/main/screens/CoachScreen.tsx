import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import { ChatView } from '@/shared/components/ChatView';
import { masterCoachChat } from '@/services/ai/masterCoach';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Coach'>;

const CAPABILITIES = [
  { icon: 'fitness-outline',     text: 'Knows your full training history' },
  { icon: 'nutrition-outline',   text: 'Tracks your diet and calorie data' },
  { icon: 'trending-up-outline', text: 'Watches your weight progress' },
  { icon: 'settings-outline',    text: 'Can adjust your plan with your approval' },
] as const;

export function CoachScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const [chatStarted, setChatStarted] = useState(false);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Coach</Text>
        {chatStarted && (
          <TouchableOpacity
            style={s.newChatBtn}
            onPress={() => setChatStarted(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {chatStarted ? (
        <ChatView
          onSend={masterCoachChat}
          accent={colors.primary}
          welcomeMessage="Hey! I'm your Gymman Coach. Ask me anything — workouts, nutrition, your goal, or how to use the app."
          placeholder="Ask your coach…"
        />
      ) : (
        <View style={s.body}>
          <View style={s.coachCard}>
            <View style={s.coachIcon}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={s.coachName}>Gymman Coach</Text>
            <Text style={s.coachDesc}>
              An AI coach that knows your entire journey from Day 1. Ask anything — nutrition, training, goals, or how to use the app.
            </Text>
          </View>

          <View style={s.capList}>
            {CAPABILITIES.map((cap, i) => (
              <View
                key={cap.text}
                style={[s.capRow, i === CAPABILITIES.length - 1 && s.capRowLast]}
              >
                <Ionicons name={cap.icon as any} size={16} color={colors.text.muted} />
                <Text style={s.capText}>{cap.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={s.startBtn}
            onPress={() => setChatStarted(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={18}
              color={colors.text.inverse}
              style={{ marginRight: 6 }}
            />
            <Text style={s.startBtnText}>Start a conversation</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  coachCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  coachIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  coachName: {
    ...typography.title3,
    color: colors.text.primary,
  },
  coachDesc: {
    ...typography.callout,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  capList: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  capRowLast: {
    borderBottomWidth: 0,
  },
  capText: {
    ...typography.callout,
    color: colors.text.secondary,
  },

  startBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
});
