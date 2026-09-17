import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../../constants/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, active }) => {
  return (
    <View
      style={[
        styles.container,
        active && styles.activeBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const EditorialCard = Card;
export const GlassSurface = Card;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  activeBorder: {
    borderColor: colors.surfaceBorderActive,
  },
});
