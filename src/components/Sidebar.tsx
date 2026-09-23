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
  CloudUpload,
  BarChart3,
  CheckCircle2,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  FolderDown,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ViewType, UserSession } from '../types';

export type TeacherTabType = 'DASHBOARD' | 'PRESENSI' | 'JURNAL' | 'LAPORAN_PDF' | 'SISWA' | 'PIKET';

type GuruMenuItem =
  | {
      type: 'teacherTab';
      tabId: TeacherTabType;
      label: string;
      shortLabel: string;
      icon: React.ReactNode;
      badge?: number;
    }
  | {
      type: 'view';
      viewId: ViewType;
      label: string;
      shortLabel: string;
      icon: React.ReactNode;
      badge?: number;
    };

interface SidebarProps {
  currentView: ViewType;
  userSession: UserSession;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectView: (view: ViewType) => void;
  teacherActiveTab?: TeacherTabType;
  onSelectTeacherTab?: (tab: TeacherTabType) => void;
  journalCount?: number;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  userSession,
  isCollapsed,
  onToggleCollapse,
  onSelectView,
  teacherActiveTab = 'DASHBOARD',
  onSelectTeacherTab,
  journalCount = 0,
  onLogout,
}) => {
  const isAdmin = userSession.role === 'ADMIN';
  const isGuru = userSession.role === 'GURU';

  // Admin menu groups & items
  const adminMenuGroups = [
    {
      group: 'Operasional',
      items: [
        {
          id: 'dashboard' as ViewType,
          label: 'Dashboard Admin Real-Time',
          shortLabel: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
        },
        {
          id: 'kiosk' as ViewType,
          label: 'Kiosk Presensi Apel (Pagi/Siang)',
          shortLabel: 'Kiosk Apel',
          icon: <Camera className="w-4 h-4 text-blue-600" />,
        },
        {
          id: 'pantauPublik' as ViewType,
          label: 'Portal Pantau Ortu / Publik',
          shortLabel: 'Pantau Ortu',
          icon: <Users className="w-4 h-4 text-sky-600" />,
        },
        {
          id: 'dataSiswa' as ViewType,
          label: 'Master Database Siswa',
          shortLabel: 'Data Siswa',
          icon: <Users className="w-4 h-4 text-violet-600" />,
        },
        {
          id: 'kelolaAbsensi' as ViewType,
          label: 'Kelola Data Presensi',
          shortLabel: 'Data Presensi',
          icon: <ClipboardCheck className="w-4 h-4 text-emerald-600" />,
        },
      ],
    },
    {
      group: 'Akademik & Guru',
      items: [
        {
          id: 'portalGuru' as ViewType,
          label: 'Supervisi KBM & Jurnal Guru',
          shortLabel: 'Supervisi KBM',
          icon: <ShieldCheck className="w-4 h-4 text-teal-600" />,
        },
        {
          id: 'kelolaGuru' as ViewType,
          label: 'Manajemen Akun Guru',
          shortLabel: 'Akun Guru',
          icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
        },
      ],
    },
    {
      group: 'Penerbitan & Laporan',
      items: [
        {
          id: 'cetakQr' as ViewType,
          label: 'Cetak Kartu Siswa (F4/A4)',
          shortLabel: 'Cetak Kartu',
          icon: <CreditCard className="w-4 h-4 text-amber-600" />,
        },
        {
          id: 'downloadQr' as ViewType,
          label: 'Download QR Siswa',
          shortLabel: 'Download QR',
          icon: <QrCode className="w-4 h-4 text-amber-500" />,
        },
        {
          id: 'rekapPdf' as ViewType,
          label: 'Rekap & Laporan Resmi (A4)',
          shortLabel: 'Laporan A4',
          icon: <FileSpreadsheet className="w-4 h-4 text-rose-600" />,
        },
        {
          id: 'kalenderHeb' as ViewType,
          label: 'Kalender Akademik HEB',
          shortLabel: 'Kalender HEB',
          icon: <CalendarDays className="w-4 h-4 text-purple-600" />,
        },
      ],
    },
    {
      group: 'Sistem & Backup',
      items: [
        {
          id: 'backupData' as ViewType,
          label: 'Backup Data & Google Drive',
          shortLabel: 'Backup Cloud',
          icon: <CloudUpload className="w-4 h-4 text-emerald-600" />,
        },
        {
          id: 'pengaturan' as ViewType,
          label: 'Pengaturan & Jadwal',
          shortLabel: 'Pengaturan',
          icon: <Sliders className="w-4 h-4 text-cyan-600" />,
        },
      ],
    },
  ];

  // Guru menu groups & items (Includes all teaching sub-features in sidebar)
  const guruMenuGroups: { group: string; items: GuruMenuItem[] }[] = [
    {
      group: 'Aktivitas Mengajar (KBM)',
      items: [
        {
          type: 'teacherTab' as const,
          tabId: 'DASHBOARD' as TeacherTabType,
          label: 'Ringkasan Pembelajaran',
          shortLabel: 'Ringkasan',
          icon: <BarChart3 className="w-4 h-4 text-blue-600" />,
        },
        {
          type: 'teacherTab' as const,
          tabId: 'PRESENSI' as TeacherTabType,
          label: 'Presensi KBM & Input Kelas',
          shortLabel: 'Input Presensi',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        },
        {
          type: 'teacherTab' as const,
          tabId: 'JURNAL' as TeacherTabType,
          label: 'Data Pembelajaran & Jurnal',
          shortLabel: 'Jurnal KBM',
          icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
          badge: journalCount > 0 ? journalCount : undefined,
        },
        {
          type: 'teacherTab' as const,
          tabId: 'LAPORAN_PDF' as TeacherTabType,
          label: 'Download Laporan PDF KBM',
          shortLabel: 'Laporan PDF',
          icon: <FileText className="w-4 h-4 text-teal-600" />,
        },
        {
          type: 'teacherTab' as const,
          tabId: 'SISWA' as TeacherTabType,
          label: 'Direktori Data Siswa',
          shortLabel: 'Data Siswa',
          icon: <Users className="w-4 h-4 text-violet-600" />,
        },
        {
          type: 'teacherTab' as const,
          tabId: 'PIKET' as TeacherTabType,
          label: 'Info Piket & Jadwal',
          shortLabel: 'Jadwal Piket',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
        },
      ],
    },
    {
      group: 'Layanan & Apel Sekolah',
      items: [
        {
          type: 'view' as const,
          viewId: 'guruIzinAbsen' as ViewType,
          label: 'Input Izin & Sakit Siswa',
          shortLabel: 'Izin/Sakit',
          icon: <Edit3 className="w-4 h-4 text-rose-600" />,
        },
        {
          type: 'view' as const,
          viewId: 'kiosk' as ViewType,
          label: 'Kiosk Presensi Apel (Pagi/Siang)',
          shortLabel: 'Kiosk Apel',
          icon: <Camera className="w-4 h-4 text-blue-500" />,
        },
        {
          type: 'view' as const,
          viewId: 'pantauPublik' as ViewType,
          label: 'Pantau Presensi Ortu',
          shortLabel: 'Pantau Ortu',
          icon: <Users className="w-4 h-4 text-sky-600" />,
        },
        {
          type: 'view' as const,
          viewId: 'kalenderHeb' as ViewType,
          label: 'Kalender Akademik HEB',
          shortLabel: 'Kalender HEB',
          icon: <CalendarDays className="w-4 h-4 text-purple-600" />,
        },
      ],
    },
  ];

  const handleGuruItemClick = (item: any) => {
    if (item.type === 'teacherTab') {
      if (onSelectTeacherTab) {
        onSelectTeacherTab(item.tabId);
      }
      if (currentView !== 'portalGuru') {
        onSelectView('portalGuru');
      }
    } else if (item.type === 'view') {
      onSelectView(item.viewId);
    }
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-20 h-full shadow-xs transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16 sm:w-20' : 'w-64 sm:w-72'
      }`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Sidebar Header with Toggle Hide/Show Button */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          {!isCollapsed && (
            <div className="flex items-center gap-2 pl-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {isGuru ? 'Menu Guru' : 'Menu Navigasi'}
              </span>
            </div>
          )}

          {/* Sembunyikan / Tampilkan Menu Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Buka Menu Samping' : 'Sembunyikan Menu Samping'}
            className={`p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 active:scale-95 transition cursor-pointer flex items-center gap-1.5 ${
              isCollapsed ? 'mx-auto' : 'ml-auto'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-blue-600" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-500" />
                <span className="text-[11px] font-bold text-slate-600">Sembunyikan</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-4 text-xs font-semibold scrollbar-thin">
          {/* Admin Navigation */}
          {isAdmin &&
            adminMenuGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                {!isCollapsed && (
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-wider py-1">
                    {group.group}
                  </div>
                )}
                {group.items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => onSelectView(item.id)}
                      className={`w-full flex items-center rounded-xl transition cursor-pointer relative group ${
                        isCollapsed
                          ? 'justify-center p-2.5 my-1'
                          : 'gap-2.5 px-3 py-2.5 text-left'
                      } ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs border border-blue-200/60'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>

                      {!isCollapsed && (
                        <span className="truncate flex-1 text-xs">{item.label}</span>
                      )}

                      {/* Active indicator bar */}
                      {isActive && (
                        <span
                          className={`absolute bg-blue-600 rounded-r-full ${
                            isCollapsed
                              ? 'left-0 top-2 bottom-2 w-1'
                              : 'right-1 top-2 bottom-2 w-1 rounded-full'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

          {/* Guru Navigation (With teaching tabs directly in sidebar) */}
          {isGuru &&
            guruMenuGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                {!isCollapsed && (
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 px-3 tracking-wider py-1">
                    {group.group}
                  </div>
                )}
                {group.items.map((item, idx) => {
                  let isActive = false;
                  if (item.type === 'teacherTab') {
                    isActive = currentView === 'portalGuru' && teacherActiveTab === item.tabId;
                  } else {
                    isActive = currentView === item.viewId;
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      title={item.label}
                      onClick={() => handleGuruItemClick(item)}
                      className={`w-full flex items-center rounded-xl transition cursor-pointer relative group ${
                        isCollapsed
                          ? 'justify-center p-2.5 my-1'
                          : 'gap-2.5 px-3 py-2.5 text-left'
                      } ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs border border-emerald-200/60'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      <span className="shrink-0 relative">
                        {item.icon}
                        {item.badge && item.badge > 0 && isCollapsed && (
                          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white font-black">
                            {item.badge}
                          </span>
                        )}
                      </span>

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate text-xs">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black shrink-0 ml-1">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Active indicator bar */}
                      {isActive && (
                        <span
                          className={`absolute bg-emerald-600 rounded-r-full ${
                            isCollapsed
                              ? 'left-0 top-2 bottom-2 w-1'
                              : 'right-1 top-2 bottom-2 w-1 rounded-full'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </nav>

        {/* User Card at bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative shrink-0">
                <img
                  src={
                    (isGuru
                      ? userSession.teacherData?.fotoUrl
                      : userSession.adminData?.fotoUrl || userSession.avatarUrl) ||
                    (isGuru
                      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                      : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80')
                  }
                  alt="Avatar"
                  className="w-8 h-8 rounded-xl object-cover border border-white shadow-2xs bg-slate-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                  }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
              </div>

              {!isCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-extrabold text-slate-800 leading-none truncate">
                    {isAdmin
                      ? userSession.adminData?.nama || 'ADMINISTRATOR'
                      : isGuru
                      ? userSession.teacherData?.nama || userSession.name || 'GURU'
                      : userSession.role || 'GUEST'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                    {isGuru && userSession.teacherData?.mapel
                      ? `${userSession.teacherData.mapel} ${
                          userSession.teacherData.waliKelas &&
                          userSession.teacherData.waliKelas !== 'Bukan Wali Kelas'
                            ? `• Wali ${userSession.teacherData.waliKelas}`
                            : ''
                        }`
                      : isAdmin
                      ? userSession.adminData?.jabatan || 'Operator Utama'
                      : 'Pengguna Terdaftar'}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && userSession.role && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                title="Keluar Akun"
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
