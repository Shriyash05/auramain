import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { Typography } from '../../src/components/ui/Typography';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { Compass } from 'lucide-react-native';

const MOODS = [
  {
    id: '1',
    title: 'Urban Monochrome',
    vibe: 'Minimalist • Clean Lines',
    garments: 'Wide-leg trousers & heavy cotton tee',
    image: require('../../assets/curated/asset_0.png'),
  },
  {
    id: '2',
    title: 'Relaxed Layering',
    vibe: 'Streetwear • Contemporary',
    garments: 'Oversized blazer & vintage denim',
    image: require('../../assets/curated/asset_1.png'),
  },
  {
    id: '3',
    title: 'Evening Editorial',
    vibe: 'Tailored • Sleek',
    garments: 'Structured coat & Chelsea boots',
    image: require('../../assets/curated/asset_2.png'),
  },
];

export default function InspirationScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Compass size={13} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.badgeText}>
              CURATED MOODBOARDS
            </Typography>
          </View>
          <Typography variant="title" style={styles.title}>
            Inspiration
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Editorial aesthetics to spark new wardrobe combinations.
          </Typography>
        </View>

        <View style={styles.cardList}>
          {MOODS.map((mood) => (
            <View key={mood.id} style={styles.moodCard}>
              <View style={styles.moodImageContainer}>
                <Image
                  source={mood.image}
                  style={styles.moodImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.moodInfo}>
                <Typography variant="caption" color={colors.textMuted} style={styles.moodVibe}>
                  {mood.vibe}
                </Typography>
                <Typography variant="title" style={styles.moodTitle}>
                  {mood.title}
                </Typography>
                <Typography variant="body" style={styles.moodGarments}>
                  Key pieces: {mood.garments}
                </Typography>
              </View>
            </View>
          ))}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  cardList: {
    gap: spacing.lg,
  },
  moodCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  moodImageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surfaceMuted,
  },
  moodImage: {
    width: '100%',
    height: '100%',
  },
  moodInfo: {
    padding: spacing.md,
  },
  moodVibe: {
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  moodTitle: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  moodGarments: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
