'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from '../icons';
import { useDialog } from '../ConfirmDialog';
import { playAlarm } from '../teacher/classtools/Countdown';
import { imageKey, revealAnswer, videoEmbedUrl, WidgetEl } from '../../lib/boardData';
import { answerQuiz, CHOICE_LETTERS, PRACTICE_TRIES, PracticeAnswerResult, QuestionRow, QuizStateItem } from '../../lib/quizData';
import { RichText } from '../math/RichText';
import { DiceWidget, SpinnerWidget } from './ChanceWidgets';
import { BlanksWidget, FractionWidget, LabelWidget, OrderWidget, SortWidget } from './ActivityWidgets';
import { BarChartWidget, NumGridWidget, TallyWidget } from './DataWidgets';
import { ClockWidget } from './ClockWidget';
import { GraphWidget } from './GraphWidget';
import styles from './Board.module.css';
import videoStyles from './VideoWidget.module.css';

/**
 * Parçaların çalıştığı bağlam:
 * - teacher: öğretmenin kendi tahtası (düzenleme/sunum) — sorular bankadan, cevap anahtarı öğretmende
 * - student: ödevdeki tahta — sorular ve dönüt yalnızca sunucudan (doğru cevap tarayıcıya gelmez)
 * - review: öğretmen öğrencinin tahtasına bakıyor — doğru cevap quiz sorusundan
 */
export interface WidgetContext {
  /** live: canlı derste öğrenci (sorular bankadan gelmez; Mini Test'i öğretmen canlı açar) */
  mode: 'teacher' | 'student' | 'review' | 'live';
  /** Sesli not adresleri: "bucket/yol" → süreli adres */
  mediaUrls?: Record<string, string>;
  questions?: Map<string, QuestionRow>;
  items?: Map<string, QuizStateItem>;
  /** review: quiz sorularının doğru cevabı */
  reviewKeys?: Map<string, { body: string; choices: string[]; correct_index: number }>;
  homeworkId?: string;
  onItem?: (itemId: string, patch: Partial<QuizStateItem>) => void;
  allWidgets: Map<string, WidgetEl>;
  /** Öğrencinin ödevi kapandıysa */
  locked?: boolean;
  /** Sun kipi ve ortak adım durumu: widget kimliği → açık adım sayısı */
  stepState?: {
    get: (id: string) => number;
    set: (id: string, n: number) => void;
  };
}

export function WidgetView({ el, ctx }: { el: WidgetEl; ctx: WidgetContext }) {
  if (ctx.mode === 'live' && (el.kind === 'minitest' || el.kind === 'reveal')) {
    return <div className={styles.widget}><p className={styles.widgetTitle}>{el.kind === 'minitest' ? 'Mini Test' : 'Cevabı Göster'}</p><p className={styles.widgetNote}>Öğretmen soruyu açınca ekranında görünecek.</p></div>;
  }
  if (el.kind === 'minitest') return <MiniTest el={el} ctx={ctx} />;
  if (el.kind === 'reveal') return <Reveal el={el} ctx={ctx} />;
  if (el.kind === 'steps') return <Steps el={el} ctx={ctx} />;
  if (el.kind === 'match') return <Match el={el} />;
  if (el.kind === 'audio') return <AudioNote el={el} ctx={ctx} />;
  if (el.kind === 'video') return <VideoWidget el={el} />;
  if (el.kind === 'spinner') return <SpinnerWidget el={el} />;
  if (el.kind === 'dice') return <DiceWidget el={el} />;
  if (el.kind === 'order') return <OrderWidget el={el} />;
  if (el.kind === 'sort') return <SortWidget el={el} />;
  if (el.kind === 'blanks') return <BlanksWidget el={el} />;
  if (el.kind === 'label') return <LabelWidget el={el} mediaUrls={ctx.mediaUrls} />;
  if (el.kind === 'fraction') return <FractionWidget el={el} />;
  if (el.kind === 'graph') return <GraphWidget el={el} />;
  if (el.kind === 'bar') return <BarChartWidget el={el} />;
  if (el.kind === 'tally') return <TallyWidget el={el} />;
  if (el.kind === 'numgrid') return <NumGridWidget el={el} />;
  if (el.kind === 'clock') return <ClockWidget el={el} />;
  return <Timer el={el} />;
}

// --------------------------------------------------------
// Mini Test
// --------------------------------------------------------
function MiniTest({ el, ctx }: { el: WidgetEl; ctx: WidgetContext }) {
  const { confirm } = useDialog();
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
        <p className={styles.widgetText}><RichText text={q.body} inline /></p>
        <ul className={styles.widgetChoices}>
          {q.choices.map((c, i) => {
            const show = review || picked != null;
            const cls = show && i === q.correct_index ? styles.choiceOk : picked === i && i !== q.correct_index ? styles.choiceBad : '';
            return (
              <li key={i}>
                <button type="button" className={`${styles.widgetChoice} ${cls}`} onClick={() => setPicked(i)} disabled={review}>
                  <b>{CHOICE_LETTERS[i]}</b><span><RichText text={c} inline /></span>
                </button>
              </li>
            );
          })}
        </ul>
        {ctx.mode === 'teacher' && el.data.allowReveal && <p className={styles.widgetNote}>Öğrenci ödevde &quot;Cevabı göster&quot; düğmesini görecek.</p>}
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
  const reveal = async () => {
    if (!ctx.homeworkId || busy) return;
    const ok = await confirm({
      title: 'Cevabı göster', message: 'Cevabı görürsen bu sorudan puan alamazsın. Gösterilsin mi?', confirmText: 'Göster', cancelText: 'Vazgeç', variant: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    const res = await revealAnswer(ctx.homeworkId, item.id);
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: res.error }); return; }
    ctx.onItem?.(item.id, { correct_index: res.data.correct_index, explanation: res.data.explanation, resolved: true, tries: PRACTICE_TRIES });
  };
  return (
    <div className={styles.widget}>
      <p className={styles.widgetTitle}>Mini Test{!item.resolved && ` · ${PRACTICE_TRIES - item.tries} hak`}</p>
      <p className={styles.widgetText}><RichText text={item.body} inline /></p>
      <ul className={styles.widgetChoices}>
        {item.choices.map((c, i) => {
          const cls = item.correct_index != null ? (i === item.correct_index ? styles.choiceOk : tried.includes(i) || (item.choice === i) ? styles.choiceBad : '') : tried.includes(i) ? styles.choiceBad : '';
          return (
            <li key={i}>
              <button type="button" className={`${styles.widgetChoice} ${cls}`} onClick={() => choose(i)} disabled={busy || item.resolved || ctx.locked || tried.includes(i)}>
                <b>{CHOICE_LETTERS[i]}</b><span><RichText text={c} inline /></span>
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p className={`${styles.widgetFeedback} ${msg.ok ? styles.fbOk : styles.fbBad}`} role="status">{msg.text}</p>}
      {el.data.allowReveal && !item.resolved && item.correct_index == null && (
        <div className={styles.widgetRow}>
          <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={reveal} disabled={busy || ctx.locked}>{busy ? 'Açılıyor…' : 'Cevabı göster'}</button>
        </div>
      )}
      {item.explanation && item.correct_index != null && <p className={styles.widgetNote}><b>Çözüm:</b> <RichText text={item.explanation} inline /></p>}
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
        <p className={styles.widgetText}><b>Doğru cevap: {CHOICE_LETTERS[item.correct_index]}</b> · <RichText text={item.choices[item.correct_index]} inline /></p>
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
function Steps({ el, ctx }: { el: WidgetEl; ctx?: WidgetContext }) {
  const steps = (el.data.steps || []).filter((s) => s.trim());
  const title = el.data.title?.trim() || 'Adım adım';
  const lastIsResult = Boolean(el.data.lastIsResult);

  const [localOpen, setLocalOpen] = useState(0);
  const hasExternalState = Boolean(ctx?.stepState);
  const open = hasExternalState && ctx?.stepState
    ? Math.min(steps.length, ctx.stepState.get(el.id))
    : Math.min(steps.length, localOpen);

  const setOpenCount = (n: number) => {
    const clamped = Math.max(0, Math.min(steps.length, n));
    if (hasExternalState && ctx?.stepState) {
      ctx.stepState.set(el.id, clamped);
    } else {
      setLocalOpen(clamped);
    }
  };

  const lastOpenedRef = useRef<HTMLLIElement | null>(null);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open > prevOpenRef.current && lastOpenedRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lastOpenedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
    prevOpenRef.current = open;
  }, [open]);

  const percent = steps.length > 0 ? (open / steps.length) * 100 : 0;

  return (
    <div className={styles.widget}>
      <div className={styles.stepsHeader}>
        <p className={styles.widgetTitle}>{title}</p>
        {steps.length > 0 && (
          <span className={styles.stepsCounter}>{open} / {steps.length}</span>
        )}
      </div>

      {steps.length > 0 && (
        <div
          className={styles.stepsProgressTrack}
          role="progressbar"
          aria-valuenow={open}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuetext={`${open} / ${steps.length} adım`}
        >
          <div className={styles.stepsProgressBar} style={{ width: `${percent}%` }} />
        </div>
      )}

      {steps.length === 0 ? (
        <p className={styles.widgetNote}>Adım eklenmedi.</p>
      ) : (
        <ol className={styles.timeline}>
          {steps.map((text, i) => {
            const isOpen = i < open;
            const isLatest = isOpen && i === open - 1;
            const isResult = lastIsResult && i === steps.length - 1;

            return (
              <li
                key={i}
                ref={(node) => {
                  if (isLatest) lastOpenedRef.current = node;
                }}
                className={styles.timelineItem}
              >
                <div className={styles.timelineGutter}>
                  <button
                    type="button"
                    className={`${styles.timelineBadge} ${
                      isOpen
                        ? isResult
                          ? styles.badgeResult
                          : styles.badgeOpen
                        : isResult
                          ? styles.badgeResultHidden
                          : styles.badgeHidden
                    }`}
                    onClick={() => setOpenCount(i + 1)}
                    aria-label={`${i + 1}. adım${isResult ? ' (Sonuç)' : ''}, ${isOpen ? 'açık' : 'gizli'}`}
                  >
                    {i + 1}
                  </button>
                  {i < steps.length - 1 && <span className={styles.timelineLine} aria-hidden="true" />}
                </div>

                <div
                  className={`${styles.stepContent} ${
                    isOpen
                      ? `${styles.stepCardOpen} ${isLatest ? styles.stepCardLatest : ''} ${isResult ? styles.stepCardResult : ''}`
                      : `${styles.stepCardHidden} ${isResult ? styles.stepCardHiddenResult : ''}`
                  }`}
                >
                  {isOpen ? (
                    <>
                      {isResult && <span className={styles.resultTag}>Sonuç</span>}
                      <span><RichText text={text} inline /></span>
                    </>
                  ) : isResult ? (
                    <span className={styles.resultTagMuted}>Sonuç</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {steps.length > 0 && (
        <div className={styles.stepsFooter}>
          <button
            type="button"
            className={`${styles.widgetButton} ${styles.secondary} ${styles.stepNavIconBtn}`}
            onClick={() => setOpenCount(open - 1)}
            disabled={open === 0}
            aria-label="Önceki adım"
            title="Önceki adım"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`${styles.widgetButton} ${styles.stepNavBtn}`}
            onClick={() => setOpenCount(open + 1)}
            disabled={open >= steps.length}
          >
            <span>{open === 0 ? 'İlk adımı göster' : 'Sonraki'}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`${styles.widgetButton} ${styles.secondary} ${styles.stepNavBtn}`}
            onClick={() => setOpenCount(steps.length)}
            disabled={open >= steps.length}
          >
            Tümünü aç
          </button>

          <button
            type="button"
            className={`${styles.widgetButton} ${styles.secondary} ${styles.stepNavBtn}`}
            onClick={() => setOpenCount(0)}
            disabled={open === 0}
          >
            Başa al
          </button>
        </div>
      )}
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

// --------------------------------------------------------
// Eşleştirme: sağdaki kartlar sürüklenip (ya da dokunup) soldaki eşinin yanına bırakılır.
// Sonuç yalnızca ekranda gösterilir; puan verilmez (cevaplar tahta içeriğinde durur).
// --------------------------------------------------------
/** Kimliğe bağlı sabit karıştırma: her açılışta aynı sıra; kartlar asıl sırasında kalmaz */
function seededOrder(n: number, seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  if (n > 1 && order.every((v, i) => v === i)) order.push(order.shift()!);
  return order;
}

function Match({ el }: { el: WidgetEl }) {
  const pairs = useMemo(() => (el.data.pairs || []).filter((p) => p.a.trim() && p.b.trim()), [el.data.pairs]);
  const order = useMemo(() => seededOrder(pairs.length, el.id), [pairs.length, el.id]);
  // Sol satır → bırakılan kartın (sağ öğenin) asıl sırası
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [drag, setDrag] = useState<{ card: number; dx: number; dy: number } | null>(null);
  const start = useRef<{ x: number; y: number; scale: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  if (pairs.length < 2) {
    return <div className={styles.widget}><p className={styles.widgetTitle}>{el.data.title?.trim() || 'Eşleştirme'}</p><p className={styles.widgetNote}>En az iki çift gerekli. Parçayı seçip sağdaki panelden çiftleri yazın.</p></div>;
  }

  const usedCards = new Set(Object.values(placed));
  const place = (slot: number, card: number) => {
    setChecked(false);
    setPlaced((prev) => {
      const next: Record<number, number> = {};
      Object.entries(prev).forEach(([k, v]) => { if (v !== card && Number(k) !== slot) next[Number(k)] = v; });
      next[slot] = card;
      return next;
    });
    setPicked(null);
  };
  const unplace = (slot: number) => {
    setChecked(false);
    setPlaced((prev) => { const next = { ...prev }; delete next[slot]; return next; });
  };

  const onCardDown = (card: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const t = e.currentTarget;
    const r = t.getBoundingClientRect();
    start.current = { x: e.clientX, y: e.clientY, scale: t.offsetWidth ? r.width / t.offsetWidth : 1, moved: false };
    t.setPointerCapture(e.pointerId);
    setDrag({ card, dx: 0, dy: 0 });
  };
  const onCardMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s0 = start.current;
    if (!s0 || !drag) return;
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (!s0.moved && Math.hypot(dx, dy) < 6) return;
    s0.moved = true;
    setDrag({ ...drag, dx: dx / s0.scale, dy: dy / s0.scale });
  };
  const onCardUp = (card: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const s0 = start.current;
    start.current = null;
    setDrag(null);
    if (!s0) return;
    if (!s0.moved) { setPicked((p) => (p === card ? null : card)); return; }
    const target = document.elementsFromPoint(e.clientX, e.clientY)
      .map((n) => (n as HTMLElement).closest?.('[data-match-slot]') as HTMLElement | null)
      .find((n) => n && rootRef.current?.contains(n));
    if (target) place(Number(target.dataset.matchSlot), card);
  };

  const correctCount = pairs.reduce((a, _, i) => a + (placed[i] === i ? 1 : 0), 0);
  const placedCount = Object.keys(placed).length;

  return (
    <div className={styles.widget} ref={rootRef}>
      <div className={styles.stepsHeader}>
        <p className={styles.widgetTitle}>{el.data.title?.trim() || 'Eşleştirme'}</p>
        <span className={styles.stepsCounter}>{placedCount} / {pairs.length}</span>
      </div>
      <div className={styles.matchGrid}>
        <ol className={styles.matchSlots}>
          {pairs.map((p, i) => {
            const card = placed[i];
            const state = checked && card != null ? (card === i ? styles.choiceOk : styles.choiceBad) : '';
            return (
              <li key={i} className={styles.matchRow}>
                <span className={styles.matchLeft}><RichText text={p.a} inline /></span>
                <button
                  type="button"
                  data-match-slot={i}
                  className={`${styles.matchSlot} ${card != null ? styles.matchSlotFilled : ''} ${state} ${picked != null && card == null ? styles.matchSlotReady : ''}`}
                  onClick={() => { if (picked != null) place(i, picked); else if (card != null) unplace(i); }}
                  aria-label={card != null ? `${i + 1}. satır: ${pairs[card].b}. Kaldırmak için dokun.` : `${i + 1}. satır boş${picked != null ? '. Seçili kartı buraya bırak.' : ''}`}
                >
                  {card != null ? <RichText text={pairs[card].b} inline /> : <span className={styles.matchEmpty}>Buraya bırak</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <div className={styles.matchCards} role="group" aria-label="Eşleştirilecek kartlar">
          {order.map((card) => usedCards.has(card) ? null : (
            <button
              key={card}
              type="button"
              className={`${styles.matchCard} ${picked === card ? styles.matchCardPicked : ''} ${drag?.card === card ? styles.matchCardDragging : ''}`}
              style={drag?.card === card ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
              onPointerDown={onCardDown(card)}
              onPointerMove={onCardMove}
              onPointerUp={onCardUp(card)}
              onPointerCancel={() => { start.current = null; setDrag(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked((p) => (p === card ? null : card)); } }}
              aria-pressed={picked === card}
            >
              <RichText text={pairs[card].b} inline />
            </button>
          ))}
          {usedCards.size === pairs.length && <p className={styles.widgetNote}>Bütün kartlar yerleştirildi.</p>}
        </div>
      </div>
      <div className={styles.widgetRow}>
        <button type="button" className={styles.widgetButton} onClick={() => setChecked(true)} disabled={placedCount < pairs.length}>Kontrol et</button>
        <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={() => { setPlaced({}); setChecked(false); setPicked(null); }} disabled={!placedCount}>Sıfırla</button>
        {checked && (
          <p className={`${styles.widgetFeedback} ${correctCount === pairs.length ? styles.fbOk : styles.fbBad}`} role="status">
            {correctCount === pairs.length ? 'Hepsi doğru!' : `${correctCount} / ${pairs.length} doğru. Kırmızıları değiştirip yeniden dene.`}
          </p>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------
// Sesli not: büyük oynat düğmesi ve ilerleme çubuğu (akıllı tahtada da rahat basılır)
// --------------------------------------------------------
function AudioNote({ el, ctx }: { el: WidgetEl; ctx: WidgetContext }) {
  const ref = el.data.audio;
  const url = ref ? ctx.mediaUrls?.[imageKey(ref)] : undefined;
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(ref?.seconds || 0);
  const title = el.data.title?.trim() || 'Sesli not';
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  if (!ref) {
    return <div className={styles.widget}><p className={styles.widgetTitle}>{title}</p><p className={styles.widgetNote}>Ses eklenmedi. Parçayı seçip sağdaki panelden kaydedin ya da dosya yükleyin.</p></div>;
  }
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false)); else a.pause();
  };
  return (
    <div className={styles.widget} style={{ justifyContent: 'center' }}>
      <p className={styles.widgetTitle}>{title}</p>
      {url ? (
        <div className={styles.audioRow}>
          <button type="button" className={styles.audioPlay} onClick={toggle} aria-label={playing ? 'Duraklat' : 'Oynat'}>
            {playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
          </button>
          <input
            type="range"
            className={styles.audioSeek}
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(time, Math.max(1, duration))}
            onChange={(e) => { const v = Number(e.target.value); if (audio.current) audio.current.currentTime = v; setTime(v); }}
            aria-label="Konum"
          />
          <span className={styles.stepsCounter}>{fmt(time)} / {fmt(duration)}</span>
          <audio
            ref={audio}
            src={url}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setTime(0); }}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setDuration(d); }}
          />
        </div>
      ) : <p className={styles.widgetNote}>Ses yükleniyor…</p>}
    </div>
  );
}

// --------------------------------------------------------
// Video (YouTube). Oynat'a basılana kadar YouTube'a hiç istek gitmez (çerezsiz alan, KVKK).
// --------------------------------------------------------
function VideoWidget({ el }: { el: WidgetEl }) {
  const ref = el.data.video;
  const [playing, setPlaying] = useState(false);
  const title = el.data.title?.trim() || 'Video';
  if (!ref) {
    return <div className={styles.widget}><p className={styles.widgetTitle}>{title}</p><p className={styles.widgetNote}>Video eklenmedi. Parçayı seçip soldaki panele YouTube bağlantısını yapıştırın.</p></div>;
  }
  return (
    <div className={`${styles.widget} ${videoStyles.video}`}>
      <div className={videoStyles.head}>
        <p className={styles.widgetTitle}>{title}</p>
        {playing && <button type="button" className={videoStyles.close} onClick={() => setPlaying(false)}>Kapat</button>}
      </div>
      <div className={videoStyles.frame}>
        {playing ? (
          <iframe
            src={videoEmbedUrl(ref)}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className={videoStyles.start} onClick={() => setPlaying(true)} aria-label={`${title}: oynat`}>
            <span className={videoStyles.playIcon} aria-hidden="true"><Play size={24} /></span>
            <span>Oynat</span>
            <small>YouTube videosu{ref.start ? ` · ${Math.floor(ref.start / 60)}:${String(ref.start % 60).padStart(2, '0')}'dan başlar` : ''}</small>
          </button>
        )}
      </div>
    </div>
  );
}
