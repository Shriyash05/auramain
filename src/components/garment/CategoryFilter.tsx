import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GARMENT_CATEGORIES, GarmentCategory } from '../../constants/categories';
import { Chip } from '../ui/Chip';
import { spacing } from '../../constants/theme';

interface CategoryFilterProps {
  selectedCategory: GarmentCategory | 'all';
  onSelectCategory: (category: GarmentCategory | 'all') => void;
  showAll?: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  showAll = true,
}) => {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {showAll && (
          <Chip
            label="All Wardrobe"
            selected={selectedCategory === 'all'}
            onPress={() => onSelectCategory('all')}
            style={styles.chip}
          />
        )}
        {GARMENT_CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            selected={selectedCategory === cat.id}
            onPress={() => onSelectCategory(cat.id)}
            style={styles.chip}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.xs,
  },
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  chip: {
    marginRight: spacing.xxs,
  },
});
