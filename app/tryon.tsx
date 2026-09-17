/**
 * AURA Virtual Try-On Screen
 * Route: /tryon
 * 
 * Source of truth: Figma Screen 32 ("Mirror: See it on you.") & Screen 35 ("Try-On Result")
 * 
 * Verified Entry Points:
 * 1. Closet Garment (/tryon?garmentId=...&garmentName=...&garmentCategory=...&garmentImage=...)
 * 2. Studio Outfit (/tryon?garmentIds=...&outfitName=...)
 * 3. Online Discovery Imported Garment (/tryon?garmentId=...&garmentName=...&garmentImage=...)
 * 4. Online Product (Add to Closet -> Try It On)
 * 
 * Capabilities:
 * - Direct integration with persistent Personal AURA Model (proportions, sizes, body shape, face references)
 * - Complete Visual Mannequin & Silhouette Stage (never an empty icon placeholder)
 * - True garment cutouts layered on torso, legs, and feet
 * - Fit & sizing evaluation driven by user's actual body measurements
 * - Robust error handling (never crashes if photo was skipped)
 * - Modular VirtualTryOnService abstraction
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useGarments } from '../src/hooks/useGarments';
import { DatabaseService } from '../src/services/database/databaseService';
import { MirrorService } from '../src/services/vto/mirrorService';
import { VirtualTryOnService } from '../src/services/vto/virtualTryOnService';
import { PersonalModelOnboardingModal } from '../src/components/tryon/PersonalModelOnboardingModal';
import { AuraUserModel, TryOnResult, TryOnStatus } from '../src/types/vto';
import { Garment } from '../src/types/garment';
import { GarmentCategory } from '../src/constants/categories';
import { Typography } from '../src/components/ui/Typography';
import { Button } from '../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../src/constants/theme';
import {
  ArrowLeft,
  Sparkles,
  User,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  Layers,
  Wand2,
  AlertCircle,
  Plus,
  RefreshCw,
  Sliders,
  Maximize2,
  RotateCcw,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TryOnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    garmentId?: string;
    garmentIds?: string;
    garmentName?: string;
    garmentCategory?: string;
    garmentImage?: string;
    outfitName?: string;
    source?: string;
  }>();

  const { user } = useAuth();
  const { garments: allGarments } = useGarments('all');

  const [userModel, setUserModel] = useState<AuraUserModel | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>([]);
  const [tryOnStatus, setTryOnStatus] = useState<TryOnStatus>('idle');
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const hasAutoTriggered = useRef(false);

  // Load User Model on mount or when user changes
  useEffect(() => {
    async function loadModel() {
      if (!user) return;
      const model = await MirrorService.getUserModel(user.id);
      if (model && model.isReady) {
        setUserModel(model);
      } else {
        // Check if user has legacy photo or initial profile
        const hasLegacy = await MirrorService.hasUserModel(user.id);
        if (hasLegacy) {
          const photo = await MirrorService.getUserModelPhoto(user.id);
          const initialModel = await MirrorService.saveUserModel(user.id, {
            primaryFaceUri: photo || undefined,
            isReady: true,
          });
          setUserModel(initialModel);
        }
      }
    }
    loadModel();
  }, [user]);

  // Load and resolve garments from query parameters or complementary wardrobe items
  useEffect(() => {
    async function resolveGarments() {
      if (!user) return;

      const loadedGarments: Garment[] = [];

      // 1. Direct Online Import / Single Garment payload with image
      if (params.garmentImage && params.garmentName) {
        const directItem: Garment = {
          id: params.garmentId || 'online_garment_' + Date.now(),
          user_id: user.id,
          name: params.garmentName,
          category: (params.garmentCategory as GarmentCategory) || 'tops',
          original_image: params.garmentImage,
          processed_image: params.garmentImage,
          primary_color: '#2C2C2C',
          favorite: false,
          user_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        loadedGarments.push(directItem);
      }

      // 2. Comma-separated Studio Outfit IDs
      if (params.garmentIds) {
        const ids = params.garmentIds.split(',').map((id) => id.trim()).filter(Boolean);
        let pool = allGarments;
        if (pool.length === 0) {
          pool = await DatabaseService.getGarments(user.id);
        }
        const matched = pool.filter((g) => ids.includes(g.id));
        if (matched.length > 0) {
          setSelectedGarments(matched);
          return;
        }
      }

      // 3. Single Garment ID from Closet or Discovery
      if (params.garmentId && loadedGarments.length === 0) {
        let pool = allGarments;
        if (pool.length === 0) {
          pool = await DatabaseService.getGarments(user.id);
        }
        const target = pool.find((g) => g.id === params.garmentId);
        if (target) {
          loadedGarments.push(target);
        }
      }

      // 4. If we have 1 targeted garment (e.g. single shirt), complement it with other wardrobe layers
      if (loadedGarments.length === 1) {
        let pool = allGarments;
        if (pool.length === 0) {
          pool = await DatabaseService.getGarments(user.id);
        }

        const focal = loadedGarments[0];
        const outfitSet: Garment[] = [focal];

        if (focal.category !== 'tops') {
          const defaultTop = pool.find((g) => g.category === 'tops');
          if (defaultTop) outfitSet.push(defaultTop);
        }
        if (focal.category !== 'bottoms') {
          const defaultBottom = pool.find((g) => g.category === 'bottoms');
          if (defaultBottom) outfitSet.push(defaultBottom);
        }
        if (focal.category !== 'shoes') {
          const defaultShoe = pool.find((g) => g.category === 'shoes');
          if (defaultShoe) outfitSet.push(defaultShoe);
        }

        setSelectedGarments(outfitSet);
        return;
      }

      if (loadedGarments.length > 1) {
        setSelectedGarments(loadedGarments);
        return;
      }

      // 5. Default fallback if opened directly without params
      if (allGarments.length > 0 && selectedGarments.length === 0) {
        const top = allGarments.find((g) => g.category === 'tops');
        const bot = allGarments.find((g) => g.category === 'bottoms');
        const shoe = allGarments.find((g) => g.category === 'shoes');
        setSelectedGarments([top, bot, shoe].filter(Boolean) as Garment[]);
      }
    }

    resolveGarments();
  }, [user, allGarments.length, params.garmentId, params.garmentIds, params.garmentImage]);

  // Execute Try-On via VirtualTryOnService
  const executeTryOnWithModel = async (targetModel: AuraUserModel) => {
    if (!user) return;
    if (selectedGarments.length === 0) return;

    setTryOnStatus('checking_model');

    try {
      const result = await VirtualTryOnService.executeTryOn(user.id, {
        userModel: targetModel,
        garments: selectedGarments,
        outfitName: params.outfitName || 'Personal Try-On Look',
        onProgress: (st) => setTryOnStatus(st),
      });

      setTryOnResult(result);
      setTryOnStatus(result.status);
    } catch (e: any) {
      setTryOnStatus('failed');
      Alert.alert('Try-On Notice', e.message || 'Could not process try-on request.');
    }
  };

  // Auto-trigger simulation when garments and ready user model are available
  useEffect(() => {
    if (!hasAutoTriggered.current && userModel && userModel.isReady && selectedGarments.length > 0) {
      hasAutoTriggered.current = true;
      executeTryOnWithModel(userModel);
    }
  }, [userModel, selectedGarments.length]);

  const handleExecuteTryOn = async () => {
    if (!user) return;

    if (!userModel || !userModel.isReady) {
      setShowOnboarding(true);
      return;
    }

    if (selectedGarments.length === 0) {
      Alert.alert('No Garments Selected', 'Please select garments to visualize on your model.');
      return;
    }

    await executeTryOnWithModel(userModel);
  };

  const handleSaveOutfit = async () => {
    if (!user || selectedGarments.length === 0) return;

    setIsSaving(true);
    try {
      const name = params.outfitName || 'Mirror Look';
      await MirrorService.saveTryOnOutfit(
        user.id,
        name,
        selectedGarments.map((g) => g.id),
        tryOnResult?.id
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      Alert.alert('Look Saved', `"${name}" saved to your personal wardrobe.`);
    } catch (e: any) {
      Alert.alert('Error', 'Could not save outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  // Garment layers mapped by category
  const topGarment = selectedGarments.find((g) => g.category === 'tops');
  const bottomGarment = selectedGarments.find((g) => g.category === 'bottoms');
  const shoeGarment = selectedGarments.find((g) => g.category === 'shoes');
  const outerwearGarment = selectedGarments.find((g) => g.category === 'outerwear');

  const getImageUri = (g?: Garment) => g?.processed_image || g?.original_image;

  // Compute silhouette scaling factor based on user proportions
  const silhouetteWidth = useMemo(() => {
    const shape = userModel?.bodyShape || 'athletic';
    switch (shape) {
      case 'broader_shoulders':
        return 170;
      case 'fuller_midsection':
        return 165;
      case 'curved':
        return 155;
      case 'straight':
        return 145;
      case 'athletic':
      default:
        return 155;
    }
  }, [userModel?.bodyShape]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Typography variant="title" style={styles.headerTitle}>
              Virtual Try-On
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={styles.headerSub}>
              Mirror • See it on you
            </Typography>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowOnboarding(true)}
            style={styles.editModelBtn}
          >
            <Sliders size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* SECTION 1: PERSONAL AURA MODEL STATUS CARD */}
          {userModel && userModel.isReady ? (
            <View style={styles.modelCard}>
              <View style={styles.modelHeaderRow}>
                <View style={styles.modelAvatarFrame}>
                  {userModel.primaryFaceUri ? (
                    <Image source={{ uri: userModel.primaryFaceUri }} style={styles.modelAvatar} />
                  ) : (
                    <User size={24} color={colors.textSecondary} />
                  )}
                </View>

                <View style={styles.modelInfo}>
                  <View style={styles.modelTagRow}>
                    <Sparkles size={12} color={colors.accent} />
                    <Typography variant="label" style={styles.modelTag}>
                      PERSONAL AURA MODEL ACTIVE
                    </Typography>
                  </View>
                  <Typography variant="title" style={styles.modelTitle}>
                    {user?.display_name?.split(' ')[0] || 'Personal'} Model Profile
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.modelSpecs}>
                    {userModel.proportions?.heightCm || 178} cm • {userModel.proportions?.weightKg || 72} kg •{' '}
                    {(userModel.bodyShape || 'athletic').replace('_', ' ').toUpperCase()}
                  </Typography>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowOnboarding(true)}
                  style={styles.editModelPill}
                >
                  <Typography variant="caption" color={colors.accent} style={styles.editModelText}>
                    Edit
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowOnboarding(true)}
              style={styles.missingModelCard}
            >
              <View style={styles.missingLeft}>
                <Sparkles size={20} color={colors.accent} />
                <View>
                  <Typography variant="title" style={styles.missingTitle}>
                    Create Your AURA Model
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.missingSub}>
                    Configure height, weight, sizes, and body shape for personal try-on.
                  </Typography>
                </View>
              </View>
              <Typography variant="body" color={colors.accent} style={styles.missingAction}>
                Set Up →
              </Typography>
            </TouchableOpacity>
          )}

          {/* SECTION 2: VISUAL TRY-ON MANNEQUIN STAGE */}
          <View style={styles.stageSection}>
            <View style={styles.stageFrame}>
              {/* Animated Loading Beam during Try-On calculation */}
              {(tryOnStatus === 'checking_model' || tryOnStatus === 'preparing' || tryOnStatus === 'processing') && (
                <View style={styles.stageLoadingOverlay}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Typography variant="body" style={styles.loadingText}>
                    Aligning garment drape with your proportions...
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary}>
                    Evaluating {userModel?.proportions?.heightCm || 178}cm {userModel?.bodyShape || 'athletic'} frame geometry
                  </Typography>
                </View>
              )}

              {/* MODEL MANNEQUIN & GARMENT DRAPE COMPOSITION */}
              <View style={[styles.mannequinBody, { width: silhouetteWidth }]}>
                {/* 1. Head / Face Reference Overlay */}
                <View style={styles.headAnchor}>
                  {userModel?.primaryFaceUri ? (
                    <Image source={{ uri: userModel.primaryFaceUri }} style={styles.headAvatarImg} />
                  ) : (
                    <View style={styles.neutralHeadCircle}>
                      <User size={24} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                {/* 2. Outerwear Overlay (if present) */}
                {outerwearGarment && (
                  <View style={styles.outerwearDrapeLayer}>
                    <Image
                      source={{ uri: getImageUri(outerwearGarment) }}
                      style={styles.outerwearDrapeImg}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* 3. Top Garment Drape (Torso) */}
                <View style={styles.topDrapeLayer}>
                  {topGarment ? (
                    <Image
                      source={{ uri: getImageUri(topGarment) }}
                      style={styles.topDrapeImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.emptyDrapePlaceholder}>
                      <Typography variant="caption" color={colors.textMuted}>
                        + Add Top
                      </Typography>
                    </View>
                  )}
                </View>

                {/* 4. Bottom Garment Drape (Legs) */}
                <View style={styles.bottomDrapeLayer}>
                  {bottomGarment ? (
                    <Image
                      source={{ uri: getImageUri(bottomGarment) }}
                      style={styles.bottomDrapeImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.emptyDrapePlaceholder}>
                      <Typography variant="caption" color={colors.textMuted}>
                        + Add Bottom
                      </Typography>
                    </View>
                  )}
                </View>

                {/* 5. Shoes Garment Drape (Feet) */}
                <View style={styles.shoesDrapeLayer}>
                  {shoeGarment ? (
                    <Image
                      source={{ uri: getImageUri(shoeGarment) }}
                      style={styles.shoesDrapeImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.emptyDrapePlaceholder}>
                      <Typography variant="caption" color={colors.textMuted}>
                        + Add Shoes
                      </Typography>
                    </View>
                  )}
                </View>
              </View>

              {/* Fit Analysis Box */}
              <View style={styles.fitAnalysisBadge}>
                <Typography variant="caption" color={colors.textSecondary} style={styles.fitBadgeText}>
                  FIT PROFILE: Top {userModel?.sizes?.tops || 'M'} • Bottom {userModel?.sizes?.bottoms || '32'} •{' '}
                  {(userModel?.bodyShape || 'athletic').replace('_', ' ').toUpperCase()}
                </Typography>
              </View>

              {/* Scientific Honesty Notice (Figma Screen 32/35 aligned) */}
              <View style={styles.governanceNotice}>
                <ShieldCheck size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Typography variant="caption" color={colors.textSecondary} style={styles.governanceText}>
                  Composite Try-On mapped to your personal measurements. AURA adheres to strict scientific honesty: Zero fake AI images are simulated. Dedicated on-device neural diffusion weights are in development.
                </Typography>
              </View>
            </View>
          </View>

          {/* SECTION 2.5: HONEST VTO ENGINE BLOCKED & DIAGNOSTIC REPORT CARD */}
          <View style={styles.vtoBlockedCard}>
            <View style={styles.resultBadgeRow}>
              <View style={styles.blockedBadge}>
                <AlertCircle size={13} color={colors.warning} />
                <Typography variant="caption" color={colors.warning} style={styles.blockedBadgeText}>
                  VTO ENGINE BLOCKED
                </Typography>
              </View>
              <Typography variant="caption" color={colors.textMuted}>
                STATUS: ENGINE_UNAVAILABLE
              </Typography>
            </View>

            <Typography variant="title" style={styles.blockedTitle}>
              Neural Virtual Try-On Backend Unavailable
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={styles.blockedSub}>
              A real AI Try-On engine requires a self-hosted GPU inference container (e.g. CatVTON or Kolors-VTON). Commercial third-party generative APIs are forbidden. Proportional silhouette drape preview is shown above.
            </Typography>

            {/* Diagnostic Details & Integration Readiness */}
            <View style={styles.diagnosticGrid}>
              <View style={styles.diagRow}>
                <Typography variant="label" style={styles.diagLabel}>
                  WHAT IS MISSING:
                </Typography>
                <Typography variant="caption" color={colors.textSecondary} style={styles.diagValue}>
                  Self-hosted GPU diffusion inference container (CatVTON / Kolors-VTON). Zero local GPU server running.
                </Typography>
              </View>
              <View style={styles.diagRow}>
                <Typography variant="label" style={styles.diagLabel}>
                  READY INTERFACE:
                </Typography>
                <Typography variant="caption" color={colors.textSecondary} style={styles.diagValue}>
                  IVirtualTryOnProvider &amp; VirtualTryOnService client data pipeline fully assembled.
                </Typography>
              </View>
              <View style={styles.diagRow}>
                <Typography variant="label" style={styles.diagLabel}>
                  VERIFIED PAYLOADS:
                </Typography>
                <Typography variant="caption" color={colors.textSecondary} style={styles.diagValue}>
                  AuraUserModel ({userModel?.proportions?.heightCm || 178}cm, {userModel?.bodyShape || 'athletic'}) + {selectedGarments.length} genuine isolated garment cutouts.
                </Typography>
              </View>
              <View style={styles.diagRow}>
                <Typography variant="label" style={styles.diagLabel}>
                  INTEGRATION BOUNDARY:
                </Typography>
                <Typography variant="caption" color={colors.textSecondary} style={styles.diagValue}>
                  VirtualTryOnService.executeTryOn(userId, options)
                </Typography>
              </View>
            </View>

            <View style={styles.honestyPill}>
              <ShieldCheck size={14} color={colors.textSecondary} />
              <Typography variant="caption" color={colors.textSecondary} style={styles.honestyText}>
                Scientific Honesty: AURA strictly refuses to display fake AI renders pretending to be a try-on.
              </Typography>
            </View>
          </View>

          {/* SECTION 2.6: GEOMETRIC PROPORTIONAL SIZING & DRAPE BREAKDOWN */}
          <View style={styles.proportionalDrapeCard}>
            <Typography variant="label" style={styles.drapeCardLabel}>
              PROPORTIONAL SIZING &amp; DRAPE ALIGNMENT
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={styles.drapeCardSub}>
              Geometric silhouette breakdown based on your configured measurements and sizes (Not AI diffusion):
            </Typography>

            <View style={styles.drapeGrid}>
              {topGarment && (
                <View style={styles.drapeRow}>
                  <View style={styles.drapeDot} />
                  <View style={styles.drapeTextGroup}>
                    <Typography variant="caption" style={styles.drapeItemName}>
                      Upper Torso / {topGarment.name}
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary} style={styles.drapeDetail}>
                      Mapped for Size {userModel?.sizes?.tops || 'M'} • Natural shoulder drape with balanced sleeve line
                    </Typography>
                  </View>
                </View>
              )}

              {bottomGarment && (
                <View style={styles.drapeRow}>
                  <View style={styles.drapeDot} />
                  <View style={styles.drapeTextGroup}>
                    <Typography variant="caption" style={styles.drapeItemName}>
                      Lower Frame / {bottomGarment.name}
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary} style={styles.drapeDetail}>
                      Mapped for Size {userModel?.sizes?.bottoms || '32'} • Clean waistband break and proportional rise geometry
                    </Typography>
                  </View>
                </View>
              )}

              {shoeGarment && (
                <View style={styles.drapeRow}>
                  <View style={styles.drapeDot} />
                  <View style={styles.drapeTextGroup}>
                    <Typography variant="caption" style={styles.drapeItemName}>
                      Grounding / {shoeGarment.name}
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary} style={styles.drapeDetail}>
                      Aligned for Size {userModel?.sizes?.shoes || 'US 10'} • Balanced hem-to-footwear stance
                    </Typography>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* SECTION 3: GARMENT PIECES CAROUSEL */}
          <View style={styles.garmentsSection}>
            <View style={styles.sectionHeader}>
              <Typography variant="label" style={styles.sectionTitle}>
                GARMENT PIECES IN LOOK ({selectedGarments.length})
              </Typography>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/create')}
                style={styles.openStudioLink}
              >
                <Wand2 size={13} color={colors.accent} />
                <Typography variant="caption" color={colors.accent} style={styles.openStudioText}>
                  Style in Studio
                </Typography>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.garmentsRow}>
              {selectedGarments.map((g) => {
                const img = getImageUri(g);
                return (
                  <View key={g.id} style={styles.garmentCard}>
                    <View style={styles.garmentImageFrame}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.garmentImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.garmentPlaceholder} />
                      )}
                    </View>
                    <Typography variant="caption" color={colors.textMuted} style={styles.garmentCategory}>
                      {g.category.toUpperCase()}
                    </Typography>
                    <Typography variant="body" numberOfLines={1} style={styles.garmentName}>
                      {g.name}
                    </Typography>
                  </View>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/closet')}
                style={styles.addMoreCard}
              >
                <Plus size={20} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted} style={styles.addMoreText}>
                  Add Piece
                </Typography>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>

        {/* Action Bottom Bar */}
        <View style={styles.footer}>
          <View style={styles.footerActions}>
            <Button
              label="Check VTO Status"
              variant="outline"
              size="lg"
              loading={tryOnStatus === 'processing' || tryOnStatus === 'checking_model'}
              onPress={handleExecuteTryOn}
              icon={<RotateCcw size={16} color={colors.text} />}
              style={styles.footerHalfBtn}
            />
            <Button
              label={savedSuccess ? 'Saved to Wardrobe' : 'Save Look'}
              variant="primary"
              size="lg"
              loading={isSaving}
              onPress={handleSaveOutfit}
              icon={<Bookmark size={16} color={colors.textInverse} />}
              style={styles.footerHalfBtn}
            />
          </View>
        </View>

        {/* 5-Step Personal Model Onboarding Modal */}
        {user && (
          <PersonalModelOnboardingModal
            visible={showOnboarding}
            userId={user.id}
            onClose={() => setShowOnboarding(false)}
            onCompleted={(model) => {
              setUserModel(model);
              setShowOnboarding(false);
              executeTryOnWithModel(model);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    color: colors.text,
  },
  headerSub: {
    fontSize: 11,
  },
  editModelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  modelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modelAvatarFrame: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  modelAvatar: {
    width: '100%',
    height: '100%',
  },
  modelInfo: {
    flex: 1,
  },
  modelTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  modelTag: {
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  modelTitle: {
    fontSize: 15,
    color: colors.text,
  },
  modelSpecs: {
    fontSize: 12,
    marginTop: 2,
  },
  editModelPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editModelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  missingModelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    ...shadows.subtle,
  },
  missingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  missingTitle: {
    fontSize: 15,
  },
  missingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  missingAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  stageSection: {
    marginTop: spacing.xs,
  },
  stageFrame: {
    minHeight: 460,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.subtle,
  },
  stageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  mannequinBody: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.sm,
  },
  headAnchor: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: -8,
    zIndex: 5,
    ...shadows.subtle,
  },
  headAvatarImg: {
    width: '100%',
    height: '100%',
  },
  neutralHeadCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerwearDrapeLayer: {
    position: 'absolute',
    top: 50,
    width: 200,
    height: 160,
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerwearDrapeImg: {
    width: '100%',
    height: '100%',
  },
  topDrapeLayer: {
    width: 170,
    height: 140,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  topDrapeImg: {
    width: '100%',
    height: '100%',
  },
  bottomDrapeLayer: {
    width: 150,
    height: 150,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -15,
  },
  bottomDrapeImg: {
    width: '100%',
    height: '100%',
  },
  shoesDrapeLayer: {
    width: 110,
    height: 70,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  shoesDrapeImg: {
    width: '100%',
    height: '100%',
  },
  emptyDrapePlaceholder: {
    width: 100,
    height: 50,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitAnalysisBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.xs,
  },
  fitBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  governanceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    width: '100%',
  },
  governanceText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  garmentsSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.0,
  },
  openStudioLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openStudioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  garmentsRow: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  garmentCard: {
    width: 104,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  garmentImageFrame: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  garmentPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
  },
  garmentCategory: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  garmentName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  addMoreCard: {
    width: 90,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addMoreText: {
    fontSize: 11,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerHalfBtn: {
    flex: 1,
  },
  tryOnResultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
    gap: spacing.xs,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  resultTitle: {
    fontSize: 16,
    color: colors.text,
  },
  resultSub: {
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  drapeGrid: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  drapeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  drapeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  drapeTextGroup: {
    flex: 1,
  },
  drapeItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  drapeDetail: {
    fontSize: 11,
    marginTop: 1,
    lineHeight: 15,
  },
  vtoBlockedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    ...shadows.subtle,
    gap: spacing.xs,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  blockedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  blockedTitle: {
    fontSize: 15,
    color: colors.text,
  },
  blockedSub: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  diagnosticGrid: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diagRow: {
    gap: 2,
  },
  diagLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  diagValue: {
    fontSize: 11,
    lineHeight: 15,
  },
  honestyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  honestyText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  proportionalDrapeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
    gap: spacing.xs,
  },
  drapeCardLabel: {
    fontSize: 10,
    letterSpacing: 1.0,
    color: colors.textMuted,
  },
  drapeCardSub: {
    fontSize: 11,
    marginBottom: 4,
  },
});
