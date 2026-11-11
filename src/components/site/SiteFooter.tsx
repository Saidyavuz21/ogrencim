import Link from 'next/link';
import { SITE_FOOTER_GROUPS } from './siteLinks';
import styles from './SiteFooter.module.css';

/** Herkese açık sayfaların ortak alt bilgisi. */
export function SiteFooter({ tagline = 'Birlikte öğrenir, birlikte gelişiriz.' }: { tagline?: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav className={styles.groups} aria-label="Site bağlantıları">
          {SITE_FOOTER_GROUPS.map((group) => (
            <div key={group.title} className={styles.group}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className={styles.note}>tofutr.com · {tagline}</p>
      </div>
    </footer>
  );
}
