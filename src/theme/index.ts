export const colors = {
  primary: '#E8791E',
  primaryDark: '#974800',
  primaryLight: '#FFB688',
  background: '#FFFFFF',
  surface: '#FBEDDF',
  surfaceLow: '#FFF1EA',
  surfaceHigh: '#F3DFD4',
  card: '#FFEADF',
  textPrimary: '#1A1A1A',
  textSecondary: '#5A5A5A',
  outline: '#DDC1B1',
  outlineLight: 'rgba(90,90,90,0.15)',
  white: '#FFFFFF',
  black: '#000000',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  error: '#BA1A1A',
  errorBg: '#FFDAD6',
  tertiary: '#006494',
  tertiaryBg: '#CBE6FF',
  secondaryContainer: '#EBDDD0',
  overlay: 'rgba(26,26,26,0.4)',
};

export const spacing = {
  base: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  container: 20,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  headlineLg: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.textPrimary },
  headlineMd: { fontSize: 20, fontWeight: '600' as const, color: colors.textPrimary },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, color: colors.textPrimary },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  labelBold: { fontSize: 12, fontWeight: '700' as const, color: colors.textSecondary },
  labelMd: { fontSize: 12, fontWeight: '500' as const, color: colors.textSecondary },
};

export const shadow = {
  soft: {
    shadowColor: '#241913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
};
