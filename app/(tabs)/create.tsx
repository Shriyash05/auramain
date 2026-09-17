import React, { useState, useMemo } from 'react';
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
import { DirectSwipeOutfitCanvas } from '../../src/components/studio/DirectSwipeOutfitCanvas';
import { WardrobeSwapSheet } from '../../src/components/mixmatch/WardrobeSwapSheet';
import { liveStyleIntelligenceService, LiveStyleInsight } from '../../src/services/stylist/liveStyleIntelligenceService';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  Sparkles,
  Bookmark,
  Heart,
  ThumbsDown,
  Sun,
  Moon,
  Plus,
  SlidersHorizontal,
  Layers,
  Wand2,
  Palette,
} from 'lucide-react-native';

export type StudioMode = 'BUILD' | 'AURA';

export default function StudioScreen() {
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
    wardrobeSufficiency,
    categorizedGarments,
  } = useMixMatch();

  // Studio Mode: BUILD (manual garment swipe) vs AURA (complete look proposals)
  const [studioMode, setStudioMode] = useState<StudioMode>('BUILD');

  // Active outfit slot category being browsed (tops, bottoms, shoes, etc.)
  const [activeSlotCategory, setActiveSlotCategory] = useState<GarmentCategory>('tops');

  // Modals
  const [isSwapSheetOpen, setIsSwapSheetOpen] = useState(false);
  const [swapCategory, setSwapCategory] = useState<GarmentCategory | null>(null);
  const [isVtoSheetOpen, setIsVtoSheetOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const isNight = context.timeOfDay === 'evening' || context.timeOfDay === 'night';

  // Live Style & Color Intelligence evaluated instantaneously on every swipe
  const liveInsight: LiveStyleInsight = useMemo(() => {
    return liveStyleIntelligenceService.evaluateLiveOutfit(
      {
        top: selectedSlots.tops,
        bottom: selectedSlots.bottoms,
        shoes: selectedSlots.shoes,
        outerwear: selectedSlots.outerwear,
        accessory: selectedSlots.accessories,
      },
      context
    );
  }, [selectedSlots, context]);

  const activeGarmentsList = useMemo(() => {
    return [
      selectedSlots.tops,
      selectedSlots.bottoms,
      selectedSlots.shoes,
      selectedSlots.outerwear,
      selectedSlots.accessories,
    ].filter(Boolean) as any[];
  }, [selectedSlots]);

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

  // 1. Loading State
  if (isGenerating) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Typography variant="title" style={styles.loadingTitle}>
            AURA Studio Opening...
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.loadingSubtitle}>
            Loading your personal wardrobe and styling intelligence.
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
  const lookArchetype = (activeCandidate?.archetypeLabel || 'Studio Minimal').toUpperCase();

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
              Studio
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

        {/* 2. Studio Mode Switcher: BUILD vs AURA */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setStudioMode('BUILD')}
            style={[styles.modeTab, studioMode === 'BUILD' && styles.modeTabActive]}
            accessibilityLabel="Switch to Build mode: swipe garments manually"
          >
            <Layers size={13} color={studioMode === 'BUILD' ? colors.textInverse : colors.textSecondary} />
            <Typography
              variant="caption"
              color={studioMode === 'BUILD' ? colors.textInverse : colors.textSecondary}
              style={styles.modeTabText}
            >
              BUILD
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setStudioMode('AURA')}
            style={[styles.modeTab, studioMode === 'AURA' && styles.modeTabActive]}
            accessibilityLabel="Switch to AURA mode: complete recommended looks"
          >
            <Wand2 size={13} color={studioMode === 'AURA' ? colors.textInverse : colors.textSecondary} />
            <Typography
              variant="caption"
              color={studioMode === 'AURA' ? colors.textInverse : colors.textSecondary}
              style={styles.modeTabText}
            >
              AURA
            </Typography>
          </TouchableOpacity>
        </View>

        {/* 3. Look Meta Label */}
        <View style={styles.lookMetaRow}>
          <Typography variant="label" style={styles.lookNumberLabel}>
            {studioMode === 'BUILD' ? 'CUSTOM STUDIO COMPOSITION' : `${lookNumber} • ${lookArchetype}`}
          </Typography>
          <Typography variant="title" style={styles.lookName}>
            {studioMode === 'BUILD' ? 'Personal Mix' : activeCandidate?.name || 'Curated Look'}
          </Typography>
        </View>

        {/* 4. Current Look: Continuous Direct-Swipe Wardrobe Canvas */}
        <View style={styles.heroCanvasSection}>
          <DirectSwipeOutfitCanvas
            slots={selectedSlots}
            categorizedGarments={categorizedGarments}
            activeCategory={activeSlotCategory}
            onSelectCategory={(cat) => setActiveSlotCategory(cat)}
            onSwapGarment={(cat, garment) => swapGarment(cat, garment)}
            onAddGarmentPress={() => router.push('/garment/add')}
          />
        </View>

        {/* 5. Live AURA Style & Colour Insight Box */}
        <View style={styles.liveInsightCard}>
          <Typography variant="label" style={styles.rationaleTag}>
            WHY THIS WORKS • LIVE STYLE INSIGHT
          </Typography>
          <View style={styles.insightHeaderRow}>
            <View style={styles.headlineGroup}>
              <Typography variant="title" style={styles.insightHeadline}>
                {liveInsight.headline}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={styles.palettePill}>
                {liveInsight.palette.dominantColorFamily} • {liveInsight.palette.contrastLevel.replace('_', ' ')}
              </Typography>
            </View>

            {liveInsight.status === 'consider_alternative' ? (
              <View style={styles.badgeWarning}>
                <Typography variant="caption" color={colors.warning} style={styles.badgeStatusText}>
                  TRY ANOTHER
                </Typography>
              </View>
            ) : (
              <View style={styles.badgeSuccess}>
                <Typography variant="caption" color={colors.success} style={styles.badgeStatusText}>
                  HARMONIOUS
                </Typography>
              </View>
            )}
          </View>

          <Typography variant="body" style={styles.insightExplanation}>
            {liveInsight.explanation}
          </Typography>

          {/* Attribute Pills */}
          <View style={styles.pillsRow}>
            {liveInsight.attributePills.map((pill, idx) => (
              <View key={idx} style={styles.attributePill}>
                <Typography variant="caption" color={colors.textSecondary} style={styles.pillText}>
                  {pill}
                </Typography>
              </View>
            ))}
          </View>

          {/* Constructive Guidance if weak combination */}
          {liveInsight.suggestedAction && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenSwap(liveInsight.suggestedAction?.category)}
              style={styles.suggestionBanner}
            >
              <Typography variant="caption" color={colors.text} style={styles.suggestionText}>
                💡 {liveInsight.suggestedAction.message}
              </Typography>
            </TouchableOpacity>
          )}
        </View>

        {/* 6. Primary Action Pair: [Save Look] & [Try It On] */}
        <View style={styles.actionRow}>
          <Button
            label={savedSuccess ? 'Saved to Closet' : 'Save Look'}
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            icon={<Bookmark size={16} color={colors.textInverse} />}
            size="lg"
            style={styles.primaryActionBtn}
          />
          <Button
            label="Try It On"
            variant="outline"
            onPress={() => {
              const garmentIds = activeGarmentsList.map((g) => g.id).join(',');
              router.push({
                pathname: '/tryon',
                params: {
                  garmentIds,
                  outfitName: studioMode === 'BUILD' ? 'Studio Look' : activeCandidate?.name || 'Studio Look',
                  source: 'studio',
                },
              });
            }}
            icon={<Sparkles size={16} color={colors.text} />}
            size="lg"
            style={styles.vtoActionBtn}
          />
        </View>

        {/* 7. AURA Mode Proposals Deck (only in AURA mode) */}
        {studioMode === 'AURA' && (
          <View style={styles.auraLooksSection}>
            <Typography variant="label" style={styles.deckSectionTitle}>
              AURA PROPOSED COMPLETE LOOKS
            </Typography>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.auraLooksRow}
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
                      {isCurrent && <View style={styles.activeDot} />}
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
      </ScrollView>

      {/* Wardrobe Swap Sheet (Closet Drawer) */}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
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
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  modeTabActive: {
    backgroundColor: colors.text,
  },
  modeTabText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  lookMetaRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  lookNumberLabel: {
    color: colors.textMuted,
    letterSpacing: 1.2,
    fontSize: 10,
    marginBottom: 2,
  },
  lookName: {
    fontSize: 18,
    color: colors.text,
  },
  heroCanvasSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  liveInsightCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  rationaleTag: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 4,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  headlineGroup: {
    flex: 1,
  },
  insightHeadline: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  palettePill: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  insightExplanation: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  attributePill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '500',
  },
  suggestionBanner: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  primaryActionBtn: {
    flex: 1.2,
  },
  vtoActionBtn: {
    flex: 1,
    borderColor: colors.border,
  },
  swipersDeckSection: {
    paddingTop: spacing.xs,
  },
  deckSectionTitle: {
    color: colors.textMuted,
    letterSpacing: 1.2,
    fontSize: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  auraLooksSection: {
    paddingTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  auraLooksRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
