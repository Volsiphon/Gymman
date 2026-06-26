import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Dimensions, Alert, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Shop'>;

const { width: W } = Dimensions.get('window');

// source.unsplash.com with sig= gives a stable, cached image per (query, sig) pair
const u = (query: string, sig: number, w = 600, h = 800) =>
  `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}&sig=${sig}`;

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Supplements', uri: u('protein powder supplement', 1, 400, 500) },
  { label: 'Equipment',   uri: u('barbell weights gym', 2, 400, 500) },
  { label: 'Apparel',     uri: u('athletic gym wear', 3, 400, 500) },
  { label: 'Recovery',    uri: u('foam roller stretching', 4, 400, 500) },
];

type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  originalPrice?: string;
  uri: string;
  badge?: string;
  rating: number;
};

const FEATURED: Product[] = [
  { id: 'f1', name: 'Gold Standard Whey', brand: 'Optimum Nutrition', price: '₹2,499', originalPrice: '₹3,200', uri: u('protein shake gym', 10, 500, 700), badge: 'Coach Pick', rating: 4.8 },
  { id: 'f2', name: 'Pre-Workout Surge',  brand: 'MuscleBlaze',       price: '₹1,299',                          uri: u('energy supplement fitness', 11, 500, 700), badge: 'New', rating: 4.5 },
  { id: 'f3', name: 'IPL Lifting Belt',   brand: 'RDX Sports',        price: '₹1,899', originalPrice: '₹2,400', uri: u('powerlifting weightlifting', 12, 500, 700), rating: 4.9 },
  { id: 'f4', name: 'Massage Gun Pro',    brand: 'Theragun',           price: '₹3,499', originalPrice: '₹4,999', uri: u('massage recovery wellness', 13, 500, 700), badge: 'Sale', rating: 4.7 },
];

const BESTSELLERS: Product[] = [
  { id: 'b1', name: 'Creatine Mono 500g',      brand: 'MyProtein',        price: '₹999',  originalPrice: '₹1,299', uri: u('supplement powder tub', 20, 400, 500), badge: 'Best Seller', rating: 4.7 },
  { id: 'b2', name: 'Resistance Bands Set',    brand: 'Boldfit',          price: '₹599',  originalPrice: '₹899',   uri: u('resistance band exercise', 21, 400, 500), rating: 4.4 },
  { id: 'b3', name: 'BCAA 8:1:1 400g',         brand: 'AS-IT-IS',         price: '₹849',  originalPrice: '₹1,100', uri: u('amino acid supplement', 22, 400, 500), rating: 4.6 },
  { id: 'b4', name: 'Compression Shorts',      brand: 'Decathlon',        price: '₹799',                           uri: u('athletic shorts sport', 23, 400, 500), badge: 'New', rating: 4.6 },
  { id: 'b5', name: 'Hex Dumbbell Pair 5kg',   brand: 'Kore',             price: '₹1,199', originalPrice: '₹1,500', uri: u('dumbbell weight lifting', 24, 400, 500), rating: 4.3 },
  { id: 'b6', name: 'ZMA Sleep Formula',       brand: 'NOW Sports',       price: '₹1,199',                         uri: u('sleep wellness supplement', 25, 400, 500), badge: 'Top Pick', rating: 4.6 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function notify(product: Product) {
  Alert.alert(
    product.name,
    `${product.brand}  ·  ${product.price}\n\nFull listings launch soon.`,
    [
      { text: 'Notify me', onPress: () => Alert.alert('Done!', "You'll hear from us when the shop goes live.") },
      { text: 'Close', style: 'cancel' },
    ],
  );
}

function discount(price: string, orig: string) {
  const p = parseInt(price.replace(/[^\d]/g, ''));
  const o = parseInt(orig.replace(/[^\d]/g, ''));
  return Math.round((1 - p / o) * 100);
}

// ── Components ────────────────────────────────────────────────────────────────

function FeaturedCard({ item }: { item: Product }) {
  const CARD_W = W * 0.52;
  const disc   = item.originalPrice ? discount(item.price, item.originalPrice) : null;

  return (
    <TouchableOpacity style={[fc.card, { width: CARD_W }]} activeOpacity={0.9} onPress={() => notify(item)}>
      <View style={fc.imgWrap}>
        <Image source={{ uri: item.uri }} style={fc.img} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFill}
        />
        {item.badge && (
          <View style={[fc.badge, item.badge === 'Sale' && fc.badgeSale, item.badge === 'New' && fc.badgeNew]}>
            <Text style={fc.badgeTxt}>{item.badge}</Text>
          </View>
        )}
        {disc && (
          <View style={fc.discPill}>
            <Text style={fc.discTxt}>−{disc}%</Text>
          </View>
        )}
        <View style={fc.bottom}>
          <Text style={fc.brand}>{item.brand.toUpperCase()}</Text>
          <Text style={fc.name} numberOfLines={2}>{item.name}</Text>
          <View style={fc.priceRow}>
            <Text style={fc.price}>{item.price}</Text>
            {item.originalPrice && <Text style={fc.orig}>{item.originalPrice}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BestSellerCard({ item }: { item: Product }) {
  const CARD_W = (W - spacing.screenPadding * 2 - spacing.sm) / 2;
  const disc   = item.originalPrice ? discount(item.price, item.originalPrice) : null;

  return (
    <TouchableOpacity style={[bc.card, { width: CARD_W }]} activeOpacity={0.9} onPress={() => notify(item)}>
      <View style={bc.imgWrap}>
        <Image source={{ uri: item.uri }} style={bc.img} resizeMode="cover" />
        {item.badge && (
          <View style={[bc.badge, item.badge === 'New' && bc.badgeNew]}>
            <Text style={bc.badgeTxt}>{item.badge}</Text>
          </View>
        )}
        {disc && (
          <View style={bc.discPill}>
            <Text style={bc.discTxt}>−{disc}%</Text>
          </View>
        )}
      </View>
      <View style={bc.info}>
        <Text style={bc.brand}>{item.brand}</Text>
        <Text style={bc.name} numberOfLines={2}>{item.name}</Text>
        <View style={bc.priceRow}>
          <Text style={bc.price}>{item.price}</Text>
          {item.originalPrice && <Text style={bc.orig}>{item.originalPrice}</Text>}
        </View>
        <View style={bc.stars}>
          {[1,2,3,4,5].map(i => (
            <Ionicons
              key={i}
              name={i <= Math.round(item.rating) ? 'star' : 'star-outline'}
              size={10}
              color={colors.gold}
            />
          ))}
        </View>
        <TouchableOpacity style={bc.addBtn} onPress={() => notify(item)} activeOpacity={0.8}>
          <Text style={bc.addTxt}>Add to cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ShopScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const [cartCount] = useState(0);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Sticky header */}
      <View style={s.header}>
        <Text style={s.storeName}>GYMMAN<Text style={s.storeNameAccent}> SHOP</Text></Text>
        <View style={s.headerRight}>
          <Ionicons name="search-outline" size={22} color={colors.text.secondary} />
          <TouchableOpacity style={s.cartWrap} onPress={() => Alert.alert('Cart', 'Cart feature coming soon!')}>
            <Ionicons name="bag-outline" size={22} color={colors.text.primary} />
            {cartCount > 0 && (
              <View style={s.cartBadge}><Text style={s.cartBadgeTxt}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero ── */}
        <ImageBackground
          source={{ uri: u('gym fitness training dark', 0, 1200, 700) }}
          style={s.hero}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(20,22,26,0.3)', 'rgba(20,22,26,0.85)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroContent}>
            <View style={s.heroPill}>
              <Text style={s.heroPillTxt}>LAUNCH OFFER · UP TO 30% OFF</Text>
            </View>
            <Text style={s.heroTitle}>Power Your{'\n'}Training.</Text>
            <Text style={s.heroSub}>Coach-curated gear. Tested. Verified. Delivered.</Text>
            <TouchableOpacity
              style={s.heroBtn}
              activeOpacity={0.88}
              onPress={() => Alert.alert('Coming soon', 'The shop is launching very soon!')}
            >
              <Text style={s.heroBtnTxt}>Shop the Collection</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* ── Shop by Category ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>BROWSE</Text>
          <Text style={s.sectionTitle}>Shop by Category</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.label} style={s.catTile} activeOpacity={0.88}
              onPress={() => Alert.alert(cat.label, 'Category page coming soon!')}>
              <Image source={{ uri: cat.uri }} style={s.catImg} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={s.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Featured ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>HANDPICKED</Text>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Coach's Picks</Text>
            <TouchableOpacity><Text style={s.viewAll}>View all →</Text></TouchableOpacity>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featRow}>
          {FEATURED.map(item => <FeaturedCard key={item.id} item={item} />)}
        </ScrollView>

        {/* ── Best Sellers ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>TRENDING</Text>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Best Sellers</Text>
            <TouchableOpacity><Text style={s.viewAll}>View all →</Text></TouchableOpacity>
          </View>
        </View>
        <View style={s.bsGrid}>
          {BESTSELLERS.map(item => <BestSellerCard key={item.id} item={item} />)}
        </View>

        {/* ── Trust strip ── */}
        <View style={s.trustStrip}>
          {[
            { icon: 'shield-checkmark', label: '3rd-Party\nTested' },
            { icon: 'close-circle',     label: 'No Fakes\nor Clones' },
            { icon: 'refresh-circle',   label: '7-Day\nReturns' },
            { icon: 'flash-circle',     label: 'Fast\nDelivery' },
          ].map(t => (
            <View key={t.label} style={s.trustItem}>
              <Ionicons name={t.icon as any} size={26} color={colors.primary} />
              <Text style={s.trustLbl}>{t.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: insets.bottom + spacing.lg }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.app,
  },
  storeName:       { ...typography.title2, color: colors.text.primary, letterSpacing: 1 },
  storeNameAccent: { color: colors.primary },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cartWrap:        { position: 'relative' },
  cartBadge: {
    position: 'absolute', top: -4, right: -6, width: 16, height: 16,
    borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeTxt: { ...typography.caption, color: colors.text.inverse, fontSize: 9, fontWeight: '700' },

  // Hero
  hero:        { height: 420, justifyContent: 'flex-end' },
  heroContent: { padding: spacing.screenPadding, paddingBottom: spacing.xl, gap: 10 },
  heroPill: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryMuted,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primaryBorder,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  heroPillTxt: { ...typography.label, color: colors.primary, fontSize: 10 },
  heroTitle:   { fontFamily: typography.fonts.display, fontSize: 48, lineHeight: 52, color: colors.white },
  heroSub:     { ...typography.callout, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 13,
    borderRadius: radius.button, marginTop: 4,
  },
  heroBtnTxt: { ...typography.bodyMedium, color: colors.text.inverse },

  // Sections
  section:     { paddingHorizontal: spacing.screenPadding, marginTop: spacing.xl, marginBottom: spacing.sm, gap: 2 },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel:{ ...typography.label, color: colors.primary, fontSize: 10 },
  sectionTitle:{ ...typography.title3, color: colors.text.primary },
  viewAll:     { ...typography.footnote, color: colors.text.muted },

  // Categories
  catRow:  { paddingHorizontal: spacing.screenPadding, gap: spacing.sm, paddingBottom: 2 },
  catTile: { width: 130, height: 170, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  catImg:  { ...StyleSheet.absoluteFillObject },
  catLabel:{ ...typography.subhead, color: colors.white, padding: 10 },

  // Featured row
  featRow: { paddingHorizontal: spacing.screenPadding, gap: spacing.sm, paddingBottom: 2 },

  // Best sellers grid
  bsGrid: { paddingHorizontal: spacing.screenPadding, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Trust strip
  trustStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginHorizontal: spacing.screenPadding, marginTop: spacing.xl,
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default,
    paddingVertical: spacing.lg,
  },
  trustItem: { alignItems: 'center', gap: 6 },
  trustLbl:  { ...typography.caption, color: colors.text.secondary, textAlign: 'center', lineHeight: 15 },
});

// Featured card styles
const fc = StyleSheet.create({
  card:    { borderRadius: radius.card, overflow: 'hidden' },
  imgWrap: { height: 320, justifyContent: 'flex-end' },
  img:     { ...StyleSheet.absoluteFillObject },
  badge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: colors.primary, borderRadius: radius.badge,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeSale: { backgroundColor: colors.danger },
  badgeNew:  { backgroundColor: colors.info },
  badgeTxt:  { ...typography.label, color: colors.text.inverse, fontSize: 10 },
  discPill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.badge,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  discTxt:  { ...typography.caption, color: colors.white, fontWeight: '700' },
  bottom:   { padding: 12, gap: 3 },
  brand:    { ...typography.label, color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  name:     { ...typography.subhead, color: colors.white, lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  price:    { ...typography.bodyMedium, color: colors.primary },
  orig:     { ...typography.footnote, color: 'rgba(255,255,255,0.45)', textDecorationLine: 'line-through' },
});

// Best seller card styles
const bc = StyleSheet.create({
  card:    { backgroundColor: colors.bg.card, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
  imgWrap: { height: 200, backgroundColor: colors.bg.elevated },
  img:     { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: colors.primary, borderRadius: radius.badge,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  badgeNew:  { backgroundColor: colors.info },
  badgeTxt:  { ...typography.caption, color: colors.text.inverse, fontWeight: '700', fontSize: 10 },
  discPill: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.dangerMuted, borderRadius: radius.badge,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  discTxt:  { ...typography.caption, color: colors.danger, fontWeight: '600' },
  info:     { padding: 10, gap: 4 },
  brand:    { ...typography.caption, color: colors.text.muted },
  name:     { ...typography.footnote, color: colors.text.primary, fontWeight: '600', lineHeight: 17 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price:    { ...typography.subhead, color: colors.text.primary },
  orig:     { ...typography.caption, color: colors.text.muted, textDecorationLine: 'line-through' },
  stars:    { flexDirection: 'row', gap: 2, marginTop: 1 },
  addBtn: {
    marginTop: 6, height: 34, backgroundColor: colors.primaryMuted,
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  addTxt:   { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
