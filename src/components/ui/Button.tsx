import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
    };

    switch (size) {
      case 'sm':
        Object.assign(base, { paddingVertical: spacing.xs, paddingHorizontal: spacing.md });
        break;
      case 'md':
        Object.assign(base, { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xl });
        break;
      case 'lg':
        Object.assign(base, { paddingVertical: spacing.md, paddingHorizontal: spacing.xxl });
        break;
    }

    switch (variant) {
      case 'primary':
        Object.assign(base, {
          backgroundColor: colors.text, // Solid editorial black
          ...shadows.subtle,
        });
        break;
      case 'secondary':
        Object.assign(base, {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.subtle,
        });
        break;
      case 'outline':
        Object.assign(base, {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.borderDark,
        });
        break;
      case 'ghost':
        Object.assign(base, {
          backgroundColor: 'transparent',
        });
        break;
    }

    if (disabled || loading) {
      Object.assign(base, { opacity: 0.5 });
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      letterSpacing: -0.2,
      fontFamily: typography.interface.fontFamily,
    };

    switch (size) {
      case 'sm':
        base.fontSize = typography.sizes.sm;
        break;
      case 'md':
        base.fontSize = typography.sizes.base;
        break;
      case 'lg':
        base.fontSize = typography.sizes.md;
        break;
    }

    switch (variant) {
      case 'primary':
        base.color = colors.textInverse; // Crisp White
        break;
      case 'secondary':
      case 'outline':
      case 'ghost':
        base.color = colors.text; // Charcoal Black
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textInverse : colors.text}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon ? { marginLeft: spacing.xs } : undefined, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
