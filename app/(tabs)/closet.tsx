import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useGarments } from '../../src/hooks/useGarments';
import { GarmentCategory } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { CategoryFilter } from '../../src/components/garment/CategoryFilter';
import { GarmentCard } from '../../src/components/garment/GarmentCard';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { Plus, Shirt } from 'lucide-react-native';

export default function ClosetScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | 'all'>('all');
  const { garments, isLoading, toggleFavorite, deleteGarment, refresh } = useGarments(selectedCategory);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Garment',
      `Are you sure you want to remove "${name}" from your wardrobe?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteGarment(id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Typography variant="title" style={styles.title}>
            Wardrobe
          </Typography>
          <Typography variant="caption" color={colors.textSecondary}>
            {garments.length} {garments.length === 1 ? 'Garment' : 'Garments'} Ingested
          </Typography>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/garment/add')}
          style={styles.addButton}
        >
          <Plus size={16} color={colors.textInverse} />
          <Typography variant="caption" color={colors.textInverse} style={styles.addButtonText}>
            Add Piece
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Category Horizontal Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Garments Grid */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : garments.length > 0 ? (
        <FlatList
          data={garments}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardContainer}>
              <GarmentCard
                garment={item}
                onPress={() => router.push(`/garment/${item.id}`)}
                onToggleFavorite={() => toggleFavorite(item.id, item.favorite)}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            </View>
          )}
          onRefresh={refresh}
          refreshing={isLoading}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Shirt size={28} color={colors.text} />
          </View>
          <Typography variant="title" style={styles.emptyTitle}>
            No garments in this category
          </Typography>
          <Typography variant="body" style={styles.emptySubtitle}>
            Add clothing items to expand your wardrobe and enable rich mix & match possibilities.
          </Typography>
          <Button
            label="Add Clothing Item"
            onPress={() => router.push('/garment/add')}
            icon={<Plus size={16} color={colors.textInverse} />}
            size="md"
            style={styles.emptyButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    gap: 4,
    ...shadows.subtle,
  },
  addButtonText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  gridContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  cardContainer: {
    width: '48%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  emptyTitle: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontSize: 18,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
  },
});
