'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from '../icons';
import { useDialog } from '../ConfirmDialog';
import { playAlarm } from '../teacher/classtools/Countdown';
import { revealAnswer, WidgetEl } from '../../lib/boardData';
import { answerQuiz, CHOICE_LETTERS, PRACTICE_TRIES, PracticeAnswerResult, QuestionRow, QuizStateItem } from '../../lib/quizData';
import styles from './Board.module.css';

/**
 * Parçaların çalıştığı bağlam:
 * - teacher: öğretmenin kendi tahtası (düzenleme/sunum) — sorular bankadan, cevap anahtarı öğretmende
 * - student: ödevdeki tahta — sorular ve dönüt yalnızca sunucudan (doğru cevap tarayıcıya gelmez)
 * - review: öğretmen öğrencinin tahtasına bakıyor — doğru cevap quiz sorusundan
 */
export interface WidgetContext {
  mode: 'teacher' | 'student' | 'review';
  questions?: Map<string, QuestionRow>;
  items?: Map<string, QuizStateItem>;
  /** review: quiz sorularının doğru cevabı */
  reviewKeys?: Map<string, { body: string; choices: string[]; correct_index: number }>;
  homeworkId?: string;
  onItem?: (itemId: string, patch: Partial<QuizStateItem>) => void;
  allWidgets: Map<string, WidgetEl>;
  /** Öğrencinin ödevi kapandıysa */
  locked?: boolean;
}

export function WidgetView({ el, ctx }: { el: WidgetEl; ctx: WidgetContext }) {
  if (el.kind === 'minitest') return <MiniTest el={el} ctx={ctx} />;
  if (el.kind === 'reveal') return <Reveal el={el} ctx={ctx} />;
  if (el.kind === 'steps') return <Steps el={el} />;
  return <Timer el={el} />;
}

// --------------------------------------------------------
// Mini Test
// --------------------------------------------------------
function MiniTest({ el, ctx }: { el: WidgetEl; ctx: WidgetContext }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (ctx.mode === 'teacher' || ctx.mode === 'review') {
    const q = ctx.mode === 'teacher'
      ? (el.data.questionId ? ctx.questions?.get(el.data.questionId) : undefined)
      : (el.data.itemId ? ctx.reviewKeys?.get(el.data.itemId) : undefined);
    if (!q) return <div className={styles.widget}><p className={styles.widgetTitle}>Mini Test</p><p className={styles.widgetNote}>{ctx.mode === 'teacher' ? 'Soru seçilmedi. Parçayı seçip sağdaki panelden bankadan soru seçin.' : 'Soru bulunamadı.'}</p></div>;
    const review = ctx.mode === 'review';
    return (
      <div className={styles.widget}>
        <p className={styles.widgetTitle}>Mini Test</p>
        <p className={styles.widgetText}>{q.body}</p>
        <ul className={styles.widgetChoices}>
          {q.choices.map((c, i) => {
            const show = review || picked != null;
            const cls = show && i === q.correct_index ? styles.choiceOk : picked === i && i !== q.correct_index ? styles.choiceBad : '';
            return (
              <li key={i}>
                <button type="button" className={`${styles.widgetChoice} ${cls}`} onClick={() => setPicked(i)} disabled={review}>
                  <b>{CHOICE_LETTERS[i]}</b><span>{c}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {picked != null && !review && (
          <div className={styles.widgetRow}>
            <p className={`${styles.widgetFeedback} ${picked === q.correct_index ? styles.fbOk : styles.fbBad}`}>{picked === q.correct_index ? 'Doğru!' : `Yanlış. Doğru cevap: ${CHOICE_LETTERS[q.correct_index]}`}</p>
            <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={() => setPicked(null)}>Sıfırla</button>
          </div>
        )}
      </div>
    );
  }

  // Öğrenci: değerlendirme sunucuda
  const item = el.data.itemId ? ctx.items?.get(el.data.itemId) : undefined;
  if (!item) return <div className={styles.widget}><p className={styles.widgetTitle}>Mini Test</p><p className={styles.widgetNote}>Soru yükleniyor…</p></div>;
  const tried = [...wrong, ...(!item.resolved && item.tries > 0 && item.choice != null ? [item.choice] : [])];
  const choose = async (i: number) => {
    if (!ctx.homeworkId || busy) return;
    setBusy(true);
    setMsg(null);
    const res = await answerQuiz(ctx.homeworkId, item.id, i);
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: res.error }); return; }
    const r = res.data as PracticeAnswerResult;
    ctx.onItem?.(item.id, { choice: i, tries: r.tries, resolved: r.resolved, correct: r.resolved ? r.correct : null, correct_index: r.correct_index, explanation: r.explanation, points: r.points });
    if (!r.correct) setWrong((w) => [...w, i]);
    setMsg(r.correct ? { ok: true, text: r.tries === 1 ? 'Doğru! Tam puan.' : `Doğru! ${r.tries}. denemede.` }
      : r.resolved ? { ok: false, text: 'Yanlış. Deneme hakkın bitti.' } : { ok: false, text: `Yanlış. ${PRACTICE_TRIES - r.tries} hakkın kaldı.` });
  };
  return (
    <div className={styles.widget}>
      <p className={styles.widgetTitle}>Mini Test{!item.resolved && ` · ${PRACTICE_TRIES - item.tries} hak`}</p>
      <p className={styles.widgetText}>{item.body}</p>
      <ul className={styles.widgetChoices}>
        {item.choices.map((c, i) => {
          const cls = item.correct_index != null ? (i === item.correct_index ? styles.choiceOk : tried.includes(i) || (item.choice === i) ? styles.choiceBad : '') : tried.includes(i) ? styles.choiceBad : '';
          return (
            <li key={i}>
              <button type="button" className={`${styles.widgetChoice} ${cls}`} onClick={() => choose(i)} disabled={busy || item.resolved || ctx.locked || tried.includes(i)}>
                <b>{CHOICE_LETTERS[i]}</b><span>{c}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p className={`${styles.widgetFeedback} ${msg.ok ? styles.fbOk : styles.fbBad}`} role="status">{msg.text}</p>}
      {item.explanation && item.correct_index != null && <p className={styles.widgetNote}><b>Çözüm:</b> {item.explanation}</p>}
    </div>
  );
}

// --------------------------------------------------------
// Cevabı Göster
// --------------------------------------------------------
function Reveal({ el, ctx }: { el: WidgetEl; ctx: WidgetContext }) {
  const { confirm } = useDialog();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = el.data.targetId ? ctx.allWidgets.get(el.data.targetId) : undefined;

  if (!target || target.kind !== 'minitest') {
    return <div className={styles.widget}><p className={styles.widgetTitle}>Cevabı Göster</p><p className={styles.widgetNote}>Bağlı Mini Test yok. Parçayı seçip sağdaki panelden bir Mini Test seçin.</p></div>;
  }

  if (ctx.mode !== 'student') {
    const q = ctx.mode === 'teacher'
      ? (target.data.questionId ? ctx.questions?.get(target.data.questionId) : undefined)
      : (target.data.itemId ? ctx.reviewKeys?.get(target.data.itemId) : undefined);
    return (
      <div className={styles.widget}>
        <p className={styles.widgetTitle}>Cevabı Göster</p>
        {shown && q ? <p className={styles.widgetText}><b>Doğru cevap: {CHOICE_LETTERS[q.correct_index]}</b> · {q.choices[q.correct_index]}</p> : (
          <button type="button" className={styles.widgetButton} onClick={() => setShown(true)} disabled={!q}>Cevabı göster</button>
        )}
        {shown && <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={() => setShown(false)}>Gizle</button>}
      </div>
    );
  }

  const item = target.data.itemId ? ctx.items?.get(target.data.itemId) : undefined;
  const reveal = async () => {
    if (!item || !ctx.homeworkId) return;
    const ok = item.resolved || await confirm({
      title: 'Cevabı göster', message: 'Cevabı görürsen bu sorudan puan alamazsın. Gösterilsin mi?', confirmText: 'Göster', cancelText: 'Vazgeç', variant: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await revealAnswer(ctx.homeworkId, item.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    ctx.onItem?.(item.id, { correct_index: res.data.correct_index, explanation: res.data.explanation, resolved: true, tries: item.correct ? item.tries : PRACTICE_TRIES });
  };
  return (
    <div className={styles.widget}>
      <p className={styles.widgetTitle}>Cevabı Göster</p>
      {item?.correct_index != null ? (
        <p className={styles.widgetText}><b>Doğru cevap: {CHOICE_LETTERS[item.correct_index]}</b> · {item.choices[item.correct_index]}</p>
      ) : (
        <button type="button" className={styles.widgetButton} onClick={reveal} disabled={busy || !item || ctx.locked}>{busy ? 'Açılıyor…' : 'Cevabı göster'}</button>
      )}
      {error && <p className={`${styles.widgetFeedback} ${styles.fbBad}`} role="alert">{error}</p>}
    </div>
  );
}

// --------------------------------------------------------
// Adım Adım
// --------------------------------------------------------
function Steps({ el }: { el: WidgetEl }) {
  const steps = (el.data.steps || []).filter((s) => s.trim());
  const [open, setOpen] = useState(0);
  return (
    <div className={styles.widget}>
      <p className={styles.widgetTitle}>{el.data.title?.trim() || 'Adım adım çözüm'}</p>
      {steps.length === 0 ? <p className={styles.widgetNote}>Adım eklenmedi.</p> : (
        <ol className={styles.stepList}>
          {steps.map((s, i) => (
            <li key={i} className={i < open ? undefined : styles.stepHidden} aria-hidden={i >= open || undefined}>
              {i < open ? s : `${i + 1}. adım gizli`}
            </li>
          ))}
        </ol>
      )}
      <div className={styles.widgetRow}>
        <button type="button" className={styles.widgetButton} onClick={() => setOpen((n) => Math.min(steps.length, n + 1))} disabled={open >= steps.length}>
          {open === 0 ? 'İlk adımı göster' : open >= steps.length ? 'Bütün adımlar açık' : 'Sonraki adım'}
        </button>
        {open > 0 && <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={() => setOpen(0)}>Başa al</button>}
      </div>
    </div>
  );
}

// --------------------------------------------------------
// Kronometre (0 sn = ileri sayım, değilse geri sayım)
// --------------------------------------------------------
function Timer({ el }: { el: WidgetEl }) {
  const total = Math.max(0, Math.round(el.data.seconds || 0));
  const countdown = total > 0;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const base = useRef(0);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      const e = base.current + (Date.now() - startedAt.current) / 1000;
      if (countdown && e >= total) {
        setElapsed(total);
        setRunning(false);
        playAlarm(audio.current);
        return;
      }
      setElapsed(e);
    }, 200);
    return () => window.clearInterval(t);
  }, [running, countdown, total]);
  useEffect(() => () => { audio.current?.close().catch(() => {}); }, []);

  const toggle = () => {
    if (running) { base.current = elapsed; setRunning(false); return; }
    if (countdown && elapsed >= total) { base.current = 0; setElapsed(0); }
    if (!audio.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audio.current = new Ctor();
    }
    startedAt.current = Date.now();
    setRunning(true);
  };
  const reset = () => { setRunning(false); base.current = 0; setElapsed(0); };
  const shownSec = countdown ? Math.max(0, Math.ceil(total - elapsed)) : Math.floor(elapsed);
  const mm = Math.floor(shownSec / 60), ss = shownSec % 60;
  return (
    <div className={styles.widget} style={{ justifyContent: 'center' }}>
      <p className={styles.widgetTitle}>{countdown ? 'Geri sayım' : 'Kronometre'}</p>
      <p className={`${styles.timerValue} ${countdown && shownSec <= 10 && running ? styles.timerSoon : ''}`} role="timer" aria-live="off">{mm}:{String(ss).padStart(2, '0')}</p>
      <div className={styles.widgetRow} style={{ justifyContent: 'center' }}>
        <button type="button" className={styles.widgetButton} onClick={toggle} aria-label={running ? 'Duraklat' : 'Başlat'}>
          {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={reset} aria-label="Sıfırla"><RotateCcw size={18} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
