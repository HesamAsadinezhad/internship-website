// High-precision bidirectional Jalali <-> Gregorian calendar conversion
// and formatting utilities for CMMS Condition Monitoring

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export interface DualDateTime {
  dateJalali: string; // e.g. "1403/06/28"
  dateGregorian: string; // e.g. "2024-09-18"
  time: string; // e.g. "10:30"
  isoString: string;
}

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export const GREGORIAN_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (days < v) break;
    days -= v;
  }
  const gd = days + 1;
  return { gy, gm, gd };
}

export function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatJalaliString(j: JalaliDate): string {
  return `${j.jy}/${padZero(j.jm)}/${padZero(j.jd)}`;
}

export function formatGregorianString(g: GregorianDate): string {
  return `${g.gy}-${padZero(g.gm)}-${padZero(g.gd)}`;
}

export function parseDateString(dateStr: string): { type: 'jalali' | 'gregorian'; y: number; m: number; d: number } | null {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/[\/\.-]/g, '-');
  const parts = cleaned.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;

  if (parts[0] > 1300 && parts[0] < 1500) {
    return { type: 'jalali', y: parts[0], m: parts[1], d: parts[2] };
  } else if (parts[0] > 1900 && parts[0] < 2100) {
    return { type: 'gregorian', y: parts[0], m: parts[1], d: parts[2] };
  }
  return null;
}

export function getDualDateTimeFromDate(date: Date = new Date()): DualDateTime {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const jalali = gregorianToJalali(gy, gm, gd);

  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const time = `${hours}:${minutes}`;

  return {
    dateJalali: formatJalaliString(jalali),
    dateGregorian: formatGregorianString({ gy, gm, gd }),
    time,
    isoString: date.toISOString()
  };
}

export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Is Jalali leap year?
  const isLeap = [1, 5, 9, 13, 17, 22, 26, 30].includes(jy % 33);
  return isLeap ? 30 : 29;
}

export function getDaysInGregorianMonth(gy: number, gm: number): number {
  return new Date(gy, gm, 0).getDate();
}

export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1728));
}

// Convert Jalali or Gregorian date string to locale-specific format
// When lang === 'en', converts Jalali dates to Gregorian (e.g. 1403/09/25 -> 2024-12-15)
// Also translates inspection and audit notes in parentheses
export function formatDisplayDate(val: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!val) return '';
  const raw = String(val).trim();
  const englishVal = toEnglishDigits(raw);

  // Check if there is parenthesized notes e.g. "1403/09/15 (ممیزی ایمنی سالانه البرز)"
  const noteMatch = englishVal.match(/\((.*?)\)/);
  let noteText = noteMatch ? noteMatch[1].trim() : '';
  const datePartOnly = englishVal.replace(/\(.*?\)/, '').trim();

  const parsed = parseDateString(datePartOnly);

  let formattedDate = datePartOnly;
  if (parsed) {
    if (lang === 'en') {
      if (parsed.type === 'jalali') {
        const g = jalaliToGregorian(parsed.y, parsed.m, parsed.d);
        formattedDate = formatGregorianString(g);
      } else {
        formattedDate = formatGregorianString({ gy: parsed.y, gm: parsed.m, gd: parsed.d });
      }
    } else {
      // lang === 'fa'
      if (parsed.type === 'gregorian') {
        const j = gregorianToJalali(parsed.y, parsed.m, parsed.d);
        formattedDate = toPersianDigits(formatJalaliString(j));
      } else {
        formattedDate = toPersianDigits(formatJalaliString({ jy: parsed.y, jm: parsed.m, jd: parsed.d }));
      }
    }
  } else if (lang === 'fa') {
    formattedDate = toPersianDigits(datePartOnly);
  }

  // Localize note if present
  if (noteText) {
    if (lang === 'en') {
      const noteTranslations: Record<string, string> = {
        'ممیزی ایمنی سالانه البرز': 'Annual Alborz Safety Audit',
        'بازدید میدانی دوره‌ای': 'Periodic Field Inspection',
        'ممیزی دوره‌ای': 'Periodic Audit',
        'بازرسی فنی': 'Technical Inspection',
        'تست سالانه': 'Annual Test',
        'ممیزی استاندارد': 'Standard Audit',
        'بازرسی جامع': 'Comprehensive Inspection',
        'سرویس دوره‌ای': 'Periodic Service',
        'بازدید میدانی': 'Field Visit',
      };
      const translatedNote = noteTranslations[noteText] || noteText;
      return `${formattedDate} (${translatedNote})`;
    } else {
      return `${formattedDate} (${noteText})`;
    }
  }

  return formattedDate;
}
