'use client';

import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '../BrandLogo';
import { InstallAppBanner } from '../InstallAppBanner';
import { LogIn, Menu, X } from '../icons';
import styles from './SiteHeader.module.css';

const HEADER_LINKS = [
  { href: '/', label: 'Ana sayfa' },
  { href: '/topluluk', label: 'Topluluk' },
  { href: '/ozellikler', label: 'Nasıl çalışır?' },
  { href: '/yardim', label: 'Yardım' },
];

/** Bilgi sayfalarının ortak üst menüsü. */
export function SiteHeader({ action }: { action?: ReactNode }) {
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
    <InstallAppBanner />
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="tofutr.com ana sayfa">
          <BrandLogo height={52} priority />
        </Link>
        <button
          className={styles.menuToggle}
          type="button"
          aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <div
          id={menuId}
          className={`${styles.navigationGroup} ${menuOpen ? styles.navigationOpen : ''}`}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            setMenuOpen(false);
            (event.currentTarget.previousElementSibling as HTMLButtonElement | null)?.focus();
          }}
        >
          <nav className={styles.nav} aria-label="Ana menü">
            {HEADER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.headerActions}>
            {action ?? (
            <Link className={styles.btnSecondary} href="/giris">
              <LogIn size={17} aria-hidden="true" />
              <span>Giriş yap</span>
            </Link>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
