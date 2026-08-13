export interface ColorStyle {
  name: string;
  bg: string;
  border: string;
  text: string;
  hex: string;
}

export const COLOR_STYLES: Record<string, ColorStyle> = {
  pink: {
    name: 'Pink',
    bg: 'bg-pink-500',
    border: 'border-pink-300',
    text: 'text-white',
    hex: '#ec4899',
  },
  red: {
    name: 'Red',
    bg: 'bg-red-600',
    border: 'border-red-400',
    text: 'text-white',
    hex: '#ef4444',
  },
  yellow: {
    name: 'Yellow',
    bg: 'bg-yellow-400',
    border: 'border-yellow-200',
    text: 'text-black',
    hex: '#facc15',
  },
  orange: {
    name: 'Orange',
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-white',
    hex: '#f97316',
  },
  blue: {
    name: 'Blue',
    bg: 'bg-sky-500',
    border: 'border-sky-300',
    text: 'text-white',
    hex: '#0284c7',
  },
  green: {
    name: 'Green',
    bg: 'bg-emerald-500',
    border: 'border-emerald-300',
    text: 'text-white',
    hex: '#10b981',
  },
  purple: {
    name: 'Purple',
    bg: 'bg-purple-600',
    border: 'border-purple-300',
    text: 'text-white',
    hex: '#9333ea',
  },
  magenta: {
    name: 'Magenta',
    bg: 'bg-fuchsia-600',
    border: 'border-fuchsia-300',
    text: 'text-white',
    hex: '#c026d3',
  },
  brown: {
    name: 'Brown',
    bg: 'bg-amber-800',
    border: 'border-amber-600',
    text: 'text-white',
    hex: '#92400e',
  },
  grey: {
    name: 'Grey',
    bg: 'bg-zinc-600',
    border: 'border-zinc-400',
    text: 'text-white',
    hex: '#52525b',
  },
};

export function getColorStyle(colorName: string): ColorStyle {
  const normalized = colorName.toLowerCase().trim();
  return (
    COLOR_STYLES[normalized] || {
      name: colorName,
      bg: 'bg-zinc-700',
      border: 'border-zinc-500',
      text: 'text-white',
      hex: '#3f3f46',
    }
  );
}
