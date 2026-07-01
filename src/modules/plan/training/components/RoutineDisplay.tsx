/**
 * modules/plan/training/components/RoutineDisplay.tsx
 *
 * The Routine tab's content: a chip selector when multiple routines exist,
 * the selected routine's name with a delete button, and a DayCard per day.
 * Owns the working-weight state (loaded once, saved per-field on blur).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadWeights, saveWeight } from '@/services/storage/local/exerciseWeightStorage';
import type { Routine } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { DayCard } from './DayCard';

const ACCENT = colors.primary;

export function RoutineDisplay({
  routines,
  onDelete,
}: {
  routines: Routine[];
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(routines[routines.length - 1]?.id ?? null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const selected = routines.find((r) => r.id === selectedId) ?? routines[routines.length - 1];

  useEffect(() => {
    loadWeights().then(setWeights);
  }, []);

  function handleWeightChange(key: string, value: string) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  async function handleWeightBlur(key: string, value: string) {
    const colonIdx = key.indexOf(':');
    const rId = key.slice(0, colonIdx);
    const exName = key.slice(colonIdx + 1);
    await saveWeight(rId, exName, value);
  }

  if (!selected) return null;

  return (
    <View style={{ flex: 1 }}>
      {routines.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rd.selectorRow}
        >
          {routines.map((r) => {
            const on = r.id === selectedId;
            return (
              <TouchableOpacity
                key={r.id}
                style={[rd.chip, on && rd.chipOn]}
                onPress={() => setSelectedId(r.id)}
                activeOpacity={0.7}
              >
                <Text style={[rd.chipText, on && rd.chipTextOn]}>{r.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={rd.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={rd.routineHeader}>
          <Text style={rd.routineName}>{selected.name}</Text>
          <TouchableOpacity
            onPress={() => onDelete(selected.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={17} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
        {(selected.days ?? []).map((day) => (
          <DayCard
            key={day.day}
            day={day}
            routineId={selected.id}
            weights={weights}
            onWeightChange={handleWeightChange}
            onWeightBlur={handleWeightBlur}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const rd = StyleSheet.create({
  selectorRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipOn: { backgroundColor: ACCENT + '22', borderColor: ACCENT + '99' },
  chipText: { ...typography.callout, color: colors.text.secondary },
  chipTextOn: { color: ACCENT, fontWeight: '600' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  routineName: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    letterSpacing: 0.3,
    color: colors.text.primary,
  },
});
