import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import React from 'react';
import { HashRouter as BrowserRouter, Routes, Route, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { 
  Wrench, 
  FileText, 
  Activity, 
  LogIn, 
  LogOut, 
  PieChart, 
  ActivitySquare, 
  Clock, 
  Users, 
  List, 
  Settings as SettingsIcon, 
  Building, 
  ArrowRight, 
  Globe, 
  Droplet,
  Inbox,
  Search,
  Moon,
  Sun
} from 'lucide-react';
import { getLocalizedComplexName, getLocalizedLineName, getLocalizedUserName } from './utils/hierarchyLocalization';
import Dashboard from './pages/Dashboard';
import EquipmentDetail from './pages/EquipmentDetail';
import Analytics from './pages/Analytics';
import ConditionMonitoring from './pages/ConditionMonitoring';
import Downtime from './pages/Downtime';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import Logs from './pages/Logs';
import SettingsPage from './pages/Settings';
import ProfilePage from './pages/Profile';
import RequestsInbox from './pages/RequestsInbox';
import GlobalSearchModal from './components/GlobalSearchModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { HierarchyProvider, useHierarchy } from './context/HierarchyContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import HierarchySelection from './pages/HierarchySelection';

function NavLink({ to, icon: Icon, badge, children }: { to: string; icon: any; badge?: React.ReactNode; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link to={to} className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={20} className="shrink-0" />
        <span className="truncate">{children}</span>
      </div>
      {badge}
    </Link>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function GlobalSocketListener() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isRtl } = useLanguage();
  
  useEffect(() => {
    if (!user) return;
    const socket = io();
    
    socket.on('new_downtime', (data) => {
      toast(isRtl ? `ثبت توقف جدید برای تجهیز: ${data.reason}` : `New downtime logged for equipment: ${data.reason}`, 'error');
    });
    socket.on('new_inspection', (data) => {
      toast(isRtl ? `بازرسی جدید ثبت شد: ${data.taskName}` : `New inspection logged: ${data.taskName}`, 'info');
    });

    return () => {
      socket.disconnect();
    };
  }, [user, toast, isRtl]);

  return null;
}

function Layout() {
  const { user, logout, settings } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, isRtl } = useLanguage();
  const { activeComplex, activeLine, clearSelection } = useHierarchy();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll pending approval requests for notification badge
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/requests?status=PENDING');
        if (res.ok) {
          const data = await res.json();
          setPendingRequestsCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 12000);
    return () => clearInterval(interval);
  }, []);

  const getLocalizedRole = (role?: string) => {
    if (!role) return '';
    switch (role) {
      case 'SUPER_ADMIN': return isRtl ? 'مدیر ارشد سیستم' : 'Super Administrator';
      case 'manager': return isRtl ? 'مدیر سیستم' : 'System Manager';
      case 'COMPLEX_ADMIN': return isRtl ? 'مدیر مجموعه' : 'Complex Administrator';
      case 'LINE_SUPERVISOR': return isRtl ? 'سرپرست خط' : 'Line Supervisor';
      case 'STATION_OPERATOR': return isRtl ? 'اپراتور ایستگاه' : 'Station Operator';
      case 'operator': return isRtl ? 'اپراتور فنی' : 'Technical Operator';
      default: return role;
    }
  };

  // If line is not selected, show the selection screen instead of the sidebar layout
  if (!activeLine) {
    return <HierarchySelection />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <aside className={`w-full md:w-64 bg-white dark:bg-gray-800 ${isRtl ? 'border-l' : 'border-r'} border-gray-200 dark:border-gray-700 p-6 shadow-sm flex flex-col transition-colors duration-200 shrink-0`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-bold text-lg truncate">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-7 h-7 object-contain" />
            ) : (
              <Wrench size={24} />
            )}
            <span className="truncate">{activeComplex ? getLocalizedComplexName(activeComplex, language) : (settings?.companyName || 'CMMS')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleLanguage} 
              className="p-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={isRtl ? 'تغییر زبان به انگلیسی (EN)' : 'Switch language to Persian (FA)'}
            >
              <Globe size={14} className="text-blue-500" />
              <span>{language === 'fa' ? 'EN' : 'FA'}</span>
            </button>
            <button 
              onClick={toggleTheme} 
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
              title={theme === 'light' ? (isRtl ? 'حالت شب' : 'Dark Mode') : (isRtl ? 'حالت روز' : 'Light Mode')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>

        {/* Global Search Quick Launch Trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full mb-4 group flex items-center justify-between px-3.5 py-2.5 text-xs bg-gray-100/90 dark:bg-gray-900/70 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-300 rounded-xl transition border border-gray-200/80 dark:border-gray-700/80 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs cursor-pointer"
          title={isRtl ? 'جستجوی سراسری (Ctrl+K)' : 'Global Search (Ctrl+K)'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search size={15} className="text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" />
            <span className="font-medium truncate">{t('search.quick_search')}</span>
          </div>
          <kbd className="shrink-0 text-[10px] font-mono bg-white dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/70 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            {isRtl ? 'Ctrl+K' : '⌘K'}
          </kbd>
        </button>
        
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Building size={12} />
            <span className="truncate">{getLocalizedComplexName(activeComplex, language)}</span>
          </div>
          <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-2 truncate">
            {getLocalizedLineName(activeLine, language)}
          </div>
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager' || user?.role === 'COMPLEX_ADMIN') && (
            <button 
              onClick={clearSelection}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowRight size={12} className={isRtl ? '' : 'rotate-180'} />
              {t('nav.switch_complex_line')}
            </button>
          )}
        </div>
        
        <nav className="flex-1 flex flex-col gap-1.5">
          <NavLink to="/" icon={FileText}>{t('nav.stations_equipments')}</NavLink>
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager' || user?.role === 'COMPLEX_ADMIN' || user?.role === 'LINE_SUPERVISOR') && (
            <NavLink to="/analytics" icon={PieChart}>{t('nav.analytics')}</NavLink>
          )}
          <NavLink to="/condition-monitoring" icon={ActivitySquare}>{t('nav.condition_monitoring')}</NavLink>
          <NavLink to="/downtimes" icon={Clock}>{t('nav.downtimes')}</NavLink>
          
          {/* Requests Inbox NavLink with live badge */}
          <NavLink
            to="/requests"
            icon={Inbox}
            badge={pendingRequestsCount > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white shadow-xs animate-pulse">
                {pendingRequestsCount}
              </span>
            ) : undefined}
          >
            {t('nav.requests_inbox')}
          </NavLink>

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'manager') && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-1.5">
              <div className="text-xs font-bold text-gray-400 uppercase mb-1 px-2">{t('nav.admin_section')}</div>
              <NavLink to="/users" icon={Users}>{t('nav.users')}</NavLink>
              <NavLink to="/logs" icon={List}>{t('nav.logs')}</NavLink>
              <NavLink to="/settings" icon={SettingsIcon}>{t('nav.settings')}</NavLink>
            </div>
          )}
        </nav>
        
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-base shrink-0">
              {user?.name?.charAt(0) || <LogIn size={16} />}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{getLocalizedUserName(user?.name, language)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{getLocalizedRole(user?.role)}</p>
            </div>
          </Link>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 py-2 rounded-lg transition-colors text-xs font-semibold cursor-pointer" title={t('nav.logout')}>
            <LogOut size={16} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <GlobalSocketListener />
        <Outlet />
      </main>

      {/* Global Search Modal */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <HierarchyProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
                    <Route index element={<Dashboard />} />
                    <Route path="/equipment/:id" element={<EquipmentDetail />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/condition-monitoring" element={<ConditionMonitoring />} />
                    <Route path="/downtimes" element={<Downtime />} />
                    <Route path="/requests" element={<RequestsInbox />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </HierarchyProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
