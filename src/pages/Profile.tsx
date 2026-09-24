import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Save } from 'lucide-react';

export default function Profile() {
  const { user, login } = useAuth();
  const { t, isRtl } = useLanguage();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [position, setPosition] = useState(user?.position || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const updates: any = { name, username, phone, position };
      if (password) {
        updates.password = password;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-name': encodeURIComponent(user.name)
        },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        login(updatedUser); // Update context and localstorage
        setPassword('');
        alert(t('settings.saved_success', 'اطلاعات کاربری با موفقیت بروزرسانی شد.'));
      }
    } catch (err) {
      alert(t('common.error', 'خطا در ذخیره اطلاعات'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('profile.title', 'ویرایش پروفایل')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('profile.subtitle', 'اطلاعات کاربری خود را در سامانه ویرایش کنید')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user?.name}</h2>
            <span className="text-sm bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full mt-1 inline-block">
              {(user?.role === 'manager' || user?.role === 'SUPER_ADMIN') 
                ? t('profile.senior_manager', 'مدیر ارشد') 
                : t('profile.operator', 'اپراتور')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.full_name', 'نام و نام خانوادگی')}
              </label>
              <input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                type="text" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.username', 'نام کاربری')}
              </label>
              <input 
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                type="text" 
                dir="ltr" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-left" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.phone', 'شماره تماس')}
              </label>
              <input 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                type="tel" 
                dir="ltr" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-left" 
                placeholder="09..." 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users.position', 'سمت / موقعیت شغلی')}
              </label>
              <input 
                value={position} 
                onChange={e => setPosition(e.target.value)} 
                type="text" 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.new_password', 'رمز عبور جدید (اختیاری)')}
            </label>
            <input 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              type="password" 
              dir="ltr" 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-left" 
              placeholder={t('profile.new_password_hint', 'تنها در صورت نیاز به تغییر وارد کنید')} 
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-70"
            >
              <Save size={20} />
              <span>{loading ? t('common.loading', 'در حال ذخیره...') : t('common.save', 'ذخیره تغییرات')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
