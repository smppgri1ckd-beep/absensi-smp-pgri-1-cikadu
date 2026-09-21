import React from 'react';
import { QrCode, UserCheck, CheckCircle2, Info } from 'lucide-react';
import { SchoolConfig } from '../types';
import { PgriLogo } from './PgriLogo';

interface IdCardBackProps {
  config: SchoolConfig;
  paperSize: 'F4' | 'A4';
}

export const IdCardBack: React.FC<IdCardBackProps> = ({ config, paperSize }) => {
  const isF4 = paperSize === 'F4';
  const schoolName = config.namaSekolah || 'SMP PGRI 1 CIKADU';

  return (
    <div
      className="student-id-card bg-white border border-slate-300 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs relative select-none"
      style={{
        width: isF4 ? '65mm' : '63mm',
        height: isF4 ? '98mm' : '88mm',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== HEADER WAVE SECTION ===== */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: isF4 ? '27mm' : '24mm' }}
      >
        {/* Background SVG Wave */}
        <svg
          viewBox="0 0 500 210"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path
            d="M0,0 L500,0 L500,185 Q380,215 240,165 T0,195 Z"
            fill="#0ea5e9"
          />
          <path
            d="M0,0 L500,0 L500,170 Q375,200 235,152 T0,180 Z"
            fill="#f59e0b"
          />
          <path
            d="M0,0 L500,0 L500,154 Q365,185 225,138 T0,165 Z"
            fill="#02509c"
          />
        </svg>

        {/* Header Content */}
        <div className="relative z-10 px-2 pt-1.5 flex items-center gap-2">
          {/* Authentic Circular PGRI Logo Emblem */}
          <PgriLogo
            className="w-9 h-9 sm:w-10 sm:h-10"
            customUrl={config.logoUrl}
          />

          {/* Guide Title matching target reference */}
          <div className="text-white text-left min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-[6.5px] sm:text-[7px] font-black uppercase tracking-wider text-white leading-tight">
              PANDUAN PENGGUNAAN
            </p>
            <p className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-wide text-white leading-tight">
              KARTU ABSENSI SISWA
            </p>
            <h4 className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-tight text-white truncate drop-shadow-xs leading-tight mt-0.5">
              {schoolName}
            </h4>
          </div>
        </div>
      </div>

      {/* ===== 3 STEP INSTRUCTIONS SECTION ===== */}
      <div className="px-2.5 py-1 flex flex-col gap-1.5 shrink-0">
        {/* Step 1 */}
        <div className="flex items-center gap-1.5">
          {/* Step Number Badge */}
          <div className="w-5 h-5 rounded-full bg-[#004080] text-white font-black text-[7.5px] flex items-center justify-center shrink-0 shadow-2xs">
            1
          </div>
          {/* Icon Box */}
          <div className="w-6 h-6 rounded-lg border border-blue-300 bg-blue-50/70 text-blue-700 flex items-center justify-center shrink-0">
            <QrCode className="w-3.5 h-3.5" />
          </div>
          {/* Text */}
          <div className="min-w-0 flex-1 leading-tight">
            <h5 className="text-[7px] sm:text-[7.5px] font-black text-[#004080]">
              Scan QR Code
            </h5>
            <p className="text-[5px] sm:text-[5.5px] text-slate-600 font-medium leading-none mt-0.5">
              Arahkan kamera pada QR Code di kartu ini untuk melakukan absensi.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-1.5">
          {/* Step Number Badge */}
          <div className="w-5 h-5 rounded-full bg-[#004080] text-white font-black text-[7.5px] flex items-center justify-center shrink-0 shadow-2xs">
            2
          </div>
          {/* Icon Box */}
          <div className="w-6 h-6 rounded-lg border border-blue-300 bg-blue-50/70 text-blue-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          {/* Text */}
          <div className="min-w-0 flex-1 leading-tight">
            <h5 className="text-[7px] sm:text-[7.5px] font-black text-[#004080]">
              Verifikasi Data
            </h5>
            <p className="text-[5px] sm:text-[5.5px] text-slate-600 font-medium leading-none mt-0.5">
              Pastikan data diri yang muncul sudah sesuai dengan identitas Anda.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-1.5">
          {/* Step Number Badge */}
          <div className="w-5 h-5 rounded-full bg-[#004080] text-white font-black text-[7.5px] flex items-center justify-center shrink-0 shadow-2xs">
            3
          </div>
          {/* Icon Box */}
          <div className="w-6 h-6 rounded-lg border border-blue-300 bg-blue-50/70 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          {/* Text */}
          <div className="min-w-0 flex-1 leading-tight">
            <h5 className="text-[7px] sm:text-[7.5px] font-black text-[#004080]">
              Absensi Berhasil
            </h5>
            <p className="text-[5px] sm:text-[5.5px] text-slate-600 font-medium leading-none mt-0.5">
              Setelah data terverifikasi, absensi akan tercatat secara otomatis.
            </p>
          </div>
        </div>
      </div>

      {/* ===== CATATAN PENTING BOX ===== */}
      <div className="px-2 shrink-0">
        <div className="bg-[#eaf2fb] border border-blue-200/90 rounded-xl p-1.5 flex items-start gap-1.5 shadow-2xs">
          <div className="w-4 h-4 rounded-full bg-[#004080] text-white flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-2.5 h-2.5 text-white stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <h6 className="text-[6.5px] sm:text-[7px] font-black text-[#004080] leading-none mb-1">
              Catatan Penting
            </h6>
            <ul className="text-[5px] sm:text-[5.5px] text-slate-700 font-medium space-y-[2px] leading-tight list-disc pl-2.5">
              <li>Gunakan kartu ini setiap hari saat absensi.</li>
              <li>Jaga kartu agar tidak rusak, hilang, atau disalahgunakan.</li>
              <li>Jika terjadi kendala, segera hubungi wali kelas atau bagian Tata Usaha.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== FOOTER WAVE SECTION WITH MOTTO ===== */}
      <div
        className="relative w-full shrink-0 overflow-hidden mt-auto"
        style={{ height: isF4 ? '13mm' : '11mm' }}
      >
        <svg
          viewBox="0 0 500 130"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path
            d="M0,130 L500,130 L500,20 Q360,70 220,10 T0,40 Z"
            fill="#0ea5e9"
          />
          <path
            d="M0,130 L500,130 L500,32 Q360,82 220,22 T0,52 Z"
            fill="#f59e0b"
          />
          <path
            d="M0,130 L500,130 L500,45 Q360,95 220,35 T0,65 Z"
            fill="#02509c"
          />
        </svg>

        {/* Cursive Motto in Footer */}
        <div className="relative z-10 w-full h-full flex items-center justify-center pt-2 px-2">
          <div className="flex items-center gap-1.5 text-white">
            <span className="w-4 h-[0.5px] bg-white/70" />
            <span className="text-[6.5px] sm:text-[7.5px] font-bold italic tracking-wide font-serif">
              Disiplin Membentuk Masa Depan
            </span>
            <span className="w-4 h-[0.5px] bg-white/70" />
          </div>
        </div>
      </div>
    </div>
  );
};
