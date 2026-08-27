import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { AnimatedSplash } from '../src/components/ui/AnimatedSplash';
import { colors } from '../src/constants/theme';

function RootNavigationLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login
      router.replace('/(auth)/login');
    } else if (user && !user.onboarding_completed && segs[1] !== 'onboarding') {
      // Redirect to onboarding
      router.replace('/(auth)/onboarding');
    } else if (user && user.onboarding_completed && inAuthGroup) {
      // Redirect to main tabs
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      {!splashFinished && (
        <AnimatedSplash onFinish={() => setSplashFinished(true)} />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="garment/add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="garment/confirm"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="garment/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="outfit/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigationLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
