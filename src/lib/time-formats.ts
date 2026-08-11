import { McDate, MC_STAMP_0Y } from './mc-date';
import { choiceStrFrom, cropNumber, tn } from './utils';
import type { LocaleStrings } from '../i18n/types';

export const MC_YT_STAMP_MAX = 884572963200000;
export const MC_YT_STAMP_MIN = -1008907315200000;

export interface TimeFormat {
  getMainValue(t: number): number;
  getDivValue(t: number): number;
  getSubText(t: number, rm: number, tx: LocaleStrings): string;
  getStamp(t: number, bt: number, cm: number): number;
  txtArray: string[];
  getMainMetric(t: number | null, tx: LocaleStrings): string;
}

function restMode1(t: number, r: number, n: number): string {
  const ld = Math.floor(t / r) * r;
  return cropNumber((t - ld) / r, n);
}

function restMonth(t: number, n: number): string {
  const dobj = new McDate();
  dobj.setTime(t);
  dobj.setDate({ ms: 0, s: 0, i: 0, h: 0, d: 0 });
  const lt = dobj.getTime();
  dobj.addDate({ m: 1 });
  return cropNumber((t - lt) / (dobj.getTime() - lt), n);
}

function restYear(t: number, n: number): string {
  const dobj = new McDate();
  dobj.setTime(t);
  dobj.setDate({ ms: 0, s: 0, i: 0, h: 0, d: 0, m: 0 });
  const lt = dobj.getTime();
  dobj.addDate({ y: 1 });
  return cropNumber((t - lt) / (dobj.getTime() - lt), n);
}

function makeFormat(
  mainDiv: number,
  divField: keyof McDate,
  subFn: (t: number, rm: number, tx: LocaleStrings) => string,
  stampMul: number,
  txtKey: keyof LocaleStrings,
): TimeFormat {
  return {
    getMainValue(t) {
      return Math.floor((t - MC_STAMP_0Y) / mainDiv);
    },
    getDivValue(t) {
      const dobj = new McDate();
      dobj.setTime(t);
      return dobj[divField] as number;
    },
    getSubText: subFn,
    getStamp(t, bt, cm) {
      return t * cm * stampMul + bt;
    },
    txtArray: [] as string[],
    getMainMetric(t, tx) {
      return choiceStrFrom(t, this.txtArray.length ? this.txtArray : (tx[txtKey] as string[]));
    },
  };
}

export function createTimeFormats(tx: LocaleStrings): TimeFormat[] {
  const formats: TimeFormat[] = [null as unknown as TimeFormat];

  const f1 = makeFormat(1000, 's', (t, rm) => (rm === 0 ? restMode1(t, 1000, 1) : ''), 1000, 'secArray');
  f1.txtArray = tx.secArray;
  formats[1] = f1;

  const f2 = makeFormat(60000, 'i', (t, rm, tx2) => {
    if (rm === 0) return restMode1(t, 60000, 3);
    const d = new McDate();
    d.setTime(t);
    return ':' + tn(d.s);
  }, 60000, 'minArray');
  f2.txtArray = tx.minArray;
  formats[2] = f2;

  const f3 = makeFormat(3600000, 'h', (t, rm) => {
    if (rm === 0) return restMode1(t, 3600000, 5);
    const d = new McDate();
    d.setTime(t);
    return ':' + tn(d.i) + ':' + tn(d.s);
  }, 3600000, 'hourArray');
  f3.txtArray = tx.hourArray;
  formats[3] = f3;

  const f4 = makeFormat(86400000, 'd', (t, rm) => {
    if (rm === 0) return restMode1(t, 86400000, 6);
    const d = new McDate();
    d.setTime(t);
    return tn(d.h) + ':' + tn(d.i) + ':' + tn(d.s);
  }, 86400000, 'dayArray');
  f4.txtArray = tx.dayArray;
  formats[4] = f4;

  const f5 = makeFormat(604800000, 'd', (t, rm, tx2) => {
    if (rm === 0) return restMode1(t, 604800000, 7);
    const d = new McDate();
    d.setTime(t);
    return tx2.days[d.day] + '  ' + tn(d.h) + ':' + tn(d.i) + ':' + tn(d.s);
  }, 604800000, 'weekArray');
  f5.txtArray = tx.weekArray;
  formats[5] = f5;

  const f6: TimeFormat = {
    getMainValue(t) {
      const d = new McDate();
      d.setTime(t);
      return d.y * 12 + d.m;
    },
    getDivValue(t) {
      const d = new McDate();
      d.setTime(t);
      return d.m;
    },
    getSubText(t, rm) {
      if (rm === 0) return restMonth(t, 7);
      const d = new McDate();
      d.setTime(t);
      return tn(d.d + 1) + '  ' + tn(d.h) + ':' + tn(d.i) + ':' + tn(d.s);
    },
    getStamp(t, bt, cm) {
      const d = new McDate();
      d.setTime(bt);
      d.addDate({ m: t * cm });
      return d.getTime();
    },
    txtArray: tx.monthArray,
    getMainMetric(t, tx2) {
      return choiceStrFrom(t, tx2.monthArray);
    },
  };
  formats[6] = f6;

  const f7: TimeFormat = {
    getMainValue(t) {
      const d = new McDate();
      d.setTime(t);
      return d.y;
    },
    getDivValue(t) {
      const d = new McDate();
      d.setTime(t);
      return d.y;
    },
    getSubText(t, rm, tx2) {
      if (rm === 0) return restYear(t, 8);
      const d = new McDate();
      d.setTime(t);
      return tx2.months[d.m] + ', ' + tn(d.d + 1) + '  ' + tn(d.h) + ':' + tn(d.i) + ':' + tn(d.s);
    },
    getStamp(t, bt, cm) {
      const d = new McDate();
      d.setTime(bt);
      d.addDate({ y: t * cm });
      return d.getTime();
    },
    txtArray: tx.yearArray,
    getMainMetric(t, tx2) {
      return choiceStrFrom(t, tx2.yearArray);
    },
  };
  formats[7] = f7;

  return formats;
}
