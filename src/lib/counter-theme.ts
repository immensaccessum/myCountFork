export type CounterTheme = 'default' | 'cosmo' | 'fisic' | 'lit';

export const THEME_BACKGROUNDS: Record<CounterTheme, string | null> = {
  default: null,
  cosmo: '/cimg/001/cb/cosmo.jpg',
  fisic: '/cimg/001/cb/fisic.jpg',
  lit: '/cimg/001/cb/lit.jpg',
};

export function parseTheme(raw?: string): CounterTheme {
  if (raw === 'cosmo' || raw === 'fisic' || raw === 'lit') return raw;
  return 'default';
}

export function themeToParam(theme: CounterTheme): string | undefined {
  return theme === 'default' ? undefined : theme;
}
