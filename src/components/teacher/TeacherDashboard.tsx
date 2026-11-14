'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserAccount } from '../../data/portalData';
import {
  countStudentsByClass,
  countUnreadStudentMessages,
  getMySchoolId,
  listMyClasses,
  TeacherClassRow,
} from '../../lib/teacherData';
import {
  useUnreadNotifications,
  type AppNotification,
  type NotificationTarget,
} from '../../lib/notificationData';
import { NotificationPanel } from '../notifications/NotificationPanel';
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
import { TeacherConsentPage } from './TeacherConsentPage';
import { TeacherAquariumPage } from './TeacherAquariumPage';
import { TeacherGardenPage } from '../garden/TeacherGardenPage';
import { TeacherReadingPage } from '../reading/TeacherReadingPage';
import { TeacherQuizShowPage } from '../quizshow/TeacherQuizShowPage';
import { TeacherGradesPage } from './TeacherGradesPage';
import { TeacherMessagesPage } from './TeacherMessagesPage';
import { TeacherClassToolsPage, type ClassToolId } from './TeacherClassToolsPage';
import { TeacherFilesPage } from '../files/TeacherFilesPage';
import { QuestionBankPage } from '../quiz/QuestionBankPage';
import { ClassReportPage } from '../reports/ClassReportPage';
import { SchoolAdminPage } from '../school/SchoolAdminPage';
import { TeacherBoardsPage } from '../board/TeacherBoardsPage';
import { CommunityHub } from '../community/CommunityHub';
import { countUnreadNotifications } from '../../lib/communitySocialData';
import { NeedClass } from './TeacherUi';
import { TeacherPageId, getTeacherPage, pageIdFromSlug } from './teacherPages';
import { TeacherClass } from '../../data/portalData';
import styles from './TeacherDashboard.module.css';
import { TeacherMobileNav } from './TeacherMobileNav';
import { InstallAppBanner } from '../InstallAppBanner';

/** Seçili sınıfa göre çalışan sayfalar (üst çubukta sınıf seçici gösterilir) */
const CLASS_PAGES: TeacherPageId[] = ['class_tools', 'quiz_show', 'check_sheet', 'plus_minus', 'assignments', 'grade_entry', 'leaderboard', 'aquarium', 'messages', 'consent'];
/** Sınıf seçilmeden açılamayan sayfalar */
const NEEDS_CLASS: TeacherPageId[] = ['class_tools', 'check_sheet', 'plus_minus', 'grade_entry', 'leaderboard', 'aquarium', 'messages', 'class_report', 'consent'];

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
  currentUser,
  onUserUpdated,
}) => {
  const homeroomClass = currentUser?.className && currentUser.className !== 'Yok' ? currentUser.className : '';
  const defaultSubject = currentUser?.branch || '';
  const { count: unreadNotificationCount } = useUnreadNotifications(true);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // Bildirimden açılan sohbet; n her tıklamada artar (aynı sohbete yeniden gitmek için mesaj sayfası yeniden açılır)
  const [convRequest, setConvRequest] = useState<{ id?: string; n: number }>({ n: 0 });
  const messageConvId = convRequest.id;

  // --- Sınıflar (veritabanı) ---
  const [classRows, setClassRows] = useState<TeacherClassRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadCommunity, setUnreadCommunity] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedClass, setSelectedClass] = useState(homeroomClass);

  const refreshUnreadCommunity = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const count = await countUnreadNotifications();
    setUnreadCommunity(count);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUnreadCommunity();
    const timer = window.setInterval(() => {
      void refreshUnreadCommunity();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshUnreadCommunity]);

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

  // Okunmamış mesaj sayısı: sohbet okununca ve zil sayısı her değiştiğinde (yeni mesaj / okundu) yenilenir
  const refreshUnreadMessages = useCallback(() => {
    void countUnreadStudentMessages().then(setUnreadMessages);
  }, []);
  useEffect(() => {
    const t = setTimeout(refreshUnreadMessages, 400);
    return () => clearTimeout(t);
  }, [unreadNotificationCount, refreshUnreadMessages]);

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
    setNotificationsOpen(false);
    setActivePage(next);
    const info = getTeacherPage(next);
    const url = new URL(window.location.href);
    if (info) url.searchParams.set('sayfa', info.slug);
    else url.searchParams.delete('sayfa');
    url.searchParams.delete('ogretmen');
    if (url.href !== window.location.href) {
      window.history.pushState(null, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0 });
    onSectionChange?.(next === 'announcements' ? 'announcements' : 'dashboard');
    if (next === 'home') reloadData();
  };

  const handleOpenNotificationTarget = (target: NotificationTarget, _n: AppNotification) => {
    void _n;
    if (target.role !== 'teacher') return;
    if (target.page === 'messages') {
      setConvRequest((r) => ({ id: target.refId ?? undefined, n: r.n + 1 }));
    } else if (target.page === 'check_sheet' && target.refId) {
      setCheckHomeworkId(target.refId);
    }
    openPage(target.page);
  };

  useEffect(() => {
    const syncFromUrl = () => {
      setNotificationsOpen(false);
      const next = pageIdFromSlug(new URLSearchParams(window.location.search).get('sayfa'));
      setActivePage(next);
      onSectionChange?.(next === 'announcements' ? 'announcements' : 'dashboard');
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [onSectionChange]);

  const pageInfo = getTeacherPage(page);
  const showClassPicker = CLASS_PAGES.includes(page) && page !== 'assignments';
  const missingClass = NEEDS_CLASS.includes(page) && !effectiveClass;

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [homeClassTool, setHomeClassTool] = useState<ClassToolId | undefined>();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className={`${styles.dashboardShell} ${sidebarCollapsed ? styles.dashboardSidebarCollapsed : ''}`}>
      <TeacherTopBar
        user={currentUser}
        unreadCount={unreadNotificationCount}
        isProfile={page === 'profile'}
        onHome={() => openPage('home')}
        onNotifications={() => setNotificationsOpen((prev) => !prev)}
        bellRef={bellRef}
        notificationsOpen={notificationsOpen}
        onProfile={() => openPage('profile')}
        classNames={classNames}
        selectedClass={effectiveClass}
        onSelectClass={setSelectedClass}
        onMessages={() => openPage('messages')}
        unreadMessages={unreadMessages}
        isMessages={page === 'messages'}
        onCommunity={() => openPage('community')}
        isCommunity={page === 'community'}
        unreadCommunity={unreadCommunity}
        onClassTools={() => openPage('class_tools')}
        isClassTools={page === 'class_tools'}
        onBoards={() => openPage('boards')}
        isBoards={page === 'boards'}
      />
      <NotificationPanel
        role="teacher"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenTarget={handleOpenNotificationTarget}
        anchorRef={bellRef}
      />
      <TeacherSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        open={menuOpen}
        currentPage={page}
        badges={{ messages: unreadMessages, community: unreadCommunity }}
        isSchoolAdmin={currentUser?.isSchoolAdmin}
        onClose={closeMenu}
        onOpenPage={openPage}
        onLogout={onLogout && (() => { window.history.replaceState(null, '', window.location.pathname); onLogout(); })}
      />
      <div className={styles.dashboard}>
      <InstallAppBanner variant={page === 'profile' ? 'profile' : 'suggestion'} visible={page === 'home' || page === 'profile'} />
      {page === 'home' || !pageInfo ? (
        <TeacherHome
          user={currentUser}
          classes={classOptions}
          selectedClass={effectiveClass}
          onSelectClass={setSelectedClass}
          onOpenPage={openPage}
          onNewClass={() => openPage('classes')}
          onOpenClassTool={(tool) => { setHomeClassTool(tool); openPage('class_tools'); }}
          badges={{ messages: unreadMessages, community: unreadCommunity }}
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

      {page === 'files' && <TeacherFilesPage classNames={classNames} userId={currentUser?.id} isSchoolAdmin={currentUser?.isSchoolAdmin} branch={currentUser?.branch} />}
      {page === 'questions' && <QuestionBankPage />}
      {page === 'quiz_show' && <TeacherQuizShowPage key={effectiveClass} selectedClass={effectiveClass} onOpenQuestionBank={() => openPage('questions')} />}
      {page === 'boards' && <TeacherBoardsPage defaultSubject={defaultSubject} />}
      {page === 'community' && (
        <CommunityHub
          onOpenProfile={() => openPage('profile')}
          onOpenBoards={() => openPage('boards')}
          onOpenQuestions={() => openPage('questions')}
          unreadNotifications={unreadCommunity}
          onNotificationsRead={() => setUnreadCommunity(0)}
        />
      )}
      {page === 'school_admin' && (currentUser?.isSchoolAdmin && currentUser.schoolId
        ? <SchoolAdminPage schoolId={currentUser.schoolId} schoolName={currentUser.schoolName} />
        : <p className={styles.mutedText}>Bu sayfa yalnızca okul yöneticilerine açıktır.</p>)}

      {!missingClass && (
        <>
          {page === 'check_sheet' && (
            <TeacherCheckPage key={effectiveClass} selectedClass={effectiveClass} initialHomeworkId={checkHomeworkId} onCreateHomework={() => openPage('assignments')} />
          )}
          {page === 'plus_minus' && <TeacherPointsPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'class_tools' && <TeacherClassToolsPage key={`${effectiveClass}-${homeClassTool || ''}`} selectedClass={effectiveClass} initialTool={homeClassTool} />}
          {page === 'leaderboard' && <TeacherLeaderboardPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'consent' && <TeacherConsentPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'aquarium' && <TeacherAquariumPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'garden' && <TeacherGardenPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'reading' && <TeacherReadingPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'class_report' && <ClassReportPage key={effectiveClass} selectedClass={effectiveClass} />}
          {page === 'grade_entry' && <TeacherGradesPage key={effectiveClass} selectedClass={effectiveClass} defaultSubject={defaultSubject} />}
          {page === 'messages' && <TeacherMessagesPage key={`${effectiveClass}:${convRequest.n}`} selectedClass={effectiveClass} classNames={classNames} schoolId={schoolId} currentUserId={currentUser?.id} initialConversationId={messageConvId} onRead={refreshUnreadMessages} />}
        </>
      )}
      </div>
      <TeacherMobileNav
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen(true)}
        key={page}
        page={page}
        unreadMessages={unreadMessages}
        onOpenPage={(next) => { closeMenu(); openPage(next); }}
        onOpenTool={(tool) => { closeMenu(); setHomeClassTool(tool); openPage('class_tools'); }}
      />
    </div>
  );
};
