import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { OutfitMemoryService } from '../../src/services/memory/outfitMemoryService';
import { Outfit } from '../../src/types/outfit';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Trash2, CheckCircle2, Calendar, Clock } from 'lucide-react-native';

export default function OutfitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [isMarkingWorn, setIsMarkingWorn] = useState(false);

  const load = async () => {
    if (!user || !id) return;
    const outfits = await DatabaseService.getOutfits(user.id);
    const target = outfits.find((o) => o.id === id);
    if (target) {
      setOutfit(target);
      const allGarments = await DatabaseService.getGarments(user.id);
      const matched = allGarments.filter((g) => target.garment_ids.includes(g.id));
      setGarments(matched);
    }
  };

  useEffect(() => {
    load();
  }, [user, id]);

  const handleMarkWorn = async () => {
    if (!user || !outfit) return;
    try {
      setIsMarkingWorn(true);
      await OutfitMemoryService.markOutfitAsWorn(user.id, outfit.id, {
        occasion: outfit.occasion,
      });
      Alert.alert('Look Recorded', 'Marked as worn today. AURA updated your style memory.');
      load();
    } catch (e) {
      Alert.alert('Error', 'Could not record wear.');
    } finally {
      setIsMarkingWorn(false);
    }
  };

  const handleDelete = () => {
    if (!user || !outfit) return;
    Alert.alert('Delete Outfit', 'Remove this saved outfit from your collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteOutfit(user.id, outfit.id);
          router.back();
        },
      },
    ]);
  };

  if (!outfit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading outfit...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Saved Look
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Look Title */}
        <View style={styles.lookHeader}>
          <Typography variant="label" color={colors.textMuted}>
            {outfit.occasion ? outfit.occasion.toUpperCase() : 'MIX & MATCH OUTFIT'}
          </Typography>
          <Typography variant="display" style={styles.lookName}>
            {outfit.name}
          </Typography>

          {/* Wear Stats Badge */}
          <View style={styles.statsBadgeRow}>
            <View style={styles.badge}>
              <Clock size={12} color={colors.text} />
              <Typography variant="caption" color={colors.text} style={styles.badgeText}>
                {outfit.worn_count ? `Worn ${outfit.worn_count} time${outfit.worn_count > 1 ? 's' : ''}` : 'Never worn'}
              </Typography>
            </View>
            {outfit.last_worn && (
              <View style={styles.badge}>
                <Typography variant="caption" color={colors.textSecondary}>
                  Last: {outfit.last_worn}
                </Typography>
              </View>
            )}
          </View>
        </View>

        {/* Mark as Worn Quick Action */}
        <GlassSurface style={styles.actionCard}>
          <View style={styles.actionCardContent}>
            <View>
              <Typography variant="title" style={styles.actionCardTitle}>
                Wearing this look?
              </Typography>
              <Typography variant="caption" color={colors.textSecondary}>
                Log it to build your wear history and style memory.
              </Typography>
            </View>
            <Button
              label="Mark as Worn"
              variant="primary"
              size="sm"
              onPress={handleMarkWorn}
              loading={isMarkingWorn}
              icon={<CheckCircle2 size={15} color={colors.textInverse} />}
            />
          </View>
        </GlassSurface>

        {/* Outfit Pieces Grid */}
        <View style={styles.piecesSection}>
          <Typography variant="label" style={styles.piecesHeading}>
            GARMENT BREAKDOWN
          </Typography>
          <View style={styles.piecesList}>
            {garments.map((g) => (
              <GlassSurface key={g.id} style={styles.pieceCard}>
                <Image
                  source={{ uri: g.processed_image || g.original_image }}
                  style={styles.pieceImage}
                  resizeMode="cover"
                />
                <View style={styles.pieceDetails}>
                  <Typography variant="caption" color={colors.text} style={styles.pieceCategory}>
                    {g.category}
                  </Typography>
                  <Typography variant="body" color={colors.text} style={styles.pieceName}>
                    {g.name}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {g.fit || 'Standard'} • {g.primary_color} • Worn {g.wear_count || 0} times
                  </Typography>
                </View>
              </GlassSurface>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.footerActions}>
          <Button
            label="Schedule for Event"
            variant="secondary"
            onPress={() => router.push('/planner/create')}
            icon={<Calendar size={16} color={colors.text} />}
            style={styles.footerBtn}
          />
          <Button
            label="Delete Look"
            variant="outline"
            onPress={handleDelete}
            icon={<Trash2 size={16} color={colors.error} />}
            textStyle={{ color: colors.error }}
            style={styles.footerBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  lookHeader: {
    marginBottom: spacing.md,
  },
  lookName: {
    color: colors.text,
    marginVertical: 4,
    fontSize: 28,
  },
  statsBadgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  actionCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  actionCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionCardTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  piecesSection: {
    marginBottom: spacing.xl,
  },
  piecesHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  piecesList: {
    gap: spacing.sm,
  },
  pieceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  pieceImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  pieceDetails: {
    flex: 1,
  },
  pieceCategory: {
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  pieceName: {
    fontWeight: '600',
    fontSize: 15,
  },
  footerActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerBtn: {
    width: '100%',
  },
});
