import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Direct route redirecting to AURA Studio tab
 */
export default function StudioRoute() {
  return <Redirect href="/(tabs)/create" />;
}
