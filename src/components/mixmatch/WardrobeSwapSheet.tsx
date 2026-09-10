import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory, CATEGORY_LABELS } from '../../constants/categories';
import { SelectedOutfitSlots } from '../../hooks/useMixMatch';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { X, Plus, Check, Shirt } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2;

const CATEGORY_ORDER: GarmentCategory[] = ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'];

interface WardrobeSwapSheetProps {
  visible: boolean;
  initialCategory?: GarmentCategory | null;
  categorizedGarments: Record<GarmentCategory, Garment[]>;
  selectedSlots: SelectedOutfitSlots;
  onSelectGarment: (category: GarmentCategory, garment: Garment) => void;
  onClose: () => void;
  onAddNew?: () => void;
}

/**
 * WardrobeSwapSheet
 * 
 * Image-first closet browsing drawer.
 * Presents user's authentic wardrobe items with category switching,
 * large imagery, and minimal text chrome.
 */
export const WardrobeSwapSheet: React.FC<WardrobeSwapSheetProps> = ({
  visible,
  initialCategory,
  categorizedGarments,
  selectedSlots,
  onSelectGarment,
  onClose,
  onAddNew,
}) => {
  const [activeCategory, setActiveCategory] = useState<GarmentCategory>('tops');

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  if (!visible) return null;

  const currentCategoryGarments = categorizedGarments[activeCategory] || [];
  const selectedForCategory =
    activeCategory === 'tops'
      ? selectedSlots.tops
      : activeCategory === 'bottoms'
      ? selectedSlots.bottoms
      : activeCategory === 'shoes'
      ? selectedSlots.shoes
      : activeCategory === 'outerwear'
      ? selectedSlots.outerwear
      : selectedSlots.accessories;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={styles.sheetContainer}>
          {/* Sheet Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Typography variant="label" style={styles.sheetSubtitle}>
                YOUR WARDROBE
              </Typography>
              <Typography variant="title" style={styles.sheetTitle}>
                Refine Pieces
              </Typography>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {CATEGORY_ORDER.map((cat) => {
              const isActive = activeCategory === cat;
              const count = (categorizedGarments[cat] || []).length;

              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                >
                  <Typography
                    variant="caption"
                    color={isActive ? colors.textInverse : colors.textSecondary}
                    style={styles.tabText}
                  >
                    {CATEGORY_LABELS[cat]} {count > 0 ? `(${count})` : ''}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Wardrobe Items Gallery */}
          <ScrollView
            contentContainerStyle={styles.galleryContainer}
            showsVerticalScrollIndicator={false}
          >
            {currentCategoryGarments.length === 0 ? (
              <View style={styles.emptyGalleryState}>
                <Shirt size={32} color={colors.textMuted} />
                <Typography variant="body" color={colors.textSecondary} style={styles.emptyTitle}>
                  No {CATEGORY_LABELS[activeCategory]} in wardrobe yet
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={styles.emptySubtitle}>
                  Add clothes to customize your complete looks
                </Typography>
              </View>
            ) : (
              <View style={styles.gridRow}>
                {currentCategoryGarments.map((garment) => {
                  const isSelected = selectedForCategory?.id === garment.id;
                  const imgUri = garment.processed_image || garment.original_image;

                  return (
                    <TouchableOpacity
                      key={garment.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        onSelectGarment(activeCategory, garment);
                        onClose();
                      }}
                      style={[styles.garmentCard, isSelected && styles.garmentCardSelected]}
                    >
                      <View style={styles.imageContainer}>
                        {imgUri ? (
                          <Image
                            source={{ uri: imgUri }}
                            style={styles.garmentImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.placeholderImg}>
                            <Shirt size={28} color={colors.textMuted} />
                          </View>
                        )}

                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Check size={12} color={colors.textInverse} />
                          </View>
                        )}
                      </View>

                      <View style={styles.cardInfo}>
                        <Typography
                          variant="caption"
                          color={colors.text}
                          numberOfLines={1}
                          style={styles.garmentName}
                        >
                          {garment.name}
                        </Typography>
                        {garment.primary_color && (
                          <Typography
                            variant="caption"
                            color={colors.textMuted}
                            numberOfLines={1}
                            style={styles.garmentColor}
                          >
                            {garment.primary_color}
                          </Typography>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Bottom Add Action */}
            {onAddNew && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onAddNew();
                }}
                style={styles.addNewCard}
              >
                <Plus size={16} color={colors.text} />
                <Typography variant="caption" color={colors.text} style={styles.addNewText}>
                  Add new piece to closet
                </Typography>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.elevated,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    letterSpacing: 1,
  },
  sheetTitle: {
    fontSize: 20,
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tabPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 12,
  },
  galleryContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  garmentCard: {
    width: COLUMN_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  garmentCardSelected: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  imageContainer: {
    width: '100%',
    height: COLUMN_WIDTH * 1.1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  garmentImage: {
    width: '90%',
    height: '90%',
  },
  placeholderImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  garmentName: {
    fontWeight: '600',
    fontSize: 13,
  },
  garmentColor: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyGalleryState: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  addNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addNewText: {
    fontWeight: '600',
  },
});
