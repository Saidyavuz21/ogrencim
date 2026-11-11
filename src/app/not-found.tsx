import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../components/site/SitePage';
import styles from '../components/site/Site.module.css';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı · tofutr.com',
};

export default function NotFound() {
  return (
    <SitePage
      title="Sayfa bulunamadı"
      lead="Aradığınız sayfa taşınmış veya kaldırılmış olabilir. Adresi kontrol edebilir ya da aşağıdaki bağlantılardan devam edebilirsiniz."
    >
      <div className={styles.actions}>
        <Link className={styles.btnPrimary} href="/">Ana sayfaya dön</Link>
        <Link className={styles.btnSecondary} href="/yardim">Yardım</Link>
      </div>
    </SitePage>
  );
}
