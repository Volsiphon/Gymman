import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export interface BodyCompData {
  currentWeight: number;
  currentBF:     number | null;
  targetWeight:  number | null;
  targetBF:      number | null;
}

const WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── Current sub-card ──────────────────────────────────────────────────────────

function CurrentCard({ weight, bf, targetWeight, targetBF }: {
  weight: number; bf: number | null; targetWeight: number | null; targetBF: number | null;
}) {
  const wDiff   = targetWeight !== null ? Math.abs(weight - targetWeight) : null;
  const wLabel  = targetWeight !== null ? (weight < targetWeight ? 'BELOW TARGET' : 'ABOVE TARGET') : null;
  const bfDiff  = bf !== null && targetBF !== null ? Math.abs(bf - targetBF) : null;
  const bfLabel = bf !== null && targetBF !== null ? (bf > targetBF ? 'ABOVE TARGET' : 'BELOW TARGET') : null;

  const leanMass = bf !== null ? weight * (1 - bf / 100) : null;
  const fatMass  = bf !== null ? weight * (bf / 100)     : null;

  return (
    <View style={cur.card}>
      <View style={cur.hdr}>
        <View style={cur.iconRing}>
          <Ionicons name="person-outline" size={14} color={colors.text.secondary} />
        </View>
        <Text style={cur.hdrLabel}>CURRENT</Text>
      </View>

      <View style={cur.metricsRow}>
        <View style={cur.col}>
          <Text style={cur.metaLabel}>WEIGHT</Text>
          <View style={cur.numRow}>
            <Text style={cur.num}>{weight.toFixed(1)}</Text>
            <Text style={cur.unit}>kg</Text>
          </View>
        </View>
        {bf !== null && (
          <>
            <View style={cur.divider} />
            <View style={cur.col}>
              <Text style={cur.metaLabel}>BODY FAT</Text>
              <View style={cur.numRow}>
                <Text style={cur.num}>{bf.toFixed(1)}</Text>
                <Text style={cur.unit}>%</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {(wDiff !== null || bfDiff !== null) && (
        <View style={cur.bottomRow}>
          {wDiff !== null && (
            <View style={cur.bottomItem}>
              <Text style={cur.diffNum}>{wDiff.toFixed(1)}<Text style={cur.diffUnit}> kg</Text></Text>
              <Text style={cur.diffLabel}>{wLabel}</Text>
            </View>
          )}
          {bfDiff !== null && (
            <View style={cur.bottomItem}>
              <Text style={cur.diffNum}>{bfDiff.toFixed(1)}<Text style={cur.diffUnit}> %</Text></Text>
              <Text style={cur.diffLabel}>{bfLabel}</Text>
            </View>
          )}
        </View>
      )}

      {leanMass !== null && (
        <>
          <View style={cur.sep} />
          <View style={cur.compRow}>
            <View style={cur.compItem}>
              <Text style={cur.compLabel}>LEAN MASS</Text>
              <Text style={cur.compNum}>{leanMass.toFixed(1)}<Text style={cur.compUnit}> kg</Text></Text>
            </View>
            <View style={cur.compItem}>
              <Text style={cur.compLabel}>FAT MASS</Text>
              <Text style={cur.compNum}>{fatMass!.toFixed(1)}<Text style={cur.compUnit}> kg</Text></Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const cur = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: colors.bg.elevated,
    borderRadius:    radius.card,
    padding:         8,
    gap:             6,
  },
  hdr:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconRing: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  hdrLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      9,
    letterSpacing: 2,
    color:         colors.text.muted,
  },
  metricsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  col:        { flex: 1, gap: 2 },
  divider: {
    width: 1, height: 30,
    backgroundColor: colors.border.subtle,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  metaLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      8,
    letterSpacing: 1.5,
    color:         colors.text.muted,
  },
  numRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  num: {
    fontFamily:         typography.fonts.display,
    fontSize:           28,
    lineHeight:         36,
    color:              colors.primary,
    includeFontPadding: false,
  },
  unit: {
    fontFamily:         typography.fonts.display,
    fontSize:           11,
    lineHeight:         18,
    color:              colors.text.secondary,
    includeFontPadding: false,
  },
  bottomRow:  { flexDirection: 'row', gap: 8 },
  bottomItem: { flex: 1, gap: 2 },
  diffNum: {
    fontFamily: typography.fonts.bold,
    fontSize:   12,
    fontWeight: '700',
    color:      colors.primary,
  },
  diffUnit: {
    fontFamily: typography.fonts.regular,
    fontSize:   10,
    fontWeight: '400',
    color:      colors.primary,
  },
  diffLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      8,
    letterSpacing: 1,
    color:         colors.text.muted,
  },
  sep: {
    height:          1,
    backgroundColor: colors.border.subtle,
    marginVertical:  2,
  },
  compRow:  { flexDirection: 'row', gap: 8 },
  compItem: { flex: 1, gap: 2 },
  compLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      8,
    letterSpacing: 1.5,
    color:         colors.text.muted,
  },
  compNum: {
    fontFamily: typography.fonts.bold,
    fontSize:   13,
    fontWeight: '700',
    color:      colors.text.primary,
  },
  compUnit: {
    fontFamily: typography.fonts.regular,
    fontSize:   10,
    fontWeight: '400',
    color:      colors.text.muted,
  },
});

// ── Target sub-card ───────────────────────────────────────────────────────────

function TargetCard({ targetWeight, targetBF, currentWeight, currentBF }: {
  targetWeight: number; targetBF: number | null;
  currentWeight: number; currentBF: number | null;
}) {
  const wDiff      = Math.abs(currentWeight - targetWeight);
  const wNeedUp    = currentWeight < targetWeight;
  const bfDiff     = targetBF !== null && currentBF !== null ? Math.abs(currentBF - targetBF) : null;
  const bfNeedDown = targetBF !== null && currentBF !== null ? currentBF > targetBF : false;

  const leanDelta = targetBF !== null && currentBF !== null
    ? (targetWeight * (1 - targetBF / 100)) - (currentWeight * (1 - currentBF / 100))
    : null;
  const fatDelta  = targetBF !== null && currentBF !== null
    ? (targetWeight * (targetBF / 100)) - (currentWeight * (currentBF / 100))
    : null;

  return (
    <View style={tgt.card}>
      <View style={tgt.hdr}>
        <View style={tgt.iconRing}>
          <Ionicons name="navigate-circle-outline" size={15} color={colors.text.inverse} />
        </View>
        <Text style={tgt.hdrLabel}>TARGET</Text>
      </View>

      <View style={tgt.metricsRow}>
        <View style={tgt.col}>
          <Text style={tgt.metaLabel}>WEIGHT</Text>
          <View style={tgt.numRow}>
            <Text style={tgt.num}>{targetWeight.toFixed(1)}</Text>
            <Text style={tgt.unit}>kg</Text>
          </View>
        </View>
        {targetBF !== null && (
          <>
            <View style={tgt.divider} />
            <View style={tgt.col}>
              <Text style={tgt.metaLabel}>BODY FAT</Text>
              <View style={tgt.numRow}>
                <Text style={tgt.num}>{targetBF.toFixed(1)}</Text>
                <Text style={tgt.unit}>%</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={tgt.toGoRow}>
        <View style={tgt.toGoItem}>
          <View style={tgt.arrowBubble}>
            <Ionicons name={wNeedUp ? 'arrow-up' : 'arrow-down'} size={13} color={colors.text.inverse} />
          </View>
          <View>
            <Text style={tgt.toGoNum}>{wDiff.toFixed(1)}<Text style={tgt.toGoUnit}> kg</Text></Text>
            <Text style={tgt.toGoLabel}>TO GO</Text>
          </View>
        </View>
        {bfDiff !== null && (
          <View style={tgt.toGoItem}>
            <View style={tgt.arrowBubble}>
              <Ionicons name={bfNeedDown ? 'arrow-down' : 'arrow-up'} size={13} color={colors.text.inverse} />
            </View>
            <View>
              <Text style={tgt.toGoNum}>{bfDiff.toFixed(1)}<Text style={tgt.toGoUnit}> %</Text></Text>
              <Text style={tgt.toGoLabel}>TO GO</Text>
            </View>
          </View>
        )}
      </View>

      {leanDelta !== null && (
        <>
          <View style={tgt.sep} />
          <View style={tgt.deltaRow}>
            <View style={tgt.deltaItem}>
              <View style={tgt.arrowBubble}>
                <Ionicons name={leanDelta >= 0 ? 'arrow-up' : 'arrow-down'} size={13} color={colors.text.inverse} />
              </View>
              <View>
                <Text style={tgt.deltaNum}>{Math.abs(leanDelta).toFixed(1)}<Text style={tgt.deltaUnit}> kg</Text></Text>
                <Text style={tgt.deltaLabel}>{leanDelta >= 0 ? 'LEAN GAIN' : 'LEAN LOSS'}</Text>
              </View>
            </View>
            <View style={tgt.deltaItem}>
              <View style={tgt.arrowBubble}>
                <Ionicons name={fatDelta! <= 0 ? 'arrow-down' : 'arrow-up'} size={13} color={colors.text.inverse} />
              </View>
              <View>
                <Text style={tgt.deltaNum}>{Math.abs(fatDelta!).toFixed(1)}<Text style={tgt.deltaUnit}> kg</Text></Text>
                <Text style={tgt.deltaLabel}>{fatDelta! <= 0 ? 'FAT LOSS' : 'FAT GAIN'}</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const tgt = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: colors.primary,
    borderRadius:    radius.card,
    padding:         8,
    gap:             6,
  },
  hdr:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconRing: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  hdrLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      9,
    letterSpacing: 2,
    color:         'rgba(0,0,0,0.5)',
  },
  metricsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  col:        { flex: 1, gap: 2 },
  divider: {
    width: 1, height: 30,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  metaLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      8,
    letterSpacing: 1.5,
    color:         'rgba(0,0,0,0.5)',
  },
  numRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  num: {
    fontFamily:         typography.fonts.display,
    fontSize:           28,
    lineHeight:         36,
    color:              colors.text.inverse,
    includeFontPadding: false,
  },
  unit: {
    fontFamily:         typography.fonts.display,
    fontSize:           11,
    lineHeight:         18,
    color:              'rgba(0,0,0,0.45)',
    includeFontPadding: false,
  },
  toGoRow:  { flexDirection: 'row', gap: 6 },
  toGoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrowBubble: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  toGoNum: {
    fontFamily: typography.fonts.bold,
    fontSize:   12,
    fontWeight: '700',
    color:      colors.text.inverse,
  },
  toGoUnit: {
    fontFamily: typography.fonts.regular,
    fontSize:   10,
    fontWeight: '400',
    color:      'rgba(0,0,0,0.45)',
  },
  toGoLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      8,
    letterSpacing: 1,
    color:         'rgba(0,0,0,0.45)',
  },
  sep: {
    height:          1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginVertical:  2,
  },
  deltaRow:  { flexDirection: 'row', gap: 6 },
  deltaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  deltaNum: {
    fontFamily: typography.fonts.bold,
    fontSize:   12,
    fontWeight: '700',
    color:      colors.text.inverse,
  },
  deltaUnit: {
    fontFamily: typography.fonts.regular,
    fontSize:   10,
    fontWeight: '400',
    color:      'rgba(0,0,0,0.45)',
  },
  deltaLabel: {
    fontFamily:    typography.fonts.display,
    fontSize:      8,
    letterSpacing: 1,
    color:         'rgba(0,0,0,0.45)',
  },
});

// ── Main export ───────────────────────────────────────────────────────────────

export function BodyCompositionCard({ data }: { data: BodyCompData }) {
  const today = WEEK[new Date().getDay()];

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Ionicons name="body-outline" size={13} color={colors.primary} />
          <Text style={s.title}>BODY COMPOSITION</Text>
        </View>
        <View style={s.dayPill}>
          <Ionicons name="calendar-outline" size={11} color={colors.text.muted} />
          <Text style={s.dayText}>{today}</Text>
        </View>
      </View>

      <View style={s.row}>
        <CurrentCard
          weight={data.currentWeight}
          bf={data.currentBF}
          targetWeight={data.targetWeight}
          targetBF={data.targetBF}
        />
        {data.targetWeight !== null && (
          <>
            <View style={{ width: 8 }} />
            <TargetCard
              targetWeight={data.targetWeight}
              targetBF={data.targetBF}
              currentWeight={data.currentWeight}
              currentBF={data.currentBF}
            />
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: colors.bg.card,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border.default,
    padding:         spacing.sm + 2,
    gap:             spacing.sm,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  dayText: { ...typography.caption, fontSize: 10, color: colors.text.secondary, fontWeight: '500' },
  row:     { flexDirection: 'row', flex: 1 },
});
