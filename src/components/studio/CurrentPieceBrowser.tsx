import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { ChevronLeft, ChevronRight, Plus, Shirt, Check } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(130, Math.round(SCREEN_WIDTH * 0.32));
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.25);

interface CurrentPieceBrowserProps {
  activeCategory: GarmentCategory;
  onSelectCategory: (category: GarmentCategory) => void;
  availableCategories: GarmentCategory[];
  garments: Garment[];
  selectedGarment?: Garment;
  onSelectGarment: (garment: Garment) => void;
  onAddNewPress?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  tops: 'TOP',
  bottoms: 'BOTTOM',
  shoes: 'SHOES',
  outerwear: 'OUTERWEAR',
  accessories: 'ACCENT',
};

/**
 * CurrentPieceBrowser
 * 
 * Focused wardrobe browsing control for AURA Studio.
 * Replaces redundant multi-row inventory databases with a single,
 * piece-centric interaction:
 * - Active category selector (Top, Bottom, Shoes)
 * - Fluid horizontal garment swiping to cycle the active outfit piece
 * - Immediate piece replacement in the outfit canvas
 */
export const CurrentPieceBrowser: React.FC<CurrentPieceBrowserProps> = ({
  activeCategory,
  onSelectCategory,
  availableCategories,
  garments,
  selectedGarment,
  onSelectGarment,
  onAddNewPress,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const currentIndex = garments.findIndex((g) => g.id === selectedGarment?.id);

  // Auto-scroll to selected garment when category or selection changes
  useEffect(() => {
    if (currentIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: Math.max(0, currentIndex * (CARD_WIDTH + spacing.sm) - spacing.lg),
        animated: true,
      });
    }
  }, [currentIndex, activeCategory]);

  const handlePrev = () => {
    if (garments.length <= 1) return;
    const prevIdx = currentIndex <= 0 ? garments.length - 1 : currentIndex - 1;
    onSelectGarment(garments[prevIdx]);
  };

  const handleNext = () => {
    if (garments.length <= 1) return;
    const nextIdx = currentIndex >= garments.length - 1 ? 0 : currentIndex + 1;
    onSelectGarment(garments[nextIdx]);
  };

  return (
    <View style={styles.container}>
      {/* 1. Slot Selector Tabs: TOP • BOTTOM • SHOES • OUTERWEAR */}
      <View style={styles.slotTabsContainer}>
        {availableCategories.map((cat) => {
          const isActive = activeCategory === cat;
          const label = CATEGORY_LABELS[cat] || cat.toUpperCase();

          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.8}
              onPress={() => onSelectCategory(cat)}
              style={[styles.slotTab, isActive && styles.slotTabActive]}
              accessibilityLabel={`Select ${label} slot`}
            >
              <Typography
                variant="caption"
                color={isActive ? colors.textInverse : colors.textSecondary}
                style={styles.slotTabText}
              >
                {label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Active Piece Header with Prev / Next Arrow Steppers */}
      <View style={styles.pieceHeaderRow}>
        <View style={styles.pieceTitleCol}>
          <Typography variant="label" style={styles.pieceSlotLabel}>
            SWIPE TO CHANGE {CATEGORY_LABELS[activeCategory] || activeCategory.toUpperCase()}
          </Typography>
          <Typography variant="title" numberOfLines={1} style={styles.pieceName}>
            {selectedGarment?.name || `Choose a ${CATEGORY_LABELS[activeCategory] || activeCategory}`}
          </Typography>
        </View>

        {garments.length > 1 && (
          <View style={styles.stepperControls}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handlePrev}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.stepBtn}
              accessibilityLabel="Previous piece"
            >
              <ChevronLeft size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleNext}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.stepBtn}
              accessibilityLabel="Next piece"
            >
              <ChevronRight size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. Horizontal Swiping Garment Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        decelerationRate="fast"
      >
        {garments.map((garment, idx) => {
          const isSelected = selectedGarment?.id === garment.id;
          const imageUri = garment.processed_image || garment.original_image;

          return (
            <TouchableOpacity
              key={garment.id}
              activeOpacity={0.88}
              onPress={() => onSelectGarment(garment)}
              style={[
                styles.garmentCard,
                isSelected ? styles.garmentCardSelected : styles.garmentCardUnselected,
              ]}
              accessibilityLabel={`Select ${garment.name}`}
            >
              <View style={styles.imageBox}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.garmentImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    <Shirt size={22} color={colors.textMuted} />
                  </View>
                )}

                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Check size={10} color={colors.textInverse} />
                  </View>
                )}
              </View>

              <Typography
                variant="caption"
                color={isSelected ? colors.text : colors.textSecondary}
                numberOfLines={1}
                style={isSelected ? { ...styles.cardLabel, ...styles.cardLabelSelected } : styles.cardLabel}
              >
                {garment.name}
              </Typography>
            </TouchableOpacity>
          );
        })}

        {/* Optional Add New piece button */}
        {onAddNewPress && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAddNewPress}
            style={styles.addNewCard}
            accessibilityLabel={`Add new ${CATEGORY_LABELS[activeCategory] || activeCategory}`}
          >
            <View style={styles.addIconCircle}>
              <Plus size={16} color={colors.text} />
            </View>
            <Typography variant="caption" color={colors.textMuted} style={styles.addNewText}>
              + Add Piece
            </Typography>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  slotTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  slotTabActive: {
    backgroundColor: colors.text,
  },
  slotTabText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  pieceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  pieceTitleCol: {
    flex: 1,
  },
  pieceSlotLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 2,
  },
  pieceName: {
    fontSize: 16,
    color: colors.text,
  },
  stepperControls: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  carouselContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: 4,
  },
  garmentCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  garmentCardSelected: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  garmentCardUnselected: {
    opacity: 0.85,
  },
  imageBox: {
    width: '100%',
    height: CARD_HEIGHT * 0.78,
    borderRadius: radii.sm,
    backgroundColor: '#F3F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  garmentImage: {
    width: '90%',
    height: '90%',
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  cardLabelSelected: {
    fontWeight: '600',
    color: colors.text,
  },
  addNewCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 10,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
