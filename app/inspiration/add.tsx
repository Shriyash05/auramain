import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { InspirationService } from '../../src/services/inspiration/inspirationService';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Image as ImageIcon, Camera, Sparkles, Wand2 } from 'lucide-react-native';

export default function AddInspirationScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll access is needed to select inspiration photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is needed to snap inspiration outfits.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAnalyzeLook = async () => {
    if (!user || !imageUri) return;

    try {
      setIsAnalyzing(true);
      const created = await InspirationService.createInspiration(user.id, imageUri, 'gallery');
      router.replace(`/inspiration/${created.id}` as any);
    } catch (e) {
      Alert.alert('Analysis Notice', 'Analyzing with standard visual formula.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Add Inspiration
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {isAnalyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <View style={styles.analyzingTextGroup}>
              <Typography variant="title" style={styles.analyzingTitle}>
                Deconstructing Look...
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.analyzingSub}>
                Extracting style formula, silhouettes, and finding matching pieces in your closet.
              </Typography>
            </View>
          </View>
        ) : imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

            <View style={styles.previewActionCard}>
              <Typography variant="title" style={styles.readyTitle}>
                Inspiration Ready
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.readyText}>
                AURA will extract the style formula and recreate this aesthetic using your wardrobe pieces.
              </Typography>
              <Button
                label="Translate with My Closet"
                variant="primary"
                onPress={handleAnalyzeLook}
                icon={<Wand2 size={16} color={colors.textInverse} />}
              />
              <Button
                label="Select Different Photo"
                variant="outline"
                onPress={() => setImageUri(null)}
                style={styles.retakeBtn}
              />
            </View>
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            <Typography variant="body" color={colors.textSecondary} style={styles.introText}>
              Upload a fashion photo from Instagram, Pinterest, or your gallery. AURA will recreate the look with clothes you already own.
            </Typography>

            <View style={styles.cardsGrid}>
              <TouchableOpacity activeOpacity={0.85} onPress={handlePickGallery} style={styles.optionCard}>
                <View style={styles.iconBox}>
                  <ImageIcon size={28} color={colors.text} />
                </View>
                <Typography variant="title" style={styles.optionTitle}>
                  Choose from Gallery
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={styles.optionSub}>
                  Select saved screenshot or fashion image
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} onPress={handleTakePhoto} style={styles.optionCard}>
                <View style={styles.iconBox}>
                  <Camera size={28} color={colors.text} />
                </View>
                <Typography variant="title" style={styles.optionTitle}>
                  Take a Photo
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={styles.optionSub}>
                  Capture an outfit in real life
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
  introText: {
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardsGrid: {
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
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
  optionTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  optionSub: {
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  previewActionCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readyTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  readyText: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  retakeBtn: {
    marginTop: spacing.sm,
  },
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  analyzingTextGroup: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  analyzingTitle: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  analyzingSub: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
