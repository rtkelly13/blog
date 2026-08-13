export interface ColorStyle {
  name: string;
  bg: string;
  border: string;
  text: string;
  hex: string;
  borderHex: string;
  textHex: string;
  gradient: string;
}

export const AVAILABLE_PALETTE = [
  'pink',
  'red',
  'yellow',
  'orange',
  'blue',
  'green',
  'purple',
  'magenta',
  'brown',
  'grey',
  '?',
];

export const COLOR_STYLES: Record<string, ColorStyle> = {
  '?': {
    name: 'Mystery',
    bg: 'bg-zinc-800',
    border: 'border-amber-400',
    text: 'text-amber-300',
    hex: '#27272a',
    borderHex: '#fbbf24',
    textHex: '#fef08a',
    gradient: 'linear-gradient(180deg, #3f3f46 0%, #18181b 100%)',
  },
  pink: {
    name: 'Pink',
    bg: 'bg-pink-500',
    border: 'border-pink-300',
    text: 'text-white',
    hex: '#f43f5e',
    borderHex: '#fda4af',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #fb7185 0%, #e11d48 100%)',
  },
  red: {
    name: 'Red',
    bg: 'bg-red-600',
    border: 'border-red-400',
    text: 'text-white',
    hex: '#dc2626',
    borderHex: '#f87171',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
  },
  yellow: {
    name: 'Yellow',
    bg: 'bg-yellow-400',
    border: 'border-yellow-200',
    text: 'text-black',
    hex: '#eab308',
    borderHex: '#fef08a',
    textHex: '#000000',
    gradient: 'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
  },
  orange: {
    name: 'Orange',
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-white',
    hex: '#f97316',
    borderHex: '#fdba74',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)',
  },
  blue: {
    name: 'Blue',
    bg: 'bg-sky-500',
    border: 'border-sky-300',
    text: 'text-white',
    hex: '#0284c7',
    borderHex: '#7dd3fc',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)',
  },
  green: {
    name: 'Green',
    bg: 'bg-emerald-500',
    border: 'border-emerald-300',
    text: 'text-white',
    hex: '#16a34a',
    borderHex: '#86efac',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
  },
  purple: {
    name: 'Purple',
    bg: 'bg-purple-600',
    border: 'border-purple-300',
    text: 'text-white',
    hex: '#9333ea',
    borderHex: '#d8b4fe',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)',
  },
  magenta: {
    name: 'Magenta',
    bg: 'bg-fuchsia-600',
    border: 'border-fuchsia-300',
    text: 'text-white',
    hex: '#c026d3',
    borderHex: '#f0abfc',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #d946ef 0%, #a21caf 100%)',
  },
  brown: {
    name: 'Brown',
    bg: 'bg-amber-800',
    border: 'border-amber-600',
    text: 'text-white',
    hex: '#854d0e',
    borderHex: '#ca8a04',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #a16207 0%, #713f12 100%)',
  },
  grey: {
    name: 'Grey',
    bg: 'bg-zinc-600',
    border: 'border-zinc-400',
    text: 'text-white',
    hex: '#52525b',
    borderHex: '#a1a1aa',
    textHex: '#ffffff',
    gradient: 'linear-gradient(180deg, #71717a 0%, #3f3f46 100%)',
  },
};

export function getColorStyle(colorName: string): ColorStyle {
  const normalized = colorName ? colorName.toLowerCase().trim() : 'grey';
  return (
    COLOR_STYLES[normalized] || {
      name: colorName,
      bg: 'bg-zinc-700',
      border: 'border-zinc-500',
      text: 'text-white',
      hex: '#3f3f46',
      borderHex: '#71717a',
      textHex: '#ffffff',
      gradient: 'linear-gradient(180deg, #52525b 0%, #27272a 100%)',
    }
  );
}
