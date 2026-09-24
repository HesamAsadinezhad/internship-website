import React, { useState, useEffect } from 'react';
import {
  Cable,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Ruler,
  ShieldCheck,
  UserCheck,
  Percent,
  Sliders,
  Eye
} from 'lucide-react';
import { DualCalendarField } from '../DualCalendarModal';
import PdfAttachmentUploader from '../PdfAttachmentUploader';
import CmReportDetailModal from './CmReportDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import {
  MflCableRecord,
  MflDefectType,
  MflCriticalityAlert
} from '../../types/conditionMonitoring';
import { getDualDateTimeFromDate } from '../../utils/jalali';

const ROPE_OPTIONS = [
  { id: 'haul-rope-1', nameFa: 'کابل کششی اصلی خط ۱ (Haul Rope Line 1)', defaultDiameter: 52, defaultLength: 3850 },
  { id: 'track-rope-telesiege', nameFa: 'کابل باربر تله‌سیژ (Track Rope)', defaultDiameter: 44, defaultLength: 1600 },
  { id: 'counterweight-rope', nameFa: 'کابل سیستم وزن تعادل و کشش (Tension Rope)', defaultDiameter: 40, defaultLength: 450 },
  { id: 'custom', nameFa: 'سایر / کابل سفارشی (Other / Custom Cable)', defaultDiameter: 48, defaultLength: 1000 }
];

export default function MflCableTestingModule() {
  const { isRtl } = useLanguage();
  const [records, setRecords] = useState<MflCableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<MflCableRecord | null>(null);

  // Form states
  const [cableId, setCableId] = useState<string>('haul-rope-1');
  const [cableName, setCableName] = useState<string>('کابل کششی اصلی خط ۱');
  const [customComponentName, setCustomComponentName] = useState<string>('کابل کششی اصلی خط ۱');
  const [cableDiameter, setCableDiameter] = useState<number>(52);
  const [cableLength, setCableLength] = useState<number>(3850);
  const [defectPosition, setDefectPosition] = useState<number>(1420.5);
  const [defectType, setDefectType] = useState<MflDefectType>('LMA');
  const [lmaPercentage, setLmaPercentage] = useState<number>(6.8);
  const [brokenWiresCount, setBrokenWiresCount] = useState<number>(2);
  const [inspector, setInspector] = useState<string>('شرکت بازرسی فنی بین‌المللی کابل (EN 12927 Inspector)');
  const [dualDate, setDualDate] = useState(() => getDualDateTimeFromDate());
  const [pdfInfo, setPdfInfo] = useState<{ pdfUrl?: string; pdfName?: string; pdfSize?: number }>({});
  const [recommendedAction, setRecommendedAction] = useState<string>('انجام تست مجدد ظرف ۳۰ روز آینده و پایش چشمی محل عیب');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cm/mfl-tests', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to load MFL records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Criticality Evaluation according to exact prompt rules:
  // 6.0% - 8.0%: SERIOUS (Warning / Yellow-Amber alert)
  // 8.01% - 10.0%: SEVERE (High risk / Orange-Dark Orange alert)
  // > 10.0%: OVER LIMIT (Critical failure / Red alert)
  // Below 6%: NORMAL (Acceptable - Green)
  const calculateCriticality = (lma: number): MflCriticalityAlert => {
    if (lma > 10.0) return 'OVER_LIMIT';
    if (lma > 8.0) return 'SEVERE';
    if (lma >= 6.0) return 'SERIOUS';
    return 'NORMAL';
  };

  const getCriticalityBadge = (crit: MflCriticalityAlert) => {
    switch (crit) {
      case 'NORMAL':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          labelFa: 'عادی / قابل قبول (< 6.0%)',
          labelEn: 'Normal / Acceptable (< 6%)'
        };
      case 'SERIOUS':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300',
          labelFa: 'هشدار جدی (6.0% - 8.0%)',
          labelEn: 'Serious Warning (6.0% - 8.0%)'
        };
      case 'SEVERE':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 border-orange-300',
          labelFa: 'ریسک شدید (8.01% - 10.0%)',
          labelEn: 'Severe Risk (8.01% - 10.0%)'
        };
      case 'OVER_LIMIT':
        return {
          bg: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300 animate-pulse',
          labelFa: 'غیرمجاز / بحرانی (> 10.0%)',
          labelEn: 'Over Limit / Critical (> 10.0%)'
        };
    }
  };

  const currentCriticality = calculateCriticality(lmaPercentage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspector.trim()) {
      alert(isRtl ? 'نام متولی بازرسی الزامی است.' : 'Inspector is required.');
      return;
    }

    const rope = ROPE_OPTIONS.find(r => r.id === cableId);
    const defaultName = isRtl ? (rope?.nameFa || cableName) : cableName;
    const finalComponentName = customComponentName.trim() || defaultName;

    const newRecord: Partial<MflCableRecord> = {
      subDomain: 'mfl_cable',
      equipmentId: cableId,
      equipmentName: finalComponentName,
      cableName: finalComponentName,
      customComponentName: finalComponentName,
      partName: finalComponentName,
      cableDiameter,
      cableLength,
      defectPosition,
      defectType,
      lmaPercentage,
      criticality: currentCriticality,
      brokenWiresCount,
      inspector,
      dateJalali: dualDate.dateJalali,
      dateGregorian: dualDate.dateGregorian,
      time: dualDate.time,
      reportPdfUrl: pdfInfo.pdfUrl,
      reportPdfName: pdfInfo.pdfName,
      reportPdfSize: pdfInfo.pdfSize,
      recommendedAction,
      notes
    };

    try {
      const res = await fetch('/api/cm/mfl-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
        credentials: 'include'
      });

      if (res.ok) {
        await fetchRecords();
        setShowModal(false);
        setPdfInfo({});
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت تست MFL');
      }
    } catch (err) {
      console.error('Error saving MFL record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? 'آیا از حذف این رکورد آزمون MFL کابل مطمئن هستید؟' : 'Delete MFL Cable test record?')) return;
    try {
      const res = await fetch(`/api/cm/mfl-tests/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            <Cable size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isRtl ? 'ماژول تست غیرمخرب MFL کابل (نشت شار مغناطیسی)' : 'Magnetic Flux Leakage (MFL) Cable Testing'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRtl
                ? 'پایش عیوب موضعی (LF)، کاهش سطح مقطع فلزی (% LMA) و تعیین دقیق متراژ خرابی طبق استاندارد EN 12927'
                : 'Localization of Localized Faults (LF), Loss of Metallic Area (% LMA) & Alert Zones'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus size={16} />
          <span>{isRtl ? 'ثبت گزارش تست MFL' : 'New MFL Test'}</span>
        </button>
      </div>

      {/* Threshold Reference Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: isRtl ? 'وضعیت عادی (Acceptable)' : 'Normal (< 6.0%)', range: '< 6.0%', color: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
          { label: isRtl ? 'هشدار جدی (SERIOUS)' : 'Serious (6.0% - 8.0%)', range: '6.0% - 8.0%', color: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
          { label: isRtl ? 'ریسک شدید (SEVERE)' : 'Severe (8.01% - 10.0%)', range: '8.01% - 10.0%', color: 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300' },
          { label: isRtl ? 'بحرانی / خروج از سرویس' : 'OVER LIMIT (> 10.0%)', range: '> 10.0%', color: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 font-bold' }
        ].map((item, idx) => (
          <div key={idx} className={`p-3 rounded-xl border ${item.color} flex flex-col justify-between`}>
            <span className="font-semibold">{item.label}</span>
            <span className="font-mono text-sm font-black mt-1">{item.range} LMA</span>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Crosshair size={16} className="text-purple-600" />
            <span>{isRtl ? 'رکوردهای آزمون نشت شار مغناطیسی کابل‌ها' : 'MFL Cable Inspection History'}</span>
          </h3>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {records.length} {isRtl ? 'آزمون' : 'tests'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {isRtl ? 'هنوز داده‌ای در بخش تست MFL کابل ثبت نشده است.' : 'No MFL cable records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'کابل' : 'Cable Name'}</th>
                  <th className="py-3 px-4">{isRtl ? 'مشخصات فنی کابل' : 'Cable Specs'}</th>
                  <th className="py-3 px-4">{isRtl ? 'موقعیت خرابی (متر)' : 'Defect Position'}</th>
                  <th className="py-3 px-4">{isRtl ? 'نوع عیب' : 'Defect Type'}</th>
                  <th className="py-3 px-4 font-mono">{isRtl ? 'درصد LMA%' : '% LMA'}</th>
                  <th className="py-3 px-4">{isRtl ? 'سطح بحرانی' : 'Criticality'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متولی بازرسی' : 'Inspector'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاریخ و ساعت' : 'Date & Time'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گزارش PDF' : 'PDF'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(r => {
                  const critBadge = getCriticalityBadge(r.criticality);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {r.customComponentName || r.cableName || r.equipmentName}
                        </div>
                        {r.customComponentName && r.cableName && r.cableName !== r.customComponentName && (
                          <div className="text-[10px] text-gray-500">{r.cableName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                        Ø {r.cableDiameter}mm | {r.cableLength}m
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-700 dark:text-purple-300">
                        {r.defectPosition} m
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {r.defectType}
                        </span>
                        {r.brokenWiresCount ? (
                          <span className="text-[10px] text-gray-500 mr-1">({r.brokenWiresCount} سیم)</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm">
                        {r.lmaPercentage}%
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${critBadge.bg}`}>
                          {isRtl ? critBadge.labelFa : critBadge.labelEn}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-purple-500 shrink-0" />
                          <span className="truncate max-w-[150px]">{r.inspector}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                        <div>{r.dateJalali}</div>
                        <div className="text-[10px] text-gray-400">({r.dateGregorian})</div>
                      </td>
                      <td className="py-3 px-4">
                        {r.reportPdfUrl ? (
                          <a
                            href={r.reportPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 font-semibold"
                          >
                            <FileText size={13} />
                            <span>PDF</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedRecordForDetails(r)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title={isRtl ? 'مشاهده گزارش با جزئیات کامل' : 'View Report with Details'}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title={isRtl ? 'حذف رکورد' : 'Delete record'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <Cable size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? 'ثبت گزارش تست MFL و متراژ خرابی کابل' : 'Log MFL Cable Defect & Localization'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Cable Selection & Specs */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'دسته‌بندی کابل' : 'Select Cable Category'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={cableId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setCableId(newId);
                        const rope = ROPE_OPTIONS.find(r => r.id === newId);
                        if (rope) {
                          setCableName(isRtl ? rope.nameFa : rope.id);
                          if (newId !== 'custom') {
                            setCustomComponentName(isRtl ? rope.nameFa.split('(')[0].trim() : rope.id);
                          } else {
                            setCustomComponentName('');
                          }
                          setCableDiameter(rope.defaultDiameter);
                          setCableLength(rope.defaultLength);
                        }
                      }}
                      className="w-full text-xs font-medium px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                    >
                      {ROPE_OPTIONS.map(rope => (
                        <option key={rope.id} value={rope.id}>{rope.nameFa}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Component Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'نام اختصاصی / سفارشی کابل' : 'Custom Cable Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customComponentName}
                      onChange={(e) => setCustomComponentName(e.target.value)}
                      placeholder={isRtl ? 'مثلاً: کابل کششی اصلی خط ۱' : 'e.g. Main Haul Rope'}
                      className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Cable Technical Parameters: Diameter & Length */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'قطر کابل (mm)' : 'Cable Diameter (mm)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={cableDiameter}
                      onChange={(e) => setCableDiameter(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'متراژ کل کابل (متر)' : 'Total Length (m)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={cableLength}
                      onChange={(e) => setCableLength(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Inspector & Dual Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'متولی انجام تست (کارشناس / شرکت)' : 'Inspector'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>

                <DualCalendarField
                  label={isRtl ? 'تاریخ و زمان تست کابل' : 'Inspection Date & Time'}
                  dateJalali={dualDate.dateJalali}
                  dateGregorian={dualDate.dateGregorian}
                  time={dualDate.time}
                  onChange={(val) => setDualDate(val)}
                  required
                />
              </div>

              {/* Defect Localization & Classification */}
              <div className="bg-purple-50/60 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 space-y-4">
                <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                  <Ruler size={16} className="text-purple-600" />
                  <span>{isRtl ? 'موقعیت‌یابی و طبقه‌بندی عیب کابل' : 'Defect Localization & Classification'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Defect Position (m) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'موقعیت خرابی (فاصله از ایستگاه به متر)' : 'Defect Position (meters along cable)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={defectPosition}
                      onChange={(e) => setDefectPosition(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 1420.5"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300"
                    />
                  </div>

                  {/* Defect Type Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'نوع عیب (Defect Type)' : 'Defect Type'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={defectType}
                      onChange={(e) => setDefectType(e.target.value as any)}
                      className="w-full text-xs font-bold px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                    >
                      <option value="LF">LF - گسستگی موضعی / شکستگی سیم (Localized Fault)</option>
                      <option value="LMA">LMA - کاهش مساحت مقطع فلزی (Loss of Area)</option>
                      <option value="Comp">Comp - عیب ترکیبی (Composite Fault)</option>
                    </select>
                  </div>

                  {/* % LMA input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'درصد کاهش سطح فلزی (% LMA)' : '% LMA Value'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={lmaPercentage}
                      onChange={(e) => setLmaPercentage(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                {/* Broken Wires (if any) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'تعداد سیم‌های شکسته در گام بافت' : 'Broken Wires Count'}
                    </label>
                    <input
                      type="number"
                      value={brokenWiresCount}
                      onChange={(e) => setBrokenWiresCount(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-mono px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>

                  {/* Dynamic Criticality Badge */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {isRtl ? 'ارزیابی خودکار وضعیت بحرانی:' : 'Computed Criticality Alert:'}
                    </label>
                    <div className={`p-2 rounded-xl border text-center font-bold text-xs ${getCriticalityBadge(currentCriticality).bg}`}>
                      {isRtl ? getCriticalityBadge(currentCriticality).labelFa : getCriticalityBadge(currentCriticality).labelEn}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Action */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'اقدام توصیه‌شده فنی طبق استاندارد' : 'Recommended Corrective Action'}
                </label>
                <input
                  type="text"
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                />
              </div>

              {/* PDF Attachment */}
              <PdfAttachmentUploader
                equipmentId={cableId}
                subDomain="mfl_cable"
                pdfUrl={pdfInfo.pdfUrl}
                pdfName={pdfInfo.pdfName}
                pdfSize={pdfInfo.pdfSize}
                onUploadSuccess={(info) => setPdfInfo(info)}
                onRemove={() => setPdfInfo({})}
                label={isRtl ? 'پیوست گزارش تست رسمی MFL کابل (PDF)' : 'Attach MFL Certificate / Report (PDF)'}
              />

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
                >
                  {isRtl ? 'ثبت نتایج تست MFL' : 'Save MFL Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED TECHNICAL REPORT MODAL */}
      {selectedRecordForDetails && (
        <CmReportDetailModal
          record={selectedRecordForDetails}
          subDomain="mfl_cable"
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
