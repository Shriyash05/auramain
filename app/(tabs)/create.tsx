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
import { GarmentCategory } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { EditorialOutfitCanvas } from '../../src/components/mixmatch/EditorialOutfitCanvas';
import { WardrobeSwapSheet } from '../../src/components/mixmatch/WardrobeSwapSheet';
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
  RefreshCw,
} from 'lucide-react-native';

export default function CreateScreen() {
  const router = useRouter();
  const {
    selectedSlots,
    swapGarment,
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
  const [isSwapSheetOpen, setIsSwapSheetOpen] = useState(false);
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

  const handleOpenSwap = (category?: GarmentCategory) => {
    setSwapCategory(category || 'tops');
    setIsSwapSheetOpen(true);
  };

  const handleCloseSwap = () => {
    setIsSwapSheetOpen(false);
    setSwapCategory(null);
  };

  // 1. Loading State (Honest & concise)
  if (isGenerating) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Typography variant="title" style={styles.loadingTitle}>
            AURA is styling your look...
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.loadingSubtitle}>
            Composing a complete outfit from your personal wardrobe.
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
            Wardrobe Items Required
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
            {wardrobeSufficiency.guidanceMessage ||
              'Add clothes to your closet so AURA can compose complete personalized looks.'}
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

  const lookNumber = `LOOK 0${activeCandidateIndex + 1}`;
  const lookArchetype = (activeCandidate?.archetypeLabel || 'Signature Look').toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 1. Header & Context */}
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.feedbackIconBtn}
              accessibilityLabel="Dislike styling combination"
            >
              <ThumbsDown size={15} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleLike}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.feedbackIconBtn}
              accessibilityLabel="Like styling combination"
            >
              <Heart size={15} color={colors.like} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Look Header: LOOK 01 • ARCHETYPE */}
        <View style={styles.lookTitleSection}>
          <Typography variant="label" style={styles.lookNumberLabel}>
            {lookNumber} • {lookArchetype}
          </Typography>
          <Typography variant="title" style={styles.lookName}>
            {activeCandidate?.name || 'Curated Outfit'}
          </Typography>
        </View>

        {/* 3. Hero Centerpiece: Complete Editorial Flat-Lay */}
        <View style={styles.heroOutfitSection}>
          <EditorialOutfitCanvas
            slots={selectedSlots}
            onPiecePress={(category) => handleOpenSwap(category)}
            onEmptySlotPress={(category) => handleOpenSwap(category)}
          />
        </View>

        {/* 4. Qualitative "WHY THIS WORKS" Rationale */}
        <View style={styles.rationaleBox}>
          <View style={styles.rationaleHeaderRow}>
            <Typography variant="label" style={styles.rationaleTitle}>
              WHY THIS WORKS
            </Typography>
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

        {/* 5. Primary Action Pair: [Swap a piece] & [Save Look] */}
        <View style={styles.actionSection}>
          <Button
            label="Swap a piece"
            variant="outline"
            onPress={() => handleOpenSwap()}
            icon={<RefreshCw size={16} color={colors.text} />}
            size="lg"
            style={styles.swapActionBtn}
          />
          <Button
            label={savedSuccess ? 'Saved to Wardrobe' : 'Save Look'}
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            icon={<Bookmark size={16} color={colors.textInverse} />}
            size="lg"
            style={styles.primaryActionBtn}
          />
        </View>

        {/* 6. Try Another Look (Alternative Complete Looks) */}
        {candidates.length > 1 && (
          <View style={styles.alternativeLooksSection}>
            <Typography variant="label" style={styles.alternativeSectionTitle}>
              TRY ANOTHER LOOK
            </Typography>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alternateLooksRow}
            >
              {candidates.map((cand, idx) => {
                const isCurrent = activeCandidateIndex === idx;
                const label = `LOOK 0${idx + 1}`;
                const archetype = (cand.archetypeLabel || 'Signature').toUpperCase();

                return (
                  <TouchableOpacity
                    key={cand.id}
                    activeOpacity={0.8}
                    onPress={() => setActiveCandidateIndex(idx)}
                    style={[
                      styles.alternateLookCard,
                      isCurrent && styles.alternateLookCardActive,
                    ]}
                  >
                    <View style={styles.lookCardHeader}>
                      <Typography
                        variant="caption"
                        color={isCurrent ? colors.textInverse : colors.textMuted}
                        style={styles.alternateCardNumber}
                      >
                        {label}
                      </Typography>
                      {isCurrent && (
                        <View style={styles.activeDot} />
                      )}
                    </View>
                    <Typography
                      variant="body"
                      color={isCurrent ? colors.textInverse : colors.text}
                      numberOfLines={1}
                      style={styles.alternateCardName}
                    >
                      {cand.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={isCurrent ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary}
                      numberOfLines={1}
                      style={styles.alternateCardArchetype}
                    >
                      {archetype}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 7. Secondary Feature: Virtual Try-On */}
        <View style={styles.studioSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/mirror')}
            style={styles.studioCard}
          >
            <View style={styles.studioLeft}>
              <View style={styles.sparkleCircle}>
                <Sparkles size={16} color={colors.text} />
              </View>
              <View>
                <Typography variant="body" style={styles.studioTitle}>
                  Style in Studio
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Preview complete look on personal avatar
                </Typography>
              </View>
            </View>
            <ArrowRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image-First Wardrobe Closet Swap Sheet */}
      <WardrobeSwapSheet
        visible={isSwapSheetOpen}
        initialCategory={swapCategory}
        categorizedGarments={categorizedGarments}
        selectedSlots={selectedSlots}
        onSelectGarment={(cat, garment) => swapGarment(cat, garment)}
        onClose={handleCloseSwap}
        onAddNew={() => router.push('/garment/add')}
      />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    color: colors.text,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  feedbackIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookTitleSection: {
    marginBottom: spacing.sm,
  },
  lookNumberLabel: {
    color: colors.textMuted,
    letterSpacing: 1.2,
    fontSize: 11,
    marginBottom: 2,
  },
  lookName: {
    fontSize: 20,
    color: colors.text,
  },
  heroOutfitSection: {
    marginBottom: spacing.md,
  },
  rationaleBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  rationaleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rationaleTitle: {
    color: colors.textMuted,
    letterSpacing: 1,
    fontSize: 11,
  },
  highlightTagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  rationaleText: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: 13,
  },
  actionSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  swapActionBtn: {
    flex: 1,
    borderColor: colors.border,
  },
  primaryActionBtn: {
    flex: 1.2,
  },
  alternativeLooksSection: {
    marginBottom: spacing.lg,
  },
  alternativeSectionTitle: {
    color: colors.textMuted,
    letterSpacing: 1,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  alternateLooksRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  alternateLookCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  alternateLookCardActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  lookCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alternateCardNumber: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textInverse,
  },
  alternateCardName: {
    fontSize: 13,
    fontWeight: '600',
  },
  alternateCardArchetype: {
    fontSize: 10,
    marginTop: 2,
  },
  studioSection: {
    marginBottom: spacing.md,
  },
  studioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  studioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sparkleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  studioTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingTitle: {
    fontSize: 18,
    marginTop: spacing.sm,
  },
  loadingSubtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  emptyActionBtn: {
    minWidth: 200,
  },
});
