'use client';

// Öğretmen: canlı ders. Sınıf seçilir, tahtanın kopyası oturuma konur; öğrenciler kendi ekranında izler.
// Öğretmen sayfayı ve adımları yönetir, ortak katmana yazar, soru açar, kalem izni verir, çözüm yansıtır.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Eraser, Eye, Highlighter, Maximize, Minimize, Pen, RotateCcw, Trash2, Users, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { Spinner } from '../Spinner';
import { Modal } from '../files/FilesUi';
import { BoardCanvas, Tool } from '../board/BoardCanvas';
import { WidgetContext, WidgetView } from '../board/Widgets';
import { BoardContent, StrokeEl, WidgetEl } from '../../lib/boardData';
import { CHOICE_LETTERS, QuestionRow, quizImageUrls } from '../../lib/quizData';
import { ClassStudent, listClassStudents } from '../../lib/teacherData';
import {
  getLiveContent, getMyOpenLive, LIVE_PEN_SECONDS, listLiveClasses, liveClearShared, liveCloseQuestion, liveControl, liveEnd, liveOpenQuestion,
  LiveLayer, LivePatch, LiveSession, startLive, useLiveSession,
} from '../../lib/liveData';
import { isOnline, LiveBadge, penLeft, QuestionBars, QuestionBody, strokesOf, useNow, useOwnLayer, withStrokes } from './liveShared';
import { RichText } from '../math/RichText';
import f from '../files/Files.module.css';
import styles from './Live.module.css';

const COLORS = ['#d03b3b', '#2a78d6', '#1f2a24', '#1e7a4c', '#e0a800'];
type Tab = 'sinif' | 'soru' | 'cozum';

export function LiveTeacherSession({ boardId, title, content, imageUrls, questions, onClose }: {
  boardId: string;
  title: string;
  content: BoardContent;
  imageUrls: Record<string, string>;
  questions: QuestionRow[];
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  if (!sessionId) return <LiveSetup boardId={boardId} title={title} content={content} onStarted={setSessionId} onClose={onClose} />;
  return <LiveTeacherView sessionId={sessionId} imageUrls={imageUrls} questions={questions} onClose={onClose} />;
}

// --------------------------------------------------------
// Başlatma: sınıf seçimi; açık kalmış ders varsa devam etme
// --------------------------------------------------------
function LiveSetup({ boardId, title, content, onStarted, onClose }: {
  boardId: string;
  title: string;
  content: BoardContent;
  onStarted: (id: string) => void;
  onClose: () => void;
}) {
  const [classes, setClasses] = useState<string[] | null>(null);
  const [open, setOpen] = useState<LiveSession | null>(null);
  const [className, setClassName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listLiveClasses(), getMyOpenLive()]).then(([c, o]) => {
      if (!alive) return;
      const names = c.ok ? c.data : [];
      setClasses(names);
      if (!c.ok) setError(c.error);
      if (o.ok && o.data) setOpen(o.data);
      if (names.length) setClassName(names[0]);
    });
    return () => { alive = false; };
  }, []);

  const start = async () => {
    if (!className) { setError('Sınıf seçin.'); return; }
    setBusy(true);
    setError(null);
    const res = await startLive(className, boardId, title, content);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onStarted(res.data);
  };

  return (
    <Modal title="Canlı ders başlat" kicker={title} onClose={onClose} busy={busy}>
      {!classes ? <Spinner center label="Yükleniyor…" /> : (
        <div style={{ display: 'grid', gap: 14 }}>
          <p className={f.muted}>
            Öğrenciler ana sayfalarında “Canlı ders başladı” uyarısını görür ve katılır. Tahtanın şu anki hâli derse kopyalanır;
            sayfayı siz değiştirdikçe öğrencilerin ekranı da değişir. Ders bitince öğrenci çizimleri silinir.
          </p>
          {open && (
            <div className={styles.switchRow} role="status">
              <span>
                <b>Açık bir canlı dersiniz var:</b> {open.title} · {open.class_name}.
                {open.board_id === boardId ? ' Kaldığınız yerden devam edebilirsiniz.' : ' Yeni ders başlatırsanız o ders kapanır.'}
              </span>
              <button type="button" className={f.secondaryButton} onClick={() => onStarted(open.id)}>Devam et</button>
            </div>
          )}
          {classes.length ? (
            <label className={f.field} htmlFor="live-class">
              <span>Sınıf</span>
              <CustomSelect id="live-class" value={className} onChange={setClassName} placeholder="Sınıf seçin" options={classes.map((c) => ({ value: c, label: c }))} />
            </label>
          ) : <p className={f.muted}>Size bağlı sınıf yok. Profilinizde ana sınıf tanımlı değil ve Sınıflarım listeniz boş; Sınıflarım bölümünden sınıf ekleyebilirsiniz.</p>}
          {error && <p className={f.error} role="alert">{error}</p>}
          <div className={f.cardActions}>
            <button type="button" className={f.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
            <button type="button" className={f.primaryButton} onClick={start} disabled={busy || !className}>{busy ? 'Başlatılıyor…' : open ? 'Yeni ders başlat' : 'Başlat'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// --------------------------------------------------------
// Ders ekranı
// --------------------------------------------------------
function LiveTeacherView({ sessionId, imageUrls, questions, onClose }: {
  sessionId: string;
  imageUrls: Record<string, string>;
  questions: QuestionRow[];
  onClose: () => void;
}) {
  const { confirm } = useDialog();
  const live = useLiveSession(sessionId, { teacher: true });
  const { session, setSession, layers, answers, participants, connected } = live;
  const [content, setContent] = useState<BoardContent | null>(null);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [roster, setRoster] = useState<ClassStudent[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [tab, setTab] = useState<Tab>('sinif');
  const [panel, setPanel] = useState(true);
  const [qHidden, setQHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    getLiveContent(sessionId).then((r) => {
      if (!alive) return;
      if (r.ok) { setContent(r.data.content); setMedia(r.data.media); } else setError(r.error);
    });
    return () => { alive = false; };
  }, [sessionId]);
  const className = session?.class_name || '';
  useEffect(() => {
    if (!className) return;
    let alive = true;
    listClassStudents(className).then((r) => { if (alive && r.ok) setRoster(r.data); });
    return () => { alive = false; };
  }, [className]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onFs = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.body.style.overflow = prev; document.removeEventListener('fullscreenchange', onFs); };
  }, []);

  const mineShared = useCallback((l: LiveLayer) => l.kind === 'shared' && !l.author_student, []);
  const own = useOwnLayer(sessionId, 'shared', session ? layers : null, mineShared);

  const now = useNow(true);
  const penActive = Boolean(session?.pen_student && session.pen_until && new Date(session.pen_until).getTime() > now - 1000);
  const urls = useMemo(() => ({ ...imageUrls, ...media }), [imageUrls, media]);
  const names = useMemo(() => new Map(roster.map((s) => [s.id, s.name])), [roster]);
  const seen = useMemo(() => new Map(participants.map((p) => [p.student_id, p.last_seen])), [participants]);
  const online = roster.filter((s) => isOnline(seen.get(s.id), now));

  const patch = useCallback(async (p: LivePatch, optimistic?: Partial<LiveSession>) => {
    if (optimistic) setSession((cur) => (cur ? { ...cur, ...optimistic } : cur));
    const res = await liveControl(sessionId, p);
    if (!res.ok) { setError(res.error); void live.refresh(); } else setError(null);
  }, [sessionId, setSession, live]);

  const pageIndex = Math.min(session?.page_index || 0, (content?.pages.length || 1) - 1);
  const page = content?.pages[pageIndex];
  const widgets = useMemo(() => new Map((content?.pages || []).flatMap((p) => p.elements.filter((e): e is WidgetEl => e.type === 'widget')).map((w) => [w.id, w])), [content]);
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const stepState = session?.step_state || {};
  const ctx: WidgetContext = {
    mode: 'teacher',
    questions: questionMap,
    allWidgets: widgets,
    mediaUrls: urls,
    stepState: {
      get: (id) => stepState[id] ?? 0,
      set: (id, n) => { const next = { ...stepState, [id]: n }; void patch({ step_state: next }, { step_state: next }); },
    },
  };

  const goPage = (i: number) => {
    if (!content) return;
    const next = Math.max(0, Math.min(content.pages.length - 1, i));
    if (next !== pageIndex) void patch({ page_index: next }, { page_index: next });
  };

  const end = async () => {
    const ok = await confirm({ title: 'Canlı dersi bitir', message: 'Ders öğrencilerin ekranında da kapanır. Öğrenci çizimleri silinir.', confirmText: 'Dersi bitir', cancelText: 'Vazgeç', variant: 'warning' });
    if (!ok) return;
    setBusy(true);
    const res = await liveEnd(sessionId);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setEnded(true);
  };

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  // Tahtadaki görüntü: sayfa + öğrencilerin ortak çizgileri + yansıtılan çözüm
  const extra = page && session ? [
    ...strokesOf(layers, page.id, (l) => l.kind === 'shared' && Boolean(l.author_student)),
    ...(session.projected_student ? strokesOf(layers, page.id, (l) => l.kind === 'private' && l.author_student === session.projected_student) : []),
  ] : [];

  if (ended) {
    return createPortal(
      <div className={styles.shell} role="dialog" aria-modal="true" aria-label="Canlı ders bitti">
        <div className={styles.center} style={{ gridRow: '1 / -1' }}>
          <h3>Canlı ders bitti</h3>
          <p className={styles.info}>Öğrencilerin ekranındaki ders kapandı.</p>
          <button type="button" className={styles.primary} onClick={onClose}>Tahtaya dön</button>
        </div>
      </div>,
      document.body,
    );
  }

  const q = session?.question || null;
  const counts = q ? q.choices.map((_, i) => answers.filter((a) => a.choice === i).length) : [];

  return createPortal(
    <div ref={rootRef} className={styles.shell} role="dialog" aria-modal="true" aria-label={`Canlı ders: ${session?.title || ''}`}>
      <header className={styles.top}>
        <LiveBadge connected={connected} />
        <h2>{session?.title || 'Canlı ders'} · {className}</h2>
        <span className={styles.info}><Users size={16} aria-hidden="true" /> {online.length}/{roster.length} öğrenci bağlı</span>
        <button type="button" className={styles.tool} onClick={() => setPanel((p) => !p)} aria-pressed={panel} aria-label="Yan paneli göster/gizle">Panel</button>
        <button type="button" className={styles.tool} onClick={toggleFull} aria-label={isFull ? 'Tam ekrandan çık' : 'Tam ekran'}>{isFull ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}</button>
        <button type="button" className={`${styles.tool} ${styles.danger}`} onClick={end} disabled={busy}>Dersi bitir</button>
        <button type="button" className={styles.tool} onClick={onClose} aria-label="Küçült (ders sürer)" title="Ders sürer; Canlı ders düğmesinden dönebilirsiniz"><X size={20} aria-hidden="true" /></button>
      </header>

      <div className={`${styles.body} ${panel ? '' : styles.bodyNoPanel}`}>
        <div className={styles.stage}>
          {!content || !page || !session ? (live.error ? <p className={styles.info}>{live.error}</p> : <Spinner center label="Ders açılıyor…" />) : (
            <div className={styles.board}>
              <BoardCanvas
                page={withStrokes(page, extra)}
                tool={tool}
                color={color}
                width={tool === 'highlighter' ? 6 : 5}
                layer={own.layer[page.id] || []}
                onLayerCommit={(s: StrokeEl[]) => own.commit(page.id, s)}
                imageUrls={urls}
                renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
                ariaLabel={`${session.title}, ${pageIndex + 1}. sayfa (canlı ders)`}
              />
            </div>
          )}
          {q && !qHidden && (
            <section className={styles.qCard} aria-label="Açık soru">
              <div className={styles.qCardHead}>
                <p>Soru · {answers.length}/{online.length || roster.length} cevap{q.closed ? ' · cevaplar kapalı' : ''}</p>
                <button type="button" className={styles.secondary} onClick={() => setQHidden(true)}>Gizle</button>
              </div>
              <QuestionBody question={q} />
              {q.correct_index != null ? <QuestionBars question={q} counts={q.counts || counts} total={q.total ?? answers.length} />
                : <p className={styles.muted}>Öğrenciler kendi ekranından cevaplıyor. Dağılım “Cevabı göster” ile açılır.</p>}
            </section>
          )}
        </div>

        {panel && (
          <aside className={styles.panel} aria-label="Ders paneli">
            <div className={styles.tabs} role="tablist" aria-label="Panel">
              {([['sinif', 'Sınıf'], ['soru', 'Soru'], ['cozum', 'Çözümler']] as [Tab, string][]).map(([id, label]) => (
                <button key={id} type="button" role="tab" className={styles.tab} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>
            <div className={styles.panelBody} role="tabpanel">
              {error && <p className={styles.errorText} role="alert">{error}</p>}
              {own.error && <p className={styles.errorText} role="alert">Çizim kaydedilemedi: {own.error}</p>}
              {session && tab === 'sinif' && (
                <ClassTab session={session} roster={roster} seen={seen} now={now} layers={layers} pageId={page?.id || ''} penActive={penActive} onPatch={patch} />
              )}
              {session && tab === 'soru' && (
                <QuestionTab
                  sessionId={sessionId}
                  session={session}
                  questions={questions}
                  pageQuestionIds={(page?.elements || []).filter((e): e is WidgetEl => e.type === 'widget' && e.kind === 'minitest').map((w) => w.data.questionId || '').filter(Boolean)}
                  answers={answers}
                  counts={counts}
                  names={names}
                  online={online}
                  onQuestion={(next) => { setSession((cur) => (cur ? { ...cur, question: next } : cur)); setQHidden(false); }}
                  onError={setError}
                  onPatch={patch}
                />
              )}
              {session && tab === 'cozum' && page && (
                <SolutionsTab session={session} page={page} layers={layers} names={names} urls={urls} onPatch={patch} />
              )}
            </div>
          </aside>
        )}
      </div>

      <footer className={styles.bottom}>
        <div className={styles.tools} role="toolbar" aria-label="Çizim araçları">
          <button type="button" className={styles.tool} aria-pressed={tool === 'pen'} onClick={() => setTool('pen')} aria-label="Kalem"><Pen size={18} aria-hidden="true" /></button>
          <button type="button" className={styles.tool} aria-pressed={tool === 'highlighter'} onClick={() => setTool('highlighter')} aria-label="Vurgulayıcı"><Highlighter size={18} aria-hidden="true" /></button>
          <button type="button" className={styles.tool} aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')} aria-label="Silgi"><Eraser size={18} aria-hidden="true" /></button>
          {COLORS.map((c) => <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-pressed={color === c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }} aria-label={`Renk ${c}`} />)}
          <span className={styles.sep} aria-hidden="true" />
          <button type="button" className={styles.tool} onClick={() => page && own.undo(page.id)} disabled={!own.canUndo} aria-label="Geri al"><RotateCcw size={18} aria-hidden="true" /></button>
          <button
            type="button"
            className={styles.tool}
            disabled={!page}
            onClick={async () => {
              if (!page) return;
              const ok = await confirm({ title: 'Ortak çizimleri temizle', message: 'Bu sayfada sizin ve öğrencilerin tahtaya yazdıkları silinir. Öğrencilerin kendi defterleri silinmez.', confirmText: 'Temizle', cancelText: 'Vazgeç', variant: 'warning' });
              if (!ok) return;
              const res = await liveClearShared(sessionId, page.id);
              if (!res.ok) { setError(res.error); return; }
              own.resetPage(page.id);
            }}
            aria-label="Bu sayfadaki ortak çizimleri temizle"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
        <span className={styles.spacer} />
        {q && qHidden && <button type="button" className={styles.tool} onClick={() => setQHidden(false)}><Eye size={18} aria-hidden="true" /> Soruyu göster</button>}
        <button type="button" className={styles.tool} onClick={() => goPage(pageIndex - 1)} disabled={pageIndex === 0} aria-label="Önceki sayfa"><ChevronLeft size={22} aria-hidden="true" /></button>
        <span className={styles.info}>Sayfa {pageIndex + 1} / {content?.pages.length || 1}</span>
        <button type="button" className={styles.tool} onClick={() => goPage(pageIndex + 1)} disabled={!content || pageIndex >= content.pages.length - 1} aria-label="Sonraki sayfa"><ChevronRight size={22} aria-hidden="true" /></button>
      </footer>
    </div>,
    document.body,
  );
}

// --------------------------------------------------------
// Sınıf: bağlı öğrenciler, kalem izni (30 sn), ortak çalışma, yansıtma
// --------------------------------------------------------
function ClassTab({ session, roster, seen, now, layers, pageId, penActive, onPatch }: {
  session: LiveSession;
  roster: ClassStudent[];
  seen: Map<string, string>;
  now: number;
  layers: LiveLayer[];
  pageId: string;
  penActive: boolean;
  onPatch: (p: LivePatch, optimistic?: Partial<LiveSession>) => Promise<void>;
}) {
  const left = penActive ? penLeft(session.pen_until, now) : 0;
  const penName = roster.find((s) => s.id === session.pen_student)?.name;
  const sorted = [...roster].sort((a, b) => Number(isOnline(seen.get(b.id), now)) - Number(isOnline(seen.get(a.id), now)) || a.name.localeCompare(b.name, 'tr'));
  const strokesOn = (id: string) => strokesOf(layers, pageId, (l) => l.kind === 'private' && l.author_student === id).length;

  return (
    <>
      <label className={styles.switchRow}>
        <span><b>Ortak çalışma</b><br /><span className={styles.muted}>Bağlı bütün öğrenciler aynı anda tahtaya yazar.</span></span>
        <input type="checkbox" checked={session.pen_all} onChange={(e) => void onPatch({ pen_all: e.target.checked }, { pen_all: e.target.checked })} />
      </label>
      {penActive && penName && (
        <div className={styles.switchRow} role="status">
          <span><b>{penName}</b> tahtaya yazıyor · {left} sn</span>
          <button type="button" className={styles.secondary} onClick={() => void onPatch({ pen_student: null }, { pen_student: null, pen_until: null })}>Kalemi al</button>
        </div>
      )}
      <h3>Öğrenciler</h3>
      {!roster.length ? <p className={styles.muted}>Bu sınıfta öğrenci yok.</p> : (
        <ul className={styles.list}>
          {sorted.map((s) => {
            const on = isOnline(seen.get(s.id), now);
            const hasPen = penActive && session.pen_student === s.id;
            const projected = session.projected_student === s.id;
            const n = strokesOn(s.id);
            return (
              <li key={s.id} className={styles.row}>
                <span className={`${styles.dot} ${on ? styles.dotOn : ''}`} aria-label={on ? 'Bağlı' : 'Bağlı değil'} />
                <span className={styles.rowName}>{s.name}<small>{on ? 'Bağlı' : 'Bağlı değil'}{n ? ` · bu sayfada ${n} çizgi` : ''}</small></span>
                <button
                  type="button"
                  className={styles.rowBtn}
                  aria-pressed={hasPen}
                  disabled={!on && !hasPen}
                  onClick={() => void onPatch(hasPen ? { pen_student: null } : { pen_student: s.id, pen_seconds: LIVE_PEN_SECONDS }, hasPen ? { pen_student: null, pen_until: null } : { pen_student: s.id, pen_until: new Date(Date.now() + LIVE_PEN_SECONDS * 1000).toISOString() })}
                  aria-label={hasPen ? `${s.name}: kalemi al` : `${s.name}: ${LIVE_PEN_SECONDS} saniye kalem ver`}
                  title={hasPen ? 'Kalemi al' : `${LIVE_PEN_SECONDS} sn kalem ver`}
                >
                  <Pen size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.rowBtn}
                  aria-pressed={projected}
                  disabled={!n && !projected}
                  onClick={() => void onPatch({ projected_student: projected ? null : s.id }, { projected_student: projected ? null : s.id })}
                  aria-label={projected ? `${s.name}: yansıtmayı kapat` : `${s.name}: çözümünü sınıfa yansıt`}
                  title={projected ? 'Yansıtmayı kapat' : 'Çözümünü sınıfa yansıt'}
                >
                  <Eye size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.muted}>Kalem: öğrenci {LIVE_PEN_SECONDS} saniye tahtaya yazar, süre bitince kalem kendiliğinden kapanır. Göz: öğrencinin kendi defterindeki çözüm herkesin ekranında görünür.</p>
    </>
  );
}

// --------------------------------------------------------
// Soru: bankadan aç, canlı cevap sayısı, kapat / cevabı göster / kaldır
// --------------------------------------------------------
function QuestionTab({ sessionId, session, questions, pageQuestionIds, answers, counts, names, online, onQuestion, onError, onPatch }: {
  sessionId: string;
  session: LiveSession;
  questions: QuestionRow[];
  pageQuestionIds: string[];
  answers: { student_id: string; choice: number }[];
  counts: number[];
  names: Map<string, string>;
  online: ClassStudent[];
  onQuestion: (q: LiveSession['question']) => void;
  onError: (e: string | null) => void;
  onPatch: (p: LivePatch, optimistic?: Partial<LiveSession>) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const q = session.question;
  const known = q ? questions.find((x) => x.body === q.body) : undefined;

  const open = async (row: QuestionRow) => {
    setBusy(true);
    onError(null);
    let imageUrl: string | null = null;
    if (row.image_path) imageUrl = (await quizImageUrls([row.image_path]))[row.image_path] || null;
    const res = await liveOpenQuestion(sessionId, row.id, imageUrl);
    setBusy(false);
    if (!res.ok) { onError(res.error); return; }
    onQuestion(res.data);
  };
  const close = async (reveal: boolean) => {
    setBusy(true);
    const res = await liveCloseQuestion(sessionId, reveal);
    setBusy(false);
    if (!res.ok) { onError(res.error); return; }
    onQuestion(res.data);
  };

  if (q) {
    const answered = new Set(answers.map((a) => a.student_id));
    const waiting = online.filter((s) => !answered.has(s.id));
    return (
      <>
        <h3>Açık soru</h3>
        <QuestionBody question={q} />
        {known && <p className={styles.muted}>Doğru cevap: <b>{CHOICE_LETTERS[known.correct_index]}</b> (öğrenciler görmez)</p>}
        <QuestionBars question={known && q.correct_index == null ? { ...q, correct_index: known.correct_index } : q} counts={q.counts || counts} total={q.total ?? answers.length} />
        <p className={styles.muted} role="status">{answers.length} öğrenci cevapladı{online.length ? ` · ${waiting.length} bağlı öğrenci bekleniyor` : ''}.</p>
        {waiting.length > 0 && waiting.length <= 12 && <p className={styles.muted}>Bekleyenler: {waiting.map((s) => s.name).join(', ')}</p>}
        <div className={styles.actions}>
          {!q.closed && <button type="button" className={styles.secondary} onClick={() => close(false)} disabled={busy}>Cevapları kapat</button>}
          {q.correct_index == null && <button type="button" className={styles.primary} onClick={() => close(true)} disabled={busy}>Cevabı göster</button>}
          <button type="button" className={styles.secondary} onClick={() => void onPatch({ clear_question: true }, { question: null })} disabled={busy}>Soruyu kaldır</button>
        </div>
        {q.correct_index != null && answers.length > 0 && (
          <p className={styles.muted}>
            Doğru yapanlar: {answers.filter((a) => a.choice === q.correct_index).map((a) => names.get(a.student_id) || 'Öğrenci').join(', ') || 'yok'}
          </p>
        )}
      </>
    );
  }

  const term = search.trim().toLocaleLowerCase('tr');
  const onPage = questions.filter((x) => pageQuestionIds.includes(x.id));
  const rest = questions.filter((x) => !pageQuestionIds.includes(x.id) && (!term || `${x.body} ${x.topic || ''} ${x.subject || ''}`.toLocaleLowerCase('tr').includes(term)));
  const item = (x: QuestionRow, here: boolean) => (
    <li key={x.id} className={styles.qItem}>
      <span className={styles.qText}>
        {here && <span className={styles.badge}>Bu sayfada</span>}
        <RichText text={x.body.length > 140 ? `${x.body.slice(0, 140)}…` : x.body} inline />
        <small>{x.choices.length} seçenek{x.topic ? ` · ${x.topic}` : ''}</small>
      </span>
      <button type="button" className={styles.primary} onClick={() => open(x)} disabled={busy}>Aç</button>
    </li>
  );
  return (
    <>
      <p className={styles.muted}>Soruyu açınca bütün sınıfın ekranına gelir; cevaplar burada canlı sayılır. Doğru cevap siz gösterene kadar öğrencilere gitmez. Puan verilmez.</p>
      {!questions.length ? <p className={styles.muted}>Soru bankanız boş. Önce Soru bankası’na soru ekleyin.</p> : (
        <>
          {onPage.length > 0 && <ul className={styles.list}>{onPage.map((x) => item(x, true))}</ul>}
          <label className={f.field} htmlFor="live-q-search">
            <span>Soru bankasında ara</span>
            <input id="live-q-search" className={styles.search} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Soru, konu ya da ders" />
          </label>
          {rest.length ? <ul className={styles.list}>{rest.slice(0, 60).map((x) => item(x, false))}</ul> : <p className={styles.muted}>Aramaya uyan soru yok.</p>}
          {rest.length > 60 && <p className={styles.muted}>İlk 60 soru gösteriliyor; aramayı daraltın.</p>}
        </>
      )}
    </>
  );
}

// --------------------------------------------------------
// Çözümler: öğrencilerin bu sayfadaki kendi çizimleri; seçilen sınıfa yansıtılır
// --------------------------------------------------------
function SolutionsTab({ session, page, layers, names, urls, onPatch }: {
  session: LiveSession;
  page: BoardContent['pages'][number];
  layers: LiveLayer[];
  names: Map<string, string>;
  urls: Record<string, string>;
  onPatch: (p: LivePatch, optimistic?: Partial<LiveSession>) => Promise<void>;
}) {
  const mine = layers.filter((l) => l.page_id === page.id && l.kind === 'private' && l.author_student && (l.strokes || []).length);
  return (
    <>
      <p className={styles.muted}>Öğrenciler kendi defterlerine çizer; yalnızca siz görürsünüz. Birini seçince çözümü bütün sınıfın ekranında görünür.</p>
      {session.projected_student && (
        <div className={styles.switchRow} role="status">
          <span><b>{names.get(session.projected_student) || 'Öğrenci'}</b> yansıtılıyor</span>
          <button type="button" className={styles.secondary} onClick={() => void onPatch({ projected_student: null }, { projected_student: null })}>Kapat</button>
        </div>
      )}
      {!mine.length ? <p className={styles.muted}>Bu sayfada henüz çizen öğrenci yok.</p> : (
        <div className={styles.thumbs}>
          {mine.map((l) => {
            const pressed = session.projected_student === l.author_student;
            return (
              <button key={l.id} type="button" className={styles.thumb} aria-pressed={pressed} onClick={() => void onPatch({ projected_student: pressed ? null : l.author_student }, { projected_student: pressed ? null : l.author_student })}>
                <BoardCanvas page={withStrokes(page, l.strokes)} imageUrls={urls} thumbnail />
                {names.get(l.author_student!) || 'Öğrenci'}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
