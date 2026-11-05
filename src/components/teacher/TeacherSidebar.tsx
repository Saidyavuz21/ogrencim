'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, LayoutDashboard } from '../icons';
import { TEACHER_PAGES, TEACHER_PAGE_GROUPS, TeacherPageId, teacherPageHref, isPlainLeftClick } from './teacherPages';
import type { TeacherClass } from '../../data/portalData';
import styles from './TeacherDashboard.module.css';

interface TeacherSidebarProps {
  open: boolean;
  currentPage: TeacherPageId;
  badges: Partial<Record<TeacherPageId, number>>;
  onClose: () => void;
  onOpenPage: (page: TeacherPageId) => void;
  /** Sınıfa bağlı sayfalarda menünün üstünde sınıf seçimi gösterilir */
  classes?: TeacherClass[];
  selectedClass?: string;
  onSelectClass?: (value: string) => void;
}

/** Soldan açılan menü: tüm öğretmen sayfalarında kullanılır */
export function TeacherSidebar({ open, currentPage, badges, onClose, onOpenPage, classes, selectedClass, onSelectClass }: TeacherSidebarProps) {
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

  // Düz tıklamada sayfa yenilenmeden geçilir; değiştirici tuşlu tıklamada tarayıcı yeni sekme açar
  const go = (page: TeacherPageId) => (e: React.MouseEvent) => {
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    onOpenPage(page);
    onClose();
  };

  return (
    <>
      <div className={`${styles.sidebarBackdrop} ${drawerOpen ? styles.sidebarBackdropOpen : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="Öğretmen menüsü" aria-hidden={wide ? undefined : !open} inert={wide ? undefined : !open}>
        <div className={styles.sidebarHead}>
          <span className={styles.sidebarTitle}>Menü</span>
          <button ref={closeRef} type="button" className={styles.sidebarClose} onClick={onClose} aria-label="Menüyü kapat">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav className={styles.sidebarNav}>
          {classes && onSelectClass && (
            <div className={styles.sidebarClasses} role="group" aria-labelledby="sidebar-class-label">
              <h2 id="sidebar-class-label">Sınıf</h2>
              <div className={styles.sidebarClassChips}>
                {classes.length === 0 && <span className={styles.sidebarEmpty}>Henüz sınıf eklenmedi</span>}
                {classes.map((cls) => (
                  <button key={cls.id} type="button" className={styles.sidebarClassChip} aria-pressed={cls.name === selectedClass} onClick={() => { onSelectClass(cls.name); onClose(); }}>
                    {cls.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <a href={teacherPageHref('home')} className={styles.sidebarItem} aria-current={currentPage === 'home' ? 'page' : undefined} onClick={go('home')}>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span>Ana sayfa</span>
          </a>
          {TEACHER_PAGE_GROUPS.map((group) => (
            <div key={group} className={styles.sidebarGroup}>
              <h2>{group}</h2>
              {TEACHER_PAGES.filter((p) => p.group === group).map((p) => {
                const badge = badges[p.id] || 0;
                return (
                  <a key={p.id} href={teacherPageHref(p.id)} className={styles.sidebarItem} aria-current={currentPage === p.id ? 'page' : undefined} onClick={go(p.id)}>
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

