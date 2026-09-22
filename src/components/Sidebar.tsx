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
  UserCheck,
  GraduationCap,
  BookOpen,
  Edit3,
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
  const isGuru = userSession.role === 'GURU';

  // Admin menu items
  const adminMenuItems: { id: ViewType; label: string; icon: React.ReactNode; group: string }[] = [
    {
      id: 'kiosk',
      label: 'Kiosk Presensi Apel (Pagi/Siang)',
      icon: <Camera className="w-4 h-4 text-blue-600" />,
      group: 'Operasional',
    },
    {
      id: 'pantauPublik',
      label: 'Portal Pantau Ortu / Publik',
      icon: <Users className="w-4 h-4 text-sky-600" />,
      group: 'Operasional',
    },
    {
      id: 'dashboard',
      label: 'Dashboard Admin Real-Time',
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
      group: 'Operasional',
    },
    {
      id: 'portalGuru',
      label: 'Presensi KBM Kelas (Guru)',
      icon: <GraduationCap className="w-4 h-4 text-teal-600" />,
      group: 'Pengguna & Guru',
    },
    {
      id: 'kelolaGuru',
      label: 'Manajemen Akun Guru',
      icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
      group: 'Pengguna & Guru',
    },
    {
      id: 'dataSiswa',
      label: 'Master Database Siswa',
      icon: <Users className="w-4 h-4 text-violet-600" />,
      group: 'Operasional',
    },
    {
      id: 'kelolaAbsensi',
      label: 'Kelola Data Presensi',
      icon: <ClipboardCheck className="w-4 h-4 text-emerald-600" />,
      group: 'Operasional',
    },
    {
      id: 'cetakQr',
      label: 'Cetak Kartu Siswa (F4/A4)',
      icon: <CreditCard className="w-4 h-4 text-amber-600" />,
      group: 'Penerbitan Kartu & QR',
    },
    {
      id: 'downloadQr',
      label: 'Download QR Siswa',
      icon: <QrCode className="w-4 h-4 text-amber-500" />,
      group: 'Penerbitan Kartu & QR',
    },
    {
      id: 'kalenderHeb',
      label: 'Kalender HEB',
      icon: <CalendarDays className="w-4 h-4 text-purple-600" />,
      group: 'Laporan & Kalender',
    },
    {
      id: 'rekapPdf',
      label: 'Rekap & Laporan Resmi (A4)',
      icon: <FileSpreadsheet className="w-4 h-4 text-rose-600" />,
      group: 'Laporan & Kalender',
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan & Jadwal',
      icon: <Sliders className="w-4 h-4 text-cyan-600" />,
      group: 'Sistem',
    },
  ];

  // Guru menu items
  const guruMenuItems: { id: ViewType; label: string; icon: React.ReactNode; group: string }[] = [
    {
      id: 'portalGuru',
      label: 'Presensi KBM Kelas Mengajar',
      icon: <GraduationCap className="w-4 h-4 text-emerald-600" />,
      group: 'Aktivitas Mengajar',
    },
    {
      id: 'guruIzinAbsen',
      label: 'Input Izin & Sakit Siswa',
      icon: <Edit3 className="w-4 h-4 text-blue-600" />,
      group: 'Aktivitas Mengajar',
    },
    {
      id: 'kiosk',
      label: 'Kiosk Presensi Apel (Pagi/Siang)',
      icon: <Camera className="w-4 h-4 text-blue-500" />,
      group: 'Informasi & Apel Sekolah',
    },
    {
      id: 'pantauPublik',
      label: 'Pantau Presensi Ortu',
      icon: <Users className="w-4 h-4 text-sky-600" />,
      group: 'Informasi & Apel Sekolah',
    },
    {
      id: 'kalenderHeb',
      label: 'Kalender Akademik HEB',
      icon: <CalendarDays className="w-4 h-4 text-purple-600" />,
      group: 'Informasi & Apel Sekolah',
    },
  ];

  const menuItems = isAdmin ? adminMenuItems : isGuru ? guruMenuItems : [];
  const groups = Array.from(new Set(menuItems.map((m) => m.group)));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-20 h-full shadow-xs">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-semibold">
          {groups.map((grp) => {
            const itemsInGroup = menuItems.filter((item) => item.group === grp);
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
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                  isAdmin ? 'bg-blue-600' : isGuru ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                {isAdmin ? 'AD' : isGuru ? 'GR' : 'PK'}
              </div>
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-none">
                  {isAdmin
                    ? 'ADMINISTRATOR'
                    : isGuru
                    ? userSession.teacherData?.nama || userSession.name || 'GURU'
                    : userSession.role || 'GUEST'}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {isGuru && userSession.teacherData?.mapel
                    ? `${userSession.teacherData.mapel} ${
                        userSession.teacherData.waliKelas &&
                        userSession.teacherData.waliKelas !== 'Bukan Wali Kelas'
                          ? `• Wali ${userSession.teacherData.waliKelas}`
                          : ''
                      }`
                    : userSession.name || 'Pengguna Publik'}
                </p>
              </div>
            </div>
            {userSession.role && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
