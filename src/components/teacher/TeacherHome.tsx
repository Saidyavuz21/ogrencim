'use client';

import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronDown } from '../icons';
import { TeacherClass, UserAccount } from '../../data/portalData';
import { TEACHER_PAGE_GROUPS, TeacherPageId, teacherPageHref, isPlainLeftClick, visibleTeacherPages } from './teacherPages';
import styles from './TeacherDashboard.module.css';

interface TeacherHomeProps {
  user?: UserAccount;
  classes: TeacherClass[];
  selectedClass: string;
  onSelectClass: (value: string) => void;
  onOpenPage: (page: TeacherPageId) => void;
  onNewClass: () => void;
  /** Kartın köşesinde gösterilecek bekleyen iş sayıları */
  badges: Partial<Record<TeacherPageId, number>>;
}

/** Öğretmen ana sayfası: her işe ayrı sayfa açan kartlar */
export function TeacherHome({ user, classes, selectedClass, onSelectClass, onOpenPage, onNewClass, badges }: TeacherHomeProps) {
  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const initials = (user?.name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase('tr-TR')).join('') || 'Ö';

  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={styles.homeHeader}>
        <div className={styles.homeIdentity}>
          <span className={styles.homeAvatar} aria-hidden="true">{initials}</span>
          <div className={styles.homeGreeting}>
            <h1>{firstName ? `Merhaba, ${firstName}` : 'Hoş geldiniz'}</h1>
            {selectedClass && <p className={styles.homeSummary}>Sınıf: {selectedClass}</p>}
          </div>
          <button type="button" className={styles.homeToggle} aria-expanded={open} aria-controls="teacher-home-details" aria-label={open ? 'Ayrıntıları gizle' : 'Ayrıntıları göster'} onClick={() => setOpen((v) => !v)}>
            <ChevronDown size={22} aria-hidden="true" className={open ? styles.homeToggleOpen : undefined} />
          </button>
        </div>
        <div id="teacher-home-details" className={`${styles.homeDetails} ${open ? '' : styles.homeDetailsClosed}`}>
        {(user?.branch || user?.schoolName) && (
          <div className={styles.homeMeta}>
            {user?.branch && <span>{user.branch}</span>}
            {user?.schoolName && <span>{user.schoolName}</span>}
          </div>
        )}
        <div className={styles.homeClassPanel} role="group" aria-labelledby="teacher-home-class-label">
          <span id="teacher-home-class-label" className={styles.homeClassLabel}>Çalıştığınız sınıf</span>
          <div className={styles.homeClassChips}>
            {classes.length === 0 && <span className={styles.homeClassEmpty}>Henüz sınıf eklenmedi</span>}
            {classes.map((cls) => {
              const active = cls.name === selectedClass;
              return (
                <button key={cls.id} type="button" className={styles.classChip} aria-pressed={active} onClick={() => onSelectClass(cls.name)}>
                  {cls.name}
                </button>
              );
            })}
            <button type="button" className={styles.addClassChip} onClick={onNewClass}><Plus size={18} aria-hidden="true" />Yeni sınıf</button>
          </div>
        </div>
        </div>
      </header>

      {TEACHER_PAGE_GROUPS.map((group) => {
        const pages = visibleTeacherPages(user?.isSchoolAdmin).filter((p) => p.group === group);
        if (!pages.length) return null;
        const headingId = `teacher-group-${group.replace(/\s+/g, '-')}`;
        return (
          <section key={group} className={styles.cardGroup} aria-labelledby={headingId}>
            <h2 id={headingId}>{group}</h2>
            <div className={styles.cardGrid}>
              {pages.map((page) => {
                const badge = badges[page.id] || 0;
                return (
                  <a key={page.id} href={teacherPageHref(page.id)} className={styles.pageCard} onClick={(e) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenPage(page.id); }}>
                    <span className={styles.pageCardIcon}><page.icon size={22} aria-hidden="true" /></span>
                    <span className={styles.pageCardText}>
                      <span className={styles.pageCardTitle}>{page.title}</span>
                      <span className={styles.pageCardDesc}>{page.description}</span>
                    </span>
                    {badge > 0 && <span className={styles.pageCardBadge} aria-label={`${badge} bekleyen`}>{badge > 99 ? '99+' : badge}</span>}
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
