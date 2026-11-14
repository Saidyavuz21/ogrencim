'use client';

/**
 * Admin ve öğrenci panellerinin ortak kabuğu: üst çubuk, sol menü (geniş ekranda sabit, dar ekranda çekmece)
 * ve alt sayfa başlığı. Görünüm öğretmen panelinin stillerini kullanır; üç panel aynı görünür.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Menu, User, Bell, LayoutDashboard, ArrowLeft, ChevronRight } from '../icons';
import type { IconProps } from '../icons';
import { BrandLogo } from '../BrandLogo';
import { isPlainLeftClick } from '../teacher/teacherPages';
import styles from '../teacher/TeacherDashboard.module.css';
import shellStyles from './PortalShell.module.css';

export interface ShellPage<Id extends string, Group extends string> {
  id: Id;
  title: string;
  description: string;
  icon: React.FC<IconProps>;
  group: Group;
}

// ---------------- Üst çubuk ----------------
export function PortalTopBar({ label, userName, roleBadge, menuOpen, isProfile, profileLabel = 'Hesabım', bell, onMenu, onHome, onProfile }: {
  /** Erişilebilirlik adı: "Öğrenci üst menüsü" */
  label: string;
  userName?: string;
  roleBadge?: string;
  menuOpen: boolean;
  isProfile: boolean;
  profileLabel?: string;
  bell?: { count: number; onClick: () => void; label: string };
  onMenu: () => void;
  onHome: () => void;
  onProfile: () => void;
}) {
  return (
    <header className={styles.topBar}>
      <nav className={styles.topBarContainer} aria-label={label}>
        <div className={styles.topBarLeft}>
          <button type="button" className={styles.menuButton} onClick={onMenu} aria-label="Menüyü aç" aria-expanded={menuOpen}>
            <Menu size={24} aria-hidden="true" />
          </button>
          <button type="button" className={styles.topBarLogo} onClick={onHome} aria-label="Ana sayfaya dön">
            <BrandLogo height={36} />
          </button>
          {roleBadge && <span className={shellStyles.roleBadge}>{roleBadge}</span>}
        </div>
        <div className={styles.topBarActions}>
          {bell && (
            <button type="button" className={styles.notificationButton} onClick={bell.onClick} aria-label={bell.count > 0 ? `${bell.label}, ${bell.count} yeni` : bell.label}>
              <Bell size={22} aria-hidden="true" />
              {bell.count > 0 && <span className={styles.notificationCount} aria-hidden="true">{bell.count > 99 ? '99+' : bell.count}</span>}
            </button>
          )}
          <button type="button" className={styles.topBarProfile} onClick={onProfile} aria-label={userName ? `${userName}, ${profileLabel.toLocaleLowerCase('tr-TR')}` : profileLabel} aria-current={isProfile ? 'page' : undefined}>
            <span className={styles.accountAvatar} aria-hidden="true"><User size={22} /></span>
            <span className={styles.topBarProfileText}>{userName || profileLabel}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

// ---------------- Sol menü ----------------
export function PortalSidebar<Id extends string, Group extends string>({
  label, homeLabel, pages, groups, open, currentPage, homeId, badges, hrefFor, onClose, onOpenPage,
}: {
  label: string;
  homeLabel: string;
  pages: ShellPage<Id, Group>[];
  groups: Group[];
  open: boolean;
  currentPage: Id;
  homeId: Id;
  badges: Partial<Record<Id, number>>;
  hrefFor: (id: Id) => string;
  onClose: () => void;
  onOpenPage: (page: Id) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Geniş ekranda menü sabit sütundur; dar ekranda çekmece gibi açılır
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const drawerOpen = open && !wide;

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, onClose]);

  const go = (page: Id) => (e: React.MouseEvent) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    onOpenPage(page);
    onClose();
  };

  return (
    <>
      <div className={`${styles.sidebarBackdrop} ${drawerOpen ? styles.sidebarBackdropOpen : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`${styles.sidebar} ${styles.portalSidebar} ${open ? styles.sidebarOpen : ''}`} aria-label={label} aria-hidden={wide ? undefined : !open} inert={wide ? undefined : !open}>
        <div className={styles.sidebarHead}>
          <span className={styles.sidebarTitle}>Menü</span>
          <button ref={closeRef} type="button" className={styles.sidebarClose} onClick={onClose} aria-label="Menüyü kapat">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav className={styles.sidebarNav}>
          <a href={hrefFor(homeId)} className={styles.sidebarItem} aria-current={currentPage === homeId ? 'page' : undefined} onClick={go(homeId)}>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span>{homeLabel}</span>
          </a>
          {groups.map((group) => (
            <div key={group} className={styles.sidebarGroup}>
              <h2>{group}</h2>
              {pages.filter((p) => p.group === group).map((p) => {
                const badge = badges[p.id] || 0;
                return (
                  <a key={p.id} href={hrefFor(p.id)} className={styles.sidebarItem} aria-current={currentPage === p.id ? 'page' : undefined} onClick={go(p.id)}>
                    <p.icon size={20} aria-hidden="true" />
                    <span>{p.title}</span>
                    {badge > 0 && <span className={styles.sidebarBadge} aria-label={`${badge} yeni`}>{badge > 99 ? '99+' : badge}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

// ---------------- Ana sayfa kartları ----------------
export function PortalPageCards<Id extends string, Group extends string>({ pages, groups, badges, hrefFor, onOpenPage, idPrefix }: {
  pages: ShellPage<Id, Group>[];
  groups: Group[];
  badges: Partial<Record<Id, number>>;
  hrefFor: (id: Id) => string;
  onOpenPage: (page: Id) => void;
  idPrefix: string;
}) {
  return (
    <>
      {groups.map((group) => {
        const groupPages = pages.filter((p) => p.group === group);
        const headingId = `${idPrefix}-group-${group.replace(/\s+/g, '-')}`;
        return (
          <section key={group} className={styles.cardGroup} aria-labelledby={headingId}>
            <h2 id={headingId}>{group}</h2>
            <div className={styles.cardGrid}>
              {groupPages.map((page) => {
                const badge = badges[page.id] || 0;
                return (
                  <a
                    key={page.id}
                    href={hrefFor(page.id)}
                    className={styles.pageCard}
                    onClick={(e) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenPage(page.id); }}
                  >
                    <span className={styles.pageCardIcon}><page.icon size={22} aria-hidden="true" /></span>
                    <span className={styles.pageCardText}>
                      <span className={styles.pageCardTitle}>{page.title}</span>
                      <span className={styles.pageCardDesc}>{page.description}</span>
                    </span>
                    {badge > 0 && <span className={styles.pageCardBadge} aria-label={`${badge} yeni`}>{badge > 99 ? '99+' : badge}</span>}
                    <ChevronRight size={18} className={styles.pageCardArrow} aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

// ---------------- Alt sayfa başlığı ----------------
export function PortalPageHeader({ icon: Icon, title, description, backLabel, onBack, aside }: {
  icon: React.FC<IconProps>;
  title: string;
  description?: string;
  backLabel: string;
  onBack: () => void;
  aside?: React.ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderRow}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          <span>{backLabel}</span>
        </button>
      </div>
      <div className={styles.pageTitleRow}>
        <span className={styles.pageCardIcon}><Icon size={22} aria-hidden="true" /></span>
        <div className={styles.pageTitleText}>
          <h1>{title}</h1>
          {description && <p className={shellStyles.pageDescription}>{description}</p>}
        </div>
        {aside}
      </div>
    </header>
  );
}

// ---------------- Sayfa yönlendirme (?sayfa=...) ----------------
/**
 * Adres çubuğundaki ?sayfa= ile çalışan sayfa durumu; tarayıcının ve telefonun geri tuşu desteklenir.
 * idFromSlug ve slugOf modül düzeyinde tanımlı (sabit) fonksiyonlar olmalıdır.
 */
export function usePageRoute<Id extends string>(idFromSlug: (slug: string | null) => Id, slugOf: (id: Id) => string | undefined) {
  const [page, setPage] = useState<Id>(() => idFromSlug(typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('sayfa')));

  useEffect(() => {
    const sync = () => setPage(idFromSlug(new URLSearchParams(window.location.search).get('sayfa')));
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [idFromSlug]);

  const openPage = (next: Id) => {
    setPage(next);
    const url = new URL(window.location.href);
    const slug = slugOf(next);
    if (slug) url.searchParams.set('sayfa', slug);
    else url.searchParams.delete('sayfa');
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    window.scrollTo({ top: 0 });
  };

  /** Çıkışta adresteki ?sayfa= temizlenir; sonraki giriş ana sayfadan başlar */
  const clearRoute = () => window.history.replaceState(null, '', window.location.pathname);

  return { page, openPage, clearRoute };
}

// ---------------- Sohbet kutusu yüksekliği ----------------
/**
 * Masaüstü sohbet kutusunu pencerenin altına kadar uzatır (üstteki başlıklar ne kadar yer kaplarsa kaplasın).
 * Değer --split-height değişkenine yazılır; CSS en az/en çok sınırı uygular.
 */
export function useFitToViewport(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty('--split-height', `${Math.max(420, window.innerHeight - top - 32)}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => {
      window.removeEventListener('resize', fit);
      ro.disconnect();
    };
  }, [ref]);
}
