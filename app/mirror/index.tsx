/**
 * AURA Mirror & Virtual Try-On Screen
 * Source of truth: Figma Screen 32 ("Mirror: See it on you.") & Screen 48 ("Product Discovery")
 * 
 * Capabilities:
 * 1. Online Product Import (Link, Image, Screenshot) -> Garment isolation & try-on
 * 2. Personal Wardrobe Try-On (Single persistent User Model)
 * 3. Strict Scientific Honesty (Zero fake AI renders, honest engine readiness/unavailable state)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { useGarments } from '../../src/hooks/useGarments';
import { MirrorService } from '../../src/services/vto/mirrorService';
import { ProductImportService, ImportedProduct } from '../../src/services/commerce/productImportService';
import { GarmentSegmentationService } from '../../src/services/image-processing/garmentSegmentationService';
import { GarmentRegionSelector } from '../../src/components/garment/GarmentRegionSelector';
import { GarmentSelection } from '../../src/services/garment-selection/types';
import { DatabaseService } from '../../src/services/database/databaseService';
import { TryOnResult, TryOnStatus } from '../../src/types/vto';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  ArrowLeft,
  Sparkles,
  Link2,
  Image as ImageIcon,
  Crop,
  Camera,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Plus,
  RefreshCw,
  Layers,
} from 'lucide-react-native';

type TabMode = 'online' | 'wardrobe';

export default function MirrorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { garments } = useGarments('all');

  const [activeTab, setActiveTab] = useState<TabMode>('online');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // Online Import State
  const [productUrl, setProductUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedGarment, setImportedGarment] = useState<ImportedProduct | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Wardrobe / Try-On State
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>([]);
  const [status, setStatus] = useState<TryOnStatus>('idle');
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null);
  const [isAddingToCloset, setIsAddingToCloset] = useState(false);

  // Manual Garment Region Selection Fallback State (Req 6, 7, 8, 16)
  const [showManualSelector, setShowManualSelector] = useState(false);
  const [manualSelectorImageUri, setManualSelectorImageUri] = useState<string | null>(null);
  const [manualImageDimensions, setManualImageDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1000,
  });
  const [pendingGarmentForManual, setPendingGarmentForManual] = useState<ImportedProduct | null>(null);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const photo = await MirrorService.getUserModelPhoto(user.id);
      setUserPhoto(photo);

      // Handle route parameters (from Closet, Studio, or direct route)
      if (params.tab === 'online') {
        setActiveTab('online');
      } else if (params.tab === 'wardrobe') {
        setActiveTab('wardrobe');
      }

      if (params.garmentId) {
        setActiveTab('wardrobe');
        const target = garments.find((g) => g.id === params.garmentId);
        if (target) {
          setSelectedGarments([target]);
          return;
        } else {
          const fetched = await DatabaseService.getGarments(user.id);
          const found = fetched.find((g) => g.id === params.garmentId);
          if (found) {
            setSelectedGarments([found]);
            return;
          }
        }
      }

      // Preselect default garments if available
      if (garments.length > 0) {
        const top = garments.find((g) => g.category === 'tops');
        const bot = garments.find((g) => g.category === 'bottoms');
        const shoe = garments.find((g) => g.category === 'shoes');
        setSelectedGarments([top, bot, shoe].filter(Boolean) as Garment[]);
      }
    }
    init();
  }, [user, garments.length, params.garmentId, params.tab]);

  // Handle URL Import (Req 1 & 2 & 4: Live fetch -> background removal -> single garment)
  const handleImportUrl = async () => {
    if (!productUrl.trim()) {
      Alert.alert('URL Required', 'Please paste a valid product link.');
      return;
    }

    setIsImporting(true);
    setImportNotice('Importing product details...');

    const result = await ProductImportService.importProduct({
      type: 'url',
      url: productUrl.trim(),
    });

    if (!result.success || !result.product) {
      setIsImporting(false);
      Alert.alert('URL Import Status', result.message);
      return;
    }

    // Step 6 & 7: Garment processing starts -> Background is removed
    setImportNotice('Isolating garment background...');
    const segResult = await GarmentSegmentationService.segmentGarment(
      result.product.rawImageUri,
      {
        sourceType: 'product_catalog',
        forceTransparency: true,
        categoryHint: result.product.category,
      }
    );

    setIsImporting(false);

    if (segResult.success && !segResult.requiresManualFallback && segResult.qualityGate.passed) {
      result.product.cleanGarmentUri = segResult.segmentedImageUri;
      result.product.hasCleanBackground = true;
      setImportedGarment(result.product);
      setImportNotice('Single garment isolated with transparent background.');
    } else {
      // Quality gate rejected or ambiguous -> trigger manual selection fallback
      setPendingGarmentForManual(result.product);
      setManualSelectorImageUri(result.product.rawImageUri);
      setShowManualSelector(true);
      Alert.alert(
        'Garment Isolation Quality Gate',
        "Couldn't isolate the garment automatically. Select the garment manually."
      );
    }
  };

  // Handle Image Import (Req 5 & 7: Lifestyle/Catalog image -> background removal -> single garment)
  const handleImportImage = async (type: 'image' | 'screenshot') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission Needed', 'Access to photos is required to import product garments.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setIsImporting(true);
      const asset = res.assets[0];
      const uri = asset.uri;
      if (asset.width && asset.height) {
        setManualImageDimensions({ width: asset.width, height: asset.height });
      }

      setImportNotice('Importing product image...');
      const result = await ProductImportService.importProduct({
        type,
        imageUri: uri,
      });

      if (!result.success || !result.product) {
        setIsImporting(false);
        Alert.alert('Import Notice', result.message);
        return;
      }

      setImportNotice('Isolating garment background...');
      const segResult = await GarmentSegmentationService.segmentGarment(uri, {
        sourceType: type === 'screenshot' ? 'screenshot' : 'lifestyle',
        categoryHint: result.product.category,
      });

      setIsImporting(false);

      if (segResult.success && !segResult.requiresManualFallback && segResult.qualityGate.passed) {
        result.product.cleanGarmentUri = segResult.segmentedImageUri;
        result.product.hasCleanBackground = true;
        setImportedGarment(result.product);
        setImportNotice('Single garment isolated with transparent background.');
      } else {
        // Automatic segmentation failed quality gate -> fallback to manual selection
        setPendingGarmentForManual(result.product);
        setManualSelectorImageUri(uri);
        setShowManualSelector(true);
        Alert.alert(
          'Garment Isolation Quality Gate',
          "Couldn't isolate the garment automatically. Select the garment manually."
        );
      }
    }
  };

  // Handle Precision Manual Garment Selection Confirm (Req 7 & 8)
  const handleConfirmManualSelection = async (selection: GarmentSelection) => {
    setShowManualSelector(false);
    setIsScrollEnabled(true);
    setIsImporting(true);
    setImportNotice('Isolating garment within selected region...');

    const segResult = await GarmentSegmentationService.segmentGarment(selection.imageUri, {
      manualBbox: selection.bbox,
    });

    setIsImporting(false);

    if (importedGarment) {
      setImportedGarment({
        ...importedGarment,
        cleanGarmentUri: segResult.segmentedImageUri,
        hasCleanBackground: true,
      });
      setImportNotice('Garment isolated via precision selection.');
    } else if (pendingGarmentForManual) {
      const updated: ImportedProduct = {
        ...pendingGarmentForManual,
        cleanGarmentUri: segResult.segmentedImageUri,
        hasCleanBackground: true,
      };
      setImportedGarment(updated);
      setPendingGarmentForManual(null);
      setImportNotice('Garment isolated via precision selection.');
    }
  };

  // Try On Flow (Requirement 8 & 10)
  const handleExecuteTryOn = async (targetGarment?: Garment) => {
    if (!user) return;

    // Check whether user has personal model photo
    const hasModel = await MirrorService.hasUserModel(user.id);
    if (!hasModel) {
      Alert.alert(
        'AURA Personal Model Needed',
        'To see clothes realistically visualized on your body, please set up your persistent AURA personal model photo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up Model', onPress: () => router.push('/mirror/capture') },
        ]
      );
      return;
    }

    const currentModelPhoto = (await MirrorService.getUserModelPhoto(user.id)) || userPhoto;
    if (!currentModelPhoto) {
      router.push('/mirror/capture');
      return;
    }

    // Determine garments to try on
    let piecesToTry: Garment[] = selectedGarments;
    if (targetGarment) {
      piecesToTry = [targetGarment];
    } else if (importedGarment) {
      const pseudoGarment: Garment = {
        id: importedGarment.id,
        user_id: user.id,
        name: importedGarment.title,
        category: importedGarment.category,
        original_image: importedGarment.rawImageUri,
        processed_image: importedGarment.cleanGarmentUri,
        primary_color: importedGarment.colors?.[0] || 'Neutral',
        favorite: false,
        user_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      piecesToTry = [pseudoGarment];
    }

    if (piecesToTry.length === 0) {
      Alert.alert('No Garment', 'Please select or import a garment to try on.');
      return;
    }

    try {
      setStatus('checking_model');
      const vtoRes = await MirrorService.executeVirtualTryOn(
        {
          userId: user.id,
          userImageUrl: currentModelPhoto,
          garments: piecesToTry,
          outfitName: importedGarment ? importedGarment.title : 'Wardrobe Look',
        },
        (newStatus) => setStatus(newStatus)
      );

      setTryOnResult(vtoRes);
      setStatus(vtoRes.status);
    } catch (e: any) {
      Alert.alert('Try-On Status', e.message || 'Virtual Try-On is not available yet.');
      setStatus('engine_unavailable');
    }
  };

  // Add Imported Garment to Closet
  const handleAddToCloset = async () => {
    if (!user || !importedGarment) return;
    try {
      setIsAddingToCloset(true);
      await DatabaseService.addGarment({
        user_id: user.id,
        name: importedGarment.title,
        category: importedGarment.category,
        original_image: importedGarment.rawImageUri,
        processed_image: importedGarment.cleanGarmentUri,
        primary_color: importedGarment.colors?.[0] || 'Neutral',
        favorite: false,
        user_verified: true,
      });
      Alert.alert('Added to Closet', `"${importedGarment.title}" is now part of your personal wardrobe!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save garment to closet.');
    } finally {
      setIsAddingToCloset(false);
    }
  };


  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isScrollEnabled}
      >
        {/* Figma Screen 32 Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Typography variant="hero" style={styles.title}>
              See it on you.
            </Typography>
            <Typography variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Upload your photo to try on this outfit or import from online.
            </Typography>
          </View>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('online')}
            style={[styles.tabBtn, activeTab === 'online' && styles.tabBtnActive]}
          >
            <Sparkles
              size={14}
              color={activeTab === 'online' ? colors.textInverse : colors.textSecondary}
            />
            <Typography
              variant="caption"
              color={activeTab === 'online' ? colors.textInverse : colors.textSecondary}
              style={styles.tabText}
            >
              ONLINE DISCOVERY
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('wardrobe')}
            style={[styles.tabBtn, activeTab === 'wardrobe' && styles.tabBtnActive]}
          >
            <Layers
              size={14}
              color={activeTab === 'wardrobe' ? colors.textInverse : colors.textSecondary}
            />
            <Typography
              variant="caption"
              color={activeTab === 'wardrobe' ? colors.textInverse : colors.textSecondary}
              style={styles.tabText}
            >
              MY WARDROBE
            </Typography>
          </TouchableOpacity>
        </View>

        {/* 1. ONLINE PRODUCT IMPORT FLOW */}
        {activeTab === 'online' && (
          <View style={styles.onlineSection}>
            {/* If a garment is already imported, show clean garment prominently (Req 21 & 8) */}
            {importedGarment ? (
              <View style={styles.importedCard}>
                <Typography variant="label" style={styles.sectionLabel}>
                  ACTUAL GARMENT
                </Typography>

                <View style={styles.garmentHeroBox}>
                  <Image
                    source={{ uri: importedGarment.cleanGarmentUri }}
                    style={styles.garmentHeroImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.garmentMeta}>
                  <Typography variant="title" style={styles.garmentTitle}>
                    {importedGarment.title}
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary}>
                    Imported from {importedGarment.sourceProviderName}
                  </Typography>
                  {importedGarment.price && (
                    <Typography variant="caption" color={colors.text} style={{ marginTop: 2, fontWeight: '600' }}>
                      {importedGarment.price}
                    </Typography>
                  )}
                </View>

                {importNotice && importNotice !== 'Product found' && (
                  <View style={styles.noticeBadge}>
                    <CheckCircle2 size={13} color={colors.success} />
                    <Typography variant="caption" color={colors.success} style={styles.noticeText}>
                      {importNotice}
                    </Typography>
                  </View>
                )}

                <View style={styles.actionButtonsCol}>
                  <Button
                    label="TRY IT ON"
                    variant="primary"
                    onPress={() => handleExecuteTryOn()}
                    icon={<Sparkles size={16} color={colors.textInverse} />}
                  />
                  <Button
                    label="ADD TO CLOSET"
                    variant="outline"
                    onPress={handleAddToCloset}
                    loading={isAddingToCloset}
                    icon={<Bookmark size={16} color={colors.text} />}
                  />
                  <Button
                    label="ADJUST CROP"
                    variant="secondary"
                    onPress={() => {
                      if (importedGarment) {
                        setManualSelectorImageUri(importedGarment.rawImageUri);
                        setShowManualSelector(true);
                      }
                    }}
                    icon={<Crop size={16} color={colors.text} />}
                  />
                  <Button
                    label="CHANGE IMAGE"
                    variant="secondary"
                    onPress={() => setImportedGarment(null)}
                    icon={<RefreshCw size={16} color={colors.text} />}
                  />
                </View>
              </View>
            ) : (
              /* Three Import Entrypoints (Req 20) */
              <View style={styles.discoveryMethods}>
                {/* A. Product URL Card */}
                <View style={styles.importMethodCard}>
                  <View style={styles.methodHeader}>
                    <Link2 size={18} color={colors.text} />
                    <Typography variant="title" style={styles.methodTitle}>
                      Paste Product Link
                    </Typography>
                  </View>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.methodSub}>
                    Import from supported fashion retailers (e.g. Myntra).
                  </Typography>

                  <View style={styles.urlInputRow}>
                    <TextInput
                      style={styles.urlInput}
                      placeholder="Paste product link (e.g., https://myntra.com/...)"
                      placeholderTextColor={colors.textMuted}
                      value={productUrl}
                      onChangeText={setProductUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleImportUrl}
                      style={styles.urlSubmitBtn}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <ActivityIndicator size="small" color={colors.textInverse} />
                      ) : (
                        <Typography variant="caption" color={colors.textInverse} style={styles.urlSubmitText}>
                          IMPORT
                        </Typography>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* B. Product Image Card */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleImportImage('image')}
                  style={styles.importMethodCard}
                >
                  <View style={styles.methodHeader}>
                    <ImageIcon size={18} color={colors.text} />
                    <Typography variant="title" style={styles.methodTitle}>
                      Upload Product Image
                    </Typography>
                  </View>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.methodSub}>
                    Clean catalog or retail photo. Preserves original garment details.
                  </Typography>
                </TouchableOpacity>

                {/* C. Screenshot Card */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleImportImage('screenshot')}
                  style={styles.importMethodCard}
                >
                  <View style={styles.methodHeader}>
                    <Crop size={18} color={colors.text} />
                    <Typography variant="title" style={styles.methodTitle}>
                      Use Screenshot
                    </Typography>
                  </View>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.methodSub}>
                    Saved from your shopping session. Garment will be cleanly isolated.
                  </Typography>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 2. PERSONAL WARDROBE TRY-ON FLOW */}
        {activeTab === 'wardrobe' && (
          <View style={styles.wardrobeSection}>
            {/* Selected Wardrobe Garments */}
            <Typography variant="label" style={styles.sectionLabel}>
              TRYING ON WARDROBE PIECES ({selectedGarments.length})
            </Typography>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.piecesRow}>
              {selectedGarments.map((g) => (
                <View key={g.id} style={styles.pieceCard}>
                  <Image
                    source={{ uri: g.processed_image || g.original_image }}
                    style={styles.pieceThumb}
                    resizeMode="contain"
                  />
                  <Typography variant="caption" numberOfLines={1} style={styles.pieceName}>
                    {g.name}
                  </Typography>
                </View>
              ))}
            </ScrollView>

            <Button
              label="TRY IT ON"
              variant="primary"
              onPress={() => handleExecuteTryOn()}
              icon={<Sparkles size={16} color={colors.textInverse} />}
              style={styles.tryOnWardrobeBtn}
            />
          </View>
        )}

        {/* 3. PERSONAL AURA MODEL STATUS (Req 9 & 10) */}
        <View style={styles.modelStatusCard}>
          <View style={styles.modelHeaderRow}>
            <View>
              <Typography variant="label" style={styles.sectionLabel}>
                PERSONAL AURA MODEL
              </Typography>
              <Typography variant="title" style={styles.modelStatusTitle}>
                {userPhoto ? 'Model Active' : 'No Model Found'}
              </Typography>
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/mirror/capture')}
              style={styles.setupModelBtn}
            >
              <Camera size={14} color={colors.text} />
              <Typography variant="caption" style={styles.setupModelText}>
                {userPhoto ? 'Update Photo' : 'Create Model'}
              </Typography>
            </TouchableOpacity>
          </View>

          {userPhoto ? (
            <View style={styles.modelPreviewContainer}>
              <Image source={{ uri: userPhoto }} style={styles.userModelImage} resizeMode="cover" />
              <View style={styles.modelVerifiedPill}>
                <CheckCircle2 size={12} color={colors.success} />
                <Typography variant="caption" color={colors.success} style={styles.modelVerifiedText}>
                  Ready for Try-On
                </Typography>
              </View>
            </View>
          ) : (
            <View style={styles.noModelNoticeBox}>
              <Typography variant="body" color={colors.textSecondary} style={styles.noModelText}>
                Create your persistent AURA model to visualize garments on yourself across Closet, Studio, and Online Discovery.
              </Typography>
            </View>
          )}
        </View>

        {/* 4. VTO STATUS / HONEST ENGINE NOTICE (Req 10) */}
        {status === 'checking_model' && (
          <View style={styles.statusBanner}>
            <ActivityIndicator size="small" color={colors.text} />
            <Typography variant="body" style={styles.statusBannerText}>
              Verifying personal model & garment dimensions...
            </Typography>
          </View>
        )}

        {status === 'engine_unavailable' && (
          <View style={styles.engineUnavailableCard}>
            <View style={styles.unavailableHeader}>
              <AlertCircle size={18} color={colors.warning} />
              <Typography variant="title" style={styles.unavailableTitle}>
                Virtual Try-On Unavailable
              </Typography>
            </View>
            <Typography variant="body" color={colors.textSecondary} style={styles.unavailableExplanation}>
              Virtual Try-On is not available yet. Dedicated on-device neural diffusion weights are currently in training and calibration. AURA does not call third-party commercial AI APIs without explicit user consent.
            </Typography>
            <Button
              label="Understood"
              variant="secondary"
              onPress={() => setStatus('idle')}
              style={styles.dismissBtn}
            />
          </View>
        )}
      </ScrollView>

      {/* Manual Precision Garment Region Selector Modal (Req 7, 8, 16) */}
      <Modal
        visible={showManualSelector}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowManualSelector(false);
          setIsScrollEnabled(true);
        }}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowManualSelector(false);
                setIsScrollEnabled(true);
              }}
              style={styles.modalCloseBtn}
              accessibilityLabel="Close selector"
            >
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.modalTitleBox}>
              <Typography variant="title" style={styles.modalTitle}>
                Select Single Garment
              </Typography>
              <Typography variant="caption" color={colors.textSecondary}>
                Frame the garment precisely with 52×52 handles
              </Typography>
            </View>
          </View>
          {manualSelectorImageUri && (
            <GarmentRegionSelector
              imageUri={manualSelectorImageUri}
              sourceWidth={manualImageDimensions.width}
              sourceHeight={manualImageDimensions.height}
              onConfirmSelection={handleConfirmManualSelection}
              onCancel={() => {
                setShowManualSelector(false);
                setIsScrollEnabled(true);
              }}
              onInteractionStart={() => setIsScrollEnabled(false)}
              onInteractionEnd={() => setIsScrollEnabled(true)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalTitleBox: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    color: colors.text,
  },
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
    marginBottom: spacing.md,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  headerTitles: {
    marginTop: 2,
  },
  title: {
    fontSize: 32,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 20,
    color: colors.textSecondary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  tabBtnActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  onlineSection: {
    marginBottom: spacing.lg,
  },
  discoveryMethods: {
    gap: spacing.md,
  },
  importMethodCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 16,
    color: colors.text,
  },
  methodSub: {
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  urlInput: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlSubmitBtn: {
    backgroundColor: colors.text,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlSubmitText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  importedCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  sectionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  garmentHeroBox: {
    width: '100%',
    height: 260,
    borderRadius: radii.md,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  garmentHeroImage: {
    width: '100%',
    height: '100%',
  },
  garmentMeta: {
    marginBottom: spacing.xs,
  },
  garmentTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
    marginVertical: spacing.xs,
  },
  noticeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  tryOnQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginVertical: spacing.sm,
  },
  actionButtonsCol: {
    gap: spacing.sm,
  },
  wardrobeSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  piecesRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pieceCard: {
    width: 80,
    alignItems: 'center',
  },
  pieceThumb: {
    width: 70,
    height: 70,
    borderRadius: radii.sm,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 4,
  },
  pieceName: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tryOnWardrobeBtn: {
    marginTop: spacing.sm,
  },
  modelStatusCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modelStatusTitle: {
    fontSize: 16,
  },
  setupModelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  setupModelText: {
    fontWeight: '600',
    fontSize: 11,
  },
  modelPreviewContainer: {
    position: 'relative',
    height: 180,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  userModelImage: {
    width: '100%',
    height: '100%',
  },
  modelVerifiedPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  modelVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noModelNoticeBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  noModelText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  statusBannerText: {
    fontSize: 13,
  },
  engineUnavailableCard: {
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.lg,
  },
  unavailableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  unavailableTitle: {
    fontSize: 16,
    color: '#92400E',
  },
  unavailableExplanation: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  dismissBtn: {
    alignSelf: 'flex-start',
  },
});
