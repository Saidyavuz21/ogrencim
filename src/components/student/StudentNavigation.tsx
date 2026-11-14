'use client';

import React from 'react';
import { FileText, LayoutDashboard, Menu, MessageSquare } from '../icons';
import { isPlainLeftClick } from '../teacher/teacherPages';
import { StudentPageId, studentPageHref } from './studentRoutes';
import s from './StudentPortal.module.css';

const items = [
  { id: 'home', title: 'Ana sayfa', icon: LayoutDashboard },
  { id: 'odevler', title: 'Ödevler', icon: FileText },
  { id: 'mesajlar', title: 'Mesajlar', icon: MessageSquare },
] as const;

const badgeText = (n: number) => (n > 99 ? '99+' : String(n));

/** Mobil alt çubuk: üç kısayol + menü (üst çubuktaki menü düğmesinin yerine) */
export function StudentNavigation({ page, badges, menuOpen, onOpenPage, onMenu }: {
  page: StudentPageId;
  badges: Partial<Record<StudentPageId, number>>;
  menuOpen: boolean;
  onOpenPage: (page: StudentPageId) => void;
  onMenu: () => void;
}) {
  // Alt çubukta olmayan sayfalardaki yenilikler (ör. duyurular) menü düğmesinde toplanır
  const shown = new Set<StudentPageId>(items.map((i) => i.id));
  const menuBadge = (Object.entries(badges) as [StudentPageId, number | undefined][])
    .filter(([id]) => !shown.has(id))
    .reduce((sum, [, n]) => sum + (n || 0), 0);

  return (
    <nav className={s.mobileNav} aria-label="Öğrenci hızlı menüsü">
      {items.map((item) => (
        <a key={item.id} href={studentPageHref(item.id)} aria-current={page === item.id ? 'page' : undefined}
          onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); onOpenPage(item.id); }}>
          <span className={s.navIcon}>
            <item.icon size={21} aria-hidden="true" />
            {(badges[item.id] || 0) > 0 && <span className={s.navBadge} aria-label={`${badges[item.id]} yeni`}>{badgeText(badges[item.id]!)}</span>}
          </span>
          <span>{item.title}</span>
        </a>
      ))}
      <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-label={menuBadge > 0 ? `Menü, ${menuBadge} yeni` : 'Menü'}>
        <span className={s.navIcon}>
          <Menu size={21} aria-hidden="true" />
          {menuBadge > 0 && <span className={s.navBadge} aria-hidden="true">{badgeText(menuBadge)}</span>}
        </span>
        <span>Menü</span>
      </button>
    </nav>
  );
}
