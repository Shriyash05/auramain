import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { WardrobeGapService } from '../../src/services/intelligence/wardrobeGapService';
import { WardrobeGap } from '../../src/types/intelligence';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Sparkles, Layers, ChevronRight, CheckCircle2 } from 'lucide-react-native';

export default function WardrobeGapsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [gaps, setGaps] = useState<WardrobeGap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setIsLoading(true);
        const list = await WardrobeGapService.detectWardrobeGaps(user.id);
        setGaps(list);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Wardrobe Gaps
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Philosophy Card: Use what you own first */}
        <GlassSurface style={styles.philosophyCard}>
          <View style={styles.philosophyHeader}>
            <Sparkles size={14} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.philosophyBadge}>
              STYLING PHILOSOPHY
            </Typography>
          </View>
          <Typography variant="title" style={styles.philosophyTitle}>
            Maximize What You Own
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.philosophyDesc}>
            AURA recommends gaps only when adding a single high-utility piece unlocks multiple new outfits from your existing wardrobe.
          </Typography>
        </GlassSurface>

        {/* Gaps List */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            IDENTIFIED OPPORTUNITIES ({gaps.length})
          </Typography>

          {gaps.length > 0 ? (
            <View style={styles.gapsList}>
              {gaps.map((gap) => (
                <GlassSurface key={gap.id} style={styles.gapCard}>
                  <View style={styles.gapHeader}>
                    <View style={styles.categoryBadge}>
                      <Typography variant="caption" color={colors.text} style={styles.categoryText}>
                        {gap.category.toUpperCase()}
                      </Typography>
                    </View>
                    <View style={styles.unlockedBadge}>
                      <Typography variant="caption" color={colors.text} style={styles.unlockedText}>
                        +{gap.potentialOutfitsUnlocked} OUTFITS UNLOCKED
                      </Typography>
                    </View>
                  </View>

                  <Typography variant="title" style={styles.gapTitle}>
                    {gap.title}
                  </Typography>
                  <Typography variant="body" color={colors.textSecondary} style={styles.gapDesc}>
                    {gap.description}
                  </Typography>

                  <View style={styles.whyBox}>
                    <Typography variant="body" style={styles.whyText}>
                      💡 {gap.whyThisWorks}
                    </Typography>
                  </View>

                  <Button
                    label="Discover Matching Pieces"
                    variant="primary"
                    onPress={() => router.push(`/gaps/${gap.id}` as any)}
                    style={styles.discoverBtn}
                  />
                </GlassSurface>
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyCard}>
              <CheckCircle2 size={24} color={colors.text} />
              <Typography variant="title" style={styles.emptyTitle}>
                Well-Balanced Wardrobe
              </Typography>
              <Typography variant="body" color={colors.textSecondary} style={styles.emptySub}>
                Your closet has strong versatility across tops, bottoms, and styling essentials.
              </Typography>
            </GlassSurface>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  philosophyCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  philosophyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  philosophyBadge: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  philosophyTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  philosophyDesc: {
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  gapsList: {
    gap: spacing.md,
  },
  gapCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
  },
  unlockedBadge: {
    backgroundColor: colors.surface,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unlockedText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gapTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  gapDesc: {
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  whyBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginVertical: spacing.xs,
  },
  whyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  discoverBtn: {
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptySub: {
    textAlign: 'center',
  },
});
