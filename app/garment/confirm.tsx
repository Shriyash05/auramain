import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGarments } from '../../src/hooks/useGarments';
import { imageProcessingService } from '../../src/services/image-processing/imageProcessingProvider';
import { GarmentCategory, GARMENT_CATEGORIES, OCCASIONS, Occasion } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { Input } from '../../src/components/ui/Input';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Check, Sparkles } from 'lucide-react-native';
import { garmentTelemetryService } from '../../src/services/telemetry';

export default function GarmentConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri: string;
    category?: GarmentCategory;
    inferredAttributes?: string;
    selectionMeta?: string;
  }>();
  const { addGarment } = useGarments();

  const [isProcessing, setIsProcessing] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>(params.category || 'tops');
  const [fit, setFit] = useState<'Oversized' | 'Relaxed' | 'Regular' | 'Slim' | 'Fitted'>('Regular');
  const [primaryColor, setPrimaryColor] = useState('#1A1A1A');
  const [selectedOccasions, setSelectedOccasions] = useState<Occasion[]>(['Casual']);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function process() {
      try {
        setIsProcessing(true);

        // Check if verified inferred attributes were passed from Target Garment Selection flow
        if (params.inferredAttributes) {
          const parsed = JSON.parse(params.inferredAttributes);
          if (parsed.category && parsed.category !== 'unknown') {
            setCategory(parsed.category as GarmentCategory);
          }
          if (parsed.fit && parsed.fit !== 'unknown') {
            setFit(parsed.fit);
          }
          if (parsed.primary_color_hex) {
            setPrimaryColor(parsed.primary_color_hex);
          }
          const materialPrefix = parsed.material && parsed.material !== 'unknown' ? `${parsed.material} ` : '';
          const categoryName = parsed.category && parsed.category !== 'unknown' ? parsed.category : 'Piece';
          setName(`${materialPrefix}${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}`);
          if (parsed.occasions && Array.isArray(parsed.occasions)) {
            setSelectedOccasions(parsed.occasions as Occasion[]);
          }
          return;
        }

        if (params.imageUri) {
          const result = await imageProcessingService.processGarmentImage(
            params.imageUri,
            params.category
          );
          setName(result.name);
          setCategory(result.category);
          setFit(result.fit || 'Regular');
          setPrimaryColor(result.primary_color);
          if (result.suggested_occasions) {
            setSelectedOccasions(result.suggested_occasions);
          }
        }
      } catch (e) {
        console.error('[ConfirmScreen] Image processing error:', e);
      } finally {
        setIsProcessing(false);
      }
    }
    process();
  }, [params.imageUri, params.category, params.inferredAttributes]);

  const toggleOccasion = (occ: Occasion) => {
    if (selectedOccasions.includes(occ)) {
      setSelectedOccasions(selectedOccasions.filter((o) => o !== occ));
    } else {
      setSelectedOccasions([...selectedOccasions, occ]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please provide a name for this garment.');
      return;
    }
    if (!params.imageUri) {
      Alert.alert('Missing Image', 'Garment image could not be resolved.');
      return;
    }

    try {
      setIsSaving(true);
      await addGarment({
        name: name.trim(),
        category,
        original_image: params.imageUri,
        processed_image: params.imageUri,
        primary_color: primaryColor,
        fit,
        occasions: selectedOccasions,
        favorite: false,
        user_verified: true,
      });

      // Telemetry
      await garmentTelemetryService.trackSaveSuccess(!!params.inferredAttributes);

      // Return to Closet tab
      router.replace('/(tabs)/closet');
    } catch (e: any) {
      Alert.alert('Error Saving', e.message || 'Failed to save garment to wardrobe.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isProcessing) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.text} />
        <Typography variant="body" color={colors.text} style={styles.processingText}>
          Analyzing garment attributes...
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Confirm Piece
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Image Preview */}
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: params.imageUri }}
            style={styles.garmentImage}
            resizeMode="contain"
          />
          <View style={styles.statusBadge}>
            <Sparkles size={12} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.statusBadgeText}>
              READY TO INGEST
            </Typography>
          </View>
        </View>

        {/* Attributes Form */}
        <View style={styles.formSection}>
          <Input
            label="Garment Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Classic White Oxford"
          />

          <Typography variant="label" style={styles.fieldLabel}>
            CATEGORY
          </Typography>
          <View style={styles.chipsRow}>
            {GARMENT_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.label}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
                style={styles.chip}
              />
            ))}
          </View>

          <Typography variant="label" style={styles.fieldLabel}>
            SILHOUETTE / FIT
          </Typography>
          <View style={styles.chipsRow}>
            {(['Oversized', 'Relaxed', 'Regular', 'Slim', 'Fitted'] as const).map((f) => (
              <Chip
                key={f}
                label={f}
                selected={fit === f}
                onPress={() => setFit(f)}
                style={styles.chip}
              />
            ))}
          </View>

          <Typography variant="label" style={styles.fieldLabel}>
            OCCASIONS
          </Typography>
          <View style={styles.chipsRow}>
            {OCCASIONS.map((occ) => (
              <Chip
                key={occ}
                label={occ}
                selected={selectedOccasions.includes(occ)}
                onPress={() => toggleOccasion(occ)}
                style={styles.chip}
              />
            ))}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            label="Save to Wardrobe"
            onPress={handleSave}
            loading={isSaving}
            icon={<Check size={18} color={colors.textInverse} />}
            size="lg"
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
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: spacing.md,
    fontWeight: '500',
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
    marginBottom: spacing.lg,
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
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    ...shadows.subtle,
  },
  statusBadgeText: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginBottom: spacing.xxs,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
