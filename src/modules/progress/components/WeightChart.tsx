/**
 * modules/progress/components/WeightChart.tsx
 *
 * Custom line chart of body weight over time, built from plain Views (no SVG
 * dependency): rotated segments connect the points, dots mark each log, and
 * the y-axis auto-scales to the data range with 25% padding.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WeightLog } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { fmtDate } from '../utils';

export function WeightChart({ logs }: { logs: WeightLog[] }) {
  const [w, setW] = useState(0);
  const H   = 160;
  const PAD = { top: 12, bottom: 28, left: 38, right: 12 };

  const cW = w - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const weights = logs.map(l => l.kg);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const span   = rawMax - rawMin || 2;
  const yMin   = rawMin - span * 0.25;
  const yMax   = rawMax + span * 0.25;

  const px = (i: number) =>
    PAD.left + (logs.length > 1 ? (i / (logs.length - 1)) * cW : cW / 2);
  const py = (kg: number) =>
    PAD.top + (1 - (kg - yMin) / (yMax - yMin)) * cH;

  const pts = logs.map((l, i) => ({ x: px(i), y: py(l.kg) }));

  const yTicks = [yMax, (yMin + yMax) / 2, yMin];

  return (
    <View style={{ height: H }} onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <>
          {yTicks.map((v, i) => (
            <React.Fragment key={i}>
              <View style={[cs.grid, { top: py(v), left: PAD.left }]} />
              <Text style={[cs.yLbl, { top: py(v) - 7 }]}>{v.toFixed(1)}</Text>
            </React.Fragment>
          ))}

          {pts.slice(1).map((pt, i) => {
            const prev = pts[i];
            const dx = pt.x - prev.x;
            const dy = pt.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left:  (prev.x + pt.x) / 2 - len / 2,
                  top:   (prev.y + pt.y) / 2 - 1,
                  width: len, height: 2, borderRadius: 1,
                  backgroundColor: colors.primary,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}

          {pts.map((pt, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pt.x - 5, top: pt.y - 5,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: colors.primary,
                borderWidth: 2, borderColor: colors.bg.card,
              }}
            />
          ))}

          <Text style={[cs.xLbl, { left: PAD.left }]}>{fmtDate(logs[0].date)}</Text>
          {logs.length > 1 && (
            <Text style={[cs.xLbl, { right: PAD.right, textAlign: 'right' }]}>
              {fmtDate(logs[logs.length - 1].date)}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  grid: { position: 'absolute', right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
  yLbl: { position: 'absolute', left: 0, width: 34, ...typography.caption, color: colors.text.muted, textAlign: 'right' },
  xLbl: { position: 'absolute', bottom: 0, ...typography.caption, color: colors.text.muted },
});
