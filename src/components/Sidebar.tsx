import React from 'react';
import {
  Camera,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CreditCard,
  QrCode,
  CalendarDays,
  FileSpreadsheet,
  Sliders,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { ViewType, UserSession } from '../types';

interface SidebarProps {
  currentView: ViewType;
  userSession: UserSession;
  onSelectView: (view: ViewType) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  userSession,
  onSelectView,
  onLogout,
}) => {
  const isAdmin = userSession.role === 'ADMIN';

  const menuItems: { id: ViewType; label: string; icon: React.ReactNode; group: string; adminOnly: boolean }[] = [
    {
      id: 'kiosk',
      label: 'Mode Kiosk Presensi',
      icon: <Camera className="w-4 h-4 text-blue-600" />,
      group: 'Operasional',
      adminOnly: false,
    },
    {
      id: 'pantauPublik',
      label: 'Portal Pantau Ortu / Publik',
      icon: <Users className="w-4 h-4 text-sky-600" />,
      group: 'Operasional',
      adminOnly: false,
    },
    {
      id: 'dashboard',
      label: 'Dashboard Admin Real-Time',
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
      group: 'Operasional',
      adminOnly: true,
    },
    {
      id: 'dataSiswa',
      label: 'Master Database Siswa',
      icon: <Users className="w-4 h-4 text-violet-600" />,
      group: 'Operasional',
      adminOnly: true,
    },
    {
      id: 'kelolaAbsensi',
      label: 'Kelola Data Presensi',
      icon: <ClipboardCheck className="w-4 h-4 text-emerald-600" />,
      group: 'Operasional',
      adminOnly: true,
    },
    {
      id: 'cetakQr',
      label: 'Cetak Kartu Siswa (F4/A4)',
      icon: <CreditCard className="w-4 h-4 text-amber-600" />,
      group: 'Penerbitan Kartu & QR',
      adminOnly: true,
    },
    {
      id: 'downloadQr',
      label: 'Download QR Siswa',
      icon: <QrCode className="w-4 h-4 text-amber-500" />,
      group: 'Penerbitan Kartu & QR',
      adminOnly: true,
    },
    {
      id: 'kalenderHeb',
      label: 'Kalender HEB',
      icon: <CalendarDays className="w-4 h-4 text-purple-600" />,
      group: 'Laporan & Kalender',
      adminOnly: true,
    },
    {
      id: 'rekapPdf',
      label: 'Rekap & Laporan Resmi (A4)',
      icon: <FileSpreadsheet className="w-4 h-4 text-rose-600" />,
      group: 'Laporan & Kalender',
      adminOnly: true,
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan & Jadwal',
      icon: <Sliders className="w-4 h-4 text-cyan-600" />,
      group: 'Sistem',
      adminOnly: true,
    },
  ];

  // Group items
  const groups = Array.from(new Set(menuItems.map(m => m.group)));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-20 h-full shadow-xs">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-semibold">
          {groups.map((grp) => {
            const itemsInGroup = menuItems.filter(
              (item) => item.group === grp && (!item.adminOnly || isAdmin)
            );
            if (itemsInGroup.length === 0) return null;

            return (
              <div key={grp} className="space-y-1">
                <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-wider">
                  {grp}
                </div>
                {itemsInGroup.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectView(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {userSession.role === 'ADMIN' ? 'AD' : 'PK'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 leading-none">
                  {userSession.role || 'GUEST'}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {userSession.name || 'Pengguna Publik'}
                </p>
              </div>
            </div>
            {userSession.role && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
