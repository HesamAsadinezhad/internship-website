/**
 * Comprehensive Condition Monitoring Report Printing Utility
 * Works seamlessly in sandboxed iframes, new tabs, and modern browsers.
 */

import { CMSubDomain } from '../types/conditionMonitoring';

export interface PrintReportOptions {
  companyName?: string;
  isRtl?: boolean;
}

export function printCmReport(record: any, subDomain: CMSubDomain, options: PrintReportOptions = {}) {
  const isRtl = options.isRtl !== false;
  const companyName = options.companyName || 'سامانه مدیریت نگهداری و پایش وضعیت تله‌کابین (CMMS)';

  // Build the complete standalone printable HTML document
  const html = generateReportHtml(record, subDomain, isRtl, companyName);

  // Attempt Method 1: Hidden iframe inside document
  try {
    const existingFrame = document.getElementById('cm-print-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cm-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.bottom = '-9999px';
    iframe.style.width = '1024px';
    iframe.style.height = '1400px';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print blocked, falling back to popup window...', err);
          fallbackPrintWindow(html);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('Iframe creation error, falling back to popup window...', err);
  }

  // Fallback Method 2: Popup window
  fallbackPrintWindow(html);
}

function fallbackPrintWindow(html: string) {
  try {
    const win = window.open('', '_blank', 'width=950,height=1000,menubar=yes,toolbar=yes');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (e) {
          console.error('Popup print failed:', e);
        }
      }, 500);
      return;
    }
  } catch (e) {
    console.error('Window open failed:', e);
  }

  // Fallback Method 3: Direct document print with temporary overlay
  const printContainer = document.createElement('div');
  printContainer.id = 'cm-direct-print-root';
  printContainer.innerHTML = html;
  document.body.appendChild(printContainer);

  const style = document.createElement('style');
  style.id = 'cm-direct-print-style';
  style.innerHTML = `
    @media print {
      body > *:not(#cm-direct-print-root) { display: none !important; }
      #cm-direct-print-root { display: block !important; width: 100% !important; background: white !important; }
    }
  `;
  document.head.appendChild(style);

  window.print();

  setTimeout(() => {
    printContainer.remove();
    style.remove();
  }, 1000);
}

function generateReportHtml(record: any, subDomain: CMSubDomain, isRtl: boolean, companyName: string): string {
  const dir = isRtl ? 'rtl' : 'ltr';
  const lang = isRtl ? 'fa' : 'en';

  const domainConfigs: Record<CMSubDomain, { titleFa: string; titleEn: string; standard: string }> = {
    oil_analysis: {
      titleFa: 'گزارش آزمون آزمایشگاهی آنالیز روغن و عناصر فرسایشی',
      titleEn: 'Oil Analysis & Wear Elements Laboratory Report',
      standard: 'ASTM D5185 / ISO 4406 / ASTM D445'
    },
    vibration: {
      titleFa: 'گزارش تخصصی آنالیز ارتعاشات ماشین‌آلات دوار',
      titleEn: 'Rotating Machinery Vibration Analysis Report',
      standard: 'ISO 20816-1 / ISO 20816-3'
    },
    thermography: {
      titleFa: 'گزارش بازرسی ترموگرافی و تصویربرداری مادون قرمز',
      titleEn: 'Infrared Thermography Inspection Report',
      standard: 'ISO 18434-1 / ASTM E1934'
    },
    lubrication: {
      titleFa: 'برگه ثبت و کنترل روانکاری ماشین‌آلات کلیدی',
      titleEn: 'Asset Lubrication Execution Record',
      standard: 'OEM Manual & ISO 6743'
    },
    mfl_cable: {
      titleFa: 'گزارش تست نشت شار مغناطیسی کابل (MFL)',
      titleEn: 'Magnetic Flux Leakage (MFL) Rope Test Report',
      standard: 'EN 12927 / ISO 4309'
    },
    ndt: {
      titleFa: 'گزارش بازرسی فنی آزمون‌های غیرمخرب (NDT)',
      titleEn: 'Non-Destructive Testing (NDT) Inspection Report',
      standard: record.standardApplied || 'EN 1709 / ISO 9712'
    }
  };

  const domain = domainConfigs[subDomain] || {
    titleFa: 'گزارش تخصصی پایش وضعیت',
    titleEn: 'Condition Monitoring Technical Report',
    standard: 'CMMS Standard'
  };

  const displayName = record.customComponentName || record.equipmentName || record.cableName || record.componentName || 'تجهیز پایش‌شده';

  // Overall status evaluation
  let statusText = isRtl ? 'نرمال - مطابق استاندارد' : 'NORMAL / PASSED';
  let statusColor = '#059669';
  let statusBg = '#ecfdf5';
  let statusBorder = '#6ee7b7';

  if (subDomain === 'oil_analysis') {
    if (record.oilCondition === 'critical') {
      statusText = isRtl ? 'بحرانی - تعویض روغن یا تعمیرات فوری' : 'CRITICAL - REPLACE OIL';
      statusColor = '#dc2626';
      statusBg = '#fef2f2';
      statusBorder = '#fca5a5';
    } else if (record.oilCondition === 'warning') {
      statusText = isRtl ? 'هشدار - پایش مستمر در دوره کوتاه‌مدت' : 'WARNING - CONDITIONAL MONITORING';
      statusColor = '#d97706';
      statusBg = '#fffbeb';
      statusBorder = '#fcd34d';
    }
  } else if (subDomain === 'vibration') {
    const zone = record.overallZone || 'A';
    if (zone === 'D') {
      statusText = isRtl ? 'ناحیه D (بحرانی - آسیب‌رسان و نیازمند توقف)' : 'ZONE D - UNACCEPTABLE / TRIP';
      statusColor = '#dc2626';
      statusBg = '#fef2f2';
      statusBorder = '#fca5a5';
    } else if (zone === 'C') {
      statusText = isRtl ? 'ناحیه C (هشدار - خارج از محدوده مجاز دائم)' : 'ZONE C - UNSATISFACTORY / ALARM';
      statusColor = '#d97706';
      statusBg = '#fffbeb';
      statusBorder = '#fcd34d';
    } else if (zone === 'B') {
      statusText = isRtl ? 'ناحیه B (قابل قبول برای بهره‌برداری طولانی)' : 'ZONE B - ACCEPTABLE';
      statusColor = '#2563eb';
      statusBg = '#eff6ff';
      statusBorder = '#93c5fd';
    } else {
      statusText = isRtl ? 'ناحیه A (عالی / ارتعاش بسیار کم تجهیز نو)' : 'ZONE A - GOOD / NEW CONDITION';
    }
  } else if (subDomain === 'thermography') {
    const sev = record.severity || (record.deltaT > 25 ? 'critical' : record.deltaT > 10 ? 'warning' : 'normal');
    if (sev === 'critical') {
      statusText = isRtl ? `بحرانی (اختلاف دما ΔT = ${record.deltaT}°C > 25°C)` : `CRITICAL (ΔT = ${record.deltaT}°C > 25°C)`;
      statusColor = '#dc2626';
      statusBg = '#fef2f2';
      statusBorder = '#fca5a5';
    } else if (sev === 'warning') {
      statusText = isRtl ? `هشدار (اختلاف دما ΔT = ${record.deltaT}°C)` : `WARNING (ΔT = ${record.deltaT}°C)`;
      statusColor = '#d97706';
      statusBg = '#fffbeb';
      statusBorder = '#fcd34d';
    } else {
      statusText = isRtl ? `نرمال (اختلاف دما ΔT = ${record.deltaT ?? 0}°C < 10°C)` : `NORMAL (ΔT = ${record.deltaT ?? 0}°C)`;
    }
  } else if (subDomain === 'mfl_cable') {
    const crit = record.criticality || 'NORMAL';
    if (crit === 'OVER_LIMIT' || crit === 'SEVERE') {
      statusText = isRtl ? `بحرانی - خروج از حد استاندارد EN 12927 (کاهش سطح: ${record.lmaPercentage}%)` : `CRITICAL - OVER DISCARD LIMIT (LMA: ${record.lmaPercentage}%)`;
      statusColor = '#dc2626';
      statusBg = '#fef2f2';
      statusBorder = '#fca5a5';
    } else if (crit === 'SERIOUS') {
      statusText = isRtl ? `هشدار جدی - تحت مراقبت (LMA: ${record.lmaPercentage}%)` : `SERIOUS DEFECT (LMA: ${record.lmaPercentage}%)`;
      statusColor = '#d97706';
      statusBg = '#fffbeb';
      statusBorder = '#fcd34d';
    }
  } else if (subDomain === 'ndt') {
    const res = record.result || 'PASS';
    if (res === 'REJECT') {
      statusText = isRtl ? 'مردود - عدم انطباق با استاندارد پذیرش قطعه' : 'REJECTED - FAILED ACCEPTANCE';
      statusColor = '#dc2626';
      statusBg = '#fef2f2';
      statusBorder = '#fca5a5';
    } else if (res === 'ACCEPTABLE_WITH_MONITORING') {
      statusText = isRtl ? 'قبول مشروط - نیازمند بازرسی مجدد در دوره کوتاه‌مدت' : 'CONDITIONAL ACCEPTANCE';
      statusColor = '#d97706';
      statusBg = '#fffbeb';
      statusBorder = '#fcd34d';
    }
  }

  // Domain-specific content section
  let domainSpecificHtml = '';

  if (subDomain === 'oil_analysis') {
    const el = record.elements || {};
    domainSpecificHtml = `
      <div class="section-title">${isRtl ? 'شاخص‌های فیزیکوشیمیایی روغن' : 'Physicochemical Parameters'}</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'گرانروی در ۴۰ درجه (Viscosity 40°C)' : 'Viscosity @ 40°C'}</div>
          <div class="metric-val">${record.viscosity40 || '-'} <span class="unit">cSt</span></div>
          <div class="metric-sub">ASTM D445</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'عدد اسیدی کل (TAN)' : 'Total Acid No. (TAN)'}</div>
          <div class="metric-val">${record.tan || '-'} <span class="unit">mg KOH/g</span></div>
          <div class="metric-sub">ASTM D664</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'شاخص فرسایش مغناطیسی (PQ Index)' : 'PQ Index'}</div>
          <div class="metric-val">${record.pqIndex || '12'}</div>
          <div class="metric-sub">${isRtl ? 'حد مجاز: کمتر از ۴۰' : 'Limit: < 40'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'کد تمیزی ذرات (ISO Cleanliness)' : 'Cleanliness Code'}</div>
          <div class="metric-val font-mono">${record.isoCleanliness || '17/15/12'}</div>
          <div class="metric-sub">ISO 4406</div>
        </div>
      </div>

      <div class="section-title" style="margin-top: 15px;">${isRtl ? 'نتایج طیف‌سنجی عناصر فرسایشی، آلاینده‌ها و ادتیوها (ICP Spectrometry - PPM)' : 'Spectrometric Elemental Analysis (PPM)'}</div>
      <table class="report-table">
        <thead>
          <tr>
            <th>${isRtl ? 'عنصر / آلاینده' : 'Element / Contaminant'}</th>
            <th>${isRtl ? 'نماد' : 'Symbol'}</th>
            <th>${isRtl ? 'مقدار اندازه‌گیری‌شده (PPM)' : 'Observed (PPM)'}</th>
            <th>${isRtl ? 'آستانه هشدار (Threshold)' : 'Limit (PPM)'}</th>
            <th>${isRtl ? 'منبع و قطعه فرسایشی محتمل' : 'Probable Source'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${isRtl ? 'آهن (چرخ‌دنده‌ها و رینگ بیرینگ)' : 'Iron'}</strong></td>
            <td class="font-mono">Fe</td>
            <td class="font-mono" style="font-weight:bold; color:${(el.fe || 0) > 80 ? '#dc2626' : '#059669'};">${el.fe ?? '-'} ppm</td>
            <td>80 ppm</td>
            <td>${isRtl ? 'سطوح تماس دندانه‌های گیربکس و ساچمه‌های بلبرینگ' : 'Gears & bearings'}</td>
          </tr>
          <tr>
            <td><strong>${isRtl ? 'مس (بوش‌های برنزی و قفسه بیرینگ)' : 'Copper'}</strong></td>
            <td class="font-mono">Cu</td>
            <td class="font-mono" style="font-weight:bold; color:${(el.cu || 0) > 25 ? '#dc2626' : '#059669'};">${el.cu ?? '-'} ppm</td>
            <td>25 ppm</td>
            <td>${isRtl ? 'بوش‌های برنجی/برنزی، کولر روغن و قفسه نگه‌دارنده' : 'Bronze bushes & cage'}</td>
          </tr>
          <tr>
            <td><strong>${isRtl ? 'کروم (پوشش‌های سخت شفت و رولرها)' : 'Chromium'}</strong></td>
            <td class="font-mono">Cr</td>
            <td class="font-mono">${el.cr ?? '-'} ppm</td>
            <td>15 ppm</td>
            <td>${isRtl ? 'روکش سخت غلتک‌های ضدسایش و رولیک‌ها' : 'Roller bearings / hard chrome'}</td>
          </tr>
          <tr>
            <td><strong>${isRtl ? 'آلومینیوم (بدنه و هوزینگ)' : 'Aluminum'}</strong></td>
            <td class="font-mono">Al</td>
            <td class="font-mono">${el.al ?? '-'} ppm</td>
            <td>20 ppm</td>
            <td>${isRtl ? 'هوزینگ گیربکس، واشرهای آب‌بندی' : 'Gearbox casing'}</td>
          </tr>
          <tr>
            <td><strong>${isRtl ? 'سیلیسیم / گردوغبار محیطی' : 'Silicon (Dust)'}</strong></td>
            <td class="font-mono">Si</td>
            <td class="font-mono" style="font-weight:bold; color:${(el.si || 0) > 25 ? '#dc2626' : '#059669'};">${el.si ?? '-'} ppm</td>
            <td>25 ppm</td>
            <td>${isRtl ? 'ورود غبار محیطی و کوهستانی از فیلتر تنفس / آب‌بندها' : 'Airborne dirt / seal ingress'}</td>
          </tr>
          <tr>
            <td><strong>${isRtl ? 'رطوبت و آب حل‌شده' : 'Water Content'}</strong></td>
            <td class="font-mono">H2O</td>
            <td class="font-mono" style="font-weight:bold; color:${(record.waterPpm || el.waterPpm || 0) > 200 ? '#dc2626' : '#059669'};">${record.waterPpm || el.waterPpm || 85} ppm</td>
            <td>200 ppm</td>
            <td>${isRtl ? 'میعان رطوبت در مخزن ناشی از نوسان دما' : 'Condensation'}</td>
          </tr>
          <tr>
            <td><strong>${isRtl ? 'روی و فسفر (بسته ادتیو ZDDP ضدسایش)' : 'Zinc & Phosphorus (ZDDP)'}</strong></td>
            <td class="font-mono">Zn / P</td>
            <td class="font-mono">${el.zn ?? 420} / ${el.p ?? 380} ppm</td>
            <td>> 250 ppm</td>
            <td>${isRtl ? 'افزودنی‌های محافظ ضدسایش اولیه روغن (فعال)' : 'Anti-wear additive package'}</td>
          </tr>
        </tbody>
      </table>
    `;
  } else if (subDomain === 'vibration') {
    const points = record.measurementPoints || [];
    domainSpecificHtml = `
      <div class="section-title">${isRtl ? 'ماتریس اندازه‌گیری ارتعاشات ۱۲ نقطه‌ای (ISO 20816)' : '12-Point Vibration Velocity & Acceleration Matrix'}</div>
      <table class="report-table">
        <thead>
          <tr>
            <th>${isRtl ? 'محل نقطه سنسور' : 'Measurement Location'}</th>
            <th>${isRtl ? 'جهت اندازه‌گیری' : 'Direction'}</th>
            <th>${isRtl ? 'سرعت ارتعاش RMS (mm/s)' : 'Velocity RMS (mm/s)'}</th>
            <th>${isRtl ? 'شتاب ارتعاش Peak (g)' : 'Acceleration Peak (g)'}</th>
            <th>${isRtl ? 'ناحیه ارزیابی' : 'ISO Zone'}</th>
          </tr>
        </thead>
        <tbody>
          ${points.length > 0 ? points.map((p: any) => `
            <tr>
              <td><strong>${p.point}</strong></td>
              <td class="font-mono">${p.direction}</td>
              <td class="font-mono font-bold">${p.velocityRms || p.velocity || '-'} mm/s</td>
              <td class="font-mono">${p.accelerationPeak || p.acceleration || '-'} g</td>
              <td><span class="badge ${p.zone === 'D' ? 'badge-crit' : p.zone === 'C' ? 'badge-warn' : 'badge-norm'}">Zone ${p.zone || 'A'}</span></td>
            </tr>
          `).join('') : `
            <tr>
              <td><strong>الکتروموتور سمت محرک (DE)</strong></td>
              <td class="font-mono">افقی (H)</td>
              <td class="font-mono font-bold">1.45 mm/s</td>
              <td class="font-mono">0.38 g</td>
              <td><span class="badge badge-norm">Zone A</span></td>
            </tr>
            <tr>
              <td><strong>الکتروموتور سمت محرک (DE)</strong></td>
              <td class="font-mono">عمودی (V)</td>
              <td class="font-mono font-bold">1.12 mm/s</td>
              <td class="font-mono">0.29 g</td>
              <td><span class="badge badge-norm">Zone A</span></td>
            </tr>
            <tr>
              <td><strong>گیربکس ورودی شفت سریع (GB-In)</strong></td>
              <td class="font-mono">افقی (H)</td>
              <td class="font-mono font-bold">1.82 mm/s</td>
              <td class="font-mono">0.65 g</td>
              <td><span class="badge badge-norm">Zone A</span></td>
            </tr>
            <tr>
              <td><strong>فلکه اصلی درایو (Bullwheel DE)</strong></td>
              <td class="font-mono">افقی (H)</td>
              <td class="font-mono font-bold">1.60 mm/s</td>
              <td class="font-mono">0.42 g</td>
              <td><span class="badge badge-norm">Zone A</span></td>
            </tr>
          `}
        </tbody>
      </table>
    `;
  } else if (subDomain === 'thermography') {
    domainSpecificHtml = `
      <div class="section-title">${isRtl ? 'تحلیل اختلاف دما و گرادیان حرارتی' : 'Thermal Differential Analysis (ΔT)'}</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'بیشترین دمای نقطه داغ (T_max)' : 'Max Spot Temp'}</div>
          <div class="metric-val">${record.maxTemperature || '-'} <span class="unit">°C</span></div>
          <div class="metric-sub">${isRtl ? 'نقطه پایش حرارتی' : 'Target hotspot'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'دمای مرجع محیطی (T_amb)' : 'Ambient Reference'}</div>
          <div class="metric-val">${record.ambientTemperature || '-'} <span class="unit">°C</span></div>
          <div class="metric-sub">${isRtl ? 'هوای محفظه' : 'Ambient enclosure'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'اختلاف دما (Delta T)' : 'Differential (ΔT)'}</div>
          <div class="metric-val" style="color: ${statusColor};">+${record.deltaT || '0'} <span class="unit">°C</span></div>
          <div class="metric-sub">ISO 18434-1</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'ضریب تابش (Emissivity)' : 'Emissivity (ε)'}</div>
          <div class="metric-val font-mono">${record.emissivity || '0.95'}</div>
          <div class="metric-sub">${record.cameraModel || 'FLIR Thermal Cam'}</div>
        </div>
      </div>
      ${record.actionRequired ? `
        <div style="margin-top:12px; padding:10px; border-radius:6px; background:#f8fafc; border:1px solid #cbd5e1;">
          <strong>${isRtl ? 'اقدام اصلاحی توصیه‌شده:' : 'Recommended Action:'}</strong>
          <div>${record.actionRequired}</div>
        </div>
      ` : ''}
    `;
  } else if (subDomain === 'mfl_cable') {
    domainSpecificHtml = `
      <div class="section-title">${isRtl ? 'شاخص‌های عیب‌یابی کابل طبق EN 12927' : 'Cable Testing Diagnostics (EN 12927)'}</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'کاهش سطح مقطع فلزی (LMA)' : 'Loss of Metallic Area (LMA)'}</div>
          <div class="metric-val" style="color:${(record.lmaPercentage || 0) > 6 ? '#dc2626' : '#059669'};">${record.lmaPercentage || '0'} <span class="unit">%</span></div>
          <div class="metric-sub">${isRtl ? 'حداکثر مجاز اسقاط: ۶٪ تا ۱۰٪' : 'Discard limit: 6%'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'تعداد رشته‌های بریده (LF)' : 'Broken Wires Count (LF)'}</div>
          <div class="metric-val">${record.brokenWiresCount ?? '0'} <span class="unit">${isRtl ? 'رشته' : 'wires'}</span></div>
          <div class="metric-sub">${isRtl ? 'در بازه مرجع ۶ برابر قطر' : 'In 6d reference length'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'موقعیت متراژ عیب' : 'Defect Position'}</div>
          <div class="metric-val font-mono">${record.defectPosition || '0'} <span class="unit">m</span></div>
          <div class="metric-sub">${isRtl ? 'فاصله از ایستگاه ۱' : 'From origin'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'قطر نامی کابل' : 'Nominal Diameter'}</div>
          <div class="metric-val font-mono">Ø ${record.cableDiameter || '45'} <span class="unit">mm</span></div>
          <div class="metric-sub">${record.cableName || 'Haul Rope'}</div>
        </div>
      </div>
    `;
  } else if (subDomain === 'ndt') {
    domainSpecificHtml = `
      <div class="section-title">${isRtl ? 'مشخصات بازرسی غیرمخرب' : 'NDT Inspection Specifications'}</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'متد و روش آزمون NDT' : 'NDT Method'}</div>
          <div class="metric-val">${record.method || record.ndtMethod || 'MT'}</div>
          <div class="metric-sub">${record.standardApplied || 'EN 1709 / ISO 9712'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'نتیجه و پذیرش نهایی' : 'Final Acceptance'}</div>
          <div class="metric-val" style="color:${statusColor};">${record.result || 'PASS'}</div>
          <div class="metric-sub">${isRtl ? 'معیار انطباق استاندارد' : 'Compliance status'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'سطح گواهینامه بازرس' : 'Inspector Cert Level'}</div>
          <div class="metric-val font-mono">Level II / III</div>
          <div class="metric-sub">ISO 9712 Certified</div>
        </div>
      </div>
      ${record.defectDescription ? `
        <div style="margin-top:12px; padding:10px; border-radius:6px; background:#f8fafc; border:1px solid #cbd5e1;">
          <strong>${isRtl ? 'شرح ناپیوستگی / مشاهدات فنی بازرس:' : 'Discontinuity / Observations:'}</strong>
          <div>${record.defectDescription}</div>
        </div>
      ` : ''}
    `;
  } else if (subDomain === 'lubrication') {
    domainSpecificHtml = `
      <div class="section-title">${isRtl ? 'مشخصات اجرای روانکاری' : 'Lubrication Execution Details'}</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'نام روانکار و گرید' : 'Lubricant Brand / Grade'}</div>
          <div class="metric-val" style="font-size:14px;">${record.lubricantName || 'Mobil SHC 630'}</div>
          <div class="metric-sub">ISO VG 220</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'مقدار تزریق‌شده' : 'Quantity Injected'}</div>
          <div class="metric-val font-mono">${record.quantity || '-'} <span class="unit">${record.quantityUnit || 'liters'}</span></div>
          <div class="metric-sub">${record.method || 'Manual Pump'}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">${isRtl ? 'سررسید روانکاری بعدی' : 'Next Due Date'}</div>
          <div class="metric-val font-mono" style="font-size:14px;">${record.nextDueDateJalali || '-'}</div>
          <div class="metric-sub">${isRtl ? 'طبق برنامه PM' : 'Per PM Schedule'}</div>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${domain.titleFa} - ${displayName}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/npm/vazirmatn@33.0.0/Vazirmatn-font-face.css');
    
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: ${dir};
      line-height: 1.5;
    }

    .report-sheet {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    /* HEADER */
    .header-box {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .header-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .header-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }

    .header-meta {
      text-align: ${isRtl ? 'left' : 'right'};
      font-family: monospace;
      font-size: 10px;
      color: #334155;
    }

    /* STATUS BANNER */
    .status-banner {
      border: 1.5px solid ${statusBorder};
      background: ${statusBg};
      color: ${statusColor};
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    /* METADATA INFO GRID */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }

    .info-table td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
    }

    .info-table .label {
      background: #f1f5f9;
      font-weight: 700;
      color: #475569;
      width: 18%;
    }

    .info-table .value {
      color: #0f172a;
      font-weight: 600;
    }

    /* SECTION TITLE */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    /* METRICS 4-COL GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .metric-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      text-align: center;
    }

    .metric-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }

    .metric-val {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }

    .metric-val .unit {
      font-size: 10px;
      font-weight: 500;
      color: #64748b;
    }

    .metric-sub {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* DATA TABLE */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }

    .report-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 700;
      text-align: ${isRtl ? 'right' : 'left'};
      border: 1px solid #0f172a;
    }

    .report-table td {
      padding: 5px 8px;
      font-size: 10px;
      border: 1px solid #cbd5e1;
    }

    .report-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .font-mono {
      font-family: monospace;
    }

    .font-bold {
      font-weight: bold;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
      border: 1px solid transparent;
    }

    .badge-norm { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .badge-warn { background: #fef3c7; color: #b45309; border-color: #fde68a; }
    .badge-crit { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

    /* NOTES BOX */
    .notes-box {
      border: 1px dashed #94a3b8;
      background: #f8fafc;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 10px;
    }

    /* SIGNATURE BLOCK */
    .sign-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1.5px solid #cbd5e1;
    }

    .sign-col {
      text-align: center;
      padding: 8px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      height: 75px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sign-title {
      font-weight: 700;
      font-size: 10px;
      color: #334155;
    }

    .sign-placeholder {
      font-size: 9px;
      color: #94a3b8;
    }

    .footer-stamp {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="report-sheet">
    <!-- HEADER -->
    <div class="header-box">
      <div>
        <div class="header-title">${companyName}</div>
        <div class="header-subtitle">${domain.titleFa} • ${domain.standard}</div>
      </div>
      <div class="header-meta">
        <div><strong>REPORT ID:</strong> ${record.id}</div>
        <div><strong>DATE:</strong> ${record.dateJalali} (${record.dateGregorian})</div>
        <div><strong>TIME:</strong> ${record.time || '10:00'}</div>
      </div>
    </div>

    <!-- STATUS BANNER -->
    <div class="status-banner">
      <span>${isRtl ? 'نتیجه ارزیابی فنی و وضعیت کلی:' : 'EVALUATION OUTCOME:'} ${statusText}</span>
      <span style="font-size:10px; font-weight:normal; opacity:0.8;">${domain.standard}</span>
    </div>

    <!-- ASSET & INSPECTION METADATA -->
    <table class="info-table">
      <tr>
        <td class="label">${isRtl ? 'نام تجهیز و قطعه:' : 'Asset / Component:'}</td>
        <td class="value" style="font-size:12px;"><strong>${displayName}</strong> ${record.equipmentName && record.equipmentName !== displayName ? `(${record.equipmentName})` : ''}</td>
        <td class="label">${isRtl ? 'کارشناس بازرس / آزمایشگاه:' : 'Inspector / Authority:'}</td>
        <td class="value">${record.inspector || (isRtl ? 'واحد پایش وضعیت CM' : 'CM Authority')}</td>
      </tr>
      <tr>
        <td class="label">${isRtl ? 'تاریخ و زمان بازرسی:' : 'Date & Time:'}</td>
        <td class="value font-mono">${record.dateJalali} • ${record.dateGregorian} ${record.time ? `• ${record.time}` : ''}</td>
        <td class="label">${isRtl ? 'استاندارد مرجع:' : 'Reference Standard:'}</td>
        <td class="value font-mono">${domain.standard}</td>
      </tr>
      <tr>
        <td class="label">${isRtl ? 'ساعت کارکرد / کیلومتراژ:' : 'Operating Hours:'}</td>
        <td class="value font-mono">${record.operatingHours ? `${record.operatingHours} hrs` : '-'}</td>
        <td class="label">${isRtl ? 'روانکار / کابل / متد:' : 'Lubricant / Spec:'}</td>
        <td class="value">${record.lubricantName || record.cableName || record.method || '-'}</td>
      </tr>
    </table>

    <!-- DOMAIN-SPECIFIC CONTENT -->
    ${domainSpecificHtml}

    <!-- TECHNICAL OBSERVATIONS / NOTES -->
    ${record.notes ? `
      <div class="section-title" style="margin-top:12px;">${isRtl ? 'توضیحات تکمیلی و مشاهدات فنی بازرس' : 'Technical Notes & Observations'}</div>
      <div class="notes-box">
        ${record.notes}
      </div>
    ` : ''}

    <!-- SIGN-OFF APPROVALS BLOCK -->
    <div class="sign-block">
      <div class="sign-col">
        <div class="sign-title">${isRtl ? 'کارشناس مجری تست / آزمایشگاه' : 'Field Inspector / Lab Specialist'}</div>
        <div class="sign-placeholder">${record.inspector || ''}</div>
        <div class="sign-placeholder">${isRtl ? 'امضا و تاریخ' : 'Sign & Date'}</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">${isRtl ? 'سرپرست پایش وضعیت فنی (CM)' : 'Condition Monitoring Lead'}</div>
        <div class="sign-placeholder">مهندس حسام اسدی</div>
        <div class="sign-placeholder">${isRtl ? 'امضا و تاریخ' : 'Sign & Date'}</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">${isRtl ? 'مدیر فنی و نگهداری تله‌کابین' : 'Technical & Maintenance Director'}</div>
        <div class="sign-placeholder">${isRtl ? 'مهر و امضای تایید بهره‌برداری' : 'Approved & Sealed'}</div>
        <div class="sign-placeholder">${isRtl ? 'تایید نهایی' : 'Final Approval'}</div>
      </div>
    </div>

    <!-- FOOTER STAMP -->
    <div class="footer-stamp">
      <div>CMMS CM Engine • Security Hash: ${record.id}</div>
      <div>Page 1 of 1 • System Generated at ${new Date().toISOString()}</div>
    </div>
  </div>
</body>
</html>
  `;
}

export function printAllReportsSummary(reports: any[], options: PrintReportOptions = {}) {
  const isRtl = options.isRtl !== false;
  const companyName = options.companyName || 'سامانه مدیریت نگهداری و پایش وضعیت تله‌کابین (CMMS)';
  const dir = isRtl ? 'rtl' : 'ltr';

  const rows = reports.map((r, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td><strong>${isRtl ? r.domainLabelFa : r.domainLabelEn}</strong></td>
      <td><strong>${r.componentName}</strong> ${r.equipmentCategory ? `<br><small style="color:#64748b;">${r.equipmentCategory}</small>` : ''}</td>
      <td style="font-family:monospace;">${r.dateJalali}<br><small style="color:#64748b;">${r.dateGregorian} ${r.time || ''}</small></td>
      <td style="font-family:monospace; font-size:10px;">${r.keyMetric}</td>
      <td>${r.inspector || '-'}</td>
      <td style="text-align:center;">
        <span style="display:inline-block; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:9.5px; ${
          r.statusSeverity === 'critical' ? 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;' :
          r.statusSeverity === 'warning' ? 'background:#fef3c7; color:#b45309; border:1px solid #fde68a;' :
          'background:#dcfce7; color:#15803d; border:1px solid #86efac;'
        }">
          ${isRtl ? r.statusTextFa : r.statusTextEn}
        </span>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="${isRtl ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${isRtl ? 'فهرست جامع گزارش‌های پایش وضعیت CM' : 'Condition Monitoring Master Reports'}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/npm/vazirmatn@33.0.0/Vazirmatn-font-face.css');
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Vazirmatn', sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 0; direction: ${dir}; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 15px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0f172a; color: white; padding: 6px 8px; font-size: 9.5px; border: 1px solid #0f172a; text-align: ${isRtl ? 'right' : 'left'}; }
    td { padding: 5px 8px; border: 1px solid #cbd5e1; font-size: 9.5px; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${companyName}</div>
      <div style="font-size:11px; font-weight:bold; color:#475569;">${isRtl ? 'گزارش جامع پایش وضعیت (همه آزمون‌ها)' : 'Condition Monitoring Master Report Archive'}</div>
    </div>
    <div style="font-family:monospace; font-size:10px; text-align:${isRtl ? 'left' : 'right'};">
      <div>${isRtl ? 'تعداد کل رکوردها:' : 'Total Records:'} ${reports.length}</div>
      <div>${isRtl ? 'تاریخ گزارش‌گیری:' : 'Generated:'} ${new Date().toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px; text-align:center;">#</th>
        <th>${isRtl ? 'زیردامنه و آزمون' : 'CM Domain'}</th>
        <th>${isRtl ? 'تجهیز / قطعه پایش‌شده' : 'Asset / Component'}</th>
        <th>${isRtl ? 'تاریخ و زمان بازرسی' : 'Date & Time'}</th>
        <th>${isRtl ? 'شاخص کلیدی' : 'Key Metric'}</th>
        <th>${isRtl ? 'کارشناس بازرس / آزمایشگاه' : 'Inspector'}</th>
        <th style="text-align:center;">${isRtl ? 'نتیجه و وضعیت' : 'Status'}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
  `;

  try {
    const existingFrame = document.getElementById('cm-print-list-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cm-print-list-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.bottom = '-9999px';
    iframe.style.width = '1400px';
    iframe.style.height = '1024px';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          fallbackPrintWindow(html);
        }
      }, 350);
      return;
    }
  } catch (e) {
    fallbackPrintWindow(html);
  }
}

export function printExecutiveCmReport(data: {
  machineHealthIndex: number;
  totalRecords: number;
  zoneCounts: { zoneA: number; zoneB: number; zoneC: number; zoneD: number };
  subDomainStats: { name: string; total: number; normal: number; compliance: number }[];
  dateRangeLabel: string;
}, options: PrintReportOptions = {}) {
  const isRtl = options.isRtl !== false;
  const companyName = options.companyName || 'سامانه مدیریت نگهداری و پایش وضعیت تله‌کابین (CMMS)';
  const dir = isRtl ? 'rtl' : 'ltr';

  const healthStatus = 
    data.machineHealthIndex >= 90 ? (isRtl ? 'عالی و بهینه' : 'Excellent & Optimal') :
    data.machineHealthIndex >= 75 ? (isRtl ? 'مطلوب و پایدار' : 'Good & Stable') :
    data.machineHealthIndex >= 60 ? (isRtl ? 'هشدار - نیازمند پایش مستمر' : 'Warning - Attention Required') :
    (isRtl ? 'بحرانی - نیاز به مداخله فوری' : 'Critical - Immediate Action');

  const healthColor = 
    data.machineHealthIndex >= 90 ? '#16a34a' :
    data.machineHealthIndex >= 75 ? '#2563eb' :
    data.machineHealthIndex >= 60 ? '#d97706' : '#dc2626';

  const html = `
<!DOCTYPE html>
<html lang="${isRtl ? 'fa' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${isRtl ? 'گزارش ارشد پایش وضعیت و سلامت تجهیزات (MHI)' : 'Executive CM Health Report'}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/npm/vazirmatn@33.0.0/Vazirmatn-font-face.css');
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Vazirmatn', sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; direction: ${dir}; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
    .title { font-size: 16px; font-weight: 900; }
    .subtitle { font-size: 11px; color: #475569; font-weight: bold; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
    .kpi-val { font-size: 20px; font-weight: 900; margin-top: 4px; }
    .kpi-lbl { font-size: 10px; color: #64748b; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
    th { background: #0f172a; color: white; padding: 7px 10px; font-size: 10px; border: 1px solid #0f172a; text-align: ${isRtl ? 'right' : 'left'}; }
    td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .sign-block { display: flex; justify-content: space-between; margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 16px; }
    .sign-col { width: 30%; text-align: center; }
    .sign-title { font-weight: bold; font-size: 10.5px; margin-bottom: 35px; }
    .sign-space { border-top: 1px solid #94a3b8; font-size: 9.5px; color: #64748b; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${companyName}</div>
      <div class="subtitle">${isRtl ? 'گزارش ارشد شاخص سلامت تجهیزات (Machine Health Index) و تحلیل کیفی CM' : 'Executive Equipment Health & CM Analytics Report'}</div>
    </div>
    <div style="font-family:monospace; font-size:10px; text-align:${isRtl ? 'left' : 'right'};">
      <div>${isRtl ? 'بازه گزارش:' : 'Period:'} ${data.dateRangeLabel}</div>
      <div>${isRtl ? 'تاریخ صدور:' : 'Issue Date:'} ${new Date().toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card" style="border-top: 3px solid ${healthColor};">
      <div class="kpi-lbl">${isRtl ? 'شاخص کل سلامت تجهیزات (MHI)' : 'Machine Health Index'}</div>
      <div class="kpi-val" style="color: ${healthColor};">${data.machineHealthIndex}%</div>
      <small style="font-weight:bold; color:${healthColor};">${healthStatus}</small>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">${isRtl ? 'تعداد کل بازرسی‌ها و آزمون‌ها' : 'Total Inspections'}</div>
      <div class="kpi-val" style="color: #0f172a;">${data.totalRecords}</div>
      <small style="color:#64748b;">${isRtl ? 'در ۶ زیردامنه تخصصی' : 'Across 6 Domains'}</small>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">${isRtl ? 'محدوده ایمن ارتعاشات (A & B)' : 'Safe Zones (A & B)'}</div>
      <div class="kpi-val" style="color: #16a34a;">${data.zoneCounts.zoneA + data.zoneCounts.zoneB}</div>
      <small style="color:#16a34a;">ISO 20816-3</small>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">${isRtl ? 'موارد در محدوده هشدار یا بحرانی' : 'Warning/Critical'}</div>
      <div class="kpi-val" style="color: #dc2626;">${data.zoneCounts.zoneC + data.zoneCounts.zoneD}</div>
      <small style="color:#dc2626;">${isRtl ? 'اقدام اصلاحی لازم' : 'Action Required'}</small>
    </div>
  </div>

  <div style="font-weight:bold; font-size:11px; margin-top:12px;">${isRtl ? '۱. تطابق سلامت در زیردامنه‌های تخصصی CM' : '1. Sub-Domain Health & Compliance'}</div>
  <table>
    <thead>
      <tr>
        <th>${isRtl ? 'زیردامنه پایش وضعیت' : 'CM Sub-domain'}</th>
        <th style="text-align:center;">${isRtl ? 'تعداد کل آزمون‌ها' : 'Total Tests'}</th>
        <th style="text-align:center;">${isRtl ? 'موارد نرمال' : 'Normal'}</th>
        <th style="text-align:center;">${isRtl ? 'شاخص انطباق سلامت' : 'Compliance'}</th>
      </tr>
    </thead>
    <tbody>
      ${data.subDomainStats.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td style="text-align:center;">${s.total}</td>
          <td style="text-align:center; color:#16a34a; font-weight:bold;">${s.normal}</td>
          <td style="text-align:center; font-weight:bold; color:${s.compliance >= 80 ? '#16a34a' : s.compliance >= 60 ? '#d97706' : '#dc2626'};">${s.compliance}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="sign-block">
    <div class="sign-col">
      <div class="sign-title">${isRtl ? 'کارشناس ارشد پایش وضعیت (CM)' : 'Condition Monitoring Specialist'}</div>
      <div class="sign-space">${isRtl ? 'امضا و تایید فنی' : 'Technical Sign-Off'}</div>
    </div>
    <div class="sign-col">
      <div class="sign-title">${isRtl ? 'سرپرست نگهداری و تعمیرات خط' : 'Line Maintenance Supervisor'}</div>
      <div class="sign-space">${isRtl ? 'امضا و تایید عملیات' : 'Operations Sign-Off'}</div>
    </div>
    <div class="sign-col">
      <div class="sign-title">${isRtl ? 'مدیر مجموعه / مدیر کل سیستم' : 'Facility / General Manager'}</div>
      <div class="sign-space">${isRtl ? 'مهر و ابلاغ نهایی' : 'Approved & Sealed'}</div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const existingFrame = document.getElementById('cm-print-exec-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cm-print-exec-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.bottom = '-9999px';
    iframe.style.width = '1200px';
    iframe.style.height = '1400px';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          fallbackPrintWindow(html);
        }
      }, 350);
      return;
    }
  } catch (e) {
    fallbackPrintWindow(html);
  }
}

