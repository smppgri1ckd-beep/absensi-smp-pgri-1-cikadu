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
  doc.text(`${teacher.nama} (NIP/NUPTK: ${teacher.nip || '-'})`, margin + 25, y + 4);

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
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  // Teacher Name
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${teacher.nip || '-'}`, rightSignX, y + 3.5, { align: 'center' });

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
  doc.text(`Kelas / Rombel: ${className === 'ALL' ? 'Semua Kelas' : `Kelas ${className}`}   |   Mata Pelajaran: ${mapel}   |   Guru Pengajar: ${teacher.nama} (NIP/NUPTK: ${teacher.nip || '-'})`, textCenterX, y, { align: 'center' });
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
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${teacher.nip || '-'}`, rightSignX, y + 3.5, { align: 'center' });

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
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${teacher.nip || '-'}`, rightSignX, y + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  const safeMapel = mapel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Matriks_Presensi_${className}_${safeMapel}_${cleanSchool}.pdf`);
}

/**
 * 4. LAPORAN REKAPITULASI HASIL SUPERVISI & AUDIT KBM GURU (ADMIN KONTROLER)
 * Dokumen resmi ber-kop dan berlogo untuk arsip Kepala Sekolah dan Pengawas Pembina.
 */
export async function exportAdminSupervisionReportPDF(
  config: SchoolConfig,
  journals: TeachingJournal[],
  options?: {
    dateFilter?: string;
    teacherFilterName?: string;
    classFilter?: string;
    subjectFilter?: string;
    totalTeachersCount?: number;
    activeTeachersCount?: number;
  }
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  let y = 11;

  // Render School Logo in Kop Surat
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  const drawKopSurat = (isFirstPage: boolean) => {
    if (logoImg) {
      try {
        doc.addImage(logoImg as any, 'PNG', margin + 1, 9, 18, 18);
      } catch (e) {
        console.warn('Could not render logo to PDF:', e);
      }
    }

    const textCenterX = pageWidth / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(
      "PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI) KABUPATEN CIANJUR",
      textCenterX,
      y,
      { align: 'center' }
    );
    y += 4;
    doc.setFontSize(12);
    doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
    y += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `${config.alamat} | NPSN: ${config.npsn} | ${config.kontak}`,
      textCenterX,
      y,
      { align: 'center' }
    );
    y += 3.5;

    // Double border line
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 0.6, pageWidth - margin, y + 0.6);
    y += 5.5;

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      "LAPORAN HASIL SUPERVISI & AUDIT KEGIATAN BELAJAR MENGAJAR (KBM)",
      textCenterX,
      y,
      { align: 'center' }
    );
    y += 4;

    const filterDetail = [
      options?.dateFilter ? `Tanggal: ${options.dateFilter}` : 'Periode: Seluruh Data',
      options?.teacherFilterName && options.teacherFilterName !== 'ALL' ? `Guru: ${options.teacherFilterName}` : null,
      options?.classFilter && options.classFilter !== 'ALL' ? `Kelas: ${options.classFilter}` : null,
      options?.subjectFilter && options.subjectFilter !== 'ALL' ? `Mapel: ${options.subjectFilter}` : null,
    ].filter(Boolean).join('   |   ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(filterDetail || 'Seluruh Guru & Mata Pelajaran', textCenterX, y, { align: 'center' });
    y += 5;
  };

  drawKopSurat(true);

  // Table Columns Definition
  const cols = [
    { title: 'No', width: 8, align: 'center' },
    { title: 'Tanggal & Jam', width: 26, align: 'left' },
    { title: 'Guru Pengampu (NIP)', width: 44, align: 'left' },
    { title: 'Mapel', width: 28, align: 'left' },
    { title: 'Kelas', width: 13, align: 'center' },
    { title: 'P.Ke', width: 9, align: 'center' },
    { title: 'Materi Pokok & Kegiatan Pembelajaran', width: 88, align: 'left' },
    { title: 'H', width: 7, align: 'center' },
    { title: 'S', width: 7, align: 'center' },
    { title: 'I', width: 7, align: 'center' },
    { title: 'A', width: 7, align: 'center' },
    { title: 'Catatan / Refleksi', width: 29, align: 'left' },
  ];

  const totalTableWidth = cols.reduce((sum, c) => sum + c.width, 0);
  const tableStartX = margin;

  const drawTableHeader = () => {
    let currentX = tableStartX;
    const headerHeight = 7;

    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(tableStartX, y, totalTableWidth, headerHeight, 'F');
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    cols.forEach((col) => {
      doc.rect(currentX, y, col.width, headerHeight);
      const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 1.5;
      doc.text(col.title, textX, y + 4.6, { align: col.align as any });
      currentX += col.width;
    });

    y += headerHeight;
  };

  drawTableHeader();

  // Draw Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);

  journals.forEach((j, index) => {
    // Check page overflow
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 12;
      drawKopSurat(false);
      drawTableHeader();
    }

    const rowHeight = 8;
    let currentX = tableStartX;

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableStartX, y, totalTableWidth, rowHeight, 'F');
    }

    const teacherText = `${j.guruNama}${j.guruNip && j.guruNip !== '-' ? ` (${j.guruNip})` : ''}`;
    const dateJamText = `${j.tanggal}\n${j.jamPelajaran || '-'}`;
    const materiKegiatan = `${j.materiPokok}${j.kegiatanPembelajaran ? ` - ${j.kegiatanPembelajaran}` : ''}`;

    const rowData = [
      String(index + 1),
      j.tanggal,
      teacherText,
      j.mapel,
      j.kelas,
      String(j.pertemuanKe || 1),
      materiKegiatan,
      String(j.hadir ?? '-'),
      String(j.sakit ?? '-'),
      String(j.izin ?? '-'),
      String(j.alpa ?? '-'),
      j.catatanRefleksi || '-',
    ];

    cols.forEach((col, cIdx) => {
      doc.setDrawColor(203, 213, 225);
      doc.rect(currentX, y, col.width, rowHeight);
      const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 1.2;
      
      const rawText = rowData[cIdx];
      const truncated = doc.splitTextToSize(rawText, col.width - 2);
      doc.text(truncated[0] || '', textX, y + 5, { align: col.align as any });
      currentX += col.width;
    });

    y += rowHeight;
  });

  // Summary box
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 15;
  } else {
    y += 5;
  }

  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const leftSignX = margin + 35;
  const rightSignX = pageWidth - margin - 45;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  // Left Signature: Kepala Sekolah
  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 3.5, { align: 'center' });

  // Right Signature: Tim Supervisi / Kurikulum
  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Pengawas / Tim Supervisi Akademik,", rightSignX, y + 3.5, { align: 'center' });

  y += 18;

  // Headmaster Name & NIP
  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  // Supervisor Name & NIP
  doc.setFont('helvetica', 'bold');
  doc.text("Tim Pengembang Kurikulum", rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`SMP PGRI 1 CIKADU`, rightSignX, y + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  const dateTag = options?.dateFilter ? options.dateFilter : 'Semua';
  doc.save(`Laporan_Supervisi_KBM_${cleanSchool}_${dateTag}.pdf`);
}

/**
 * 5. SLIP BUKTI MENGAJAR GURU PENGGANTI / ASISTENSI PIKET (PDF A4 Portrait)
 * Berita acara resmi saat entri KBM dilakukan oleh petugas piket/admin atas nama guru.
 */
export async function exportAssistedTeachingSlipPDF(
  config: SchoolConfig,
  teacher: TeacherUser,
  journal: TeachingJournal,
  reason: string,
  officerName: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const pageWidth = 210;
  const margin = 15;
  let y = 14;

  // Render School Logo
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 12, 18, 18);
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  const textCenterX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    "PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI) KABUPATEN CIANJUR",
    textCenterX,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.setFontSize(12);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `${config.alamat} | NPSN: ${config.npsn} | ${config.kontak}`,
    textCenterX,
    y,
    { align: 'center' }
  );
  y += 3.5;

  // Double border
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.6, pageWidth - margin, y + 0.6);
  y += 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("BERITA ACARA & BUKTI PELAKSANAAN KBM (ASISTENSI PIKET)", textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Nomor: ${journal.id.slice(0, 8).toUpperCase()}/BA-KBM/${new Date().getFullYear()}`, textCenterX, y, { align: 'center' });
  y += 6;

  // Body Narrative
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    "Menerangkan bahwa kegiatan belajar mengajar (KBM) kelas tatap muka berikut telah tercatat dan terlaksana dengan rincian sebagai berikut:",
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 }
  );
  y += 7;

  // Information Table Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - margin * 2, 75, 'FD');

  let rowY = y + 6;
  const labelX = margin + 4;
  const valX = margin + 55;

  const infoRows = [
    ['Hari, Tanggal', `: ${journal.tanggal}`],
    ['Jam Pelajaran / Waktu', `: ${journal.jamPelajaran || 'Sesi Terjadwal'}`],
    ['Guru Mata Pelajaran', `: ${teacher.nama} (NIP/NUPTK: ${teacher.nip || '-'})`],
    ['Mata Pelajaran', `: ${journal.mapel}`],
    ['Kelas / Pertemuan Ke', `: Kelas ${journal.kelas} (Pertemuan Ke-${journal.pertemuanKe || 1})`],
    ['Alasan / Status Asistensi', `: ${reason}`],
    ['Petugas Entri / Piket', `: ${officerName}`],
    ['Materi Pokok', `: ${journal.materiPokok}`],
    ['Rekap Kehadiran Siswa', `: Hadir: ${journal.hadir} | Sakit: ${journal.sakit} | Izin: ${journal.izin} | Alfa: ${journal.alpa} (Total: ${journal.totalSiswa} Siswa)`],
  ];

  infoRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(lbl, labelX, rowY);
    doc.setFont('helvetica', 'normal');
    const splitVal = doc.splitTextToSize(val, pageWidth - margin * 2 - 60);
    doc.text(splitVal[0], valX, rowY);
    rowY += 7.2;
  });

  y += 82;

  // Learning Activities
  if (journal.kegiatanPembelajaran) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Uraian Kegiatan Pembelajaran / Instruksi Penugasan:", margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitKeg = doc.splitTextToSize(journal.kegiatanPembelajaran, pageWidth - margin * 2);
    doc.text(splitKeg, margin, y);
    y += splitKeg.length * 4 + 3;
  }

  // Teacher Note / Reflection
  if (journal.catatanRefleksi) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Catatan & Refleksi Kelas:", margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitRef = doc.splitTextToSize(journal.catatanRefleksi, pageWidth - margin * 2);
    doc.text(splitRef, margin, y);
    y += splitRef.length * 4 + 3;
  }

  // Signatures
  y = Math.max(y + 8, 225);

  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const leftSignX = margin + 25;
  const rightSignX = pageWidth - margin - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 4, { align: 'center' });

  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Petugas Piket / Guru Pengganti,", rightSignX, y + 4, { align: 'center' });

  y += 20;

  // Headmaster Name & NIP
  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 4, { align: 'center' });

  // Officer Name
  doc.setFont('helvetica', 'bold');
  doc.text(officerName, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Petugas Piket / Admin KBM`, rightSignX, y + 4, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  doc.save(`Berita_Acara_Asistensi_KBM_${journal.kelas}_${teacher.nama.replace(/\s+/g, '_')}_${cleanSchool}.pdf`);
}

/**
 * 6. INSTRUMEN & HASIL SUPERVISI AKADEMIK PEMBELAJARAN (PDF A4 Portrait)
 * Dokumen penilaian resmi supervisi kelas/KBM guru oleh Pengawas / Kepala Sekolah / Tim Supervisi.
 */
export async function exportAcademicSupervisionRubricPDF(
  config: SchoolConfig,
  teacher: TeacherUser,
  journal: TeachingJournal,
  supervisorName: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  let y = 14;

  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 12, 18, 18);
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  const textCenterX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    "PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI) KABUPATEN CIANJUR",
    textCenterX,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.setFontSize(12);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `${config.alamat} | NPSN: ${config.npsn} | ${config.kontak}`,
    textCenterX,
    y,
    { align: 'center' }
  );
  y += 3.5;

  // Double line
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.6, pageWidth - margin, y + 0.6);
  y += 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("INSTRUMEN & HASIL SUPERVISI AKADEMIK PEMBELAJARAN (KBM)", textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Tahun Pelajaran ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, textCenterX, y, { align: 'center' });
  y += 6;

  // Identity Table Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - margin * 2, 40, 'FD');

  let rowY = y + 5;
  const labelX = margin + 4;
  const valX = margin + 45;

  const identRows = [
    ['Nama Guru', `: ${teacher.nama} (NIP/NUPTK: ${teacher.nip || '-'})`],
    ['Mata Pelajaran / Kelas', `: ${journal.mapel} / Kelas ${journal.kelas}`],
    ['Hari, Tanggal / Waktu', `: ${journal.tanggal} (${journal.jamPelajaran || 'Sesi KBM'})`],
    ['Materi Pokok Pembelajaran', `: ${journal.materiPokok}`],
    ['Pertemuan Ke / Status', `: Pertemuan Ke-${journal.pertemuanKe || 1} | Status: ${journal.supervisionStatus === 'VERIFIED' ? 'TERVERIFIKASI' : 'TERCATAT'}`],
  ];

  identRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(lbl, labelX, rowY);
    doc.setFont('helvetica', 'normal');
    const splitVal = doc.splitTextToSize(val, pageWidth - margin * 2 - 50);
    doc.text(splitVal[0], valX, rowY);
    rowY += 6.5;
  });

  y += 46;

  // Rubric Scores Evaluation Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("A. PENILAIAN INDIKATOR KOMPETENSI PEMBELAJARAN", margin, y);
  y += 4;

  const rubric = journal.supervisionRubric || {
    mastery: 5,
    classroomMgmt: 5,
    pedagogy: 4,
    discipline: 5,
  };

  const scoreMastery = rubric.mastery || 5;
  const scoreClassroom = rubric.classroomMgmt || 5;
  const scorePedagogy = rubric.pedagogy || 4;
  const scoreDiscipline = rubric.discipline || 5;
  const totalScoreCalc = Math.round(((scoreMastery + scoreClassroom + scorePedagogy + scoreDiscipline) / 20) * 100);

  const rubricTable = [
    ['1', 'Penguasaan Materi Pokok & Kedalaman Konsep', 'Kesesuaian materi dengan silabus dan kejelasan penyampaian materi.', `${scoreMastery} / 5`],
    ['2', 'Pengelolaan Kelas & Partisipasi Aktif Siswa', 'Ketertiban siswa, interaktivitas, dan suasana belajar yang kondusif.', `${scoreClassroom} / 5`],
    ['3', 'Pendekatan / Media & Metode Pembelajaran', 'Pemanfaatan media ajar, teknologi, lembar kerja, atau metode aktif.', `${scorePedagogy} / 5`],
    ['4', 'Kedisiplinan Waktu & Administrasi Jurnal Presensi', 'Ketepatan waktu mengajar, kelengkapan catatan presensi dan refleksi.', `${scoreDiscipline} / 5`],
  ];

  // Draw Rubric Table
  const tableWidth = pageWidth - margin * 2;
  const colWidths = [10, 65, 80, 25];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, tableWidth, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  let curX = margin;
  const headers = ['No', 'Indikator Supervisi', 'Deskripsi / Uraian Pengamatan', 'Skor (1-5)'];
  headers.forEach((h, i) => {
    doc.text(h, i === 0 || i === 3 ? curX + colWidths[i] / 2 : curX + 2, y + 4.5, {
      align: i === 0 || i === 3 ? 'center' : 'left',
    });
    curX += colWidths[i];
  });

  y += 7;

  rubricTable.forEach((row) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, tableWidth, 9, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    let cellX = margin;
    row.forEach((cell, i) => {
      doc.setDrawColor(226, 232, 240);
      doc.rect(cellX, y, colWidths[i], 9);
      if (i === 1) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      const split = doc.splitTextToSize(cell, colWidths[i] - 3);
      doc.text(split[0] || '', i === 0 || i === 3 ? cellX + colWidths[i] / 2 : cellX + 2, y + 5.5, {
        align: i === 0 || i === 3 ? 'center' : 'left',
      });
      cellX += colWidths[i];
    });

    y += 9;
  });

  // Score Summary
  const predikat = totalScoreCalc >= 90 ? 'AMAT BAIK (A)' : totalScoreCalc >= 80 ? 'BAIK (B)' : totalScoreCalc >= 70 ? 'CUKUP (C)' : 'PERLU PEMBINAAN (D)';
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.rect(margin, y, tableWidth, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`NILAI AKHIR SUPERVISI: ${totalScoreCalc} / 100   |   PREDIKAT KUALITATIF: ${predikat}`, textCenterX, y + 5.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y += 13;

  // Catatan & Rekomendasi Pengawas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("B. CATATAN, REKOMENDASI & TINDAK LANJUT SUPERVISI", margin, y);
  y += 4;

  const notes = journal.supervisorNotes || "Pembelajaran berjalan secara interaktif, tertib, dan sesuai dengan target kompetensi dasar silabus. Disarankan untuk terus mempertahankan inovasi metode pengajaran.";
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, tableWidth, 22, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const splitNotes = doc.splitTextToSize(notes, tableWidth - 6);
  doc.text(splitNotes, margin + 3, y + 5);

  y += 28;

  // Signatures 3 Columns: Guru, Supervisor, Kepala Sekolah
  const signY = Math.max(y, 225);
  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const col1X = margin + 25;
  const col2X = textCenterX;
  const col3X = pageWidth - margin - 25;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.text("Guru Mata Pelajaran,", col1X, signY, { align: 'center' });
  doc.text("Mengetahui,", col2X, signY, { align: 'center' });
  doc.text("Kepala Sekolah,", col2X, signY + 3.5, { align: 'center' });
  doc.text(kotaDate, col3X, signY, { align: 'center' });
  doc.text("Pengawas / Tim Supervisi,", col3X, signY + 3.5, { align: 'center' });

  const nameY = signY + 20;

  // Teacher Name
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, col1X, nameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${teacher.nip || '-'}`, col1X, nameY + 3.5, { align: 'center' });

  // Headmaster Name
  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, col2X, nameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, col2X, nameY + 3.5, { align: 'center' });

  // Supervisor Name
  doc.setFont('helvetica', 'bold');
  doc.text(supervisorName, col3X, nameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Tim Kurikulum / Akademik`, col3X, nameY + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  doc.save(`Hasil_Supervisi_KBM_${teacher.nama.replace(/\s+/g, '_')}_${journal.kelas}_${cleanSchool}.pdf`);
}

/**
 * 7. MATRIKS REKAPITULASI TARGET KURIKULUM & KEMAJUAN KBM GURU (PDF A4 Landscape)
 */
export async function exportCurriculumTargetProgressPDF(
  config: SchoolConfig,
  teachers: TeacherUser[],
  journals: TeachingJournal[],
  targetMeetingsPerSemester = 18
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm
  });

  const pageWidth = 297;
  const pageHeight = 210;
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
      doc.addImage(logoImg as any, 'PNG', margin + 2, 10, 16, 16);
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  const textCenterX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    "PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI) KABUPATEN CIANJUR",
    textCenterX,
    y,
    { align: 'center' }
  );
  y += 4;
  doc.setFontSize(11);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `${config.alamat} | NPSN: ${config.npsn} | ${config.kontak}`,
    textCenterX,
    y,
    { align: 'center' }
  );
  y += 3.5;

  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 0.5, pageWidth - margin, y + 0.5);
  y += 5;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("MATRIKS KEMAJUAN KBM & PENCAPAIAN TARGET KURIKULUM SEMESTER", textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Standar Target: ${targetMeetingsPerSemester} Pertemuan Tatap Muka per Rombel / Semester`, textCenterX, y, { align: 'center' });
  y += 6;

  // Matrix Table Columns
  const cols = [
    { header: 'NO', width: 8, align: 'center' },
    { header: 'NAMA GURU PENGAMPU', width: 48, align: 'left' },
    { header: 'NIP/NUPTK', width: 25, align: 'center' },
    { header: 'MATA PELAJARAN', width: 35, align: 'left' },
    { header: 'KELAS DIAJAR', width: 32, align: 'left' },
    { header: 'SESI KBM TERLAKSANA', width: 28, align: 'center' },
    { header: 'TARGET', width: 16, align: 'center' },
    { header: 'PROGRES %', width: 24, align: 'center' },
    { header: 'RATA-RATA PRESENSI', width: 27, align: 'center' },
    { header: 'STATUS AUDIT', width: 30, align: 'center' },
  ];

  const tableStartX = margin;
  const totalTableWidth = cols.reduce((sum, c) => sum + c.width, 0);

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(tableStartX, y, totalTableWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);

  let curX = tableStartX;
  cols.forEach((col) => {
    const textX = col.align === 'center' ? curX + col.width / 2 : curX + 1.5;
    doc.text(col.header, textX, y + 4.5, { align: col.align as any });
    curX += col.width;
  });

  doc.setTextColor(0, 0, 0);
  y += 7;

  teachers.forEach((t, idx) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 15;
    }

    const tJournals = journals.filter((j) => j.guruId === t.id || j.guruNama === t.nama);
    const distinctClasses = Array.from(new Set(tJournals.map((j) => j.kelas))).sort();
    const totalMeetings = tJournals.length;
    const progressPercent = Math.min(100, Math.round((totalMeetings / targetMeetingsPerSemester) * 100));

    let avgPresensi = 0;
    if (tJournals.length > 0) {
      const sumHadir = tJournals.reduce((acc, curr) => acc + (curr.persentaseKehadiran || 100), 0);
      avgPresensi = Math.round(sumHadir / tJournals.length);
    }

    const auditStatus = progressPercent >= 80 ? 'Sesuai Target' : progressPercent >= 40 ? 'Sedang Berjalan' : 'Perlu Akselerasi';

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableStartX, y, totalTableWidth, 6.5, 'F');
    }

    const rowData = [
      String(idx + 1),
      t.nama,
      t.nip || '-',
      t.mapel,
      distinctClasses.length > 0 ? distinctClasses.join(', ') : 'Belum Ada',
      `${totalMeetings} Sesi`,
      `${targetMeetingsPerSemester}`,
      `${progressPercent}%`,
      avgPresensi > 0 ? `${avgPresensi}%` : '-',
      auditStatus,
    ];

    let rX = tableStartX;
    cols.forEach((col, cIdx) => {
      doc.setDrawColor(226, 232, 240);
      doc.rect(rX, y, col.width, 6.5);
      const textX = col.align === 'center' ? rX + col.width / 2 : rX + 1.5;
      doc.setFont('helvetica', cIdx === 1 ? 'bold' : 'normal');
      doc.setFontSize(6.5);
      const split = doc.splitTextToSize(rowData[cIdx], col.width - 2);
      doc.text(split[0] || '', textX, y + 4.2, { align: col.align as any });
      rX += col.width;
    });

    y += 6.5;
  });

  // Signatures
  y = Math.max(y + 8, pageHeight - 38);

  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const leftSignX = margin + 35;
  const rightSignX = pageWidth - margin - 45;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 3.5, { align: 'center' });

  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Wakil Kepala Sekolah Bid. Kurikulum,", rightSignX, y + 3.5, { align: 'center' });

  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text("Tim Pengembang Kurikulum", rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`SMP PGRI 1 CIKADU`, rightSignX, y + 3.5, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  doc.save(`Matriks_Progres_Kurikulum_${cleanSchool}.pdf`);
}



