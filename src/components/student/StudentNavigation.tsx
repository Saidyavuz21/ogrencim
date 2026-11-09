'use client';

import React from 'react';
import { FileText, LayoutDashboard, MessageSquare, User } from '../icons';
import { isPlainLeftClick } from '../teacher/teacherPages';
import { StudentPageId, studentPageHref } from './studentRoutes';
import s from './StudentPortal.module.css';

const items = [
  { id: 'home', title: 'Ana sayfa', icon: LayoutDashboard },
  { id: 'odevler', title: 'Ödevler', icon: FileText },
  { id: 'mesajlar', title: 'Mesajlar', icon: MessageSquare },
  { id: 'hesap', title: 'Hesabım', icon: User },
] as const;

export function StudentNavigation({ page, badges, onOpenPage }: {
  page: StudentPageId;
  badges: Partial<Record<StudentPageId, number>>;
  onOpenPage: (page: StudentPageId) => void;
}) {
  return (
    <nav className={s.mobileNav} aria-label="Öğrenci hızlı menüsü">
      {items.map((item) => (
        <a key={item.id} href={studentPageHref(item.id)} aria-current={page === item.id ? 'page' : undefined}
          onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); onOpenPage(item.id); }}>
          <span className={s.navIcon}>
            <item.icon size={21} aria-hidden="true" />
            {(badges[item.id] || 0) > 0 && <span className={s.navBadge} aria-label={`${badges[item.id]} yeni`}>{badges[item.id]! > 99 ? '99+' : badges[item.id]}</span>}
          </span>
          <span>{item.title}</span>
        </a>
      ))}
    </nav>
  );
}
