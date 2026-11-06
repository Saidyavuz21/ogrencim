'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Menu, User, LayoutDashboard, ArrowLeft } from '../icons';
import { BrandLogo } from '../BrandLogo';
import type { UserAccount } from '../../data/portalData';
import { ADMIN_PAGES, ADMIN_PAGE_GROUPS, AdminPageId, AdminPageInfo, adminPageHref } from './adminPages';
import { isPlainLeftClick } from '../teacher/teacherPages';
import styles from '../teacher/TeacherDashboard.module.css';
import adminStyles from './AdminDashboard.module.css';

// ---------------- Üst çubuk ----------------
export function AdminTopBar({ user, menuOpen, isAccount, onMenu, onHome, onAccount }: {
  user?: UserAccount;
  menuOpen: boolean;
  isAccount: boolean;
  onMenu: () => void;
  onHome: () => void;
  onAccount: () => void;
}) {
  return (
    <header className={styles.topBar}>
      <nav className={styles.topBarContainer} aria-label="Yönetim üst menüsü">
        <div className={styles.topBarLeft}>
          <button type="button" className={styles.menuButton} onClick={onMenu} aria-label="Menüyü aç" aria-expanded={menuOpen}>
            <Menu size={24} aria-hidden="true" />
          </button>
          <button type="button" className={styles.topBarLogo} onClick={onHome} aria-label="Yönetim ana sayfasına dön">
            <BrandLogo height={36} />
          </button>
          <span className={adminStyles.roleBadge}>Süper Admin</span>
        </div>
        <div className={styles.topBarActions}>
          <button type="button" className={styles.topBarProfile} onClick={onAccount} aria-label={user?.name ? `${user.name}, hesabım` : 'Hesabım'} aria-current={isAccount ? 'page' : undefined}>
            <span className={styles.accountAvatar} aria-hidden="true"><User size={22} /></span>
            <span className={styles.topBarProfileText}>{user?.name || 'Hesabım'}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

// ---------------- Sol menü ----------------
export function AdminSidebar({ open, currentPage, badges, onClose, onOpenPage }: {
  open: boolean;
  currentPage: AdminPageId;
  badges: Partial<Record<AdminPageId, number>>;
  onClose: () => void;
  onOpenPage: (page: AdminPageId) => void;
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

  const go = (page: AdminPageId) => (e: React.MouseEvent) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    onOpenPage(page);
    onClose();
  };

  return (
    <>
      <div className={`${styles.sidebarBackdrop} ${drawerOpen ? styles.sidebarBackdropOpen : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="Yönetim menüsü" aria-hidden={wide ? undefined : !open} inert={wide ? undefined : !open}>
        <div className={styles.sidebarHead}>
          <span className={styles.sidebarTitle}>Menü</span>
          <button ref={closeRef} type="button" className={styles.sidebarClose} onClick={onClose} aria-label="Menüyü kapat">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav className={styles.sidebarNav}>
          <a href={adminPageHref('home')} className={styles.sidebarItem} aria-current={currentPage === 'home' ? 'page' : undefined} onClick={go('home')}>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span>Genel bakış</span>
          </a>
          {ADMIN_PAGE_GROUPS.map((group) => (
            <div key={group} className={styles.sidebarGroup}>
              <h2>{group}</h2>
              {ADMIN_PAGES.filter((p) => p.group === group).map((p) => {
                const badge = badges[p.id] || 0;
                return (
                  <a key={p.id} href={adminPageHref(p.id)} className={styles.sidebarItem} aria-current={currentPage === p.id ? 'page' : undefined} onClick={go(p.id)}>
                    <p.icon size={20} aria-hidden="true" />
                    <span>{p.title}</span>
                    {badge > 0 && <span className={styles.sidebarBadge} aria-label={`${badge} bekleyen`}>{badge > 99 ? '99+' : badge}</span>}
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

// ---------------- Alt sayfa başlığı ----------------
export function AdminPageHeader({ page, onBack }: { page: AdminPageInfo; onBack: () => void }) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderRow}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          <span>Genel bakış</span>
        </button>
      </div>
      <div className={styles.pageTitleRow}>
        <span className={styles.pageCardIcon}><page.icon size={22} aria-hidden="true" /></span>
        <div className={styles.pageTitleText}>
          <h1>{page.title}</h1>
          <p className={adminStyles.pageDescription}>{page.description}</p>
        </div>
      </div>
    </header>
  );
}
