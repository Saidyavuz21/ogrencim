import type React from 'react';
import type { IconProps } from '../icons';
import { FileText, TrendingUp, Star, Award, Fish, Sprout, MessageSquare, Bell, User, BookOpen, Folder, BarChart3, School } from '../icons';

export type StudentPageId = 'home' | 'odevler' | 'materyaller' | 'notlar' | 'okuma' | 'puanlar' | 'siralama' | 'akvaryum' | 'bahce' | 'gelisim' | 'mesajlar' | 'duyurular' | 'gruplar' | 'hesap';

export type StudentPageGroup = 'Derslerim' | 'Puanlarım' | 'İletişim' | 'Hesap';

export interface StudentPageInfo {
  id: Exclude<StudentPageId, 'home'>;
  title: string;
  description: string;
  icon: React.FC<IconProps>;
  group: StudentPageGroup;
}

/** Adres: /giris?sayfa=<id> (sayfa kimliği aynı zamanda adres adıdır) */
export const STUDENT_PAGES: StudentPageInfo[] = [
  { id: 'odevler', title: 'Ödevler', description: 'Verilen ödevler ve kontrol sonucu', icon: FileText, group: 'Derslerim' },
  { id: 'materyaller', title: 'Ders materyalleri', description: 'Öğretmenlerinin paylaştığı dosyalar', icon: Folder, group: 'Derslerim' },
  { id: 'notlar', title: 'Notlar', description: 'Yazılı, sözlü ve performans', icon: TrendingUp, group: 'Derslerim' },
  { id: 'okuma', title: 'Okuma yarışması', description: 'Okuma hızın, sıran ve gelişimin', icon: BookOpen, group: 'Derslerim' },
  { id: 'puanlar', title: 'Puanlarım', description: 'Artı ve eksi puan geçmişi', icon: Star, group: 'Puanlarım' },
  { id: 'siralama', title: 'Sınıf sıralaması', description: 'Sınıftaki puan sıran', icon: Award, group: 'Puanlarım' },
  { id: 'akvaryum', title: 'Sınıf akvaryumu', description: 'Puanla büyüyen balığın', icon: Fish, group: 'Puanlarım' },
  { id: 'bahce', title: 'Bahçem', description: 'Sulayarak büyüttüğün ağaçların', icon: Sprout, group: 'Puanlarım' },
  { id: 'gelisim', title: 'Gelişimim', description: 'Puan ve notlarının zaman içindeki değişimi', icon: BarChart3, group: 'Puanlarım' },
  { id: 'mesajlar', title: 'Mesajlar', description: 'Öğretmenlerine yaz, sınıf grubunu oku', icon: MessageSquare, group: 'İletişim' },
  { id: 'duyurular', title: 'Duyurular', description: 'Okuldan gelen duyurular', icon: Bell, group: 'İletişim' },
  { id: 'gruplar', title: 'Sınıflarım', description: 'Şuben, gruplarım, kodla katıl', icon: School, group: 'Hesap' },
  { id: 'hesap', title: 'Hesabım', description: 'Bilgilerim ve çıkış', icon: User, group: 'Hesap' },
];

export const STUDENT_PAGE_GROUPS: StudentPageGroup[] = ['Derslerim', 'Puanlarım', 'İletişim', 'Hesap'];

export const getStudentPage = (id: StudentPageId) => STUDENT_PAGES.find((p) => p.id === id);

export const studentPageIdFromSlug = (slug: string | null): StudentPageId =>
  STUDENT_PAGES.find((p) => p.id === slug)?.id ?? 'home';

export const studentPageSlug = (id: StudentPageId) => (id === 'home' ? undefined : id);

export const studentPageHref = (id: StudentPageId) => (id === 'home' ? '/giris' : `/giris?sayfa=${id}`);
