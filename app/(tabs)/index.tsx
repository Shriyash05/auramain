import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useGarments } from '../../src/hooks/useGarments';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, radii, spacing } from '../../src/constants/theme';
import { Sparkles, Plus, ArrowRight, Layers, Sun } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { garments } = useGarments('all');

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Contextual Header */}
        <View style={styles.header}>
          <View style={styles.contextBadge}>
            <Sun size={14} color={colors.warning} />
            <Typography variant="caption" color={colors.textSecondary}>
              68°F • Clear & Mild
            </Typography>
          </View>
          <Typography variant="hero" style={styles.greetingTitle}>
            {greeting()}, {user?.display_name?.split(' ')[0] || 'there'}.
          </Typography>
          <Typography variant="body" style={styles.greetingSubtitle}>
            {garments.length > 0
              ? `You have ${garments.length} pieces in your closet. Ready for today's look?`
              : "Let's digitize your wardrobe so AURA can compose your daily outfits."}
          </Typography>
        </View>

        {/* Hero Fashion Moment */}
        <View style={styles.heroSection}>
          <GlassSurface style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Sparkles size={13} color={colors.accent} />
              <Typography variant="caption" color={colors.accent} style={styles.heroBadgeText}>
                TODAY'S SELECTION
              </Typography>
            </View>

            <Typography variant="title" style={styles.heroTitle}>
              Relaxed Monochrome Look
            </Typography>
            <Typography variant="caption" color={colors.textSecondary} style={styles.heroDesc}>
              Tailored for today's mild weather and casual schedule.
            </Typography>

            {garments.length >= 2 ? (
              <View style={styles.heroGarmentPreview}>
                <View style={styles.previewGrid}>
                  {garments.slice(0, 3).map((g) => (
                    <View key={g.id} style={styles.previewThumbContainer}>
                      <Image
                        source={{ uri: g.processed_image || g.original_image }}
                        style={styles.previewThumb}
                        resizeMode="cover"
                      />
                      <Typography variant="caption" style={styles.thumbLabel} numberOfLines={1}>
                        {g.category}
                      </Typography>
                    </View>
                  ))}
                </View>
                <Button
                  label="Style in Mix & Match"
                  onPress={() => router.push('/(tabs)/create')}
                  size="md"
                  style={styles.heroButton}
                />
              </View>
            ) : (
              <View style={styles.emptyHero}>
                <View style={styles.emptyIconCircle}>
                  <Layers size={24} color={colors.accent} />
                </View>
                <Typography variant="body" style={styles.emptyText}>
                  Add at least a top and a bottom to unlock daily outfit compositions.
                </Typography>
                <Button
                  label="Add First Clothing Item"
                  onPress={() => router.push('/garment/add')}
                  icon={<Plus size={16} color={colors.textInverse} />}
                  size="md"
                />
              </View>
            )}
          </GlassSurface>
        </View>

        {/* Quick Actions / Shortcuts */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            EXPLORE WORKSPACE
          </Typography>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/garment/add')}
              style={styles.actionCard}
            >
              <View style={styles.actionIconContainer}>
                <Plus size={20} color={colors.text} />
              </View>
              <Typography variant="title" style={styles.actionTitle}>
                Add Clothing
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Snap or upload garments
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/create')}
              style={styles.actionCard}
            >
              <View style={styles.actionIconContainer}>
                <Sparkles size={20} color={colors.accent} />
              </View>
              <Typography variant="title" style={styles.actionTitle}>
                Mix & Match
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Active outfit studio
              </Typography>
            </TouchableOpacity>
          </View>
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
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  greetingTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  greetingSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  heroSection: {
    marginBottom: spacing.xxl,
  },
  heroCard: {
    padding: spacing.xl,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  heroBadgeText: {
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    marginBottom: 4,
  },
  heroDesc: {
    marginBottom: spacing.lg,
  },
  heroGarmentPreview: {
    marginTop: spacing.xs,
  },
  previewGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  previewThumbContainer: {
    flex: 1,
    alignItems: 'center',
  },
  previewThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHighlight,
  },
  thumbLabel: {
    marginTop: 4,
    textTransform: 'capitalize',
  },
  heroButton: {
    marginTop: spacing.xs,
  },
  emptyHero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
});
