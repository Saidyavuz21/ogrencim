import type { Metadata } from 'next';
import { PortalApp } from '../../components/PortalApp';

// Arama motorlarında listelenmesin. Not: gerçek güvenlik veritabanındaki yetki kurallarıyla (RLS) sağlanır;
// bu sayfanın ayrı olması yalnızca yönetim girişini herkesin önüne koymamak içindir.
export const metadata: Metadata = {
  title: 'e-Okul Yönetim',
  robots: { index: false, follow: false },
};

// Süper admin girişi
export default function YonetimPage() {
  return <PortalApp variant="admin" />;
}
