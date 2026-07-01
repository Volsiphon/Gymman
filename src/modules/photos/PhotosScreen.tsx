/**
 * modules/photos/PhotosScreen.tsx
 *
 * Transformation photos with tier-gated sections. A pill bar at the top lets
 * users switch between named sections (e.g. General, Chest, Back). Free users
 * are limited to "General"; Premium users can have up to 5 sections; Ultra
 * users can create as many as they want. Long-pressing a custom pill deletes
 * that section (photos in it move back to General).
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Modal, Dimensions, Alert, FlatList,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/app/navigation/types';
import {
  savePhoto, loadPhotos, deletePhoto,
  loadSections, addSection, deleteSection,
} from '@/services/storage/local/photoStorage';
import type { PhotoEntry } from '@/types/plan';
import { useSubscription } from '@/app/providers/SubscriptionProvider';
import { SUBSCRIPTION_LIMITS } from '@/shared/constants/subscriptionLimits';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Photos'>;

const SCREEN_W = Dimensions.get('window').width;
const CELL_GAP = 2;
const CELL_SIZE = (SCREEN_W - spacing.screenPadding * 2 - CELL_GAP) / 2;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function PhotosScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const { tier } = useSubscription();

  const [photos, setPhotos]       = useState<PhotoEntry[]>([]);
  const [sections, setSections]   = useState<string[]>(['General']);
  const [activeSection, setActive] = useState('General');
  const [viewer, setViewer]       = useState<PhotoEntry | null>(null);
  const [addModal, setAddModal]   = useState(false);
  const [newName, setNewName]     = useState('');

  const sectionLimit = SUBSCRIPTION_LIMITS[tier].photoSections;
  const canAddSection = sections.length < sectionLimit;

  const refresh = useCallback(async () => {
    const [s, p] = await Promise.all([loadSections(), loadPhotos(activeSection)]);
    setSections(s);
    setPhotos(p);
  }, [activeSection]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function switchSection(s: string) {
    setActive(s);
    const p = await loadPhotos(s);
    setPhotos(p);
  }

  async function handleAddSection() {
    if (!canAddSection) {
      if (tier === 'free') {
        Alert.alert('Upgrade to Premium', 'Free users can only use the General section. Upgrade to Premium to create up to 5 sections.');
      } else {
        Alert.alert('Section limit reached', 'You have reached the maximum number of sections for your plan.');
      }
      return;
    }
    setNewName('');
    setAddModal(true);
  }

  async function confirmAddSection() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = await addSection(trimmed);
    setSections(updated);
    setAddModal(false);
    switchSection(trimmed);
  }

  async function handleLongPressSection(name: string) {
    if (name === 'General') return;
    Alert.alert(
      `Delete "${name}"?`,
      'Photos in this section will be moved to General.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            // Reassign photos to General
            const sectPhotos = await loadPhotos(name);
            await Promise.all(sectPhotos.map(async p => {
              await deletePhoto(p.id);
              await savePhoto(p.uri, 'General');
            }));
            const updated = await deleteSection(name);
            setSections(updated);
            switchSection('General');
          },
        },
      ],
    );
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.85, allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri, activeSection);
      refresh();
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri, activeSection);
      refresh();
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete photo', 'Remove this photo from your progress log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deletePhoto(id);
          refresh();
          setViewer(null);
        },
      },
    ]);
  }

  const hasPhotos = photos.length > 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Photos</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.75} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, s.cameraBtn]} activeOpacity={0.85} onPress={takePhoto}>
            <Ionicons name="camera" size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section pill bar */}
      <View style={s.pillRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillScroll}
        >
          {sections.map(sec => (
            <TouchableOpacity
              key={sec}
              style={[s.pill, activeSection === sec && s.pillActive]}
              activeOpacity={0.75}
              onPress={() => switchSection(sec)}
              onLongPress={() => handleLongPressSection(sec)}
            >
              <Text style={[s.pillText, activeSection === sec && s.pillTextActive]}>
                {sec}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add section button */}
          <TouchableOpacity style={s.pillAdd} activeOpacity={0.75} onPress={handleAddSection}>
            <Ionicons
              name="add"
              size={16}
              color={canAddSection ? colors.primary : colors.text.disabled}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {hasPhotos ? (
        <FlatList
          data={photos}
          keyExtractor={p => p.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<Text style={s.hint}>Photos are stored privately on your device.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setViewer(item)}>
              <Image source={{ uri: item.uri }} style={s.cell} />
              <View style={s.dateBadge}>
                <Text style={s.dateText}>{fmtDate(item.date)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={s.empty}>
          <View style={s.emptyBox}>
            <Ionicons name="camera-outline" size={40} color={colors.text.muted} />
            <Text style={s.emptyTitle}>Start your visual journey</Text>
            <Text style={s.emptyDesc}>
              Progress photos are the most honest record of your transformation. One photo now is worth more than any number later.
            </Text>
          </View>
          <View style={s.emptyBtns}>
            <TouchableOpacity style={s.galleryBtn} activeOpacity={0.8} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={18} color={colors.text.primary} style={{ marginRight: 6 }} />
              <Text style={s.galleryBtnText}>Choose from library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={takePhoto}>
              <Ionicons name="camera" size={18} color={colors.text.inverse} style={{ marginRight: 6 }} />
              <Text style={s.addBtnText}>Take a photo</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.hint}>Photos are stored privately on your device. You choose what the AI sees.</Text>
        </View>
      )}

      {/* Full-screen viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={s.viewerBg}>
          {viewer && (
            <>
              <Image source={{ uri: viewer.uri }} style={s.viewerImg} resizeMode="contain" />
              <View style={[s.viewerTop, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={s.viewerIconBtn} onPress={() => setViewer(null)}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={s.viewerDate}>{fmtDate(viewer.date)}</Text>
                <TouchableOpacity style={s.viewerIconBtn} onPress={() => handleDelete(viewer.id)}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Add section modal */}
      <Modal visible={addModal} transparent animationType="fade" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>New section</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Chest, Back, Legs…"
              placeholderTextColor={colors.text.muted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={confirmAddSection}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setAddModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirm, !newName.trim() && s.modalConfirmDisabled]}
                onPress={confirmAddSection}
                disabled={!newName.trim()}
              >
                <Text style={s.modalConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
  },
  title:      { ...typography.title2, color: colors.text.primary },
  headerBtns: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Section pills
  pillRow: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
  },
  pillScroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.card,
    borderWidth: 1, borderColor: colors.border.default,
  },
  pillActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  pillText: { ...typography.footnote, color: colors.text.secondary },
  pillTextActive: { color: colors.text.inverse, fontWeight: '600' },
  pillAdd: {
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },

  // Grid
  grid: { padding: spacing.screenPadding, gap: CELL_GAP, paddingBottom: spacing.xl },
  row:  { gap: CELL_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: radius.md, backgroundColor: colors.bg.card },
  dateBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md,
    paddingVertical: 4, paddingHorizontal: 6,
  },
  dateText: { ...typography.caption, color: colors.white },

  // Empty
  empty: { flex: 1, paddingHorizontal: spacing.screenPadding, paddingTop: spacing.xl, gap: spacing.lg },
  emptyBox: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  emptyTitle: { ...typography.subhead, color: colors.text.secondary, textAlign: 'center' },
  emptyDesc:  { ...typography.footnote, color: colors.text.muted, textAlign: 'center', lineHeight: 18 },
  emptyBtns:  { gap: spacing.sm },
  galleryBtn: {
    height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
  },
  galleryBtnText: { ...typography.bodyMedium, color: colors.text.primary },
  addBtn: {
    height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.button, backgroundColor: colors.primary,
  },
  addBtnText: { ...typography.bodyMedium, color: colors.text.inverse },

  hint: { ...typography.footnote, color: colors.text.muted, textAlign: 'center', lineHeight: 18, paddingVertical: spacing.md },

  // Viewer
  viewerBg:  { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '100%' },
  viewerTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  viewerIconBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  viewerDate: { ...typography.subhead, color: colors.white },

  // Add section modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.screenPadding },
  modalCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    padding: spacing.lg, gap: spacing.md,
    borderWidth: 1, borderColor: colors.border.default,
  },
  modalTitle: { ...typography.title3, color: colors.text.primary },
  modalInput: {
    height: 44, borderRadius: radius.input,
    backgroundColor: colors.bg.app, borderWidth: 1, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, ...typography.body, color: colors.text.primary,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: {
    flex: 1, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.border.default,
  },
  modalCancelText: { ...typography.bodyMedium, color: colors.text.secondary },
  modalConfirm: {
    flex: 1, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.button, backgroundColor: colors.primary,
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: { ...typography.bodyMedium, color: colors.text.inverse },
});
