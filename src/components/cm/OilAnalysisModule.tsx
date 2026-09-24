import React, { useState, useEffect } from 'react';
import {
  Droplet,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Beaker,
  ShieldCheck,
  UserCheck,
  Eye
} from 'lucide-react';
import { DualCalendarField } from '../DualCalendarModal';
import PdfAttachmentUploader from '../PdfAttachmentUploader';
import CmReportDetailModal from './CmReportDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import { OilAnalysisRecord, OilElementalGrid } from '../../types/conditionMonitoring';
import { getDualDateTimeFromDate } from '../../utils/jalali';

const DEFAULT_ELEMENTS: OilElementalGrid = {
  fe: 18,
  na: 5,
  pq: 12,
  cu: 8,
  pb: 4
};

const OIL_EQUIPMENT_OPTIONS = [
  { id: 'gearbox', nameFa: 'گیربکس اصلی تله‌کابین (Main Gearbox)', nameEn: 'Main Gearbox' },
  { id: 'diesel_generator', nameFa: 'کارتر موتور دیزل ژنراتور (Diesel Generator Sump)', nameEn: 'Emergency Diesel Generator' },
  { id: 'hydraulic_tension', nameFa: 'یونیت هیدرولیک کشش کابل (Hydraulic Tension Unit)', nameEn: 'Hydraulic Tension Unit' },
  { id: 'return_wheel_bearing', nameFa: 'محفظه روغن یاتاقان فلکه هرزگرد (Return Wheel Bearing)', nameEn: 'Return Wheel Sump' },
  { id: 'custom', nameFa: 'سایر / قطعه سفارشی (Other / Custom Component)', nameEn: 'Other / Custom Component' }
];

export default function OilAnalysisModule() {
  const { isRtl } = useLanguage();
  const [records, setRecords] = useState<OilAnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<OilAnalysisRecord | null>(null);

  // Form states
  const [equipmentId, setEquipmentId] = useState<string>('gearbox');
  const [equipmentName, setEquipmentName] = useState<string>('گیربکس اصلی تله‌کابین');
  const [customComponentName, setCustomComponentName] = useState<string>('گیربکس اصلی تله‌کابین');
  const [lubricantName, setLubricantName] = useState<string>('Mobil SHC 630 (ISO VG 220)');
  const [operatingHours, setOperatingHours] = useState<number>(2450);
  const [inspector, setInspector] = useState<string>('آزمایشگاه تخصصی پایش روغن و ذرات فرسایشی');
  const [dualDate, setDualDate] = useState(() => getDualDateTimeFromDate());
  const [elements, setElements] = useState<OilElementalGrid>(DEFAULT_ELEMENTS);
  const [viscosity40, setViscosity40] = useState<number>(218.4);
  const [tan, setTan] = useState<number>(0.65);
  const [waterPpm, setWaterPpm] = useState<number>(85);
  const [isoCleanliness, setIsoCleanliness] = useState<string>('17/15/12');
  const [oilCondition, setOilCondition] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [pdfInfo, setPdfInfo] = useState<{ pdfUrl?: string; pdfName?: string; pdfSize?: number }>({});
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cm/oil-analyses', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to load oil analysis logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleElementChange = (key: keyof OilElementalGrid, val: number) => {
    setElements(prev => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  };

  const getConditionBadge = (cond: 'normal' | 'warning' | 'critical') => {
    switch (cond) {
      case 'normal':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          label: isRtl ? 'نرمال (قابل استفاده)' : 'Normal (Serviceable)'
        };
      case 'warning':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300',
          label: isRtl ? 'هشدار (پایش کوتاه‌مدت)' : 'Warning (Action Req)'
        };
      case 'critical':
        return {
          bg: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300',
          label: isRtl ? 'بحرانی (تعویض فوری روغن)' : 'Critical (Immediate Drain)'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspector.trim()) {
      alert(isRtl ? 'نام آزمایشگاه / متولی بازرسی الزامی است.' : 'Inspector is required.');
      return;
    }

    const eqObj = OIL_EQUIPMENT_OPTIONS.find(eq => eq.id === equipmentId);
    const defaultName = isRtl ? (eqObj?.nameFa || equipmentName) : (eqObj?.nameEn || equipmentName);
    const finalComponentName = customComponentName.trim() || defaultName;

    const newRecord: Partial<OilAnalysisRecord> = {
      subDomain: 'oil_analysis',
      equipmentId,
      equipmentName: finalComponentName,
      customComponentName: finalComponentName,
      partName: finalComponentName,
      lubricantName,
      operatingHours,
      inspector,
      dateJalali: dualDate.dateJalali,
      dateGregorian: dualDate.dateGregorian,
      time: dualDate.time,
      elements,
      viscosity40,
      tan,
      waterPpm,
      isoCleanliness,
      oilCondition,
      reportPdfUrl: pdfInfo.pdfUrl,
      reportPdfName: pdfInfo.pdfName,
      reportPdfSize: pdfInfo.pdfSize,
      notes
    };

    try {
      const res = await fetch('/api/cm/oil-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
        credentials: 'include'
      });

      if (res.ok) {
        await fetchRecords();
        setShowModal(false);
        setPdfInfo({});
        setNotes('');
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت آنالیز روغن');
      }
    } catch (err) {
      console.error('Error saving oil analysis record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? 'آیا از حذف این رکورد آنالیز روغن مطمئن هستید؟' : 'Delete oil analysis record?')) return;
    try {
      const res = await fetch(`/api/cm/oil-analyses/${id}`, {
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
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <Droplet size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isRtl ? 'ماژول آزمایشگاه آنالیز روغن (Oil Analysis)' : 'Oil Analysis Laboratory Module'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRtl
                ? 'پایش عناصر فرسایشی (Fe, Na, PQ, Cu, Pb) بر حسب PPM | ویسکوزیته، عدد اسیدی TAN و کلاس تمیزی ISO 4406'
                : 'Elemental & Contamination Grid (Fe, Na, PQ, Cu, Pb) in PPM | Viscosity, TAN, Water & Cleanliness'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus size={16} />
          <span>{isRtl ? 'ثبت نتایج آزمایش روغن جدید' : 'New Oil Analysis Report'}</span>
        </button>
      </div>

      {/* Elements Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { sym: 'Fe', nameFa: 'آهن (فرسایش دنده و برینگ)', nameEn: 'Iron (Fe) - Gears & Bearings', unit: 'PPM', descFa: 'حد مجاز: < 100', descEn: 'Threshold: < 100' },
          { sym: 'Na', nameFa: 'سدیم (آلودگی محیطی / نمک)', nameEn: 'Sodium (Na) - Contamination', unit: 'PPM', descFa: 'حد مجاز: < 25', descEn: 'Threshold: < 25' },
          { sym: 'PQ', nameFa: 'شاخص براده آهن (PQ Index)', nameEn: 'PQ Index - Large Ferrous Particles', unit: 'Index', descFa: 'حد مجاز: < 50', descEn: 'Threshold: < 50' },
          { sym: 'Cu', nameFa: 'مس (فرسایش برنز / بوش)', nameEn: 'Copper (Cu) - Bushings / Bronze', unit: 'PPM', descFa: 'حد مجاز: < 30', descEn: 'Threshold: < 30' },
          { sym: 'Pb', nameFa: 'سرب (فرسایش لایه بابیت)', nameEn: 'Lead (Pb) - Babbitt Bearing Layer', unit: 'PPM', descFa: 'حد مجاز: < 20', descEn: 'Threshold: < 20' }
        ].map((elem) => (
          <div key={elem.sym} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <div className="flex items-baseline justify-between">
              <span className="text-base font-black font-mono text-amber-700 dark:text-amber-300">
                {elem.sym}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">{elem.unit}</span>
            </div>
            <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-1">
              {isRtl ? elem.nameFa : elem.nameEn}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{isRtl ? elem.descFa : elem.descEn}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FlaskConical size={16} className="text-amber-600" />
            <span>{isRtl ? 'گزارش‌های آزمایشگاه آنالیز روغن' : 'Oil Analysis Lab Reports'}</span>
          </h3>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {records.length} {isRtl ? 'آزمایش' : 'tests'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {isRtl ? 'هنوز داده‌ای در بخش آنالیز روغن ثبت نشده است.' : 'No oil analysis records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'تجهیز' : 'Equipment'}</th>
                  <th className="py-3 px-4">{isRtl ? 'نام تجاری روغن / کارکرد' : 'Lube & Hours'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متولی بازرسی / آزمایشگاه' : 'Inspector'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاریخ و ساعت' : 'Date & Time'}</th>
                  <th className="py-3 px-4 font-mono">{isRtl ? 'عناصر فرسایشی (Fe/Na/PQ/Cu/Pb)' : 'Elements (PPM)'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گرانروی @ 40°C' : 'Visc 40°C'}</th>
                  <th className="py-3 px-4">{isRtl ? 'اسیدیته (TAN)' : 'TAN'}</th>
                  <th className="py-3 px-4">{isRtl ? 'وضعیت روغن' : 'Condition'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گواهی PDF' : 'PDF Report'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(r => {
                  const cBadge = getConditionBadge(r.oilCondition);
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
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{r.lubricantName}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{r.operatingHours} {isRtl ? 'ساعت کارکرد' : 'hrs'}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-amber-500 shrink-0" />
                          <span className="truncate max-w-[150px]">{r.inspector}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                        <div>{r.dateJalali}</div>
                        <div className="text-[10px] text-gray-400">({r.dateGregorian})</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-800 dark:text-gray-200">
                        <span className={r.elements.fe > 80 ? 'text-red-600' : ''}>{r.elements.fe}</span> /{' '}
                        <span>{r.elements.na}</span> /{' '}
                        <span className={r.elements.pq > 40 ? 'text-orange-600' : ''}>{r.elements.pq}</span> /{' '}
                        <span>{r.elements.cu}</span> /{' '}
                        <span>{r.elements.pb}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {r.viscosity40 ? `${r.viscosity40} cSt` : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {r.tan ? `${r.tan}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cBadge.bg}`}>
                          {cBadge.label}
                        </span>
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
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <Beaker size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? 'ثبت گزارش جامع آنالیز روغن آزمایشگاهی' : 'Log Laboratory Oil Analysis'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Reference & Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'دسته‌بندی تجهیز هدف' : 'Target Asset Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={equipmentId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setEquipmentId(newId);
                      const eq = OIL_EQUIPMENT_OPTIONS.find(o => o.id === newId);
                      if (eq) {
                        setEquipmentName(isRtl ? eq.nameFa : eq.nameEn);
                        if (newId !== 'custom') {
                          setCustomComponentName(isRtl ? eq.nameFa.split('(')[0].trim() : eq.nameEn);
                        } else {
                          setCustomComponentName('');
                        }
                      }
                    }}
                    className="w-full text-xs font-medium px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                  >
                    {OIL_EQUIPMENT_OPTIONS.map(eq => (
                      <option key={eq.id} value={eq.id}>{isRtl ? eq.nameFa : eq.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'نام اختصاصی / سفارشی قطعه یا مخزن' : 'Custom Component / Sump Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customComponentName}
                    onChange={(e) => setCustomComponentName(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: گیربکس اصلی تله‌کابین' : 'e.g. Main Gearbox Oil Sump'}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'متولی بازرسی / نام آزمایشگاه' : 'Inspector / Lab Authority'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Dual Calendar */}
              <DualCalendarField
                label={isRtl ? 'تاریخ و زمان نمونه‌برداری / آزمایش' : 'Sampling & Test Date / Time'}
                dateJalali={dualDate.dateJalali}
                dateGregorian={dualDate.dateGregorian}
                time={dualDate.time}
                onChange={(val) => setDualDate(val)}
                required
              />

              {/* Required Metadata: Lubricant Commercial Name & Operating Hours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    {isRtl ? 'نام تجاری روغن (Commercial Lube Name)' : 'Lubricant Commercial Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lubricantName}
                    onChange={(e) => setLubricantName(e.target.value)}
                    placeholder="e.g. Mobil SHC 630 / Shell Omala S2 G 220"
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    {isRtl ? 'کارکرد روغن (ساعت کارکرد)' : 'Operating Hours (Hours in Service)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g. 2500"
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Elemental & Contamination Grid (Fe, Na, PQ, Cu, Pb in PPM) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {isRtl ? 'ماتریس عناصر فرسایشی و آلودگی (مقادیر بر حسب PPM)' : 'Elemental & Contamination Grid (PPM)'}
                  </h4>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    Fe • Na • PQ • Cu • Pb
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  <div className="text-center">
                    <label className="block text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mb-1">
                      آهن (Fe)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={elements.fe}
                      onChange={(e) => handleElementChange('fe', parseFloat(e.target.value))}
                      className="w-full text-center text-xs font-mono font-bold p-2 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mb-1">
                      سدیم (Na)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={elements.na}
                      onChange={(e) => handleElementChange('na', parseFloat(e.target.value))}
                      className="w-full text-center text-xs font-mono font-bold p-2 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mb-1">
                      شاخص (PQ)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={elements.pq}
                      onChange={(e) => handleElementChange('pq', parseFloat(e.target.value))}
                      className="w-full text-center text-xs font-mono font-bold p-2 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mb-1">
                      مس (Cu)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={elements.cu}
                      onChange={(e) => handleElementChange('cu', parseFloat(e.target.value))}
                      className="w-full text-center text-xs font-mono font-bold p-2 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-mono font-bold text-gray-700 dark:text-gray-300 mb-1">
                      سرب (Pb)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={elements.pb}
                      onChange={(e) => handleElementChange('pb', parseFloat(e.target.value))}
                      className="w-full text-center text-xs font-mono font-bold p-2 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Physical / Chemical Properties */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'ویسکوزیته @ 40°C (cSt)' : 'Viscosity @ 40°C (cSt)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={viscosity40}
                    onChange={(e) => setViscosity40(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'عدد اسیدی TAN (mg KOH/g)' : 'TAN (Total Acid No)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tan}
                    onChange={(e) => setTan(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'آب (PPM)' : 'Water Content (PPM)'}
                  </label>
                  <input
                    type="number"
                    value={waterPpm}
                    onChange={(e) => setWaterPpm(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'تمیزی ISO 4406' : 'ISO 4406 Cleanliness'}
                  </label>
                  <input
                    type="text"
                    value={isoCleanliness}
                    onChange={(e) => setIsoCleanliness(e.target.value)}
                    placeholder="18/16/13"
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                  />
                </div>
              </div>

              {/* Oil condition status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isRtl ? 'وضعیت سلامت کلی روغن' : 'Overall Oil Health Condition'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'normal', labelFa: 'نرمال (مناسب ادامه کار)', bg: 'hover:border-emerald-500' },
                    { val: 'warning', labelFa: 'هشدار (پایش کوتاه‌مدت)', bg: 'hover:border-amber-500' },
                    { val: 'critical', labelFa: 'بحرانی (تعویض فوری)', bg: 'hover:border-red-500' }
                  ].map(c => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setOilCondition(c.val as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        oilCondition === c.val
                          ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {c.labelFa}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF Attachment */}
              <PdfAttachmentUploader
                equipmentId={equipmentId}
                subDomain="oil_analysis"
                pdfUrl={pdfInfo.pdfUrl}
                pdfName={pdfInfo.pdfName}
                pdfSize={pdfInfo.pdfSize}
                onUploadSuccess={(info) => setPdfInfo(info)}
                onRemove={() => setPdfInfo({})}
                label={isRtl ? 'پیوست گواهی رسمی آزمایشگاه آنالیز روغن (PDF)' : 'Attach Official Oil Lab Certificate (PDF)'}
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'توصیه‌ها و نتیجه‌گیری آزمایشگاه' : 'Laboratory Conclusion & Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'افزایش ملایم آهن در اثر کارکرد طبیعی، فیلتراسیون در مدار پیشنهاد می‌شود...' : 'Normal wear pattern, check filtration...'}
                  className="w-full text-xs p-3 border rounded-xl bg-white dark:bg-gray-800"
                />
              </div>

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
                  className="px-6 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  {isRtl ? 'ثبت نتایج آنالیز روغن' : 'Save Oil Report'}
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
          subDomain="oil_analysis"
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
