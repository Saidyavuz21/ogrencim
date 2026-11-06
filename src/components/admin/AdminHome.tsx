'use client';

import React from 'react';
import { ChevronRight } from '../icons';
import type { UserAccount } from '../../data/portalData';
import { ADMIN_PAGES, ADMIN_PAGE_GROUPS, AdminPageId, adminPageHref } from './adminPages';
import { isPlainLeftClick } from '../teacher/teacherPages';
import { AdminData, displayName, formatDate } from './adminShared';
import { PortalPageCards } from '../shell/PortalShell';
import adminStyles from './AdminDashboard.module.css';

interface Props {
  user?: UserAccount;
  data: AdminData;
  badges: Partial<Record<AdminPageId, number>>;
  onOpenPage: (page: AdminPageId) => void;
}

/** Süper admin ana sayfası: sayılar, bekleyen işler ve bütün sayfalara kartlar */
export function AdminHome({ user, data, badges, onOpenPage }: Props) {
  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const teachers = data.profiles.filter((p) => p.role === 'ogretmen' && p.approved);
  const pendingTeachers = data.profiles
    .filter((p) => p.role === 'ogretmen' && !p.approved)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pendingSchools = data.schools.filter((s) => s.status === 'pending').length;
  const approvedSchools = data.schools.filter((s) => s.status === 'approved').length;

  const stats: { label: string; value: number; page: AdminPageId; alert?: boolean }[] = [
    { label: 'Onay bekleyen öğretmen', value: pendingTeachers.length, page: 'teacher_requests', alert: pendingTeachers.length > 0 },
    { label: 'Onay bekleyen okul', value: pendingSchools, page: 'school_requests', alert: pendingSchools > 0 },
    { label: 'Öğretmen', value: teachers.length, page: 'teachers' },
    { label: 'Öğrenci', value: data.students.length, page: 'students' },
    { label: 'Okul', value: approvedSchools, page: 'schools' },
  ];

  const link = (page: AdminPageId) => ({
    href: adminPageHref(page),
    onClick: (e: React.MouseEvent) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenPage(page); },
  });

  return (
    <>
      <header className={adminStyles.homeIntro}>
        <h1>{firstName ? `Merhaba, ${firstName}` : 'Yönetim paneli'}</h1>
        <p>{pendingTeachers.length + pendingSchools > 0
          ? `${pendingTeachers.length + pendingSchools} başvuru onayınızı bekliyor.`
          : 'Bekleyen başvuru yok. Her şey güncel.'}</p>
      </header>

      <section aria-label="Özet" className={adminStyles.statGrid}>
        {stats.map((s) => (
          <a key={s.label} {...link(s.page)} className={`${adminStyles.statCard} ${s.alert ? adminStyles.statAlert : ''}`}>
            <strong>{data.loading ? '–' : s.value}</strong>
            <span>{s.label}</span>
          </a>
        ))}
      </section>

      {pendingTeachers.length > 0 && (
        <section className={adminStyles.recentPanel} aria-labelledby="recent-requests-title">
          <div className={adminStyles.recentHead}>
            <h2 id="recent-requests-title">Son öğretmen başvuruları</h2>
            <a {...link('teacher_requests')} className={adminStyles.recentAll}>Tümünü gör <ChevronRight size={16} aria-hidden="true" /></a>
          </div>
          <ul className={adminStyles.recentList}>
            {pendingTeachers.slice(0, 5).map((p) => (
              <li key={p.id}>
                <a {...link('teacher_requests')}>
                  <span className={adminStyles.recentName}>{displayName(p)}</span>
                  <span className={adminStyles.recentMeta}>
                    {[p.branch, p.school_name, formatDate(p.created_at)].filter(Boolean).join(' • ')}
                    {!p.verification_doc && <em> • Belge yok</em>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PortalPageCards pages={ADMIN_PAGES} groups={ADMIN_PAGE_GROUPS} badges={badges} hrefFor={adminPageHref} onOpenPage={onOpenPage} idPrefix="admin" />
    </>
  );
}
