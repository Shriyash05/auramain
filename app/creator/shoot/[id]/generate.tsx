import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../../src/hooks/useAuth';
import { CreatorService } from '../../../../src/services/creator/creatorService';
import { ShootStylingService, GeneratedLookOption } from '../../../../src/services/creator/shootStylingService';
import { DatabaseService } from '../../../../src/services/database/databaseService';
import { Shoot } from '../../../../src/types/creator';
import { Garment } from '../../../../src/types/garment';
import { Typography } from '../../../../src/components/ui/Typography';
import { Button } from '../../../../src/components/ui/Button';
import { GlassSurface } from '../../../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../../../src/constants/theme';
import { ArrowLeft, Sparkles, Check } from 'lucide-react-native';

export default function GenerateLooksScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [looks, setLooks] = useState<GeneratedLookOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function generate() {
      if (!user || !id) return;
      try {
        setIsLoading(true);
        const s = await CreatorService.getShootById(user.id, id);
        if (!s) return;
        setShoot(s);

        const generated = await ShootStylingService.generateShootLookSet(user.id, s, 4);
        setLooks(generated);
      } catch (e) {
        Alert.alert('Notice', 'Could not generate looks. Make sure your wardrobe has tops and bottoms.');
      } finally {
        setIsLoading(false);
      }
    }
    generate();
  }, [user, id]);

  const toggleLookSelection = (index: number) => {
    setLooks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, is_selected: !l.is_selected } : l))
    );
  };

  const getCandidateGarmentList = (opt: GeneratedLookOption): Garment[] => {
    const { top, bottom, shoes, outerwear, accessory } = opt.candidate.garments;
    return [top, bottom, shoes, outerwear, accessory].filter(Boolean) as Garment[];
  };

  const handleAddSelectedToShoot = async () => {
    if (!user || !shoot) return;
    const selected = looks.filter((l) => l.is_selected);
    if (selected.length === 0) {
      Alert.alert('Selection', 'Please select at least one look to add to the shoot.');
      return;
    }

    try {
      setIsSaving(true);
      for (const opt of selected) {
        const garmentList = getCandidateGarmentList(opt);
        const garmentIds = garmentList.map((g) => g.id);

        // Save Outfit
        const savedOutfit = await DatabaseService.saveOutfit({
          user_id: user.id,
          name: opt.name,
          source: 'aura_stylist',
          garment_ids: garmentIds,
          occasion: shoot.occasion as any,
          notes: opt.rationale,
          favorite: true,
        });

        // Attach as ShootLook
        await CreatorService.addShootLook(user.id, {
          shoot_id: shoot.id,
          outfit_id: savedOutfit.id,
          name: opt.name,
          status: 'selected',
          tagged_garment_ids: garmentIds,
          notes: opt.rationale,
        });
      }

      Alert.alert('Looks Added', `Added ${selected.length} styled looks to "${shoot.name}".`, [
        { text: 'View Board', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not save looks to shoot board.');
    } finally {
      setIsSaving(false);
    }
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
            Multi-Look Styling
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Typography variant="title" style={styles.loadingTitle}>
              Composing Look Set...
            </Typography>
            <Typography variant="body" color={colors.textSecondary} style={styles.loadingSub}>
              Optimizing wardrobe coverage, color variance, and silhouette diversity for "{shoot?.concept}".
            </Typography>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Typography variant="body" color={colors.textSecondary} style={styles.introText}>
              AURA generated {looks.length} diverse styling options using clothes in your closet. Select the looks you want for this shoot.
            </Typography>

            <View style={styles.looksList}>
              {looks.map((opt, idx) => {
                const garmentList = getCandidateGarmentList(opt);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => toggleLookSelection(idx)}
                    style={[styles.lookOptionCard, opt.is_selected && styles.selectedOptionCard]}
                  >
                    <View style={styles.lookOptionHeader}>
                      <Typography variant="title" style={styles.lookOptionName}>
                        {opt.name}
                      </Typography>
                      <View style={[styles.checkbox, opt.is_selected && styles.checkboxActive]}>
                        {opt.is_selected && <Check size={14} color={colors.textInverse} />}
                      </View>
                    </View>

                    {/* Garment thumbnails row */}
                    <View style={styles.garmentsRow}>
                      {garmentList.map((g) => (
                        <View key={g.id} style={styles.garmentThumbCard}>
                          <Image
                            source={{ uri: g.processed_image || g.original_image }}
                            style={styles.garmentThumb}
                            resizeMode="cover"
                          />
                          <Typography variant="caption" numberOfLines={1} style={styles.garmentName}>
                            {g.name}
                          </Typography>
                        </View>
                      ))}
                    </View>

                    <Typography variant="caption" color={colors.textMuted} style={styles.rationaleText}>
                      {opt.rationale}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Button
                label={`Add ${looks.filter((l) => l.is_selected).length} Looks to Shoot Board`}
                variant="primary"
                onPress={handleAddSelectedToShoot}
                loading={isSaving}
                icon={<Sparkles size={16} color={colors.textInverse} />}
              />
            </View>
          </ScrollView>
        )}
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
    marginBottom: spacing.md,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingTitle: {
    fontSize: 20,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  loadingSub: {
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  introText: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  looksList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  lookOptionCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedOptionCard: {
    borderColor: colors.text,
  },
  lookOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lookOptionName: {
    fontSize: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  garmentsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  garmentThumbCard: {
    width: '23%',
    alignItems: 'center',
  },
  garmentThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 2,
  },
  garmentName: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  rationaleText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    marginTop: spacing.xs,
  },
});
