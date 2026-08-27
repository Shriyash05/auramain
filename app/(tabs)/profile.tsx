import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { DatabaseService } from '../../src/services/database/databaseService';
import { Outfit } from '../../src/types/outfit';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { User, Shield, LogOut, Bookmark, Trash2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(true);

  const fetchOutfits = async () => {
    if (!user) return;
    try {
      setLoadingOutfits(true);
      const list = await DatabaseService.getOutfits(user.id);
      setSavedOutfits(list);
    } catch (e) {
      console.error('[Profile] Load outfits error:', e);
    } finally {
      setLoadingOutfits(false);
    }
  };

  useEffect(() => {
    fetchOutfits();
  }, [user]);

  const handleDeleteOutfit = (outfitId: string, name: string) => {
    if (!user) return;
    Alert.alert('Delete Outfit', `Delete "${name}" from your collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteOutfit(user.id, outfitId);
          fetchOutfits();
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of AURA?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Profile Info */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <User size={30} color={colors.text} />
          </View>
          <View style={styles.headerInfo}>
            <Typography variant="title" style={styles.name}>
              {user?.display_name || 'AURA Member'}
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {user?.email || 'Guest Explorer Session'}
            </Typography>
          </View>
        </View>

        {/* Style Preferences Summary */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            STYLE PROFILE
          </Typography>
          <GlassSurface style={styles.card}>
            <View style={styles.row}>
              <Typography variant="caption" color={colors.textSecondary}>
                Fit Preference
              </Typography>
              <Typography variant="caption" color={colors.text} style={styles.valueText}>
                {user?.appearance?.fit_preference || 'Relaxed'}
              </Typography>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Typography variant="caption" color={colors.textSecondary}>
                Style Aesthetics
              </Typography>
              <Typography variant="caption" color={colors.text} style={styles.valueText}>
                {user?.appearance?.style_vibes?.join(', ') || 'Minimalist, Casual'}
              </Typography>
            </View>
          </GlassSurface>
        </View>

        {/* Saved Outfits Collection */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Typography variant="label" style={styles.sectionTitle}>
              SAVED OUTFITS ({savedOutfits.length})
            </Typography>
          </View>

          {savedOutfits.length > 0 ? (
            <View style={styles.outfitList}>
              {savedOutfits.map((outfit) => (
                <View key={outfit.id} style={styles.outfitCard}>
                  <View style={styles.outfitCardHeader}>
                    <View style={styles.outfitIconCircle}>
                      <Bookmark size={15} color={colors.text} />
                    </View>
                    <View style={styles.outfitTitleGroup}>
                      <Typography variant="body" color={colors.text} style={styles.outfitName}>
                        {outfit.name}
                      </Typography>
                      <Typography variant="caption" color={colors.textMuted}>
                        {outfit.garment_ids?.length || 0} Pieces • {new Date(outfit.created_at).toLocaleDateString()}
                      </Typography>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDeleteOutfit(outfit.id, outfit.name)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyOutfitsCard}>
              <Typography variant="body" style={styles.emptyOutfitsText}>
                No saved outfits yet. Create one in the Mix & Match studio!
              </Typography>
            </GlassSurface>
          )}
        </View>

        {/* Privacy & Account Management */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionTitle}>
            PRIVACY & DATA
          </Typography>
          <GlassSurface style={styles.card}>
            <View style={styles.privacyRow}>
              <Shield size={18} color={colors.text} />
              <Typography variant="caption" color={colors.textSecondary} style={styles.privacyText}>
                Your photos and style data are encrypted and privately scoped to your account.
              </Typography>
            </View>
          </GlassSurface>
        </View>

        {/* Sign Out Button */}
        <View style={styles.logoutSection}>
          <Button
            label="Sign Out"
            variant="outline"
            onPress={handleLogout}
            icon={<LogOut size={16} color={colors.text} />}
            size="md"
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
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  valueText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  outfitList: {
    gap: spacing.sm,
  },
  outfitCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  outfitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outfitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  outfitTitleGroup: {
    flex: 1,
  },
  outfitName: {
    fontWeight: '600',
    fontSize: 15,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  emptyOutfitsCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyOutfitsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privacyText: {
    flex: 1,
    lineHeight: 18,
  },
  logoutSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});
