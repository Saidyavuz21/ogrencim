'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserAccount } from '../../data/portalData';
import { TeacherProfilePage } from '../teacher/TeacherProfilePage';
import { AnnouncementsPage } from '../AnnouncementsPage';
import { PortalTopBar, PortalSidebar, usePageRoute } from '../shell/PortalShell';
import { AdminHome } from './AdminHome';
import { AdminTeacherRequestsPage } from './AdminTeacherRequestsPage';
import { AdminSchoolRequestsPage } from './AdminSchoolRequestsPage';
import { AdminTeachersPage } from './AdminTeachersPage';
import { AdminStudentsPage } from './AdminStudentsPage';
import { AdminSchoolsPage } from './AdminSchoolsPage';
import { AdminClassesPage } from './AdminClassesPage';
import { LibraryPanel } from '../files/LibraryPanel';
import { AdminTrashPage } from './AdminTrashPage';
import { CommunityPage } from '../community/CommunityPage';
import { AdminCommunityReportsPage } from './AdminCommunityReportsPage';
import { AdminLogsPage } from './AdminLogsPage';
import { AdminPrivacyPage } from './AdminPrivacyPage';
import { AdminNotice, useAdminData, useNotify } from './adminShared';
import { ADMIN_PAGES, ADMIN_PAGE_GROUPS, AdminPageId, adminPageHref, adminPageIdFromSlug, getAdminPage } from './adminPages';
import styles from '../teacher/TeacherDashboard.module.css';
import s from './AdminDashboard.module.css';

interface AdminDashboardProps {
  onLogout?: () => void;
  currentUser?: UserAccount;
}

const slugOf = (id: AdminPageId) => getAdminPage(id)?.slug;

/** Süper admin paneli: solda menü, her işe ayrı sayfa (/yonetim?sayfa=...) */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
  const data = useAdminData();
  const [message, notify, clearMessage] = useNotify();
  const route = usePageRoute<AdminPageId>(adminPageIdFromSlug, slugOf);
  const { page } = route;
  const [menuOpen, setMenuOpen] = useState(false);
  // Okul başvurularındaki "Okul ekle": Okullar sayfası ekleme formu açık açılır
  const [schoolFormOpen, setSchoolFormOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const openPage = (next: AdminPageId) => {
    clearMessage();
    setSchoolFormOpen(false);
    route.openPage(next);
  };

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
  const handleLogout = onLogout && (() => { route.clearRoute(); onLogout(); });

  return (
    <div className={`${styles.dashboardShell} ${styles.portalShell} ${s.adminShell}`}>
      <PortalTopBar
        label="Yönetim üst menüsü"
        userName={currentUser?.name}
        roleBadge="Süper Admin"
        menuOpen={menuOpen}
        isProfile={page === 'account'}
        onMenu={() => setMenuOpen(true)}
        onHome={() => openPage('home')}
        onProfile={() => openPage('account')}
      />
      <PortalSidebar<AdminPageId, (typeof ADMIN_PAGE_GROUPS)[number]>
        label="Yönetim menüsü"
        homeLabel="Genel bakış"
        homeId="home"
        pages={ADMIN_PAGES}
        groups={ADMIN_PAGE_GROUPS}
        open={menuOpen}
        currentPage={page}
        badges={badges}
        hrefFor={adminPageHref}
        onClose={closeMenu}
        onOpenPage={openPage}
      />
      <main className={`${styles.dashboard} ${s.content}`}>
        {page === 'home' || !pageInfo ? (
          <AdminHome user={currentUser} data={data} badges={badges} onOpenPage={openPage} />
        ) : (
          <header className={s.pageHeader}>
            <h1>{pageInfo.title}</h1>
            <p>{pageInfo.description}</p>
          </header>
        )}

        <AdminNotice message={message} onClose={clearMessage} />

        {page === 'teacher_requests' && (
          <AdminTeacherRequestsPage data={data} notify={notify} onOpenSchoolRequests={() => openPage('school_requests')} />
        )}
        {page === 'school_requests' && (
          <AdminSchoolRequestsPage data={data} notify={notify} onAddSchools={() => { openPage('schools'); setSchoolFormOpen(true); }} />
        )}
        {page === 'teachers' && <AdminTeachersPage data={data} notify={notify} />}
        {page === 'students' && <AdminStudentsPage data={data} notify={notify} />}
        {page === 'schools' && <AdminSchoolsPage key={schoolFormOpen ? 'form' : 'list'} data={data} notify={notify} startWithForm={schoolFormOpen} />}
        {page === 'classes' && <AdminClassesPage data={data} />}
        {page === 'library' && <LibraryPanel manage />}
        {page === 'announcements' && <AnnouncementsPage manager="admin" />}
        {page === 'privacy' && <AdminPrivacyPage data={data} notify={notify} />}
        {page === 'trash' && <AdminTrashPage data={data} notify={notify} />}
        {page === 'community' && <CommunityPage admin />}
        {page === 'community_reports' && <AdminCommunityReportsPage notify={notify} />}
        {page === 'logs' && <AdminLogsPage data={data} />}
        {page === 'account' && <TeacherProfilePage user={currentUser} onLogout={handleLogout} />}
      </main>
    </div>
  );
};
