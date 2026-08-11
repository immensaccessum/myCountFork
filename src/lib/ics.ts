import type { LocalDateSpec } from './local-date';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function icsDateUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildIcsFile(summary: string, bornTime: number, annual: boolean): string {
  const uid = `${bornTime}@mycount`;
  const dtstart = icsDateUtc(bornTime);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//myCount//Counter//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsDateUtc(Date.now())}`,
    `DTSTART:${dtstart}`,
    `SUMMARY:${summary.replace(/[,;\\]/g, ' ')}`,
  ];
  if (annual) lines.push('RRULE:FREQ=YEARLY');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function icsFilename(summary: string): string {
  const safe = summary.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, '_').slice(0, 40) || 'counter';
  return `${safe}.ics`;
}

export function isAnnualFromSpec(spec: LocalDateSpec | null, shareAnnual: boolean): boolean {
  return !!spec?.annual || shareAnnual;
}
