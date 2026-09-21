import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Phone,
  Sparkles,
} from 'lucide-react';
import { TeacherUser, SchoolConfig } from '../types';

interface TeacherManageViewProps {
  teachers: TeacherUser[];
  config: SchoolConfig;
  onAddTeacher: (teacher: TeacherUser) => Promise<void>;
  onUpdateTeacher: (teacher: TeacherUser) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const COMMON_SUBJECTS = [
  'Pendidikan Agama Islam & BP',
  'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',
  'Prakarya / Kewirausahaan',
  'Informatika / TIK',
  'Bimbingan Konseling (BK)',
  'Muatan Lokal (Bahasa Sunda)',
];

const CLASS_OPTIONS = [
  'Bukan Wali Kelas',
  'VII-A',
  'VII-B',
  'VIII-A',
  'VIII-B',
  'IX-A',
  'IX-B',
];

export const TeacherManageView: React.FC<TeacherManageViewProps> = ({
  teachers,
  config,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onShowNotice,
  onShowConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'NONAKTIF'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherUser | null>(null);
  const [resettingTeacher, setResettingTeacher] = useState<TeacherUser | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formNama, setFormNama] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formMapel, setFormMapel] = useState(COMMON_SUBJECTS[0]);
  const [formWaliKelas, setFormWaliKelas] = useState('Bukan Wali Kelas');
  const [formKontak, setFormKontak] = useState('');
  const [formStatus, setFormStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Reset password form state
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.waliKelas && t.waliKelas.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [teachers, searchQuery, statusFilter]);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = 'gr-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleOpenAdd = () => {
    setFormNama('');
    setFormNip('');
    setFormUsername('');
    setFormPassword(generateRandomPassword());
    setFormMapel(COMMON_SUBJECTS[0]);
    setFormWaliKelas('Bukan Wali Kelas');
    setFormKontak('');
    setFormStatus('AKTIF');
    setShowFormPassword(true);
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: TeacherUser) => {
    setEditingTeacher(t);
    setFormNama(t.nama);
    setFormNip(t.nip);
    setFormUsername(t.username);
    setFormPassword(t.password);
    setFormMapel(t.mapel);
    setFormWaliKelas(t.waliKelas || 'Bukan Wali Kelas');
    setFormKontak(t.kontak || '');
    setFormStatus(t.status);
    setShowFormPassword(false);
  };

  const handleSuggestUsername = (nama: string) => {
    if (!nama.trim()) return;
    const clean = nama
      .toLowerCase()
      .replace(/^(drs\.|dra\.|dr\.|h\.|hj\.)/g, '')
      .replace(/,\s*[a-z\.]+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    if (clean) {
      setFormUsername(`${clean}.guru`);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formUsername.trim() || !formPassword.trim()) {
      onShowNotice('Validasi Gagal', 'Nama, Username, dan Password wajib diisi.', 'warning');
      return;
    }

    const usernameExist = teachers.some(
      (t) => t.username.toLowerCase() === formUsername.trim().toLowerCase()
    );
    if (usernameExist) {
      onShowNotice('Username Telah Digunakan', 'Username ini sudah terdaftar untuk guru lain. Silakan gunakan username yang berbeda.', 'warning');
      return;
    }

    const newTeacher: TeacherUser = {
      id: `guru-${Date.now().toString().slice(-6)}`,
      nama: formNama.trim(),
      nip: formNip.trim() || '-',
      username: formUsername.trim().toLowerCase(),
      password: formPassword.trim(),
      mapel: formMapel.trim(),
      waliKelas: formWaliKelas === 'Bukan Wali Kelas' ? undefined : formWaliKelas,
      kontak: formKontak.trim() || undefined,
      status: formStatus,
      createdAt: new Date().toISOString(),
    };

    try {
      await onAddTeacher(newTeacher);
      setShowAddModal(false);
      onShowNotice(
        'Akun Guru Berhasil Dibuat',
        `Akun untuk ${newTeacher.nama} siap digunakan. Username: ${newTeacher.username}`,
        'success'
      );
    } catch (err: any) {
      onShowNotice('Gagal Menyimpan', err.message, 'warning');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!formNama.trim() || !formUsername.trim() || !formPassword.trim()) {
      onShowNotice('Validasi Gagal', 'Nama, Username, dan Password wajib diisi.', 'warning');
      return;
    }

    const usernameExist = teachers.some(
      (t) => t.id !== editingTeacher.id && t.username.toLowerCase() === formUsername.trim().toLowerCase()
    );
    if (usernameExist) {
      onShowNotice('Username Telah Digunakan', 'Username ini sudah terdaftar untuk guru lain.', 'warning');
      return;
    }

    const updated: TeacherUser = {
      ...editingTeacher,
      nama: formNama.trim(),
      nip: formNip.trim() || '-',
      username: formUsername.trim().toLowerCase(),
      password: formPassword.trim(),
      mapel: formMapel.trim(),
      waliKelas: formWaliKelas === 'Bukan Wali Kelas' ? undefined : formWaliKelas,
      kontak: formKontak.trim() || undefined,
      status: formStatus,
    };

    try {
      await onUpdateTeacher(updated);
      setEditingTeacher(null);
      onShowNotice('Berhasil Diperbarui', `Data akun guru ${updated.nama} telah diperbarui.`, 'success');
    } catch (err: any) {
      onShowNotice('Gagal Memperbarui', err.message, 'warning');
    }
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingTeacher) return;
    if (!newPassword.trim() || newPassword.length < 5) {
      onShowNotice('Sandi Terlalu Pendek', 'Kata sandi minimal 5 karakter.', 'warning');
      return;
    }

    const updated: TeacherUser = {
      ...resettingTeacher,
      password: newPassword.trim(),
    };

    try {
      await onUpdateTeacher(updated);
      setResettingTeacher(null);
      setNewPassword('');
      onShowNotice('Sandi Berhasil Direset', `Kata sandi baru untuk ${updated.nama} berhasil disimpan: ${updated.password}`, 'success');
    } catch (err: any) {
      onShowNotice('Gagal Reset Sandi', err.message, 'warning');
    }
  };

  const handleDelete = (t: TeacherUser) => {
    onShowConfirm(
      'Hapus Akun Guru',
      `Apakah Anda yakin ingin menghapus akun login untuk ${t.nama} (${t.username})? Guru ini tidak akan bisa login lagi ke sistem.`,
      async () => {
        try {
          await onDeleteTeacher(t.id);
          onShowNotice('Akun Dihapus', `Akun ${t.nama} telah dihapus.`, 'info');
        } catch (err: any) {
          onShowNotice('Gagal Menghapus', err.message, 'warning');
        }
      }
    );
  };

  const handleToggleStatus = async (t: TeacherUser) => {
    const nextStatus = t.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    const updated: TeacherUser = { ...t, status: nextStatus };
    try {
      await onUpdateTeacher(updated);
      onShowNotice(
        'Status Akun Diubah',
        `Akun ${t.nama} sekarang berstatus ${nextStatus}.`,
        nextStatus === 'AKTIF' ? 'success' : 'info'
      );
    } catch (err: any) {
      onShowNotice('Gagal Mengubah Status', err.message, 'warning');
    }
  };

  const handleCopyCredentials = (t: TeacherUser) => {
    const text = `*AKUN LOGIN E-PRESENSI SISWA*\nSekolah: ${config.namaSekolah}\nNama Guru: ${t.nama}\nNIP: ${t.nip}\nMata Pelajaran: ${t.mapel}\nUsername: ${t.username}\nPassword: ${t.password}\n\nSilakan login melalui tombol Login Guru di website presensi sekolah.`;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2500);
    onShowNotice('Disalin ke Clipboard', `Data login untuk ${t.nama} siap dikirim melalui WhatsApp/Pesan.`, 'success');
  };

  const handleExportExcel = () => {
    if (teachers.length === 0) {
      onShowNotice('Data Kosong', 'Belum ada data akun guru untuk diekspor.', 'warning');
      return;
    }

    const rows = [
      ['DAFTAR AKUN PENGGUNA GURU - E-PRESENSI'],
      [config.namaSekolah],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ['NO', 'NAMA GURU & GELAR', 'NIP / NUPTK', 'USERNAME', 'PASSWORD', 'MATA PELAJARAN', 'WALI KELAS', 'KONTAK', 'STATUS'],
    ];

    teachers.forEach((t, idx) => {
      rows.push([
        String(idx + 1),
        t.nama,
        t.nip,
        t.username,
        t.password,
        t.mapel,
        t.waliKelas || '-',
        t.kontak || '-',
        t.status,
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'AKUN_GURU');
    XLSX.writeFile(wb, `Daftar_Akun_Guru_${config.namaSekolah.replace(/\s+/g, '_')}.xlsx`);
    onShowNotice('Ekspor Berhasil', 'Berkas Excel akun guru berhasil diunduh.', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Manajemen Akun Pengguna Guru
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin dapat membuat, mengelola kata sandi, dan mengatur hak akses akun guru pengajar & wali kelas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Ekspor daftar akun guru ke berkas Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Akun Guru</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Guru Terdaftar</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{teachers.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pengguna Web Terdaftar</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Akun Aktif</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {teachers.filter((t) => t.status === 'AKTIF').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Siap login ke portal</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Wali Kelas</p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {teachers.filter((t) => t.waliKelas && t.waliKelas !== 'Bukan Wali Kelas').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Guru Pembina Rombel</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Akun Nonaktif</p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {teachers.filter((t) => t.status === 'NONAKTIF').length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Akses sementara ditutup</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Cari nama, NIP, username, mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('AKTIF')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'AKTIF'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif ({teachers.filter((t) => t.status === 'AKTIF').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NONAKTIF')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'NONAKTIF'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nonaktif ({teachers.filter((t) => t.status === 'NONAKTIF').length})
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Lengkap & NIP</th>
                <th className="py-3.5 px-4">Kredensial Login</th>
                <th className="py-3.5 px-4">Mata Pelajaran & Kelas</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm text-slate-600">Tidak ada data guru yang cocok</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba ubah kata kunci pencarian atau klik "+ Tambah Akun Guru"
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  const isPwVisible = visiblePasswords[t.id];
                  const isCopied = copiedId === t.id;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {t.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">
                              {t.nama}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              NIP: {t.nip || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">User:</span>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                              {t.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">Pass:</span>
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {isPwVisible ? t.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(t.id)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              title={isPwVisible ? 'Sembunyikan sandi' : 'Lihat sandi'}
                            >
                              {isPwVisible ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{t.mapel}</span>
                          </p>
                          {t.waliKelas && t.waliKelas !== 'Bukan Wali Kelas' ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-extrabold text-[10px] border border-amber-200">
                              <GraduationCap className="w-3 h-3 text-amber-600" />
                              <span>Wali Kelas {t.waliKelas}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Guru Mapel
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(t)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition cursor-pointer inline-flex items-center gap-1 border ${
                            t.status === 'AKTIF'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Klik untuk mengubah status akun"
                        >
                          {t.status === 'AKTIF' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(t)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Salin kredensial untuk dikirim ke Guru via WA"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResettingTeacher(t);
                              setNewPassword(generateRandomPassword());
                              setShowNewPassword(true);
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Reset kata sandi guru"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit data guru"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus akun guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL: TAMBAH AKUN GURU BARU ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Tambah Akun Pengguna Guru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Lengkap & Gelar Guru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={formNama}
                  onChange={(e) => {
                    setFormNama(e.target.value);
                    if (!formUsername) handleSuggestUsername(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="19800101 200501 1 001"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    No. HP / WhatsApp (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={formKontak}
                    onChange={(e) => setFormKontak(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                  Kredensial Masuk Web (Login Guru)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="budi.guru"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-bold">
                        Kata Sandi <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormPassword(generateRandomPassword())}
                        className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Acak
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mata Pelajaran yang Diampu
                  </label>
                  <select
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    {COMMON_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Wali Kelas (Jika Ada)
                  </label>
                  <select
                    value={formWaliKelas}
                    onChange={(e) => setFormWaliKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Status Akun
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="AKTIF"
                      checked={formStatus === 'AKTIF'}
                      onChange={() => setFormStatus('AKTIF')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-emerald-700">Aktif (Bisa Login)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="NONAKTIF"
                      checked={formStatus === 'NONAKTIF'}
                      onChange={() => setFormStatus('NONAKTIF')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-rose-600">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                >
                  Simpan Akun Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: EDIT DATA GURU ===== */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Edit Akun Guru: {editingTeacher.nama}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Lengkap & Gelar Guru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    No. HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formKontak}
                    onChange={(e) => setFormKontak(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                  Kredensial Masuk Web
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    {COMMON_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Wali Kelas
                  </label>
                  <select
                    value={formWaliKelas}
                    onChange={(e) => setFormWaliKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                  >
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Status Akun
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      value="AKTIF"
                      checked={formStatus === 'AKTIF'}
                      onChange={() => setFormStatus('AKTIF')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-emerald-700">Aktif</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      value="NONAKTIF"
                      checked={formStatus === 'NONAKTIF'}
                      onChange={() => setFormStatus('NONAKTIF')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-rose-600">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                >
                  Perbarui Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: RESET PASSWORD GURU ===== */}
      {resettingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Reset Kata Sandi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResettingTeacher(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600">
                Reset kata sandi untuk guru:
              </p>
              <p className="font-extrabold text-sm text-slate-900 mt-0.5">
                {resettingTeacher.nama}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Username: <span className="font-bold text-blue-600">{resettingTeacher.username}</span>
              </p>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">
                    Kata Sandi Baru
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Acak Sandi
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingTeacher(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                >
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
