import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { Outfit } from '../../src/types/outfit';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Bookmark, Trash2, Heart } from 'lucide-react-native';

export default function OutfitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);

  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      const outfits = await DatabaseService.getOutfits(user.id);
      const target = outfits.find((o) => o.id === id);
      if (target) {
        setOutfit(target);
        const allGarments = await DatabaseService.getGarments(user.id);
        const matched = allGarments.filter((g) => target.garment_ids.includes(g.id));
        setGarments(matched);
      }
    }
    load();
  }, [user, id]);

  const handleDelete = () => {
    if (!user || !outfit) return;
    Alert.alert('Delete Outfit', 'Remove this saved outfit from your collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteOutfit(user.id, outfit.id);
          router.back();
        },
      },
    ]);
  };

  if (!outfit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading outfit...
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
            Saved Look
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Look Title */}
        <View style={styles.lookHeader}>
          <Typography variant="label" color={colors.accent}>
            MIX & MATCH OUTFIT
          </Typography>
          <Typography variant="display" style={styles.lookName}>
            {outfit.name}
          </Typography>
          <Typography variant="caption" color={colors.textMuted}>
            Created on {new Date(outfit.created_at).toLocaleDateString()} • {garments.length} Pieces
          </Typography>
        </View>

        {/* Outfit Pieces Grid */}
        <View style={styles.piecesSection}>
          <Typography variant="label" style={styles.piecesHeading}>
            GARMENT BREAKDOWN
          </Typography>
          <View style={styles.piecesList}>
            {garments.map((g) => (
              <GlassSurface key={g.id} style={styles.pieceCard}>
                <Image
                  source={{ uri: g.processed_image || g.original_image }}
                  style={styles.pieceImage}
                  resizeMode="cover"
                />
                <View style={styles.pieceDetails}>
                  <Typography variant="caption" color={colors.accent} style={styles.pieceCategory}>
                    {g.category}
                  </Typography>
                  <Typography variant="body" color={colors.text} style={styles.pieceName}>
                    {g.name}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {g.fit || 'Standard'} • {g.primary_color}
                  </Typography>
                </View>
              </GlassSurface>
            ))}
          </View>
        </View>

        {/* Delete */}
        <View style={styles.footer}>
          <Button
            label="Delete Outfit"
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
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  lookHeader: {
    marginBottom: spacing.xl,
  },
  lookName: {
    color: colors.text,
    marginVertical: 4,
    fontSize: 28,
  },
  piecesSection: {
    marginBottom: spacing.xl,
  },
  piecesHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  piecesList: {
    gap: spacing.sm,
  },
  pieceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.md,
  },
  pieceImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHighlight,
  },
  pieceDetails: {
    flex: 1,
  },
  pieceCategory: {
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  pieceName: {
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
