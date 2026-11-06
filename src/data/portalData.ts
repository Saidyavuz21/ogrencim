export interface Student {
  id: string;
  name: string;
  studentNo: string;
  class: string;
  school: string;
  teacher: string;
  avatar: string;
  gpa: number;
  rank: number;
  totalStudents: number;
  parentName: string;
  term: string;
  attendance: {
    totalDays: number;
    attendedDays: number;
    absentDays: number;
    lateDays: number;
  };
  homeworkSummary: {
    total: number;
    completed: number;
    pending: number;
    late: number;
  };
}

export type UserRole = 'ogretmen' | 'ogrenci' | 'admin';

export interface UserAccount {
  id: string;
  role: UserRole;
  name: string;
  emailOrPhone: string;
  studentNo?: string;
  studentName?: string;
  pin?: string; // Öğrenci için 4 haneli PIN
  password?: string;
  branch?: string;
  city?: string;
  district?: string;
  schoolName?: string;
  className?: string;
  avatar: string;
  title: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  grade: string;
  branch: string;
  room: string;
  studentCount: number;
  capacity: number;
  averageScore: number;
  joinCode: string;
  description: string;
  createdAt: string;
  isHomeroom?: boolean;
}

export interface TeacherProfile {
  id: string;
  name: string;
  branch: string;
  classes: string[];
  homeroomClass: string;
  email: string;
  avatar: string;
}

/** Oturum yokken gösterilen boş öğretmen şablonu (örnek veri değil) */
export const CURRENT_TEACHER: TeacherProfile = {
  id: '',
  name: 'Kayıtlı Öğretmen Yok',
  branch: 'Branş Atanmadı',
  classes: [],
  homeroomClass: 'Yok',
  email: '',
  avatar: 'ÖĞ',
};

// ========================================================
// OKUL KADEMELERİ, SINIF SEVİYELERİ, ŞUBELER VE BRANŞLAR (MEB)
// Kayıt, öğrenci ekleme ve öğretmen düzenleme ekranlarında ortak kullanılır.
// ========================================================
export const CLASS_LEVEL_GROUPS: { label: string; levels: string[] }[] = [
  { label: 'Okul öncesi', levels: ['Anaokulu', 'Anasınıfı'] },
  { label: 'İlkokul', levels: ['1', '2', '3', '4'] },
  { label: 'Ortaokul', levels: ['5', '6', '7', '8'] },
  { label: 'Lise', levels: ['Hazırlık', '9', '10', '11', '12'] },
];

// Türk alfabesinin 29 harfi (e-Okul şube adlandırmasıyla uyumlu)
export const CLASS_SECTIONS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L',
  'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z',
];

/** Seviye listesinde gösterilecek ad: '3' → '3. sınıf' */
export const classLevelLabel = (level: string) => (/^\d+$/.test(level) ? `${level}. sınıf` : level);

/** Seviye + şube → kayıtlı sınıf adı: ('3','A') → '3-A', ('Anasınıfı','B') → 'Anasınıfı-B' */
export const composeClassName = (level: string, section: string) =>
  level ? (section ? `${level}-${section}` : level) : '';

/** Kayıtlı sınıf adını seviye ve şubeye ayırır: '3-A' → { level: '3', section: 'A' } */
export const parseClassName = (className?: string | null) => {
  const [level = '', section = ''] = (className || '').split('-');
  const knownLevel = CLASS_LEVEL_GROUPS.some((g) => g.levels.includes(level));
  return knownLevel ? { level, section: CLASS_SECTIONS.includes(section) ? section : '' } : { level: '', section: '' };
};

// MEB branşları (okul öncesi → ilkokul → ortaokul → lise)
export const TEACHER_BRANCH_OPTIONS = [
  'Okul Öncesi (Anaokulu)',
  'Sınıf Öğretmenliği',
  'Türkçe',
  'Matematik',
  'Fen Bilimleri',
  'Sosyal Bilgiler',
  'İngilizce',
  'Almanca',
  'Arapça',
  'Din Kültürü ve Ahlak Bilgisi',
  'Bilişim Teknolojileri ve Yazılım',
  'Teknoloji ve Tasarım',
  'Görsel Sanatlar',
  'Müzik',
  'Beden Eğitimi ve Spor',
  'Rehberlik ve Psikolojik Danışmanlık',
  'Özel Eğitim',
  'Türk Dili ve Edebiyatı',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Diğer',
];


// Türkiye: 81 il ve 973 ilçe (src/data/turkeyCities.ts)
export { TURKEY_CITIES } from './turkeyCities';
