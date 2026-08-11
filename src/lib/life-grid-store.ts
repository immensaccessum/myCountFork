import { parseLifeGridUnit, type LifeGridUnit } from './life-grid';

export interface LifeGridPrefs {
  birth: string;
  years: number;
  unit: LifeGridUnit;
}

const KEY = 'mc_life_grid';
const ALLOWED_YEARS = [72, 80, 90, 100] as const;

export function loadLifeGridPrefs(): LifeGridPrefs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<LifeGridPrefs>;
    if (typeof data.birth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.birth)) return null;
    const years = Number(data.years);
    if (!ALLOWED_YEARS.includes(years as (typeof ALLOWED_YEARS)[number])) return null;
    return {
      birth: data.birth,
      years,
      unit: parseLifeGridUnit(data.unit),
    };
  } catch {
    return null;
  }
}

export function saveLifeGridPrefs(prefs: LifeGridPrefs): void {
  const years = ALLOWED_YEARS.includes(prefs.years as (typeof ALLOWED_YEARS)[number])
    ? prefs.years
    : 80;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      birth: prefs.birth,
      years,
      unit: parseLifeGridUnit(prefs.unit),
    }),
  );
}

export { ALLOWED_YEARS };
