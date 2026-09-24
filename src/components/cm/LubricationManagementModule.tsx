import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  UserCheck,
  Droplets,
  RotateCw,
  Eye
} from 'lucide-react';
import { DualCalendarField } from '../DualCalendarModal';
import PdfAttachmentUploader from '../PdfAttachmentUploader';
import CmReportDetailModal from './CmReportDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import { LubricationRecord } from '../../types/conditionMonitoring';
import { getDualDateTimeFromDate } from '../../utils/jalali';

const FOUR_KEY_EQUIPMENTS = [
  { id: 'motor', nameFa: 'الکتروموتور اصلی (Main Motor)', nameEn: 'Main Motor', defaultLube: 'Kluberquiet BQ 72-72', defaultType: 'grease' },
  { id: 'gearbox', nameFa: 'گیربکس اصلی (Main Gearbox)', nameEn: 'Main Gearbox', defaultLube: 'Mobil SHC 630 (VG 220)', defaultType: 'oil' },
  { id: 'diesel_generator', nameFa: 'دیزل ژنراتور اضطراری (Diesel Generator)', nameEn: 'Emergency Diesel Generator', defaultLube: 'Mobil Delvac 15W-40', defaultType: 'oil' },
  { id: 'return_wheel', nameFa: 'فلکه هرزگرد / چرخ برگشت (Return Sheave)', nameEn: 'Return Sheave / Bullwheel', defaultLube: 'Mobilgrease 28 (Synthetic)', defaultType: 'grease' },
  { id: 'custom', nameFa: 'سایر / قطعه سفارشی (Other / Custom Component)', nameEn: 'Other / Custom Component', defaultLube: 'روغن / گریس صنعتی', defaultType: 'grease' }
];

export default function LubricationManagementModule() {
  const { isRtl } = useLanguage();
  const [records, setRecords] = useState<LubricationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<LubricationRecord | null>(null);

  // Form states
  const [targetEquipment, setTargetEquipment] = useState<string>('motor');
  const [customComponentName, setCustomComponentName] = useState<string>('الکتروموتور اصلی');
  const [lubricantType, setLubricantType] = useState<'grease' | 'oil'>('grease');
  const [lubricantName, setLubricantName] = useState<string>('Kluberquiet BQ 72-72');
  const [quantity, setQuantity] = useState<number>(45);
  const [quantityUnit, setQuantityUnit] = useState<string>('گرم (g)');
  const [method, setMethod] = useState<'grease_gun' | 'auto_dispenser' | 'drain_refill' | 'top_up'>('grease_gun');
  const [inspector, setInspector] = useState<string>('تیم نگهداری و روانکاری مکانیک');
  const [dualDate, setDualDate] = useState(() => getDualDateTimeFromDate());
  const [nextScheduledDate, setNextScheduledDate] = useState<string>('1404/02/15');
  const [intervalHours, setIntervalHours] = useState<number>(500);
  const [pdfInfo, setPdfInfo] = useState<{ pdfUrl?: string; pdfName?: string; pdfSize?: number }>({});
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cm/lubrications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to load lubrication logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentChange = (eqId: any) => {
    setTargetEquipment(eqId);
    const eq = FOUR_KEY_EQUIPMENTS.find(e => e.id === eqId);
    if (eq) {
      if (eqId !== 'custom') {
        setCustomComponentName(isRtl ? eq.nameFa.split('(')[0].trim() : eq.nameEn);
      } else {
        setCustomComponentName('');
      }
      setLubricantName(eq.defaultLube);
      setLubricantType(eq.defaultType as any);
      setQuantityUnit(eq.defaultType === 'oil' ? 'لیتر (L)' : 'گرم (g)');
      setMethod(eq.defaultType === 'oil' ? 'top_up' : 'grease_gun');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspector.trim()) {
      alert(isRtl ? 'نام متولی روانکاری الزامی است.' : 'Responsible authority is required.');
      return;
    }

    const eqObj = FOUR_KEY_EQUIPMENTS.find(eq => eq.id === targetEquipment);
    const defaultName = isRtl ? (eqObj?.nameFa || targetEquipment) : (eqObj?.nameEn || targetEquipment);
    const finalComponentName = customComponentName.trim() || defaultName;

    const newRecord: Partial<LubricationRecord> = {
      subDomain: 'lubrication',
      targetEquipment,
      equipmentId: targetEquipment,
      equipmentName: finalComponentName,
      customComponentName: finalComponentName,
      partName: finalComponentName,
      lubricantType,
      lubricantName,
      quantity,
      quantityUnit,
      method,
      inspector,
      dateJalali: dualDate.dateJalali,
      dateGregorian: dualDate.dateGregorian,
      time: dualDate.time,
      nextScheduledDate,
      intervalHours,
      reportPdfUrl: pdfInfo.pdfUrl,
      reportPdfName: pdfInfo.pdfName,
      reportPdfSize: pdfInfo.pdfSize,
      notes
    };

    try {
      const res = await fetch('/api/cm/lubrications', {
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
        alert(data.error || 'خطا در ثبت اطلاعات روانکاری');
      }
    } catch (err) {
      console.error('Error saving lubrication record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? 'آیا از حذف این رکورد روانکاری اطمینان دارید؟' : 'Delete lubrication record?')) return;
    try {
      const res = await fetch(`/api/cm/lubrications/${id}`, {
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
          <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
            <Wrench size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isRtl ? 'ماژول پایش و ثبت روانکاری ۴ تجهیز کلیدی' : 'Lubrication Management Module (4 Key Assets)'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRtl
                ? 'پایش مداوم روانکاری موتور، گیربکس، دیزل ژنراتور و چرخ برگشت | تعیین دوره‌ها و مقادیر تزریق'
                : 'Dedicated tracking for Motor, Gearbox, Diesel Gen & Bullwheel | Intervals & Specs'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus size={16} />
          <span>{isRtl ? 'ثبت روانکاری جدید' : 'Log Lubrication Task'}</span>
        </button>
      </div>

      {/* 4-Equipment Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FOUR_KEY_EQUIPMENTS.map(eq => {
          const latest = records.find(r => r.targetEquipment === eq.id);
          return (
            <div key={eq.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? eq.nameFa.split('(')[0] : eq.nameEn}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold border border-teal-200">
                  {eq.defaultType === 'oil' ? (isRtl ? 'روغن' : 'Oil') : (isRtl ? 'گریس' : 'Grease')}
                </span>
              </div>

              {latest ? (
                <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>{isRtl ? 'آخرین روانکاری:' : 'Last Done:'}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{latest.dateJalali}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isRtl ? 'مواد مصرفی:' : 'Lube:'}</span>
                    <span className="truncate max-w-[120px] font-medium text-teal-600">{latest.lubricantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isRtl ? 'مقدار تزریق:' : 'Qty:'}</span>
                    <span className="font-mono font-bold">{latest.quantity} {latest.quantityUnit}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-700 text-gray-500">
                    <span>{isRtl ? 'موعد بعدی:' : 'Next Due:'}</span>
                    <span className="font-bold text-blue-600">{latest.nextScheduledDate || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 italic py-2">
                  {isRtl ? 'روانکاری اخیر ثبت نشده' : 'No records yet'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Droplets size={16} className="text-teal-600" />
            <span>{isRtl ? 'تاریخچه عملیات روانکاری ۴ تجهیز' : 'Lubrication Service Records'}</span>
          </h3>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {records.length} {isRtl ? 'رکورد' : 'records'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {isRtl ? 'هنوز داده‌ای در بخش روانکاری ثبت نشده است.' : 'No lubrication logs found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'تجهیز هدف' : 'Target Asset'}</th>
                  <th className="py-3 px-4">{isRtl ? 'ماده روانکار' : 'Lubricant'}</th>
                  <th className="py-3 px-4">{isRtl ? 'مقدار / روش' : 'Qty & Method'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متولی انجام' : 'Inspector / Tech'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاریخ اجرا' : 'Date Done'}</th>
                  <th className="py-3 px-4">{isRtl ? 'موعد بعدی روانکاری' : 'Next Due'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گواهی PDF' : 'PDF'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(r => (
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
                      <div className="font-semibold text-teal-700 dark:text-teal-300">{r.lubricantName}</div>
                      <div className="text-[10px] text-gray-400">
                        {r.lubricantType === 'oil' ? 'Oil / روغن صنعتی' : 'Grease / گریس تخصصی'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold">{r.quantity} {r.quantityUnit}</div>
                      <div className="text-[10px] text-gray-500 font-sans">{r.method}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-teal-500 shrink-0" />
                        <span>{r.inspector}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                      <div>{r.dateJalali}</div>
                      <div className="text-[10px] text-gray-400">({r.dateGregorian})</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {r.nextScheduledDate || '-'}
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
                ))}
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
                <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
                  <Wrench size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? 'ثبت روانکاری یکی از ۴ تجهیز کلیدی' : 'Log Lubrication for Key Equipment'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 4-Equipment selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'دسته‌بندی تجهیز هدف' : 'Target Asset Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetEquipment}
                    onChange={(e) => handleEquipmentChange(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  >
                    {FOUR_KEY_EQUIPMENTS.map(eq => (
                      <option key={eq.id} value={eq.id}>{isRtl ? eq.nameFa : eq.nameEn}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Component Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'نام اختصاصی / سفارشی قطعه' : 'Custom Component / Part Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customComponentName}
                    onChange={(e) => setCustomComponentName(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: یاتاقان هوزینگ شفت خروجی' : 'e.g. Output Shaft Housing Bearing'}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Inspector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'متولی انجام روانکاری' : 'Responsible Authority'} <span className="text-red-500">*</span>
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
                label={isRtl ? 'تاریخ و ساعت روانکاری' : 'Lubrication Date & Time'}
                dateJalali={dualDate.dateJalali}
                dateGregorian={dualDate.dateGregorian}
                time={dualDate.time}
                onChange={(val) => setDualDate(val)}
                required
              />

              {/* Lube Specifications */}
              <div className="bg-teal-50/50 dark:bg-teal-950/20 p-4 rounded-xl border border-teal-200 dark:border-teal-900/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isRtl ? 'نام روانکار' : 'Lubricant Name'}
                    </label>
                    <input
                      type="text"
                      value={lubricantName}
                      onChange={(e) => setLubricantName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isRtl ? 'مقدار مصرفی' : 'Quantity'}
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className="w-2/3 text-xs px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                      />
                      <input
                        type="text"
                        value={quantityUnit}
                        onChange={(e) => setQuantityUnit(e.target.value)}
                        className="w-1/3 text-xs px-1.5 py-1.5 border rounded-lg bg-white dark:bg-gray-800 text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isRtl ? 'روش انجام' : 'Method'}
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as any)}
                      className="w-full text-xs px-2 py-1.5 border rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="grease_gun">{isRtl ? 'گریس‌پمپ دستی' : 'Manual Grease Gun'}</option>
                      <option value="auto_dispenser">{isRtl ? 'کارتریج اتوماتیک' : 'Auto Dispenser'}</option>
                      <option value="drain_refill">{isRtl ? 'تخلیه و تعویض کامل' : 'Drain & Refill'}</option>
                      <option value="top_up">{isRtl ? 'سرریز روغن' : 'Top Up'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-teal-200 dark:border-teal-900/40">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isRtl ? 'موعد بعدی روانکاری (شمسی)' : 'Next Scheduled Date (Jalali)'}
                    </label>
                    <input
                      type="text"
                      value={nextScheduledDate}
                      onChange={(e) => setNextScheduledDate(e.target.value)}
                      placeholder="1404/02/15"
                      className="w-full text-xs font-mono px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isRtl ? 'دوره تناوب (ساعت کارکرد)' : 'Interval (Hours)'}
                    </label>
                    <input
                      type="number"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-mono px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* PDF Attachment */}
              <PdfAttachmentUploader
                equipmentId={targetEquipment}
                subDomain="lubrication"
                pdfUrl={pdfInfo.pdfUrl}
                pdfName={pdfInfo.pdfName}
                pdfSize={pdfInfo.pdfSize}
                onUploadSuccess={(info) => setPdfInfo(info)}
                onRemove={() => setPdfInfo({})}
                label={isRtl ? 'پیوست چک‌لیست یا فرم رسمی روانکاری (PDF)' : 'Attach Lubrication Checklist (PDF)'}
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'ملاحظات تکمیلی' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'خروج گریس کهنه تیره، عدم نشتی پکینگ...' : 'Old grease expelled cleanly...'}
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
                  className="px-6 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
                >
                  {isRtl ? 'ثبت روانکاری' : 'Save Lubrication Record'}
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
          subDomain="lubrication"
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
