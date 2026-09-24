import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  ChevronLeft, 
  Upload, 
  Image as ImageIcon, 
  Download, 
  MapPin, 
  ArrowRight, 
  Trash2, 
  FileSpreadsheet, 
  Shield 
} from 'lucide-react';
import { Equipment, Station } from '../types';
import { useAuth } from '../context/AuthContext';
import { useHierarchy } from '../context/HierarchyContext';
import { useLanguage } from '../context/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';
import { 
  getLocalizedStationName, 
  getLocalizedLineName, 
  getLocalizedEquipmentName 
} from '../utils/hierarchyLocalization';

export default function Dashboard() {
  const { user } = useAuth();
  const { activeLine } = useHierarchy();
  const { isRtl, language, t } = useLanguage();
  
  const [stations, setStations] = useState<Station[]>([]);
  const [activeStation, setActiveStation] = useState<Station | null>(null);
  
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<string>('Bartholet');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Modals
  const [equipmentToDelete, setEquipmentToDelete] = useState<{id: string, name: string} | null>(null);
  const [stationToDelete, setStationToDelete] = useState<{id: string, name: string} | null>(null);
  
  // Add Station State
  const [showAddStation, setShowAddStation] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationSequence, setNewStationSequence] = useState('');
  
  // Add Equipment State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const canManageLine = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPLEX_ADMIN' || user?.role === 'manager' || user?.role === 'LINE_SUPERVISOR';
  const canManageStation = canManageLine || user?.role === 'STATION_OPERATOR';
  
  useEffect(() => {
    if (activeLine) {
      loadStations();
    }
  }, [activeLine]);

  const loadStations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lines/${activeLine?.id}/stations`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStations(data);
          
          // Auto-select station for station operators
          if ((user?.role === 'STATION_OPERATOR' || user?.role === 'operator') && user?.stationId) {
            const station = data.find((s: Station) => s.id === user.stationId);
            if (station) {
              handleSelectStation(station);
            } else if (data.length > 0) {
              handleSelectStation(data[0]);
            }
          }
        }
      }
    } catch(e) {}
    setLoading(false);
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLine) return;
    try {
      const res = await fetch(`/api/lines/${activeLine.id}/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStationName, sequenceNumber: parseInt(newStationSequence) || 0 })
      });
      if (res.ok) {
        setShowAddStation(false);
        setNewStationName('');
        setNewStationSequence('');
        loadStations();
      }
    } catch (err) {
      alert(isRtl ? 'خطا در ثبت ایستگاه' : 'Error adding station');
    }
  };

  const handleDeleteStation = async () => {
    if (!stationToDelete) return;
    try {
      await fetch(`/api/stations/${stationToDelete.id}`, { method: 'DELETE' });
      loadStations();
    } catch (err) {
      alert(isRtl ? 'خطا در حذف' : 'Error deleting station');
    } finally {
      setStationToDelete(null);
    }
  };

  const handleSelectStation = (s: Station) => {
    setActiveStation(s);
    fetchEquipments(s.id);
  };

  const fetchEquipments = (stationId: string) => {
    setLoading(true);
    fetch(`/api/stations/${stationId}/equipments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setEquipments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleBack = () => {
    setActiveStation(null);
    setEquipments([]);
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStation) return;
    
    if (!imageFile) {
      alert(isRtl ? 'لطفاً تصویر تجهیز را انتخاب کنید.' : 'Please upload an equipment photo.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const imgRes = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      const imgData = await imgRes.json();
      
      const res = await fetch(`/api/stations/${activeStation.id}/equipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, imageUrl: imgData.imageUrl })
      });
      
      if (res.ok) {
        setName('');
        setCode('');
        setImageFile(null);
        setPreviewUrl(null);
        setShowAdd(false);
        fetchEquipments(activeStation.id);
      }
    } catch (err) {
      alert(isRtl ? 'خطا در ثبت تجهیز' : 'Error creating equipment');
    }
  };

  const handleDeleteEquipment = async () => {
    if (!equipmentToDelete) return;
    try {
      await fetch(`/api/equipments/${equipmentToDelete.id}`, { method: 'DELETE' });
      if (activeStation) fetchEquipments(activeStation.id);
    } catch (err) {
      alert(isRtl ? 'خطا در حذف تجهیز' : 'Error deleting equipment');
    } finally {
      setEquipmentToDelete(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleExportExcel = async () => {
    if (!activeStation) return;
    try {
      const res = await fetch(`/api/export-excel/${activeStation.id}`);
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CMMS_Export_${activeStation.name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(isRtl ? 'خطا در دریافت فایل اکسل' : 'Error downloading Excel');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeStation) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('stationId', activeStation.id);
    formData.append('standard', selectedStandard);
    
    try {
      const res = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowImportModal(false);
        setSelectedFile(null);
        fetchEquipments(activeStation.id);
      } else {
        alert(isRtl ? 'خطا: ' + data.error : 'Error: ' + data.error);
      }
    } catch (err) {
      alert(isRtl ? 'خطا در ارتباط با سرور' : 'Server connection error');
    } finally {
      setUploading(false);
    }
  };

  const localizedLineTitle = getLocalizedLineName(activeLine, language);

  if (loading && stations.length === 0 && !activeStation) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!activeStation) {
    return (
      <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {isRtl ? `ایستگاه‌های ${localizedLineTitle}` : `Stations of ${localizedLineTitle}`}
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.select_station_hint')}
            </p>
          </div>
          {canManageLine && (
            <button 
              onClick={() => setShowAddStation(!showAddStation)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <Plus size={16} /> 
              <span>{t('dashboard.add_station')}</span>
            </button>
          )}
        </div>

        {showAddStation && (
          <form onSubmit={handleAddStation} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('dashboard.station_name')}
                </label>
                <input 
                  required 
                  value={newStationName} 
                  onChange={e => setNewStationName(e.target.value)} 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-transparent focus:border-blue-500 outline-none" 
                  placeholder={isRtl ? "مثلا: ایستگاه ۱" : "e.g. Station 1"} 
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('dashboard.station_sequence')}
                </label>
                <input 
                  required 
                  value={newStationSequence} 
                  onChange={e => setNewStationSequence(e.target.value)} 
                  type="number" 
                  min="1" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-transparent focus:border-blue-500 outline-none" 
                />
              </div>
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors h-9 shrink-0 cursor-pointer"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stations.map(s => {
            const localizedSName = getLocalizedStationName(s, language);
            return (
              <div 
                key={s.id} 
                className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs hover:shadow-md hover:border-blue-500 transition-all cursor-pointer" 
                onClick={() => handleSelectStation(s)}
              >
                <div className="p-6">
                  <MapPin className="text-blue-500 mb-3" size={28} />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{localizedSName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isRtl ? `ترتیب ایستگاه: ${s.sequenceNumber}` : `Station Seq: ${s.sequenceNumber}`}
                  </p>
                </div>
                {canManageLine && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setStationToDelete({ id: s.id, name: localizedSName }); 
                    }}
                    className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer`}
                    title={isRtl ? 'حذف ایستگاه' : 'Delete Station'}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
          {stations.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed rounded-lg dark:border-gray-700 text-xs">
              {isRtl ? 'هیچ ایستگاهی یافت نشد.' : 'No stations found.'}
            </div>
          )}
        </div>

        <ConfirmModal 
          isOpen={!!stationToDelete}
          title={isRtl ? "حذف ایستگاه" : "Delete Station"}
          message={isRtl ? `آیا از حذف ایستگاه "${stationToDelete?.name}" اطمینان دارید؟` : `Are you sure you want to delete station "${stationToDelete?.name}"?`}
          onConfirm={handleDeleteStation}
          onCancel={() => setStationToDelete(null)}
        />
      </div>
    );
  }

  const localizedActiveStationName = getLocalizedStationName(activeStation, language);

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack} 
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0 cursor-pointer"
            title={t('common.back')}
          >
            <ArrowRight size={18} className={isRtl ? '' : 'rotate-180'} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
              {localizedActiveStationName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {isRtl ? 'لیست تجهیزات و ماشین‌آلات این ایستگاه' : 'List of equipments and machinery in this station'}
            </p>
          </div>
        </div>
        
        {canManageStation && (
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Download size={15} />
              <span className="hidden sm:inline">{t('common.export_excel')}</span>
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Upload size={15} />
              <span>{isRtl ? 'ورود اکسل استاندارد' : 'Import Excel'}</span>
            </button>
            <button 
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t('dashboard.add_equipment')}</span>
            </button>
          </div>
        )}
      </div>

      {showAdd && canManageStation && (
        <form onSubmit={handleAddEquipment} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-4">
            {isRtl ? `ثبت تجهیز جدید در ${localizedActiveStationName}` : `Create New Equipment in ${localizedActiveStationName}`}
          </h3>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isRtl ? 'تصویر تجهیز (الزامی) *' : 'Equipment Photo (Required) *'}
              </label>
              <div 
                onClick={() => imageInputRef.current?.click()}
                className={`w-full aspect-video md:aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors ${previewUrl ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:bg-gray-900'}`}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="text-gray-400 mb-2" size={32} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? 'انتخاب تصویر' : 'Select Photo'}</span>
                  </>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col justify-center gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('dashboard.equipment_name')} *
                </label>
                <input 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder={isRtl ? "مثلا: گیربکس اصلی" : "e.g. Main Gearbox"} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('dashboard.equipment_code')}
                </label>
                <input 
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="EQ-101" 
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button 
              type="button" 
              onClick={() => {
                setShowAdd(false); 
                setPreviewUrl(null); 
                setImageFile(null);
              }} 
              className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      )}

      {/* Excel Import Modal with Standard Selection */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="text-green-600" size={24} />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {isRtl ? 'ورود فایل اکسل بر اساس استاندارد' : 'Import Excel with Manufacturer Standard'}
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {isRtl 
                ? 'فایل‌های مختلف اکسل بر اساس استانداردهای بارهولت (Bartholet)، دوپلمایر (Doppelmayr) یا عمومی قابل تفکیک و ورود می‌باشند.'
                : 'Import maintenance tasks and equipments categorised by Bartholet, Doppelmayr, or General standard.'}
            </p>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'استاندارد تسک‌ها و سازنده:' : 'Manufacturer / Standard:'}
                </label>
                <select
                  value={selectedStandard}
                  onChange={e => setSelectedStandard(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-medium outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  <option value="Bartholet">{isRtl ? 'Bartholet (بارهولت)' : 'Bartholet'}</option>
                  <option value="Doppelmayr">{isRtl ? 'Doppelmayr (دوپلمایر)' : 'Doppelmayr'}</option>
                  <option value="Poma">{isRtl ? 'Poma (پوما)' : 'Poma'}</option>
                  <option value="General">{isRtl ? 'عمومی / استاندارد فایل (Auto-Detect)' : 'General / File Standard (Auto-Detect)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isRtl ? 'فایل اکسل (.xlsx, .xls):' : 'Excel File (.xlsx, .xls):'}
                </label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {uploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload size={14} />
                  )}
                  <span>{uploading ? (isRtl ? 'درحال ورود...' : 'Importing...') : (isRtl ? 'ورود به سامانه' : 'Start Import')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {equipments.map(eq => {
            const localizedEqName = getLocalizedEquipmentName(eq.name, language);
            return (
              <Link key={eq.id} to={`/equipment/${eq.id}`} className="block group">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs hover:shadow-md hover:border-blue-400 transition-all overflow-hidden flex flex-col h-full">
                  {eq.imageUrl ? (
                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 relative"> 
                      <img src={eq.imageUrl} alt={eq.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center border-b border-gray-100 dark:border-gray-700">
                      <ImageIcon className="text-gray-300 mb-2" size={32} />
                      <span className="text-xs text-gray-400">{isRtl ? 'بدون تصویر' : 'No Image'}</span>
                    </div>
                  )}
                  
                  <div className="p-5 flex-1 flex flex-col relative">
                    <div className="flex justify-between items-start">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1 truncate pr-2">
                        {localizedEqName}
                      </h3>
                      {canManageStation && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEquipmentToDelete({ id: eq.id, name: localizedEqName });
                          }}
                          className={`text-gray-400 hover:text-red-500 transition-colors p-1 ${isRtl ? 'mr-auto' : 'ml-auto'} cursor-pointer`}
                          title={isRtl ? "حذف تجهیز" : "Delete Equipment"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-mono">{eq.code || 'NO-CODE'}</p>
                    
                    <div className="mt-auto flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span>{isRtl ? 'مشاهده دستورکارها' : 'View Maintenance Tasks'}</span>
                      <ChevronLeft size={16} className={isRtl ? '' : 'rotate-180'} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {equipments.length === 0 && (
            <div className="col-span-full text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs">
              {isRtl ? 'هیچ تجهیزی در این ایستگاه یافت نشد.' : 'No equipments found in this station.'}
            </div>
          )}
        </div>
      )}
      
      <ConfirmModal 
        isOpen={!!equipmentToDelete}
        title={isRtl ? "حذف تجهیز" : "Delete Equipment"}
        message={isRtl ? `آیا از حذف تجهیز "${equipmentToDelete?.name}" و تمامی دستورکارها و بازرسی‌های مرتبط با آن اطمینان دارید؟` : `Are you sure you want to delete "${equipmentToDelete?.name}" and all associated tasks?`}
        onConfirm={handleDeleteEquipment}
        onCancel={() => setEquipmentToDelete(null)}
      />
    </div>
  );
}
