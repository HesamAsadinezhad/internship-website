import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, X, Check, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import {
  JalaliDate,
  GregorianDate,
  gregorianToJalali,
  jalaliToGregorian,
  padZero,
  formatJalaliString,
  formatGregorianString,
  PERSIAN_MONTH_NAMES,
  GREGORIAN_MONTH_NAMES,
  getDaysInJalaliMonth,
  getDaysInGregorianMonth,
  getDualDateTimeFromDate
} from '../utils/jalali';
import { useLanguage } from '../context/LanguageContext';

interface DualCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJalali?: string;
  initialGregorian?: string;
  initialTime?: string;
  onSelect: (val: {
    dateJalali: string;
    dateGregorian: string;
    time: string;
    isoString: string;
  }) => void;
  title?: string;
}

export default function DualCalendarModal({
  isOpen,
  onClose,
  initialJalali,
  initialGregorian,
  initialTime,
  onSelect,
  title
}: DualCalendarModalProps) {
  const { isRtl } = useLanguage();

  // Active view tab: 'jalali' or 'gregorian'
  const [activeCalendar, setActiveCalendar] = useState<'jalali' | 'gregorian'>('jalali');

  // Working state: Jalali
  const [jYear, setJYear] = useState<number>(1403);
  const [jMonth, setJMonth] = useState<number>(6);
  const [jDay, setJDay] = useState<number>(28);

  // Working state: Gregorian
  const [gYear, setGYear] = useState<number>(2024);
  const [gMonth, setGMonth] = useState<number>(9);
  const [gDay, setGDay] = useState<number>(18);

  // Time state
  const [hour, setHour] = useState<string>('10');
  const [minute, setMinute] = useState<string>('30');

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      if (initialJalali && initialJalali.includes('/')) {
        const parts = initialJalali.split('/').map(Number);
        if (parts.length === 3 && parts[0] > 1300) {
          const jy = parts[0];
          const jm = parts[1];
          const jd = parts[2];
          setJYear(jy);
          setJMonth(jm);
          setJDay(jd);
          const g = jalaliToGregorian(jy, jm, jd);
          setGYear(g.gy);
          setGMonth(g.gm);
          setGDay(g.gd);
        }
      } else if (initialGregorian && initialGregorian.includes('-')) {
        const parts = initialGregorian.split('-').map(Number);
        if (parts.length === 3 && parts[0] > 1900) {
          const gy = parts[0];
          const gm = parts[1];
          const gd = parts[2];
          setGYear(gy);
          setGMonth(gm);
          setGDay(gd);
          const j = gregorianToJalali(gy, gm, gd);
          setJYear(j.jy);
          setJMonth(j.jm);
          setJDay(j.jd);
        }
      } else {
        const nowDual = getDualDateTimeFromDate();
        const jParts = nowDual.dateJalali.split('/').map(Number);
        const gParts = nowDual.dateGregorian.split('-').map(Number);
        setJYear(jParts[0]);
        setJMonth(jParts[1]);
        setJDay(jParts[2]);
        setGYear(gParts[0]);
        setGMonth(gParts[1]);
        setGDay(gParts[2]);
      }

      if (initialTime && initialTime.includes(':')) {
        const tParts = initialTime.split(':');
        setHour(padZero(parseInt(tParts[0], 10) || 10));
        setMinute(padZero(parseInt(tParts[1], 10) || 0));
      } else {
        const now = new Date();
        setHour(padZero(now.getHours()));
        setMinute(padZero(now.getMinutes()));
      }
    }
  }, [isOpen, initialJalali, initialGregorian, initialTime]);

  // Synchronous sync when Jalali inputs change
  const handleJalaliChange = (jy: number, jm: number, jd: number) => {
    const maxDays = getDaysInJalaliMonth(jy, jm);
    const validDay = Math.min(jd, maxDays);
    setJYear(jy);
    setJMonth(jm);
    setJDay(validDay);

    const g = jalaliToGregorian(jy, jm, validDay);
    setGYear(g.gy);
    setGMonth(g.gm);
    setGDay(g.gd);
  };

  // Synchronous sync when Gregorian inputs change
  const handleGregorianChange = (gy: number, gm: number, gd: number) => {
    const maxDays = getDaysInGregorianMonth(gy, gm);
    const validDay = Math.min(gd, maxDays);
    setGYear(gy);
    setGMonth(gm);
    setGDay(validDay);

    const j = gregorianToJalali(gy, gm, validDay);
    setJYear(j.jy);
    setJMonth(j.jm);
    setJDay(j.jd);
  };

  const handleSetNow = () => {
    const nowDual = getDualDateTimeFromDate();
    const jParts = nowDual.dateJalali.split('/').map(Number);
    const gParts = nowDual.dateGregorian.split('-').map(Number);
    setJYear(jParts[0]);
    setJMonth(jParts[1]);
    setJDay(jParts[2]);
    setGYear(gParts[0]);
    setGMonth(gParts[1]);
    setGDay(gParts[2]);

    const now = new Date();
    setHour(padZero(now.getHours()));
    setMinute(padZero(now.getMinutes()));
  };

  const handleConfirm = () => {
    const dateJalali = formatJalaliString({ jy: jYear, jm: jMonth, jd: jDay });
    const dateGregorian = formatGregorianString({ gy: gYear, gm: gMonth, gd: gDay });
    const timeStr = `${padZero(parseInt(hour, 10) || 0)}:${padZero(parseInt(minute, 10) || 0)}`;
    const isoString = new Date(`${dateGregorian}T${timeStr}:00`).toISOString();

    onSelect({
      dateJalali,
      dateGregorian,
      time: timeStr,
      isoString
    });
    onClose();
  };

  // Days in current view
  const jalaliDaysInMonth = useMemo(() => getDaysInJalaliMonth(jYear, jMonth), [jYear, jMonth]);
  const gregorianDaysInMonth = useMemo(() => getDaysInGregorianMonth(gYear, gMonth), [gYear, gMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {title || (isRtl ? 'انتخاب همزمان تاریخ شمسی و میلادی' : 'Dual Persian & Gregorian Calendar')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRtl ? 'همگام‌سازی لحظه‌ای تقویم جلالی و میلادی با زمان دقیق' : 'Synchronous Jalali / Gregorian date & time selection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 px-5 py-2.5 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              {formatJalaliString({ jy: jYear, jm: jMonth, jd: jDay })}
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-mono text-blue-700 dark:text-blue-300">
              {formatGregorianString({ gy: gYear, gm: gMonth, gd: gDay })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSetNow}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium hover:underline"
          >
            <RotateCcw size={13} />
            <span>{isRtl ? 'اکنون (امروز)' : 'Set to Now'}</span>
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Calendar System Switcher */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setActiveCalendar('jalali')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeCalendar === 'jalali'
                  ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {isRtl ? 'تقویم خورشیدی (جلالی / شمسی)' : 'Jalali (Persian Calendar)'}
            </button>
            <button
              type="button"
              onClick={() => setActiveCalendar('gregorian')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeCalendar === 'gregorian'
                  ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {isRtl ? 'تقویم میلادی' : 'Gregorian Calendar'}
            </button>
          </div>

          {/* Jalali Controls */}
          {activeCalendar === 'jalali' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRtl ? 'سال شمسی' : 'Jalali Year'}
                  </label>
                  <select
                    value={jYear}
                    onChange={(e) => handleJalaliChange(Number(e.target.value), jMonth, jDay)}
                    className="w-full text-xs font-medium px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {[1401, 1402, 1403, 1404, 1405, 1406, 1407].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRtl ? 'ماه شمسی' : 'Jalali Month'}
                  </label>
                  <select
                    value={jMonth}
                    onChange={(e) => handleJalaliChange(jYear, Number(e.target.value), jDay)}
                    className="w-full text-xs font-medium px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {PERSIAN_MONTH_NAMES.map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} - {mName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {isRtl ? 'روز' : 'Day'}
                  </label>
                  <select
                    value={jDay}
                    onChange={(e) => handleJalaliChange(jYear, jMonth, Number(e.target.value))}
                    className="w-full text-xs font-medium px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: jalaliDaysInMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day Grid */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {PERSIAN_MONTH_NAMES[jMonth - 1]} {jYear}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (jMonth === 1) handleJalaliChange(jYear - 1, 12, jDay);
                        else handleJalaliChange(jYear, jMonth - 1, jDay);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (jMonth === 12) handleJalaliChange(jYear + 1, 1, jDay);
                        else handleJalaliChange(jYear, jMonth + 1, jDay);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: jalaliDaysInMonth }, (_, i) => i + 1).map((d) => {
                    const isSelected = d === jDay;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleJalaliChange(jYear, jMonth, d)}
                        className={`h-8 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Gregorian Controls */
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Gregorian Year
                  </label>
                  <select
                    value={gYear}
                    onChange={(e) => handleGregorianChange(Number(e.target.value), gMonth, gDay)}
                    className="w-full text-xs font-medium px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {[2022, 2023, 2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Gregorian Month
                  </label>
                  <select
                    value={gMonth}
                    onChange={(e) => handleGregorianChange(gYear, Number(e.target.value), gDay)}
                    className="w-full text-xs font-medium px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {GREGORIAN_MONTH_NAMES.map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} - {mName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Day
                  </label>
                  <select
                    value={gDay}
                    onChange={(e) => handleGregorianChange(gYear, gMonth, Number(e.target.value))}
                    className="w-full text-xs font-medium px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: gregorianDaysInMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gregorian Day Grid */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {GREGORIAN_MONTH_NAMES[gMonth - 1]} {gYear}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (gMonth === 1) handleGregorianChange(gYear - 1, 12, gDay);
                        else handleGregorianChange(gYear, gMonth - 1, gDay);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (gMonth === 12) handleGregorianChange(gYear + 1, 1, gDay);
                        else handleGregorianChange(gYear, gMonth + 1, gDay);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: gregorianDaysInMonth }, (_, i) => i + 1).map((d) => {
                    const isSelected = d === gDay;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleGregorianChange(gYear, gMonth, d)}
                        className={`h-8 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Time Picker */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <Clock size={15} className="text-blue-600" />
              <span>{isRtl ? 'زمان ثبت آزمایش / تست' : 'Test Timestamp (HH:MM)'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-gray-500 mb-1">{isRtl ? 'ساعت' : 'Hour'}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hour}
                  onChange={(e) => setHour(padZero(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0))))}
                  className="w-full text-center text-sm font-mono font-bold px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <span className="text-xl font-bold text-gray-400 mt-4">:</span>
              <div className="flex-1">
                <label className="block text-[11px] text-gray-500 mb-1">{isRtl ? 'دقیقه' : 'Minute'}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minute}
                  onChange={(e) => setMinute(padZero(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0))))}
                  className="w-full text-center text-sm font-mono font-bold px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {isRtl ? 'انصراف' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>{isRtl ? 'تایید تاریخ و ساعت' : 'Confirm Date & Time'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable Dual Calendar trigger input field
export function DualCalendarField({
  dateJalali,
  dateGregorian,
  time,
  onChange,
  label,
  required = false
}: {
  dateJalali: string;
  dateGregorian?: string;
  time?: string;
  onChange: (val: { dateJalali: string; dateGregorian: string; time: string; isoString: string }) => void;
  label?: string;
  required?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const { isRtl } = useLanguage();

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-right shadow-2xs"
      >
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
          <Calendar size={15} className="text-blue-600 shrink-0" />
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {dateJalali || (isRtl ? 'انتخاب تاریخ شمسی / میلادی' : 'Select Dual Date')}
          </span>
          {dateGregorian && (
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              ({dateGregorian})
            </span>
          )}
          {time && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
              {time}
            </span>
          )}
        </div>
        <span className="text-[11px] text-blue-600 font-semibold shrink-0">
          {isRtl ? 'تغییر' : 'Change'}
        </span>
      </button>

      <DualCalendarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialJalali={dateJalali}
        initialGregorian={dateGregorian}
        initialTime={time}
        onSelect={onChange}
      />
    </div>
  );
}
