import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, settings } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const user = await res.json();
        login(user);
        navigate('/');
      } else {
        const data = await res.json();
        setError(data.message || 'نام کاربری یا رمز عبور اشتباه است');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center p-4 overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900" />
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-gray-700">
          <div className="p-8 pb-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white flex flex-col items-center relative">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm overflow-hidden ring-1 ring-white/30">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Wrench size={32} />
              )}
            </div>
            <h1 className="text-2xl font-bold">{settings?.companyName || 'CMMS کیش'}</h1>
            <p className="text-blue-100 mt-2 text-sm">سامانه مدیریت نگهداری و تعمیرات</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6 border border-red-100 dark:border-red-900/40">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام کاربری</label>
            <input 
              required
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-left" 
              dir="ltr"
              placeholder="username" 
            />
          </div>
          
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رمز عبور</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-left" 
                dir="ltr"
                placeholder="••••••••" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400 focus:outline-none p-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-xl py-3.5 font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'در حال ورود...' : 'ورود به سیستم'}
          </button>
          </form>
        </div>
        <p className="text-center text-white/70 text-xs mt-6">
          نسخه امن CMMS &middot; تمامی فعالیت‌ها ثبت و پایش می‌شود
        </p>
      </div>
    </div>
  );
}
