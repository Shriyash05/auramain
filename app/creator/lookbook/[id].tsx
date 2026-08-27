import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/hooks/useAuth';
import { CreatorService } from '../../../src/services/creator/creatorService';
import { Lookbook } from '../../../src/types/creator';
import { Typography } from '../../../src/components/ui/Typography';
import { Button } from '../../../src/components/ui/Button';
import { GlassSurface } from '../../../src/components/ui/GlassSurface';
import { colors, spacing, radii } from '../../../src/constants/theme';
import { ArrowLeft, BookOpen, Trash2 } from 'lucide-react-native';

export default function LookbookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [lookbook, setLookbook] = useState<Lookbook | null>(null);

  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      const list = await CreatorService.getLookbooks(user.id);
      const found = list.find((b) => b.id === id);
      if (found) setLookbook(found);
    }
    load();
  }, [user, id]);

  const handleDelete = () => {
    if (!user || !lookbook) return;
    Alert.alert('Delete Lookbook', 'Remove this lookbook collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await CreatorService.deleteLookbook(user.id, lookbook.id);
          router.back();
        },
      },
    ]);
  };

  if (!lookbook) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading lookbook...
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
            {lookbook.title}
          </Typography>
          <TouchableOpacity activeOpacity={0.7} onPress={handleDelete} style={styles.deleteBtn}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <GlassSurface style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <BookOpen size={16} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.heroBadge}>
              LOOKBOOK COLLECTION
            </Typography>
          </View>
          <Typography variant="title" style={styles.heroTitle}>
            {lookbook.title}
          </Typography>
          {lookbook.description ? (
            <Typography variant="body" color={colors.textSecondary} style={styles.heroDesc}>
              {lookbook.description}
            </Typography>
          ) : null}
          <Typography variant="caption" color={colors.textMuted} style={styles.heroMeta}>
            {lookbook.look_ids.length} Published Looks in Collection
          </Typography>
        </GlassSurface>

        {/* Looks in Lookbook */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            COLLECTION LOOKS ({lookbook.look_ids.length})
          </Typography>
          <GlassSurface style={styles.emptyCard}>
            <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
              Looks published with tags are automatically connected to this collection.
            </Typography>
          </GlassSurface>
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
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroBadge: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    marginVertical: 4,
  },
  heroDesc: {
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  emptyCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  emptyText: {
    textAlign: 'center',
  },
});
