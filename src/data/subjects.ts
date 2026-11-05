// ========================================================
// DERS KATEGORİLERİ (MEB haftalık ders çizelgelerine göre, sınıf seviyesine bağlı)
// Ödev gönderirken seçilen sınıfın seviyesine göre ders listesi gösterilir.
// ========================================================
import { parseClassName } from './portalData';

const PRESCHOOL = ['Türkçe dil etkinliği', 'Matematik etkinliği', 'Fen etkinliği', 'Sanat etkinliği', 'Müzik etkinliği', 'Oyun ve hareket'];

const PRIMARY_ARTS = ['Görsel Sanatlar', 'Müzik', 'Beden Eğitimi ve Oyun'];
const MIDDLE_ARTS = ['Görsel Sanatlar', 'Müzik', 'Beden Eğitimi ve Spor'];

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  Anaokulu: PRESCHOOL,
  Anasınıfı: PRESCHOOL,
  '1': ['Türkçe', 'Matematik', 'Hayat Bilgisi', ...PRIMARY_ARTS],
  '2': ['Türkçe', 'Matematik', 'Hayat Bilgisi', 'İngilizce', ...PRIMARY_ARTS],
  '3': ['Türkçe', 'Matematik', 'Hayat Bilgisi', 'Fen Bilimleri', 'İngilizce', ...PRIMARY_ARTS],
  '4': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'İnsan Hakları, Yurttaşlık ve Demokrasi', ...PRIMARY_ARTS],
  '5': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'Bilişim Teknolojileri ve Yazılım', ...MIDDLE_ARTS],
  '6': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'Bilişim Teknolojileri ve Yazılım', ...MIDDLE_ARTS],
  '7': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'Teknoloji ve Tasarım', ...MIDDLE_ARTS],
  '8': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'T.C. İnkılap Tarihi ve Atatürkçülük', 'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'Teknoloji ve Tasarım', ...MIDDLE_ARTS],
  Hazırlık: ['İngilizce', 'Almanca', 'Türk Dili ve Edebiyatı'],
};

const HIGH_SCHOOL = [
  'Türk Dili ve Edebiyatı', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe',
  'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'Beden Eğitimi ve Spor', 'Görsel Sanatlar', 'Müzik',
];

/** Seçilen sınıfın seviyesine uygun dersler (bilinmeyen seviyede tüm kademelerin birleşimi) */
export function subjectsForClass(className: string): string[] {
  const { level } = parseClassName(className);
  if (SUBJECTS_BY_LEVEL[level]) return SUBJECTS_BY_LEVEL[level];
  if (['9', '10', '11', '12'].includes(level)) {
    return level === '12' ? [...HIGH_SCHOOL, 'T.C. İnkılap Tarihi ve Atatürkçülük'] : HIGH_SCHOOL;
  }
  return Array.from(new Set([...SUBJECTS_BY_LEVEL['4'], ...SUBJECTS_BY_LEVEL['8'], ...HIGH_SCHOOL]));
}

/** Branş öğretmeninin varsayılan dersi (sınıf öğretmeni, okul öncesi vb. için yok → listeden seçer) */
export function branchSubject(branch: string | undefined, className: string): string {
  if (!branch) return '';
  const options = subjectsForClass(className);
  if (options.includes(branch)) return branch;
  if (branch === 'Beden Eğitimi ve Spor' && options.includes('Beden Eğitimi ve Oyun')) return 'Beden Eğitimi ve Oyun';
  if (branch.startsWith('Bilişim') && options.includes('Bilişim Teknolojileri ve Yazılım')) return 'Bilişim Teknolojileri ve Yazılım';
  return '';
}

// Ders renkleri: listelerde ve kartlarda dersi tek bakışta ayırt etmek için
const SUBJECT_HUES: Record<string, number> = {
  Türkçe: 4,
  'Türk Dili ve Edebiyatı': 4,
  Matematik: 218,
  'Hayat Bilgisi': 140,
  'Fen Bilimleri': 168,
  Fizik: 200,
  Kimya: 280,
  Biyoloji: 120,
  'Sosyal Bilgiler': 32,
  Tarih: 24,
  Coğrafya: 90,
  'T.C. İnkılap Tarihi ve Atatürkçülük': 352,
  İngilizce: 258,
  Almanca: 300,
  'Din Kültürü ve Ahlak Bilgisi': 48,
  'Görsel Sanatlar': 322,
  Müzik: 270,
  'Beden Eğitimi ve Oyun': 150,
  'Beden Eğitimi ve Spor': 150,
  'Bilişim Teknolojileri ve Yazılım': 190,
  'Teknoloji ve Tasarım': 210,
};

export function subjectHue(subject: string): number {
  if (subject in SUBJECT_HUES) return SUBJECT_HUES[subject];
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) % 360;
  return h;
}

/** Kutucuk için kısa ad (uzun MEB adları kısaltılır) */
export function subjectShortLabel(subject: string): string {
  const short: Record<string, string> = {
    'Din Kültürü ve Ahlak Bilgisi': 'Din Kültürü',
    'İnsan Hakları, Yurttaşlık ve Demokrasi': 'İnsan Hakları',
    'Bilişim Teknolojileri ve Yazılım': 'Bilişim',
    'T.C. İnkılap Tarihi ve Atatürkçülük': 'İnkılap Tarihi',
    'Beden Eğitimi ve Oyun': 'Beden Eğitimi',
    'Beden Eğitimi ve Spor': 'Beden Eğitimi',
    'Türk Dili ve Edebiyatı': 'Edebiyat',
    'Teknoloji ve Tasarım': 'Tek. ve Tasarım',
  };
  return short[subject] || subject;
}
