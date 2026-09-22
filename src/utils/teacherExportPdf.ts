import { jsPDF } from 'jspdf';
import { Student, AttendanceRecord, SchoolConfig, TeacherUser, AttendanceCategory } from '../types';
import { getSchoolLogoImage } from './imageLoader';

export interface TeacherDailyPdfOptions {
  kategori?: AttendanceCategory;
  mapel?: string;
  pertemuanKe?: number;
  materiPokok?: string;
}

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
  const pertemuan = options?.pertemuanKe;
  const materi = options?.materiPokok;

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
  y += 7;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleText = isKelas
    ? "LAPORAN PRESENSI KEGIATAN BELAJAR MENGAJAR (KBM KELAS)"
    : "LAPORAN HARIAN PRESENSI SISWA (APEL SEKOLAH)";
  doc.text(titleText, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const subTitle = isKelas
    ? `Kelas: ${className}  |  Mapel: ${displayMapel}  |  Pertemuan Ke: ${pertemuan || 1}  |  Tanggal: ${dateStr}`
    : `Kelas / Rombel: ${className}   |   Sesi: ${session === 'Pagi' ? 'Apel Pagi' : 'Apel Siang'}   |   Tanggal: ${dateStr}`;
  doc.text(subTitle, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Info Block (Guru Pengajar)
  doc.setFontSize(8);
  doc.text(`Guru Pengajar: ${teacher.nama} (${displayMapel})`, margin, y);
  doc.text(`NIP: ${teacher.nip || '-'}`, margin, y + 4);
  if (isKelas && materi) {
    doc.text(`Materi Pokok / Pembahasan: ${materi}`, margin, y + 8);
    y += 4;
  }

  // Filter attendance for date and session (and matching mapel if KELAS)
  const dateSessionRecords = attendance.filter((a) => {
    if (a.tanggal !== dateStr) return false;
    if (isKelas) {
      if (a.kategori === 'KELAS') {
        return (
          (!a.mapel || a.mapel === displayMapel) &&
          (a.pertemuanKe === undefined || a.pertemuanKe === (pertemuan || 1))
        );
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

  doc.text(`Tingkat Kehadiran: ${persen}% (${totalHadirSemua} dari ${totalSiswa} Siswa)`, pageWidth - margin, y, { align: 'right' });
  doc.text(`Hadir: ${hadir} | Terlambat: ${terlambat} | Izin: ${izin} | Sakit: ${sakit} | Alpa: ${alpa}`, pageWidth - margin, y + 4, { align: 'right' });
  y += 8;

  // Table header
  const cols = [
    { title: "No", width: 10, align: 'center' as const },
    { title: "NISN", width: 28, align: 'center' as const },
    { title: "Nama Lengkap Siswa", width: 70, align: 'left' as const },
    { title: "L/P", width: 12, align: 'center' as const },
    { title: "Waktu", width: 22, align: 'center' as const },
    { title: "Status Kehadiran", width: 44, align: 'center' as const },
  ];

  const tableStartX = margin;
  let currentX = tableStartX;

  // Draw Header Row
  doc.setFillColor(241, 245, 249);
  doc.rect(tableStartX, y, pageWidth - (margin * 2), 7, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  cols.forEach((col) => {
    doc.rect(currentX, y, col.width, 7);
    const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
    doc.text(col.title, textX, y + 4.8, { align: col.align });
    currentX += col.width;
  });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  sortedStudents.forEach((siswa, index) => {
    // Check if new page is needed
    if (y > 255) {
      doc.addPage();
      y = 15;
    }

    const rec = recMap.get(siswa.nisn);
    const waktuText = rec?.waktu ? `${rec.waktu} WIB` : '-';
    const statusText = rec ? rec.status : 'Alpa (Belum Hadir)';

    currentX = tableStartX;
    const rowHeight = 5.8;

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
      doc.text(rowData[cIdx], textX, y + 4.1, { align: col.align });
      currentX += col.width;
    });

    y += rowHeight;
  });

  // Signatures Section
  if (y > 240) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }

  const leftSignX = margin + 25;
  const rightSignX = pageWidth - margin - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Left Signature (Headmaster)
  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 4, { align: 'center' });

  // Right Signature (Teacher)
  const kotaDate = `${config.kota || 'Cianjur'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Guru Mata Pelajaran / Wali Kelas,", rightSignX, y + 4, { align: 'center' });

  y += 20;

  // Headmaster Name
  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${config.nipKepsek || '-'}`, leftSignX, y + 4, { align: 'center' });

  // Teacher Name
  doc.setFont('helvetica', 'bold');
  doc.text(teacher.nama, rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${teacher.nip || '-'}`, rightSignX, y + 4, { align: 'center' });

  const cleanSchool = config.namaSekolah.replace(/\s+/g, '_');
  doc.save(`Laporan_Presensi_${className}_${dateStr}_${cleanSchool}.pdf`);
}
