import React from 'react';
import {
  Clock,
  Sparkles,
  Download,
  LogIn,
  LogOut,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { SchoolConfig, UserSession, AttendanceSession } from '../types';

interface NavbarProps {
  config: SchoolConfig;
  userSession: UserSession;
  activeSession: AttendanceSession;
  timeString: string;
  dateString: string;
  onOpenLogin: () => void;
  onLogout: () => void;
  onShowWelcome: () => void;
  onToggleSessionManual: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  userSession,
  activeSession,
  timeString,
  dateString,
  onOpenLogin,
  onLogout,
  onShowWelcome,
  onToggleSessionManual,
  canInstallPwa,
  onInstallPwa,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-5 py-2.5 flex items-center justify-between shadow-xs">
      {/* School Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
          <img
            src={config.logoUrl}
            alt="Logo Sekolah"
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://cdn-icons-png.flaticon.com/512/2856/2856000.png';
            }}
          />
        </div>
        <div>
          <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
            {config.namaSekolah}
          </h1>
          <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
            NPSN: {config.npsn} • Sistem Presensi Digital Terpadu
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Session Badge & Switch */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-xl">
          <span className="text-[10px] font-medium text-slate-500 hidden md:inline">
            Sesi:
          </span>
          <span
            className={`text-xs font-black font-mono px-1.5 py-0.5 rounded-md ${
              activeSession === 'Pagi'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {activeSession.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onToggleSessionManual}
            title="Alihkan Sesi Manual"
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition hover:bg-slate-200"
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>
        </div>

        {/* Live Clock */}
        <div className="text-right border-r border-slate-200 pr-2 sm:pr-3 hidden sm:block">
          <p className="font-mono text-xs font-bold text-blue-600 flex items-center justify-end gap-1">
            <Clock className="w-3 h-3" />
            {timeString} WIB
          </p>
          <p className="text-[10px] text-slate-500 font-medium">{dateString}</p>
        </div>

        {/* Welcome Screen Button */}
        <button
          type="button"
          onClick={onShowWelcome}
          className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          title="Tampilkan Layar Sambutan"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden lg:inline">Beranda</span>
        </button>

        {/* PWA Install */}
        {canInstallPwa && (
          <button
            type="button"
            onClick={onInstallPwa}
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Install App</span>
          </button>
        )}

        {/* Auth / Role Indicator */}
        {userSession.role ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="px-2 sm:px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-xl text-xs border border-blue-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">{userSession.role}</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg text-xs font-bold transition hover:bg-rose-50"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
