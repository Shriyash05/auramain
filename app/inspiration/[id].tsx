import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { InspirationService } from '../../src/services/inspiration/inspirationService';
import { InspirationItem, MatchedPiece } from '../../src/types/inspiration';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Sparkles, Wand2, Bookmark, SlidersHorizontal, Trash2, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function InspirationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [item, setItem] = useState<InspirationItem | null>(null);
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      const list = await InspirationService.getInspirations(user.id);
      const found = list.find((i) => i.id === id);
      if (found) setItem(found);
    }
    load();
  }, [user, id]);

  const handleSaveAsOutfit = async () => {
    if (!user || !item) return;
    try {
      setIsSavingOutfit(true);
      const saved = await InspirationService.saveAuraVersionAsOutfit(user.id, item.id);
      Alert.alert('Outfit Created', `"${saved.name}" has been saved to your wardrobe looks.`);
    } catch (e) {
      Alert.alert('Notice', 'Could not save outfit from current pieces.');
    } finally {
      setIsSavingOutfit(false);
    }
  };

  const handleDelete = () => {
    if (!user || !item) return;
    Alert.alert('Delete Inspiration', 'Remove this saved inspiration?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await InspirationService.deleteInspiration(user.id, item.id);
          router.back();
        },
      },
    ]);
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading inspiration...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const getMatchQualityBadgeColor = (quality: string) => {
    if (quality === 'exact') return colors.text;
    if (quality === 'close' || quality === 'similar') return colors.textSecondary;
    return colors.warning;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Visual Transformation
          </Typography>
          <TouchableOpacity activeOpacity={0.7} onPress={handleDelete} style={styles.deleteBtn}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* 1. Side-by-Side Visual Comparison */}
        <View style={styles.comparisonSection}>
          <View style={styles.imageCol}>
            <Image source={{ uri: item.image_url }} style={styles.comparisonImage} resizeMode="cover" />
            <Typography variant="caption" color={colors.textMuted} style={styles.imageCaption}>
              ORIGINAL INSPIRATION
            </Typography>
          </View>

          <View style={styles.imageCol}>
            <View style={styles.auraVersionStack}>
              {item.matched_pieces
                .filter((m) => m.user_garment)
                .slice(0, 3)
                .map((m) => (
                  <Image
                    key={m.target_piece_category}
                    source={{ uri: m.user_garment?.processed_image || m.user_garment?.original_image }}
                    style={styles.recreationMiniThumb}
                    resizeMode="cover"
                  />
                ))}
            </View>
            <Typography variant="caption" color={colors.text} style={styles.imageCaptionBold}>
              AURA VERSION (MY CLOSET)
            </Typography>
          </View>
        </View>

        {/* 2. Style Formula Rationale */}
        <GlassSurface style={styles.formulaCard}>
          <View style={styles.formulaHeader}>
            <Sparkles size={14} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.formulaBadge}>
              EXTRACTED STYLE FORMULA
            </Typography>
          </View>
          <Typography variant="title" style={styles.formulaTitle}>
            {item.style_formula}
          </Typography>
          <Typography variant="caption" color={colors.textMuted}>
            Aesthetic: {item.aesthetic} • Mood: {item.mood}
          </Typography>
        </GlassSurface>

        {/* 3. Wardrobe Match Breakdown */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            MY WARDROBE PIECE MATCHES
          </Typography>

          <View style={styles.piecesList}>
            {item.matched_pieces.map((piece) => (
              <GlassSurface key={piece.target_piece_category} style={styles.pieceRow}>
                {piece.user_garment ? (
                  <Image
                    source={{ uri: piece.user_garment.processed_image || piece.user_garment.original_image }}
                    style={styles.pieceImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.missingImageBox}>
                    <AlertCircle size={20} color={colors.textMuted} />
                  </View>
                )}

                <View style={styles.pieceDetails}>
                  <Typography variant="caption" color={colors.textMuted} style={styles.pieceCategory}>
                    {piece.target_piece_category}
                  </Typography>
                  <Typography variant="body" style={styles.pieceName}>
                    {piece.user_garment ? piece.user_garment.name : 'Missing in Wardrobe'}
                  </Typography>
                  <View style={styles.badgeRow}>
                    <Typography
                      variant="caption"
                      color={getMatchQualityBadgeColor(piece.match_quality)}
                      style={styles.qualityLabel}
                    >
                      {piece.match_quality === 'exact' ? '✓ ' : '≈ '}
                      {piece.match_label}
                    </Typography>
                  </View>
                </View>
              </GlassSurface>
            ))}
          </View>
        </View>

        {/* 4. Action Buttons */}
        <View style={styles.actionsFooter}>
          <Button
            label="Save as Outfit Look"
            variant="primary"
            onPress={handleSaveAsOutfit}
            loading={isSavingOutfit}
            icon={<Bookmark size={16} color={colors.textInverse} />}
            style={styles.actionBtn}
          />
          <Button
            label="Customize in Studio"
            variant="secondary"
            onPress={() => router.push('/(tabs)/create')}
            icon={<SlidersHorizontal size={16} color={colors.text} />}
            style={styles.actionBtn}
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
  },
  comparisonSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  imageCol: {
    flex: 1,
  },
  comparisonImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 6,
  },
  auraVersionStack: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    gap: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recreationMiniThumb: {
    flex: 1,
    width: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  imageCaption: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  imageCaptionBold: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  formulaCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  formulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  formulaBadge: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  formulaTitle: {
    fontSize: 17,
    marginVertical: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  piecesList: {
    gap: spacing.sm,
  },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  pieceImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  missingImageBox: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceDetails: {
    flex: 1,
  },
  pieceCategory: {
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 9,
  },
  pieceName: {
    fontWeight: '600',
    fontSize: 15,
  },
  badgeRow: {
    marginTop: 2,
  },
  qualityLabel: {
    fontWeight: '600',
    fontSize: 11,
  },
  actionsFooter: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    width: '100%',
  },
});
