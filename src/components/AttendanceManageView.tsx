import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  FilterX,
  RotateCcw,
  Search,
  CheckSquare,
  Square,
  Edit2,
  Calendar,
  Clock,
  X,
  Eye,
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceSession, AttendanceStatus, SchoolConfig, TeacherUser } from '../types';
import { DEFAULT_SCHOOL_CONFIG } from '../firebase';
import { StudentDetailModal } from './StudentDetailModal';

interface AttendanceManageViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  config?: SchoolConfig;
  teachers?: TeacherUser[];
  onAddOrUpdateAttendance: (record: AttendanceRecord) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  onBatchDeleteAttendance: (ids: string[]) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const AttendanceManageView: React.FC<AttendanceManageViewProps> = ({
  students,
  attendance,
  config,
  teachers = [],
  onAddOrUpdateAttendance,
  onDeleteAttendance,
  onBatchDeleteAttendance,
  onShowNotice,
  onShowConfirm,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const curMonth = today.substring(0, 7);

  const [tglAwal, setTglAwal] = useState(`${curMonth}-01`);
  const [tglAkhir, setTglAkhir] = useState(today);
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterSesi, setFilterSesi] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Student Detail Modal state
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenStudentDetail = (s: Student) => {
    setSelectedDetailStudent(s);
    setIsDetailModalOpen(true);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [modalRecordId, setModalRecordId] = useState('');
  const [formSelectedNisn, setFormSelectedNisn] = useState('');
  const [formTanggal, setFormTanggal] = useState(today);
  const [formWaktu, setFormWaktu] = useState('');
  const [formSesi, setFormSesi] = useState<AttendanceSession>('Pagi');
  const [formStatus, setFormStatus] = useState<string>('Hadir Tepat Waktu');

  const classes = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();

  // Filter attendance records
  let filtered = [...attendance];
  if (tglAwal && tglAkhir) {
    filtered = filtered.filter((a) => a.tanggal >= tglAwal && a.tanggal <= tglAkhir);
  }
  if (filterKelas !== 'ALL') {
    filtered = filtered.filter((a) => a.kelas === filterKelas);
  }
  if (filterSesi !== 'ALL') {
    filtered = filtered.filter((a) => a.sesi === filterSesi);
  }
  filtered.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((a) => a.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setTglAwal(`${curMonth}-01`);
    setTglAkhir(today);
    setFilterKelas('ALL');
    setFilterSesi('ALL');
  };

  const openAddModal = () => {
    if (students.length === 0) {
      onShowNotice('Siswa Kosong', 'Tambahkan master siswa terlebih dahulu sebelum input presensi.', 'warning');
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setModalMode('ADD');
    setModalRecordId('');
    setFormSelectedNisn(students[0]?.nisn || '');
    setFormTanggal(today);
    setFormWaktu(timeStr);
    setFormSesi(now.getHours() < 12 ? 'Pagi' : 'Siang');
    setFormStatus('Hadir Tepat Waktu');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setModalMode('EDIT');
    setModalRecordId(rec.id);
    setFormSelectedNisn(rec.nisn);
    setFormTanggal(rec.tanggal);
    setFormWaktu(rec.waktu);
    setFormSesi(rec.sesi);
    setFormStatus(rec.status);
    setIsModalOpen(true);
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = students.find((s) => s.nisn === formSelectedNisn);
    if (!targetStudent) {
      onShowNotice('Siswa Tidak Ditemukan', 'Pilih siswa yang valid.', 'warning');
      return;
    }

    const recId = modalMode === 'EDIT' && modalRecordId
      ? modalRecordId
      : `PRESENSI_${targetStudent.nisn}_${formTanggal}_${formSesi}`;

    const record: AttendanceRecord = {
      id: recId,
      tanggal: formTanggal,
      waktu: formWaktu || '07:00:00',
      nisn: targetStudent.nisn,
      nama: targetStudent.nama,
      kelas: targetStudent.kelas,
      sesi: formSesi,
      status: formStatus,
    };

    try {
      await onAddOrUpdateAttendance(record);
      setIsModalOpen(false);
      onShowNotice('Tersimpan', `Presensi ${targetStudent.nama} berhasil dicatat!`, 'success');
    } catch (err: any) {
      onShowNotice('Gagal', err.message, 'warning');
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    onShowConfirm(
      'Hapus Catatan Terpilih',
      `Hapus permanen ${selectedIds.length} catatan presensi dari database?`,
      async () => {
        await onBatchDeleteAttendance(selectedIds);
        setSelectedIds([]);
        onShowNotice('Terhapus', `${selectedIds.length} data presensi berhasil dihapus.`, 'success');
      }
    );
  };

  const handleDeleteFiltered = () => {
    if (filtered.length === 0) {
      onShowNotice('Tidak Ada Data', 'Tidak ada data presensi yang sesuai dengan filter saat ini.', 'warning');
      return;
    }
    const targetIds = filtered.map((a) => a.id);
    onShowConfirm(
      'Hapus Riwayat Terfilter',
      `Ditemukan ${targetIds.length} catatan presensi pada rentang ${tglAwal} s/d ${tglAkhir}. Hapus permanen seluruh data ini?`,
      async () => {
        await onBatchDeleteAttendance(targetIds);
        setSelectedIds([]);
        onShowNotice('Terhapus', `${targetIds.length} catatan presensi terfilter berhasil dihapus.`, 'success');
      }
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Kelola Catatan Presensi (Realtime Database)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter riwayat kehadiran, koreksi status presensi siswa, atau hapus log berkala.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Presensi Manual</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDeleteFiltered}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FilterX className="w-4 h-4" />
            <span>Hapus Riwayat Terfilter</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Tanggal Mulai
          </label>
          <input
            type="date"
            value={tglAwal}
            onChange={(e) => setTglAwal(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Tanggal Sampai
          </label>
          <input
            type="date"
            value={tglAkhir}
            onChange={(e) => setTglAkhir(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Rombel / Kelas
          </label>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Sesi Presensi
          </label>
          <select
            value={filterSesi}
            onChange={(e) => setFilterSesi(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
          >
            <option value="ALL">Semua Sesi</option>
            <option value="Pagi">Sesi Pagi</option>
            <option value="Siang">Sesi Siang</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleResetFilters}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-slate-600 hover:text-blue-600"
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-3 w-28">Tanggal</th>
                <th className="p-3 w-24">Waktu</th>
                <th className="p-3 w-28">NISN</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3 w-24">Kelas</th>
                <th className="p-3 w-24">Sesi</th>
                <th className="p-3">Status Kehadiran</th>
                <th className="p-3 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                    Belum ada catatan presensi sesuai kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const isSelected = selectedIds.includes(a.id);
                  const badgeColor =
                    a.sesi === 'Pagi'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50 transition ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectId(a.id)}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{a.tanggal}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{a.waktu}</td>
                      <td
                        onClick={() => {
                          const s = students.find((st) => st.nisn === a.nisn);
                          if (s) handleOpenStudentDetail(s);
                        }}
                        className="p-3 font-mono text-slate-700 hover:text-blue-600 cursor-pointer font-bold"
                        title="Klik untuk melihat profil lengkap siswa"
                      >
                        {a.nisn}
                      </td>
                      <td
                        onClick={() => {
                          const s = students.find((st) => st.nisn === a.nisn);
                          if (s) handleOpenStudentDetail(s);
                        }}
                        className="p-3 font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
                        title="Klik untuk melihat profil lengkap siswa"
                      >
                        {a.nama}
                      </td>
                      <td className="p-3 text-slate-600">{a.kelas}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {a.sesi}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{a.status}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const s = students.find((st) => st.nisn === a.nisn);
                              if (s) handleOpenStudentDetail(s);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Lihat Profil & Histori Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(a)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onShowConfirm(
                                'Hapus Catatan',
                                `Hapus catatan presensi ${a.nama} (${a.sesi})?`,
                                async () => {
                                  await onDeleteAttendance(a.id);
                                  onShowNotice('Terhapus', 'Catatan presensi berhasil dihapus.', 'success');
                                }
                              );
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
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

      {/* Manual Attendance Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {modalMode === 'ADD' ? 'Input Presensi Manual' : 'Koreksi Data Presensi'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Pilih Siswa
                </label>
                <select
                  value={formSelectedNisn}
                  onChange={(e) => setFormSelectedNisn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  {students.map((s) => (
                    <option key={s.nisn} value={s.nisn}>
                      {s.nama} ({s.nisn} - {s.kelas})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Waktu (24 Jam WIB - JJ:MM:DD)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="07:15:00"
                      value={formWaktu}
                      onChange={(e) => setFormWaktu(e.target.value)}
                      className="w-full pl-3 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 select-none">
                      WIB
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Sesi Presensi
                  </label>
                  <select
                    value={formSesi}
                    onChange={(e) => setFormSesi(e.target.value as AttendanceSession)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-semibold"
                  >
                    <option value="Pagi">Sesi Pagi</option>
                    <option value="Siang">Sesi Siang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Status Kehadiran
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-semibold"
                  >
                    <option value="Hadir Tepat Waktu">Hadir Tepat Waktu</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Pulang Tepat Waktu">Pulang Tepat Waktu</option>
                    <option value="Pulang Mendahului">Pulang Mendahului</option>
                    <option value="Pulang Terlambat">Pulang Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer"
                >
                  Simpan Catatan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aesthetic Student Detail Modal */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedDetailStudent}
        studentsList={students}
        onSelectStudent={(s) => setSelectedDetailStudent(s)}
        attendance={attendance}
        config={config || DEFAULT_SCHOOL_CONFIG}
        teachers={teachers}
        onShowNotice={onShowNotice}
      />
    </div>
  );
};
