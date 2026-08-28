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

export default function ResearchConsentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('guest_user');
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const user = await AuthService.getCurrentSession();
        const uid = user ? user.id : 'guest_user';
        setCurrentUserId(uid);
        const profile = await ContributorImageService.getProfile(uid);
        setIsEnrolled(profile.status === 'active');
      } catch (e) {
        console.error('Error loading contributor status:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const handleJoin = async () => {
    setEnrolling(true);
    try {
      await ContributorImageService.updateConsent(currentUserId, 'active');
      Alert.alert(
        'Welcome to AURA Research',
        'Thank you for helping us understand real fashion. You can now contribute garments from your closet whenever you choose.',
        [{ text: 'Continue', onPress: () => router.replace('/research/dashboard' as any) }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not update consent status. Please try again.');
    } finally {
      setEnrolling(false);
    }
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FASHION RESEARCH</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.kicker}>AURA RESEARCH INITIATIVE</Text>
          <Text style={styles.title}>Help AURA understand real clothing.</Text>
          <Text style={styles.subtitle}>
            A voluntary, privacy-first contributor program to train open, ethical garment understanding models on real-world style.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="camera" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>WHAT YOU CONTRIBUTE</Text>
          </View>
          <Text style={styles.sectionBody}>
            Garment photos and stylist-verified attribute tags that you explicitly choose to contribute from your wardrobe.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="cpu" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>WHY IT MATTERS</Text>
          </View>
          <Text style={styles.sectionBody}>
            AI models often fail on real-world clothing—ambient indoor lighting, wrinkles, and relaxed tailoring. Your contributions help build independent, non-commercial research datasets.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="shield" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>PRIVACY & ZERO TRACKING</Text>
          </View>
          <Text style={styles.sectionBody}>
            • EXIF and device metadata are automatically purged.{'\n'}
            • User identity is decoupled into anonymous research sample IDs.{'\n'}
            • Normal wardrobe items are NEVER collected automatically.{'\n'}
            • You can withdraw from future research at any time.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>100% OPTIONAL</Text>
          </View>
          <Text style={styles.sectionBody}>
            AURA's core styling, mix & match, and wardrobe features work completely without joining. Participation is purely voluntary.
          </Text>
        </View>

        <View style={styles.actions}>
          {isEnrolled ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/research/dashboard' as any)}
            >
              <Text style={styles.primaryBtnText}>VIEW RESEARCH DASHBOARD</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleJoin}
                disabled={enrolling}
              >
                {enrolling ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>JOIN RESEARCH PROGRAM</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.back()}
                disabled={enrolling}
              >
                <Text style={styles.secondaryBtnText}>NOT NOW</Text>
              </TouchableOpacity>
            </>
          )}
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
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.text,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 28,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#8C7A6B',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: colors.text,
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EFEA',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.text,
  },
  sectionBody: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.text,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
