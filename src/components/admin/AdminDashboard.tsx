'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserAccount } from '../../data/portalData';
import { TeacherProfilePage } from '../teacher/TeacherProfilePage';
import { AnnouncementsPage } from '../AnnouncementsPage';
import { AdminTopBar, AdminSidebar, AdminPageHeader } from './AdminShell';
import { AdminHome } from './AdminHome';
import { AdminTeacherRequestsPage } from './AdminTeacherRequestsPage';
import { AdminSchoolRequestsPage } from './AdminSchoolRequestsPage';
import { AdminTeachersPage } from './AdminTeachersPage';
import { AdminStudentsPage } from './AdminStudentsPage';
import { AdminSchoolsPage } from './AdminSchoolsPage';
import { AdminClassesPage } from './AdminClassesPage';
import { AdminNotice, useAdminData, useNotify } from './adminShared';
import { AdminPageId, adminPageIdFromSlug, getAdminPage } from './adminPages';
import styles from '../teacher/TeacherDashboard.module.css';

interface AdminDashboardProps {
  onLogout?: () => void;
  currentUser?: UserAccount;
}

const readPageFromUrl = (): AdminPageId =>
  typeof window === 'undefined' ? 'home' : adminPageIdFromSlug(new URLSearchParams(window.location.search).get('sayfa'));

/** Süper admin paneli: solda menü, her işe ayrı sayfa (/yonetim?sayfa=...) */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
  const data = useAdminData();
  const [message, notify, clearMessage] = useNotify();
  const [page, setPage] = useState<AdminPageId>(readPageFromUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const openPage = useCallback((next: AdminPageId) => {
    setPage(next);
    clearMessage();
    const info = getAdminPage(next);
    const url = new URL(window.location.href);
    if (info) url.searchParams.set('sayfa', info.slug);
    else url.searchParams.delete('sayfa');
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    window.scrollTo({ top: 0 });
  }, [clearMessage]);

  // Tarayıcının / telefonun geri tuşu
  useEffect(() => {
    const sync = () => setPage(readPageFromUrl());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // Başka sayfadan genel bakışa dönüşte sayılar tazelenir (ilk yüklemeyi useAdminData yapar)
  const { refresh } = data;
  const prevPage = useRef(page);
  useEffect(() => {
    if (page === 'home' && prevPage.current !== 'home') refresh();
    prevPage.current = page;
  }, [page, refresh]);

  const pendingTeachers = data.profiles.filter((p) => p.role === 'ogretmen' && !p.approved).length;
  const pendingSchools = data.schools.filter((s) => s.status === 'pending').length;
  const badges: Partial<Record<AdminPageId, number>> = { teacher_requests: pendingTeachers, school_requests: pendingSchools };

  const pageInfo = getAdminPage(page);
  const handleLogout = onLogout && (() => {
    // Çıkışta adresteki ?sayfa= temizlenir; sonraki giriş genel bakıştan başlar
    window.history.replaceState(null, '', window.location.pathname);
    onLogout();
  });

  return (
    <div className={styles.dashboardShell}>
      <AdminTopBar
        user={currentUser}
        menuOpen={menuOpen}
        isAccount={page === 'account'}
        onMenu={() => setMenuOpen(true)}
        onHome={() => openPage('home')}
        onAccount={() => openPage('account')}
      />
      <AdminSidebar open={menuOpen} currentPage={page} badges={badges} onClose={closeMenu} onOpenPage={openPage} />
      <div className={styles.dashboard}>
        {page === 'home' || !pageInfo ? (
          <AdminHome user={currentUser} data={data} badges={badges} onOpenPage={openPage} />
        ) : (
          <AdminPageHeader page={pageInfo} onBack={() => openPage('home')} />
        )}

        <AdminNotice message={message} onClose={clearMessage} />

        {page === 'teacher_requests' && (
          <AdminTeacherRequestsPage data={data} notify={notify} onOpenSchoolRequests={() => openPage('school_requests')} />
        )}
        {page === 'school_requests' && <AdminSchoolRequestsPage data={data} notify={notify} />}
        {page === 'teachers' && <AdminTeachersPage data={data} notify={notify} />}
        {page === 'students' && <AdminStudentsPage data={data} notify={notify} />}
        {page === 'schools' && <AdminSchoolsPage data={data} notify={notify} />}
        {page === 'classes' && <AdminClassesPage data={data} />}
        {page === 'announcements' && <AnnouncementsPage canManage />}
        {page === 'account' && <TeacherProfilePage user={currentUser} onLogout={handleLogout} />}
      </div>
    </div>
  );
};
