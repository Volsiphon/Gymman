import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { TodayTargets } from './TodayTargets';
import type { Targets } from './TodayTargets';
import { BodyCompositionCard } from './BodyCompositionCard';
import type { BodyCompData } from './BodyCompositionCard';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const CARD_WIDTH = Dimensions.get('window').width - spacing.screenPadding * 2;
const AUTO_MS    = 7000;

interface Props {
  targets:  Targets;
  bodyComp: BodyCompData | null;
}

export function TargetsCarousel({ targets, bodyComp }: Props) {
  const scrollRef  = useRef<ScrollView>(null);
  const [page, setPage]     = useState(0);
  const [cardH, setCardH]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pages    = bodyComp ? 2 : 1;

  const scrollToPage = useCallback((p: number, animated = true) => {
    scrollRef.current?.scrollTo({ x: p * CARD_WIDTH, animated });
    setPage(p);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pages < 2) return;
    timerRef.current = setInterval(() => {
      setPage(prev => {
        const next = (prev + 1) % pages;
        scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
        return next;
      });
    }, AUTO_MS);
  }, [pages]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  if (pages === 1) return <TodayTargets targets={targets} />;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ width: CARD_WIDTH }}
        onScrollBeginDrag={resetTimer}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
          setPage(p);
          resetTimer();
        }}
      >
        <View
          style={{ width: CARD_WIDTH }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > cardH) setCardH(h);
          }}
        >
          <TodayTargets targets={targets} />
        </View>
        <View style={{ width: CARD_WIDTH, ...(cardH > 0 && { height: cardH }) }}>
          <BodyCompositionCard data={bodyComp!} />
        </View>
      </ScrollView>

      <View style={s.dots}>
        {Array.from({ length: pages }, (_, i) => (
          <TouchableOpacity
            key={i}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => { scrollToPage(i); resetTimer(); }}
          >
            <View style={[s.dot, i === page && s.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            6,
    marginTop:      4,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.border.subtle,
  },
  dotActive: {
    width:           16,
    backgroundColor: colors.primary,
  },
});
