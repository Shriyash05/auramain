import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { SelectedOutfitSlots } from '../../hooks/useMixMatch';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { Shirt, Sparkles, Plus } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

interface EditorialOutfitCanvasProps {
  slots: SelectedOutfitSlots;
  onPiecePress?: (category: GarmentCategory) => void;
  onEmptySlotPress?: (category: GarmentCategory) => void;
}

/**
 * EditorialOutfitCanvas
 * 
 * Editorial flat-lay presentation of a complete wardrobe outfit.
 * Prioritizes large imagery, authentic scale, natural garment overlap,
 * generous whitespace, and eliminates database inventory cards.
 */
export const EditorialOutfitCanvas: React.FC<EditorialOutfitCanvasProps> = ({
  slots,
  onPiecePress,
  onEmptySlotPress,
}) => {
  const top = slots.tops;
  const bottom = slots.bottoms;
  const shoes = slots.shoes;
  const outerwear = slots.outerwear;
  const accessory = slots.accessories;

  const getGarmentImageUri = (g?: Garment) => g?.processed_image || g?.original_image;

  return (
    <View style={styles.canvasContainer}>
      {/* Outerwear & Accessory Accent Row (if present) */}
      {(outerwear || accessory) && (
        <View style={styles.accentsRow}>
          {outerwear && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onPiecePress?.('outerwear')}
              style={styles.outerwearPill}
            >
              <Image
                source={{ uri: getGarmentImageUri(outerwear) }}
                style={styles.outerwearImage}
                resizeMode="contain"
              />
              <View style={styles.pillTextCol}>
                <Typography variant="caption" color={colors.textMuted} style={styles.pillLabel}>
                  OUTERWEAR
                </Typography>
                <Typography variant="caption" color={colors.text} numberOfLines={1} style={styles.pillName}>
                  {outerwear.name}
                </Typography>
              </View>
            </TouchableOpacity>
          )}

          {accessory && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onPiecePress?.('accessories')}
              style={styles.accessoryPill}
            >
              <Image
                source={{ uri: getGarmentImageUri(accessory) }}
                style={styles.accessoryImage}
                resizeMode="contain"
              />
              <View style={styles.pillTextCol}>
                <Typography variant="caption" color={colors.textMuted} style={styles.pillLabel}>
                  ACCENT
                </Typography>
                <Typography variant="caption" color={colors.text} numberOfLines={1} style={styles.pillName}>
                  {accessory.name}
                </Typography>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Flat-Lay Composition (Editorial Hero) */}
      <View style={styles.flatLayBody}>
        {/* TOP LAYER */}
        <View style={styles.topSlotContainer}>
          {top ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPiecePress?.('tops')}
              style={styles.garmentTouchable}
            >
              <Image
                source={{ uri: getGarmentImageUri(top) }}
                style={styles.topImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEmptySlotPress?.('tops')}
              style={styles.emptySlot}
            >
              <Plus size={20} color={colors.textMuted} />
              <Typography variant="caption" color={colors.textMuted} style={styles.emptySlotText}>
                Select Top
              </Typography>
            </TouchableOpacity>
          )}
        </View>

        {/* BOTTOM LAYER (Overlaps naturally with top) */}
        <View style={styles.bottomSlotContainer}>
          {bottom ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPiecePress?.('bottoms')}
              style={styles.garmentTouchable}
            >
              <Image
                source={{ uri: getGarmentImageUri(bottom) }}
                style={styles.bottomImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEmptySlotPress?.('bottoms')}
              style={styles.emptySlot}
            >
              <Plus size={20} color={colors.textMuted} />
              <Typography variant="caption" color={colors.textMuted} style={styles.emptySlotText}>
                Select Bottom
              </Typography>
            </TouchableOpacity>
          )}
        </View>

        {/* FOOTWEAR BASE */}
        <View style={styles.shoesSlotContainer}>
          {shoes ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPiecePress?.('shoes')}
              style={styles.garmentTouchable}
            >
              <Image
                source={{ uri: getGarmentImageUri(shoes) }}
                style={styles.shoesImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEmptySlotPress?.('shoes')}
              style={styles.emptySlot}
            >
              <Plus size={20} color={colors.textMuted} />
              <Typography variant="caption" color={colors.textMuted} style={styles.emptySlotText}>
                Select Shoes
              </Typography>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Subtle interaction tip */}
      <View style={styles.tapToRefineHint}>
        <Typography variant="caption" color={colors.textMuted} style={styles.hintText}>
          Tap any piece in the look to refine
        </Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
    alignItems: 'center',
  },
  accentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  outerwearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    maxWidth: '48%',
  },
  outerwearImage: {
    width: 36,
    height: 36,
    marginRight: spacing.xs,
  },
  accessoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    maxWidth: '48%',
  },
  accessoryImage: {
    width: 36,
    height: 36,
    marginRight: spacing.xs,
  },
  pillTextCol: {
    flex: 1,
  },
  pillLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  pillName: {
    fontSize: 12,
    fontWeight: '500',
  },
  flatLayBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  garmentTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSlotContainer: {
    width: '100%',
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  topImage: {
    width: CANVAS_WIDTH * 0.65,
    height: 185,
  },
  bottomSlotContainer: {
    width: '100%',
    height: 205,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // Natural garment layering overlap
    zIndex: 1,
  },
  bottomImage: {
    width: CANVAS_WIDTH * 0.68,
    height: 200,
  },
  shoesSlotContainer: {
    width: '100%',
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12, // Close connection with trousers
    zIndex: 3,
  },
  shoesImage: {
    width: CANVAS_WIDTH * 0.48,
    height: 100,
  },
  emptySlot: {
    width: 140,
    height: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tapToRefineHint: {
    paddingTop: spacing.xs,
  },
  hintText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
