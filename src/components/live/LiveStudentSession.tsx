'use client';

// Öğrenci: canlı ders. Öğretmenin sayfasını izler; kendi defterine çizer; açılan soruyu cevaplar;
// kalem sırası gelince (ya da ortak çalışmada) tahtaya yazar.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Highlighter, Pen, RotateCcw, X } from '../icons';
import { Spinner } from '../Spinner';
import { BoardCanvas, Tool } from '../board/BoardCanvas';
import { WidgetContext, WidgetView } from '../board/Widgets';
import { BoardContent, StrokeEl, WidgetEl } from '../../lib/boardData';
import { CHOICE_LETTERS } from '../../lib/quizData';
import { getLiveContent, liveAnswer, liveHeartbeat, LIVE_HEARTBEAT_MS, LiveLayer, LiveSession, useLiveSession } from '../../lib/liveData';
import { LiveBadge, penLeft, QuestionBars, QuestionBody, strokesOf, useNow, useOwnLayer, withStrokes } from './liveShared';
import { RichText } from '../math/RichText';
import styles from './Live.module.css';

const COLORS = ['#1f2a24', '#d03b3b', '#2a78d6', '#1e7a4c', '#eb6834'];
const WIDTHS = [3, 6, 12];

export function LiveStudentSession({ sessionId, studentId, onClose }: { sessionId: string; studentId: string; onClose: () => void }) {
  const live = useLiveSession(sessionId, { teacher: false });
  const { session, layers, connected } = live;
  const [content, setContent] = useState<BoardContent | null>(null);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [answer, setAnswer] = useState<{ key: string; choice: number } | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    getLiveContent(sessionId).then((r) => {
      if (!alive) return;
      if (r.ok) { setContent(r.data.content); setMedia(r.data.media); } else setLoadError(r.error);
    });
    return () => { alive = false; };
  }, [sessionId]);

  // "Buradayım": öğretmen bağlı öğrencileri görür
  const ended = Boolean(session?.ended_at);
  useEffect(() => {
    if (ended) return;
    void liveHeartbeat(sessionId);
    const t = setInterval(() => { void liveHeartbeat(sessionId); }, LIVE_HEARTBEAT_MS);
    const onShow = () => { if (document.visibilityState === 'visible') void liveHeartbeat(sessionId); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onShow); };
  }, [sessionId, ended]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const minePrivate = useCallback((l: LiveLayer) => l.kind === 'private' && l.author_student === studentId, [studentId]);
  const mineShared = useCallback((l: LiveLayer) => l.kind === 'shared' && l.author_student === studentId, [studentId]);
  const notebook = useOwnLayer(sessionId, 'private', session ? layers : null, minePrivate);
  const board = useOwnLayer(sessionId, 'shared', session ? layers : null, mineShared);

  const now = useNow(Boolean(session?.pen_student === studentId));
  const myPen = session?.pen_student === studentId ? penLeft(session.pen_until, now) : 0;
  const canWrite = Boolean(session && !ended && (session.pen_all || myPen > 0));
  const projectedMe = session?.projected_student === studentId;

  const pageIndex = Math.min(session?.page_index || 0, (content?.pages.length || 1) - 1);
  const page = content?.pages[pageIndex];
  const widgets = useMemo(() => new Map((content?.pages || []).flatMap((p) => p.elements.filter((e): e is WidgetEl => e.type === 'widget')).map((w) => [w.id, w])), [content]);
  const steps = session?.step_state || {};
  const ctx: WidgetContext = { mode: 'live', allWidgets: widgets, mediaUrls: media, stepState: { get: (id) => steps[id] ?? 0, set: () => {} } };

  // Görünen: sayfa + ortak katmandaki herkesin çizgisi (benimki hariç, o düzenlenebilir katmanda) + yansıtılan çözüm
  const writer = canWrite ? board : notebook;
  const extra = page && session ? [
    ...strokesOf(layers, page.id, (l) => l.kind === 'shared' && l.author_student !== studentId),
    ...(canWrite ? notebook.layer[page.id] || [] : board.layer[page.id] || []),
    ...(session.projected_student && !projectedMe ? strokesOf(layers, page.id, (l) => l.kind === 'private' && l.author_student === session.projected_student) : []),
  ] : [];

  const q = session?.question || null;
  const myChoice = q && answer?.key === q.key ? answer.choice : null;
  const choose = async (i: number) => {
    if (!q || q.closed || sending) return;
    setSending(true);
    setAnswerError(null);
    const res = await liveAnswer(sessionId, q.key, i);
    setSending(false);
    if (!res.ok) { setAnswerError(res.error); return; }
    setAnswer({ key: q.key, choice: i });
  };

  if (ended || (!session && live.error)) {
    return createPortal(
      <div className={styles.shell} role="dialog" aria-modal="true" aria-label="Canlı ders">
        <div className={styles.center} style={{ gridRow: '1 / -1' }}>
          <h3>{ended ? 'Ders bitti' : 'Canlı ders bulunamadı'}</h3>
          <p className={styles.info}>{ended ? 'Öğretmenin canlı dersi kapattı.' : 'Ders bitmiş ya da bu sınıfa ait değil.'}</p>
          <button type="button" className={styles.primary} onClick={onClose}>Ana sayfaya dön</button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className={styles.shell} role="dialog" aria-modal="true" aria-label={`Canlı ders: ${session?.title || ''}`}>
      <div>
        <header className={styles.top}>
          <LiveBadge connected={connected} />
          <h2>{session?.title || 'Canlı ders'}</h2>
          <button type="button" className={styles.tool} onClick={onClose} aria-label="Dersten çık"><X size={22} aria-hidden="true" /></button>
        </header>
        {canWrite && (
          <p className={styles.penBanner} role="status">
            {session?.pen_all ? 'Ortak çalışma açık: yazdıkların herkesin tahtasında görünüyor.' : `Tahtaya yazma sırası sende · ${myPen} sn`}
          </p>
        )}
        {projectedMe && <p className={styles.projBanner} role="status">Öğretmenin, defterindeki çözümünü sınıfa yansıtıyor.</p>}
      </div>

      <div className={`${styles.body} ${styles.bodyNoPanel}`}>
        <div className={styles.stage}>
          {loadError ? <p className={styles.info}>Ders açılamadı: {loadError}</p>
            : !content || !page || !session ? <Spinner center label="Ders açılıyor…" />
            : (
              <div className={styles.board}>
                <BoardCanvas
                  page={withStrokes(page, extra)}
                  tool={tool}
                  color={color}
                  width={tool === 'highlighter' ? Math.max(width, 6) : width}
                  layer={writer.layer[page.id] || []}
                  onLayerCommit={(s: StrokeEl[]) => writer.commit(page.id, s)}
                  imageUrls={media}
                  renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
                  ariaLabel={`${session.title}, ${pageIndex + 1}. sayfa`}
                />
              </div>
            )}
          {q && <StudentQuestion question={q} myChoice={myChoice} sending={sending} error={answerError} onChoose={choose} />}
        </div>
      </div>

      <footer className={styles.bottom}>
        <div className={styles.tools} role="toolbar" aria-label="Çizim araçları">
          <button type="button" className={styles.tool} aria-pressed={tool === 'pen'} onClick={() => setTool('pen')} aria-label="Kalem"><Pen size={18} aria-hidden="true" /></button>
          <button type="button" className={styles.tool} aria-pressed={tool === 'highlighter'} onClick={() => setTool('highlighter')} aria-label="Vurgulayıcı"><Highlighter size={18} aria-hidden="true" /></button>
          <button type="button" className={styles.tool} aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')} aria-label="Silgi"><Eraser size={18} aria-hidden="true" /></button>
          {COLORS.map((c) => <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-pressed={color === c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }} aria-label={`Renk ${c}`} />)}
          {WIDTHS.map((w) => (
            <button key={w} type="button" className={styles.tool} aria-pressed={width === w} onClick={() => setWidth(w)} aria-label={`Kalınlık ${w}`}>
              <span style={{ display: 'inline-block', width: Math.max(4, w), height: Math.max(4, w), borderRadius: '50%', background: 'currentColor' }} />
            </button>
          ))}
          <button type="button" className={styles.tool} onClick={() => page && writer.undo(page.id)} disabled={!writer.canUndo} aria-label="Geri al"><RotateCcw size={18} aria-hidden="true" /></button>
        </div>
        <span className={styles.spacer} />
        <span className={`${styles.info} ${writer.error ? styles.warn : ''}`} role="status">
          {writer.error ? `Kaydedilemedi: ${writer.error}` : canWrite ? 'Tahtaya yazıyorsun' : 'Kendi defterine yazıyorsun; yalnızca öğretmenin görür'}
          {` · Sayfa ${pageIndex + 1} / ${content?.pages.length || 1}`}
        </span>
      </footer>
    </div>,
    document.body,
  );
}

function StudentQuestion({ question, myChoice, sending, error, onChoose }: {
  question: NonNullable<LiveSession['question']>;
  myChoice: number | null;
  sending: boolean;
  error: string | null;
  onChoose: (i: number) => void;
}) {
  const revealed = question.correct_index != null;
  return (
    <section className={styles.qCard} aria-label="Öğretmenin sorusu">
      <div className={styles.qCardHead}><p>Soru</p></div>
      <QuestionBody question={question} />
      {revealed ? (
        <>
          <QuestionBars question={question} counts={question.counts || []} total={question.total || 0} />
          <p className={`${styles.feedback} ${myChoice == null ? styles.fbInfo : myChoice === question.correct_index ? styles.fbOk : styles.fbBad}`} role="status">
            {myChoice == null ? `Cevap vermedin. Doğru cevap: ${CHOICE_LETTERS[question.correct_index!]}` : myChoice === question.correct_index ? 'Doğru!' : `Yanlış. Doğru cevap: ${CHOICE_LETTERS[question.correct_index!]}`}
          </p>
          {question.explanation && <p className={styles.muted}><b>Çözüm:</b> <RichText text={question.explanation} inline /></p>}
        </>
      ) : (
        <>
          <ul className={styles.choices}>
            {question.choices.map((c, i) => (
              <li key={i}>
                <button type="button" className={styles.choice} aria-pressed={myChoice === i} onClick={() => onChoose(i)} disabled={question.closed || sending}>
                  <b>{CHOICE_LETTERS[i]}</b><span><RichText text={c} inline /></span>
                </button>
              </li>
            ))}
          </ul>
          <p className={`${styles.feedback} ${styles.fbInfo}`} role="status">
            {question.closed ? (myChoice != null ? 'Cevaplar kapandı. Öğretmenin doğru cevabı birazdan gösterecek.' : 'Cevaplar kapandı.') : myChoice != null ? 'Cevabın alındı. Soru kapanana kadar değiştirebilirsin.' : 'Cevabını seç.'}
          </p>
        </>
      )}
      {error && <p className={`${styles.feedback} ${styles.fbBad}`} role="alert">{error}</p>}
    </section>
  );
}

/** Öğrenci ana sayfası: sınıfında açık canlı ders varsa katılma şeridi */
export function LiveJoinStrip({ sessions, onJoin }: { sessions: LiveSession[]; onJoin: (id: string) => void }) {
  if (!sessions.length) return null;
  return (
    <>
      {sessions.map((s) => (
        <div key={s.id} className={styles.joinStrip} role="status">
          <span className={styles.joinDot} aria-hidden="true" />
          <p><b>Canlı ders başladı</b>{s.title} · {s.class_name}</p>
          <button type="button" className={styles.joinButton} onClick={() => onJoin(s.id)}>Derse katıl</button>
        </div>
      ))}
    </>
  );
}

