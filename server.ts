import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import * as xlsx from 'xlsx';

// --- CONFIG ---
// JWT secret must come from the environment in production. A random secret is
// generated for local/dev use if none is provided, but this means tokens will
// become invalid every time the dev server restarts (this is intentional: it
// stops anyone from relying on a hardcoded/checked-in secret).
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET environment variable must be set in production.');
      })()
    : 'dev-only-secret-do-not-use-in-production');

const IS_PROD = process.env.NODE_ENV === 'production';
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);
});

// Reflect the request origin instead of '*' so that credentialed (cookie)
// requests are actually allowed by the browser.
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- PERSISTENCE ---
// Previously the whole "database" was a plain in-memory object that was wiped
// on every restart. It's still a simple JSON file rather than a real DBMS,
// but it now survives restarts and is a natural place to swap in a real
// database (Postgres/SQLite via Prisma, etc.) later on.

const defaultDb = () => ({
  users: [
    { id: '1', username: 'admin', password: bcrypt.hashSync('123', 10), name: 'Super Admin', role: 'SUPER_ADMIN' },
    { id: '2', username: 'complex_admin', password: bcrypt.hashSync('123', 10), name: 'Complex Admin', role: 'COMPLEX_ADMIN', complexId: 'c1' },
    { id: '3', username: 'line_supervisor', password: bcrypt.hashSync('123', 10), name: 'Line Supervisor', role: 'LINE_SUPERVISOR', complexId: 'c1', lineId: 'l1' },
    { id: '4', username: 'station_operator', password: bcrypt.hashSync('123', 10), name: 'Station Operator', role: 'STATION_OPERATOR', complexId: 'c1', lineId: 'l1', stationId: 's1' },
    { id: '5', username: 'old_admin', password: bcrypt.hashSync('123', 10), name: 'حسام اسدی', role: 'manager' },
  ],
  complexes: [
    { 
      id: 'c1', 
      name: 'تله‌کابین توچال', 
      nameEn: 'Tochal Telecabin',
      location: 'تهران', 
      locationEn: 'Tehran',
      description: 'طولانی‌ترین خط تله‌کابین تفریحی و ورزشی خاورمیانه با ایستگاه‌های ۷ گانه در ارتفاعات البرز',
      descriptionEn: 'The longest recreational and sports cable car in the Middle East with 7 stations in the Alborz mountains',
      imageUrl: 'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=800&q=80',
      createdAt: new Date().toISOString() 
    },
    { 
      id: 'c2', 
      name: 'تله‌کابین کیش', 
      nameEn: 'Kish Telecabin',
      location: 'کیش', 
      locationEn: 'Kish',
      description: 'مجموعه تله‌کابین ساحلی میکامال کیش با کابین‌های مدرن و چشم‌انداز خلیج فارس',
      descriptionEn: 'Mica Mall coastal cable car complex in Kish with modern cabins and Persian Gulf views',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      createdAt: new Date().toISOString() 
    },
  ],
  lines: [
    { id: 'l1', complexId: 'c1', name: 'خط ۱ تله‌کابین', nameEn: 'Telecabin Line 1', type: 'Telecabin', createdAt: new Date().toISOString() },
    { id: 'l2', complexId: 'c1', name: 'تله‌سیژ چشمه', nameEn: 'Cheshmeh Telesiege', type: 'Telesiege', createdAt: new Date().toISOString() },
  ],
  stations: [
    { id: 's1', lineId: 'l1', name: 'ایستگاه ۱', sequenceNumber: 1, createdAt: new Date().toISOString() },
    { id: 's2', lineId: 'l1', name: 'ایستگاه ۲', sequenceNumber: 2, createdAt: new Date().toISOString() },
  ],
  equipments: [
    { id: '1', stationId: 's1', name: 'الکتروموتور اصلی خط (Motor)', code: 'MTR-01', description: 'الکتروموتور اصلی سیستم محرک', createdAt: new Date().toISOString() },
    { id: '2', stationId: 's1', name: 'گیربکس اصلی (Gearbox)', code: 'GBX-01', description: 'گیربکس سیاره‌ای محرک تله‌کابین', createdAt: new Date().toISOString() },
    { id: '3', stationId: 's1', name: 'دیزل ژنراتور اضطراری (Diesel Generator)', code: 'GEN-01', description: 'ژنراتور پشتیبان اضطراری خط', createdAt: new Date().toISOString() },
    { id: '4', stationId: 's2', name: 'فلکه هرزگرد / برگشت (Return Wheel)', code: 'RW-01', description: 'فلکه کشش و برگشت کابل ایستگاه بالا', createdAt: new Date().toISOString() },
  ],
  tasks: [
    { id: '1', equipmentId: '1', subject: 'بررسی لرزش و بلبرینگ‌های الکتروموتور', standard: 'Bartholet', frequency: 'هفتگی', nextDate: '1403/10/05', lastDate: '1403/09/28', instructions: 'بازدید چشمی و پایش ارتعاشات طبق ISO 20816', criteria: 'سرعت ارتعاشات کمتر از 2.8 mm/s' },
    { id: '2', equipmentId: '2', subject: 'تعویض و آنالیز روغن گیربکس اصلی', standard: 'Doppelmayr', frequency: '6 ماهه', nextDate: '1403/12/15', lastDate: '1403/06/15', instructions: 'تخلیه کامل و جایگزینی با واسکازین VG 220', criteria: 'سطح روغن نرمال و عدم ذرات براده' },
    { id: '3', equipmentId: '3', subject: 'سرویس دوره‌ای فیلتر و روغن دیزل ژنراتور', standard: 'ISO', frequency: '3 ماهه', nextDate: '1403/11/10', lastDate: '1403/08/10', instructions: 'بررسی فشار روغن و تست زیر بار آزمایشی', criteria: 'فشار روغن بالای 3 bar در دور نامی' },
    { id: '4', equipmentId: '4', subject: 'گریس‌کاری و بازرسی یاتاقان فلکه هرزگرد', standard: 'Bartholet', frequency: 'ماهانه', nextDate: '1403/10/20', lastDate: '1403/09/20', instructions: 'تزریق گریس استاندارد با گریس‌پمپ کالیبره', criteria: 'تخلیه گریس کهنه و خروج گریس تازه' },
  ],
  inspections: [] as any[],
  logs: [] as any[],
  downtimes: [] as any[],
  conditionLogs: [] as any[],
  criticalComponents: [] as any[],
  lubrications: [
    {
      id: 'lub-1',
      equipmentType: 'motor',
      equipmentName: 'الکتروموتور اصلی (Motor)',
      component: 'بلبرینگ سمت محرک و هرزگرد (DE / NDE Bearings)',
      lubricantType: 'گریس تخصصی دور بالا Kluberplex BEM 41-132',
      lastDate: '1403/06/15',
      nextDate: '1403/09/15',
      interval: '۳ ماهه',
      volume: '60 gr',
      technician: 'مهندس احمدی',
      status: 'normal',
      notes: 'تزریق با گریس‌پمپ دستی، دما و صدای بلبرینگ طبیعی'
    },
    {
      id: 'lub-2',
      equipmentType: 'gearbox',
      equipmentName: 'گیربکس اصلی (Gearbox)',
      component: 'محفظه واسکازین و چرخدنده‌ها (Sump & Gears)',
      lubricantType: 'روغن سنتتیک صنعتی ISO VG 220 (Mobil SHC 630)',
      lastDate: '1403/03/20',
      nextDate: '1403/09/20',
      interval: '۶ ماهه',
      volume: '180 Liters',
      technician: 'مهندس رضایی',
      status: 'due_soon',
      notes: 'ارسال نمونه جهت آنالیز آزمایشگاهی، سطح روغن نرمال'
    },
    {
      id: 'lub-3',
      equipmentType: 'diesel_generator',
      equipmentName: 'دیزل ژنراتور اضطراری (Diesel Generator)',
      component: 'کارتر موتور دیزل و فیلتر روغن (Engine Sump)',
      lubricantType: 'روغن موتور دیزلی 15W-40 CI-4',
      lastDate: '1403/05/10',
      nextDate: '1403/11/10',
      interval: '۶ ماهه / ۲۵۰ ساعت کارکرد',
      volume: '28 Liters',
      technician: 'تکنسین اسدی',
      status: 'normal',
      notes: 'تعویض همزمان فیلترهای روغن و سوخت انجام شد'
    },
    {
      id: 'lub-4',
      equipmentType: 'return_wheel',
      equipmentName: 'فلکه هرزگرد / برگشت (Return Wheel)',
      component: 'یاتاقان رولبرینگ بشکه‌ای فلکه اصلی (Bullwheel Bearing)',
      lubricantType: 'گریس صابون لیتیم کمپلکس Shell Gadus S3',
      lastDate: '1403/05/01',
      nextDate: '1403/08/01',
      interval: '۳ ماهه',
      volume: '120 gr',
      technician: 'مهندس کاظمی',
      status: 'overdue',
      notes: 'سررسید گذشته است، نیازمند تزریق مجدد گریس و بازرسی کاسه‌نمد'
    }
  ],
  cmVibrations: [
    {
      id: 'cm-vib-1',
      subDomain: 'vibration',
      targetEquipment: 'motor',
      equipmentId: 'motor',
      equipmentName: 'الکتروموتور اصلی (Main Motor)',
      inspector: 'مهندس حسام اسدی (کارشناس ارتعاشات)',
      dateJalali: '1403/09/25',
      dateGregorian: '2024-12-15',
      time: '10:30',
      reportPdfUrl: '',
      reportPdfName: 'Motor_ISO20816_VibReport.pdf',
      reportPdfSize: 1845000,
      notes: 'اندازه‌گیری در بار کامل تله‌کابین؛ وضعیت ارتعاشات در محدوده مجاز زون B استاندارد ISO 20816 قرار دارد.',
      accMode: 'Peak',
      velocityMetric: 'RMS',
      lfBand: { fMin: 10, fMax: 1000, zoneAB: 1.4, zoneBC: 2.8, zoneCD: 4.5 },
      hfBand: { fMin: 1000, fMax: 10000, zoneAB: 1.8, zoneBC: 4.5, zoneCD: 7.1 },
      matrix: {
        de_velocity_a: 1.2,
        de_velocity_h: 2.1,
        de_velocity_v: 1.6,
        de_acc_a: 0.8,
        de_acc_h: 1.9,
        de_acc_v: 1.2,
        nde_velocity_a: 0.9,
        nde_velocity_h: 1.7,
        nde_velocity_v: 1.3,
        nde_acc_a: 0.6,
        nde_acc_h: 1.4,
        nde_acc_v: 0.8
      },
      overallZone: 'B'
    },
    {
      id: 'cm-vib-2',
      subDomain: 'vibration',
      targetEquipment: 'gearbox',
      equipmentId: 'gearbox',
      equipmentName: 'گیربکس اصلی (Main Gearbox)',
      inspector: 'مهندس حسام اسدی (کارشناس ارتعاشات)',
      dateJalali: '1403/09/20',
      dateGregorian: '2024-12-10',
      time: '11:15',
      reportPdfUrl: '',
      reportPdfName: 'Gearbox_ISO20816_Report.pdf',
      reportPdfSize: 2150000,
      notes: 'درگیری چرخدنده‌ها و یاتاقان‌های خروجی گیربکس نرمال و در زون A ارزیابی شد.',
      accMode: 'Peak',
      velocityMetric: 'RMS',
      lfBand: { fMin: 10, fMax: 1000, zoneAB: 1.4, zoneBC: 2.8, zoneCD: 4.5 },
      hfBand: { fMin: 1000, fMax: 10000, zoneAB: 1.8, zoneBC: 4.5, zoneCD: 7.1 },
      matrix: {
        de_velocity_a: 0.8,
        de_velocity_h: 1.1,
        de_velocity_v: 0.9,
        de_acc_a: 0.5,
        de_acc_h: 0.9,
        de_acc_v: 0.7,
        nde_velocity_a: 0.7,
        nde_velocity_h: 1.0,
        nde_velocity_v: 0.8,
        nde_acc_a: 0.4,
        nde_acc_h: 0.8,
        nde_acc_v: 0.6
      },
      overallZone: 'A'
    }
  ],
  cmThermographies: [
    {
      id: 'cm-therm-1',
      subDomain: 'thermography',
      equipmentId: 'elec-substation-1',
      equipmentName: 'پست برق و تابلوهای کنترل',
      targetComponent: 'PLC Electrical Panel',
      inspector: 'مهندس احمدی (کارشناس ترموگرافی سطح II)',
      dateJalali: '1403/09/22',
      dateGregorian: '2024-12-12',
      time: '14:20',
      maxTemperature: 46.5,
      ambientTemperature: 22.0,
      deltaT: 24.5,
      hotspotLocation: 'ترمینال اتصال کلید مینیاتوری تغذیه اینورتر',
      operatingLoad: '80% بار نامی (165 آمپر)',
      thermalImageUrl: '',
      reportPdfUrl: '',
      reportPdfName: 'Thermography_PLC_Panel.pdf',
      reportPdfSize: 3420000,
      severity: 'warning',
      notes: 'افزایش دما ناشی از شل بودن پیچ اتصال کابل؛ آچارکشی با گشتاورسنج توصیه گردید.'
    },
    {
      id: 'cm-therm-2',
      subDomain: 'thermography',
      equipmentId: 'sheave-tower-1',
      equipmentName: 'دکل شماره ۱ و فلکه هدایت',
      targetComponent: 'Rubber Liners / Sheave Liners',
      inspector: 'مهندس احمدی (کارشناس ترموگرافی سطح II)',
      dateJalali: '1403/09/18',
      dateGregorian: '2024-12-08',
      time: '11:00',
      maxTemperature: 31.0,
      ambientTemperature: 20.5,
      deltaT: 10.5,
      hotspotLocation: 'شیار رابر رولیک‌های شماره ۳ و ۴ باتری چپ',
      operatingLoad: 'خط در حال گردش با سرعت ۵ متر بر ثانیه',
      thermalImageUrl: '',
      reportPdfUrl: '',
      reportPdfName: 'Sheave_Rubber_ThermalScan.pdf',
      reportPdfSize: 2200000,
      severity: 'warning',
      notes: 'دمای رابر به دلیل اصطکاک جزئی لبه کابل کمی بالاتر از نرمال است. پایش در دوره بعدی.'
    }
  ],
  cmOilAnalyses: [
    {
      id: 'cm-oil-1',
      subDomain: 'oil_analysis',
      equipmentId: 'gearbox',
      equipmentName: 'گیربکس اصلی تله‌کابین (Main Gearbox)',
      lubricantName: 'Mobil SHC 630 (ISO VG 220)',
      operatingHours: 2450,
      inspector: 'آزمایشگاه تخصصی پایش روانکار صنعت فردا',
      dateJalali: '1403/09/10',
      dateGregorian: '2024-11-30',
      time: '09:45',
      elements: {
        fe: 22,
        na: 6,
        pq: 14,
        cu: 7,
        pb: 3
      },
      viscosity40: 221.4,
      tan: 0.62,
      waterPpm: 75,
      isoCleanliness: '17/15/12',
      oilCondition: 'normal',
      reportPdfUrl: '',
      reportPdfName: 'Oil_Analysis_Cert_GBX_140309.pdf',
      reportPdfSize: 1450000,
      notes: 'کلیه عناصر فرسایشی در حد استاندارد مجاز قرار دارند. ویسکوزیته و عدد اسیدی پایدار است.'
    }
  ],
  cmLubrications: [
    {
      id: 'cm-lub-1',
      subDomain: 'lubrication',
      targetEquipment: 'motor',
      equipmentId: 'motor',
      equipmentName: 'الکتروموتور اصلی (Main Motor)',
      lubricantType: 'grease',
      lubricantName: 'Kluberquiet BQ 72-72',
      quantity: 50,
      quantityUnit: 'گرم (g)',
      method: 'grease_gun',
      inspector: 'تیم نگهداری مکانیک ایستگاه ۱',
      dateJalali: '1403/09/01',
      dateGregorian: '2024-11-21',
      time: '08:30',
      nextScheduledDate: '1403/12/01',
      intervalHours: 500,
      reportPdfUrl: '',
      reportPdfName: 'Lubrication_Log_MTR_140309.pdf',
      reportPdfSize: 850000,
      notes: 'تزریق آرام گریس در حین چرخش موتور به منظور توزیع یکنواخت در قفسه بلبرینگ.'
    },
    {
      id: 'cm-lub-2',
      subDomain: 'lubrication',
      targetEquipment: 'gearbox',
      equipmentId: 'gearbox',
      equipmentName: 'گیربکس اصلی (Main Gearbox)',
      lubricantType: 'oil',
      lubricantName: 'Mobil SHC 630 (VG 220)',
      quantity: 5,
      quantityUnit: 'لیتر (L)',
      method: 'top_up',
      inspector: 'تیم نگهداری مکانیک ایستگاه ۱',
      dateJalali: '1403/08/15',
      dateGregorian: '2024-11-05',
      time: '10:00',
      nextScheduledDate: '1403/11/15',
      intervalHours: 1000,
      reportPdfUrl: '',
      reportPdfName: 'Gearbox_Lube_Checklist.pdf',
      reportPdfSize: 720000,
      notes: 'سرریز روغن به سطح خط شاخص سایت گلاس و تعویض المنت فیلتر تنفسی دیسیکانت.'
    },
    {
      id: 'cm-lub-3',
      subDomain: 'lubrication',
      targetEquipment: 'diesel_generator',
      equipmentId: 'diesel_generator',
      equipmentName: 'دیزل ژنراتور اضطراری (Diesel Gen)',
      lubricantType: 'oil',
      lubricantName: 'Mobil Delvac 15W-40',
      quantity: 26,
      quantityUnit: 'لیتر (L)',
      method: 'drain_refill',
      inspector: 'مهندس رضایی (مسئول دیزل)',
      dateJalali: '1403/07/20',
      dateGregorian: '2024-10-11',
      time: '13:00',
      nextScheduledDate: '1404/01/20',
      intervalHours: 250,
      reportPdfUrl: '',
      reportPdfName: 'Diesel_Service_Record.pdf',
      reportPdfSize: 910000,
      notes: 'تعویض کامل روغن کارتر و فیلترهای سوخت و روغن دیزل.'
    },
    {
      id: 'cm-lub-4',
      subDomain: 'lubrication',
      targetEquipment: 'return_wheel',
      equipmentId: 'return_wheel',
      equipmentName: 'فلکه هرزگرد / چرخ برگشت (Return Sheave)',
      lubricantType: 'grease',
      lubricantName: 'Mobilgrease 28 (Synthetic)',
      quantity: 120,
      quantityUnit: 'گرم (g)',
      method: 'grease_gun',
      inspector: 'تیم نگهداری ایستگاه بالا',
      dateJalali: '1403/08/05',
      dateGregorian: '2024-10-26',
      time: '11:30',
      nextScheduledDate: '1403/11/05',
      intervalHours: 500,
      reportPdfUrl: '',
      reportPdfName: 'Return_Wheel_Lube_Check.pdf',
      reportPdfSize: 640000,
      notes: 'گریس‌کاری رولبرینگ اصلی شفت فلکه؛ کاسه‌نمدها سالم و بدون نشتی هستند.'
    }
  ],
  cmMflTests: [
    {
      id: 'cm-mfl-1',
      subDomain: 'mfl_cable',
      equipmentId: 'haul-rope-1',
      equipmentName: 'کابل کششی اصلی خط ۱ (Haul Rope Line 1)',
      cableName: 'کابل کششی اصلی خط ۱ (Haul Rope Line 1)',
      cableDiameter: 52,
      cableLength: 3850,
      defectPosition: 1420.5,
      defectType: 'LMA',
      lmaPercentage: 6.8,
      criticality: 'SERIOUS',
      brokenWiresCount: 2,
      inspector: 'شرکت بازرسی فنی بین‌المللی کابل (EN 12927 Inspector)',
      dateJalali: '1403/09/12',
      dateGregorian: '2024-12-02',
      time: '09:00',
      reportPdfUrl: '',
      reportPdfName: 'MFL_HaulRope_Inspection_EN12927.pdf',
      reportPdfSize: 5800000,
      recommendedAction: 'هشدار سطح جدی (6.8% LMA): انجام آزمون مجدد ظرف ۴۵ روز آینده و بازرسی چشمی موضعی.',
      notes: 'کاهش مساحت سطح مقطع فلزی در نزدیکی دکل شماره ۶ ثبت شده است.'
    }
  ],
  cmNdtTests: [
    {
      id: 'cm-ndt-1',
      subDomain: 'ndt',
      equipmentId: 'grip-batch-1',
      equipmentName: 'کلمپ‌ها و گیره‌های کابل (Cable Grips)',
      componentName: 'کلمپ‌ها و گیره‌های کابل (Cable Grips)',
      method: 'MT',
      standardApplied: 'EN 1709 / ISO 9712',
      inspector: 'مهندس کاظمی (مفتش NDT سطح ۲)',
      inspectorLevel: 'Level II (ASNT / ISO 9712)',
      dateJalali: '1403/09/05',
      dateGregorian: '2024-11-25',
      time: '10:00',
      result: 'PASS',
      defectDescription: 'هیچ‌گونه نشانه خطی، ترک ناشی از خستگی یا عیب سطحی در پین و فک گیره‌ها مشاهده نشد.',
      reportPdfUrl: '',
      reportPdfName: 'NDT_MT_Grip_Report_1403.pdf',
      reportPdfSize: 3100000,
      notes: 'تست با یوک مغناطیسی و پودر فلوئورسنتی زیر نور فرابنفش انجام گردید.'
    }
  ],
  settings: {
    companyName: 'CMMS کیش',
    logoUrl: '/logo.png',
    complexPortalTitle: 'سامانه انتخاب و مدیریت مجموعه‌ها',
    complexPortalTitleEn: 'Complex Selection & Management Portal',
  },
  pendingApprovalRequests: [
    {
      id: 'req-101',
      initiatorId: '3',
      initiatorName: 'Line Supervisor',
      initiatorRole: 'LINE_SUPERVISOR',
      targetEntityType: 'TASK',
      targetEntityId: '1',
      targetEntityName: 'بررسی لرزش و بلبرینگ‌های الکتروموتور',
      actionType: 'EDIT',
      proposedDiff: {
        before: { frequency: 'هفتگی', criteria: 'سرعت ارتعاشات کمتر از 2.8 mm/s' },
        after: { frequency: 'دو هفته یکبار', criteria: 'سرعت ارتعاشات کمتر از 2.3 mm/s (افزایش حساسیت پایش)' }
      },
      rationale: 'با توجه به نصب سنسورهای ارتعاش‌سنجی آنلاین، تناوب بازرسی دوره‌ای تعدیل و حد مجاز زون بحرانی سخت‌گیرانه‌تر شد.',
      complexId: 'c1',
      lineId: 'l1',
      escalationTier: 'FACILITY_MANAGER',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'req-102',
      initiatorId: '4',
      initiatorName: 'Station Operator',
      initiatorRole: 'STATION_OPERATOR',
      targetEntityType: 'EQUIPMENT',
      targetEntityId: '3',
      targetEntityName: 'دیزل ژنراتور اضطراری (Diesel Generator)',
      actionType: 'DELETE',
      proposedDiff: {
        before: { name: 'دیزل ژنراتور اضطراری (Diesel Generator)', code: 'GEN-01' },
        after: null
      },
      rationale: 'ژنراتور قدیمی دمونتاژ شده و قرار است با مدل جدید کاترپیلار در ایستگاه ۱ جایگزین شود.',
      complexId: 'c1',
      lineId: 'l1',
      stationId: 's1',
      escalationTier: 'FACILITY_MANAGER',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 8).toISOString()
    }
  ],
});

function loadDb(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(raw);
      if (!loaded.lubrications || !loaded.lubrications.length) {
        loaded.lubrications = defaultDb().lubrications;
      }
      if (!loaded.cmVibrations) loaded.cmVibrations = defaultDb().cmVibrations;
      if (!loaded.cmThermographies) loaded.cmThermographies = defaultDb().cmThermographies;
      if (!loaded.cmOilAnalyses) loaded.cmOilAnalyses = defaultDb().cmOilAnalyses;
      if (!loaded.cmLubrications) loaded.cmLubrications = defaultDb().cmLubrications;
      if (!loaded.cmMflTests) loaded.cmMflTests = defaultDb().cmMflTests;
      if (!loaded.cmNdtTests) loaded.cmNdtTests = defaultDb().cmNdtTests;
      if (!loaded.pendingApprovalRequests || !loaded.pendingApprovalRequests.length) {
        loaded.pendingApprovalRequests = defaultDb().pendingApprovalRequests;
      }
      if (!loaded.settings) {
        loaded.settings = defaultDb().settings;
      } else if (!loaded.settings.complexPortalTitle) {
        loaded.settings.complexPortalTitle = 'سامانه انتخاب و مدیریت مجموعه‌ها';
      }
      if (Array.isArray(loaded.complexes)) {
        loaded.complexes.forEach((c: any) => {
          if (!c.imageUrl) {
            c.imageUrl = c.name?.includes('توچال') 
              ? 'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=800&q=80'
              : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
          }
          if (!c.description) {
            c.description = c.name?.includes('توچال')
              ? 'طولانی‌ترین خط تله‌کابین تفریحی و ورزشی خاورمیانه با ایستگاه‌های ۷ گانه در ارتفاعات البرز'
              : 'مجموعه تله‌کابین ساحلی میکامال کیش با کابین‌های مدرن و چشم‌انداز خلیج فارس';
          }
        });
      }
      return loaded;
    }
  } catch (err) {
    console.error('Failed to load db.json, starting from defaults:', err);
  }
  return defaultDb();
}

const db: any = loadDb();

let saveScheduled = false;
function persistDb() {
  if (saveScheduled) return;
  saveScheduled = true;
  setTimeout(() => {
    saveScheduled = false;
    try {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error('Failed to persist db.json:', err);
    }
  }, 200);
}

// --- SECURITY & RBAC MIDDLEWARE ---

const ADMIN_ROLES = ['SUPER_ADMIN', 'manager', 'GENERAL_MANAGER'];

const getRoleTierNumber = (role: string): number => {
  if (['GENERAL_MANAGER', 'SUPER_ADMIN', 'manager'].includes(role)) return 4;
  if (['FACILITY_MANAGER', 'COMPLEX_ADMIN'].includes(role)) return 3;
  if (['LINE_SPECIALIST', 'LINE_SUPERVISOR'].includes(role)) return 2;
  if (['LINE_OPERATOR', 'STATION_OPERATOR', 'operator'].includes(role)) return 1;
  return 0;
};

const verifyToken = (req: any, res: any, next: any) => {
  const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.users.find((u: any) => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized: Invalid user' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const role = req.user.role;
    const roleAliases: Record<string, string[]> = {
      'GENERAL_MANAGER': ['GENERAL_MANAGER', 'SUPER_ADMIN', 'manager'],
      'SUPER_ADMIN': ['GENERAL_MANAGER', 'SUPER_ADMIN', 'manager'],
      'manager': ['GENERAL_MANAGER', 'SUPER_ADMIN', 'manager'],
      'FACILITY_MANAGER': ['FACILITY_MANAGER', 'COMPLEX_ADMIN'],
      'COMPLEX_ADMIN': ['FACILITY_MANAGER', 'COMPLEX_ADMIN'],
      'LINE_SPECIALIST': ['LINE_SPECIALIST', 'LINE_SUPERVISOR'],
      'LINE_SUPERVISOR': ['LINE_SPECIALIST', 'LINE_SUPERVISOR'],
      'LINE_OPERATOR': ['LINE_OPERATOR', 'STATION_OPERATOR', 'operator'],
      'STATION_OPERATOR': ['LINE_OPERATOR', 'STATION_OPERATOR', 'operator'],
      'operator': ['LINE_OPERATOR', 'STATION_OPERATOR', 'operator'],
    };
    const effectiveRoles = roleAliases[role] || [role];
    if (!effectiveRoles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

const restrictToTenant = (level: 'COMPLEX' | 'LINE' | 'STATION', getIds: (req: any) => { complexId?: string; lineId?: string; stationId?: string }) => {
  return (req: any, res: any, next: any) => {
    if (ADMIN_ROLES.includes(req.user.role)) return next();

    const ids = getIds(req);
    if (level === 'COMPLEX') {
      if (!req.user.complexId || req.user.complexId !== ids.complexId) {
        return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
      }
    }
    if (level === 'LINE') {
      if (req.user.role !== 'COMPLEX_ADMIN' && (!req.user.lineId || req.user.lineId !== ids.lineId)) {
        return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
      }
    }
    if (level === 'STATION') {
      if (!req.user.stationId || req.user.stationId !== ids.stationId) {
        return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
      }
    }
    next();
  };
};

// Resolve an equipment id up to its complex/line/station ids, used for tenant checks / log scoping.
function equipmentScope(equipmentId: string) {
  const eq = db.equipments.find((e: any) => e.id === equipmentId);
  if (!eq) return {};
  const station = db.stations.find((s: any) => s.id === eq.stationId);
  const line = station ? db.lines.find((l: any) => l.id === station.lineId) : undefined;
  return { complexId: line?.complexId, lineId: station?.lineId, stationId: eq.stationId };
}

// --- UPLOADS ---

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const imageUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('فقط فایل‌های تصویری مجاز هستند (png, jpg, jpeg, webp, gif)'));
  },
});

const excelUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('فقط فایل‌های اکسل (xlsx, xls) مجاز هستند'));
  },
});

const pdfUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max as required
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های سند رسمی با فرمت PDF مجاز هستند'));
    }
  },
});

app.post('/api/upload-image', verifyToken, imageUpload.single('image'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const imageUrl = '/uploads/' + req.file.filename;
  res.json({ imageUrl });
});

app.post('/api/upload-pdf', (req: any, res, next) => {
  pdfUpload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'file', maxCount: 1 }])(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'خطا در بارگذاری فایل PDF' });
    }
    const uploadedFile = req.files?.pdf?.[0] || req.files?.file?.[0] || req.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'هیچ فایل PDF بارگذاری نشد' });
    }
    const pdfUrl = '/uploads/' + uploadedFile.filename;
    res.json({
      pdfUrl,
      fileName: uploadedFile.originalname,
      fileSize: uploadedFile.size,
    });
  });
});

// Helper to log activities — always uses the verified user from the JWT, never
// client-supplied headers (which previously could be spoofed to attribute
// actions to a different user).
const logActivity = (user: any, action: string, details: string, scope?: { complexId?: string; lineId?: string; stationId?: string }) => {
  db.logs.unshift({
    id: Date.now().toString(),
    userId: user?.id || 'system',
    userName: user?.name || 'سیستم',
    action,
    details,
    timestamp: new Date().toISOString(),
    ...scope,
  });
  persistDb();
};

// API Routes

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });

  const user = db.users.find((u: any) => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
    });
    const { password: _pw, ...userWithoutPass } = user;
    logActivity(user, 'ورود به سیستم', 'ورود موفقیت‌آمیز');
    res.json(userWithoutPass);
  } else {
    res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' });
  }
});

app.post('/api/logout', verifyToken, (req: any, res) => {
  logActivity(req.user, 'خروج از سیستم', 'خروج موفقیت‌آمیز');
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/me', verifyToken, (req: any, res) => {
  const { password, ...userWithoutPass } = req.user;
  res.json(userWithoutPass);
});

// --- USERS (admin roles only) ---

app.get('/api/users', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  let users = db.users;
  if (req.user.role === 'COMPLEX_ADMIN') {
    users = users.filter((u: any) => u.complexId === req.user.complexId);
  }
  res.json(users.map(({ password, ...u }: any) => u));
});

const PROTECTED_USER_FIELDS = ['role', 'complexId', 'lineId', 'stationId'];

app.put('/api/users/:id', verifyToken, (req: any, res) => {
  const index = db.users.findIndex((u: any) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  const isSelf = req.user.id === req.params.id;
  const isAdmin = ADMIN_ROLES.includes(req.user.role);

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
  }

  const updateData: any = { ...req.body };
  // Only SUPER_ADMIN/manager may change role or org-scope assignment —
  // otherwise a user could edit their own record and grant themselves
  // SUPER_ADMIN (this was previously possible for anyone, unauthenticated).
  if (!isAdmin) {
    for (const field of PROTECTED_USER_FIELDS) delete updateData[field];
    delete updateData.username;
  }
  delete updateData.id;

  if (updateData.password) {
    updateData.password = bcrypt.hashSync(updateData.password, 10);
  } else {
    delete updateData.password;
  }

  db.users[index] = { ...db.users[index], ...updateData };
  logActivity(req.user, 'ویرایش کاربر', `اطلاعات کاربری ${db.users[index].username} ویرایش شد`);
  const { password, ...userWithoutPassword } = db.users[index];
  res.json(userWithoutPassword);
});

app.post('/api/users', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  const { username, password, name, role, phone, position, complexId, lineId, stationId } = req.body || {};
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: 'همه فیلدهای الزامی را پر کنید' });
  }
  if (db.users.find((u: any) => u.username === username)) {
    return res.status(400).json({ message: 'نام کاربری تکراری است' });
  }
  if (req.user.role === 'COMPLEX_ADMIN' && (ADMIN_ROLES.includes(role) || role === 'COMPLEX_ADMIN')) {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
  }

  const newUser = {
    id: Date.now().toString(),
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    role,
    phone,
    position,
    complexId: req.user.role === 'COMPLEX_ADMIN' ? req.user.complexId : complexId,
    lineId,
    stationId,
  };
  db.users.push(newUser);
  logActivity(req.user, 'ایجاد کاربر جدید', `کاربر ${name} با نقش ${role} افزوده شد.`);
  const { password: _, ...userWithoutPassword } = newUser;
  res.json(userWithoutPassword);
});

app.delete('/api/users/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  const index = db.users.findIndex((u: any) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  const target = db.users[index];
  if (req.user.role === 'COMPLEX_ADMIN' && target.complexId !== req.user.complexId) {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'نمی‌توانید حساب کاربری خودتان را حذف کنید' });
  }

  db.users.splice(index, 1);
  logActivity(req.user, 'حذف کاربر', `کاربر "${target.name}" حذف شد`);
  res.json({ success: true });
});

// --- HIERARCHY ENDPOINTS ---

app.get('/api/complexes', verifyToken, (req: any, res) => {
  const result = db.complexes.map(({ password, ...c }: any) => {
    // Calculate pending approval requests count for this complex
    const pendingApprovalCount = (db.pendingApprovalRequests || []).filter(
      (r: any) => r.status === 'PENDING' && (!r.complexId || r.complexId === c.id)
    ).length;

    // Calculate lines count
    const complexLines = (db.lines || []).filter((l: any) => l.complexId === c.id);
    const complexLineIds = complexLines.map((l: any) => l.id);
    const complexStations = (db.stations || []).filter((s: any) => complexLineIds.includes(s.lineId));
    const complexStationIds = complexStations.map((s: any) => s.id);
    const complexEquipments = (db.equipments || []).filter((e: any) => complexStationIds.includes(e.stationId));
    const complexEqIds = complexEquipments.map((e: any) => e.id);
    const complexTasks = (db.tasks || []).filter((t: any) => complexEqIds.includes(t.equipmentId));
    const complexTaskIds = complexTasks.map((t: any) => t.id);

    // Latest inspection date
    const allDates: string[] = [];
    (db.inspections || []).filter((i: any) => complexTaskIds.includes(i.taskId)).forEach((i: any) => {
      if (i.dateString) allDates.push(i.dateString);
      else if (i.date) allDates.push(i.date.slice(0, 10));
    });
    (db.cmVibrations || []).forEach((v: any) => { if (v.dateJalali) allDates.push(v.dateJalali); });
    (db.cmThermographies || []).forEach((t: any) => { if (t.dateJalali) allDates.push(t.dateJalali); });
    (db.cmOilAnalyses || []).forEach((o: any) => { if (o.sampleDateJalali) allDates.push(o.sampleDateJalali); });
    (db.cmLubrications || []).forEach((l: any) => { if (l.dateJalali) allDates.push(l.dateJalali); });
    (db.cmMflTests || []).forEach((m: any) => { if (m.dateJalali) allDates.push(m.dateJalali); });
    (db.cmNdtTests || []).forEach((n: any) => { if (n.dateJalali) allDates.push(n.dateJalali); });

    const sortedDates = allDates.filter(Boolean).sort().reverse();
    const lastInspectionDate = sortedDates[0] || '۱۴۰۳/۰۹/۲۸';
    const lastVisitDate = c.lastVisitDate || (c.name?.includes('توچال') ? '۱۴۰۳/۰۹/۱۵ (ممیزی ایمنی سالانه البرز)' : '۱۴۰۳/۰۸/۲۲ (بازدید میدانی دوره‌ای)');

    return {
      ...c,
      linesCount: complexLines.length,
      pendingApprovalCount,
      lastInspectionDate,
      lastVisitDate
    };
  });
  res.json(result);
});

app.post('/api/complexes/:id/verify-password', verifyToken, (req: any, res) => {
  const complex = db.complexes.find((c: any) => c.id === req.params.id);
  if (!complex) return res.status(404).json({ error: 'Complex not found' });
  if (!complex.password) return res.json({ success: true });
  if (bcrypt.compareSync(req.body?.password || '', complex.password)) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'رمز عبور اشتباه است' });
});

app.post('/api/complexes', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'GENERAL_MANAGER']), (req: any, res) => {
  const { password, ...rest } = req.body || {};
  const newComplex: any = { id: Date.now().toString(), ...rest, createdAt: new Date().toISOString() };
  if (password) newComplex.password = bcrypt.hashSync(password, 10);
  db.complexes.push(newComplex);
  logActivity(req.user, 'ایجاد مجموعه', `مجموعه "${newComplex.name}" افزوده شد`);
  const { password: _pw, ...safe } = newComplex;
  res.json(safe);
});

app.delete('/api/complexes/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'GENERAL_MANAGER']), (req: any, res) => {
  const index = db.complexes.findIndex((c: any) => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  const deleted = db.complexes[index];
  db.complexes.splice(index, 1);
  persistDb();
  logActivity(req.user, 'حذف مجموعه', `مجموعه "${deleted.name}" حذف شد`);
  res.json({ success: true });
});

// Facility Cover Photo Asset Update with strict RBAC:
// Only General Manager OR Facility Manager of this complex can update.
// Subordinate tiers (Specialist, Operator) are rejected with 403.
app.put('/api/complexes/:id/image', verifyToken, (req: any, res) => {
  const tier = getRoleTierNumber(req.user.role);
  const isGM = tier >= 4;
  const isAssignedFM = tier === 3 && req.user.complexId === req.params.id;

  if (!isGM && !isAssignedFM) {
    return res.status(403).json({ 
      error: 'دسترسی غیرمجاز: بارگذاری و ویرایش تصویر مجموعه منحصراً در اختیار مدیر کل یا مدیر همان مجموعه می‌باشد.' 
    });
  }

  const complex = db.complexes.find((c: any) => c.id === req.params.id);
  if (!complex) return res.status(404).json({ error: 'مجموعه یافت نشد' });

  complex.imageUrl = req.body.imageUrl;
  persistDb();
  logActivity(req.user, 'ویرایش تصویر مجموعه', `تصویر مجموعه "${complex.name}" بروزرسانی شد`, { complexId: complex.id });
  const { password: _pw, ...safe } = complex;
  res.json(safe);
});

app.put('/api/complexes/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'GENERAL_MANAGER', 'COMPLEX_ADMIN', 'FACILITY_MANAGER']), (req: any, res) => {
  const tier = getRoleTierNumber(req.user.role);
  if (tier === 3 && req.user.complexId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }

  const complex = db.complexes.find((c: any) => c.id === req.params.id);
  if (!complex) return res.status(404).json({ error: 'Complex not found' });
  const { password, ...rest } = req.body || {};
  Object.assign(complex, rest);
  if (password) complex.password = bcrypt.hashSync(password, 10);
  persistDb();
  logActivity(req.user, 'ویرایش مجموعه', `اطلاعات مجموعه "${complex.name}" ویرایش شد`);
  const { password: _pw, ...safe } = complex;
  res.json(safe);
});

// --- APPROVAL WORKFLOW ENDPOINTS (REQUESTS INBOX) ---

app.get(['/api/approval-requests', '/api/requests'], verifyToken, (req: any, res) => {
  if (!db.pendingApprovalRequests) db.pendingApprovalRequests = [];
  const tier = getRoleTierNumber(req.user.role);

  let requests = db.pendingApprovalRequests;
  if (tier >= 4) {
    // General Manager sees all requests
    requests = db.pendingApprovalRequests;
  } else if (tier === 3) {
    // Facility Manager sees requests for their complex
    requests = db.pendingApprovalRequests.filter((r: any) => !r.complexId || r.complexId === req.user.complexId);
  } else if (tier === 2) {
    // Line Specialist sees requests for their line
    requests = db.pendingApprovalRequests.filter((r: any) => !r.lineId || r.lineId === req.user.lineId);
  } else {
    // Line Operator sees their own requests
    requests = db.pendingApprovalRequests.filter((r: any) => r.initiatorId === req.user.id);
  }

  if (req.query.status) {
    requests = requests.filter((r: any) => r.status === req.query.status);
  }

  res.json(requests);
});

app.post('/api/approval-requests', verifyToken, (req: any, res) => {
  if (!db.pendingApprovalRequests) db.pendingApprovalRequests = [];
  const {
    targetEntityType,
    targetEntityId,
    targetEntityName,
    actionType,
    proposedDiff,
    rationale,
    complexId,
    lineId,
    stationId,
    escalationTier
  } = req.body || {};

  if (!rationale || !targetEntityType || !actionType) {
    return res.status(400).json({ error: 'لطفاً تمامی اطلاعات الزامی شامل علت و ضرورت اقدام را وارد کنید.' });
  }

  const initiatorTier = getRoleTierNumber(req.user.role);
  let resolvedTier = escalationTier;
  if (!resolvedTier) {
    if (initiatorTier === 1) resolvedTier = actionType === 'DELETE' ? 'FACILITY_MANAGER' : 'SPECIALIST';
    else if (initiatorTier === 2) resolvedTier = 'FACILITY_MANAGER';
    else resolvedTier = 'GENERAL_MANAGER';
  }

  const newRequest = {
    id: 'req-' + Date.now(),
    initiatorId: req.user.id,
    initiatorName: req.user.name,
    initiatorRole: req.user.role,
    targetEntityType,
    targetEntityId,
    targetEntityName: targetEntityName || targetEntityId,
    actionType,
    proposedDiff: proposedDiff || {},
    rationale,
    complexId: complexId || req.user.complexId,
    lineId: lineId || req.user.lineId,
    stationId: stationId || req.user.stationId,
    escalationTier: resolvedTier,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.pendingApprovalRequests.unshift(newRequest);
  persistDb();

  logActivity(
    req.user,
    'ثبت درخواست تاییدیه',
    `درخواست ${actionType === 'DELETE' ? 'حذف' : 'ویرایش'} برای ${newRequest.targetEntityName} (علت: ${rationale}) ثبت شد`,
    { complexId: newRequest.complexId, lineId: newRequest.lineId, stationId: newRequest.stationId }
  );

  io.emit('new_approval_request', newRequest);
  res.json(newRequest);
});

app.post('/api/approval-requests/:id/approve', verifyToken, (req: any, res) => {
  const reviewerTier = getRoleTierNumber(req.user.role);
  if (reviewerTier < 2) {
    return res.status(403).json({ error: 'شما سطح دسترسی لازم جهت تایید درخواست را ندارید.' });
  }

  const request = (db.pendingApprovalRequests || []).find((r: any) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'درخواست یافت نشد.' });
  if (request.status !== 'PENDING') {
    return res.status(400).json({ error: 'این درخواست قبلاً تعیین وضعیت شده است.' });
  }

  // Execute the approved action safely
  try {
    if (request.actionType === 'DELETE') {
      if (request.targetEntityType === 'EQUIPMENT') {
        db.equipments = (db.equipments || []).filter((e: any) => e.id !== request.targetEntityId);
        db.tasks = (db.tasks || []).filter((t: any) => t.equipmentId !== request.targetEntityId);
      } else if (request.targetEntityType === 'TASK') {
        db.tasks = (db.tasks || []).filter((t: any) => t.id !== request.targetEntityId);
      } else if (request.targetEntityType === 'STATION') {
        db.stations = (db.stations || []).filter((s: any) => s.id !== request.targetEntityId);
        const childEqIds = (db.equipments || []).filter((e: any) => e.stationId === request.targetEntityId).map((e: any) => e.id);
        db.equipments = (db.equipments || []).filter((e: any) => e.stationId !== request.targetEntityId);
        db.tasks = (db.tasks || []).filter((t: any) => !childEqIds.includes(t.equipmentId));
      } else if (request.targetEntityType === 'LINE') {
        db.lines = (db.lines || []).filter((l: any) => l.id !== request.targetEntityId);
      }
    } else if (request.actionType === 'EDIT') {
      if (request.targetEntityType === 'TASK' && request.proposedDiff?.after) {
        const idx = (db.tasks || []).findIndex((t: any) => t.id === request.targetEntityId);
        if (idx !== -1) {
          db.tasks[idx] = { ...db.tasks[idx], ...request.proposedDiff.after };
        }
      } else if (request.targetEntityType === 'EQUIPMENT' && request.proposedDiff?.after) {
        const idx = (db.equipments || []).findIndex((e: any) => e.id === request.targetEntityId);
        if (idx !== -1) {
          db.equipments[idx] = { ...db.equipments[idx], ...request.proposedDiff.after };
        }
      }
    }

    request.status = 'APPROVED';
    request.reviewedBy = {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    };
    request.reviewedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    persistDb();
    logActivity(
      req.user,
      'تایید درخواست تغییر/حذف',
      `درخواست ${request.id} (${request.targetEntityName}) توسط ${req.user.name} تایید و در سیستم اعمال شد.`,
      { complexId: request.complexId, lineId: request.lineId }
    );

    io.emit('approval_request_updated', request);
    res.json({ success: true, request });
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در اعمال درخواست: ' + (err?.message || '') });
  }
});

app.post('/api/approval-requests/:id/reject', verifyToken, (req: any, res) => {
  const reviewerTier = getRoleTierNumber(req.user.role);
  if (reviewerTier < 2) {
    return res.status(403).json({ error: 'شما سطح دسترسی لازم جهت بررسی درخواست را ندارید.' });
  }

  const request = (db.pendingApprovalRequests || []).find((r: any) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'درخواست یافت نشد.' });
  if (request.status !== 'PENDING') {
    return res.status(400).json({ error: 'این درخواست قبلاً تعیین وضعیت شده است.' });
  }

  const { rejectionReason } = req.body || {};
  if (!rejectionReason) {
    return res.status(400).json({ error: 'ذکر دلیل رد درخواست الزامی است.' });
  }

  request.status = 'REJECTED';
  request.rejectionReason = rejectionReason;
  request.reviewedBy = {
    id: req.user.id,
    name: req.user.name,
    role: req.user.role
  };
  request.reviewedAt = new Date().toISOString();
  request.updatedAt = new Date().toISOString();

  persistDb();
  logActivity(
    req.user,
    'رد درخواست تغییر/حذف',
    `درخواست ${request.id} (${request.targetEntityName}) توسط ${req.user.name} رد شد. علت: ${rejectionReason}`,
    { complexId: request.complexId, lineId: request.lineId }
  );

  io.emit('approval_request_updated', request);
  res.json({ success: true, request });
});

app.get(
  '/api/complexes/:complexId/lines',
  verifyToken,
  restrictToTenant('COMPLEX', (req) => ({ complexId: req.params.complexId })),
  (req: any, res) => {
    res.json(db.lines.filter((l: any) => l.complexId === req.params.complexId));
  }
);

app.post(
  '/api/complexes/:complexId/lines',
  verifyToken,
  requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']),
  restrictToTenant('COMPLEX', (req) => ({ complexId: req.params.complexId })),
  (req: any, res) => {
    const newLine = { id: Date.now().toString(), complexId: req.params.complexId, ...req.body, createdAt: new Date().toISOString() };
    db.lines.push(newLine);
    logActivity(req.user, 'ایجاد خط', `خط "${newLine.name}" افزوده شد`, { complexId: req.params.complexId });
    res.json(newLine);
  }
);

app.delete('/api/lines/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  const index = db.lines.findIndex((l: any) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  const line = db.lines[index];
  if (req.user.role === 'COMPLEX_ADMIN' && req.user.complexId !== line.complexId) {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }
  db.lines.splice(index, 1);
  logActivity(req.user, 'حذف خط', `خط "${line.name}" حذف شد`, { complexId: line.complexId });
  res.json({ success: true });
});

app.get('/api/lines', verifyToken, (req: any, res) => {
  res.json(db.lines || []);
});

app.get('/api/stations', verifyToken, (req: any, res) => {
  res.json(db.stations || []);
});

app.get(
  '/api/lines/:lineId/stations',
  verifyToken,
  restrictToTenant('LINE', (req) => ({ lineId: req.params.lineId })),
  (req: any, res) => {
    res.json(db.stations.filter((s: any) => s.lineId === req.params.lineId));
  }
);

app.post(
  '/api/lines/:lineId/stations',
  verifyToken,
  requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']),
  restrictToTenant('LINE', (req) => ({ lineId: req.params.lineId })),
  (req: any, res) => {
    const newStation = { id: Date.now().toString(), lineId: req.params.lineId, ...req.body, createdAt: new Date().toISOString() };
    db.stations.push(newStation);
    logActivity(req.user, 'ایجاد ایستگاه', `ایستگاه "${newStation.name}" افزوده شد`, { lineId: req.params.lineId });
    res.json(newStation);
  }
);

app.delete('/api/stations/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const index = db.stations.findIndex((s: any) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  const station = db.stations[index];
  if (!ADMIN_ROLES.includes(req.user.role) && req.user.lineId !== station.lineId) {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }
  db.stations.splice(index, 1);
  logActivity(req.user, 'حذف ایستگاه', `ایستگاه "${station.name}" حذف شد`, { lineId: station.lineId });
  res.json({ success: true });
});

app.get(
  '/api/stations/:stationId/equipments',
  verifyToken,
  restrictToTenant('STATION', (req) => ({ stationId: req.params.stationId })),
  (req: any, res) => {
    res.json(db.equipments.filter((e: any) => e.stationId === req.params.stationId));
  }
);

app.get('/api/equipments', verifyToken, (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  let stations = db.stations;
  if (lineId) {
    stations = stations.filter((s: any) => s.lineId === lineId);
  } else if (complexId) {
    const lines = db.lines.filter((l: any) => l.complexId === complexId).map((l: any) => l.id);
    stations = stations.filter((s: any) => lines.includes(s.lineId));
  } else if (!ADMIN_ROLES.includes(req.user.role)) {
    // Non-admins without an explicit filter only see equipment within their
    // own scope, instead of the entire fleet.
    if (req.user.stationId) stations = stations.filter((s: any) => s.id === req.user.stationId);
    else if (req.user.lineId) stations = stations.filter((s: any) => s.lineId === req.user.lineId);
    else if (req.user.complexId) {
      const lines = db.lines.filter((l: any) => l.complexId === req.user.complexId).map((l: any) => l.id);
      stations = stations.filter((s: any) => lines.includes(s.lineId));
    }
  }

  if (!lineId && !complexId && ADMIN_ROLES.includes(req.user.role)) {
    return res.json(db.equipments);
  }

  const stationIds = stations.map((s: any) => s.id);
  res.json(db.equipments.filter((e: any) => stationIds.includes(e.stationId)));
});

app.post('/api/equipments', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  const newEq = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
  if (!newEq.imageUrl && req.body.requireImage) {
    return res.status(400).json({ error: 'تصویر تجهیز الزامی است.' });
  }
  db.equipments.push(newEq);
  logActivity(req.user, 'ایجاد تجهیز', `تجهیز "${newEq.name}" افزوده شد`, equipmentScope(newEq.id));
  res.json(newEq);
});

// NOTE: this route used to be defined twice — the first (partial,
// imageUrl-only) definition always matched first and silently swallowed
// edits to name/code/description. There is now a single definition that
// updates the full record.
app.put('/api/equipments/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const idx = db.equipments.findIndex((e: any) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Equipment not found' });

  const scope = equipmentScope(req.params.id);
  if (req.user.role === 'LINE_SUPERVISOR' && req.user.lineId !== scope.lineId) {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }

  const updateData = { ...req.body };
  delete updateData.id;
  db.equipments[idx] = { ...db.equipments[idx], ...updateData };
  logActivity(req.user, 'ویرایش تجهیز', `تجهیز "${db.equipments[idx].name}" ویرایش شد`, scope);
  res.json(db.equipments[idx]);
});

app.delete('/api/equipments/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  const index = db.equipments.findIndex((e: any) => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Equipment not found' });

  const deletedEq = db.equipments[index];
  const scope = equipmentScope(req.params.id);
  db.equipments.splice(index, 1);
  db.tasks = db.tasks.filter((t: any) => t.equipmentId !== req.params.id);

  logActivity(req.user, 'حذف تجهیز', `تجهیز "${deletedEq.name}" حذف شد`, scope);
  res.json({ success: true });
});

app.get('/api/equipments/:id/tasks', verifyToken, (req: any, res) => {
  res.json(db.tasks.filter((t: any) => t.equipmentId === req.params.id));
});

app.post('/api/equipments/:id/tasks', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const newTask = {
    id: Date.now().toString(),
    equipmentId: req.params.id,
    ...req.body,
    lastDate: '',
    nextDate: calculateNextDate(req.body.frequency) || '',
  };
  db.tasks.push(newTask);
  logActivity(req.user, 'ایجاد دستورکار', `دستورکار "${newTask.subject}" افزوده شد`, equipmentScope(req.params.id));
  res.json(newTask);
});

app.delete('/api/tasks/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const index = db.tasks.findIndex((t: any) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  const deleted = db.tasks[index];
  db.tasks.splice(index, 1);
  logActivity(req.user, 'حذف دستورکار', `دستورکار "${deleted.subject}" حذف شد`, equipmentScope(deleted.equipmentId));
  res.json({ success: true });
});

app.put('/api/tasks/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'GENERAL_MANAGER', 'COMPLEX_ADMIN', 'FACILITY_MANAGER', 'LINE_SUPERVISOR', 'LINE_SPECIALIST']), (req: any, res) => {
  const index = db.tasks.findIndex((t: any) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  const oldTask = db.tasks[index];
  db.tasks[index] = { ...oldTask, ...req.body };
  persistDb();
  logActivity(req.user, 'ویرایش دستورکار', `دستورکار "${db.tasks[index].subject}" ویرایش شد`, equipmentScope(db.tasks[index].equipmentId));
  res.json(db.tasks[index]);
});

// --- GLOBAL UNIFIED SEARCH ENDPOINT ---

app.get('/api/search', verifyToken, (req: any, res) => {
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  if (!q) return res.json({ assets: [], inspections: [], workOrders: [], approvalRequests: [] });

  const assets = (db.equipments || [])
    .filter((e: any) => 
      (e.name || '').toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    )
    .slice(0, 10);

  const workOrders = (db.tasks || [])
    .filter((t: any) =>
      (t.subject || '').toLowerCase().includes(q) ||
      (t.instructions || '').toLowerCase().includes(q) ||
      (t.criteria || '').toLowerCase().includes(q) ||
      (t.standard || '').toLowerCase().includes(q)
    )
    .slice(0, 10);

  // Search CM inspections across all domains
  const inspections: any[] = [];
  (db.cmVibrations || []).forEach((v: any) => {
    if ((v.equipmentName || '').toLowerCase().includes(q) || (v.notes || '').toLowerCase().includes(q) || (v.technician || '').toLowerCase().includes(q)) {
      inspections.push({ ...v, domain: 'VIBRATION', label: `آنالیز ارتعاشات: ${v.equipmentName}` });
    }
  });
  (db.cmThermographies || []).forEach((t: any) => {
    if ((t.equipmentName || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || (t.findings || '').toLowerCase().includes(q)) {
      inspections.push({ ...t, domain: 'THERMOGRAPHY', label: `ترموگرافی فروسرخ: ${t.equipmentName}` });
    }
  });
  (db.cmOilAnalyses || []).forEach((o: any) => {
    if ((o.equipmentName || '').toLowerCase().includes(q) || (o.notes || '').toLowerCase().includes(q) || (o.labReportNo || '').toLowerCase().includes(q)) {
      inspections.push({ ...o, domain: 'OIL', label: `آنالیز روغن: ${o.equipmentName}` });
    }
  });
  (db.cmMflTests || []).forEach((m: any) => {
    if ((m.ropeName || '').toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q)) {
      inspections.push({ ...m, domain: 'MFL', label: `تست طناب فولادی MFL: ${m.ropeName}` });
    }
  });
  (db.cmNdtTests || []).forEach((n: any) => {
    if ((n.componentName || '').toLowerCase().includes(q) || (n.notes || '').toLowerCase().includes(q) || (n.method || '').toLowerCase().includes(q)) {
      inspections.push({ ...n, domain: 'NDT', label: `بازرسی غیرمخرب NDT: ${n.componentName}` });
    }
  });

  const approvalRequests = (db.pendingApprovalRequests || [])
    .filter((r: any) =>
      (r.targetEntityName || '').toLowerCase().includes(q) ||
      (r.rationale || '').toLowerCase().includes(q) ||
      (r.initiatorName || '').toLowerCase().includes(q)
    )
    .slice(0, 10);

  res.json({
    assets,
    workOrders,
    inspections: inspections.slice(0, 10),
    approvalRequests
  });
});

app.get('/api/tasks', verifyToken, (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  if (!lineId && !complexId) return res.json(db.tasks);

  let stations = db.stations;
  if (lineId) {
    stations = stations.filter((s: any) => s.lineId === lineId);
  } else if (complexId) {
    const lines = db.lines.filter((l: any) => l.complexId === complexId).map((l: any) => l.id);
    stations = stations.filter((s: any) => lines.includes(s.lineId));
  }

  const stationIds = stations.map((s: any) => s.id);
  const eqIds = db.equipments.filter((e: any) => stationIds.includes(e.stationId)).map((e: any) => e.id);

  res.json(db.tasks.filter((t: any) => eqIds.includes(t.equipmentId)));
});

app.post('/api/tasks', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const newTask = { id: Date.now().toString(), ...req.body };
  db.tasks.push(newTask);
  res.json(newTask);
});

app.get('/api/inspections', verifyToken, (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  if (!lineId && !complexId) return res.json(db.inspections);

  let stations = db.stations;
  if (lineId) {
    stations = stations.filter((s: any) => s.lineId === lineId);
  } else if (complexId) {
    const lines = db.lines.filter((l: any) => l.complexId === complexId).map((l: any) => l.id);
    stations = stations.filter((s: any) => lines.includes(s.lineId));
  }

  const stationIds = stations.map((s: any) => s.id);
  const eqIds = db.equipments.filter((e: any) => stationIds.includes(e.stationId)).map((e: any) => e.id);
  const taskIds = db.tasks.filter((t: any) => eqIds.includes(t.equipmentId)).map((t: any) => t.id);

  res.json(db.inspections.filter((i: any) => taskIds.includes(i.taskId)));
});

const calculateNextDate = (frequency: string) => {
  if (!frequency) return '';
  const d = new Date();
  const freq = frequency.toLowerCase();

  if (freq.includes('روزانه')) d.setDate(d.getDate() + 1);
  else if (freq.includes('هفتگی')) d.setDate(d.getDate() + 7);
  else if (freq.includes('دو هفته')) d.setDate(d.getDate() + 14);
  else if (freq.includes('ماهانه') || freq.includes('یک ماهه') || freq.includes('1 ماهه')) d.setMonth(d.getMonth() + 1);
  else if (freq.includes('دو ماهه') || freq.includes('2 ماهه')) d.setMonth(d.getMonth() + 2);
  else if (freq.includes('سه ماهه') || freq.includes('3 ماهه')) d.setMonth(d.getMonth() + 3);
  else if (freq.includes('شش ماهه') || freq.includes('6 ماهه')) d.setMonth(d.getMonth() + 6);
  else if (freq.includes('سالانه') || freq.includes('یک ساله') || freq.includes('1 ساله')) d.setFullYear(d.getFullYear() + 1);
  else return '';

  return new Intl.DateTimeFormat('fa-IR').format(d);
};

app.post('/api/tasks/:id/inspections', verifyToken, (req: any, res) => {
  const inspection = {
    id: Date.now().toString(),
    taskId: req.params.id,
    ...req.body,
    userId: req.user.id,
    userName: req.user.name,
    date: new Date().toISOString(),
  };
  db.inspections.push(inspection);

  const task = db.tasks.find((t: any) => t.id === req.params.id);
  if (task) {
    task.lastDate = req.body.dateString || new Date().toISOString();
    const nextD = calculateNextDate(task.frequency || '');
    if (nextD) task.nextDate = nextD;
    logActivity(req.user, 'ثبت بازرسی', `ثبت وضعیت "${req.body.status}" برای دستورکار "${task.subject}"`, equipmentScope(task.equipmentId));
  } else {
    persistDb();
  }

  io.emit('new_inspection', { inspection, taskName: task?.subject });
  res.json({ inspection, nextDate: task?.nextDate });
});

app.get('/api/logs', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  if (!lineId && !complexId) return res.json(db.logs);

  res.json(
    db.logs.filter((l: any) => {
      if (lineId) return l.lineId === lineId || !l.lineId;
      if (complexId) return l.complexId === complexId || !l.complexId;
      return true;
    })
  );
});

app.get('/api/settings', (req, res) => {
  // Public: needed to render the login screen (logo/company name) before auth.
  res.json(db.settings);
});

app.post('/api/settings', verifyToken, requireRole(['SUPER_ADMIN', 'manager']), (req: any, res) => {
  const { companyName, logoUrl, complexPortalTitle } = req.body || {};
  db.settings = { ...db.settings, companyName, logoUrl, complexPortalTitle };
  persistDb();
  logActivity(req.user, 'بروزرسانی تنظیمات', 'تنظیمات سامانه و عنوان پرتال بروزرسانی شد');
  res.json(db.settings);
});

// Lubrication Monitoring Endpoints
app.get('/api/lubrication', verifyToken, (req: any, res) => {
  res.json(db.lubrications || []);
});

app.post('/api/lubrication', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  if (!db.lubrications) db.lubrications = [];
  const newRecord = {
    id: 'lub-' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  db.lubrications.push(newRecord);
  persistDb();
  logActivity(req.user, 'ثبت روانکاری', `روانکاری برای "${newRecord.equipmentName || newRecord.equipmentType}" ثبت شد`);
  res.json(newRecord);
});

app.put('/api/lubrication/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  if (!db.lubrications) db.lubrications = [];
  const index = db.lubrications.findIndex((l: any) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Lubrication record not found' });
  db.lubrications[index] = { ...db.lubrications[index], ...req.body };
  persistDb();
  logActivity(req.user, 'ویرایش روانکاری', `اطلاعات روانکاری "${db.lubrications[index].equipmentName}" بروزرسانی شد`);
  res.json(db.lubrications[index]);
});

app.delete('/api/lubrication/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']), (req: any, res) => {
  if (!db.lubrications) db.lubrications = [];
  db.lubrications = db.lubrications.filter((l: any) => l.id !== req.params.id);
  persistDb();
  logActivity(req.user, 'حذف روانکاری', `رکورد روانکاری با شناسه ${req.params.id} حذف شد`);
  res.json({ success: true });
});

// Downtimes
app.get('/api/downtimes', verifyToken, (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  if (!lineId && !complexId) return res.json(db.downtimes);
  let stations = db.stations;
  if (lineId) {
    stations = stations.filter((s: any) => s.lineId === lineId);
  } else if (complexId) {
    const lines = db.lines.filter((l: any) => l.complexId === complexId).map((l: any) => l.id);
    stations = stations.filter((s: any) => lines.includes(s.lineId));
  }
  const stationIds = stations.map((s: any) => s.id);
  const eqIds = db.equipments.filter((e: any) => stationIds.includes(e.stationId)).map((e: any) => e.id);
  res.json(db.downtimes.filter((dt: any) => dt.equipmentId === 'all' || eqIds.includes(dt.equipmentId)));
});
app.post('/api/downtimes', verifyToken, (req: any, res) => {
  const newDt = { id: Date.now().toString(), ...req.body };
  db.downtimes.push(newDt);
  logActivity(req.user, 'ثبت توقف', `توقف "${newDt.reason || ''}" ثبت شد`);
  io.emit('new_downtime', newDt);
  res.json(newDt);
});
app.delete('/api/downtimes/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const index = db.downtimes.findIndex((d: any) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  db.downtimes.splice(index, 1);
  persistDb();
  res.json({ success: true });
});

// Condition Monitoring
app.get('/api/condition-logs', verifyToken, (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  if (!lineId && !complexId) return res.json(db.conditionLogs);
  let stations = db.stations;
  if (lineId) {
    stations = stations.filter((s: any) => s.lineId === lineId);
  } else if (complexId) {
    const lines = db.lines.filter((l: any) => l.complexId === complexId).map((l: any) => l.id);
    stations = stations.filter((s: any) => lines.includes(s.lineId));
  }
  const stationIds = stations.map((s: any) => s.id);
  const eqIds = db.equipments.filter((e: any) => stationIds.includes(e.stationId)).map((e: any) => e.id);
  res.json(db.conditionLogs.filter((cl: any) => eqIds.includes(cl.equipmentId)));
});
app.post('/api/condition-logs', verifyToken, (req: any, res) => {
  const log = { id: Date.now().toString(), ...req.body };
  db.conditionLogs.push(log);
  logActivity(req.user, 'ثبت پایش وضعیت', `پایش وضعیت برای قطعه "${log.component || ''}" ثبت شد`, equipmentScope(log.equipmentId));
  res.json(log);
});
app.delete('/api/condition-logs/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const index = db.conditionLogs.findIndex((d: any) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  db.conditionLogs.splice(index, 1);
  persistDb();
  res.json({ success: true });
});

// Critical Components
app.get('/api/critical-components', verifyToken, (req: any, res) => {
  const { lineId, complexId } = req.query as any;
  if (!lineId && !complexId) return res.json(db.criticalComponents);
  let stations = db.stations;
  if (lineId) {
    stations = stations.filter((s: any) => s.lineId === lineId);
  } else if (complexId) {
    const lines = db.lines.filter((l: any) => l.complexId === complexId).map((l: any) => l.id);
    stations = stations.filter((s: any) => lines.includes(s.lineId));
  }
  const stationIds = stations.map((s: any) => s.id);
  const eqIds = db.equipments.filter((e: any) => stationIds.includes(e.stationId)).map((e: any) => e.id);
  res.json(db.criticalComponents.filter((cc: any) => eqIds.includes(cc.equipmentId)));
});
app.post('/api/critical-components', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const comp = { id: Date.now().toString(), ...req.body };
  db.criticalComponents.push(comp);
  persistDb();
  res.json(comp);
});
app.delete('/api/critical-components/:id', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  const index = db.criticalComponents.findIndex((d: any) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  db.criticalComponents.splice(index, 1);
  persistDb();
  res.json({ success: true });
});

// ==========================================
// 6 SPECIALIZED CONDITION MONITORING (CM) APIS
// ==========================================

// 1. Vibration Analysis (ISO 20816 - 4 Key Equipments)
app.get('/api/cm/vibrations', (req: any, res) => {
  if (!Array.isArray(db.cmVibrations)) db.cmVibrations = [];
  res.json(db.cmVibrations);
});

app.post('/api/cm/vibrations', (req: any, res) => {
  if (!Array.isArray(db.cmVibrations)) db.cmVibrations = [];
  const record = {
    id: req.body.id || `cm-vib-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.cmVibrations.unshift(record);
  persistDb();
  logActivity(req.user || { name: record.inspector || 'کارشناس ارتعاشات' }, 'ثبت ارتعاش‌سنجی ISO 20816', `تست ارتعاشات برای ${record.equipmentName || record.targetEquipment} با زون ${record.overallZone || '-'}`);
  res.status(201).json(record);
});

app.delete('/api/cm/vibrations/:id', (req: any, res) => {
  if (!Array.isArray(db.cmVibrations)) db.cmVibrations = [];
  const idx = db.cmVibrations.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'رکورد ارتعاشات یافت نشد' });
  db.cmVibrations.splice(idx, 1);
  persistDb();
  res.json({ success: true });
});

// 2. Thermography (Electrical Panels & Sheaves)
app.get('/api/cm/thermographies', (req: any, res) => {
  if (!Array.isArray(db.cmThermographies)) db.cmThermographies = [];
  res.json(db.cmThermographies);
});

app.post('/api/cm/thermographies', (req: any, res) => {
  if (!Array.isArray(db.cmThermographies)) db.cmThermographies = [];
  const record = {
    id: req.body.id || `cm-therm-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.cmThermographies.unshift(record);
  persistDb();
  logActivity(req.user || { name: record.inspector || 'کارشناس ترموگرافی' }, 'ثبت ترموگرافی', `اسکن حرارتی برای ${record.targetComponent || record.equipmentName} با اختلاف دمای ${record.deltaT || 0}°C`);
  res.status(201).json(record);
});

app.delete('/api/cm/thermographies/:id', (req: any, res) => {
  if (!Array.isArray(db.cmThermographies)) db.cmThermographies = [];
  const idx = db.cmThermographies.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'رکورد ترموگرافی یافت نشد' });
  db.cmThermographies.splice(idx, 1);
  persistDb();
  res.json({ success: true });
});

// 3. Oil Analysis (Lab Elemental Wear & Condition)
app.get('/api/cm/oil-analyses', (req: any, res) => {
  if (!Array.isArray(db.cmOilAnalyses)) db.cmOilAnalyses = [];
  res.json(db.cmOilAnalyses);
});

app.post('/api/cm/oil-analyses', (req: any, res) => {
  if (!Array.isArray(db.cmOilAnalyses)) db.cmOilAnalyses = [];
  const record = {
    id: req.body.id || `cm-oil-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.cmOilAnalyses.unshift(record);
  persistDb();
  logActivity(req.user || { name: record.inspector || 'آزمایشگاه روغن' }, 'ثبت نتایج آنالیز روغن', `گزارش آنالیز روغن ${record.equipmentName} با وضعیت ${record.oilCondition}`);
  res.status(201).json(record);
});

app.delete('/api/cm/oil-analyses/:id', (req: any, res) => {
  if (!Array.isArray(db.cmOilAnalyses)) db.cmOilAnalyses = [];
  const idx = db.cmOilAnalyses.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'رکورد آنالیز روغن یافت نشد' });
  db.cmOilAnalyses.splice(idx, 1);
  persistDb();
  res.json({ success: true });
});

// 4. Lubrication Management (4 Key Assets)
app.get('/api/cm/lubrications', (req: any, res) => {
  if (!Array.isArray(db.cmLubrications)) db.cmLubrications = [];
  res.json(db.cmLubrications);
});

app.post('/api/cm/lubrications', (req: any, res) => {
  if (!Array.isArray(db.cmLubrications)) db.cmLubrications = [];
  const record = {
    id: req.body.id || `cm-lub-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.cmLubrications.unshift(record);
  persistDb();
  logActivity(req.user || { name: record.inspector || 'مسئول روانکاری' }, 'ثبت روانکاری تجهیز', `عملیات روانکاری برای ${record.equipmentName || record.targetEquipment} به مقدار ${record.quantity} ${record.quantityUnit}`);
  res.status(201).json(record);
});

app.delete('/api/cm/lubrications/:id', (req: any, res) => {
  if (!Array.isArray(db.cmLubrications)) db.cmLubrications = [];
  const idx = db.cmLubrications.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'رکورد روانکاری یافت نشد' });
  db.cmLubrications.splice(idx, 1);
  persistDb();
  res.json({ success: true });
});

// 5. Magnetic Flux Leakage (MFL) Cable Testing
app.get('/api/cm/mfl-tests', (req: any, res) => {
  if (!Array.isArray(db.cmMflTests)) db.cmMflTests = [];
  res.json(db.cmMflTests);
});

app.post('/api/cm/mfl-tests', (req: any, res) => {
  if (!Array.isArray(db.cmMflTests)) db.cmMflTests = [];
  const record = {
    id: req.body.id || `cm-mfl-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.cmMflTests.unshift(record);
  persistDb();
  logActivity(req.user || { name: record.inspector || 'مفتش MFL' }, 'ثبت تست MFL کابل', `تست نشت شار مغناطیسی برای ${record.cableName} با کاهش سطح مقطع ${record.lmaPercentage}% (${record.criticality})`);
  res.status(201).json(record);
});

app.delete('/api/cm/mfl-tests/:id', (req: any, res) => {
  if (!Array.isArray(db.cmMflTests)) db.cmMflTests = [];
  const idx = db.cmMflTests.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'رکورد تست MFL یافت نشد' });
  db.cmMflTests.splice(idx, 1);
  persistDb();
  res.json({ success: true });
});

// 6. Non-Destructive Testing (NDT)
app.get('/api/cm/ndt-tests', (req: any, res) => {
  if (!Array.isArray(db.cmNdtTests)) db.cmNdtTests = [];
  res.json(db.cmNdtTests);
});

app.post('/api/cm/ndt-tests', (req: any, res) => {
  if (!Array.isArray(db.cmNdtTests)) db.cmNdtTests = [];
  const record = {
    id: req.body.id || `cm-ndt-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.cmNdtTests.unshift(record);
  persistDb();
  logActivity(req.user || { name: record.inspector || 'کارشناس NDT' }, 'ثبت آزمون غیرمخرب NDT', `تست متد ${record.method} روی قطعه ${record.componentName} با نتیجه ${record.result}`);
  res.status(201).json(record);
});

app.delete('/api/cm/ndt-tests/:id', (req: any, res) => {
  if (!Array.isArray(db.cmNdtTests)) db.cmNdtTests = [];
  const idx = db.cmNdtTests.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'رکورد تست NDT یافت نشد' });
  db.cmNdtTests.splice(idx, 1);
  persistDb();
  res.json({ success: true });
});

// Backward-compatible CM aliases
app.get('/api/cm/vibration', (req: any, res) => res.json(db.cmVibrations || []));
app.get('/api/cm/thermography', (req: any, res) => res.json(db.cmThermographies || []));
app.get('/api/cm/oil', (req: any, res) => res.json(db.cmOilAnalyses || []));
app.get('/api/cm/mfl', (req: any, res) => res.json(db.cmMflTests || []));
app.get('/api/cm/ndt', (req: any, res) => res.json(db.cmNdtTests || []));

app.get('/api/export-excel', verifyToken, requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN', 'LINE_SUPERVISOR']), (req: any, res) => {
  try {
    const stationId = req.query.stationId as string | undefined;
    const data: any[] = [];

    let equipmentsToExport = db.equipments;
    if (stationId) {
      equipmentsToExport = db.equipments.filter((e: any) => e.stationId === stationId);
    }

    equipmentsToExport.forEach((eq: any) => {
      const eqTasks = db.tasks.filter((t: any) => t.equipmentId === eq.id);
      if (eqTasks.length === 0) {
        data.push({
          'نام تجهیز': eq.name,
          'کد تجهیز': eq.code || '',
          'نام قطعه': '',
          'عنوان تسک': '',
          'کد تسک': '',
          'دوره': '',
          'آخرین بازرسی': '',
          'سررسید بعدی': '',
          'دستورالعمل': '',
          'معیار': '',
          'اعلان/هشدار': '',
        });
      } else {
        eqTasks.forEach((task: any) => {
          data.push({
            'نام تجهیز': eq.name,
            'کد تجهیز': eq.code || '',
            'نام قطعه': task.partName || '',
            'عنوان تسک': task.subject,
            'کد تسک': task.taskCode || '',
            'دوره': task.frequency || '',
            'آخرین بازرسی': task.lastDate || '',
            'سررسید بعدی': task.nextDate || '',
            'دستورالعمل': task.instructions || '',
            'معیار': task.criteria || '',
            'اعلان/هشدار': task.warning || '',
          });
        });
      }
    });

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="CMMS_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

app.post(
  '/api/import-excel',
  verifyToken,
  requireRole(['SUPER_ADMIN', 'manager', 'COMPLEX_ADMIN']),
  excelUpload.single('file'),
  (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const workbook = xlsx.read(fs.readFileSync(req.file.path), { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet) as any[];

      let addedEqs = 0;
      let addedTasks = 0;

      data.forEach((row) => {
        const cleanRow: any = {};
        for (const key in row) {
          cleanRow[key.toString().trim()] = row[key];
        }

        const extractField = (row: any, keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null) return row[k].toString().trim();
          }
          return '';
        };

        const eqName = extractField(cleanRow, ['نام تجهیز', 'تجهیز']);
        const eqCode = extractField(cleanRow, ['کد تجهیز/سند', 'کد تجهیز']);
        const taskSubject = extractField(cleanRow, ['عنوان تسک', 'تسک', 'موضوع']);
        const taskCode = extractField(cleanRow, ['کد تسک', 'کد']);
        const frequency = extractField(cleanRow, ['دوره', 'تناوب', 'دوره تناوب']);

        const lastDate = extractField(cleanRow, ['آخرین بازرسی', 'تاریخ آخرین بازرسی', 'تاریخ شروع']);
        const nextDate = extractField(cleanRow, ['سررسید بعدی', 'تاریخ سررسید', 'تاریخ سررسید بعدی']);

        const instructions = extractField(cleanRow, ['دستور العمل/توضیحات', 'دستورالعمل', 'توضیحات', 'روش انجام']);
        const criteria = extractField(cleanRow, ['معیار', 'معیار پذیرش', 'حدود مجاز']);
        const partName = extractField(cleanRow, ['نام قطعه', 'قطعه']);
        const warning = extractField(cleanRow, ['اعلان', 'هشدار', 'پیام اعلان']);
        const fileStandard = (req.body && req.body.standard) ? req.body.standard.toString().trim() : 'General';
        const taskStandard = extractField(cleanRow, ['استاندارد', 'سازنده', 'استاندارد تسک', 'Standard', 'Manufacturer']) || fileStandard;

        if (!eqName) return;

        let eq = db.equipments.find((e: any) => e.name === eqName && e.stationId === req.body.stationId);
        if (!eq) {
          eq = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: eqName,
            code: eqCode,
            description: '',
            createdAt: new Date().toISOString(),
            stationId: req.body.stationId,
          };
          db.equipments.push(eq);
          addedEqs++;
        }

        if (!taskSubject) return;

        let task = null;
        if (taskCode) {
          task = db.tasks.find((t: any) => t.equipmentId === eq!.id && t.taskCode === taskCode);
        } else {
          task = db.tasks.find((t: any) => t.equipmentId === eq!.id && t.subject === taskSubject && t.instructions === instructions);
        }

        if (!task) {
          task = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            equipmentId: eq.id,
            taskCode,
            subject: taskSubject,
            frequency,
            lastDate,
            nextDate,
            instructions,
            criteria,
            partName,
            warning,
            standard: taskStandard,
          };
          db.tasks.push(task);
          addedTasks++;
        } else {
          task.frequency = frequency || task.frequency;
          task.lastDate = lastDate || task.lastDate;
          task.nextDate = nextDate || task.nextDate;
          if (instructions) task.instructions = instructions;
          if (criteria) task.criteria = criteria;
          if (partName) task.partName = partName;
          if (warning) task.warning = warning;
          if (taskStandard) task.standard = taskStandard;
        }
      });

      fs.unlink(req.file.path, () => {});

      logActivity(req.user, 'ایمپورت اکسل', `${addedEqs} تجهیز و ${addedTasks} دستورکار اضافه/بروزرسانی شد.`);
      res.json({ message: `با موفقیت انجام شد. ${addedEqs} تجهیز و ${addedTasks} دستورکار اضافه/بروزرسانی شد.` });
    } catch (err: any) {
      console.error('Excel import error:', err);
      res.status(500).json({ error: 'Failed to process Excel file' });
    }
  }
);

// Multer / upload errors land here instead of crashing the process.
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError || (err && err.message)) {
    return res.status(400).json({ error: err.message || 'خطا در آپلود فایل' });
  }
  next(err);
});

app.use('/uploads', express.static(UPLOAD_DIR));

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const viteServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5 (path-to-regexp v6+) no longer accepts a bare '*' wildcard —
    // it must be a named parameter. A catch-all middleware avoids relying on
    // path-to-regexp wildcard syntax entirely.
    app.use((req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
