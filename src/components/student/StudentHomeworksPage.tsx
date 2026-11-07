'use client';

import React, { useState } from 'react';
import { Check, Minus, X } from '../icons';
import { MyHomework } from '../../lib/studentData';
import type { SubmissionRow } from '../../lib/teacherData';
import { StudentSubmission } from './StudentSubmission';
import { QuizPlayer } from '../quiz/QuizPlayer';
import { StudentBoardPlayer } from '../board/StudentBoardPlayer';
import { QUIZ_MODE_LABEL } from '../../lib/quizData';
import q from '../quiz/Quiz.module.css';
import { AttachmentList, formatDate } from '../teacher/TeacherUi';
import { Spinner } from '../Spinner';
import styles from '../teacher/TeacherDashboard.module.css';
import s from './StudentPortal.module.css';

const STATUS_LABEL = { yapti: 'Yaptı', kismen: 'Kısmen', yapmadi: 'Yapmadı' } as const;
const STATUS_STYLE = { yapti: styles.done, kismen: styles.partial, yapmadi: styles.missing } as const;
const STATUS_ICON = { yapti: Check, kismen: Minus, yapmadi: X } as const;

type Filter = 'pending' | 'checked' | 'all';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Teslim tarihine kalan gün: negatif = gecikmiş */
export function daysUntil(due: string | null): number | null {
  if (!due) return null;
  return Math.round((startOfDay(new Date(due)) - startOfDay(new Date())) / DAY);
}

const hm = (time?: string | null) => (time ? time.slice(0, 5) : '');

/** "Bugün · 15:30", "Yarın teslim", "3 gün kaldı", "2 gün gecikti" */
export function DueLabel({ due, time }: { due: string | null; time?: string | null }) {
  const d = daysUntil(due);
  if (d === null) return null;
  const text = d < 0 ? `${-d} gün gecikti`
    : d === 0 ? (time ? `Bugün · ${hm(time)}` : 'Bugün teslim')
    : d === 1 ? (time ? `Yarın · ${hm(time)}` : 'Yarın teslim')
    : `${d} gün kaldı`;
  const tone = d < 0 ? s.dueLate : d <= 1 ? s.dueSoon : s.dueLater;
  return <span className={`${s.dueLabel} ${tone}`}>{text}</span>;
}

/** Bekleyenler teslim tarihine göre (tarihsizler sonda), kontrol edilenler en yeni üstte */
export function sortPending(list: MyHomework[]) {
  return [...list].sort((a, b) => {
    if (!a.due_date && !b.due_date) return b.created_at.localeCompare(a.created_at);
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    // Aynı gün içinde saati olan önce (saatsiz = gün sonu)
    return a.due_date.localeCompare(b.due_date) || (a.due_time || '23:59').localeCompare(b.due_time || '23:59');
  });
}

export function StudentHomeworksPage({ homeworks, loaded, studentId, onSubmissionChange, onQuizChange, primaryClass }: {
  homeworks: MyHomework[];
  loaded: boolean;
  studentId: string;
  /** Öğrencinin ana şubesi: başka bir gruptan gelen ödevde grubun adı gösterilir */
  primaryClass?: string | null;
  onSubmissionChange: (homeworkId: string, submission: SubmissionRow) => void;
  /** Quiz çözüldü/bitirildi: liste yenilenir */
  onQuizChange?: () => void;
}) {
  const [playing, setPlaying] = useState<MyHomework | null>(null);
  const [boardOf, setBoardOf] = useState<MyHomework | null>(null);
  const [now] = useState(() => Date.now());
  const pending = sortPending(homeworks.filter((h) => !h.check));
  const checked = homeworks.filter((h) => h.check);
  // Seçim yapılmadıysa: bekleyen ödev varsa "Bekleyen", yoksa "Tümü"
  const [chosen, setFilter] = useState<Filter | null>(null);
  const filter: Filter = chosen ?? (pending.length ? 'pending' : 'all');

  if (!loaded) return <Spinner center label="Ödevler yükleniyor…" />;
  if (!homeworks.length) return <p className={`${styles.panel} ${styles.mutedText}`}>Sınıfına henüz ödev verilmedi.</p>;

  const list = filter === 'pending' ? pending : filter === 'checked' ? checked : [...pending, ...checked];
  const tabs: [Filter, string, number][] = [['pending', 'Bekleyen', pending.length], ['checked', 'Kontrol edilen', checked.length], ['all', 'Tümü', homeworks.length]];

  return (
    <div className={styles.pageBody}>
      <div className={s.tabs} role="group" aria-label="Ödev filtresi">
        {tabs.map(([id, label, count]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}<span className={s.tabCount}>{count}</span>
          </button>
        ))}
      </div>

      {!list.length && (
        <p className={`${styles.panel} ${styles.mutedText}`}>
          {filter === 'pending' ? 'Bekleyen ödevin yok. Tebrikler!' : 'Henüz kontrol edilen ödev yok.'}
        </p>
      )}

      <ul className={styles.studentHomeworkList}>
        {list.map((h) => {
          const Icon = h.check ? STATUS_ICON[h.check.status] : null;
          return (
            <li key={h.id} className={`${styles.panel} ${styles.studentHomeworkCard}`}>
              <div className={styles.assignmentContent}>
                <div className={s.homeworkHead}>
                  <h2 className={styles.assignmentTitle}>{h.title}</h2>
                  {!h.check && h.submission?.status !== 'teslim' && <DueLabel due={h.due_date} time={h.due_time} />}
                </div>
                <div className={styles.assignmentMeta}>
                  <span>{h.subject} · {h.teacher_name}{h.class_name && primaryClass && h.class_name !== primaryClass ? ` · ${h.class_name} grubu` : ''}</span>
                  {h.due_date && <span>Son teslim: {formatDate(h.due_date)}{h.due_time ? ` · ${hm(h.due_time)}` : ''}</span>}
                </div>
                {h.description && <p className={styles.assignmentDescription}>{h.description}</p>}
                <AttachmentList attachments={h.attachments} />
                {h.file_url && <a href={h.file_url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>Bağlantıyı aç</a>}
              </div>
              {h.accepts_submissions && <StudentSubmission homework={h} studentId={studentId} onChange={onSubmissionChange} />}
              {h.has_board && (
                <div className={q.quizCardRow}>
                  <button type="button" className={styles.primary} onClick={() => setBoardOf(h)}>Tahtayı aç</button>
                  <span className={q.quizCardInfo}>Etkileşimli tahta · üzerine çizerek çöz{h.quiz_mode ? ` · Mini Test${h.quiz?.total ? ` (${h.quiz.answered}/${h.quiz.total})` : ''}` : ''}</span>
                </div>
              )}
              {h.quiz_mode && !h.has_board && <QuizCardRow homework={h} onOpen={() => setPlaying(h)} />}
              {h.check && Icon ? (
                <p className={`${styles.statusChoice} ${STATUS_STYLE[h.check.status]} ${styles.statusResult}`}>
                  <Icon size={16} aria-hidden="true" />{STATUS_LABEL[h.check.status]}
                  {h.check.score != null && ` · ${h.check.score}/${h.points} puan`}
                  {h.check.note && ` · ${h.check.note}`}
                </p>
              ) : (
                <p className={styles.homeworkPending}>
                  {h.has_board && !h.quiz_mode ? 'Tahtadaki çalışmanı öğretmenin inceleyecek.'
                    : h.quiz_mode === 'exam' && h.quiz?.finished ? 'Teslim ettin; sonuç teslim tarihi geçince açıklanacak.'
                    : h.quiz_mode && !h.quiz?.finished ? 'Quiz bitince sonuç buraya işlenir.'
                    : !h.results_released ? 'Sonuç daha sonra açıklanacak.'
                    : h.submission?.status === 'teslim' ? 'Teslim ettin; öğretmen henüz kontrol etmedi.'
                    : 'Öğretmen henüz kontrol etmedi.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {boardOf && (
        <StudentBoardPlayer
          homeworkId={boardOf.id}
          title={boardOf.title}
          studentId={studentId}
          open={!boardOf.closed_at && (!boardOf.due_at || new Date(boardOf.due_at).getTime() > now)}
          onClose={(changed) => { setBoardOf(null); if (changed) onQuizChange?.(); }}
        />
      )}
      {playing && (
        <QuizPlayer
          homeworkId={playing.id}
          title={playing.title}
          onClose={(changed) => { setPlaying(null); if (changed) onQuizChange?.(); }}
        />
      )}
    </div>
  );
}

/** Ödev kartında quiz satırı: durum + başla / devam et / sonucu gör */
function QuizCardRow({ homework, onOpen }: { homework: MyHomework; onOpen: () => void }) {
  const s = homework.quiz;
  const [now] = useState(() => Date.now());
  const open = !homework.closed_at && (!homework.due_at || new Date(homework.due_at).getTime() > now);
  const mode = homework.quiz_mode!;
  const started = !!s && s.answered > 0;
  const label = s?.finished || !open ? (s?.percent != null ? 'Sonucu gör' : mode === 'exam' && s?.finished ? 'Cevaplarımı gör' : 'Quizi aç')
    : started ? 'Devam et' : 'Quize başla';
  const info = [
    `${QUIZ_MODE_LABEL[mode]} · ${s?.total ?? 0} soru`,
    s?.finished ? (s.percent != null ? `Sonuç: %${s.percent}` : 'Teslim edildi') : started ? `${s!.answered} soru cevaplandı` : '',
    !open && !s?.finished ? 'Süre doldu' : '',
  ].filter(Boolean).join(' · ');
  return (
    <div className={q.quizCardRow}>
      <button type="button" className={styles.primary} onClick={onOpen}>{label}</button>
      <span className={q.quizCardInfo}>{info}</span>
    </div>
  );
}
