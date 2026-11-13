'use client';

import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Shuffle, Clock, Users, Bell } from '../icons';
import type { ClassToolId } from './TeacherClassToolsPage';
import { TeacherClass, UserAccount } from '../../data/portalData';
import { TEACHER_PAGE_GROUPS, TeacherPageId, teacherPageHref, isPlainLeftClick, visibleTeacherPages } from './teacherPages';
import { TEACHER_CLASS_TOOL_TONE, teacherPageToneVars, teacherToneVars } from './teacherColors';
import styles from './TeacherDashboard.module.css';

interface TeacherHomeProps {
  user?: UserAccount;
  classes: TeacherClass[];
  selectedClass: string;
  onSelectClass: (value: string) => void;
  onOpenPage: (page: TeacherPageId) => void;
  onNewClass: () => void;
  onOpenClassTool: (tool: ClassToolId) => void;
  /** Kartın köşesinde gösterilecek bekleyen iş sayıları */
  badges: Partial<Record<TeacherPageId, number>>;
}

/** Öğretmen ana sayfası: her işe ayrı sayfa açan kartlar */
export function TeacherHome({ user, classes, selectedClass, onSelectClass, onOpenPage, onNewClass, onOpenClassTool, badges }: TeacherHomeProps) {
  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const initials = (user?.name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase('tr-TR')).join('') || 'Ö';

  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={`${styles.homeHeader} ${styles.mobileHomeHeader}`}>
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
      <div className={styles.desktopHome}>
        <header className={styles.desktopHomeGreeting}>
          <div>
            <h1>{firstName ? `Merhaba, ${firstName}` : 'Hoş geldiniz'}</h1>
            {(user?.schoolName || user?.branch) && <p>{[user?.schoolName, user?.branch].filter(Boolean).join(' · ')}</p>}
          </div>
          <button type="button" className={styles.desktopNewClass} onClick={onNewClass}><Plus size={18} aria-hidden="true" />Yeni sınıf</button>
        </header>

        <div className={styles.desktopHomeGrid}>
          <section className={styles.homeWorkspace} aria-labelledby="home-quick-heading">
            <h2 id="home-quick-heading">Hızlı işlemler</h2>
            <p className={styles.homeWorkspaceHint}>Sınıfınız için sık kullandığınız işlemler</p>
            <div className={styles.homeActionList}>
              {(['assignments', 'check_sheet', 'plus_minus'] as TeacherPageId[]).map((id) => {
                const item = visibleTeacherPages(user?.isSchoolAdmin).find((p) => p.id === id)!;
                return <a key={id} href={teacherPageHref(id)} className={styles.homeActionRow} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); onOpenPage(id); }}>
                  <span className={styles.homeActionIcon} style={teacherPageToneVars(id)}><item.icon size={22} aria-hidden="true" /></span>
                  <span><strong>{item.title}</strong><small>{item.description}</small></span>
                  <ChevronRight size={19} aria-hidden="true" />
                </a>;
              })}
            </div>
          </section>
          <section className={styles.homeWorkspace} aria-labelledby="home-tools-heading">
            <h2 id="home-tools-heading">Sınıf araçları</h2>
            <div className={styles.homeToolGrid}>
              {([
                { id: 'picker', title: 'Rastgele seçici', icon: Shuffle },
                { id: 'stopwatch', title: 'Kronometre', icon: Clock },
                { id: 'groups', title: 'Gruplama', icon: Users },
                { id: 'countdown', title: 'Geri sayım', icon: Bell },
              ] as const).map((item) => <button key={item.id} type="button" onClick={() => onOpenClassTool(item.id)}>
                <span className={styles.homeToolIcon} style={teacherToneVars(TEACHER_CLASS_TOOL_TONE[item.id])}><item.icon size={24} aria-hidden="true" /></span>
                <span>{item.title}</span>
              </button>)}
            </div>
          </section>
          <section className={`${styles.homeWorkspace} ${styles.homeWorkspaces}`} aria-labelledby="home-workspaces-heading">
            <h2 id="home-workspaces-heading">Çalışma alanlarım</h2>
            <div className={styles.homeShortcutGrid}>
              {(['boards', 'questions', 'files', 'class_report'] as TeacherPageId[]).map((id) => {
                const item = visibleTeacherPages(user?.isSchoolAdmin).find((p) => p.id === id)!;
                return <a key={id} href={teacherPageHref(id)} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); onOpenPage(id); }}>
                  <span className={styles.homeShortcutIcon} style={teacherPageToneVars(id)}><item.icon size={22} aria-hidden="true" /></span><span>{item.title}</span>
                </a>;
              })}
            </div>
          </section>
          <section className={styles.homeWorkspace} aria-labelledby="home-class-heading">
            <h2 id="home-class-heading">Sınıf yönetimi</h2>
            <div className={styles.homeManagementList}>
              {(['students', 'classes'] as TeacherPageId[]).map((id) => {
                const item = visibleTeacherPages(user?.isSchoolAdmin).find((p) => p.id === id)!;
                return <a key={id} href={teacherPageHref(id)} onClick={(event) => { if (!isPlainLeftClick(event)) return; event.preventDefault(); onOpenPage(id); }}>
                  <span className={styles.homeManagementIcon} style={teacherPageToneVars(id)}><item.icon size={18} aria-hidden="true" /></span><span>{item.title}</span><ChevronRight size={18} aria-hidden="true" />
                </a>;
              })}
            </div>
          </section>
        </div>
      </div>


      {TEACHER_PAGE_GROUPS.map((group) => {
        const pages = visibleTeacherPages(user?.isSchoolAdmin).filter((p) => p.group === group);
        if (!pages.length) return null;
        const headingId = `teacher-group-${group.replace(/\s+/g, '-')}`;
        return (
          <section key={group} className={`${styles.cardGroup} ${styles.mobileHomeSection}`} aria-labelledby={headingId}>
            <h2 id={headingId}>{group}</h2>
            <div className={styles.cardGrid}>
              {pages.map((page) => {
                const badge = badges[page.id] || 0;
                return (
                  <a key={page.id} href={teacherPageHref(page.id)} className={styles.pageCard} onClick={(e) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenPage(page.id); }}>
                    <span className={styles.pageCardIcon} style={teacherPageToneVars(page.id)}><page.icon size={22} aria-hidden="true" /></span>
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
