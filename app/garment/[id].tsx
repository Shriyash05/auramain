import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Heart, Trash2, Sparkles, Wand2 } from 'lucide-react-native';

export default function GarmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [garment, setGarment] = useState<Garment | null>(null);

  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      const all = await DatabaseService.getGarments(user.id);
      const found = all.find((g) => g.id === id);
      if (found) setGarment(found);
    }
    load();
  }, [user, id]);

  const handleToggleFavorite = async () => {
    if (!user || !garment) return;
    const updated = await DatabaseService.updateGarment(user.id, garment.id, {
      favorite: !garment.favorite,
    });
    setGarment(updated);
  };

  const handleDelete = () => {
    if (!user || !garment) return;
    Alert.alert('Remove Garment', 'Are you sure you want to remove this piece from your wardrobe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteGarment(user.id, garment.id);
          router.back();
        },
      },
    ]);
  };

  if (!garment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading garment details...
          </Typography>
        </View>
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
            Garment Detail
          </Typography>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleToggleFavorite}
            style={styles.favoriteButton}
          >
            <Heart
              size={20}
              color={garment.favorite ? colors.like : colors.text}
              fill={garment.favorite ? colors.like : 'none'}
            />
          </TouchableOpacity>
        </View>

        {/* Large Garment Hero Image */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: garment.processed_image || garment.original_image }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Garment Title & Category */}
        <View style={styles.infoSection}>
          <Typography variant="label" color={colors.textMuted}>
            {garment.category}
          </Typography>
          <Typography variant="display" style={styles.garmentTitle}>
            {garment.name}
          </Typography>
          <Typography variant="body" color={colors.textSecondary}>
            Added on {new Date(garment.created_at).toLocaleDateString()}
          </Typography>
        </View>

        {/* Primary Action Buttons: Try It On & Style in Studio */}
        <View style={styles.actionRow}>
          <Button
            label="Try It On"
            variant="primary"
            onPress={() => router.push({
              pathname: '/tryon',
              params: {
                garmentId: garment.id,
                garmentName: garment.name,
                garmentCategory: garment.category,
                garmentImage: garment.processed_image || garment.original_image,
                source: 'closet',
              },
            } as any)}
            icon={<Sparkles size={16} color={colors.textInverse} />}
            size="lg"
            style={styles.tryOnButton}
          />
          <Button
            label="Style in Studio"
            variant="secondary"
            onPress={() => router.push('/(tabs)/create')}
            icon={<Wand2 size={16} color={colors.text} />}
            size="lg"
            style={styles.studioButton}
          />
        </View>

        {/* Metadata Badges */}
        <View style={styles.metadataSection}>
          <Typography variant="label" style={styles.metaHeading}>
            ATTRIBUTES
          </Typography>
          <View style={styles.chipsRow}>
            {garment.fit && <Chip label={`Fit: ${garment.fit}`} selected />}
            {garment.primary_color && <Chip label={`Color: ${garment.primary_color}`} />}
            {garment.occasions?.map((occ) => (
              <Chip key={occ} label={occ} />
            ))}
          </View>
        </View>

        {/* Delete Action */}
        <View style={styles.footer}>
          <Button
            label="Delete Garment"
            variant="outline"
            onPress={handleDelete}
            icon={<Trash2 size={16} color={colors.error} />}
            textStyle={{ color: colors.error }}
            size="md"
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  favoriteButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  imageCard: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    marginBottom: spacing.xl,
  },
  garmentTitle: {
    color: colors.text,
    marginVertical: 4,
    fontSize: 28,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  tryOnButton: {
    flex: 1.2,
  },
  studioButton: {
    flex: 1,
  },
  metadataSection: {
    marginBottom: spacing.xxl,
  },
  metaHeading: {
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
  footer: {
    marginTop: spacing.lg,
  },
});
