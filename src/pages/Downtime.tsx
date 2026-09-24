import React, { useState, useEffect, useMemo } from 'react';
import { Equipment, Downtime } from '../types';
import { Clock, Plus, Filter, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHierarchy } from '../context/HierarchyContext';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import DataGrid from '../components/DataGrid';
import DatePickerRaw from 'react-multi-date-picker';
const DatePicker = DatePickerRaw.default || DatePickerRaw;
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import TimePickerRaw from 'react-multi-date-picker/plugins/time_picker';
const TimePicker = TimePickerRaw.default || TimePickerRaw;

export default function DowntimePage() {
  const { activeComplex, activeLine } = useHierarchy();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, isRtl } = useLanguage();
  const [downtimes, setDowntimes] = useState<Downtime[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    equipmentId: '',
    reason: 'نقص مکانیکی',
    startTime: '',
    endTime: '',
    notes: ''
  });

  const fetchData = () => {
    fetch(`/api/downtimes?${activeLine ? 'lineId='+activeLine.id : activeComplex ? 'complexId='+activeComplex.id : ''}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setDowntimes(data.reverse()); })
      .catch(() => {});
    fetch(`/api/equipments?${activeLine ? 'lineId='+activeLine.id : activeComplex ? 'complexId='+activeComplex.id : ''}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setEquipments(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, [activeComplex, activeLine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startTime || !formData.endTime) {
      toast(isRtl ? 'لطفاً زمان شروع و پایان را انتخاب کنید' : 'Please select start and end times', 'error');
      return;
    }
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const durationMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
    
    const payload = { ...formData, durationMinutes };
    
    try {
      const res = await fetch('/api/downtimes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast(isRtl ? 'گزارش توقف با موفقیت ثبت شد' : 'Downtime logged successfully', 'success');
        fetchData();
        setShowForm(false);
      }
    } catch (err) {
      toast(isRtl ? 'خطا در ثبت توقف' : 'Error saving downtime record', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/downtimes/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || '',
          'x-user-name': encodeURIComponent(user?.name || '')
        }
      });
      if (res.ok) {
        toast(isRtl ? 'توقف با موفقیت حذف شد' : 'Downtime record deleted', 'success');
        fetchData();
      }
    } catch (err) {
      toast(isRtl ? 'خطا در حذف گزارش' : 'Error deleting downtime record', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    if (isRtl) return reason;
    switch (reason) {
      case 'نقص مکانیکی': return 'Mechanical Fault';
      case 'نقص الکتریکی': return 'Electrical Fault';
      case 'قطعی برق': return 'Power Outage';
      case 'شرایط جوی':
      case 'شرایط جوی / باد': return 'Severe Weather / High Wind';
      case 'توقف عملیاتی':
      case 'توقف عملیاتی مسافر': return 'Passenger Operational Stop';
      case 'ایست اضطراری':
      case 'ایست اضطراری (Emergency Stop)': return 'Emergency Stop (E-Stop)';
      case 'تعمیرات پیشگیرانه': return 'Preventive Maintenance';
      default: return reason;
    }
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      {
        header: t('downtime.equipment', 'تجهیز'),
        accessor: 'equipmentId',
        cell: (row: Downtime) => {
          if (row.equipmentId === 'all') return t('downtime.entire_site', 'کل سایت');
          const eq = equipments.find(e => e.id === row.equipmentId);
          return eq?.name || t('downtime.unknown', 'نامشخص');
        }
      },
      {
        header: t('downtime.reason', 'علت'),
        accessor: 'reason',
        cell: (row: Downtime) => (
          <span className="font-medium text-red-600 dark:text-red-400">
            {getReasonLabel(row.reason)}
          </span>
        )
      },
      {
        header: t('downtime.start_time', 'شروع'),
        accessor: 'startTime',
        cell: (row: Downtime) => (
          <span dir="ltr" className="font-mono text-gray-500 dark:text-gray-400">
            {new Date(row.startTime).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}
          </span>
        )
      },
      {
        header: t('downtime.duration_min', 'مدت (دقیقه)'),
        accessor: 'durationMinutes',
        cell: (row: Downtime) => <span className="font-bold">{row.durationMinutes}</span>
      },
      {
        header: t('common.notes', 'توضیحات'),
        accessor: 'notes',
        cell: (row: Downtime) => <span className="text-gray-600 dark:text-gray-400 truncate max-w-xs">{row.notes}</span>
      }
    ];

    if ((user?.role === 'manager' || user?.role === 'SUPER_ADMIN')) {
      cols.push({
        header: t('common.actions', 'عملیات'),
        accessor: 'id',
        sortable: false,
        cell: (row: Downtime) => (
          <button 
            onClick={() => setDeleteId(row.id)}
            className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors" 
            title={t('common.delete', 'حذف')}
          >
            <Trash2 size={18} />
          </button>
        )
      });
    }

    return cols as any;
  }, [equipments, user, isRtl]);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('downtime.title', 'ثبت توقفات (Downtime)')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('downtime.subtitle', 'گزارش خرابی‌ها و توقف خطوط')}
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>{t('downtime.add_new', 'ثبت توقف جدید')}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-red-200 dark:border-red-900/30 shadow-sm mb-8 animate-in fade-in">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
            {t('downtime.modal_title', 'فرم ثبت توقف')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('downtime.equipment', 'تجهیز / خط آسیب دیده')}
              </label>
              <select 
                required 
                value={formData.equipmentId} 
                onChange={e => setFormData({...formData, equipmentId: e.target.value})} 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-red-500 bg-white dark:bg-gray-800"
              >
                <option value="">{t('common.select', 'انتخاب کنید...')}</option>
                <option value="all">{t('downtime.all_equipment_option', 'کل سایت / قطعی سراسری')}</option>
                {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('downtime.reason', 'دلیل توقف')}
              </label>
              <select 
                required 
                value={formData.reason} 
                onChange={e => setFormData({...formData, reason: e.target.value})} 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-red-500 bg-white dark:bg-gray-800"
              >
                <option value="نقص مکانیکی">{isRtl ? 'نقص مکانیکی' : 'Mechanical Fault'}</option>
                <option value="نقص الکتریکی">{isRtl ? 'نقص الکتریکی' : 'Electrical Fault'}</option>
                <option value="قطعی برق">{isRtl ? 'قطعی برق' : 'Power Outage'}</option>
                <option value="شرایط جوی">{isRtl ? 'شرایط جوی / باد' : 'Severe Weather / High Wind'}</option>
                <option value="توقف عملیاتی">{isRtl ? 'توقف عملیاتی مسافر' : 'Passenger Operational Stop'}</option>
                <option value="ایست اضطراری">{isRtl ? 'ایست اضطراری (Emergency Stop)' : 'Emergency Stop (E-Stop)'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('downtime.start_time', 'زمان شروع')}
              </label>
              <DatePicker
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker position="bottom" />]}
                calendar={isRtl ? persian : gregorian}
                locale={isRtl ? persian_fa : gregorian_en}
                calendarPosition="bottom-right"
                value={formData.startTime ? new Date(formData.startTime) : null}
                onChange={(dateObj: any) => setFormData({...formData, startTime: dateObj ? dateObj.toDate().toISOString() : ''})}
                containerClassName="w-full block"
                inputClass="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-red-500 bg-white dark:bg-gray-800 h-[42px] ltr-placeholder"
                placeholder={isRtl ? 'انتخاب تاریخ و ساعت' : 'Select Date and Time'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRtl ? 'زمان پایان' : 'End Time'}
              </label>
              <DatePicker
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker position="bottom" />]}
                calendar={isRtl ? persian : gregorian}
                locale={isRtl ? persian_fa : gregorian_en}
                calendarPosition="bottom-right"
                value={formData.endTime ? new Date(formData.endTime) : null}
                onChange={(dateObj: any) => setFormData({...formData, endTime: dateObj ? dateObj.toDate().toISOString() : ''})}
                containerClassName="w-full block"
                inputClass="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-red-500 bg-white dark:bg-gray-800 h-[42px] ltr-placeholder"
                placeholder={isRtl ? 'انتخاب تاریخ و ساعت' : 'Select Date and Time'}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.notes', 'توضیحات تکمیلی')}
            </label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              rows={3} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-red-500 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              {t('common.cancel', 'انصراف')}
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
            >
              {t('common.save', 'ذخیره')}
            </button>
          </div>
        </form>
      )}

      <DataGrid 
        data={downtimes} 
        columns={columns} 
        fileName={isRtl ? 'گزارش_توقفات' : 'Downtimes_Report'}
        searchPlaceholder={isRtl ? 'جستجو تجهیز، علت، توضیحات...' : 'Search equipment, reason, notes...'}
      />

      <ConfirmModal 
        isOpen={!!deleteId}
        title={t('downtime.delete_title', 'حذف گزارش توقف')}
        message={t('downtime.delete_confirm', 'آیا از حذف این گزارش اطمینان دارید؟ این عمل قابل بازگشت نیست.')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
