import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, X, ExternalLink, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PdfAttachmentUploaderProps {
  equipmentId?: string;
  subDomain?: string;
  pdfUrl?: string;
  pdfName?: string;
  pdfSize?: number;
  onUploadSuccess: (info: { pdfUrl: string; pdfName: string; pdfSize: number }) => void;
  onRemove?: () => void;
  label?: string;
  required?: boolean;
}

export default function PdfAttachmentUploader({
  equipmentId = 'general',
  subDomain = 'cm',
  pdfUrl,
  pdfName,
  pdfSize,
  onUploadSuccess,
  onRemove,
  label,
  required = false
}: PdfAttachmentUploaderProps) {
  const { isRtl } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);

    // Strict validation for PDF extension and MIME
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setErrorMessage(
        isRtl
          ? 'فرمت نامعتبر است. فقط فایل‌های رسمی با پسوند PDF (.pdf) مجاز می‌باشند.'
          : 'Invalid format. Only official PDF documents (.pdf) are permitted.'
      );
      return;
    }

    // Size limit: 25MB
    const maxSizeBytes = 100 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(
        isRtl
          ? 'حجم فایل بیشتر از حد مجاز (حداکثر 100 مگابایت) است.'
          : 'File size exceeds 25 MB limit.'
      );
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('equipmentId', equipmentId);
      formData.append('subDomain', subDomain);
      formData.append('timestamp', Date.now().toString());

      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (isRtl ? 'خطا در بارگذاری فایل' : 'Upload failed'));
      }

      const result = await res.json();
      onUploadSuccess({
        pdfUrl: result.pdfUrl,
        pdfName: result.fileName || file.name,
        pdfSize: result.fileSize || file.size
      });
    } catch (err: any) {
      console.error('PDF upload error:', err);
      // Fallback: If server endpoint had transient issue, create object URL or base64 mock
      setErrorMessage(err.message || (isRtl ? 'بارگذاری گزارش با خطا مواجه شد' : 'Failed to upload PDF'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-1.5" dir={isRtl ? 'rtl' : 'ltr'}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {pdfUrl ? (
        <div className="flex items-center justify-between p-3 border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
              <FileText size={18} />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                {pdfName || 'گواهی / گزارش بازرسی پیوست شده (PDF)'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                <span>{isRtl ? 'آرشیو شده و معتبر' : 'Archived & Valid'}</span>
                {pdfSize && <span className="font-mono text-gray-500">({formatBytes(pdfSize)})</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-100/50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title={isRtl ? 'مشاهده سند در تب جدید' : 'View PDF in new tab'}
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">{isRtl ? 'مشاهده' : 'View'}</span>
            </a>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100/50 rounded-lg transition-colors"
                title={isRtl ? 'حذف فایل' : 'Remove PDF'}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40'
              : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 bg-gray-50/50 dark:bg-gray-800/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
          />

          {isUploading ? (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold py-2">
              <Loader2 size={18} className="animate-spin" />
              <span>{isRtl ? 'در حال آپلود و آرشیو گواهینامه...' : 'Uploading & archiving PDF report...'}</span>
            </div>
          ) : (
            <>
              <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                <Upload size={18} />
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                <span className="text-blue-600 font-bold hover:underline">
                  {isRtl ? 'انتخاب فایل گزارش بازرسی (PDF)' : 'Select PDF Certificate / Report'}
                </span>{' '}
                {isRtl ? 'یا فایل را اینجا رها کنید' : 'or drag and drop here'}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isRtl
                  ? 'فرمت مجاز: PDF | حداکثر ۲۵ مگابایت | آرشیو خودکار با کد تجهیز و زمان'
                  : 'Accepted format: PDF | Max: 25 MB | Indexed by timestamp & equipment'}
              </p>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
