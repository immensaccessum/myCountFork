const MONTH365 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH366 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dayInYear(y: number): number {
  if (y % 400 === 0 || (y % 100 !== 0 && y % 4 === 0)) return 366;
  return 365;
}

function getDaysForYear(cnt: number): number {
  if (cnt >= 0) {
    return cnt * 365 + (((cnt + 1) / 4) | 0) - (((cnt + 69) / 100) | 0) + (((cnt + 369) / 400) | 0);
  }
  return cnt * 365 + (((cnt - 2) / 4) | 0) - (((cnt - 30) / 100) | 0) + (((cnt - 30) / 400) | 0);
}

export class McDate {
  y = 0;
  m = 0;
  d = 0;
  h = 0;
  i = 0;
  s = 0;
  ms = 0;
  day = 0;
  tz = 0;

  addDate(obj: Partial<Record<string, number>>): void {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'number') (this as unknown as Record<string, number>)[k] += v;
    }
  }

  setDate(obj: Partial<Record<string, number>>): void {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'number') (this as unknown as Record<string, number>)[k] = v;
    }
  }

  setTime(t: number): void {
    let fd = (t / 86400000) | 0;
    this.day = fd % 7;
    if (this.day < 0) this.day += 7;
    this.day = (this.day + 4) % 7;
    const ty = (fd / 365.25) | 0;
    let fdac = fd - getDaysForYear(ty);
    this.y = 1970 + ty;
    this.m = 0;
    let trest = t % 86400000;
    if (trest < 0) {
      trest += 86400000;
      fdac--;
    }
    while (fdac < 0) {
      this.y--;
      fdac += dayInYear(this.y);
    }
    while (fdac > dayInYear(this.y)) {
      fdac -= dayInYear(this.y);
      this.y++;
    }
    const subTable = dayInYear(this.y) === 365 ? MONTH365 : MONTH366;
    let i = 0;
    while (fdac + 1 > subTable[i]) {
      fdac -= subTable[i];
      this.m++;
      i++;
    }
    this.y += (this.m / 12) | 0;
    this.m = this.m % 12;
    this.d = fdac;
    this.h = (trest / 3600000) | 0;
    trest %= 3600000;
    this.i = (trest / 60000) | 0;
    trest %= 60000;
    this.s = (trest / 1000) | 0;
    this.ms = trest % 1000;
  }

  getTime(): number {
    let res = this.ms + this.s * 1000 + this.i * 60000 + this.h * 3600000;
    let y = this.y + ((this.m / 12) | 0);
    let m = this.m % 12;
    if (m < 0) {
      m += 12;
      y--;
    }
    const addTable = dayInYear(y) === 365 ? MONTH365 : MONTH366;
    let diny = 0;
    for (let i = 0; i < m; i++) diny += addTable[i];
    const fd = y - 1970;
    res += (getDaysForYear(fd) + diny + this.d) * 86400000;
    return res;
  }
}

export const MC_STAMP_0Y = -62167219200000;
