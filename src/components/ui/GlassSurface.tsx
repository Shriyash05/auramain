import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../constants/theme';

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  active?: boolean;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({ children, style, active }) => {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  activeBorder: {
    borderColor: colors.glassBorderActive,
  },
});
