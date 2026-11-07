'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp, Copy, Download, Image as ImageIcon, Maximize, Minimize, Plus, Printer, Trash2,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import {
  Background, BACKGROUND_LABEL, BOARD_H, BOARD_IMAGE_BUCKET, BOARD_IMAGE_TYPES, BOARD_W, BoardContent, BoardEl, boardImageUrls, BoardPage, BoardRow,
  byteSize, copyImageToBoard, exportBoardPng, getBoard, HISTORY_LIMIT, imageKey, ImageEl, MAX_BOARD_BYTES, MAX_PAGES, newId, newPage, NoteEl,
  saveBoard, uploadBoardImage, WIDGET_LABEL, WIDGET_SIZE, WidgetEl, WidgetKind,
} from '../../lib/boardData';
import { FILES_BUCKET, LIBRARY_BUCKET, libraryFileName, listLibrary, listMyFiles } from '../../lib/filesData';
import { CHOICE_LETTERS, listQuestions, QuestionRow } from '../../lib/quizData';
import { fileSlug } from '../../lib/reportData';
import { BoardCanvas, Tool } from './BoardCanvas';
import { WidgetContext, WidgetView } from './Widgets';
import styles from './Board.module.css';

const COLORS = ['#1f2a24', '#d03b3b', '#2a78d6', '#1e7a4c', '#eb6834', '#7a3fd0', '#e0a800', '#ffffff'];
const WIDTHS = [3, 6, 12];
const NOTE_COLORS = ['#fff3b0', '#dff3df', '#dbe8f8', '#fbe2ec', '#ffffff'];
const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Seç', key: 'v' }, { id: 'pen', label: 'Kalem', key: 'p' }, { id: 'highlighter', label: 'Vurgu', key: 'h' },
  { id: 'eraser', label: 'Silgi', key: 'e' }, { id: 'line', label: 'Çizgi', key: 'l' }, { id: 'arrow', label: 'Ok', key: 'a' },
  { id: 'rect', label: 'Dikdörtgen', key: 'r' }, { id: 'ellipse', label: 'Daire', key: 'o' }, { id: 'note', label: 'Not', key: 'n' },
];

type MediaItem = { key: string; bucket: string; path: string; name: string };

/** Öğretmen: tahta düzenleyici (çizim, şekil, not, görsel, parçalar, sayfalar, sunum) */
export function BoardEditor({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const { confirm } = useDialog();
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [content, setContent] = useState<BoardContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [past, setPast] = useState<BoardContent[]>([]);
  const [future, setFuture] = useState<BoardContent[]>([]);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getBoard(boardId), listQuestions()]).then(([b, q]) => {
      if (!alive) return;
      if (!b.ok) { setError(b.error); return; }
      setBoard(b.data);
      setContent(b.data.content);
      if (q.ok) setQuestions(q.data);
    });
    return () => { alive = false; };
  }, [boardId]);

  const page = content?.pages[Math.min(pageIndex, (content?.pages.length || 1) - 1)];
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const allWidgets = useMemo(() => new Map((content?.pages || []).flatMap((p) => p.elements.filter((e): e is WidgetEl => e.type === 'widget')).map((w) => [w.id, w])), [content]);
  const ctx: WidgetContext = { mode: 'teacher', questions: questionMap, allWidgets };

  // Görsel adresleri
  const imageKeys = useMemo(() => Array.from(new Set((content?.pages || []).flatMap((p) => p.elements.filter((e): e is ImageEl => e.type === 'image').map((e) => imageKey(e))))).sort().join('|'), [content]);
  useEffect(() => {
    const missing = imageKeys ? imageKeys.split('|').filter((k) => !imageUrls[k]) : [];
    if (!missing.length) return;
    let alive = true;
    boardImageUrls(missing.map((k) => ({ bucket: k.slice(0, k.indexOf('/')), path: k.slice(k.indexOf('/') + 1) }))).then((u) => { if (alive) setImageUrls((prev) => ({ ...prev, ...u })); });
    return () => { alive = false; };
  }, [imageKeys, imageUrls]);

  // ---- Değişiklik + geçmiş (50 adım) ----
  const apply = (next: BoardContent) => {
    if (content) setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), content]);
    setFuture([]);
    setContent(next);
    setSaveState('dirty');
  };
  const updatePage = (patch: Partial<BoardPage>) => {
    if (!content || !page) return;
    apply({ ...content, pages: content.pages.map((p) => (p.id === page.id ? { ...p, ...patch } : p)) });
  };
  const commitElements = (elements: BoardEl[]) => updatePage({ elements });
  const patchElement = (id: string, patch: Partial<BoardEl>) => {
    if (!page) return;
    commitElements(page.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as BoardEl) : e)));
  };
  const undo = () => {
    if (!past.length || !content) return;
    setFuture((f) => [content, ...f].slice(0, HISTORY_LIMIT));
    setContent(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setSelectedId(null);
    setSaveState('dirty');
  };
  const redo = () => {
    if (!future.length || !content) return;
    setPast((p) => [...p, content].slice(-HISTORY_LIMIT));
    setContent(future[0]);
    setFuture((f) => f.slice(1));
    setSelectedId(null);
    setSaveState('dirty');
  };

  // ---- Otomatik kayıt (değişiklikten 1,5 sn sonra) ----
  useEffect(() => {
    if (saveState !== 'dirty' || !content) return;
    const t = window.setTimeout(async () => {
      setSaveState('saving');
      const res = await saveBoard(boardId, { content });
      if (res.ok) { setSaveState('saved'); setSaveError(null); }
      else { setSaveState('error'); setSaveError(res.error); }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [saveState, content, boardId]);
  useEffect(() => {
    if (saveState === 'saved') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // ---- Tam ekran sunum ----
  const toggleFull = () => {
    if (!full) {
      setFull(true);
      setSelectedId(null);
      const req = rootRef.current?.requestFullscreen?.();
      req?.catch(() => {});
    } else {
      setFull(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  };
  // ---- Klavye ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]');
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && page) {
        e.preventDefault();
        commitElements(page.elements.filter((el) => el.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (e.key === 'Escape') { setSelectedId(null); if (full) toggleFull(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
      if (t) setTool(t.id);
      if (e.key === 'ArrowRight' && full && content) setPageIndex((i) => Math.min(content.pages.length - 1, i + 1));
      if (e.key === 'ArrowLeft' && full) setPageIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // ---- Sayfalar ----
  const addPage = () => {
    if (!content) return;
    if (content.pages.length >= MAX_PAGES) { setNotice(`En fazla ${MAX_PAGES} sayfa olabilir.`); return; }
    const pages = [...content.pages];
    pages.splice(pageIndex + 1, 0, newPage(page?.background || 'blank'));
    apply({ ...content, pages });
    setPageIndex(pageIndex + 1);
  };
  const duplicatePage = () => {
    if (!content || !page) return;
    if (content.pages.length >= MAX_PAGES) { setNotice(`En fazla ${MAX_PAGES} sayfa olabilir.`); return; }
    const copy: BoardPage = { ...page, id: newId(), elements: page.elements.map((e) => ({ ...e, id: newId() })) };
    const pages = [...content.pages];
    pages.splice(pageIndex + 1, 0, copy);
    apply({ ...content, pages });
    setPageIndex(pageIndex + 1);
  };
  const deletePage = async () => {
    if (!content || !page || content.pages.length <= 1) return;
    if (page.elements.length && !(await confirm({ title: 'Sayfayı sil', message: `${pageIndex + 1}. sayfa silinsin mi? (Geri al ile geri getirebilirsiniz.)`, confirmText: 'Sil', cancelText: 'Vazgeç', variant: 'danger' }))) return;
    apply({ ...content, pages: content.pages.filter((p) => p.id !== page.id) });
    setPageIndex(Math.max(0, pageIndex - 1));
  };
  const movePage = (dir: -1 | 1) => {
    if (!content) return;
    const j = pageIndex + dir;
    if (j < 0 || j >= content.pages.length) return;
    const pages = [...content.pages];
    [pages[pageIndex], pages[j]] = [pages[j], pages[pageIndex]];
    apply({ ...content, pages });
    setPageIndex(j);
  };

  // ---- Görsel / parça ekleme ----
  const placeImage = (img: { path: string; w: number; h: number }, cx = BOARD_W / 2, cy = BOARD_H / 2, bucket = BOARD_IMAGE_BUCKET) => {
    if (!page) return;
    const scale = Math.min(1, 800 / img.w, 600 / img.h);
    const w = Math.round(img.w * scale), h = Math.round(img.h * scale);
    const el: ImageEl = { id: newId(), type: 'image', bucket, path: img.path, x: Math.round(Math.max(0, Math.min(BOARD_W - w, cx - w / 2))), y: Math.round(Math.max(0, Math.min(BOARD_H - h, cy - h / 2))), w, h };
    commitElements([...page.elements, el]);
    setTool('select');
    setSelectedId(el.id);
  };
  const upload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setBusy(true);
    const res = await uploadBoardImage(file);
    setBusy(false);
    if (!res.ok) { setNotice(res.error); return; }
    placeImage(res.data);
  };
  const insertMedia = async (m: { bucket: string; path: string; name: string }, x?: number, y?: number) => {
    setBusy(true);
    const res = await copyImageToBoard(m.bucket, m.path, m.name);
    setBusy(false);
    if (!res.ok) { setNotice(`Görsel eklenemedi: ${res.error}`); return; }
    placeImage(res.data, x, y);
  };
  const addWidget = (kind: WidgetKind) => {
    if (!page) return;
    const size = WIDGET_SIZE[kind];
    const el: WidgetEl = { id: newId(), type: 'widget', kind, x: Math.round((BOARD_W - size.w) / 2), y: Math.round((BOARD_H - size.h) / 2), w: size.w, h: size.h, data: kind === 'steps' ? { title: 'Adım adım çözüm', steps: ['', ''] } : kind === 'timer' ? { seconds: 0 } : {} };
    commitElements([...page.elements, el]);
    setTool('select');
    setSelectedId(el.id);
  };

  // ---- Dışa aktarma ----
  const exportPng = async () => {
    if (!svgRef.current || !board) return;
    setBusy(true);
    try { await exportBoardPng(svgRef.current, `${fileSlug(board.title)}-sayfa-${pageIndex + 1}.png`); } catch (e) { setNotice((e as Error).message); }
    setBusy(false);
  };
  const exportPdf = () => {
    setPrinting(true);
    window.setTimeout(() => { window.print(); setPrinting(false); }, 400);
  };

  if (error) return <p className={styles.saveWarn} role="alert">Tahta açılamadı: {error}</p>;
  if (!content || !board || !page) return <Spinner center label="Tahta yükleniyor…" />;

  const selected = selectedId ? page.elements.find((e) => e.id === selectedId) : undefined;
  const size = byteSize(content);
  const minitests = Array.from(allWidgets.values()).filter((w) => w.kind === 'minitest');

  const toolbar = (
    <div className={styles.toolbar} role="toolbar" aria-label="Tahta araçları">
      {full ? null : <button type="button" className={styles.tool} onClick={onClose} aria-label="Tahtalarıma dön" title="Tahtalarıma dön"><ArrowLeft size={20} aria-hidden="true" /></button>}
      {TOOLS.filter((t) => !full || ['select', 'pen', 'highlighter', 'eraser', 'line', 'arrow'].includes(t.id)).map((t) => (
        <button key={t.id} type="button" className={styles.tool} aria-pressed={tool === t.id} onClick={() => setTool(t.id)} title={`${t.label} (${t.key.toUpperCase()})`}>{t.label}</button>
      ))}
      <span className={styles.sep} aria-hidden="true" />
      {COLORS.map((c) => (
        <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-pressed={color === c} onClick={() => { setColor(c); if (selected && 'color' in selected && selected.type !== 'note') patchElement(selected.id, { color: c }); }} aria-label={`Renk ${c}`} />
      ))}
      <span className={styles.sep} aria-hidden="true" />
      {WIDTHS.map((w) => (
        <button key={w} type="button" className={styles.tool} aria-pressed={width === w} onClick={() => setWidth(w)} aria-label={`Kalınlık ${w}`} title={`Kalınlık ${w}`}>
          <span className={styles.widthDot} style={{ width: Math.max(4, w), height: Math.max(4, w) }} />
        </button>
      ))}
      <span className={styles.sep} aria-hidden="true" />
      <button type="button" className={styles.tool} onClick={undo} disabled={!past.length} title="Geri al (Ctrl+Z)">Geri al</button>
      <button type="button" className={styles.tool} onClick={redo} disabled={!future.length} title="Yinele (Ctrl+Y)">Yinele</button>
      {!full && (
        <>
          <span className={styles.sep} aria-hidden="true" />
          <input ref={fileInput} type="file" accept={BOARD_IMAGE_TYPES.join(',')} hidden onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className={styles.tool} onClick={() => fileInput.current?.click()} disabled={busy} title="Görsel yükle"><ImageIcon size={20} aria-hidden="true" /></button>
          <details style={{ position: 'relative' }}>
            <summary className={styles.tool} style={{ listStyle: 'none' }}>+ Parça</summary>
            <div style={{ position: 'absolute', zIndex: 30, top: '110%', left: 0, display: 'grid', minWidth: 180, padding: 6, border: '1px solid #dedad0', borderRadius: 12, background: '#fff', boxShadow: '0 10px 30px rgb(0 0 0 / 15%)' }}>
              {(Object.keys(WIDGET_LABEL) as WidgetKind[]).map((k) => (
                <button key={k} type="button" className={styles.tool} style={{ justifyContent: 'start' }} onClick={(e) => { (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; addWidget(k); }}>{WIDGET_LABEL[k]}</button>
              ))}
            </div>
          </details>
        </>
      )}
      <span className={styles.spacer} />
      {full ? (
        <span className={styles.saveState} style={{ color: '#e9efe9' }}>{pageIndex + 1} / {content.pages.length}</span>
      ) : (
        <span className={`${styles.saveState} ${saveState === 'error' ? styles.saveWarn : ''}`} role="status" title={saveError || undefined}>
          {saveState === 'saved' ? 'Kaydedildi' : saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'error' ? `Kaydedilemedi: ${saveError}` : 'Değişiklik var'}
          {size > MAX_BOARD_BYTES * 0.6 ? ` · ${Math.round((size / MAX_BOARD_BYTES) * 100)}% dolu` : ''}
        </span>
      )}
      {full && (
        <>
          <button type="button" className={styles.tool} onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0} aria-label="Önceki sayfa"><ChevronUp size={20} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }} /></button>
          <button type="button" className={styles.tool} onClick={() => setPageIndex((i) => Math.min(content.pages.length - 1, i + 1))} disabled={pageIndex >= content.pages.length - 1} aria-label="Sonraki sayfa"><ChevronDown size={20} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }} /></button>
        </>
      )}
      {!full && <button type="button" className={styles.tool} onClick={exportPng} disabled={busy} title="Bu sayfayı PNG indir"><Download size={20} aria-hidden="true" /></button>}
      {!full && <button type="button" className={styles.tool} onClick={exportPdf} title="Bütün sayfaları yazdır / PDF olarak kaydet"><Printer size={20} aria-hidden="true" /></button>}
      <button type="button" className={styles.tool} onClick={toggleFull} title={full ? 'Sunumdan çık (Esc)' : 'Tam ekran sunum'}>
        {full ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}{full ? '' : ' Sun'}
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className={`${styles.editor} ${full ? styles.editorFull : ''}`}>
      {!full && (
        <nav aria-label="Sayfalar">
          <div className={styles.pages}>
            {content.pages.map((p, i) => (
              <button key={p.id} type="button" className={styles.pageThumb} aria-current={i === pageIndex ? 'true' : undefined} onClick={() => { setPageIndex(i); setSelectedId(null); }} aria-label={`${i + 1}. sayfa`}>
                <span>{i + 1}</span>
                <BoardCanvas page={p} imageUrls={imageUrls} thumbnail />
              </button>
            ))}
          </div>
          <div className={styles.pageTools}>
            <button type="button" className={styles.tool} onClick={addPage} title="Sayfa ekle"><Plus size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={duplicatePage} title="Sayfayı çoğalt"><Copy size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => movePage(-1)} disabled={pageIndex === 0} title="Yukarı taşı"><ChevronUp size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => movePage(1)} disabled={pageIndex >= content.pages.length - 1} title="Aşağı taşı"><ChevronDown size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={deletePage} disabled={content.pages.length <= 1} title="Sayfayı sil"><Trash2 size={18} aria-hidden="true" /></button>
          </div>
        </nav>
      )}

      <div className={styles.stage}>
        {toolbar}
        {notice && <p className={styles.saveWarn} role="alert" onClick={() => setNotice(null)}>{notice}</p>}
        <BoardCanvas
          page={page}
          editable
          tool={tool}
          color={color}
          width={width}
          onCommit={commitElements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          editingNoteId={editingNoteId}
          onEditNote={setEditingNoteId}
          onNoteText={(id, text) => { const el = page.elements.find((e) => e.id === id) as NoteEl | undefined; if (el && el.text !== text) patchElement(id, { text }); }}
          imageUrls={imageUrls}
          renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
          widgetsPassive={!full}
          onDropMedia={(payload, x, y) => { try { insertMedia(JSON.parse(payload), x, y); } catch { /* geçersiz */ } }}
          svgRef={(node) => { svgRef.current = node; }}
          ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa`}
        />
      </div>

      {!full && (
        <aside className={styles.side} aria-label="Ayarlar">
          <section className={styles.panel}>
            <h3>Sayfa {pageIndex + 1} zemini</h3>
            <CustomSelect value={page.background} onChange={(v) => updatePage({ background: v as Background })} options={(Object.keys(BACKGROUND_LABEL) as Background[]).map((b) => ({ value: b, label: BACKGROUND_LABEL[b] }))} />
          </section>
          {selected ? (
            <SelectionPanel
              el={selected}
              questions={questions}
              minitests={minitests}
              onPatch={(patch) => patchElement(selected.id, patch)}
              onDelete={() => { commitElements(page.elements.filter((e) => e.id !== selected.id)); setSelectedId(null); }}
              onOrder={(dir) => {
                const rest = page.elements.filter((e) => e.id !== selected.id);
                commitElements(dir === 'front' ? [...rest, selected] : [selected, ...rest]);
              }}
            />
          ) : (
            <MediaDrawer onInsert={(m) => insertMedia(m)} busy={busy} />
          )}
          <p className={styles.saveState}>Kısayollar: V seç, P kalem, E silgi, N not · Ctrl+Z geri al · Delete sil. Görselleri çekmeceden tahtaya sürükleyebilirsiniz.</p>
        </aside>
      )}

      {printing && (
        <div className="print-only" data-print-area>
          {content.pages.map((p, i) => (
            <div key={p.id} style={{ breakAfter: 'page', padding: '4mm 0' }}>
              <p style={{ margin: '0 0 4px', font: '600 12px system-ui' }}>{board.title} · {i + 1}/{content.pages.length}</p>
              <BoardCanvas page={p} imageUrls={imageUrls} thumbnail />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------
// Seçili öğenin ayarları
// --------------------------------------------------------
function SelectionPanel({ el, questions, minitests, onPatch, onDelete, onOrder }: {
  el: BoardEl;
  questions: QuestionRow[];
  minitests: WidgetEl[];
  onPatch: (patch: Partial<BoardEl>) => void;
  onDelete: () => void;
  onOrder: (dir: 'front' | 'back') => void;
}) {
  const title = el.type === 'widget' ? WIDGET_LABEL[el.kind] : { stroke: 'Çizim', line: 'Çizgi', arrow: 'Ok', rect: 'Dikdörtgen', ellipse: 'Daire', note: 'Not', image: 'Görsel' }[el.type];
  return (
    <section className={styles.panel}>
      <h3>{title}</h3>
      {el.type === 'note' && (
        <>
          <label>Metin<textarea value={el.text} maxLength={2000} onChange={(e) => onPatch({ text: e.target.value })} /></label>
          <div style={{ display: 'flex', gap: 6 }}>
            {NOTE_COLORS.map((c) => <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-pressed={el.color === c} onClick={() => onPatch({ color: c })} aria-label={`Not rengi ${c}`} />)}
          </div>
          <label>Yazı boyutu
            <CustomSelect value={String(el.fontSize)} onChange={(v) => onPatch({ fontSize: Number(v) })} options={[24, 30, 34, 42, 56].map((n) => ({ value: String(n), label: `${n}` }))} />
          </label>
        </>
      )}
      {(el.type === 'rect' || el.type === 'ellipse') && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!el.fill} onChange={(e) => onPatch({ fill: e.target.checked ? `${el.color}33` : null })} /> İçi dolu
        </label>
      )}
      {el.type === 'widget' && el.kind === 'minitest' && (
        <label>Soru (soru bankasından)
          {questions.length === 0 ? <span className={styles.saveState}>Bankanızda soru yok. Önce Soru bankası sayfasından soru ekleyin.</span> : (
            <CustomSelect
              value={el.data.questionId || ''}
              onChange={(v) => onPatch({ data: { ...el.data, questionId: v } } as Partial<BoardEl>)}
              placeholder="Soru seçin"
              options={questions.map((q) => ({ value: q.id, label: q.body.length > 60 ? `${q.body.slice(0, 60)}…` : q.body, description: `Doğru: ${CHOICE_LETTERS[q.correct_index]}${q.subject ? ` · ${q.subject}` : ''}` }))}
            />
          )}
        </label>
      )}
      {el.type === 'widget' && el.kind === 'reveal' && (
        <label>Bağlı Mini Test
          {minitests.length === 0 ? <span className={styles.saveState}>Tahtada Mini Test yok.</span> : (
            <CustomSelect
              value={el.data.targetId || ''}
              onChange={(v) => onPatch({ data: { ...el.data, targetId: v } } as Partial<BoardEl>)}
              placeholder="Mini Test seçin"
              options={minitests.map((m, i) => {
                const q = questions.find((x) => x.id === m.data.questionId);
                return { value: m.id, label: `${i + 1}. Mini Test${q ? `: ${q.body.slice(0, 40)}` : ''}` };
              })}
            />
          )}
        </label>
      )}
      {el.type === 'widget' && el.kind === 'steps' && (
        <>
          <label>Başlık<input type="text" value={el.data.title || ''} maxLength={80} onChange={(e) => onPatch({ data: { ...el.data, title: e.target.value } } as Partial<BoardEl>)} /></label>
          <label>Adımlar (her satır bir adım)
            <textarea value={(el.data.steps || []).join('\n')} maxLength={3000} onChange={(e) => onPatch({ data: { ...el.data, steps: e.target.value.split('\n').slice(0, 20) } } as Partial<BoardEl>)} />
          </label>
        </>
      )}
      {el.type === 'widget' && el.kind === 'timer' && (
        <label>Süre (sn) <span className={styles.saveState}>0 = kronometre (ileri sayar)</span>
          <input type="number" min={0} max={3600} value={el.data.seconds ?? 0} onChange={(e) => onPatch({ data: { ...el.data, seconds: Math.max(0, Math.min(3600, Number(e.target.value) || 0)) } } as Partial<BoardEl>)} />
        </label>
      )}
      <div className={styles.pageTools}>
        <button type="button" className={styles.tool} onClick={() => onOrder('front')}>Öne getir</button>
        <button type="button" className={styles.tool} onClick={() => onOrder('back')}>Arkaya gönder</button>
        <button type="button" className={styles.tool} onClick={onDelete} style={{ color: '#a3283a' }}><Trash2 size={18} aria-hidden="true" /> Sil</button>
      </div>
      {el.type === 'widget' && <p className={styles.saveState}>Parçayı denemek için “Sun”a basın; düzenlerken parça seçilip taşınır.</p>}
    </section>
  );
}

// --------------------------------------------------------
// Medya çekmecesi: Dosyalarım ve ortak kütüphanedeki resimler
// --------------------------------------------------------
function MediaDrawer({ onInsert, busy }: { onInsert: (m: MediaItem) => void; busy: boolean }) {
  const [source, setSource] = useState<'mine' | 'library'>('mine');
  const [items, setItems] = useState<Record<string, MediaItem[] | null>>({ mine: null, library: null });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const list = items[source];

  useEffect(() => {
    if (items[source]) return;
    let alive = true;
    (async () => {
      let out: MediaItem[] = [];
      if (source === 'mine') {
        const r = await listMyFiles();
        if (r.ok) out = r.data.filter((f) => BOARD_IMAGE_TYPES.includes(f.mime)).map((f) => ({ key: f.id, bucket: FILES_BUCKET, path: f.path, name: f.name }));
      } else {
        const r = await listLibrary();
        if (r.ok) out = r.data.filter((f) => BOARD_IMAGE_TYPES.includes(f.mime)).map((f) => ({ key: f.id, bucket: LIBRARY_BUCKET, path: f.path, name: libraryFileName(f) }));
      }
      if (!alive) return;
      setItems((prev) => ({ ...prev, [source]: out }));
      const u = await boardImageUrls(out.slice(0, 60));
      if (alive) setUrls((prev) => ({ ...prev, ...u }));
    })();
    return () => { alive = false; };
  }, [source, items]);

  return (
    <section className={styles.panel} aria-label="Medya çekmecesi">
      <h3>Medya çekmecesi</h3>
      <div className={styles.pageTools}>
        <button type="button" className={styles.tool} aria-pressed={source === 'mine'} onClick={() => setSource('mine')}>Dosyalarım</button>
        <button type="button" className={styles.tool} aria-pressed={source === 'library'} onClick={() => setSource('library')}>Kütüphane</button>
      </div>
      {!list ? <Spinner label="Yükleniyor…" /> : list.length === 0 ? <p className={styles.saveState}>Burada resim yok.</p> : (
        <div className={styles.mediaGrid}>
          {list.map((m) => (
            <button
              key={m.key}
              type="button"
              className={styles.mediaItem}
              draggable
              disabled={busy}
              onDragStart={(e) => { e.dataTransfer.setData('application/x-board-media', JSON.stringify({ bucket: m.bucket, path: m.path, name: m.name })); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => onInsert(m)}
              title={`${m.name} — tahtaya sürükleyin ya da basın`}
            >
              {urls[`${m.bucket}/${m.path}`]
                // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
                ? <img src={urls[`${m.bucket}/${m.path}`]} alt="" />
                : <span style={{ aspectRatio: '4 / 3', display: 'block', background: '#f0eee7', borderRadius: 6 }} />}
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
