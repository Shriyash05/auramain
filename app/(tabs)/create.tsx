import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMixMatch } from '../../src/hooks/useMixMatch';
import { CATEGORY_LABELS } from '../../src/constants/categories';
import { Typography } from '../../src/components/ui/Typography';
import { OutfitStack } from '../../src/components/mixmatch/OutfitStack';
import { GarmentSwiper } from '../../src/components/mixmatch/GarmentSwiper';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { Heart, ThumbsDown, Bookmark, Sparkles } from 'lucide-react-native';

export default function CreateScreen() {
  const router = useRouter();
  const {
    garments,
    categorizedGarments,
    selectedSlots,
    activeCategory,
    setActiveCategory,
    selectGarmentForCategory,
    outfitName,
    setOutfitName,
    saveCurrentOutfit,
    recordFeedback,
    isSaving,
  } = useMixMatch();

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    const saved = await saveCurrentOutfit();
    if (saved) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      Alert.alert('Outfit Saved', `"${saved.name}" has been saved to your collection.`);
    } else {
      Alert.alert('Unable to Save', 'Please select at least one garment before saving an outfit.');
    }
  };

  const handleLike = () => {
    recordFeedback('like');
    Alert.alert('Feedback Recorded', 'AURA noted your style preference for this look.');
  };

  const handleDislike = () => {
    recordFeedback('dislike');
    Alert.alert('Feedback Recorded', 'AURA will avoid similar combinations.');
  };

  const availableInActiveCategory = categorizedGarments[activeCategory] || [];
  const currentSelectedForCategory = selectedSlots[activeCategory];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Typography variant="label" color={colors.textMuted}>
              STUDIO
            </Typography>
            <Typography variant="title" style={styles.title}>
              Mix & Match
            </Typography>
          </View>

          {/* Quick Like / Dislike / Save Feedback row */}
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleDislike}
              style={styles.feedbackIconBtn}
            >
              <ThumbsDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleLike}
              style={styles.feedbackIconBtn}
            >
              <Heart size={16} color={colors.like} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Outfit Name Input */}
        <View style={styles.nameRow}>
          <TextInput
            value={outfitName}
            onChangeText={setOutfitName}
            placeholder="Name this look..."
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
          />
        </View>

        {/* The Live Outfit Stack */}
        <OutfitStack
          selectedSlots={selectedSlots}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* Category Garment Swiper */}
        <View style={styles.swiperSection}>
          <GarmentSwiper
            garments={availableInActiveCategory}
            selectedGarment={currentSelectedForCategory}
            onSelect={(garment) => selectGarmentForCategory(activeCategory, garment)}
            onAddPress={() => router.push('/garment/add')}
            categoryName={CATEGORY_LABELS[activeCategory]}
          />
        </View>

        {/* Save & Try On Actions */}
        <View style={styles.actionSection}>
          <Button
            label="Virtual Try-On"
            variant="secondary"
            onPress={() => router.push('/mirror')}
            icon={<Sparkles size={17} color={colors.text} />}
            size="lg"
            style={styles.tryOnButton}
          />
          <Button
            label={savedSuccess ? 'Saved to Collection' : 'Save Outfit'}
            onPress={handleSave}
            loading={isSaving}
            icon={<Bookmark size={17} color={colors.textInverse} />}
            size="lg"
            style={styles.saveButton}
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
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    color: colors.text,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  feedbackIconBtn: {
    backgroundColor: colors.surface,
    padding: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  nameRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  nameInput: {
    fontSize: 16,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    fontFamily: 'System',
    fontWeight: '500',
  },
  swiperSection: {
    marginTop: spacing.md,
  },
  actionSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  tryOnButton: {
    width: '100%',
  },
  saveButton: {
    width: '100%',
  },
});
