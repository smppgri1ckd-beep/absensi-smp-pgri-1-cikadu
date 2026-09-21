import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  BookOpen,
  LayoutGrid,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileDown,
  CheckCircle2,
  AlertCircle,
  User,
  QrCode,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';
import { Student, SchoolConfig } from '../types';
import { IdCardFront } from './IdCardFront';
import { IdCardBack } from './IdCardBack';

interface IdCardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  studentsList: Student[];
  onSelectStudent: (student: Student) => void;
  config: SchoolConfig;
  qrMap: Record<string, string>;
  paperSize: 'F4' | 'A4';
  onPrintSingle?: (student: Student, mode: 'FRONT' | 'BACK' | 'BOTH' | 'MOCKUP') => void;
  onDownloadSinglePdf?: (student: Student, mode: 'FRONT' | 'BACK' | 'BOTH' | 'MOCKUP') => void;
}

type ModalViewTab = 'PAIR' | 'FRONT' | 'BACK' | 'FLIP';

export const IdCardPreviewModal: React.FC<IdCardPreviewModalProps> = ({
  isOpen,
  onClose,
  student,
  studentsList,
  onSelectStudent,
  config,
  qrMap,
  paperSize,
  onPrintSingle,
  onDownloadSinglePdf,
}) => {
  const [viewTab, setViewTab] = useState<ModalViewTab>('PAIR');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.15); // 1.15x for comfortable screen preview

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStudent();
      } else if (e.key === 'ArrowRight') {
        handleNextStudent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, student, studentsList]);

  if (!isOpen || !student) return null;

  const currentIndex = studentsList.findIndex((s) => s.nisn === student.nisn);
  const totalStudents = studentsList.length;

  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      onSelectStudent(studentsList[currentIndex - 1]);
      setIsFlipped(false);
    }
  };

  const handleNextStudent = () => {
    if (currentIndex < totalStudents - 1) {
      onSelectStudent(studentsList[currentIndex + 1]);
      setIsFlipped(false);
    }
  };

  const qrCodeUrl = qrMap[student.nisn];
  const hasCustomPhoto =
    Boolean(student.fotoUrl) &&
    student.fotoUrl.trim() !== '' &&
    !student.fotoUrl.includes('placehold.co') &&
    !student.fotoUrl.includes('placeholder');

  const isNisnValid = Boolean(student.nisn && student.nisn.length >= 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ===== MODAL HEADER ===== */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="preview-modal-title"
                  className="text-base font-extrabold text-slate-900 leading-tight"
                >
                  Detail Kartu Siswa
                </h3>
                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  {student.kelas}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  NISN: <span className="font-mono font-bold text-slate-700">{student.nisn}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pemeriksaan detail desain kartu absensi individu sebelum cetak batch pada kertas {paperSize}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Student Pagination Counter */}
            <div className="hidden sm:flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-2xs">
              <span className="text-slate-400">Siswa</span>
              <span className="text-blue-600 font-bold">{currentIndex + 1}</span>
              <span className="text-slate-400">/</span>
              <span>{totalStudents}</span>
            </div>

            {/* Prev & Next Navigation Buttons */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevStudent}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                title="Siswa Sebelumnya (Panah Kiri)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextStudent}
                disabled={currentIndex >= totalStudents - 1}
                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                title="Siswa Berikutnya (Panah Kanan)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer ml-1"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== TOOLBAR: VIEW SWITCHER, ZOOM, & QUICK SELECT ===== */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* View Tab Modes */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewTab('PAIR');
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'PAIR'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Berdampingan (Depan & Belakang)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab('FRONT');
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'FRONT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Tampak Depan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab('BACK');
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'BACK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tampak Belakang</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab('FLIP');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewTab === 'FLIP'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Balik Kartu (Flip)</span>
            </button>
          </div>

          {/* Zoom & Quick Jump dropdown */}
          <div className="flex items-center gap-2">
            {/* Quick student selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Pilih:</span>
              <select
                value={student.nisn}
                onChange={(e) => {
                  const target = studentsList.find((s) => s.nisn === e.target.value);
                  if (target) {
                    onSelectStudent(target);
                    setIsFlipped(false);
                  }
                }}
                className="bg-white border border-slate-200 text-slate-800 font-semibold px-2.5 py-1 rounded-xl text-xs focus:outline-hidden max-w-[170px] truncate shadow-2xs cursor-pointer"
              >
                {studentsList.map((s) => (
                  <option key={s.nisn} value={s.nisn}>
                    {s.nama} ({s.kelas})
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.85, Number((z - 0.15).toFixed(2))))}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Perkecil Tampilan"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-600 px-1 select-none">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Perbesar Tampilan"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.15)}
                className="text-[10px] text-blue-600 font-bold px-1.5 py-0.5 hover:bg-blue-50 rounded transition cursor-pointer"
                title="Kembali ke ukuran standar"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ===== MODAL BODY ===== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Card Presentation Stage */}
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[380px] p-4 bg-slate-200/60 rounded-2xl border border-slate-300/80 shadow-inner">
            <div
              className="transition-all duration-300 flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              {/* MODE 1: PAIR (Side by Side) */}
              {viewTab === 'PAIR' && (
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                  {/* Tampak Depan */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="shadow-2xl rounded-2xl bg-white ring-1 ring-slate-900/10">
                      <IdCardFront
                        student={student}
                        config={config}
                        qrDataUrl={qrCodeUrl}
                        paperSize={paperSize}
                      />
                    </div>
                    <span className="bg-slate-700 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-2xs">
                      Tampak Depan (10,5 × 6,5 cm)
                    </span>
                  </div>

                  {/* Fold / Cut Line Indicator */}
                  <div className="hidden sm:flex flex-col items-center justify-center gap-1 text-slate-400 text-[9px] font-mono">
                    <div className="w-[1px] h-20 border-r border-dashed border-slate-400" />
                    <span>LIPAT</span>
                    <div className="w-[1px] h-20 border-r border-dashed border-slate-400" />
                  </div>

                  {/* Tampak Belakang */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="shadow-2xl rounded-2xl bg-white ring-1 ring-slate-900/10">
                      <IdCardBack config={config} paperSize={paperSize} />
                    </div>
                    <span className="bg-slate-700 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-2xs">
                      Tampak Belakang (10,5 × 6,5 cm)
                    </span>
                  </div>
                </div>
              )}

              {/* MODE 2: FRONT ONLY */}
              {viewTab === 'FRONT' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="shadow-2xl rounded-2xl bg-white ring-1 ring-slate-900/10">
                    <IdCardFront
                      student={student}
                      config={config}
                      qrDataUrl={qrCodeUrl}
                      paperSize={paperSize}
                    />
                  </div>
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tampak Depan (Identitas & Kode QR Absensi)</span>
                  </span>
                </div>
              )}

              {/* MODE 3: BACK ONLY */}
              {viewTab === 'BACK' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="shadow-2xl rounded-2xl bg-white ring-1 ring-slate-900/10">
                    <IdCardBack config={config} paperSize={paperSize} />
                  </div>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Tampak Belakang (Panduan 3 Langkah & Catatan Tata Tertib)</span>
                  </span>
                </div>
              )}

              {/* MODE 4: INTERACTIVE 3D FLIP */}
              {viewTab === 'FLIP' && (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setIsFlipped((prev) => !prev)}
                    title="Klik untuk membalik kartu"
                  >
                    <div className="shadow-2xl rounded-2xl bg-white ring-2 ring-blue-500/30 transition-transform duration-500 hover:scale-[1.02]">
                      {isFlipped ? (
                        <IdCardBack config={config} paperSize={paperSize} />
                      ) : (
                        <IdCardFront
                          student={student}
                          config={config}
                          qrDataUrl={qrCodeUrl}
                          paperSize={paperSize}
                        />
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 opacity-90 group-hover:opacity-100 transition shadow-md">
                      <RotateCw className="w-3 h-3 animate-spin-reverse" />
                      <span>{isFlipped ? 'Tampak Belakang (Klik untuk Balik)' : 'Tampak Depan (Klik untuk Balik)'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    Klik kartu di atas untuk melihat sisi depan / belakang secara bergantian.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Student Verification & Print Readiness Panel */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Profile Summary Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Identitas Siswa Terpilih
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {student.nama}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Kelas {student.kelas} • {student.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-xs border border-blue-100">
                  {student.kelas}
                </div>
              </div>

              {/* Data Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pas Foto</span>
                  </span>
                  {hasCustomPhoto ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Foto Profil
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Siluet Avatar
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kode QR Absensi</span>
                  </span>
                  {qrCodeUrl ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Memuat...</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Format NISN</span>
                  </span>
                  {isNisnValid ? (
                    <span className="font-mono text-slate-900 font-bold text-[11px]">
                      {student.nisn}
                    </span>
                  ) : (
                    <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Perlu Cek
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ukuran Fisik Kartu</span>
                  </span>
                  <span className="font-semibold text-slate-800 text-[11px]">
                    {paperSize === 'F4' ? '65 × 98 mm' : '63 × 88 mm'}
                  </span>
                </div>
              </div>
            </div>

            {/* School & Target Print Specs Card */}
            <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-200 text-xs space-y-2">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Kesiapan Cetak Batch</span>
              </div>
              <p className="text-blue-900/80 text-[11px] leading-relaxed">
                Kartu ini merupakan bagian dari rombel <strong>Kelas {student.kelas}</strong> dan siap dicetak secara massal pada kertas <strong>{paperSize}</strong>.
              </p>
              <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100 text-[11px] text-slate-700 space-y-1">
                <div>
                  <strong>Sekolah:</strong> {config.namaSekolah || 'SMP PGRI 1 CIKADU'}
                </div>
                <div>
                  <strong>Kop:</strong> Gelombang Biru-Kuning & Logo Bulat PGRI
                </div>
              </div>
            </div>

            {/* Individual Print / Download Quick Actions */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Aksi Cepat Kartu Tunggal
              </span>

              {onPrintSingle && (
                <button
                  type="button"
                  onClick={() => onPrintSingle(student, viewTab === 'PAIR' ? 'MOCKUP' : viewTab === 'BACK' ? 'BACK' : viewTab === 'FRONT' ? 'FRONT' : 'BOTH')}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu Siswa Ini</span>
                </button>
              )}

              {onDownloadSinglePdf && (
                <button
                  type="button"
                  onClick={() => onDownloadSinglePdf(student, viewTab === 'PAIR' ? 'MOCKUP' : viewTab === 'BACK' ? 'BACK' : viewTab === 'FRONT' ? 'FRONT' : 'BOTH')}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-rose-600" />
                  <span>Unduh PDF Kartu Siswa Ini</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== MODAL FOOTER ===== */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="hidden sm:inline">Navigasi keyboard:</span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-600">
              ←
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-600">
              →
            </kbd>
            <span className="text-[11px] text-slate-400">Pindah Siswa</span>
            <span className="mx-1 text-slate-300">•</span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-600">
              Esc
            </kbd>
            <span className="text-[11px] text-slate-400">Tutup</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
