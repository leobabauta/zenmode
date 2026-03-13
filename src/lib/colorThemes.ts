// Each accent color preset defines CSS variable overrides for light and dark modes.
// When null/default, the original CSS variables from index.css are used.

interface ColorPreset {
  id: string;
  label: string;
  swatch: string; // color shown in the picker
  light: Record<string, string>;
  dark: Record<string, string>;
}

// Helper: lighten/darken a hex color
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

function makePreset(id: string, label: string, accent: string): ColorPreset {
  const [h, s] = hexToHSL(accent);

  // Light mode: accent as-is, tint is very light version, bg/surface/today derived
  const lightAccent = hslToHex(h, Math.min(s, 70), Math.max(40, Math.min(55, hexToHSL(accent)[2])));
  const lightTint = hslToHex(h, Math.min(s, 30), 96);
  const lightToday = hslToHex(h, Math.min(s, 20), 97);
  const lightSurface = hslToHex(h, Math.min(s, 8), 97);
  const lightSurfaceSettings = hslToHex(h, Math.min(s, 10), 95);
  const lightInputSettings = hslToHex(h, Math.min(s, 10), 92);
  const lightBorder = hslToHex(h, Math.min(s, 8), 90);

  // Dark mode: lighter accent, dark tint, dark surfaces
  const darkAccent = hslToHex(h, Math.min(s, 60), Math.max(60, Math.min(72, hexToHSL(accent)[2] + 20)));
  const darkTint = hslToHex(h, Math.min(s, 30), 14);
  const darkToday = hslToHex(h, Math.min(s, 20), 13);
  const darkBg = hslToHex(h, Math.min(s, 25), 11);
  const darkSurface = hslToHex(h, Math.min(s, 20), 16);
  const darkBorder = hslToHex(h, Math.min(s, 18), 20);
  const darkSurfaceSettings = hslToHex(h, Math.min(s, 18), 18);
  const darkInputSettings = hslToHex(h, Math.min(s, 20), 14);

  return {
    id,
    label,
    swatch: accent,
    light: {
      '--color-accent': lightAccent,
      '--color-accent-tint': lightTint,
      '--color-today': lightToday,
      '--color-surface': lightSurface,
      '--color-surface-settings': lightSurfaceSettings,
      '--color-input-settings': lightInputSettings,
      '--color-border': lightBorder,
    },
    dark: {
      '--color-accent': darkAccent,
      '--color-accent-tint': darkTint,
      '--color-today': darkToday,
      '--color-bg': darkBg,
      '--color-surface': darkSurface,
      '--color-border': darkBorder,
      '--color-surface-settings': darkSurfaceSettings,
      '--color-input-settings': darkInputSettings,
    },
  };
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'default',
    label: 'Violet',
    swatch: '#5B5BD6',
    light: {},
    dark: {},
  },
  makePreset('slate', 'Slate', '#2f4858'),
  makePreset('cream', 'Cream', '#faf3e7'),
  makePreset('sky', 'Sky', '#89B4F9'),
  makePreset('sage', 'Sage', '#99cccc'),
  makePreset('coral', 'Coral', '#f88888'),
  makePreset('teal', 'Teal', '#008080'),
  makePreset('forest', 'Forest', '#34542C'),
  makePreset('plum', 'Plum', '#4C2C34'),
  makePreset('berry', 'Berry', '#6F2451'),
  makePreset('mint', 'Mint', '#b1e8b2'),
];

export function getPresetById(id: string | null): ColorPreset | undefined {
  if (!id) return COLOR_PRESETS[0];
  return COLOR_PRESETS.find((p) => p.id === id);
}

export function applyColorPreset(accentColor: string | null, isDark: boolean): void {
  const preset = getPresetById(accentColor);
  const root = document.documentElement;

  // Remove all preset overrides first
  const allVars = new Set<string>();
  for (const p of COLOR_PRESETS) {
    for (const k of Object.keys(p.light)) allVars.add(k);
    for (const k of Object.keys(p.dark)) allVars.add(k);
  }
  for (const v of allVars) {
    root.style.removeProperty(v);
  }

  // Apply the selected preset's overrides
  if (preset) {
    const overrides = isDark ? preset.dark : preset.light;
    for (const [key, value] of Object.entries(overrides)) {
      root.style.setProperty(key, value);
    }
  }
}
