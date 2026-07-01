/**
 * modules/onboarding/screens/PhotoCaptureScreen.tsx
 *
 * Optional onboarding step where the user can take or upload a "before" photo to
 * establish a visual baseline for their transformation journey. The photo is saved
 * via photoStorage.ts. The user can skip this screen entirely — it does not block
 * progress to GoalAnalysisScreen. Skipping just means no before-photo in the
 * Photos tab's first entry.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { OnboardingStackParamList } from '@/app/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'PhotoCapture'>;
  route: RouteProp<OnboardingStackParamList, 'PhotoCapture'>;
};

// ─── Slots config ─────────────────────────────────────────────────────────────

type SlotKey = 'front' | 'leftSide' | 'rightSide' | 'back';

interface Slot {
  key: SlotKey;
  label: string;
  hint: string;
  required: boolean;
}

const SLOTS: Slot[] = [
  { key: 'front',     label: 'Front',      hint: 'Face forward',   required: true  },
  { key: 'leftSide',  label: 'Left Side',  hint: 'Turn 90° left',  required: false },
  { key: 'rightSide', label: 'Right Side', hint: 'Turn 90° right', required: false },
  { key: 'back',      label: 'Back',       hint: 'Face away',      required: false },
];

const TIPS = [
  'Good lighting makes AI estimates more accurate',
  'Wear fitted clothing — baggy hides body shape',
  'Stand straight, arms relaxed at your sides',
  'Inside the app, you can keep track of your photos everyday',
];

const { width: SCREEN_W } = Dimensions.get('window');
const SLOT_W = (SCREEN_W - spacing.screenPadding * 2 - spacing.sm) / 2;
const SLOT_H = SLOT_W * (4 / 3);

// ─── Screen ───────────────────────────────────────────────────────────────────

export function PhotoCaptureScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<Record<SlotKey, string | null>>({
    front: null, leftSide: null, rightSide: null, back: null,
  });

  const heroAnim = useRef(new Animated.Value(0)).current;
  const gridAnim = useRef(new Animated.Value(0)).current;
  const tipsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(gridAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.timing(tipsAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  const photoCount = Object.values(photos).filter(Boolean).length;
  const canContinue = photos.front !== null;

  // ─── Pickers ────────────────────────────────────────────────────────────────

  const launchCamera = async (key: SlotKey) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos(prev => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const launchGallery = async (key: SlotKey) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Library access needed', 'Allow photo access in Settings to choose photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos(prev => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const promptSlot = (key: SlotKey) => {
    const hasPhoto = photos[key] !== null;
    Alert.alert(
      hasPhoto ? 'Change photo' : 'Add photo',
      undefined,
      [
        { text: 'Take Photo', onPress: () => launchCamera(key) },
        { text: 'Choose from Library', onPress: () => launchGallery(key) },
        ...(hasPhoto ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => setPhotos(p => ({ ...p, [key]: null })) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Photos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <Text style={styles.headline}>Day 1</Text>
          <Text style={styles.subhead}>
            Add a photo to log your starting point. The before photo in a transformation. These photos track your transformation and also help estimate your body type more accurately. Don't worry, we don't store your photos.
          </Text>
        </Animated.View>

        {/* Photo grid */}
        <Animated.View
          style={[
            styles.grid,
            {
              opacity: gridAnim,
              transform: [{ translateY: gridAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          {SLOTS.map(slot => {
            const uri = photos[slot.key];
            return (
              <TouchableOpacity
                key={slot.key}
                style={styles.slot}
                onPress={() => promptSlot(slot.key)}
                activeOpacity={0.8}
              >
                {uri ? (
                  <>
                    <Image source={{ uri }} style={styles.slotImage} resizeMode="cover" />
                    <View style={styles.slotOverlay}>
                      <Text style={styles.slotOverlayLabel}>{slot.label}</Text>
                    </View>
                    <View style={styles.retakeBadge}>
                      <Ionicons name="refresh" size={11} color={colors.text.primary} />
                    </View>
                  </>
                ) : (
                  <View style={styles.slotEmpty}>
                    <Ionicons name="person-outline" size={34} color={colors.text.disabled} />
                    <Text style={styles.slotEmptyLabel}>{slot.label}</Text>
                    <Text style={styles.slotHint}>{slot.hint}</Text>
                    {slot.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Add One</Text>
                      </View>
                    )}
                    <View style={styles.addBadge}>
                      <Ionicons name="add" size={14} color={colors.text.muted} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Tips */}
        <Animated.View style={[styles.tipsCard, { opacity: tipsAnim }]}>
          {TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Bottom actions — fixed above keyboard */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          onPress={() => navigation.navigate('StatsReveal')}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
            {photoCount > 0
              ? `Continue with ${photoCount} photo${photoCount > 1 ? 's' : ''}`
              : 'Continue'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('StatsReveal')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },

  scroll: {
    paddingHorizontal: spacing.screenPadding,
  },

  hero: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  headline: {
    ...typography.title1,
    color: colors.text.primary,
  },
  subhead: {
    ...typography.callout,
    color: colors.text.muted,
    lineHeight: 22,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    width: SLOT_W,
    height: SLOT_H,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  slotOverlayLabel: {
    ...typography.label,
    color: colors.text.primary,
  },
  retakeBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: spacing.sm,
  },
  slotEmptyLabel: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: 2,
  },
  slotHint: {
    ...typography.caption,
    color: colors.text.disabled,
    textAlign: 'center',
  },
  requiredBadge: {
    marginTop: spacing.xs,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.badge,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  requiredText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primaryLight,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  addBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tips
  tipsCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  tipText: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 19,
  },

  // Actions
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.bg.app,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  continueBtn: {
    width: '100%',
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  continueBtnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
  continueBtnTextDisabled: {
    color: colors.text.disabled,
  },
  skipText: {
    ...typography.footnote,
    color: colors.text.muted,
    paddingBottom: spacing.xs,
  },
});
