import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRightLeft,
  Volume2,
  Users,
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig, AttendanceSession } from '../types';
import { playBeep } from '../utils/audio';
import { AttendanceFeedbackModal, AttendanceFeedbackModalData } from './AttendanceFeedbackModal';

interface KioskViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  config: SchoolConfig;
  activeSession: AttendanceSession;
  timeString: string;
  onRecordAttendance: (record: AttendanceRecord) => Promise<boolean>;
  onToggleSessionManual: () => void;
  dayKey: string;
  onGoToPublicRekap?: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({
  students,
  attendance,
  config,
  activeSession,
  timeString,
  onRecordAttendance,
  onToggleSessionManual,
  dayKey,
  onGoToPublicRekap,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  const [scannerStatus, setScannerStatus] = useState<string>('Kamera siap dinyalakan');
  const [lastScanResult, setLastScanResult] = useState<{
    student: Student;
    record: AttendanceRecord;
    timestamp: string;
  } | null>(null);
  const [feedbackModalData, setFeedbackModalData] = useState<AttendanceFeedbackModalData | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];
  const todayLogs = attendance.filter((a) => a.tanggal === todayIso);
  const uniquePagi = new Set(todayLogs.filter((a) => a.sesi === 'Pagi').map((a) => a.nisn.trim())).size;
  const uniqueSiang = new Set(todayLogs.filter((a) => a.sesi === 'Siang').map((a) => a.nisn.trim())).size;
  const totalStudents = students.length;
  const allPresent = new Set(todayLogs.map((a) => a.nisn.trim())).size;
  const notYet = Math.max(0, totalStudents - allPresent);

  const dutyTeacher = config.jadwalPiket[dayKey as keyof typeof config.jadwalPiket] || config.jadwalPiket.senin;

  const startScanner = async () => {
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode('kiosk-reader');
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
        // use facingMode
      }

      const source = selectedCamId ? selectedCamId : { facingMode: cameraMode };

      await scanner.start(
        source,
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        () => {}
      );

      setIsScanning(true);
      setScannerStatus('Kamera aktif. Silakan dekatkan QR Code kartu siswa.');
      playBeep('success');
    } catch (err) {
      console.warn('Failed to start scanner:', err);
      setScannerStatus('Gagal mengakses kamera. Periksa izin akses kamera di browser Anda.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      setIsScanning(false);
      setScannerStatus('Kamera dihentikan.');
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

  // Compute attendance status based on configured times
  const computeStatus = (session: AttendanceSession): string => {
    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    if (session === 'Pagi') {
      const [sh, sm] = config.schedule.morningStart.split(':').map(Number);
      const [oh, om] = config.schedule.morningOnTimeEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const onTimeMin = oh * 60 + om;

      if (curMinutes < startMin) return 'Hadir Terlalu Dini';
      if (curMinutes <= onTimeMin) return 'Hadir Tepat Waktu';
      return 'Terlambat';
    } else {
      const [sh, sm] = config.schedule.afternoonStart.split(':').map(Number);
      const [oh, om] = config.schedule.afternoonOnTimeEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const onTimeMin = oh * 60 + om;

      if (curMinutes < startMin) return 'Pulang Mendahului';
      if (curMinutes <= onTimeMin) return 'Pulang Tepat Waktu';
      return 'Pulang Terlambat';
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (scanCooldown) return;
    const cleanNisn = decodedText.trim();
    if (!cleanNisn) return;

    setScanCooldown(true);

    const student = students.find((s) => s.nisn.trim() === cleanNisn);
    if (!student) {
      playBeep('error');
      setScannerStatus(`NISN [${cleanNisn}] tidak terdaftar di database!`);
      setTimeout(() => setScanCooldown(false), 2000);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const already = attendance.find(
      (a) =>
        a.nisn.trim() === cleanNisn &&
        a.tanggal === today &&
        a.sesi === activeSession &&
        (a.kategori === 'APEL' || !a.kategori)
    );

    if (already) {
      playBeep('warning');
      setScannerStatus(`${student.nama} sudah presensi Sesi ${activeSession} hari ini (${already.waktu} WIB).`);
      setFeedbackModalData({
        isOpen: true,
        type: 'already',
        student,
        record: already,
        contextTitle: `Apel ${activeSession}`,
        autoCloseSeconds: 4,
      });
      setTimeout(() => setScanCooldown(false), 3000);
      return;
    }

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const status = computeStatus(activeSession);

    const record: AttendanceRecord = {
      id: `PRESENSI_${cleanNisn}_${today}_${activeSession}`,
      tanggal: today,
      waktu: time,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      sesi: activeSession,
      status,
      kategori: 'APEL',
    };

    playBeep('success');
    const ok = await onRecordAttendance(record);
    if (ok) {
      setLastScanResult({
        student,
        record,
        timestamp: time,
      });
      setScannerStatus(`Presensi ${student.nama} (${student.kelas}) BERHASIL dicatat.`);
      setFeedbackModalData({
        isOpen: true,
        type: 'success',
        student,
        record,
        contextTitle: `Apel ${activeSession}`,
        autoCloseSeconds: 3,
      });
    }

    setTimeout(() => {
      setScanCooldown(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner: Session & Duty Teacher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Session Info Card */}
        <div className="lg:col-span-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex items-start gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0 text-xl sm:text-2xl text-amber-300 shadow-inner">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 tracking-wide uppercase">
                Presensi Digital QR Code
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Sinkron Realtime
              </span>
              {onGoToPublicRekap && (
                <button
                  type="button"
                  onClick={onGoToPublicRekap}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer ml-auto sm:ml-0"
                >
                  <Users className="w-3 h-3 text-slate-900" />
                  <span>Portal Ortu: Pantau Kehadiran &rarr;</span>
                </button>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold">
              Mode Kiosk Presensi Apel Sekolah (Pagi & Siang)
            </h3>
            <p className="text-xs text-blue-100/90 leading-relaxed">
              Jadwal Aktif: <strong>Apel Pagi ({config.schedule.morningStart} - {config.schedule.morningOnTimeEnd} WIB)</strong> &bull; <strong>Apel Siang ({config.schedule.afternoonStart} - {config.schedule.afternoonOnTimeEnd} WIB)</strong>.
            </p>
          </div>
        </div>

        {/* Duty Teacher Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Guru Piket Hari Ini
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold rounded-md border border-blue-200 uppercase">
              {dayKey}
            </span>
          </div>
          <div className="my-2">
            <p className="text-sm font-bold text-slate-900 truncate">
              {dutyTeacher.nama || 'Petugas Piket Harian, S.Pd'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              NIP: {dutyTeacher.nip || '-'}
            </p>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Siap Melayani Presensi</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Scanner Left, Stats & Logs Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Scanner Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Pemindai QR Kamera
              </h4>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium">Sesi:</span>
              <span className={`text-xs font-black uppercase ${activeSession === 'Pagi' ? 'text-blue-700' : 'text-emerald-700'}`}>
                Apel {activeSession}
              </span>
              <button
                type="button"
                onClick={onToggleSessionManual}
                className="text-slate-400 hover:text-slate-700 ml-1 p-0.5 rounded transition hover:bg-slate-200 cursor-pointer"
                title="Alihkan Sesi Manual Antara Apel Pagi & Apel Siang"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Container */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-square border border-slate-300 flex flex-col items-center justify-center shadow-inner">
            <div id="kiosk-reader" className="w-full h-full"></div>
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-xs font-medium text-slate-300">
                  Kamera dalam posisi siaga
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Klik tombol <strong>"Aktifkan Kamera"</strong> di bawah untuk memulai pemindaian kartu siswa.
                </p>
              </div>
            )}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center">
                <div className="w-52 h-52 border-2 border-blue-400/80 rounded-2xl border-dashed animate-pulse flex items-center justify-center relative">
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-blue-400/90 shadow-[0_0_8px_#60a5fa]"></div>
                </div>
                <p className="text-[11px] text-slate-200 mt-3 font-semibold bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-xs">
                  Arahkan QR Code Kartu ke Kamera
                </p>
              </div>
            )}
          </div>

          {/* Scanner Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Aktifkan Kamera</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span>Putar Kamera</span>
                </button>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CameraOff className="w-4 h-4 text-rose-500" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>

          {/* Status feedback bar */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            <span className="truncate">{scannerStatus}</span>
          </div>

          {/* Last Scan Result Card */}
          {lastScanResult && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 text-xs space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Hasil Pindai Terakhir
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {lastScanResult.record.status}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={lastScanResult.student.fotoUrl}
                  alt={lastScanResult.student.nama}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white shrink-0 shadow-xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://placehold.co/100x100/ffffff/64748b?text=Foto';
                  }}
                />
                <div className="overflow-hidden">
                  <p className="font-extrabold text-xs text-slate-900 truncate">
                    {lastScanResult.student.nama}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono truncate">
                    NISN: {lastScanResult.student.nisn} &bull; {lastScanResult.student.kelas}
                  </p>
                  <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
                    Sesi {lastScanResult.record.sesi} &bull; {lastScanResult.timestamp} WIB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats & Today Logs Panel */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] text-slate-500 font-medium">Total Siswa</p>
              <h5 className="text-xl font-black text-slate-900 mt-0.5">{totalStudents}</h5>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] text-blue-600 font-medium">Hadir Pagi</p>
              <h5 className="text-xl font-black text-blue-600 mt-0.5">{uniquePagi}</h5>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] text-emerald-600 font-medium">Hadir Siang</p>
              <h5 className="text-xl font-black text-emerald-600 mt-0.5">{uniqueSiang}</h5>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] text-amber-600 font-medium">Belum Hadir</p>
              <h5 className="text-xl font-black text-amber-600 mt-0.5">{notYet}</h5>
            </div>
          </div>

          {/* Today Scanned Log Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Log Presensi Terkini Hari Ini
              </h5>
              <span className="text-[10px] font-bold text-slate-500 font-mono">
                {todayLogs.length} Presensi Terdata
              </span>
            </div>

            <div className="overflow-y-auto max-h-72 rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2.5">Waktu</th>
                    <th className="p-2.5">NISN</th>
                    <th className="p-2.5">Nama Siswa</th>
                    <th className="p-2.5">Kelas</th>
                    <th className="p-2.5">Sesi</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {todayLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        Belum ada siswa yang melakukan presensi hari ini.
                      </td>
                    </tr>
                  ) : (
                    todayLogs.map((log) => {
                      const badgeCls =
                        log.sesi === 'Pagi'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 font-mono text-slate-500">{log.waktu}</td>
                          <td className="p-2.5 font-mono font-medium text-slate-900">{log.nisn}</td>
                          <td className="p-2.5 font-bold text-slate-900">{log.nama}</td>
                          <td className="p-2.5 text-slate-600">{log.kelas}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeCls}`}>
                              {log.sesi}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-800 font-medium">
                            {log.status}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Scan Feedback Modal */}
      <AttendanceFeedbackModal
        data={feedbackModalData}
        onClose={() => setFeedbackModalData(null)}
      />
    </div>
  );
};
