import JSZip from 'jszip';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  TeachingJournal,
  FullBackupPayload,
  BackupHistoryItem,
} from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

export const DEFAULT_DRIVE_FOLDER_ID = '1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw';
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/u/0/folders/1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw';

const STORAGE_KEY_TOKEN = 'epresensi_gdrive_token';
const STORAGE_KEY_TOKEN_EXP = 'epresensi_gdrive_token_exp';
const STORAGE_KEY_HISTORY = 'epresensi_backup_history';

/**
 * Clean string for CSV escaping
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 1. CSV GENERATORS
 */
export function generateStudentsCsv(students: Student[]): string {
  const headers = ['NISN', 'NAMA_SISWA', 'JENIS_KELAMIN', 'KELAS', 'FOTO_URL'];
  const rows = students.map((s) => [
    escapeCsv(s.nisn),
    escapeCsv(s.nama),
    escapeCsv(s.jk),
    escapeCsv(s.kelas),
    escapeCsv(s.fotoUrl || ''),
  ]);

  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function generateAttendanceCsv(attendance: AttendanceRecord[]): string {
  const headers = [
    'ID',
    'TANGGAL',
    'WAKTU',
    'NISN',
    'NAMA_SISWA',
    'KELAS',
    'SESI',
    'STATUS',
    'KATEGORI',
    'MATA_PELAJARAN',
    'PERTEMUAN_KE',
    'MATERI_POKOK',
    'GURU_ID',
    'GURU_NAMA',
  ];

  const rows = attendance.map((a) => [
    escapeCsv(a.id),
    escapeCsv(a.tanggal),
    escapeCsv(a.waktu),
    escapeCsv(a.nisn),
    escapeCsv(a.nama),
    escapeCsv(a.kelas),
    escapeCsv(a.sesi),
    escapeCsv(a.status),
    escapeCsv(a.kategori || 'APEL'),
    escapeCsv(a.mapel || '-'),
    escapeCsv(a.pertemuanKe !== undefined ? a.pertemuanKe : '-'),
    escapeCsv(a.materiPokok || '-'),
    escapeCsv(a.guruId || '-'),
    escapeCsv(a.guruNama || '-'),
  ]);

  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function generateJournalsCsv(journals: TeachingJournal[]): string {
  const headers = [
    'ID_JURNAL',
    'TANGGAL',
    'PERTEMUAN_KE',
    'JAM_PELAJARAN',
    'KELAS',
    'MATA_PELAJARAN',
    'GURU_NAMA',
    'GURU_NIP',
    'MATERI_POKOK',
    'KEGIATAN_PEMBELAJARAN',
    'CATATAN_REFLEKSI',
    'TOTAL_SISWA',
    'HADIR',
    'TERLAMBAT',
    'IZIN',
    'SAKIT',
    'ALPA',
    'PERSENTASE_HADIR_PERSEN',
    'CREATED_AT',
  ];

  const rows = journals.map((j) => [
    escapeCsv(j.id),
    escapeCsv(j.tanggal),
    escapeCsv(j.pertemuanKe),
    escapeCsv(j.jamPelajaran || '-'),
    escapeCsv(j.kelas),
    escapeCsv(j.mapel),
    escapeCsv(j.guruNama),
    escapeCsv(j.guruNip || '-'),
    escapeCsv(j.materiPokok),
    escapeCsv(j.kegiatanPembelajaran || '-'),
    escapeCsv(j.catatanRefleksi || '-'),
    escapeCsv(j.totalSiswa),
    escapeCsv(j.hadir),
    escapeCsv(j.terlambat),
    escapeCsv(j.izin),
    escapeCsv(j.sakit),
    escapeCsv(j.alpa),
    escapeCsv(j.persentaseKehadiran),
    escapeCsv(j.createdAt),
  ]);

  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function generateTeachersCsv(teachers: TeacherUser[]): string {
  const headers = [
    'ID_GURU',
    'NIP',
    'NAMA_LENGKAP',
    'USERNAME',
    'MATA_PELAJARAN',
    'WALI_KELAS',
    'KONTAK_WA',
    'STATUS',
    'CREATED_AT',
  ];

  const rows = teachers.map((t) => [
    escapeCsv(t.id),
    escapeCsv(t.nip || '-'),
    escapeCsv(t.nama),
    escapeCsv(t.username),
    escapeCsv(t.mapel),
    escapeCsv(t.waliKelas || '-'),
    escapeCsv(t.kontak || t.noHp || '-'),
    escapeCsv(t.status),
    escapeCsv(t.createdAt),
  ]);

  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * 2. BROWSER DOWNLOAD HELPERS
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadCsvFile(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, fileName);
}

export function downloadJsonFile(data: any, fileName: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, fileName);
}

export async function createFullBackupZip(payload: FullBackupPayload): Promise<Blob> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. JSON Master
  zip.file(
    `BACKUP_${payload.npsn || 'SCHOOL'}_${dateStr}_FULL.json`,
    JSON.stringify(payload, null, 2)
  );

  // 2. CSV Files
  zip.file(`1_DATA_SISWA_${dateStr}.csv`, generateStudentsCsv(payload.students));
  zip.file(`2_LOG_PRESENSI_${dateStr}.csv`, generateAttendanceCsv(payload.attendance));
  zip.file(`3_JURNAL_MENGAJAR_${dateStr}.csv`, generateJournalsCsv(payload.journals));
  zip.file(`4_DATA_GURU_${dateStr}.csv`, generateTeachersCsv(payload.teachers));

  // 3. Readme / Metadata
  const readme = `=====================================================
ARSIP CADANGAN LENGKAP E-PRESENSI DIGITAL
Instansi: ${payload.schoolName} (NPSN: ${payload.npsn})
Waktu Ekspor: ${payload.exportedAt}
=====================================================

RINGKASAN DATA TERCADANG:
- Total Siswa Master: ${payload.students.length} Siswa
- Total Catatan Presensi: ${payload.attendance.length} Log Presensi
- Total Jurnal Mengajar: ${payload.journals.length} Sesi KBM
- Total Akun Guru: ${payload.teachers.length} Guru

PETUNJUK PEMULIHAN (RESTORE):
1. Buka Menu "Backup & Google Drive" atau "Pengaturan" di aplikasi E-Presensi.
2. Klik tombol "Pulihkan / Restore Data dari File Backup".
3. Pilih file JSON berformat (*_FULL.json) yang berada di dalam berkas ZIP ini.
4. Sistem akan memverifikasi dan memulihkan seluruh data ke database Firestore/Lokal.
`;
  zip.file('README_INFO_CADANGAN.txt', readme);

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * 3. GOOGLE IDENTITY SERVICES (GIS) & TOKEN MANAGEMENT
 */

/**
 * Ensures Google Identity Services (GIS) library is loaded in document
 */
export async function ensureGisLoaded(timeoutMs: number = 8000): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    let script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const checkInterval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkInterval);
        clearTimeout(timer);
        resolve(true);
      }
    }, 100);

    const timer = setTimeout(() => {
      clearInterval(checkInterval);
      resolve(Boolean(window.google?.accounts?.oauth2));
    }, timeoutMs);
  });
}

/**
 * Fallback to Firebase Google Auth Provider with Google Drive scope
 */
async function fallbackFirebaseGoogleAuth(): Promise<string> {
  try {
    const { auth } = await import('../firebase');
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

    if (!auth) {
      throw new Error(
        'Layanan Google Identity belum terhubung di lingkungan browser saat ini. Silakan gunakan tombol "Download Paket ZIP Lengkap" untuk mengunduh seluruh file cadangan sekolah secara instan.'
      );
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Gagal memperoleh akses token Google Drive dari autentikasi akun Google.');
    }

    saveDriveToken(accessToken, 3600);
    return accessToken;
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error('Jendela otorisasi Google ditutup sebelum selesai.');
    }
    if (err?.code === 'auth/cancelled-popup-request') {
      throw new Error('Permintaan login dibatalkan.');
    }
    throw new Error(
      err?.message ||
        'Otorisasi Google Drive tidak dapat diselesaikan. Anda dapat menggunakan tombol "Download Paket ZIP Lengkap" untuk mengunduh semua data cadangan.'
    );
  }
}

export function getCachedDriveToken(): string | null {
  try {
    const token = sessionStorage.getItem(STORAGE_KEY_TOKEN);
    const expStr = sessionStorage.getItem(STORAGE_KEY_TOKEN_EXP);
    if (!token || !expStr) return null;

    const exp = parseInt(expStr, 10);
    if (Date.now() > exp - 60000) {
      // Token expired or about to expire in 1 minute
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      sessionStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveDriveToken(token: string, expiresInSeconds: number = 3500) {
  try {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
    const expTime = Date.now() + expiresInSeconds * 1000;
    sessionStorage.setItem(STORAGE_KEY_TOKEN_EXP, expTime.toString());
  } catch (e) {
    console.warn('Could not save token to sessionStorage:', e);
  }
}

export function clearDriveToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
  } catch {}
}

/**
 * Request Google Drive OAuth Access Token using Google Identity Services (GIS) with auto script loading and Firebase fallback
 */
export async function requestGoogleDriveAccessToken(
  customClientId?: string
): Promise<string> {
  const cached = getCachedDriveToken();
  if (cached) return cached;

  // 1. Ensure GIS is ready
  const gisReady = await ensureGisLoaded(5000);

  if (gisReady && window.google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      const clientId =
        customClientId ||
        (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
        '85384934047-client.apps.googleusercontent.com';

      let tokenReceived = false;

      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          prompt: 'consent',
          callback: (response: any) => {
            tokenReceived = true;
            if (response.error) {
              reject(
                new Error(
                  response.error_description ||
                    response.error ||
                    'Autentikasi Google Drive dibatalkan.'
                )
              );
              return;
            }
            if (response.access_token) {
              saveDriveToken(response.access_token, response.expires_in || 3600);
              resolve(response.access_token);
            } else {
              reject(new Error('Tidak menerima token otorisasi dari Google.'));
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });

        // Fallback timer if user closes popup without callback
        setTimeout(() => {
          if (!tokenReceived) {
            const token = getCachedDriveToken();
            if (token) resolve(token);
          }
        }, 30000);
      } catch (err: any) {
        fallbackFirebaseGoogleAuth().then(resolve).catch(reject);
      }
    });
  }

  // 2. Fallback to Firebase Google Provider
  return await fallbackFirebaseGoogleAuth();
}

/**
 * 4. GOOGLE DRIVE REST API V3 CALLS
 */

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Upload single file to Google Drive folder using multipart/related endpoint
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  content: string | Blob
): Promise<DriveUploadResult> {
  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
    mimeType: mimeType,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let bodyContent: string;
  if (typeof content === 'string') {
    bodyContent = content;
  } else {
    bodyContent = await content.text();
  }

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    bodyContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData?.error?.message || `Google Drive API error: ${res.statusText} (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    fileId: data.id,
    fileName: data.name,
    webViewLink: data.webViewLink,
    webContentLink: data.webContentLink,
  };
}

/**
 * Upload entire daily backup package to Google Drive
 */
export async function executeFullDriveBackup(
  accessToken: string,
  folderId: string,
  payload: FullBackupPayload
): Promise<{
  success: boolean;
  uploadedFiles: DriveUploadResult[];
  message: string;
}> {
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  const cleanSchool = (payload.schoolName || 'SMP_PGRI_1_CIKADU').replace(/\s+/g, '_');

  const uploadedFiles: DriveUploadResult[] = [];

  try {
    // 1. Full JSON Backup (Primary recovery snapshot)
    const jsonFileName = `BACKUP_${cleanSchool}_${dateStr}_${timeStr}_FULL.json`;
    const jsonContent = JSON.stringify(payload, null, 2);
    const jsonRes = await uploadFileToDrive(
      accessToken,
      folderId,
      jsonFileName,
      'application/json',
      jsonContent
    );
    uploadedFiles.push(jsonRes);

    // 2. CSV Data Siswa
    const siswaCsvName = `DATA_SISWA_${cleanSchool}_${dateStr}.csv`;
    const siswaCsvContent = generateStudentsCsv(payload.students);
    const siswaRes = await uploadFileToDrive(
      accessToken,
      folderId,
      siswaCsvName,
      'text/csv;charset=utf-8',
      siswaCsvContent
    );
    uploadedFiles.push(siswaRes);

    // 3. CSV Log Presensi
    const presensiCsvName = `LOG_PRESENSI_${cleanSchool}_${dateStr}.csv`;
    const presensiCsvContent = generateAttendanceCsv(payload.attendance);
    const presensiRes = await uploadFileToDrive(
      accessToken,
      folderId,
      presensiCsvName,
      'text/csv;charset=utf-8',
      presensiCsvContent
    );
    uploadedFiles.push(presensiRes);

    // 4. CSV Jurnal Mengajar
    const jurnalCsvName = `JURNAL_MENGAJAR_${cleanSchool}_${dateStr}.csv`;
    const jurnalCsvContent = generateJournalsCsv(payload.journals);
    const jurnalRes = await uploadFileToDrive(
      accessToken,
      folderId,
      jurnalCsvName,
      'text/csv;charset=utf-8',
      jurnalCsvContent
    );
    uploadedFiles.push(jurnalRes);

    // 5. CSV Akun Guru
    const guruCsvName = `DATA_GURU_${cleanSchool}_${dateStr}.csv`;
    const guruCsvContent = generateTeachersCsv(payload.teachers);
    const guruRes = await uploadFileToDrive(
      accessToken,
      folderId,
      guruCsvName,
      'text/csv;charset=utf-8',
      guruCsvContent
    );
    uploadedFiles.push(guruRes);

    return {
      success: true,
      uploadedFiles,
      message: `Berhasil mengunggah ${uploadedFiles.length} berkas cadangan ke Google Drive.`,
    };
  } catch (err: any) {
    throw new Error(`Gagal menyelesaikan proses backup ke Google Drive: ${err?.message}`);
  }
}

/**
 * 5. BACKUP HISTORY STORAGE HELPERS
 */

export function getBackupHistory(): BackupHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addBackupHistoryItem(item: BackupHistoryItem): BackupHistoryItem[] {
  try {
    const history = getBackupHistory();
    const updated = [item, ...history.slice(0, 49)]; // keep latest 50
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearBackupHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch {}
}

/**
 * 6. RESTORE / VALIDATION PARSER
 */
export function parseAndValidateBackupPayload(
  rawJson: string
): { valid: boolean; payload?: FullBackupPayload; error?: string } {
  try {
    const data = JSON.parse(rawJson);

    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Format file bukan objek JSON valid.' };
    }

    if (!Array.isArray(data.students)) {
      return { valid: false, error: 'File tidak memuat array data siswa (students).' };
    }

    if (!Array.isArray(data.attendance)) {
      return { valid: false, error: 'File tidak memuat array data presensi (attendance).' };
    }

    // Optional arrays with fallback
    const journals = Array.isArray(data.journals) ? data.journals : [];
    const teachers = Array.isArray(data.teachers) ? data.teachers : [];

    const payload: FullBackupPayload = {
      version: data.version || '1.0',
      exportedAt: data.exportedAt || new Date().toISOString(),
      schoolName: data.schoolName || 'SMP PGRI 1 CIKADU',
      npsn: data.npsn || '',
      config: data.config || {},
      students: data.students,
      attendance: data.attendance,
      journals,
      teachers,
      kalenderHeb: data.kalenderHeb || {},
    };

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: `Gagal membaca file JSON: ${err?.message || 'Sintaks tidak valid'}` };
  }
}
