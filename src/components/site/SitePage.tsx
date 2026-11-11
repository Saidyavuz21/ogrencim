import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import styles from './Site.module.css';

interface SitePageProps {
  title: string;
  lead?: ReactNode;
  /** Geniş yerleşim (özellik listeleri); varsayılan okuma genişliğidir. */
  wide?: boolean;
  children: ReactNode;
}

/** Herkese açık bilgi sayfalarının ortak kabuğu: üst menü, başlık, içerik, alt bilgi. */
export function SitePage({ title, lead, wide, children }: SitePageProps) {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={`${styles.main} ${wide ? styles.wide : ''}`}>
        <header className={styles.pageHeader}>
          <h1>{title}</h1>
          {lead && <p className={styles.lead}>{lead}</p>}
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
