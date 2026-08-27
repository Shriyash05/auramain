import React from 'react';
import { View, ScrollView, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Garment } from '../../types/garment';
import { colors, radii, spacing, typography, shadows } from '../../constants/theme';
import { Plus } from 'lucide-react-native';

interface GarmentSwiperProps {
  garments: Garment[];
  selectedGarment?: Garment;
  onSelect: (garment: Garment) => void;
  onAddPress: () => void;
  categoryName: string;
}

export const GarmentSwiper: React.FC<GarmentSwiperProps> = ({
  garments,
  selectedGarment,
  onSelect,
  onAddPress,
  categoryName,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select {categoryName}</Text>
        <Text style={styles.countText}>{garments.length} Available</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {garments.map((garment) => {
          const isSelected = selectedGarment?.id === garment.id;
          return (
            <TouchableOpacity
              key={garment.id}
              activeOpacity={0.85}
              onPress={() => onSelect(garment)}
              style={[
                styles.itemCard,
                isSelected ? styles.itemCardSelected : styles.itemCardUnselected,
              ]}
            >
              {garment.original_image ? (
                <Image
                  source={{ uri: garment.processed_image || garment.original_image }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>{garment.name.slice(0, 3)}</Text>
                </View>
              )}
              <View style={styles.itemLabelContainer}>
                <Text
                  style={[
                    styles.itemLabel,
                    isSelected ? styles.itemLabelSelected : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {garment.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onAddPress}
          style={styles.addCard}
        >
          <View style={styles.addIconCircle}>
            <Plus size={18} color={colors.text} />
          </View>
          <Text style={styles.addText}>Add {categoryName}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  itemCard: {
    width: 104,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  itemCardUnselected: {
    borderColor: colors.border,
  },
  itemCardSelected: {
    borderColor: colors.borderDark,
    backgroundColor: colors.surface,
  },
  itemImage: {
    width: '100%',
    height: 115,
  },
  placeholder: {
    width: '100%',
    height: 115,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  itemLabelContainer: {
    padding: 6,
    backgroundColor: colors.surface,
  },
  itemLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  itemLabelSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  addCard: {
    width: 104,
    height: 147,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  addIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.subtle,
  },
  addText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
