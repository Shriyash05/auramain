import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { MirrorService } from '../../src/services/vto/mirrorService';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Camera, Image as ImageIcon, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react-native';

export default function MirrorCaptureScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select your reference model image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to snap a reference photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  const handleConfirmPhoto = async () => {
    if (!user || !selectedPhoto) return;

    try {
      setIsSaving(true);
      await MirrorService.saveUserModelPhoto(user.id, selectedPhoto);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save reference photo.');
    } finally {
      setIsSaving(false);
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
            Model Reference Photo
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {selectedPhoto ? (
          <View style={styles.previewBox}>
            <Image source={{ uri: selectedPhoto }} style={styles.previewImage} resizeMode="cover" />

            <View style={styles.confirmCard}>
              <Typography variant="title" style={styles.confirmTitle}>
                Looks Great!
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.confirmSub}>
                AURA will use this photo to visualize outfits in the Virtual Try-On Mirror.
              </Typography>
              <Button
                label="Save & Use Reference"
                variant="primary"
                onPress={handleConfirmPhoto}
                loading={isSaving}
              />
              <Button
                label="Choose Different Photo"
                variant="outline"
                onPress={() => setSelectedPhoto(null)}
                style={styles.retakeBtn}
              />
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Guidance Card */}
            <GlassSurface style={styles.guidanceCard}>
              <View style={styles.guidanceHeader}>
                <Sparkles size={16} color={colors.text} />
                <Typography variant="label" style={styles.guidanceTitle}>
                  CAPTURE GUIDANCE
                </Typography>
              </View>
              <View style={styles.bulletList}>
                <View style={styles.bulletRow}>
                  <CheckCircle2 size={15} color={colors.text} />
                  <Typography variant="body" style={styles.bulletText}>
                    Stand facing the camera with good natural lighting.
                  </Typography>
                </View>
                <View style={styles.bulletRow}>
                  <CheckCircle2 size={15} color={colors.text} />
                  <Typography variant="body" style={styles.bulletText}>
                    Keep your upper and lower body clearly in frame.
                  </Typography>
                </View>
                <View style={styles.bulletRow}>
                  <CheckCircle2 size={15} color={colors.text} />
                  <Typography variant="body" style={styles.bulletText}>
                    Wear fitted everyday clothes for optimal garment alignment.
                  </Typography>
                </View>
              </View>
            </GlassSurface>

            {/* Privacy Guarantee */}
            <View style={styles.privacyNote}>
              <ShieldCheck size={16} color={colors.textSecondary} />
              <Typography variant="caption" color={colors.textSecondary}>
                Your reference photo is kept private to your account and never shared.
              </Typography>
            </View>

            {/* Ingestion Buttons */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity activeOpacity={0.85} onPress={handlePickGallery} style={styles.actionCard}>
                <ImageIcon size={26} color={colors.text} />
                <Typography variant="title" style={styles.actionTitle}>
                  Choose from Gallery
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Select full-body photo
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} onPress={handleTakePhoto} style={styles.actionCard}>
                <Camera size={26} color={colors.text} />
                <Typography variant="title" style={styles.actionTitle}>
                  Take a Photo
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Use camera now
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
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  guidanceCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  guidanceTitle: {
    letterSpacing: 0.8,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionsGrid: {
    gap: spacing.md,
  },
  actionCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTitle: {
    fontSize: 16,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  previewBox: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 340,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  confirmSub: {
    marginBottom: spacing.md,
  },
  retakeBtn: {
    marginTop: spacing.sm,
  },
});
