'use client';

import React from 'react';
import { ChevronRight, MessageSquare } from '../icons';
import { MyHomework, MyStudent } from '../../lib/studentData';
import { initialsOf } from '../teacher/TeacherUi';
import { isPlainLeftClick } from '../teacher/teacherPages';
import { STUDENT_PAGES, STUDENT_PAGE_GROUPS, StudentPageId, studentPageHref } from './studentRoutes';
import { DueLabel, sortPending } from './StudentHomeworksPage';
import s from './StudentPortal.module.css';

interface Props {
  me: MyStudent | null;
  fallbackName: string;
  fallbackNo?: string;
  fallbackClass?: string;
  myRank: number;
  classSize: number;
  homeworks: MyHomework[];
  unreadMessages: number;
  loaded: boolean;
  badges: Partial<Record<StudentPageId, number>>;
  onOpenPage: (page: StudentPageId) => void;
}

/** Öğrenci ana sayfası: kimlik + özet, yaklaşan ödevler, okunmamış mesaj uyarısı, sayfa kartları */
export function StudentHome({ me, fallbackName, fallbackNo, fallbackClass, myRank, classSize, homeworks, unreadMessages, loaded, badges, onOpenPage }: Props) {
  const name = me?.name || fallbackName;
  const firstName = name.trim().split(/\s+/)[0];
  // Teslim edip kontrol bekleyenler "yapılacak" sayılmaz
  const pending = sortPending(homeworks.filter((h) => !h.check && h.submission?.status !== 'teslim' && !h.quiz?.finished));
  const upcoming = pending.slice(0, 3);

  const link = (page: StudentPageId) => ({
    href: studentPageHref(page),
    onClick: (e: React.MouseEvent) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenPage(page); },
  });

  const stats: { label: string; value: string; page: StudentPageId }[] = [
    { label: 'Puan', value: me ? String(me.points) : '—', page: 'puanlar' },
    { label: classSize ? `Sınıf sırası / ${classSize}` : 'Sınıf sırası', value: myRank > 0 ? `${myRank}.` : '—', page: 'siralama' },
    { label: 'Bekleyen ödev', value: loaded ? String(pending.length) : '—', page: 'odevler' },
  ];

  return (
    <div className={s.home}>
      <header className={s.hero}>
        <div className={s.heroIdentity}>
          <span className={s.heroAvatar} aria-hidden="true">{initialsOf(name)}</span>
          <div>
            <h1>Merhaba, {firstName}</h1>
            <p>No {me?.student_number || fallbackNo || '—'} · {me?.class_name || fallbackClass || 'Sınıf atanmadı'}{me?.school_name ? ` · ${me.school_name}` : ''}</p>
          </div>
        </div>
        <div className={s.heroStats}>
          {stats.map((st) => (
            <a key={st.label} {...link(st.page)} className={s.heroStat}>
              <strong>{st.value}</strong>
              <span>{st.label}</span>
            </a>
          ))}
        </div>
      </header>

      {unreadMessages > 0 && (
        <a {...link('mesajlar')} className={s.alertRow}>
          <MessageSquare size={20} aria-hidden="true" />
          <span>Öğretmenlerinden <strong>{unreadMessages} okunmamış mesaj</strong> var.</span>
          <ChevronRight size={18} aria-hidden="true" />
        </a>
      )}

      {loaded && (
        <section className={s.upcoming} aria-labelledby="upcoming-title">
          <div className={s.upcomingHead}>
            <h2 id="upcoming-title">Yaklaşan ödevler</h2>
            {pending.length > upcoming.length && (
              <a {...link('odevler')} className={s.seeAll}>Tümü ({pending.length}) <ChevronRight size={16} aria-hidden="true" /></a>
            )}
          </div>
          {!upcoming.length ? (
            <p className={s.upcomingEmpty}>Bekleyen ödevin yok.</p>
          ) : (
            <ul className={s.upcomingList}>
              {upcoming.map((h) => (
                <li key={h.id}>
                  <a {...link('odevler')}>
                    <span className={s.upcomingText}>
                      <strong>{h.title}</strong>
                      <span>{h.subject} · {h.teacher_name}</span>
                    </span>
                    <DueLabel due={h.due_date} time={h.due_time} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={s.homeNavigation}>
        {STUDENT_PAGE_GROUPS.map((group) => (
          <section key={group} className={s.navGroup} aria-labelledby={`student-group-${group}`}>
            <h2 id={`student-group-${group}`}>{group}</h2>
            <div>
              {STUDENT_PAGES.filter((item) => item.group === group).map((item) => (
                <a key={item.id} {...link(item.id)} className={s.navLink}>
                  <item.icon size={21} aria-hidden="true" />
                  <span><strong>{item.title}</strong><small>{item.description}</small></span>
                  {(badges[item.id] || 0) > 0 && <span className={s.countBadge} aria-label={`${badges[item.id]} yeni`}>{badges[item.id]}</span>}
                  <ChevronRight size={17} aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
