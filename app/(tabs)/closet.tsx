/**
 * AURA Closet Screen
 * Source of truth: Figma Screen 15 & 16 ("My Closet") & Screen 55 ("Empty Closet")
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGarments } from '../../src/hooks/useGarments';
import { GarmentCategory } from '../../src/constants/categories';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  Layers,
  Heart,
} from 'lucide-react-native';

const CATEGORY_TABS: Array<{ id: GarmentCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'outerwear', label: 'Outerwear' },
];

export default function ClosetScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { garments, isLoading, toggleFavorite, deleteGarment, refresh } = useGarments(selectedCategory);

  const filteredGarments = useMemo(() => {
    if (!searchQuery.trim()) return garments;
    const q = searchQuery.toLowerCase().trim();
    return garments.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.primary_color && g.primary_color.toLowerCase().includes(q))
    );

  }, [garments, searchQuery]);

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

  const renderGarmentItem = ({ item }: { item: Garment }) => {
    const displayUri = item.processed_image || item.original_image;
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push(`/garment/${item.id}`)}
        style={styles.garmentCard}
        accessibilityLabel={`View ${item.name}`}
      >
        <View style={styles.imageContainer}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.garmentImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Layers size={24} color={colors.textMuted} />
            </View>
          )}

          {/* Quick Favorite Icon */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleFavorite(item.id, item.favorite)}
            style={styles.favoriteBadge}
            accessibilityLabel="Toggle favorite"
          >
            <Heart
              size={14}
              color={item.favorite ? colors.like : colors.textMuted}
              fill={item.favorite ? colors.like : 'none'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardInfo}>
          <Typography variant="caption" color={colors.textMuted} style={styles.categoryLabel}>
            {item.category.toUpperCase()}
          </Typography>
          <Typography variant="body" numberOfLines={1} style={styles.garmentName}>
            {item.name}
          </Typography>
          {item.primary_color ? (
            <Typography variant="caption" color={colors.textSecondary} numberOfLines={1} style={styles.garmentColor}>
              {item.primary_color}
            </Typography>
          ) : null}

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 1. Figma Screen 16 Header: "My Closet" */}
      <View style={styles.header}>
        <View>
          <Typography variant="hero" style={styles.title}>
            My Closet
          </Typography>
          <Typography variant="caption" color={colors.textSecondary} style={styles.itemCount}>
            {garments.length} {garments.length === 1 ? 'item' : 'items'}
          </Typography>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/garment/add')}
          style={styles.addBtn}
          accessibilityLabel="Add clothing item"
        >
          <Plus size={16} color={colors.textInverse} />
          <Typography variant="caption" color={colors.textInverse} style={styles.addBtnText}>
            Add Item
          </Typography>
        </TouchableOpacity>
      </View>

      {/* 2. Figma Search Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items, colors, styles..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* 3. Figma Category Filter Chips */}
      <View style={styles.categoryBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_TABS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryContent}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(item.id)}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
              >
                <Typography
                  variant="caption"
                  color={isSelected ? colors.textInverse : colors.textSecondary}
                  style={styles.categoryPillText}
                >
                  {item.label}
                </Typography>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 4. Garment Grid or Empty Closet (Figma Screen 55) */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : filteredGarments.length > 0 ? (
        <FlatList
          data={filteredGarments}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderGarmentItem}
          onRefresh={refresh}
          refreshing={isLoading}
        />
      ) : (
        /* Figma Screen 55: Empty Closet */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Layers size={28} color={colors.text} />
          </View>
          <Typography variant="title" style={styles.emptyTitle}>
            Your closet is empty.
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.emptySubtitle}>
            Add your first item to start building your personal wardrobe.
          </Typography>
          <Button
            label="Add Clothing"
            variant="primary"
            onPress={() => router.push('/garment/add')}
            icon={<Plus size={16} color={colors.textInverse} />}
            style={styles.emptyActionBtn}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 64 : spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: colors.text,
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.text,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    ...shadows.subtle,
  },
  addBtnText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  categoryBar: {
    marginVertical: spacing.xs,
  },
  categoryContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  categoryPillText: {
    fontWeight: '600',
    fontSize: 12,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  garmentCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  imageContainer: {
    width: '100%',
    height: 170,
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  garmentImage: {
    width: '90%',
    height: '90%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardInfo: {
    padding: spacing.sm,
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  garmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  garmentColor: {
    fontSize: 11,
    marginTop: 2,
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
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  emptyActionBtn: {
    minWidth: 180,
  },
});
