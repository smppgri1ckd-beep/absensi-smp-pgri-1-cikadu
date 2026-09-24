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
  FileText,
  HelpCircle,
} from 'lucide-react';
import { TeacherUser, SchoolConfig } from '../types';
import { downloadTeacherExcelTemplate, downloadTeacherCsvTemplate } from '../utils/export';

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

  const handleDownloadExcelTemplate = () => {
    downloadTeacherExcelTemplate(config);
    onShowNotice('Unduh Berhasil', 'Template Excel (.xlsx) data guru dengan lembar panduan berhasil diunduh.', 'success');
  };

  const handleDownloadCsvTemplate = () => {
    downloadTeacherCsvTemplate(config);
    onShowNotice('Unduh Berhasil', 'Template CSV (.csv) data guru berhasil diunduh.', 'success');
  };

  // Safe cell string cleaner
  const cleanCellValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    // Check if exponential number representation like 1.98203e+17
    if (/^\d+\.?\d*e\+\d+$/i.test(str)) {
      try {
        str = BigInt(Math.round(Number(str))).toString();
      } catch {
        // keep string
      }
    }
    return str;
  };

  const parseFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setParsedRows([]);
    setParseErrors([]);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Find template sheet or fallback to first sheet
      const targetSheetName =
        workbook.SheetNames.find((s) => s.toUpperCase().includes('GURU') || s.toUpperCase().includes('TEMPLATE')) ||
        workbook.SheetNames[0];

      if (!targetSheetName) {
        setParseErrors(['Berkas tidak memiliki lembar kerja (sheet) yang valid.']);
        return;
      }

      const worksheet = workbook.Sheets[targetSheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rows.length === 0) {
        setParseErrors(['Berkas kosong. Pastikan mengunggah file yang memuat data guru.']);
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

        const rowStr = row.map((cell) => cleanCellValue(cell).toUpperCase());
        const hasNama = rowStr.some((c) => c.includes('NAMA') || c.includes('GELAR'));
        const hasNip = rowStr.some((c) => c.includes('NIP') || c.includes('NUPTK') || c.includes('INDUK'));
        const hasMapel = rowStr.some((c) => c.includes('MAPEL') || c.includes('PELAJARAN') || c.includes('BIDANG'));

        if (hasNama || hasNip || hasMapel) {
          headerRowIndex = i;
          rowStr.forEach((col, idx) => {
            if ((col.includes('NO') || col === 'NO.') && !col.includes('HP') && !col.includes('WA') && colIdx.no === -1) {
              colIdx.no = idx;
            } else if ((col.includes('NAMA') || col.includes('GELAR')) && colIdx.nama === -1) {
              colIdx.nama = idx;
            } else if ((col.includes('NIP') || col.includes('NUPTK') || col.includes('INDUK')) && colIdx.nip === -1) {
              colIdx.nip = idx;
            } else if ((col.includes('USER') || col.includes('LOGIN')) && colIdx.username === -1) {
              colIdx.username = idx;
            } else if ((col.includes('PASS') || col.includes('SANDI')) && colIdx.password === -1) {
              colIdx.password = idx;
            } else if ((col.includes('MAPEL') || col.includes('PELAJARAN') || col.includes('BIDANG')) && colIdx.mapel === -1) {
              colIdx.mapel = idx;
            } else if ((col.includes('WALI') || col.includes('BINAAN') || col.includes('KELAS')) && colIdx.waliKelas === -1) {
              colIdx.waliKelas = idx;
            } else if (
              (col.includes('HP') || col.includes('KONTAK') || col.includes('WA') || col.includes('TELP') || col.includes('TELEPON')) &&
              colIdx.kontak === -1
            ) {
              colIdx.kontak = idx;
            } else if ((col.includes('STATUS') || col.includes('AKTIF')) && colIdx.status === -1) {
              colIdx.status = idx;
            }
          });
          break;
        }
      }

      // Default column mapping fallback if header missing
      if (headerRowIndex === -1) {
        headerRowIndex = 0;
        colIdx = {
          no: -1,
          nip: 0,
          nama: 1,
          username: 2,
          password: 3,
          mapel: 4,
          waliKelas: 5,
          kontak: 6,
          status: 7,
        };
      }

      if (colIdx.nama === -1) colIdx.nama = 1;
      if (colIdx.nip === -1) colIdx.nip = 0;
      if (colIdx.username === -1) colIdx.username = 2;
      if (colIdx.password === -1) colIdx.password = 3;
      if (colIdx.mapel === -1) colIdx.mapel = 4;
      if (colIdx.waliKelas === -1) colIdx.waliKelas = 5;
      if (colIdx.kontak === -1) colIdx.kontak = 6;
      if (colIdx.status === -1) colIdx.status = 7;

      const dataRows = rows.slice(headerRowIndex + 1);
      const tempRows: ParsedTeacherRow[] = [];

      const seenFileNips = new Set<string>();
      const seenFileUsernames = new Set<string>();

      dataRows.forEach((row, idx) => {
        if (!row || row.length === 0) return;

        const rawNama = cleanCellValue(row[colIdx.nama]);
        if (
          !rawNama ||
          rawNama.toLowerCase() === 'nama guru' ||
          rawNama.toLowerCase().startsWith('contoh:') ||
          rawNama.toLowerCase().startsWith('tulis nama') ||
          rawNama.toLowerCase().startsWith('===')
        ) {
          return;
        }

        let rawNip = cleanCellValue(row[colIdx.nip]);
        if (!rawNip || rawNip === '0' || rawNip.toLowerCase() === 'null' || rawNip.toLowerCase() === 'none') {
          rawNip = '-';
        }

        let rawUsername = cleanCellValue(row[colIdx.username]).toLowerCase().replace(/\s+/g, '');
        let rawPassword = cleanCellValue(row[colIdx.password]);
        const rawMapel = cleanCellValue(row[colIdx.mapel]) || 'Semua Mata Pelajaran';
        let rawWali = cleanCellValue(row[colIdx.waliKelas]);
        let rawKontak = cleanCellValue(row[colIdx.kontak]).replace(/[^\d+]/g, '');
        const rawStatus = cleanCellValue(row[colIdx.status]).toUpperCase();

        // Normalize phone numbers (e.g. 81234567890 -> 081234567890)
        if (rawKontak.startsWith('8') && rawKontak.length >= 9 && rawKontak.length <= 13) {
          rawKontak = '0' + rawKontak;
        } else if (rawKontak.startsWith('628')) {
          rawKontak = '08' + rawKontak.substring(3);
        } else if (rawKontak.startsWith('+628')) {
          rawKontak = '08' + rawKontak.substring(4);
        }

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
            statusNote: 'Nama guru tidak valid atau terlalu pendek.',
          });
          return;
        }

        // Auto-generate username from name if not provided
        if (!rawUsername) {
          const cleanName = rawNama
            .toLowerCase()
            .replace(/^(drs\.|dra\.|dr\.|h\.|hj\.)/g, '')
            .replace(/,\s*[a-z\.]+/g, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
          rawUsername = cleanName ? `${cleanName}.guru` : `guru.${idx + 1}`;
        }

        // Auto-generate default password if blank
        if (!rawPassword) {
          rawPassword = 'guru123';
        }

        const validStatus: 'AKTIF' | 'NONAKTIF' = rawStatus === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';
        const waliKelasVal =
          rawWali &&
          rawWali !== '-' &&
          rawWali.toLowerCase() !== 'bukan wali kelas' &&
          rawWali.toLowerCase() !== 'none' &&
          rawWali.toLowerCase() !== 'tidak'
            ? rawWali
            : undefined;

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
        setParseErrors(['Tidak ada baris data guru yang dapat dibaca dari file ini. Pastikan menggunakan template resmi.']);
      }

      setParsedRows(tempRows);
    } catch (err: any) {
      console.error('Parse teacher file error:', err);
      setParseErrors([`Gagal membaca berkas: ${err.message || 'Format berkas tidak sesuai.'}`]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      parseFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      parseFile(droppedFile);
    }
  };

  const validTeachersToImport = useMemo(() => {
    return parsedRows
      .filter((r) => r.statusType !== 'INVALID' && r.statusType !== 'DUPLIKAT_FILE')
      .map((r) => r.teacher);
  }, [parsedRows]);

  const summary = useMemo(() => {
    const baru = parsedRows.filter((r) => r.statusType === 'BARU').length;
    const updateNip = parsedRows.filter((r) => r.statusType === 'UPDATE_NIP').length;
    const updateUser = parsedRows.filter((r) => r.statusType === 'UPDATE_USER').length;
    const duplikat = parsedRows.filter((r) => r.statusType === 'DUPLIKAT_FILE').length;
    const invalid = parsedRows.filter((r) => r.statusType === 'INVALID').length;
    return { baru, update: updateNip + updateUser, duplikat, invalid, total: parsedRows.length };
  }, [parsedRows]);

  const handleExecuteImport = async () => {
    if (validTeachersToImport.length === 0) {
      onShowNotice('Tidak Ada Data Valid', 'Tidak ada data guru valid yang dapat diimpor.', 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      await onImport(validTeachersToImport);
      onShowNotice(
        'Impor Berhasil',
        `Sebanyak ${validTeachersToImport.length} data guru berhasil diimpor & disinkronkan ke sistem.`,
        'success'
      );
      onClose();
    } catch (err: any) {
      onShowNotice('Gagal Impor', err.message || 'Terjadi kesalahan saat menyimpan data guru.', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Impor Data Guru Massal (Excel / CSV)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Resmi
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Unggah template data guru untuk registrasi akun dan mata pelajaran pengampu secara cepat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
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
              <p className="font-bold text-xs">Aturan Pengisian Mata Pelajaran &amp; Wali Kelas</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                &bull; <strong>Banyak Mata Pelajaran:</strong> Jika 1 guru mengajar hingga 3 mata pelajaran (misal: <strong>Matematika, IPA, Informatika</strong>), pisahkan nama mapel dengan tanda koma (<strong>,</strong>).<br />
                &bull; <strong>Wali Kelas:</strong> Isi kode kelas seperti <strong>VII-A</strong>, <strong>VIII-B</strong>, atau tulis <strong>-</strong> jika bukan wali kelas.<br />
                &bull; <strong>NIP / NUPTK:</strong> Isi NIP ASN/PPPK (18 digit) atau NUPTK (16 digit). Jika guru honorer/GTT belum memiliki NIP/NUPTK, cukup isi tanda strip (<strong>-</strong>) atau kosongkan.
              </p>
            </div>
          </div>

          {/* Template Download Card (Dual Buttons: Excel & CSV) */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-xs">Unduh Template Resmi Pengisian Data Guru</p>
                <p className="text-[11px] text-slate-600">
                  Sudah dilengkapi kolom teks aman, contoh isian, dan lembar referensi mata pelajaran.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh CSV (.csv)</span>
              </button>
            </div>
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
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-inner">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-xs sm:text-sm">
                {file ? file.name : 'Pilih Berkas Excel (.xlsx / .xls) atau CSV (.csv) atau Tarik ke Sini'}
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Mendukung format .xlsx, .xls, dan .csv
              </p>
            </div>
            {file && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Berkas Terpilih &amp; Terbaca
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-slate-800">Ringkasan Validasi:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    {summary.baru} Akun Baru
                  </span>
                  {summary.update > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                      {summary.update} Update Data
                    </span>
                  )}
                  {summary.duplikat > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                      {summary.duplikat} Duplikat
                    </span>
                  )}
                  {summary.invalid > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">
                      {summary.invalid} Tidak Valid
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Total Terbaca: <strong>{summary.total}</strong> Baris
                </span>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-2.5 w-8 text-center">No</th>
                      <th className="p-2.5">NIP / NUPTK</th>
                      <th className="p-2.5">Nama Guru &amp; Gelar</th>
                      <th className="p-2.5">Username</th>
                      <th className="p-2.5">Mata Pelajaran</th>
                      <th className="p-2.5">Wali Kelas</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.statusType === 'INVALID'
                            ? 'bg-rose-50/70'
                            : row.statusType === 'DUPLIKAT_FILE'
                            ? 'bg-amber-50/70'
                            : row.statusType.startsWith('UPDATE')
                            ? 'bg-blue-50/50'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-600">{row.teacher.nip || '-'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.teacher.nama}</td>
                        <td className="p-2.5 font-mono text-blue-700">@{row.teacher.username}</td>
                        <td className="p-2.5 text-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {row.teacher.mapel.split(',').map((m, mIdx) => (
                              <span key={mIdx} className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded-sm text-[10px] font-medium">
                                {m.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5">
                          {row.teacher.waliKelas ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold text-[10px]">
                              {row.teacher.waliKelas}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block ${
                              row.statusType === 'BARU'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.statusType.startsWith('UPDATE')
                                ? 'bg-blue-100 text-blue-800'
                                : row.statusType === 'DUPLIKAT_FILE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.statusNote}
                          </span>
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={validTeachersToImport.length === 0 || isProcessing}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-95"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses Impor Data...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Impor {validTeachersToImport.length} Data Guru Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
