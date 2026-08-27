import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/hooks/useAuth';
import { CreatorService } from '../../../src/services/creator/creatorService';
import { DatabaseService } from '../../../src/services/database/databaseService';
import { Shoot, ShootLook } from '../../../src/types/creator';
import { Garment } from '../../../src/types/garment';
import { Outfit } from '../../../src/types/outfit';
import { Typography } from '../../../src/components/ui/Typography';
import { Button } from '../../../src/components/ui/Button';
import { GlassSurface } from '../../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../../src/constants/theme';
import { ArrowLeft, Sparkles, Camera, Plus, Share2, Tag, Trash2, Calendar, MapPin, CheckCircle2 } from 'lucide-react-native';

export default function ShootDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [looks, setLooks] = useState<ShootLook[]>([]);
  const [outfitsMap, setOutfitsMap] = useState<Record<string, Outfit>>({});
  const [garmentsMap, setGarmentsMap] = useState<Record<string, Garment>>({});

  const loadData = async () => {
    if (!user || !id) return;
    const s = await CreatorService.getShootById(user.id, id);
    if (s) setShoot(s);

    const lk = await CreatorService.getShootLooks(user.id, id);
    setLooks(lk);

    const allOutfits = await DatabaseService.getOutfits(user.id);
    const oMap: Record<string, Outfit> = {};
    allOutfits.forEach((o) => (oMap[o.id] = o));
    setOutfitsMap(oMap);

    const allGarments = await DatabaseService.getGarments(user.id);
    const gMap: Record<string, Garment> = {};
    allGarments.forEach((g) => (gMap[g.id] = g));
    setGarmentsMap(gMap);
  };

  useEffect(() => {
    loadData();
  }, [user, id]);

  const handleDeleteShoot = () => {
    if (!user || !shoot) return;
    Alert.alert('Delete Shoot', 'Remove this campaign and all its styling looks?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await CreatorService.deleteShoot(user.id, shoot.id);
          router.back();
        },
      },
    ]);
  };

  if (!shoot) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading campaign...
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
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title} numberOfLines={1}>
            {shoot.name}
          </Typography>
          <TouchableOpacity activeOpacity={0.7} onPress={handleDeleteShoot} style={styles.deleteBtn}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Campaign Info Card */}
        <GlassSurface style={styles.conceptCard}>
          <View style={styles.conceptHeader}>
            <Sparkles size={14} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.conceptBadge}>
              {shoot.mood?.toUpperCase() || 'EDITORIAL'} • {shoot.occasion?.toUpperCase() || 'CAMPAIGN'}
            </Typography>
          </View>
          <Typography variant="title" style={styles.conceptTitle}>
            {shoot.concept}
          </Typography>
          <View style={styles.metaRow}>
            {shoot.location ? (
              <View style={styles.metaItem}>
                <MapPin size={13} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted}>
                  {shoot.location}
                </Typography>
              </View>
            ) : null}
            {shoot.date ? (
              <View style={styles.metaItem}>
                <Calendar size={13} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted}>
                  {shoot.date}
                </Typography>
              </View>
            ) : null}
          </View>
        </GlassSurface>

        {/* Multi-Look Generation Action */}
        <View style={styles.generateSection}>
          <Button
            label="Generate Multi-Look Set with AI"
            variant="primary"
            onPress={() => router.push(`/creator/shoot/${shoot.id}/generate` as any)}
            icon={<Sparkles size={16} color={colors.textInverse} />}
          />
        </View>

        {/* Multi-Look Styling Board */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            STYLING BOARD ({looks.length} LOOKS)
          </Typography>

          {looks.length > 0 ? (
            <View style={styles.looksList}>
              {looks.map((look) => {
                const outfit = outfitsMap[look.outfit_id];
                const constituentGarments = outfit
                  ? outfit.garment_ids.map((gid) => garmentsMap[gid]).filter(Boolean)
                  : [];

                return (
                  <GlassSurface key={look.id} style={styles.lookCard}>
                    {/* Look Header */}
                    <View style={styles.lookCardHeader}>
                      <Typography variant="title" style={styles.lookName}>
                        {look.name}
                      </Typography>
                      <View style={styles.lookStatusBadge}>
                        <Typography variant="caption" color={colors.text} style={styles.lookStatusText}>
                          {look.status.toUpperCase()}
                        </Typography>
                      </View>
                    </View>

                    {/* Final Photo if uploaded */}
                    {look.final_photo_url && (
                      <View style={styles.finalPhotoBox}>
                        <Image source={{ uri: look.final_photo_url }} style={styles.finalPhotoImage} resizeMode="cover" />
                        <View style={styles.shotBadge}>
                          <CheckCircle2 size={12} color={colors.textInverse} />
                          <Typography variant="caption" color={colors.textInverse} style={styles.shotBadgeText}>
                            FINAL SHOT PHOTO
                          </Typography>
                        </View>
                      </View>
                    )}

                    {/* Constituent Wardrobe Pieces */}
                    <View style={styles.garmentsRow}>
                      {constituentGarments.map((g) => (
                        <View key={g.id} style={styles.garmentThumbCard}>
                          <Image
                            source={{ uri: g.processed_image || g.original_image }}
                            style={styles.garmentThumbImage}
                            resizeMode="cover"
                          />
                          <Typography variant="caption" numberOfLines={1} style={styles.garmentThumbName}>
                            {g.name}
                          </Typography>
                        </View>
                      ))}
                    </View>

                    {/* Actions per look */}
                    <View style={styles.lookActionsRow}>
                      <Button
                        label="Try On in Mirror"
                        variant="outline"
                        onPress={() => router.push('/mirror')}
                        style={styles.lookBtn}
                      />
                      <Button
                        label={look.final_photo_url ? 'Edit Tags' : 'Add Photo & Tag'}
                        variant="secondary"
                        onPress={() =>
                          router.push({
                            pathname: `/creator/shoot/${shoot.id}/tag` as any,
                            params: { lookId: look.id },
                          })
                        }
                        icon={<Tag size={14} color={colors.text} />}
                        style={styles.lookBtn}
                      />
                    </View>
                  </GlassSurface>
                );
              })}
            </View>
          ) : (
            <GlassSurface style={styles.emptyBoard}>
              <Typography variant="body" color={colors.textSecondary} style={styles.emptyBoardText}>
                No looks created for this shoot yet. Tap "Generate Multi-Look Set with AI" to compose your styling board.
              </Typography>
            </GlassSurface>
          )}
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
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  conceptCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  conceptBadge: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  conceptTitle: {
    fontSize: 17,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  generateSection: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  looksList: {
    gap: spacing.md,
  },
  lookCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  lookCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lookName: {
    fontSize: 16,
  },
  lookStatusBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lookStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  finalPhotoBox: {
    marginBottom: spacing.sm,
    position: 'relative',
  },
  finalPhotoImage: {
    width: '100%',
    height: 180,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  shotBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
  },
  shotBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  garmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  garmentThumbCard: {
    width: '23%',
    alignItems: 'center',
  },
  garmentThumbImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 2,
  },
  garmentThumbName: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lookActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lookBtn: {
    flex: 1,
  },
  emptyBoard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  emptyBoardText: {
    textAlign: 'center',
  },
});
