import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMixMatch } from '../../src/hooks/useMixMatch';
import { GarmentCategory, CATEGORY_LABELS } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { LookFlatLay } from '../../src/components/mixmatch/LookFlatLay';
import { PieceSwapModal } from '../../src/components/mixmatch/PieceSwapModal';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  Sparkles,
  Bookmark,
  Heart,
  ThumbsDown,
  Sun,
  Moon,
  Plus,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react-native';

export default function CreateScreen() {
  const router = useRouter();
  const {
    selectedSlots,
    swapGarment,
    removeCategorySlot,
    saveCurrentOutfit,
    recordFeedback,
    isSaving,
    isGenerating,
    context,
    candidates,
    activeCandidate,
    activeCandidateIndex,
    setActiveCandidateIndex,
    evaluation,
    wardrobeSufficiency,
    categorizedGarments,
  } = useMixMatch();

  // Swap modal state
  const [swapCategory, setSwapCategory] = useState<GarmentCategory | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const isNight = context.timeOfDay === 'evening' || context.timeOfDay === 'night';

  const handleSave = async () => {
    const saved = await saveCurrentOutfit();
    if (saved) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      Alert.alert('Look Saved', `"${saved.name}" has been saved to your wardrobe collection.`);
    } else {
      Alert.alert('Unable to Save', 'Please ensure you have selected a top, bottom, and shoes.');
    }
  };

  const handleLike = () => {
    recordFeedback('like');
    Alert.alert('Style Noted', 'AURA recorded your positive feedback for this styling combination.');
  };

  const handleDislike = () => {
    recordFeedback('dislike');
    Alert.alert('Preference Updated', 'AURA will avoid similar combinations.');
  };

  const handleOpenSwap = (category: GarmentCategory) => {
    setSwapCategory(category);
  };

  const handleCloseSwap = () => {
    setSwapCategory(null);
  };

  // 1. Loading State (Honest & concise)
  if (isGenerating) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Typography variant="title" style={styles.loadingTitle}>
            Building your look...
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.loadingSubtitle}>
            Checking your wardrobe, proportions & occasion.
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Insufficient Wardrobe State
  if (!wardrobeSufficiency.isSufficient) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <SlidersHorizontal size={24} color={colors.text} />
          </View>
          <Typography variant="title" style={styles.emptyTitle}>
            Personal Wardrobe Required
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
            {wardrobeSufficiency.guidanceMessage ||
              'Add clothes to your closet so AURA can compose personalized editorial looks.'}
          </Typography>
          <Button
            label="Add Clothing Item"
            variant="primary"
            onPress={() => router.push('/garment/add')}
            icon={<Plus size={16} color={colors.textInverse} />}
            style={styles.emptyActionBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 1. Header & Context Indicator */}
        <View style={styles.header}>
          <View>
            <View style={styles.contextBadge}>
              {isNight ? (
                <Moon size={12} color={colors.text} />
              ) : (
                <Sun size={12} color={colors.warning} />
              )}
              <Typography variant="caption" color={colors.textSecondary} style={styles.contextText}>
                {context.weather ? `${context.weather.tempF}°F • ` : ''}
                {context.occasion} Context
              </Typography>
            </View>
            <Typography variant="hero" style={styles.title}>
              Mix & Match
            </Typography>
          </View>

          {/* Feedback buttons */}
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleDislike}
              style={styles.feedbackIconBtn}
            >
              <ThumbsDown size={15} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleLike}
              style={styles.feedbackIconBtn}
            >
              <Heart size={15} color={colors.like} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Cohesive Candidate Switcher Pills (LOOK 01, LOOK 02, LOOK 03) */}
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

        {/* 3. Editorial Look Header & Archetype */}
        <View style={styles.lookMetaHeader}>
          <View style={styles.archetypeBadge}>
            <Sparkles size={11} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.archetypeBadgeText}>
              {(activeCandidate?.archetypeLabel || 'CURATED SIGNATURE').toUpperCase()}
            </Typography>
          </View>
          <Typography variant="title" style={styles.lookTitle}>
            {activeCandidate?.name || 'Personalized Look'}
          </Typography>
        </View>

        {/* 4. Complete Look Flat-Lay (User Wardrobe Centered) */}
        <View style={styles.flatLaySection}>
          <LookFlatLay
            slots={selectedSlots}
            onSwapPress={handleOpenSwap}
            onRemovePress={removeCategorySlot}
            onAddPress={handleOpenSwap}
          />
        </View>

        {/* 5. Qualitative "WHY THIS WORKS" Styling Rationale */}
        <View style={styles.rationaleBox}>
          <View style={styles.rationaleHeaderRow}>
            <Typography variant="label" style={styles.rationaleTitle}>
              WHY THIS WORKS
            </Typography>
            {/* Attribute highlights tags */}
            <View style={styles.highlightTagsRow}>
              {evaluation.highlights.slice(0, 2).map((h, i) => (
                <View key={i} style={styles.tagBadge}>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.tagText}>
                    {h}
                  </Typography>
                </View>
              ))}
            </View>
          </View>
          <Typography variant="body" style={styles.rationaleText}>
            {evaluation.rationale}
          </Typography>
        </View>

        {/* 6. Primary & Secondary Action CTAs */}
        <View style={styles.actionSection}>
          <Button
            label={savedSuccess ? 'Saved to Wardrobe' : 'Save Look'}
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            icon={<Bookmark size={17} color={colors.textInverse} />}
            size="lg"
            style={styles.primaryActionBtn}
          />
          <Button
            label="Virtual Try-On"
            variant="secondary"
            onPress={() => router.push('/mirror')}
            icon={<Sparkles size={17} color={colors.text} />}
            size="lg"
            style={styles.secondaryActionBtn}
          />
        </View>
      </ScrollView>

      {/* Piece Swap Modal / Sheet */}
      {swapCategory && (
        <PieceSwapModal
          visible={Boolean(swapCategory)}
          category={swapCategory}
          categoryLabel={CATEGORY_LABELS[swapCategory]}
          availableGarments={categorizedGarments[swapCategory] || []}
          selectedGarment={
            swapCategory === 'tops'
              ? selectedSlots.tops
              : swapCategory === 'bottoms'
              ? selectedSlots.bottoms
              : swapCategory === 'shoes'
              ? selectedSlots.shoes
              : swapCategory === 'outerwear'
              ? selectedSlots.outerwear
              : selectedSlots.accessories
          }
          onSelectGarment={(garment) => swapGarment(swapCategory, garment)}
          onClose={handleCloseSwap}
          onAddNew={() => router.push('/garment/add')}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingTitle: {
    fontSize: 20,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  loadingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: spacing.xs,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyActionBtn: {
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.6,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: 4,
  },
  feedbackIconBtn: {
    backgroundColor: colors.surface,
    padding: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  candidateSelectorRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    marginBottom: spacing.lg,
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
    letterSpacing: 0.6,
  },
  lookMetaHeader: {
    marginBottom: spacing.md,
  },
  archetypeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  archetypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  lookTitle: {
    fontSize: 22,
    color: colors.text,
  },
  flatLaySection: {
    marginBottom: spacing.lg,
  },
  rationaleBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  rationaleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rationaleTitle: {
    fontSize: 10,
    color: colors.text,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  highlightTagsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tagBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  rationaleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  actionSection: {
    gap: spacing.sm,
  },
  primaryActionBtn: {
    width: '100%',
  },
  secondaryActionBtn: {
    width: '100%',
  },
});
