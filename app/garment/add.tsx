import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { GARMENT_CATEGORIES, GarmentCategory } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';

export default function AddGarmentScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory>('tops');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

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

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handlePickGallery = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleProceedToConfirmation = () => {
    if (!selectedImageUri) {
      Alert.alert('Image Required', 'Please take a photo or select an image from your gallery.');
      return;
    }

    router.push({
      pathname: '/garment/confirm',
      params: {
        imageUri: selectedImageUri,
        category: selectedCategory,
      },
    });
  };

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
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Add Clothing
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Step 1: Category */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            1. SELECT CATEGORY
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

        {/* Step 2: Photo Capture or Preview */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            2. CAPTURE OR UPLOAD GARMENT
          </Typography>

          {selectedImageUri ? (
            <View style={styles.previewCard}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedImageUri(null)}
                style={styles.removeImageBtn}
              >
                <X size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleTakePhoto}
                style={styles.uploadOptionCard}
              >
                <View style={styles.iconCircle}>
                  <Camera size={24} color={colors.text} />
                </View>
                <Typography variant="body" color={colors.text} style={styles.optionTitle}>
                  Take Photo
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Use camera with good lighting
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickGallery}
                style={styles.uploadOptionCard}
              >
                <View style={styles.iconCircle}>
                  <ImageIcon size={24} color={colors.text} />
                </View>
                <Typography variant="body" color={colors.text} style={styles.optionTitle}>
                  Choose from Gallery
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Select high-res image
                </Typography>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Proceed Button */}
        {selectedImageUri && (
          <View style={styles.footer}>
            <Button
              label="Process & Review Garment"
              onPress={handleProceedToConfirmation}
              size="lg"
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
  previewCard: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: spacing.xs,
    borderRadius: radii.pill,
  },
  footer: {
    marginTop: spacing.md,
  },
});
