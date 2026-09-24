import { Line, Station, Complex } from '../types';
import { toEnglishDigits, toPersianDigits } from './jalali';

export function getLocalizedLineName(line: Line | null | undefined, lang: 'fa' | 'en'): string {
  if (!line) return '';
  if (lang === 'en') {
    if (line.nameEn) return line.nameEn;
    const name = line.name || '';
    if (name.includes('خط ۱') || name.toLowerCase().includes('line 1')) return 'Telecabin Line 1';
    if (name.includes('خط ۲') || name.toLowerCase().includes('line 2')) return 'Telecabin Line 2';
    if (name.includes('خط ۳') || name.toLowerCase().includes('line 3')) return 'Telecabin Line 3';
    if (name.includes('خط ۴') || name.toLowerCase().includes('line 4')) return 'Telecabin Line 4';
    if (name.includes('چشمه')) return 'Cheshmeh Telesiege';
    if (name.includes('قله')) return 'Summit Gondola Line';
    if (name.includes('هتل')) return 'Hotel Telesiege Line';
    
    // Generic regex replacement for خط X
    const match = name.match(/خط\s*([0-9۰-۹]+)/);
    if (match) {
      const num = toEnglishDigits(match[1]);
      return `Line ${num}`;
    }
  }
  return line.name;
}

export function getLocalizedLineType(type: string | undefined, lang: 'fa' | 'en'): string {
  if (!type) return '';
  if (lang === 'en') {
    const t = type.toLowerCase();
    if (t.includes('تله‌کابین') || t.includes('telecabin') || t.includes('gondola')) return 'Telecabin / Gondola';
    if (t.includes('تله‌سیژ') || t.includes('telesiege') || t.includes('chairlift')) return 'Telesiege / Chairlift';
    if (t.includes('واگن کششی') || t.includes('funicular')) return 'Funicular Railway';
    return type;
  } else {
    const t = type.toLowerCase();
    if (t.includes('telecabin') || t.includes('gondola')) return 'تله‌کابین';
    if (t.includes('telesiege') || t.includes('chairlift')) return 'تله‌سیژ';
    if (t.includes('funicular')) return 'واگن کششی (فونیکولار)';
    return type;
  }
}

export function getLocalizedStationName(station: Station | null | undefined, lang: 'fa' | 'en'): string {
  if (!station) return '';
  if (lang === 'en') {
    if (station.nameEn) return station.nameEn;
    const name = station.name || '';
    
    // Check for "ایستگاه X" pattern with Persian or English digits
    const match = name.match(/ایستگاه\s*([0-9۰-۹]+)/);
    if (match) {
      const num = toEnglishDigits(match[1]);
      return `Station ${num}`;
    }
    
    // Common station names
    if (name.includes('ایستگاه مبدا') || name.includes('مبدأ')) return 'Base Station';
    if (name.includes('ایستگاه میانی')) return 'Intermediate Station';
    if (name.includes('ایستگاه مقصد') || name.includes('ایستگاه قله')) return 'Summit Station';
    if (name.includes('ایستگاه چشمه')) return 'Cheshmeh Station';
    if (name.includes('ایستگاه هتل')) return 'Hotel Station';
    
    if (station.sequenceNumber) {
      return `Station ${station.sequenceNumber}`;
    }
  } else {
    // In Persian mode, convert English Station X to ایستگاه X
    const name = station.name || '';
    const match = name.match(/Station\s*([0-9]+)/i);
    if (match) {
      return `ایستگاه ${toPersianDigits(match[1])}`;
    }
  }
  return station.name;
}

export function getLocalizedComplexName(c: Complex | null | undefined, lang: 'fa' | 'en'): string {
  if (!c) return '';
  if (lang === 'en') {
    if (c.nameEn) return c.nameEn;
    if (c.name?.includes('توچال')) return 'Tochal Telecabin';
    if (c.name?.includes('کیش')) return 'Kish Telecabin';
    if (c.name?.includes('رامسر')) return 'Ramsar Telecabin';
    if (c.name?.includes('دربندسر')) return 'Darbandsar Cableway';
    if (c.name?.includes('دیزین')) return 'Dizin Gondola';
  }
  return c.name;
}

export function getLocalizedEquipmentName(name: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!name) return '';
  if (lang === 'en') {
    // If the name has English in parentheses, e.g. "الکتروموتور اصلی خط (Motor)", extract or translate cleanly
    const parenMatch = name.match(/\(([A-Za-z0-9\s\-_/]+)\)/);
    if (parenMatch && parenMatch[1].trim().length > 2) {
      const enPart = parenMatch[1].trim();
      // If it's already descriptive like "Motor", "Gearbox", "Diesel Generator", "Return Wheel"
      if (enPart.toLowerCase() === 'motor') return 'Main Electric Motor';
      if (enPart.toLowerCase() === 'gearbox') return 'Main Planetary Gearbox';
      if (enPart.toLowerCase() === 'diesel generator') return 'Emergency Diesel Generator';
      if (enPart.toLowerCase() === 'return wheel') return 'Tension & Return Bullwheel';
      return enPart;
    }

    if (name.includes('الکتروموتور')) return 'Main Line Electric Motor';
    if (name.includes('گیربکس')) return 'Main Reduction Gearbox';
    if (name.includes('ژنراتور') || name.includes('دیزل')) return 'Emergency Diesel Generator';
    if (name.includes('فلکه') || name.includes('بولویل')) return 'Return / Drive Bullwheel';
    if (name.includes('هیدرولیک')) return 'Hydraulic Tension Unit';
    if (name.includes('ترمز')) return 'Emergency Brake System';
    if (name.includes('کابین')) return 'Passenger Cabins / Carriers';
    if (name.includes('دکل') || name.includes('پایه')) return 'Line Towers & Sheave Trains';
  }
  return name;
}

export function getLocalizedTaskName(name: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!name) return '';
  if (lang === 'en') {
    if (name.includes('لرزش') && name.includes('بلبرینگ')) return 'Motor Vibration & Bearings Check';
    if (name.includes('آچارکشی') || name.includes('گشتاور')) return 'Tower Foundation Bolts Torquing';
    if (name.includes('روغن گیربکس')) return 'Gearbox Oil Quality & Level Inspection';
    if (name.includes('کابل فولادی') || name.includes('کابل')) return 'Steel Wire Rope Visual & Lubrication Inspection';
    if (name.includes('ترمز')) return 'Emergency Brake System Functional Test';
    if (name.includes('لاستیک لاینر') || name.includes('فلکه')) return 'Bullwheel Liner & Groove Inspection';
    if (name.includes('فیلتر') && name.includes('دیزل')) return 'Diesel Generator Maintenance & Filter Replacement';
    if (name.includes('شفت') || name.includes('پین')) return 'Suspension Arm Pins & Shaft NDT Test';
    if (name.includes('رولربات') || name.includes('گریس')) return 'Tower Sheave Batteries Greasing';
    if (name.includes('سیستم هیدرولیک')) return 'Hydraulic Tension Pressure & Fluid Check';
  }
  return name;
}

export function getLocalizedUserName(name: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!name) return '';
  if (lang === 'en') {
    if (name === 'حسام اسدی') return 'Hesam Asadi';
    if (name === 'کارشناس ارتعاشات') return 'Vibration Specialist';
    if (name === 'کارشناس ترموگرافی') return 'Thermography Specialist';
    if (name === 'آزمایشگاه روغن') return 'Oil Lab Analyst';
    if (name === 'مسئول روانکاری') return 'Lubrication Officer';
    if (name === 'مفتش MFL') return 'MFL Rope Inspector';
    if (name === 'کارشناس NDT') return 'NDT Inspector';
    if (name === 'مدیر کل سیستم') return 'Super Admin';
    if (name === 'مدیر مجموعه') return 'Complex Admin';
    if (name === 'سرپرست خط') return 'Line Supervisor';
    if (name === 'اپراتور ایستگاه') return 'Station Operator';
  } else {
    if (name === 'Super Admin') return 'مدیر ارشد سیستم';
    if (name === 'Complex Admin') return 'مدیر مجموعه';
    if (name === 'Line Supervisor') return 'سرپرست خط';
    if (name === 'Station Operator') return 'اپراتور ایستگاه';
  }
  return name;
}

export function getLocalizedPosition(position: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!position) return '';
  if (lang === 'en') {
    if (position.includes('تکنسین برق')) return 'Electrical Technician';
    if (position.includes('تکنسین مکانیک')) return 'Mechanical Technician';
    if (position.includes('مهندس')) return position.includes('برق') ? 'Electrical Engineer' : 'Mechanical Engineer';
    if (position.includes('سرپرست')) return 'Maintenance Supervisor';
    if (position.includes('ایمنی')) return 'HSE & Safety Specialist';
  }
  return position;
}

export function getLocalizedEntityType(type: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!type) return '';
  const upper = type.toUpperCase();
  if (lang === 'en') {
    if (upper === 'TASK') return 'Task / Work Order';
    if (upper === 'EQUIPMENT') return 'Equipment / Asset';
    if (upper === 'LINE') return 'Cableway Line';
    if (upper === 'STATION') return 'Station';
    if (upper === 'COMPLEX') return 'Facility / Complex';
    return type;
  } else {
    if (upper === 'TASK') return 'دستورکار (Task)';
    if (upper === 'EQUIPMENT') return 'تجهیز (Equipment)';
    if (upper === 'LINE') return 'خط (Line)';
    if (upper === 'STATION') return 'ایستگاه (Station)';
    if (upper === 'COMPLEX') return 'مجموعه (Complex)';
    return type;
  }
}

export function getLocalizedEscalationTier(tier: string | undefined | null, lang: 'fa' | 'en'): string {
  if (!tier) return '';
  const upper = tier.toUpperCase();
  if (lang === 'en') {
    if (upper === 'GENERAL_MANAGER') return 'General Manager';
    if (upper === 'FACILITY_MANAGER') return 'Facility Manager';
    if (upper === 'LINE_SPECIALIST') return 'Line Specialist';
    if (upper === 'LINE_SUPERVISOR') return 'Line Supervisor';
    if (upper === 'LINE_OPERATOR') return 'Line Operator';
    if (upper === 'STATION_OPERATOR') return 'Station Operator';
    if (upper === 'SUPER_ADMIN') return 'Super Administrator';
    return tier;
  } else {
    if (upper === 'GENERAL_MANAGER') return 'مدیر ارشد کل (General Manager)';
    if (upper === 'FACILITY_MANAGER') return 'مدیر مجموعه (Facility Manager)';
    if (upper === 'LINE_SPECIALIST') return 'کارشناس و سرپرست خط (Line Specialist)';
    if (upper === 'LINE_SUPERVISOR') return 'سرپرست خط (Line Supervisor)';
    if (upper === 'LINE_OPERATOR') return 'اپراتور خط و ایستگاه (Line Operator)';
    if (upper === 'STATION_OPERATOR') return 'اپراتور ایستگاه (Station Operator)';
    if (upper === 'SUPER_ADMIN') return 'مدیر کل سیستم (Super Admin)';
    return tier;
  }
}
