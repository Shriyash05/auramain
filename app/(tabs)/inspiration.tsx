import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { InspirationService } from '../../src/services/inspiration/inspirationService';
import { InspirationItem } from '../../src/types/inspiration';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { Compass, Plus, Sparkles, Wand2, ArrowRight } from 'lucide-react-native';

const CURATED_MOODS = [
  {
    id: 'curated_1',
    title: 'Urban Monochrome',
    vibe: 'Minimalist • Clean Lines',
    formula: 'Heavy cotton tee + wide-leg trousers + low sneakers',
    image: require('../../assets/curated/asset_0.png'),
  },
  {
    id: 'curated_2',
    title: 'Relaxed Layering',
    vibe: 'Streetwear • Contemporary',
    formula: 'Oversized blazer + vintage denim + chunky loafers',
    image: require('../../assets/curated/asset_1.png'),
  },
  {
    id: 'curated_3',
    title: 'Evening Editorial',
    vibe: 'Tailored • Sleek',
    formula: 'Structured wool coat + tailored trousers + leather shoes',
    image: require('../../assets/curated/asset_2.png'),
  },
];

export default function InspirationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedInspirations, setSavedInspirations] = useState<InspirationItem[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const list = await InspirationService.getInspirations(user.id);
      setSavedInspirations(list);
    }
    load();
  }, [user]);

  const handleCuratedTranslate = async (curated: (typeof CURATED_MOODS)[0]) => {
    if (!user) return;
    try {
      // Create user inspiration from curated asset
      const created = await InspirationService.createInspiration(
        user.id,
        Image.resolveAssetSource(curated.image).uri,
        'curated'
      );
      router.push(`/inspiration/${created.id}` as any);
    } catch (e) {
      router.push('/inspiration/add');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Compass size={13} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.badgeText}>
              INSPIRATION STUDIO
            </Typography>
          </View>
          <Typography variant="title" style={styles.title}>
            Inspiration
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Upload any outfit from Pinterest or Instagram. AURA will recreate it using clothes you already own.
          </Typography>
        </View>

        {/* Upload Action Hero Card */}
        <GlassSurface style={styles.uploadHero}>
          <View style={styles.uploadHeroContent}>
            <View style={styles.wandBox}>
              <Wand2 size={24} color={colors.text} />
            </View>
            <View style={styles.uploadHeroText}>
              <Typography variant="title" style={styles.uploadHeroTitle}>
                Translate an Inspiration
              </Typography>
              <Typography variant="caption" color={colors.textSecondary} style={styles.uploadHeroSub}>
                Upload screenshot or photo to find matching pieces in your closet.
              </Typography>
            </View>
          </View>
          <Button
            label="Upload / Snap Outfit"
            variant="primary"
            onPress={() => router.push('/inspiration/add')}
            icon={<Plus size={16} color={colors.textInverse} />}
          />
        </GlassSurface>

        {/* 1. User's Saved Inspirations Library */}
        {savedInspirations.length > 0 && (
          <View style={styles.section}>
            <Typography variant="label" style={styles.sectionHeading}>
              MY SAVED INSPIRATIONS ({savedInspirations.length})
            </Typography>
            <View style={styles.savedGrid}>
              {savedInspirations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/inspiration/${item.id}` as any)}
                  style={styles.savedCard}
                >
                  <Image source={{ uri: item.image_url }} style={styles.savedImage} resizeMode="cover" />
                  <View style={styles.savedInfo}>
                    <Typography variant="caption" color={colors.textMuted} style={styles.savedAesthetic}>
                      {item.aesthetic}
                    </Typography>
                    <Typography variant="body" numberOfLines={1} style={styles.savedTitle}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color={colors.text} style={styles.matchCount}>
                      {item.matched_pieces.filter((m) => m.user_garment).length} pieces matched
                    </Typography>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 2. Curated Moodboards */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            EDITORIAL MOODBOARDS
          </Typography>
          <View style={styles.cardList}>
            {CURATED_MOODS.map((mood) => (
              <View key={mood.id} style={styles.moodCard}>
                <Image source={mood.image} style={styles.moodImage} resizeMode="cover" />
                <View style={styles.moodInfo}>
                  <Typography variant="caption" color={colors.textMuted} style={styles.moodVibe}>
                    {mood.vibe}
                  </Typography>
                  <Typography variant="title" style={styles.moodTitle}>
                    {mood.title}
                  </Typography>
                  <Typography variant="body" style={styles.moodGarments}>
                    Formula: {mood.formula}
                  </Typography>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCuratedTranslate(mood)}
                    style={styles.translateBtn}
                  >
                    <Typography variant="caption" color={colors.text} style={styles.translateBtnText}>
                      Recreate with My Closet →
                    </Typography>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  uploadHero: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },
  uploadHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  wandBox: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadHeroText: {
    flex: 1,
  },
  uploadHeroTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  uploadHeroSub: {
    lineHeight: 16,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  savedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  savedCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  savedInfo: {
    padding: spacing.xs,
  },
  savedAesthetic: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  savedTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 2,
  },
  matchCount: {
    fontWeight: '700',
    fontSize: 10,
  },
  cardList: {
    gap: spacing.md,
  },
  moodCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  moodImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceMuted,
  },
  moodInfo: {
    padding: spacing.md,
  },
  moodVibe: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  moodTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  moodGarments: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  translateBtn: {
    marginTop: 4,
  },
  translateBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
