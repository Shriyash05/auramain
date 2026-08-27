import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Typography } from '../src/components/ui/Typography';
import { colors, spacing } from '../src/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <SafeAreaView style={styles.container}>
        <Typography variant="title" style={styles.title}>
          Screen not found
        </Typography>
        <Link href="/(tabs)" style={styles.link}>
          <Typography variant="body" color={colors.accent}>
            Go to home screen
          </Typography>
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    marginBottom: spacing.md,
    color: colors.text,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
});
