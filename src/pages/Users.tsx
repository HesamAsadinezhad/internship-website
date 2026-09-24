import React, { useState, useEffect } from 'react';
import { User, Complex, Line, Station } from '../types';
import { useAuth } from '../context/AuthContext';
import { useHierarchy } from '../context/HierarchyContext';
import { useLanguage } from '../context/LanguageContext';
import { Users as UsersIcon, Plus, UserPlus, Shield, Trash2, Eye, EyeOff } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { 
  getLocalizedComplexName, 
  getLocalizedLineName, 
  getLocalizedStationName, 
  getLocalizedUserName, 
  getLocalizedPosition 
} from '../utils/hierarchyLocalization';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { activeLine } = useHierarchy();
  const { t, isRtl, language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [allLines, setAllLines] = useState<Line[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('STATION_OPERATOR');
  
  const [selectedComplexId, setSelectedComplexId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');

  const fetchUsers = () => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadComplexes = async () => {
    try {
      const res = await fetch('/api/complexes');
      if (res.ok) setComplexes(await res.json());
    } catch(e) {}
  };

  const loadAllHierarchy = async () => {
    try {
      const [linesRes, stationsRes] = await Promise.all([
        fetch('/api/lines'),
        fetch('/api/stations')
      ]);
      if (linesRes.ok) setAllLines(await linesRes.json());
      if (stationsRes.ok) setAllStations(await stationsRes.json());
    } catch(e) {}
  };

  const loadLines = async (complexId: string) => {
    if (!complexId) return;
    try {
      const res = await fetch(`/api/complexes/${complexId}/lines`);
      if (res.ok) setLines(await res.json());
    } catch(e) {}
  };
  const loadStations = async (lineId: string) => {
    if (!lineId) return;
    try {
      const res = await fetch(`/api/lines/${lineId}/stations`);
      if (res.ok) setStations(await res.json());
    } catch(e) {}
  };

  useEffect(() => {
    fetchUsers();
    loadComplexes();
    loadAllHierarchy();
  }, []);

  useEffect(() => {
    setLines([]);
    setStations([]);
    setSelectedLineId('');
    setSelectedStationId('');
    if (selectedComplexId) loadLines(selectedComplexId);
  }, [selectedComplexId]);

  useEffect(() => {
    setStations([]);
    setSelectedStationId('');
    if (selectedLineId) loadStations(selectedLineId);
  }, [selectedLineId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { username, password, name, role, phone, position };
      if (role === 'COMPLEX_ADMIN' || role === 'LINE_SUPERVISOR' || role === 'STATION_OPERATOR') {
        payload.complexId = selectedComplexId;
      }
      if (role === 'LINE_SUPERVISOR' || role === 'STATION_OPERATOR') {
        payload.lineId = selectedLineId;
      }
      if (role === 'STATION_OPERATOR') {
        payload.stationId = selectedStationId;
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || '')
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAdd(false);
        setUsername('');
        setPassword('');
        setName('');
        setPhone('');
        setPosition('');
        setRole('STATION_OPERATOR');
        setSelectedComplexId('');
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.message || (isRtl ? 'خطا در ثبت کاربر' : 'Error saving user'));
      }
    } catch (err) {
      alert(t('common.server_error', 'خطا در ارتباط با سرور'));
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || '',
          'x-user-name': encodeURIComponent(currentUser?.name || '')
        }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert(isRtl ? 'خطا در حذف کاربر' : 'Error deleting user');
      }
    } catch (err) {
      alert(t('common.server_error', 'خطا در ارتباط با سرور'));
    } finally {
      setUserToDelete(null);
    }
  };

  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'manager' && currentUser?.role !== 'COMPLEX_ADMIN') {
    return <div className="p-8 text-center text-red-500">{t('common.access_denied', 'شما دسترسی به این صفحه را ندارید.')}</div>;
  }

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'SUPER_ADMIN': return isRtl ? 'مدیر ارشد سیستم' : 'Super Administrator';
      case 'manager': return isRtl ? 'مدیر سیستم' : 'System Manager';
      case 'COMPLEX_ADMIN': return isRtl ? 'مدیر مجموعه' : 'Complex Administrator';
      case 'LINE_SUPERVISOR': return isRtl ? 'سرپرست خط' : 'Line Supervisor';
      case 'STATION_OPERATOR': return isRtl ? 'اپراتور ایستگاه' : 'Station Operator';
      case 'operator': return isRtl ? 'اپراتور فنی' : 'Technical Operator';
      default: return r;
    }
  };

  let displayUsers = users;
  if (currentUser?.role === 'COMPLEX_ADMIN') {
    displayUsers = users.filter(u => u.complexId === currentUser.complexId);
  }

  return (
    <div className="max-w-6xl mx-auto pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('users.title', 'مدیریت کاربران')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('users.subtitle', 'تعریف نقش‌ها و تخصیص کاربران به خطوط و ایستگاه‌ها')}
          </p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <UserPlus size={20} />
          <span>{t('users.add_user', 'کاربر جدید')}</span>
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">
            {isRtl ? 'افزودن کاربر سیستم' : 'Add System User'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users.full_name', 'نام و نام خانوادگی')}
              </label>
              <input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                type="text" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder={isRtl ? 'مثلا: علی رضایی' : 'e.g. John Doe'} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRtl ? 'نام کاربری (حروف انگلیسی)' : 'Username (English)'}
              </label>
              <input 
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                type="text" 
                dir="ltr" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-left" 
                placeholder="john.doe" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users.password', 'رمز عبور')}
              </label>
              <div className="relative">
                <input 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  type={showPassword ? "text" : "password"} 
                  dir="ltr" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 outline-none text-left" 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400 focus:outline-none p-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users.role', 'نقش کاربری')}
              </label>
              <select required value={role} onChange={e => setRole(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'manager') && (
                  <>
                    <option value="SUPER_ADMIN">{isRtl ? 'مدیر کل سیستم' : 'Super Administrator'}</option>
                    <option value="COMPLEX_ADMIN">{isRtl ? 'مدیر مجموعه (Complex)' : 'Complex Administrator'}</option>
                  </>
                )}
                <option value="LINE_SUPERVISOR">{isRtl ? 'سرپرست خط (Line)' : 'Line Supervisor'}</option>
                <option value="STATION_OPERATOR">{isRtl ? 'اپراتور ایستگاه (Station)' : 'Station Operator'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users.phone', 'شماره تماس')}
              </label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" dir="ltr" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-left" placeholder="0912..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users.position', 'سمت شغلی')}
              </label>
              <input value={position} onChange={e => setPosition(e.target.value)} type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isRtl ? 'مثلا: تکنسین برق' : 'e.g. Electrical Technician'} />
            </div>
          </div>

          {(role === 'COMPLEX_ADMIN' || role === 'LINE_SUPERVISOR' || role === 'STATION_OPERATOR') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'مجموعه' : 'Facility / Complex'}
                </label>
                <select required value={selectedComplexId} onChange={e => setSelectedComplexId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">{isRtl ? '-- انتخاب مجموعه --' : '-- Select Facility --'}</option>
                  {complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {(role === 'LINE_SUPERVISOR' || role === 'STATION_OPERATOR') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'خط' : 'Line'}
                  </label>
                  <select required value={selectedLineId} onChange={e => setSelectedLineId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">{isRtl ? '-- انتخاب خط --' : '-- Select Line --'}</option>
                    {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}

              {role === 'STATION_OPERATOR' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRtl ? 'ایستگاه' : 'Station'}
                  </label>
                  <select required value={selectedStationId} onChange={e => setSelectedStationId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">{isRtl ? '-- انتخاب ایستگاه --' : '-- Select Station --'}</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors">
              {t('common.cancel', 'انصراف')}
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold">
              {t('common.save', 'ذخیره کاربر')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className={`p-4 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t('users.full_name', 'نام کاربر')}</th>
                <th className={`p-4 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t('users.username', 'نام کاربری')}</th>
                <th className={`p-4 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t('users.role', 'نقش')}</th>
                <th className={`p-4 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'محدوده فعالیت' : 'Assigned Scope'}</th>
                <th className="p-4 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:bg-gray-900 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <UsersIcon size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {getLocalizedUserName(u.name, language)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.position ? getLocalizedPosition(u.position, language) : (isRtl ? 'بدون سمت' : 'No Title')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-400 text-left" dir="ltr">{u.username}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'SUPER_ADMIN' || u.role === 'manager' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                      u.role === 'COMPLEX_ADMIN' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      u.role === 'LINE_SUPERVISOR' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {u.role === 'SUPER_ADMIN' || u.role === 'manager' ? <Shield size={12} /> : null}
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                    {u.complexId && (
                      <div className="flex flex-col gap-1.5">
                        {u.complexId && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{isRtl ? 'مجموعه:' : 'Facility:'}</span>
                            <span>{getLocalizedComplexName(complexes.find(c => c.id === u.complexId), language) || (isRtl ? 'نامشخص' : 'Unspecified')}</span>
                          </div>
                        )}
                        {u.lineId && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{isRtl ? 'خط:' : 'Line:'}</span>
                            <span>{getLocalizedLineName(allLines.find(l => l.id === u.lineId) || lines.find(l => l.id === u.lineId), language) || (isRtl ? 'نامشخص' : 'Unspecified')}</span>
                          </div>
                        )}
                        {u.stationId && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{isRtl ? 'ایستگاه:' : 'Station:'}</span>
                            <span>{getLocalizedStationName(allStations.find(s => s.id === u.stationId) || stations.find(s => s.id === u.stationId), language) || (isRtl ? 'نامشخص' : 'Unspecified')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {!u.complexId && <span className="text-gray-400 italic">{isRtl ? 'دسترسی کل سیستم' : 'Full System Access'}</span>}
                  </td>
                  <td className={`p-4 ${isRtl ? 'text-left' : 'text-right'}`}>
                    {currentUser?.id !== u.id && (
                      <button 
                        onClick={() => setUserToDelete({id: u.id, name: u.name})}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors" 
                        title={t('common.delete', 'حذف')}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">{t('users.no_users', 'کاربری یافت نشد.')}</div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!userToDelete}
        title={t('users.delete_confirm', 'حذف کاربر')}
        message={isRtl ? `آیا از حذف کاربر "${userToDelete?.name}" اطمینان دارید؟` : `Are you sure you want to delete user "${userToDelete?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
