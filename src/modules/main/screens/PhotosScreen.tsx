import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Modal, Dimensions, Alert, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import {
  savePhoto, loadPhotos, deletePhoto,
  type PhotoEntry,
} from '@/services/storage/local/photoStorage';
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
  const [photos, setPhotos]     = useState<PhotoEntry[]>([]);
  const [viewer, setViewer]     = useState<PhotoEntry | null>(null);

  useFocusEffect(useCallback(() => {
    loadPhotos().then(setPhotos);
  }, []));

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri);
      loadPhotos().then(setPhotos);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri);
      loadPhotos().then(setPhotos);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete photo', 'Remove this photo from your progress log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deletePhoto(id);
          const updated = await loadPhotos();
          setPhotos(updated);
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
});
