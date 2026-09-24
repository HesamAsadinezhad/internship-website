import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Plus, CheckCircle, Clock, AlertTriangle, PlayCircle, Image as ImageIcon, Upload, Wrench, Shield, Filter, ArrowUpDown } from 'lucide-react';
import { Equipment, Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatDisplayDate } from '../utils/jalali';
import { getLocalizedEquipmentName } from '../utils/hierarchyLocalization';

export default function EquipmentDetail() {
  const { user } = useAuth();
  const { isRtl, language, t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering and Sorting by Standard
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'standard' | 'frequency' | 'nextDate' | 'subject'>('standard');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showInspectionModal, setShowInspectionModal] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ 
    subject: '', 
    frequency: 'ماهانه', 
    standard: 'Bartholet',
    instructions: '', 
    criteria: '', 
    partName: '', 
    warning: '' 
  });
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('عادی');
  const [operatingHours, setOperatingHours] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = () => {
    Promise.all([
      fetch('/api/equipments').then(r => r.ok ? r.json() : []),
      fetch(`/api/equipments/${id}/tasks`).then(r => r.ok ? r.json() : [])
    ]).then(([eqs, tsks]) => {
      if (Array.isArray(eqs)) {
        const eq = eqs.find((e: Equipment) => e.id === id);
        setEquipment(eq || null);
      }
      if (Array.isArray(tsks)) {
        setTasks(tsks);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/equipments/${id}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-name': encodeURIComponent(user?.name || '')
        },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        const t = await res.json();
        setTasks([...tasks, t]);
        setShowAddTaskModal(false);
        setNewTask({ subject: '', frequency: 'ماهانه', standard: 'Bartholet', instructions: '', criteria: '', partName: '', warning: '' });
      }
    } catch (err) {
      alert(isRtl ? 'خطا در افزودن دستورکار' : 'Error adding task');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      const res = await fetch(`/api/tasks/${taskToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || '',
          'x-user-name': encodeURIComponent(user?.name || '')
        }
      });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== taskToDelete));
      }
    } catch (err) {
      alert(isRtl ? 'خطا در حذف دستورکار' : 'Error deleting task');
    } finally {
      setTaskToDelete(null);
    }
  };
  
  const handleInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInspectionModal) return;
    
    const today = new Intl.DateTimeFormat('fa-IR').format(new Date());
    const opHoursNum = operatingHours ? Number(operatingHours) : undefined;
    
    const res = await fetch(`/api/tasks/${showInspectionModal}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        comment, 
        status, 
        dateString: today, 
        userId: user?.id, 
        userName: user?.name,
        operatingHours: opHoursNum
      })
    });
    
    if (res.ok) {
      const { nextDate } = await res.json();
      setTasks(tasks.map(t => t.id === showInspectionModal ? { ...t, lastDate: today, nextDate: nextDate || t.nextDate } : t));
    }
    
    setShowInspectionModal(null);
    setComment('');
    setOperatingHours('');
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !id) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('UPLOAD_FAILED');
      }

      const uploadData = await uploadResponse.json();

      if (!uploadData.imageUrl) {
        throw new Error('NO_IMAGE_URL');
      }

      const updateResponse = await fetch(`/api/equipments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadData.imageUrl,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('EQUIPMENT_UPDATE_FAILED');
      }

      // Update only the current equipment in React state.
      setEquipment(prev =>
        prev
          ? {
              ...prev,
              imageUrl: uploadData.imageUrl,
            }
          : prev
      );

      // Important: don't call fetchData() here.
      // That unnecessarily reloads the whole page's data.

    } catch (error) {
      console.error('Image upload failed:', error);

      alert(
        isRtl
          ? 'بارگذاری تصویر انجام نشد.'
          : 'Image upload failed.'
      );
    } finally {
      // Allow selecting the same file again.
      e.target.value = '';
    }
  };

  // Distinct standards present in tasks
  const availableStandards = useMemo(() => {
    const stdSet = new Set<string>();
    tasks.forEach(t => {
      if (t.standard) stdSet.add(t.standard);
    });
    // Ensure core standards are represented
    stdSet.add('Bartholet');
    stdSet.add('Doppelmayr');
    return Array.from(stdSet);
  }, [tasks]);

  // Filtered and Sorted Tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];
    
    // Filter by standard
    if (selectedStandard !== 'ALL') {
      result = result.filter(t => (t.standard || 'General').toLowerCase() === selectedStandard.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortBy === 'standard') {
        valA = a.standard || 'ZZZ';
        valB = b.standard || 'ZZZ';
      } else if (sortBy === 'frequency') {
        valA = a.frequency || '';
        valB = b.frequency || '';
      } else if (sortBy === 'nextDate') {
        valA = a.nextDate || '';
        valB = b.nextDate || '';
      } else {
        valA = a.subject || '';
        valB = b.subject || '';
      }
      const cmp = valA.localeCompare(valB, 'fa');
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tasks, selectedStandard, sortBy, sortOrder]);

  const getStandardBadgeStyle = (std?: string) => {
    const s = (std || '').toLowerCase();
    if (s.includes('bartholet')) {
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
    if (s.includes('dopel') || s.includes('doppel')) {
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  };
  
  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!equipment) return <div className="p-8 text-center text-gray-500">{isRtl ? 'تجهیز یافت نشد.' : 'Equipment not found.'}</div>;
  
  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 mb-6 transition-colors">
        <ArrowRight size={18} className={isRtl ? '' : 'rotate-180'} />
        <span>{isRtl ? 'بازگشت به داشبورد' : 'Back to Dashboard'}</span>
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8 overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-900 relative group">
          {equipment.imageUrl ? (
            <img src={equipment.imageUrl} alt={equipment.name} className="w-full h-full object-cover min-h-[250px]" />
          ) : (
            <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-700">
              <ImageIcon className="text-gray-300 mb-2" size={48} />
              <span className="text-sm text-gray-400">{isRtl ? 'بدون تصویر' : 'No Image'}</span>
            </div>
          )}
          {(user?.role === 'manager' || user?.role === 'SUPER_ADMIN') && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => imageInputRef.current?.click()} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-xs">
                <Upload size={16} /> {isRtl ? 'ویرایش تصویر' : 'Update Photo'}
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          )}
        </div>
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {getLocalizedEquipmentName(equipment.name, language)}
                </h1>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                    {equipment.code || 'NO-CODE'}
                  </span>
                  <span className="py-1">
                    {isRtl ? 'تاریخ ثبت:' : 'Created:'} {formatDisplayDate(equipment.createdAt, language)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {(user?.role === 'manager' || user?.role === 'SUPER_ADMIN') && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowAddTaskModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors shadow-sm">
                <Plus size={16} />
                <span>{isRtl ? 'افزودن دستورکار' : 'Add Maintenance Task'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Standard sorting & filtering bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Filter size={14} />
            {isRtl ? 'استاندارد:' : 'Standard:'}
          </span>
          <button
            onClick={() => setSelectedStandard('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedStandard === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {isRtl ? 'همه استانداردها' : 'All Standards'} ({tasks.length})
          </button>
          {availableStandards.map(std => {
            const count = tasks.filter(t => (t.standard || 'General').toLowerCase() === std.toLowerCase()).length;
            return (
              <button
                key={std}
                onClick={() => setSelectedStandard(std)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStandard.toLowerCase() === std.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {std} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <ArrowUpDown size={14} />
            {isRtl ? 'مرتب‌سازی:' : 'Sort by:'}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1 font-medium outline-none"
          >
            <option value="standard">{isRtl ? 'استاندارد (Bartholet / Doppelmayr)' : 'Standard'}</option>
            <option value="frequency">{isRtl ? 'دوره تناوب' : 'Frequency'}</option>
            <option value="nextDate">{isRtl ? 'تاریخ سررسید' : 'Due Date'}</option>
            <option value="subject">{isRtl ? 'عنوان دستورکار' : 'Subject'}</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-2 hover:bg-gray-200"
            title={isRtl ? 'تغییر ترتیب' : 'Toggle Sort Order'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {filteredAndSortedTasks.map(task => (
          <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-start">
                <div className="mb-2">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {task.subject}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${getStandardBadgeStyle(task.standard)}`}>
                      <Shield size={12} />
                      {task.standard || 'General'}
                    </span>
                  </div>
                  {task.instructions && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-2 whitespace-pre-wrap leading-relaxed">
                      {task.instructions}
                    </p>
                  )}
                  {task.partName && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800">
                      <Wrench size={13} />
                      {isRtl ? `قطعه: ${task.partName}` : `Part: ${task.partName}`}
                    </div>
                  )}
                </div>
                {(user?.role === 'manager' || user?.role === 'SUPER_ADMIN') && (
                  <button onClick={() => setTaskToDelete(task.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors md:hidden">
                    {isRtl ? 'حذف' : 'Delete'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                <span className="flex items-center gap-1"><Clock size={14} /> {isRtl ? 'دوره:' : 'Freq:'} {task.frequency}</span>
                <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> {isRtl ? 'انجام شده:' : 'Done:'} {task.lastDate ? formatDisplayDate(task.lastDate, language) : '-'}</span>
                <span className="flex items-center gap-1 text-orange-500"><AlertTriangle size={14} /> {isRtl ? 'سررسید:' : 'Due:'} {task.nextDate ? formatDisplayDate(task.nextDate, language) : '-'}</span>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto self-end md:self-center">
              {(user?.role === 'manager' || user?.role === 'SUPER_ADMIN') && (
                <button onClick={() => setTaskToDelete(task.id)} className="hidden md:flex items-center justify-center px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 rounded-lg text-xs font-semibold transition-colors">
                  {isRtl ? 'حذف' : 'Delete'}
                </button>
              )}
              <button 
                onClick={() => setShowInspectionModal(task.id)}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shadow-xs"
              >
                <PlayCircle size={16} />
                <span>{isRtl ? 'ثبت بازرسی' : 'Log Inspection'}</span>
              </button>
            </div>
          </div>
        ))}
        {filteredAndSortedTasks.length === 0 && (
          <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs">
            {isRtl ? 'دستورکاری منطبق با این فیلتر استاندارد یافت نشد.' : 'No maintenance tasks found matching this standard filter.'}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!taskToDelete}
        title={isRtl ? "حذف دستورکار" : "Delete Task"}
        message={isRtl ? "آیا از حذف این دستورکار اطمینان دارید؟ این عمل قابل بازگشت نیست." : "Are you sure you want to delete this task? This action cannot be undone."}
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {isRtl ? 'افزودن دستورکار جدید' : 'Add New Task'}
            </h3>
            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'عنوان دستورکار *' : 'Task Subject *'}
                </label>
                <input required value={newTask.subject} onChange={e => setNewTask({...newTask, subject: e.target.value})} type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isRtl ? "مثلا: بازدید دوره‌ای پمپ" : "e.g. Pump Inspection"} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'استاندارد سازنده' : 'Standard'}
                  </label>
                  <select 
                    value={newTask.standard} 
                    onChange={e => setNewTask({...newTask, standard: e.target.value})} 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Bartholet">{isRtl ? 'Bartholet (بارهولت)' : 'Bartholet'}</option>
                    <option value="Doppelmayr">{isRtl ? 'Doppelmayr (دوپلمایر)' : 'Doppelmayr'}</option>
                    <option value="Poma">{isRtl ? 'Poma (پوما)' : 'Poma'}</option>
                    <option value="General">{isRtl ? 'عمومی / استاندارد کارخانه' : 'General / Factory Standard'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'دوره تناوب' : 'Frequency'}
                  </label>
                  <select value={newTask.frequency} onChange={e => setNewTask({...newTask, frequency: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="روزانه">{isRtl ? 'روزانه' : 'Daily'}</option>
                    <option value="هفتگی">{isRtl ? 'هفتگی' : 'Weekly'}</option>
                    <option value="ماهانه">{isRtl ? 'ماهانه' : 'Monthly'}</option>
                    <option value="3 ماهه">{isRtl ? '۳ ماهه' : '3 Months'}</option>
                    <option value="6 ماهه">{isRtl ? '۶ ماهه' : '6 Months'}</option>
                    <option value="سالانه">{isRtl ? 'سالانه' : 'Annually'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'نام قطعه (اختیاری)' : 'Part Name (Optional)'}
                </label>
                <input value={newTask.partName} onChange={e => setNewTask({...newTask, partName: e.target.value})} type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isRtl ? "مثلا: گیره کوپلینگ" : "e.g. Coupling"} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'اعلان / هشدار (اختیاری)' : 'Safety Warning (Optional)'}
                </label>
                <input value={newTask.warning} onChange={e => setNewTask({...newTask, warning: e.target.value})} type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isRtl ? "مثلا: قبل از اقدام دستگاه خاموش شود" : "e.g. Lockout before inspection"} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'دستورالعمل (اختیاری)' : 'Instructions (Optional)'}
                </label>
                <textarea value={newTask.instructions} onChange={e => setNewTask({...newTask, instructions: e.target.value})} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowAddTaskModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors">
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold transition-colors">
                  {isRtl ? 'ثبت دستورکار' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {isRtl ? 'ثبت گزارش بازرسی' : 'Log Inspection'}
            </h3>
            
            {(() => {
              const activeTask = tasks.find(t => t.id === showInspectionModal);
              return activeTask && (
                <div className="mb-4 space-y-2">
                  {activeTask.warning && (
                    <div className="bg-red-50 text-red-800 p-2.5 rounded-lg text-xs border border-red-100 flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <strong className="block mb-0.5">{isRtl ? 'هشدار ایمنی:' : 'Safety Notice:'}</strong>
                        {activeTask.warning}
                      </div>
                    </div>
                  )}
                  {activeTask.instructions && (
                    <div className="bg-blue-50 text-blue-800 p-2.5 rounded-lg text-xs border border-blue-100">
                      <strong>{isRtl ? 'دستورالعمل: ' : 'Instructions: '}</strong> {activeTask.instructions}
                    </div>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleInspection} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'وضعیت تجهیز' : 'Status'}
                </label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="عادی">{isRtl ? 'عادی - بدون اشکال' : 'Normal - OK'}</option>
                  <option value="هشدار">{isRtl ? 'هشدار - نیاز به بررسی' : 'Warning - Needs follow-up'}</option>
                  <option value="خراب">{isRtl ? 'خراب - نیاز به تعمیر فوری' : 'Critical - Immediate repair'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'ساعت کارکرد قطعه (اختیاری)' : 'Operating Hours (Optional)'}
                </label>
                <input 
                  type="number" 
                  value={operatingHours} 
                  onChange={e => setOperatingHours(e.target.value)} 
                  dir="ltr" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-left" 
                  placeholder="1500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'توضیحات و نظر کارشناس *' : 'Inspection Notes *'}
                </label>
                <textarea required value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder={isRtl ? "مشاهدات خود را یادداشت کنید..." : "Enter observation notes..."}></textarea>
              </div>
              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowInspectionModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors">
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-semibold transition-colors">
                  {isRtl ? 'ثبت نهایی' : 'Submit Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
