import type React from 'react';
import type { IconProps } from '../icons';
import { Shuffle, CheckSquare, Star, Send, TrendingUp, Users, Award, School, MessageSquare, Bell, User, Fish, BookOpen } from '../icons';

export type TeacherPageId =
  | 'home'
  | 'check_sheet'
  | 'class_tools'
  | 'plus_minus'
  | 'assignments'
  | 'reading'
  | 'grade_entry'
  | 'students'
  | 'leaderboard'
  | 'aquarium'
  | 'classes'
  | 'messages'
  | 'announcements'
  | 'profile';

export type TeacherPageGroup = 'Günlük işler' | 'Öğrenciler ve sınıflar' | 'İletişim' | 'Hesap';

export interface TeacherPageInfo {
  id: Exclude<TeacherPageId, 'home'>;
  /** Adres çubuğunda görünen ad: ?sayfa=odev-kontrol */
  slug: string;
  title: string;
  description: string;
  icon: React.FC<IconProps>;
  group: TeacherPageGroup;
}

export const TEACHER_PAGES: TeacherPageInfo[] = [
  { id: 'check_sheet', slug: 'odev-kontrol', title: 'Ödev kontrolü', description: 'Yaptı, kısmen, yapmadı işaretle', icon: CheckSquare, group: 'Günlük işler' },
  { id: 'plus_minus', slug: 'puan-ver', title: 'Puan ver', description: 'Artı ve eksi puan ekle', icon: Star, group: 'Günlük işler' },
  { id: 'class_tools', slug: 'sinif-araclari', title: 'Sınıf araçları', description: 'Rastgele seçici, grup, kronometre, geri sayım', icon: Shuffle, group: 'Günlük işler' },
  { id: 'assignments', slug: 'odev-gonder', title: 'Ödev gönder', description: 'Yeni ödev oluştur ve listele', icon: Send, group: 'Günlük işler' },
  { id: 'reading', slug: 'okuma-yarismasi', title: 'Okuma yarışması', description: '1 dakikada okunan kelime, sıralama, gelişim', icon: BookOpen, group: 'Günlük işler' },
  { id: 'students', slug: 'ogrenciler', title: 'Öğrenciler', description: 'Listele, ekle, düzenle, PIN', icon: Users, group: 'Öğrenciler ve sınıflar' },
  { id: 'leaderboard', slug: 'siralama', title: 'Puan sıralaması', description: 'Sınıfın başarı sırası', icon: Award, group: 'Öğrenciler ve sınıflar' },
  { id: 'aquarium', slug: 'akvaryum', title: 'Sınıf akvaryumu', description: 'Puanla büyüyen balıklar, tam ekran', icon: Fish, group: 'Öğrenciler ve sınıflar' },
  { id: 'grade_entry', slug: 'not-girisi', title: 'Not girişi', description: 'Yazılı ve sözlü notlar', icon: TrendingUp, group: 'Öğrenciler ve sınıflar' },
  { id: 'classes', slug: 'siniflar', title: 'Sınıflarım', description: 'Ders verdiğin sınıfları ekle ve çıkar', icon: School, group: 'Öğrenciler ve sınıflar' },
  { id: 'messages', slug: 'mesajlar', title: 'Mesajlar', description: 'Öğrencilerle birebir ve sınıf grubu', icon: MessageSquare, group: 'İletişim' },
  { id: 'announcements', slug: 'duyurular', title: 'Okul duyuruları', description: 'Okuldan gelen duyurular', icon: Bell, group: 'İletişim' },
  { id: 'profile', slug: 'profil', title: 'Profilim', description: 'Bilgilerim, şifre, çıkış', icon: User, group: 'Hesap' },
];

export const TEACHER_PAGE_GROUPS: TeacherPageGroup[] = ['Günlük işler', 'Öğrenciler ve sınıflar', 'İletişim', 'Hesap'];

export const getTeacherPage = (id: TeacherPageId) => TEACHER_PAGES.find((p) => p.id === id);

export const pageIdFromSlug = (slug: string | null): TeacherPageId =>
  TEACHER_PAGES.find((p) => p.slug === slug)?.id ?? 'home';

/** Sayfanın adresi: menü ve kartlar gerçek link olur (sağ tık / orta tık ile yeni sekmede açılabilir) */
export const teacherPageHref = (id: TeacherPageId) => {
  const slug = getTeacherPage(id)?.slug;
  return slug ? `/giris?sayfa=${slug}` : '/giris';
};

/** Düz sol tık mı? Ctrl/Cmd/Shift/orta tık ise tarayıcı linki kendisi (yeni sekmede) açar */
export const isPlainLeftClick = (e: React.MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
