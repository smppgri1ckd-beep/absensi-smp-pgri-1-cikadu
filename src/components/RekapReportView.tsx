import React, { useState } from 'react';
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  Search,
  Calendar,
  Building,
  UserCheck,
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig } from '../types';
import { exportRekapToExcel, exportRekapPDF } from '../utils/export';
import { triggerDirectPrint } from '../utils/print';

interface RekapReportViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  config: SchoolConfig;
  totalHeb: number;
  dayKey: string;
}

export const RekapReportView: React.FC<RekapReportViewProps> = ({
  students,
  attendance,
  config,
  totalHeb,
  dayKey,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const curMonth = today.substring(0, 7);

  const [periode, setPeriode] = useState<'harian' | 'mingguan' | 'bulanan' | 'semester'>('bulanan');
  const [tglAwal, setTglAwal] = useState(`${curMonth}-01`);
  const [tglAkhir, setTglAkhir] = useState(today);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [tglTtd, setTglTtd] = useState(today);
  const [selectedPiket, setSelectedPiket] = useState('AUTO');
  const [kotaTtd, setKotaTtd] = useState(config.kota || 'Cianjur');

  const classes = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();

  const handlePeriodChange = (p: 'harian' | 'mingguan' | 'bulanan' | 'semester') => {
    setPeriode(p);
    const now = new Date();
    let start = new Date();

    if (p === 'harian') {
      start = now;
    } else if (p === 'mingguan') {
      start.setDate(now.getDate() - 7);
    } else if (p === 'bulanan') {
      start.setMonth(now.getMonth() - 1);
    } else if (p === 'semester') {
      start.setMonth(now.getMonth() - 6);
    }

    setTglAwal(start.toISOString().split('T')[0]);
    setTglAkhir(now.toISOString().split('T')[0]);
  };

  const piketKey =
    selectedPiket === 'AUTO'
      ? dayKey
      : selectedPiket;

  const dutyTeacher =
    config.jadwalPiket[piketKey as keyof typeof config.jadwalPiket] || config.jadwalPiket.senin;

  let filtered = selectedClass === 'ALL' ? [...students] : students.filter((s) => s.kelas === selectedClass);
  filtered.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  const targetSesi = Math.max(1, totalHeb * 2);

  const handleDirectPrint = () => {
    triggerDirectPrint({
      paperSize: 'A4',
      margins: '8mm 6mm',
    });
  };

  const handleExportPDF = async () => {
    await exportRekapPDF(
      config,
      students,
      attendance,
      tglAwal,
      tglAkhir,
      selectedClass,
      totalHeb,
      dutyTeacher.nama,
      dutyTeacher.nip,
      tglTtd
    );
  };

  const handleExportExcel = () => {
    exportRekapToExcel(
      config,
      students,
      attendance,
      tglAwal,
      tglAkhir,
      selectedClass,
      totalHeb
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header (Hidden on Direct Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Rekapitulasi Kehadiran &amp; Laporan Resmi (A4)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan ber-Kop resmi dengan fitur cetak presisi A4, Unduh PDF, dan Ekspor Excel.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh PDF (A4)</span>
          </button>
          <button
            type="button"
            onClick={handleDirectPrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (Printer Langsung)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Direct Print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Pilih Periode
          </label>
          <select
            value={periode}
            onChange={(e) => handlePeriodChange(e.target.value as any)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan (7 Hari)</option>
            <option value="bulanan">Bulanan / Rentang</option>
            <option value="semester">1 Semester</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Rombel / Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
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

        <div className="flex items-end">
          <div className="w-full py-2 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs font-bold text-blue-700">
            {totalHeb} Hari Efektif ({targetSesi} Sesi)
          </div>
        </div>
      </div>

      {/* Signature Configuration Bar (Hidden on Direct Print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Tanggal Pengesahan (Tanda Tangan)
          </label>
          <input
            type="date"
            value={tglTtd}
            onChange={(e) => setTglTtd(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Petugas Guru Piket Penandatangan
          </label>
          <select
            value={selectedPiket}
            onChange={(e) => setSelectedPiket(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
          >
            <option value="AUTO">Otomatis Sesuai Hari Ini ({dayKey.toUpperCase()})</option>
            <option value="senin">Guru Piket Senin</option>
            <option value="selasa">Guru Piket Selasa</option>
            <option value="rabu">Guru Piket Rabu</option>
            <option value="kamis">Guru Piket Kamis</option>
            <option value="jumat">Guru Piket Jum'at</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Kota Pengesahan Dokumen
          </label>
          <input
            type="text"
            value={kotaTtd}
            onChange={(e) => setKotaTtd(e.target.value)}
            placeholder="Cianjur"
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
          />
        </div>
      </div>

      {/* Official A4 Sheet Preview */}
      <div className="print-sheet-wrapper bg-slate-200/80 p-4 sm:p-8 rounded-2xl border border-slate-300 overflow-x-auto flex justify-center">
        <div
          id="rekapSheetWrapper"
          className="print-rekap-container w-[210mm] max-w-full bg-white text-slate-900 p-6 sm:p-9 shadow-lg rounded-sm space-y-4"
        >
          {/* Authentic Kop Surat */}
          <div className="border-b-[3px] border-double border-slate-950 pb-3 flex items-center justify-between">
            <div className="w-20 shrink-0 flex items-center justify-start">
              <img
                src={config.logoUrl}
                alt="Logo Sekolah"
                className="w-16 h-16 object-contain bg-white"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://cdn-icons-png.flaticon.com/512/2856/2856000.png';
                }}
              />
            </div>

            <div className="flex-1 text-center px-1">
              <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-900 leading-tight">
                PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN
              </h4>
              <h4 className="text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wide text-slate-900 leading-tight">
                PERSATUAN GURU REPUBLIK INDONESIA
              </h4>
              <h4 className="text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-900 leading-tight">
                (YPLP PGRI) KABUPATEN CIANJUR
              </h4>
              <h2 className="text-lg sm:text-xl font-black uppercase text-slate-950 tracking-tight leading-tight my-1">
                {config.namaSekolah}
              </h2>
              <p className="text-[9.5px] sm:text-[10.5px] text-slate-800 font-medium leading-tight">
                {config.alamat}
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-800 font-medium leading-tight mt-0.5">
                {config.kontak} &bull; <span className="font-bold">NPSN: {config.npsn}</span>
              </p>
            </div>

            <div className="w-20 shrink-0 hidden sm:block"></div>
          </div>

          {/* Title and metadata */}
          <div className="text-center space-y-1">
            <h3 className="text-sm font-black uppercase underline tracking-wide">
              LAPORAN REKAPITULASI KEHADIRAN SISWA
            </h3>
            <p className="text-xs text-slate-600 font-semibold">
              Periode: {tglAwal} s/d {tglAkhir} &bull; Rombel:{' '}
              {selectedClass === 'ALL' ? 'Semua Kelas' : selectedClass}
            </p>
            <div className="inline-flex items-center gap-2 pt-1 text-[10.5px]">
              <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded font-medium">
                Hari Efektif: {totalHeb} Hari ({targetSesi} Sesi)
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-medium">
                Jumlah Siswa: {filtered.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[11px]">
              <thead className="bg-slate-100 text-slate-900 font-bold text-center">
                <tr>
                  <th className="p-1.5 border border-slate-900 w-[5%]">No</th>
                  <th className="p-1.5 border border-slate-900 w-[14%] whitespace-nowrap">NISN</th>
                  <th className="p-1.5 border border-slate-900 w-[35%] text-left pl-2">Nama Siswa</th>
                  <th className="p-1.5 border border-slate-900 w-[8%]">L/P</th>
                  <th className="p-1.5 border border-slate-900 w-[10%]">Kelas</th>
                  <th className="p-1.5 border border-slate-900 w-[10%]">Hadir Pagi</th>
                  <th className="p-1.5 border border-slate-900 w-[10%]">Hadir Siang</th>
                  <th className="p-1.5 border border-slate-900 w-[8%]">Persentase</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 divide-y divide-slate-300">
                {filtered.map((siswa, idx) => {
                  const studentLogs = attendance.filter(
                    (a) =>
                      String(a.nisn).trim() === String(siswa.nisn).trim() &&
                      a.tanggal >= tglAwal &&
                      a.tanggal <= tglAkhir &&
                      (a.kategori === 'APEL' || !a.kategori)
                  );
                  const pagiCount = studentLogs.filter((a) => a.sesi === 'Pagi').length;
                  const siangCount = studentLogs.filter((a) => a.sesi === 'Siang').length;
                  const total = pagiCount + siangCount;
                  const persen = Math.min(100, Math.round((total / targetSesi) * 100));

                  return (
                    <tr key={siswa.nisn} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-1.5 border border-slate-900 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-1.5 border border-slate-900 text-center font-mono text-[10.5px]">
                        {siswa.nisn}
                      </td>
                      <td className="p-1.5 border border-slate-900 font-semibold text-slate-900 pl-2">
                        {siswa.nama}
                      </td>
                      <td className="p-1.5 border border-slate-900 text-center">{siswa.jk}</td>
                      <td className="p-1.5 border border-slate-900 text-center">{siswa.kelas}</td>
                      <td className="p-1.5 border border-slate-900 text-center font-mono font-bold text-blue-800">
                        {pagiCount}
                      </td>
                      <td className="p-1.5 border border-slate-900 text-center font-mono font-bold text-emerald-800">
                        {siangCount}
                      </td>
                      <td className="p-1.5 border border-slate-900 text-center font-bold">
                        <span className={persen >= 75 ? 'text-emerald-700' : 'text-amber-700'}>
                          {persen}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Section */}
          <div className="signature-block pt-6 text-xs">
            <div className="flex justify-between items-start">
              <div className="text-center w-56">
                <p className="font-bold text-slate-900">
                  Mengetahui,<br />
                  Kepala Sekolah
                </p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 underline">
                  {config.namaKepsek}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  NIP/NUPTK: {config.nipKepsek || '-'}
                </p>
              </div>

              <div className="text-center w-56">
                <p className="font-medium text-slate-700">
                  {kotaTtd}, {tglTtd}
                </p>
                <p className="font-bold text-slate-900">Guru Piket</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 underline">
                  {dutyTeacher.nama || 'Petugas Piket, S.Pd'}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  NIP/NUPTK: {dutyTeacher.nip || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Authentic Document Print Footer Note */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500 no-break-inside font-medium">
            <span>
              Dokumen Resmi Sistem Presensi Digital &bull; {config.namaSekolah} &bull; NPSN: {config.npsn}
            </span>
            <span>
              Dicetak Tanggal: {tglTtd} &bull; Sah &amp; Terverifikasi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
