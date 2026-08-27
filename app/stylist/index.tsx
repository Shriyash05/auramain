import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useStylist } from '../../src/hooks/useStylist';
import { POPULAR_OCCASIONS, MOOD_VIBES } from '../../src/services/stylist/contextService';
import { Typography } from '../../src/components/ui/Typography';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Sparkles, Wand2, Heart, ThumbsDown, Bookmark, SlidersHorizontal } from 'lucide-react-native';

export default function StylistScreen() {
  const router = useRouter();
  const {
    context,
    candidates,
    activeCandidate,
    activeCandidateIndex,
    setActiveCandidateIndex,
    isGenerating,
    isSaving,
    setOccasion,
    setMood,
    saveCandidateOutfit,
    recordFeedback,
  } = useStylist();

  const handleSave = async () => {
    const saved = await saveCandidateOutfit();
    if (saved) {
      Alert.alert('Outfit Saved', `"${saved.name}" has been saved to your collection.`);
    }
  };

  const handleStyleInStudio = () => {
    if (!activeCandidate) return;
    router.push('/(tabs)/create');
  };

  const handleLike = () => {
    recordFeedback('like');
    Alert.alert('Style Noted', 'AURA recorded your positive feedback for this combination.');
  };

  const handleDislike = () => {
    recordFeedback('dislike');
    Alert.alert('Preference Updated', 'AURA will avoid similar combinations.');
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
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <View style={styles.badge}>
              <Sparkles size={12} color={colors.text} />
              <Typography variant="caption" color={colors.text} style={styles.badgeText}>
                AI STYLIST
              </Typography>
            </View>
            <Typography variant="title" style={styles.title}>
              Curated Looks
            </Typography>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* 1. Occasion Selector */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            OCCASION
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {POPULAR_OCCASIONS.map((occ) => (
              <Chip
                key={occ}
                label={occ}
                selected={context.occasion === occ}
                onPress={() => setOccasion(occ)}
                style={styles.chip}
              />
            ))}
          </ScrollView>
        </View>

        {/* 2. Optional Mood / Vibe */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            MOOD & VIBE (OPTIONAL)
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {MOOD_VIBES.map((m) => (
              <Chip
                key={m}
                label={m}
                selected={context.mood === m}
                onPress={() => setMood(m)}
                style={styles.chip}
              />
            ))}
          </ScrollView>
        </View>

        {/* 3. Candidate Selector Tabs (Look 01, Look 02, Look 03) */}
        {candidates.length > 0 && (
          <View style={styles.candidatesBar}>
            {candidates.map((cand, idx) => (
              <TouchableOpacity
                key={cand.id}
                activeOpacity={0.8}
                onPress={() => setActiveCandidateIndex(idx)}
                style={[
                  styles.candidateTab,
                  activeCandidateIndex === idx ? styles.candidateTabActive : undefined,
                ]}
              >
                <Typography
                  variant="caption"
                  color={activeCandidateIndex === idx ? colors.textInverse : colors.textSecondary}
                  style={styles.candidateTabText}
                >
                  {`LOOK 0${idx + 1}`}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 4. Active Recommended Outfit Card */}
        {isGenerating ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.text} />
            <Typography variant="body" color={colors.textSecondary} style={styles.loadingText}>
              Composing looks from your wardrobe...
            </Typography>
          </View>
        ) : activeCandidate ? (
          <View style={styles.recommendationContainer}>
            <GlassSurface style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View>
                  <Typography variant="caption" color={colors.textMuted} style={styles.archetypeLabel}>
                    {activeCandidate.archetypeLabel}
                  </Typography>
                  <Typography variant="title" style={styles.lookTitle}>
                    {activeCandidate.name}
                  </Typography>
                </View>

                <View style={styles.feedbackIcons}>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleDislike} style={styles.iconBtn}>
                    <ThumbsDown size={15} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleLike} style={styles.iconBtn}>
                    <Heart size={15} color={colors.like} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Garments Visual Stack */}
              <View style={styles.garmentsStack}>
                {Object.entries(activeCandidate.garments)
                  .filter(([_, g]) => Boolean(g))
                  .map(([slot, g]) => (
                    <View key={slot} style={styles.garmentRow}>
                      <Image
                        source={{ uri: (g as any).processed_image || (g as any).original_image }}
                        style={styles.garmentThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.garmentDetails}>
                        <Typography variant="caption" color={colors.textMuted} style={styles.slotLabel}>
                          {slot.toUpperCase()}
                        </Typography>
                        <Typography variant="body" color={colors.text} style={styles.garmentName}>
                          {(g as any).name}
                        </Typography>
                        <Typography variant="caption" color={colors.textSecondary}>
                          {(g as any).fit || 'Standard'} • {(g as any).primary_color}
                        </Typography>
                      </View>
                    </View>
                  ))}
              </View>

              {/* Why This Works Rationale */}
              <View style={styles.rationaleBox}>
                <Typography variant="label" style={styles.rationaleTitle}>
                  WHY THIS WORKS
                </Typography>
                <Typography variant="body" style={styles.rationaleText}>
                  {activeCandidate.rationale}
                </Typography>
              </View>

              {/* Actions */}
              <View style={styles.cardActionsCol}>
                <Button
                  label="Virtual Try-On Look"
                  variant="primary"
                  onPress={() => router.push('/mirror')}
                  icon={<Sparkles size={16} color={colors.textInverse} />}
                  style={styles.fullActionBtn}
                />
                <View style={styles.cardActions}>
                  <Button
                    label="Style in Studio"
                    variant="secondary"
                    onPress={handleStyleInStudio}
                    icon={<SlidersHorizontal size={16} color={colors.text} />}
                    style={styles.actionBtn}
                  />
                  <Button
                    label="Save Look"
                    variant="outline"
                    onPress={handleSave}
                    loading={isSaving}
                    icon={<Bookmark size={16} color={colors.text} />}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            </GlassSurface>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Typography variant="title" style={styles.emptyTitle}>
              Add more garments to your closet
            </Typography>
            <Typography variant="body" style={styles.emptySubtitle}>
              AURA needs at least a top and a bottom in your wardrobe to compose personalized looks.
            </Typography>
            <Button label="Add Clothing" onPress={() => router.push('/garment/add')} />
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
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  chipsRow: {
    gap: spacing.xs,
  },
  chip: {
    marginRight: spacing.xxs,
  },
  candidatesBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidateTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radii.pill,
  },
  candidateTabActive: {
    backgroundColor: colors.text,
  },
  candidateTabText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
  },
  recommendationContainer: {
    marginTop: spacing.xs,
  },
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  archetypeLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lookTitle: {
    fontSize: 22,
    color: colors.text,
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
  garmentsStack: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  garmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.xs + 2,
    gap: spacing.md,
  },
  garmentThumb: {
    width: 54,
    height: 54,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  garmentDetails: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  garmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rationaleBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.md,
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
  cardActionsCol: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  fullActionBtn: {
    width: '100%',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
