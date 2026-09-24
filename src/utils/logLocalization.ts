import { Language } from '../context/LanguageContext';

export function getLocalizedLogAction(action: string | undefined | null, lang: Language): string {
  if (!action) return '';
  if (lang === 'en') {
    switch (action) {
      case 'ورود به سیستم': return 'User Login';
      case 'خروج از سیستم': return 'User Logout';
      case 'ویرایش کاربر': return 'Edit User Account';
      case 'ایجاد کاربر جدید': return 'Create New User';
      case 'حذف کاربر': return 'Delete User';
      case 'ایجاد مجموعه': return 'Create Complex / Facility';
      case 'حذف مجموعه': return 'Delete Complex';
      case 'ویرایش تصویر مجموعه': return 'Update Facility Photo';
      case 'ویرایش مجموعه': return 'Edit Facility Details';
      case 'ایجاد خط': return 'Create Cableway Line';
      case 'حذف خط': return 'Delete Line';
      case 'ایجاد ایستگاه': return 'Create Station';
      case 'حذف ایستگاه': return 'Delete Station';
      case 'ایجاد تجهیز': return 'Create Asset / Equipment';
      case 'ویرایش تجهیز': return 'Edit Equipment';
      case 'حذف تجهیز': return 'Delete Equipment';
      case 'ایجاد دستورکار': return 'Create Work Order';
      case 'حذف دستورکار': return 'Delete Work Order';
      case 'ویرایش دستورکار': return 'Edit Work Order';
      case 'ثبت بازرسی': return 'Log Inspection';
      case 'بروزرسانی تنظیمات': return 'Update System Settings';
      case 'ثبت روانکاری':
      case 'ثبت روانکاری تجهیز': return 'Record Lubrication';
      case 'ویرایش روانکاری': return 'Edit Lubrication';
      case 'حذف روانکاری': return 'Delete Lubrication';
      case 'ثبت توقف': return 'Log Equipment Downtime';
      case 'ثبت پایش وضعیت': return 'Record Condition Monitoring';
      case 'ثبت ارتعاش‌سنجی ISO 20816': return 'ISO 20816 Vibration Test';
      case 'ثبت ترموگرافی': return 'Infrared Thermography Scan';
      case 'ثبت نتایج آنالیز روغن': return 'Oil Lab Analysis';
      case 'ثبت تست MFL کابل': return 'MFL Wire Rope Test';
      case 'ثبت آزمون غیرمخرب NDT': return 'NDT Inspection';
      case 'ایمپورت اکسل': return 'Excel Bulk Import';
      case 'ثبت درخواست تأیید': return 'Submit Approval Request';
      case 'تأیید درخواست': return 'Approve Request';
      case 'رد درخواست': return 'Reject Request';
      default: return action;
    }
  }
  return action;
}

export function getLocalizedLogDetails(details: string | undefined | null, lang: Language): string {
  if (!details) return '';
  if (lang === 'en') {
    if (details === 'ورود موفقیت‌آمیز') return 'Successful login to CMMS portal';
    if (details === 'خروج موفقیت‌آمیز') return 'Successful logout';
    if (details.includes('تنظیمات سامانه و عنوان پرتال بروزرسانی شد')) return 'System settings and portal branding updated';
    
    // User profile edits
    let m = details.match(/اطلاعات کاربری\s+(.+)\s+ویرایش شد/);
    if (m) return `User profile "${m[1]}" was modified`;

    // New user added
    m = details.match(/کاربر\s+(.+)\s+با نقش\s+(.+)\s+افزوده شد/);
    if (m) return `User "${m[1]}" added with role "${m[2]}"`;

    // User deleted
    m = details.match(/کاربر\s+"(.+)"\s+حذف شد/);
    if (m) return `User "${m[1]}" was removed`;

    // Complex / Facility
    m = details.match(/مجموعه\s+"(.+)"\s+افزوده شد/);
    if (m) return `Facility "${m[1]}" created`;
    m = details.match(/مجموعه\s+"(.+)"\s+حذف شد/);
    if (m) return `Facility "${m[1]}" deleted`;
    m = details.match(/تصویر مجموعه\s+"(.+)"\s+بروزرسانی شد/);
    if (m) return `Photo for facility "${m[1]}" updated`;
    m = details.match(/اطلاعات مجموعه\s+"(.+)"\s+ویرایش شد/);
    if (m) return `Facility details for "${m[1]}" updated`;

    // Line
    m = details.match(/خط\s+"(.+)"\s+افزوده شد/);
    if (m) return `Line "${m[1]}" created`;
    m = details.match(/خط\s+"(.+)"\s+حذف شد/);
    if (m) return `Line "${m[1]}" deleted`;

    // Station
    m = details.match(/ایستگاه\s+"(.+)"\s+افزوده شد/);
    if (m) return `Station "${m[1]}" created`;
    m = details.match(/ایستگاه\s+"(.+)"\s+حذف شد/);
    if (m) return `Station "${m[1]}" deleted`;

    // Equipment
    m = details.match(/تجهیز\s+"(.+)"\s+افزوده شد/);
    if (m) return `Equipment "${m[1]}" registered`;
    m = details.match(/تجهیز\s+"(.+)"\s+ویرایش شد/);
    if (m) return `Equipment "${m[1]}" updated`;
    m = details.match(/تجهیز\s+"(.+)"\s+حذف شد/);
    if (m) return `Equipment "${m[1]}" deleted`;

    // Tasks / Work Orders
    m = details.match(/دستورکار\s+"(.+)"\s+افزوده شد/);
    if (m) return `Work order "${m[1]}" created`;
    m = details.match(/دستورکار\s+"(.+)"\s+ویرایش شد/);
    if (m) return `Work order "${m[1]}" updated`;
    m = details.match(/دستورکار\s+"(.+)"\s+حذف شد/);
    if (m) return `Work order "${m[1]}" removed`;
    m = details.match(/ثبت وضعیت\s+"(.+)"\s+برای دستورکار\s+"(.+)"/);
    if (m) return `Status "${m[1]}" recorded for task "${m[2]}"`;

    // Condition Monitoring & CM Tests
    m = details.match(/تست ارتعاشات برای\s+(.+)\s+با زون\s+(.+)/);
    if (m) return `Vibration inspection for ${m[1]} (Zone ${m[2]})`;
    m = details.match(/اسکن حرارتی برای\s+(.+)\s+با اختلاف دمای\s+(.+)/);
    if (m) return `Thermal thermography scan for ${m[1]} (ΔT: ${m[2]})`;
    m = details.match(/گزارش آنالیز روغن\s+(.+)\s+با وضعیت\s+(.+)/);
    if (m) return `Oil sample lab report for ${m[1]} (${m[2]})`;
    m = details.match(/تست نشت شار مغناطیسی برای\s+(.+)\s+با کاهش سطح مقطع\s+(.+)/);
    if (m) return `MFL rope magnetic scan for ${m[1]} (LMA: ${m[2]})`;
    m = details.match(/تست متد\s+(.+)\s+روی قطعه\s+(.+)\s+با نتیجه\s+(.+)/);
    if (m) return `NDT ${m[1]} on ${m[2]} result: ${m[3]}`;
    m = details.match(/عملیات روانکاری برای\s+(.+)/);
    if (m) return `Lubrication performed for ${m[1]}`;
    m = details.match(/توقف\s+"(.+)"\s+ثبت شد/);
    if (m) return `Downtime event "${m[1]}" logged`;
    m = details.match(/پایش وضعیت برای قطعه\s+"(.+)"\s+ثبت شد/);
    if (m) return `Condition monitoring logged for part "${m[1]}"`;
    m = details.match(/(\d+)\s+تجهیز و\s+(\d+)\s+دستورکار اضافه\/بروزرسانی شد/);
    if (m) return `${m[1]} equipment items and ${m[2]} work orders imported from Excel`;
  }
  return details;
}
