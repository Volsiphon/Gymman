import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export interface Targets {
  calories:      number;
  trainingFocus: string | null;
  trainingDay:   string | null;
  protein:       number;
  carbs:         number;
  fats:          number;
}

const WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── Topographic oval decoration ───────────────────────────────────────────────

function TopoLines() {
  return (
    <>
      {[60, 95, 130, 165, 200].map((sz, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position:     'absolute',
            width:        sz,
            height:       sz * 0.55,
            borderRadius: sz,
            borderWidth:  1,
            borderColor:  'rgba(0,0,0,0.1)',
            bottom:       -sz * 0.3,
            right:        -sz * 0.25,
          }}
        />
      ))}
    </>
  );
}

// ── Dot grid ──────────────────────────────────────────────────────────────────

function DotGrid() {
  return (
    <View style={{ gap: 3 }} pointerEvents="none">
      {[0, 1, 2].map(r => (
        <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
          {[0, 1, 2, 3, 4].map(c => (
            <View
              key={c}
              style={{ width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.28)' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Calories card ─────────────────────────────────────────────────────────────

function CaloriesCard({ calories }: { calories: number }) {
  return (
    <View style={cc.card}>
      <TopoLines />
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={cc.header}>
        <View style={cc.iconBubble}>
          <Ionicons name="flame" size={11} color={colors.text.inverse} />
        </View>
        <Text style={cc.headerLabel}>CALORIES</Text>
      </View>

      {/* Number in a flex:1 View so adjustsFontSizeToFit has a bounded box */}
      <Text
        style={cc.number}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {calories.toLocaleString()}
      </Text>

      <View style={cc.spacer} />

      <View style={cc.footer}>
        <Text style={cc.unit}>kcal</Text>
        <DotGrid />
      </View>
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    flex:            1.3,
    backgroundColor: colors.primary,
    borderRadius:    radius.card,
    padding:         10,
    overflow:        'hidden',
    gap:             6,
    minHeight:       110,
    // iOS glow
    shadowColor:     colors.primary,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.55,
    shadowRadius:    18,
    elevation:       5,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  iconBubble: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      10,
    letterSpacing: 2,
    color:         'rgba(0,0,0,0.5)',
  },
  number: {
    fontFamily:         typography.fonts.display,
    fontSize:           46,
    lineHeight:         58,
    marginTop:          3,
    color:              colors.text.inverse,
    includeFontPadding: false,
  },
  spacer: { flex: 1 },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  unit: {
    fontFamily:    typography.fonts.display,
    fontSize:      12,
    letterSpacing: 0.5,
    color:         'rgba(0,0,0,0.42)',
  },
});

// ── Training card ─────────────────────────────────────────────────────────────

function TrainingCard({ focus, day }: { focus: string | null; day: string | null }) {
  const ghost = focus?.slice(0, 2).toUpperCase() ?? null;

  let statusIcon: React.ComponentProps<typeof Ionicons>['name'] = 'barbell-outline';
  let statusLabel = 'Workout Ready';
  if (!focus) {
    if (day === 'Rest Day') {
      statusIcon  = 'moon-outline';
      statusLabel = 'Rest Day';
    } else {
      statusIcon  = 'add-circle-outline';
      statusLabel = 'No Routine Set';
    }
  }

  return (
    <View style={tc.card}>
      <Text style={tc.label}>TRAINING</Text>

      {ghost && (
        <Text style={tc.ghost} numberOfLines={1} pointerEvents="none">
          {ghost}
        </Text>
      )}

      <Text
        style={[tc.focus, !focus && tc.focusDim]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.45}
      >
        {focus ?? (day ?? '--')}
      </Text>

      <View style={tc.status}>
        <View style={[tc.statusBubble, !focus && tc.statusBubbleDim]}>
          <Ionicons
            name={statusIcon}
            size={11}
            color={focus ? colors.crimson : colors.text.muted}
          />
        </View>
        <Text style={[tc.statusText, !focus && tc.statusTextDim]} numberOfLines={1}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: colors.bg.elevated,
    borderRadius:    radius.card,
    padding:         10,
    overflow:        'hidden',
    justifyContent:  'space-between',
    minHeight:       110,
  },
  label: {
    fontFamily:    typography.fonts.display,
    fontSize:      10,
    letterSpacing: 2,
    color:         colors.text.muted,
  },
  ghost: {
    position:           'absolute',
    right:              -4,
    bottom:             24,
    fontFamily:         typography.fonts.display,
    fontSize:           62,
    lineHeight:         62,
    color:              'rgba(255,255,255,0.035)',
    includeFontPadding: false,
  },
  focus: {
    fontFamily:         typography.fonts.display,
    fontSize:           36,
    lineHeight:         44,
    color:              colors.crimson,
    includeFontPadding: false,
    flex:               1,
    paddingTop:         2,
  },
  focusDim: {
    color:    colors.text.disabled,
    fontSize: 28,
  },
  status: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  statusBubble: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: colors.crimsonMuted,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  statusBubbleDim: {
    backgroundColor: colors.bg.card,
  },
  statusText: {
    ...typography.caption,
    color:      colors.text.secondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  statusTextDim: {
    color: colors.text.muted,
  },
});

// ── Macro strip ───────────────────────────────────────────────────────────────

type MacroIconName = React.ComponentProps<typeof Ionicons>['name'];

const MACRO_ICON: Record<string, MacroIconName> = {
  PROTEIN: 'nutrition-outline',
  CARBS:   'leaf-outline',
  FAT:     'water-outline',
};

function MacroItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={mi.cell}>
      <View style={mi.ring}>
        <Ionicons name={MACRO_ICON[label]} size={13} color={colors.primary} />
      </View>
      <View style={mi.text}>
        <Text style={mi.value}>
          {value}<Text style={mi.g}>g</Text>
        </Text>
        <Text style={mi.label}>{label}</Text>
      </View>
    </View>
  );
}

const mi = StyleSheet.create({
  cell: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  ring: {
    width:           30,
    height:          30,
    borderRadius:    15,
    borderWidth:     2,
    borderColor:     colors.primary,
    backgroundColor: colors.primaryMuted,
    alignItems:      'center',
    justifyContent:  'center',
  },
  text: { gap: 1 },
  value: {
    fontFamily:  typography.fonts.bold,
    fontSize:    14,
    fontWeight:  '700',
    color:       colors.text.primary,
    lineHeight:  17,
  },
  g: {
    fontFamily:  typography.fonts.regular,
    fontSize:    12,
    fontWeight:  '400',
    color:       colors.text.muted,
  },
  label: {
    ...typography.caption,
    color:         colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize:      9,
  },
});

// ── Main card ─────────────────────────────────────────────────────────────────

export function TodayTargets({ targets }: { targets: Targets }) {
  const today  = WEEK[new Date().getDay()];
  const macros = [
    { label: 'PROTEIN', value: targets.protein },
    { label: 'CARBS',   value: targets.carbs },
    { label: 'FAT',     value: targets.fats },
  ];

  return (
    <View style={s.card}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <Ionicons name="navigate-circle-outline" size={13} color={colors.primary} />
          <Text style={s.title}>TODAY'S TARGETS</Text>
        </View>
        <View style={s.dayPill}>
          <Ionicons name="calendar-outline" size={11} color={colors.text.muted} />
          <Text style={s.dayText}>{today}</Text>
        </View>
      </View>

      {/* Calories + Training */}
      <View style={s.topRow}>
        <CaloriesCard calories={targets.calories} />
        <TrainingCard focus={targets.trainingFocus} day={targets.trainingDay} />
      </View>

      {/* Macro strip */}
      <View style={s.macroStrip}>
        {macros.map((m, i) => (
          <React.Fragment key={m.label}>
            {i > 0 && <View style={s.macroDivider} />}
            <MacroItem label={m.label} value={m.value} />
          </React.Fragment>
        ))}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border.default,
    padding:         spacing.sm + 4,   // 12px
    gap:             spacing.sm,       // 8px
  },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  title: {
    fontFamily:    typography.fonts.display,
    fontSize:      10,
    letterSpacing: 1.4,
    color:         colors.text.muted,
  },
  dayPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
    borderColor:       colors.border.subtle,
    backgroundColor:   colors.bg.elevated,
  },
  dayText: {
    ...typography.caption,
    fontSize:   10,
    color:      colors.text.secondary,
    fontWeight: '500',
  },

  topRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },

  macroStrip: {
    flexDirection:     'row',
    backgroundColor:   colors.bg.elevated,
    borderRadius:      radius.md,
    paddingVertical:   spacing.sm + 2,   // 10px
    paddingHorizontal: spacing.xs,
  },
  macroDivider: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginVertical:  4,
  },
});
