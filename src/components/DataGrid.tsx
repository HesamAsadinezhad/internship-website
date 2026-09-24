import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../context/LanguageContext';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  cell?: (row: T) => React.ReactNode;
}

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  fileName?: string;
  searchPlaceholder?: string;
}

export default function DataGrid<T extends { id: string | number }>({ 
  data, 
  columns, 
  fileName = 'export', 
  searchPlaceholder 
}: DataGridProps<T>) {
  const { t, isRtl } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const defaultPlaceholder = searchPlaceholder || (isRtl ? 'جستجو...' : 'Search...');

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let result = [...data];

    // Global Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((item: any) => {
        return Object.values(item).some(val => 
          String(val).toLowerCase().includes(lowerSearch)
        );
      });
    }

    // Sort
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const column = columns.find(c => String(c.accessor) === sortConfig.key);
        let aVal = typeof column?.accessor === 'function' ? column.accessor(a) : a[sortConfig.key];
        let bVal = typeof column?.accessor === 'function' ? column.accessor(b) : b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const currentData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => {
    const exportData = processedData.map(row => {
      const newRow: any = {};
      columns.forEach(col => {
        if (!col.header) return; // skip empty headers
        newRow[col.header] = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as keyof T];
      });
      return newRow;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isRtl 
        ? 'لطفاً پاپ‌آپ‌ها (Pop-ups) را برای این سایت مجاز کنید تا صفحه پرینت باز شود.' 
        : 'Please allow pop-ups for this site to open the print view.'
      );
      return;
    }
    
    const dir = isRtl ? 'rtl' : 'ltr';
    const lang = isRtl ? 'fa' : 'en';
    const textAlign = isRtl ? 'right' : 'left';
    
    let html = `
      <html dir="${dir}" lang="${lang}">
        <head>
          <title>${fileName.replace(/_/g, ' ')}</title>
          <style>
            @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.0.0/Vazirmatn-font-face.css');
            body { font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; padding: 20px; color: #000; background: #fff; direction: ${dir}; }
            h2 { text-align: center; margin-bottom: 20px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: ${textAlign}; }
            th { background-color: #f3f4f6; font-weight: bold; }
            @media print {
              @page { margin: 1cm; size: a4 portrait; }
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>${fileName.replace(/_/g, ' ')}</h2>
          <table>
            <thead>
              <tr>
    `;
    
    columns.forEach(col => {
      if (col.header) {
        html += `<th>${col.header}</th>`;
      }
    });
    
    html += `
              </tr>
            </thead>
            <tbody>
    `;
    
    processedData.forEach(row => {
      html += `<tr>`;
      columns.forEach(col => {
        if (col.header) {
          const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as keyof T];
          html += `<td>${String(val ?? '')}</td>`;
        }
      });
      html += `</tr>`;
    });
    
    html += `
            </tbody>
          </table>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <input 
            type="text" 
            placeholder={defaultPlaceholder}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={`w-full ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none text-sm`}
          />
          <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-gray-400`} size={18} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium">
            <Download size={16} /> {isRtl ? 'اکسل' : 'Excel'}
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`p-4 font-medium ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(String(col.accessor))}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && sortConfig?.key === String(col.accessor) && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {currentData.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {columns.map((col, j) => (
                  <td key={j} className="p-4 text-sm text-gray-800 dark:text-gray-200">
                    {col.cell ? col.cell(row) : typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as keyof T] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr><td colSpan={columns.length} className="p-8 text-center text-gray-500 dark:text-gray-400">{isRtl ? 'رکوردی یافت نشد.' : 'No records found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isRtl 
            ? `نمایش ${processedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} تا ${Math.min(currentPage * itemsPerPage, processedData.length)} از ${processedData.length} رکورد`
            : `Showing ${processedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, processedData.length)} of ${processedData.length} records`
          }
        </span>
        <div className="flex gap-1 items-center">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isRtl ? 'قبلی' : 'Previous'}
          </button>
          <span className="px-3 py-1 text-gray-800 dark:text-gray-200 text-sm">
            {isRtl ? `${currentPage} از ${totalPages}` : `${currentPage} of ${totalPages}`}
          </span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isRtl ? 'بعدی' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
