import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/hooks/useAuth';
import { CreatorService } from '../../../src/services/creator/creatorService';
import { InspirationService } from '../../../src/services/inspiration/inspirationService';
import { InspirationItem } from '../../../src/types/inspiration';
import { Typography } from '../../../src/components/ui/Typography';
import { Button } from '../../../src/components/ui/Button';
import { Chip } from '../../../src/components/ui/Chip';
import { GlassSurface } from '../../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../../src/constants/theme';
import { ArrowLeft, Sparkles, Compass, Plus } from 'lucide-react-native';

const POPULAR_MOODS = ['Minimalist', 'Editorial', 'Streetwear', 'Old Money', 'Resort', 'Casual'];
const POPULAR_OCCASIONS = ['Editorial', 'Campaign', 'Content Day', 'Lookbook', 'Street Style'];

export default function CreateShootScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [concept, setConcept] = useState('');
  const [mood, setMood] = useState('Editorial');
  const [occasion, setOccasion] = useState('Campaign');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  const [notes, setNotes] = useState('');
  const [inspirations, setInspirations] = useState<InspirationItem[]>([]);
  const [selectedInspirationIds, setSelectedInspirationIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadInspirations() {
      if (!user) return;
      const list = await InspirationService.getInspirations(user.id);
      setInspirations(list);
    }
    loadInspirations();
  }, [user]);

  const toggleInspiration = (id: string) => {
    setSelectedInspirationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateShoot = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a shoot name.');
      return;
    }
    if (!concept.trim()) {
      Alert.alert('Required', 'Please describe the shoot concept.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await CreatorService.createShoot(user.id, {
        name: name.trim(),
        concept: concept.trim(),
        mood,
        occasion,
        location: location.trim(),
        date,
        notes: notes.trim(),
        inspiration_ids: selectedInspirationIds,
      });

      router.replace(`/creator/shoot/${created.id}` as any);
    } catch (e) {
      Alert.alert('Error', 'Could not create shoot campaign.');
    } finally {
      setIsSubmitting(false);
    }
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
            New Shoot Campaign
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Shoot Name & Concept */}
        <GlassSurface style={styles.formCard}>
          <Typography variant="label" style={styles.fieldLabel}>
            SHOOT NAME
          </Typography>
          <TextInput
            style={styles.input}
            placeholder="e.g. Summer Resort Lookbook, Autumn Editorial"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Typography variant="label" style={styles.fieldLabel}>
            CREATIVE CONCEPT & THEME
          </Typography>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Describe the desired aesthetic, textures, layering, and silhouette vibes..."
            placeholderTextColor={colors.textMuted}
            value={concept}
            onChangeText={setConcept}
            multiline
            numberOfLines={3}
          />
        </GlassSurface>

        {/* Mood & Occasion Chips */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            MOOD & AESTHETIC
          </Typography>
          <View style={styles.chipsRow}>
            {POPULAR_MOODS.map((m) => (
              <Chip key={m} label={m} selected={mood === m} onPress={() => setMood(m)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            OCCASION TYPE
          </Typography>
          <View style={styles.chipsRow}>
            {POPULAR_OCCASIONS.map((occ) => (
              <Chip key={occ} label={occ} selected={occasion === occ} onPress={() => setOccasion(occ)} />
            ))}
          </View>
        </View>

        {/* Location & Date */}
        <GlassSurface style={styles.formCard}>
          <Typography variant="label" style={styles.fieldLabel}>
            LOCATION (OPTIONAL)
          </Typography>
          <TextInput
            style={styles.input}
            placeholder="e.g. Goa Beach, Studio B, Downtown Paris"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />

          <Typography variant="label" style={styles.fieldLabel}>
            SHOOT DATE
          </Typography>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="e.g. Oct 24, 2026"
            placeholderTextColor={colors.textMuted}
          />
        </GlassSurface>

        {/* Inspiration Selection */}
        {inspirations.length > 0 && (
          <View style={styles.section}>
            <Typography variant="label" style={styles.sectionHeading}>
              ATTACH SAVED INSPIRATIONS ({selectedInspirationIds.length} SELECTED)
            </Typography>
            <View style={styles.chipsRow}>
              {inspirations.map((insp) => {
                const isSelected = selectedInspirationIds.includes(insp.id);
                return (
                  <Chip
                    key={insp.id}
                    label={`${insp.title} (${insp.aesthetic})`}
                    selected={isSelected}
                    onPress={() => toggleInspiration(insp.id)}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Submit */}
        <View style={styles.footer}>
          <Button
            label="Create Shoot & Build Looks"
            variant="primary"
            onPress={handleCreateShoot}
            loading={isSubmitting}
            icon={<Sparkles size={16} color={colors.textInverse} />}
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
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  formCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: 4,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 15,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    fontFamily: 'System',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footer: {
    marginTop: spacing.md,
  },
});
