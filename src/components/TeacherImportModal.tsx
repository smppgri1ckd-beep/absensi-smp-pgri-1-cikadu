import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Sparkles,
  Users,
  Info,
  RefreshCw,
} from 'lucide-react';
import { TeacherUser, SchoolConfig } from '../types';
import { downloadTeacherExcelTemplate } from '../utils/export';

interface TeacherImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  existingTeachers?: TeacherUser[];
  onImport: (newTeachers: TeacherUser[]) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

type RowValidationStatus = 'BARU' | 'UPDATE_NIP' | 'UPDATE_USER' | 'DUPLIKAT_FILE' | 'INVALID';

interface ParsedTeacherRow {
  teacher: TeacherUser;
  statusType: RowValidationStatus;
  statusNote: string;
}

export const TeacherImportModal: React.FC<TeacherImportModalProps> = ({
  isOpen,
  onClose,
  config,
  existingTeachers = [],
  onImport,
  onShowNotice,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    downloadTeacherExcelTemplate(config);
    onShowNotice('Unduh Berhasil', 'Template Excel data guru berhasil diunduh.', 'success');
  };

  const parseFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setParsedRows([]);
    setParseErrors([]);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setParseErrors(['Berkas Excel tidak memiliki lembar kerja (sheet) yang valid.']);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rows.length === 0) {
        setParseErrors(['Berkas Excel kosong. Pastikan mengunggah file yang berisi data.']);
        return;
      }

      // Find header row
      let headerRowIndex = -1;
      let colIdx = {
        no: -1,
        nama: -1,
        nip: -1,
        username: -1,
        password: -1,
        mapel: -1,
        waliKelas: -1,
        kontak: -1,
        status: -1,
      };

      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        const rowStr = row.map((cell) => String(cell).toUpperCase().trim());
        const hasNama = rowStr.some((c) => c.includes('NAMA'));
        const hasNip = rowStr.some((c) => c.includes('NIP') || c.includes('NUPTK'));
        const hasMapel = rowStr.some((c) => c.includes('MAPEL') || c.includes('PELAJARAN'));

        if (hasNama || hasNip || hasMapel) {
          headerRowIndex = i;
          rowStr.forEach((col, idx) => {
            if (col.includes('NO') && !col.includes('HP') && colIdx.no === -1) colIdx.no = idx;
            else if (col.includes('NAMA') && colIdx.nama === -1) colIdx.nama = idx;
            else if ((col.includes('NIP') || col.includes('NUPTK')) && colIdx.nip === -1) colIdx.nip = idx;
            else if (col.includes('USER') && colIdx.username === -1) colIdx.username = idx;
            else if ((col.includes('PASS') || col.includes('SANDI')) && colIdx.password === -1) colIdx.password = idx;
            else if ((col.includes('MAPEL') || col.includes('PELAJARAN')) && colIdx.mapel === -1) colIdx.mapel = idx;
            else if ((col.includes('WALI') || col.includes('KELAS')) && colIdx.waliKelas === -1) colIdx.waliKelas = idx;
            else if (
              (col.includes('HP') || col.includes('KONTAK') || col.includes('WA') || col.includes('TELP')) &&
              colIdx.kontak === -1
            )
              colIdx.kontak = idx;
            else if (col.includes('STATUS') && colIdx.status === -1) colIdx.status = idx;
          });
          break;
        }
      }

      // Default column mapping if header missing
      if (headerRowIndex === -1) {
        headerRowIndex = 0;
        colIdx = {
          no: 0,
          nama: 1,
          nip: 2,
          username: 3,
          password: 4,
          mapel: 5,
          waliKelas: 6,
          kontak: 7,
          status: 8,
        };
      }

      if (colIdx.nama === -1) colIdx.nama = 1;
      if (colIdx.nip === -1) colIdx.nip = 2;
      if (colIdx.username === -1) colIdx.username = 3;
      if (colIdx.password === -1) colIdx.password = 4;
      if (colIdx.mapel === -1) colIdx.mapel = 5;
      if (colIdx.waliKelas === -1) colIdx.waliKelas = 6;
      if (colIdx.kontak === -1) colIdx.kontak = 7;
      if (colIdx.status === -1) colIdx.status = 8;

      const dataRows = rows.slice(headerRowIndex + 1);
      const tempRows: ParsedTeacherRow[] = [];
      const errors: string[] = [];

      const seenFileNips = new Set<string>();
      const seenFileUsernames = new Set<string>();

      dataRows.forEach((row, idx) => {
        if (!row || row.length === 0) return;

        const rawNama = String(row[colIdx.nama] ?? '').trim();
        if (!rawNama || rawNama.toLowerCase() === 'nama guru' || rawNama.startsWith('contoh:')) {
          return;
        }

        const rawNip = String(row[colIdx.nip] ?? '').trim() || '-';
        let rawUsername = String(row[colIdx.username] ?? '').trim().toLowerCase().replace(/\s+/g, '');
        let rawPassword = String(row[colIdx.password] ?? '').trim();
        const rawMapel = String(row[colIdx.mapel] ?? '').trim() || 'Semua Mata Pelajaran';
        const rawWali = String(row[colIdx.waliKelas] ?? '').trim();
        const rawKontak = String(row[colIdx.kontak] ?? '').trim();
        const rawStatus = String(row[colIdx.status] ?? '').toUpperCase().trim();

        if (rawNama.length < 2) {
          tempRows.push({
            teacher: {
              id: `invalid-${idx}`,
              nama: rawNama || '(Nama Kosong)',
              nip: rawNip,
              username: rawUsername || '-',
              password: rawPassword,
              mapel: rawMapel,
              status: 'NONAKTIF',
              createdAt: new Date().toISOString(),
            },
            statusType: 'INVALID',
            statusNote: 'Nama guru terlalu pendek atau tidak sesuai.',
          });
          return;
        }

        if (!rawUsername) {
          const cleanName = rawNama
            .toLowerCase()
            .replace(/^(drs\.|dra\.|dr\.|h\.|hj\.)/g, '')
            .replace(/,\s*[a-z\.]+/g, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
          rawUsername = cleanName ? `${cleanName}.guru` : `guru.${idx + 1}`;
        }

        if (!rawPassword) {
          rawPassword = 'guru' + Math.floor(1000 + Math.random() * 9000);
        }

        const validStatus: 'AKTIF' | 'NONAKTIF' = rawStatus === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';
        const waliKelasVal = rawWali && rawWali !== '-' && rawWali !== 'Bukan Wali Kelas' ? rawWali : undefined;

        const teacherObj: TeacherUser = {
          id: `guru-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          nama: rawNama,
          nip: rawNip,
          username: rawUsername,
          password: rawPassword,
          mapel: rawMapel,
          waliKelas: waliKelasVal,
          kontak: rawKontak && rawKontak !== '-' ? rawKontak : undefined,
          noHp: rawKontak && rawKontak !== '-' ? rawKontak : undefined,
          status: validStatus,
          createdAt: new Date().toISOString(),
        };

        // Determine duplicate status
        const hasNip = rawNip && rawNip !== '-';
        const isInternalDupNip = hasNip && seenFileNips.has(rawNip);
        const isInternalDupUser = seenFileUsernames.has(rawUsername);

        if (isInternalDupNip || isInternalDupUser) {
          tempRows.push({
            teacher: teacherObj,
            statusType: 'DUPLIKAT_FILE',
            statusNote: isInternalDupNip ? `NIP ${rawNip} ganda dalam berkas` : `Username @${rawUsername} ganda dalam berkas`,
          });
        } else {
          if (hasNip) seenFileNips.add(rawNip);
          seenFileUsernames.add(rawUsername);

          // Check with existing database teachers
          const existingByNip = hasNip ? existingTeachers.find((t) => t.nip && t.nip !== '-' && t.nip.trim() === rawNip) : null;
          const existingByUser = existingTeachers.find((t) => t.username && t.username.toLowerCase() === rawUsername);

          if (existingByNip) {
            tempRows.push({
              teacher: { ...teacherObj, id: existingByNip.id, fotoUrl: existingByNip.fotoUrl },
              statusType: 'UPDATE_NIP',
              statusNote: `NIP ${rawNip} terdaftar (${existingByNip.nama}) -> Akan diperbarui`,
            });
          } else if (existingByUser) {
            tempRows.push({
              teacher: { ...teacherObj, id: existingByUser.id, fotoUrl: existingByUser.fotoUrl },
              statusType: 'UPDATE_USER',
              statusNote: `Username @${rawUsername} terdaftar (${existingByUser.nama}) -> Akan diperbarui`,
            });
          } else {
            tempRows.push({
              teacher: teacherObj,
              statusType: 'BARU',
              statusNote: 'Akun Guru Baru',
            });
          }
        }
      });

      if (tempRows.length === 0) {
        errors.push('Tidak ada baris data guru yang valid ditemukan dalam berkas Excel.');
      }

      setParsedRows(tempRows);
      setParseErrors(errors);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setParseErrors([`Gagal membaca berkas Excel: ${err?.message || 'Format tidak didukung'}`]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      parseFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      parseFile(droppedFile);
    }
  };

  // Validation summaries
  const stats = useMemo(() => {
    let baru = 0;
    let update = 0;
    let duplikat = 0;
    let invalid = 0;

    parsedRows.forEach((r) => {
      if (r.statusType === 'BARU') baru++;
      else if (r.statusType === 'UPDATE_NIP' || r.statusType === 'UPDATE_USER') update++;
      else if (r.statusType === 'DUPLIKAT_FILE') duplikat++;
      else if (r.statusType === 'INVALID') invalid++;
    });

    return { baru, update, duplikat, invalid, total: parsedRows.length };
  }, [parsedRows]);

  const handleConfirmImport = async () => {
    const validTeachers = parsedRows
      .filter((r) => r.statusType !== 'INVALID')
      .map((r) => r.teacher);

    if (validTeachers.length === 0) {
      onShowNotice('Gagal Impor', 'Tidak ada baris guru yang valid untuk diimpor.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(validTeachers);
      onClose();
    } catch (err: any) {
      onShowNotice('Gagal Impor', err?.message || 'Terjadi kesalahan saat menyimpan data guru.', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Impor & Validasi Akun Guru dari Excel
              </h3>
              <p className="text-xs text-slate-500">
                Unggah berkas spreadsheet .xlsx / .xls dengan verifikasi otomatis NIP & username ganda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Multi-subject note */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-xs">Guru Mengampu Banyak Mata Pelajaran & Kelas Berbeda</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Jika 1 guru mengajar hingga 3 mata pelajaran berbeda (misal: <strong>Matematika, IPA, Informatika</strong>), cukup tuliskan semua nama mata pelajaran yang dipisahkan dengan tanda koma (<strong>,</strong>) pada kolom Mapel. Guru dapat memilih kelas & mata pelajaran saat mengajar di Portal Guru.
              </p>
            </div>
          </div>

          {/* Template Download Card */}
          <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-xs">Belum memiliki template Excel guru?</p>
                <p className="text-[11px] text-slate-600">
                  Unduh template resmi dengan susunan kolom standar yang siap diisi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-inner">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm">
                {file ? file.name : 'Pilih Berkas Excel atau Tarik & Lepas di Sini'}
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Mendukung format .xlsx dan .xls (Maksimal 10MB)
              </p>
            </div>
            {file && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Berkas Terpilih & Terbaca
              </span>
            )}
          </div>

          {/* Error warnings */}
          {parseErrors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Peringatan Pembacaan Berkas:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] pl-2 space-y-0.5 text-rose-600">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table & Validation Summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="font-extrabold text-slate-900 text-xs">
                    Hasil Validasi ({stats.total} Baris)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {stats.baru} Akun Baru
                  </span>
                  {stats.update > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                      {stats.update} Diperbarui (NIP/User Ada)
                    </span>
                  )}
                  {stats.duplikat > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                      {stats.duplikat} Duplikat File
                    </span>
                  )}
                  {stats.invalid > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                      {stats.invalid} Tidak Sesuai
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Guru</th>
                      <th className="py-2.5 px-3">NIP / NUPTK</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Mata Pelajaran</th>
                      <th className="py-2.5 px-3">Wali Kelas</th>
                      <th className="py-2.5 px-3">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.statusType === 'INVALID'
                            ? 'bg-rose-50/60'
                            : row.statusType === 'DUPLIKAT_FILE'
                            ? 'bg-amber-50/60'
                            : row.statusType.startsWith('UPDATE')
                            ? 'bg-blue-50/40'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{row.teacher.nama}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{row.teacher.nip}</td>
                        <td className="py-2 px-3 font-mono text-blue-600 font-bold">{row.teacher.username}</td>
                        <td className="py-2 px-3 max-w-[180px] truncate" title={row.teacher.mapel}>
                          {row.teacher.mapel}
                        </td>
                        <td className="py-2 px-3">
                          {row.teacher.waliKelas ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-bold text-[10px]">
                              {row.teacher.waliKelas}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.statusType === 'BARU' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Baru
                            </span>
                          )}
                          {(row.statusType === 'UPDATE_NIP' || row.statusType === 'UPDATE_USER') && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"
                              title={row.statusNote}
                            >
                              <RefreshCw className="w-3 h-3" /> {row.statusType === 'UPDATE_NIP' ? 'NIP Ada' : 'User Ada'}
                            </span>
                          )}
                          {row.statusType === 'DUPLIKAT_FILE' && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                              title={row.statusNote}
                            >
                              <AlertTriangle className="w-3 h-3" /> Duplikat
                            </span>
                          )}
                          {row.statusType === 'INVALID' && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"
                              title={row.statusNote}
                            >
                              <AlertTriangle className="w-3 h-3" /> Format Gagal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
            disabled={isProcessing}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs ${
              parsedRows.length > 0 && !isProcessing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Sistem...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Konfirmasi & Simpan {stats.total > 0 ? `(${stats.baru + stats.update} Guru)` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
