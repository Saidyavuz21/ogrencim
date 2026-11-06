import type React from 'react';
import type { IconProps } from '../icons';
import { UserCheck, Building, Users, GraduationCap, School, Bell, User, FileCheck2 } from '../icons';

export type AdminPageId =
  | 'home'
  | 'teacher_requests'
  | 'school_requests'
  | 'teachers'
  | 'students'
  | 'schools'
  | 'classes'
  | 'announcements'
  | 'account';

export type AdminPageGroup = 'Onaylar' | 'Kullanıcılar' | 'Okul' | 'İletişim' | 'Hesap';

export interface AdminPageInfo {
  id: Exclude<AdminPageId, 'home'>;
  /** Adres çubuğunda görünen ad: /yonetim?sayfa=basvurular */
  slug: string;
  title: string;
  description: string;
  icon: React.FC<IconProps>;
  group: AdminPageGroup;
}

export const ADMIN_PAGES: AdminPageInfo[] = [
  { id: 'teacher_requests', slug: 'basvurular', title: 'Öğretmen başvuruları', description: 'Belgeyi incele, onayla veya reddet', icon: UserCheck, group: 'Onaylar' },
  { id: 'school_requests', slug: 'okul-basvurulari', title: 'Okul başvuruları', description: 'Yeni okulları onayla veya birleştir', icon: FileCheck2, group: 'Onaylar' },
  { id: 'teachers', slug: 'ogretmenler', title: 'Öğretmenler', description: 'Ara, düzenle, pasife al, sil', icon: Users, group: 'Kullanıcılar' },
  { id: 'students', slug: 'ogrenciler', title: 'Öğrenciler', description: 'Ekle, PIN yenile, sil', icon: GraduationCap, group: 'Kullanıcılar' },
  { id: 'schools', slug: 'okullar', title: 'Okullar', description: 'Okul listesi ve toplu okul ekleme', icon: Building, group: 'Okul' },
  { id: 'classes', slug: 'siniflar', title: 'Sınıflar', description: 'Okullara göre sınıflar ve rehber öğretmenler', icon: School, group: 'Okul' },
  { id: 'announcements', slug: 'duyurular', title: 'Duyurular', description: 'Duyuru yayınla ve kaldır', icon: Bell, group: 'İletişim' },
  { id: 'account', slug: 'hesabim', title: 'Hesabım', description: 'Bilgilerim, şifre, çıkış', icon: User, group: 'Hesap' },
];

export const ADMIN_PAGE_GROUPS: AdminPageGroup[] = ['Onaylar', 'Kullanıcılar', 'Okul', 'İletişim', 'Hesap'];

export const getAdminPage = (id: AdminPageId) => ADMIN_PAGES.find((p) => p.id === id);

export const adminPageIdFromSlug = (slug: string | null): AdminPageId =>
  ADMIN_PAGES.find((p) => p.slug === slug)?.id ?? 'home';

export const adminPageHref = (id: AdminPageId) => {
  const slug = getAdminPage(id)?.slug;
  return slug ? `/yonetim?sayfa=${slug}` : '/yonetim';
};
