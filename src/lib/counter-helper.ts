import { McDate, MC_STAMP_0Y } from './mc-date';
import { createTimeFormats, MC_YT_STAMP_MAX, MC_YT_STAMP_MIN, type TimeFormat } from './time-formats';
import { getTzStr, getYNumMinus, getYNumPlus, tn } from './utils';
import type { LocaleStrings } from '../i18n/types';

export interface DateStrEx {
  dm: string;
  era: string;
  knt: string;
  kntz: string;
  knttz: string;
  kny: string;
  knywy: string;
  fts: string;
  rs: string;
  fknttz: string;
  y: number;
}

export class CounterHelper {
  bornTime: number;
  format: number;
  ct = 0;
  tz = 0;
  tzen = 1;
  cm = 1;
  ent = 1;
  restMode = 0;
  isPeopleBorn = 0;
  isGMT = 0;
  tzunk = 0;
  bs!: DateStrEx;

  private formats: TimeFormat[];
  private lang: 'ru' | 'en';
  private browserTzSec: number;
  private tx: LocaleStrings;

  constructor(bt: number, btm: number, f: number, tx: LocaleStrings, lang: 'ru' | 'en') {
    this.bornTime = bt;
    this.format = f;
    this.formats = createTimeFormats(tx);
    this.tx = tx;
    this.lang = lang;
    this.browserTzSec = -new Date().getTimezoneOffset() * 60;
    this.setTZ(btm);
    this.refreshBS(tx);
    this.changeFormat(f);
  }

  getTZ(): number {
    return (
      (this.tz & 0xffff) |
      ((this.tzen & 0x1) << 16) |
      (((this.cm > 0 ? 0 : 1) & 0x1) << 17) |
      ((this.ent & 0x7) << 18) |
      ((this.restMode & 0x1) << 21) |
      ((this.isPeopleBorn & 0x1) << 22) |
      ((this.isGMT & 0x1) << 23) |
      ((this.tzunk & 0x1) << 24)
    );
  }

  setTZ(tz: number): void {
    this.tz = tz & 0xffff;
    this.tzen = (tz >> 16) & 0x1;
    this.cm = (tz >> 17) & 0x1 ? -1 : 1;
    this.ent = (tz >> 18) & 0x7;
    this.restMode = (tz >> 21) & 0x1;
    this.isPeopleBorn = (tz >> 22) & 0x1;
    this.isGMT = (tz >> 23) & 0x1;
    this.tzunk = (tz >> 24) & 0x1;
  }

  preCaptureTime(): void {
    this.ct = Date.now();
  }

  captureTime(): void {
    const oldcm = this.cm;
    this.preCaptureTime();
    if (this.ct > this.bornTime) {
      this.cm = 1;
      this.ct -= this.bornTime;
    } else {
      this.cm = -1;
      this.ct = this.bornTime - this.ct;
    }
    this.ct += MC_STAMP_0Y;
    if (oldcm !== this.cm) this.refreshBS(this.tx);
  }

  setBornTime(t: number, tz: number, tzen: number, isGMT: number, tzunk: number, tx: LocaleStrings): void {
    this.bornTime = t;
    this.tz = tz;
    this.tzen = tzen;
    this.isGMT = isGMT;
    this.tzunk = tzunk;
    this.preCaptureTime();
    this.cm = this.ct > t ? 1 : -1;
    this.refreshBS(tx);
  }

  getMainValue(): number {
    return this.formats[this.format].getMainValue(this.ct);
  }

  getMainMetric(t: number | null, tx: LocaleStrings): string {
    return this.formats[this.format].getMainMetric(t, tx);
  }

  getSubText(tx: LocaleStrings): string {
    return this.formats[this.format].getSubText(this.ct, this.restMode, tx);
  }

  getYNum(t: number, offset: number): number {
    const plusFunc = this.cm > 0 ? getYNumPlus : getYNumMinus;
    const minusFunc = this.cm > 0 ? getYNumMinus : getYNumPlus;
    let res = plusFunc(t);
    if (offset > 0) for (let i = 0; i < offset; i++) res = plusFunc(res);
    else if (offset < 0) for (let i = 0; i < -offset; i++) res = minusFunc(res);
    return res;
  }

  changeFormat(newFormat?: number): void {
    if (!newFormat) {
      const ea = this.getEventArray(0, 0);
      const last = ea.pop();
      this.format = typeof last === 'number' ? last : this.format;
    } else {
      this.format = newFormat;
    }
  }

  getEventArray(offset: number, val: number): ({ ev: number; em: string; es: number; efid: number } | number)[] {
    const result: ({ ev: number; em: string; es: number; efid: number } | number)[] = [];
    let minFid = 0;
    let minEs = 0;
    this.captureTime();
    for (let i = 1; i < 8; i++) {
      const fmt = this.formats[i];
      const ev = val || this.getYNum(fmt.getMainValue(this.ct), offset);
      const em = fmt.getMainMetric(ev, this.tx);
      const es = fmt.getStamp(ev, this.bornTime, this.cm);
      if (ev && es < MC_YT_STAMP_MAX && es > MC_YT_STAMP_MIN) {
        result.push({ ev, em, es, efid: i });
        if (minFid === 0 || es < minEs) {
          minFid = i;
          minEs = es;
        }
      }
    }
    result.push(minFid);
    return result;
  }

  getDateStrEx(t: number, round: boolean, tz: number, isGMT: number, tx: LocaleStrings): DateStrEx {
    let rs = '';
    if (round) {
      switch (this.ent) {
        case 0:
        case 1:
          rs = '+24 ' + tx.hourShort;
          break;
        case 2:
          rs = '+60 ' + tx.minShort;
          break;
        case 3:
          rs = '+60 ' + tx.secShort;
          break;
      }
    }
    const mcd = new McDate();
    const tzAdj = this.tzen && !this.tzunk ? tz : 0;
    mcd.setTime(t + tzAdj * 1000);
    const dm =
      this.lang === 'ru'
        ? mcd.d + 1 + ' ' + tx.monthRp[mcd.m]
        : tx.monthRp[mcd.m] + ' ' + (mcd.d + 1);
    const era = mcd.y <= 0 ? tx.bc : tx.ad;
    const fts = tn(mcd.h) + ':' + tn(mcd.i) + ':' + tn(mcd.s);
    let knt = '';
    switch (this.ent) {
      case 2:
        knt = tn(mcd.h) + ' ' + tx.hourShort;
        break;
      case 3:
        knt = tn(mcd.h) + ':' + tn(mcd.i);
        break;
      case 4:
      case 5:
        knt = fts;
        break;
    }
    const kntz = this.tzen && !this.tzunk ? getTzStr(tz, !!isGMT) : '';
    const knttz = kntz && knt && tz !== this.browserTzSec ? knt + ' ' + kntz : knt + (kntz ? ' ' + kntz : '');
    const y = Math.abs(mcd.y - (mcd.y <= 0 ? 1 : 0));
    const kny = y + ' ' + tx.yearShort + (era ? ' ' : '') + era;
    const knywy = y + era;
    const fknttz = tz === this.browserTzSec ? tx.current + ' ' + kntz : knttz;
    return { dm, era, knt, kntz, knttz, kny, knywy, fts, rs: fts ? (rs ? ' ' : '') + rs : '', fknttz, y };
  }

  refreshBS(tx: LocaleStrings): void {
    this.bs = this.getDateStrEx(this.bornTime, false, this.tz, this.isGMT, tx);
  }

  buildDateText(tx: LocaleStrings): string {
    const pre = this.cm < 0 ? tx.dateUntil : tx.dateOn;
    const post = this.cm < 0 ? tx.dateLeft : tx.dateWas;
    const bs = this.bs;
    return pre + bs.dm + tx.dateDel + bs.kny + ' ' + bs.knttz + post;
  }
}
