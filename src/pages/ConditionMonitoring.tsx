import React, { useState } from 'react';
import {
  Activity,
  Flame,
  Droplet,
  Wrench,
  Cable,
  FileCheck,
  ShieldAlert,
  FileText,
  Eye,
  TrendingUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Import the specialized CM domain modules
import VibrationAnalysisModule from '../components/cm/VibrationAnalysisModule';
import ThermographyModule from '../components/cm/ThermographyModule';
import OilAnalysisModule from '../components/cm/OilAnalysisModule';
import LubricationManagementModule from '../components/cm/LubricationManagementModule';
import MflCableTestingModule from '../components/cm/MflCableTestingModule';
import NdtModule from '../components/cm/NdtModule';
import AllCmReportsModal from '../components/cm/AllCmReportsModal';
import QualitativeCmReports from '../components/cm/QualitativeCmReports';

type CMSubDomain = 
  | 'qualitative_reports'
  | 'thermography'
  | 'vibration'
  | 'oil_analysis'
  | 'lubrication'
  | 'mfl_cable'
  | 'ndt';

export default function ConditionMonitoring() {
  const { isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<CMSubDomain>('qualitative_reports');
  const [showAllReportsModal, setShowAllReportsModal] = useState(false);

  const tabs: { id: CMSubDomain; labelFa: string; labelEn: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'qualitative_reports',
      labelFa: 'گزارش‌های کیفی و تحلیل روند',
      labelEn: 'Qualitative Reports & KPIs',
      icon: <TrendingUp size={17} />,
      color: 'indigo'
    },
    {
      id: 'vibration',
      labelFa: 'آنالیز ارتعاشات (ISO 20816)',
      labelEn: 'Vibration Analysis (ISO 20816)',
      icon: <Activity size={17} />,
      color: 'blue'
    },
    {
      id: 'thermography',
      labelFa: 'ترموگرافی و تصویربرداری حرارتی',
      labelEn: 'Thermography (Thermal Scan)',
      icon: <Flame size={17} />,
      color: 'orange'
    },
    {
      id: 'oil_analysis',
      labelFa: 'آنالیز آزمایشگاهی روغن',
      labelEn: 'Oil Analysis Laboratory',
      icon: <Droplet size={17} />,
      color: 'amber'
    },
    {
      id: 'lubrication',
      labelFa: 'مدیریت روانکاری ۴ تجهیز',
      labelEn: 'Lubrication Management',
      icon: <Wrench size={17} />,
      color: 'teal'
    },
    {
      id: 'mfl_cable',
      labelFa: 'تست MFL کابل (نشت شار مغناطیسی)',
      labelEn: 'MFL Cable Testing',
      icon: <Cable size={17} />,
      color: 'purple'
    },
    {
      id: 'ndt',
      labelFa: 'آزمون‌های غیرمخرب (NDT)',
      labelEn: 'Non-Destructive Testing (NDT)',
      icon: <FileCheck size={17} />,
      color: 'cyan'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-16 px-2 sm:px-4 space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800/90 p-5 md:p-6 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 font-mono uppercase tracking-wider">
            <span>CMMS Condition Monitoring Engine</span>
            <span>•</span>
            <span>ISO 20816 / EN 12927 / EN 1709</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100">
            {isRtl ? 'سیستم پایش وضعیت' : 'Condition Monitoring (CM)'}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            {isRtl
              ? 'شامل تمامی تست‌ها'
              : 'Including all tests'}
          </p>
        </div>

        {/* View All Reports Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAllReportsModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
            title={isRtl ? 'مشاهده تمام گزارش‌ها با جزئیات کامل برای تمام تست‌های CM' : 'View every report with details for all CM tests'}
          >
            <Eye size={17} />
            <span>
              {isRtl
                ? 'مشاهده تمام گزارش‌ها با جزئیات کامل (همه تست‌های CM)'
                : 'View All Reports with Details (All CM Tests)'}
            </span>
          </button>
        </div>
      </div>

      {/* 6-Subdomain Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {t.icon}
                </span>
                <span className="truncate">{isRtl ? t.labelFa.split('(')[0] : t.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Panel */}
      <div className="transition-opacity duration-150">
        {activeTab === 'qualitative_reports' && <QualitativeCmReports />}
        {activeTab === 'vibration' && <VibrationAnalysisModule />}
        {activeTab === 'thermography' && <ThermographyModule />}
        {activeTab === 'oil_analysis' && <OilAnalysisModule />}
        {activeTab === 'lubrication' && <LubricationManagementModule />}
        {activeTab === 'mfl_cable' && <MflCableTestingModule />}
        {activeTab === 'ndt' && <NdtModule />}
      </div>

      {/* ALL CM REPORTS & DETAILED TESTS MODAL */}
      {showAllReportsModal && (
        <AllCmReportsModal onClose={() => setShowAllReportsModal(false)} />
      )}
    </div>
  );
}
