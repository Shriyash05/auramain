/**
 * AURA Garment Creation & Target Garment Selection Flow (Phase 15A)
 * ================================================================
 * Integrates interactive target garment selection, 5% padded cropping,
 * Exp-0015 experimental selective LoRA inference, confidence gating (<0.65 refusal),
 * and honest refusal/success UI states.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { GARMENT_CATEGORIES, GarmentCategory } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  GarmentRegionSelector,
} from '../../src/components/garment/GarmentRegionSelector';
import {
  garmentSelectionService,
  GarmentSelectionState,
  GarmentSelection,
  SuggestedGarmentRegion,
  GarmentInferenceResult,
} from '../../src/services/garment-selection';
import {
  Camera,
  Image as ImageIcon,
  Link2,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from 'lucide-react-native';

import { garmentTelemetryService } from '../../src/services/telemetry';

export default function AddGarmentScreen() {
  const router = useRouter();

  // FSM State
  const [currentState, setCurrentState] = useState<GarmentSelectionState>('IDLE');

  // Form & Image State
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory>('tops');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 1000, height: 1000 });

  // Selection & Inference State
  const [suggestedRegions, setSuggestedRegions] = useState<SuggestedGarmentRegion[]>([]);
  const [inferenceResult, setInferenceResult] = useState<GarmentInferenceResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [userFeedback, setUserFeedback] = useState<'CORRECT' | 'INCORRECT' | 'NOT_SURE' | null>(null);
  const [isParentScrollEnabled, setIsParentScrollEnabled] = useState(true);

  // Permissions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        'AURA needs camera permission to let you take photos of your clothes.'
      );
      return false;
    }
    return true;
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Access Required',
        'AURA needs gallery access so you can select clothing photos.'
      );
      return false;
    }
    return true;
  };

  const handleImageLoaded = async (uri: string, width?: number, height?: number) => {
    const w = width && width > 0 ? width : 1000;
    const h = height && height > 0 ? height : 1000;

    setSelectedImageUri(uri);
    setImageDimensions({ width: w, height: h });
    setInferenceResult(null);
    setSuggestedRegions([]);
    setUserFeedback(null);

    // Telemetry: track image selected and selection started
    garmentTelemetryService.trackImageSelected(w, h);
    garmentTelemetryService.trackSelectionStarted(w, h);

    // Initialize Selection Service FSM
    garmentSelectionService.initializeWithImage(uri, w, h);
    setCurrentState('SELECTING_REGION');

    // Load optional automatic suggestions (Mode B)
    try {
      const suggestions = await garmentSelectionService.loadAutomaticSuggestions({ minConfidence: 0.5 });
      setSuggestedRegions(suggestions);
      if (suggestions.length > 0) {
        garmentTelemetryService.trackSuggestionsShown(suggestions.length);
      }
    } catch (e) {
      console.warn('[AddGarment] Failed to load suggestions:', e);
      setSuggestedRegions([]);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      await handleImageLoaded(asset.uri, asset.width, asset.height);
    }
  };

  const handlePickGallery = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      await handleImageLoaded(asset.uri, asset.width, asset.height);
    }
  };

  const handleConfirmSelection = async (selection: GarmentSelection) => {
    setCurrentState('PROCESSING');
    setIsClassifying(true);
    setUserFeedback(null);

    const cropW = Math.round(selection.bbox.width * selection.sourceWidth);
    const cropH = Math.round(selection.bbox.height * selection.sourceHeight);

    // Telemetry
    garmentTelemetryService.trackSelectionConfirmed(selection.selectionMethod as any, cropW, cropH);
    garmentTelemetryService.trackCropCreated(cropW, cropH);
    garmentTelemetryService.trackInferenceStarted(
      selection.selectionMethod === 'suggested' ? 'suggested_crop' : 'manual_crop',
      selection.selectionMethod as any
    );

    try {
      // Execute inference via Exp-0015 LoRA adapter & confidence gate
      const result = await garmentSelectionService.executeInference({
        imageUri: selection.imageUri,
        selection,
        modelVersion: 'aura-garment-v1-exp0015',
        inferenceMode: selection.selectionMethod === 'suggested' ? 'suggested_crop' : 'manual_crop',
      });

      setInferenceResult(result);
      setCurrentState(result.status);

      if (result.status === 'SUCCESS') {
        garmentTelemetryService.trackInferenceSuccess({
          confidence: result.confidence,
          latencyMs: result.latency.total_ms,
          cropWidth: cropW,
          cropHeight: cropH,
          selectionMethod: selection.selectionMethod as any,
          category: result.category,
        });
      } else if (result.status === 'REFUSED') {
        garmentTelemetryService.trackInferenceRefused({
          confidence: result.confidence,
          latencyMs: result.latency.total_ms,
          cropWidth: cropW,
          cropHeight: cropH,
          selectionMethod: selection.selectionMethod as any,
        });
      } else {
        garmentTelemetryService.trackInferenceError('INFERENCE_ERROR', result.latency.total_ms);
      }
    } catch (err) {
      console.error('[AddGarment] Inference execution failed:', err);
      setCurrentState('ERROR');
      garmentTelemetryService.trackInferenceError('INFERENCE_ERROR');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleProceedToConfirmScreen = (useInferredAttributes: boolean) => {
    if (!selectedImageUri) return;

    const queryParams: Record<string, string> = {
      imageUri: selectedImageUri,
      category: selectedCategory,
    };

    if (useInferredAttributes && inferenceResult?.status === 'SUCCESS') {
      queryParams.inferredAttributes = JSON.stringify(inferenceResult.attributes);
      queryParams.selectionMeta = JSON.stringify({
        bbox: inferenceResult.bbox,
        confidence: inferenceResult.confidence,
        modelVersion: inferenceResult.modelVersion,
        selectionMethod: inferenceResult.selectionMethod,
      });
      if (inferenceResult.category !== 'unknown') {
        queryParams.category = inferenceResult.category as GarmentCategory;
      }
    }

    router.push({
      pathname: '/garment/confirm',
      params: queryParams,
    });
  };

  const handleResetToSelection = () => {
    garmentSelectionService.resetSelection();
    setInferenceResult(null);
    setUserFeedback(null);
    setCurrentState('SELECTING_REGION');
    garmentTelemetryService.trackSelectionReset();
  };

  const handleRetakePhoto = () => {
    garmentSelectionService.cancel();
    setSelectedImageUri(null);
    setInferenceResult(null);
    setSuggestedRegions([]);
    setUserFeedback(null);
    setCurrentState('IDLE');
    garmentTelemetryService.trackSelectionCanceled('user_retake');
  };

  const handleProvideFeedback = (fb: 'CORRECT' | 'INCORRECT' | 'NOT_SURE') => {
    setUserFeedback(fb);
    if (inferenceResult) {
      garmentTelemetryService.trackPredictionFeedback(fb, inferenceResult.category);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isParentScrollEnabled}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Close add garment"
          >
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Add Clothing
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* STATE: IDLE (Photo Capture or Pick) */}
        {currentState === 'IDLE' && (
          <>
            {/* Step 1: Category */}
            <View style={styles.section}>
              <Typography variant="label" style={styles.sectionTitle}>
                1. SELECT CATEGORY (OPTIONAL PRESET)
              </Typography>
              <View style={styles.chipsRow}>
                {GARMENT_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat.id}
                    label={cat.label}
                    selected={selectedCategory === cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={styles.chip}
                  />
                ))}
              </View>
            </View>

            {/* Step 2: Photo Capture or Upload */}
            <View style={styles.section}>
              <Typography variant="label" style={styles.sectionTitle}>
                2. CAPTURE OR UPLOAD PHOTO
              </Typography>
              <View style={styles.uploadOptions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleTakePhoto}
                  style={styles.uploadOptionCard}
                  accessibilityLabel="Take photo with camera"
                >
                  <View style={styles.iconCircle}>
                    <Camera size={24} color={colors.text} />
                  </View>
                  <Typography variant="body" color={colors.text} style={styles.optionTitle}>
                    Take Photo
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    Capture full outfit or isolated garment
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePickGallery}
                  style={styles.uploadOptionCard}
                  accessibilityLabel="Choose photo from gallery"
                >
                  <View style={styles.iconCircle}>
                    <ImageIcon size={24} color={colors.text} />
                  </View>
                  <Typography variant="body" color={colors.text} style={styles.optionTitle}>
                    Choose from Gallery
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    Select image from your library
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/mirror')}
                  style={styles.uploadOptionCard}
                  accessibilityLabel="Import from product link"
                >
                  <View style={styles.iconCircle}>
                    <Link2 size={24} color={colors.text} />
                  </View>
                  <Typography variant="body" color={colors.text} style={styles.optionTitle}>
                    From Link
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    Add from any product link or shopping screenshot
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>

          </>
        )}

        {/* STATE: SELECTING_REGION (Target Garment Selection) */}
        {currentState === 'SELECTING_REGION' && selectedImageUri && (
          <View style={styles.section}>
            <View style={styles.selectionGuide}>
              <Typography variant="title" style={styles.selectionMainTitle}>
                Select Target Garment
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.selectionSubTitle}>
                Select the garment you want AURA to analyze. Drag the box around one garment.
              </Typography>
              <View style={styles.multiGarmentCallout}>
                <Sparkles size={14} color={colors.accentHighlight} />
                <Typography variant="caption" color={colors.textSecondary}>
                  For photos with multiple items (jacket, shirt, trousers), select ONE target item.
                </Typography>
              </View>
            </View>

            <GarmentRegionSelector
              imageUri={selectedImageUri}
              sourceWidth={imageDimensions.width}
              sourceHeight={imageDimensions.height}
              suggestedRegions={suggestedRegions}
              onConfirmSelection={handleConfirmSelection}
              onCancel={handleRetakePhoto}
              onInteractionStart={() => setIsParentScrollEnabled(false)}
              onInteractionEnd={() => setIsParentScrollEnabled(true)}
            />
          </View>
        )}

        {/* STATE: PROCESSING / CLASSIFYING */}
        {(currentState === 'PROCESSING' || currentState === 'CLASSIFYING' || isClassifying) && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Typography variant="title" style={styles.loadingTitle}>
              Analyzing Target Garment...
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={styles.loadingSubtitle}>
              Applying selective LoRA classifier on cropped region (Exp-0015 Experimental)
            </Typography>
          </View>
        )}

        {/* STATE: SUCCESS */}
        {currentState === 'SUCCESS' && inferenceResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={24} color={colors.success} />
              <View style={styles.resultHeaderTexts}>
                <Typography variant="title" style={styles.resultTitle}>
                  Target Garment Identified
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Model: {inferenceResult.modelVersion} (Experimental)
                </Typography>
              </View>
            </View>

            <View style={styles.confidenceRow}>
              <View style={styles.badgeSuccess}>
                <Typography variant="label" color={colors.success}>
                  {inferenceResult.category.toUpperCase()}
                </Typography>
              </View>
              <Typography variant="caption" color={colors.textSecondary}>
                {(inferenceResult.confidence * 100).toFixed(1)}% Confidence
              </Typography>
            </View>

            {/* Extracted Attributes Preview */}
            <View style={styles.attributesGrid}>
              <View style={styles.attributeItem}>
                <Typography variant="caption" color={colors.textMuted}>FIT</Typography>
                <Typography variant="body" color={colors.text}>{inferenceResult.attributes.fit || 'Regular'}</Typography>
              </View>
              <View style={styles.attributeItem}>
                <Typography variant="caption" color={colors.textMuted}>MATERIAL</Typography>
                <Typography variant="body" color={colors.text}>{inferenceResult.attributes.material || 'Standard'}</Typography>
              </View>
              <View style={styles.attributeItem}>
                <Typography variant="caption" color={colors.textMuted}>PATTERN</Typography>
                <Typography variant="body" color={colors.text}>{inferenceResult.attributes.pattern || 'Solid'}</Typography>
              </View>
              <View style={styles.attributeItem}>
                <Typography variant="caption" color={colors.textMuted}>SILHOUETTE</Typography>
                <Typography variant="body" color={colors.text}>{inferenceResult.attributes.silhouette || 'Straight'}</Typography>
              </View>
            </View>

            {/* Model Prediction Feedback Bar (Section 22) */}
            <View style={styles.feedbackSection}>
              <Typography variant="caption" color={colors.textSecondary}>
                Is this classification accurate?
              </Typography>
              {userFeedback ? (
                <Typography variant="caption" color={colors.success} style={{ marginTop: 4 }}>
                  Thanks for your feedback ({userFeedback.toLowerCase()})
                </Typography>
              ) : (
                <View style={styles.feedbackButtonsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleProvideFeedback('CORRECT')}
                    style={styles.feedbackChip}
                    accessibilityLabel="Feedback: correct prediction"
                  >
                    <ThumbsUp size={13} color={colors.textSecondary} />
                    <Typography variant="caption" color={colors.text}>Correct</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleProvideFeedback('INCORRECT')}
                    style={styles.feedbackChip}
                    accessibilityLabel="Feedback: incorrect prediction"
                  >
                    <ThumbsDown size={13} color={colors.textSecondary} />
                    <Typography variant="caption" color={colors.text}>Incorrect</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleProvideFeedback('NOT_SURE')}
                    style={styles.feedbackChip}
                    accessibilityLabel="Feedback: not sure"
                  >
                    <HelpCircle size={13} color={colors.textSecondary} />
                    <Typography variant="caption" color={colors.text}>Not Sure</Typography>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.resultActions}>
              <Button
                label="Confirm & Save to Wardrobe"
                onPress={() => handleProceedToConfirmScreen(true)}
                size="lg"
                variant="primary"
                icon={<ArrowRight size={18} color="#FFFFFF" />}
              />
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleResetToSelection}
                  style={styles.secondaryActionBtn}
                  accessibilityLabel="Select different garment"
                >
                  <RotateCcw size={16} color={colors.text} />
                  <Typography variant="body" color={colors.text}>Adjust Crop</Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRetakePhoto}
                  style={styles.secondaryActionBtn}
                  accessibilityLabel="Retake photo"
                >
                  <Camera size={16} color={colors.text} />
                  <Typography variant="body" color={colors.text}>New Photo</Typography>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* STATE: REFUSED (< 0.65 Confidence) */}
        {currentState === 'REFUSED' && (
          <View style={styles.refusalCard}>
            <View style={styles.resultHeader}>
              <AlertCircle size={24} color={colors.warning} />
              <View style={styles.resultHeaderTexts}>
                <Typography variant="title" style={styles.resultTitle}>
                  Unconfident Detection
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Confidence below 65% threshold (No attributes fabricated)
                </Typography>
              </View>
            </View>

            <Typography variant="body" color={colors.textSecondary} style={styles.refusalExplanation}>
              AURA could not confidently identify this garment. To preserve wardrobe accuracy, we don't guess attributes.
            </Typography>

            <View style={styles.refusalActions}>
              <Button
                label="Try a clearer crop"
                onPress={handleResetToSelection}
                size="md"
                variant="primary"
                icon={<RotateCcw size={16} color="#FFFFFF" />}
              />
              <Button
                label="Continue with manual category"
                onPress={() => handleProceedToConfirmScreen(false)}
                size="md"
                variant="outline"
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRetakePhoto}
                style={styles.tertiaryBtn}
                accessibilityLabel="Retake photo"
              >
                <Typography variant="caption" color={colors.textMuted}>
                  Or retake with better lighting
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STATE: ERROR */}
        {currentState === 'ERROR' && (
          <View style={styles.refusalCard}>
            <View style={styles.resultHeader}>
              <AlertCircle size={24} color={colors.error} />
              <View style={styles.resultHeaderTexts}>
                <Typography variant="title" style={styles.resultTitle}>
                  Inference Unavailable
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Deterministic safe fallback enabled
                </Typography>
              </View>
            </View>

            <Typography variant="body" color={colors.textSecondary} style={styles.refusalExplanation}>
              The experimental model encountered an issue. You can retry with a different crop or continue manually.
            </Typography>

            <View style={styles.refusalActions}>
              <Button
                label="Retry Crop"
                onPress={handleResetToSelection}
                size="md"
                variant="primary"
              />
              <Button
                label="Continue with Manual Entry"
                onPress={() => handleProceedToConfirmScreen(false)}
                size="md"
                variant="outline"
              />
            </View>
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
    marginBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginBottom: spacing.xxs,
  },
  uploadOptions: {
    gap: spacing.md,
  },
  uploadOptionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.card,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  selectionGuide: {
    marginBottom: spacing.md,
  },
  selectionMainTitle: {
    marginBottom: 4,
  },
  selectionSubTitle: {
    marginBottom: spacing.xs,
  },
  multiGarmentCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginVertical: spacing.xl,
  },
  loadingTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 4,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginVertical: spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  resultHeaderTexts: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  attributeItem: {
    width: '46%',
    marginBottom: spacing.xs,
  },
  resultActions: {
    gap: spacing.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.xs,
  },
  refusalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginVertical: spacing.md,
  },
  refusalExplanation: {
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  refusalActions: {
    gap: spacing.sm,
  },
  tertiaryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  feedbackSection: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  feedbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
});
