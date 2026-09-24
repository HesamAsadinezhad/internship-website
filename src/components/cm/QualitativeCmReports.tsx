import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Flame, 
  Droplet, 
  Layers, 
  ShieldCheck, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  BarChart3,
  PieChart as PieIcon,
  Filter,
  Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  CmVibrationRecord, 
  CmThermographyRecord, 
  CmOilAnalysisRecord, 
  CmMflRecord, 
  CmNdtRecord 
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { getLocalizedEquipmentName } from '../../utils/hierarchyLocalization';
import { printExecutiveCmReport } from '../../utils/cmReportPrint';

interface QualitativeCmReportsProps {
  vibrations?: CmVibrationRecord[];
  thermographies?: CmThermographyRecord[];
  oils?: CmOilAnalysisRecord[];
  mfls?: CmMflRecord[];
  ndts?: CmNdtRecord[];
}

type SubDomainKey = 'EXECUTIVE' | 'VIBRATION' | 'THERMOGRAPHY' | 'OIL' | 'MFL' | 'NDT';
type DateRangePreset = '30D' | '90D' | 'YTD' | 'ALL';

export default function QualitativeCmReports({
  vibrations: initialVibrations,
  thermographies: initialThermographies,
  oils: initialOils,
  mfls: initialMfls,
  ndts: initialNdts,
}: QualitativeCmReportsProps) {
  const { t, isRtl, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubDomainKey>('EXECUTIVE');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('ALL');

  const [vibrations, setVibrations] = useState<CmVibrationRecord[]>(initialVibrations || []);
  const [thermographies, setThermographies] = useState<CmThermographyRecord[]>(initialThermographies || []);
  const [oils, setOils] = useState<CmOilAnalysisRecord[]>(initialOils || []);
  const [mfls, setMfls] = useState<CmMflRecord[]>(initialMfls || []);
  const [ndts, setNdts] = useState<CmNdtRecord[]>(initialNdts || []);

  React.useEffect(() => {
    const loadAllData = async () => {
      try {
        const [vRes, tRes, oRes, mRes, nRes] = await Promise.all([
          fetch('/api/cm/vibration'),
          fetch('/api/cm/thermography'),
          fetch('/api/cm/oil'),
          fetch('/api/cm/mfl'),
          fetch('/api/cm/ndt')
        ]);
        if (vRes.ok) { const d = await vRes.json(); setVibrations(d); }
        if (tRes.ok) { const d = await tRes.json(); setThermographies(d); }
        if (oRes.ok) { const d = await oRes.json(); setOils(d); }
        if (mRes.ok) { const d = await mRes.json(); setMfls(d); }
        if (nRes.ok) { const d = await nRes.json(); setNdts(d); }
      } catch (err) {
        console.error('Failed loading CM qualitative data', err);
      }
    };
    loadAllData();
  }, []);

  // Filter records by date preset
  const filterByDate = <T extends { date?: string }>(items: T[]): T[] => {
    if (datePreset === 'ALL') return items;
    const now = new Date().getTime();
    let cutoff = 0;
    if (datePreset === '30D') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    if (datePreset === '90D') cutoff = now - 90 * 24 * 60 * 60 * 1000;
    if (datePreset === 'YTD') {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      cutoff = yearStart;
    }
    return items.filter((item) => {
      if (!item.date) return true;
      const itemTime = new Date(item.date).getTime();
      return isNaN(itemTime) || itemTime >= cutoff;
    });
  };

  const filteredVibrations = useMemo(() => filterByDate(vibrations), [vibrations, datePreset]);
  const filteredThermographies = useMemo(() => filterByDate(thermographies), [thermographies, datePreset]);
  const filteredOils = useMemo(() => filterByDate(oils), [oils, datePreset]);
  const filteredMfls = useMemo(() => filterByDate(mfls), [mfls, datePreset]);
  const filteredNdts = useMemo(() => filterByDate(ndts), [ndts, datePreset]);

  // --- KPI CALCULATIONS ---
  // Vibration ISO 20816 Zone breakdown
  const vibZoneCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    filteredVibrations.forEach((v) => {
      const z = v.isoZone;
      if (z === 'A') counts.A++;
      else if (z === 'B') counts.B++;
      else if (z === 'C') counts.C++;
      else if (z === 'D') counts.D++;
      else counts.B++;
    });
    return [
      { name: isRtl ? 'زون A (بسیار مطلوب)' : 'Zone A (Good)', value: counts.A, color: '#10b981' },
      { name: isRtl ? 'زون B (قابل قبول)' : 'Zone B (Acceptable)', value: counts.B, color: '#3b82f6' },
      { name: isRtl ? 'زون C (هشدار)' : 'Zone C (Warning)', value: counts.C, color: '#f59e0b' },
      { name: isRtl ? 'زون D (خطر)' : 'Zone D (Danger)', value: counts.D, color: '#ef4444' },
    ];
  }, [filteredVibrations, isRtl]);

  // Overall Machine Health Index (0-100)
  const machineHealthIndex = useMemo(() => {
    let totalScore = 0;
    let totalItems = 0;

    filteredVibrations.forEach((v) => {
      totalItems++;
      if (v.isoZone === 'A') totalScore += 100;
      else if (v.isoZone === 'B') totalScore += 85;
      else if (v.isoZone === 'C') totalScore += 50;
      else if (v.isoZone === 'D') totalScore += 15;
      else totalScore += 80;
    });

    filteredThermographies.forEach((t) => {
      totalItems++;
      if (t.severity === 'NORMAL') totalScore += 100;
      else if (t.severity === 'WARNING') totalScore += 60;
      else if (t.severity === 'CRITICAL') totalScore += 20;
      else totalScore += 80;
    });

    filteredOils.forEach((o) => {
      totalItems++;
      if (o.status === 'NORMAL') totalScore += 100;
      else if (o.status === 'WARNING') totalScore += 65;
      else if (o.status === 'CRITICAL') totalScore += 25;
      else totalScore += 80;
    });

    filteredMfls.forEach((m) => {
      totalItems++;
      if (m.maxLmaPercent < 4) totalScore += 100;
      else if (m.maxLmaPercent < 6) totalScore += 75;
      else if (m.maxLmaPercent < 8) totalScore += 45;
      else totalScore += 10;
    });

    filteredNdts.forEach((n) => {
      totalItems++;
      if (n.testResult === 'PASS') totalScore += 100;
      else if (n.testResult === 'FAIL') totalScore += 20;
      else totalScore += 75;
    });

    if (totalItems === 0) return 92;
    return Math.round(totalScore / totalItems);
  }, [filteredVibrations, filteredThermographies, filteredOils, filteredMfls, filteredNdts]);

  // Subdomain Compliance Scores
  const subdomainCompliance = useMemo(() => {
    const calcDomain = (good: number, total: number) => total === 0 ? 100 : Math.round((good / total) * 100);

    const vibGood = filteredVibrations.filter(v => v.isoZone === 'A' || v.isoZone === 'B').length;
    const thermGood = filteredThermographies.filter(t => t.severity === 'NORMAL').length;
    const oilGood = filteredOils.filter(o => o.status === 'NORMAL').length;
    const mflGood = filteredMfls.filter(m => m.maxLmaPercent < 6).length;
    const ndtGood = filteredNdts.filter(n => n.testResult === 'PASS').length;

    return [
      { name: isRtl ? 'ارتعاشات' : 'Vibration', compliance: calcDomain(vibGood, filteredVibrations.length) },
      { name: isRtl ? 'ترموگرافی' : 'Thermal', compliance: calcDomain(thermGood, filteredThermographies.length) },
      { name: isRtl ? 'آنالیز روغن' : 'Oil', compliance: calcDomain(oilGood, filteredOils.length) },
      { name: isRtl ? 'کابل فولادی MFL' : 'MFL Wire', compliance: calcDomain(mflGood, filteredMfls.length) },
      { name: isRtl ? 'آزمون NDT' : 'NDT', compliance: calcDomain(ndtGood, filteredNdts.length) },
    ];
  }, [filteredVibrations, filteredThermographies, filteredOils, filteredMfls, filteredNdts, isRtl]);

  // Time-series vibration chart data
  const vibrationTimeSeries = useMemo(() => {
    return filteredVibrations
      .slice(-15)
      .map((v, idx) => ({
        point: v.pointName ? getLocalizedEquipmentName(v.pointName, language) : `${isRtl ? 'نقطه' : 'Point'} ${idx + 1}`,
        velocity: v.overallVelocityRms || 2.5,
        date: isRtl ? (v.dateJalali || v.date || '') : (v.dateGregorian || v.date || v.dateJalali || ''),
        zone: v.isoZone || 'B'
      }));
  }, [filteredVibrations, isRtl, language]);

  // Time-series MFL wire rope LMA% trend data
  const mflTimeSeries = useMemo(() => {
    return filteredMfls
      .slice(-15)
      .map((m, idx) => ({
        rope: m.ropeName ? getLocalizedEquipmentName(m.ropeName, language) : `${isRtl ? 'کابل' : 'Rope'} ${idx + 1}`,
        lma: m.maxLmaPercent || 0,
        date: isRtl ? (m.dateJalali || m.date || '') : (m.dateGregorian || m.date || m.dateJalali || ''),
      }));
  }, [filteredMfls, isRtl, language]);

  // Thermography delta T trend
  const thermalTimeSeries = useMemo(() => {
    return filteredThermographies
      .slice(-15)
      .map((t, idx) => ({
        component: t.componentName ? getLocalizedEquipmentName(t.componentName, language) : `${isRtl ? 'اتصال' : 'Comp'} ${idx + 1}`,
        deltaT: t.deltaT || (t.maxTemp - t.ambientTemp) || 12,
        date: isRtl ? (t.dateJalali || t.date || '') : (t.dateGregorian || t.date || t.dateJalali || ''),
      }));
  }, [filteredThermographies, isRtl, language]);

  const handlePrint = () => {
    const totalRecords = filteredVibrations.length + filteredThermographies.length + filteredOils.length + filteredMfls.length + filteredNdts.length;
    const zoneCounts = {
      zoneA: vibZoneCounts.find(z => z.name.includes('A'))?.value || 0,
      zoneB: vibZoneCounts.find(z => z.name.includes('B'))?.value || 0,
      zoneC: vibZoneCounts.find(z => z.name.includes('C'))?.value || 0,
      zoneD: vibZoneCounts.find(z => z.name.includes('D'))?.value || 0,
    };
    const subDomainStats = [
      { name: isRtl ? 'آنالیز ارتعاشات' : 'Vibration', total: filteredVibrations.length, normal: filteredVibrations.filter(v => v.isoZone === 'A' || v.isoZone === 'B').length, compliance: subdomainCompliance[0]?.compliance || 100 },
      { name: isRtl ? 'ترموگرافی' : 'Thermography', total: filteredThermographies.length, normal: filteredThermographies.filter(t => t.severity === 'NORMAL').length, compliance: subdomainCompliance[1]?.compliance || 100 },
      { name: isRtl ? 'آنالیز روغن' : 'Oil Lab', total: filteredOils.length, normal: filteredOils.filter(o => o.status === 'NORMAL').length, compliance: subdomainCompliance[2]?.compliance || 100 },
      { name: isRtl ? 'کابل MFL' : 'MFL Cable', total: filteredMfls.length, normal: filteredMfls.filter(m => m.maxLmaPercent < 6).length, compliance: subdomainCompliance[3]?.compliance || 100 },
      { name: isRtl ? 'آزمون NDT' : 'NDT Tests', total: filteredNdts.length, normal: filteredNdts.filter(n => n.testResult === 'PASS').length, compliance: subdomainCompliance[4]?.compliance || 100 },
    ];
    printExecutiveCmReport({
      machineHealthIndex,
      totalRecords,
      zoneCounts,
      subDomainStats,
      dateRangeLabel: datePreset === '30D' ? t('cm.range_last_30') :
                      datePreset === '90D' ? t('cm.range_last_90') :
                      datePreset === 'YTD' ? t('cm.range_ytd') : t('cm.range_all')
    }, { isRtl });
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header & Range Selection */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('cm.qualitative_reports_title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('cm.qualitative_reports_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setDatePreset('30D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                datePreset === '30D' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {t('cm.range_last_30')}
            </button>
            <button
              onClick={() => setDatePreset('90D')}
              className={`px-3 py-1.5 rounded-lg transition ${
                datePreset === '90D' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {t('cm.range_last_90')}
            </button>
            <button
              onClick={() => setDatePreset('YTD')}
              className={`px-3 py-1.5 rounded-lg transition ${
                datePreset === 'YTD' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {t('cm.range_ytd')}
            </button>
            <button
              onClick={() => setDatePreset('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                datePreset === 'ALL' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {t('cm.range_all')}
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer size={15} />
            <span>{t('common.print')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Domain Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'EXECUTIVE', label: t('cm.executive_report_title'), icon: ShieldCheck },
          { key: 'VIBRATION', label: t('cm.domain_vibration'), icon: Activity },
          { key: 'THERMOGRAPHY', label: t('cm.domain_thermography'), icon: Flame },
          { key: 'OIL', label: t('cm.domain_oil'), icon: Droplet },
          { key: 'MFL', label: t('cm.domain_mfl'), icon: Layers },
          { key: 'NDT', label: t('cm.domain_ndt'), icon: FileText },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as SubDomainKey)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap shadow-sm ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: EXECUTIVE SUMMARY */}
      {activeTab === 'EXECUTIVE' && (
        <div className="space-y-6">
          {/* Top Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Machine Health Index */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t('cm.machine_health_index')}
                  </span>
                  <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">
                    {machineHealthIndex}%
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${
                  machineHealthIndex >= 85 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                    : machineHealthIndex >= 70
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <ShieldCheck size={26} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                {machineHealthIndex >= 85 
                  ? t('cm.health_optimal_desc') 
                  : t('cm.health_warning_desc')}
              </div>
            </div>

            {/* Total CM Tests Done */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t('cm.total_tests')}
                  </span>
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                    {filteredVibrations.length + filteredThermographies.length + filteredOils.length + filteredMfls.length + filteredNdts.length}
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl">
                  <Activity size={26} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                {t('cm.total_tests_subtitle')}
              </div>
            </div>

            {/* Critical Alerts */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t('cm.critical_alerts')}
                  </span>
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                    {filteredVibrations.filter(v => v.isoZone === 'D').length + 
                     filteredThermographies.filter(t => t.severity === 'CRITICAL').length +
                     filteredMfls.filter(m => m.maxLmaPercent >= 8).length}
                  </div>
                </div>
                <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-xl">
                  <AlertTriangle size={26} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                {t('cm.critical_alerts_desc')}
              </div>
            </div>

            {/* NDT / Wire Rope Discard Alerts */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t('cm.ndt_compliance')}
                  </span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {filteredNdts.length > 0 
                      ? Math.round((filteredNdts.filter(n => n.testResult === 'PASS').length / filteredNdts.length) * 100)
                      : 100}%
                  </div>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl">
                  <CheckCircle size={26} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                {t('cm.ndt_compliance_desc')}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sub-domain compliance bar chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                <span>{t('cm.subdomain_compliance')}</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subdomainCompliance}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="compliance" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {subdomainCompliance.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.compliance >= 80 ? '#10b981' : entry.compliance >= 60 ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ISO 20816 Vibration Zone Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-indigo-600" />
                <span>{t('cm.zone_transitions')}</span>
              </h3>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vibZoneCounts}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {vibZoneCounts.map((entry, index) => (
                        <Cell key={`zone-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VIBRATION ANALYSIS */}
      {activeTab === 'VIBRATION' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {t('cm.vibration_trend_title')}
                </h3>
                <span className="text-xs text-gray-400">
                  {t('cm.vibration_trend_subtitle')}
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vibrationTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="point" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={4.5} stroke="#f59e0b" strokeDasharray="4 4" label={isRtl ? 'هشدار زون C (۴.۵)' : 'Zone C Warning (4.5)'} />
                  <ReferenceLine y={7.1} stroke="#ef4444" strokeDasharray="4 4" label={isRtl ? 'بحرانی زون D (۷.۱)' : 'Zone D Danger (7.1)'} />
                  <Line type="monotone" dataKey="velocity" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MFL WIRE ROPE */}
      {activeTab === 'MFL' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {t('cm.lma_trend')}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {t('cm.mfl_trend_subtitle')}
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mflTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="rope" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={6.0} stroke="#f59e0b" strokeDasharray="4 4" label={isRtl ? 'حد هشدار (۶٪)' : 'Warning Limit (6%)'} />
                  <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="4 4" label={isRtl ? 'حد اسقاط (۸٪)' : 'Discard Limit (8%)'} />
                  <Line type="monotone" dataKey="lma" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: THERMOGRAPHY */}
      {activeTab === 'THERMOGRAPHY' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {t('cm.thermography_trend_title')}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {t('cm.thermography_trend_subtitle')}
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={thermalTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="component" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 45]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="4 4" label={isRtl ? 'هشدار ΔT (۱۵°C)' : 'ΔT Warning (15°C)'} />
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={isRtl ? 'بحرانی ΔT (۳۰°C)' : 'ΔT Critical (30°C)'} />
                  <Bar dataKey="deltaT" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OIL & NDT */}
      {(activeTab === 'OIL' || activeTab === 'NDT') && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <FileText size={42} className="mx-auto mb-3 text-indigo-500 opacity-60" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('cm.qualitative_detail_title')} - {activeTab === 'OIL' ? (isRtl ? 'آنالیز روغن' : 'Oil Laboratory Analysis') : (isRtl ? 'آزمون‌های غیرمخرب (NDT)' : 'Non-Destructive Testing (NDT)')}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {t('cm.qualitative_detail_desc')}
          </p>
        </div>
      )}
    </div>
  );
}
