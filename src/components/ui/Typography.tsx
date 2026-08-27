import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { colors, typography } from '../../constants/theme';

interface EditorialTextProps extends TextProps {
  variant?: 'hero' | 'display' | 'title' | 'body' | 'label' | 'caption';
  color?: string;
  style?: TextStyle;
  children: React.ReactNode;
}

export const Typography: React.FC<EditorialTextProps> = ({
  variant = 'body',
  color = colors.text,
  style,
  children,
  ...props
}) => {
  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'hero':
        return {
          fontSize: typography.sizes.hero,
          fontWeight: '800',
          letterSpacing: -1.2,
          lineHeight: 48,
        };
      case 'display':
        return {
          fontSize: typography.sizes.display,
          fontWeight: '700',
          letterSpacing: -0.8,
          lineHeight: 40,
        };
      case 'title':
        return {
          fontSize: typography.sizes.xl,
          fontWeight: '600',
          letterSpacing: -0.5,
          lineHeight: 28,
        };
      case 'body':
        return {
          fontSize: typography.sizes.base,
          fontWeight: '400',
          lineHeight: 22,
          color: colors.textSecondary,
        };
      case 'label':
        return {
          fontSize: typography.sizes.sm,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        };
      case 'caption':
        return {
          fontSize: typography.sizes.xs,
          fontWeight: '400',
          color: colors.textMuted,
        };
    }
  };

  return (
    <Text style={[styles.base, getVariantStyle(), { color }, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.interface.fontFamily,
  },
});
