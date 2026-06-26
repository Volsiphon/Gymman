import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Dimensions, Alert, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Shop'>;

const { width: W } = Dimensions.get('window');

// ── Local images ──────────────────────────────────────────────────────────────

const IMG = {
  hero:         require('../../../../assets/images/gym_shit/hero_gym.jpg'),
  wheyProtein:  require('../../../../assets/images/gym_shit/whey_protein.jpg'),
  creatine:     require('../../../../assets/images/gym_shit/creatine.jpg'),
  focusPlus:    require('../../../../assets/images/gym_shit/focus_plus.jpg'),
  plantProtein: require('../../../../assets/images/gym_shit/plant_protein.jpg'),
  magnesium:    require('../../../../assets/images/gym_shit/magnesium_b6.jpg'),
  sleepWell:    require('../../../../assets/images/gym_shit/lifestyle.jpg'),
  nikeBag:      require('../../../../assets/images/gym_shit/nike_bag.jpg'),
  waterBottle:  require('../../../../assets/images/gym_shit/water_bottle.jpg'),
  nbShoes:      require('../../../../assets/images/gym_shit/nb_shoes.jpg'),
  pumpCover:    require('../../../../assets/images/gym_shit/pump_cover.jpg'),
  focusDark:    require('../../../../assets/images/gym_shit/focus_dark.jpg'),
};

// ── Data ──────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  originalPrice?: string;
  image: ReturnType<typeof require>;
  badge?: string;
  rating: number;
  reviews: number;
};

const CATEGORIES = [
  { label: 'Supplements', image: IMG.focusPlus },
  { label: 'Equipment',   image: IMG.nikeBag },
  { label: 'Apparel',     image: IMG.pumpCover },
  { label: 'Recovery',    image: IMG.magnesium },
];

const FEATURED: Product[] = [
  { id: 'f1', name: 'Gold Standard Whey', brand: 'Optimum Nutrition', price: '₹2,499', originalPrice: '₹3,200', image: IMG.wheyProtein,  badge: 'Coach Pick', rating: 4.8, reviews: 1240 },
  { id: 'f2', name: 'FOCUS+ Pre-Workout', brand: 'Emrald Labs',       price: '₹1,599',                         image: IMG.focusPlus,    badge: 'New',        rating: 4.6, reviews: 428  },
  { id: 'f3', name: 'Plant Protein 1kg',  brand: 'Green Choice',      price: '₹1,899', originalPrice: '₹2,400', image: IMG.plantProtein,                      rating: 4.7, reviews: 312  },
  { id: 'f4', name: 'Sleep Well Gummies', brand: 'Zennova',           price: '₹999',  originalPrice: '₹1,299', image: IMG.sleepWell,   badge: 'Top Pick',   rating: 4.9, reviews: 887  },
];

const BESTSELLERS: Product[] = [
  { id: 'b1', name: 'Creatine Mono 500g',    brand: 'Atlhetica',   price: '₹999',  originalPrice: '₹1,299', image: IMG.creatine,     badge: 'Best Seller', rating: 4.8, reviews: 2104 },
  { id: 'b2', name: 'Pump Cover Oversized',  brand: 'PR Studios',  price: '₹1,499',                         image: IMG.pumpCover,   badge: 'New',         rating: 4.7, reviews: 631  },
  { id: 'b3', name: 'WB-1 Water Bottle',     brand: 'Healthish',   price: '₹1,299', originalPrice: '₹1,699', image: IMG.waterBottle,                       rating: 4.5, reviews: 918  },
  { id: 'b4', name: 'New Balance 530',       brand: 'New Balance', price: '₹8,999', originalPrice: '₹10,999',image: IMG.nbShoes,     badge: 'Sale',        rating: 4.9, reviews: 3210 },
  { id: 'b5', name: 'Nike Brasilia Bag',     brand: 'Nike',        price: '₹3,499', originalPrice: '₹4,500', image: IMG.nikeBag,                           rating: 4.6, reviews: 1456 },
  { id: 'b6', name: 'Magnesium + B6',        brand: 'NeuroYou',    price: '₹849',                           image: IMG.magnesium,                          rating: 4.5, reviews: 774  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(price: string, orig: string) {
  return Math.round((1 - parseInt(price.replace(/\D/g, '')) / parseInt(orig.replace(/\D/g, ''))) * 100);
}

function comingSoon(item: Product) {
  Alert.alert(item.name, `${item.brand}  ·  ${item.price}\n\nFull listings launching soon.`, [
    { text: 'Notify me', onPress: () => Alert.alert('Saved!', "We'll notify you when the shop goes live.") },
    { text: 'Close', style: 'cancel' },
  ]);
}

// ── Featured card (tall portrait, text overlaid on image) ─────────────────────

const FEAT_W = W * 0.56;

function FeaturedCard({ item }: { item: Product }) {
  const disc = item.originalPrice ? pct(item.price, item.originalPrice) : null;
  return (
    <TouchableOpacity style={[fc.card, { width: FEAT_W }]} activeOpacity={0.92} onPress={() => comingSoon(item)}>
      <Image source={item.image} style={fc.img} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={StyleSheet.absoluteFill} />

      {item.badge && (
        <View style={[fc.badge,
          item.badge === 'New'      && { backgroundColor: colors.info },
          item.badge === 'Sale'     && { backgroundColor: colors.danger },
          item.badge === 'Top Pick' && { backgroundColor: colors.gold },
        ]}>
          <Text style={fc.badgeTxt}>{item.badge}</Text>
        </View>
      )}
      {disc && <View style={fc.discPill}><Text style={fc.discTxt}>−{disc}%</Text></View>}

      <View style={fc.bottom}>
        <Text style={fc.brandTxt}>{item.brand.toUpperCase()}</Text>
        <Text style={fc.nameTxt} numberOfLines={2}>{item.name}</Text>
        <View style={fc.priceRow}>
          <Text style={fc.price}>{item.price}</Text>
          {item.originalPrice && <Text style={fc.orig}>{item.originalPrice}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Best-seller card (image top, info below) ──────────────────────────────────

const BS_W = (W - spacing.screenPadding * 2 - spacing.sm) / 2;

function BestSellerCard({ item }: { item: Product }) {
  const disc = item.originalPrice ? pct(item.price, item.originalPrice) : null;
  return (
    <TouchableOpacity style={[bc.card, { width: BS_W }]} activeOpacity={0.9} onPress={() => comingSoon(item)}>
      <View style={bc.imgWrap}>
        <Image source={item.image} style={bc.img} resizeMode="cover" />
        {item.badge && (
          <View style={[bc.badge,
            item.badge === 'New'         && { backgroundColor: colors.info },
            item.badge === 'Sale'        && { backgroundColor: colors.danger },
            item.badge === 'Best Seller' && { backgroundColor: colors.primary },
          ]}>
            <Text style={bc.badgeTxt}>{item.badge}</Text>
          </View>
        )}
        {disc && <View style={bc.discPill}><Text style={bc.discTxt}>−{disc}%</Text></View>}
      </View>
      <View style={bc.info}>
        <Text style={bc.brand}>{item.brand}</Text>
        <Text style={bc.name} numberOfLines={2}>{item.name}</Text>
        <View style={bc.stars}>
          {[1,2,3,4,5].map(i => (
            <Ionicons key={i} name={i <= Math.round(item.rating) ? 'star' : 'star-outline'} size={10} color={colors.gold} />
          ))}
          <Text style={bc.reviewCount}>({item.reviews >= 1000 ? `${(item.reviews/1000).toFixed(1)}k` : item.reviews})</Text>
        </View>
        <View style={bc.priceRow}>
          <Text style={bc.price}>{item.price}</Text>
          {item.originalPrice && <Text style={bc.orig}>{item.originalPrice}</Text>}
        </View>
        <TouchableOpacity style={bc.addBtn} onPress={() => comingSoon(item)} activeOpacity={0.8}>
          <Text style={bc.addTxt}>Add to cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ShopScreen(_: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.storeName}>GYMMAN<Text style={s.accent}> SHOP</Text></Text>
        <View style={s.headerRight}>
          <Ionicons name="search-outline" size={22} color={colors.text.secondary} />
          <TouchableOpacity onPress={() => Alert.alert('Cart', 'Cart coming soon!')}>
            <Ionicons name="bag-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <ImageBackground source={IMG.hero} style={s.hero} resizeMode="cover">
          <LinearGradient
            colors={['rgba(20,22,26,0.15)', 'rgba(20,22,26,0.88)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroContent}>
            <View style={s.heroPill}>
              <Text style={s.heroPillTxt}>LAUNCH OFFER · UP TO 30% OFF</Text>
            </View>
            <Text style={s.heroTitle}>Power Your{'\n'}Training.</Text>
            <Text style={s.heroSub}>Coach-curated. Tested. Delivered.</Text>
            <TouchableOpacity
              style={s.heroBtn}
              activeOpacity={0.88}
              onPress={() => Alert.alert('Coming soon', 'The shop launches very soon!')}
            >
              <Text style={s.heroBtnTxt}>Shop the Collection</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* ── Categories ── */}
        <View style={s.sectionHead}>
          <Text style={s.sectionEye}>BROWSE</Text>
          <Text style={s.sectionTitle}>Shop by Category</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.label} style={s.catTile} activeOpacity={0.88}
              onPress={() => Alert.alert(cat.label, 'Full category page coming soon!')}
            >
              <Image source={cat.image} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
              <Text style={s.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Featured / Coach's Picks ── */}
        <View style={s.sectionHead}>
          <Text style={s.sectionEye}>HANDPICKED</Text>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Coach's Picks</Text>
            <TouchableOpacity onPress={() => Alert.alert('View all', 'Coming soon!')}>
              <Text style={s.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featRow}>
          {FEATURED.map(item => <FeaturedCard key={item.id} item={item} />)}
        </ScrollView>

        {/* ── Best Sellers ── */}
        <View style={s.sectionHead}>
          <Text style={s.sectionEye}>TRENDING NOW</Text>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Best Sellers</Text>
            <TouchableOpacity onPress={() => Alert.alert('View all', 'Coming soon!')}>
              <Text style={s.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.bsGrid}>
          {BESTSELLERS.map(item => <BestSellerCard key={item.id} item={item} />)}
        </View>

        {/* ── Trust strip ── */}
        <View style={s.trust}>
          {[
            { icon: 'shield-checkmark', label: '3rd-Party\nTested' },
            { icon: 'close-circle',     label: 'No Fakes\nor Clones' },
            { icon: 'refresh-circle',   label: '7-Day\nReturns' },
            { icon: 'flash-circle',     label: 'Fast\nDelivery' },
          ].map(t => (
            <View key={t.label} style={s.trustItem}>
              <Ionicons name={t.icon as any} size={28} color={colors.primary} />
              <Text style={s.trustLbl}>{t.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
  },
  storeName:   { fontFamily: typography.fonts.display, fontSize: 20, letterSpacing: 1, color: colors.text.primary },
  accent:      { color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  // Hero
  hero:        { height: 430, justifyContent: 'flex-end' },
  heroContent: { padding: spacing.screenPadding, paddingBottom: spacing.xl, gap: 10 },
  heroPill: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryMuted,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primaryBorder,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  heroPillTxt: { ...typography.label, color: colors.primary, fontSize: 10 },
  heroTitle:   { fontFamily: typography.fonts.display, fontSize: 50, lineHeight: 54, color: colors.white },
  heroSub:     { ...typography.callout, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 13,
    borderRadius: radius.button, marginTop: 4,
  },
  heroBtnTxt: { ...typography.bodyMedium, color: colors.text.inverse },

  // Section headers
  sectionHead:  { paddingHorizontal: spacing.screenPadding, marginTop: 28, marginBottom: 12, gap: 2 },
  sectionEye:   { ...typography.label, color: colors.primary, fontSize: 10 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.title3, color: colors.text.primary },
  viewAll:      { ...typography.footnote, color: colors.text.muted },

  // Categories
  catRow:  { paddingHorizontal: spacing.screenPadding, gap: spacing.sm },
  catTile: { width: 132, height: 180, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  catLabel:{ ...typography.subhead, color: colors.white, padding: 10 },

  // Featured scroll
  featRow: { paddingHorizontal: spacing.screenPadding, gap: spacing.sm },

  // Best sellers grid
  bsGrid: { paddingHorizontal: spacing.screenPadding, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Trust strip
  trust: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginHorizontal: spacing.screenPadding, marginTop: 28,
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default, paddingVertical: spacing.lg,
  },
  trustItem: { alignItems: 'center', gap: 6 },
  trustLbl:  { ...typography.caption, color: colors.text.secondary, textAlign: 'center', lineHeight: 15 },
});

// Featured card
const fc = StyleSheet.create({
  card:     { height: 340, borderRadius: radius.card, overflow: 'hidden' },
  img:      { ...StyleSheet.absoluteFillObject },
  badge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: colors.primary, borderRadius: radius.badge,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeTxt: { ...typography.label, color: colors.white, fontSize: 10 },
  discPill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.badge,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  discTxt:  { ...typography.caption, color: colors.white, fontWeight: '700' },
  bottom:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, gap: 3 },
  brandTxt: { ...typography.label, color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  nameTxt:  { ...typography.subhead, color: colors.white, lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  price:    { ...typography.bodyMedium, color: colors.primary },
  orig:     { ...typography.footnote, color: 'rgba(255,255,255,0.4)', textDecorationLine: 'line-through' },
});

// Best seller card
const bc = StyleSheet.create({
  card:    { backgroundColor: colors.bg.card, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  imgWrap: { height: 200 },
  img:     { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: colors.primary, borderRadius: radius.badge,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  badgeTxt: { ...typography.caption, color: colors.text.inverse, fontWeight: '700', fontSize: 10 },
  discPill: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.badge,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  discTxt:   { ...typography.caption, color: colors.white, fontWeight: '600' },
  info:      { padding: 10, gap: 4 },
  brand:     { ...typography.caption, color: colors.text.muted },
  name:      { ...typography.footnote, color: colors.text.primary, fontWeight: '600', lineHeight: 17 },
  stars:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewCount: { ...typography.caption, color: colors.text.muted, marginLeft: 2 },
  priceRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price:     { ...typography.subhead, color: colors.text.primary },
  orig:      { ...typography.caption, color: colors.text.muted, textDecorationLine: 'line-through' },
  addBtn: {
    marginTop: 6, height: 34, backgroundColor: colors.primaryMuted,
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  addTxt:    { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
