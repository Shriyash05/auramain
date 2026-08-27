import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'glass' | 'outline' | 'ghost';
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
          backgroundColor: colors.text, // High-contrast warm off-white
        });
        break;
      case 'secondary':
        Object.assign(base, {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
        });
        break;
      case 'glass':
        Object.assign(base, {
          backgroundColor: colors.glass,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        });
        break;
      case 'outline':
        Object.assign(base, {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.borderLight,
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
        base.color = colors.textInverse;
        break;
      case 'secondary':
      case 'glass':
      case 'outline':
        base.color = colors.text;
        break;
      case 'ghost':
        base.color = colors.accent;
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textInverse : colors.accent}
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
