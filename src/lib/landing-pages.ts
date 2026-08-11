export interface LandingPageDef {
  id: string;
  slugRu: string;
  slugEn: string;
  month: number;
  day: number;
  year?: number;
  annual?: boolean;
  titleRu: string;
  titleEn: string;
  descRu: string;
  descEn: string;
  h1Ru: string;
  h1En: string;
  name: { ru: string; en: string };
  bodyRu: string;
  bodyEn: string;
}

export interface LandingEvent {
  id: string;
  t: number;
  tz: number;
  source: 'landing';
  slug: { ru: string; en: string };
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
}

declare global {
  interface Window {
    __MC_PRESET?: { eventId?: string; wm?: number };
  }
}

export async function fetchLandingEvent(idOrSlug: string, lang: 'ru' | 'en'): Promise<LandingEvent | null> {
  try {
    const r = await fetch(`/api/landing/${encodeURIComponent(idOrSlug)}?lang=${lang}`);
    if (!r.ok) return null;
    return (await r.json()) as LandingEvent;
  } catch {
    return null;
  }
}

export async function fetchPopularLandings(lang: 'ru' | 'en'): Promise<{ slug: string; label: string; href: string }[]> {
  try {
    const r = await fetch(`/api/landing-pages?lang=${lang}`);
    if (!r.ok) return [];
    const pages = (await r.json()) as LandingPageDef[];
    const key = lang === 'en' ? 'slugEn' : 'slugRu';
    const prefix = lang === 'en' ? '/until/' : '/do/';
    const order = lang === 'ru'
      ? ['avgusta', 'sentyabrya', 'iyulya', 'leta', 'novogo-goda', 'oktyabrya', 'noyabrya', 'iyunya', 'dekabrya', '1-sentyabrya', 'kontsa-goda', '2027-goda']
      : ['august', 'september', 'july', 'summer', 'new-year', 'october', 'november', 'june', 'december', 'september-1', 'end-of-year', 'year-2027'];
    return order
      .map((slug) => pages.find((p) => p[key] === slug))
      .filter((p): p is LandingPageDef => !!p)
      .map((p) => ({
        slug: p[key],
        label: lang === 'ru' ? p.h1Ru.replace('?', '') : p.h1En.replace('?', ''),
        href: `${prefix}${p[key]}/`,
      }));
  } catch {
    return [];
  }
}
