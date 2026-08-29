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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';
import { DatabaseService } from '../../src/services/database/databaseService';
import { ContributorImageService } from '../../src/services/research/contributorImageService';
import { AuthService } from '../../src/services/auth/authService';
import { Garment } from '../../src/types/garment';
import {
  ContributionCaptureContext,
  ContributionDifficulty,
  PhotographyContext,
  LightingContext,
  GarmentCondition,
  BackgroundContext,
} from '../../src/types/contributor';
import { GarmentTaxonomyLabels, AuraCategory, AuraFit, AuraMaterial } from '../../src/types/garmentTaxonomy';

const CONTEXT_OPTIONS: PhotographyContext[] = [
  'flat_lay',
  'on_body',
  'hanger',
  'folded',
  'held_in_hand',
];

const LIGHTING_OPTIONS: LightingContext[] = [
  'indoor_neutral',
  'daylight',
  'warm_tungsten',
  'cool_led',
  'low_light',
  'shadowed',
];

const BACKGROUND_OPTIONS: BackgroundContext[] = [
  'clean',
  'bedroom',
  'closet',
  'floor',
  'street',
  'cluttered',
];

const CONDITION_OPTIONS: GarmentCondition[] = [
  'pristine',
  'wrinkled',
  'folded',
  'partially_obscured',
];

const DIFFICULTY_OPTIONS: ContributionDifficulty[] = ['easy', 'normal', 'hard', 'adversarial'];

export default function ResearchContributeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('guest_user');
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [selectedContext, setSelectedContext] = useState<PhotographyContext>('flat_lay');
  const [selectedLighting, setSelectedLighting] = useState<LightingContext>('indoor_neutral');
  const [selectedBackground, setSelectedBackground] = useState<BackgroundContext>('clean');
  const [selectedCondition, setSelectedCondition] = useState<GarmentCondition>('pristine');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ContributionDifficulty>('normal');

  useEffect(() => {
    async function load() {
      try {
        const user = await AuthService.getCurrentSession();
        const uid = user ? user.id : 'guest_user';
        setCurrentUserId(uid);

        const profile = await ContributorImageService.getProfile(uid);
        if (profile.status !== 'active') {
          Alert.alert(
            'Enrollment Required',
            'Please enroll in the AURA Fashion Research program before contributing.',
            [{ text: 'View Details', onPress: () => router.replace('/research' as any) }]
          );
          return;
        }

        const userGarments = await DatabaseService.getGarments(uid);
        setGarments(userGarments);
        if (userGarments.length > 0) {
          setSelectedGarment(userGarments[0]);
        }
      } catch (e) {
        console.error('Error loading garments for contribution:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async () => {
    if (!selectedGarment) {
      Alert.alert('Selection Required', 'Please select a garment to contribute.');
      return;
    }

    setSubmitting(true);
    try {
      const labels: GarmentTaxonomyLabels = {
        category: selectedGarment.category as AuraCategory,
        subcategory: (selectedGarment.subcategory || 't_shirt') as any,
        primary_color_hex: selectedGarment.primary_color || '#111111',
        color_family: 'black',
        fit: (selectedGarment.fit || 'Regular') as AuraFit,
        silhouette: 'straight',
        pattern: (selectedGarment.pattern || 'solid') as any,
        material: (selectedGarment.material || 'cotton') as AuraMaterial,
        formality_score: 0.5,
        occasions: selectedGarment.occasions as any[] || ['Casual'],
        seasons: selectedGarment.season ? [selectedGarment.season as any] : ['All Season'],
      };

      await ContributorImageService.submitContribution({
        userId: currentUserId,
        garment: selectedGarment,
        labels,
        difficulty: selectedDifficulty,
        captureContext: selectedContext as any,
        detailedContext: {
          photography_context: selectedContext,
          lighting: selectedLighting,
          condition: selectedCondition,
          background: selectedBackground,
          camera_view: 'smartphone',
        },
        challengeNotes: `Contributed via AURA mobile client from wardrobe item ${selectedGarment.id}`,
      });

      Alert.alert(
        'Contribution Submitted',
        'Your garment has been sanitized and staged for human review. It will be validated before entering the research dataset.',
        [{ text: 'View Dashboard', onPress: () => router.replace('/research/dashboard' as any) }]
      );
    } catch (e: any) {
      Alert.alert('Submission Error', e.message || 'Could not submit contribution.');
    } finally {
      setSubmitting(false);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CONTRIBUTE GARMENT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Garment */}
        <Text style={styles.stepTitle}>1. SELECT FROM WARDROBE</Text>
        {garments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No garments in your wardrobe.</Text>
            <TouchableOpacity onPress={() => router.push('/garment/add' as any)} style={styles.addGarmentBtn}>
              <Text style={styles.addGarmentText}>ADD A GARMENT FIRST</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.garmentScroll}>
            {garments.map((g) => {
              const isSelected = selectedGarment?.id === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.garmentThumb, isSelected && styles.garmentThumbSelected]}
                  onPress={() => setSelectedGarment(g)}
                >
                  <Image
                    source={{ uri: g.processed_image || g.original_image }}
                    style={styles.thumbImg}
                  />
                  <Text style={styles.thumbLabel} numberOfLines={1}>
                    {g.name || g.category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {selectedGarment && (
          <>
            {/* Step 2: Review Attributes */}
            <Text style={styles.stepTitle}>2. REVIEW ATTRIBUTES</Text>
            <View style={styles.attributeCard}>
              <View style={styles.attrRow}>
                <Text style={styles.attrLabel}>CATEGORY</Text>
                <Text style={styles.attrVal}>{selectedGarment.category.toUpperCase()}</Text>
              </View>
              <View style={styles.attrRow}>
                <Text style={styles.attrLabel}>FIT</Text>
                <Text style={styles.attrVal}>{selectedGarment.fit || 'Regular'}</Text>
              </View>
              <View style={styles.attrRow}>
                <Text style={styles.attrLabel}>MATERIAL</Text>
                <Text style={styles.attrVal}>{selectedGarment.material || 'Cotton'}</Text>
              </View>
              <View style={styles.attrRow}>
                <Text style={styles.attrLabel}>PATTERN</Text>
                <Text style={styles.attrVal}>{selectedGarment.pattern || 'Solid'}</Text>
              </View>
            </View>

            {/* Step 3: Capture Context */}
            <Text style={styles.stepTitle}>3. PHOTO CONTEXT & LIGHTING</Text>
            <Text style={styles.stepSubtitle}>
              Help us learn how this photo was captured (wrinkles, lighting, background).
            </Text>

            <Text style={[styles.stepSubtitle, { marginTop: 8, fontWeight: '600' }]}>CAPTURE STYLE</Text>
            <View style={styles.chipsWrap}>
              {CONTEXT_OPTIONS.map((ctx) => {
                const isSelected = selectedContext === ctx;
                return (
                  <TouchableOpacity
                    key={ctx}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedContext(ctx)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {ctx.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.stepSubtitle, { marginTop: 8, fontWeight: '600' }]}>LIGHTING CONDITION</Text>
            <View style={styles.chipsWrap}>
              {LIGHTING_OPTIONS.map((l) => {
                const isSelected = selectedLighting === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedLighting(l)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {l.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.stepSubtitle, { marginTop: 8, fontWeight: '600' }]}>GARMENT CONDITION</Text>
            <View style={styles.chipsWrap}>
              {CONDITION_OPTIONS.map((cond) => {
                const isSelected = selectedCondition === cond;
                return (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedCondition(cond)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cond.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.stepSubtitle, { marginTop: 8, fontWeight: '600' }]}>BACKGROUND ENVIRONMENT</Text>
            <View style={styles.chipsWrap}>
              {BACKGROUND_OPTIONS.map((bg) => {
                const isSelected = selectedBackground === bg;
                return (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedBackground(bg)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {bg.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 4: Difficulty */}
            <Text style={styles.stepTitle}>4. ESTIMATED DIFFICULTY</Text>
            <View style={styles.chipsWrap}>
              {DIFFICULTY_OPTIONS.map((diff) => {
                const isSelected = selectedDifficulty === diff;
                return (
                  <TouchableOpacity
                    key={diff}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedDifficulty(diff)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {diff.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 5: Privacy Guarantee & Submit */}
            <View style={styles.privacyBox}>
              <Feather name="lock" size={14} color="#8C7A6B" />
              <Text style={styles.privacyText}>
                EXIF tags and location metadata are automatically stripped before staging. Your user ID is isolated.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>CONFIRM & STAGE CONTRIBUTION</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  emptyBox: {
    padding: 20,
    backgroundColor: '#FAFAF8',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  addGarmentBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.text,
    borderRadius: 4,
  },
  addGarmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
  },
  garmentScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  garmentThumb: {
    width: 84,
    marginRight: 10,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: '#FAFAF8',
  },
  garmentThumbSelected: {
    borderColor: colors.text,
  },
  thumbImg: {
    width: '100%',
    height: 84,
    resizeMode: 'cover',
  },
  thumbLabel: {
    fontSize: 10,
    padding: 4,
    textAlign: 'center',
    color: colors.text,
  },
  attributeCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EFEA',
    gap: 8,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attrLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#888',
  },
  attrVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0DFDC',
    backgroundColor: '#FAFAF8',
  },
  chipSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F4F0',
    padding: 12,
    borderRadius: 6,
    marginVertical: 16,
  },
  privacyText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: colors.text,
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
