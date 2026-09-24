import React, { useState, useEffect } from 'react';
import { Droplet, Calendar, CheckCircle, AlertTriangle, Clock, Plus, Trash2, Edit2, ShieldAlert, RefreshCw } from 'lucide-react';
import { LubricationRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const FOUR_KEY_EQUIPMENT_INFO = [
  { 
    id: 'motor', 
    nameFa: 'الکتروموتور اصلی', 
    nameEn: 'Main Electric Motor', 
    lubeFa: 'گریس نسوز بر پایه لیتیم کمپلکس (NLGI 2/3)', 
    lubeEn: 'Lithium Complex Grease (NLGI 2/3)',
    pointsFa: 'یاتاقان‌های سمت محرک (DE) و غیرمحرک (NDE)',
    pointsEn: 'DE & NDE Bearings',
    interval: 90
  },
  { 
    id: 'gearbox', 
    nameFa: 'گیربکس صنعتی اصلی', 
    nameEn: 'Main Industrial Gearbox', 
    lubeFa: 'روغن دنده صنعتی ISO VG 220 / 320 (EP)', 
    lubeEn: 'Industrial Gear Oil ISO VG 220/320 (EP)',
    pointsFa: 'مخزن روغن کارتر و یاتاقان‌های پینیون',
    pointsEn: 'Sump tank & Pinion Bearings',
    interval: 180
  },
  { 
    id: 'diesel', 
    nameFa: 'دیزل ژنراتور اضطراری', 
    nameEn: 'Emergency Diesel Generator', 
    lubeFa: 'روغن موتور دیزلی 15W-40 CI-4 / CK-4', 
    lubeEn: 'Heavy Duty Diesel Oil 15W-40',
    pointsFa: 'کارتر روغن موتور و پمپ انژکتور',
    pointsEn: 'Engine Crankcase & Injector Pump',
    interval: 120
  },
  { 
    id: 'return_wheel', 
    nameFa: 'فلکه هرزگرد / چرخ بازگشت', 
    nameEn: 'Return Wheel / Bullwheel', 
    lubeFa: 'گریس فشارپذیر کلسیم سولفونات یا لیتیم EP2', 
    lubeEn: 'Heavy Duty Calcium/Lithium EP2 Grease',
    pointsFa: 'شفت مرکزی و رولربیرینگ‌های کروی فلکه بازگشت',
    pointsEn: 'Central Shaft & Spherical Roller Bearings',
    interval: 60
  }
];

export default function LubricationMonitoringPanel() {
  const { user } = useAuth();
  const { isRtl, language } = useLanguage();
  const { toast } = useToast();

  const [records, setRecords] = useState<LubricationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEq, setSelectedEq] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LubricationRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<LubricationRecord>>({
    equipmentName: FOUR_KEY_EQUIPMENT_INFO[0].nameFa,
    lubricantType: FOUR_KEY_EQUIPMENT_INFO[0].lubeFa,
    lubricantPoints: FOUR_KEY_EQUIPMENT_INFO[0].pointsFa,
    method: 'manual',
    quantity: '100g',
    lastDate: new Date().toISOString().split('T')[0],
    nextDueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    status: 'normal',
    technician: user?.name || '',
    operatingHours: 1250,
    notes: ''
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lubrication');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecords(data);
        }
      }
    } catch (err) {
      console.error('Error loading lubrication records', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleEquipmentChangeInForm = (eqName: string) => {
    const found = FOUR_KEY_EQUIPMENT_INFO.find(e => e.nameFa === eqName || e.nameEn === eqName);
    if (found) {
      const defaultInterval = found.interval;
      const today = new Date();
      const nextDue = new Date(today.getTime() + defaultInterval * 86400000);
      setFormData({
        ...formData,
        equipmentName: isRtl ? found.nameFa : found.nameEn,
        lubricantType: isRtl ? found.lubeFa : found.lubeEn,
        lubricantPoints: isRtl ? found.pointsFa : found.pointsEn,
        nextDueDate: nextDue.toISOString().split('T')[0]
      });
    } else {
      setFormData({ ...formData, equipmentName: eqName });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(formData.id);
      const url = isEdit ? `/api/lubrication/${formData.id}` : '/api/lubrication';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          technician: formData.technician || user?.name || 'تکنسین'
        })
      });

      if (res.ok) {
        toast(
          isRtl ? 'اطلاعات روانکاری با موفقیت ذخیره شد' : 'Lubrication record saved successfully',
          'success'
        );
        setIsModalOpen(false);
        fetchRecords();
      } else {
        toast(isRtl ? 'خطا در ثبت روانکاری' : 'Error saving lubrication record', 'error');
      }
    } catch (err) {
      toast(isRtl ? 'خطا در برقراری ارتباط با سرور' : 'Server connection error', 'error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/lubrication/${itemToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast(isRtl ? 'رکورد روانکاری حذف شد' : 'Record deleted', 'info');
        setItemToDelete(null);
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRecords = selectedEq === 'all'
    ? records
    : records.filter(r => {
        const found = FOUR_KEY_EQUIPMENT_INFO.find(e => e.id === selectedEq);
        if (!found) return true;
        return r.equipmentName.includes(found.nameFa) || r.equipmentName.includes(found.nameEn);
      });

  const getDaysRemaining = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / 86400000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & 4 Equipments Overview Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Droplet className="text-amber-500 fill-amber-500/20" size={24} />
            <span>
              {isRtl
                ? 'پایش و مدیریت روانکاری ۴ تجهیز کلیدی'
                : 'Lubrication Date & Monitoring (4 Key Assets)'}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isRtl
              ? 'ردیابی تاریخ‌های روانکاری، موعد سررسید، نوع روغن و گریس برای موتور، گیربکس، دیزل ژنراتور و فلکه هرزگرد'
              : 'Tracking lubrication schedules, due dates, and lubricant specifications for Motor, Gearbox, Diesel Generator, and Return Wheel'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
            title={isRtl ? 'بروزرسانی' : 'Refresh'}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => {
              setFormData({
                equipmentName: isRtl ? FOUR_KEY_EQUIPMENT_INFO[0].nameFa : FOUR_KEY_EQUIPMENT_INFO[0].nameEn,
                lubricantType: isRtl ? FOUR_KEY_EQUIPMENT_INFO[0].lubeFa : FOUR_KEY_EQUIPMENT_INFO[0].lubeEn,
                lubricantPoints: isRtl ? FOUR_KEY_EQUIPMENT_INFO[0].pointsFa : FOUR_KEY_EQUIPMENT_INFO[0].pointsEn,
                method: 'manual',
                quantity: '100g',
                lastDate: new Date().toISOString().split('T')[0],
                nextDueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
                status: 'normal',
                technician: user?.name || '',
                operatingHours: 1250,
                notes: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>{isRtl ? 'ثبت روانکاری جدید' : 'Log Lubrication'}</span>
          </button>
        </div>
      </div>

      {/* 4 Asset Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FOUR_KEY_EQUIPMENT_INFO.map(item => {
          // Find matching records for this equipment
          const eqRecords = records.filter(
            r => r.equipmentName.includes(item.nameFa) || r.equipmentName.includes(item.nameEn)
          );
          const latest = eqRecords[0];
          const daysLeft = latest ? getDaysRemaining(latest.nextDueDate) : null;
          const isOverdue = daysLeft !== null && daysLeft < 0;
          const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedEq(selectedEq === item.id ? 'all' : item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedEq === item.id
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {isRtl ? item.nameFa : item.nameEn}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOverdue
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : isDueSoon
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  {isOverdue
                    ? isRtl
                      ? 'دارای تأخیر'
                      : 'Overdue'
                    : isDueSoon
                    ? isRtl
                      ? 'موعد نزدیک'
                      : 'Due Soon'
                    : isRtl
                    ? 'عادی'
                    : 'OK'}
                </span>
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
                {isRtl ? item.lubeFa : item.lubeEn}
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">{isRtl ? 'سررسید:' : 'Due:'}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {latest ? latest.nextDueDate : isRtl ? 'تنظیم نشده' : 'Not set'}
                  {daysLeft !== null && (
                    <span
                      className={`mr-1 text-[10px] ${
                        isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-emerald-600'
                      }`}
                    >
                      ({daysLeft > 0 ? `${daysLeft}d` : `${Math.abs(daysLeft)}d ago`})
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setSelectedEq('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            selectedEq === 'all'
              ? 'bg-amber-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {isRtl ? 'همه ۴ تجهیز' : 'All 4 Assets'} ({records.length})
        </button>
        {FOUR_KEY_EQUIPMENT_INFO.map(eq => (
          <button
            key={eq.id}
            onClick={() => setSelectedEq(eq.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedEq === eq.id
                ? 'bg-amber-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {isRtl ? eq.nameFa : eq.nameEn}
          </button>
        ))}
      </div>

      {/* Main Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-semibold">
              <tr>
                <th className="p-3 text-right">{isRtl ? 'نام تجهیز' : 'Equipment'}</th>
                <th className="p-3 text-right">{isRtl ? 'نوع روانکار (روغن / گریس)' : 'Lubricant'}</th>
                <th className="p-3 text-right">{isRtl ? 'نقاط روانکاری' : 'Points'}</th>
                <th className="p-3 text-center">{isRtl ? 'مقدار / حجم' : 'Quantity'}</th>
                <th className="p-3 text-center">{isRtl ? 'آخرین سرویس' : 'Last Date'}</th>
                <th className="p-3 text-center">{isRtl ? 'سررسید بعدی' : 'Next Due'}</th>
                <th className="p-3 text-center">{isRtl ? 'وضعیت' : 'Status'}</th>
                <th className="p-3 text-center">{isRtl ? 'تکنسین' : 'Technician'}</th>
                <th className="p-3 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredRecords.map(rec => {
                const daysLeft = getDaysRemaining(rec.nextDueDate);
                const isOverdue = daysLeft < 0;
                const isDueSoon = daysLeft >= 0 && daysLeft <= 14;

                return (
                  <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-3 font-bold text-gray-900 dark:text-gray-100">
                      {rec.equipmentName}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      <span className="inline-block bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-mono text-[11px]">
                        {rec.lubricantType}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                      {rec.lubricantPoints}
                    </td>
                    <td className="p-3 text-center font-mono text-gray-700 dark:text-gray-300">
                      {rec.quantity || '-'}
                    </td>
                    <td className="p-3 text-center font-mono text-gray-600 dark:text-gray-400">
                      {rec.lastDate}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold">
                      <span className={isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-gray-800 dark:text-gray-200'}>
                        {rec.nextDueDate}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-normal">
                        {daysLeft < 0 ? `${Math.abs(daysLeft)} روز گذشته` : `${daysLeft} روز باقیمانده`}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          isOverdue
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : isDueSoon
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {isOverdue ? <ShieldAlert size={12} /> : isDueSoon ? <Clock size={12} /> : <CheckCircle size={12} />}
                        <span>
                          {isOverdue
                            ? isRtl ? 'انقضا / تأخیر' : 'Overdue'
                            : isDueSoon
                            ? isRtl ? 'نزدیک موعد' : 'Due Soon'
                            : isRtl ? 'تأیید شده' : 'Healthy'}
                        </span>
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-700 dark:text-gray-300">
                      {rec.technician || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setFormData(rec);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title={isRtl ? 'ویرایش' : 'Edit'}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setItemToDelete(rec)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title={isRtl ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    {isRtl ? 'رکوردی برای این تجهیز ثبت نشده است' : 'No lubrication records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding/updating lubrication record */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Droplet className="text-amber-500" size={18} />
              <span>
                {formData.id
                  ? isRtl ? 'ویرایش رکورد روانکاری' : 'Edit Lubrication Record'
                  : isRtl ? 'ثبت عملیات روانکاری جدید' : 'New Lubrication Entry'}
              </span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {isRtl ? 'انتخاب تجهیز (محدود به ۴ تجهیز کلیدی)' : 'Equipment (4 Key Assets)'} *
                </label>
                <select
                  value={formData.equipmentName}
                  onChange={e => handleEquipmentChangeInForm(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent text-xs"
                >
                  {FOUR_KEY_EQUIPMENT_INFO.map(eq => (
                    <option key={eq.id} value={isRtl ? eq.nameFa : eq.nameEn} className="dark:bg-gray-800">
                      {isRtl ? eq.nameFa : eq.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'نوع روانکار (روغن / گریس)' : 'Lubricant Type'} *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.lubricantType || ''}
                    onChange={e => setFormData({ ...formData, lubricantType: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'مقدار / حجم (لیتر / گرم)' : 'Quantity'}
                  </label>
                  <input
                    type="text"
                    value={formData.quantity || ''}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="مثال: 50g یا 12L"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {isRtl ? 'نقاط روانکاری (یاتاقان‌ها، مخزن و ...)' : 'Lubricant Points'}
                </label>
                <input
                  type="text"
                  value={formData.lubricantPoints || ''}
                  onChange={e => setFormData({ ...formData, lubricantPoints: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'تاریخ انجام روانکاری' : 'Last Service Date'} *
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.lastDate || ''}
                    onChange={e => setFormData({ ...formData, lastDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'تاریخ سررسید بعدی' : 'Next Due Date'} *
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.nextDueDate || ''}
                    onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'تکنسین انجام‌دهنده' : 'Technician'}
                  </label>
                  <input
                    type="text"
                    value={formData.technician || ''}
                    onChange={e => setFormData({ ...formData, technician: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'ساعت کارکرد در زمان روانکاری' : 'Operating Hours'}
                  </label>
                  <input
                    type="number"
                    value={formData.operatingHours || 0}
                    onChange={e => setFormData({ ...formData, operatingHours: Number(e.target.value) })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {isRtl ? 'توضیحات / وضعیت ویسکوزیته یا ذرات' : 'Notes / Inspection Comments'}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isRtl ? 'کیفیت روغن، تمیزی فیلتر، ویسکوزیته...' : 'Oil condition, filter cleanliness...'}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-transparent text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isRtl ? 'ثبت و ذخیره' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <ConfirmModal
          isOpen={true}
          title={isRtl ? 'حذف رکورد روانکاری' : 'Delete Lubrication Record'}
          message={
            isRtl
              ? `آیا از حذف رکورد روانکاری "${itemToDelete.equipmentName}" مطمئن هستید؟`
              : `Are you sure you want to delete lubrication record for "${itemToDelete.equipmentName}"?`
          }
          onConfirm={handleDelete}
          onClose={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
}
