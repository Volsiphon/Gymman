/**
 * modules/shop/ShopScreen.tsx
 *
 * The Shop bottom tab. A Shopify-style storefront for gym products curated for
 * the Kerala market (protein powders, equipment, accessories). Uses bundled local
 * images — no external network calls for images. Tapping a product shows a detail
 * view with price and a "Buy" CTA. Currently no real e-commerce backend; the buy
 * button is a placeholder for when payment integration is added.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Dimensions, Alert, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/app/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Shop'>;

const { width: W } = Dimensions.get('window');

const IMG = {
  hero:        require('../../../assets/images/gym_shit/greek_back.jpg'),
  wheyProtein: require('../../../assets/images/gym_shit/whey_protein.jpg'),
  creatine:    require('../../../assets/images/gym_shit/creatine.jpg'),
  focusPlus:   require('../../../assets/images/gym_shit/focus_plus.jpg'),
  magnesium:   require('../../../assets/images/gym_shit/magnesium_b6.jpg'),
  sleepWell:   require('../../../assets/images/gym_shit/lifestyle.jpg'),
  nikeBag:     require('../../../assets/images/gym_shit/nike_bag.jpg'),
  waterBottle: require('../../../assets/images/gym_shit/water_bottle.jpg'),
  nbShoes:     require('../../../assets/images/gym_shit/nb_shoes.jpg'),
  pumpCover:   require('../../../assets/images/gym_shit/pump_cover.jpg'),
};

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

const BESTSELLERS: Product[] = [
  { id: 'b1', name: 'Creatine Mono 500g',   brand: 'Atlhetica',   price: '₹999',  originalPrice: '₹1,299',  image: IMG.creatine,     badge: 'Best Seller', rating: 4.8, reviews: 2104 },
  { id: 'b2', name: 'Pump Cover Oversized', brand: 'PR Studios',  price: '₹1,499',                           image: IMG.pumpCover,    badge: 'New',         rating: 4.7, reviews: 631  },
  { id: 'b3', name: 'WB-1 Water Bottle',    brand: 'Healthish',   price: '₹1,299', originalPrice: '₹1,699',  image: IMG.waterBottle,                        rating: 4.5, reviews: 918  },
  { id: 'b4', name: 'New Balance 530',      brand: 'New Balance', price: '₹8,999', originalPrice: '₹10,999', image: IMG.nbShoes,      badge: 'Sale',        rating: 4.9, reviews: 3210 },
  { id: 'b5', name: 'Nike Brasilia Bag',    brand: 'Nike',        price: '₹3,499', originalPrice: '₹4,500',  image: IMG.nikeBag,                            rating: 4.6, reviews: 1456 },
  { id: 'b6', name: 'Magnesium + B6',       brand: 'NeuroYou',    price: '₹849',                             image: IMG.magnesium,                          rating: 4.5, reviews: 774  },
];

const CATEGORIES = [
  { id: 'supplements', label: 'Supplements', icon: 'barbell-outline' },
  { id: 'preworkout',  label: 'Pre-Workout', icon: 'flash-outline' },
  { id: 'proteins',    label: 'Proteins',    icon: 'nutrition-outline' },
  { id: 'vitamins',    label: 'Vitamins',    icon: 'leaf-outline' },
  { id: 'more',        label: 'More',        icon: 'apps-outline' },
] as const;

function pct(price: string, orig: string) {
  return Math.round((1 - parseInt(price.replace(/\D/g, '')) / parseInt(orig.replace(/\D/g, ''))) * 100);
}

function comingSoon(item: Product) {
  Alert.alert(item.name, `${item.brand}  ·  ${item.price}\n\nFull listings launching soon.`, [
    { text: 'Notify me', onPress: () => Alert.alert('Saved!', "We'll notify you when the shop goes live.") },
    { text: 'Close', style: 'cancel' },
  ]);
}

const BS_W = (W - spacing.screenPadding * 2 - spacing.sm) / 2;

function BestSellerCard({ item, onAdd }: { item: Product; onAdd: () => void }) {
  const [wishlisted, setWishlisted] = useState(false);
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
            <Text style={[bc.badgeTxt, item.badge === 'Best Seller' && { color: colors.text.inverse }]}>{item.badge}</Text>
          </View>
        )}
        <TouchableOpacity
          style={bc.wishBtn}
          activeOpacity={0.8}
          onPress={() => setWishlisted(w => !w)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name={wishlisted ? 'heart' : 'heart-outline'} size={15} color={wishlisted ? colors.danger : colors.white} />
        </TouchableOpacity>
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
          <View style={bc.priceGroup}>
            <Text style={bc.price}>{item.price}</Text>
            {item.originalPrice && <Text style={bc.orig}>{item.originalPrice}</Text>}
            {disc && <Text style={bc.discTxt}>−{disc}%</Text>}
          </View>
          <TouchableOpacity style={bc.addBtn} onPress={onAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ShopScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const [cartCount, setCartCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      <View style={s.header}>
        <Text style={s.storeName}>GYMMAN<Text style={s.accent}> SHOP</Text></Text>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={() => Alert.alert('Search', 'Search coming soon!')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="search-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Cart', 'Cart coming soon!')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View>
              <Ionicons name="bag-outline" size={22} color={colors.text.primary} />
              {cartCount > 0 && (
                <View style={s.cartBadge}>
                  <Text style={s.cartBadgeTxt}>{cartCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero — image with gradient overlay + copy + CTA */}
        <ImageBackground source={IMG.hero} style={s.hero} resizeMode="cover">
          <LinearGradient
            colors={['transparent', 'rgba(20,22,26,0.55)', colors.bg.app]}
            locations={[0, 0.55, 1]}
            style={s.heroGradient}
          >
            <Text style={s.heroEyebrow}>TRAIN. FUEL. CONQUER.</Text>
            <Text style={s.heroTitle}>ELEVATE</Text>
            <Text style={[s.heroTitle, s.heroTitleAccent]}>EVERYDAY</Text>
            <Text style={s.heroSubtitle}>Premium gear and supplements to power your best self.</Text>
            <TouchableOpacity
              style={s.heroBtn}
              activeOpacity={0.88}
              onPress={() => Alert.alert('Coming soon', 'The shop launches very soon!')}
            >
              <Text style={s.heroBtnTxt}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.text.inverse} />
            </TouchableOpacity>
          </LinearGradient>
        </ImageBackground>

        {/* Categories */}
        <View style={s.catRow}>
          {CATEGORIES.map(cat => {
            const active = cat.id === activeCategory;
            return (
              <TouchableOpacity
                key={cat.id}
                style={s.catItem}
                activeOpacity={0.85}
                onPress={() => setActiveCategory(cat.id)}
              >
                <View style={[s.catCircle, active && s.catCircleActive]}>
                  <Ionicons name={cat.icon as any} size={20} color={active ? colors.primary : colors.text.secondary} />
                </View>
                <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={1} adjustsFontSizeToFit>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Trust strip */}
        <View style={s.trust}>
          {[
            { icon: 'rocket-outline',           title: 'Free Shipping', sub: 'On orders ₹2000+' },
            { icon: 'shield-checkmark-outline', title: '100% Authentic', sub: 'Genuine products' },
            { icon: 'refresh-outline',          title: 'Easy Returns',  sub: '7-day window' },
          ].map((t, i) => (
            <React.Fragment key={t.title}>
              {i > 0 && <View style={s.trustDivider} />}
              <View style={s.trustItem}>
                <Ionicons name={t.icon as any} size={20} color={colors.primary} />
                <Text style={s.trustTitle}>{t.title}</Text>
                <Text style={s.trustSub}>{t.sub}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Best Sellers */}
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
          {BESTSELLERS.map(item => (
            <BestSellerCard key={item.id} item={item} onAdd={() => setCartCount(c => c + 1)} />
          ))}
        </View>

        {/* Promo banner */}
        <TouchableOpacity
          activeOpacity={0.92}
          style={s.promo}
          onPress={() => Alert.alert('Coming soon', 'Deals unlock when the shop goes live!')}
        >
          <ImageBackground source={IMG.nikeBag} style={s.promoImg} resizeMode="cover">
            <LinearGradient
              colors={['rgba(20,22,26,0.92)', 'rgba(20,22,26,0.55)', 'rgba(20,22,26,0.15)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={s.promoGradient}
            >
              <Text style={s.promoEyebrow}>LIMITED TIME OFFER</Text>
              <Text style={s.promoTitle}>Up to <Text style={s.promoTitleAccent}>25% Off</Text></Text>
              <Text style={s.promoSubtitle}>On selected supplements & gear</Text>
              <View style={s.promoBtn}>
                <Text style={s.promoBtnTxt}>Shop Deals</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.text.inverse} />
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
  },
  storeName:   { fontFamily: typography.fonts.display, fontSize: 20, lineHeight: 26, letterSpacing: 1, color: colors.text.primary },
  accent:      { color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cartBadge: {
    position: 'absolute', top: -6, right: -8,
    minWidth: 16, height: 16, borderRadius: radius.full, paddingHorizontal: 3,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.text.inverse },

  hero: { height: 460, justifyContent: 'flex-end' },
  heroGradient: { paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.xl, paddingTop: spacing['3xl'] },
  heroEyebrow: { ...typography.label, color: colors.primary, marginBottom: 6 },
  heroTitle: {
    fontFamily: typography.fonts.display, fontSize: 44, lineHeight: 52,
    color: colors.text.primary, letterSpacing: 0.5,
  },
  heroTitleAccent: { color: colors.primary },
  heroSubtitle: { ...typography.callout, color: colors.text.secondary, marginTop: 10, maxWidth: '85%' },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.primary, paddingHorizontal: 26, paddingVertical: 14,
    borderRadius: radius.button, marginTop: spacing.lg,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  heroBtnTxt: { ...typography.bodyMedium, color: colors.text.inverse },

  catRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.lg,
  },
  catItem: { flex: 1, alignItems: 'center', gap: 8 },
  catCircle: {
    width: 52, height: 52, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.card,
  },
  catCircleActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  catLabel: { ...typography.caption, fontSize: 10, color: colors.text.muted, textAlign: 'center' },
  catLabelActive: { color: colors.text.primary, fontWeight: '600' },

  sectionHead:  { paddingHorizontal: spacing.screenPadding, marginTop: 28, marginBottom: 12, gap: 2 },
  sectionEye:   { ...typography.label, color: colors.primary, fontSize: 10 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.title3, color: colors.text.primary },
  viewAll:      { ...typography.footnote, color: colors.text.muted },

  bsGrid: { paddingHorizontal: spacing.screenPadding, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  trust: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: spacing.screenPadding, marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  trustItem:    { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  trustDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, alignSelf: 'stretch', marginTop: 4 },
  trustTitle:   { ...typography.caption, color: colors.text.primary, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  trustSub:     { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  promo: {
    marginHorizontal: spacing.screenPadding, marginTop: 28,
    borderRadius: radius.card, overflow: 'hidden',
    shadowColor: colors.black, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  promoImg:      { height: 170 },
  promoGradient: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, gap: 2 },
  promoEyebrow:  { ...typography.label, color: colors.primary },
  promoTitle:    { fontFamily: typography.fonts.display, fontSize: 26, lineHeight: 32, color: colors.text.primary, marginTop: 4 },
  promoTitleAccent: { color: colors.primary },
  promoSubtitle: { ...typography.footnote, color: colors.text.secondary, marginTop: 2 },
  promoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: radius.button, marginTop: spacing.md,
  },
  promoBtnTxt: { ...typography.footnote, color: colors.text.inverse, fontWeight: '700' },
});

const bc = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.card, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border.default,
    shadowColor: colors.black, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  imgWrap: { height: 200 },
  img:     { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: colors.primary, borderRadius: radius.badge,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  badgeTxt: { ...typography.caption, color: colors.white, fontWeight: '700', fontSize: 10 },
  wishBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  info:        { padding: 10, gap: 4 },
  brand:       { ...typography.caption, color: colors.text.muted },
  name:        { ...typography.footnote, color: colors.text.primary, fontWeight: '600', lineHeight: 17 },
  stars:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewCount: { ...typography.caption, color: colors.text.muted, marginLeft: 2 },
  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  priceGroup:  { flexDirection: 'row', alignItems: 'baseline', gap: 5, flexShrink: 1, flexWrap: 'wrap' },
  price:       { ...typography.subhead, color: colors.text.primary, fontWeight: '700' },
  orig:        { ...typography.caption, color: colors.text.muted, textDecorationLine: 'line-through' },
  discTxt:     { ...typography.caption, color: colors.success, fontWeight: '700' },
  addBtn: {
    width: 30, height: 30, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
