import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { Input } from '../../src/components/ui/Input';
import { colors, spacing } from '../../src/constants/theme';

const STYLE_PREFERENCES = [
  'Minimalist',
  'Streetwear',
  'Tailored / Smart',
  'Casual Everyday',
  'Monochrome',
  'Vintage / Retro',
  'Quiet Luxury',
  'Athleisure',
];

const FIT_PREFERENCES = [
  { id: 'oversized', label: 'Oversized' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'tailored', label: 'Tailored' },
  { id: 'slim', label: 'Slim / Fitted' },
] as const;

export default function OnboardingScreen() {
  const { updateProfile } = useAuth();
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Minimalist', 'Casual Everyday']);
  const [selectedFit, setSelectedFit] = useState<'oversized' | 'tailored' | 'relaxed' | 'slim' | 'balanced'>('relaxed');
  const [height, setHeight] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      await updateProfile({
        onboarding_completed: true,
        appearance: {
          style_vibes: selectedStyles,
          fit_preference: selectedFit,
          height_cm: height ? parseInt(height, 10) : undefined,
        },
      });
    } catch (e) {
      console.error('[Onboarding] Completion error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Typography variant="label" color={colors.textMuted}>
            STEP 1 OF 1 • STYLE PROFILE
          </Typography>
          <Typography variant="display" style={styles.title}>
            Personalize your styling aesthetic
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            AURA tailors daily recommendations and outfit compositions to what fits you best.
          </Typography>
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>
            Favorite Style Vibes
          </Typography>
          <View style={styles.chipsGrid}>
            {STYLE_PREFERENCES.map((style) => (
              <Chip
                key={style}
                label={style}
                selected={selectedStyles.includes(style)}
                onPress={() => toggleStyle(style)}
                style={styles.chip}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>
            Preferred Silhouette & Fit
          </Typography>
          <View style={styles.chipsGrid}>
            {FIT_PREFERENCES.map((fit) => (
              <Chip
                key={fit.id}
                label={fit.label}
                selected={selectedFit === fit.id}
                onPress={() => setSelectedFit(fit.id)}
                style={styles.chip}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>
            Height (Optional)
          </Typography>
          <Input
            placeholder="e.g. 175 cm"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.footer}>
          <Button
            label="Enter AURA"
            onPress={handleComplete}
            loading={isSubmitting}
            size="lg"
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
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginBottom: spacing.xxs,
  },
  footer: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
