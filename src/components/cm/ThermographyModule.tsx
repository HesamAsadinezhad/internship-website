import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Layers,
  Thermometer,
  ShieldCheck,
  UserCheck,
  Eye
} from 'lucide-react';
import { DualCalendarField } from '../DualCalendarModal';
import PdfAttachmentUploader from '../PdfAttachmentUploader';
import CmReportDetailModal from './CmReportDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import { ThermographyRecord, ThermographyComponent } from '../../types/conditionMonitoring';
import { getDualDateTimeFromDate } from '../../utils/jalali';

const TARGET_COMPONENTS = [
  { id: 'PLC Electrical Panel', nameFa: 'تابلو برق PLC (PLC Electrical Panel)', nameEn: 'PLC Electrical Panel' },
  { id: 'Drive Electrical Panel', nameFa: 'تابلو برق DRIVE (Drive Electrical Panel)', nameEn: 'Drive Electrical Panel' },
  { id: 'Rubber Liners / Sheave Liners', nameFa: 'لاینر رابر فلکه و دکل‌ها (Rubber Liners)', nameEn: 'Rubber Liners / Sheave Liners' },
  { id: 'Power Transformer', nameFa: 'ترانسفورماتور قدرت اصلی (Power Transformer)', nameEn: 'Main Power Transformer' },
  { id: 'Main Cable Termination', nameFa: 'سرکابل و باسبار قدرت (Cable Termination / Busbar)', nameEn: 'Busbar & Cable Termination' },
  { id: 'custom', nameFa: 'سایر / قطعه سفارشی (Other / Custom Component)', nameEn: 'Other / Custom Component' }
];

export default function ThermographyModule() {
  const { isRtl } = useLanguage();
  const [records, setRecords] = useState<ThermographyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<ThermographyRecord | null>(null);

  // Form states
  const [equipmentId, setEquipmentId] = useState<string>('elec-substation-1');
  const [equipmentName, setEquipmentName] = useState<string>('پست برق و درایو ایستگاه ۱');
  const [targetComponent, setTargetComponent] = useState<string>('PLC Electrical Panel');
  const [customComponentName, setCustomComponentName] = useState<string>('تابلو برق PLC');
  const [inspector, setInspector] = useState<string>('مهندس احمدی (کارشناس ترموگرافی سطح II)');
  const [dualDate, setDualDate] = useState(() => getDualDateTimeFromDate());
  const [maxTemp, setMaxTemp] = useState<number>(48.5);
  const [ambientTemp, setAmbientTemp] = useState<number>(24.0);
  const [hotspotLocation, setHotspotLocation] = useState<string>('ترمینال فیوز محافظ فیدر شماره ۳');
  const [operatingLoad, setOperatingLoad] = useState<string>('85% بار نامی (180 آمپر)');
  const [thermalImageUrl, setThermalImageUrl] = useState<string>('');
  const [pdfInfo, setPdfInfo] = useState<{ pdfUrl?: string; pdfName?: string; pdfSize?: number }>({});
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cm/thermographies', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to load thermography logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const deltaT = Number((maxTemp - ambientTemp).toFixed(1));

  const getSeverity = (dT: number): 'normal' | 'warning' | 'critical' => {
    if (dT >= 25) return 'critical';
    if (dT >= 10) return 'warning';
    return 'normal';
  };

  const severity = getSeverity(deltaT);

  const getSeverityBadge = (sev: 'normal' | 'warning' | 'critical') => {
    switch (sev) {
      case 'normal':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300',
          label: isRtl ? 'عادی (ΔT < 10°C)' : 'Normal (ΔT < 10°C)'
        };
      case 'warning':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300',
          label: isRtl ? 'هشدار (10°C ≤ ΔT ≤ 25°C)' : 'Warning (10°C ≤ ΔT ≤ 25°C)'
        };
      case 'critical':
        return {
          bg: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300',
          label: isRtl ? 'بحرانی (ΔT > 25°C)' : 'Critical (ΔT > 25°C)'
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspector.trim()) {
      alert(isRtl ? 'نام متولی بازرسی الزامی است.' : 'Inspector is required.');
      return;
    }

    const compObj = TARGET_COMPONENTS.find(c => c.id === targetComponent);
    const defaultName = isRtl ? (compObj?.nameFa || targetComponent) : (compObj?.nameEn || targetComponent);
    const finalComponentName = customComponentName.trim() || defaultName;

    const newRecord: Partial<ThermographyRecord> = {
      subDomain: 'thermography',
      equipmentId: targetComponent,
      equipmentName: finalComponentName,
      targetComponent: finalComponentName as any,
      customComponentName: finalComponentName,
      partName: finalComponentName,
      inspector,
      dateJalali: dualDate.dateJalali,
      dateGregorian: dualDate.dateGregorian,
      time: dualDate.time,
      maxTemperature: maxTemp,
      ambientTemperature: ambientTemp,
      deltaT,
      hotspotLocation,
      operatingLoad,
      thermalImageUrl,
      reportPdfUrl: pdfInfo.pdfUrl,
      reportPdfName: pdfInfo.pdfName,
      reportPdfSize: pdfInfo.pdfSize,
      severity,
      notes
    };

    try {
      const res = await fetch('/api/cm/thermographies', {
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
        alert(data.error || 'خطا در ثبت اطلاعات ترموگرافی');
      }
    } catch (err) {
      console.error('Error saving thermography record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRtl ? 'آیا از حذف این گزارش ترموگرافی اطمینان دارید؟' : 'Delete this thermography record?')) return;
    try {
      const res = await fetch(`/api/cm/thermographies/${id}`, {
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
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
            <Flame size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isRtl ? 'ماژول تصویربرداری حرارتی و ترموگرافی' : 'Thermography (Thermal Imaging) Module'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRtl
                ? 'پایش دمایی تابلوهای برق PLC، تابلوهای درایو و لاینرهای رابر فلکه | محاسبه اختلاف دما (ΔT)'
                : 'Thermal scanning of PLC Panels, Drive Panels, Rubber Liners | Real-time Delta T (ΔT) evaluation'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus size={16} />
          <span>{isRtl ? 'ثبت بازرسی ترموگرافی' : 'New Thermal Scan'}</span>
        </button>
      </div>

      {/* Target Component Quick Select Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'PLC Electrical Panel', labelFa: 'تابلو برق PLC', count: records.filter(r => r.targetComponent.includes('PLC')).length },
          { key: 'Drive Electrical Panel', labelFa: 'تابلو برق درایو اصلی', count: records.filter(r => r.targetComponent.includes('Drive')).length },
          { key: 'Rubber Liners / Sheave Liners', labelFa: 'لاینرهای رابر فلکه‌ها', count: records.filter(r => r.targetComponent.includes('Rubber')).length }
        ].map((item) => (
          <div key={item.key} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {isRtl ? item.labelFa : item.key}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                {item.count} {isRtl ? 'بازرسی' : 'scans'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {isRtl ? 'پایش نقاط داغ، اضافه بار اتصالات و سایش حرارتی' : 'Hotspot & terminal overheating surveillance'}
            </p>
          </div>
        ))}
      </div>

      {/* Historical List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Thermometer size={16} className="text-orange-600" />
            <span>{isRtl ? 'تاریخچه رکوردهای ترموگرافی' : 'Thermography Scan Records'}</span>
          </h3>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {records.length} {isRtl ? 'رکورد' : 'records'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {isRtl ? 'هنوز رکوردی در بخش ترموگرافی ثبت نشده است.' : 'No thermography scans recorded.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">{isRtl ? 'قطعه / تابلو' : 'Component / Panel'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متولی انجام' : 'Inspector'}</th>
                  <th className="py-3 px-4">{isRtl ? 'تاریخ و ساعت' : 'Date & Time'}</th>
                  <th className="py-3 px-4">{isRtl ? 'حداکثر دما (°C)' : 'Max Temp'}</th>
                  <th className="py-3 px-4">{isRtl ? 'دمای محیط' : 'Ambient'}</th>
                  <th className="py-3 px-4">{isRtl ? 'اختلاف دما (ΔT)' : 'Delta T (ΔT)'}</th>
                  <th className="py-3 px-4">{isRtl ? 'سطح بحرانی' : 'Severity'}</th>
                  <th className="py-3 px-4">{isRtl ? 'بار کاری' : 'Load'}</th>
                  <th className="py-3 px-4">{isRtl ? 'گزارش PDF' : 'PDF'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(r => {
                  const sBadge = getSeverityBadge(r.severity);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {r.customComponentName || r.targetComponent}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {r.hotspotLocation ? `${r.hotspotLocation}` : (r.equipmentName && r.equipmentName !== r.customComponentName ? r.equipmentName : '')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-orange-500 shrink-0" />
                          <span>{r.inspector}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-mono">
                        <div>{r.dateJalali} {r.time}</div>
                        <div className="text-[10px] text-gray-400">({r.dateGregorian})</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-red-600">
                        {r.maxTemperature}°C
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {r.ambientTemperature}°C
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        +{r.deltaT}°C
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sBadge.bg}`}>
                          {sBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-[11px]">
                        {r.operatingLoad || '-'}
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

      {/* CREATE THERMAL SCAN MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                  <Flame size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {isRtl ? 'ثبت بازرسی و اسکن حرارتی جدید' : 'New Thermal Scan Entry'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Target Component Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'دسته‌بندی تجهیز / قطعه' : 'Target Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetComponent}
                    onChange={(e) => {
                      const newComp = e.target.value;
                      setTargetComponent(newComp);
                      const c = TARGET_COMPONENTS.find(item => item.id === newComp);
                      if (c) {
                        if (newComp !== 'custom') {
                          setCustomComponentName(isRtl ? c.nameFa.split('(')[0].trim() : c.nameEn);
                        } else {
                          setCustomComponentName('');
                        }
                      }
                    }}
                    className="w-full text-xs font-medium px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                  >
                    {TARGET_COMPONENTS.map(c => (
                      <option key={c.id} value={c.id}>
                        {isRtl ? c.nameFa : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Component Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'نام اختصاصی / سفارشی قطعه یا تابلو' : 'Custom Component / Panel Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customComponentName}
                    onChange={(e) => setCustomComponentName(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: تابلو برق PLC درایو اصلی' : 'e.g. Main Drive PLC Panel'}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Inspector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isRtl ? 'متولی انجام تست (کارشناس)' : 'Inspector'} <span className="text-red-500">*</span>
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

              {/* Dual Calendar Field */}
              <DualCalendarField
                label={isRtl ? 'تاریخ و زمان اسکن حرارتی (شمسی / میلادی)' : 'Scan Date & Time'}
                dateJalali={dualDate.dateJalali}
                dateGregorian={dualDate.dateGregorian}
                time={dualDate.time}
                onChange={(val) => setDualDate(val)}
                required
              />

              {/* Temperatures & Delta T */}
              <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-200 dark:border-orange-900/40 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      {isRtl ? 'دمای نقطه داغ (°C)' : 'Max Hotspot (°C)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={maxTemp}
                      onChange={(e) => setMaxTemp(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono font-bold text-red-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      {isRtl ? 'دمای محیط (°C)' : 'Ambient (°C)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={ambientTemp}
                      onChange={(e) => setAmbientTemp(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                      {isRtl ? 'اختلاف دما (ΔT)' : 'Delta T (ΔT)'}
                    </label>
                    <div className="px-3 py-1.5 border border-orange-300 dark:border-orange-800 rounded-lg bg-white dark:bg-gray-800 font-mono font-bold text-orange-600">
                      +{deltaT} °C
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {isRtl ? 'وضعیت ارزیابی حرارتی:' : 'Evaluation Status:'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${getSeverityBadge(severity).bg}`}>
                    {getSeverityBadge(severity).label}
                  </span>
                </div>
              </div>

              {/* Hotspot location & Operating Load */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'محل دقیق نقطه داغ' : 'Hotspot Precise Location'}
                  </label>
                  <input
                    type="text"
                    value={hotspotLocation}
                    onChange={(e) => setHotspotLocation(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: ترمینال ورودی فیوز فاز L2' : 'e.g. Phase L2 input terminal'}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'میزان بار هنگام تست' : 'Operating Load during test'}
                  </label>
                  <input
                    type="text"
                    value={operatingLoad}
                    onChange={(e) => setOperatingLoad(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: 80% بار نامی، 160 آمپر' : 'e.g. 80% nominal, 160A'}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* PDF Uploader */}
              <PdfAttachmentUploader
                equipmentId={equipmentId}
                subDomain="thermography"
                pdfUrl={pdfInfo.pdfUrl}
                pdfName={pdfInfo.pdfName}
                pdfSize={pdfInfo.pdfSize}
                onUploadSuccess={(info) => setPdfInfo(info)}
                onRemove={() => setPdfInfo({})}
                label={isRtl ? 'پیوست گزارش رسمی ترموگرافی (PDF)' : 'Attach Thermography Certificate / Report (PDF)'}
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'توضیحات و اقدامات اصلاحی' : 'Notes & Corrective Actions'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'آچارکشی ترمینال، تمیزکاری غبار، تعویض رابر...' : 'Terminal retightening, liner replacement...'}
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
                  className="px-6 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl"
                >
                  {isRtl ? 'ثبت اسکن ترموگرافی' : 'Save Thermal Scan'}
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
          subDomain="thermography"
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
