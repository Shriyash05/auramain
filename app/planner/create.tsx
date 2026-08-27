import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { PlannerService } from '../../src/services/memory/plannerService';
import { DatabaseService } from '../../src/services/database/databaseService';
import { POPULAR_OCCASIONS } from '../../src/services/stylist/contextService';
import { Outfit } from '../../src/types/outfit';
import { Typography } from '../../src/components/ui/Typography';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Calendar, Clock, MapPin, Sparkles } from 'lucide-react-native';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('19:00');
  const [occasion, setOccasion] = useState<string>('Dinner');
  const [location, setLocation] = useState('');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | undefined>();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOutfits() {
      if (!user) return;
      const list = await DatabaseService.getOutfits(user.id);
      setOutfits(list);
      if (list.length > 0) {
        setSelectedOutfitId(list[0].id);
      }
    }
    loadOutfits();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for the event.');
      return;
    }

    try {
      setIsSubmitting(true);
      await PlannerService.createEvent(user.id, {
        title: title.trim(),
        event_date: eventDate,
        event_time: eventTime,
        occasion,
        location: location.trim() || undefined,
        outfit_id: selectedOutfitId,
      });

      Alert.alert('Event Planned', 'Your event and look have been scheduled.');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save event.');
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
            Schedule Look
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* 1. Event Details */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            EVENT DETAILS
          </Typography>
          <Input
            label="Event Name"
            placeholder="e.g. Dinner with Friends, Office Presentation"
            value={title}
            onChangeText={setTitle}
          />
          <Input
            label="Date (YYYY-MM-DD)"
            placeholder="2026-08-30"
            value={eventDate}
            onChangeText={setEventDate}
          />
          <Input
            label="Time (Optional)"
            placeholder="19:30"
            value={eventTime}
            onChangeText={setEventTime}
          />
          <Input
            label="Location (Optional)"
            placeholder="Downtown Bistro"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* 2. Occasion Picker */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            OCCASION
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {POPULAR_OCCASIONS.map((occ) => (
              <Chip
                key={occ}
                label={occ}
                selected={occasion === occ}
                onPress={() => setOccasion(occ)}
              />
            ))}
          </ScrollView>
        </View>

        {/* 3. Assign Outfit */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            ASSIGN A LOOK
          </Typography>
          {outfits.length > 0 ? (
            <View style={styles.outfitOptions}>
              {outfits.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedOutfitId(o.id)}
                  style={[
                    styles.outfitSelectCard,
                    selectedOutfitId === o.id ? styles.outfitSelectActive : undefined,
                  ]}
                >
                  <Typography variant="body" style={styles.outfitOptionName}>
                    {o.name}
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary}>
                    {o.occasion || 'Everyday'} • {o.garment_ids.length} pieces
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.noOutfitsBox}>
              <Typography variant="caption" color={colors.textSecondary}>
                No saved looks yet. You can schedule the event now and assign a look later.
              </Typography>
            </GlassSurface>
          )}
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            label="Schedule Event"
            variant="primary"
            onPress={handleSave}
            loading={isSubmitting}
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
    marginBottom: spacing.lg,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  chipsRow: {
    gap: spacing.xs,
  },
  outfitOptions: {
    gap: spacing.xs,
  },
  outfitSelectCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outfitSelectActive: {
    borderColor: colors.text,
    borderWidth: 2,
    backgroundColor: colors.surfaceMuted,
  },
  outfitOptionName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  noOutfitsBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  footer: {
    marginTop: spacing.md,
  },
});
