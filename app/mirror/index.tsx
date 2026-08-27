import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useGarments } from '../../src/hooks/useGarments';
import { MirrorService } from '../../src/services/vto/mirrorService';
import { TryOnResult, TryOnStatus } from '../../src/types/vto';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Sparkles, SlidersHorizontal, Bookmark, RotateCcw, Camera, Eye } from 'lucide-react-native';

type ViewMode = 'tryon' | 'original' | 'pieces';

export default function MirrorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { garments } = useGarments('all');

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>([]);
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null);
  const [status, setStatus] = useState<TryOnStatus>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('tryon');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const photo = await MirrorService.getUserModelPhoto(user.id);
    setUserPhoto(photo);

    if (garments.length > 0) {
      // Pick top, bottom, and shoes for default try-on
      const top = garments.find((g) => g.category === 'tops');
      const bot = garments.find((g) => g.category === 'bottoms');
      const shoe = garments.find((g) => g.category === 'shoes');
      const initial = [top, bot, shoe].filter(Boolean) as Garment[];
      setSelectedGarments(initial);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, garments.length]);

  const handleGenerateTryOn = async () => {
    if (!user) return;
    if (!userPhoto) {
      router.push('/mirror/capture');
      return;
    }
    if (selectedGarments.length === 0) {
      Alert.alert('No Garments', 'Please select at least one garment from your closet.');
      return;
    }

    try {
      setStatus('preparing');
      const result = await MirrorService.executeVirtualTryOn(
        {
          userId: user.id,
          userImageUrl: userPhoto,
          garments: selectedGarments,
          outfitName: 'AURA Mirror Look',
        },
        (newStatus) => setStatus(newStatus)
      );

      setTryOnResult(result);
    } catch (e: any) {
      Alert.alert('Try-On Notice', e.message || 'Could not generate visual try-on.');
      setStatus('idle');
    }
  };

  const handleSaveOutfit = async () => {
    if (!user || selectedGarments.length === 0) return;
    try {
      setIsSaving(true);
      const saved = await MirrorService.saveTryOnOutfit(
        user.id,
        'Mirror Look',
        selectedGarments.map((g) => g.id),
        tryOnResult?.id
      );
      Alert.alert('Saved to Wardrobe', `"${saved.name}" has been saved to your collection.`);
    } catch (e) {
      Alert.alert('Error', 'Could not save outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            AURA Mirror
          </Typography>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/mirror/capture')}
            style={styles.cameraBtn}
          >
            <Camera size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 1. Main Visual Display Canvas */}
        {status === 'preparing' || status === 'processing' || status === 'generating' ? (
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.text} />
            <Typography variant="title" style={styles.processingTitle}>
              {status === 'preparing' && 'Preparing Body Segmentation...'}
              {status === 'processing' && 'Warping & Aligning Garments...'}
              {status === 'generating' && 'Rendering Diffusion Visualization...'}
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={styles.processingSub}>
              Synthesizing realistic texture and natural drape
            </Typography>
          </View>
        ) : tryOnResult ? (
          <View style={styles.resultContainer}>
            {/* View Switcher Chips */}
            <View style={styles.viewChipsRow}>
              <Chip
                label="AI Try-On"
                selected={viewMode === 'tryon'}
                onPress={() => setViewMode('tryon')}
              />
              <Chip
                label="Original Photo"
                selected={viewMode === 'original'}
                onPress={() => setViewMode('original')}
              />
              <Chip
                label="Garment Pieces"
                selected={viewMode === 'pieces'}
                onPress={() => setViewMode('pieces')}
              />
            </View>

            {/* Display Image Based on ViewMode */}
            {viewMode === 'tryon' && (
              <Image source={{ uri: tryOnResult.result_image_url }} style={styles.mainCanvasImage} resizeMode="cover" />
            )}
            {viewMode === 'original' && (
              <Image source={{ uri: tryOnResult.user_image_url }} style={styles.mainCanvasImage} resizeMode="cover" />
            )}
            {viewMode === 'pieces' && (
              <View style={styles.piecesCanvas}>
                {selectedGarments.map((g) => (
                  <View key={g.id} style={styles.pieceRowItem}>
                    <Image
                      source={{ uri: g.processed_image || g.original_image }}
                      style={styles.pieceMiniThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.pieceInfoText}>
                      <Typography variant="caption" color={colors.textMuted} style={styles.pieceCatLabel}>
                        {g.category}
                      </Typography>
                      <Typography variant="body" style={styles.pieceNameText}>
                        {g.name}
                      </Typography>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.resultMetaBadge}>
              <Sparkles size={13} color={colors.text} />
              <Typography variant="caption" color={colors.text} style={styles.resultBadgeText}>
                AI TRY-ON PREVIEW
              </Typography>
            </View>
          </View>
        ) : userPhoto ? (
          <View style={styles.readyContainer}>
            <Image source={{ uri: userPhoto }} style={styles.mainCanvasImage} resizeMode="cover" />
            <View style={styles.overlayActionCard}>
              <Typography variant="title" style={styles.overlayTitle}>
                Ready to Try On
              </Typography>
              <Typography variant="caption" color={colors.textSecondary} style={styles.overlaySub}>
                Selected {selectedGarments.length} pieces from your closet
              </Typography>
              <Button
                label="Generate Virtual Try-On"
                variant="primary"
                onPress={handleGenerateTryOn}
                icon={<Sparkles size={16} color={colors.textInverse} />}
                style={styles.generateBtn}
              />
            </View>
          </View>
        ) : (
          <GlassSurface style={styles.noPhotoCard}>
            <View style={styles.wandBox}>
              <Camera size={32} color={colors.text} />
            </View>
            <Typography variant="title" style={styles.noPhotoTitle}>
              Upload a Reference Photo
            </Typography>
            <Typography variant="body" color={colors.textSecondary} style={styles.noPhotoSub}>
              Snap a quick full-body photo so AURA can visualize your wardrobe on you.
            </Typography>
            <Button
              label="Set Up Model Photo"
              variant="primary"
              onPress={() => router.push('/mirror/capture')}
            />
          </GlassSurface>
        )}

        {/* 2. Selected Pieces Carousel */}
        {selectedGarments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Typography variant="label" style={styles.sectionHeading}>
                TRYING ON {selectedGarments.length} PIECES
              </Typography>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/create')}>
                <Typography variant="caption" color={colors.text} style={styles.changeInStudioText}>
                  Change in Studio →
                </Typography>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.garmentsRow}>
              {selectedGarments.map((g) => (
                <View key={g.id} style={styles.garmentThumbCard}>
                  <Image
                    source={{ uri: g.processed_image || g.original_image }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                  <Typography variant="caption" numberOfLines={1} style={styles.thumbName}>
                    {g.name}
                  </Typography>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 3. Action Buttons */}
        {tryOnResult && (
          <View style={styles.actionButtonsCol}>
            <Button
              label="Save Outfit Look"
              variant="primary"
              onPress={handleSaveOutfit}
              loading={isSaving}
              icon={<Bookmark size={16} color={colors.textInverse} />}
              style={styles.actionBtn}
            />
            <Button
              label="Customize in Studio"
              variant="secondary"
              onPress={() => router.push('/(tabs)/create')}
              icon={<SlidersHorizontal size={16} color={colors.text} />}
              style={styles.actionBtn}
            />
            <Button
              label="Try Again"
              variant="outline"
              onPress={handleGenerateTryOn}
              icon={<RotateCcw size={16} color={colors.text} />}
              style={styles.actionBtn}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
  cameraBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  processingCard: {
    height: 380,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  processingTitle: {
    fontSize: 17,
    marginTop: spacing.lg,
    marginBottom: 4,
    textAlign: 'center',
  },
  processingSub: {
    textAlign: 'center',
  },
  resultContainer: {
    marginBottom: spacing.md,
  },
  viewChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  mainCanvasImage: {
    width: '100%',
    height: 380,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  piecesCanvas: {
    width: '100%',
    minHeight: 380,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pieceRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  pieceMiniThumb: {
    width: 50,
    height: 50,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  pieceInfoText: {
    flex: 1,
  },
  pieceCatLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pieceNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultMetaBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs + 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultBadgeText: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  readyContainer: {
    marginBottom: spacing.md,
  },
  overlayActionCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  overlaySub: {
    marginBottom: spacing.sm,
  },
  generateBtn: {
    width: '100%',
  },
  noPhotoCard: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  wandBox: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noPhotoTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  noPhotoSub: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  changeInStudioText: {
    fontWeight: '700',
  },
  garmentsRow: {
    gap: spacing.sm,
  },
  garmentThumbCard: {
    width: 80,
    alignItems: 'center',
  },
  thumbImage: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 4,
  },
  thumbName: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButtonsCol: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    width: '100%',
  },
});
