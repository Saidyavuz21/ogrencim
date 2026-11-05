'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, ChevronRight, ChevronDown, ArrowLeft, FileText, TrendingUp, Star, Award, MessageSquare, User, Send, Users, Check, Minus, X, LogOut, Fish,
} from '../icons';
import { Aquarium } from '../aquarium/Aquarium';
import { BrandLogo } from '../BrandLogo';
import type { IconProps } from '../icons';
import { UserAccount, UserRole } from '../../data/portalData';
import {
  AnnouncementRow, ClassmateRank, getMyStudent, listAnnouncements, listMyClassRanking, listMyGrades, listMyHomeworks, listMyPoints,
  MyGrade, MyHomework, MyPointRow, MyStudent,
} from '../../lib/studentData';
import {
  classConversationId, EXAMS, isFamilyRole, markConversationRead, questionConversationId, sendMessage, studentConversationId,
} from '../../lib/teacherData';
import { AttachmentList, CollapsiblePanel, LiveBadge, Notice, NoticeState, formatDate, formatDateTime, initialsOf } from '../teacher/TeacherUi';
import {
  computeCompetitionRanks, countTiers, getPointTier, getRankBadgeClass, getRankRowPodiumClass,
  LeaderboardTierLegend, TIER_CLASS, TIER_ROW_CLASS,
} from '../teacher/TeacherLeaderboardPage';
import { useLiveMessages } from '../../lib/useLiveMessages';
import styles from '../teacher/TeacherDashboard.module.css';

type PageId = 'home' | 'odevler' | 'notlar' | 'puanlar' | 'siralama' | 'akvaryum' | 'mesajlar' | 'duyurular' | 'hesap';

interface PageInfo { id: Exclude<PageId, 'home'>; title: string; parentTitle?: string; description: string; icon: React.FC<IconProps>; parentOnly?: boolean }

const PAGES: PageInfo[] = [
  { id: 'odevler', title: 'Ödevlerim', parentTitle: 'Ödevler', description: 'Verilen ödevler ve kontrol sonucu', icon: FileText },
  { id: 'notlar', title: 'Notlarım', parentTitle: 'Notlar', description: 'Yazılı, sözlü ve performans', icon: TrendingUp },
  { id: 'puanlar', title: 'Puanlarım', parentTitle: 'Davranış puanları', description: 'Artı / eksi geçmişi', icon: Star },
  { id: 'siralama', title: 'Sınıf sıralaması', description: 'Sınıftaki puan sırası', icon: Award },
  { id: 'akvaryum', title: 'Sınıf akvaryumu', description: 'Puanınla büyüyen balığın', icon: Fish },
  { id: 'mesajlar', title: 'Öğretmenime soru sor', parentTitle: 'Öğretmenle mesajlaşma', description: 'Öğretmenlere yaz, sınıf duyurularını oku', icon: MessageSquare },
  { id: 'duyurular', title: 'Duyurular', description: 'Okul duyuruları', icon: Bell },
  { id: 'hesap', title: 'Hesap', description: 'Görünüm ve çıkış', icon: User },
];

const readPage = (): PageId => {
  if (typeof window === 'undefined') return 'home';
  const slug = new URLSearchParams(window.location.search).get('sayfa');
  return (PAGES.find((p) => p.id === slug)?.id as PageId) || 'home';
};

interface StudentPortalProps {
  user: UserAccount;
  role: 'ogrenci' | 'veli';
  allowedRoles: UserRole[];
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
}

const STATUS_LABEL = { yapti: 'Yaptı', kismen: 'Kısmen', yapmadi: 'Yapmadı' } as const;
const STATUS_STYLE = { yapti: styles.done, kismen: styles.partial, yapmadi: styles.missing } as const;
const STATUS_ICON = { yapti: Check, kismen: Minus, yapmadi: X } as const;

export function StudentPortal({ user, role, allowedRoles, onRoleChange, onLogout }: StudentPortalProps) {
  const isParent = role === 'veli';
  const [page, setPage] = useState<PageId>(readPage);
  const [me, setMe] = useState<MyStudent | null>(null);
  const [homeworks, setHomeworks] = useState<MyHomework[]>([]);
  const [grades, setGrades] = useState<MyGrade[]>([]);
  const [points, setPoints] = useState<MyPointRow[]>([]);
  const [ranking, setRanking] = useState<ClassmateRank[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getMyStudent(user.id), listMyHomeworks(user.id), listMyGrades(user.id), listMyPoints(user.id), listMyClassRanking(), listAnnouncements()]).then(
      ([st, hw, gr, pt, rk, an]) => {
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
      }
    );
    return () => { alive = false; };
  }, [user.id, version]);

  const openPage = (next: PageId) => {
    setPage(next);
    const url = new URL(window.location.href);
    if (next === 'home') url.searchParams.delete('sayfa');
    else url.searchParams.set('sayfa', next);
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    window.scrollTo({ top: 0 });
    if (next === 'home') setVersion((v) => v + 1);
  };

  useEffect(() => {
    const sync = () => setPage(readPage());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const visiblePages = PAGES.filter((p) => !p.parentOnly || isParent);
  const info = visiblePages.find((p) => p.id === page);
  const myRank = ranking.findIndex((r) => r.id === user.id) + 1;
  const pendingHomeworks = homeworks.filter((h) => !h.check).length;
  const titleOf = (p: PageInfo) => (isParent && p.parentTitle ? p.parentTitle : p.title);
  const studentName = me?.name || user.name;
  const [headerOpen, setHeaderOpen] = useState(false);

  return (
    <div className={`${styles.dashboard} ${styles.portalWrap}`}>
      {page === 'home' || !info ? (
        <>
          <header className={styles.homeHeader}>
            <div className={styles.homeTopRow}>
              <div className={styles.workspaceBrand}>
                <BrandLogo height={32} />
              </div>
              <span className={styles.countPill}>{isParent ? 'Veli görünümü' : 'Öğrenci görünümü'}</span>
            </div>
            <div className={styles.homeIdentity}>
              <span className={styles.homeAvatar} aria-hidden="true">{initialsOf(studentName)}</span>
              <div className={styles.homeGreeting}>
                <h1>{isParent ? `${studentName} – veli paneli` : `Merhaba, ${studentName.split(/\s+/)[0]}`}</h1>
                <p>No {me?.student_number || user.studentNo} · {me?.class_name || user.className || 'Sınıf atanmadı'}</p>
              </div>
              <button
                type="button"
                className={styles.homeToggle}
                aria-expanded={headerOpen}
                aria-controls="student-home-details"
                aria-label={headerOpen ? 'Özet bilgileri gizle' : 'Özet bilgileri göster'}
                onClick={() => setHeaderOpen((v) => !v)}
              >
                <ChevronDown size={22} aria-hidden="true" className={headerOpen ? styles.homeToggleOpen : undefined} />
              </button>
            </div>
            <div id="student-home-details" className={`${styles.homeDetails} ${headerOpen ? '' : styles.homeDetailsClosed}`}>
              <div className={styles.statRow}>
                <div><strong>{me?.points ?? '—'}</strong><span>Puan</span></div>
                <div><strong>{myRank > 0 ? `${myRank}.` : '—'}</strong><span>Sınıf sırası</span></div>
                <div><strong>{pendingHomeworks}</strong><span>Bekleyen ödev</span></div>
              </div>
            </div>
          </header>
          {loadError && <Notice notice={{ kind: 'error', text: `Bazı bilgiler alınamadı: ${loadError}` }} />}
          {!loaded && <p className={styles.mutedText}>Bilgiler yükleniyor…</p>}
          <section className={styles.cardGroup} aria-label="Sayfalar">
            <div className={styles.cardGrid}>
              {visiblePages.map((p) => (
                <button key={p.id} type="button" className={styles.pageCard} onClick={() => openPage(p.id)}>
                  <span className={styles.pageCardIcon}><p.icon size={22} aria-hidden="true" /></span>
                  <span className={styles.pageCardText}>
                    <span className={styles.pageCardTitle}>{titleOf(p)}</span>
                    <span className={styles.pageCardDesc}>{p.description}</span>
                  </span>
                  {p.id === 'odevler' && pendingHomeworks > 0 && <span className={styles.pageCardBadge}>{pendingHomeworks}</span>}
                  <ChevronRight size={18} className={styles.pageCardArrow} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderRow}>
            <button type="button" className={styles.backButton} onClick={() => openPage('home')}><ArrowLeft size={20} aria-hidden="true" /><span>Ana sayfa</span></button>
          </div>
          <div className={styles.pageTitleRow}>
            <span className={styles.pageCardIcon}><info.icon size={22} aria-hidden="true" /></span>
            <h1>{titleOf(info)}</h1>
          </div>
        </header>
      )}

      {page === 'odevler' && <HomeworksPage homeworks={homeworks} loaded={loaded} />}
      {page === 'notlar' && <GradesPage grades={grades} loaded={loaded} />}
      {page === 'puanlar' && <PointsPage me={me} points={points} loaded={loaded} />}
      {page === 'siralama' && <RankingPage ranking={ranking} myId={user.id} className={me?.class_name || ''} />}
      {page === 'akvaryum' && (
        <div className={styles.pageBody}>
          {loaded
            ? <Aquarium students={ranking} highlightId={user.id} scopeKey={`ogrenci:${user.id}`} title={`${me?.class_name || 'Sınıf'} akvaryumu`} />
            : <p className={styles.mutedText}>Akvaryum hazırlanıyor…</p>}
        </div>
      )}
      {page === 'mesajlar' && me && <FamilyMessagesPage key={role} me={me} asStudent={!isParent} />}
      {page === 'duyurular' && <AnnouncementsList announcements={announcements} loaded={loaded} />}
      {page === 'hesap' && (
        <div className={styles.pageBody}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Görünüm</h2>
            <p className={styles.mutedText}>Aynı giriş ile öğrenci ve veli görünümü arasında geçebilirsiniz. Öğrenci görünümünde yazılan mesaj öğretmene öğrencinin adıyla, veli görünümünde veli olarak gider.</p>
            <div className={styles.chipRow}>
              {allowedRoles.filter((r) => r === 'ogrenci' || r === 'veli').map((r) => (
                <button key={r} type="button" className={`${styles.chip} ${role === r ? styles.chipActive : ''}`} aria-pressed={role === r} onClick={() => onRoleChange(r)}>
                  {r === 'ogrenci' ? 'Öğrenci görünümü' : 'Veli görünümü'}
                </button>
              ))}
            </div>
          </section>
          <section className={styles.panel}>
            <p className={styles.mutedText}>PIN değişikliği için sınıf öğretmeninize başvurun.</p>
            <button type="button" className={styles.dangerButton} onClick={() => { window.history.replaceState(null, '', window.location.pathname); onLogout(); }}>
              <LogOut size={18} aria-hidden="true" />Çıkış yap
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function HomeworksPage({ homeworks, loaded }: { homeworks: MyHomework[]; loaded: boolean }) {
  if (loaded && !homeworks.length) return <p className={`${styles.panel} ${styles.mutedText}`}>Sınıfınıza henüz ödev verilmedi.</p>;
  return (
    <div className={styles.pageBody}>
      <ul className={styles.studentHomeworkList}>
        {homeworks.map((h) => {
          const Icon = h.check ? STATUS_ICON[h.check.status] : null;
          return (
            <li key={h.id} className={`${styles.panel} ${styles.studentHomeworkCard}`}>
              <div className={styles.assignmentContent}>
                <h2 className={styles.assignmentTitle}>{h.title}</h2>
                <div className={styles.assignmentMeta}>
                  <span>{h.subject} · {h.teacher_name}</span>
                  {h.due_date && <span>Son teslim: {formatDate(h.due_date)}</span>}
                </div>
                {h.description && <p className={styles.assignmentDescription}>{h.description}</p>}
                <AttachmentList attachments={h.attachments} />
                {h.file_url && <a href={h.file_url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>Bağlantıyı aç</a>}
              </div>
              {h.check && Icon ? (
                <p className={`${styles.statusChoice} ${STATUS_STYLE[h.check.status]} ${styles.statusResult}`}>
                  <Icon size={16} aria-hidden="true" />{STATUS_LABEL[h.check.status]}
                  {h.check.score != null && ` · ${h.check.score}/${h.points} puan`}
                  {h.check.note && ` · ${h.check.note}`}
                </p>
              ) : (
                <p className={styles.homeworkPending}>Öğretmen henüz kontrol etmedi.</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GradesPage({ grades, loaded }: { grades: MyGrade[]; loaded: boolean }) {
  const subjects = useMemo(() => Array.from(new Set(grades.map((g) => g.subject))), [grades]);
  if (loaded && !grades.length) return <p className={`${styles.panel} ${styles.mutedText}`}>Henüz not girilmedi.</p>;
  return (
    <section className={styles.panel}>
      <div className={styles.tableScroll}>
        <table className={styles.gradeTable}>
          <thead>
            <tr><th scope="col">Ders</th>{EXAMS.map((e) => <th key={e.id} scope="col">{e.label}</th>)}<th scope="col">Ort.</th></tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              const rows = grades.filter((g) => g.subject === subject);
              const avg = rows.reduce((a, g) => a + g.score, 0) / rows.length;
              return (
                <tr key={subject}>
                  <th scope="row"><span>{subject}</span></th>
                  {EXAMS.map((e) => <td key={e.id}>{rows.find((g) => g.exam === e.id)?.score ?? '—'}</td>)}
                  <td className={styles.gradeAvg}>{avg.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PointsPage({ me, points, loaded }: { me: MyStudent | null; points: MyPointRow[]; loaded: boolean }) {
  return (
    <div className={styles.pageBody}>
      <section className={`${styles.panel} ${styles.statRow}`}>
        <div><strong>{me?.points ?? '—'}</strong><span>Toplam puan</span></div>
        <div><strong>+{me?.plus_count ?? 0}</strong><span>Artı</span></div>
        <div><strong>−{me?.minus_count ?? 0}</strong><span>Eksi</span></div>
      </section>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Geçmiş</h2>
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

function RankingPage({ ranking, myId, className }: { ranking: ClassmateRank[]; myId: string; className: string }) {
  const ranks = useMemo(() => computeCompetitionRanks(ranking), [ranking]);
  const counts = useMemo(() => countTiers(ranking), [ranking]);

  return (
    <div className={styles.pageBody}>
      <div className={styles.pointsLayout}>
        <section className={styles.studentList} aria-label="Sınıf sıralaması">
          <div className={styles.listHeading}><h3>{className || 'Sınıf'}</h3><span>{ranking.length} öğrenci</span></div>
          {!ranking.length && <p className={`${styles.mutedText} ${styles.listPad}`}>Sıralama bilgisi yok.</p>}
          <ol className={styles.rankList}>
            {ranking.map((s, i) => {
              const tier = getPointTier(s.points);
              const rank = ranks[i];
              const rankBadge = getRankBadgeClass(rank, s.points);
              const podiumRow = getRankRowPodiumClass(rank, s.points);
              const formattedPoints = s.points > 0 ? `+${s.points}` : String(s.points);
              return (
                <li key={s.id} className={`${styles.rankRow} ${TIER_ROW_CLASS[tier]} ${podiumRow} ${s.id === myId ? styles.rankMe : ''}`}>
                  <span className={`${styles.rankNo} ${rankBadge}`}>{rank}</span>
                  <span className={`${styles.studentAvatar} ${TIER_CLASS[tier]}`} aria-hidden="true">{initialsOf(s.name)}</span>
                  <span className={styles.studentCardInfo}><strong>{s.name}{s.id === myId ? ' (siz)' : ''}</strong></span>
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

export function AnnouncementsList({ announcements, loaded }: { announcements: AnnouncementRow[]; loaded: boolean }) {
  return (
    <div className={styles.pageBody}>
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

/** Veli: ogr:<id> (veli olarak) · Öğrenci: soru:<id> (öğrenci olarak); ikisi de sınıf grubunu okur */
function FamilyMessagesPage({ me, asStudent }: { me: MyStudent; asStudent: boolean }) {
  const myRole = asStudent ? 'student' : 'parent';
  const directConv = asStudent ? questionConversationId(me.id) : studentConversationId(me.id);
  const groupConv = me.class_name ? classConversationId(me.school_id, me.class_name) : '';
  const convs = useMemo(() => [
    { id: directConv, title: asStudent ? 'Öğretmenlerim' : 'Öğretmenler', subtitle: asStudent ? 'Öğretmenlerine soru sor' : 'Öğrencinizin öğretmenleriyle birebir', canWrite: true },
    ...(groupConv ? [{ id: groupConv, title: `${me.class_name} sınıf grubu`, subtitle: 'Öğretmen duyuruları (yalnızca okunur)', canWrite: false }] : []),
  ], [directConv, groupConv, me.class_name, asStudent]);

  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const convIds = useMemo(() => convs.map((c) => c.id), [convs]);
  const { messages, error: msgError, live, refresh } = useLiveMessages(convIds);

  const thread = messages.filter((m) => m.conversation_id === active);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread.length, active]);
  const activeConv = convs.find((c) => c.id === active);

  // Açık konuşmadaki öğretmen mesajlarını okundu yap
  const hasUnreadInThread = thread.some((m) => !isFamilyRole(m.sender_role) && !m.is_read);
  useEffect(() => {
    if (active && hasUnreadInThread) markConversationRead(active, 'family');
  }, [active, hasUnreadInThread]);

  const open = (id: string) => setActive(id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setBusy(true);
    const res = await sendMessage(active, text);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Mesaj gönderilemedi: ${res.error}` });
      return;
    }
    setText('');
    refresh();
  };

  if (activeConv) {
    return (
      <div className={styles.pageBody}>
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <section className={styles.chatPanel} aria-label={activeConv.title}>
          <div className={styles.chatHeader}>
            <button type="button" className={styles.backButton} onClick={() => setActive(null)}><ArrowLeft size={20} aria-hidden="true" /><span>Konuşmalar</span></button>
            <div><strong>{activeConv.title}</strong><span>{activeConv.subtitle}</span></div>
            <LiveBadge live={live} />
          </div>
          <div className={styles.chatThread}>
            {!thread.length && <p className={styles.mutedText}>Henüz mesaj yok.</p>}
            {thread.map((m) => {
              const mine = m.sender_role === myRole;
              return (
                <div key={m.id} className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}>
                  {!mine && <strong>{m.sender_name}</strong>}
                  <p>{m.content}</p>
                  <span>{formatDateTime(m.created_at)}{mine ? (m.is_read ? ' · Okundu' : ' · İletildi') : ''}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {activeConv.canWrite ? (
            <form className={styles.chatComposer} onSubmit={handleSend}>
              <label className={styles.visuallyHidden} htmlFor="parent-chat-input">Mesaj</label>
              <textarea id="parent-chat-input" value={text} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={2} placeholder={asStudent ? 'Sorunu yaz' : 'Öğretmene yazın'} />
              <button type="submit" className={styles.primary} disabled={busy || !text.trim()} aria-label="Gönder"><Send size={18} aria-hidden="true" /></button>
            </form>
          ) : (
            <p className={`${styles.mutedText} ${styles.listPad}`}>Bu grup yalnızca öğretmen duyuruları içindir.</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className={styles.panel}>
        <div className={styles.listToolbar}><h2 className={styles.panelTitle}>Konuşmalar</h2><LiveBadge live={live} /></div>
        {msgError && <p className={styles.noticeError}>Mesajlar alınamadı: {msgError}</p>}
        <ul className={styles.convList}>
          {convs.map((c) => {
            const list = messages.filter((m) => m.conversation_id === c.id);
            const last = list[list.length - 1];
            const unread = list.filter((m) => !isFamilyRole(m.sender_role) && !m.is_read).length;
            return (
              <li key={c.id}>
                <button type="button" className={styles.convItem} onClick={() => open(c.id)}>
                  <span className={styles.studentAvatar} aria-hidden="true">{c.canWrite ? <MessageSquare size={18} /> : <Users size={18} />}</span>
                  <span className={styles.studentCardInfo}><strong>{c.title}</strong><span>{last ? `${last.sender_name}: ${last.content}` : c.subtitle}</span></span>
                  {unread > 0 && <span className={styles.pageCardBadge}>{unread}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
