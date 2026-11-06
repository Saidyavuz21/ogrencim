'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { UserAccount } from '../../data/portalData';
import {
  AnnouncementRow, ClassmateRank, countMyUnreadMessages, getMyStudent, listAnnouncements, listMyClassRanking, listMyGrades,
  listMyHomeworks, listMyPoints, MyGrade, MyHomework, MyPointRow, MyStudent,
} from '../../lib/studentData';
import { studentConversationId } from '../../lib/teacherData';
import { Aquarium } from '../aquarium/Aquarium';
import { Notice } from '../teacher/TeacherUi';
import { PortalPageHeader, PortalSidebar, PortalTopBar, usePageRoute } from '../shell/PortalShell';
import { STUDENT_PAGES, STUDENT_PAGE_GROUPS, StudentPageGroup, StudentPageId, getStudentPage, studentPageHref, studentPageIdFromSlug, studentPageSlug } from './studentRoutes';
import { StudentHome } from './StudentHome';
import { StudentHomeworksPage } from './StudentHomeworksPage';
import { StudentMessagesPage } from './StudentMessagesPage';
import { AnnouncementsList, StudentAccountPage, StudentGradesPage, StudentPointsPage, StudentRankingPage } from './StudentSections';
import { Spinner } from '../Spinner';
import { StudentReadingPage } from '../reading/StudentReadingPage';
import { StudentMaterialsPage } from '../files/StudentMaterialsPage';
import styles from '../teacher/TeacherDashboard.module.css';

interface StudentPortalProps {
  user: UserAccount;
  onLogout: () => void;
}

// Yeni duyuru sayısı: en son görülen duyurunun tarihi bu cihazda saklanır (yalnızca rozet için)
const seenKey = (studentId: string) => `duyuru-goruldu:${studentId}`;
const readSeen = (studentId: string) => {
  try { return window.localStorage.getItem(seenKey(studentId)) || ''; } catch { return ''; }
};
const writeSeen = (studentId: string, iso: string) => {
  try { window.localStorage.setItem(seenKey(studentId), iso); } catch { /* gizli sekme vb. */ }
};

export function StudentPortal({ user, onLogout }: StudentPortalProps) {
  const route = usePageRoute<StudentPageId>(studentPageIdFromSlug, studentPageSlug);
  const { page } = route;
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const [me, setMe] = useState<MyStudent | null>(null);
  const [homeworks, setHomeworks] = useState<MyHomework[]>([]);
  const [grades, setGrades] = useState<MyGrade[]>([]);
  const [points, setPoints] = useState<MyPointRow[]>([]);
  const [ranking, setRanking] = useState<ClassmateRank[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [seenAnnouncement, setSeenAnnouncement] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getMyStudent(user.id), listMyHomeworks(user.id), listMyGrades(user.id), listMyPoints(user.id), listMyClassRanking(), listAnnouncements(),
      countMyUnreadMessages(studentConversationId(user.id)),
    ]).then(([st, hw, gr, pt, rk, an, unread]) => {
      if (!alive) return;
      setLoaded(true);
      const firstError = [st, hw, gr, pt, rk, an].find((r) => !r.ok);
      setLoadError(firstError && !firstError.ok ? firstError.error : null);
      if (st.ok) setMe(st.data);
      if (hw.ok) setHomeworks(hw.data);
      if (gr.ok) setGrades(gr.data);
      if (pt.ok) setPoints(pt.data);
      if (rk.ok) setRanking(rk.data);
      if (an.ok) setAnnouncements(an.data);
      setUnreadMessages(unread);
      setSeenAnnouncement(readSeen(user.id));
    });
    return () => { alive = false; };
  }, [user.id, version]);

  // Duyurular sayfası açıldığında en yeni duyuru "görüldü" sayılır
  const latestAnnouncement = announcements[0]?.created_at || '';
  useEffect(() => {
    if (page !== 'duyurular' || !latestAnnouncement) return;
    writeSeen(user.id, latestAnnouncement);
    queueMicrotask(() => setSeenAnnouncement(latestAnnouncement));
  }, [page, latestAnnouncement, user.id]);

  const openPage = (next: StudentPageId) => {
    route.openPage(next);
    if (next === 'home') setVersion((v) => v + 1);
  };

  const refreshUnread = useCallback(() => {
    countMyUnreadMessages(studentConversationId(user.id)).then(setUnreadMessages);
  }, [user.id]);

  const info = getStudentPage(page);
  const myRank = ranking.findIndex((r) => r.id === user.id) + 1;
  const pendingHomeworks = homeworks.filter((h) => !h.check).length;
  const newAnnouncements = seenAnnouncement
    ? announcements.filter((a) => a.created_at > seenAnnouncement).length
    : Math.min(announcements.length, 3);
  const badges: Partial<Record<StudentPageId, number>> = {
    odevler: pendingHomeworks,
    mesajlar: unreadMessages,
    duyurular: newAnnouncements,
  };
  const studentName = me?.name || user.name;
  const handleLogout = () => { route.clearRoute(); onLogout(); };

  return (
    <div className={styles.dashboardShell}>
      <PortalTopBar
        label="Öğrenci üst menüsü"
        userName={studentName}
        menuOpen={menuOpen}
        isProfile={page === 'hesap'}
        bell={{ count: newAnnouncements, label: 'Duyurular', onClick: () => openPage('duyurular') }}
        onMenu={() => setMenuOpen(true)}
        onHome={() => openPage('home')}
        onProfile={() => openPage('hesap')}
      />
      <PortalSidebar<StudentPageId, StudentPageGroup>
        label="Öğrenci menüsü"
        homeLabel="Ana sayfa"
        homeId="home"
        pages={STUDENT_PAGES}
        groups={STUDENT_PAGE_GROUPS}
        open={menuOpen}
        currentPage={page}
        badges={badges}
        hrefFor={studentPageHref}
        onClose={closeMenu}
        onOpenPage={openPage}
      />
      <div className={styles.dashboard}>
        {page === 'home' || !info ? (
          <StudentHome
            me={me}
            fallbackName={user.name}
            fallbackNo={user.studentNo}
            fallbackClass={user.className}
            myRank={myRank}
            classSize={ranking.length}
            homeworks={homeworks}
            unreadMessages={unreadMessages}
            loaded={loaded}
            badges={badges}
            onOpenPage={openPage}
          />
        ) : (
          <PortalPageHeader icon={info.icon} title={info.title} description={info.description} backLabel="Ana sayfa" onBack={() => openPage('home')} />
        )}

        {loadError && <Notice notice={{ kind: 'error', text: `Bazı bilgiler alınamadı: ${loadError}` }} />}
        {!loaded && page === 'home' && <Spinner center label="Bilgiler yükleniyor…" />}

        {page === 'odevler' && (
          <StudentHomeworksPage
            homeworks={homeworks}
            loaded={loaded}
            studentId={user.id}
            onSubmissionChange={(id, submission) => setHomeworks((prev) => prev.map((h) => (h.id === id ? { ...h, submission } : h)))}
          />
        )}
        {page === 'materyaller' && <StudentMaterialsPage />}
        {page === 'notlar' && <StudentGradesPage grades={grades} loaded={loaded} />}
        {page === 'okuma' && <StudentReadingPage />}
        {page === 'puanlar' && <StudentPointsPage me={me} points={points} loaded={loaded} />}
        {page === 'siralama' && <StudentRankingPage ranking={ranking} myId={user.id} className={me?.class_name || ''} />}
        {page === 'akvaryum' && (
          <div className={styles.pageBody}>
            {loaded
              ? <Aquarium students={ranking} highlightId={user.id} scopeKey={`ogrenci:${user.id}`} title={`${me?.class_name || 'Sınıf'} akvaryumu`} />
              : <Spinner center label="Akvaryum hazırlanıyor…" />}
          </div>
        )}
        {page === 'mesajlar' && (me
          ? <StudentMessagesPage me={me} onRead={refreshUnread} />
          : (loaded ? <p className={styles.mutedText}>Öğrenci bilgisi alınamadı.</p> : <Spinner center label="Mesajlar yükleniyor…" />))}
        {page === 'duyurular' && <AnnouncementsList announcements={announcements} loaded={loaded} />}
        {page === 'hesap' && (
          <StudentAccountPage me={me} fallbackName={user.name} fallbackNo={user.studentNo} fallbackClass={user.className} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

