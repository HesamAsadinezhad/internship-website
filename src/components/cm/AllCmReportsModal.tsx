import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Search,
  Filter,
  Eye,
  Activity,
  Flame,
  Droplet,
  Wrench,
  Cable,
  FileCheck,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CMSubDomain } from '../../types/conditionMonitoring';
import { getLocalizedEquipmentName } from '../../utils/hierarchyLocalization';
import CmReportDetailModal from './CmReportDetailModal';
import { printAllReportsSummary } from '../../utils/cmReportPrint';

export interface UnifiedCmReport {
  id: string;
  subDomain: CMSubDomain;
  domainLabelFa: string;
  domainLabelEn: string;
  componentName: string;
  equipmentCategory: string;
  dateJalali: string;
  dateGregorian: string;
  time?: string;
  inspector: string;
  standard: string;
  keyMetric: string;
  statusSeverity: 'normal' | 'warning' | 'critical';
  statusTextFa: string;
  statusTextEn: string;
  reportPdfUrl?: string;
  reportPdfName?: string;
  originalRecord: any;
}

interface AllCmReportsModalProps {
  onClose: () => void;
}

export default function AllCmReportsModal({ onClose }: AllCmReportsModalProps) {
  const { isRtl, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<UnifiedCmReport[]>([]);
  const [selectedSubdomain, setSelectedSubdomain] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithPdf, setOnlyWithPdf] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<{ record: any; subDomain: CMSubDomain } | null>(null);

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [vibeRes, thermoRes, oilRes, lubeRes, mflRes, ndtRes] = await Promise.allSettled([
        fetch('/api/cm/vibrations', { credentials: 'include' }),
        fetch('/api/cm/thermographies', { credentials: 'include' }),
        fetch('/api/cm/oil-analyses', { credentials: 'include' }),
        fetch('/api/cm/lubrications', { credentials: 'include' }),
        fetch('/api/cm/mfl-tests', { credentials: 'include' }),
        fetch('/api/cm/ndt-tests', { credentials: 'include' })
      ]);

      const unified: UnifiedCmReport[] = [];

      // 1. Vibration
      if (vibeRes.status === 'fulfilled' && vibeRes.value.ok) {
        const data = await vibeRes.value.json();
        data.forEach((r: any) => {
          const zone = r.overallZone || 'A';
          const sev: 'normal' | 'warning' | 'critical' = zone === 'D' ? 'critical' : zone === 'C' ? 'warning' : 'normal';
          unified.push({
            id: r.id,
            subDomain: 'vibration',
            domainLabelFa: 'آنالیز ارتعاشات',
            domainLabelEn: 'Vibration Analysis',
            componentName: r.customComponentName || r.equipmentName || 'تجهیز دوار',
            equipmentCategory: r.targetEquipment || 'motor',
            dateJalali: r.dateJalali,
            dateGregorian: r.dateGregorian,
            time: r.time,
            inspector: r.inspector,
            standard: 'ISO 20816-3',
            keyMetric: `Zone ${zone} (Acc: ${r.accMode || 'Peak'})`,
            statusSeverity: sev,
            statusTextFa: zone === 'D' ? 'ناحیه D (بحرانی)' : zone === 'C' ? 'ناحیه C (هشدار)' : zone === 'B' ? 'ناحیه B (قابل قبول)' : 'ناحیه A (نرمال)',
            statusTextEn: `Zone ${zone}`,
            reportPdfUrl: r.reportPdfUrl,
            reportPdfName: r.reportPdfName,
            originalRecord: r
          });
        });
      }

      // 2. Thermography
      if (thermoRes.status === 'fulfilled' && thermoRes.value.ok) {
        const data = await thermoRes.value.json();
        data.forEach((r: any) => {
          const sev: 'normal' | 'warning' | 'critical' = r.severity || (r.deltaT > 25 ? 'critical' : r.deltaT > 10 ? 'warning' : 'normal');
          unified.push({
            id: r.id,
            subDomain: 'thermography',
            domainLabelFa: 'ترموگرافی',
            domainLabelEn: 'Thermography',
            componentName: r.customComponentName || r.targetComponent || 'تابلو / رابر',
            equipmentCategory: r.equipmentName || 'تجهیز الکتریکی',
            dateJalali: r.dateJalali,
            dateGregorian: r.dateGregorian,
            time: r.time,
            inspector: r.inspector,
            standard: 'ISO 18434-1',
            keyMetric: `T_max: ${r.maxTemperature}°C (ΔT: +${r.deltaT}°C)`,
            statusSeverity: sev,
            statusTextFa: sev === 'critical' ? 'بحرانی (ΔT>25°C)' : sev === 'warning' ? 'هشدار (ΔT>10°C)' : 'نرمال (ΔT<10°C)',
            statusTextEn: sev.toUpperCase(),
            reportPdfUrl: r.reportPdfUrl,
            reportPdfName: r.reportPdfName,
            originalRecord: r
          });
        });
      }

      // 3. Oil Analysis
      if (oilRes.status === 'fulfilled' && oilRes.value.ok) {
        const data = await oilRes.value.json();
        data.forEach((r: any) => {
          const cond = r.oilCondition || 'normal';
          const sev: 'normal' | 'warning' | 'critical' = cond;
          unified.push({
            id: r.id,
            subDomain: 'oil_analysis',
            domainLabelFa: 'آنالیز روغن',
            domainLabelEn: 'Oil Analysis',
            componentName: r.customComponentName || r.equipmentName || 'گیربکس / مخزن روغن',
            equipmentCategory: r.lubricantName || 'روغن صنعتی',
            dateJalali: r.dateJalali,
            dateGregorian: r.dateGregorian,
            time: r.time,
            inspector: r.inspector,
            standard: 'ASTM D5185 / ISO 4406',
            keyMetric: `Visc: ${r.viscosity40 || '-'} cSt | TAN: ${r.tan || '-'} | Fe: ${r.elements?.fe ?? '-'} ppm`,
            statusSeverity: sev,
            statusTextFa: cond === 'critical' ? 'بحرانی (تعویض روغن)' : cond === 'warning' ? 'هشدار (پایش مستمر)' : 'نرمال (قابل استفاده)',
            statusTextEn: cond.toUpperCase(),
            reportPdfUrl: r.reportPdfUrl,
            reportPdfName: r.reportPdfName,
            originalRecord: r
          });
        });
      }

      // 4. Lubrication
      if (lubeRes.status === 'fulfilled' && lubeRes.value.ok) {
        const data = await lubeRes.value.json();
        data.forEach((r: any) => {
          unified.push({
            id: r.id,
            subDomain: 'lubrication',
            domainLabelFa: 'مدیریت روانکاری',
            domainLabelEn: 'Lubrication',
            componentName: r.customComponentName || r.equipmentName || 'روانکاری تجهیز',
            equipmentCategory: r.lubricantName || 'گریس / روغن',
            dateJalali: r.dateJalali,
            dateGregorian: r.dateGregorian,
            time: r.time,
            inspector: r.inspector,
            standard: 'OEM Manual',
            keyMetric: `${r.quantity} ${r.quantityUnit} (${r.method || 'تزریق مستقیم'})`,
            statusSeverity: 'normal',
            statusTextFa: 'اجرا و ثبت شد',
            statusTextEn: 'COMPLETED',
            reportPdfUrl: r.reportPdfUrl,
            reportPdfName: r.reportPdfName,
            originalRecord: r
          });
        });
      }

      // 5. MFL Cable Testing
      if (mflRes.status === 'fulfilled' && mflRes.value.ok) {
        const data = await mflRes.value.json();
        data.forEach((r: any) => {
          const crit = r.criticality || 'NORMAL';
          const sev: 'normal' | 'warning' | 'critical' = (crit === 'OVER_LIMIT' || crit === 'SEVERE') ? 'critical' : crit === 'SERIOUS' ? 'warning' : 'normal';
          unified.push({
            id: r.id,
            subDomain: 'mfl_cable',
            domainLabelFa: 'تست کابل MFL',
            domainLabelEn: 'MFL Rope Test',
            componentName: r.customComponentName || r.cableName || 'کابل کششی',
            equipmentCategory: `Ø ${r.cableDiameter}mm`,
            dateJalali: r.dateJalali,
            dateGregorian: r.dateGregorian,
            time: r.time,
            inspector: r.inspector,
            standard: 'EN 12927 / ISO 4309',
            keyMetric: `LMA: ${r.lmaPercentage}% | LF: ${r.brokenWiresCount ?? 0} wires @ ${r.defectPosition}m`,
            statusSeverity: sev,
            statusTextFa: crit === 'OVER_LIMIT' ? 'حد تعویض کابل' : crit === 'SEVERE' ? 'عیب شدید' : crit === 'SERIOUS' ? 'عیب جدی' : 'نرمال (مجاز)',
            statusTextEn: crit,
            reportPdfUrl: r.reportPdfUrl,
            reportPdfName: r.reportPdfName,
            originalRecord: r
          });
        });
      }

      // 6. NDT
      if (ndtRes.status === 'fulfilled' && ndtRes.value.ok) {
        const data = await ndtRes.value.json();
        data.forEach((r: any) => {
          const res = r.result || 'PASS';
          const sev: 'normal' | 'warning' | 'critical' = res === 'REJECT' ? 'critical' : res === 'ACCEPTABLE_WITH_MONITORING' ? 'warning' : 'normal';
          unified.push({
            id: r.id,
            subDomain: 'ndt',
            domainLabelFa: 'آزمون‌های غیرمخرب (NDT)',
            domainLabelEn: 'NDT Testing',
            componentName: r.customComponentName || r.componentName || 'قطعه ایمنی',
            equipmentCategory: `${r.method || r.ndtMethod} Testing`,
            dateJalali: r.dateJalali,
            dateGregorian: r.dateGregorian,
            time: r.time,
            inspector: r.inspector,
            standard: r.standardApplied || 'EN 1709 / ISO 9712',
            keyMetric: `${r.method || r.ndtMethod} Test • ${r.defectDescription ? r.defectDescription.slice(0, 30) + '...' : 'فاقد ناپیوستگی'}`,
            statusSeverity: sev,
            statusTextFa: res === 'REJECT' ? 'مردود (عدم انطباق)' : res === 'ACCEPTABLE_WITH_MONITORING' ? 'مشروط به پایش' : 'قبول (PASS)',
            statusTextEn: res,
            reportPdfUrl: r.reportPdfUrl,
            reportPdfName: r.reportPdfName,
            originalRecord: r
          });
        });
      }

      // Sort newest first
      unified.sort((a, b) => (b.dateGregorian || '').localeCompare(a.dateGregorian || ''));
      setReports(unified);
    } catch (err) {
      console.error('Failed to load unified CM reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedSubdomain !== 'all' && r.subDomain !== selectedSubdomain) return false;
      if (selectedSeverity !== 'all' && r.statusSeverity !== selectedSeverity) return false;
      if (onlyWithPdf && !r.reportPdfUrl) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.componentName.toLowerCase().includes(q) ||
          r.inspector?.toLowerCase().includes(q) ||
          r.domainLabelFa.toLowerCase().includes(q) ||
          r.domainLabelEn.toLowerCase().includes(q) ||
          r.keyMetric.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [reports, selectedSubdomain, selectedSeverity, onlyWithPdf, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const normal = reports.filter(r => r.statusSeverity === 'normal').length;
    const warning = reports.filter(r => r.statusSeverity === 'warning').length;
    const critical = reports.filter(r => r.statusSeverity === 'critical').length;
    const withPdf = reports.filter(r => !!r.reportPdfUrl).length;
    return { total, normal, warning, critical, withPdf };
  }, [reports]);

  const getSubdomainIcon = (sub: CMSubDomain) => {
    switch (sub) {
      case 'vibration':
        return <Activity size={15} className="text-blue-500" />;
      case 'thermography':
        return <Flame size={15} className="text-orange-500" />;
      case 'oil_analysis':
        return <Droplet size={15} className="text-amber-500" />;
      case 'lubrication':
        return <Wrench size={15} className="text-teal-500" />;
      case 'mfl_cable':
        return <Cable size={15} className="text-purple-500" />;
      case 'ndt':
        return <FileCheck size={15} className="text-cyan-500" />;
      default:
        return <FileText size={15} className="text-gray-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white print:static"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden my-auto flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-gray-850 dark:via-gray-900 dark:to-gray-850 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-4 print:border-b-2 print:border-gray-800">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {isRtl ? 'آرشیو جامع ۶ زیردامنه CM' : 'Consolidated CM Archive (6 Domains)'}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {reports.length} {isRtl ? 'گزارش ثبت‌شده' : 'reports logged'}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                {isRtl ? 'گزارش‌های تخصصی پایش وضعیت (همه آزمون‌ها با جزئیات کامل)' : 'Condition Monitoring Master Reports & Detailed Tests'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isRtl
                  ? 'مشاهده و تحلیل یکپارچه گزارش‌های ارتعاش‌سنجی، ترموگرافی، آنالیز روغن، روانکاری، تست کابل MFL و آزمون‌های غیرمخرب NDT با بازخوانی کامل شاخص‌های فنی.'
                  : 'Unified viewer for all Vibration, Thermography, Oil Lab, Lubrication, MFL Rope, and NDT reports with complete technical readouts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              onClick={fetchAllReports}
              disabled={loading}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title={isRtl ? 'بروزرسانی داده‌ها' : 'Refresh'}
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => printAllReportsSummary(filteredReports, { isRtl })}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title={isRtl ? 'چاپ جدول خلاصه گزارش‌ها' : 'Print Reports Summary'}
            >
              <Printer size={16} />
              <span className="hidden xs:inline">{isRtl ? 'چاپ لیست' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-4 sm:px-6 bg-gray-50/70 dark:bg-gray-850/50 border-b border-gray-200 dark:border-gray-800 text-xs">
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-[11px] text-gray-500 font-medium">{isRtl ? 'کل گزارش‌ها' : 'Total Reports'}</div>
            <div className="text-lg font-black font-mono text-gray-900 dark:text-gray-100">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{isRtl ? 'وضعیت نرمال / تایید' : 'Normal / Passed'}</div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.normal}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{isRtl ? 'هشدار / پایش کوتاه‌مدت' : 'Warning / Monitor'}</div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">{stats.warning}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-red-200 dark:border-red-900/60">
            <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">{isRtl ? 'بحرانی / نیازمند اقدام' : 'Critical / Urgent'}</div>
            <div className="text-lg font-black font-mono text-red-600 dark:text-red-400">{stats.critical}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{isRtl ? 'دارای فایل PDF اصل' : 'With PDF Attached'}</div>
            <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">{stats.withPdf}</div>
          </div>
        </div>

        {/* FILTER CONTROLS */}
        <div className="p-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          {/* Subdomain selector pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedSubdomain('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'all'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {isRtl ? 'همه آزمون‌ها' : 'All Tests'} ({reports.length})
            </button>
            <button
              onClick={() => setSelectedSubdomain('vibration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'vibration'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              <Activity size={14} />
              <span>{isRtl ? 'آنالیز ارتعاشات' : 'Vibration'}</span>
            </button>
            <button
              onClick={() => setSelectedSubdomain('thermography')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'thermography'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
              }`}
            >
              <Flame size={14} />
              <span>{isRtl ? 'ترموگرافی' : 'Thermography'}</span>
            </button>
            <button
              onClick={() => setSelectedSubdomain('oil_analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'oil_analysis'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <Droplet size={14} />
              <span>{isRtl ? 'آنالیز روغن' : 'Oil Analysis'}</span>
            </button>
            <button
              onClick={() => setSelectedSubdomain('lubrication')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'lubrication'
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
              }`}
            >
              <Wrench size={14} />
              <span>{isRtl ? 'روانکاری' : 'Lubrication'}</span>
            </button>
            <button
              onClick={() => setSelectedSubdomain('mfl_cable')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'mfl_cable'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              <Cable size={14} />
              <span>{isRtl ? 'تست کابل MFL' : 'MFL Cable'}</span>
            </button>
            <button
              onClick={() => setSelectedSubdomain('ndt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors ${
                selectedSubdomain === 'ndt'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100'
              }`}
            >
              <FileCheck size={14} />
              <span>{isRtl ? 'آزمون‌های NDT' : 'NDT Tests'}</span>
            </button>
          </div>

          {/* Search bar and Secondary Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'جستجو بر اساس نام تجهیز، قطعه سفارشی، بازرس، شاخص...' : 'Search equipment, custom part, inspector, metric...'}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-9 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs focus:outline-none"
              >
                <option value="all">{isRtl ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
                <option value="normal">{isRtl ? 'نرمال / قبول' : 'Normal / Passed'}</option>
                <option value="warning">{isRtl ? 'هشدار / پایش' : 'Warning / Monitor'}</option>
                <option value="critical">{isRtl ? 'بحرانی / اقدام فوری' : 'Critical / Immediate'}</option>
              </select>

              <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={onlyWithPdf}
                  onChange={(e) => setOnlyWithPdf(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {isRtl ? 'فقط دارای PDF' : 'PDF Only'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* REPORTS LIST / TABLE (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 print:overflow-visible">
          {loading ? (
            <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
              <span className="text-xs font-medium">{isRtl ? 'در حال بارگذاری گزارش‌های پایش وضعیت...' : 'Loading condition monitoring reports...'}</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <FileText size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <div className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                {isRtl ? 'هیچ گزارشی با فیلترهای انتخابی یافت نشد' : 'No reports match your filters'}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {isRtl ? 'می‌توانید فیلترها را تغییر داده یا از هر بخش اقدام به ثبت گزارش نمایید.' : 'Clear your filters or log new test reports in the respective modules.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-3.5 text-start">{isRtl ? 'زیردامنه و آزمون' : 'CM Test Domain'}</th>
                    <th className="py-3 px-3.5 text-start">{isRtl ? 'تجهیز / قطعه پایش‌شده' : 'Equipment / Target Asset'}</th>
                    <th className="py-3 px-3.5 text-start">{isRtl ? 'تاریخ و زمان' : 'Date & Time'}</th>
                    <th className="py-3 px-3.5 text-start">{isRtl ? 'شاخص کلیدی و استاندارد' : 'Key Metric & Standard'}</th>
                    <th className="py-3 px-3.5 text-start">{isRtl ? 'کارشناس / آزمایشگاه' : 'Inspector'}</th>
                    <th className="py-3 px-3.5 text-center">{isRtl ? 'وضعیت ارزیابی' : 'Status'}</th>
                    <th className="py-3 px-3.5 text-center">{isRtl ? 'فایل PDF' : 'PDF File'}</th>
                    <th className="py-3 px-3.5 text-center">{isRtl ? 'عملیات و جزئیات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-850">
                  {filteredReports.map((report) => {
                    const sev = report.statusSeverity;
                    const badgeClass =
                      sev === 'critical'
                        ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-300'
                        : sev === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300';

                    return (
                      <tr key={`${report.subDomain}-${report.id}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                        {/* Domain */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            {getSubdomainIcon(report.subDomain)}
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                                {isRtl ? report.domainLabelFa : report.domainLabelEn}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {report.standard}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Component */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {getLocalizedEquipmentName(report.componentName, language)}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[180px]">
                            {getLocalizedEquipmentName(report.equipmentCategory, language)}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3.5 font-mono text-gray-700 dark:text-gray-300">
                          <div className="font-bold">{isRtl ? report.dateJalali : report.dateGregorian}</div>
                          <div className="text-[10px] text-gray-400">
                            {isRtl ? report.dateGregorian : report.dateJalali} {report.time ? `• ${report.time}` : ''}
                          </div>
                        </td>

                        {/* Key Metric */}
                        <td className="py-3 px-3.5">
                          <div className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                            {report.keyMetric}
                          </div>
                        </td>

                        {/* Inspector */}
                        <td className="py-3 px-3.5 text-gray-600 dark:text-gray-400">
                          <div className="truncate max-w-[160px] font-medium">
                            {report.inspector || '-'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                            {isRtl ? report.statusTextFa : report.statusTextEn}
                          </span>
                        </td>

                        {/* PDF link */}
                        <td className="py-3 px-3.5 text-center">
                          {report.reportPdfUrl ? (
                            <a
                              href={report.reportPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 font-bold text-[11px] p-1 rounded hover:bg-blue-50"
                              title={report.reportPdfName || 'Open PDF'}
                            >
                              <FileText size={14} />
                              <span>PDF</span>
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Action: Open Comprehensive Details Modal */}
                        <td className="py-3 px-3.5 text-center">
                          <button
                            onClick={() => setSelectedDetailRecord({ record: report.originalRecord, subDomain: report.subDomain })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                            title={isRtl ? 'مشاهده گزارش با جزئیات کامل فنی' : 'View Full Detailed Report'}
                          >
                            <Eye size={14} />
                            <span>{isRtl ? 'مشاهده جزئیات' : 'View Details'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-gray-50 dark:bg-gray-850 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>{isRtl ? 'تعداد کل رکوردهای نمایش‌داده‌شده: ' : 'Showing: '}</span>
            <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">{filteredReports.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-xs transition-colors"
          >
            {isRtl ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>

      {/* EMBEDDED SUB-MODAL FOR INDIVIDUAL REPORT DETAILS */}
      {selectedDetailRecord && (
        <CmReportDetailModal
          record={selectedDetailRecord.record}
          subDomain={selectedDetailRecord.subDomain}
          onClose={() => setSelectedDetailRecord(null)}
        />
      )}
    </div>
  );
}
