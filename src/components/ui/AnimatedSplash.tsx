import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { colors, typography, radii, spacing } from '../../constants/theme';
import { Sparkles } from 'lucide-react-native';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const containerFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence: Fade in & scale up slightly, wait, then fade out container
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(700),
      Animated.timing(containerFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [fadeAnim, scaleAnim, containerFade, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.badge}>
          <Sparkles size={14} color={colors.text} />
          <Text style={styles.badgeText}>PERSONAL FASHION INTELLIGENCE</Text>
        </View>
        <Text style={styles.brandTitle}>AURA</Text>
        <Text style={styles.brandTagline}>Your wardrobe. Understood.</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.text,
    fontFamily: typography.interface.fontFamily,
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: colors.text,
    fontFamily: typography.editorial.fontFamily,
    marginBottom: spacing.xs,
  },
  brandTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: typography.interface.fontFamily,
    letterSpacing: -0.2,
  },
});
