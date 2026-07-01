/**
 * modules/onboarding/screens/ExecutionPlanScreen.tsx
 *
 * The final onboarding screen. Calls executionPlan.ts to generate a personalised
 * training + diet guide from the user's goal analysis results, then displays it as
 * a scrollable formatted plan. When the user taps "Start", the profile is already
 * saved (saveUserProfile writes straight to the database — see
 * services/storage/localEnvelope.ts), so this just navigates to the main app. This
 * is the screen where the user's journey officially begins.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/app/navigation';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import type { UserProfile } from '@/types/user';
import {
  generateExecutionContent,
  type ExecutionContent,
} from '@/services/ai/executionPlan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'ExecutionPlan'>;
};

// ─── Sub-components (defined outside to prevent remount on render) ─────────────

function PillarProgress({ current }: { current: number }) {
  return (
    <View style={styles.progressBar}>
      {[1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            i <= current ? styles.progressFilled : styles.progressEmpty,
          ]}
        />
      ))}
    </View>
  );
}

function SectionLabel({ n, text }: { n: string; text: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelNum}>PILLAR {n} —</Text>
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );
}

function FeatureBridge({
  icon,
  title,
  desc,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.bridge}>
      <View style={styles.bridgeLeft}>
        <View style={styles.bridgeIcon}>
          <Ionicons name={icon} size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.bridgeTitle}>{title}</Text>
          <Text style={styles.bridgeDesc}>{desc}</Text>
        </View>
      </View>
      <Ionicons name="arrow-forward" size={15} color={colors.primary} />
    </View>
  );
}

function AiLoading() {
  return (
    <View style={styles.aiLoading}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.aiLoadingText}>Personalising for you…</Text>
    </View>
  );
}

function MacroRow({ profile }: { profile: UserProfile }) {
  const items = [
    { label: 'Calories', value: Math.round(profile.calorieTarget ?? 0), unit: 'kcal', color: colors.primary },
    { label: 'Protein',  value: Math.round(profile.proteinG ?? 0),      unit: 'g',    color: colors.info },
    { label: 'Carbs',    value: Math.round(profile.carbsG ?? 0),         unit: 'g',    color: colors.gold },
    { label: 'Fats',     value: Math.round(profile.fatsG ?? 0),          unit: 'g',    color: colors.flame.two },
  ];
  return (
    <View style={styles.macroRow}>
      {items.map((item, i) => (
        <View key={i} style={styles.macroCell}>
          <Text style={[styles.macroValue, { color: item.color }]}>{item.value}</Text>
          <Text style={styles.macroUnit}>{item.unit}</Text>
          <Text style={styles.macroLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ExecutionPlanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ai, setAi] = useState<ExecutionContent | null>(null);
  const [step, setStep] = useState(0); // 0 = hero, 1–5 = pillars

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserProfile().then(p => {
      if (!p) return;
      setProfile(p);
      generateExecutionContent(p).then(setAi);
    });
  }, []);

  if (!profile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const gt = profile.goalType ?? 'recomp';
  const isBodyComp = gt !== 'non-body-comp-minor' && gt !== 'non-body-comp-major';

  function goToStep(next: number) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(20);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    });
  }

  function handleBack() {
    if (step === 0) navigation.goBack();
    else goToStep(step - 1);
  }

  // ── Section 1: Training ────────────────────────────────────────────────────

  function renderTraining() {
    if (!isBodyComp) {
      return (
        <>
          <SectionLabel n="01" text="TRAINING" />
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.dangerMuted }]}>
                <Ionicons name="shield-outline" size={18} color={colors.danger} />
              </View>
              <Text style={styles.cardTitle}>Get professional guidance first</Text>
            </View>
            <Text style={styles.cardBody}>
              Your goal involves rehab or structural correction — territory where the wrong exercise causes real harm. See a physiotherapist before following any training programme.
            </Text>
            <Text style={styles.cardBody}>
              Once you have a professional's assessment, bring it to Gymman's Training section and we'll help you execute it safely.
            </Text>
          </View>
          <FeatureBridge
            icon="barbell-outline"
            title="Training section"
            desc="There is a section in the app dedicated to Training and Rehab Routines. Talk to the Ai there to create a personalized routine for yourself. You can also log your daily training there and we store your historical logs. The Ai trainer learns your training habits through time: do you skip the last sets often? Do you skip some reps on leg day? The coach knows. And it will be mad if you do that, so don't. Anyway, all things training, we got you covered."
          />
        </>
      );
    }

    return (
      <>
        <SectionLabel n="01" text="TRAINING" />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="barbell-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Your training approach</Text>
          </View>
          {ai ? <Text style={styles.cardBody}>{ai.training.approach}</Text> : <AiLoading />}
        </View>

        {ai && ai.training.phases && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.goldMuted }]}>
                <Ionicons name="layers-outline" size={18} color={colors.gold} />
              </View>
              <Text style={styles.cardTitle}>The phases</Text>
            </View>
            <Text style={styles.cardBody}>{ai.training.phases}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.successMuted }]}>
              <Ionicons name="flag-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>The one thing you can't skip</Text>
          </View>
          {ai ? <Text style={styles.cardBody}>{ai.training.keyFocus}</Text> : <AiLoading />}
        </View>

        <FeatureBridge
          icon="barbell-outline"
          title="Training section"
          desc="There is a section in the app dedicated to Training and Training Routines. Talk to the Ai there to create a personalized routine for yourself. You can also log your daily training there and we store your historical logs. The Ai trainer learns your training habits through time: do you skip the last sets often? Do you skip some reps on leg day? The coach knows. And it will be mad if you do that, so don't. Anyway, all things training, we got you covered."
        />
      </>
    );
  }

  // ── Section 2: Nutrition ───────────────────────────────────────────────────

  function renderDiet() {
    const tdee = Math.round(profile!.tdee ?? 0);
    const cal = Math.round(profile!.calorieTarget ?? 0);
    const offset = cal - tdee;
    const offsetLabel =
      offset < 0
        ? `${Math.abs(offset)} kcal below maintenance`
        : offset > 0
        ? `${offset} kcal above maintenance`
        : 'at maintenance';

    return (
      <>
        <SectionLabel n="02" text="NUTRITION" />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.successMuted }]}>
              <Ionicons name="restaurant-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.cardTitle}>Your dietary strategy</Text>
          </View>
          {ai ? <Text style={styles.cardBody}>{ai.diet.approach}</Text> : <AiLoading />}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="calculator-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Your daily targets</Text>
          </View>
          <MacroRow profile={profile!} />
          <View style={styles.inlineNote}>
            <Ionicons name="information-circle-outline" size={13} color={colors.text.muted} />
            <Text style={styles.inlineNoteText}>{offsetLabel} · TDEE {tdee} kcal</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.goldMuted }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.gold} />
            </View>
            <Text style={styles.cardTitle}>These start as estimates</Text>
          </View>
          <Text style={styles.cardBody}>
            These numbers are built from validated, peer-reviewed formulas — educated, science-backed estimates. But they're still estimates. Real metabolic rates vary by up to 150 kcal even between people with identical measurements and activity levels.
          </Text>
          <Text style={styles.cardBody}>
            This is exactly why Gymman has a built-in Weekly Review. Every 7 days, the app looks at what actually happened to your body and recalibrates your targets to match your real metabolism — not a formula's prediction.
          </Text>

          <Text style={styles.cardSubhead}>What makes the Weekly Review possible</Text>

          <View style={styles.reviewCards}>
            <View style={styles.reviewCard}>
              <Ionicons name="scale-outline" size={22} color={colors.info} />
              <Text style={styles.reviewCardTitle}>Progress</Text>
              <Text style={styles.reviewCardDesc}>
                Log your body weight every morning. The app tracks your trend to see if you're actually losing or gaining at the predicted rate — and adjusts if you're not.
              </Text>
            </View>
            <View style={styles.reviewCard}>
              <Ionicons name="camera-outline" size={22} color={colors.gold} />
              <Text style={styles.reviewCardTitle}>Photos</Text>
              <Text style={styles.reviewCardDesc}>
                Add physique photos to track visual change over time. We only use photos you explicitly allow us to access — never without your permission.
              </Text>
            </View>
          </View>

          <View style={styles.highlightNote}>
            <Ionicons name="sync-circle-outline" size={14} color={colors.primaryLight} />
            <Text style={[styles.inlineNoteText, { color: colors.primaryLight }]}>
              The more consistently you log weight and check in, the more accurate your Weekly Review becomes — and the more precisely your plan calibrates to you specifically.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.infoMuted }]}>
              <Ionicons name="nutrition-outline" size={18} color={colors.info} />
            </View>
            <Text style={styles.cardTitle}>The nutritional non-negotiable</Text>
          </View>
          {ai ? <Text style={styles.cardBody}>{ai.diet.keyFocus}</Text> : <AiLoading />}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.dangerMuted }]}>
              <Ionicons name="warning-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.cardTitle}>What people struggle with</Text>
          </View>
          {ai ? <Text style={styles.cardBody}>{ai.diet.commonStruggle}</Text> : <AiLoading />}
          <View style={styles.shopNote}>
            <Ionicons name="bag-handle-outline" size={14} color={colors.primary} />
            <Text style={styles.shopNoteText}>
              <Text style={styles.shopNoteAccent}>Gymman Shop</Text>
              {' '}carries only tested, trusted products — nothing we haven't vetted ourselves. If you're struggling to hit a macro, it's the right place to start.
            </Text>
          </View>
        </View>

        <FeatureBridge
          icon="restaurant-outline"
          title="Diet section"
          desc="We have a dedicated Diet section where you can log your daily meals. Take a photo of your food, and it logs it for you. Or you can also log manually. There is a dedicated nutrition Ai coach in the section that can help you with every diet related confusion. We also store your historical daily diet, which helps us help you. And you to help yourself."
        />
      </>
    );
  }

  // ── Section 3: Calory Burn ─────────────────────────────────────────────────

  function renderCaloryBurn() {
    return (
      <>
        <SectionLabel n="03" text="CALORY BURN" />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.dangerMuted }]}>
              <Ionicons name="flame-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.cardTitle}>DAILY CALORY BURN</Text>
          </View>
          <Text style={styles.cardBody}>
            There is a calory burn section in the app that helps you track your daily calory burn. Did you swim today? Play football or climbed the stairs of Burj Khalifa? Then you've burned calories. Our current diet section and Gymman in general uses your rough activity level to count how many calories your body needs today. But rough activity level does not show the reality of your day to day life. So, the Calory Burn section allows you to dynamically log your daily activities instead of relying on a, again, ROUGH activity level. Track your daily burn to get the most accurate results.
          </Text>

          <View style={styles.comparison}>
            <View style={[styles.compCard, styles.compCardBad]}>
              <Text style={styles.compCardTitle}>Without logging</Text>
              <Text style={styles.compCardBody}>
                Fixed calory budget every day. Rest days and hard training days are treated identically. Over weeks, the mismatch quietly stalls or overshoots your goal.
              </Text>
            </View>
            <View style={[styles.compCard, styles.compCardGood]}>
              <Text style={[styles.compCardTitle, { color: colors.primary }]}>With logging</Text>
              <Text style={styles.compCardBody}>
                The budget adjusts to what you actually burned. Big training day? More room to eat. Rest day? Deficit tightens. Your body responds to real daily energy flux — not weekly averages.
              </Text>
            </View>
          </View>

          <View style={styles.highlightNote}>
            <Ionicons name="flash-outline" size={14} color={colors.primary} />
            <Text style={[styles.inlineNoteText, { color: colors.text.secondary }]}>
              Turn on Dynamic Mode in calory burn section if you are going to log. Dynamic Mode automatically raises or lowers your daily calorie budget based on your logged burn. This will make the system alive and responsive instead of static. DO IT if you want to go ALL IN.
            </Text>
          </View>
        </View>

        <FeatureBridge
          icon="flame-outline"
          title="Calory Burn section"
          desc="Log workouts and daily activity — keep your budget accurate and responsive. Turn on Dynamic Mode if logging."
        />
      </>
    );
  }

  // ── Section 4: Bloodwork ───────────────────────────────────────────────────

  function renderBloodwork() {
    return (
      <>
        <SectionLabel n="04" text="BLOODWORK" />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.dangerMuted }]}>
              <Ionicons name="water-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.cardTitle}>BLOOD TELLS YOU THINGS</Text>
          </View>
          <Text style={styles.cardBody}>
            Body weight and photos tell you what's happening on the outside. Blood markers tell you what's happening inside — and sometimes the inside picture contradicts the outside one entirely. It's a really good idea to get a bloodtest done if you are serious, though this is not a must, it is definitely a BIG PLUS.
          </Text>
          <Text style={styles.cardBody}>
            Testosterone, thyroid hormones, vitamin D, iron, cortisol, and metabolic panels directly affect how well your body loses fat, builds muscle, recovers from training, and functions day to day. You can do everything right and still plateau because of something a blood test would catch in 10 minutes. So, once you get into the rhythm, get one done. And when you get it done, log everything in Gymman's dedicated Bloodwork section. And keep adding to it once every few months, or monthly if you can afford it. Check the Bloodwork section once you are in the app to know what tests you should get done. Given below is a rough overview of what you can log.
          </Text>

          <Text style={styles.cardSubhead}>EXAMPLE OF THINGS YOU CAN LOG</Text>
          {[
            'Hormone panels — testosterone, cortisol, thyroid (TSH, T3, T4)',
            'Metabolic markers — fasting glucose, insulin, HbA1c',
            'Micronutrients — Vitamin D, B12, Iron, Ferritin',
            'Lipid panel — cholesterol, triglycerides, HDL/LDL',
          ].map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}

          <View style={[styles.highlightNote, { backgroundColor: colors.goldMuted, borderColor: colors.gold + '30' }]}>
            <Ionicons name="trending-up-outline" size={14} color={colors.gold} />
            <Text style={[styles.inlineNoteText, { color: colors.text.secondary }]}>
              We would suggest you get panels every 3–6 months while training seriously. Trends over time matter more than any single reading — the app stores all of it so you can watch patterns develop. If you ask the our main AI coach, it would also remember your bloodwork trends, capable of tracking the changes and making educated inference on it.
            </Text>
          </View>
        </View>

        <FeatureBridge
          icon="water-outline"
          title="Bloodwork section"
          desc="Log panels, track markers over time, see what's actually holding you back"
        />
      </>
    );
  }

  // ── Section 5: The Long Game ───────────────────────────────────────────────

  function renderLongGame() {
    return (
      <>
        <SectionLabel n="05" text="THE LONG GAME" />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="infinite-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>YOU CAN HAVE THE BEST PLAN AND HELP FROM A CUTTING EDGE SYSTEM LIKE GYMMAN, but without consistency, it's WORTHLESS! WORTH-LESS!</Text>
          </View>
          <Text style={styles.cardBody}>
            So, let us give you a quick view of what would happen if you use all of Gymman's features for an extended time. Spoilers: it will change your life. Gymman's functions essentially optimize your approach of most major fitness systems: Training, Nutrition, Daily Activity, Bloodwork. Week 1, the app is still gathering info on you but works based on highly educated and scientific estimates. By week 2, app knows you and your plan will be much more optimized. Following it, you will be able to reach your goal. Month 1 is calibration. By then, Gymman will begin to become your partner in fitness. A coach in your phone that knows more about you than you yourself. No human coach can remember everything Gymman can about you, but Gymman? It knows and tracks everything about you. Your daily food, gym work, blood work trends, weight trends, body transformation. EVERYTHING.
          </Text>
          <Text style={styles.cardBody}>
            So, using the app consistently is you giving yourself the best coaching and fitness support you can get online. If you follow through without 'larping,' you will make steady progress towards achieving your goal. And eventually, you will.
          </Text>
          <Text style={styles.cardBody}>
            Each week of logging makes the next week's plan sharper.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(251,146,60,0.15)' }]}>
              <Ionicons name="flame" size={18} color={colors.flame.two} />
            </View>
            <Text style={styles.cardTitle}>The streak mechanism in the app — your consistency engine</Text>
          </View>

          <View style={styles.flameRow}>
            {[
              { label: 'Starting out', color: colors.flame.one },
              { label: 'Building habit', color: colors.flame.two },
              { label: 'Locked in', color: colors.primary },
            ].map((f, i) => (
              <View key={i} style={styles.flameCell}>
                <Ionicons name="flame" size={30} color={f.color} />
                <Text style={[styles.flameCellLabel, { color: f.color }]}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.cardBody}>
            Every day you use the core functions — log a meal, log a burn, check in your weight — your streak grows. It's not a gamification gimmick. A streak is a visible record of the only thing that actually determines results: showing up, being consistent.
          </Text>
          <Text style={styles.cardBody}>
            Streaks act as a forcing function on the days you don't feel like it. You can set how hard you want to make streaks: do you want the training streak to only appear if you finish the day's training? You can do that. Or do you want the streak to appear if you log just one training? You can do that as well, but why are you such a lazy... b$ch? Anyway, streaks work the same way for diet and cal burn and weight logging. Those streaks and consistency is exactly the thing that separate people who transform from people who restart from zero every few months. Use streaks.
          </Text>

          <View style={styles.highlightNote}>
            <Ionicons name="trophy-outline" size={14} color={colors.primary} />
            <Text style={[styles.inlineNoteText, { color: colors.text.secondary }]}>
              Your streak lives on the Plan screen — the first thing you see every day. Because it's the most important metric in the app. There are four streaks in total: One for logging your daily weight, one for training, one for diet, and one for logging your calory burn. Get all of them daily if you are really serious, it's easy work.
            </Text>
          </View>
        </View>
      </>
    );
  }

  // ── Root ──────────────────────────────────────────────────────────────────────

  const isLastStep = step === 5;
  const isPillarStep = step >= 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        {isPillarStep ? (
          <PillarProgress current={step} />
        ) : (
          <Text style={styles.headerTitle}>Execution Plan</Text>
        )}
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          { flex: 1 },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {step === 0 ? (
          <View style={styles.heroStep}>
            <Text style={styles.heroTitle}>
              We have curated an Execution Protocol to help you achieve your Goal.
            </Text>
            <Text style={styles.heroSub}>
              There are five pillars of fitness that anyone serious about attaining an ambitious fitness goal needs to take care of. Training, Nutrition, etc. This is work that decides whether you get the result. Gymman makes everything about them easy. Read the info below, then go use the app.
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
            showsVerticalScrollIndicator={false}
          >
            {step === 1 && renderTraining()}
            {step === 2 && renderDiet()}
            {step === 3 && renderCaloryBurn()}
            {step === 4 && renderBloodwork()}
            {step === 5 && renderLongGame()}
          </ScrollView>
        )}
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isLastStep ? (
          <>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => {
                navigation.getParent()?.reset({
                  index: 0,
                  routes: [{ name: 'Main' as never }],
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>I'm ready — let's start</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.text.inverse}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => navigation.navigate('GoalDescription')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh-outline"
                size={15}
                color={colors.text.muted}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.ghostBtnText}>Re-describe my goal</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => goToStep(step + 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {step === 0 ? 'Read my plan' : 'Next'}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.text.inverse}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  loader: {
    flex: 1,
    backgroundColor: colors.bg.app,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: { ...typography.subhead, color: colors.text.secondary },

  // ── Progress bar ───────────────────────────────────────────────────────────
  progressBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  progressFilled: { backgroundColor: colors.primary },
  progressEmpty: { backgroundColor: colors.bg.elevated },

  // ── Hero step ──────────────────────────────────────────────────────────────
  heroStep: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  heroTitle: {
    ...typography.title1,
    color: colors.text.primary,
    textAlign: 'center',
  },
  heroSub: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
    textAlign: 'center',
  },

  // ── Scroll (pillar steps) ──────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
  },

  // ── Section label ──────────────────────────────────────────────────────────
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLabelNum: {
    ...typography.label,
    color: colors.primary,
    fontSize: 11,
  },
  sectionLabelText: {
    ...typography.label,
    color: colors.text.muted,
    fontSize: 11,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  cardSubhead: {
    ...typography.footnote,
    color: colors.text.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  cardBody: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },

  // ── AI loading ─────────────────────────────────────────────────────────────
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  aiLoadingText: {
    ...typography.footnote,
    color: colors.text.muted,
  },

  // ── Inline note ────────────────────────────────────────────────────────────
  inlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineNoteText: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 18,
  },

  // ── Highlight note ─────────────────────────────────────────────────────────
  highlightNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },

  // ── Macro row ──────────────────────────────────────────────────────────────
  macroRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  macroCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  macroValue: {
    fontFamily: 'Anton_400Regular',
    fontSize: 24,
    lineHeight: 28,
    color: colors.primary,
  },
  macroUnit: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 10,
  },
  macroLabel: {
    ...typography.caption,
    color: colors.text.disabled,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Weekly review cards ────────────────────────────────────────────────────
  reviewCards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reviewCard: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  reviewCardTitle: {
    ...typography.subhead,
    color: colors.text.primary,
  },
  reviewCardDesc: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 17,
  },

  // ── Shop note ──────────────────────────────────────────────────────────────
  shopNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  shopNoteText: {
    ...typography.footnote,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  shopNoteAccent: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Calory burn comparison ─────────────────────────────────────────────────
  comparison: {
    gap: spacing.sm,
  },
  compCard: {
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
  },
  compCardBad: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger + '30',
  },
  compCardGood: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  compCardTitle: {
    ...typography.subhead,
    color: colors.text.primary,
  },
  compCardBody: {
    ...typography.footnote,
    color: colors.text.secondary,
    lineHeight: 18,
  },

  // ── Bullet list ────────────────────────────────────────────────────────────
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    ...typography.callout,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 22,
  },

  // ── Flame row ──────────────────────────────────────────────────────────────
  flameRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  flameCell: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  flameCellLabel: {
    ...typography.caption,
    fontSize: 10,
    letterSpacing: 0.2,
  },

  // ── Feature bridge ─────────────────────────────────────────────────────────
  bridge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bridgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  bridgeIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bridgeTitle: {
    ...typography.subhead,
    color: colors.primary,
  },
  bridgeDesc: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 17,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.bg.app,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    gap: spacing.xs,
  },
  continueBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  continueBtnText: { ...typography.bodyMedium, color: colors.text.inverse },
  ghostBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ghostBtnText: { ...typography.footnote, color: colors.text.muted },
});
