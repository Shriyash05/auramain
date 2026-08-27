import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../src/hooks/useAuth';
import { CreatorService } from '../../../../src/services/creator/creatorService';
import { GarmentTaggingService } from '../../../../src/services/creator/garmentTaggingService';
import { ShareableLookService } from '../../../../src/services/creator/shareableLookService';
import { DatabaseService } from '../../../../src/services/database/databaseService';
import { ShootLook, TaggedGarmentSummary } from '../../../../src/types/creator';
import { Garment } from '../../../../src/types/garment';
import { Typography } from '../../../../src/components/ui/Typography';
import { Button } from '../../../../src/components/ui/Button';
import { GlassSurface } from '../../../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../../../src/constants/theme';
import { ArrowLeft, Camera, Image as ImageIcon, Check, Tag, Share2 } from 'lucide-react-native';

export default function TagGarmentsScreen() {
  const router = useRouter();
  const { id: shootId, lookId } = useLocalSearchParams<{ id: string; lookId: string }>();
  const { user } = useAuth();

  const [look, setLook] = useState<ShootLook | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [allGarments, setAllGarments] = useState<Garment[]>([]);
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !shootId || !lookId) return;
      const looks = await CreatorService.getShootLooks(user.id, shootId);
      const found = looks.find((l) => l.id === lookId);
      if (found) {
        setLook(found);
        setPhotoUri(found.final_photo_url || null);
        setSelectedGarmentIds(found.tagged_garment_ids || []);
      }

      const gList = await DatabaseService.getGarments(user.id);
      setAllGarments(gList);
    }
    load();
  }, [user, shootId, lookId]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is needed to select final shoot photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is needed.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const toggleGarmentTag = (gid: string) => {
    setSelectedGarmentIds((prev) =>
      prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]
    );
  };

  const handlePublishLook = async () => {
    if (!user || !look) return;
    if (!photoUri) {
      Alert.alert('Photo Required', 'Please upload or capture a final photo of the look before publishing.');
      return;
    }

    try {
      setIsSaving(true);
      const taggedSummaries = GarmentTaggingService.filterConfirmedTags(allGarments, selectedGarmentIds);

      const published = await ShareableLookService.createAndPublishLook(
        user.id,
        look,
        photoUri,
        look.name,
        caption.trim(),
        taggedSummaries
      );

      Alert.alert('Look Published!', 'Your shareable look is live with public deep link access.', [
        {
          text: 'Open Public Look',
          onPress: () => router.push(`/look/${published.public_share_id}` as any),
        },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not publish shareable look.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!look) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading look details...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Final Photo & Tagging
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* 1. Final Photo Canvas */}
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <TouchableOpacity activeOpacity={0.8} onPress={() => setPhotoUri(null)} style={styles.changePhotoBtn}>
              <Typography variant="caption" color={colors.text} style={styles.changePhotoText}>
                Replace Photo
              </Typography>
            </TouchableOpacity>
          </View>
        ) : (
          <GlassSurface style={styles.uploadPromptCard}>
            <Camera size={36} color={colors.text} />
            <Typography variant="title" style={styles.promptTitle}>
              Add Final Shoot Photo
            </Typography>
            <Typography variant="body" color={colors.textSecondary} style={styles.promptSub}>
              Upload the final high-resolution picture from your camera roll.
            </Typography>
            <View style={styles.photoActionsRow}>
              <Button
                label="Choose from Gallery"
                variant="primary"
                onPress={handlePickPhoto}
                icon={<ImageIcon size={16} color={colors.textInverse} />}
                style={styles.pickBtn}
              />
              <Button
                label="Take Photo"
                variant="outline"
                onPress={handleTakePhoto}
                icon={<Camera size={16} color={colors.text} />}
                style={styles.pickBtn}
              />
            </View>
          </GlassSurface>
        )}

        {/* 2. Caption & Styling Notes */}
        <GlassSurface style={styles.captionCard}>
          <Typography variant="label" style={styles.captionLabel}>
            CAPTION / STYLING NOTES
          </Typography>
          <TextInput
            style={styles.captionInput}
            placeholder="Share details about the aesthetic, layering, or campaign vibes..."
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={2}
          />
        </GlassSurface>

        {/* 3. Tagged Garments Selection */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            TAG WARDROBE PIECES ({selectedGarmentIds.length} TAGGED)
          </Typography>
          <Typography variant="caption" color={colors.textSecondary} style={styles.tagHelpText}>
            Select the exact closet garments worn in this final photo so your audience can identify each piece.
          </Typography>

          <View style={styles.garmentsGrid}>
            {allGarments.map((g) => {
              const isTagged = selectedGarmentIds.includes(g.id);
              return (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={0.85}
                  onPress={() => toggleGarmentTag(g.id)}
                  style={[styles.garmentTagCard, isTagged && styles.garmentTagCardActive]}
                >
                  <Image
                    source={{ uri: g.processed_image || g.original_image }}
                    style={styles.garmentThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.garmentTagInfo}>
                    <Typography variant="caption" color={colors.textMuted} style={styles.garmentCategory}>
                      {g.category}
                    </Typography>
                    <Typography variant="body" numberOfLines={1} style={styles.garmentName}>
                      {g.name}
                    </Typography>
                  </View>
                  <View style={[styles.tagCheckbox, isTagged && styles.tagCheckboxActive]}>
                    {isTagged && <Check size={12} color={colors.textInverse} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.footer}>
          <Button
            label="Publish Shareable Look"
            variant="primary"
            onPress={handlePublishLook}
            loading={isSaving}
            icon={<Share2 size={16} color={colors.textInverse} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  uploadPromptCard: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  promptTitle: {
    fontSize: 18,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  promptSub: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  pickBtn: {
    flex: 1,
  },
  photoContainer: {
    marginBottom: spacing.md,
  },
  photoPreview: {
    width: '100%',
    height: 320,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  changePhotoBtn: {
    marginTop: spacing.xs,
    alignSelf: 'center',
    padding: spacing.xs,
  },
  changePhotoText: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  captionCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  captionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  captionInput: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'System',
    minHeight: 48,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  tagHelpText: {
    marginBottom: spacing.sm,
  },
  garmentsGrid: {
    gap: spacing.xs,
  },
  garmentTagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  garmentTagCardActive: {
    borderColor: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  garmentThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceMuted,
  },
  garmentTagInfo: {
    flex: 1,
  },
  garmentCategory: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  garmentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagCheckbox: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagCheckboxActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  footer: {
    marginTop: spacing.xs,
  },
});
