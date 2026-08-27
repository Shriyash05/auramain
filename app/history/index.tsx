import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { OutfitMemoryService } from '../../src/services/memory/outfitMemoryService';
import { Outfit } from '../../src/types/outfit';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Clock, CheckCircle2, Sparkles, Plus, Calendar } from 'lucide-react-native';

type HistoryFilter = 'worn' | 'saved' | 'frequent' | 'underused';

export default function OutfitHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('worn');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [stats, setStats] = useState<{ totalWears: number; utilizationRate: number; unwornCount: number }>({
    totalWears: 0,
    utilizationRate: 0,
    unwornCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allOutfits = await DatabaseService.getOutfits(user.id);
      const allGarments = await DatabaseService.getGarments(user.id);
      const wearStats = await OutfitMemoryService.getGarmentWearStats(user.id);

      setOutfits(allOutfits);
      setGarments(allGarments);
      setStats({
        totalWears: wearStats.totalWears,
        utilizationRate: wearStats.utilizationRate,
        unwornCount: wearStats.unworn.length,
      });
    } catch (e) {
      console.error('[History] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const handleMarkWorn = async (outfit: Outfit) => {
    if (!user) return;
    try {
      await OutfitMemoryService.markOutfitAsWorn(user.id, outfit.id, {
        occasion: outfit.occasion,
      });
      Alert.alert('Wear Logged', `Logged "${outfit.name}" for today.`);
      loadHistory();
    } catch (e) {
      Alert.alert('Error', 'Could not record wear log.');
    }
  };

  const getFilteredOutfits = () => {
    if (activeFilter === 'worn') {
      return outfits.filter((o) => (o.worn_count || 0) > 0);
    }
    if (activeFilter === 'saved') {
      return outfits;
    }
    if (activeFilter === 'frequent') {
      return outfits.filter((o) => (o.worn_count || 0) > 1);
    }
    return [];
  };

  const filteredOutfits = getFilteredOutfits();
  const unwornGarments = garments.filter((g) => !g.wear_count || g.wear_count === 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Wardrobe Memory
          </Typography>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/planner')} style={styles.plannerBtn}>
            <Calendar size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 1. Utilization Summary Card */}
        <GlassSurface style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Typography variant="display" style={styles.statNumber}>
                {stats.totalWears}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                TOTAL WEARS
              </Typography>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Typography variant="display" style={styles.statNumber}>
                {stats.utilizationRate}%
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                CLOSET UTILIZED
              </Typography>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Typography variant="display" style={styles.statNumber}>
                {stats.unwornCount}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                UNWORN PIECES
              </Typography>
            </View>
          </View>
        </GlassSurface>

        {/* 2. Filter Selector Chips */}
        <View style={styles.filterRow}>
          <Chip
            label="Worn Looks"
            selected={activeFilter === 'worn'}
            onPress={() => setActiveFilter('worn')}
          />
          <Chip
            label="All Saved"
            selected={activeFilter === 'saved'}
            onPress={() => setActiveFilter('saved')}
          />
          <Chip
            label="Frequently Worn"
            selected={activeFilter === 'frequent'}
            onPress={() => setActiveFilter('frequent')}
          />
          <Chip
            label="Underused Pieces"
            selected={activeFilter === 'underused'}
            onPress={() => setActiveFilter('underused')}
          />
        </View>

        {/* 3. Content List */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : activeFilter === 'underused' ? (
          // Underused Garments Grid
          <View style={styles.underusedSection}>
            <Typography variant="label" style={styles.sectionHeading}>
              PIECES READY FOR DISCOVERY
            </Typography>
            {unwornGarments.length > 0 ? (
              <View style={styles.garmentGrid}>
                {unwornGarments.map((g) => (
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
                    <View style={styles.garmentInfo}>
                      <Typography variant="caption" color={colors.textMuted} style={styles.garmentCat}>
                        {g.category}
                      </Typography>
                      <Typography variant="body" numberOfLines={1} style={styles.garmentTitle}>
                        {g.name}
                      </Typography>
                      <Typography variant="caption" color={colors.textSecondary}>
                        Never worn
                      </Typography>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <GlassSurface style={styles.emptyCard}>
                <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
                  Great job! You've worn and styled every single garment in your wardrobe.
                </Typography>
              </GlassSurface>
            )}
          </View>
        ) : filteredOutfits.length > 0 ? (
          // Outfits List
          <View style={styles.outfitList}>
            {filteredOutfits.map((outfit) => {
              const matchedGarments = garments.filter((g) => outfit.garment_ids.includes(g.id));

              return (
                <GlassSurface key={outfit.id} style={styles.outfitCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Typography variant="title" style={styles.outfitTitle}>
                        {outfit.name}
                      </Typography>
                      <View style={styles.metaRow}>
                        <Clock size={12} color={colors.textMuted} />
                        <Typography variant="caption" color={colors.textMuted}>
                          {outfit.worn_count ? `Worn ${outfit.worn_count} time${outfit.worn_count > 1 ? 's' : ''}` : 'Not worn yet'}
                          {outfit.last_worn ? ` • Last: ${outfit.last_worn}` : ''}
                        </Typography>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleMarkWorn(outfit)}
                      style={styles.markWornBtn}
                    >
                      <CheckCircle2 size={16} color={colors.text} />
                      <Typography variant="caption" color={colors.text} style={styles.markWornText}>
                        Wore Today
                      </Typography>
                    </TouchableOpacity>
                  </View>

                  {/* Garments Thumbs */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsRow}>
                    {matchedGarments.map((g) => (
                      <View key={g.id} style={styles.thumbWrapper}>
                        <Image
                          source={{ uri: g.processed_image || g.original_image }}
                          style={styles.outfitThumb}
                          resizeMode="cover"
                        />
                        <Typography variant="caption" numberOfLines={1} style={styles.thumbName}>
                          {g.name}
                        </Typography>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={styles.cardFooter}>
                    <Button
                      label="View Look"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.push(`/outfit/${outfit.id}` as any)}
                      style={styles.viewLookBtn}
                    />
                  </View>
                </GlassSurface>
              );
            })}
          </View>
        ) : (
          <GlassSurface style={styles.emptyCard}>
            <Typography variant="title" style={styles.emptyTitle}>
              No looks recorded
            </Typography>
            <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
              Save looks from AI Stylist or Mix & Match and mark them as worn to build your wardrobe memory.
            </Typography>
            <Button label="Discover Looks" onPress={() => router.push('/stylist')} />
          </GlassSurface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  plannerBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  statsCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    color: colors.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  centerLoading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  outfitList: {
    gap: spacing.md,
  },
  outfitCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  outfitTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markWornBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 5,
    paddingHorizontal: spacing.xs + 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markWornText: {
    fontWeight: '700',
    fontSize: 11,
  },
  thumbsRow: {
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  thumbWrapper: {
    width: 68,
    alignItems: 'center',
  },
  outfitThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 4,
  },
  thumbName: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewLookBtn: {
    minWidth: 100,
  },
  underusedSection: {
    marginTop: spacing.xs,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    letterSpacing: 0.8,
  },
  garmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  garmentCard: {
    width: '47%',
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
  },
  garmentInfo: {
    padding: spacing.xs,
  },
  garmentCat: {
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  garmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
