/**
 * Personal AURA Model Onboarding Screen
 * Route: /mirror/capture
 * 
 * Complies with Master Specification Phase 9:
 * 1. Proportions & Measurements (Height, Weight, optional fit measurements)
 * 2. Usual Sizes (Tops, Bottoms, Shoes)
 * 3. Body Shape Selection (Neutral styling representation)
 * 4. Face References & Appearance (Identity appearance distinct from body measurements)
 * 5. Persistent Personal Model Activation (Stored locally, strictly private)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { MirrorService } from '../../src/services/vto/mirrorService';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  AuraUserModel,
  BodyShapeType,
  UserProportions,
  UserSizes,
  FaceReference,
} from '../../src/types/vto';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Ruler,
  User,
  Sparkles,
  Info,
  X,
} from 'lucide-react-native';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

const BODY_SHAPES: Array<{
  id: BodyShapeType;
  label: string;
  description: string;
}> = [
  {
    id: 'straight',
    label: 'Straight',
    description: 'Relatively uniform width across shoulders, waist, and hips.',
  },
  {
    id: 'athletic',
    label: 'Athletic',
    description: 'Broader frame with subtle tapering through the torso.',
  },
  {
    id: 'broader_shoulders',
    label: 'Broader Shoulders',
    description: 'Prominent shoulder line relative to waist and lower body.',
  },
  {
    id: 'fuller_midsection',
    label: 'Fuller Midsection',
    description: 'Gentle relaxed drape and comfort through the midsection.',
  },
  {
    id: 'curved',
    label: 'Curved Frame',
    description: 'Defined waist with balanced shoulder and hip proportions.',
  },
];

const TOP_SIZES: Array<NonNullable<UserSizes['tops']>> = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
];

export default function MirrorCaptureScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>(1);

  // Step 1: Proportions
  const [heightCm, setHeightCm] = useState<string>('178');
  const [weightKg, setWeightKg] = useState<string>('72');
  const [waistInches, setWaistInches] = useState<string>('31');
  const [chestInches, setChestInches] = useState<string>('39');
  const [inseamInches, setInseamInches] = useState<string>('32');

  // Step 2: Sizes
  const [topSize, setTopSize] = useState<UserSizes['tops']>('M');
  const [bottomSize, setBottomSize] = useState<string>('32');
  const [shoeSize, setShoeSize] = useState<string>('US 10');

  // Step 3: Body Shape
  const [selectedShape, setSelectedShape] = useState<BodyShapeType>('athletic');

  // Step 4: Face References
  const [faceUri, setFaceUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      MirrorService.getUserModel(user.id).then((model) => {
        if (model) {
          if (model.proportions?.heightCm) setHeightCm(String(model.proportions.heightCm));
          if (model.proportions?.weightKg) setWeightKg(String(model.proportions.weightKg));
          if (model.proportions?.waistInches) setWaistInches(String(model.proportions.waistInches));
          if (model.proportions?.chestInches) setChestInches(String(model.proportions.chestInches));
          if (model.proportions?.inseamInches) setInseamInches(String(model.proportions.inseamInches));
          if (model.sizes?.tops) setTopSize(model.sizes.tops);
          if (model.sizes?.bottoms) setBottomSize(model.sizes.bottoms);
          if (model.sizes?.shoes) setShoeSize(model.sizes.shoes);
          if (model.bodyShape) setSelectedShape(model.bodyShape);
          if (model.primaryFaceUri) setFaceUri(model.primaryFaceUri);
        }
      });
    }
  }, [user]);

  const handlePickFacePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'AURA requires photo library access for face reference photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFaceUri(result.assets[0].uri);
    }
  };

  const handleCaptureFacePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'AURA requires camera access to take a reference photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFaceUri(result.assets[0].uri);
    }
  };

  const handleConfirmModel = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const proportions: UserProportions = {
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        heightUnit: 'cm',
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        weightUnit: 'kg',
        waistInches: waistInches ? parseFloat(waistInches) : undefined,
        chestInches: chestInches ? parseFloat(chestInches) : undefined,
        inseamInches: inseamInches ? parseFloat(inseamInches) : undefined,
      };

      const sizes: UserSizes = {
        tops: topSize,
        bottoms: bottomSize.trim() || undefined,
        shoes: shoeSize.trim() || undefined,
      };

      const faceReferences: FaceReference[] = faceUri
        ? [
            {
              id: 'face_primary',
              uri: faceUri,
              angle: 'front',
              capturedAt: new Date().toISOString(),
            },
          ]
        : [];

      await MirrorService.saveUserModel(user.id, {
        proportions,
        sizes,
        bodyShape: selectedShape,
        faceReferences,
        primaryFaceUri: faceUri || undefined,
        isReady: true,
      });

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save personal AURA model.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={step > 1 ? () => setStep((s) => (s - 1) as OnboardingStep) : () => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Typography variant="caption" style={styles.stepCounter}>
              STEP {step} OF 5
            </Typography>
            <Typography variant="title" style={styles.headerTitle}>
              Create Your AURA
            </Typography>
          </View>

          <View style={styles.placeholder} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${(step / 5) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* STEP 1: PROPORTIONS */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepTitleRow}>
                <Ruler size={18} color={colors.accent} />
                <Typography variant="hero" style={styles.titleText}>
                  Your Proportions
                </Typography>
              </View>
              <Typography variant="body" color={colors.textSecondary} style={styles.stepDescription}>
                These help AURA build an accurate digital representation of your height, weight, and clothing fit.
              </Typography>

              <View style={styles.inputsGrid}>
                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    HEIGHT (CM)
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="e.g. 178"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    WEIGHT (KG)
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={weightKg}
                    onChangeText={setWeightKg}
                    placeholder="e.g. 72"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.optionalDivider}>
                <Typography variant="caption" color={colors.textMuted}>
                  OPTIONAL FIT MEASUREMENTS (SKIPPABLE)
                </Typography>
              </View>

              <View style={styles.inputsGridThree}>
                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    WAIST (IN)
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={waistInches}
                    onChangeText={setWaistInches}
                    placeholder="32"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    CHEST (IN)
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={chestInches}
                    onChangeText={setChestInches}
                    placeholder="40"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    INSEAM (IN)
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={inseamInches}
                    onChangeText={setInseamInches}
                    placeholder="32"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.infoBanner}>
                <Info size={14} color={colors.textSecondary} />
                <Typography variant="caption" color={colors.textSecondary} style={styles.infoBannerText}>
                  Measurements are stored strictly on your local device and inform garment drape.
                </Typography>
              </View>
            </View>
          )}

          {/* STEP 2: SIZES */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepTitleRow}>
                <User size={18} color={colors.accent} />
                <Typography variant="hero" style={styles.titleText}>
                  Your Usual Sizes
                </Typography>
              </View>
              <Typography variant="body" color={colors.textSecondary} style={styles.stepDescription}>
                Select the sizes you typically wear for tops, trousers, and footwear.
              </Typography>

              <View style={styles.sizeSection}>
                <Typography variant="label" style={styles.sectionLabel}>
                  SHIRTS & TOPS
                </Typography>
                <View style={styles.pillsRow}>
                  {TOP_SIZES.map((sz) => (
                    <TouchableOpacity
                      key={sz}
                      activeOpacity={0.8}
                      onPress={() => setTopSize(sz)}
                      style={[styles.sizePill, topSize === sz && styles.sizePillActive]}
                    >
                      <Typography
                        variant="body"
                        color={topSize === sz ? colors.textInverse : colors.text}
                        style={styles.sizePillText}
                      >
                        {sz}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputsGrid}>
                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    TROUSERS / BOTTOMS (WAIST)
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    value={bottomSize}
                    onChangeText={setBottomSize}
                    placeholder="e.g. 32, 34, M"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.inputField}>
                  <Typography variant="label" style={styles.inputLabel}>
                    SHOES
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    value={shoeSize}
                    onChangeText={setShoeSize}
                    placeholder="e.g. US 10, EU 43"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: BODY SHAPE */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepTitleRow}>
                <Sparkles size={18} color={colors.accent} />
                <Typography variant="hero" style={styles.titleText}>
                  Your Frame & Shape
                </Typography>
              </View>
              <Typography variant="body" color={colors.textSecondary} style={styles.stepDescription}>
                Select your general body shape. AURA uses this for approximate styling proportions and silhouette recommendations.
              </Typography>

              <View style={styles.shapesList}>
                {BODY_SHAPES.map((shape) => {
                  const isSelected = selectedShape === shape.id;
                  return (
                    <TouchableOpacity
                      key={shape.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedShape(shape.id)}
                      style={[styles.shapeCard, isSelected && styles.shapeCardActive]}
                    >
                      <View style={styles.shapeCardHeader}>
                        <Typography
                          variant="title"
                          color={isSelected ? colors.accent : colors.text}
                          style={styles.shapeCardTitle}
                        >
                          {shape.label}
                        </Typography>
                        {isSelected && <CheckCircle2 size={18} color={colors.accent} />}
                      </View>
                      <Typography variant="caption" color={colors.textSecondary} style={styles.shapeCardDesc}>
                        {shape.description}
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 4: FACE REFERENCE */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepTitleRow}>
                <Camera size={18} color={colors.accent} />
                <Typography variant="hero" style={styles.titleText}>
                  Face & Identity Reference
                </Typography>
              </View>
              <Typography variant="body" color={colors.textSecondary} style={styles.stepDescription}>
                A clear face reference ensures your virtual try-on accurately reflects your personal appearance.
              </Typography>

              <View style={styles.privacyCallout}>
                <ShieldCheck size={16} color={colors.success} />
                <View style={styles.privacyTextContainer}>
                  <Typography variant="label" color={colors.success} style={styles.privacyHeading}>
                    PRIVACY NOTICE
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.privacyBody}>
                    Face references inform appearance and identity only. Body geometry is calculated strictly from your height, weight, and proportions. Your photo never leaves your device.
                  </Typography>
                </View>
              </View>

              <View style={styles.facePreviewArea}>
                {faceUri ? (
                  <View style={styles.facePreviewFrame}>
                    <Image source={{ uri: faceUri }} style={styles.facePreviewImage} />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setFaceUri(null)}
                      style={styles.removeFaceBtn}
                    >
                      <X size={16} color={colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyFaceFrame}>
                    <User size={48} color={colors.textMuted} />
                    <Typography variant="caption" color={colors.textMuted} style={styles.emptyFaceText}>
                      No photo selected yet
                    </Typography>
                  </View>
                )}
              </View>

              <View style={styles.photoActionsRow}>
                <Button
                  label="Take Photo"
                  variant="secondary"
                  onPress={handleCaptureFacePhoto}
                  icon={<Camera size={16} color={colors.text} />}
                  style={styles.photoActionBtn}
                />
                <Button
                  label="Choose from Library"
                  variant="outline"
                  onPress={handlePickFacePhoto}
                  icon={<Sparkles size={16} color={colors.text} />}
                  style={styles.photoActionBtn}
                />
              </View>
            </View>
          )}

          {/* STEP 5: MODEL READY */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <View style={styles.readyBadge}>
                <CheckCircle2 size={32} color={colors.accent} />
              </View>
              <Typography variant="hero" style={styles.readyTitle}>
                Your AURA Model is Ready
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.readySubtitle}>
                Your personal model is now active and will be used across Studio, Closet, and Virtual Try-On.
              </Typography>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Typography variant="caption" color={colors.textMuted}>
                    PROPORTIONS
                  </Typography>
                  <Typography variant="body" style={styles.summaryVal}>
                    {heightCm} cm • {weightKg} kg
                  </Typography>
                </View>
                <View style={styles.summaryRow}>
                  <Typography variant="caption" color={colors.textMuted}>
                    USUAL SIZES
                  </Typography>
                  <Typography variant="body" style={styles.summaryVal}>
                    Top: {topSize} • Bottom: {bottomSize} • Shoes: {shoeSize}
                  </Typography>
                </View>
                <View style={styles.summaryRow}>
                  <Typography variant="caption" color={colors.textMuted}>
                    BODY SHAPE
                  </Typography>
                  <Typography variant="body" style={styles.summaryVal}>
                    {selectedShape.replace('_', ' ').toUpperCase()}
                  </Typography>
                </View>
                <View style={styles.summaryRow}>
                  <Typography variant="caption" color={colors.textMuted}>
                    FACE REFERENCE
                  </Typography>
                  <Typography variant="body" style={styles.summaryVal}>
                    {faceUri ? 'Identity Reference Linked' : 'Standard Neutral Avatar'}
                  </Typography>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 5 ? (
            <Button
              label={step === 4 ? 'Review AURA Model' : 'Next'}
              variant="primary"
              size="lg"
              onPress={() => setStep((s) => (s + 1) as OnboardingStep)}
              icon={<ArrowRight size={16} color={colors.textInverse} />}
              style={styles.fullWidthBtn}
            />
          ) : (
            <Button
              label="Activate Personal Model"
              variant="primary"
              size="lg"
              loading={isSaving}
              onPress={handleConfirmModel}
              icon={<Sparkles size={16} color={colors.textInverse} />}
              style={styles.fullWidthBtn}
            />
          )}
        </View>
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
  stepCounter: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    width: 36,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: colors.border,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  stepContainer: {
    gap: spacing.md,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 24,
    color: colors.text,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputsGridThree: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  optionalDivider: {
    marginVertical: spacing.xs,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sizeSection: {
    marginVertical: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizePill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizePillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  sizePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shapesList: {
    gap: spacing.sm,
  },
  shapeCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shapeCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceMuted,
  },
  shapeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shapeCardTitle: {
    fontSize: 16,
  },
  shapeCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  privacyCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyHeading: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  privacyBody: {
    fontSize: 11,
    lineHeight: 15,
  },
  facePreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  facePreviewFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: colors.accent,
    ...shadows.subtle,
  },
  facePreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeFaceBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFaceFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyFaceText: {
    fontSize: 11,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoActionBtn: {
    flex: 1,
  },
  readyBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  readyTitle: {
    textAlign: 'center',
    fontSize: 26,
    color: colors.text,
  },
  readySubtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  fullWidthBtn: {
    width: '100%',
  },
});
