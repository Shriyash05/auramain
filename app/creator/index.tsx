import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { CreatorService } from '../../src/services/creator/creatorService';
import { ShareableLookService } from '../../src/services/creator/shareableLookService';
import { CreatorProfile, Shoot, Lookbook, ShareableLook } from '../../src/types/creator';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Plus, Sparkles, Camera, BookOpen, Share2, Calendar, MapPin, ChevronRight } from 'lucide-react-native';

export default function CreatorDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [publicLooks, setPublicLooks] = useState<ShareableLook[]>([]);

  const loadData = async () => {
    if (!user) return;
    const p = await CreatorService.getCreatorProfile(user.id);
    setProfile(p);
    const s = await CreatorService.getShoots(user.id);
    setShoots(s);
    const l = await CreatorService.getLookbooks(user.id);
    setLookbooks(l);
    const allPub = await ShareableLookService.getAllPublicLooks();
    setPublicLooks(allPub.filter((look) => look.user_id === user.id));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Creator Studio
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Creator Hero Card */}
        <GlassSurface style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <View style={styles.avatarBox}>
              <Camera size={22} color={colors.text} />
            </View>
            <View style={styles.profileInfo}>
              <Typography variant="title" style={styles.profileName}>
                {profile?.display_name || 'AURA Creator'}
              </Typography>
              <Typography variant="caption" color={colors.textSecondary} style={styles.profileHandle}>
                @{profile?.handle || 'creator'}
              </Typography>
            </View>
          </View>
          {profile?.bio ? (
            <Typography variant="body" color={colors.textSecondary} style={styles.bioText}>
              {profile.bio}
            </Typography>
          ) : null}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatItem}>
              <Typography variant="title" style={styles.statNum}>
                {shoots.length}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Shoots
              </Typography>
            </View>
            <View style={styles.quickStatItem}>
              <Typography variant="title" style={styles.statNum}>
                {lookbooks.length}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Lookbooks
              </Typography>
            </View>
            <View style={styles.quickStatItem}>
              <Typography variant="title" style={styles.statNum}>
                {publicLooks.length}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Published
              </Typography>
            </View>
          </View>
        </GlassSurface>

        {/* Action: Plan New Shoot */}
        <View style={styles.actionSection}>
          <Button
            label="Plan New Shoot"
            variant="primary"
            onPress={() => router.push('/creator/shoot/create')}
            icon={<Plus size={16} color={colors.textInverse} />}
          />
        </View>

        {/* 1. Shoots Section */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            CAMPAIGNS & SHOOTS ({shoots.length})
          </Typography>
          {shoots.length > 0 ? (
            <View style={styles.shootsList}>
              {shoots.map((shoot) => (
                <TouchableOpacity
                  key={shoot.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/creator/shoot/${shoot.id}` as any)}
                  style={styles.shootCard}
                >
                  <View style={styles.shootCardHeader}>
                    <Typography variant="title" style={styles.shootName}>
                      {shoot.name}
                    </Typography>
                    <View style={styles.statusBadge}>
                      <Typography variant="caption" color={colors.text} style={styles.statusText}>
                        {shoot.status.toUpperCase()}
                      </Typography>
                    </View>
                  </View>
                  <Typography variant="body" color={colors.textSecondary} style={styles.shootConcept}>
                    Concept: {shoot.concept}
                  </Typography>
                  <View style={styles.shootMetaRow}>
                    {shoot.location ? (
                      <View style={styles.metaItem}>
                        <MapPin size={12} color={colors.textMuted} />
                        <Typography variant="caption" color={colors.textMuted}>
                          {shoot.location}
                        </Typography>
                      </View>
                    ) : null}
                    {shoot.date ? (
                      <View style={styles.metaItem}>
                        <Calendar size={12} color={colors.textMuted} />
                        <Typography variant="caption" color={colors.textMuted}>
                          {shoot.date}
                        </Typography>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyCard}>
              <Typography variant="body" color={colors.textSecondary}>
                No shoots planned yet. Start a campaign to generate multi-look styling boards.
              </Typography>
            </GlassSurface>
          )}
        </View>

        {/* 2. Lookbooks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="label" style={styles.sectionHeading}>
              LOOKBOOKS ({lookbooks.length})
            </Typography>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/creator/lookbook')}>
              <Typography variant="caption" color={colors.text} style={styles.viewAllText}>
                Manage →
              </Typography>
            </TouchableOpacity>
          </View>
          {lookbooks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lookbooksRow}>
              {lookbooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/creator/lookbook/${book.id}` as any)}
                  style={styles.lookbookThumbCard}
                >
                  <View style={styles.lookbookCover}>
                    <BookOpen size={24} color={colors.text} />
                  </View>
                  <Typography variant="body" numberOfLines={1} style={styles.lookbookTitle}>
                    {book.title}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {book.look_ids.length} Looks
                  </Typography>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <GlassSurface style={styles.emptyCard}>
              <Typography variant="body" color={colors.textSecondary}>
                Create visual lookbooks to organize your campaign collections.
              </Typography>
            </GlassSurface>
          )}
        </View>

        {/* 3. Published Shareable Looks */}
        {publicLooks.length > 0 && (
          <View style={styles.section}>
            <Typography variant="label" style={styles.sectionHeading}>
              PUBLISHED SHAREABLE LOOKS ({publicLooks.length})
            </Typography>
            <View style={styles.publishedGrid}>
              {publicLooks.map((look) => (
                <TouchableOpacity
                  key={look.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/look/${look.public_share_id}` as any)}
                  style={styles.publishedCard}
                >
                  <Image source={{ uri: look.final_photo_url }} style={styles.publishedImage} resizeMode="cover" />
                  <View style={styles.publishedInfo}>
                    <Typography variant="body" numberOfLines={1} style={styles.publishedTitle}>
                      {look.title}
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted}>
                      {look.views_count || 0} Views • {look.tagged_garments.length} Tagged Pieces
                    </Typography>
                  </View>
                </TouchableOpacity>
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
  title: {
    fontSize: 20,
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  profileCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
  },
  profileHandle: {
    marginTop: 2,
    fontWeight: '600',
  },
  bioText: {
    marginVertical: spacing.xs,
    fontSize: 13,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
  },
  actionSection: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAllText: {
    fontWeight: '700',
  },
  shootsList: {
    gap: spacing.sm,
  },
  shootCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  shootCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shootName: {
    fontSize: 16,
  },
  statusBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  shootConcept: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  shootMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  lookbooksRow: {
    gap: spacing.sm,
  },
  lookbookThumbCard: {
    width: 120,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  lookbookCover: {
    width: 80,
    height: 80,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  lookbookTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  publishedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  publishedCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  publishedImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  publishedInfo: {
    padding: spacing.xs,
  },
  publishedTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
