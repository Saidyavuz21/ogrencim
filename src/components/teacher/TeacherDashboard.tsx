'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserAccount } from '../../data/portalData';
import {
  countStudentsByClass,
  countUnreadStudentMessages,
  getMySchoolId,
  listMyClasses,
  TeacherClassRow,
} from '../../lib/teacherData';
import { TeacherHome } from './TeacherHome';
import { TeacherTopBar } from './TeacherTopBar';
import { TeacherSidebar } from './TeacherSidebar';
import { TeacherPageHeader } from './TeacherPageHeader';
import { TeacherStudentsPage } from './TeacherStudentsPage';
import { TeacherProfilePage } from './TeacherProfilePage';
import { TeacherClassesPage } from './TeacherClassesPage';
import { TeacherAssignmentsPage } from './TeacherAssignmentsPage';
import { TeacherCheckPage } from './TeacherCheckPage';
import { TeacherPointsPage } from './TeacherPointsPage';
import { TeacherLeaderboardPage } from './TeacherLeaderboardPage';
import { TeacherAquariumPage } from './TeacherAquariumPage';
import { TeacherReadingPage } from '../reading/TeacherReadingPage';
import { TeacherGradesPage } from './TeacherGradesPage';
import { TeacherMessagesPage } from './TeacherMessagesPage';
import { TeacherClassToolsPage } from './TeacherClassToolsPage';
import { TeacherFilesPage } from '../files/TeacherFilesPage';
import { QuestionBankPage } from '../quiz/QuestionBankPage';
import { ClassReportPage } from '../reports/ClassReportPage';
import { NeedClass } from './TeacherUi';
import { TeacherPageId, getTeacherPage, pageIdFromSlug } from './teacherPages';
import { TeacherClass } from '../../data/portalData';
import styles from './TeacherDashboard.module.css';

/** Seçili sınıfa göre çalışan sayfalar (üst çubukta sınıf seçici gösterilir) */
const CLASS_PAGES: TeacherPageId[] = ['class_tools', 'check_sheet', 'plus_minus', 'assignments', 'grade_entry', 'leaderboard', 'aquarium', 'messages'];
/** Sınıf seçilmeden açılamayan sayfalar */
const NEEDS_CLASS: TeacherPageId[] = ['class_tools', 'check_sheet', 'plus_minus', 'grade_entry', 'leaderboard', 'aquarium', 'messages', 'class_report'];

interface TeacherDashboardProps {
  activeSection?: 'dashboard' | 'announcements';
  onSectionChange?: (section: 'dashboard' | 'announcements') => void;
  announcementsContent?: React.ReactNode;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
  currentUser?: UserAccount;
  onUserUpdated?: (user: UserAccount) => void;
}

const readPageFromUrl = (): TeacherPageId =>
  typeof window === 'undefined' ? 'home' : pageIdFromSlug(new URLSearchParams(window.location.search).get('sayfa'));

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  activeSection = 'dashboard',
  onSectionChange,
  announcementsContent,
  onLogout,
  onOpenNotifications,
  unreadCount = 0,
  currentUser,
  onUserUpdated,
}) => {
  const homeroomClass = currentUser?.className && currentUser.className !== 'Yok' ? currentUser.className : '';
  const defaultSubject = currentUser?.branch || '';

  // --- Sınıflar (veritabanı) ---
  const [classRows, setClassRows] = useState<TeacherClassRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedClass, setSelectedClass] = useState(homeroomClass);

  useEffect(() => {
    let alive = true;
    Promise.all([listMyClasses(), countStudentsByClass(), getMySchoolId(), countUnreadStudentMessages()]).then(
      ([classes, counts, school, unread]) => {
        if (!alive) return;
        if (classes.ok) setClassRows(classes.data);
        setStudentCounts(counts);
        setSchoolId(school);
        setUnreadMessages(unread);
      }
    );
    return () => { alive = false; };
  }, [dataVersion]);

  const reloadData = useCallback(() => setDataVersion((v) => v + 1), []);

  const classNames = useMemo(() => {
    const names = classRows.map((c) => c.class_name);
    return homeroomClass ? [homeroomClass, ...names.filter((n) => n !== homeroomClass)] : names;
  }, [classRows, homeroomClass]);

  // Sınıf seçicinin beklediği biçim
  const classOptions: TeacherClass[] = classNames.map((name) => ({
    id: name,
    name,
    grade: '',
    branch: '',
    room: '',
    studentCount: studentCounts[name] || 0,
    capacity: 0,
    averageScore: 0,
    joinCode: '',
    description: '',
    createdAt: '',
    isHomeroom: name === homeroomClass,
  }));

  const effectiveClass = selectedClass && classNames.includes(selectedClass) ? selectedClass : classNames[0] || '';

  // --- Sayfa yönetimi: ?sayfa=... (telefonun geri tuşu ana sayfaya döner) ---
  const [currentPage, setActivePage] = useState<TeacherPageId>(readPageFromUrl);
  const [checkHomeworkId, setCheckHomeworkId] = useState<string | undefined>();
  // Bildirimden "duyurular"a yönlendirme gelirse (activeSection) duyurular sayfası gösterilir
  const page: TeacherPageId = activeSection === 'announcements' ? 'announcements' : currentPage;

  const openPage = (next: TeacherPageId) => {
    setActivePage(next);
    const info = getTeacherPage(next);
    const url = new URL(window.location.href);
    if (info) url.searchParams.set('sayfa', info.slug);
    else url.searchParams.delete('sayfa');
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    window.scrollTo({ top: 0 });
    onSectionChange?.(next === 'announcements' ? 'announcements' : 'dashboard');
    if (next === 'home') reloadData();
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const next = pageIdFromSlug(new URLSearchParams(window.location.search).get('sayfa'));
      setActivePage(next);
      onSectionChange?.(next === 'announcements' ? 'announcements' : 'dashboard');
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [onSectionChange]);

  const pageInfo = getTeacherPage(page);
  const showClassPicker = CLASS_PAGES.includes(page);
  const missingClass = NEEDS_CLASS.includes(page) && !effectiveClass;

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className={styles.dashboardShell}>
      <TeacherTopBar
        user={currentUser}
        unreadCount={unreadCount}
        isProfile={page === 'profile'}
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen(true)}
        onHome={() => openPage('home')}
        onNotifications={() => { openPage('announcements'); onOpenNotifications?.(); }}
        onProfile={() => openPage('profile')}
      />
      <TeacherSidebar
        open={menuOpen}
        currentPage={page}
        badges={{ messages: unreadMessages }}
        onClose={closeMenu}
        onOpenPage={openPage}
      />
      <div className={styles.dashboard}>
      {page === 'home' || !pageInfo ? (
        <TeacherHome
          user={currentUser}
          classes={classOptions}
          selectedClass={effectiveClass}
          onSelectClass={setSelectedClass}
          onOpenPage={openPage}
          onNewClass={() => openPage('classes')}
          badges={{ messages: unreadMessages }}
        />
      ) : (
        <TeacherPageHeader
          page={pageInfo}
          onBack={() => openPage('home')}
          classes={showClassPicker ? classOptions : undefined}
          selectedClass={effectiveClass}
          onSelectClass={showClassPicker ? setSelectedClass : undefined}
        />
      )}

      {missingClass && <NeedClass onOpenClasses={() => openPage('classes')} />}

      {page === 'announcements' && announcementsContent}
      {page === 'profile' && (
        <TeacherProfilePage
          user={currentUser}
          onUserUpdated={onUserUpdated}
          // Çıkışta adresteki ?sayfa= temizlenir; sonraki giriş ana sayfadan başlar
          onLogout={onLogout && (() => { window.history.replaceState(null, '', window.location.pathname); onLogout(); })}
        />
      )}
      {page === 'students' && (
        <TeacherStudentsPage selectedClass={effectiveClass} classNames={classNames} onOpenClasses={() => openPage('classes')} />
      )}
      {page === 'classes' && (
        <TeacherClassesPage
          homeroomClass={homeroomClass}
          classes={classRows}
          studentCounts={studentCounts}
          selectedClass={effectiveClass}
          onSelectClass={setSelectedClass}
          onChanged={reloadData}
          onOpenStudents={() => openPage('students')}
        />
      )}
      {page === 'assignments' && (
        <TeacherAssignmentsPage
          selectedClass={effectiveClass}
          classNames={classNames}
          defaultSubject={defaultSubject}
          onOpenCheck={(id, cls) => { setCheckHomeworkId(id); if (cls) setSelectedClass(cls); openPage('check_sheet'); }}
        />
      )}

      {page === 'files' && <TeacherFilesPage classNames={classNames} />}
      {page === 'questions' && <QuestionBankPage />}

      {!missingClass && (
        <>
          {page === 'check_sheet' && (
            <TeacherCheckPage key={effectiveClass} selectedClass={effectiveClass} initialHomeworkId={checkHomeworkId} onCreateHomework={() => openPage('assignments')} />
          )}
          {page === 'plus_minus' && <TeacherPointsPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'class_tools' && <TeacherClassToolsPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'leaderboard' && <TeacherLeaderboardPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'aquarium' && <TeacherAquariumPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'reading' && <TeacherReadingPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'class_report' && <ClassReportPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'grade_entry' && <TeacherGradesPage key={effectiveClass} selectedClass={effectiveClass} defaultSubject={defaultSubject} />}
          {page === 'messages' && <TeacherMessagesPage key={effectiveClass} selectedClass={effectiveClass} classNames={classNames} schoolId={schoolId} currentUserId={currentUser?.id} />}
        </>
      )}
      </div>
    </div>
  );
};
