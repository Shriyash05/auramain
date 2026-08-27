import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { StyleIntelligenceService } from '../../src/services/intelligence/styleIntelligenceService';
import { TrendIntelligenceService, PersonalizedTrend } from '../../src/services/intelligence/trendIntelligenceService';
import { StyleEvolution } from '../../src/types/intelligence';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Sparkles, TrendingUp, Compass, Palette, CheckCircle2, ChevronRight } from 'lucide-react-native';

export default function StyleInsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [evolution, setEvolution] = useState<StyleEvolution | null>(null);
  const [trends, setTrends] = useState<PersonalizedTrend[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const evo = await StyleIntelligenceService.getStyleEvolution(user.id);
      setEvolution(evo);
      const tr = await TrendIntelligenceService.getPersonalizedTrends(user.id);
      setTrends(tr);
    }
    load();
  }, [user]);

  if (!evolution) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Analyzing personal fashion intelligence...
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
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Style Insights
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* 1. Style Evolution Hero Card */}
        <GlassSurface style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <Sparkles size={14} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.heroBadgeText}>
              PERSONAL FASHION INTELLIGENCE
            </Typography>
          </View>
          <Typography variant="title" style={styles.heroTitle}>
            Behavioral Style Evolution
          </Typography>
          <View style={styles.shiftsList}>
            {evolution.observedShifts.map((shift, idx) => (
              <View key={idx} style={styles.shiftRow}>
                <CheckCircle2 size={15} color={colors.text} />
                <Typography variant="body" style={styles.shiftText}>
                  {shift}
                </Typography>
              </View>
            ))}
          </View>
        </GlassSurface>

        {/* 2. Dominant Silhouettes & Colors */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            DOMINANT SILHOUETTES & PALETTES
          </Typography>
          <View style={styles.statsGrid}>
            <GlassSurface style={styles.statBox}>
              <Typography variant="caption" color={colors.textMuted} style={styles.statLabel}>
                TOP SILHOUETTES
              </Typography>
              {evolution.dominantSilhouettes.map((sil, i) => (
                <Typography key={i} variant="body" style={styles.statVal}>
                  • {sil}
                </Typography>
              ))}
            </GlassSurface>

            <GlassSurface style={styles.statBox}>
              <Typography variant="caption" color={colors.textMuted} style={styles.statLabel}>
                COLOR FREQUENCY
              </Typography>
              <View style={styles.colorPillsRow}>
                {evolution.topColors.map((col, i) => (
                  <View key={i} style={[styles.colorDot, { backgroundColor: col }]} />
                ))}
              </View>
              <Typography variant="caption" color={colors.textSecondary} style={styles.colorText}>
                Neutral & Contemporary
              </Typography>
            </GlassSurface>
          </View>
        </View>

        {/* 3. Wardrobe Gaps Quick Access Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/gaps' as any)}
          style={styles.gapBanner}
        >
          <View style={styles.gapBannerLeft}>
            <Compass size={22} color={colors.text} />
            <View>
              <Typography variant="title" style={styles.gapBannerTitle}>
                Wardrobe Gaps & Opportunities
              </Typography>
              <Typography variant="caption" color={colors.textSecondary}>
                See which high-utility pieces unlock new outfits
              </Typography>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 4. Personalized Fashion Trends */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            TREND INTELLIGENCE FOR YOUR CLOSET
          </Typography>

          <View style={styles.trendsList}>
            {trends.map((t) => (
              <GlassSurface key={t.trendId} style={styles.trendCard}>
                <View style={styles.trendHeader}>
                  <Typography variant="title" style={styles.trendName}>
                    {t.name}
                  </Typography>
                  {t.isReadyInCloset && (
                    <View style={styles.readyBadge}>
                      <Typography variant="caption" color={colors.text} style={styles.readyText}>
                        READY IN CLOSET
                      </Typography>
                    </View>
                  )}
                </View>
                <Typography variant="caption" color={colors.textMuted} style={styles.trendCategory}>
                  {t.category} • {t.description}
                </Typography>
                <Typography variant="body" style={styles.stylingTip}>
                  💡 {t.stylingTip}
                </Typography>
              </GlassSurface>
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
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroBadgeText: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    marginVertical: 4,
  },
  shiftsList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shiftText: {
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '500',
    marginVertical: 1,
  },
  colorPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorText: {
    fontSize: 11,
    marginTop: 2,
  },
  gapBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadows.subtle,
  },
  gapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gapBannerTitle: {
    fontSize: 15,
  },
  trendsList: {
    gap: spacing.sm,
  },
  trendCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  trendName: {
    fontSize: 16,
  },
  readyBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readyText: {
    fontSize: 8,
    fontWeight: '700',
  },
  trendCategory: {
    marginBottom: spacing.xs,
  },
  stylingTip: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
