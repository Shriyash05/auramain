/**
 * AURA Design System - Approved Light Fashion Editorial Theme
 * Source of truth: Figma Design ("AURA — Premium Fashion App")
 * 
 * Aesthetic:
 * - Warm cream / off-white foundation (#F9F9F8, #F4F3EE)
 * - Pure white surfaces and elevated cards (#FFFFFF)
 * - Deep charcoal / pure black editorial typography (#111111, #44464D)
 * - Restrained, minimalist fashion accent (Editorial Black / Subtle Warm Taupe)
 * - Ultra-clean borders (#E8E6E1, #DFDCD5)
 * - Crisp, image-first hierarchy, zero tacky glassmorphism or dark neon AI glows
 */

export const colors = {
  // Foundations
  background: '#F9F9F8',
  backgroundSecondary: '#F3F2ED',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F4F3EE',
  surfaceHighlight: '#EBE9E3',
  
  // Editorial Clean Overlays & Surfaces
  overlay: 'rgba(17, 17, 17, 0.4)',
  surfaceBorder: '#E8E6E1',
  surfaceBorderActive: '#111111',

  // Restrained Fashion Accents (Editorial Black / Minimalist Tint)
  accent: '#111111',
  accentSecondary: '#44464D',
  accentSubtle: '#F0EFEA',
  accentHighlight: '#8B6D55',

  // Text Hierarchy (High-contrast editorial charcoal & black)
  text: '#111111',
  textSecondary: '#55575E',
  textMuted: '#8E9098',
  textInverse: '#FFFFFF',

  // Status & Feedback
  success: '#15803D',
  warning: '#B45309',
  error: '#DC2626',
  like: '#E11D48',

  // Borders & Dividers
  border: '#E8E6E1',
  borderLight: '#F0EFEA',
  borderDark: '#111111',
  divider: '#EBE9E3',
};

export const typography = {
  // Editorial (Hero & Statements)
  editorial: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  // Interface (Labels, Metadata, Actions)
  interface: {
    fontFamily: 'System',
    letterSpacing: -0.1,
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 34,
    hero: 42,
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
  lg: 18,
  xl: 24,
  pill: 9999,
};

export const shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
};
