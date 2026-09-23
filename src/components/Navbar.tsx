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
  Camera,
  Users,
  GraduationCap,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { SchoolConfig, UserSession, AttendanceSession, ViewType } from '../types';

interface NavbarProps {
  config: SchoolConfig;
  userSession: UserSession;
  activeSession: AttendanceSession;
  timeString: string;
  dateString: string;
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onShowWelcome: () => void;
  onToggleSessionManual: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onEditProfile?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  userSession,
  activeSession,
  timeString,
  dateString,
  currentView,
  onSelectView,
  onOpenLogin,
  onLogout,
  onShowWelcome,
  onToggleSessionManual,
  canInstallPwa,
  onInstallPwa,
  onEditProfile,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const avatarUrl =
    userSession.role === 'GURU'
      ? userSession.teacherData?.fotoUrl
      : config.adminProfile?.fotoUrl || config.adminFotoUrl || userSession.avatarUrl;

  const fallbackAvatar =
    userSession.role === 'GURU'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80';
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      {/* School Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {(userSession.role === 'ADMIN' || userSession.role === 'GURU') && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Tampilkan Menu Samping' : 'Sembunyikan Menu Samping'}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition cursor-pointer border border-slate-200/80 shadow-2xs flex items-center gap-1.5"
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-4 h-4 text-blue-600" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-600" />
            )}
            <span className="text-[11px] font-bold hidden xl:inline text-slate-700">
              {isSidebarCollapsed ? 'Menu' : 'Sembunyikan'}
            </span>
          </button>
        )}

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

      {/* Public Navigation Tabs (Scanner vs Pantau Ortu) */}
      <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => onSelectView('kiosk')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
            currentView === 'kiosk'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Scanner Kiosk</span>
          <span className="sm:hidden">Kiosk</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectView('pantauPublik')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
            currentView === 'pantauPublik'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Pantau Presensi (Ortu)</span>
          <span className="sm:hidden">Pantau Ortu</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Session Badge & Switch */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-xl">
          <span className="text-[10px] font-medium text-slate-500 hidden md:inline">
            Apel:
          </span>
          <span
            className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
              activeSession === 'Pagi'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {activeSession === 'Pagi' ? 'PAGI' : 'SIANG'}
          </span>
          <button
            type="button"
            onClick={onToggleSessionManual}
            title="Alihkan Sesi Apel Manual (Pagi / Siang)"
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition hover:bg-slate-200 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
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

        {/* Auth / Role Indicator & Avatar Photo */}
        {userSession.role ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onEditProfile}
              title={`Klik untuk edit profil & foto ${userSession.role === 'GURU' ? 'guru' : 'admin'}`}
              className={`p-1 pl-1.5 pr-2.5 font-extrabold rounded-2xl text-xs border flex items-center gap-2 transition hover:opacity-90 active:scale-95 cursor-pointer shadow-2xs ${
                userSession.role === 'GURU'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <div className="relative">
                <img
                  src={avatarUrl || fallbackAvatar}
                  alt="Avatar"
                  className="w-6 h-6 rounded-xl object-cover border border-white shadow-2xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
                  }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
              </div>

              <div className="text-left leading-tight hidden sm:block">
                <span className="text-[11px] font-black block truncate max-w-[120px]">
                  {userSession.role === 'GURU'
                    ? (userSession.teacherData?.nama?.split(',')[0] || userSession.name)
                    : (config.adminProfile?.nama?.split(' ')[0] || 'Admin')}
                </span>
                <span className="text-[9px] font-semibold text-slate-500 block uppercase tracking-wider">
                  {userSession.role === 'GURU' ? 'Profil Guru' : 'Profil Admin'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl text-xs font-bold transition hover:bg-rose-50 cursor-pointer"
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
