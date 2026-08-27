import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SelectedOutfitSlots } from '../../hooks/useMixMatch';
import { GarmentCategory } from '../../constants/categories';
import { colors, radii, spacing, typography, shadows } from '../../constants/theme';
import { Shirt } from 'lucide-react-native';

interface OutfitStackProps {
  selectedSlots: SelectedOutfitSlots;
  activeCategory: GarmentCategory;
  onSelectCategory: (category: GarmentCategory) => void;
}

export const OutfitStack: React.FC<OutfitStackProps> = ({
  selectedSlots,
  activeCategory,
  onSelectCategory,
}) => {
  const renderSlot = (category: GarmentCategory, label: string) => {
    const garment = selectedSlots[category];
    const isActive = activeCategory === category;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onSelectCategory(category)}
        style={[
          styles.slotContainer,
          isActive ? styles.slotActive : styles.slotInactive,
        ]}
      >
        <View style={styles.slotLabelHeader}>
          <Text style={[styles.slotLabel, isActive ? styles.slotLabelActive : undefined]}>
            {label}
          </Text>
          {isActive && <View style={styles.activeIndicator} />}
        </View>

        {garment ? (
          <View style={styles.garmentContent}>
            {garment.original_image ? (
              <Image
                source={{ uri: garment.processed_image || garment.original_image }}
                style={styles.garmentImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholder}>
                <Shirt size={22} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.garmentDetails}>
              <Text style={styles.garmentName} numberOfLines={1}>
                {garment.name}
              </Text>
              <Text style={styles.garmentMeta} numberOfLines={1}>
                {garment.fit || 'Editorial'} • {garment.primary_color}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptySlot}>
            <Text style={styles.emptySlotText}>Tap to select {label.toLowerCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {selectedSlots.outerwear && renderSlot('outerwear', 'Outerwear')}
      {renderSlot('tops', 'Top')}
      {renderSlot('bottoms', 'Bottom')}
      {renderSlot('shoes', 'Shoes')}
      {selectedSlots.accessories && renderSlot('accessories', 'Accessories')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  slotContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1.5,
    ...shadows.subtle,
  },
  slotInactive: {
    borderColor: colors.border,
  },
  slotActive: {
    borderColor: colors.borderDark,
    backgroundColor: colors.surface,
  },
  slotLabelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  slotLabel: {
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  slotLabelActive: {
    color: colors.text,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  garmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  garmentImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentDetails: {
    flex: 1,
  },
  garmentName: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  garmentMeta: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  emptySlot: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  emptySlotText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});
