import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useHierarchy } from '../context/HierarchyContext';
import { useLanguage } from '../context/LanguageContext';
import { User as UserIcon } from 'lucide-react';
import DataGrid from '../components/DataGrid';
import { getLocalizedLogAction, getLocalizedLogDetails } from '../utils/logLocalization';
import { getLocalizedUserName } from '../utils/hierarchyLocalization';

export default function Logs() {
  const { activeComplex, activeLine } = useHierarchy();
  const { user } = useAuth();
  const { t, isRtl, language } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'manager' || user?.role === 'SUPER_ADMIN' || user?.role === 'COMPLEX_ADMIN') {
      fetch(`/api/logs?${activeLine ? 'lineId='+activeLine.id : activeComplex ? 'complexId='+activeComplex.id : ''}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) setLogs(data.reverse());
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [user, activeLine, activeComplex]);

  if (user?.role !== 'manager' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMPLEX_ADMIN') {
    return <div className="p-8 text-center text-red-500">{t('common.access_denied', 'شما دسترسی به این صفحه را ندارید.')}</div>;
  }

  const columns: any[] = [
    {
      header: t('logs.user', 'کاربر'),
      accessor: (row: ActivityLog) => getLocalizedUserName(row.userName, language),
      cell: (row: ActivityLog) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <UserIcon size={14} />
          </div>
          <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
            {getLocalizedUserName(row.userName, language)}
          </span>
        </div>
      )
    },
    {
      header: t('logs.action', 'عملیات'),
      accessor: (row: ActivityLog) => getLocalizedLogAction(row.action, language),
      cell: (row: ActivityLog) => (
        <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
          {getLocalizedLogAction(row.action, language)}
        </span>
      )
    },
    {
      header: t('logs.details', 'توضیحات'),
      accessor: (row: ActivityLog) => getLocalizedLogDetails(row.details, language),
      cell: (row: ActivityLog) => (
        <span className="text-gray-600 dark:text-gray-300 text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          {getLocalizedLogDetails(row.details, language)}
        </span>
      )
    },
    {
      header: t('logs.timestamp', 'زمان (تاریخ و ساعت)'),
      accessor: 'timestamp',
      cell: (row: ActivityLog) => {
        const d = new Date(row.timestamp);
        const gregorianStr = new Intl.DateTimeFormat('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', 
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: true
        }).format(d);
        const jalaliStr = new Intl.DateTimeFormat('fa-IR', { 
          year: 'numeric', month: '2-digit', day: '2-digit', 
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(d);

        return (
          <div className={`flex flex-col text-xs font-mono ${isRtl ? 'text-right' : 'text-left'}`}>
            <span className="font-medium text-gray-800 dark:text-gray-200" dir="ltr">
              {isRtl ? jalaliStr : gregorianStr}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5" dir="ltr">
              {isRtl ? gregorianStr : jalaliStr}
            </span>
          </div>
        );
      }
    }
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('logs.title', 'گزارش عملکرد (Audit Logs)')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('logs.subtitle', 'تاریخچه ورود و خروج و تمامی فعالیت‌های کاربران سیستم')}
        </p>
      </div>
      
      {loading ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {t('logs.loading', 'در حال دریافت لاگ‌ها...')}
        </div>
      ) : (
        <DataGrid 
          data={logs} 
          columns={columns} 
          fileName={t('logs.filename', 'گزارش_عملکرد_سیستم')}
          searchPlaceholder={t('logs.search_placeholder', 'جستجو در نام کاربر، عملیات، توضیحات...')}
        />
      )}
    </div>
  );
}
