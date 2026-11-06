'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, X } from '../icons';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import {
  answerQuiz, CHOICE_LETTERS, finishQuiz, getQuizState, PRACTICE_TRIES, PracticeAnswerResult, QUIZ_MODE_LABEL, QuizState, QuizStateItem,
  readPending, writePending,
} from '../../lib/quizData';
import { useQuizImages } from './useQuizImages';
import styles from './Quiz.module.css';
import f from '../files/Files.module.css';

const dateTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/**
 * Öğrenci quiz ekranı (tam ekran, telefona uygun): her ekranda bir soru.
 * Alıştırma: seçince hemen doğru/yanlış, 3 deneme. Sınav: seçim anında kaydedilir; kaydedilemeyen cevap
 * bu cihazda bekler ve bağlantı gelince (ya da sayfa yeniden açılınca) gönderilir.
 */
export function QuizPlayer({ homeworkId, title, onClose }: { homeworkId: string; title: string; onClose: (changed: boolean) => void }) {
  const { confirm } = useDialog();
  const [state, setState] = useState<QuizState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string } | null>(null);
  // Alıştırmada bu oturumda denenmiş yanlış şıklar (tekrar seçilemesin)
  const [wrongTried, setWrongTried] = useState<Record<string, number[]>>({});
  // Sınav: henüz sunucuya ulaşmamış cevaplar
  const [pending, setPending] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const changed = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await getQuizState(homeworkId);
    if (!res.ok) { setError(res.error); return null; }
    setState(res.data);
    return res.data;
  }, [homeworkId]);

  // Açılış: önce bu cihazda bekleyen sınav cevaplarını gönder, sonra durumu al
  useEffect(() => {
    let alive = true;
    (async () => {
      const waiting = readPending(homeworkId);
      for (const [itemId, choice] of Object.entries(waiting)) {
        const r = await answerQuiz(homeworkId, itemId, choice);
        if (r.ok || !/bağlantı|network|fetch/i.test(r.error)) delete waiting[itemId];
      }
      writePending(homeworkId, waiting);
      if (!alive) return;
      setPending(waiting);
      const s = await load();
      if (!alive || !s) return;
      changed.current = Object.keys(waiting).length > 0 || changed.current;
      if (s.finished || !s.open) setShowResult(true);
      else {
        // İlk çözülmemiş soruya git
        const first = s.items.findIndex((i) => (s.mode === 'practice' ? !i.resolved : i.choice == null));
        setIndex(first >= 0 ? first : 0);
      }
    })();
    return () => { alive = false; };
  }, [homeworkId, load]);

  // Bekleyen cevapları bağlantı gelince yeniden dene
  const flush = useCallback(async () => {
    const waiting = readPending(homeworkId);
    const keys = Object.keys(waiting);
    if (!keys.length) return true;
    for (const itemId of keys) {
      const r = await answerQuiz(homeworkId, itemId, waiting[itemId]);
      if (r.ok) delete waiting[itemId];
      else if (!/bağlantı|network|fetch|Failed/i.test(r.error)) delete waiting[itemId];
    }
    writePending(homeworkId, waiting);
    setPending({ ...waiting });
    return Object.keys(waiting).length === 0;
  }, [homeworkId]);

  useEffect(() => {
    if (!Object.keys(pending).length) return;
    const timer = window.setInterval(() => { void flush(); }, 5000);
    const online = () => { void flush(); };
    window.addEventListener('online', online);
    // Kaydedilmemiş cevap varken sayfa kapanırsa uyar (cevaplar yine de bu cihazda saklı)
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [pending, flush]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const urls = useQuizImages(state?.items.map((i) => i.image_path) || []);

  const patchItem = (id: string, patch: Partial<QuizStateItem>) =>
    setState((s) => (s ? { ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : s));

  const goTo = (i: number) => {
    setIndex(i);
    setMessage(null);
    mainRef.current?.scrollTo({ top: 0 });
  };

  // ---- Cevap ----
  const choose = async (item: QuizStateItem, choice: number) => {
    if (!state || busy) return;
    changed.current = true;
    if (state.mode === 'practice') {
      setBusy(true);
      setMessage(null);
      const res = await answerQuiz(homeworkId, item.id, choice);
      setBusy(false);
      if (!res.ok) { setMessage({ kind: 'info', text: res.error }); return; }
      const r = res.data as PracticeAnswerResult;
      patchItem(item.id, {
        choice, tries: r.tries, resolved: r.resolved, correct: r.resolved ? r.correct : null,
        correct_index: r.correct_index, explanation: r.explanation, points: r.points,
      });
      if (!r.correct) setWrongTried((w) => ({ ...w, [item.id]: [...(w[item.id] || []), choice] }));
      setMessage(r.correct
        ? { kind: 'ok', text: r.tries === 1 ? 'Doğru! Tam puan.' : `Doğru! ${r.tries}. denemede buldun.` }
        : r.resolved
          ? { kind: 'bad', text: 'Yanlış. Deneme hakkın bitti; doğru cevap yeşil gösteriliyor.' }
          : { kind: 'bad', text: `Yanlış. ${PRACTICE_TRIES - r.tries} deneme hakkın kaldı.` });
      if (r.finished) {
        const s = await load();
        if (s) window.setTimeout(() => setShowResult(true), 900);
      } else {
        setState((s) => (s ? { ...s, score: (s.score ?? 0) + (r.correct ? r.points : 0) } : s));
      }
      return;
    }
    // Sınav: ekranda hemen seçilir, arka planda kaydedilir
    patchItem(item.id, { choice });
    const waiting = { ...readPending(homeworkId), [item.id]: choice };
    writePending(homeworkId, waiting);
    setPending(waiting);
    const res = await answerQuiz(homeworkId, item.id, choice);
    if (res.ok) {
      const left = readPending(homeworkId);
      if (left[item.id] === choice) delete left[item.id];
      writePending(homeworkId, left);
      setPending({ ...left });
    } else if (!/bağlantı|network|fetch|Failed/i.test(res.error)) {
      // Sunucu reddetti (ör. süre doldu): beklemeye almanın anlamı yok
      const left = readPending(homeworkId);
      delete left[item.id];
      writePending(homeworkId, left);
      setPending({ ...left });
      setMessage({ kind: 'info', text: res.error });
    }
  };

  const finish = async () => {
    if (!state) return;
    const unanswered = state.items.filter((i) => (state.mode === 'practice' ? !i.resolved : i.choice == null)).length;
    const ok = await confirm({
      title: state.mode === 'exam' ? 'Sınavı teslim et' : 'Quizi bitir',
      message: `${unanswered ? `${unanswered} soru boş ya da çözülmedi. ` : ''}${state.mode === 'exam' ? 'Teslim ettikten sonra cevaplarını değiştiremezsin.' : 'Bitirince çözmediğin sorular puan almaz.'} Devam edilsin mi?`,
      confirmText: state.mode === 'exam' ? 'Teslim et' : 'Bitir',
      cancelText: 'Geri dön',
      variant: 'primary',
    });
    if (!ok) return;
    setBusy(true);
    const flushed = await flush();
    if (!flushed) {
      setBusy(false);
      setMessage({ kind: 'info', text: 'Bazı cevaplar henüz kaydedilemedi. İnternet bağlantını kontrol edip yeniden dene.' });
      return;
    }
    const res = await finishQuiz(homeworkId);
    if (!res.ok) { setBusy(false); setMessage({ kind: 'info', text: res.error }); return; }
    changed.current = true;
    await load();
    setBusy(false);
    setShowResult(true);
  };

  const close = () => onClose(changed.current);
  const pendingCount = Object.keys(pending).length;

  let body: React.ReactNode;
  if (error) body = <p className={f.error} role="alert">Quiz açılamadı: {error}</p>;
  else if (!state) body = <Spinner center label="Quiz yükleniyor…" />;
  else if (!state.items.length) body = <p className={f.muted}>Bu quizde soru yok.</p>;
  else if (showResult) body = <QuizResult state={state} urls={urls} />;
  else body = (
    <QuestionView
      state={state}
      item={state.items[Math.min(index, state.items.length - 1)]}
      index={Math.min(index, state.items.length - 1)}
      urls={urls}
      busy={busy}
      wrongTried={wrongTried}
      message={message}
      onGo={goTo}
      onChoose={choose}
    />
  );

  const last = state ? index >= state.items.length - 1 : true;

  return createPortal(
    <div className={styles.player} role="dialog" aria-modal="true" aria-label={title}>
      <header className={styles.playerTop}>
        <h2>{title}</h2>
        {state && <span className={`${styles.modeBadge} ${state.mode === 'exam' ? styles.modeExam : ''}`}>{QUIZ_MODE_LABEL[state.mode]}</span>}
        <button type="button" className={f.iconButton} onClick={close} aria-label="Kapat" title="Kapat"><X size={20} aria-hidden="true" /></button>
      </header>
      <div ref={mainRef} className={styles.playerMain}>
        <div className={styles.playerInner}>{body}</div>
      </div>
      {state && state.items.length > 0 && (
        <footer className={styles.playerBar}>
          {showResult ? (
            <>
              <span className={styles.spacer} />
              {state.open && !state.finished && (
                <button type="button" className={f.secondaryButton} onClick={() => setShowResult(false)}>Sorulara dön</button>
              )}
              <button type="button" className={f.primaryButton} onClick={close}>Kapat</button>
            </>
          ) : (
            <>
              <button type="button" className={f.secondaryButton} onClick={() => goTo(index - 1)} disabled={index === 0}>
                <ChevronLeft size={18} aria-hidden="true" />Önceki
              </button>
              <span className={`${styles.saveState} ${pendingCount ? styles.saveWarn : ''}`} role="status">
                {state.mode === 'exam'
                  ? pendingCount ? `${pendingCount} cevap kaydediliyor…` : 'Cevapların kaydedildi'
                  : state.score != null ? `Puan: ${Number(state.score.toFixed(2))} / ${state.total}` : ''}
              </span>
              <span className={styles.spacer} />
              {!last && (
                <button type="button" className={f.secondaryButton} onClick={() => goTo(index + 1)}>
                  Sonraki<ChevronRight size={18} aria-hidden="true" />
                </button>
              )}
              <button type="button" className={last ? f.primaryButton : f.secondaryButton} onClick={finish} disabled={busy || !state.open}>
                {state.mode === 'exam' ? 'Teslim et' : 'Bitir'}
              </button>
            </>
          )}
        </footer>
      )}
    </div>,
    document.body,
  );
}

function QuestionView({ state, item, index, urls, busy, wrongTried, message, onGo, onChoose }: {
  state: QuizState;
  item: QuizStateItem;
  index: number;
  urls: Record<string, string>;
  busy: boolean;
  wrongTried: Record<string, number[]>;
  message: { kind: 'ok' | 'bad' | 'info'; text: string } | null;
  onGo: (i: number) => void;
  onChoose: (item: QuizStateItem, choice: number) => void;
}) {
  const practice = state.mode === 'practice';
  const locked = !state.open || state.finished || (practice && item.resolved);
  // Bu oturumda denenen yanlışlar + (sayfa yeniden açıldıysa) sunucudaki son yanlış deneme
  const tried = [...(wrongTried[item.id] || []), ...(practice && !item.resolved && item.tries > 0 && item.choice != null ? [item.choice] : [])];
  return (
    <>
      <nav className={styles.progress} aria-label="Sorular">
        {state.items.map((it, i) => {
          const cls = practice
            ? it.resolved ? (it.correct ? styles.dotCorrect : styles.dotWrong) : ''
            : it.choice != null ? styles.dotAnswered : '';
          return (
            <button key={it.id} type="button" className={`${styles.dot} ${cls}`} aria-current={i === index ? 'step' : undefined} onClick={() => onGo(i)} aria-label={`${i + 1}. soru`}>
              {i + 1}
            </button>
          );
        })}
      </nav>
      <p className={styles.qNumber}>
        Soru {index + 1} / {state.items.length}
        {practice && !item.resolved && ` · ${PRACTICE_TRIES - item.tries} deneme hakkı`}
      </p>
      <p className={styles.qText}>{item.body}</p>
      {item.image_path && urls[item.image_path] && (
        // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
        <img className={styles.questionImage} src={urls[item.image_path]} alt="Soru görseli" />
      )}
      <ul className={styles.choices}>
        {item.choices.map((c, ci) => {
          const isCorrect = item.correct_index === ci;
          const isChosen = item.choice === ci;
          const wasWrong = tried.includes(ci) || (item.correct_index != null && isChosen && !isCorrect);
          const cls = item.correct_index != null
            ? isCorrect ? styles.choiceCorrect : wasWrong ? styles.choiceWrong : ''
            : practice ? (tried.includes(ci) ? styles.choiceWrong : '') : isChosen ? styles.choiceSelected : '';
          return (
            <li key={ci}>
              <button
                type="button"
                className={`${styles.choice} ${cls}`}
                onClick={() => onChoose(item, ci)}
                disabled={busy || locked || (practice && tried.includes(ci))}
                aria-pressed={!practice ? isChosen : undefined}
              >
                <span className={styles.choiceLetter} aria-hidden="true">{CHOICE_LETTERS[ci]}</span>
                <span>{c}</span>
                {item.correct_index != null && isCorrect && <span className={styles.choiceMark}><Check size={16} aria-hidden="true" />Doğru</span>}
                {item.correct_index != null && !isCorrect && wasWrong && <span className={styles.choiceMark}><X size={16} aria-hidden="true" />Yanlış</span>}
                {practice && item.correct_index == null && tried.includes(ci) && <span className={styles.choiceMark}><X size={16} aria-hidden="true" />Yanlış</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {message && (
        <p className={`${styles.feedback} ${message.kind === 'ok' ? styles.feedbackOk : message.kind === 'bad' ? styles.feedbackBad : styles.feedbackInfo}`} role="status">
          {message.kind === 'ok' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
          {message.text}
        </p>
      )}
      {item.explanation && item.correct_index != null && <p className={styles.explanation}><b>Çözüm: </b>{item.explanation}</p>}
      {!practice && !state.revealed && <p className={f.muted}>Sınav modu: cevabını istediğin zaman değiştirebilirsin. Doğru cevaplar teslim tarihi geçince açıklanır.</p>}
    </>
  );
}

function QuizResult({ state, urls }: { state: QuizState; urls: Record<string, string> }) {
  if (state.mode === 'exam' && !state.revealed) {
    return (
      <div className={styles.resultHero}>
        <CheckCircle2 size={40} aria-hidden="true" />
        <strong style={{ fontSize: 26 }}>Teslim edildi</strong>
        <p>{state.due_at ? `Sonuçlar ve doğru cevaplar ${dateTime(state.due_at)} sonrasında açıklanacak.` : 'Sonuçlar öğretmenin açıklayınca görünecek.'}</p>
      </div>
    );
  }
  const correct = state.items.filter((i) => i.correct).length;
  return (
    <>
      <div className={styles.resultHero}>
        <p>{state.finished ? 'Sonucun' : 'Süre doldu · sonucun'}</p>
        <strong>%{state.percent ?? 0}</strong>
        <p>{correct} / {state.total} doğru{state.mode === 'practice' && state.score != null ? ` · ${Number(state.score.toFixed(2))} puan` : ''}</p>
      </div>
      <h3 className={f.cardTitle}>Cevaplar</h3>
      <ol className={f.materials} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {state.items.map((it, i) => (
          <li key={it.id} className={f.matCard}>
            <p className={styles.qNumber}>
              {i + 1}. soru · {it.correct ? 'Doğru' : it.choice == null ? 'Boş' : 'Yanlış'}
              {state.mode === 'practice' && it.points != null && it.points > 0 && ` · ${it.points} puan`}
            </p>
            <p className={styles.qText} style={{ fontSize: 16 }}>{it.body}</p>
            {it.image_path && urls[it.image_path] && (
              // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
              <img className={styles.questionImage} src={urls[it.image_path]} alt="Soru görseli" style={{ maxHeight: 180 }} />
            )}
            <ul className={styles.qChoices}>
              {it.choices.map((c, ci) => (
                <li key={ci} className={ci === it.correct_index ? styles.qCorrect : undefined} style={ci === it.choice && ci !== it.correct_index ? { color: '#8f2232' } : undefined}>
                  <b>{CHOICE_LETTERS[ci]})</b>{c}
                  {ci === it.correct_index && <span> · doğru cevap</span>}
                  {ci === it.choice && ci !== it.correct_index && <span> · senin cevabın</span>}
                  {ci === it.choice && ci === it.correct_index && <span> (senin cevabın)</span>}
                </li>
              ))}
            </ul>
            {it.explanation && <p className={styles.explanation}><b>Çözüm: </b>{it.explanation}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
