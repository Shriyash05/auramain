import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { UniversalSearchService, SearchResults } from '../../src/services/intelligence/searchService';
import { Typography } from '../../src/components/ui/Typography';
import { Chip } from '../../src/components/ui/Chip';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Search, Bookmark, Tag } from 'lucide-react-native';

const QUICK_SEARCHES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Black', 'Cream', 'Casual', 'Editorial'];

export default function UniversalSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ garments: [], outfits: [], totalMatches: 0 });

  const performSearch = async (text: string) => {
    setQuery(text);
    if (!user) return;
    const res = await UniversalSearchService.searchWardrobeAndOutfits(user.id, text);
    setResults(res);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Search Wardrobe
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search by color, garment name, fit, occasion..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={performSearch}
            autoFocus
          />
        </View>

        {/* Quick Search Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {QUICK_SEARCHES.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              selected={query.toLowerCase() === chip.toLowerCase()}
              onPress={() => performSearch(chip)}
            />
          ))}
        </ScrollView>

        {/* Search Results */}
        <ScrollView contentContainerStyle={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          {query.trim() && results.totalMatches === 0 && (
            <GlassSurface style={styles.emptyState}>
              <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
                No items or outfits found matching "{query}".
              </Typography>
            </GlassSurface>
          )}

          {/* Garments Matches */}
          {results.garments.length > 0 && (
            <View style={styles.section}>
              <Typography variant="label" style={styles.sectionHeading}>
                MATCHING GARMENTS ({results.garments.length})
              </Typography>
              <View style={styles.garmentsGrid}>
                {results.garments.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/garment/${g.id}` as any)}
                    style={styles.garmentCard}
                  >
                    <Image
                      source={{ uri: g.processed_image || g.original_image }}
                      style={styles.garmentImage}
                      resizeMode="cover"
                    />
                    <Typography variant="caption" color={colors.textMuted} style={styles.garmentCat}>
                      {g.category}
                    </Typography>
                    <Typography variant="body" numberOfLines={1} style={styles.garmentName}>
                      {g.name}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Outfits Matches */}
          {results.outfits.length > 0 && (
            <View style={styles.section}>
              <Typography variant="label" style={styles.sectionHeading}>
                MATCHING LOOKS ({results.outfits.length})
              </Typography>
              <View style={styles.outfitsList}>
                {results.outfits.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/outfit/${o.id}` as any)}
                    style={styles.outfitRow}
                  >
                    <Bookmark size={16} color={colors.text} />
                    <View style={styles.outfitInfo}>
                      <Typography variant="body" style={styles.outfitName}>
                        {o.name}
                      </Typography>
                      <Typography variant="caption" color={colors.textMuted}>
                        {o.garment_ids.length} pieces • {o.occasion || 'Everyday'}
                      </Typography>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: 'System',
  },
  chipsRow: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  resultsScroll: {
    paddingBottom: spacing.xxxl,
    marginTop: spacing.xs,
  },
  emptyState: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  garmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  garmentCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  garmentImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 4,
  },
  garmentCat: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  garmentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  outfitsList: {
    gap: spacing.xs,
  },
  outfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outfitInfo: {
    flex: 1,
  },
  outfitName: {
    fontSize: 14,
    fontWeight: '600',
  },
});
