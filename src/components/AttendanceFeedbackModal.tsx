import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Calendar, X, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Student, AttendanceRecord } from '../types';

export interface AttendanceFeedbackModalData {
  isOpen: boolean;
  type: 'already' | 'success' | 'out_of_hours';
  student: Student;
  record: AttendanceRecord;
  contextTitle: string; // e.g. "Apel Pagi", "Apel Siang", "KBM Matematika (Pertemuan Ke-1)"
  autoCloseSeconds?: number;
  customMessage?: string;
  outOfHoursDetails?: {
    reason?: string;
    allowableWindow?: string;
    currentScanTime?: string;
  };
}

interface AttendanceFeedbackModalProps {
  data: AttendanceFeedbackModalData | null;
  onClose: () => void;
}

export const AttendanceFeedbackModal: React.FC<AttendanceFeedbackModalProps> = ({
  data,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(data?.autoCloseSeconds || 4);

  useEffect(() => {
    if (!data?.isOpen) return;

    const initialSec = data.autoCloseSeconds ?? (data.type === 'out_of_hours' ? 5 : 4);
    setSecondsLeft(initialSec);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.isOpen, data?.autoCloseSeconds, data?.type, onClose]);

  if (!data || !data.isOpen) return null;

  const { type, student, record, contextTitle, customMessage, outOfHoursDetails } = data;
  const isAlready = type === 'already';
  const isOutOfHours = type === 'out_of_hours';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border transition-all transform animate-in zoom-in-95 duration-200 ${
          isOutOfHours
            ? 'border-rose-300 ring-2 ring-rose-200/50'
            : isAlready
            ? 'border-amber-300'
            : 'border-emerald-300'
        }`}
      >
        {/* Animated Accent Top Bar */}
        <div
          className={`h-2.5 w-full ${
            isOutOfHours
              ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-red-600'
              : isAlready
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500'
              : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500'
          }`}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center space-y-4">
          {/* Status Badge & Icon */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform ${
                isOutOfHours
                  ? 'bg-rose-100 text-rose-600 border border-rose-300 ring-4 ring-rose-50'
                  : isAlready
                  ? 'bg-amber-100 text-amber-600 border border-amber-300 ring-4 ring-amber-50'
                  : 'bg-emerald-100 text-emerald-600 border border-emerald-300 ring-4 ring-emerald-50'
              }`}
            >
              {isOutOfHours ? (
                <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
              ) : isAlready ? (
                <AlertCircle className="w-8 h-8 stroke-[2.5]" />
              ) : (
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              )}
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                  isOutOfHours
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : isAlready
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isOutOfHours && <Clock className="w-3.5 h-3.5 text-rose-600" />}
                {isOutOfHours
                  ? 'Di Luar Jam Operasional'
                  : isAlready
                  ? 'Presensi Sudah Dilakukan'
                  : 'Presensi Berhasil'}
              </span>

              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-snug">
                {isOutOfHours
                  ? (customMessage || 'Mohon maaf, sekarang bukan waktunya untuk melakukan absensi.')
                  : isAlready
                  ? 'Kamu Sudah Melakukan Absensi ya!'
                  : 'Kehadiranmu Berhasil Dicatat!'}
              </h3>

              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isOutOfHours
                  ? (outOfHoursDetails?.reason || `Pemindaian di luar jam ${contextTitle} tidak diizinkan.`)
                  : isAlready
                  ? `Data kehadiran untuk ${contextTitle} telah tercatat sebelumnya.`
                  : `Tercatat pada jadwal ${contextTitle}.`}
              </p>
            </div>
          </div>

          {/* Student Profile Card (Aesthetic & Professional) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left shadow-xs space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <img
                  src={student.fotoUrl}
                  alt={student.nama}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-slate-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                  }}
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white ${
                    isOutOfHours
                      ? 'bg-rose-500'
                      : isAlready
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                >
                  {isOutOfHours ? '✕' : isAlready ? '!' : '✓'}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-extrabold text-slate-900 leading-tight line-clamp-1">
                  {student.nama}
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-600">
                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    NISN: {student.nisn}
                  </span>
                  <span className="font-extrabold text-slate-800 bg-slate-200/80 px-1.5 py-0.5 rounded">
                    Kelas {student.kelas}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Jenis Kelamin: {student.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                </p>
              </div>
            </div>

            {/* Attendance Timestamp & Schedule Info */}
            {isOutOfHours ? (
              <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-2.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    Waktu Pindai:
                  </span>
                  <span className="font-mono font-bold text-rose-900 bg-rose-100/90 px-2 py-0.5 rounded text-[11px]">
                    {outOfHoursDetails?.currentScanTime || record.waktu} WIB
                  </span>
                </div>
                {outOfHoursDetails?.allowableWindow && (
                  <div className="flex items-center justify-between pt-1 border-t border-rose-200/60">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Jam Resmi {contextTitle}:
                    </span>
                    <span className="font-mono font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                      {outOfHoursDetails.allowableWindow}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    Waktu: <strong className="text-slate-900 font-mono">{record.waktu} WIB</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 justify-end">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    Status: <strong className={`font-semibold ${isAlready ? 'text-amber-700' : 'text-emerald-700'}`}>{record.status}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Countdown timer footer */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Sistem Presensi SMP PGRI 1 Cikadu
            </span>
            <span className="font-medium text-slate-500">
              Menutup dalam <strong className="text-slate-800 font-bold">{secondsLeft}s</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition cursor-pointer ${
              isOutOfHours
                ? 'bg-rose-600 hover:bg-rose-700'
                : isAlready
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isOutOfHours ? 'Saya Mengerti, Tutup' : 'Tutup Notifikasi'}
          </button>
        </div>
      </div>
    </div>
  );
};
