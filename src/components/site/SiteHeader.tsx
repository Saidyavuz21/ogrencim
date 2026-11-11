'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '../BrandLogo';
import { LogIn, Menu, UserPlus, X } from '../icons';
import { SITE_NAV } from './siteLinks';
import styles from './Site.module.css';

/** Bilgi sayfalarının ortak üst menüsü. */
export function SiteHeader() {
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="tofutr.com ana sayfa">
          <BrandLogo height={52} priority />
          <span className={styles.brandDescription}>Okulunla aynı yerde.</span>
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
            {SITE_NAV.map((item) => (
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
            <Link className={styles.btnSecondary} href="/giris">
              <LogIn size={17} aria-hidden="true" />
              <span>Giriş yap</span>
            </Link>
            <Link className={styles.btnPrimary} href="/giris#kayit">
              <UserPlus size={17} aria-hidden="true" />
              <span>Ücretsiz kayıt ol</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
