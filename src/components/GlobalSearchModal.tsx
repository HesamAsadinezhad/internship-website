import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Wrench, 
  Activity, 
  CheckSquare, 
  Inbox, 
  Command, 
  CornerDownLeft,
  Flame,
  Gauge,
  Droplet,
  Layers,
  ArrowRight,
  Clock,
  PieChart,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  getLocalizedEquipmentName, 
  getLocalizedTaskName, 
  getLocalizedUserName 
} from '../utils/hierarchyLocalization';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchCategory = 'ALL' | 'ASSETS' | 'INSPECTIONS' | 'WORKORDERS' | 'REQUESTS';

interface FlattenedSearchResult {
  id: string;
  category: 'ASSETS' | 'INSPECTIONS' | 'WORKORDERS' | 'REQUESTS';
  title: string;
  subtitle: string;
  badge?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { t, isRtl, language } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [results, setResults] = useState<{
    assets: any[];
    workOrders: any[];
    inspections: any[];
    approvalRequests: any[];
  }>({ assets: [], workOrders: [], inspections: [], approvalRequests: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults({ assets: [], workOrders: [], inspections: [], approvalRequests: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ assets: [], workOrders: [], inspections: [], approvalRequests: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults({
            assets: Array.isArray(data.assets) ? data.assets : [],
            workOrders: Array.isArray(data.workOrders) ? data.workOrders : [],
            inspections: Array.isArray(data.inspections) ? data.inspections : [],
            approvalRequests: Array.isArray(data.approvalRequests) ? data.approvalRequests : [],
          });
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'THERMOGRAPHY':
        return <Flame size={16} className="text-amber-500" />;
      case 'VIBRATION':
        return <Activity size={16} className="text-blue-500" />;
      case 'OIL':
        return <Droplet size={16} className="text-purple-500" />;
      case 'MFL':
        return <Layers size={16} className="text-emerald-500" />;
      default:
        return <Gauge size={16} className="text-cyan-500" />;
    }
  };

  // Flatten active results for clean keyboard navigation
  const flattenedItems = useMemo<FlattenedSearchResult[]>(() => {
    const items: FlattenedSearchResult[] = [];

    if (activeCategory === 'ALL' || activeCategory === 'ASSETS') {
      results.assets.forEach((asset) => {
        items.push({
          id: `asset-${asset.id}`,
          category: 'ASSETS',
          title: getLocalizedEquipmentName(asset.name, language),
          subtitle: `${asset.code || ''} ${asset.description ? '• ' + asset.description.slice(0, 60) : ''}`,
          badge: asset.code,
          icon: <Wrench size={16} className="text-blue-600 dark:text-blue-400" />,
          onSelect: () => {
            onClose();
            navigate(`/equipments/${asset.id}`);
          },
        });
      });
    }

    if (activeCategory === 'ALL' || activeCategory === 'INSPECTIONS') {
      results.inspections.forEach((insp, idx) => {
        items.push({
          id: `insp-${idx}`,
          category: 'INSPECTIONS',
          title: insp.equipmentName ? getLocalizedEquipmentName(insp.equipmentName, language) : (insp.label || 'CM Inspection'),
          subtitle: `${insp.dateJalali || insp.date || ''} ${insp.notes ? '• ' + insp.notes.slice(0, 60) : ''}`,
          badge: insp.domain,
          icon: getDomainIcon(insp.domain),
          onSelect: () => {
            onClose();
            navigate('/condition-monitoring');
          },
        });
      });
    }

    if (activeCategory === 'ALL' || activeCategory === 'WORKORDERS') {
      results.workOrders.forEach((task) => {
        items.push({
          id: `task-${task.id}`,
          category: 'WORKORDERS',
          title: getLocalizedTaskName(task.subject, language),
          subtitle: `${t('search.frequency')}: ${task.frequency || '-'} • ${t('search.standard')}: ${task.standard || 'General'}`,
          badge: task.frequency,
          icon: <CheckSquare size={16} className="text-purple-600 dark:text-purple-400" />,
          onSelect: () => {
            onClose();
            navigate(`/equipments/${task.equipmentId}`);
          },
        });
      });
    }

    if (activeCategory === 'ALL' || activeCategory === 'REQUESTS') {
      results.approvalRequests.forEach((reqItem) => {
        const actionLabel = reqItem.actionType === 'DELETE' ? t('search.action_delete') : t('search.action_edit');
        const targetTitle = reqItem.targetEntityType === 'EQUIPMENT' 
          ? getLocalizedEquipmentName(reqItem.targetEntityName, language)
          : reqItem.targetEntityType === 'TASK'
          ? getLocalizedTaskName(reqItem.targetEntityName, language)
          : (reqItem.targetEntityName || '');

        items.push({
          id: `req-${reqItem.id}`,
          category: 'REQUESTS',
          title: `${actionLabel}: ${targetTitle}`,
          subtitle: `${t('search.requester')}: ${getLocalizedUserName(reqItem.initiatorName, language) || '-'} • ${t('search.status')}: ${reqItem.status || '-'}`,
          badge: reqItem.status,
          icon: <Inbox size={16} className="text-amber-600 dark:text-amber-400" />,
          onSelect: () => {
            onClose();
            navigate('/requests');
          },
        });
      });
    }

    return items;
  }, [results, activeCategory, t, language, navigate, onClose]);

  // Handle keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (flattenedItems.length > 0 ? (prev + 1) % flattenedItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (flattenedItems.length > 0 ? (prev - 1 + flattenedItems.length) % flattenedItems.length : 0));
      } else if (e.key === 'Enter') {
        if (flattenedItems[selectedIndex]) {
          e.preventDefault();
          flattenedItems[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flattenedItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  const totalResultsCount = 
    results.assets.length + 
    results.workOrders.length + 
    results.inspections.length + 
    results.approvalRequests.length;

  const quickNavLinks = [
    {
      title: t('nav.stations_equipments'),
      subtitle: isRtl ? 'مشاهده ساختار درختی و تجهیزات' : 'Browse equipment hierarchy',
      icon: <Wrench size={18} className="text-blue-500" />,
      action: () => { onClose(); navigate('/'); }
    },
    {
      title: t('nav.condition_monitoring'),
      subtitle: isRtl ? 'آنالیز ارتعاشات، روغن، MFL، ترموگرافی و NDT' : 'Vibration, Oil, MFL, Thermography & NDT',
      icon: <Activity size={18} className="text-emerald-500" />,
      action: () => { onClose(); navigate('/condition-monitoring'); }
    },
    {
      title: t('nav.requests_inbox'),
      subtitle: isRtl ? 'کارتابل تاییدیه و گردش‌کار درخواست‌ها' : 'Review & approve workflow requests',
      icon: <Inbox size={18} className="text-amber-500" />,
      action: () => { onClose(); navigate('/requests'); }
    },
    {
      title: t('nav.downtimes'),
      subtitle: isRtl ? 'گزارش و ثبت توقفات و خرابی‌ها' : 'Downtime & failure incidents',
      icon: <Clock size={18} className="text-rose-500" />,
      action: () => { onClose(); navigate('/downtimes'); }
    },
    {
      title: t('nav.analytics'),
      subtitle: isRtl ? 'شاخص‌های MTBF, MTTR و عملکرد' : 'KPIs, MTBF, MTTR and availability',
      icon: <PieChart size={18} className="text-indigo-500" />,
      action: () => { onClose(); navigate('/analytics'); }
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-20 bg-black/65 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-gray-700/80 overflow-hidden flex flex-col max-h-[82vh] transition-all"
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/30">
          <Search size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.input_placeholder')}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 text-sm font-medium outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          {query ? (
            <button 
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={isRtl ? 'پاک کردن' : 'Clear'}
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filter Pills (When user has searched or results exist) */}
        {query.trim().length > 0 && (
          <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => { setActiveCategory('ALL'); setSelectedIndex(0); }}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
              }`}
            >
              {t('search.category_all')} ({totalResultsCount})
            </button>
            <button
              onClick={() => { setActiveCategory('ASSETS'); setSelectedIndex(0); }}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                activeCategory === 'ASSETS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
              }`}
            >
              {t('search.category_assets')} ({results.assets.length})
            </button>
            <button
              onClick={() => { setActiveCategory('INSPECTIONS'); setSelectedIndex(0); }}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                activeCategory === 'INSPECTIONS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
              }`}
            >
              {t('search.category_inspections')} ({results.inspections.length})
            </button>
            <button
              onClick={() => { setActiveCategory('WORKORDERS'); setSelectedIndex(0); }}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                activeCategory === 'WORKORDERS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
              }`}
            >
              {t('search.category_workorders')} ({results.workOrders.length})
            </button>
            <button
              onClick={() => { setActiveCategory('REQUESTS'); setSelectedIndex(0); }}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
                activeCategory === 'REQUESTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
              }`}
            >
              {t('search.category_requests')} ({results.approvalRequests.length})
            </button>
          </div>
        )}

        {/* Modal Body / Results */}
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500 font-medium">{t('common.loading')}</span>
            </div>
          )}

          {/* Empty search: Show Quick Access Navigation */}
          {!loading && !query.trim() && (
            <div className="py-2">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-2">
                {t('search.recent_views')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickNavLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={link.action}
                    className="p-3 bg-gray-50/70 dark:bg-gray-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-100 dark:border-gray-700/70 hover:border-blue-200 dark:hover:border-blue-800 rounded-xl text-start transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                        {link.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {link.title}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                          {link.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition shrink-0" />
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2 text-xs text-gray-400 px-2">
                <Command size={14} className="opacity-60" />
                <span>{t('search.quick_tip')}</span>
              </div>
            </div>
          )}

          {/* No results for query */}
          {!loading && query.trim() && flattenedItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('search.no_results')}</p>
              <p className="text-[11px] text-gray-400 mt-1">{isRtl ? 'عبارت دیگری را امتحان کنید یا فیلترها را تغییر دهید.' : 'Try a different term or adjust category filters.'}</p>
            </div>
          )}

          {/* Flattened active results */}
          {!loading && query.trim() && flattenedItems.length > 0 && (
            <div className="space-y-1">
              {flattenedItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between group transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isSelected 
                          ? 'bg-blue-100 dark:bg-blue-900/60' 
                          : 'bg-gray-100 dark:bg-gray-700/60'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${
                            isSelected 
                              ? 'text-blue-900 dark:text-blue-200' 
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                          <CornerDownLeft size={12} />
                          <span>{t('search.select_hint')}</span>
                        </span>
                      )}
                      <ArrowRight size={14} className={`text-gray-300 dark:text-gray-600 transition ${
                        isSelected 
                          ? 'text-blue-500 dark:text-blue-400 opacity-100 translate-x-0.5 rtl:-translate-x-0.5' 
                          : 'opacity-0 group-hover:opacity-100'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Command Helpers */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-[10px]">↓</kbd>
              <span>{t('search.navigate_hint')}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-[10px]">↵</kbd>
              <span>{t('search.select_hint')}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono text-[10px]">ESC</kbd>
            <span>{t('search.close_hint')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
