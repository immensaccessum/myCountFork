export interface LandingPageDef {
  id: string;
  kind?: string;
  mode?: string;
  rule?: string;
  inCatalog?: boolean;
  slugRu: string;
  slugEn: string;
  month?: number;
  day?: number;
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
  kind?: string;
  rule?: string;
  slug: { ru: string; en: string };
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
}

export interface McPreset {
  eventId?: string;
  wm?: number;
  h1?: string;
  intro?: string;
  kind?: string;
  mode?: 'since' | 'until' | string;
  rule?: string;
}

declare global {
  interface Window {
    __MC_PRESET?: McPreset;
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

export async function fetchPopularLandings(
  lang: 'ru' | 'en',
): Promise<{ slug: string; label: string; href: string }[]> {
  try {
    const r = await fetch(`/api/landing-pages?lang=${lang}`);
    if (!r.ok) return [];
    const data = (await r.json()) as
      | LandingPageDef[]
      | { pages: LandingPageDef[]; popular: { slug: string; label: string; href: string }[] };
    if (Array.isArray(data)) {
      // legacy shape
      return [];
    }
    return data.popular || [];
  } catch {
    return [];
  }
}
