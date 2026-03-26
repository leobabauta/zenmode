import { usePlannerStore } from '../store/usePlannerStore';

// --- HSL utilities (ported from web colorThemes.ts) ---

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// --- Color presets (matches web app) ---

export interface ColorPreset {
  id: string;
  label: string;
  swatch: string;
}

function makeColors(accent: string, isDark: boolean) {
  const [h, s] = hexToHSL(accent);

  if (isDark) {
    const darkAccent = hslToHex(h, Math.min(s, 60), Math.max(60, Math.min(72, hexToHSL(accent)[2] + 20)));
    const darkTint = hslToHex(h, Math.min(s, 30), 14);
    const darkBg = hslToHex(h, Math.min(s, 25), 11);
    const darkSurface = hslToHex(h, Math.min(s, 20), 16);
    const darkBorder = hslToHex(h, Math.min(s, 18), 20);
    const darkToday = hslToHex(h, Math.min(s, 20), 13);
    return {
      bg: darkBg,
      surface: darkSurface,
      text: '#F0EFEE',
      textSecondary: '#9CA3AF',
      textMuted: '#5C5C7A',
      border: darkBorder,
      checkboxBorder: '#5C5C7A',
      checkboxDone: '#22c55e',
      accent: darkAccent,
      accentText: '#fff',
      accentTint: darkTint,
      todayBg: darkToday,
      pill: darkTint,
      danger: '#ef4444',
      priorityHigh: '#eab308',
      priorityMedium: '#60a5fa',
    };
  }

  const lightAccent = hslToHex(h, Math.min(s, 70), Math.max(40, Math.min(55, hexToHSL(accent)[2])));
  const lightTint = hslToHex(h, Math.min(s, 30), 96);
  const lightToday = hslToHex(h, Math.min(s, 20), 97);
  const lightSurface = hslToHex(h, Math.min(s, 8), 97);
  const lightBorder = hslToHex(h, Math.min(s, 8), 90);
  return {
    bg: '#FFFFFF',
    surface: lightSurface,
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#B0B0B0',
    border: lightBorder,
    checkboxBorder: '#B0B0B0',
    checkboxDone: '#22c55e',
    accent: lightAccent,
    accentText: '#fff',
    accentTint: lightTint,
    todayBg: lightToday,
    pill: lightTint,
    danger: '#dc2626',
    priorityHigh: '#eab308',
    priorityMedium: '#60a5fa',
  };
}

// Default light/dark (Violet) — used when accentColor is null
const defaultLight = {
  bg: '#FFFFFF',
  surface: '#F8F8F8',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#B0B0B0',
  border: '#EBEBEB',
  checkboxBorder: '#B0B0B0',
  checkboxDone: '#22c55e',
  accent: '#5B5BD6',
  accentText: '#fff',
  accentTint: '#F0F0FF',
  todayBg: '#F5F5FF',
  pill: '#F0F0FF',
  danger: '#dc2626',
  priorityHigh: '#eab308',
  priorityMedium: '#60a5fa',
};

const defaultDark = {
  bg: '#1A1A2E',
  surface: '#232340',
  text: '#F0EFEE',
  textSecondary: '#9CA3AF',
  textMuted: '#5C5C7A',
  border: '#2E2E4A',
  checkboxBorder: '#5C5C7A',
  checkboxDone: '#22c55e',
  accent: '#7C7CE8',
  accentText: '#fff',
  accentTint: '#1E1E3A',
  todayBg: '#1E1E35',
  pill: '#1E1E3A',
  danger: '#ef4444',
  priorityHigh: '#eab308',
  priorityMedium: '#60a5fa',
};

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'default', label: 'Violet', swatch: '#5B5BD6' },
  { id: 'slate', label: 'Slate', swatch: '#2f4858' },
  { id: 'cream', label: 'Cream', swatch: '#faf3e7' },
  { id: 'sky', label: 'Sky', swatch: '#89B4F9' },
  { id: 'sage', label: 'Sage', swatch: '#99cccc' },
  { id: 'coral', label: 'Coral', swatch: '#f88888' },
  { id: 'teal', label: 'Teal', swatch: '#008080' },
  { id: 'forest', label: 'Forest', swatch: '#34542C' },
  { id: 'plum', label: 'Plum', swatch: '#4C2C34' },
  { id: 'berry', label: 'Berry', swatch: '#6F2451' },
  { id: 'mint', label: 'Mint', swatch: '#b1e8b2' },
];

export type Colors = typeof defaultLight;

export function useColors(): Colors {
  const theme = usePlannerStore((s) => s.theme);
  const accentColor = usePlannerStore((s) => s.accentColor);
  const isDark = theme === 'dark';

  if (!accentColor || accentColor === 'default') {
    return isDark ? defaultDark : defaultLight;
  }

  const preset = COLOR_PRESETS.find((p) => p.id === accentColor);
  if (!preset) return isDark ? defaultDark : defaultLight;

  return makeColors(preset.swatch, isDark);
}
