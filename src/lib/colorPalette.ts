// Color palette generator based on color theory
// Handles complementary, analogous, and triadic color harmonies

export type PaletteType = 'complementary' | 'analogous' | 'triadic';

export interface ColorPalette {
  type: PaletteType;
  colors: string[]; // HSL format: "h s% l%"
  labels: { fr: string; en: string }[];
}

/**
 * Parse HSL string to components
 */
const parseHsl = (hsl: string): [number, number, number] => {
  const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
  return [h, s, l];
};

/**
 * Format HSL components to string
 */
const formatHsl = (h: number, s: number, l: number): string => {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
};

/**
 * Normalize hue to 0-360 range
 */
const normalizeHue = (hue: number): number => {
  return ((hue % 360) + 360) % 360;
};

/**
 * Generate complementary color palette (2 colors: base + opposite on color wheel)
 */
export const generateComplementary = (baseColor: string): ColorPalette => {
  const [h, s, l] = parseHsl(baseColor);
  const complementaryHue = normalizeHue(h + 180);
  
  return {
    type: 'complementary',
    colors: [
      formatHsl(h, s, l),
      formatHsl(complementaryHue, s, l),
    ],
    labels: [
      { fr: 'Couleur de base', en: 'Base color' },
      { fr: 'Complémentaire', en: 'Complementary' },
    ],
  };
};

/**
 * Generate analogous color palette (3 colors: base + adjacent colors)
 */
export const generateAnalogous = (baseColor: string): ColorPalette => {
  const [h, s, l] = parseHsl(baseColor);
  const leftHue = normalizeHue(h - 30);
  const rightHue = normalizeHue(h + 30);
  
  return {
    type: 'analogous',
    colors: [
      formatHsl(leftHue, s, l),
      formatHsl(h, s, l),
      formatHsl(rightHue, s, l),
    ],
    labels: [
      { fr: 'Gauche (-30°)', en: 'Left (-30°)' },
      { fr: 'Couleur de base', en: 'Base color' },
      { fr: 'Droite (+30°)', en: 'Right (+30°)' },
    ],
  };
};

/**
 * Generate triadic color palette (3 colors: equally spaced on color wheel)
 */
export const generateTriadic = (baseColor: string): ColorPalette => {
  const [h, s, l] = parseHsl(baseColor);
  const triad1Hue = normalizeHue(h + 120);
  const triad2Hue = normalizeHue(h + 240);
  
  return {
    type: 'triadic',
    colors: [
      formatHsl(h, s, l),
      formatHsl(triad1Hue, s, l),
      formatHsl(triad2Hue, s, l),
    ],
    labels: [
      { fr: 'Couleur de base', en: 'Base color' },
      { fr: 'Triadique 1 (+120°)', en: 'Triadic 1 (+120°)' },
      { fr: 'Triadique 2 (+240°)', en: 'Triadic 2 (+240°)' },
    ],
  };
};

/**
 * Generate all palette types from a base color
 */
export const generateAllPalettes = (baseColor: string): Record<PaletteType, ColorPalette> => {
  return {
    complementary: generateComplementary(baseColor),
    analogous: generateAnalogous(baseColor),
    triadic: generateTriadic(baseColor),
  };
};
