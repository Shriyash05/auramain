import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { PlannerService } from '../../src/services/memory/plannerService';
import { DatabaseService } from '../../src/services/database/databaseService';
import { PlannedEvent } from '../../src/types/memory';
import { Outfit } from '../../src/types/outfit';
import { Garment } from '../../src/types/garment';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../src/constants/theme';
import { ArrowLeft, Plus, Calendar, Check, Trash2, SlidersHorizontal } from 'lucide-react-native';

export default function PlannerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [events, setEvents] = useState<PlannedEvent[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlanner = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const evts = await PlannerService.getEvents(user.id);
      const outs = await DatabaseService.getOutfits(user.id);
      const garms = await DatabaseService.getGarments(user.id);
      setEvents(evts);
      setOutfits(outs);
      setGarments(garms);
    } catch (e) {
      console.error('[Planner] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanner();
  }, [user]);

  const handleCompleteEvent = async (event: PlannedEvent) => {
    if (!user) return;
    try {
      await PlannerService.completeEvent(user.id, event.id);
      Alert.alert('Event Completed', `"${event.title}" marked as completed and outfit logged as worn.`);
      loadPlanner();
    } catch (e) {
      Alert.alert('Error', 'Could not complete event.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;
    Alert.alert('Delete Event', 'Are you sure you want to remove this planned event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await PlannerService.deleteEvent(user.id, eventId);
          loadPlanner();
        },
      },
    ]);
  };

  const upcomingEvents = events.filter((e) => e.status === 'planned');
  const pastEvents = events.filter((e) => e.status === 'completed');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Look Planner
          </Typography>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/planner/create')}
            style={styles.addBtn}
          >
            <Plus size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Action Hero */}
        <GlassSurface style={styles.heroCard}>
          <Typography variant="title" style={styles.heroTitle}>
            Plan What to Wear
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.heroSubtitle}>
            Schedule upcoming dates, dinners, or work meetings and assign your favorite looks in advance.
          </Typography>
          <Button
            label="Schedule New Event"
            onPress={() => router.push('/planner/create')}
            icon={<Plus size={16} color={colors.textInverse} />}
          />
        </GlassSurface>

        {/* 1. Upcoming Schedule */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            UPCOMING SCHEDULE
          </Typography>

          {loading ? (
            <ActivityIndicator size="large" color={colors.text} style={styles.loader} />
          ) : upcomingEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {upcomingEvents.map((evt) => {
                const plannedOutfit = outfits.find((o) => o.id === evt.outfit_id);
                const matchedPieces = plannedOutfit
                  ? garments.filter((g) => plannedOutfit.garment_ids.includes(g.id))
                  : [];

                return (
                  <GlassSurface key={evt.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <View>
                        <Typography variant="caption" color={colors.textMuted} style={styles.eventDate}>
                          {evt.event_date} {evt.event_time ? `• ${evt.event_time}` : ''}
                        </Typography>
                        <Typography variant="title" style={styles.eventTitle}>
                          {evt.title}
                        </Typography>
                        <Typography variant="caption" color={colors.textSecondary}>
                          Occasion: {evt.occasion}
                        </Typography>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteEvent(evt.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    {/* Assigned Outfit Preview */}
                    {plannedOutfit ? (
                      <View style={styles.outfitPreviewBox}>
                        <Typography variant="caption" color={colors.textMuted} style={styles.plannedLabel}>
                          PLANNED LOOK: {plannedOutfit.name}
                        </Typography>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.thumbsRow}
                        >
                          {matchedPieces.map((g) => (
                            <Image
                              key={g.id}
                              source={{ uri: g.processed_image || g.original_image }}
                              style={styles.pieceThumb}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      </View>
                    ) : (
                      <View style={styles.unassignedBox}>
                        <Typography variant="caption" color={colors.textMuted}>
                          No outfit assigned yet
                        </Typography>
                        <Button
                          label="Choose Look"
                          variant="secondary"
                          size="sm"
                          onPress={() => router.push('/stylist')}
                        />
                      </View>
                    )}

                    {/* Action Bar */}
                    <View style={styles.eventActions}>
                      <Button
                        label="Mark as Worn"
                        variant="primary"
                        size="sm"
                        onPress={() => handleCompleteEvent(evt)}
                        icon={<Check size={14} color={colors.textInverse} />}
                        style={styles.actionBtn}
                      />
                    </View>
                  </GlassSurface>
                );
              })}
            </View>
          ) : (
            <GlassSurface style={styles.emptyCard}>
              <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
                No upcoming events scheduled. Tap below to plan your first look.
              </Typography>
              <Button
                label="Plan an Event"
                variant="secondary"
                onPress={() => router.push('/planner/create')}
              />
            </GlassSurface>
          )}
        </View>

        {/* 2. Past Completed Events */}
        {pastEvents.length > 0 && (
          <View style={styles.section}>
            <Typography variant="label" style={styles.sectionHeading}>
              COMPLETED EVENTS
            </Typography>
            <View style={styles.eventsList}>
              {pastEvents.map((evt) => (
                <GlassSurface key={evt.id} style={styles.pastCard}>
                  <View>
                    <Typography variant="body" style={styles.pastTitle}>
                      {evt.title}
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted}>
                      {evt.event_date} • {evt.occasion}
                    </Typography>
                  </View>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.completedBadge}>
                    Completed
                  </Typography>
                </GlassSurface>
              ))}
            </View>
          </View>
        )}
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
  addBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventDate: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 17,
    marginVertical: 2,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  outfitPreviewBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  plannedLabel: {
    fontWeight: '700',
    fontSize: 10,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  thumbsRow: {
    gap: spacing.xs,
  },
  pieceThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  unassignedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginVertical: spacing.xs,
  },
  eventActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    minWidth: 120,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pastCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  pastTitle: {
    fontWeight: '600',
  },
  completedBadge: {
    fontWeight: '700',
  },
});
