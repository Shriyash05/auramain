import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { Typography } from '../../src/components/ui/Typography';
import { Chip } from '../../src/components/ui/Chip';
import { colors, spacing, radii } from '../../src/constants/theme';
import { Sparkles, Compass } from 'lucide-react-native';

const MOODS = [
  { id: '1', title: 'Urban Monochrome', vibe: 'Minimalist • Clean Lines', garments: 'Wide-leg trousers & heavy cotton tee' },
  { id: '2', title: 'Relaxed Layering', vibe: 'Streetwear • Contemporary', garments: 'Oversized blazer & vintage denim' },
  { id: '3', title: 'Evening Editorial', vibe: 'Tailored • Sleek', garments: 'Structured coat & Chelsea boots' },
];

export default function InspirationScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Compass size={14} color={colors.accent} />
            <Typography variant="caption" color={colors.accent} style={styles.badgeText}>
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
              <View style={styles.moodImagePlaceholder}>
                <Sparkles size={28} color={colors.accent} />
              </View>
              <View style={styles.moodInfo}>
                <Typography variant="caption" color={colors.accent} style={styles.moodVibe}>
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
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 1,
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
  },
  moodImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodInfo: {
    padding: spacing.md,
  },
  moodVibe: {
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.5,
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
