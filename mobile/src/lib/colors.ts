import { usePlannerStore } from '../store/usePlannerStore';

const light = {
  bg: '#fafaf9',
  surface: '#fff',
  text: '#1c1917',
  textSecondary: '#78716c',
  textMuted: '#a8a29e',
  border: '#e7e5e4',
  checkboxBorder: '#d6d3d1',
  checkboxDone: '#a8a29e',
  accent: '#1c1917',
  accentText: '#fff',
  pill: '#f5f5f4',
  danger: '#dc2626',
};

const dark = {
  bg: '#1c1917',
  surface: '#292524',
  text: '#fafaf9',
  textSecondary: '#a8a29e',
  textMuted: '#78716c',
  border: '#44403c',
  checkboxBorder: '#57534e',
  checkboxDone: '#78716c',
  accent: '#fafaf9',
  accentText: '#1c1917',
  pill: '#292524',
  danger: '#ef4444',
};

export type Colors = typeof light;

export function useColors(): Colors {
  const theme = usePlannerStore((s) => s.theme);
  return theme === 'dark' ? dark : light;
}
