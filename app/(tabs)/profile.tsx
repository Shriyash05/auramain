import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { OutfitMemoryService } from '../../src/services/memory/outfitMemoryService';
import { Outfit } from '../../src/types/outfit';
import { AuraUserModel } from '../../src/types/vto';
import { MirrorService } from '../../src/services/vto/mirrorService';
import { PersonalModelOnboardingModal } from '../../src/components/tryon/PersonalModelOnboardingModal';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import {
  LogOut,
  User as UserIcon,
  Sparkles,
  ChevronRight,
  Bookmark,
  Calendar,
  Clock,
  BarChart3,
  Shield,
  CheckCircle2,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [userModel, setUserModel] = useState<AuraUserModel | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [utilizationStats, setUtilizationStats] = useState<{ totalWears: number; utilizationRate: number }>({
    totalWears: 0,
    utilizationRate: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const outfits = await DatabaseService.getOutfits(user.id);
      setSavedOutfits(outfits);
      const model = await MirrorService.getUserModel(user.id);
      setUserModel(model);
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
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {userModel?.primaryFaceUri ? (
              <Image source={{ uri: userModel.primaryFaceUri }} style={styles.avatarImage} />
            ) : (
              <UserIcon size={28} color={colors.text} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Typography variant="title" style={styles.userName}>
              {user?.display_name || 'AURA Member'}
            </Typography>
            <Typography variant="caption" color={colors.textSecondary}>
              {user?.email || 'Guest Explorer Mode'}
            </Typography>
          </View>
        </View>

        {/* Personal AURA Model Hub */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            PERSONAL AURA MODEL
          </Typography>
          <View style={styles.modelCard}>
            <View style={styles.modelCardHeader}>
              <View style={styles.modelCardHeaderLeft}>
                <View style={styles.modelAvatarWrap}>
                  {userModel?.primaryFaceUri ? (
                    <Image source={{ uri: userModel.primaryFaceUri }} style={styles.modelFaceImg} />
                  ) : (
                    <UserIcon size={20} color={colors.text} />
                  )}
                </View>
                <View style={styles.modelStatusCol}>
                  <Typography variant="title" style={styles.modelTitle}>
                    {userModel?.isReady ? 'Personal Model Active' : 'Model Not Configured'}
                  </Typography>
                  <Typography variant="caption" color={colors.textSecondary}>
                    {userModel?.isReady
                      ? 'Proportions, sizes & shape drive Virtual Try-On'
                      : 'Set up your measurements, sizes & face reference'}
                  </Typography>
                </View>
              </View>
              {userModel?.isReady && (
                <View style={styles.readyBadge}>
                  <CheckCircle2 size={12} color={colors.success} />
                  <Typography variant="caption" color={colors.success} style={styles.readyBadgeText}>
                    READY
                  </Typography>
                </View>
              )}
            </View>

            {userModel?.isReady && (
              <View style={styles.modelGrid}>
                <View style={styles.modelGridItem}>
                  <Typography variant="caption" color={colors.textMuted} style={styles.modelGridLabel}>
                    PROPORTIONS
                  </Typography>
                  <Typography variant="body" style={styles.modelGridValue}>
                    {userModel.proportions?.heightCm || 178} cm • {userModel.proportions?.weightKg || 72} kg
                  </Typography>
                </View>
                <View style={styles.modelGridItem}>
                  <Typography variant="caption" color={colors.textMuted} style={styles.modelGridLabel}>
                    USUAL SIZES
                  </Typography>
                  <Typography variant="body" style={styles.modelGridValue}>
                    Top {userModel.sizes?.tops || 'M'} • Bot {userModel.sizes?.bottoms || '32'} • {userModel.sizes?.shoes || 'US 10'}
                  </Typography>
                </View>
                <View style={styles.modelGridItem}>
                  <Typography variant="caption" color={colors.textMuted} style={styles.modelGridLabel}>
                    BODY FRAME
                  </Typography>
                  <Typography variant="body" style={styles.modelGridValue}>
                    {userModel.bodyShape ? userModel.bodyShape.replace('_', ' ').toUpperCase() : 'ATHLETIC'}
                  </Typography>
                </View>
              </View>
            )}

            <View style={styles.modelActionRow}>
              <Button
                label={userModel?.isReady ? 'Update Model' : 'Create Personal Model'}
                variant={userModel?.isReady ? 'outline' : 'primary'}
                size="sm"
                onPress={() => setShowModelModal(true)}
                icon={<Sparkles size={14} color={userModel?.isReady ? colors.text : colors.textInverse} />}
                style={styles.modelActionBtn}
              />
              <Button
                label="Try On & Mirror"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/tryon')}
                style={styles.modelActionBtn}
              />
            </View>
          </View>
        </View>

        {/* 1. Style Evolution & Wear Memory Metrics */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            STYLE EVOLUTION & WEAR INTELLIGENCE
          </Typography>
          <View style={styles.metricsCard}>
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
          </View>
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
          <View style={styles.prefsCard}>
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
          </View>
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
            <View style={styles.emptyOutfits}>
              <Typography variant="body" color={colors.textSecondary}>
                No saved looks yet. Use Studio or Try-On to create outfits.
              </Typography>
            </View>
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

      {/* Personal AURA Model Onboarding / Edit Sheet */}
      <PersonalModelOnboardingModal
        visible={showModelModal}
        userId={user?.id || 'guest_user'}
        onClose={() => setShowModelModal(false)}
        onCompleted={(updatedModel) => {
          setUserModel(updatedModel);
          setShowModelModal(false);
        }}
      />
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: radii.pill,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    color: colors.text,
  },
  modelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  modelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modelCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  modelAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modelFaceImg: {
    width: '100%',
    height: '100%',
  },
  modelStatusCol: {
    flex: 1,
  },
  modelTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modelGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  modelGridItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  modelGridLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  modelGridValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  modelActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modelActionBtn: {
    flex: 1,
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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
    ...shadows.subtle,
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
