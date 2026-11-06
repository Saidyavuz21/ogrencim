'use client';

import React, { useEffect, useState } from 'react';
import { Users, School, Bell, LogOut, User } from '../icons';
import { UserAccount } from '../../data/portalData';
import { TeacherProfilePage } from '../teacher/TeacherProfilePage';
import { BrandLogo } from '../BrandLogo';
import { AccessManagement } from './AccessManagement';
import { AnnouncementsPage } from '../AnnouncementsPage';
import { countStudentsByClass } from '../../lib/teacherData';
import { listProfiles } from '../../lib/supabaseClient';
import styles from '../teacher/TeacherDashboard.module.css';
import adminStyles from './AdminDashboard.module.css';

type AdminTab = 'access' | 'classes' | 'announcements' | 'account';

const TABS: { id: AdminTab; label: string; icon: typeof Users }[] = [
  { id: 'access', label: 'Hesaplar ve okullar', icon: Users },
  { id: 'classes', label: 'Sınıflar', icon: School },
  { id: 'announcements', label: 'Duyurular', icon: Bell },
  { id: 'account', label: 'Hesabım', icon: User },
];

interface AdminDashboardProps {
  onLogout?: () => void;
  currentUser?: UserAccount;
}

/** Süper admin paneli: bütün sekmeler doğrudan veritabanından çalışır */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
  const [tab, setTab] = useState<AdminTab>('access');

  return (
    <div className={styles.dashboard}>
      <header className={adminStyles.header}>
        <div className={adminStyles.topRow}>
          <div className={adminStyles.brand}>
            <BrandLogo height={36} />
            <span className={adminStyles.badge}>Süper Admin</span>
          </div>
          {onLogout && (
            <button type="button" className={adminStyles.logout} onClick={onLogout}><LogOut size={18} aria-hidden="true" />Çıkış</button>
          )}
        </div>
        <nav className={adminStyles.nav} aria-label="Yönetim sekmeleri">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={adminStyles.navButton} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              <t.icon size={16} aria-hidden="true" />{t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'access' && <div className={adminStyles.intro}>
        <h1>Hesaplar ve okullar</h1>
        <p>Öğretmen başvurularını inceleyin, okulları ve öğrenci girişlerini yönetin.</p>
      </div>}

      {tab === 'access' && <AccessManagement />}
      {tab === 'classes' && <AdminClasses />}
      {tab === 'announcements' && <AnnouncementsPage canManage />}
      {tab === 'account' && <TeacherProfilePage user={currentUser} onLogout={onLogout} />}
    </div>
  );
};

/** Öğrenci kayıtlarından türetilen sınıf listesi ve sınıf öğretmenleri */
function AdminClasses() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [homerooms, setHomerooms] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let alive = true;
    Promise.all([countStudentsByClass(), listProfiles()]).then(([c, profiles]) => {
      if (!alive) return;
      setCounts(c);
      const map: Record<string, string[]> = {};
      profiles
        .filter((p) => p.role === 'ogretmen' && p.class_name)
        .forEach((p) => { (map[p.class_name as string] ||= []).push(p.full_name || p.email || 'Öğretmen'); });
      setHomerooms(map);
    });
    return () => { alive = false; };
  }, []);

  const names = Array.from(new Set([...Object.keys(counts || {}), ...Object.keys(homerooms)]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  const noClass = counts?.[''] || 0;

  return (
    <section className={styles.panel} aria-labelledby="admin-classes-title">
      <h2 id="admin-classes-title" className={styles.panelTitle}>Sınıflar <span className={styles.countPill}>{names.length}</span></h2>
      <p className={styles.mutedText}>Sınıflar, öğrenci kayıtlarından ve öğretmenlerin rehberlik sınıflarından otomatik oluşur.</p>
      {counts === null && <p className={styles.mutedText}>Yükleniyor…</p>}
      {counts !== null && !names.length && <p className={styles.mutedText}>Henüz sınıf yok. Öğrenci eklendikçe burada görünür.</p>}
      <ul className={styles.studentCards}>
        {names.map((n) => (
          <li key={n} className={styles.studentCard}>
            <div className={styles.studentCardHead}>
              <span className={styles.studentAvatar} aria-hidden="true">{n}</span>
              <div className={styles.studentCardInfo}>
                <strong>{n}</strong>
                <span>{counts?.[n] || 0} öğrenci · Rehber: {homerooms[n]?.join(', ') || 'atanmadı'}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {noClass > 0 && <p className={styles.mutedText}>{noClass} öğrencinin sınıfı girilmemiş.</p>}
    </section>
  );
}
