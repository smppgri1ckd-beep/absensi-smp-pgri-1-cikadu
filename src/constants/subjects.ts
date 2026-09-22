/**
 * Daftar Resmi Mata Pelajaran SMP PGRI 1 Cikadu
 */
export const OFFICIAL_SUBJECTS = [
  'Pendidikan Agama Islam dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Informatika',
  'Ilmu Pengetahuan Alam',
  'Ilmu Pengetahuan Sosial',
  'Bahasa Sunda',
  'Bahasa Indonesia',
  'Bimbingan Konseling',
  'Bahasa Inggris',
  'Pendidikan Jasmani Olahraga dan Kesehatan',
  'Seni Tari',
  'Seni Musik',
  'Seni Teater',
  'Matematika',
] as const;

export type OfficialSubject = (typeof OFFICIAL_SUBJECTS)[number];
