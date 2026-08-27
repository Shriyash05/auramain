import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useGarments } from '../../src/hooks/useGarments';
import { useStylist } from '../../src/hooks/useStylist';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, radii, spacing, shadows } from '../../src/constants/theme';
import { Sparkles, Plus, Wand2, Sun, Moon, Heart, ThumbsDown, Bookmark, ArrowRight } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { garments } = useGarments('all');
  const {
    context,
    candidates,
    activeCandidate,
    activeCandidateIndex,
    setActiveCandidateIndex,
    isGenerating,
    saveCandidateOutfit,
    recordFeedback,
  } = useStylist();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const isNight = context.timeOfDay === 'evening' || context.timeOfDay === 'night';

  const handleSave = async () => {
    const saved = await saveCandidateOutfit();
    if (saved) {
      Alert.alert('Outfit Saved', `"${saved.name}" has been saved to your collection.`);
    }
  };

  const handleLike = () => {
    recordFeedback('like');
    Alert.alert('Style Preference Noted', 'AURA will recommend similar combinations.');
  };

  const handleDislike = () => {
    recordFeedback('dislike');
    Alert.alert('Preference Updated', 'AURA will avoid similar combinations.');
  };

  // Find unworn garments
  const unwornGarments = garments.filter((g) => !g.favorite);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 1. Contextual Header */}
        <View style={styles.header}>
          <View style={styles.contextBadge}>
            {isNight ? <Moon size={13} color={colors.text} /> : <Sun size={13} color={colors.warning} />}
            <Typography variant="caption" color={colors.textSecondary}>
              68°F • {context.occasion} Context
            </Typography>
          </View>
          <Typography variant="hero" style={styles.greetingTitle}>
            {greeting()}, {user?.display_name?.split(' ')[0] || 'there'}.
          </Typography>
          <Typography variant="body" style={styles.greetingSubtitle}>
            {isNight ? "Here's what I'd wear for tonight." : "Here's what I'd wear for today's schedule."}
          </Typography>
        </View>

        {/* 2. Candidate Switcher Pills (Look 01, Look 02, Look 03) */}
        {candidates.length > 1 && (
          <View style={styles.candidateSelectorRow}>
            {candidates.map((cand, idx) => (
              <TouchableOpacity
                key={cand.id}
                activeOpacity={0.8}
                onPress={() => setActiveCandidateIndex(idx)}
                style={[
                  styles.candidatePill,
                  activeCandidateIndex === idx ? styles.candidatePillActive : undefined,
                ]}
              >
                <Typography
                  variant="caption"
                  color={activeCandidateIndex === idx ? colors.textInverse : colors.textSecondary}
                  style={styles.candidatePillText}
                >
                  {`LOOK 0${idx + 1}`}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 3. Hero Recommendation Card */}
        <View style={styles.heroSection}>
          {activeCandidate ? (
            <GlassSurface style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Sparkles size={12} color={colors.text} />
                  <Typography variant="caption" color={colors.text} style={styles.heroBadgeText}>
                    {activeCandidate.archetypeLabel.toUpperCase()}
                  </Typography>
                </View>

                <View style={styles.feedbackIcons}>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleDislike} style={styles.iconBtn}>
                    <ThumbsDown size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleLike} style={styles.iconBtn}>
                    <Heart size={14} color={colors.like} />
                  </TouchableOpacity>
                </View>
              </View>

              <Typography variant="title" style={styles.heroTitle}>
                {activeCandidate.name}
              </Typography>

              {/* Garment Image Previews */}
              <View style={styles.garmentsPreviewRow}>
                {Object.entries(activeCandidate.garments)
                  .filter(([_, g]) => Boolean(g))
                  .map(([slot, g]) => (
                    <View key={slot} style={styles.previewThumbContainer}>
                      <Image
                        source={{ uri: (g as any).processed_image || (g as any).original_image }}
                        style={styles.previewThumb}
                        resizeMode="cover"
                      />
                      <Typography variant="caption" style={styles.thumbLabel} numberOfLines={1}>
                        {(g as any).category}
                      </Typography>
                    </View>
                  ))}
              </View>

              {/* Concise "Why This Works" Rationale */}
              <View style={styles.rationaleBox}>
                <Typography variant="label" style={styles.rationaleTitle}>
                  WHY THIS WORKS
                </Typography>
                <Typography variant="body" style={styles.rationaleText}>
                  {activeCandidate.rationale}
                </Typography>
              </View>

              {/* Action Buttons */}
              <View style={styles.heroActionButtons}>
                <Button
                  label="Style in Studio"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/create')}
                  style={styles.heroActionBtn}
                />
                <Button
                  label="Save Look"
                  variant="primary"
                  onPress={handleSave}
                  icon={<Bookmark size={15} color={colors.textInverse} />}
                  style={styles.heroActionBtn}
                />
              </View>
            </GlassSurface>
          ) : (
            <GlassSurface style={styles.heroCard}>
              <View style={styles.emptyHero}>
                <Typography variant="title" style={styles.emptyTitle}>
                  No garments yet
                </Typography>
                <Typography variant="body" style={styles.emptyText}>
                  Add clothes to your closet so AURA can compose daily outfits.
                </Typography>
                <Button
                  label="Add Clothing Item"
                  onPress={() => router.push('/garment/add')}
                  icon={<Plus size={16} color={colors.textInverse} />}
                />
              </View>
            </GlassSurface>
          )}
        </View>

        {/* 4. Unworn Wardrobe Intelligence */}
        {unwornGarments.length > 0 && (
          <View style={styles.section}>
            <GlassSurface style={styles.intelligenceCard}>
              <View style={styles.intelHeader}>
                <Sparkles size={16} color={colors.text} />
                <Typography variant="label" style={styles.intelTitle}>
                  WARDROBE UTILIZATION
                </Typography>
              </View>
              <Typography variant="body" style={styles.intelText}>
                You have {unwornGarments.length} pieces in your closet ready for fresh styling combinations.
              </Typography>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => router.push('/stylist')}
                style={styles.intelLink}
              >
                <Typography variant="caption" color={colors.text} style={styles.intelLinkText}>
                  Explore curated looks with unworn items →
                </Typography>
              </TouchableOpacity>
            </GlassSurface>
          </View>
        )}

        {/* 5. Quick Actions */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            STUDIO WORKSPACE
          </Typography>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/stylist')}
              style={styles.actionCard}
            >
              <View style={styles.actionIconContainer}>
                <Wand2 size={20} color={colors.text} />
              </View>
              <Typography variant="title" style={styles.actionTitle}>
                AI Stylist
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Occasion & mood studio
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/create')}
              style={styles.actionCard}
            >
              <View style={styles.actionIconContainer}>
                <Sparkles size={20} color={colors.text} />
              </View>
              <Typography variant="title" style={styles.actionTitle}>
                Mix & Match
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Active piece canvas
              </Typography>
            </TouchableOpacity>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  greetingTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 34,
  },
  greetingSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  candidateSelectorRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidatePill: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  candidatePillActive: {
    backgroundColor: colors.text,
  },
  candidatePillText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroSection: {
    marginBottom: spacing.xl,
  },
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroBadgeText: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  feedbackIcons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconBtn: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.md,
  },
  garmentsPreviewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewThumbContainer: {
    flex: 1,
    alignItems: 'center',
  },
  previewThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  thumbLabel: {
    marginTop: 4,
    textTransform: 'capitalize',
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
  },
  rationaleBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.text,
  },
  rationaleTitle: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  rationaleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  heroActionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroActionBtn: {
    flex: 1,
  },
  emptyHero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  intelligenceCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  intelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  intelTitle: {
    letterSpacing: 0.8,
  },
  intelText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  intelLink: {
    marginTop: 4,
  },
  intelLinkText: {
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  actionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
});
