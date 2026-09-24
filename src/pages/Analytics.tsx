import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, BarChart2 } from 'lucide-react';
import { useHierarchy } from '../context/HierarchyContext';
import { useLanguage } from '../context/LanguageContext';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export default function Analytics() {
  const { activeComplex, activeLine } = useHierarchy();
  const { t, isRtl } = useLanguage();
  const [data, setData] = useState({
    tasks: [],
    inspections: [],
    downtimes: []
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeLine) params.append('lineId', activeLine.id);
    else if (activeComplex) params.append('complexId', activeComplex.id);
    
    Promise.all([
      fetch(`/api/tasks?${params.toString()}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/inspections?${params.toString()}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/downtimes?${params.toString()}`).then(r => r.ok ? r.json() : [])
    ]).then(([tasks, inspections, downtimes]) => {
      setData({ 
        tasks: Array.isArray(tasks) ? tasks : [], 
        inspections: Array.isArray(inspections) ? inspections : [], 
        downtimes: Array.isArray(downtimes) ? downtimes : [] 
      });
    }).catch(() => {});
  }, [activeComplex, activeLine]);

  const totalTasks = data.tasks.length;
  
  // Dynamic Compliance Data based on tasks and inspections
  let onTime = 0;
  let delayed = 0;
  let pending = 0;

  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('fa-IR').format(now);

  data.tasks.forEach((task: any) => {
    if (!task.lastDate && !task.nextDate) {
      pending++;
      return;
    }
    
    if (task.nextDate) {
      if (task.nextDate < todayStr) {
        delayed++;
      } else {
        onTime++;
      }
    } else if (task.lastDate) {
      onTime++;
    } else {
      pending++;
    }
  });

  const complianceData = [
    { name: t('analytics.on_time', 'انجام شده (به موقع)'), value: onTime, color: '#10b981' },
    { name: t('analytics.delayed', 'تاخیر خورده'), value: delayed, color: '#f59e0b' },
    { name: t('analytics.pending', 'معوق / در انتظار'), value: pending, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const getTranslatedReason = (r: string) => {
    if (isRtl) return r;
    switch (r) {
      case 'نقص مکانیکی': return 'Mechanical';
      case 'نقص الکتریکی': return 'Electrical';
      case 'قطعی برق': return 'Power Outage';
      case 'شرایط جوی':
      case 'شرایط جوی / باد': return 'Weather';
      case 'توقف عملیاتی':
      case 'توقف عملیاتی مسافر': return 'Passenger Ops';
      case 'ایست اضطراری':
      case 'ایست اضطراری': return 'Emergency Stop';
      default: return r;
    }
  };

  // Dynamic Breakdown Data based on downtimes
  const breakdownMap: Record<string, number> = {};
  data.downtimes.forEach((dt: any) => {
    const key = getTranslatedReason(dt.reason);
    breakdownMap[key] = (breakdownMap[key] || 0) + (dt.durationMinutes || 0);
  });

  const breakdownData = Object.keys(breakdownMap).map(reason => ({
    reason,
    downtime: breakdownMap[reason]
  }));

  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    const element = document.getElementById('analytics-dashboard');
    if (!element) return;
    
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const margin = 10;
      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      
      let heightLeft = contentHeight;
      let position = margin;
      const pageHeight = pdf.internal.pageSize.getHeight() - (2 * margin);
      
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`KPI_Report.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert(t('common.error', 'خطا در تولید فایل PDF'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12" id="analytics-dashboard">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('analytics.title', 'گزارش‌ها')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('analytics.subtitle', 'تحلیل داده‌های نگهداری پیشگیرانه و خرابی‌ها')}
          </p>
        </div>
        <button 
          onClick={exportPDF}
          disabled={isExporting}
          data-html2canvas-ignore="true"
          className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {isExporting ? (
            <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download size={20} />
          )}
          <span>{isExporting ? t('analytics.generating_pdf', 'درحال ایجاد PDF...') : t('analytics.export_btn', 'خروجی PDF / پرینت')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{t('analytics.total_tasks', 'کل دستورکارهای سال')}</p>
          <p className="text-4xl font-bold text-blue-600">{totalTasks}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{t('analytics.reliability', 'نرخ قابلیت اطمینان (تخمینی)')}</p>
          <p className="text-4xl font-bold text-green-600">{Math.max(0, 100 - (data.downtimes.reduce((acc: number, curr: any) => acc + (curr.durationMinutes || 0), 0) / 43200) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{t('analytics.total_downtimes', 'کل زمان توقف (دقیقه)')}</p>
          <p className="text-4xl font-bold text-red-500">
            {data.downtimes.reduce((acc: number, curr: any) => acc + (curr.durationMinutes || 0), 0)}
          </p>
        </div>
      </div>

      {complianceData.length === 0 && breakdownData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center flex flex-col items-center">
           <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
             <BarChart2 className="text-gray-400" size={32} />
           </div>
           <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('analytics.no_data', 'داده‌ای برای نمایش وجود ندارد')}</h3>
           <p className="text-gray-500 dark:text-gray-400">
             {isRtl ? 'تاکنون تسک یا گزارشی در این خط/مجموعه ثبت نشده است.' : 'No tasks or downtime reports registered yet.'}
           </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">{t('analytics.compliance_title', 'نرخ انطباق PM (Compliance)')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <div className="flex flex-wrap justify-center gap-4 mt-4 text-[13px]">
                        {payload?.map((entry, index) => (
                          <div key={`item-${index}`} className="flex items-center gap-1.5">
                            <span 
                              className="w-4 h-4 rounded-sm" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span style={{ color: entry.color }}>{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">{t('analytics.breakdown_title', 'تجمعی زمان توقف بر اساس علت')}</h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="5 5" />
                <XAxis 
                  type="number" 
                  label={{ value: isRtl ? 'دقیقه' : 'Minutes', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  dataKey="reason" 
                  type="category" 
                  orientation="left"
                  width={70}
                  tick={{ fontSize: 12, fill: '#4b5563' }} 
                  label={{ value: t('downtime.reason', 'علت توقف'), angle: -90, position: 'insideLeft', offset: -30, style: { textAnchor: 'middle'} }}
                />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="downtime" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
