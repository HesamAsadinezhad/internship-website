import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Droplet,
  Activity,
  Flame,
  Wrench,
  Cable,
  FileCheck,
  ExternalLink,
  Layers,
  Gauge,
  Thermometer,
  Microscope,
  Info,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CMSubDomain } from '../../types/conditionMonitoring';
import { getLocalizedEquipmentName } from '../../utils/hierarchyLocalization';
import { printCmReport } from '../../utils/cmReportPrint';

interface CmReportDetailModalProps {
  record: any;
  subDomain: CMSubDomain;
  onClose: () => void;
}

export default function CmReportDetailModal({ record, subDomain, onClose }: CmReportDetailModalProps) {
  const { isRtl, language } = useLanguage();
  const [isPrinting, setIsPrinting] = useState(false);

  if (!record) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      printCmReport(record, subDomain, { isRtl });
    } catch (err) {
      console.error('Print utility error:', err);
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 900);
    }
  };

  // Get domain visual identity and title
  const getDomainConfig = () => {
    switch (subDomain) {
      case 'oil_analysis':
        return {
          titleFa: 'گزارش آزمون آنالیز روغن و عناصر فرسایشی',
          titleEn: 'Oil Analysis & Wear Elements Laboratory Report',
          standard: 'ASTM D5185 / ISO 4406 / ASTM D445',
          color: 'amber',
          icon: <Droplet className="text-amber-500" size={20} />,
          badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'vibration':
        return {
          titleFa: 'گزارش تخصصی آنالیز ارتعاشات ماشین‌آلات دوار',
          titleEn: 'Rotating Machinery Vibration Analysis Report',
          standard: 'ISO 20816-1 / ISO 20816-3 / ISO 10816',
          color: 'blue',
          icon: <Activity className="text-blue-500" size={20} />,
          badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'thermography':
        return {
          titleFa: 'گزارش پایش حرارتی و تصویربرداری مادون‌قرمز (ترموگرافی)',
          titleEn: 'Infrared Thermography & Hotspot Inspection Report',
          standard: 'ISO 18434-1 / NFPA 70B / ASTM E1934',
          color: 'orange',
          icon: <Flame className="text-orange-500" size={20} />,
          badgeBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
        };
      case 'lubrication':
        return {
          titleFa: 'شناسنامه و صورتجلسه اجرایی روانکاری تجهیزات کلیدی',
          titleEn: 'Key Asset Lubrication & Servicing Log Sheet',
          standard: 'DIN 51502 / ISO 6743 / OEM Maintenance Manual',
          color: 'teal',
          icon: <Wrench className="text-teal-500" size={20} />,
          badgeBg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
        };
      case 'mfl_cable':
        return {
          titleFa: 'گزارش آزمون مغناطیسی نشت شار کابل کششی (MFL Rope Test)',
          titleEn: 'Magnetic Flux Leakage (MFL) Wire Rope Test Report',
          standard: 'EN 12927 / ISO 4309 / EN 12385',
          color: 'purple',
          icon: <Cable className="text-purple-500" size={20} />,
          badgeBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'ndt':
        return {
          titleFa: 'گواهینامه آزمون‌های غیرمخرب قطعات ایمنی تله‌کابین (NDT Certificate)',
          titleEn: 'Non-Destructive Testing (NDT) Safety Certificate',
          standard: 'EN 1709 / ISO 9712 / EN 10228 / ISO 17638',
          color: 'cyan',
          icon: <FileCheck className="text-cyan-500" size={20} />,
          badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
        };
      default:
        return {
          titleFa: 'گزارش پایش وضعیت فنی',
          titleEn: 'Condition Monitoring Technical Report',
          standard: 'ISO Standards',
          color: 'blue',
          icon: <ShieldCheck className="text-blue-500" size={20} />,
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
        };
    }
  };

  const domain = getDomainConfig();
  const rawName = record.customComponentName || record.equipmentName || record.componentName || record.cableName || record.targetComponent || (isRtl ? 'تجهیز پایش‌شده' : 'Monitored Asset');
  const displayName = getLocalizedEquipmentName(rawName, language);

  // Overall status helper
  const getOverallStatus = () => {
    if (subDomain === 'oil_analysis') {
      const cond = record.oilCondition || 'normal';
      if (cond === 'critical') return { textFa: 'بحرانی - تعویض فوری روغن', textEn: 'Critical - Immediate Drain Required', bg: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
      if (cond === 'warning') return { textFa: 'هشدار - پایش کوتاه‌مدت', textEn: 'Warning - Close Interval Monitoring', bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      return { textFa: 'قابل استفاده و نرمال', textEn: 'Normal - Serviceable', bg: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }
    if (subDomain === 'vibration') {
      const z = record.overallZone || 'A';
      if (z === 'D') return { textFa: 'ناحیه D (خطرناک - توقف ماشین)', textEn: 'Zone D (Unacceptable / Trip)', bg: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
      if (z === 'C') return { textFa: 'ناحیه C (هشدار - نیازمند تعمیرات)', textEn: 'Zone C (Restricted / Alarm)', bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      if (z === 'B') return { textFa: 'ناحیه B (قابل قبول بدون محدودیت)', textEn: 'Zone B (Unrestricted Operation)', bg: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      return { textFa: 'ناحیه A (بهترین شرایط کاری / نو)', textEn: 'Zone A (Good / Newly Commissioned)', bg: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }
    if (subDomain === 'thermography') {
      const sev = record.severity || (record.deltaT > 25 ? 'critical' : record.deltaT > 10 ? 'warning' : 'normal');
      if (sev === 'critical') return { textFa: 'شدت بحرانی (ΔT > 25°C)', textEn: 'Critical Severity (ΔT > 25°C)', bg: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
      if (sev === 'warning') return { textFa: 'شدت هشدار (10°C ≤ ΔT ≤ 25°C)', textEn: 'Advisory Warning (10°C ≤ ΔT ≤ 25°C)', bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      return { textFa: 'وضعیت نرمال حرارتی (ΔT < 10°C)', textEn: 'Normal (ΔT < 10°C)', bg: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }
    if (subDomain === 'mfl_cable') {
      const crit = record.criticality || 'NORMAL';
      if (crit === 'OVER_LIMIT') return { textFa: 'خروج از حد مجاز استاندارد - تعویض کابل', textEn: 'Over Discard Limit - Cable Retirement', bg: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
      if (crit === 'SEVERE') return { textFa: 'شدید - عیب بحرانی (نیازمند اقدام فوری)', textEn: 'Severe Defect - Immediate Action', bg: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800' };
      if (crit === 'SERIOUS') return { textFa: 'جدی - تحت پایش دوره‌ای', textEn: 'Serious Defect - Regular Monitoring', bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      return { textFa: 'نرمال - مطابق معیارهای ایمنی', textEn: 'Normal - Meets Safety Limits', bg: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }
    if (subDomain === 'ndt') {
      const res = record.result || 'PASS';
      if (res === 'REJECT') return { textFa: 'مردود - عدم انطباق با استاندارد', textEn: 'REJECTED - Non-Compliant', bg: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
      if (res === 'ACCEPTABLE_WITH_MONITORING') return { textFa: 'مشروط به پایش کوتاه‌مدت', textEn: 'Conditional Acceptance', bg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      return { textFa: 'قبول - فاقد عیوب غیرمجاز (PASS)', textEn: 'ACCEPTED - Free of Disallowable Defects', bg: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
    }
    if (subDomain === 'lubrication') {
      return { textFa: 'روانکاری اجرا و تأیید شد', textEn: 'Executed & Verified', bg: 'bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800' };
    }
    return { textFa: 'ثبت و ارزیابی شده', textEn: 'Recorded & Evaluated', bg: 'bg-blue-100 text-blue-700 border-blue-300' };
  };

  const statusInfo = getOverallStatus();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-850 dark:via-gray-900 dark:to-gray-850 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-4 print:border-b-2 print:border-gray-800">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs shrink-0">
              {domain.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${domain.badgeBg}`}>
                  {isRtl ? domain.titleFa : domain.titleEn}
                </span>
                <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                  {domain.standard}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>{displayName}</span>
                {record.customComponentName && record.equipmentName && record.customComponentName !== record.equipmentName && (
                  <span className="text-xs font-normal text-gray-500">({record.equipmentName})</span>
                )}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-mono font-medium">ID: {record.id.slice(0, 16)}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar size={13} />
                  <span>{isRtl ? record.dateJalali : record.dateGregorian}</span>
                  <span className="text-gray-400">({isRtl ? record.dateGregorian : record.dateJalali})</span>
                </span>
                {record.time && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={13} />
                      <span>{record.time}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                isPrinting
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
              }`}
              title={isRtl ? 'چاپ مستقیم گزارش فنی و خروجی PDF' : 'Print Technical Report / PDF'}
            >
              {isPrinting ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Printer size={16} />}
              <span className="hidden sm:inline">
                {isPrinting ? (isRtl ? 'در حال چاپ...' : 'Printing...') : (isRtl ? 'چاپ گزارش' : 'Print')}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-gray-800 dark:text-gray-200 print:overflow-visible">
          {/* OVERALL STATUS BANNER */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${statusInfo.bg}`}>
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="shrink-0" />
              <div>
                <div className="text-[11px] font-semibold opacity-80">
                  {isRtl ? 'نتیجه و وضعیت کلی ارزیابی فنی' : 'Technical Evaluation Outcome'}
                </div>
                <div className="text-sm sm:text-base font-black">
                  {isRtl ? statusInfo.textFa : statusInfo.textEn}
                </div>
              </div>
            </div>
            {record.reportPdfUrl && (
              <a
                href={record.reportPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-700 shadow-xs hover:bg-blue-50 transition-colors shrink-0"
              >
                <FileText size={14} />
                <span>{isRtl ? 'مشاهده فایل اصل گزارش (PDF)' : 'View Official PDF Report'}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* INSPECTOR & METADATA SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1.5">
                <UserCheck size={13} className="text-blue-500" />
                <span>{isRtl ? 'کارشناس / آزمایشگاه متولی' : 'Inspector / Laboratory Authority'}</span>
              </div>
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {record.inspector || '-'}
              </div>
              {record.inspectorLevel && (
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">{record.inspectorLevel}</div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-purple-500" />
                <span>{isRtl ? 'تاریخ ثبت آزمون' : 'Inspection Date'}</span>
              </div>
              <div className="font-bold text-gray-900 dark:text-gray-100 font-mono text-sm">
                {record.dateJalali}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">Gregorian: {record.dateGregorian}</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-1.5">
                <Layers size={13} className="text-emerald-500" />
                <span>{isRtl ? 'دسته / کد شناسایی تجهیز' : 'Asset Code / Scope'}</span>
              </div>
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate font-mono">
                {record.equipmentId || record.targetEquipment || record.cableId || '-'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {record.partName || record.customComponentName || record.equipmentName}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SUBDOMAIN-SPECIFIC DETAIL PANELS */}
          {/* ============================================================ */}

          {/* 1. OIL ANALYSIS DETAILS */}
          {subDomain === 'oil_analysis' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Droplet size={16} className="text-amber-500" />
                  <span>{isRtl ? 'شاخص‌های فیزیکوشیمیایی و عناصر آزمایشگاهی روغن' : 'Physicochemical & Wear Metals Grid'}</span>
                </h3>
                <span className="text-[11px] font-mono text-gray-500">
                  {record.lubricantName} • {record.operatingHours} {isRtl ? 'ساعت کارکرد' : 'hours'}
                </span>
              </div>

              {/* Physical Properties Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'گرانروی در 40°C (کینماتیک)' : 'Viscosity @ 40°C'}</div>
                  <div className="text-lg font-black font-mono text-gray-900 dark:text-gray-100 mt-0.5">
                    {record.viscosity40 ? `${record.viscosity40} cSt` : '-'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">ASTM D445</div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'عدد اسیدی کل (TAN)' : 'Total Acid No. (TAN)'}</div>
                  <div className="text-lg font-black font-mono text-gray-900 dark:text-gray-100 mt-0.5">
                    {record.tan ? `${record.tan}` : '-'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">mg KOH/g (ASTM D664)</div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'شاخص ذرات فرومغناطیس (PQ)' : 'PQ Index'}</div>
                  <div className={`text-lg font-black font-mono mt-0.5 ${(record.elements?.pq || 0) > 40 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {record.elements?.pq ?? '-'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{isRtl ? 'حد نرمال: < 40' : 'Limit: < 40'}</div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'کد پاکیزگی ذرات (ISO)' : 'Cleanliness Code'}</div>
                  <div className="text-lg font-black font-mono text-gray-900 dark:text-gray-100 mt-0.5">
                    {record.isoCleanliness || '18/16/13'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">ISO 4406</div>
                </div>
              </div>

              {/* Wear Metals Detailed Table */}
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{isRtl ? 'عنصر فرسایشی / آلودگی' : 'Element / Contaminant'}</th>
                      <th className="py-2.5 px-3 text-center">{isRtl ? 'فرمول شیمیایی' : 'Formula'}</th>
                      <th className="py-2.5 px-3 text-center">{isRtl ? 'مقدار قرائت‌شده (PPM)' : 'Observed (PPM)'}</th>
                      <th className="py-2.5 px-3 text-center">{isRtl ? 'حد هشدار (Threshold)' : 'Threshold'}</th>
                      <th className="py-2.5 px-3 text-center">{isRtl ? 'منبع احتمالی در سیستم' : 'Probable Wear Source'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-850">
                    <tr>
                      <td className="py-2.5 px-3 font-bold">{isRtl ? 'آهن (فرسایش چرخ‌دنده‌ها و یاتاقان)' : 'Iron (Gears & Bearings)'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">Fe</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm">
                        <span className={(record.elements?.fe || 0) > 80 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {record.elements?.fe ?? 0} ppm
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">80 ppm</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{isRtl ? 'سطوح تماس دندانه‌های گیربکس و رینگ‌ها' : 'Gear tooth flanks & bearing rings'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">{isRtl ? 'مس (فرسایش بوش‌های برنزی و خنک‌کننده)' : 'Copper (Bronze Bushings)'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">Cu</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm">
                        <span className={(record.elements?.cu || 0) > 30 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {record.elements?.cu ?? 0} ppm
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">30 ppm</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{isRtl ? 'بوش‌های برنجی/برنزی، خنک‌کننده روغن' : 'Brass/bronze thrust washers'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">{isRtl ? 'سرب (فرسایش لایه یاتاقان‌های بابیتی)' : 'Lead (Bearing Babbitt)'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">Pb</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm">
                        <span className={(record.elements?.pb || 0) > 20 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {record.elements?.pb ?? 0} ppm
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">20 ppm</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{isRtl ? 'پوشش لغزشی بوش‌های یاتاقانی' : 'Babbitt journal bearing overlay'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">{isRtl ? 'سدیم (نشتی سیال خنک‌کننده یا رطوبت)' : 'Sodium (Coolant/Additive)'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">Na</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm">
                        <span className={(record.elements?.na || 0) > 25 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {record.elements?.na ?? 0} ppm
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">25 ppm</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{isRtl ? 'نفوذ مایع کولانت یا نمک‌های محیطی' : 'Coolant leak or salt ingestion'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">{isRtl ? 'شاخص سایش ذرات درشت فرومغناطیس' : 'PQ Index (Wear Debris)'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">PQ</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sm">
                        <span className={(record.elements?.pq || 0) > 40 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {record.elements?.pq ?? 0}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">40</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{isRtl ? 'براده‌های درشت آهنی حاصل از پیتینگ' : 'Micro-pitting & severe sliding wear'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. VIBRATION ANALYSIS DETAILS */}
          {subDomain === 'vibration' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  <span>{isRtl ? 'ماتریس ۱۲ نقطه‌ای ارتعاش‌سنجی (ISO 20816-3)' : '12-Point ISO Vibration Measurement Matrix'}</span>
                </h3>
                <span className="text-[11px] font-mono text-gray-500">
                  {isRtl ? 'حالت اندازه‌گیری شتاب: ' : 'Acc Metric Mode: '}
                  <span className="font-bold text-blue-600">{record.accMode || 'Peak'}</span>
                </span>
              </div>

              {/* 12-Input Matrix Display */}
              {record.matrix ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DE Bearing */}
                  <div className="border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 bg-blue-50/30 dark:bg-blue-950/20">
                    <div className="font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center justify-between">
                      <span>{isRtl ? 'یاتاقان سمت محرک (Drive End - DE)' : 'Drive End Bearing (DE)'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        DE Sensors
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                        {isRtl ? 'سرعت ارتعاشی (Velocity RMS - mm/s) [10-1000 Hz]:' : 'Velocity (RMS - mm/s):'}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Axial (A)</div>
                          <div className="text-sm font-bold">{record.matrix.de_velocity_a}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Horizontal (H)</div>
                          <div className="text-sm font-bold">{record.matrix.de_velocity_h}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Vertical (V)</div>
                          <div className="text-sm font-bold">{record.matrix.de_velocity_v}</div>
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 pt-1">
                        {isRtl ? `شتاب ارتعاشی (Acceleration ${record.accMode} - g) [1-10 kHz]:` : `Acceleration (${record.accMode} - g):`}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Axial (A)</div>
                          <div className="text-sm font-bold text-blue-600">{record.matrix.de_acc_a}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Horizontal (H)</div>
                          <div className="text-sm font-bold text-blue-600">{record.matrix.de_acc_h}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Vertical (V)</div>
                          <div className="text-sm font-bold text-blue-600">{record.matrix.de_acc_v}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NDE Bearing */}
                  <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 bg-indigo-50/30 dark:bg-indigo-950/20">
                    <div className="font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center justify-between">
                      <span>{isRtl ? 'یاتاقان سمت غیر محرک (Non-Drive End - NDE)' : 'Non-Drive End Bearing (NDE)'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                        NDE Sensors
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                        {isRtl ? 'سرعت ارتعاشی (Velocity RMS - mm/s) [10-1000 Hz]:' : 'Velocity (RMS - mm/s):'}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Axial (A)</div>
                          <div className="text-sm font-bold">{record.matrix.nde_velocity_a}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Horizontal (H)</div>
                          <div className="text-sm font-bold">{record.matrix.nde_velocity_h}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Vertical (V)</div>
                          <div className="text-sm font-bold">{record.matrix.nde_velocity_v}</div>
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-gray-600 dark:text-gray-400 pt-1">
                        {isRtl ? `شتاب ارتعاشی (Acceleration ${record.accMode} - g) [1-10 kHz]:` : `Acceleration (${record.accMode} - g):`}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Axial (A)</div>
                          <div className="text-sm font-bold text-indigo-600">{record.matrix.nde_acc_a}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Horizontal (H)</div>
                          <div className="text-sm font-bold text-indigo-600">{record.matrix.nde_acc_h}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                          <div className="text-[10px] text-gray-400">Vertical (V)</div>
                          <div className="text-sm font-bold text-indigo-600">{record.matrix.nde_acc_v}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ISO Evaluation Reference Strip */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <span className="font-bold">{isRtl ? 'ارزیابی محدوده ارتعاشی بر اساس ISO 20816:' : 'ISO Evaluation Thresholds:'}</span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                    Zone A (&lt; 2.8 mm/s)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-mono font-bold">
                    Zone B (2.8 - 4.5 mm/s)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-mono font-bold">
                    Zone C (4.5 - 7.1 mm/s)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-mono font-bold">
                    Zone D (&gt; 7.1 mm/s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. THERMOGRAPHY DETAILS */}
          {subDomain === 'thermography' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  <span>{isRtl ? 'پارامترهای دمایی و تحلیل نقطه داغ (Hotspot Analysis)' : 'Thermal Parameters & Hotspot Analysis'}</span>
                </h3>
                <span className="text-[11px] font-mono text-gray-500">
                  {record.operatingLoad || '100% Load'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-red-50/60 dark:bg-red-950/20 p-3.5 rounded-xl border border-red-200 dark:border-red-900/60">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Thermometer size={13} className="text-red-500" />
                    <span>{isRtl ? 'حداکثر دمای نقطه داغ' : 'Max Hotspot Temp'}</span>
                  </div>
                  <div className="text-xl font-black font-mono text-red-600 mt-1">
                    {record.maxTemperature}°C
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">T_max measured</div>
                </div>

                <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Thermometer size={13} className="text-blue-500" />
                    <span>{isRtl ? 'دمای مرجع محیطی' : 'Ambient Temp'}</span>
                  </div>
                  <div className="text-xl font-black font-mono text-gray-800 dark:text-gray-200 mt-1">
                    {record.ambientTemperature}°C
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">T_ambient reference</div>
                </div>

                <div className="bg-orange-50/60 dark:bg-orange-950/20 p-3.5 rounded-xl border border-orange-200 dark:border-orange-900/60">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Gauge size={13} className="text-orange-500" />
                    <span>{isRtl ? 'اختلاف دما (Delta T)' : 'Temperature Rise (ΔT)'}</span>
                  </div>
                  <div className="text-xl font-black font-mono text-orange-600 mt-1">
                    +{record.deltaT}°C
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">ΔT = T_max - T_ambient</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-3.5 rounded-xl border">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'میزان بار کاری در حین اسکن' : 'Operating Load'}</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
                    {record.operatingLoad || 'نامشخص'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Electrical / Mechanical</div>
                </div>
              </div>

              {/* Hotspot Location Callout */}
              {record.hotspotLocation && (
                <div className="p-3.5 bg-orange-50/40 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800 flex items-start gap-2.5">
                  <AlertTriangle size={17} className="text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                      {isRtl ? 'موقعیت دقیق نقطه داغ / قطعه تحت تنش حرارتی:' : 'Exact Hotspot Anomaly Location:'}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 mt-0.5 font-medium">
                      {record.hotspotLocation}
                    </div>
                  </div>
                </div>
              )}

              {/* Thermal Image if available */}
              {record.thermalImageUrl && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs font-bold mb-2">{isRtl ? 'تصویر ترموگرافی ثبت‌شده' : 'Captured Thermal Image'}</div>
                  <img
                    src={record.thermalImageUrl}
                    alt="Thermal Scan"
                    className="max-h-64 rounded-lg object-contain mx-auto"
                  />
                </div>
              )}
            </div>
          )}

          {/* 4. MFL CABLE TESTING DETAILS */}
          {subDomain === 'mfl_cable' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Cable size={16} className="text-purple-500" />
                  <span>{isRtl ? 'شاخص‌های آزمون کابل با نشت شار مغناطیسی (EN 12927)' : 'MFL Wire Rope Defect Evaluation'}</span>
                </h3>
                <span className="text-[11px] font-mono text-gray-500">
                  Ø {record.cableDiameter}mm • {record.cableLength}m
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'موقعیت طولی عیب در کابل' : 'Defect Position'}</div>
                  <div className="text-lg font-black font-mono text-purple-700 dark:text-purple-300 mt-1">
                    {record.defectPosition} m
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{isRtl ? 'از ایستگاه مبدا' : 'from station zero'}</div>
                </div>

                <div className="bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'کاهش سطح مقطع فلزی (LMA)' : 'Loss of Area (LMA)'}</div>
                  <div className={`text-lg font-black font-mono mt-1 ${record.lmaPercentage >= 8 ? 'text-red-600' : record.lmaPercentage >= 6 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {record.lmaPercentage}%
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{isRtl ? 'معیار حد تعویض: 8.0%' : 'Discard threshold: 8.0%'}</div>
                </div>

                <div className="bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'تعداد سیم‌های شکسته (LF)' : 'Broken Wires (LF)'}</div>
                  <div className="text-lg font-black font-mono text-gray-900 dark:text-gray-100 mt-1">
                    {record.brokenWiresCount ?? 0} {isRtl ? 'رشته' : 'wires'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">ISO 4309 Cluster Criteria</div>
                </div>

                <div className="bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'نوع عیب غالب' : 'Defect Type'}</div>
                  <div className="text-sm font-black font-mono text-purple-600 mt-1">
                    {record.defectType === 'LMA' ? 'LMA (افت سطح مقطع)' : record.defectType === 'LF' ? 'LF (پارگی موضعی سیم)' : 'ترکیبی (Composite)'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">EN 12927 Signal</div>
                </div>
              </div>

              {record.recommendedAction && (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border flex items-start gap-2.5">
                  <Info size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                      {isRtl ? 'اقدام توصیه‌شده فنی و ایمنی توسط بازرس کابل:' : 'Inspector Recommended Action:'}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 mt-0.5">
                      {record.recommendedAction}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. NDT DETAILS */}
          {subDomain === 'ndt' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileCheck size={16} className="text-cyan-500" />
                  <span>{isRtl ? 'گواهینامه و جزئیات آزمون غیرمخرب (NDT Test Protocol)' : 'NDT Inspection Protocol & Indications'}</span>
                </h3>
                <span className="text-[11px] font-mono text-cyan-600 font-bold">
                  {record.standardApplied}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-cyan-50/60 dark:bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'روش آزمون غیرمخرب' : 'NDT Method'}</div>
                  <div className="text-lg font-black font-mono text-cyan-700 dark:text-cyan-300 mt-1">
                    {record.method || record.ndtMethod}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">ISO 9712 Qualified</div>
                </div>

                <div className="bg-cyan-50/60 dark:bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'سطح صلاحیت بازرس' : 'Inspector Level'}</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
                    {record.inspectorLevel || 'Level II (ASNT)'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Certified Level</div>
                </div>

                <div className="bg-cyan-50/60 dark:bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'استاندارد مرجع پذیرش' : 'Acceptance Standard'}</div>
                  <div className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100 mt-1 truncate">
                    {record.standardApplied}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">European Norm</div>
                </div>

                <div className="bg-cyan-50/60 dark:bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'نتیجه پذیرش' : 'Accept / Reject'}</div>
                  <div className={`text-sm font-black mt-1 ${record.result === 'REJECT' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {record.result}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Final Disposition</div>
                </div>
              </div>

              {record.defectDescription && (
                <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="font-bold text-red-900 dark:text-red-300 text-xs mb-1 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-600" />
                    <span>{isRtl ? 'شرح ناپیوستگی / عیب مشاهده‌شده:' : 'Recorded Discontinuity / Flaw Description:'}</span>
                  </div>
                  <div className="text-red-700 dark:text-red-300">
                    {record.defectDescription}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. LUBRICATION MANAGEMENT DETAILS */}
          {subDomain === 'lubrication' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-black text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Wrench size={16} className="text-teal-500" />
                  <span>{isRtl ? 'مشخصات روانکار و دستورالعمل اجرایی' : 'Lubrication Specifications & Service Ledger'}</span>
                </h3>
                <span className="text-[11px] font-mono text-teal-600 font-bold">
                  {record.lubricantType === 'oil' ? 'Industrial Oil / روغن صنعتی' : 'Specialized Grease / گریس تخصصی'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-teal-50/60 dark:bg-teal-950/20 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'نام تجاری روانکار' : 'Lubricant Brand'}</div>
                  <div className="text-sm font-black text-teal-800 dark:text-teal-200 mt-1 truncate">
                    {record.lubricantName}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">OEM Approved</div>
                </div>

                <div className="bg-teal-50/60 dark:bg-teal-950/20 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'میزان تزریق / شارژ' : 'Quantity Dispensed'}</div>
                  <div className="text-lg font-black font-mono text-gray-900 dark:text-gray-100 mt-1">
                    {record.quantity} {record.quantityUnit}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{record.method}</div>
                </div>

                <div className="bg-teal-50/60 dark:bg-teal-950/20 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'دوره روانکاری (ساعت/تقویمی)' : 'Service Interval'}</div>
                  <div className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100 mt-1">
                    {record.intervalHours ? `${record.intervalHours} hrs` : (record.interval || 'دوره منظم')}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Preventative Maintenance</div>
                </div>

                <div className="bg-teal-50/60 dark:bg-teal-950/20 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  <div className="text-[11px] text-gray-500">{isRtl ? 'موعد روانکاری بعدی' : 'Next Due Date'}</div>
                  <div className="text-sm font-black font-mono text-blue-600 mt-1">
                    {record.nextScheduledDate || record.nextDueDateJalali || '-'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Jalali Calendar</div>
                </div>
              </div>
            </div>
          )}

          {/* NOTES & OBSERVATIONS */}
          {record.notes && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/70 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-gray-100 text-xs mb-1.5 flex items-center gap-1.5">
                <Info size={14} className="text-blue-500" />
                <span>{isRtl ? 'یادداشت‌های فنی و مشاهدات کارشناس پایش وضعیت:' : 'Technical Notes & Field Observations:'}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {record.notes}
              </p>
            </div>
          )}

          {/* ATTACHED PDF FILE CARD */}
          {record.reportPdfUrl ? (
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                    {record.reportPdfName || (isRtl ? 'فایل رسمی پیوست گزارش آزمون' : 'Official Attached Report Document')}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                    {record.reportPdfSize ? `${(record.reportPdfSize / 1024).toFixed(1)} KB • ` : ''}
                    PDF Document
                  </div>
                </div>
              </div>
              <a
                href={record.reportPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ExternalLink size={14} />
                <span>{isRtl ? 'دانلود / باز کردن فایل' : 'Open / Download PDF'}</span>
              </a>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border text-center text-gray-400 text-xs font-mono">
              {isRtl ? 'سند در پایگاه داده پایش وضعیت سیستم ثبت شده است (بدون پیوست فایل خارجی)' : 'Directly logged into CMMS database (no external PDF attached)'}
            </div>
          )}

          {/* FOOTER VERIFICATION STAMP */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-400 text-[11px] print:flex">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>{isRtl ? 'سامانه یکپارچه پایش وضعیت فنی تله‌کابین (CMMS CM Engine)' : 'CMMS Condition Monitoring Engine'}</span>
            </div>
            <div className="font-mono text-gray-400 text-[10px]">
              Record Hash: {record.id} • Verified at {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'System'}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-gray-50 dark:bg-gray-850 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 print:hidden">
          <div className="text-[11px] text-gray-500">
            {isRtl ? 'کلید Esc یا دکمه بستن را برای خروج بزنید' : 'Press Esc or Close to return'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                isPrinting
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {isPrinting ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <Printer size={15} />}
              <span>{isPrinting ? (isRtl ? 'در حال آماده‌سازی چاپ...' : 'Preparing...') : (isRtl ? 'چاپ گزارش' : 'Print Report')}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-xs transition-colors"
            >
              {isRtl ? 'بستن' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
