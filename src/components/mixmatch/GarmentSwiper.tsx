import React from 'react';
import { View, ScrollView, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Garment } from '../../types/garment';
import { colors, radii, spacing, typography } from '../../constants/theme';
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
              activeOpacity={0.8}
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
          activeOpacity={0.7}
          onPress={onAddPress}
          style={styles.addCard}
        >
          <View style={styles.addIconCircle}>
            <Plus size={20} color={colors.textSecondary} />
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
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    width: 100,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  itemCardUnselected: {
    borderColor: colors.border,
  },
  itemCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  itemImage: {
    width: '100%',
    height: 110,
  },
  placeholder: {
    width: '100%',
    height: 110,
    backgroundColor: colors.surfaceHighlight,
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
    color: colors.accent,
    fontWeight: '700',
  },
  addCard: {
    width: 100,
    height: 142,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  addText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
});
