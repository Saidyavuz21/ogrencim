'use client';

import React from 'react';
import { ChevronRight, Check, UserCheck, FileCheck2 } from '../icons';
import type { UserAccount } from '../../data/portalData';
import { ADMIN_PAGES, ADMIN_PAGE_GROUPS, AdminPageId, adminPageHref } from './adminPages';
import { isPlainLeftClick } from '../teacher/teacherPages';
import { AdminData, displayName, formatDate } from './adminShared';
import styles from './AdminDashboard.module.css';

interface Props {
  user?: UserAccount;
  data: AdminData;
  badges: Partial<Record<AdminPageId, number>>;
  onOpenPage: (page: AdminPageId) => void;
}

/** Yalnızca süper admin genel bakışının sunumu; ortak kabuk ve veri akışı korunur. */
export function AdminHome({ user, data, badges, onOpenPage }: Props) {
  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const teachers = data.profiles.filter((p) => p.role === 'ogretmen' && p.approved);
  const pendingTeachers = data.profiles
    .filter((p) => p.role === 'ogretmen' && !p.approved)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pendingSchools = data.schools.filter((s) => s.status === 'pending').length;
  const approvedSchools = data.schools.filter((s) => s.status === 'approved').length;
  const pendingTotal = pendingTeachers.length + pendingSchools;
  const stats: { label: string; value: number; page: AdminPageId }[] = [
    { label: 'Öğretmen', value: teachers.length, page: 'teachers' },
    { label: 'Öğrenci', value: data.students.length, page: 'students' },
    { label: 'Okul', value: approvedSchools, page: 'schools' },
  ];
  const approvals = [
    { page: 'teacher_requests' as const, title: 'Öğretmen başvuruları', count: pendingTeachers.length, icon: UserCheck },
    { page: 'school_requests' as const, title: 'Okul başvuruları', count: pendingSchools, icon: FileCheck2 },
  ];
  const link = (page: AdminPageId) => ({
    href: adminPageHref(page),
    onClick: (e: React.MouseEvent) => { if (!isPlainLeftClick(e)) return; e.preventDefault(); onOpenPage(page); },
  });

  return (
    <div className={styles.home} aria-busy={data.loading}>
      <header className={styles.homeIntro}>
        <div>
          <h1>{firstName ? `Merhaba, ${firstName}` : 'Yönetim paneli'}</h1>
          <p>Okullar, kullanıcılar ve başvurulara genel bakış.</p>
        </div>
        <span className={`${styles.status} ${pendingTotal > 0 ? styles.statusPending : ''}`} role="status">
          {!data.loading && pendingTotal === 0 && <Check size={16} aria-hidden="true" />}
          {data.loading ? 'Veriler yükleniyor…' : pendingTotal > 0 ? `${pendingTotal} başvuru onay bekliyor` : 'Bekleyen başvuru yok'}
        </span>
      </header>

      <section aria-label="Özet" className={styles.statGrid}>
        {stats.map((s) => (
          <a key={s.page} {...link(s.page)} className={styles.statCard}>
            <span>{s.label}</span>
            <strong>{data.loading ? '–' : s.value.toLocaleString('tr-TR')}</strong>
            <ChevronRight size={18} aria-hidden="true" />
          </a>
        ))}
      </section>

      <div className={styles.overviewGrid}>
        <section className={styles.panel} aria-labelledby="admin-approvals">
          <div className={styles.panelHead}>
            <h2 id="admin-approvals">Onay bekleyenler</h2>
            <p>Yeni kayıtları inceleyin ve değerlendirin.</p>
          </div>
          {approvals.map((item) => (
            <a key={item.page} {...link(item.page)} className={styles.approvalRow}>
              <span className={styles.linkIcon}><item.icon size={21} aria-hidden="true" /></span>
              <span className={styles.linkText}>
                <span className={styles.linkTitle}>{item.title}</span>
                <span className={styles.linkDescription}>{data.loading ? 'Yükleniyor…' : item.count > 0 ? `${item.count} başvuru incelenmeyi bekliyor` : 'Bekleyen başvuru yok'}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </a>
          ))}
        </section>

        <section className={styles.panel} aria-labelledby="recent-requests-title">
          <div className={styles.recentHead}>
            <h2 id="recent-requests-title">Son öğretmen başvuruları</h2>
            <a {...link('teacher_requests')} className={styles.recentAll}>Tümü <ChevronRight size={16} aria-hidden="true" /></a>
          </div>
          {data.loading ? <p className={styles.empty} role="status">Başvurular yükleniyor…</p> : pendingTeachers.length === 0 ? (
            <div className={styles.empty}><UserCheck size={24} aria-hidden="true" /><p>Bekleyen öğretmen başvurusu yok.</p></div>
          ) : (
            <ul className={styles.recentList}>
              {pendingTeachers.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <a {...link('teacher_requests')}>
                    <span className={styles.linkText}>
                      <span className={styles.linkTitle}>{displayName(p)}</span>
                      <span className={styles.linkDescription}>{[p.branch, p.school_name, formatDate(p.created_at)].filter(Boolean).join(' • ')}</span>
                      {!p.verification_doc && <span className={styles.missingDoc}>Belge yok</span>}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="admin-management-title" className={styles.management}>
        <h2 id="admin-management-title">Yönetim alanları</h2>
        <div className={styles.managementGrid}>
          {ADMIN_PAGE_GROUPS.filter((group) => group !== 'Onaylar').map((group) => (
            <section key={group} className={styles.panel} aria-labelledby={`admin-group-${group}`}>
              <h3 id={`admin-group-${group}`}>{group}</h3>
              {ADMIN_PAGES.filter((page) => page.group === group).map((page) => (
                <a key={page.id} {...link(page.id)} className={styles.managementLink}>
                  <page.icon size={20} aria-hidden="true" />
                  <span className={styles.linkText}>
                    <span className={styles.linkTitle}>{page.title}</span>
                    <span className={styles.linkDescription}>{page.description}</span>
                  </span>
                  {(badges[page.id] || 0) > 0 && <span className={styles.status}>{badges[page.id]} yeni</span>}
                  <ChevronRight size={16} aria-hidden="true" />
                </a>
              ))}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
