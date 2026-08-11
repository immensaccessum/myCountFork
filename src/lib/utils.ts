export function numToStr(val: number): string {
  let ac = Math.floor(val).toString();
  let result = '';
  while (ac.length > 3) {
    result = result.length > 0 ? ac.slice(-3) + ' ' + result : ac.slice(-3);
    ac = ac.slice(0, -3);
  }
  return result.length > 0 ? ac + ' ' + result : ac;
}

export function tn(n: number): string {
  if (n < 10 && n >= 0) return '0' + n;
  if (n < 0 && n > -10) return '-0' + -n;
  return String(n);
}

export function getTzStr(tzVal: number, isGmt: boolean): string {
  const tzH = tzVal / 3600 | 0;
  const tzM = Math.abs((tzVal % 3600) / 60 | 0);
  const tzS = tzVal % 60;
  let tzT = '';
  if (tzVal !== 0) {
    tzT = tn(tzH) + ':' + tn(tzM);
    if (tzS) tzT += ':' + tn(tzS);
    if (tzVal > 0) tzT = '+' + tzT;
    tzT = ' ' + tzT;
  }
  return isGmt ? '(GMT' + tzT + ')' : '(UTC' + tzT + ')';
}

export function choiceStrFrom(t: number | null, strs: string[]): string {
  if (t == null) return strs[3];
  t = t % 100;
  if (t > 10 && t < 20) return strs[0];
  switch (t % 10) {
    case 0:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return strs[0];
    case 1:
      return strs[1];
    case 2:
    case 3:
    case 4:
      return strs[2];
    default:
      return strs[0];
  }
}

export function cropNumber(n: number, d: number): string {
  const str = String(n) + '000000000000';
  return '●' + str.slice(2, 2 + d);
}

export function getYNumPlus(t: number): number {
  if (t < 10) return 10;
  const tstr = String(t);
  const dg1 = Number(tstr[0]);
  let res = (dg1 + 1) + '0'.repeat(tstr.length - 1);
  const res2 = dg1 + '5' + '0'.repeat(tstr.length - 2);
  if (Number(res2) > t) res = String(Math.min(Number(res), Number(res2)));
  const res3 = dg1.toString().repeat(tstr.length);
  if (Number(res3) > t && tstr.length > 2 && dg1 !== 9) {
    res = String(Math.min(Number(res), Number(res3)));
  }
  return Number(res);
}

export function getYNumMinus(t: number): number {
  if (t < 10) return 0;
  const tstr = String(t);
  const dg1 = Number(tstr[0]);
  let res = dg1 + '0'.repeat(tstr.length - 1);
  if (Number(res) === t) res = String(getYNumMinus(Number(res) - 1));
  const res2 = dg1 + '5' + '0'.repeat(tstr.length - 2);
  if (Number(res2) === t) getYNumMinus(Number(res2) - 1);
  const res3 = dg1.toString().repeat(tstr.length);
  if (Number(res2) < t) res = String(Math.max(Number(res), Number(res2)));
  if (Number(res3) < t && tstr.length > 2 && dg1 !== 9) {
    res = String(Math.max(Number(res), Number(res3)));
  }
  return Number(res);
}
