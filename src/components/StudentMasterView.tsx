import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  UserPlus,
  Trash2,
  FileSpreadsheet,
  Download,
  FolderArchive,
  Search,
  Edit2,
  CheckSquare,
  Square,
  X,
  Upload,
  User,
} from 'lucide-react';
import { Student } from '../types';
import { processImageFile } from '../utils/qr';
import { exportStudentsToExcel } from '../utils/export';

interface StudentMasterViewProps {
  students: Student[];
  onAddOrUpdateStudent: (student: Student, oldNisn?: string) => Promise<void>;
  onDeleteStudent: (nisn: string) => Promise<void>;
  onBatchDeleteStudents: (nisns: string[]) => Promise<void>;
  onBatchImportStudents: (newStudents: Student[]) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const StudentMasterView: React.FC<StudentMasterViewProps> = ({
  students,
  onAddOrUpdateStudent,
  onDeleteStudent,
  onBatchDeleteStudents,
  onBatchImportStudents,
  onShowNotice,
  onShowConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedNisns, setSelectedNisns] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [formOldNisn, setFormOldNisn] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJk, setFormJk] = useState<'L' | 'P'>('L');
  const [formKelas, setFormKelas] = useState('');
  const [formFotoPreview, setFormFotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const classes = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();

  // Filter students
  let filtered = [...students];
  if (selectedClass !== 'ALL') {
    filtered = filtered.filter((s) => s.kelas === selectedClass);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }
  filtered.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  const toggleSelectAll = () => {
    if (selectedNisns.length === filtered.length) {
      setSelectedNisns([]);
    } else {
      setSelectedNisns(filtered.map((s) => s.nisn));
    }
  };

  const toggleSelectNisn = (nisn: string) => {
    setSelectedNisns((prev) =>
      prev.includes(nisn) ? prev.filter((id) => id !== nisn) : [...prev, nisn]
    );
  };

  const openAddModal = () => {
    setModalMode('ADD');
    setFormOldNisn('');
    setFormNisn('');
    setFormNama('');
    setFormJk('L');
    setFormKelas('');
    setFormFotoPreview('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setModalMode('EDIT');
    setFormOldNisn(student.nisn);
    setFormNisn(student.nisn);
    setFormNama(student.nama);
    setFormJk(student.jk);
    setFormKelas(student.kelas);
    setFormFotoPreview(student.fotoUrl);
    setIsModalOpen(true);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await processImageFile(file, 280, 0.85);
      setFormFotoPreview(compressed);
    }
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNisn = formNisn.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanNisn) {
      onShowNotice('NISN Tidak Valid', 'NISN hanya boleh memuat huruf dan angka.', 'warning');
      return;
    }
    if (!formNama.trim() || !formKelas.trim()) {
      onShowNotice('Data Belum Lengkap', 'Nama dan Kelas wajib diisi.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const student: Student = {
        nisn: cleanNisn,
        nama: formNama.trim(),
        jk: formJk,
        kelas: formKelas.trim().toUpperCase(),
        fotoUrl: formFotoPreview || '',
      };

      await onAddOrUpdateStudent(student, modalMode === 'EDIT' ? formOldNisn : undefined);
      setIsModalOpen(false);
      onShowNotice('Sukses', `Data siswa ${student.nama} berhasil disimpan!`, 'success');
    } catch (err: any) {
      onShowNotice('Gagal', `Terjadi kendala: ${err.message}`, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import from Excel file
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        const newStudents: Student[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r && r[0] && r[1]) {
            const nisn = String(r[0]).trim();
            const nama = String(r[1]).trim();
            const jk = String(r[2] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';
            const kelas = String(r[3] || 'UMUM').trim().toUpperCase();
            const fotoUrl = r[4] ? String(r[4]).trim() : '';

            newStudents.push({ nisn, nama, jk, kelas, fotoUrl });
          }
        }

        if (newStudents.length > 0) {
          await onBatchImportStudents(newStudents);
          onShowNotice('Impor Selesai', `Berhasil mengimpor ${newStudents.length} siswa dari berkas Excel!`, 'success');
        } else {
          onShowNotice('Berkas Kosong', 'Tidak ditemukan baris data siswa yang valid pada berkas Excel.', 'warning');
        }
      } catch (err) {
        onShowNotice('Gagal Impor', 'Format berkas Excel tidak sesuai atau rusak.', 'warning');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Batch Photo ZIP Extractor
  const handleUploadZip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowNotice('Mengekstrak Foto', 'Memproses berkas arsip ZIP foto siswa...', 'info');

    JSZip.loadAsync(file)
      .then(async (zip) => {
        let matched = 0;
        const updatedStudents: Student[] = [];

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir) {
            const fileName = zipEntry.name.split('/').pop() || '';
            const nisnCandidate = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            const target = students.find((s) => s.nisn.trim() === nisnCandidate.trim());

            if (target) {
              const b64 = await zipEntry.async('base64');
              const mime = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
              const fullB64 = `data:${mime};base64,` + b64;
              updatedStudents.push({
                ...target,
                fotoUrl: fullB64,
              });
              matched++;
            }
          }
        }

        if (updatedStudents.length > 0) {
          await onBatchImportStudents(updatedStudents);
          onShowNotice('Selesai', `${matched} foto siswa berhasil disinkronkan ke database!`, 'success');
        } else {
          onShowNotice('Tidak Ditemukan', 'Nama berkas foto di dalam ZIP harus sesuai dengan NISN siswa (misal: 0091234501.jpg).', 'warning');
        }
      })
      .catch(() => {
        onShowNotice('Gagal', 'Pastikan berkas ZIP valid dan tidak terenkripsi kata sandi.', 'warning');
      });

    e.target.value = '';
  };

  const handleBatchDelete = () => {
    if (selectedNisns.length === 0) return;
    onShowConfirm(
      'Hapus Siswa Terpilih',
      `Apakah Anda yakin ingin menghapus permanen ${selectedNisns.length} data siswa dari database?`,
      async () => {
        await onBatchDeleteStudents(selectedNisns);
        setSelectedNisns([]);
        onShowNotice('Terhapus', `${selectedNisns.length} data siswa berhasil dihapus.`, 'success');
      }
    );
  };

  const handleDeleteSingle = (student: Student) => {
    onShowConfirm(
      'Hapus Siswa',
      `Hapus data siswa ${student.nama} (${student.nisn})?`,
      async () => {
        await onDeleteStudent(student.nisn);
        onShowNotice('Terhapus', `Siswa ${student.nama} berhasil dihapus.`, 'success');
      }
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header with Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Master Database Siswa
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data biodata siswa, foto terkompresi otomatis, dan impor/ekspor data massal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>

          {selectedNisns.length > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer animate-fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus ({selectedNisns.length})</span>
            </button>
          )}

          <label className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Impor Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => exportStudentsToExcel(students)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Format Excel</span>
          </button>

          <label className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <FolderArchive className="w-4 h-4" />
            <span>Ekstrak ZIP Foto</span>
            <input
              type="file"
              accept=".zip"
              onChange={handleUploadZip}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari NISN atau Nama Siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          >
            <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
          Menampilkan: <strong className="text-slate-900 ml-1.5">{filtered.length} Siswa</strong>
        </div>
      </div>

      {/* Student Table */}
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
                    {selectedNisns.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-3 w-14">Foto</th>
                <th className="p-3 w-28">NISN</th>
                <th className="p-3">Nama Lengkap Siswa</th>
                <th className="p-3 w-20">L/P</th>
                <th className="p-3 w-28">Kelas</th>
                <th className="p-3 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    Belum ada data siswa yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isSelected = selectedNisns.includes(s.nisn);
                  return (
                    <tr
                      key={s.nisn}
                      className={`hover:bg-slate-50 transition ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectNisn(s.nisn)}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <img
                          src={s.fotoUrl}
                          alt={s.nama}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://placehold.co/100x100/ffffff/64748b?text=Foto';
                          }}
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{s.nisn}</td>
                      <td className="p-3 font-semibold text-slate-900">{s.nama}</td>
                      <td className="p-3 text-slate-500">
                        {s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100 text-[11px]">
                          {s.kelas}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(s)}
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

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {modalMode === 'ADD' ? 'Tambah Data Siswa' : 'Edit Biodata Siswa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  NISN (Nomor Induk Siswa Nasional)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0091234501"
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap siswa"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formJk}
                    onChange={(e) => setFormJk(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Rombel / Kelas
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: VII-A"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Pas Foto Siswa
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-2xs">
                    {formFotoPreview ? (
                      <img
                        src={formFotoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 cursor-pointer"
                    />
                    <p className="text-[10px] text-emerald-600">
                      Otomatis dinetralkan dari latar belakang gelap ke putih bersih.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
