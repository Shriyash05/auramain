import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { Typography } from '../../src/components/ui/Typography';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing } from '../../src/constants/theme';
import { Sparkles } from 'lucide-react-native';

export default function LoginScreen() {
  const { loginWithEmail, loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      await loginWithEmail(email);
    } catch (e: any) {
      setError(e.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      await loginAsGuest();
    } catch (e: any) {
      setError(e.message || 'Unable to start guest session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Sparkles size={14} color={colors.accent} />
              <Typography variant="caption" color={colors.accent} style={styles.badgeText}>
                PERSONAL FASHION INTELLIGENCE
              </Typography>
            </View>
            <Typography variant="hero" style={styles.title}>
              AURA
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Your wardrobe. Your style. Connected into effortless daily looks.
            </Typography>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              error={error}
            />

            <Button
              label="Continue with Email"
              onPress={handleEmailLogin}
              loading={isLoading}
              style={styles.primaryButton}
            />

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Typography variant="caption" style={styles.orText}>
                OR
              </Typography>
              <View style={styles.line} />
            </View>

            <Button
              label="Explore as Guest"
              variant="secondary"
              onPress={handleGuestLogin}
              disabled={isLoading}
              style={styles.guestButton}
            />
          </View>

          <View style={styles.footer}>
            <Typography variant="caption" style={styles.footerText}>
              By continuing, you agree to AURA's Privacy Policy. Your wardrobe photos and body data remain private.
            </Typography>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  header: {
    marginTop: spacing.xxl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    marginVertical: spacing.xxl,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  orText: {
    marginHorizontal: spacing.md,
    color: colors.textMuted,
  },
  guestButton: {
    marginTop: 0,
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  footerText: {
    textAlign: 'center',
    color: colors.textMuted,
    lineHeight: 18,
  },
});
