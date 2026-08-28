import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { OutfitMemoryService } from '../../src/services/memory/outfitMemoryService';
import { Outfit } from '../../src/types/outfit';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { LogOut, User as UserIcon, Sparkles, ChevronRight, Bookmark, Calendar, Clock, BarChart3, Shield } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [utilizationStats, setUtilizationStats] = useState<{ totalWears: number; utilizationRate: number }>({
    totalWears: 0,
    utilizationRate: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const outfits = await DatabaseService.getOutfits(user.id);
      setSavedOutfits(outfits);
      const stats = await OutfitMemoryService.getGarmentWearStats(user.id);
      setUtilizationStats({
        totalWears: stats.totalWears,
        utilizationRate: stats.utilizationRate,
      });
    }
    loadData();
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of AURA?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="title" style={styles.title}>
            Profile & Style
          </Typography>
        </View>

        {/* User Card */}
        <GlassSurface style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <UserIcon size={32} color={colors.text} />
          </View>
          <View style={styles.userInfo}>
            <Typography variant="title" style={styles.userName}>
              {user?.display_name || 'AURA Stylist'}
            </Typography>
            <Typography variant="caption" color={colors.textSecondary}>
              {user?.email || 'Guest Explorer Mode'}
            </Typography>
          </View>
        </GlassSurface>

        {/* 1. Style Evolution & Wear Memory Metrics */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            STYLE EVOLUTION & WEAR INTELLIGENCE
          </Typography>
          <GlassSurface style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Typography variant="display" style={styles.metricVal}>
                {utilizationStats.utilizationRate}%
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                CLOSET UTILIZATION
              </Typography>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Typography variant="display" style={styles.metricVal}>
                {utilizationStats.totalWears}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                TOTAL OUTFITS WORN
              </Typography>
            </View>
          </GlassSurface>
        </View>

        {/* 2. Wardrobe Memory & Planner Hub */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            WARDROBE MEMORY & PLANNING
          </Typography>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
            style={styles.navRowCard}
          >
            <View style={styles.navRowLeft}>
              <View style={styles.navIconBox}>
                <Clock size={18} color={colors.text} />
              </View>
              <View>
                <Typography variant="body" style={styles.navRowTitle}>
                  Wardrobe Wear History
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  View worn looks & underused items
                </Typography>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/planner')}
            style={styles.navRowCard}
          >
            <View style={styles.navRowLeft}>
              <View style={styles.navIconBox}>
                <Calendar size={18} color={colors.text} />
              </View>
              <View>
                <Typography variant="body" style={styles.navRowTitle}>
                  Look Planner
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Schedule outfits for upcoming occasions
                </Typography>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 3. Creator Mode Studio Access */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            CREATOR WORKSPACE
          </Typography>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/creator' as any)}
            style={styles.creatorCard}
          >
            <View style={styles.creatorCardLeft}>
              <View style={styles.creatorIconBox}>
                <Sparkles size={20} color={colors.text} />
              </View>
              <View style={styles.creatorTextCol}>
                <Typography variant="title" style={styles.creatorTitle}>
                  Creator Studio
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Shoots, Multi-Look Styling, Lookbooks & Shareable Outfits
                </Typography>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 4. Style Preferences Summary */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            CAPTURED STYLE PREFERENCES
          </Typography>
          <GlassSurface style={styles.prefsCard}>
            <View style={styles.prefRow}>
              <Typography variant="caption" color={colors.textMuted}>
                VIBES & AESTHETICS
              </Typography>
              <Typography variant="body" style={styles.prefVal}>
                {user?.appearance?.style_vibes?.join(', ') || 'Minimalist, Contemporary'}
              </Typography>
            </View>
            <View style={styles.divider} />
            <View style={styles.prefRow}>
              <Typography variant="caption" color={colors.textMuted}>
                FIT / SILHOUETTE PREFERENCE
              </Typography>
              <Typography variant="body" style={styles.prefVal}>
                {user?.appearance?.fit_preference || 'Relaxed / Contemporary'}
              </Typography>
            </View>
          </GlassSurface>
        </View>

        {/* 4. Saved Outfits Breakdown */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            SAVED LOOKS ({savedOutfits.length})
          </Typography>
          {savedOutfits.length > 0 ? (
            <View style={styles.outfitsList}>
              {savedOutfits.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/outfit/${o.id}` as any)}
                  style={styles.outfitRow}
                >
                  <View style={styles.outfitRowLeft}>
                    <Bookmark size={16} color={colors.text} />
                    <View>
                      <Typography variant="body" style={styles.outfitName}>
                        {o.name}
                      </Typography>
                      <Typography variant="caption" color={colors.textMuted}>
                        {o.garment_ids.length} Pieces • Worn {o.worn_count || 0} times
                      </Typography>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyOutfits}>
              <Typography variant="body" color={colors.textSecondary}>
                No saved looks yet. Use AI Stylist or Mix & Match to save outfits.
              </Typography>
            </GlassSurface>
          )}
        </View>

        {/* 5. AURA Research Contributor Program */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            AURA FASHION RESEARCH
          </Typography>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/research' as any)}
            style={styles.navRowCard}
          >
            <View style={styles.navRowLeft}>
              <View style={styles.navIconBox}>
                <Shield size={18} color={colors.text} />
              </View>
              <View>
                <Typography variant="body" style={styles.navRowTitle}>
                  Research Contributor Program
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Help improve AURA with voluntary garment contributions
                </Typography>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.footer}>
          <Button
            label="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            icon={<LogOut size={16} color={colors.error} />}
            textStyle={{ color: colors.error }}
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    color: colors.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  metricsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 26,
    color: colors.text,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  navRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    ...shadows.subtle,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navRowTitle: {
    fontWeight: '600',
  },
  creatorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  creatorCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  creatorIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  creatorTextCol: {
    flex: 1,
  },
  creatorTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  prefsCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  prefRow: {
    marginVertical: 4,
  },
  prefVal: {
    color: colors.text,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  outfitsList: {
    gap: spacing.xs,
  },
  outfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outfitRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  outfitName: {
    fontWeight: '600',
    color: colors.text,
  },
  emptyOutfits: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
