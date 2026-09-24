import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, Sliders } from 'lucide-react';
import { IsoZone, MeasurementDirection, SpectralPeak, AccelerationMode } from '../types/vibration';
import { getVelocityZone, getAccelerationZone, getZoneColor } from '../utils/vibrationUtils';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (readings: any[], mode: AccelerationMode) => void;
  initialMode?: AccelerationMode;
}

interface FlatReading {
  id: string;
  pointName: string;
  direction: MeasurementDirection;
  velocityRMS: number;
  accelerationValue: number;
  peaks: SpectralPeak[];
}

export default function VibrationDataEntryModal({ isOpen, onClose, onSave, initialMode = 'RMS' }: Props) {
  const { isRtl } = useLanguage();
  const [accMode, setAccMode] = useState<AccelerationMode>(initialMode);
  const [readings, setReadings] = useState<FlatReading[]>([
    { id: '1', pointName: 'Drive End (DE)', direction: 'H', velocityRMS: 0, accelerationValue: 0, peaks: [] }
  ]);

  useEffect(() => {
    if (isOpen) {
      setAccMode(initialMode);
      setReadings([
        { id: Date.now().toString(), pointName: 'Drive End (DE)', direction: 'H', velocityRMS: 0, accelerationValue: 0, peaks: [] }
      ]);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setReadings([
      ...readings, 
      { id: Date.now().toString(), pointName: '', direction: 'H', velocityRMS: 0, accelerationValue: 0, peaks: [] }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setReadings(readings.filter(r => r.id !== id));
  };

  const handleChange = (id: string, field: keyof FlatReading, value: any) => {
    setReadings(readings.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = readings.map(r => ({
      pointName: r.pointName,
      direction: r.direction,
      velocityRMS: r.velocityRMS,
      accelerationRMS: accMode === 'RMS' ? r.accelerationValue : r.accelerationValue / 1.414,
      accelerationPeak: accMode === 'Peak' ? r.accelerationValue : r.accelerationValue * 1.414,
      peaks: r.peaks
    }));
    onSave(formatted, accMode);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {isRtl ? 'ثبت داده‌های ارتعاشی طبق استاندارد ISO 20816' : 'Log Vibration Data (ISO 20816)'}
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold">
              ISO 20816
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {/* Header config bar: standard notice and acceleration mode switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 p-3.5 rounded-xl mb-6 text-xs border border-blue-200 dark:border-blue-800">
            <div>
              <p className="font-semibold mb-0.5">
                {isRtl
                  ? 'بررسی و تخصیص زون ارتعاشات بر اساس استاندارد بین‌المللی ISO 20816 (A, B, C, D)'
                  : 'Automatic Vibration Zone calculation according to ISO 20816 (A, B, C, D)'}
              </p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                {isRtl
                  ? 'جهت‌های اندازه‌گیری: افقی (H)، عمودی (V) و محوری (A). شتاب ارتعاشات می‌تواند به صورت RMS یا Peak ثبت گردد.'
                  : 'Directions: Horizontal (H), Vertical (V), and Axial (A). Acceleration can be registered in RMS or Peak mode.'}
              </p>
            </div>

            {/* Acceleration Mode Toggle */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-gray-500 px-1">
                {isRtl ? 'حالت شتاب:' : 'Acc Mode:'}
              </span>
              <button
                type="button"
                onClick={() => setAccMode('RMS')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  accMode === 'RMS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                RMS (m/s²)
              </button>
              <button
                type="button"
                onClick={() => setAccMode('Peak')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  accMode === 'Peak'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Peak (m/s² / g)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 font-semibold text-gray-700 dark:text-gray-300 text-xs px-2">
              <div className="col-span-4">{isRtl ? 'نقطه اندازه‌گیری (Measuring Point)' : 'Measuring Point'}</div>
              <div className="col-span-2">{isRtl ? 'جهت (H / V / A)' : 'Direction (H/V/A)'}</div>
              <div className="col-span-3">{isRtl ? 'سرعت ارتعاش (Velocity RMS mm/s)' : 'Velocity RMS (mm/s)'}</div>
              <div className="col-span-2">
                {isRtl ? `شتاب (${accMode})` : `Acceleration (${accMode})`}
              </div>
              <div className="col-span-1"></div>
            </div>

            {readings.map((reading) => (
              <div key={reading.id} className="grid grid-cols-12 gap-3 items-center bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="col-span-4">
                  <input
                    type="text"
                    required
                    placeholder="مثال: Motor DE یا Gearbox In"
                    value={reading.pointName}
                    onChange={(e) => handleChange(reading.id, 'pointName', e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={reading.direction}
                    onChange={(e) => handleChange(reading.id, 'direction', e.target.value as MeasurementDirection)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="H">{isRtl ? 'H - افقی (Horizontal)' : 'H - Horizontal'}</option>
                    <option value="V">{isRtl ? 'V - عمودی (Vertical)' : 'V - Vertical'}</option>
                    <option value="Ax">{isRtl ? 'A - محوری (Axial)' : 'A - Axial'}</option>
                  </select>
                </div>
                <div className="col-span-3 relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="mm/s"
                    value={reading.velocityRMS || ''}
                    onChange={(e) => handleChange(reading.id, 'velocityRMS', Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  {reading.velocityRMS > 0 && (
                    <span 
                      className="absolute left-2.5 top-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black shadow-xs"
                      style={{ backgroundColor: getZoneColor(getVelocityZone(Number(reading.velocityRMS))) }}
                      title={`Zone ${getVelocityZone(Number(reading.velocityRMS))}`}
                    >
                      {getVelocityZone(Number(reading.velocityRMS))}
                    </span>
                  )}
                </div>
                <div className="col-span-2 relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder={accMode === 'RMS' ? 'RMS' : 'Peak'}
                    value={reading.accelerationValue || ''}
                    onChange={(e) => handleChange(reading.id, 'accelerationValue', Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  {reading.accelerationValue > 0 && (
                    <span 
                      className="absolute left-2.5 top-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black shadow-xs"
                      style={{ 
                        backgroundColor: getZoneColor(
                          getAccelerationZone(
                            accMode === 'RMS' ? Number(reading.accelerationValue) : Number(reading.accelerationValue) / 1.414
                          )
                        ) 
                      }}
                    >
                      {getAccelerationZone(accMode === 'RMS' ? Number(reading.accelerationValue) : Number(reading.accelerationValue) / 1.414)}
                    </span>
                  )}
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(reading.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="mt-4 flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 px-3.5 py-2 rounded-lg font-medium text-xs transition-colors"
          >
            <Plus size={15} />
            <span>{isRtl ? 'افزودن جهت یا نقطه جدید' : 'Add Measurement Point'}</span>
          </button>
          
          <div className="mt-8 flex justify-end gap-2.5 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 transition-colors"
            >
              {isRtl ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <CheckCircle size={16} />
              <span>{isRtl ? 'ثبت و تحلیل داده‌ها (ISO 20816)' : 'Save & Analyze (ISO 20816)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
