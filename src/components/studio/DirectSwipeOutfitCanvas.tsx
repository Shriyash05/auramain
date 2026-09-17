/**
 * AURA Direct-Swipe Outfit Canvas
 * 
 * Implements the Whering-style continuous wardrobe browsing mental model
 * while strictly adhering to AURA Figma visual design tokens.
 * 
 * Key Principles:
 * 1. The complete look IS the clothing browser.
 * 2. Directly swipe across Tops -> Top changes.
 * 3. Directly swipe across Bottoms -> Bottom changes.
 * 4. Directly swipe across Shoes -> Shoes change.
 * 5. Zero category form navigation. Zero scrolling down to a separate deck.
 * 6. Smooth PanResponder gesture detection with hitSlop and tap arrows.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Animated,
} from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { SelectedOutfitSlots } from '../../hooks/useMixMatch';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Wand2 } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const SWIPE_THRESHOLD = 35; // Minimum horizontal drag distance to trigger piece change

interface DirectSwipeSlotProps {
  category: GarmentCategory;
  categoryLabel: string;
  garments: Garment[];
  selectedGarment?: Garment;
  onSelectGarment: (garment: Garment) => void;
  onEmptySlotPress?: () => void;
  slotHeight: number;
  imageHeight: number;
  isActive?: boolean;
  onPressSlot?: () => void;
}

const DirectSwipeSlot: React.FC<DirectSwipeSlotProps> = ({
  category,
  categoryLabel,
  garments,
  selectedGarment,
  onSelectGarment,
  onEmptySlotPress,
  slotHeight,
  imageHeight,
  isActive = false,
  onPressSlot,
}) => {
  const panX = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false);

  const currentIndex = selectedGarment
    ? Math.max(0, garments.findIndex((g) => g.id === selectedGarment.id))
    : 0;

  const prevIndex = garments.length > 1 ? (currentIndex - 1 + garments.length) % garments.length : -1;
  const nextIndex = garments.length > 1 ? (currentIndex + 1) % garments.length : -1;
  const prevGarment = prevIndex >= 0 ? garments[prevIndex] : null;
  const nextGarment = nextIndex >= 0 ? garments[nextIndex] : null;

  const handleNext = () => {
    if (garments.length <= 1 || isTransitioning.current) return;
    isTransitioning.current = true;
    const nextIdx = (currentIndex + 1) % garments.length;
    Animated.sequence([
      Animated.timing(panX, { toValue: -50, duration: 90, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 50, duration: 0, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      isTransitioning.current = false;
    });
    onSelectGarment(garments[nextIdx]);
  };

  const handlePrev = () => {
    if (garments.length <= 1 || isTransitioning.current) return;
    isTransitioning.current = true;
    const prevIdx = (currentIndex - 1 + garments.length) % garments.length;
    Animated.sequence([
      Animated.timing(panX, { toValue: 50, duration: 90, useNativeDriver: true }),
      Animated.timing(panX, { toValue: -50, duration: 0, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      isTransitioning.current = false;
    });
    onSelectGarment(garments[prevIdx]);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only capture horizontal swipes greater than vertical drift
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_evt, gestureState) => {
        panX.setValue(gestureState.dx * 0.45);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          handleNext();
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          handlePrev();
        } else {
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const displayUri = selectedGarment?.processed_image || selectedGarment?.original_image;

  if (!selectedGarment && garments.length === 0) {
    return (
      <View style={[styles.slotRow, { height: slotHeight }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onEmptySlotPress}
          style={styles.emptySlotButton}
        >
          <Plus size={18} color={colors.textMuted} />
          <Typography variant="caption" color={colors.textMuted} style={styles.emptySlotText}>
            Add {categoryLabel}
          </Typography>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.slotRow,
        { height: slotHeight },
        isActive && styles.slotRowActive,
      ]}
      {...panResponder.panHandlers}
    >
      {/* Previous Garment Peek (Left) */}
      {prevGarment && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePrev}
          style={styles.peekLeft}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`Previous ${categoryLabel}: ${prevGarment.name}`}
        >
          <Image
            source={{ uri: prevGarment.processed_image || prevGarment.original_image }}
            style={styles.peekImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* Left Tap Arrow */}
      {garments.length > 1 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePrev}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.arrowBtnLeft}
        >
          <ChevronLeft size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Main Swipeable Dominant Garment Stage */}
      <Animated.View
        style={[
          styles.garmentCenterStage,
          { transform: [{ translateX: panX }] },
        ]}
      >
        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={[styles.garmentImage, { height: imageHeight }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.garmentPlaceholder, { height: imageHeight }]} />
        )}

        {/* Minimalist Floating Garment Label Pill */}
        <View style={[styles.floatingMetaPill, isActive && styles.floatingMetaPillActive]}>
          <Typography
            variant="caption"
            color={isActive ? colors.textInverse : colors.textMuted}
            style={styles.metaCategory}
          >
            {categoryLabel.toUpperCase()}
          </Typography>
          {selectedGarment && (
            <Typography
              variant="caption"
              color={isActive ? colors.textInverse : colors.text}
              numberOfLines={1}
              style={styles.metaName}
            >
              {selectedGarment.name}
            </Typography>
          )}
          {garments.length > 1 && (
            <Typography
              variant="caption"
              color={isActive ? colors.textInverse : colors.textMuted}
              style={styles.metaCounter}
            >
              {currentIndex + 1}/{garments.length}
            </Typography>
          )}
        </View>
      </Animated.View>

      {/* Right Tap Arrow */}
      {garments.length > 1 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNext}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.arrowBtnRight}
        >
          <ChevronRight size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Next Garment Peek (Right) */}
      {nextGarment && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleNext}
          style={styles.peekRight}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`Next ${categoryLabel}: ${nextGarment.name}`}
        >
          <Image
            source={{ uri: nextGarment.processed_image || nextGarment.original_image }}
            style={styles.peekImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

interface DirectSwipeOutfitCanvasProps {
  slots: SelectedOutfitSlots;
  categorizedGarments: Record<GarmentCategory, Garment[]>;
  activeCategory?: GarmentCategory;
  onSelectCategory?: (category: GarmentCategory) => void;
  onSwapGarment: (category: GarmentCategory, garment: Garment) => void;
  onAddGarmentPress?: (category: GarmentCategory) => void;
}

export const DirectSwipeOutfitCanvas: React.FC<DirectSwipeOutfitCanvasProps> = ({
  slots,
  categorizedGarments,
  activeCategory = 'tops',
  onSelectCategory,
  onSwapGarment,
  onAddGarmentPress,
}) => {
  const topGarments = categorizedGarments.tops || [];
  const bottomGarments = categorizedGarments.bottoms || [];
  const shoeGarments = categorizedGarments.shoes || [];
  const outerwearGarments = categorizedGarments.outerwear || [];

  return (
    <View style={styles.canvasContainer}>
      {/* Visual Canvas Card */}
      <View style={styles.canvasCard}>
        {/* Optional Outerwear Row if available */}
        {outerwearGarments.length > 0 && (
          <DirectSwipeSlot
            category="outerwear"
            categoryLabel="Outerwear"
            garments={outerwearGarments}
            selectedGarment={slots.outerwear}
            isActive={activeCategory === 'outerwear'}
            onPressSlot={() => onSelectCategory?.('outerwear')}
            onSelectGarment={(g) => onSwapGarment('outerwear', g)}
            onEmptySlotPress={() => onAddGarmentPress?.('outerwear')}
            slotHeight={130}
            imageHeight={115}
          />
        )}

        {/* 1. TOP LAYER (Shirt / Sweater / Tee) */}
        <DirectSwipeSlot
          category="tops"
          categoryLabel="Top"
          garments={topGarments}
          selectedGarment={slots.tops}
          isActive={activeCategory === 'tops'}
          onPressSlot={() => onSelectCategory?.('tops')}
          onSelectGarment={(g) => onSwapGarment('tops', g)}
          onEmptySlotPress={() => onAddGarmentPress?.('tops')}
          slotHeight={170}
          imageHeight={155}
        />

        {/* Subtle separator guide */}
        <View style={styles.slotDivider} />

        {/* 2. BOTTOM LAYER (Trousers / Denim / Shorts) */}
        <DirectSwipeSlot
          category="bottoms"
          categoryLabel="Bottom"
          garments={bottomGarments}
          selectedGarment={slots.bottoms}
          isActive={activeCategory === 'bottoms'}
          onPressSlot={() => onSelectCategory?.('bottoms')}
          onSelectGarment={(g) => onSwapGarment('bottoms', g)}
          onEmptySlotPress={() => onAddGarmentPress?.('bottoms')}
          slotHeight={180}
          imageHeight={165}
        />

        {/* Subtle separator guide */}
        <View style={styles.slotDivider} />

        {/* 3. FOOTWEAR LAYER (Loafers / Sneakers / Boots) */}
        <DirectSwipeSlot
          category="shoes"
          categoryLabel="Shoes"
          garments={shoeGarments}
          selectedGarment={slots.shoes}
          isActive={activeCategory === 'shoes'}
          onPressSlot={() => onSelectCategory?.('shoes')}
          onSelectGarment={(g) => onSwapGarment('shoes', g)}
          onEmptySlotPress={() => onAddGarmentPress?.('shoes')}
          slotHeight={110}
          imageHeight={95}
        />
      </View>

      {/* Direct-Swipe Interaction Hint */}
      <View style={styles.swipeHintRow}>
        <Wand2 size={13} color={colors.accent} />
        <Typography variant="caption" color={colors.textSecondary} style={styles.swipeHintText}>
          Swipe across any piece to change it • Entire look updates in real-time
        </Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    width: '100%',
    alignItems: 'center',
  },
  canvasCard: {
    width: CANVAS_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.subtle,
  },
  slotRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    marginVertical: 2,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 2,
  },
  slotRowActive: {
    borderColor: colors.text,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  garmentCenterStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentImage: {
    width: '85%',
  },
  garmentPlaceholder: {
    width: '60%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
  },
  arrowBtnLeft: {
    position: 'absolute',
    left: 38,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  arrowBtnRight: {
    position: 'absolute',
    right: 38,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  peekLeft: {
    position: 'absolute',
    left: 4,
    zIndex: 4,
    opacity: 0.35,
    transform: [{ scale: 0.72 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekRight: {
    position: 'absolute',
    right: 4,
    zIndex: 4,
    opacity: 0.35,
    transform: [{ scale: 0.72 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekImage: {
    width: 65,
    height: 65,
  },
  floatingMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  floatingMetaPillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  metaCategory: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metaName: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 140,
  },
  metaCounter: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptySlotButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    gap: 6,
  },
  emptySlotText: {
    fontSize: 12,
  },
  slotDivider: {
    width: '60%',
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
    marginVertical: 4,
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
