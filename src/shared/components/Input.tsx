/**
 * shared/components/Input.tsx
 *
 * Generic labeled text input: dark-mode styling, animated focus border, optional
 * secure-entry with a show/hide toggle. Originally lived inline in LoginScreen.tsx;
 * moved here once AccountModal's inline re-auth/add-account form needed the same
 * thing — two unrelated modules (onboarding, plan/home) using it is what crosses
 * the shared/ bar (CLAUDE.md: shared only if ≥2 unrelated modules need it).
 */

import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry,
  keyboardType,
  returnKeyType,
  onSubmit,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  onSubmit?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () =>
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  const handleBlur = () =>
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border.default, colors.primary],
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.field, { borderColor }]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          secureTextEntry={secureEntry && !visible}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType ?? 'next'}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          selectionColor={colors.primary}
        />
        {secureEntry && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.text.muted}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.text.muted,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.input,
    borderWidth: 1,
    height: spacing.inputHeight,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.callout,
    color: colors.text.primary,
    padding: 0,
  },
});
