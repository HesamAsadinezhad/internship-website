import { IsoZone, AccelerationMode } from '../types/vibration';

// ISO 20816 Standard Zone Evaluation
export const parseZoneLimits = (limitsStr: string | undefined, defaultLimits: number[]): number[] => {
  if (!limitsStr) return defaultLimits;
  const parsed = limitsStr.split('/').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
  return parsed.length === 3 ? parsed.sort((a, b) => a - b) : defaultLimits;
};

// ISO 20816-3 Velocity RMS (mm/s) Zone limits for industrial machinery (Group 1 & 2 Rigid/Flexible)
// Typical default thresholds: Zone A <= 1.4, Zone B <= 2.8, Zone C <= 4.5, Zone D > 4.5
export const getVelocityZone = (rms: number, limitsStr?: string): IsoZone => {
  const limits = parseZoneLimits(limitsStr, [1.4, 2.8, 4.5]);
  if (rms <= limits[0]) return 'A';
  if (rms <= limits[1]) return 'B';
  if (rms <= limits[2]) return 'C';
  return 'D';
};

// ISO 20816 Acceleration Zone evaluation (m/s² or g)
// If Peak is used, peak limits are typically sqrt(2) to 2.5x the RMS limits
export const getAccelerationZone = (val: number, limitsStr?: string, mode: AccelerationMode = 'RMS'): IsoZone => {
  const baseLimits = parseZoneLimits(limitsStr, mode === 'Peak' ? [5.0, 10.0, 20.0] : [2.5, 5.0, 10.0]);
  if (val <= baseLimits[0]) return 'A';
  if (val <= baseLimits[1]) return 'B';
  if (val <= baseLimits[2]) return 'C';
  return 'D';
};

export const getZoneColor = (zone: IsoZone): string => {
  switch (zone) {
    case 'A': return '#22c55e'; // green-500: Newly commissioned / Good
    case 'B': return '#eab308'; // yellow-500: Unrestricted / Acceptable
    case 'C': return '#f97316'; // orange-500: Restricted / Alert
    case 'D': return '#ef4444'; // red-500: Damage risk / Danger
    default: return '#6b7280';
  }
};

export const getZoneDescription = (zone: IsoZone, lang: 'fa' | 'en' = 'fa'): string => {
  if (lang === 'fa') {
    switch (zone) {
      case 'A': return 'ناحیه A (ISO 20816): نوساز / عالی';
      case 'B': return 'ناحیه B (ISO 20816): کارکرد نامحدود / مجاز';
      case 'C': return 'ناحیه C (ISO 20816): کارکرد مشروط / هشدار';
      case 'D': return 'ناحیه D (ISO 20816): خطر آسیب / توقف فوری';
      default: return 'نامشخص';
    }
  }
  switch (zone) {
    case 'A': return 'Zone A (ISO 20816): Newly Commissioned / Excellent';
    case 'B': return 'Zone B (ISO 20816): Unrestricted / Acceptable';
    case 'C': return 'Zone C (ISO 20816): Restricted / Warning';
    case 'D': return 'Zone D (ISO 20816): Damage Risk / Danger';
    default: return 'Unspecified';
  }
};

