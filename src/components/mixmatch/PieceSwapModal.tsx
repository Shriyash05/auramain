import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { Typography } from '../ui/Typography';
import { colors, radii, spacing, shadows } from '../../constants/theme';
import { X, Plus, Check, Shirt } from 'lucide-react-native';

interface PieceSwapModalProps {
  visible: boolean;
  category: GarmentCategory | null;
  categoryLabel: string;
  availableGarments: Garment[];
  selectedGarment?: Garment;
  onSelectGarment: (garment: Garment) => void;
  onClose: () => void;
  onAddNew: () => void;
}

export const PieceSwapModal: React.FC<PieceSwapModalProps> = ({
  visible,
  category,
  categoryLabel,
  availableGarments,
  selectedGarment,
  onSelectGarment,
  onClose,
  onAddNew,
}) => {
  if (!visible || !category) return null;

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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Typography variant="caption" color={colors.textMuted} style={styles.sheetTag}>
                SWAP COMPONENT
              </Typography>
              <Typography variant="title" style={styles.sheetTitle}>
                {categoryLabel} Alternatives
              </Typography>
              <Typography variant="caption" color={colors.textSecondary}>
                {availableGarments.length} pieces in your wardrobe
              </Typography>
            </View>

            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Garments List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {availableGarments.map((garment) => {
              const isCurrent = selectedGarment?.id === garment.id;
              const imgUri = garment.processed_image || garment.original_image;

              return (
                <TouchableOpacity
                  key={garment.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    onSelectGarment(garment);
                    onClose();
                  }}
                  style={[
                    styles.garmentRow,
                    isCurrent ? styles.garmentRowSelected : styles.garmentRowUnselected,
                  ]}
                >
                  <View style={styles.thumbWrapper}>
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Shirt size={20} color={colors.textMuted} />
                      </View>
                    )}
                  </View>

                  <View style={styles.detailsCol}>
                    <Typography variant="body" style={styles.itemName} numberOfLines={1}>
                      {garment.name}
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary}>
                      {garment.fit || 'Regular'} • {garment.primary_color}
                      {garment.material ? ` • ${garment.material}` : ''}
                    </Typography>
                  </View>

                  {isCurrent ? (
                    <View style={styles.activeCheck}>
                      <Check size={14} color={colors.textInverse} />
                    </View>
                  ) : (
                    <Typography variant="caption" color={colors.textSecondary} style={styles.selectText}>
                      Select
                    </Typography>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Add New Garment Option */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onAddNew();
              }}
              style={styles.addOptionCard}
            >
              <View style={styles.addIconCircle}>
                <Plus size={16} color={colors.text} />
              </View>
              <View style={styles.addTextCol}>
                <Typography variant="body" style={styles.addTitle}>
                  Add New {categoryLabel}
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  Upload a photo to expand your styling alternatives
                </Typography>
              </View>
            </TouchableOpacity>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '78%',
    paddingBottom: spacing.xl,
    ...shadows.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTag: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 18,
    color: colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  garmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  garmentRowUnselected: {
    borderColor: colors.border,
  },
  garmentRowSelected: {
    borderColor: colors.borderDark,
    backgroundColor: colors.surface,
  },
  thumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.sm,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  activeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: {
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
  addOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.xs,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addTextCol: {
    flex: 1,
  },
  addTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
