'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LayoutDashboard, ChevronLeft, ChevronRight } from '../icons';
import { TEACHER_PAGE_GROUPS, TeacherPageId, teacherPageHref, isPlainLeftClick, visibleTeacherPages } from './teacherPages';
import type { TeacherClass } from '../../data/portalData';
import styles from './TeacherDashboard.module.css';

interface TeacherSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  open: boolean;
  currentPage: TeacherPageId;
  badges: Partial<Record<TeacherPageId, number>>;
  onClose: () => void;
  onOpenPage: (page: TeacherPageId) => void;
  /** Sınıfa bağlı sayfalarda menünün üstünde sınıf seçimi gösterilir */
  classes?: TeacherClass[];
  selectedClass?: string;
  onSelectClass?: (value: string) => void;
  /** Okul yöneticisi sayfaları da gösterilir */
  isSchoolAdmin?: boolean;
}

/** Soldan açılan menü: tüm öğretmen sayfalarında kullanılır */
export function TeacherSidebar({ collapsed, onToggleCollapsed, open, currentPage, badges, onClose, onOpenPage, classes, selectedClass, onSelectClass, isSchoolAdmin }: TeacherSidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Geniş ekranda menü sabit sütundur; dar ekranda çekmece gibi açılır
  const [wide, setWide] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const showTooltip = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    if (!wide || !collapsed) return;
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-sidebar-tooltip]');
    if (!item) { setTooltip(null); return; }
    const rect = item.getBoundingClientRect();
    setTooltip({ text: item.dataset.sidebarTooltip || '', x: rect.right + 12, y: Math.max(24, Math.min(window.innerHeight - 24, rect.top + rect.height / 2)) });
  };
  useEffect(() => {
    const dismiss = () => setTooltip(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
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
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="Öğretmen menüsü" aria-hidden={wide ? undefined : !open} inert={wide ? undefined : !open} onMouseOver={showTooltip} onMouseLeave={() => setTooltip(null)} onFocus={showTooltip} onBlur={() => setTooltip(null)} onClick={() => setTooltip(null)}>
        <div className={styles.sidebarHead}>
          <span className={styles.sidebarTitle}>Menü</span>
          <button ref={closeRef} type="button" className={styles.sidebarClose} onClick={onClose} aria-label="Menüyü kapat">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav id="teacher-sidebar-nav" className={styles.sidebarNav} aria-label="Çalışma bölümleri">
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
          <a href={teacherPageHref('home')} className={styles.sidebarItem} data-sidebar-tooltip="Ana sayfa" title={wide && collapsed ? undefined : 'Ana sayfa'} aria-label="Ana sayfa" aria-current={currentPage === 'home' ? 'page' : undefined} onClick={go('home')}>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span>Ana sayfa</span>
          </a>
          {TEACHER_PAGE_GROUPS.filter((group) => visibleTeacherPages(isSchoolAdmin).some((p) => p.group === group)).map((group) => (
            <div key={group} className={`${styles.sidebarGroup} ${visibleTeacherPages(isSchoolAdmin).filter((p) => p.group === group).every((p) => ['messages', 'announcements', 'profile'].includes(p.id)) ? styles.sidebarHeaderGroup : ''}`}>
              <h2>{group}</h2>
              {visibleTeacherPages(isSchoolAdmin).filter((p) => p.group === group).map((p) => {
                const badge = badges[p.id] || 0;
                return (
                  <a key={p.id} href={teacherPageHref(p.id)} className={`${styles.sidebarItem} ${p.id === 'messages' ? styles.sidebarMobileMessage : ''}`} data-sidebar-tooltip={p.title} title={wide && collapsed ? undefined : p.title} aria-label={badge > 0 ? `${p.title}, ${badge} bekleyen` : p.title} aria-current={currentPage === p.id ? 'page' : undefined} onClick={go(p.id)}>
                    <p.icon size={20} aria-hidden="true" />
                    <span>{p.title}</span>
                    {badge > 0 && <span className={styles.sidebarBadge} aria-label={`${badge} bekleyen`}>{badge > 99 ? '99+' : badge}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.sidebarCollapse} onClick={onToggleCollapsed} aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'} aria-expanded={!collapsed} aria-controls="teacher-sidebar-nav" title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}>
            {collapsed ? <ChevronRight size={19} aria-hidden="true" /> : <ChevronLeft size={19} aria-hidden="true" />}
            <span>{collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}</span>
          </button>
        </div>
      </aside>
      {wide && collapsed && tooltip && createPortal(
        <div className={styles.sidebarTooltip} role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>,
        document.body
      )}
    </>
  );
}

