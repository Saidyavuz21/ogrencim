import type { Metadata } from 'next';
import { PublicCommunityPage } from '../../components/community/PublicCommunityPage';

export const metadata: Metadata = {
  title: 'Öğretmen Topluluğu · tofutr.com',
  description:
    'Öğretmenlerin hazırlayıp paylaştığı etkileşimli ders tahtaları ve soru setlerini keşfedin · tofutr.com',
};

export default function ToplulukPage() {
  return <PublicCommunityPage />;
}

