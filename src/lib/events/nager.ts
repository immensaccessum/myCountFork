import type { NagerCountry } from './types';

const API = '/api/nager';

export async function fetchAvailableCountries(): Promise<NagerCountry[]> {
  const res = await fetch(`${API}/countries`);
  if (!res.ok) throw new Error(`Countries API: ${res.status}`);
  return (await res.json()) as NagerCountry[];
}
