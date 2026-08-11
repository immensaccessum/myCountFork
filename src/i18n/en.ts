import type { LocaleStrings } from './types';
import enJson from './en.json';

const engine: Partial<LocaleStrings> = {
  yearShort: 'y.',
  hourShort: 'h.',
  minShort: 'm.',
  secShort: 's.',
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  monthRp: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  secArray: ['seconds', 'second', 'seconds', 'seconds'],
  minArray: ['minutes', 'minute', 'minutes', 'minutes'],
  hourArray: ['hours', 'hour', 'hours', 'hours'],
  dayArray: ['days', 'day', 'days', 'days'],
  weekArray: ['weeks', 'week', 'weeks', 'weeks'],
  monthArray: ['months', 'month', 'months', 'months'],
  yearArray: ['years', 'year', 'years', 'years'],
  loading: 'loading...',
  current: 'current',
  bc: 'BC',
  ad: 'AD',
  change: 'Change',
  hideSettings: 'Hide settings',
  adjustAndGetLink: 'Adjust and get link',
  dateOn: 'since ',
  dateWas: ' elapsed:',
  dateUntil: 'until ',
  dateLeft: ' left:',
  dateDel: ', ',
  eventPrev: '←',
  eventNext: '→',
};

export const en: LocaleStrings = {
  ...(enJson as Omit<LocaleStrings, keyof typeof engine>),
  ...engine,
  lang: 'en',
  footer: 'myCount v0.4',
} as LocaleStrings;
