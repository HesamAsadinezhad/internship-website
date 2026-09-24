import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { Download, FileText, Plus, Trash2, Sliders, ShieldCheck, Activity } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { VibrationAssetMetadata, IsoZone, DirectionalReading, KeyVibrationEquipment, AccelerationMode } from '../types/vibration';
import { getVelocityZone, getAccelerationZone, getZoneColor } from '../utils/vibrationUtils';
import VibrationDataEntryModal from './VibrationDataEntryModal';
import { Equipment } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const FOUR_VIBRATION_EQUIPMENT_CONFIG: {
  key: KeyVibrationEquipment;
  nameFa: string;
  nameEn: string;
  driveChain: string;
  defaultRpm: number;
  defaultPower: number;
  bearings: string;
}[] = [
  {
    key: 'motor',
    nameFa: 'الکتروموتور اصلی',
    nameEn: 'Main Electric Motor',
    driveChain: 'Motor -> Gearbox Coupling',
    defaultRpm: 1480,
    defaultPower: 110,
    bearings: 'SKF 6319 / 6316 C3'
  },
  {
    key: 'gearbox',
    nameFa: 'گیربکس صنعتی',
    nameEn: 'Main Gearbox',
    driveChain: 'Main Reducer -> Bullwheel Pinion',
    defaultRpm: 1480,
    defaultPower: 110,
    bearings: '22324 CC/W33 / 32220'
  },
  {
    key: 'diesel_generator',
    nameFa: 'دیزل ژنراتور اضطراری',
    nameEn: 'Emergency Diesel Generator',
    driveChain: 'Diesel Engine -> Synchronous Alternator',
    defaultRpm: 1500,
    defaultPower: 250,
    bearings: '6218-2RS / Cylindrical Roller'
  },
  {
    key: 'return_wheel',
    nameFa: 'چرخ برگشت',
    nameEn: 'Return Wheel / Bullwheel',
    driveChain: 'Haul Rope -> Bullwheel Central Bearing',
    defaultRpm: 45,
    defaultPower: 0,
    bearings: '230/500 CAK/W33 Spherical Roller'
  }
];

const generateInitialData = (eqConfig: typeof FOUR_VIBRATION_EQUIPMENT_CONFIG[0]): VibrationAssetMetadata => {
  const makeR = (dir: any, prevV: number, curV: number, avgV: number, prevA: number, curA: number, avgA: number, peaks: any[]) => {
    const readings = [];
    const count = 5;
    const remV = Math.max(0.1, (avgV * count) - prevV - curV) / 3;
    const remA = Math.max(0.1, (avgA * count) - prevA - curA) / 3;
    
    for (let i = 0; i < 3; i++) {
      readings.push({
        id: `r-${Math.random()}`,
        date: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
        direction: dir,
        velocityRMS: remV + (Math.random() * 0.2 - 0.1),
        velocityZone: 'A' as IsoZone,
        velocityTrend: [],
        peaks: [],
        accelerationRMS: remA + (Math.random() * 0.2 - 0.1),
        accelerationPeak: (remA + (Math.random() * 0.2 - 0.1)) * 1.414,
        accelerationZone: 'A' as IsoZone,
        accelerationTrend: []
      });
    }
    readings.push({
      id: `r-${Math.random()}`,
      date: new Date(Date.now() - 86400000).toISOString(),
      direction: dir,
      velocityRMS: prevV,
      velocityZone: 'A' as IsoZone,
      velocityTrend: [],
      peaks: [],
      accelerationRMS: prevA,
      accelerationPeak: prevA * 1.414,
      accelerationZone: 'A' as IsoZone,
      accelerationTrend: []
    });
    readings.push({
      id: `r-${Math.random()}`,
      date: new Date().toISOString(),
      direction: dir,
      velocityRMS: curV,
      velocityZone: 'A' as IsoZone,
      velocityTrend: [],
      peaks: peaks,
      accelerationRMS: curA,
      accelerationPeak: curA * 1.414,
      accelerationZone: 'A' as IsoZone,
      accelerationTrend: []
    });
    return readings;
  };

  const point1Name = eqConfig.key === 'motor' ? 'Motor DE (Drive End)' : eqConfig.key === 'gearbox' ? 'Gearbox High Speed (In)' : eqConfig.key === 'diesel_generator' ? 'Engine DE' : 'Return Wheel Bearing Left';
  const point2Name = eqConfig.key === 'motor' ? 'Motor NDE' : eqConfig.key === 'gearbox' ? 'Gearbox Low Speed (Out)' : eqConfig.key === 'diesel_generator' ? 'Alternator NDE' : 'Return Wheel Bearing Right';

  return {
    reportCode: `VIB-ISO20816-${new Date().getFullYear()}`,
    date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
    client: 'سامانه مدیریت نگهداری و تعمیرات',
    inspector: 'مهندس ناظر ارتعاشات',
    unitName: 'ایستگاه محرکه / بازگشت',
    machineName: eqConfig.nameFa,
    driveChain: eqConfig.driveChain,
    rpm: eqConfig.defaultRpm,
    powerKw: eqConfig.defaultPower,
    bearings: eqConfig.bearings,
    currentStatus: 'عادی',
    previousStatus: 'عادی',
    observations: 'وضعیت کلی ارتعاشات بر اساس استاندارد بین‌المللی ISO 20816 پایش گردید.',
    probableDefects: 'هیچ عیب ساختاری یا نابالانسی حاد مشاهده نشد.',
    recommendedActions: 'ادامه پایش دوره‌ای ماهانه و کنترل دمای یاتاقان‌ها.',
    points: [
      {
        id: `p-${Math.random()}`,
        pointName: point1Name,
        velocityZoneLimits: '1.4/2.8/4.5',
        accelerationZoneLimits: '5/10/20',
        previousStatus: 'عادی',
        currentStatus: 'عادی',
        observations: 'ارتعاشات در محدوده مجاز استاندارد ISO 20816 (زون A و B) قرار دارد.',
        probableDefects: '-',
        recommendedActions: 'روانکاری منظم طبق برنامه دوره.',
        readings: [
          ...makeR('H', 1.85, 1.92, 1.65, 3.40, 3.85, 3.20, [{ frequency: 24.92, amplitude: 1.22 }, { frequency: 50.00, amplitude: 0.15 }]),
          ...makeR('V', 1.25, 1.35, 1.15, 2.80, 2.95, 2.70, [{ frequency: 24.92, amplitude: 0.85 }, { frequency: 50.00, amplitude: 0.10 }]),
          ...makeR('Ax', 1.10, 1.15, 1.05, 2.10, 2.30, 2.05, [{ frequency: 24.92, amplitude: 0.60 }, { frequency: 75.00, amplitude: 0.08 }])
        ]
      },
      {
        id: `p-${Math.random()}`,
        pointName: point2Name,
        velocityZoneLimits: '1.4/2.8/4.5',
        accelerationZoneLimits: '5/10/20',
        previousStatus: 'عادی',
        currentStatus: 'عادی',
        observations: 'وضعیت در زون مجاز قرار دارد.',
        probableDefects: '-',
        recommendedActions: '-',
        readings: [
          ...makeR('H', 1.45, 1.55, 1.40, 2.90, 3.10, 2.80, [{ frequency: 25.00, amplitude: 0.95 }]),
          ...makeR('V', 1.10, 1.18, 1.05, 2.20, 2.40, 2.15, [{ frequency: 25.00, amplitude: 0.70 }]),
          ...makeR('Ax', 0.95, 1.05, 0.90, 1.80, 1.95, 1.75, [{ frequency: 25.00, amplitude: 0.50 }])
        ]
      }
    ]
  };
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
        {Number(payload[0].value).toFixed(2)}
      </div>
    );
  }
  return null;
};

const Sparkline = ({ data }: { data: any[] }) => {
  const min = data.length ? Math.min(...data.map(d => d.value)) : 0;
  const max = data.length ? Math.max(...data.map(d => d.value)) : 1;
  const buffer = Math.max((max - min) * 0.25, 0.1);

  return (
    <div className="h-10 w-full mt-1 overflow-hidden relative px-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, bottom: 4, left: 2, right: 2 }}>
          <XAxis dataKey="time" hide padding={{ left: 8, right: 8 }} />
          <YAxis domain={[min - buffer, max + buffer]} hide />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#999', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="value" stroke="#1e293b" strokeWidth={1.5} dot={{ r: 2, fill: '#0f172a' }} activeDot={{ r: 3, fill: '#2563eb' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function VibrationMonitoringPanel({ equipments }: { equipments: Equipment[] }) {
  const { user } = useAuth();
  const { isRtl, language } = useLanguage();

  const [selectedAssetKey, setSelectedAssetKey] = useState<KeyVibrationEquipment>('motor');
  const [accelerationMode, setAccelerationMode] = useState<AccelerationMode>('RMS');
  const [data, setData] = useState<VibrationAssetMetadata | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'manager';

  const currentAssetConfig = FOUR_VIBRATION_EQUIPMENT_CONFIG.find(a => a.key === selectedAssetKey) || FOUR_VIBRATION_EQUIPMENT_CONFIG[0];

  useEffect(() => {
    // Try finding matching equipment in DB
    const matchedEq = equipments.find(e => 
      e.name.includes(currentAssetConfig.nameFa) || 
      e.name.toLowerCase().includes(currentAssetConfig.key) ||
      (currentAssetConfig.key === 'return_wheel' && (e.name.includes('هرزگرد') || e.name.includes('بازگشت') || e.name.includes('فلکه')))
    );

    if (matchedEq && (matchedEq as any).vibration_data) {
      setData((matchedEq as any).vibration_data);
    } else {
      setData(generateInitialData(currentAssetConfig));
    }
  }, [selectedAssetKey, equipments]);

  const saveToBackend = async (newData: VibrationAssetMetadata) => {
    const matchedEq = equipments.find(e => 
      e.name.includes(currentAssetConfig.nameFa) || 
      e.name.toLowerCase().includes(currentAssetConfig.key) ||
      (currentAssetConfig.key === 'return_wheel' && (e.name.includes('هرزگرد') || e.name.includes('بازگشت') || e.name.includes('فلکه')))
    );

    if (matchedEq) {
      (matchedEq as any).vibration_data = newData;
      try {
        await fetch(`/api/equipments/${matchedEq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vibration_data: newData })
        });
      } catch (err) {
        console.error('Error saving vibration data', err);
      }
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || !data) return;
    setIsExporting(true);
    try {
      const element = reportRef.current;
      
      const originalHeight = element.style.height;
      const originalOverflow = element.style.overflow;
      const originalMaxHeight = element.style.maxHeight;

      element.style.height = 'auto';
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const children = Array.from(element.children) as HTMLElement[];
      const headerChild = children[0];

      // Capture header
      const headerCanvas = await html2canvas(headerChild, { scale: 2, useCORS: true, windowWidth: headerChild.scrollWidth });
      const headerImgData = headerCanvas.toDataURL('image/png');
      const headerImgWidth = pdfWidth - 20;
      const headerImgHeight = (headerCanvas.height * headerImgWidth) / headerCanvas.width;

      let currentY = 10;
      let isFirstPage = true;

      const drawHeader = () => {
        pdf.addImage(headerImgData, 'PNG', 10, 10, headerImgWidth, headerImgHeight);
        currentY = 10 + headerImgHeight + 5;
      };

      for (let i = 1; i < children.length; i++) {
        if (isFirstPage) {
          drawHeader();
          isFirstPage = false;
        }

        const child = children[i];
        const deleteBtns = child.querySelectorAll('button[title="حذف این بخش"], button[title="Delete"]');
        deleteBtns.forEach(btn => ((btn as HTMLElement).style.display = 'none'));
        
        const canvas = await html2canvas(child, { scale: 2, useCORS: true, windowWidth: child.scrollWidth });
        deleteBtns.forEach(btn => ((btn as HTMLElement).style.display = ''));

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;
        
        if (finalHeight > pdfHeight - currentY - 10) {
          if (currentY > 10 + headerImgHeight + 10) {
            pdf.addPage();
            drawHeader();
          }
          if (finalHeight > pdfHeight - currentY - 10) {
            const ratio = (pdfHeight - currentY - 10) / finalHeight;
            finalHeight = finalHeight * ratio;
            finalWidth = finalWidth * ratio;
          }
        }
        
        const offsetX = 10 + (imgWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'PNG', offsetX, currentY, finalWidth, finalHeight);
        currentY += finalHeight + 5;
      }

      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;

      pdf.save(`ISO_20816_Vibration_Report_${currentAssetConfig.key}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(isRtl ? 'خطا در تولید فایل PDF' : 'Error generating PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveData = (newReadings: any[], mode: AccelerationMode) => {
    if (!data) return;
    setAccelerationMode(mode);
    const newData = { ...data };
    const newPoints = [...newData.points];
    
    newReadings.forEach((reading: any) => {
      let pointIndex = newPoints.findIndex(p => p.pointName === reading.pointName);
      if (pointIndex === -1) {
        newPoints.push({
          id: `p${Date.now()}-${Math.random()}`,
          pointName: reading.pointName,
          velocityZoneLimits: '1.4/2.8/4.5',
          accelerationZoneLimits: '5/10/20',
          readings: []
        });
        pointIndex = newPoints.length - 1;
      }

      const velocityZone = getVelocityZone(Number(reading.velocityRMS) || 0);
      const accelerationZone = getAccelerationZone(Number(reading.accelerationRMS) || 0);

      const formattedReading: DirectionalReading = {
        id: `r${Date.now()}-${Math.random()}`,
        date: new Date().toISOString(),
        direction: reading.direction,
        velocityRMS: Number(reading.velocityRMS) || 0,
        velocityZone,
        velocityTrend: [],
        peaks: reading.peaks || [],
        accelerationRMS: Number(reading.accelerationRMS) || 0,
        accelerationPeak: Number(reading.accelerationPeak) || Number(reading.accelerationRMS) * 1.414,
        accelerationZone,
        accelerationTrend: []
      };

      newPoints[pointIndex].readings.push(formattedReading);
    });

    newData.points = newPoints;
    setData(newData);
    saveToBackend(newData);
    setIsModalOpen(false);
  };

  const handlePointMetadataChange = (pointId: string, field: string, value: string) => {
    if (!data) return;
    const newData = { ...data };
    const pointIndex = newData.points.findIndex(p => p.id === pointId);
    if (pointIndex > -1) {
      newData.points[pointIndex] = { ...newData.points[pointIndex], [field]: value };
      setData(newData);
    }
  };

  const handleGlobalMetadataChange = (field: keyof VibrationAssetMetadata, value: string) => {
    if (!data) return;
    const newData = { ...data, [field]: value };
    setData(newData);
  };

  const handleDeletePoint = (pointId: string) => {
    if (!data) return;
    const newData = { ...data, points: data.points.filter(p => p.id !== pointId) };
    setData(newData);
    saveToBackend(newData);
  };

  if (!data) return <div className="text-center p-8 text-xs text-gray-500">{isRtl ? 'در حال بارگذاری...' : 'Loading...'}</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-6 overflow-hidden">
      {/* 4 Asset Selection Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="text-blue-600 dark:text-blue-400" size={20} />
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {isRtl ? 'آنالیز ارتعاشات ۴ تجهیز کلیدی (استاندارد ISO 20816)' : 'Vibration Analysis (ISO 20816 - 4 Key Assets)'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold">
                ISO 20816
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRtl 
                ? 'محدود به موتور، گیربکس، دیزل ژنراتور و فلکه هرزگرد با سه جهت H, V, A و شتاب RMS/Peak' 
                : 'Limited to Motor, Gearbox, Diesel Generator, Return Wheel with H, V, A directions and RMS/Peak acceleration'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Acceleration Mode Toggle (RMS / Peak) */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <span className="text-[11px] font-medium text-gray-500 px-1.5">{isRtl ? 'شتاب:' : 'Acc:'}</span>
              <button
                onClick={() => setAccelerationMode('RMS')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  accelerationMode === 'RMS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                RMS (m/s²)
              </button>
              <button
                onClick={() => setAccelerationMode('Peak')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  accelerationMode === 'Peak'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Peak (m/s² / g)
              </button>
            </div>

            {canEdit && (
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={15} /> {isRtl ? 'ورود داده ارتعاشی' : 'Add Reading'}
              </button>
            )}
            <button 
              onClick={handleExportPDF} 
              disabled={isExporting || data.points.length === 0} 
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isExporting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileText size={15} />}
              <span>{isRtl ? 'گزارش رسمی PDF' : 'Export PDF Report'}</span>
            </button>
          </div>
        </div>

        {/* The 4 Equipments Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {FOUR_VIBRATION_EQUIPMENT_CONFIG.map(cfg => {
            const isSelected = selectedAssetKey === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => setSelectedAssetKey(cfg.key)}
                className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                  {isRtl ? cfg.nameFa : cfg.nameEn}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {cfg.defaultRpm > 0 ? `${cfg.defaultRpm} RPM` : 'Low Speed Shaft'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ISO 20816 Zone Reference Strip */}
      <div className="px-6 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {isRtl ? 'محدوده‌های ارزیابی استاندارد ISO 20816:' : 'ISO 20816 Severity Zones:'}
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono font-bold text-black" style={{ backgroundColor: '#b3d4ff' }}>
            Zone A: {isRtl ? 'نو / عالی' : 'Good'} (&lt;1.4)
          </span>
          <span className="px-2 py-0.5 rounded font-mono font-bold text-black" style={{ backgroundColor: '#69f0ae' }}>
            Zone B: {isRtl ? 'قابل قبول' : 'Acceptable'} (1.4-2.8)
          </span>
          <span className="px-2 py-0.5 rounded font-mono font-bold text-black" style={{ backgroundColor: '#ffd54f' }}>
            Zone C: {isRtl ? 'اخطار' : 'Warning'} (2.8-4.5)
          </span>
          <span className="px-2 py-0.5 rounded font-mono font-bold text-black" style={{ backgroundColor: '#ef5350' }}>
            Zone D: {isRtl ? 'خطرناک' : 'Danger'} (&gt;4.5)
          </span>
        </div>
      </div>

      <div className="p-6 overflow-x-auto" dir="ltr">
        {data.points.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-medium" dir="rtl">
            {isRtl 
              ? 'داده‌ای برای این تجهیز ثبت نشده است. برای ثبت مقادیر ارتعاشات، روی "ورود داده ارتعاشی" کلیک کنید.' 
              : 'No vibration data registered for this asset. Click "Add Reading" to enter values.'}
          </div>
        ) : (
          <div ref={reportRef} className="bg-white p-4 min-w-[900px] text-black font-sans">
            {/* Header section of PDF */}
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2" dir="rtl">
              <div className="font-bold text-lg flex-1 text-right">
                گزارش ارتعاش‌سنجی ماشین‌آلات - استاندارد ISO 20816
              </div>
              <div className="font-bold text-xs flex items-center justify-center gap-2 flex-1">
                <span>نام تکنسین / کارشناس:</span>
                {canEdit ? (
                  <input 
                    type="text"
                    className="border-b border-gray-400 bg-transparent outline-none px-1 font-normal focus:border-black text-center w-36" 
                    value={data.inspector || ''} 
                    onChange={e => handleGlobalMetadataChange('inspector', e.target.value)}
                    onBlur={() => saveToBackend(data)}
                    placeholder="نام کارشناس..."
                  />
                ) : (
                  <span className="font-normal">{data.inspector || '-'}</span>
                )}
              </div>
              <div className="font-mono text-xs flex-1 text-left">
                {data.reportCode} | ISO 20816
              </div>
            </div>

            {/* Machine summary row */}
            <div className="grid grid-cols-4 gap-2 mb-4 border border-black p-2 text-xs bg-gray-50" dir="rtl">
              <div><span className="font-bold">تجهیز:</span> {currentAssetConfig.nameFa}</div>
              <div><span className="font-bold">محرک:</span> {data.driveChain}</div>
              <div><span className="font-bold">دور نامی:</span> {data.rpm || currentAssetConfig.defaultRpm} RPM</div>
              <div><span className="font-bold">توان نامی:</span> {data.powerKw || currentAssetConfig.defaultPower} kW</div>
            </div>

            {/* Measuring Points */}
            <div className="space-y-6">
              {data.points.map((point) => (
                <div key={point.id} className="border-2 border-black relative group">
                  <div className="flex border-b-2 border-black bg-gray-100 items-center justify-between px-3 py-1.5">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <span className="text-gray-600 text-xs">نقطه اندازه‌گیری (Point):</span>
                      <span>{point.pointName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-gray-600 ml-1">Bearings:</span>
                        {canEdit ? (
                          <input
                            type="text"
                            className="bg-transparent border-b border-gray-400 focus:border-black outline-none px-1 text-xs"
                            value={point.bearings ?? data.bearings ?? ''}
                            onChange={(e) => handlePointMetadataChange(point.id, 'bearings', e.target.value)}
                            onBlur={() => saveToBackend(data)}
                            placeholder="شماره یاتاقان..."
                          />
                        ) : (
                          <span>{point.bearings ?? data.bearings ?? '-'}</span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-gray-500">
                        تاریخ: {point.date ?? data.date}
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <button 
                      onClick={() => handleDeletePoint(point.id)}
                      className="absolute -top-3 -right-3 bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Standard Matrix Table: Velocity (RMS), Peaks, Acceleration (RMS/Peak) */}
                  <table className="w-full text-center border-collapse table-fixed text-xs">
                    <thead>
                      <tr className="bg-gray-200 border-b-2 border-black">
                        <th className="border-r-2 border-black w-[10%] p-1.5" rowSpan={2}>Dir</th>
                        <th className="border-r-2 border-black w-[40%]" colSpan={4}>
                          <div>Velocity: mm/s - RMS (ISO 20816 1-1000 Hz)</div>
                          <div className="border-t border-gray-400 font-bold text-[11px]">
                            Limits: {point.velocityZoneLimits || '1.4/2.8/4.5'}
                          </div>
                        </th>
                        <th className="border-r-2 border-black w-[15%]" colSpan={2}>
                          <div>Peak Frequencies</div>
                        </th>
                        <th className="w-[35%]" colSpan={4}>
                          <div>Acceleration: {accelerationMode === 'RMS' ? 'm/s² - RMS' : 'm/s² - Peak'} (1-16 kHz)</div>
                          <div className="border-t border-gray-400 font-bold text-[11px]">
                            Limits: {point.accelerationZoneLimits || '5/10/20'}
                          </div>
                        </th>
                      </tr>
                      <tr className="bg-gray-100 border-b-2 border-black text-[11px]">
                        <th className="border-r border-gray-400 p-1">Avg</th>
                        <th className="border-r border-gray-400 p-1">Prev</th>
                        <th className="border-r border-black p-1">Curr</th>
                        <th className="border-r-2 border-black p-1">Zone</th>
                        
                        <th className="border-r border-gray-400 p-1">Hz</th>
                        <th className="border-r-2 border-black p-1">Amp</th>
                        
                        <th className="border-r border-gray-400 p-1">Avg</th>
                        <th className="border-r border-gray-400 p-1">Prev</th>
                        <th className="border-r border-black p-1">Curr ({accelerationMode})</th>
                        <th className="p-1">Zone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['H', 'V', 'Ax'] as const).map(dir => {
                        const dirReadings = point.readings.filter(r => r.direction === dir);
                        if (dirReadings.length === 0) return null;
                        
                        const latest = dirReadings[dirReadings.length - 1];
                        const previous = dirReadings.length > 1 ? dirReadings[dirReadings.length - 2] : undefined;
                        const avgVelocity = dirReadings.reduce((sum, r) => sum + r.velocityRMS, 0) / dirReadings.length;
                        
                        const getAccVal = (r: DirectionalReading) => accelerationMode === 'RMS' ? r.accelerationRMS : (r.accelerationPeak ?? r.accelerationRMS * 1.414);
                        const avgAcceleration = dirReadings.reduce((sum, r) => sum + getAccVal(r), 0) / dirReadings.length;
                        
                        const velocityTrend = dirReadings.map((r, i) => ({ time: i, value: r.velocityRMS }));
                        const accelerationTrend = dirReadings.map((r, i) => ({ time: i, value: getAccVal(r) }));

                        const currentVelocityZone = getVelocityZone(latest.velocityRMS, point.velocityZoneLimits);
                        const currentAccelerationZone = getAccelerationZone(latest.accelerationRMS, point.accelerationZoneLimits);

                        return (
                          <tr key={dir} className="border-b border-black last:border-b-0">
                            <td className="border-r-2 border-black font-bold p-2 bg-gray-100">
                              {dir === 'Ax' ? 'A (Axial)' : dir === 'H' ? 'H (Horiz)' : 'V (Vert)'}
                            </td>
                            
                            <td colSpan={3} className="border-r border-black align-top p-0">
                              <div className="grid grid-cols-3 border-b border-gray-300 text-xs">
                                <div className="border-r border-gray-300 border-dashed p-1 font-mono">{avgVelocity.toFixed(2)}</div>
                                <div className="border-r border-gray-300 border-dashed p-1 font-mono">{previous ? previous.velocityRMS.toFixed(2) : '-'}</div>
                                <div className="p-1 font-mono font-bold">{latest.velocityRMS.toFixed(2)}</div>
                              </div>
                              <div className="p-0.5">
                                <Sparkline data={velocityTrend} />
                              </div>
                            </td>
                            <td className="border-r-2 border-black font-bold text-base" style={{ backgroundColor: getZoneColor(currentVelocityZone) }}>
                              {currentVelocityZone}
                            </td>

                            <td className="border-r border-gray-400 border-dashed align-top p-0 text-[11px] font-mono">
                              {latest.peaks.map((p, i) => <div key={i} className="p-[2px]">{p.frequency.toFixed(1)}</div>)}
                            </td>
                            <td className="border-r-2 border-black align-top p-0 text-[11px] font-mono">
                              {latest.peaks.map((p, i) => <div key={i} className="p-[2px]">{p.amplitude.toFixed(2)}</div>)}
                            </td>

                            <td colSpan={3} className="border-r border-black align-top p-0">
                              <div className="grid grid-cols-3 border-b border-gray-300 text-xs">
                                <div className="border-r border-gray-300 border-dashed p-1 font-mono">{avgAcceleration.toFixed(2)}</div>
                                <div className="border-r border-gray-300 border-dashed p-1 font-mono">{previous ? getAccVal(previous).toFixed(2) : '-'}</div>
                                <div className="p-1 font-mono font-bold">{getAccVal(latest).toFixed(2)}</div>
                              </div>
                              <div className="p-0.5">
                                <Sparkline data={accelerationTrend} />
                              </div>
                            </td>
                            <td className="font-bold text-base" style={{ backgroundColor: getZoneColor(currentAccelerationZone) }}>
                              {currentAccelerationZone}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Status & Observations (RTL preserved) */}
                  <div className="border-t-2 border-black p-3 bg-gray-50 text-xs text-right space-y-2" dir="rtl">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="font-bold">وضعیت فعلی (ISO 20816): </span>
                        {canEdit ? (
                          <input
                            type="text"
                            className="border-b border-gray-400 bg-transparent outline-none px-1 text-xs"
                            value={point.currentStatus ?? data.currentStatus ?? 'عادی'}
                            onChange={(e) => handlePointMetadataChange(point.id, 'currentStatus', e.target.value)}
                            onBlur={() => saveToBackend(data)}
                          />
                        ) : (
                          <span className="font-semibold">{point.currentStatus ?? data.currentStatus ?? 'عادی'}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-bold">مشاهدات و تحلیل فنی: </span>
                      {canEdit ? (
                        <input
                          type="text"
                          className="border-b border-gray-400 bg-transparent outline-none px-1 w-full text-xs mt-1"
                          value={point.observations ?? data.observations ?? ''}
                          onChange={(e) => handlePointMetadataChange(point.id, 'observations', e.target.value)}
                          onBlur={() => saveToBackend(data)}
                        />
                      ) : (
                        <p className="mt-0.5 text-gray-700 leading-relaxed">{point.observations ?? data.observations ?? '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <VibrationDataEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveData}
          initialMode={accelerationMode}
        />
      )}
    </div>
  );
}
