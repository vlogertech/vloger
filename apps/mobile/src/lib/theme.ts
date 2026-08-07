import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN = { width, height };

export const COLORS = {
  gold: '#C9A84C',
  goldDim: '#8a6f32',
  black: '#111111',
  blackSecondary: '#1a1a1a',
  blackTertiary: '#222222',
  border: '#2a2a2a',
  borderLight: '#1e1e1e',
  white: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#777777',
  textMuted: '#555555',
  textDim: '#444444',
  green: '#22c55e',
  red: '#ef4444',
  transparent: 'transparent',
} as const;

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const FONT = {
  thin: '200' as const,
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
} as const;

export const RADIUS = { sm: 2, md: 8, lg: 16, full: 9999 } as const;
