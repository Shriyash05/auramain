/**
 * AURA Direct Wardrobe Rail Component
 * 
 * Implements the continuous direct wardrobe browsing interaction model:
 * - Active category selector (TOP, BOTTOM, SHOES, OUTERWEAR)
 * - Focused active garment centered with subtle previous and next previews
 * - Fluid horizontal swipe gesture (PanResponder) to browse clothes directly
 * - Instantaneous feedback to the hero outfit canvas above
 * - Tactile tap arrows for 1-tap cycling
 * - Strictly follows AURA Figma visual design tokens (warm neutrals, Platypi/Lora/Inter typography)
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 30;

interface DirectWardrobeRailProps {
  activeCategory: GarmentCategory;
  availableCategories: GarmentCategory[];
  onSelectCategory: (category: GarmentCategory) => void;
  garments: Garment[];
  selectedGarment?: Garment;
  onSelectGarment: (garment: Garment) => void;
  onAddGarmentPress?: () => void;
}

export const DirectWardrobeRail: React.FC<DirectWardrobeRailProps> = ({
  activeCategory,
  availableCategories,
  onSelectCategory,
  garments,
  selectedGarment,
  onSelectGarment,
  onAddGarmentPress,
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
    Animated.sequence([
      Animated.timing(panX, { toValue: -50, duration: 90, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 50, duration: 0, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      isTransitioning.current = false;
    });
    onSelectGarment(garments[(currentIndex + 1) % garments.length]);
  };

  const handlePrev = () => {
    if (garments.length <= 1 || isTransitioning.current) return;
    isTransitioning.current = true;
    Animated.sequence([
      Animated.timing(panX, { toValue: 50, duration: 90, useNativeDriver: true }),
      Animated.timing(panX, { toValue: -50, duration: 0, useNativeDriver: true }),
      Animated.timing(panX, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      isTransitioning.current = false;
    });
    onSelectGarment(garments[(currentIndex - 1 + garments.length) % garments.length]);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
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

  const getGarmentImage = (g?: Garment | null) => {
    if (!g) return '';
    return g.processed_image || g.original_image || '';
  };

  return (
    <View style={styles.container}>
      {/* Category Segment Tabs */}
      <View style={styles.categoryTabsRow}>
        {availableCategories.map((cat) => {
          const isActive = cat === activeCategory;
          const label = cat === 'tops' ? 'TOPS' : cat === 'bottoms' ? 'BOTTOMS' : cat === 'shoes' ? 'SHOES' : cat.toUpperCase();
          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.8}
              onPress={() => onSelectCategory(cat)}
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
            >
              <Typography
                variant="caption"
                color={isActive ? colors.textInverse : colors.textSecondary}
                style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}
              >
                {label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Direct Wardrobe Browsing Rail */}
      {garments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Typography variant="body" color={colors.textSecondary}>
            No {activeCategory} in your closet yet.
          </Typography>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAddGarmentPress}
            style={styles.emptyAddBtn}
          >
            <Plus size={14} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={{ fontWeight: '600' }}>
              Add to Closet
            </Typography>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.railWrapper} {...panResponder.panHandlers}>
          {/* Left Arrow Stepper */}
          {garments.length > 1 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePrev}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={styles.arrowLeft}
            >
              <ChevronLeft size={22} color={colors.text} />
            </TouchableOpacity>
          )}

          {/* Previous Garment Peek (Left) */}
          {prevGarment && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePrev}
              style={styles.peekLeft}
            >
              <Image
                source={{ uri: getGarmentImage(prevGarment) }}
                style={styles.peekImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Focused Center Garment Stage */}
          <Animated.View
            style={[
              styles.centerStage,
              { transform: [{ translateX: panX }] },
            ]}
          >
            <View style={styles.centerGarmentCard}>
              <Image
                source={{ uri: getGarmentImage(selectedGarment) }}
                style={styles.centerGarmentImage}
                resizeMode="contain"
              />
            </View>

            {/* Garment Details & Position Indicator */}
            <View style={styles.metaRow}>
              <Typography variant="caption" color={colors.textMuted} style={styles.counterText}>
                {currentIndex + 1} of {garments.length}
              </Typography>
              <Typography variant="title" numberOfLines={1} style={styles.garmentTitle}>
                {selectedGarment?.name || 'Selected Piece'}
              </Typography>
              <Typography variant="caption" color={colors.textSecondary} style={styles.garmentSub}>
                {selectedGarment?.fit || 'Standard'} • {selectedGarment?.primary_color || 'Neutral'}
              </Typography>
            </View>
          </Animated.View>

          {/* Next Garment Peek (Right) */}
          {nextGarment && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleNext}
              style={styles.peekRight}
            >
              <Image
                source={{ uri: getGarmentImage(nextGarment) }}
                style={styles.peekImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Right Arrow Stepper */}
          {garments.length > 1 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleNext}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={styles.arrowRight}
            >
              <ChevronRight size={22} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Subtle Swipe Guidance */}
      {garments.length > 1 && (
        <View style={styles.swipeHintRow}>
          <Typography variant="caption" color={colors.textMuted} style={styles.swipeHintText}>
            ← Swipe to cycle {activeCategory} →
          </Typography>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  categoryTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  categoryTabTextActive: {
    color: colors.textInverse,
  },
  railWrapper: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    zIndex: 10,
  },
  centerGarmentCard: {
    width: 140,
    height: 120,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    overflow: 'hidden',
  },
  centerGarmentImage: {
    width: '95%',
    height: '95%',
  },
  metaRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
    width: '100%',
  },
  counterText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 2,
  },
  garmentTitle: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  garmentSub: {
    fontSize: 11,
    marginTop: 1,
  },
  peekLeft: {
    position: 'absolute',
    left: 10,
    width: 65,
    height: 90,
    opacity: 0.35,
    transform: [{ scale: 0.85 }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  peekRight: {
    position: 'absolute',
    right: 10,
    width: 65,
    height: 90,
    opacity: 0.35,
    transform: [{ scale: 0.85 }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  peekImage: {
    width: '100%',
    height: '100%',
  },
  arrowLeft: {
    position: 'absolute',
    left: 2,
    zIndex: 20,
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  arrowRight: {
    position: 'absolute',
    right: 2,
    zIndex: 20,
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  swipeHintRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  swipeHintText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  emptyContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
