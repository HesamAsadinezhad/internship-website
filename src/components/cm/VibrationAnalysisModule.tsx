import React, { useState, useEffect } from 'react';
import {
  Activity,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Gauge,
  Info,
  Calendar,
  UserCheck,
  ShieldCheck,
  ChevronDown,
  Eye
} from 'lucide-react';
import { DualCalendarField } from '../DualCalendarModal';
import PdfAttachmentUploader from '../PdfAttachmentUploader';
import CmReportDetailModal from './CmReportDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import {
  VibrationRecord,
  VibrationGridMatrix,
  FrequencyBandThresholds,
  AccMetricMode
} from '../../types/conditionMonitoring';
import { getDualDateTimeFromDate } from '../../utils/jalali';

const DEFAULT_LF_BAND: FrequencyBandThresholds = {
  fMin: 10,
  fMax: 1000,
  zoneAB: 1.4,
  zoneBC: 2.8,
  zoneCD: 4.5
};

const DEFAULT_HF_BAND: FrequencyBandThresholds = {
  fMin: 1000,
  fMax: 10000,
  zoneAB: 1.8,
  zoneBC: 4.5,
  zoneCD: 7.1
};

const INITIAL_MATRIX: VibrationGridMatrix = {
  de_velocity_a: 1.2,
  de_velocity_h: 1.8,
  de_velocity_v: 1.4,
  de_acc_a: 0.8,
  de_acc_h: 1.5,
  de_acc_v: 1.1,
  nde_velocity_a: 0.9,
  nde_velocity_h: 1.5,
  nde_velocity_v: 1.1,
  nde_acc_a: 0.6,
  nde_acc_h: 1.2,
  nde_acc_v: 0.9
};

const EQUIPMENT_OPTIONS = [
  { id: 'motor', nameFa: 'الکتروموتور اصلی (Main Motor)', nameEn: 'Main Motor' },
  { id: 'gearbox', nameFa: 'گیربکس اصلی (Main Gearbox)', nameEn: 'Main Gearbox' },
  { id: 'diesel_generator', nameFa: 'دیزل ژنراتور اضطراری (Diesel Generator)', nameEn: 'Emergency Diesel Generator' },
  { id: 'return_wheel', nameFa: 'فلکه هرزگرد / برگشت (Return Sheave / Bullwheel)', nameEn: 'Return Sheave / Bullwheel' },
  { id: 'custom', nameFa: 'سایر / قطعه سفارشی (Other / Custom Component)', nameEn: 'Other / Custom Component' }
];

export default function VibrationAnalysisModule() {
  const { isRtl } = useLanguage();

  // Test records list
  const [records, setRecords] = useState<VibrationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('all');
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<VibrationRecord | null>(null);

  // Form state
  const [targetEquipment, setTargetEquipment] = useState<string>('motor');
  const [customComponentName, setCustomComponentName] = useState<string>('الکتروموتور اصلی');
  const [inspector, setInspector] = useState<string>('مهندس حسام اسدی (کارشناس ارتعاشات)');
  const [dualDate, setDualDate] = useState(() => getDualDateTimeFromDate());
  const [pdfInfo, setPdfInfo] = useState<{ pdfUrl?: string; pdfName?: string; pdfSize?: number }>({});
  const [notes, setNotes] = useState<string>('');

  const handleTargetEquipmentChange = (newTarget: string) => {
    setTargetEquipment(newTarget);
    const eq = EQUIPMENT_OPTIONS.find(e => e.id === newTarget);
    if (eq && newTarget !== 'custom') {
      setCustomComponentName(isRtl ? eq.nameFa.split('(')[0].trim() : eq.nameEn);
    } else if (newTarget === 'custom') {
      setCustomComponentName('');
    }
  };

  // Thresholds config
  const [lfBand, setLfBand] = useState<FrequencyBandThresholds>(DEFAULT_LF_BAND);
  const [hfBand, setHfBand] = useState<FrequencyBandThresholds>(DEFAULT_HF_BAND);
  const [accMode, setAccMode] = useState<AccMetricMode>('Peak');
  const [showConfig, setShowConfig] = useState(false);

  // 12-input matrix state
  const [matrix, setMatrix] = useState<VibrationGridMatrix>(INITIAL_MATRIX);

  // Load records
  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cm/vibrations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to fetch vibration records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute ISO 20816 Zone for a given value based on thresholds
  const calculateZone = (val: number, thresholds: FrequencyBandThresholds): 'A' | 'B' | 'C' | 'D' => {
    if (val <= thresholds.zoneAB) return 'A';
    if (val <= thresholds.zoneBC) return 'B';
    if (val <= thresholds.zoneCD) return 'C';
    return 'D';
  };

  const getZoneBadge = (zone: 'A' | 'B' | 'C' | 'D') => {
    switch (zone) {
      case 'A':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          label: isRtl ? 'زون A (عالی / مجاز)' : 'Zone A (Good)'
        };
      case 'B':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300',
          label: isRtl ? 'زون B (قابل قبول)' : 'Zone B (Acceptable)'
        };
      case 'C':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300',
          label: isRtl ? 'زون C (هشدار / مراقبت)' : 'Zone C (Warning)'
        };
      case 'D':
        return {
          bg: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300',
          label: isRtl ? 'زون D (بحرانی / توقف)' : 'Zone D (Critical)'
        };
    }
  };

  const handleMatrixChange = (field: keyof VibrationGridMatrix, val: number) => {
    setMatrix(prev => ({ ...prev, [field]: isNaN(val) ? 0 : val }));
  };

  // Evaluate overall highest zone
  const computeOverallZone = (m: VibrationGridMatrix): 'A' | 'B' | 'C' | 'D' => {
    const velVals = [
      m.de_velocity_a, m.de_velocity_h, m.de_velocity_v,
      m.nde_velocity_a, m.nde_velocity_h, m.nde_velocity_v
    ];
    const accVals = [
      m.de_acc_a, m.de_acc_h, m.de_acc_v,
      m.nde_acc_a, m.nde_acc_h, m.nde_acc_v
    ];

    const zones: ('A' | 'B' | 'C' | 'D')[] = [];
    velVals.forEach(v => zones.push(calculateZone(v, lfBand)));
    accVals.forEach(a => zones.push(calculateZone(a, hfBand)));

    if (zones.includes('D')) return 'D';
    if (zones.includes('C')) return 'C';
    if (zones.includes('B')) return 'B';
    return 'A';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspector.trim()) {
      alert(isRtl ? 'نام متولی انجام بازرسی الزامی است.' : 'Inspector name is required.');
      return;
    }

    const overallZone = computeOverallZone(matrix);
    const eqObj = EQUIPMENT_OPTIONS.find(eq => eq.id === targetEquipment);
    const defaultName = isRtl ? (eqObj?.nameFa || targetEquipment) : (eqObj?.nameEn || targetEquipment);
    const finalComponentName = customComponentName.trim() || defaultName;

    const newRecord: Partial<VibrationRecord> = {
      subDomain: 'vibration',
      targetEquipment,
      equipmentId: targetEquipment,
      equipmentName: finalComponentName,
      customComponentName: finalComponentName,
      partName: finalComponentName,
      inspector,
      dateJalali: dualDate.dateJalali,
      dateGregorian: dualDate.dateGregorian,
      time: dualDate.time,
      reportPdfUrl: pdfInfo.pdfUrl,
      reportPdfName: pdfInfo.pdfName,
      reportPdfSize: pdfInfo.pdfSize,
      notes,
      accMode,
      velocityMetric: 'RMS',
      lfBand,
      hfBand,
      matrix,
      overallZone
    };

    try {
      const res = await fetch('/api/cm/vibrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
        credentials: 'include'
      });

      if (res.ok) {
        await fetchRecords();
        setShowNewModal(false);
        setPdfInfo({});
        setNotes('');
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت اطلاعات ارتعاشات');
      }
    } catch (err) {
      console.error('Error saving vibration record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? 'آیا از حذف این رکورد ارتعاشی اطمینان دارید؟' : 'Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/cm/vibrations/${id}`, {
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

  const filteredRecords = selectedAssetFilter === 'all'
    ? records
    : records.filter(r => r.targetEquipment === selectedAssetFilter);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {isRtl ? 'ماژول تخصصی آنالیز ارتعاشات (ISO 20816)' : 'Vibration Analysis (ISO 20816)'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRtl
                  ? 'محدود به ۴ تجهیز کلیدی: موتور، گیربکس، دیزل ژنراتور و چرخ برگشت | ماتریس ۱۲ نقطه‌ای DE/NDE'
                  : 'Targeted to 4 Core Assets: Motor, Gearbox, Diesel Gen & Bullwheel | 12-Input DE/NDE Matrix'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Asset filter */}
          <select
            value={selectedAssetFilter}
            onChange={(e) => setSelectedAssetFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
          >
            <option value="all">{isRtl ? 'همه ۴ تجهیز کلیدی' : 'All 4 Key Assets'}</option>
            {EQUIPMENT_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {isRtl ? opt.nameFa : opt.nameEn}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus size={16} />
            <span>{isRtl ? 'ثبت اندازه‌گیری جدید' : 'New Vibration Test'}</span>
          </button>
        </div>
      </div>

      {/* ISO 20816 4-Equipment Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EQUIPMENT_OPTIONS.map(eq => {
          const latest = records.find(r => r.targetEquipment === eq.id);
          const zoneInfo = latest?.overallZone ? getZoneBadge(latest.overallZone) : null;
          return (
            <div
              key={eq.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-2xs space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold">
                    ISO 20816
                  </span>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {isRtl ? eq.nameFa.split('(')[0] : eq.nameEn}
                  </h4>
                </div>
                {zoneInfo ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${zoneInfo.bg}`}>
                    {latest?.overallZone}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                    {isRtl ? 'بدون داده' : 'No data'}
                  </span>
                )}
              </div>

              {latest ? (
                <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>{isRtl ? 'آخرین تاریخ:' : 'Last Date:'}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{latest.dateJalali}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isRtl ? 'متولی بازرسی:' : 'Inspector:'}</span>
                    <span className="truncate max-w-[120px] font-medium">{latest.inspector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isRtl ? 'حداکثر سرعت DE:' : 'Max DE Vel:'}</span>
                    <span className="font-mono font-bold text-blue-600">
                      {Math.max(latest.matrix.de_velocity_a, latest.matrix.de_velocity_h, latest.matrix.de_velocity_v)} mm/s
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">
                  {isRtl ? 'هنوز تستی برای این تجهیز ثبت نشده است' : 'No tests recorded yet'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Historical Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Gauge size={16} className="text-blue-600" />
            <span>{isRtl ? 'تاریخچه رکوردهای ارتعاش‌سنجی ۴ تجهیز' : 'Vibration Test Records History'}</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              {filteredRecords.length}
            </span>
          </h3>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
            {isRtl ? 'هیچ رکوردی برای نمایش وجود ندارد.' : 'No vibration records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'تجهیز هدف' : 'Target Asset'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متولی بازرسی' : 'Inspector / Authority'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاریخ شمسی (میلادی)' : 'Dual Date'}</th>
                  <th className="py-3 px-4">{isRtl ? 'سرعت DE (A/H/V) mm/s' : 'DE Vel (A/H/V)'}</th>
                  <th className="py-3 px-4">{isRtl ? 'شتاب DE (A/H/V)' : 'DE Acc (A/H/V)'}</th>
                  <th className="py-3 px-4">{isRtl ? 'سرعت NDE (A/H/V)' : 'NDE Vel (A/H/V)'}</th>
                  <th className="py-3 px-4">{isRtl ? 'زون کلی' : 'Zone'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گزارش PDF' : 'PDF Report'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecords.map(r => {
                  const zInfo = getZoneBadge(r.overallZone);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {r.customComponentName || r.equipmentName}
                        </div>
                        {r.customComponentName && r.equipmentName && r.equipmentName !== r.customComponentName && (
                          <div className="text-[10px] text-gray-500">{r.equipmentName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-blue-500 shrink-0" />
                          <span>{r.inspector}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-mono">
                        <div>{r.dateJalali} {r.time}</div>
                        <div className="text-[10px] text-gray-400">({r.dateGregorian})</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-gray-700 dark:text-gray-300">
                          {r.matrix.de_velocity_a} / {r.matrix.de_velocity_h} / {r.matrix.de_velocity_v}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-gray-700 dark:text-gray-300">
                          {r.matrix.de_acc_a} / {r.matrix.de_acc_h} / {r.matrix.de_acc_v}{' '}
                          <span className="text-[10px] text-gray-400">({r.accMode})</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-gray-700 dark:text-gray-300">
                          {r.matrix.nde_velocity_a} / {r.matrix.nde_velocity_h} / {r.matrix.nde_velocity_v}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${zInfo.bg}`}>
                          {r.overallZone}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.reportPdfUrl ? (
                          <a
                            href={r.reportPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold"
                          >
                            <FileText size={13} />
                            <span>{isRtl ? 'مشاهده PDF' : 'View PDF'}</span>
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
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title={isRtl ? 'حذف رکورد' : 'Delete record'}
                          >
                            <Trash2 size={16} />
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

      {/* NEW VIBRATION TEST MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {isRtl ? 'ثبت داده‌های ارتعاش‌سنجی طبق ISO 20816' : 'Log Vibration Data (ISO 20816)'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isRtl ? 'ورود ماتریس ۱۲ نقطه‌ای DE/NDE و حدود فرکانسی' : '12-input matrix entry & frequency regime limits'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Universal Section: Asset + Inspector + Dual Calendar */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-600" />
                  <span>{isRtl ? 'مشخصات مرجع و اطلاعات آزمون' : 'Reference & Test Metadata'}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Equipment Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      {isRtl ? 'دسته‌بندی تجهیز هدف' : 'Target Asset Category'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetEquipment}
                      onChange={(e) => handleTargetEquipmentChange(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {EQUIPMENT_OPTIONS.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {isRtl ? eq.nameFa : eq.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Component Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      {isRtl ? 'نام اختصاصی / سفارشی قطعه' : 'Custom Component / Part Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customComponentName}
                      onChange={(e) => setCustomComponentName(e.target.value)}
                      placeholder={isRtl ? 'مثلاً: الکتروموتور اصلی خط ۱' : 'e.g. Main Motor Line 1'}
                      className="w-full text-xs font-medium px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Inspector / Authority */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      {isRtl ? 'متولی انجام تست (کارشناس / شرکت)' : 'Inspector / Responsible Authority'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inspector}
                      onChange={(e) => setInspector(e.target.value)}
                      placeholder={isRtl ? 'نام کارشناس یا آزمایشگاه' : 'e.g. John Doe / Cert Lab'}
                      className="w-full text-xs font-medium px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Dual Calendar Field */}
                  <DualCalendarField
                    label={isRtl ? 'تاریخ و زمان تست (شمسی / میلادی)' : 'Test Date & Time'}
                    dateJalali={dualDate.dateJalali}
                    dateGregorian={dualDate.dateGregorian}
                    time={dualDate.time}
                    onChange={(val) => setDualDate(val)}
                    required
                  />
                </div>
              </div>

              {/* Thresholds & Parameter Configuration Bar */}
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      {isRtl ? 'پیکربندی حدود فرکانسی و ترشولدهای زون ارتعاشات (ISO 20816)' : 'Frequency Bands & ISO Zone Threshold Configuration'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Acceleration Metric Toggle */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        {isRtl ? 'واحد شتاب:' : 'Acc Metric:'}
                      </span>
                      <div className="flex rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-0.5">
                        <button
                          type="button"
                          onClick={() => setAccMode('Peak')}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            accMode === 'Peak' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Peak
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccMode('RMS')}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            accMode === 'RMS' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          RMS
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfig(!showConfig)}
                      className="text-xs text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>{showConfig ? (isRtl ? 'بستن تنظیمات' : 'Collapse') : (isRtl ? 'ویرایش ترشولدها' : 'Edit Thresholds')}</span>
                      <ChevronDown size={14} className={`transform transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {isRtl ? 'معیار سرعت:' : 'Velocity Metric:'}
                    </span>{' '}
                    <span className="font-mono text-blue-700 dark:text-blue-300 font-bold">RMS (mm/s)</span> (قفل شده)
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {isRtl ? 'باند فرکانس پایین (LF):' : 'LF Band:'}
                    </span>{' '}
                    <span className="font-mono">{lfBand.fMin} - {lfBand.fMax} Hz</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {isRtl ? 'باند فرکانس بالا (HF):' : 'HF Band:'}
                    </span>{' '}
                    <span className="font-mono">{hfBand.fMin} - {hfBand.fMax} Hz</span>
                  </div>
                </div>

                {/* Collapsible Threshold Inputs */}
                {showConfig && (
                  <div className="pt-3 border-t border-blue-200 dark:border-blue-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LF Band Config */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {isRtl ? 'باند فرکانس پایین (LF - سرعت ارتعاشات)' : 'Low Frequency Band (LF - Velocity)'}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-gray-500">fMin (Hz)</label>
                          <input
                            type="number"
                            value={lfBand.fMin}
                            onChange={(e) => setLfBand({ ...lfBand, fMin: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border rounded bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500">fMax (Hz)</label>
                          <input
                            type="number"
                            value={lfBand.fMax}
                            onChange={(e) => setLfBand({ ...lfBand, fMax: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border rounded bg-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-xs pt-1">
                        <div>
                          <label className="text-[10px] text-gray-500">Zone A→B</label>
                          <input
                            type="number"
                            step="0.1"
                            value={lfBand.zoneAB}
                            onChange={(e) => setLfBand({ ...lfBand, zoneAB: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500">Zone B→C</label>
                          <input
                            type="number"
                            step="0.1"
                            value={lfBand.zoneBC}
                            onChange={(e) => setLfBand({ ...lfBand, zoneBC: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500">Zone C→D</label>
                          <input
                            type="number"
                            step="0.1"
                            value={lfBand.zoneCD}
                            onChange={(e) => setLfBand({ ...lfBand, zoneCD: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* HF Band Config */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {isRtl ? 'باند فرکانس بالا (HF - شتاب ارتعاشات)' : 'High Frequency Band (HF - Acceleration)'}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-gray-500">fMin (Hz)</label>
                          <input
                            type="number"
                            value={hfBand.fMin}
                            onChange={(e) => setHfBand({ ...hfBand, fMin: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border rounded bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-500">fMax (Hz)</label>
                          <input
                            type="number"
                            value={hfBand.fMax}
                            onChange={(e) => setHfBand({ ...hfBand, fMax: Number(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border rounded bg-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-xs pt-1">
                        <div>
                          <label className="text-[10px] text-gray-500">Zone A→B</label>
                          <input
                            type="number"
                            step="0.1"
                            value={hfBand.zoneAB}
                            onChange={(e) => setHfBand({ ...hfBand, zoneAB: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500">Zone B→C</label>
                          <input
                            type="number"
                            step="0.1"
                            value={hfBand.zoneBC}
                            onChange={(e) => setHfBand({ ...hfBand, zoneBC: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500">Zone C→D</label>
                          <input
                            type="number"
                            step="0.1"
                            value={hfBand.zoneCD}
                            onChange={(e) => setHfBand({ ...hfBand, zoneCD: Number(e.target.value) })}
                            className="w-full px-1.5 py-1 text-xs border rounded bg-transparent font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* DYNAMIC 12-INPUT MEASUREMENT MATRIX */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {isRtl
                      ? 'ماتریس ثبت داده‌های ارتعاشی ۱۲ نقطه‌ای (DE و NDE در ۳ راستای A, H, V)'
                      : 'Dynamic 12-Input Vibration Matrix (DE & NDE across A, H, V axes)'}
                  </h4>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                    12 Distinct Numeric Fields
                  </span>
                </div>

                <div className="p-4 space-y-6">
                  {/* Location 1: DE (Drive End) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs">
                        Drive End (DE) - سمت محرک
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* DE Velocity */}
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-800 dark:text-gray-200">
                          <span>{isRtl ? 'سرعت ارتعاشات DE' : 'DE Velocity'} (RMS mm/s)</span>
                          <span className="text-[10px] text-gray-500 font-mono">LF Band</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              محوری (A)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.de_velocity_a}
                                onChange={(e) => handleMatrixChange('de_velocity_a', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.de_velocity_a, lfBand)).bg}`}>
                                {calculateZone(matrix.de_velocity_a, lfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              افقی (H)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.de_velocity_h}
                                onChange={(e) => handleMatrixChange('de_velocity_h', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.de_velocity_h, lfBand)).bg}`}>
                                {calculateZone(matrix.de_velocity_h, lfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              عمودی (V)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.de_velocity_v}
                                onChange={(e) => handleMatrixChange('de_velocity_v', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.de_velocity_v, lfBand)).bg}`}>
                                {calculateZone(matrix.de_velocity_v, lfBand)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DE Acceleration */}
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-800 dark:text-gray-200">
                          <span>{isRtl ? 'شتاب ارتعاشات DE' : 'DE Acceleration'} ({accMode} g)</span>
                          <span className="text-[10px] text-gray-500 font-mono">HF Band</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              محوری (A)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.de_acc_a}
                                onChange={(e) => handleMatrixChange('de_acc_a', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.de_acc_a, hfBand)).bg}`}>
                                {calculateZone(matrix.de_acc_a, hfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              افقی (H)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.de_acc_h}
                                onChange={(e) => handleMatrixChange('de_acc_h', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.de_acc_h, hfBand)).bg}`}>
                                {calculateZone(matrix.de_acc_h, hfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              عمودی (V)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.de_acc_v}
                                onChange={(e) => handleMatrixChange('de_acc_v', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.de_acc_v, hfBand)).bg}`}>
                                {calculateZone(matrix.de_acc_v, hfBand)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location 2: NDE (Non-Drive End) */}
                  <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                        Non-Drive End (NDE) - سمت هرزگرد / غیرمحرک
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* NDE Velocity */}
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-800 dark:text-gray-200">
                          <span>{isRtl ? 'سرعت ارتعاشات NDE' : 'NDE Velocity'} (RMS mm/s)</span>
                          <span className="text-[10px] text-gray-500 font-mono">LF Band</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              محوری (A)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.nde_velocity_a}
                                onChange={(e) => handleMatrixChange('nde_velocity_a', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.nde_velocity_a, lfBand)).bg}`}>
                                {calculateZone(matrix.nde_velocity_a, lfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              افقی (H)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.nde_velocity_h}
                                onChange={(e) => handleMatrixChange('nde_velocity_h', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.nde_velocity_h, lfBand)).bg}`}>
                                {calculateZone(matrix.nde_velocity_h, lfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              عمودی (V)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.nde_velocity_v}
                                onChange={(e) => handleMatrixChange('nde_velocity_v', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.nde_velocity_v, lfBand)).bg}`}>
                                {calculateZone(matrix.nde_velocity_v, lfBand)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* NDE Acceleration */}
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-800 dark:text-gray-200">
                          <span>{isRtl ? 'شتاب ارتعاشات NDE' : 'NDE Acceleration'} ({accMode} g)</span>
                          <span className="text-[10px] text-gray-500 font-mono">HF Band</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              محوری (A)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.nde_acc_a}
                                onChange={(e) => handleMatrixChange('nde_acc_a', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.nde_acc_a, hfBand)).bg}`}>
                                {calculateZone(matrix.nde_acc_a, hfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              افقی (H)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.nde_acc_h}
                                onChange={(e) => handleMatrixChange('nde_acc_h', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.nde_acc_h, hfBand)).bg}`}>
                                {calculateZone(matrix.nde_acc_h, hfBand)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                              عمودی (V)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="number"
                                step="0.01"
                                value={matrix.nde_acc_v}
                                onChange={(e) => handleMatrixChange('nde_acc_v', parseFloat(e.target.value))}
                                className="w-full text-center text-xs font-bold font-mono px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-900"
                              />
                              <span className={`block text-center text-[10px] font-bold rounded py-0.5 border ${getZoneBadge(calculateZone(matrix.nde_acc_v, hfBand)).bg}`}>
                                {calculateZone(matrix.nde_acc_v, hfBand)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Certificate / Report Uploader */}
              <PdfAttachmentUploader
                equipmentId={targetEquipment}
                subDomain="vibration"
                pdfUrl={pdfInfo.pdfUrl}
                pdfName={pdfInfo.pdfName}
                pdfSize={pdfInfo.pdfSize}
                onUploadSuccess={(info) => setPdfInfo(info)}
                onRemove={() => setPdfInfo({})}
                label={isRtl ? 'پیوست گواهینامه یا گزارش رسمی ارتعاش‌سنجی (PDF)' : 'Attach Vibration Report / Certificate (PDF)'}
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isRtl ? 'تحلیل عیب‌یابی و توصیه‌های فنی' : 'Diagnostic Observations & Recommendations'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'مشاهده عدم بالانسی، ناهم‌راستایی، لقی یا عیب در مسیر بلبرینگ...' : 'Any imbalance, misalignment, or bearing defect remarks...'}
                  className="w-full text-xs p-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {isRtl ? 'ثبت گزارش و ارزیابی زون' : 'Save Test & Evaluate Zone'}
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
          subDomain="vibration"
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
