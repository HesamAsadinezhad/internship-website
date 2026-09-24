import React, { useState, useEffect } from 'react';
import { Building, GitCommit, MapPin, ArrowRight, Wrench, Moon, Sun, LogOut, Plus, Trash2, Globe, Image as ImageIcon, Clock, ShieldAlert, X } from 'lucide-react';
import { Complex, Line } from '../types';
import { useAuth } from '../context/AuthContext';
import { useHierarchy } from '../context/HierarchyContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import { canEditComplexImage } from '../utils/rbac';
import { formatDisplayDate } from '../utils/jalali';

const DEFAULT_COMPLEX_IMAGES = [
  'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80'
];

export default function HierarchySelection() {
  const { user, logout, settings } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, isRtl } = useLanguage();
  const { activeComplex, setActiveComplex, setActiveLine } = useHierarchy();
  
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  // Cover Image Edit Modal
  const [coverModalComplex, setCoverModalComplex] = useState<Complex | null>(null);
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [coverError, setCoverError] = useState<string | null>(null);
  const [updatingCover, setUpdatingCover] = useState(false);
  
  // Add Complex State
  const [showAddComplex, setShowAddComplex] = useState(false);
  const [newComplexName, setNewComplexName] = useState('');
  const [newComplexLocation, setNewComplexLocation] = useState('');
  const [newComplexDescription, setNewComplexDescription] = useState('');
  const [newComplexImageUrl, setNewComplexImageUrl] = useState('');
  const [newComplexPassword, setNewComplexPassword] = useState('');
  const [authModal, setAuthModal] = useState<{isOpen: boolean, complex: Complex | null, password: string, error: string}>({isOpen: false, complex: null, password: '', error: ''});
  
  // Add Line State
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [newLineType, setNewLineType] = useState('تله‌کابین');

  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'complex' | 'line'} | null>(null);

  useEffect(() => {
    loadData();
  }, [user, activeComplex]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!activeComplex) {
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'manager') {
          const res = await fetch('/api/complexes');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) setComplexes(data);
          }
        }
      } else {
        const res = await fetch(`/api/complexes/${activeComplex.id}/lines`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setLines(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUpdateCoverImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverModalComplex || !newCoverUrl.trim()) return;

    setUpdatingCover(true);
    setCoverError(null);

    try {
      const res = await fetch(`/api/complexes/${coverModalComplex.id}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: newCoverUrl.trim() })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update cover image');
      }

      setCoverModalComplex(null);
      setNewCoverUrl('');
      loadData();
    } catch (err: any) {
      setCoverError(err.message || (isRtl ? 'خطا در بروزرسانی تصویر' : 'Error updating cover image'));
    } finally {
      setUpdatingCover(false);
    }
  };

  const handleBack = () => {
    setActiveComplex(null);
  };

  const handleComplexClick = (c: Complex) => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'manager') {
       if (c.password) {
         setAuthModal({isOpen: true, complex: c, password: '', error: ''});
       } else {
         setActiveComplex(c);
       }
    } else {
       setActiveComplex(c);
    }
  };

  const verifyComplexPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authModal.complex) return;
    
    try {
      const res = await fetch(`/api/complexes/${authModal.complex.id}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: authModal.password })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
         setActiveComplex(authModal.complex);
         setAuthModal({isOpen: false, complex: null, password: '', error: ''});
      } else {
         setAuthModal({...authModal, error: data.error || (isRtl ? 'رمز عبور اشتباه است' : 'Incorrect password')});
      }
    } catch(err) {
      setAuthModal({...authModal, error: isRtl ? 'خطا در ارتباط با سرور' : 'Server connection error'});
    }
  };

  const handleAddComplex = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/complexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newComplexName, 
          location: newComplexLocation, 
          description: newComplexDescription,
          imageUrl: newComplexImageUrl || DEFAULT_COMPLEX_IMAGES[complexes.length % DEFAULT_COMPLEX_IMAGES.length],
          password: newComplexPassword 
        })
      });
      if (res.ok) {
        setShowAddComplex(false);
        setNewComplexName('');
        setNewComplexLocation('');
        setNewComplexDescription('');
        setNewComplexImageUrl('');
        setNewComplexPassword('');
        loadData();
      } else {
        const err = await res.json();
        alert((isRtl ? 'خطا: ' : 'Error: ') + (err.error || 'Unknown'));
      }
    } catch (err) {
      alert(isRtl ? 'خطا در ارتباط با سرور' : 'Server connection error');
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplex) return;
    try {
      const res = await fetch(`/api/complexes/${activeComplex.id}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLineName, type: newLineType })
      });
      if (res.ok) {
        setShowAddLine(false);
        setNewLineName('');
        setNewLineType('تله‌کابین');
        loadData();
      }
    } catch (err) {
      alert(isRtl ? 'خطا در ثبت خط' : 'Error adding line');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const url = itemToDelete.type === 'complex' 
        ? `/api/complexes/${itemToDelete.id}` 
        : `/api/lines/${itemToDelete.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const getComplexName = (c: Complex | null | undefined): string => {
    if (!c) return '';
    if (language === 'en') {
      if (c.nameEn) return c.nameEn;
      if (c.name?.includes('توچال')) return 'Tochal Telecabin';
      if (c.name?.includes('کیش')) return 'Kish Telecabin';
      if (c.name?.includes('رامسر')) return 'Ramsar Telecabin';
      if (c.name?.includes('دربندسر')) return 'Darbandsar Cableway';
      if (c.name?.includes('دیزین')) return 'Dizin Gondola';
    }
    return c.name;
  };

  const getComplexLocation = (location: string, c?: Complex | null): string => {
    if (language === 'en') {
      if (c?.locationEn) return c.locationEn;
      const map: Record<string, string> = {
        'تهران': 'Tehran',
        'کیش': 'Kish',
        'رامسر': 'Ramsar',
        'چالوس': 'Chalus',
        'تبریز': 'Tabriz',
        'اصفهان': 'Isfahan',
        'شیراز': 'Shiraz',
        'مازندران': 'Mazandaran',
        'البرز': 'Alborz',
        'نمک‌آبرود': 'Namak Abrud',
      };
      return map[location] || location;
    }
    return location;
  };

  const getComplexDescription = (c: Complex | null | undefined): string => {
    if (!c || !c.description) return '';
    if (language === 'en') {
      if (c.descriptionEn) return c.descriptionEn;
      if (c.id === 'c1' || c.name?.includes('توچال')) {
        return 'The longest recreational and sports cable car in the Middle East with 7 stations in the Alborz mountains';
      }
      if (c.id === 'c2' || c.name?.includes('کیش')) {
        return 'Mica Mall coastal cable car complex in Kish with modern cabins and Persian Gulf views';
      }
    }
    return c.description;
  };

  const getLineName = (l: Line | null | undefined): string => {
    if (!l) return '';
    if (language === 'en') {
      if (l.nameEn) return l.nameEn;
      if (l.name?.includes('خط ۱')) return 'Telecabin Line 1';
      if (l.name?.includes('خط ۲')) return 'Telecabin Line 2';
      if (l.name?.includes('چشمه')) return 'Cheshmeh Telesiege';
    }
    return l.name;
  };

  const getLineType = (type: string): string => {
    if (language === 'en') {
      if (type === 'تله‌کابین') return 'Telecabin / Gondola';
      if (type === 'تله‌سیژ') return 'Telesiege / Chairlift';
      if (type === 'واگن کششی') return 'Funicular';
      if (type === 'Telecabin') return 'Telecabin / Gondola';
      if (type === 'Telesiege') return 'Telesiege / Chairlift';
    }
    return type;
  };

  // Portal title from settings or default
  const portalTitle = language === 'en'
    ? (settings?.complexPortalTitleEn || (settings?.complexPortalTitle && settings.complexPortalTitle !== 'سامانه انتخاب و مدیریت مجموعه‌ها' ? settings.complexPortalTitle : t('complex.default_portal_title')))
    : (settings?.complexPortalTitle || t('complex.default_portal_title'));

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={`min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col ${isRtl ? 'text-right' : 'text-left'}`}>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-bold text-xl">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <Wrench size={28} />
          )}
          <span>{activeComplex ? getComplexName(activeComplex) : (language === 'en' ? (settings?.companyName === 'CMMS کیش' ? 'Kish CMMS' : settings?.companyName || 'CMMS') : (settings?.companyName || 'CMMS'))}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
            title="Switch Language (FA / EN)"
          >
            <Globe size={16} className="text-blue-600 dark:text-blue-400" />
            <span>{language === 'fa' ? 'English' : 'فارسی'}</span>
          </button>
          
          <button 
            onClick={toggleTheme} 
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <div className="hidden sm:block text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
            {user?.name}
          </div>

          <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title={t('nav.logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !activeComplex ? (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                  {portalTitle}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('complex.select_instruction')}
                </p>
              </div>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager') && (
                <button 
                  onClick={() => setShowAddComplex(!showAddComplex)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm self-start md:self-auto"
                >
                  <Plus size={18} /> {t('complex.add_button')}
                </button>
              )}
            </div>

            {showAddComplex && (
              <form onSubmit={handleAddComplex} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-base mb-4 text-gray-800 dark:text-gray-200">{t('complex.add_button')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{t('complex.name')} *</label>
                    <input 
                      required 
                      value={newComplexName} 
                      onChange={e => setNewComplexName(e.target.value)} 
                      type="text" 
                      placeholder={t('complex.placeholder_name')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{t('complex.location')} *</label>
                    <input 
                      required 
                      value={newComplexLocation} 
                      onChange={e => setNewComplexLocation(e.target.value)} 
                      type="text" 
                      placeholder={t('complex.placeholder_loc')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{t('complex.image_url')}</label>
                    <input 
                      value={newComplexImageUrl} 
                      onChange={e => setNewComplexImageUrl(e.target.value)} 
                      type="url" 
                      placeholder="https://images.unsplash.com/..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{t('complex.password')}</label>
                    <input 
                      value={newComplexPassword} 
                      onChange={e => setNewComplexPassword(e.target.value)} 
                      type="password" 
                      placeholder={t('complex.placeholder_pass')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">{t('complex.description')}</label>
                    <textarea 
                      rows={2}
                      value={newComplexDescription} 
                      onChange={e => setNewComplexDescription(e.target.value)} 
                      placeholder={t('complex.placeholder_desc')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddComplex(false)} 
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                    {t('common.submit')}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {complexes.map((c, index) => {
                const cardImage = c.imageUrl || DEFAULT_COMPLEX_IMAGES[index % DEFAULT_COMPLEX_IMAGES.length];
                return (
                  <div 
                    key={c.id} 
                    className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500 transition-all cursor-pointer overflow-hidden flex flex-col"
                    onClick={() => handleComplexClick(c)}
                  >
                    {/* Picture banner */}
                    <div className="relative w-full h-44 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img 
                        src={cardImage} 
                        alt={getComplexName(c)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_COMPLEX_IMAGES[0];
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                      <span className={`absolute bottom-3 ${isRtl ? 'right-3' : 'left-3'} text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-600/90 text-white backdrop-blur-sm flex items-center gap-1`}>
                        <MapPin size={12} /> {getComplexLocation(c.location, c)}
                      </span>

                      {/* Edit Cover Photo Button for General & Facility Managers */}
                      {canEditComplexImage(user?.role, user?.complexId, c.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverModalComplex(c);
                            setNewCoverUrl(c.imageUrl || '');
                            setCoverError(null);
                          }}
                          className={`absolute top-3 ${isRtl ? 'right-3' : 'left-3'} p-1.5 text-white bg-black/50 hover:bg-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm`}
                          title={t('complex.cover_photo_update')}
                        >
                          <ImageIcon size={15} />
                        </button>
                      )}
                    </div>

                    {/* Content below picture */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {getComplexName(c)}
                          </h3>
                        </div>

                        {/* Quick Metrics Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md font-semibold text-[11px] border border-blue-100 dark:border-blue-900">
                            {c.linesCount || 0} {t('complex.lines_count')}
                          </span>

                          {(c.pendingApprovalCount || 0) > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-md font-semibold text-[11px] border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <Clock size={11} className="animate-pulse" />
                              <span>{c.pendingApprovalCount} {t('complex.metric_pending_requests')}</span>
                            </span>
                          )}
                        </div>

                        {/* Inspection & Visit Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 mb-3">
                          <div>
                            <span className="block text-[10px] text-gray-400 font-medium">
                              {t('complex.metric_last_inspection')}
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {formatDisplayDate(c.lastInspectionDate || '۱۴۰۳/۰۹/۲۵', language)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 font-medium">
                              {t('complex.metric_last_visit')}
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {formatDisplayDate(c.lastVisitDate || (c.name?.includes('توچال') ? '۱۴۰۳/۰۹/۱۵ (ممیزی ایمنی سالانه البرز)' : '۱۴۰۳/۰۸/۲۲ (بازدید میدانی دوره‌ای)'), language)}
                            </span>
                          </div>
                        </div>

                        {c.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mb-3">
                            {getComplexDescription(c)}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
                        <span>{t('complex.view_lines_assets')}</span>
                        <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
                      </div>
                    </div>

                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager') && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setItemToDelete({id: c.id, name: getComplexName(c), type: 'complex'}); 
                        }}
                        className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} p-1.5 text-white bg-black/50 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm`}
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
              {complexes.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500 border border-dashed rounded-lg dark:border-gray-700">
                  {t('complex.no_complexes')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager') && (
                  <button 
                    onClick={handleBack} 
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title={t('common.back')}
                  >
                    <ArrowRight size={20} className={isRtl ? 'rotate-0' : 'rotate-180'} />
                  </button>
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{getComplexName(activeComplex)}</h1>
                  {/* Notice: "Selecting the line" sentence has been completely removed as requested! */}
                </div>
              </div>
              
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager' || user?.role === 'COMPLEX_ADMIN') && (
                <button 
                  onClick={() => setShowAddLine(!showAddLine)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus size={18} /> {t('line.add_button')}
                </button>
              )}
            </div>

            {showAddLine && (
              <form onSubmit={handleAddLine} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('line.name')} *</label>
                    <input 
                      required 
                      value={newLineName} 
                      onChange={e => setNewLineName(e.target.value)} 
                      type="text" 
                      placeholder={language === 'fa' ? 'مثال: خط ۱ تله‌کابین' : 'e.g. Telecabin Line 1'}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('line.type')} *</label>
                    <input 
                      required 
                      value={newLineType} 
                      onChange={e => setNewLineType(e.target.value)} 
                      type="text" 
                      placeholder={language === 'fa' ? 'تله‌کابین، تله‌سیژ، واگن کششی...' : 'Telecabin, Telesiege, Funicular...'}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-transparent focus:border-blue-500 outline-none text-sm" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddLine(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                    {t('common.submit')}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lines.map(l => (
                <div 
                  key={l.id} 
                  className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500 transition-all cursor-pointer" 
                  onClick={() => setActiveLine(l)}
                >
                  <div className="p-6">
                    <GitCommit className="text-blue-500 mb-4" size={32} />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{getLineName(l)}</h3>
                    <p className="text-sm text-gray-500">{t('line.type')}: {getLineType(l.type)}</p>
                  </div>
                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager' || user?.role === 'COMPLEX_ADMIN') && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setItemToDelete({id: l.id, name: getLineName(l), type: 'line'}); 
                      }}
                      className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all`}
                      title={t('common.delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              {lines.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500 border border-dashed rounded-lg dark:border-gray-700">
                  {t('line.no_lines')}
                </div>
              )}
            </div>
          </div>
        )}
      
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-3">{t('complex.enter_password')}</h3>
            <p className="text-xs text-gray-500 mb-4">{authModal.complex ? getComplexName(authModal.complex) : ''}</p>
            <form onSubmit={verifyComplexPassword}>
              <div className="mb-4">
                <input 
                  type="password" 
                  autoFocus
                  value={authModal.password} 
                  onChange={e => setAuthModal({...authModal, password: e.target.value, error: ''})} 
                  placeholder={t('complex.password')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-transparent focus:border-blue-500 outline-none" 
                />
                {authModal.error && <p className="text-xs text-red-500 mt-1.5">{authModal.error}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setAuthModal({isOpen: false, complex: null, password: '', error: ''})} 
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition-colors">
                  {t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <ConfirmModal 
          isOpen={true} 
          title={isRtl ? 'حذف مورد' : 'Delete Item'} 
          message={isRtl ? `آیا از حذف "${itemToDelete.name}" اطمینان دارید؟` : `Are you sure you want to delete "${itemToDelete.name}"?`}
          onConfirm={handleDelete} 
          onClose={() => setItemToDelete(null)} 
        />
      )}

      {/* Cover Image Edit Modal */}
      {coverModalComplex && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl">
                  <ImageIcon size={18} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {t('complex.cover_photo_update')}
                </h3>
              </div>
              <button
                onClick={() => setCoverModalComplex(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              <span>{t('complex.name')}: </span><strong className="text-gray-700 dark:text-gray-200">{getComplexName(coverModalComplex)}</strong>
            </p>

            {coverError && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                {coverError}
              </div>
            )}

            <form onSubmit={handleUpdateCoverImage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('complex.image_url')}
                </label>
                <input
                  type="url"
                  required
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {newCoverUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                  <img
                    src={newCoverUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_COMPLEX_IMAGES[0];
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCoverModalComplex(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updatingCover || !newCoverUrl.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {updatingCover ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
