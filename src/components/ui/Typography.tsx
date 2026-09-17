import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps, StyleProp } from 'react-native';
import { colors, typography } from '../../constants/theme';

interface EditorialTextProps extends TextProps {
  variant?: 'hero' | 'display' | 'title' | 'body' | 'label' | 'caption';
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export const Typography: React.FC<EditorialTextProps> = ({
  variant = 'body',
  color,
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
          letterSpacing: -1,
          lineHeight: 46,
          color: color || colors.text,
        };
      case 'display':
        return {
          fontSize: typography.sizes.display,
          fontWeight: '700',
          letterSpacing: -0.6,
          lineHeight: 38,
          color: color || colors.text,
        };
      case 'title':
        return {
          fontSize: typography.sizes.xl,
          fontWeight: '600',
          letterSpacing: -0.3,
          lineHeight: 26,
          color: color || colors.text,
        };
      case 'body':
        return {
          fontSize: typography.sizes.base,
          fontWeight: '400',
          lineHeight: 22,
          color: color || colors.textSecondary,
        };
      case 'label':
        return {
          fontSize: typography.sizes.sm,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: color || colors.text,
        };
      case 'caption':
        return {
          fontSize: typography.sizes.xs,
          fontWeight: '400',
          color: color || colors.textMuted,
        };
    }
  };

  return (
    <Text style={[styles.base, getVariantStyle(), style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.interface.fontFamily,
  },
});
