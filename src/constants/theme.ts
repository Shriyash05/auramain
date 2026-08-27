/**
 * AURA Design System - Design Tokens & Theme
 * Sources of truth: Figma Design & docs/04-design-system.md
 * 
 * Aesthetic:
 * - Deep neutral / near-black foundation (#0B0C0E, #121316)
 * - Warm off-white typography and accents (#F5F5F7, #E8E8ED)
 * - Restrained Lavender interactive accent (#B4A0E5, #9B82D8)
 * - Elevated dark surfaces (#181A1F, #22252C)
 * - Glassmorphism, subtle borders, high contrast
 */

export const colors = {
  // Foundations
  background: '#0B0C0E',
  backgroundSecondary: '#121316',
  surface: '#181A1F',
  surfaceElevated: '#20232A',
  surfaceHighlight: '#2A2E38',
  
  // Glassmorphic Overlays
  glass: 'rgba(24, 26, 31, 0.75)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassBorderActive: 'rgba(180, 160, 229, 0.4)',

  // Brand / Restrained Accent (Lavender)
  accent: '#B4A0E5',
  accentDark: '#8F72D6',
  accentLight: '#D7CBF5',
  accentGlow: 'rgba(180, 160, 229, 0.25)',

  // Text Hierarchy
  text: '#F5F5F7',
  textSecondary: '#A0A3AB',
  textMuted: '#666A73',
  textInverse: '#0B0C0E',

  // Status & Feedback
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  like: '#F43F5E',

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  divider: 'rgba(255, 255, 255, 0.06)',
};

export const typography = {
  // Editorial (Hero & Statements)
  editorial: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    letterSpacing: -0.8,
  },
  // Interface (Labels, Metadata, Actions)
  interface: {
    fontFamily: 'System',
    letterSpacing: -0.2,
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 36,
    hero: 44,
  },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
};

export const shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: '#B4A0E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
};
