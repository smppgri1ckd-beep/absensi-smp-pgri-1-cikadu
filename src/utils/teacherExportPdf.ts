import { jsPDF } from 'jspdf';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  AttendanceCategory,
  TeachingJournal,
} from '../types';
import { getSchoolLogoImage } from './imageLoader';

export interface TeacherDailyPdfOptions {
  kategori?: AttendanceCategory;
  mapel?: string;
  pertemuanKe?: number;
  materiPokok?: string;
  jamPelajaran?: string;
  kegiatanPembelajaran?: string;
  catatanRefleksi?: string;
}

/**
 * 1. LAPORAN PRESENSI & KBM PER PERTEMUAN / MATERI
 * Menampilkan detail 1 sesi pertemuan beserta materi pokok, kegiatan pembelajaran, catatan, dan daftar kehadiran siswa lengkap.
 */
export async function exportTeacherDailyPDF(
  config: SchoolConfig,
  teacher: TeacherUser,
  className: string,
  session: string,
  dateStr: string,
  students: Student[],
  attendance: AttendanceRecord[],
  options?: TeacherDailyPdfOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const isKelas = options?.kategori === 'KELAS';
  const displayMapel = options?.mapel || teacher.mapel;
  const pertemuan = options?.pertemuanKe || 1;
  const materi = options?.materiPokok;
  const jam = options?.jamPelajaran;
  const kegiatan = options?.kegiatanPembelajaran;
  const catatan = options?.catatanRefleksi;

  const pageWidth = 210;
  const margin = 12;
  let y = 14;

  // Render Logo Sekolah in Kop Surat
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  // Draw school logo on the top-left if available
  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 13, 20, 20);
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  // Header / Kop Surat Resmi
  const textCenterX = logoImg ? (pageWidth + margin + 16) / 2 : pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN", textCenterX, y, { align: 'center' });
  y += 4;
  doc.text("PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR", textCenterX, y, { align: 'center' });
  y += 5;
  doc.setFontSize(13);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(config.alamat, textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.text(`${config.kontak} | NPSN: ${config.npsn}`, textCenterX, y, { align: 'center' });
  y += 4;

  // Double border line
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.8, pageWidth - margin, y + 0.8);
  y += 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleText = isKelas
    ? "LAPORAN PRESENSI & JURNAL KBM TATAP MUKA KELAS"
    : "LAPORAN HARIAN PRESENSI SISWA (APEL KEDISIPLINAN)";
  doc.text(titleText, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const subTitle = isKelas
    ? `Kelas / Rombel: ${className}   |   Mata Pelajaran: ${displayMapel}   |   Pertemuan Ke-${pertemuan}   |   Tanggal: ${dateStr}`
    : `Kelas / Rombel: ${className}   |   Sesi: ${session === 'Pagi' ? 'Apel Pagi' : 'Apel Siang'}   |   Tanggal: ${dateStr}`;
  doc.text(subTitle, pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  // Info Block (Guru Pengajar & Data Pembelajaran)
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - (margin * 2), isKelas ? 24 : 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, pageWidth - (margin * 2), isKelas ? 24 : 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text("Guru Pengajar:", margin + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${teacher.nama} (NIP: ${teacher.nip || '-'})`, margin + 25, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.text("Hari / Tanggal:", margin + 110, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr} ${jam ? `(${jam})` : ''}`, margin + 132, y + 4);

  if (isKelas) {
    doc.setFont('helvetica', 'bold');
    doc.text("Mata Pelajaran:", margin + 3, y + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${displayMapel} (Pertemuan Ke-${pertemuan})`, margin + 25, y + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.text("Materi Pokok:", margin + 3, y + 13);
    doc.setFont('helvetica', 'normal');
    const materiText = materi || 'Materi pembelajaran pertemuan tatap muka';
    doc.text(materiText.length > 85 ? materiText.substring(0, 83) + '...' : materiText, margin + 25, y + 13);

    if (kegiatan || catatan) {
      doc.setFont('helvetica', 'bold');
      doc.text("Kegiatan / Catatan:", margin + 3, y + 17.5);
      doc.setFont('helvetica', 'normal');
      const noteText = [kegiatan, catatan].filter(Boolean).join(' | ') || '-';
      doc.text(noteText.length > 85 ? noteText.substring(0, 83) + '...' : noteText, margin + 25, y + 17.5);
    }
    y += 26;
  } else {
    y += 14;
  }

  // Filter attendance for date and session (and matching mapel if KELAS)
  const dateSessionRecords = attendance.filter((a) => {
    if (a.tanggal !== dateStr) return false;
    if (isKelas) {
      if (a.kategori === 'KELAS') {
        const mapelMatch = !a.mapel || a.mapel.trim().toLowerCase() === displayMapel.trim().toLowerCase();
        const pertemuanMatch = a.pertemuanKe === undefined || a.pertemuanKe === pertemuan;
        return mapelMatch && pertemuanMatch;
      }
      return a.sesi === session;
    } else {
      return (a.kategori === 'APEL' || !a.kategori) && a.sesi === session;
    }
  });

  const recMap = new Map<string, AttendanceRecord>();
  dateSessionRecords.forEach((r) => recMap.set(r.nisn, r));

  const sortedStudents = [...students].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  let hadir = 0;
  let terlambat = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;

  sortedStudents.forEach((s) => {
    const r = recMap.get(s.nisn);
    if (!r) {
      alpa++;
    } else {
      const st = r.status.toLowerCase();
      if (st.includes('tepat') || st.includes('hadir')) hadir++;
      else if (st.includes('terlambat')) terlambat++;
      else if (st.includes('izin')) izin++;
      else if (st.includes('sakit')) sakit++;
      else if (st.includes('alpa')) alpa++;
      else hadir++;
    }
  });

  const totalSiswa = sortedStudents.length;
  const totalHadirSemua = hadir + terlambat;
  const persen = totalSiswa > 0 ? Math.round((totalHadirSemua / totalSiswa) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`Tingkat Kehadiran: ${persen}% (${totalHadirSemua} dari ${totalSiswa} Siswa Hadir)`, margin, y + 3.5);
  doc.text(`Hadir: ${hadir}  |  Terlambat: ${terlambat}  |  Izin: ${izin}  |  Sakit: ${sakit}  |  Alpa: ${alpa}`, pageWidth - margin, y + 3.5, { align: 'right' });
  y += 6;

  // Table header
  const cols = [
    { title: "No", width: 10, align: 'center' as const },
    { title: "NISN", width: 26, align: 'center' as const },
    { title: "Nama Lengkap Siswa", width: 68, align: 'left' as const },
    { title: "L/P", width: 12, align: 'center' as const },
    { title: "Waktu", width: 22, align: 'center' as const },
    { title: "Status Kehadiran", width: 48, align: 'center' as const },
  ];

  const tableStartX = margin;
  let currentX = tableStartX;

  // Draw Header Row
  doc.setFillColor(241, 245, 249);
  doc.rect(tableStartX, y, pageWidth - (margin * 2), 6.5, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  cols.forEach((col) => {
    doc.rect(currentX, y, col.width, 6.5);
    const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
    doc.text(col.title, textX, y + 4.3, { align: col.align });
    currentX += col.width;
  });
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  sortedStudents.forEach((siswa, index) => {
    // Check if new page is needed
    if (y > 260) {
      doc.addPage();
      y = 15;
    }

    const rec = recMap.get(siswa.nisn);
    const waktuText = rec?.waktu ? `${rec.waktu} WIB` : '-';
    const statusText = rec ? rec.status : 'Alpa (Belum Hadir)';

    currentX = tableStartX;
    const rowHeight = 5.4;

    const rowData = [
      String(index + 1),
      siswa.nisn,
      siswa.nama.length > 36 ? siswa.nama.substring(0, 34) + '...' : siswa.nama,
      siswa.jk,
      waktuText,
      statusText,
    ];

    // Background for alternate rows
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableStartX, y, pageWidth - (margin * 2), rowHeight, 'F');
    }

    cols.forEach((col, cIdx) => {
      doc.rect(currentX, y, col.width, rowHeight);
      const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
      doc.text(rowData[cIdx], textX, y + 3.8, { align: col.align });
      currentX += col.width;
    });

    y += rowHeight;
  });

  // Signatures Section
  if (y > 240) {
    doc.addPage();
    y = 20;
  } else {
    y += 8;
  }

  const leftSignX = margin + 25;
  const rightSignX = pageWidth - margin - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  // Left Signature (Headmaster)
  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 3.5, { align: 'center' });

  // Right Signature (Teacher)
  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Guru Mata Pelajaran,", rightSignX, y + 3.5, { align: 'center' });

  y += 18;

  // Headmaster Name
  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  // Teacher Name
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${teacher.nip || '-'}`, rightSignX, y + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  const safeMapel = displayMapel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_KBM_${className}_${safeMapel}_P${pertemuan}_${dateStr}_${cleanSchool}.pdf`);
}

/**
 * 2. BUKU AGENDA & REKAP JURNAL PEMBELAJARAN GURU (KBM TATAP MUKA)
 * Menghasilkan rekap jurnal mengajar resmi berdasarkan filter tanggal, materi, atau pertemuan tertentu.
 */
export interface JournalExportFilterOptions {
  dateMode?: 'ALL' | 'SINGLE' | 'RANGE';
  startDate?: string;
  endDate?: string;
  pertemuanMode?: 'ALL' | 'SINGLE' | 'RANGE';
  singlePertemuan?: number;
  pertemuanFrom?: number;
  pertemuanTo?: number;
  materiKeyword?: string;
  customSubtitle?: string;
}

export async function exportTeacherJournalBookPDF(
  config: SchoolConfig,
  teacher: TeacherUser,
  className: string,
  mapel: string,
  journals: TeachingJournal[],
  filterOptions?: JournalExportFilterOptions
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm
  });

  const pageWidth = 297;
  const margin = 12;
  let y = 12;

  // Render Logo Sekolah in Kop Surat
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 10, 18, 18);
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  const textCenterX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI) KABUPATEN CIANJUR", textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFontSize(12);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${config.alamat} | NPSN: ${config.npsn} | ${config.kontak}`, textCenterX, y, { align: 'center' });
  y += 3.5;

  // Double border line
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.6, pageWidth - margin, y + 0.6);
  y += 5.5;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("REKAP BUKU AGENDA & JURNAL PEMBELAJARAN GURU (KBM TATAP MUKA)", textCenterX, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Kelas / Rombel: ${className === 'ALL' ? 'Semua Kelas' : `Kelas ${className}`}   |   Mata Pelajaran: ${mapel}   |   Guru Pengajar: ${teacher.nama} (NIP: ${teacher.nip || '-'})`, textCenterX, y, { align: 'center' });
  y += 4;

  // Build filter label badge in PDF header
  const filterBadges: string[] = [];
  if (filterOptions?.dateMode === 'SINGLE' && filterOptions.startDate) {
    filterBadges.push(`Tanggal: ${filterOptions.startDate}`);
  } else if (filterOptions?.dateMode === 'RANGE' && (filterOptions.startDate || filterOptions.endDate)) {
    filterBadges.push(`Periode: ${filterOptions.startDate || 'Awal'} s.d ${filterOptions.endDate || 'Akhir'}`);
  }

  if (filterOptions?.pertemuanMode === 'SINGLE' && filterOptions.singlePertemuan) {
    filterBadges.push(`Pertemuan: Ke-${filterOptions.singlePertemuan}`);
  } else if (filterOptions?.pertemuanMode === 'RANGE' && (filterOptions.pertemuanFrom || filterOptions.pertemuanTo)) {
    filterBadges.push(`Pertemuan: P${filterOptions.pertemuanFrom || 1} s.d P${filterOptions.pertemuanTo || 32}`);
  }

  if (filterOptions?.materiKeyword && filterOptions.materiKeyword.trim()) {
    filterBadges.push(`Filter Materi: "${filterOptions.materiKeyword.trim()}"`);
  }

  if (filterBadges.length > 0 || filterOptions?.customSubtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 70, 110);
    const filterText = filterOptions?.customSubtitle || `[ Filter: ${filterBadges.join(' | ')} ]`;
    doc.text(filterText, textCenterX, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 4.5;
  } else {
    y += 1.5;
  }

  // Sort journals by pertemuanKe / tanggal
  const sortedJournals = [...journals].sort((a, b) => {
    if (a.pertemuanKe !== b.pertemuanKe) return a.pertemuanKe - b.pertemuanKe;
    return a.tanggal.localeCompare(b.tanggal);
  });

  // Table Cols
  const cols = [
    { title: "No", width: 9, align: 'center' as const },
    { title: "Pertemuan", width: 18, align: 'center' as const },
    { title: "Hari / Tanggal", width: 26, align: 'center' as const },
    { title: "Jam Ke", width: 18, align: 'center' as const },
    { title: "Kelas", width: 15, align: 'center' as const },
    { title: "Materi Pokok / Kompetensi Dasar", width: 72, align: 'left' as const },
    { title: "Kegiatan Pembelajaran & Catatan", width: 58, align: 'left' as const },
    { title: "Kehadiran (H/S/I/A)", width: 26, align: 'center' as const },
    { title: "% Hadir", width: 16, align: 'center' as const },
    { title: "Paraf", width: 15, align: 'center' as const },
  ];

  const tableStartX = margin;
  let currentX = tableStartX;

  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(tableStartX, y, pageWidth - (margin * 2), 7, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  cols.forEach((col) => {
    doc.rect(currentX, y, col.width, 7);
    const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
    doc.text(col.title, textX, y + 4.5, { align: col.align });
    currentX += col.width;
  });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  let totalHadirAll = 0;
  let totalSiswaAll = 0;
  let sumPercentage = 0;

  if (sortedJournals.length === 0) {
    doc.rect(tableStartX, y, pageWidth - (margin * 2), 12);
    doc.text("Belum ada data jurnal pembelajaran yang tersimpan untuk kriteria filter ini.", pageWidth / 2, y + 7, { align: 'center' });
    y += 12;
  } else {
    sortedJournals.forEach((jrn, index) => {
      if (y > 170) {
        doc.addPage();
        y = 15;
      }

      currentX = tableStartX;
      const rowHeight = 7.5;

      const hadirCount = (jrn.hadir || 0) + (jrn.terlambat || 0);
      const totalSiswa = jrn.totalSiswa || (hadirCount + (jrn.izin || 0) + (jrn.sakit || 0) + (jrn.alpa || 0)) || 1;
      const pct = jrn.persentaseKehadiran !== undefined ? jrn.persentaseKehadiran : Math.round((hadirCount / totalSiswa) * 100);

      totalHadirAll += hadirCount;
      totalSiswaAll += totalSiswa;
      sumPercentage += pct;

      const hadirSummary = `${hadirCount}H / ${jrn.sakit || 0}S / ${jrn.izin || 0}I / ${jrn.alpa || 0}A`;
      const combinedNotes = [jrn.kegiatanPembelajaran, jrn.catatanRefleksi].filter(Boolean).join(' - ') || '-';

      const rowData = [
        String(index + 1),
        `Ke-${jrn.pertemuanKe}`,
        jrn.tanggal,
        jrn.jamPelajaran || '-',
        jrn.kelas,
        jrn.materiPokok.length > 48 ? jrn.materiPokok.substring(0, 46) + '...' : jrn.materiPokok,
        combinedNotes.length > 42 ? combinedNotes.substring(0, 40) + '...' : combinedNotes,
        hadirSummary,
        `${pct}%`,
        '✓',
      ];

      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(tableStartX, y, pageWidth - (margin * 2), rowHeight, 'F');
      }

      cols.forEach((col, cIdx) => {
        doc.rect(currentX, y, col.width, rowHeight);
        const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
        doc.text(rowData[cIdx], textX, y + 4.8, { align: col.align });
        currentX += col.width;
      });

      y += rowHeight;
    });

    // Summary Stat Row
    if (sortedJournals.length > 0) {
      const avgPct = Math.round(sumPercentage / sortedJournals.length);
      doc.setFillColor(243, 244, 246);
      doc.rect(tableStartX, y, pageWidth - (margin * 2), 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.rect(tableStartX, y, pageWidth - (margin * 2), 6);
      doc.text(
        `Total Sesi: ${sortedJournals.length} Pertemuan  |  Total Presensi Siswa Hadir: ${totalHadirAll}  |  Rata-Rata Keterlibatan: ${avgPct}%`,
        tableStartX + 4,
        y + 4
      );
      y += 6;
    }
  }

  // Signatures
  if (y > 165) {
    doc.addPage();
    y = 15;
  } else {
    y += 7;
  }

  const leftSignX = margin + 40;
  const rightSignX = pageWidth - margin - 50;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 3.5, { align: 'center' });

  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Guru Mata Pelajaran,", rightSignX, y + 3.5, { align: 'center' });

  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${teacher.nip || '-'}`, rightSignX, y + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  const safeMapel = mapel.replace(/[^a-zA-Z0-9]/g, '_');
  const safeClass = className.replace(/[^a-zA-Z0-9]/g, '_');
  const filterSuffix = filterBadges.length > 0 ? '_Filtered' : '';
  doc.save(`Rekap_Jurnal_Pembelajaran_${safeClass}_${safeMapel}${filterSuffix}_${cleanSchool}.pdf`);
}

/**
 * 3. MATRIKS REKAPITULASI PRESENSI SISWA PER PERTEMUAN (P1 - P16)
 * Menampilkan matriks presensi siswa baris-per-siswa kolom-per-pertemuan beserta persentase akhir.
 */
export async function exportTeacherAttendanceMatrixPDF(
  config: SchoolConfig,
  teacher: TeacherUser,
  className: string,
  mapel: string,
  students: Student[],
  journals: TeachingJournal[],
  attendance: AttendanceRecord[]
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm
  });

  const pageWidth = 297;
  const margin = 12;
  let y = 12;

  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 10, 18, 18);
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  const textCenterX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI) KABUPATEN CIANJUR", textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFontSize(12);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${config.alamat} | NPSN: ${config.npsn} | ${config.kontak}`, textCenterX, y, { align: 'center' });
  y += 3.5;

  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.6, pageWidth - margin, y + 0.6);
  y += 5.5;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("MATRIKS REKAPITULASI PRESENSI KBM TATAP MUKA SISWA", textCenterX, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Kelas: ${className}   |   Mata Pelajaran: ${mapel}   |   Guru Pengajar: ${teacher.nama}`, textCenterX, y, { align: 'center' });
  y += 5.5;

  // Determine meetings (max 16 meetings on 1 page grid)
  const meetingNumbers = Array.from(new Set(journals.map((j) => j.pertemuanKe)))
    .sort((a, b) => a - b)
    .slice(0, 16);

  if (meetingNumbers.length === 0) {
    for (let i = 1; i <= 10; i++) meetingNumbers.push(i);
  }

  const sortedStudents = [...students]
    .filter((s) => s.kelas === className)
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  // Build columns
  const baseCols = [
    { title: "No", width: 8, align: 'center' as const },
    { title: "NISN", width: 24, align: 'center' as const },
    { title: "Nama Lengkap Siswa", width: 56, align: 'left' as const },
    { title: "L/P", width: 9, align: 'center' as const },
  ];

  const meetingColWidth = Math.min(9, Math.floor(130 / meetingNumbers.length));
  const meetingCols = meetingNumbers.map((p) => ({
    title: `P${p}`,
    width: meetingColWidth,
    align: 'center' as const,
  }));

  const statCols = [
    { title: "H", width: 8, align: 'center' as const },
    { title: "S", width: 8, align: 'center' as const },
    { title: "I", width: 8, align: 'center' as const },
    { title: "A", width: 8, align: 'center' as const },
    { title: "%", width: 12, align: 'center' as const },
  ];

  const allCols = [...baseCols, ...meetingCols, ...statCols];
  const totalTableWidth = allCols.reduce((sum, c) => sum + c.width, 0);

  const tableStartX = margin + (pageWidth - margin * 2 - totalTableWidth) / 2;
  let currentX = tableStartX;

  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(tableStartX, y, totalTableWidth, 6.5, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  allCols.forEach((col) => {
    doc.rect(currentX, y, col.width, 6.5);
    const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 1.5;
    doc.text(col.title, textX, y + 4.2, { align: col.align });
    currentX += col.width;
  });
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  sortedStudents.forEach((siswa, index) => {
    if (y > 175) {
      doc.addPage();
      y = 15;
    }

    currentX = tableStartX;
    const rowHeight = 5.2;

    let hCount = 0;
    let sCount = 0;
    let iCount = 0;
    let aCount = 0;

    const pStatuses = meetingNumbers.map((p) => {
      const rec = attendance.find(
        (a) =>
          a.nisn === siswa.nisn &&
          a.kategori === 'KELAS' &&
          (!a.mapel || a.mapel.trim().toLowerCase() === mapel.trim().toLowerCase()) &&
          a.pertemuanKe === p
      );

      if (!rec) {
        aCount++;
        return 'A';
      }
      const st = rec.status.toLowerCase();
      if (st.includes('hadir') || st.includes('tepat')) {
        hCount++;
        return 'H';
      }
      if (st.includes('terlambat')) {
        hCount++;
        return 'T';
      }
      if (st.includes('sakit')) {
        sCount++;
        return 'S';
      }
      if (st.includes('izin')) {
        iCount++;
        return 'I';
      }
      aCount++;
      return 'A';
    });

    const totalP = meetingNumbers.length;
    const persen = totalP > 0 ? Math.round((hCount / totalP) * 100) : 0;

    const rowData = [
      String(index + 1),
      siswa.nisn,
      siswa.nama.length > 28 ? siswa.nama.substring(0, 26) + '...' : siswa.nama,
      siswa.jk,
      ...pStatuses,
      String(hCount),
      String(sCount),
      String(iCount),
      String(aCount),
      `${persen}%`,
    ];

    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableStartX, y, totalTableWidth, rowHeight, 'F');
    }

    allCols.forEach((col, cIdx) => {
      doc.rect(currentX, y, col.width, rowHeight);
      const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 1.5;
      doc.text(rowData[cIdx], textX, y + 3.6, { align: col.align });
      currentX += col.width;
    });

    y += rowHeight;
  });

  // Signatures
  if (y > 165) {
    doc.addPage();
    y = 15;
  } else {
    y += 7;
  }

  const leftSignX = margin + 40;
  const rightSignX = pageWidth - margin - 50;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 3.5, { align: 'center' });

  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Guru Mata Pelajaran,", rightSignX, y + 3.5, { align: 'center' });

  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${teacher.nip || '-'}`, rightSignX, y + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  const safeMapel = mapel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Matriks_Presensi_${className}_${safeMapel}_${cleanSchool}.pdf`);
}
