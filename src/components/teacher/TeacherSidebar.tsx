'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Home, ChevronLeft, ChevronRight, Folder, Award, BookOpen, Users, Building, Globe, Shuffle, MessageSquare, User, LogOut } from '../icons';
import type { IconProps } from '../icons';
import { TEACHER_PAGE_GROUPS, TeacherPageGroup, TeacherPageId, teacherPageHref, isPlainLeftClick, visibleTeacherPages } from './teacherPages';
import { teacherGroupToneVars, teacherPageToneVars, teacherToneVars } from './teacherColors';
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
  /** Çıkış işlemi */
  onLogout?: () => void;
}

const GROUP_ICON: Partial<Record<TeacherPageGroup, React.FC<IconProps>>> = {
  'Ödevler': Folder,
  'Puan ve ödül': Award,
  'Ders ve değerlendirme': BookOpen,
  'Öğrenciler ve sınıflar': Users,
  'Okul yönetimi': Building,
  'İletişim': MessageSquare,
};

const GROUP_SHORT_LABEL: Partial<Record<TeacherPageGroup, string>> = {
  'Ödevler': 'Ödevler',
  'Puan ve ödül': 'Puan',
  'Ders ve değerlendirme': 'Ders',
  'Öğrenciler ve sınıflar': 'Sınıf',
  'Okul yönetimi': 'Okul',
  'İletişim': 'İletişim',
};

/** Soldan açılan menü: tüm öğretmen sayfalarında kullanılır */
export function TeacherSidebar({ collapsed, onToggleCollapsed, open, currentPage, badges, onClose, onOpenPage, classes, selectedClass, onSelectClass, isSchoolAdmin, onLogout }: TeacherSidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  // Geniş ekranda menü sabit sütundur; dar ekranda çekmece gibi açılır
  const [wide, setWide] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [openFlyout, setOpenFlyout] = useState<{ group: TeacherPageGroup; left: number; top: number; connectorTop: number } | null>(null);
  const visiblePages = visibleTeacherPages(isSchoolAdmin);
  const activeGroup = visiblePages.find((p) => p.id === currentPage)?.group;
  const showTooltip = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    if (!wide) return;
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-sidebar-tooltip]');
    if (!item) { setTooltip(null); return; }
    const rect = item.getBoundingClientRect();
    setTooltip({ text: item.dataset.sidebarTooltip || '', x: rect.right + 12, y: Math.max(24, Math.min(window.innerHeight - 24, rect.top + rect.height / 2)) });
  };
  useEffect(() => {
    const dismiss = () => {
      setTooltip(null);
      setOpenFlyout(null);
    };
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
    if (!openFlyout) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (flyoutRef.current?.contains(target) || asideRef.current?.contains(target)) return;
      setOpenFlyout(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openFlyout]);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      setWide(mq.matches);
      if (!mq.matches) setOpenFlyout(null);
    };
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
    setOpenFlyout(null);
    onOpenPage(page);
    onClose();
  };

  const toggleFlyout = (group: TeacherPageGroup, btn: HTMLButtonElement) => {
    setTooltip(null);
    if (openFlyout?.group === group) {
      setOpenFlyout(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const estHeight = Math.min(360, 56 + visiblePages.filter((p) => p.group === group).length * 46);
    const top = Math.max(16, Math.min(window.innerHeight - estHeight - 16, rect.top - 10));
    const connectorTop = Math.max(18, Math.min(estHeight - 28, rect.top + rect.height / 2 - top - 8));
    setOpenFlyout({ group, left: rect.right + 14, top, connectorTop });
  };

  const desktopGroups = TEACHER_PAGE_GROUPS.filter((group) => {
    const groupPages = visiblePages.filter((p) => p.group === group);
    return groupPages.length > 0 && !groupPages.every((p) => ['messages', 'announcements', 'profile'].includes(p.id));
  });

  return (
    <>
      <div className={`${styles.sidebarBackdrop} ${drawerOpen ? styles.sidebarBackdropOpen : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={asideRef} className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="Öğretmen menüsü" aria-hidden={wide ? undefined : !open} inert={wide ? undefined : !open} onMouseOver={showTooltip} onMouseLeave={() => setTooltip(null)} onFocus={showTooltip} onBlur={() => setTooltip(null)}>
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
          {wide ? (
            <>
              <div className={styles.sidebarRailCard}>
                <a href={teacherPageHref('home')} className={styles.sidebarItem} style={teacherPageToneVars('home')} data-sidebar-tooltip="Ana sayfa" aria-label="Ana sayfa" aria-current={currentPage === 'home' ? 'page' : undefined} onClick={go('home')}>
                  <span className={styles.sidebarItemIcon} aria-hidden="true"><Home size={22} /></span>
                  <span>Ana sayfa</span>
                </a>
              </div>
              <div className={styles.sidebarRailCard}>
                <div className={styles.sidebarRailGroups}>
                  {desktopGroups.map((group) => {
                    const groupPages = visiblePages.filter((p) => p.group === group);
                    const GroupIcon = GROUP_ICON[group] || Folder;
                    const isActive = activeGroup === group;
                    const isFlyoutOpen = openFlyout?.group === group;
                    const groupBadge = groupPages.reduce((sum, p) => sum + (badges[p.id] || 0), 0);
                    return (
                      <button
                        key={group}
                        type="button"
                        className={styles.sidebarRailBtn}
                        style={teacherGroupToneVars(group)}
                        data-active={isActive ? 'true' : undefined}
                        aria-expanded={isFlyoutOpen}
                        aria-haspopup="true"
                        aria-label={groupBadge > 0 ? `${group}, ${groupBadge} bekleyen` : group}
                        data-sidebar-tooltip={isFlyoutOpen ? undefined : group}
                        onClick={(e) => toggleFlyout(group, e.currentTarget)}
                      >
                        <span className={styles.sidebarItemIcon} aria-hidden="true"><GroupIcon size={22} /></span>
                        <span className={styles.sidebarRailLabel}>{GROUP_SHORT_LABEL[group] || group}</span>
                        {groupBadge > 0 && <span className={styles.sidebarRailBadge} aria-hidden="true">{groupBadge > 99 ? '99+' : groupBadge}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={styles.sidebarRailCard}>
                <a
                  href={teacherPageHref('community')}
                  className={styles.sidebarItem}
                  style={teacherPageToneVars('community')}
                  data-sidebar-tooltip="Topluluk"
                  aria-label={(badges.community || 0) > 0 ? `Topluluk, ${badges.community} okunmamış` : 'Topluluk'}
                  aria-current={currentPage === 'community' ? 'page' : undefined}
                  onClick={go('community')}
                >
                  <span className={styles.sidebarItemIcon} aria-hidden="true"><Globe size={22} /></span>
                  <span>Topluluk</span>
                  {(badges.community || 0) > 0 && (
                    <span className={styles.sidebarRailBadge} aria-hidden="true">
                      {(badges.community || 0) > 99 ? '99+' : badges.community}
                    </span>
                  )}
                </a>
                <a
                  href={teacherPageHref('class_tools')}
                  className={styles.sidebarItem}
                  style={teacherPageToneVars('class_tools')}
                  data-sidebar-tooltip="Sınıf araçlarım"
                  aria-label="Sınıf araçlarım"
                  aria-current={currentPage === 'class_tools' ? 'page' : undefined}
                  onClick={go('class_tools')}
                >
                  <span className={styles.sidebarItemIcon} aria-hidden="true"><Shuffle size={22} /></span>
                  <span>Araçlar</span>
                </a>
              </div>
              <div className={styles.sidebarRailCard}>
                <button
                  type="button"
                  className={styles.sidebarRailBtn}
                  style={teacherGroupToneVars('İletişim')}
                  data-active={activeGroup === 'İletişim' ? 'true' : undefined}
                  aria-expanded={openFlyout?.group === 'İletişim'}
                  aria-haspopup="true"
                  aria-label={(badges.messages || 0) > 0 ? `İletişim, ${badges.messages} okunmamış` : 'İletişim'}
                  data-sidebar-tooltip={openFlyout?.group === 'İletişim' ? undefined : 'İletişim'}
                  onClick={(e) => toggleFlyout('İletişim', e.currentTarget)}
                >
                  <span className={styles.sidebarItemIcon} aria-hidden="true"><MessageSquare size={22} /></span>
                  <span className={styles.sidebarRailLabel}>İletişim</span>
                  {(badges.messages || 0) > 0 && (
                    <span className={styles.sidebarRailBadge} aria-hidden="true">
                      {(badges.messages || 0) > 99 ? '99+' : badges.messages}
                    </span>
                  )}
                </button>
                <a
                  href={teacherPageHref('profile')}
                  className={styles.sidebarItem}
                  style={teacherPageToneVars('profile')}
                  data-sidebar-tooltip="Profilim"
                  aria-label="Profilim"
                  aria-current={currentPage === 'profile' ? 'page' : undefined}
                  onClick={go('profile')}
                >
                  <span className={styles.sidebarItemIcon} aria-hidden="true"><User size={22} /></span>
                  <span>Profil</span>
                </a>
                {onLogout && (
                  <button
                    type="button"
                    className={`${styles.sidebarRailBtn} ${styles.sidebarRailLogout}`}
                    style={teacherToneVars('danger')}
                    data-sidebar-tooltip="Çıkış yap"
                    aria-label="Çıkış yap"
                    onClick={() => {
                      setOpenFlyout(null);
                      onLogout();
                    }}
                  >
                    <span className={styles.sidebarItemIcon} aria-hidden="true"><LogOut size={22} /></span>
                    <span className={styles.sidebarRailLabel}>Çıkış</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <a href={teacherPageHref('home')} className={styles.sidebarItem} style={teacherPageToneVars('home')} data-sidebar-tooltip="Ana sayfa" title="Ana sayfa" aria-label="Ana sayfa" aria-current={currentPage === 'home' ? 'page' : undefined} onClick={go('home')}>
                <span className={styles.sidebarItemIcon} aria-hidden="true"><Home size={18} /></span>
                <span>Ana sayfa</span>
              </a>
              {TEACHER_PAGE_GROUPS.filter((group) => visiblePages.some((p) => p.group === group)).map((group) => (
                <div key={group} className={`${styles.sidebarGroup} ${visiblePages.filter((p) => p.group === group).every((p) => ['messages', 'announcements', 'profile'].includes(p.id)) ? styles.sidebarHeaderGroup : ''}`}>
                  <h2>{group}</h2>
                  {visiblePages.filter((p) => p.group === group).map((p) => {
                    const badge = badges[p.id] || 0;
                    return (
                      <a key={p.id} href={teacherPageHref(p.id)} className={`${styles.sidebarItem} ${p.id === 'messages' ? styles.sidebarMobileMessage : ''}`} style={teacherPageToneVars(p.id)} data-sidebar-tooltip={p.title} title={p.title} aria-label={badge > 0 ? `${p.title}, ${badge} bekleyen` : p.title} aria-current={currentPage === p.id ? 'page' : undefined} onClick={go(p.id)}>
                        <span className={styles.sidebarItemIcon} aria-hidden="true"><p.icon size={18} /></span>
                        <span>{p.title}</span>
                        {badge > 0 && <span className={styles.sidebarBadge} aria-label={`${badge} bekleyen`}>{badge > 99 ? '99+' : badge}</span>}
                      </a>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </nav>
        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.sidebarCollapse} onClick={onToggleCollapsed} aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'} aria-expanded={!collapsed} aria-controls="teacher-sidebar-nav" title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}>
            {collapsed ? <ChevronRight size={19} aria-hidden="true" /> : <ChevronLeft size={19} aria-hidden="true" />}
            <span>{collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}</span>
          </button>
        </div>
      </aside>
      {wide && openFlyout && createPortal(
        <div
          ref={flyoutRef}
          className={styles.sidebarFlyout}
          role="dialog"
          aria-label={openFlyout.group}
          style={{ left: openFlyout.left, top: openFlyout.top }}
        >
          <span className={styles.sidebarFlyoutConnector} style={{ top: openFlyout.connectorTop }} aria-hidden="true" />
          <div className={styles.sidebarFlyoutTitle}>{openFlyout.group}</div>
          <div className={styles.sidebarFlyoutList}>
            {visiblePages.filter((p) => p.group === openFlyout.group).map((p) => {
              const badge = badges[p.id] || 0;
              return (
                <a
                  key={p.id}
                  href={teacherPageHref(p.id)}
                  className={styles.sidebarFlyoutItem}
                  style={teacherPageToneVars(p.id)}
                  aria-current={currentPage === p.id ? 'page' : undefined}
                  onClick={go(p.id)}
                >
                  <span className={styles.sidebarItemIcon} aria-hidden="true"><p.icon size={18} /></span>
                  <span>{p.title}</span>
                  {badge > 0 && <span className={styles.sidebarBadge} aria-label={`${badge} bekleyen`}>{badge > 99 ? '99+' : badge}</span>}
                </a>
              );
            })}
          </div>
        </div>,
        document.body
      )}
      {wide && tooltip && !openFlyout && createPortal(
        <div className={styles.sidebarTooltip} role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>,
        document.body
      )}
    </>
  );
}

