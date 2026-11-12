import type React from 'react';
import type { IconProps } from '../icons';
import { Shuffle, CheckSquare, Star, Send, TrendingUp, Users, Award, School, MessageSquare, Bell, User, Fish, BookOpen, Folder, HelpCircle, BarChart3, Building, Layers, Globe, ShieldCheck, Trophy } from '../icons';

export type TeacherPageId =
  | 'home'
  | 'check_sheet'
  | 'questions'
  | 'class_tools'
  | 'plus_minus'
  | 'assignments'
  | 'reading'
  | 'quiz_show'
  | 'grade_entry'
  | 'files'
  | 'class_report'
  | 'school_admin'
  | 'boards'
  | 'community'
  | 'students'
  | 'consent'
  | 'leaderboard'
  | 'aquarium'
  | 'classes'
  | 'messages'
  | 'announcements'
  | 'profile';

export type TeacherPageGroup = 'Ödevler' | 'Puan ve ödül' | 'Ders ve değerlendirme' | 'Öğrenciler ve sınıflar' | 'Okul yönetimi' | 'İletişim' | 'Hesap';

export interface TeacherPageInfo {
  id: Exclude<TeacherPageId, 'home'>;
  /** Adres çubuğunda görünen ad: ?sayfa=odev-kontrol */
  slug: string;
  title: string;
  description: string;
  icon: React.FC<IconProps>;
  group: TeacherPageGroup;
  /** Yalnızca okul yöneticisine görünür */
  schoolAdminOnly?: boolean;
}

export const TEACHER_PAGES: TeacherPageInfo[] = [
  { id: 'assignments', slug: 'odev-gonder', title: 'Ödev gönder', description: 'Yeni ödev oluştur ve listele', icon: Send, group: 'Ödevler' },
  { id: 'check_sheet', slug: 'odev-kontrol', title: 'Ödev kontrolü', description: 'Yaptı, kısmen, yapmadı işaretle', icon: CheckSquare, group: 'Ödevler' },
  { id: 'questions', slug: 'soru-bankasi', title: 'Soru bankası', description: 'Quiz soruları: yaz, düzenle, süz', icon: HelpCircle, group: 'Ödevler' },
  { id: 'files', slug: 'dosyalarim', title: 'Dosyalarım', description: 'Yükle, klasörle, etiketle, sınıfla paylaş', icon: Folder, group: 'Ödevler' },
  { id: 'plus_minus', slug: 'puan-ver', title: 'Puan ver', description: 'Artı ve eksi puan ekle', icon: Star, group: 'Puan ve ödül' },
  { id: 'leaderboard', slug: 'siralama', title: 'Puan sıralaması', description: 'Sınıfın başarı sırası', icon: Award, group: 'Puan ve ödül' },
  { id: 'aquarium', slug: 'akvaryum', title: 'Sınıf akvaryumu', description: 'Puanla büyüyen balıklar, tam ekran', icon: Fish, group: 'Puan ve ödül' },
  { id: 'class_tools', slug: 'sinif-araclari', title: 'Sınıf araçları', description: 'Rastgele seçici, grup, kronometre, geri sayım', icon: Shuffle, group: 'Ders ve değerlendirme' },
  { id: 'reading', slug: 'okuma-yarismasi', title: 'Okuma yarışması', description: '1 dakikada okunan kelime, sıralama, gelişim', icon: BookOpen, group: 'Ders ve değerlendirme' },
  { id: 'quiz_show', slug: 'bilgi-yarismasi', title: 'Bilgi yarışması', description: 'Takımlı yarışma: soru bankasından sorular, skor, sonuçlar', icon: Trophy, group: 'Ders ve değerlendirme' },
  { id: 'grade_entry', slug: 'not-girisi', title: 'Not girişi', description: 'Yazılı ve sözlü notlar', icon: TrendingUp, group: 'Ders ve değerlendirme' },
  { id: 'boards', slug: 'tahtalarim', title: 'Tahtalarım', description: 'Etkileşimli tahta: çiz, sun, ödev olarak gönder', icon: Layers, group: 'Ders ve değerlendirme' },
  { id: 'community', slug: 'topluluk', title: 'Topluluk', description: 'Öğretmenlerin paylaştığı tahta ve soru setleri', icon: Globe, group: 'Ders ve değerlendirme' },
  { id: 'students', slug: 'ogrenciler', title: 'Öğrenciler', description: 'Listele, ekle, düzenle, PIN', icon: Users, group: 'Öğrenciler ve sınıflar' },
  { id: 'consent', slug: 'veli-onayi', title: 'Veli onayları', description: 'İmzalı KVKK onay formunu işaretle', icon: ShieldCheck, group: 'Öğrenciler ve sınıflar' },
  { id: 'class_report', slug: 'sinif-karnesi', title: 'Sınıf karnesi', description: 'Not ortalamaları, dağılım, öğrenci gelişimi', icon: BarChart3, group: 'Öğrenciler ve sınıflar' },
  { id: 'classes', slug: 'siniflar', title: 'Sınıflarım', description: 'Ders verdiğin sınıfları ekle ve çıkar', icon: School, group: 'Öğrenciler ve sınıflar' },
  { id: 'school_admin', slug: 'okul-yonetimi', title: 'Okul yönetimi', description: 'Öğretmen onayı, bütün sınıflar, kampüsler', icon: Building, group: 'Okul yönetimi', schoolAdminOnly: true },
  { id: 'messages', slug: 'mesajlar', title: 'Mesajlar', description: 'Öğrencilerle birebir ve sınıf grubu', icon: MessageSquare, group: 'İletişim' },
  { id: 'announcements', slug: 'duyurular', title: 'Okul duyuruları', description: 'Okuldan gelen duyurular', icon: Bell, group: 'İletişim' },
  { id: 'profile', slug: 'profil', title: 'Profilim', description: 'Bilgilerim, şifre, çıkış', icon: User, group: 'Hesap' },
];

export const TEACHER_PAGE_GROUPS: TeacherPageGroup[] = ['Ödevler', 'Puan ve ödül', 'Ders ve değerlendirme', 'Öğrenciler ve sınıflar', 'Okul yönetimi', 'İletişim', 'Hesap'];

/** Kullanıcının göreceği sayfalar (okul yöneticisi sayfaları yalnızca yöneticiye) */
export const visibleTeacherPages = (isSchoolAdmin?: boolean) => TEACHER_PAGES.filter((p) => !p.schoolAdminOnly || isSchoolAdmin);

export const getTeacherPage = (id: TeacherPageId) => TEACHER_PAGES.find((p) => p.id === id);

/** Eski adresler (yer imleri bozulmasın) */
const SLUG_ALIASES: Record<string, string> = { kesfet: 'topluluk' };

export const pageIdFromSlug = (slug: string | null): TeacherPageId => {
  const s = slug ? SLUG_ALIASES[slug] ?? slug : slug;
  return TEACHER_PAGES.find((p) => p.slug === s)?.id ?? 'home';
};

/** Sayfanın adresi: menü ve kartlar gerçek link olur (sağ tık / orta tık ile yeni sekmede açılabilir) */
export const teacherPageHref = (id: TeacherPageId) => {
  const slug = getTeacherPage(id)?.slug;
  return slug ? `/giris?sayfa=${slug}` : '/giris';
};

/** Düz sol tık mı? Ctrl/Cmd/Shift/orta tık ise tarayıcı linki kendisi (yeni sekmede) açar */
export const isPlainLeftClick = (e: React.MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
