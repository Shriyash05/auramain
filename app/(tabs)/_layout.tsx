import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { colors, shadows } from '../../src/constants/theme';
import { Sparkles, Layers, Wand2, Compass, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          ...shadows.subtle,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Sparkles size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color, size }) => <Layers size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color, size }) => <Wand2 size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inspiration"
        options={{
          title: 'Inspiration',
          tabBarIcon: ({ color, size }) => <Compass size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
