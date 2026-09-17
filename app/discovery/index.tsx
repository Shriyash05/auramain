/**
 * AURA Online Discovery Screen
 * Route: /discovery
 * 
 * Source of truth: Figma Screen 48 ("Product Discovery")
 * 
 * Supports:
 * 1. Paste Product Link (Myntra authorized provider)
 * 2. Upload Product Image (Clean catalog photo)
 * 3. Screenshot Import (User shopping screenshot)
 * 
 * Architecture:
 * - ProductSourceProvider architecture (Zero unauthorized scraping, no bot bypassing)
 * - GarmentSegmentationService isolation (Real garment preserved, background removed)
 * - Manual Region Selection fallback if automatic isolation flags ambiguity
 * - Actions: [ Try It On ] and [ Add to Closet ]
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { ProductImportService, ImportedProduct } from '../../src/services/commerce/productImportService';
import { GarmentSegmentationService } from '../../src/services/image-processing/garmentSegmentationService';
import { GarmentRegionSelector } from '../../src/components/garment/GarmentRegionSelector';
import { GarmentSelection } from '../../src/services/garment-selection/types';
import { DatabaseService } from '../../src/services/database/databaseService';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  ArrowLeft,
  Link2,
  Image as ImageIcon,
  Crop,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Layers,
  Wand2,
  Camera,
  X,
} from 'lucide-react-native';

type DiscoveryTab = 'link' | 'photo' | 'screenshot';

export default function OnlineDiscoveryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<DiscoveryTab>('link');
  const [productUrl, setProductUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result
  const [importedProduct, setImportedProduct] = useState<ImportedProduct | null>(null);
  const [isAddingToCloset, setIsAddingToCloset] = useState(false);
  const [addedToClosetSuccess, setAddedToClosetSuccess] = useState(false);

  // Manual Region Selector Fallback
  const [showManualSelector, setShowManualSelector] = useState(false);
  const [manualImageUri, setManualImageUri] = useState<string | null>(null);
  const [manualImageDims, setManualImageDims] = useState<{ width: number; height: number }>({
    width: 800,
    height: 1000,
  });
  const [pendingProduct, setPendingProduct] = useState<ImportedProduct | null>(null);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  // 1. Handle URL Import (Supported Provider: Myntra)
  const handleImportFromUrl = async () => {
    if (!productUrl.trim()) {
      Alert.alert('Link Required', 'Please paste a supported product URL.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setStatusMessage('Finding your item...');

    const result = await ProductImportService.importProduct({
      type: 'url',
      url: productUrl.trim(),
    });

    if (!result.success || !result.product) {
      setIsProcessing(false);
      setStatusMessage(null);
      setErrorMessage(
        result.message || "Couldn't import this product. Try uploading the product image instead."
      );
      return;
    }

    setStatusMessage('Product found. Isolating garment background...');

    const segResult = await GarmentSegmentationService.segmentGarment(
      result.product.rawImageUri,
      {
        sourceType: 'product_catalog',
        forceTransparency: true,
        categoryHint: result.product.category,
      }
    );

    setIsProcessing(false);
    setStatusMessage(null);

    if (segResult.success && !segResult.requiresManualFallback && segResult.qualityGate.passed) {
      result.product.cleanGarmentUri = segResult.segmentedImageUri;
      result.product.hasCleanBackground = true;
      setImportedProduct(result.product);
    } else {
      // Automatic isolation ambiguous -> trigger manual selection fallback
      setPendingProduct(result.product);
      setManualImageUri(result.product.rawImageUri);
      setShowManualSelector(true);
    }
  };

  // 2. Handle Photo / Screenshot Import
  const handleImportMedia = async (type: 'photo' | 'screenshot') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to import clothing photos.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      const asset = res.assets[0];
      const uri = asset.uri;
      if (asset.width && asset.height) {
        setManualImageDims({ width: asset.width, height: asset.height });
      }

      setErrorMessage(null);
      setIsProcessing(true);
      setStatusMessage('Importing product garment...');

      const result = await ProductImportService.importProduct({
        type: type === 'photo' ? 'image' : 'screenshot',
        imageUri: uri,
      });

      if (!result.success || !result.product) {
        setIsProcessing(false);
        setStatusMessage(null);
        setErrorMessage(result.message || 'Could not import the selected image.');
        return;
      }

      setStatusMessage('Isolating garment from background...');

      const segResult = await GarmentSegmentationService.segmentGarment(uri, {
        sourceType: type === 'screenshot' ? 'screenshot' : 'lifestyle',
        categoryHint: result.product.category,
      });

      setIsProcessing(false);
      setStatusMessage(null);

      if (segResult.success && !segResult.requiresManualFallback && segResult.qualityGate.passed) {
        result.product.cleanGarmentUri = segResult.segmentedImageUri;
        result.product.hasCleanBackground = true;
        setImportedProduct(result.product);
      } else {
        setPendingProduct(result.product);
        setManualImageUri(uri);
        setShowManualSelector(true);
      }
    }
  };

  // 3. Confirm Manual Crop Region
  const handleConfirmManualSelection = (selection: GarmentSelection) => {
    if (pendingProduct) {
      pendingProduct.cleanGarmentUri = selection.imageUri;
      pendingProduct.hasCleanBackground = true;
      setImportedProduct(pendingProduct);
      setPendingProduct(null);
    }
    setShowManualSelector(false);
  };

  // 4. Add Imported Garment to User Closet
  const handleAddToCloset = async () => {
    if (!user || !importedProduct) return;

    setIsAddingToCloset(true);
    try {
      await DatabaseService.addGarment({
        user_id: user.id,
        name: importedProduct.title,
        category: importedProduct.category,
        original_image: importedProduct.rawImageUri,
        processed_image: importedProduct.cleanGarmentUri,
        primary_color: importedProduct.colors?.[0] || '#2C2C2C',
        secondary_colors: importedProduct.colors?.slice(1),
        favorite: false,
        user_verified: true,
      });

      setAddedToClosetSuccess(true);
      Alert.alert(
        'Garment Saved',
        `"${importedProduct.title}" has been added to your AURA closet. You can now style it in Studio or try it on.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add garment to closet.');
    } finally {
      setIsAddingToCloset(false);
    }
  };

  // 5. Navigate to Try-On with this garment
  const handleTryItOn = async () => {
    if (!user || !importedProduct) return;

    // Ensure garment exists in DB so Try-On can load it
    try {
      const newGarment = await DatabaseService.addGarment({
        user_id: user.id,
        name: importedProduct.title,
        category: importedProduct.category,
        original_image: importedProduct.rawImageUri,
        processed_image: importedProduct.cleanGarmentUri,
        primary_color: importedProduct.colors?.[0] || '#2C2C2C',
        secondary_colors: importedProduct.colors?.slice(1),
        favorite: false,
        user_verified: true,
      });

      router.push({
        pathname: '/tryon',
        params: { garmentId: newGarment.id, source: 'discovery' },
      });
    } catch {
      // Direct navigation with id
      router.push({
        pathname: '/tryon',
        params: { garmentId: importedProduct.id, source: 'discovery' },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Typography variant="title" style={styles.headerTitle}>
              Online Discovery
            </Typography>
            <Typography variant="caption" color={colors.textSecondary}>
              Find online • See it on you
            </Typography>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isScrollEnabled}
        >
          {/* Method Switcher Tabs */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('link');
                setErrorMessage(null);
              }}
              style={[styles.tabBtn, activeTab === 'link' && styles.tabBtnActive]}
            >
              <Link2 size={15} color={activeTab === 'link' ? colors.textInverse : colors.text} />
              <Typography
                variant="caption"
                color={activeTab === 'link' ? colors.textInverse : colors.text}
                style={styles.tabBtnText}
              >
                Product Link
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('photo');
                setErrorMessage(null);
              }}
              style={[styles.tabBtn, activeTab === 'photo' && styles.tabBtnActive]}
            >
              <ImageIcon size={15} color={activeTab === 'photo' ? colors.textInverse : colors.text} />
              <Typography
                variant="caption"
                color={activeTab === 'photo' ? colors.textInverse : colors.text}
                style={styles.tabBtnText}
              >
                Product Photo
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveTab('screenshot');
                setErrorMessage(null);
              }}
              style={[styles.tabBtn, activeTab === 'screenshot' && styles.tabBtnActive]}
            >
              <Crop size={15} color={activeTab === 'screenshot' ? colors.textInverse : colors.text} />
              <Typography
                variant="caption"
                color={activeTab === 'screenshot' ? colors.textInverse : colors.text}
                style={styles.tabBtnText}
              >
                Screenshot
              </Typography>
            </TouchableOpacity>
          </View>

          {/* TAB 1: PRODUCT LINK */}
          {activeTab === 'link' && (
            <View style={styles.tabContentCard}>
              <Typography variant="title" style={styles.sectionHeadline}>
                Paste Product Link
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.sectionSub}>
                Paste a clothing product link from supported retailers. AURA extracts the actual catalog garment.
              </Typography>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://www.myntra.com/..."
                  placeholderTextColor={colors.textMuted}
                  value={productUrl}
                  onChangeText={setProductUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.retailerBadge}>
                <Sparkles size={13} color={colors.accent} />
                <Typography variant="caption" color={colors.textSecondary}>
                  Supported Retailer: Myntra Catalog
                </Typography>
              </View>

              <Button
                label="Find Item"
                variant="primary"
                size="lg"
                loading={isProcessing}
                onPress={handleImportFromUrl}
                icon={<Sparkles size={16} color={colors.textInverse} />}
                style={styles.primaryActionBtn}
              />
            </View>
          )}

          {/* TAB 2: PRODUCT PHOTO */}
          {activeTab === 'photo' && (
            <View style={styles.tabContentCard}>
              <Typography variant="title" style={styles.sectionHeadline}>
                Upload Product Photo
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.sectionSub}>
                Select a clean catalog or product photo. AURA isolates the garment with precision.
              </Typography>

              <View style={styles.mediaUploadRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleImportMedia('photo')}
                  style={styles.mediaUploadCard}
                >
                  <ImageIcon size={32} color={colors.accent} />
                  <Typography variant="title" style={styles.mediaCardTitle}>
                    Choose from Gallery
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    PNG, JPG, or WebP
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 3: SCREENSHOT */}
          {activeTab === 'screenshot' && (
            <View style={styles.tabContentCard}>
              <Typography variant="title" style={styles.sectionHeadline}>
                Import from Screenshot
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.sectionSub}>
                Screenshot of an item on social media or shopping apps. AURA will crop and isolate the single piece.
              </Typography>

              <View style={styles.mediaUploadRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleImportMedia('screenshot')}
                  style={styles.mediaUploadCard}
                >
                  <Crop size={32} color={colors.accent} />
                  <Typography variant="title" style={styles.mediaCardTitle}>
                    Select Screenshot
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    Crop & isolate clothing item
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Status Indicator */}
          {isProcessing && statusMessage && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Typography variant="body" color={colors.text} style={styles.statusText}>
                {statusMessage}
              </Typography>
            </View>
          )}

          {/* Honest Error & Fallback Card */}
          {errorMessage && (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <AlertCircle size={18} color={colors.warning} />
                <Typography variant="title" style={styles.errorTitle}>
                  Could Not Import Link
                </Typography>
              </View>
              <Typography variant="body" color={colors.textSecondary} style={styles.errorText}>
                {errorMessage}
              </Typography>

              <Button
                label="Upload Product Image Instead"
                variant="secondary"
                size="sm"
                onPress={() => {
                  setActiveTab('photo');
                  handleImportMedia('photo');
                }}
                icon={<ImageIcon size={15} color={colors.text} />}
                style={styles.fallbackBtn}
              />
            </View>
          )}

          {/* RESULT: ISOLATED GARMENT ASSET */}
          {importedProduct && (
            <View style={styles.resultContainer}>
              <View style={styles.resultBadgeRow}>
                <CheckCircle2 size={16} color={colors.success} />
                <Typography variant="label" style={styles.resultBadgeText}>
                  CLEAN GARMENT ASSET READY
                </Typography>
              </View>

              {/* Garment Hero Frame */}
              <View style={styles.garmentDisplayFrame}>
                <Image
                  source={{ uri: importedProduct.cleanGarmentUri }}
                  style={styles.garmentDisplayImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.productMeta}>
                <Typography variant="caption" color={colors.textMuted} style={styles.productCategory}>
                  {importedProduct.category.toUpperCase()} • {importedProduct.sourceProviderName}
                </Typography>
                <Typography variant="hero" style={styles.productTitle}>
                  {importedProduct.title}
                </Typography>
                {importedProduct.price && (
                  <Typography variant="body" color={colors.accent} style={styles.productPrice}>
                    {importedProduct.price}
                  </Typography>
                )}
              </View>

              {/* Action Buttons: [ TRY IT ON ] and [ ADD TO CLOSET ] */}
              <View style={styles.actionButtonsRow}>
                <Button
                  label={addedToClosetSuccess ? 'Added to Closet' : 'Add to Closet'}
                  variant="outline"
                  size="lg"
                  loading={isAddingToCloset}
                  onPress={handleAddToCloset}
                  icon={<Bookmark size={16} color={colors.text} />}
                  style={styles.halfBtn}
                />
                <Button
                  label="Try It On"
                  variant="primary"
                  size="lg"
                  onPress={handleTryItOn}
                  icon={<Sparkles size={16} color={colors.textInverse} />}
                  style={styles.halfBtn}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Manual Garment Region Selection Fallback Modal */}
        <Modal
          visible={showManualSelector}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowManualSelector(false)}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowManualSelector(false)}
                style={styles.backBtn}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
              <Typography variant="title" style={styles.headerTitle}>
                Manual Garment Selection
              </Typography>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.modalBody}>
              <Typography variant="body" color={colors.textSecondary} style={styles.modalGuide}>
                Adjust the handles around the target garment piece.
              </Typography>

              {manualImageUri && (
                <GarmentRegionSelector
                  imageUri={manualImageUri}
                  sourceWidth={manualImageDims.width}
                  sourceHeight={manualImageDims.height}
                  onConfirmSelection={handleConfirmManualSelection}
                  onCancel={() => setShowManualSelector(false)}
                  onInteractionStart={() => setIsScrollEnabled(false)}
                  onInteractionEnd={() => setIsScrollEnabled(true)}
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    color: colors.text,
  },
  placeholder: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  tabBtnActive: {
    backgroundColor: colors.text,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  sectionHeadline: {
    fontSize: 18,
    color: colors.text,
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    marginTop: spacing.xs,
  },
  urlInput: {
    height: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  retailerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  primaryActionBtn: {
    marginTop: spacing.xs,
  },
  mediaUploadRow: {
    marginTop: spacing.sm,
  },
  mediaUploadCard: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mediaCardTitle: {
    fontSize: 16,
    marginTop: 4,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: spacing.xs,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    color: colors.warning,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  fallbackBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  resultContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.subtle,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultBadgeText: {
    fontSize: 10,
    color: colors.success,
    letterSpacing: 0.8,
  },
  garmentDisplayFrame: {
    height: 260,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  garmentDisplayImage: {
    width: '85%',
    height: '85%',
  },
  productMeta: {
    gap: 2,
  },
  productCategory: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  productTitle: {
    fontSize: 20,
    color: colors.text,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  halfBtn: {
    flex: 1,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalGuide: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
});
