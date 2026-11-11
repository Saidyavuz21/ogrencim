'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Shuffle, MessageSquare, Menu, Clock, Users, Bell } from '../icons';
import type { ClassToolId } from './TeacherClassToolsPage';
import type { TeacherPageId } from './teacherPages';
import styles from './TeacherDashboard.module.css';

export function TeacherMobileNav({ page, unreadMessages, onOpenPage, onOpenTool, menuOpen, onMenu }: {
  page: TeacherPageId;
  unreadMessages: number;
  onOpenPage: (page: TeacherPageId) => void;
  onOpenTool: (tool: ClassToolId) => void;
  menuOpen: boolean;
  onMenu: () => void;
}) {
  const [open, setOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    toolsRef.current?.querySelector<HTMLButtonElement>('#mobile-class-tools button')?.focus();
    const outside = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const go = (next: TeacherPageId) => { setOpen(false); onOpenPage(next); };
  return <nav className={styles.mobileBottomNav} aria-label="Öğretmen alt menüsü">
    <button type="button" onClick={() => go('home')} aria-current={page === 'home' && !open ? 'page' : undefined}>
      <LayoutDashboard size={22} aria-hidden="true" /><span>Ana sayfa</span>
    </button>
    <div ref={toolsRef} className={styles.mobileToolsWrap} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      {open && <div id="mobile-class-tools" className={styles.mobileToolsPopover} role="group" aria-label="Sınıf araçları">
        <span className={styles.mobileToolsTitle}>Sınıf araçları</span>
        {([
          { id: 'picker', label: 'Rastgele seçici', icon: Shuffle },
          { id: 'stopwatch', label: 'Kronometre', icon: Clock },
          { id: 'groups', label: 'Gruplama', icon: Users },
          { id: 'countdown', label: 'Geri sayım', icon: Bell },
        ] as const).map((tool) => <button key={tool.id} type="button" onClick={() => { setOpen(false); onOpenTool(tool.id); }}>
          <tool.icon size={20} aria-hidden="true" /><span>{tool.label}</span>
        </button>)}
      </div>}
      <button ref={triggerRef} type="button" className={styles.mobileToolsTrigger} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-class-tools" aria-current={page === 'class_tools' ? 'page' : undefined}>
        <Shuffle size={22} aria-hidden="true" /><span>Sınıf araçları</span>
      </button>
    </div>
    <button type="button" onClick={() => go('messages')} aria-current={page === 'messages' && !open ? 'page' : undefined} aria-label={unreadMessages ? `Mesajlar, ${unreadMessages} okunmamış` : 'Mesajlar'}>
      <MessageSquare size={22} aria-hidden="true" /><span>Mesajlar</span>
      {unreadMessages > 0 && <span className={styles.mobileNavBadge} aria-hidden="true">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
    </button>
    <button type="button" onClick={() => { setOpen(false); onMenu(); }} aria-expanded={menuOpen} aria-controls="teacher-sidebar-nav">
      <Menu size={22} aria-hidden="true" /><span>Menü</span>
    </button>
  </nav>;
}
