import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShareableLookService } from '../../src/services/creator/shareableLookService';
import { ShareableLook } from '../../src/types/creator';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Share2, Sparkles, User, Tag, Eye } from 'lucide-react-native';

export default function PublicLookPage() {
  const router = useRouter();
  const { shareId } = useLocalSearchParams<{ shareId: string }>();

  const [look, setLook] = useState<ShareableLook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!shareId) return;
      try {
        setIsLoading(true);
        const found = await ShareableLookService.getPublicLookByShareId(shareId);
        setLook(found);
      } catch (e) {
        Alert.alert('Notice', 'Look could not be loaded.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [shareId]);

  const handleShare = () => {
    if (!look) return;
    ShareableLookService.shareLookViaNativeSheet(look);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading look...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!look) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="title" style={styles.notFoundTitle}>
            Look Not Found
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.notFoundSub}>
            This look may have been unpublished or removed by the creator.
          </Typography>
          <Button label="Back to AURA" variant="outline" onPress={() => router.replace('/(tabs)' as any)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.creatorHeaderInfo}>
            <Typography variant="title" style={styles.creatorName}>
              {look.creator_display_name}
            </Typography>
            <Typography variant="caption" color={colors.textSecondary}>
              @{look.creator_handle}
            </Typography>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={handleShare} style={styles.shareIconBtn}>
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 1. Final Shot Photo */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: look.final_photo_url }} style={styles.photo} resizeMode="cover" />
          <View style={styles.auraBadge}>
            <Sparkles size={12} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.auraBadgeText}>
              STYLED ON AURA
            </Typography>
          </View>
        </View>

        {/* 2. Look Title & Caption */}
        <GlassSurface style={styles.infoCard}>
          <Typography variant="title" style={styles.lookTitle}>
            {look.title}
          </Typography>
          {look.caption ? (
            <Typography variant="body" color={colors.textSecondary} style={styles.captionText}>
              {look.caption}
            </Typography>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Eye size={13} color={colors.textMuted} />
              <Typography variant="caption" color={colors.textMuted}>
                {look.views_count || 1} Views
              </Typography>
            </View>
            <View style={styles.metaItem}>
              <Tag size={13} color={colors.textMuted} />
              <Typography variant="caption" color={colors.textMuted}>
                {look.tagged_garments.length} Tagged Wardrobe Items
              </Typography>
            </View>
          </View>
        </GlassSurface>

        {/* 3. Tagged Pieces Breakdown */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            PIECES IN THIS LOOK
          </Typography>

          <View style={styles.taggedList}>
            {look.tagged_garments.map((g) => (
              <GlassSurface key={g.garment_id} style={styles.garmentRow}>
                {g.image_url ? (
                  <Image source={{ uri: g.image_url }} style={styles.garmentImage} resizeMode="cover" />
                ) : (
                  <View style={styles.garmentImagePlaceholder}>
                    <Tag size={18} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.garmentDetails}>
                  <Typography variant="caption" color={colors.textMuted} style={styles.garmentCategory}>
                    {g.category}
                  </Typography>
                  <Typography variant="body" style={styles.garmentName}>
                    {g.name}
                  </Typography>
                  {g.fit ? (
                    <Typography variant="caption" color={colors.textSecondary}>
                      Fit: {g.fit}
                    </Typography>
                  ) : null}
                </View>
              </GlassSurface>
            ))}
          </View>
        </View>

        {/* Share Action */}
        <View style={styles.footer}>
          <Button
            label="Share This Look"
            variant="primary"
            onPress={handleShare}
            icon={<Share2 size={16} color={colors.textInverse} />}
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
    paddingHorizontal: spacing.xl,
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
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  creatorHeaderInfo: {
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 16,
  },
  shareIconBtn: {
    padding: spacing.xs,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  photo: {
    width: '100%',
    height: 420,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  auraBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  auraBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  lookTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  captionText: {
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  taggedList: {
    gap: spacing.xs,
  },
  garmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  garmentImage: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  garmentImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentDetails: {
    flex: 1,
  },
  garmentCategory: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  garmentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.xs,
  },
  notFoundTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  notFoundSub: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
