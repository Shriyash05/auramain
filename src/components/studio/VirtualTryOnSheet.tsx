import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Garment } from '../../types/garment';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { MirrorService, AuraUserModel } from '../../services/vto/mirrorService';
import { PersonalModelOnboardingModal } from '../tryon/PersonalModelOnboardingModal';
import { X, Sparkles, Camera, ShieldCheck, User, CheckCircle2, Sliders, ExternalLink } from 'lucide-react-native';

interface VirtualTryOnSheetProps {
  visible: boolean;
  userId?: string;
  outfitName: string;
  garments: Garment[];
  onClose: () => void;
  onSaveOutfit?: () => void;
}

/**
 * VirtualTryOnSheet
 * 
 * First-class entry point for AURA Studio Virtual Try-On.
 * Connects to persistent personal model representation (stored once, reused for all outfits)
 * and enforces transparent scientific governance (zero synthetic fake APIs, honest preparation state).
 */
export const VirtualTryOnSheet: React.FC<VirtualTryOnSheetProps> = ({
  visible,
  userId = 'default_user',
  outfitName,
  garments,
  onClose,
  onSaveOutfit,
}) => {
  const router = useRouter();
  const [userModel, setUserModel] = useState<AuraUserModel | null>(null);
  const [modelPhotoUri, setModelPhotoUri] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (visible) {
      loadModelData();
    }
  }, [visible, userId]);

  const loadModelData = async () => {
    try {
      setIsLoadingModel(true);
      const model = await MirrorService.getUserModel(userId);
      setUserModel(model);
      const photo = await MirrorService.getUserModelPhoto(userId);
      setModelPhotoUri(photo);
    } catch (e) {
      console.warn('[VirtualTryOnSheet] Failed to load user model:', e);
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleOpenTryOnScreen = () => {
    onClose();
    const garmentIds = garments.map((g) => g.id).join(',');
    router.push({
      pathname: '/tryon',
      params: { garmentIds, outfitName, source: 'studio' },
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.tagRow}>
                <Sparkles size={12} color={colors.accentHighlight} />
                <Typography variant="label" style={styles.sheetTag}>
                  AURA STUDIO • MIRROR
                </Typography>
              </View>
              <Typography variant="title" style={styles.title}>
                Want to see it on you?
              </Typography>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Outfit Preview Chips */}
            <View style={styles.outfitHeaderCard}>
              <Typography variant="body" style={styles.outfitTitle}>
                {outfitName}
              </Typography>
              <View style={styles.garmentsRow}>
                {garments.map((g) => {
                  const img = g.processed_image || g.original_image;
                  return (
                    <View key={g.id} style={styles.garmentThumbBox}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.garmentThumb} resizeMode="contain" />
                      ) : (
                        <View style={styles.garmentThumbPlaceholder} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Personal Model State */}
            {userModel && userModel.isReady ? (
              <View style={styles.modelActiveCard}>
                <View style={styles.modelHeaderRow}>
                  <View style={styles.activeModelBadge}>
                    <CheckCircle2 size={14} color={colors.success} />
                    <Typography variant="caption" color={colors.success} style={styles.badgeText}>
                      Personal AURA Model Active
                    </Typography>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setShowOnboarding(true)}>
                    <Typography variant="caption" color={colors.accent}>
                      Edit Model
                    </Typography>
                  </TouchableOpacity>
                </View>

                <View style={styles.modelImageRow}>
                  {modelPhotoUri ? (
                    <Image source={{ uri: modelPhotoUri }} style={styles.modelImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.modelPlaceholder}>
                      <User size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.modelDetailsCol}>
                    <Typography variant="body" style={styles.modelColTitle}>
                      {userModel.proportions?.heightCm || 178} cm • {userModel.proportions?.weightKg || 72} kg
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary} style={styles.modelColSub}>
                      Shape: {(userModel.bodyShape || 'athletic').replace('_', ' ').toUpperCase()} • Top: {userModel.sizes?.tops || 'M'}
                    </Typography>
                  </View>
                </View>

                {/* Honest Scientific Governance Callout */}
                <View style={styles.governanceNotice}>
                  <ShieldCheck size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Typography variant="caption" color={colors.text} style={{ fontWeight: '600' }}>
                      Virtual Try-On Pipeline In Preparation
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 2, lineHeight: 16 }}>
                      AURA adheres to strict scientific honesty: Zero fake AI fabrications are generated. Dedicated on-device neural diffusion weights are currently in development.
                    </Typography>
                  </View>
                </View>
              </View>
            ) : (
              /* First-Time Setup: Create Your AURA Model */
              <View style={styles.setupModelCard}>
                <View style={styles.setupIconCircle}>
                  <User size={24} color={colors.text} />
                </View>
                <Typography variant="title" style={styles.setupTitle}>
                  Create Your AURA Model
                </Typography>
                <Typography variant="body" color={colors.textSecondary} style={styles.setupSubtitle}>
                  Configure your proportions, clothing sizes, body shape, and face references once. Stored locally and reused for all Studio styling.
                </Typography>

                <Button
                  label="Configure Personal Model"
                  variant="primary"
                  size="md"
                  icon={<Sliders size={16} color={colors.textInverse} />}
                  onPress={() => setShowOnboarding(true)}
                  style={styles.setupBtn}
                />
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Button
                label="Open in Try-On"
                variant="primary"
                size="lg"
                onPress={handleOpenTryOnScreen}
                icon={<Sparkles size={16} color={colors.textInverse} />}
                style={{ flex: 1.2 }}
              />
              {onSaveOutfit && (
                <Button
                  label="Save Look"
                  variant="outline"
                  size="lg"
                  onPress={() => {
                    onSaveOutfit();
                    onClose();
                  }}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </ScrollView>

          {/* Onboarding Modal */}
          <PersonalModelOnboardingModal
            visible={showOnboarding}
            userId={userId}
            onClose={() => setShowOnboarding(false)}
            onCompleted={(model) => {
              setUserModel(model);
              loadModelData();
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.5)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sheetTag: {
    color: colors.textMuted,
    letterSpacing: 1,
    fontSize: 10,
  },
  title: {
    fontSize: 22,
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  outfitHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  outfitTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  garmentsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  garmentThumbBox: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  garmentThumb: {
    width: '90%',
    height: '90%',
  },
  garmentThumbPlaceholder: {
    width: '100%',
    height: '100%',
  },
  setupModelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  setupIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  setupTitle: {
    fontSize: 18,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  setupSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  setupBtn: {
    minWidth: 200,
  },
  modelActiveCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeModelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modelImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modelImage: {
    width: 64,
    height: 84,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  modelPlaceholder: {
    width: 64,
    height: 84,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelDetailsCol: {
    flex: 1,
  },
  modelColTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  modelColSub: {
    lineHeight: 16,
  },
  governanceNotice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
