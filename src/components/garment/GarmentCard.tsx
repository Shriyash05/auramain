import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Garment } from '../../types/garment';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { Heart, Trash2 } from 'lucide-react-native';

interface GarmentCardProps {
  garment: Garment;
  onPress: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
}

export const GarmentCard: React.FC<GarmentCardProps> = ({
  garment,
  onPress,
  onToggleFavorite,
  onDelete,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.imageContainer}>
        {garment.original_image ? (
          <Image
            source={{ uri: garment.processed_image || garment.original_image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{garment.category.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.topActions}>
          {onToggleFavorite && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleFavorite();
              }}
              style={styles.iconButton}
            >
              <Heart
                size={16}
                color={garment.favorite ? colors.like : colors.text}
                fill={garment.favorite ? colors.like : 'none'}
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              style={styles.iconButton}
            >
              <Trash2 size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{garment.category}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {garment.name}
        </Text>
        {garment.fit && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {garment.fit} • {garment.primary_color}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  topActions: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  iconButton: {
    backgroundColor: 'rgba(11, 12, 14, 0.75)',
    padding: spacing.xs,
    borderRadius: radii.pill,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(11, 12, 14, 0.8)',
    paddingVertical: 3,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  categoryBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    fontFamily: typography.interface.fontFamily,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
