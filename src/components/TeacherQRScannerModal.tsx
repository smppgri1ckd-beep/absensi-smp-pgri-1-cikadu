import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Volume2,
  BookOpen,
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceCategory } from '../types';
import { playBeep } from '../utils/audio';
import { AttendanceFeedbackModal, AttendanceFeedbackModalData } from './AttendanceFeedbackModal';

interface TeacherQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: string;
  selectedDate: string;
  selectedMapel: string;
  pertemuanKe: number;
  materiPokok: string;
  students: Student[];
  attendance?: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => Promise<boolean>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const TeacherQRScannerModal: React.FC<TeacherQRScannerModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  selectedDate,
  selectedMapel,
  pertemuanKe,
  materiPokok,
  students,
  attendance = [],
  onRecordAttendance,
  onShowNotice,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [scannerStatus, setScannerStatus] = useState<string>('Mempersiapkan kamera...');
  const [lastScannedStudent, setLastScannedStudent] = useState<{
    student: Student;
    record: AttendanceRecord;
    timestamp: string;
  } | null>(null);
  const [feedbackModalData, setFeedbackModalData] = useState<AttendanceFeedbackModalData | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing QR scanner:', e);
      }
      scannerRef.current = null;
      setIsScanning(false);
      setScannerStatus('Kamera dihentikan');
    }
  };

  // Start scanner
  const startScanner = async () => {
    try {
      await stopScanner();

      const container = document.getElementById('teacher-kbm-reader');
      if (!container) return;

      const scanner = new Html5Qrcode('teacher-kbm-reader');
      scannerRef.current = scanner;

      let selectedCamId: string | null = null;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          );
          selectedCamId = backCam ? backCam.id : cameras[0].id;
        }
      } catch {
        // fallback to facingMode
      }

      const source = selectedCamId ? selectedCamId : { facingMode: cameraMode };

      await scanner.start(
        source,
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        handleScanSuccess,
        () => {}
      );

      setIsScanning(true);
      setScannerStatus('Kamera aktif. Arahkan ke QR Code kartu pelajar siswa.');
      playBeep('success');
    } catch (err: any) {
      console.warn('Gagal mengaktifkan kamera:', err);
      setScannerStatus('Gagal mengakses kamera. Mohon pastikan izin kamera diizinkan di browser Anda.');
      setIsScanning(false);
    }
  };

  // Handle successful QR scan
  const handleScanSuccess = async (decodedText: string) => {
    if (scanCooldown) return;
    setScanCooldown(true);

    const raw = decodedText.trim();
    const student = students.find((s) => s.nisn.trim() === raw || raw.includes(s.nisn.trim()));

    if (!student) {
      playBeep('error');
      setScannerStatus(`NISN/Kode '${raw}' tidak terdaftar dalam database sekolah.`);
      setTimeout(() => setScanCooldown(false), 1800);
      return;
    }

    // Optional check: Warn if student belongs to another class
    if (student.kelas !== selectedClass) {
      playBeep('warning');
      setScannerStatus(
        `Perhatian: ${student.nama} terdaftar di Kelas ${student.kelas}, bukan Kelas ${selectedClass}!`
      );
    }

    // Specific record ID for KBM: separate from Apel
    const recId = `kbm_${student.nisn}_${selectedDate}_${selectedMapel.replace(/\s+/g, '_')}_p${pertemuanKe}`;

    // Check duplicate attendance for this KBM meeting
    const already = attendance.find(
      (a) =>
        (a.id === recId ||
          (String(a.nisn).trim() === String(student.nisn).trim() &&
            a.tanggal === selectedDate &&
            a.kategori === 'KELAS' &&
            a.mapel === selectedMapel &&
            Number(a.pertemuanKe) === Number(pertemuanKe)))
    );

    if (already) {
      playBeep('warning');
      setScannerStatus(`${student.nama} sudah melakukan absensi untuk Pertemuan Ke-${pertemuanKe} ini (${already.waktu} WIB).`);
      setFeedbackModalData({
        isOpen: true,
        type: 'already',
        student,
        record: already,
        contextTitle: `${selectedMapel} - Pertemuan Ke-${pertemuanKe} (Kelas ${selectedClass})`,
        autoCloseSeconds: 4,
      });
      setTimeout(() => setScanCooldown(false), 3000);
      return;
    }

    const now = new Date();
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const record: AttendanceRecord = {
      id: recId,
      tanggal: selectedDate,
      waktu: timeNow,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      sesi: 'Pagi', // standard fallback
      status: 'Hadir Tepat Waktu',
      kategori: 'KELAS',
      mapel: selectedMapel,
      pertemuanKe,
      materiPokok: materiPokok.trim() || undefined,
    };

    try {
      await onRecordAttendance(record);
      playBeep('success');
      setLastScannedStudent({
        student,
        record,
        timestamp: timeNow,
      });
      setScannerStatus(`Berhasil mencatat presensi: ${student.nama} (Kelas ${student.kelas})`);
      setFeedbackModalData({
        isOpen: true,
        type: 'success',
        student,
        record,
        contextTitle: `${selectedMapel} - Pertemuan Ke-${pertemuanKe} (Kelas ${selectedClass})`,
        autoCloseSeconds: 3,
      });
    } catch (e: any) {
      playBeep('error');
      setScannerStatus(`Gagal mencatat presensi: ${e?.message || 'Kesalahan sistem'}`);
    } finally {
      setTimeout(() => {
        setScanCooldown(false);
      }, 2500);
    }
  };

  const toggleCameraFacing = async () => {
    const nextMode = cameraMode === 'environment' ? 'user' : 'environment';
    setCameraMode(nextMode);
    await stopScanner();
    setTimeout(() => {
      startScanner();
    }, 250);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">
                Scan QR Presensi KBM Kelas
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="text-blue-300 font-bold">{selectedClass}</span>
                <span>&bull;</span>
                <span className="text-amber-300 font-semibold">{selectedMapel}</span>
                <span>&bull;</span>
                <span>Pertemuan Ke-{pertemuanKe}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Active Context Banner */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Mode Presensi KBM Tatap Muka Kelas {selectedClass}
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                Siswa cukup menghadapkan kartu barcode / QR Code ke kamera. Data presensi KBM otomatis tersimpan <strong>terpisah</strong> dari absensi Apel Sekolah.
              </p>
            </div>
          </div>

          {/* Camera Viewport */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-square max-w-[340px] mx-auto shadow-inner flex flex-col items-center justify-center">
            <div id="teacher-kbm-reader" className="w-full h-full" />

            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 text-slate-400 gap-3">
                <CameraOff className="w-10 h-10 text-slate-600" />
                <p className="text-xs max-w-xs">{scannerStatus}</p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Nyalakan Kamera
                </button>
              </div>
            )}

            {isScanning && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 bg-slate-900/80 backdrop-blur-xs rounded-xl text-[10px] text-slate-300 border border-slate-700/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Kamera Siap Scan
                </span>
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                  title="Ganti kamera depan / belakang"
                >
                  <SwitchCamera className="w-3 h-3" />
                  Ganti Lensa
                </button>
              </div>
            )}
          </div>

          {/* Last Scan Result Card */}
          {lastScannedStudent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 animate-in zoom-in-95 duration-150">
              <img
                src={lastScannedStudent.student.fotoUrl}
                alt={lastScannedStudent.student.nama}
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-300 shrink-0 bg-white"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Hadir ({lastScannedStudent.timestamp} WIB)
                  </span>
                </div>
                <p className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                  {lastScannedStudent.student.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  NISN: {lastScannedStudent.student.nisn} &bull; Kelas: {lastScannedStudent.student.kelas}
                </p>
              </div>
            </div>
          )}

          {/* Scanner Status Message */}
          <div className="text-center">
            <p className="text-xs text-slate-600 font-medium">{scannerStatus}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isScanning ? (
              <button
                type="button"
                onClick={stopScanner}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
              >
                Hentikan Kamera
              </button>
            ) : (
              <button
                type="button"
                onClick={startScanner}
                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer"
              >
                Mulai Ulang Kamera
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Professional Feedback Modal (Already Absent / Success) */}
      <AttendanceFeedbackModal
        data={feedbackModalData}
        onClose={() => setFeedbackModalData(null)}
      />
    </div>
  );
};
