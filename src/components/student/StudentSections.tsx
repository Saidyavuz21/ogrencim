'use client';

import React, { useMemo } from 'react';
import { LogOut } from '../icons';
import { subjectHue } from '../../data/subjects';
import { AnnouncementRow, ClassmateRank, MyGrade, MyPointRow, MyStudent } from '../../lib/studentData';
import { EXAMS } from '../../lib/teacherData';
import { CollapsiblePanel, formatDateTime } from '../teacher/TeacherUi';
import {
  computeCompetitionRanks, countTiers, getPointTier, getRankBadgeClass, getRankRowPodiumClass,
  LeaderboardTierLegend, TIER_CLASS, TIER_ROW_CLASS,
} from '../teacher/TeacherLeaderboardPage';
import { Spinner } from '../Spinner';
import styles from '../teacher/TeacherDashboard.module.css';
import s from './StudentPortal.module.css';

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;
const fmtGrade = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// ---------------- Notlar ----------------
/** Her ders için bir kart; yalnızca girilmiş notlar ve ders ortalaması */
export function StudentGradesPage({ grades, loaded }: { grades: MyGrade[]; loaded: boolean }) {
  const subjects = useMemo(
    () => Array.from(new Set(grades.map((g) => g.subject))).sort((a, b) => a.localeCompare(b, 'tr')),
    [grades]
  );
  if (!loaded) return <Spinner center label="Notlar yükleniyor…" />;
  if (!grades.length) return <p className={`${styles.panel} ${styles.mutedText}`}>Henüz not girilmedi.</p>;
  const order = (id: string) => EXAMS.findIndex((e) => e.id === id);
  const overall = grades.reduce((a, g) => a + g.score, 0) / grades.length;

  return (
    <div className={styles.pageBody}>
      <section className={`${styles.panel} ${styles.statRow}`} aria-label="Not özeti">
        <div><strong>{subjects.length}</strong><span>Ders</span></div>
        <div><strong>{grades.length}</strong><span>Girilen not</span></div>
        <div><strong>{fmtGrade(overall)}</strong><span>Genel ortalama</span></div>
      </section>
      <ul className={styles.gradeCards}>
        {subjects.map((subject) => {
          const rows = grades.filter((g) => g.subject === subject).sort((x, y) => order(x.exam) - order(y.exam));
          const avg = rows.reduce((a, g) => a + g.score, 0) / rows.length;
          return (
            <li key={subject} className={styles.gradeCard} style={{ '--subject-hue': subjectHue(subject) } as CSSVars}>
              <div className={styles.gradeCardHead}>
                <h2>{subject}</h2>
                <span className={styles.gradeCardAvg} aria-label={`Ortalama ${fmtGrade(avg)}`}>
                  <small>Ort.</small>{fmtGrade(avg)}
                </span>
              </div>
              <dl className={styles.gradeCardList}>
                {rows.map((g) => (
                  <div key={g.exam}>
                    <dt>{EXAMS.find((e) => e.id === g.exam)?.label || g.exam}</dt>
                    <dd>{fmtGrade(g.score)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------- Puanlarım ----------------
export function StudentPointsPage({ me, points, loaded }: { me: MyStudent | null; points: MyPointRow[]; loaded: boolean }) {
  return (
    <div className={styles.pageBody}>
      <section className={`${styles.panel} ${styles.statRow}`} aria-label="Puan özeti">
        <div><strong>{me?.points ?? '—'}</strong><span>Toplam puan</span></div>
        <div><strong>+{me?.plus_count ?? 0}</strong><span>Artı</span></div>
        <div><strong>−{me?.minus_count ?? 0}</strong><span>Eksi</span></div>
      </section>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Geçmiş</h2>
        {!loaded && <Spinner center label="Yükleniyor…" />}
        {loaded && !points.length && <p className={styles.mutedText}>Henüz puan verilmedi.</p>}
        <ul className={styles.historyList}>
          {points.map((h) => (
            <li key={h.id}>
              <span className={h.amount > 0 ? styles.historyPlus : styles.historyMinus}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
              <span>{h.reason}</span>
              <span className={styles.mutedText}>{h.teacher_name} · {formatDateTime(h.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------- Sınıf sıralaması ----------------
export function StudentRankingPage({ ranking, myId, className }: { ranking: ClassmateRank[]; myId: string; className: string }) {
  const ranks = useMemo(() => computeCompetitionRanks(ranking), [ranking]);
  const counts = useMemo(() => countTiers(ranking), [ranking]);

  return (
    <div className={styles.pageBody}>
      <div className={styles.pointsLayout}>
        <section className={styles.studentList} aria-label="Sınıf sıralaması">
          <div className={styles.listHeading}><h3>{className || 'Sınıf'}</h3><span>{ranking.length} öğrenci</span></div>
          {!ranking.length && <p className={`${styles.mutedText} ${styles.listPad}`}>Sıralama bilgisi yok.</p>}
          <ol className={styles.rankList}>
            {ranking.map((r, i) => {
              const tier = getPointTier(r.points);
              const rank = ranks[i];
              const formattedPoints = r.points > 0 ? `+${r.points}` : String(r.points);
              return (
                <li key={r.id} className={`${styles.rankRow} ${TIER_ROW_CLASS[tier]} ${getRankRowPodiumClass(rank, r.points)} ${r.id === myId ? styles.rankMe : ''}`}>
                  <span className={`${styles.rankNo} ${getRankBadgeClass(rank, r.points)}`}>{rank}</span>
                  <span className={styles.studentCardInfo}><strong>{r.name}{r.id === myId ? ' (sen)' : ''}</strong></span>
                  <strong className={`${styles.rankPoints} ${TIER_CLASS[tier]}`}>{formattedPoints}</strong>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className={styles.pointsAside}>
          <CollapsiblePanel title="Puana göre renk kademeleri" summary={`${ranking.length} öğrenci`}>
            <h2 className={styles.panelTitle}>Puana göre renk kademeleri</h2>
            <LeaderboardTierLegend counts={counts} />
          </CollapsiblePanel>
        </aside>
      </div>
    </div>
  );
}

// ---------------- Duyurular ----------------
/** Duyuru listesi: öğrenci paneli ve öğretmen/admin duyuru sayfası ortak kullanır */
export function AnnouncementsList({ announcements, loaded }: { announcements: AnnouncementRow[]; loaded: boolean }) {
  return (
    <div className={styles.pageBody}>
      {!loaded && <Spinner center label="Duyurular yükleniyor…" />}
      {loaded && !announcements.length && <p className={`${styles.panel} ${styles.mutedText}`}>Henüz duyuru yok.</p>}
      {announcements.map((a) => (
        <article key={a.id} className={styles.panel}>
          <h2 className={styles.panelTitle}>{a.priority === 'urgent' && <span className={styles.urgentPill}>Önemli</span>}{a.title}</h2>
          <p className={styles.announcementBody}>{a.content}</p>
          <p className={styles.mutedText}>{a.teacher_name} · {formatDateTime(a.created_at)}</p>
        </article>
      ))}
    </div>
  );
}

// ---------------- Hesabım ----------------
export function StudentAccountPage({ me, fallbackName, fallbackNo, fallbackClass, onLogout }: {
  me: MyStudent | null;
  fallbackName: string;
  fallbackNo?: string;
  fallbackClass?: string;
  onLogout: () => void;
}) {
  const rows: [string, string][] = [
    ['Ad soyad', me?.name || fallbackName],
    ['Okul numarası', me?.student_number || fallbackNo || '—'],
    ['Sınıf', me?.class_name || fallbackClass || 'Atanmadı'],
    ['Okul', me?.school_name || '—'],
  ];
  return (
    <div className={styles.pageBody}>
      <section className={styles.panel} aria-labelledby="student-info-title">
        <h2 id="student-info-title" className={styles.panelTitle}>Bilgilerim</h2>
        <dl className={s.infoList}>
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <p className={styles.mutedText}>Bilgilerinde yanlışlık varsa ya da PIN&apos;ini unutursan sınıf öğretmenine söyle; yeni PIN öğretmenin tarafından verilir.</p>
      </section>
      <section className={styles.panel} aria-labelledby="student-logout-title">
        <h2 id="student-logout-title" className={styles.panelTitle}>Oturum</h2>
        <p className={styles.mutedText}>Ortak kullanılan bir cihazdaysan işin bitince çıkış yap.</p>
        <button type="button" className={styles.dangerButton} onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />Çıkış yap
        </button>
      </section>
    </div>
  );
}
