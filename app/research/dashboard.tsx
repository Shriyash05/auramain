import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';
import { ContributorImageService } from '../../src/services/research/contributorImageService';
import { AuthService } from '../../src/services/auth/authService';
import { ContributorStats, ResearchContribution } from '../../src/types/contributor';

export default function ResearchDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('guest_user');
  const [stats, setStats] = useState<ContributorStats | null>(null);
  const [contributions, setContributions] = useState<ResearchContribution[]>([]);
  const [revoking, setRevoking] = useState(false);

  const loadData = async () => {
    try {
      const user = await AuthService.getCurrentSession();
      const uid = user ? user.id : 'guest_user';
      setCurrentUserId(uid);
      const userStats = await ContributorImageService.getStats(uid);
      const userContribs = await ContributorImageService.getUserContributions(uid);
      setStats(userStats);
      setContributions(userContribs);
    } catch (e) {
      console.error('Error loading contributor dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw from Research',
      'Revoking participation will stop all future contributions and mark all your previously submitted images as WITHDRAWN. They will be strictly excluded from all future dataset manifests and model training runs.\n\nNote: Checkpoints trained prior to revocation retain latent weights, but no future models will include your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw Participation',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              await ContributorImageService.updateConsent(currentUserId, 'revoked');
              await loadData();
              Alert.alert('Withdrawn', 'Your research consent has been revoked and contributions withdrawn.');
            } catch (e) {
              Alert.alert('Error', 'Could not withdraw consent.');
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RESEARCH DASHBOARD</Text>
        <TouchableOpacity onPress={() => router.push('/research/contribute' as any)} style={styles.addBtn}>
          <Feather name="plus" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>PROGRAM STATUS</Text>
              <Text
                style={[
                  styles.statusValue,
                  stats?.status === 'active'
                    ? styles.statusActive
                    : stats?.status === 'revoked'
                    ? styles.statusRevoked
                    : styles.statusInactive,
                ]}
              >
                {stats?.status === 'active'
                  ? 'ACTIVE CONTRIBUTOR'
                  : stats?.status === 'revoked'
                  ? 'CONSENT WITHDRAWN'
                  : 'NOT ENROLLED'}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CONSENT V1</Text>
            </View>
          </View>
          {stats?.consented_at && (
            <Text style={styles.consentedDate}>
              Enrolled on: {new Date(stats.consented_at).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats?.total_submitted || 0}</Text>
            <Text style={styles.statLabel}>SUBMITTED</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats?.total_approved || 0}</Text>
            <Text style={styles.statLabel}>APPROVED</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats?.total_awaiting_review || 0}</Text>
            <Text style={styles.statLabel}>IN REVIEW</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats?.total_withdrawn || 0}</Text>
            <Text style={styles.statLabel}>WITHDRAWN</Text>
          </View>
        </View>

        {/* Action Button */}
        {stats?.status === 'active' && (
          <TouchableOpacity
            style={styles.contributeBtn}
            onPress={() => router.push('/research/contribute' as any)}
          >
            <Feather name="upload-cloud" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.contributeBtnText}>CONTRIBUTE A GARMENT</Text>
          </TouchableOpacity>
        )}

        {/* Recent Contributions */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>YOUR CONTRIBUTIONS</Text>
          {contributions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="inbox" size={24} color="#BBB" />
              <Text style={styles.emptyText}>No garments contributed yet.</Text>
              <Text style={styles.emptySubtext}>
                Select an item from your wardrobe to help train AURA on real-world style.
              </Text>
            </View>
          ) : (
            contributions.map((c) => (
              <View key={c.id} style={styles.contribItem}>
                <View style={styles.contribHeader}>
                  <Text style={styles.contribCat}>
                    {c.submitted_labels.category.toUpperCase()} • {c.submitted_labels.subcategory}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      c.status === 'approved'
                        ? styles.pillApproved
                        : c.status === 'withdrawn'
                        ? styles.pillWithdrawn
                        : styles.pillPending,
                    ]}
                  >
                    <Text style={styles.pillText}>{c.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.contribDate}>
                  Sample ID: {c.contributor_sample_id} • Context: {c.capture_context}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Privacy Controls */}
        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>PRIVACY & RIGHT-TO-FORGET</Text>
          <Text style={styles.privacyBody}>
            You retain full ownership of your wardrobe images. You can revoke consent at any time to purge your contributions from all future dataset versions and future training cycles.
          </Text>

          {stats?.status === 'active' ? (
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={handleWithdraw}
              disabled={revoking}
            >
              {revoking ? (
                <ActivityIndicator size="small" color="#D32F2F" />
              ) : (
                <Text style={styles.withdrawBtnText}>WITHDRAW FROM RESEARCH PROGRAM</Text>
              )}
            </TouchableOpacity>
          ) : stats?.status === 'revoked' ? (
            <TouchableOpacity
              style={styles.rejoinBtn}
              onPress={() => router.push('/research' as any)}
            >
              <Text style={styles.rejoinBtnText}>RE-ENROLL IN RESEARCH</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFEA',
  },
  backBtn: {
    padding: 8,
  },
  addBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EFEA',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#8C7A6B',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusActive: {
    color: '#2E7D32',
  },
  statusRevoked: {
    color: '#D32F2F',
  },
  statusInactive: {
    color: '#666',
  },
  badge: {
    backgroundColor: '#EAE8E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.text,
  },
  consentedDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EFEA',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#888',
  },
  contributeBtn: {
    flexDirection: 'row',
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  contributeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  listSection: {
    marginBottom: 28,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EFEA',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  contribItem: {
    backgroundColor: '#FAFAF8',
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0EFEA',
  },
  contribHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contribCat: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillApproved: {
    backgroundColor: '#E8F5E9',
  },
  pillWithdrawn: {
    backgroundColor: '#FFEBEE',
  },
  pillPending: {
    backgroundColor: '#FFF8E1',
  },
  pillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.text,
  },
  contribDate: {
    fontSize: 11,
    color: '#888',
  },
  privacySection: {
    borderTopWidth: 1,
    borderTopColor: '#F0EFEA',
    paddingTop: 20,
  },
  privacyTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.text,
    marginBottom: 8,
  },
  privacyBody: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  withdrawBtn: {
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
  },
  withdrawBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#D32F2F',
  },
  rejoinBtn: {
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.text,
    alignItems: 'center',
  },
  rejoinBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.text,
  },
});
