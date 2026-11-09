'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from '../icons';
import { Spinner } from '../Spinner';
import {
  BoardContent, boardImageUrls, DrawingLayer, getDrawing, getHomeworkBoard, HISTORY_LIMIT, listDrawings, mediaRefs, saveMyDrawing, StrokeEl, WidgetEl,
} from '../../lib/boardData';
import { getQuizReport, getQuizState, QuizStateItem } from '../../lib/quizData';
import { Modal } from '../files/FilesUi';
import { BoardCanvas, Tool } from './BoardCanvas';
import { WidgetContext, WidgetView } from './Widgets';
import styles from './Board.module.css';
import f from '../files/Files.module.css';

const COLORS = ['#1f2a24', '#d03b3b', '#2a78d6', '#1e7a4c', '#eb6834'];
const WIDTHS = [3, 6, 12];
const AUTOSAVE_MS = 30_000;

/** Ödevdeki tahtanın görselleri ve sayfaları (öğrenci ve öğretmen incelemesi ortak) */
function useHomeworkBoard(homeworkId: string) {
  const [content, setContent] = useState<BoardContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    getHomeworkBoard(homeworkId).then(async (res) => {
      if (!alive) return;
      if (!res.ok) { setError(res.error); return; }
      setContent(res.data.content);
      const imgs = mediaRefs(res.data.content.pages);
      if (imgs.length) {
        const u = await boardImageUrls(imgs);
        if (alive) setImageUrls(u);
      }
    });
    return () => { alive = false; };
  }, [homeworkId]);
  const widgets = useMemo(() => new Map((content?.pages || []).flatMap((p) => p.elements.filter((e): e is WidgetEl => e.type === 'widget')).map((w) => [w.id, w])), [content]);
  return { content, error, imageUrls, widgets };
}

/**
 * Öğrenci: ödevdeki tahta (tam ekran). Öğretmenin tahtası değişmez; öğrenci kendi katmanına çizer.
 * Çizim 30 sn'de bir, sayfadan çıkarken ve kapatınca kaydedilir. Mini Test soruları sunucuda değerlendirilir.
 */
export function StudentBoardPlayer({ homeworkId, title, studentId, open, onClose }: {
  homeworkId: string;
  title: string;
  studentId: string;
  /** Ödev açık mı (kapalıysa yalnızca görüntülenir) */
  open: boolean;
  onClose: (changed: boolean) => void;
}) {
  const { content, error, imageUrls, widgets } = useHomeworkBoard(homeworkId);
  const [layer, setLayer] = useState<DrawingLayer>({});
  const [past, setPast] = useState<DrawingLayer[]>([]);
  const [future, setFuture] = useState<DrawingLayer[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [items, setItems] = useState<Map<string, QuizStateItem>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ warn: boolean; text: string }>({ warn: false, text: '' });
  const [loadedDrawing, setLoadedDrawing] = useState(false);
  const changed = useRef(false);
  // Zamanlayıcı ve sekme kapanışı en son çizimi kaydetsin
  const layerRef = useRef(layer);
  const dirtyRef = useRef(dirty);
  useEffect(() => { layerRef.current = layer; dirtyRef.current = dirty; }, [layer, dirty]);
  const hasMiniTest = useMemo(() => Array.from(widgets.values()).some((w) => w.kind === 'minitest'), [widgets]);

  useEffect(() => {
    let alive = true;
    getDrawing(homeworkId, studentId).then((res) => {
      if (!alive) return;
      if (res.ok && res.data) setLayer(res.data.pages || {});
      setLoadedDrawing(true);
    });
    return () => { alive = false; };
  }, [homeworkId, studentId]);

  useEffect(() => {
    if (!hasMiniTest) return;
    let alive = true;
    getQuizState(homeworkId).then((res) => { if (alive && res.ok) setItems(new Map(res.data.items.map((i) => [i.id, i]))); });
    return () => { alive = false; };
  }, [homeworkId, hasMiniTest]);

  const save = useCallback(async () => {
    if (!dirtyRef.current || !open) return true;
    setSaveMsg({ warn: false, text: 'Kaydediliyor…' });
    const res = await saveMyDrawing(homeworkId, layerRef.current);
    if (!res.ok) { setSaveMsg({ warn: true, text: `Kaydedilemedi: ${res.error}` }); return false; }
    setDirty(false);
    changed.current = true;
    setSaveMsg({ warn: false, text: `Kaydedildi · ${new Date(res.data).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` });
    return true;
  }, [homeworkId, open]);

  // 30 sn'de bir otomatik kayıt; sekme gizlenince de kaydet
  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => { void save(); }, AUTOSAVE_MS);
    const onHide = () => { if (document.visibilityState === 'hidden') void save(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onHide); };
  }, [open, save]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const close = async () => {
    if (dirty && open) await save();
    onClose(changed.current);
  };

  const page = content?.pages[Math.min(pageIndex, (content?.pages.length || 1) - 1)];
  const setPageLayer = (strokes: StrokeEl[]) => {
    if (!page) return;
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), layer]);
    setFuture([]);
    setLayer({ ...layer, [page.id]: strokes });
    setDirty(true);
  };
  const undo = () => { if (!past.length) return; setFuture((f2) => [layer, ...f2]); setLayer(past[past.length - 1]); setPast((p) => p.slice(0, -1)); setDirty(true); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, layer]); setLayer(future[0]); setFuture((f2) => f2.slice(1)); setDirty(true); };

  const ctx: WidgetContext = {
    mode: 'student', homeworkId, allWidgets: widgets, items, locked: !open, mediaUrls: imageUrls,
    onItem: (itemId, patch) => { changed.current = true; setItems((prev) => { const m = new Map(prev); const cur = m.get(itemId); if (cur) m.set(itemId, { ...cur, ...patch }); return m; }); },
  };

  return createPortal(
    <div className={styles.player} role="dialog" aria-modal="true" aria-label={title}>
      <header className={styles.playerTop}>
        <h2>{title}</h2>
        {open ? (
          <div className={styles.playerTools} role="toolbar" aria-label="Çizim araçları">
            {(['pen', 'highlighter', 'eraser'] as Tool[]).map((t) => (
              <button key={t} type="button" className={styles.tool} aria-pressed={tool === t} onClick={() => setTool(t)}>{t === 'pen' ? 'Kalem' : t === 'highlighter' ? 'Vurgu' : 'Silgi'}</button>
            ))}
            {COLORS.map((c) => <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-pressed={color === c} onClick={() => setColor(c)} aria-label={`Renk ${c}`} />)}
            {WIDTHS.map((w) => (
              <button key={w} type="button" className={styles.tool} aria-pressed={width === w} onClick={() => setWidth(w)} aria-label={`Kalınlık ${w}`}><span className={styles.widthDot} style={{ width: Math.max(4, w), height: Math.max(4, w) }} /></button>
            ))}
            <button type="button" className={styles.tool} onClick={undo} disabled={!past.length}>Geri al</button>
            <button type="button" className={styles.tool} onClick={redo} disabled={!future.length}>Yinele</button>
            <button type="button" className={styles.tool} onClick={() => { void save(); }} disabled={!dirty}>Kaydet</button>
          </div>
        ) : <span className={`${styles.playerInfo} ${styles.warn}`}>Ödevin süresi doldu; yalnızca görüntüleyebilirsin.</span>}
        <button type="button" className={styles.tool} style={{ color: '#fff' }} onClick={close} aria-label="Kapat"><X size={22} aria-hidden="true" /></button>
      </header>
      <div className={styles.playerStage}>
        {error ? <p className={styles.playerInfo}>Tahta açılamadı: {error}</p>
          : !content || !page || !loadedDrawing ? <Spinner center label="Tahta yükleniyor…" />
          : (
            <BoardCanvas
              page={page}
              tool={tool}
              color={color}
              width={width}
              layer={layer[page.id] || []}
              onLayerCommit={open ? setPageLayer : undefined}
              imageUrls={imageUrls}
              renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
              ariaLabel={`${title}, ${pageIndex + 1}. sayfa`}
            />
          )}
      </div>
      <footer className={styles.playerBottom}>
        <button type="button" className={styles.tool} style={{ color: '#fff' }} onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0} aria-label="Önceki sayfa"><ChevronLeft size={22} aria-hidden="true" /></button>
        <span className={styles.playerInfo}>Sayfa {pageIndex + 1} / {content?.pages.length || 1}</span>
        <button type="button" className={styles.tool} style={{ color: '#fff' }} onClick={() => setPageIndex((i) => Math.min((content?.pages.length || 1) - 1, i + 1))} disabled={!content || pageIndex >= content.pages.length - 1} aria-label="Sonraki sayfa"><ChevronRight size={22} aria-hidden="true" /></button>
        <span style={{ flex: 1 }} />
        <span className={`${styles.playerInfo} ${saveMsg.warn ? styles.warn : ''}`} role="status">
          {open ? (saveMsg.text || (dirty ? 'Kaydedilmemiş çizim var · 30 sn içinde kendiliğinden kaydedilir' : 'Çizimlerin kendiliğinden kaydedilir')) : ''}
        </span>
      </footer>
    </div>,
    document.body,
  );
}

/** Öğretmen: öğrencilerin tahta çizimleri (tek tek) */
export function BoardDrawingsReview({ homeworkId, title, students, onClose }: {
  homeworkId: string;
  title: string;
  students: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { content, error, imageUrls, widgets } = useHomeworkBoard(homeworkId);
  const [summaries, setSummaries] = useState<Map<string, { updated_at: string; strokes: number }> | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [layer, setLayer] = useState<DrawingLayer>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [keys, setKeys] = useState<WidgetContext['reviewKeys']>(new Map());

  useEffect(() => {
    let alive = true;
    listDrawings(homeworkId).then((res) => { if (alive && res.ok) setSummaries(new Map(res.data.map((d) => [d.student_id, d]))); });
    getQuizReport(homeworkId).then((res) => { if (alive && res.ok) setKeys(new Map(res.data.items.map((i) => [i.id, { body: i.body, choices: i.choices, correct_index: i.correct_index }]))); });
    return () => { alive = false; };
  }, [homeworkId]);

  useEffect(() => {
    if (!studentId) return;
    let alive = true;
    getDrawing(homeworkId, studentId).then((res) => { if (alive) setLayer(res.ok && res.data ? res.data.pages || {} : {}); });
    return () => { alive = false; };
  }, [homeworkId, studentId]);

  const page = content?.pages[Math.min(pageIndex, (content?.pages.length || 1) - 1)];
  const withDrawing = students.filter((s) => summaries?.get(s.id));
  const ctx: WidgetContext = { mode: 'review', allWidgets: widgets, reviewKeys: keys, mediaUrls: imageUrls };

  return (
    <Modal title={title} kicker="Öğrenci çizimleri" onClose={onClose} wide>
      {error && <p className={f.error} role="alert">Tahta açılamadı: {error}</p>}
      {!summaries || !content ? <Spinner center label="Yükleniyor…" /> : (
        <>
          <div className={f.folderBar} role="group" aria-label="Öğrenciler">
            {students.map((s) => {
              const d = summaries.get(s.id);
              return (
                <button key={s.id} type="button" className={f.folderChip} aria-pressed={studentId === s.id} onClick={() => { setStudentId(s.id); setPageIndex(0); }} disabled={!d} title={d ? `Son kayıt ${new Date(d.updated_at).toLocaleString('tr-TR')}` : 'Çizim yok'}>
                  {s.name} <small>{d ? `${d.strokes} çizgi` : '—'}</small>
                </button>
              );
            })}
          </div>
          <p className={f.muted}>{withDrawing.length}/{students.length} öğrenci tahtaya çizdi. Mini Test sonuçları Quiz sonuçları panelinde.</p>
          {page && (
            <>
              <BoardCanvas page={page} layer={studentId ? layer[page.id] || [] : []} imageUrls={imageUrls} renderWidget={(w) => <WidgetView el={w} ctx={ctx} />} ariaLabel={`${pageIndex + 1}. sayfa`} />
              <div className={f.cardActions} style={{ justifyContent: 'center' }}>
                <button type="button" className={f.secondaryButton} onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0}><ChevronLeft size={18} aria-hidden="true" />Önceki</button>
                <span className={f.muted}>Sayfa {pageIndex + 1} / {content.pages.length}{studentId ? '' : ' · çizimini görmek için öğrenci seçin'}</span>
                <button type="button" className={f.secondaryButton} onClick={() => setPageIndex((i) => Math.min(content.pages.length - 1, i + 1))} disabled={pageIndex >= content.pages.length - 1}>Sonraki<ChevronRight size={18} aria-hidden="true" /></button>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
