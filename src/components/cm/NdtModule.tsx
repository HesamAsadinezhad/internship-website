import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserCheck,
  Eye,
  Sliders
} from 'lucide-react';
import { DualCalendarField } from '../DualCalendarModal';
import PdfAttachmentUploader from '../PdfAttachmentUploader';
import CmReportDetailModal from './CmReportDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import { NdtRecord, NdtMethod, NdtResult } from '../../types/conditionMonitoring';
import { getDualDateTimeFromDate } from '../../utils/jalali';

const NDT_METHODS: { id: NdtMethod; nameFa: string; nameEn: string }[] = [
  { id: 'MT', nameFa: 'MT - تست ذرات مغناطیسی (Magnetic Particle)', nameEn: 'MT - Magnetic Particle' },
  { id: 'PT', nameFa: 'PT - تست مایعات نافذ (Liquid Penetrant)', nameEn: 'PT - Liquid Penetrant' },
  { id: 'UT', nameFa: 'UT - تست فراصوت / التراسونیک (Ultrasonic)', nameEn: 'UT - Ultrasonic Testing' },
  { id: 'VT', nameFa: 'VT - بازرسی چشمی فنی (Visual Inspection)', nameEn: 'VT - Visual Testing' },
  { id: 'RT', nameFa: 'RT - رادیوگرافی صنعتی (Radiographic)', nameEn: 'RT - Radiography' },
  { id: 'ET', nameFa: 'ET - جریان‌های گردابی (Eddy Current)', nameEn: 'ET - Eddy Current' }
];

const COMPONENT_OPTIONS = [
  { id: 'grips', nameFa: 'کلمپ‌ها و گیره‌های کابل (Detachable/Fixed Grips)', nameEn: 'Cable Grips' },
  { id: 'hangers', nameFa: 'هنگرهای کابین (Cabin Hangers)', nameEn: 'Cabin Hangers' },
  { id: 'bullwheel_shaft', nameFa: 'شفت فلکه اصلی درایو و هرزگرد (Bullwheel Shaft)', nameEn: 'Bullwheel Shaft' },
  { id: 'tower_sheaves_axles', nameFa: 'محور رولیک‌ها و باتری دکل‌ها (Tower Sheave Axles)', nameEn: 'Tower Sheave Axles' },
  { id: 'structural_welds', nameFa: 'جوش‌های اسکلت فلزی و بازوهای دکل (Tower Structural Welds)', nameEn: 'Structural Welds' },
  { id: 'custom', nameFa: 'سایر / قطعه سفارشی (Other / Custom Component)', nameEn: 'Other / Custom Component' }
];

export default function NdtModule() {
  const { isRtl } = useLanguage();
  const [records, setRecords] = useState<NdtRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<NdtRecord | null>(null);

  // Form states
  const [componentName, setComponentName] = useState<string>('کلمپ‌ها و گیره‌های کابل (Grips)');
  const [customComponentName, setCustomComponentName] = useState<string>('کلمپ‌ها و گیره‌های کابل');
  const [equipmentId, setEquipmentId] = useState<string>('grips');
  const [method, setMethod] = useState<NdtMethod>('MT');
  const [standardApplied, setStandardApplied] = useState<string>('EN 1709 / ISO 9712 / EN 12927');
  const [inspector, setInspector] = useState<string>('مهندس کاظمی (مفتش NDT سطح ۲ مورد تأیید استاندارد)');
  const [inspectorLevel, setInspectorLevel] = useState<string>('Level II (ASNT / ISO 9712)');
  const [dualDate, setDualDate] = useState(() => getDualDateTimeFromDate());
  const [result, setResult] = useState<NdtResult>('PASS');
  const [defectDescription, setDefectDescription] = useState<string>('');
  const [pdfInfo, setPdfInfo] = useState<{ pdfUrl?: string; pdfName?: string; pdfSize?: number }>({});
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cm/ndt-tests', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to load NDT records:', err);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (res: NdtResult) => {
    switch (res) {
      case 'PASS':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          labelFa: 'تأیید و قابل قبول (Pass)',
          labelEn: 'Pass / Acceptable'
        };
      case 'REJECT':
        return {
          bg: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300',
          labelFa: 'مردود / عیب بحرانی (Reject)',
          labelEn: 'Reject / Defect Found'
        };
      case 'MONITOR':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300',
          labelFa: 'مشروط / تحت پایش (Monitor)',
          labelEn: 'Monitor / Conditional'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspector.trim()) {
      alert(isRtl ? 'نام متولی آزمون NDT الزامی است.' : 'Inspector is required.');
      return;
    }

    const compObj = COMPONENT_OPTIONS.find(c => c.id === equipmentId);
    const defaultName = isRtl ? (compObj?.nameFa || componentName) : (compObj?.nameEn || componentName);
    const finalComponentName = customComponentName.trim() || defaultName;

    const newRecord: Partial<NdtRecord> = {
      subDomain: 'ndt',
      equipmentId,
      equipmentName: finalComponentName,
      componentName: finalComponentName,
      customComponentName: finalComponentName,
      partName: finalComponentName,
      method,
      standardApplied,
      inspector,
      inspectorLevel,
      dateJalali: dualDate.dateJalali,
      dateGregorian: dualDate.dateGregorian,
      time: dualDate.time,
      result,
      defectDescription,
      reportPdfUrl: pdfInfo.pdfUrl,
      reportPdfName: pdfInfo.pdfName,
      reportPdfSize: pdfInfo.pdfSize,
      notes
    };

    try {
      const res = await fetch('/api/cm/ndt-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
        credentials: 'include'
      });

      if (res.ok) {
        await fetchRecords();
        setShowModal(false);
        setPdfInfo({});
        setDefectDescription('');
        setNotes('');
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت آزمون NDT');
      }
    } catch (err) {
      console.error('Error saving NDT record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? 'آیا از حذف این رکورد تست NDT مطمئن هستید؟' : 'Delete NDT record?')) return;
    try {
      const res = await fetch(`/api/cm/ndt-tests/${id}`, {
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
          <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
            <FileCheck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isRtl ? 'ماژول آزمون‌های غیرمخرب (NDT) قطعات حیاتی' : 'Non-Destructive Testing (NDT) Module'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRtl
                ? 'پایش ترک و عیوب ساختاری کلمپ‌ها، هنگرها، شفت فلکه و جوش‌های سازه با متدهای MT, PT, UT, VT, RT'
                : 'Crack & Defect inspections for Grips, Hangers, Shafts & Welds (MT, PT, UT, VT, RT, ET)'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus size={16} />
          <span>{isRtl ? 'ثبت گزارش تست NDT' : 'New NDT Inspection'}</span>
        </button>
      </div>

      {/* Method Quick Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {NDT_METHODS.map(m => {
          const count = records.filter(r => r.method === m.id).length;
          return (
            <div key={m.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="font-mono font-black text-sm text-cyan-700 dark:text-cyan-400">{m.id}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold">
                  {count}
                </span>
              </div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 truncate">
                {isRtl ? m.nameFa.split('(')[0] : m.nameEn}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-600" />
            <span>{isRtl ? 'سوابق بازرسی‌های غیرمخرب NDT' : 'NDT Inspection Records'}</span>
          </h3>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {records.length} {isRtl ? 'آزمون' : 'tests'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {isRtl ? 'هنوز بازرسی NDT ثبت نشده است.' : 'No NDT records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'قطعه بازرسی شده' : 'Component'}</th>
                  <th className="py-3 px-4">{isRtl ? 'روش تست (Method)' : 'Method'}</th>
                  <th className="py-3 px-4">{isRtl ? 'استاندارد مرجع' : 'Standard'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متولی بازرسی / گواهینامه' : 'Inspector / Cert'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاریخ و زمان' : 'Date & Time'}</th>
                  <th className="py-3 px-4">{isRtl ? 'نتیجه آزمون' : 'Test Result'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گزارش PDF' : 'PDF'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(r => {
                  const resBadge = getResultBadge(r.result);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {r.customComponentName || r.componentName || r.equipmentName}
                        </div>
                        {r.defectDescription ? (
                          <div className="text-[11px] text-red-600 dark:text-red-400">{r.defectDescription}</div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300">
                          {r.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-[11px]">
                        {r.standardApplied || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-cyan-500 shrink-0" />
                          <span>{r.inspector}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{r.inspectorLevel}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                        <div>{r.dateJalali}</div>
                        <div className="text-[10px] text-gray-400">({r.dateGregorian})</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${resBadge.bg}`}>
                          {isRtl ? resBadge.labelFa : resBadge.labelEn}
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700">
                  <FileCheck size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? 'ثبت بازرسی و آزمون غیرمخرب NDT' : 'Log NDT Inspection'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'دسته‌بندی قطعه تحت آزمون' : 'Target Component Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={equipmentId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setEquipmentId(newId);
                      const opt = COMPONENT_OPTIONS.find(c => c.id === newId);
                      if (opt) {
                        setComponentName(isRtl ? opt.nameFa : opt.nameEn);
                        if (newId !== 'custom') {
                          setCustomComponentName(isRtl ? opt.nameFa.split('(')[0].trim() : opt.nameEn);
                        } else {
                          setCustomComponentName('');
                        }
                      }
                    }}
                    className="w-full text-xs font-medium px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  >
                    {COMPONENT_OPTIONS.map(c => (
                      <option key={c.id} value={c.id}>{isRtl ? c.nameFa : c.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'نام اختصاصی / سفارشی قطعه' : 'Custom Component Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customComponentName}
                    onChange={(e) => setCustomComponentName(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: کلمپ کابین شماره ۴' : 'e.g. Cabin 4 Grip Assembly'}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'روش تست غیرمخرب (NDT Method)' : 'NDT Method'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full text-xs font-bold px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 font-mono"
                  >
                    {NDT_METHODS.map(m => (
                      <option key={m.id} value={m.id}>{isRtl ? m.nameFa : m.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inspector & Certification Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'متولی انجام تست (نام مفتش)' : 'Inspector Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'سطح گواهینامه بازرس (Cert Level)' : 'Certification Level'}
                  </label>
                  <input
                    type="text"
                    value={inspectorLevel}
                    onChange={(e) => setInspectorLevel(e.target.value)}
                    placeholder="e.g. Level II ISO 9712 / ASNT"
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 font-mono"
                  />
                </div>
              </div>

              {/* Dual Calendar */}
              <DualCalendarField
                label={isRtl ? 'تاریخ و زمان بازرسی NDT' : 'Inspection Date & Time'}
                dateJalali={dualDate.dateJalali}
                dateGregorian={dualDate.dateGregorian}
                time={dualDate.time}
                onChange={(val) => setDualDate(val)}
                required
              />

              {/* Standard Applied & Result */}
              <div className="bg-cyan-50/50 dark:bg-cyan-950/20 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/40 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'استاندارد مرجع و ملاک پذیرش' : 'Standard & Acceptance Criteria'}
                  </label>
                  <input
                    type="text"
                    value={standardApplied}
                    onChange={(e) => setStandardApplied(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'نتیجه نهایی ارزیابی آزمون' : 'Evaluation Result'} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'PASS', labelFa: 'تأیید و قابل قبول (Pass)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                      { val: 'MONITOR', labelFa: 'مشروط / تحت پایش (Monitor)', color: 'text-amber-700 bg-amber-50 border-amber-300' },
                      { val: 'REJECT', labelFa: 'مردود / عیب بحرانی (Reject)', color: 'text-red-700 bg-red-50 border-red-300' }
                    ].map(btn => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setResult(btn.val as any)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          result === btn.val
                            ? `${btn.color} ring-2 ring-blue-500`
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {btn.labelFa}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Defect Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'تشریح عیب (در صورت وجود نشانگر یا ترک)' : 'Defect Description (if any indication found)'}
                </label>
                <input
                  type="text"
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  placeholder={isRtl ? 'عدم وجود هیچ‌گونه نشانه خطی یا ترک خستگی' : 'No linear indication or fatigue crack observed'}
                  className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                />
              </div>

              {/* PDF Attachment */}
              <PdfAttachmentUploader
                equipmentId={equipmentId}
                subDomain="ndt"
                pdfUrl={pdfInfo.pdfUrl}
                pdfName={pdfInfo.pdfName}
                pdfSize={pdfInfo.pdfSize}
                onUploadSuccess={(info) => setPdfInfo(info)}
                onRemove={() => setPdfInfo({})}
                label={isRtl ? 'پیوست گواهینامه رسمی گزارش NDT (PDF)' : 'Attach Official NDT Certificate (PDF)'}
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
                  className="px-6 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs"
                >
                  {isRtl ? 'ثبت بازرسی NDT' : 'Save NDT Record'}
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
          subDomain="ndt"
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
