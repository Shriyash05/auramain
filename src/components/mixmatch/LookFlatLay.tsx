import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { SelectedOutfitSlots } from '../../hooks/useMixMatch';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { ArrowLeftRight, Shirt, Plus, X } from 'lucide-react-native';

interface LookFlatLayProps {
  slots: SelectedOutfitSlots;
  onSwapPress: (category: GarmentCategory) => void;
  onRemovePress?: (category: GarmentCategory) => void;
  onAddPress?: (category: GarmentCategory) => void;
}

export const LookFlatLay: React.FC<LookFlatLayProps> = ({
  slots,
  onSwapPress,
  onRemovePress,
  onAddPress,
}) => {
  const renderGarmentCard = (
    garment: Garment | undefined,
    category: GarmentCategory,
    categoryLabel: string,
    isOptional = false
  ) => {
    if (!garment) {
      if (!isOptional) {
        return (
          <TouchableOpacity
            key={category}
            activeOpacity={0.8}
            onPress={() => onAddPress ? onAddPress(category) : onSwapPress(category)}
            style={[styles.garmentCard, styles.emptyCard]}
          >
            <View style={styles.emptyIconCircle}>
              <Plus size={18} color={colors.textSecondary} />
            </View>
            <Typography variant="caption" color={colors.textSecondary} style={styles.emptyLabel}>
              Select {categoryLabel}
            </Typography>
          </TouchableOpacity>
        );
      }
      return null;
    }

    const imageUri = garment.processed_image || garment.original_image;

    return (
      <View key={category} style={styles.garmentCard}>
        {/* Image Container */}
        <View style={styles.imageWrapper}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.garmentImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Shirt size={28} color={colors.textMuted} />
            </View>
          )}

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Typography variant="caption" color={colors.text} style={styles.categoryBadgeText}>
              {categoryLabel.toUpperCase()}
            </Typography>
          </View>

          {/* Optional Remove Button */}
          {isOptional && onRemovePress && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onRemovePress(category)}
              style={styles.removeBtn}
            >
              <X size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Garment Details & Swap Action */}
        <View style={styles.cardInfoRow}>
          <View style={styles.textDetails}>
            <Typography variant="body" style={styles.garmentName} numberOfLines={1}>
              {garment.name}
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {garment.fit || 'Regular'} • {garment.primary_color}
            </Typography>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSwapPress(category)}
            style={styles.swapBtn}
          >
            <ArrowLeftRight size={13} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.swapBtnText}>
              Swap
            </Typography>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Optional Outerwear */}
      {slots.outerwear && renderGarmentCard(slots.outerwear, 'outerwear', 'Outerwear', true)}

      {/* 2. Top & Bottom Grid */}
      <View style={styles.row}>
        <View style={styles.col}>
          {renderGarmentCard(slots.tops, 'tops', 'Top')}
        </View>
        <View style={styles.col}>
          {renderGarmentCard(slots.bottoms, 'bottoms', 'Bottom')}
        </View>
      </View>

      {/* 3. Shoes & Optional Accessory */}
      <View style={styles.row}>
        <View style={styles.col}>
          {renderGarmentCard(slots.shoes, 'shoes', 'Footwear')}
        </View>
        {slots.accessories ? (
          <View style={styles.col}>
            {renderGarmentCard(slots.accessories, 'accessories', 'Accessory', true)}
          </View>
        ) : (
          <View style={styles.colPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  colPlaceholder: {
    flex: 1,
  },
  garmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs + 2,
    ...shadows.subtle,
  },
  emptyCard: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
  },
  emptyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyLabel: {
    fontWeight: '600',
    fontSize: 12,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1.15,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    position: 'relative',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs + 2,
    paddingHorizontal: 2,
  },
  textDetails: {
    flex: 1,
    marginRight: spacing.xs,
  },
  garmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
