import type React from 'react';
import type { IconProps } from '../icons';
import { UserCheck, Building, Users, GraduationCap, School, Bell, User, FileCheck2, Library, RotateCcw, ShieldCheck, FileText, Globe, Flag } from '../icons';

export type AdminPageId =
  | 'home'
  | 'teacher_requests'
  | 'school_requests'
  | 'teachers'
  | 'students'
  | 'schools'
  | 'classes'
  | 'announcements'
  | 'library'
  | 'community'
  | 'community_reports'
  | 'trash'
  | 'logs'
  | 'privacy'
  | 'account';

export type AdminPageGroup = 'Onaylar' | 'Kullanıcılar' | 'Okul' | 'İçerik' | 'İletişim' | 'Güvenlik' | 'Hesap';

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
  { id: 'library', slug: 'kutuphane', title: 'Ortak kütüphane', description: 'Bütün öğretmenlerin kullanacağı görsel ve belgeler', icon: Library, group: 'İçerik' },
  { id: 'community', slug: 'topluluk', title: 'Topluluk', description: 'Paylaşılan içerikler: editörün seçimi, gizleme', icon: Globe, group: 'İçerik' },
  { id: 'community_reports', slug: 'topluluk-sikayetleri', title: 'Topluluk şikâyetleri', description: 'Şikâyet edilen gönderi, yorum ve profiller', icon: Flag, group: 'İçerik' },
  { id: 'announcements', slug: 'duyurular', title: 'Duyurular', description: 'Duyuru yayınla ve kaldır', icon: Bell, group: 'İletişim' },
  { id: 'privacy', slug: 'kvkk', title: 'KVKK ve veli rızası', description: 'Veli talepleri, veri indirme, kalıcı silme, rıza kaydı', icon: ShieldCheck, group: 'Güvenlik' },
  { id: 'trash', slug: 'silinenler', title: 'Silinenler', description: 'Silinen öğrencileri 30 gün içinde geri al', icon: RotateCcw, group: 'Güvenlik' },
  { id: 'logs', slug: 'kayitlar', title: 'İşlem ve erişim kaydı', description: 'Kim, ne zaman, neyi değiştirdi veya görüntüledi', icon: FileText, group: 'Güvenlik' },
  { id: 'account', slug: 'hesabim', title: 'Hesabım', description: 'Bilgilerim, şifre, çıkış', icon: User, group: 'Hesap' },
];

export const ADMIN_PAGE_GROUPS: AdminPageGroup[] = ['Onaylar', 'Kullanıcılar', 'Okul', 'İçerik', 'İletişim', 'Güvenlik', 'Hesap'];

export const getAdminPage = (id: AdminPageId) => ADMIN_PAGES.find((p) => p.id === id);

export const adminPageIdFromSlug = (slug: string | null): AdminPageId =>
  ADMIN_PAGES.find((p) => p.slug === slug)?.id ?? 'home';

export const adminPageHref = (id: AdminPageId) => {
  const slug = getAdminPage(id)?.slug;
  return slug ? `/yonetim?sayfa=${slug}` : '/yonetim';
};
