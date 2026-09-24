import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Settings as SettingsIcon, Image as ImageIcon, Upload, Save } from 'lucide-react';

export default function Settings() {
  const { user, settings, updateSettings } = useAuth();
  const { t, isRtl } = useLanguage();
  const [companyName, setCompanyName] = useState(settings?.companyName || 'CMMS');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName);
      setLogoUrl(settings.logoUrl);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-name': encodeURIComponent(user?.name || '')
        },
        body: JSON.stringify({ companyName, logoUrl })
      });
      
      if (res.ok) {
        const data = await res.json();
        updateSettings(data);
        alert(t('settings.saved_success', 'تنظیمات با موفقیت ذخیره شد.'));
      }
    } catch (err) {
      alert(t('common.error', 'خطا در ذخیره تنظیمات'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const imgRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      const imgData = await imgRes.json();
      setLogoUrl(imgData.imageUrl);
    } catch (err) {
      alert(t('common.error', 'خطا در آپلود لوگو'));
    }
  };

  if (user?.role !== 'manager' && user?.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-red-500">{t('common.access_denied', 'شما دسترسی به این صفحه را ندارید.')}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('settings.title', 'تنظیمات سیستم')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('settings.subtitle', 'مدیریت مشخصات شرکت و شخصی‌سازی سامانه')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        <form onSubmit={handleSave}>
          <div className="mb-8 flex flex-col items-center">
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900 mb-4 overflow-hidden relative group">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-xs">{t('settings.no_logo', 'بدون لوگو')}</span>
                </div>
              )}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <Upload className="text-white" size={24} />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 font-medium text-sm hover:text-blue-700">
              {t('settings.change_logo', 'تغییر لوگوی شرکت')}
            </button>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.company_name', 'نام سامانه / عنوان شرکت')}
            </label>
            <input 
              required
              type="text" 
              value={companyName} 
              onChange={e => setCompanyName(e.target.value)} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
              placeholder={t('settings.placeholder_company', 'مثلا: سامانه جامع CMMS')} 
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-70"
            >
              <Save size={20} />
              <span>{loading ? t('common.loading', 'در حال ذخیره...') : t('settings.save_settings', 'ذخیره تنظیمات')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
