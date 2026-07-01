/**
 * modules/plan/training/components/DayCard.tsx
 *
 * One training day inside RoutineDisplay: a lime day-name header (blue for
 * rest days), a focus badge overlapping the header edge, and the exercise
 * list with sets/reps boxes plus a per-exercise working-weight input that
 * persists via exerciseWeightStorage.
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { weightKey } from '@/services/storage/local/exerciseWeightStorage';
import type { RoutineDay } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.primary;
const REST_BLUE = '#3B82F6';

type DayCardProps = {
  day: RoutineDay;
  routineId: string;
  weights: Record<string, string>;
  onWeightChange: (key: string, value: string) => void;
  onWeightBlur: (key: string, value: string) => void;
};

export function DayCard({ day, routineId, weights, onWeightChange, onWeightBlur }: DayCardProps) {
  if (day.isRest) {
    return (
      <View style={dc.card}>
        <View style={dc.restHeader}>
          <Text style={dc.restDayName}>{day.day}</Text>
        </View>
        <View style={dc.badgeWrap}>
          <View style={dc.restBadge}>
            <Ionicons name="moon-outline" size={12} color={REST_BLUE} />
            <Text style={dc.restLabel}>Rest Day</Text>
          </View>
        </View>
      </View>
    );
  }

  const exercises = day.exercises ?? [];

  return (
    <View style={dc.card}>
      {/* Lime header */}
      <View style={dc.limeHeader}>
        <Text style={dc.dayName}>{day.day}</Text>
      </View>
      {/* Focus badge overlapping the header bottom edge */}
      <View style={dc.badgeWrap}>
        <View style={dc.focusBadge}>
          <Text style={dc.focusText}>{day.focus}</Text>
        </View>
      </View>
      {/* Exercises */}
      {exercises.length > 0 && (
        <View style={dc.exList}>
          {(() => {
            let lastSection: string | undefined;
            return exercises.map((ex, i) => {
              const showSection = ex.section !== undefined && ex.section !== lastSection;
              lastSection = ex.section;
              const wKey = weightKey(routineId, ex.name);
              const isLast = i === exercises.length - 1;
              const nextEx = exercises[i + 1];
              const nextChangesSection = nextEx && nextEx.section !== ex.section;
              return (
                <React.Fragment key={i}>
                  {showSection && (
                    <View style={dc.sectionHeader}>
                      <Text style={dc.sectionLabel}>{ex.section}</Text>
                    </View>
                  )}
                  <View style={[dc.exRow, !isLast && !nextChangesSection && dc.exBorder]}>
                    <Text style={dc.exName} numberOfLines={1}>{ex.name}</Text>
                    <View style={dc.exMeta}>
                      <View style={dc.metaBox}>
                        <Text style={dc.metaBoxLabel}>SETS</Text>
                        <Text style={dc.metaBoxVal}>{ex.sets}</Text>
                      </View>
                      <View style={dc.metaBox}>
                        <Text style={dc.metaBoxLabel}>REPS</Text>
                        <Text style={dc.metaBoxVal}>{ex.reps}</Text>
                      </View>
                      <TextInput
                        style={dc.weightInput}
                        value={weights[wKey] ?? ''}
                        onChangeText={(v) => onWeightChange(wKey, v)}
                        onBlur={() => onWeightBlur(wKey, weights[wKey] ?? '')}
                        placeholder="kg"
                        placeholderTextColor={colors.text.disabled}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                </React.Fragment>
              );
            });
          })()}
        </View>
      )}
    </View>
  );
}

const dc = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },

  // Lime header (workout days)
  limeHeader: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    paddingTop: 9,
    paddingBottom: 16,
    paddingHorizontal: spacing.md,
  },
  dayName: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    letterSpacing: 0.5,
    color: '#0D0D0D',
    textAlign: 'center',
  },

  // Blue header (rest days)
  restHeader: {
    backgroundColor: REST_BLUE,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: spacing.md,
  },
  restDayName: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Badge row — overlaps header bottom edge via negative margin
  badgeWrap: {
    alignItems: 'center',
    marginTop: -13,
    marginBottom: 10,
  },
  focusBadge: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: ACCENT + '88',
  },
  focusText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.2,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg.card,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: REST_BLUE + '88',
  },
  restLabel: { fontSize: 12, color: REST_BLUE, fontWeight: '600' },

  // Section headers within a day
  sectionHeader: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: ACCENT,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Exercise list
  exList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  exRow: {
    flexDirection: 'column',
    paddingVertical: 8,
  },
  exBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  exName: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '400',
    marginBottom: 6,
  },
  exMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaBox: {
    width: 58,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  metaBoxLabel: {
    fontSize: 8,
    letterSpacing: 1,
    color: colors.text.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaBoxVal: {
    fontSize: 17,
    color: colors.text.primary,
    fontWeight: '500',
    lineHeight: 22,
  },
  weightInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    textAlign: 'center',
    fontSize: 17,
    color: colors.text.primary,
  },
});
