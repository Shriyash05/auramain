import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { Plus, Shirt, Check } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.32); // ~120-130px on mobile
const ITEM_HEIGHT = Math.round(ITEM_WIDTH * 1.15);

interface StudioGarmentSwiperProps {
  category: GarmentCategory;
  categoryLabel: string;
  garments: Garment[];
  selectedGarment?: Garment;
  onSelectGarment: (garment: Garment) => void;
  onAddNewPress?: () => void;
}

/**
 * StudioGarmentSwiper
 * 
 * Image-first, swipe-driven wardrobe carousel for AURA Studio.
 * Garment imagery dominates the card, enabling fluid horizontal browsing
 * across Tops, Bottoms, and Footwear with zero modal interruptions.
 */
export const StudioGarmentSwiper: React.FC<StudioGarmentSwiperProps> = ({
  category,
  categoryLabel,
  garments,
  selectedGarment,
  onSelectGarment,
  onAddNewPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Category header */}
      <View style={styles.headerRow}>
        <Typography variant="label" style={styles.categoryLabel}>
          {categoryLabel.toUpperCase()}
        </Typography>
        <Typography variant="caption" color={colors.textMuted} style={styles.countText}>
          {garments.length} {garments.length === 1 ? 'piece' : 'pieces'}
        </Typography>
      </View>

      {/* Horizontal swipeable garment deck */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {garments.map((garment) => {
          const isSelected = selectedGarment?.id === garment.id;
          const imageUri = garment.processed_image || garment.original_image;

          return (
            <TouchableOpacity
              key={garment.id}
              activeOpacity={0.85}
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
                    <Shirt size={24} color={colors.textMuted} />
                  </View>
                )}

                {/* Selected active check badge */}
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
                style={isSelected ? { ...styles.garmentName, ...styles.garmentNameSelected } : styles.garmentName}
              >
                {garment.name}
              </Typography>
            </TouchableOpacity>
          );
        })}

        {/* Add new piece card */}
        {onAddNewPress && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onAddNewPress}
            style={styles.addNewCard}
            accessibilityLabel={`Add new ${categoryLabel}`}
          >
            <View style={styles.addIconCircle}>
              <Plus size={16} color={colors.text} />
            </View>
            <Typography variant="caption" color={colors.textMuted} style={styles.addNewLabel}>
              + Add {categoryLabel}
            </Typography>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    letterSpacing: 1.2,
    fontSize: 11,
    color: colors.text,
  },
  countText: {
    fontSize: 11,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: 2,
  },
  garmentCard: {
    width: ITEM_WIDTH,
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
    opacity: 0.9,
  },
  imageBox: {
    width: '100%',
    height: ITEM_HEIGHT * 0.82,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  garmentImage: {
    width: '92%',
    height: '92%',
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentName: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  garmentNameSelected: {
    fontWeight: '600',
  },
  addNewCard: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT + 24,
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
  addNewLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
