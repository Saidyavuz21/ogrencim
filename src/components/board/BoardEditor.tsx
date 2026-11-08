'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, AlignCenter, AlignLeft, AlignRight, ArrowLeft, ArrowRight, Bold, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, Component,
  Copy, Download, Eraser, Eye, EyeOff, Highlighter, Image as ImageIcon, Italic, Layers, Maximize, Minimize, Minus, MousePointer,
  Palette, Pen, Play, Plus, Printer, RotateCcw, RotateCw, Shapes, Sliders, Square, StickyNote, Trash2, Type, Underline, Upload,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import {
  Background, BACKGROUND_LABEL, BOARD_H, BOARD_IMAGE_BUCKET, BOARD_IMAGE_TYPES, BOARD_W, BoardContent, BoardEl, boardImageUrls, BoardPage, BoardRow,
  byteSize, copyImageToBoard, exportBoardPng, getBoard, HISTORY_LIMIT, imageKey, ImageEl, MAX_BOARD_BYTES, MAX_PAGES, newId, newPage, NoteEl,
  saveBoard, StrokeEl, uploadBoardImage, WIDGET_LABEL, WIDGET_SIZE, WidgetEl, WidgetKind,
} from '../../lib/boardData';
import { FILES_BUCKET, LIBRARY_BUCKET, libraryFileName, listLibrary, listMyFiles } from '../../lib/filesData';
import { CHOICE_LETTERS, listQuestions, QuestionRow } from '../../lib/quizData';
import { fileSlug } from '../../lib/reportData';
import { BoardCanvas, Tool, wrapTextLines } from './BoardCanvas';
import { WidgetContext, WidgetView } from './Widgets';
import styles from './Board.module.css';

const COLORS = ['#1f2a24', '#d03b3b', '#2a78d6', '#1e7a4c', '#eb6834', '#7a3fd0', '#e0a800', '#ffffff'];
const WIDTHS = [3, 6, 12];
const NOTE_COLORS = ['#fff3b0', '#dff3df', '#dbe8f8', '#fbe2ec', '#ffffff'];
const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Seç', key: 'v' }, { id: 'pen', label: 'Kalem', key: 'p' }, { id: 'highlighter', label: 'Vurgu', key: 'h' },
  { id: 'eraser', label: 'Silgi', key: 'e' }, { id: 'line', label: 'Çizgi', key: 'l' }, { id: 'arrow', label: 'Ok', key: 'a' },
  { id: 'rect', label: 'Dikdörtgen', key: 'r' }, { id: 'ellipse', label: 'Daire', key: 'o' }, { id: 'note', label: 'Not', key: 'n' },
  { id: 'text', label: 'Metin', key: 't' },
];

type MediaItem = { key: string; bucket: string; path: string; name: string };

/** Öğretmen: tahta düzenleyici (çizim, şekil, not, görsel, parçalar, sayfalar, sunum) */
export function BoardEditor({ boardId, onClose }: { boardId: string; onClose: () => void }) {
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
  // Sunum: düzenleme yok; kalemle yazılanlar geçicidir (kaydedilmez), sayfa başına ayrı
  const [presenting, setPresenting] = useState(false);
  const [annot, setAnnot] = useState<Record<string, StrokeEl[]>>({});
  const [annotPast, setAnnotPast] = useState<Record<string, StrokeEl[]>[]>([]);
  const [presentTool, setPresentTool] = useState<Tool>('pen');
  const [presentColor, setPresentColor] = useState('#d03b3b');
  const [printing, setPrinting] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Tam ekranda sağdan açılan panel (sayfalar, zemin, seçili öğe, medya)
  const [panelOpen, setPanelOpen] = useState(false);
  // Tam ekranda araç çubuğu tahtanın üstünde yüzer; gizlenebilir
  const [toolsHidden, setToolsHidden] = useState(false);
  // Sayfa silme onayı tahtanın içinde açılır (tarayıcı tam ekrandayken dışarıdaki pencereler görünmez)
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Önizlemede sayfa sırası sürükle-bırakla değişir
  const [dragPage, setDragPage] = useState<number | null>(null);
  const [dropPage, setDropPage] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  const dockRef = useRef<HTMLDivElement>(null);
  // Canva stili açılır menü (çizim/kalem, şekiller, parçalar)
  const [activePopover, setActivePopover] = useState<'draw' | 'shapes' | 'widget' | null>(null);
  // Sun kipi ve ortak adım durumu: widget kimliği → açık adım sayısı
  const [stepOpen, setStepOpen] = useState<Record<string, number>>({});

  useEffect(() => {
    const onFocus = () => {
      if (isUploadingRef.current) {
        window.setTimeout(() => {
          isUploadingRef.current = false;
          if (full && !document.fullscreenElement) {
            rootRef.current?.requestFullscreen?.().catch(() => {});
          }
        }, 500);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [full]);

  useEffect(() => {
    if (!activePopover) return;
    const handleOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [activePopover]);

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
  const stepState = useMemo(() => ({
    get: (id: string) => stepOpen[id] ?? 0,
    set: (id: string, n: number) => setStepOpen((prev) => ({ ...prev, [id]: n })),
  }), [stepOpen]);
  const ctx: WidgetContext = useMemo(() => ({
    mode: 'teacher',
    questions: questionMap,
    allWidgets,
    stepState,
  }), [questionMap, allWidgets, stepState]);

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
    commitElements(page.elements.map((e) => {
      if (e.id !== id) return e;
      let next = { ...e, ...patch } as BoardEl;
      if (next.type === 'note' && next.variant === 'text') {
        const pad = 8;
        const lines = wrapTextLines(next.text || ' ', next.w - pad * 2, next.fontSize, next.fontFamily, next.fontWeight, next.italic);
        const lineCount = Math.max(1, lines.length);
        const autoH = Math.round(Math.max(next.fontSize + 16, lineCount * next.fontSize * 1.3 + 16));
        next = { ...next, h: autoH };
      }
      return next;
    }));
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
      setPresenting(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  };
  const startPresent = () => {
    setPresenting(true);
    setAnnot({});
    setAnnotPast([]);
    setEditingNoteId(null);
    setStepOpen({});
    toggleFull();
  };
  const nextPage = () => { if (content) setPageIndex((i) => Math.min(content.pages.length - 1, i + 1)); };
  const prevPage = () => setPageIndex((i) => Math.max(0, i - 1));

  const advancePresentStepOrPage = () => {
    if (!page) { nextPage(); return; }
    const stepsWidgets = page.elements
      .filter((e): e is WidgetEl => e.type === 'widget' && e.kind === 'steps')
      .sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));

    for (const w of stepsWidgets) {
      const validSteps = (w.data.steps || []).filter((s) => s.trim());
      const total = validSteps.length;
      const current = stepOpen[w.id] ?? 0;
      if (current < total) {
        setStepOpen((prev) => ({ ...prev, [w.id]: current + 1 }));
        return;
      }
    }
    nextPage();
  };

  const revertPresentStepOrPage = () => {
    if (!page) { prevPage(); return; }
    const stepsWidgets = page.elements
      .filter((e): e is WidgetEl => e.type === 'widget' && e.kind === 'steps')
      .sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));

    for (let i = stepsWidgets.length - 1; i >= 0; i--) {
      const w = stepsWidgets[i];
      const current = stepOpen[w.id] ?? 0;
      if (current > 0) {
        setStepOpen((prev) => ({ ...prev, [w.id]: current - 1 }));
        return;
      }
    }
    prevPage();
  };

  const undoAnnot = () => {
    if (!annotPast.length) return;
    setAnnot(annotPast[annotPast.length - 1]);
    setAnnotPast((p) => p.slice(0, -1));
  };
  // ---- Klavye ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!full) return;
      const typing = (e.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]');
      if (typing) return;
      // Sunum: sayfa ok tuşları, Page Up/Down, boşluk (akıllı tahta kumandaları da bunları gönderir)
      if (presenting) {
        if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); advancePresentStepOrPage(); return; }
        if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); revertPresentStepOrPage(); return; }
        if (e.key === 'Escape') { toggleFull(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoAnnot(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === 'p') setPresentTool('pen');
        if (k === 'h') setPresentTool('highlighter');
        if (k === 'e') setPresentTool('eraser');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && page) {
        e.preventDefault();
        commitElements(page.elements.filter((el) => el.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (e.key === 'Escape') {
        if (activePopover) {
          setActivePopover(null);
          return;
        }
        setSelectedId(null);
        if (full) toggleFull();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && selectedId && page) {
        const sel = page.elements.find((el) => el.id === selectedId);
        if (sel && sel.type === 'note') {
          const k = e.key.toLowerCase();
          if (k === 'b') {
            e.preventDefault();
            patchElement(sel.id, { fontWeight: sel.fontWeight === 700 ? 400 : 700 });
            return;
          }
          if (k === 'i') {
            e.preventDefault();
            patchElement(sel.id, { italic: !sel.italic });
            return;
          }
          if (k === 'u') {
            e.preventDefault();
            patchElement(sel.id, { underline: !sel.underline });
            return;
          }
        }
      }
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
    const onFs = () => {
      if (isUploadingRef.current) return;
      if (!document.fullscreenElement) { setFull(false); setPresenting(false); }
    };
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
  const deletePage = () => {
    if (!content || !page || content.pages.length <= 1) return;
    setConfirmDelete(true);
  };
  const doDeletePage = () => {
    setConfirmDelete(false);
    if (!content || !page || content.pages.length <= 1) return;
    apply({ ...content, pages: content.pages.filter((p) => p.id !== page.id) });
    setPageIndex(Math.max(0, pageIndex - 1));
    setSelectedId(null);
  };
  /** Sayfayı başka bir sıraya taşır (sürükle-bırak) */
  const movePageTo = (from: number, to: number) => {
    if (!content || from === to || from < 0 || to < 0 || from >= content.pages.length || to >= content.pages.length) return;
    const pages = [...content.pages];
    const [moved] = pages.splice(from, 1);
    pages.splice(to, 0, moved);
    apply({ ...content, pages });
    setPageIndex(to);
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
    const el: WidgetEl = { id: newId(), type: 'widget', kind, x: Math.round((BOARD_W - size.w) / 2), y: Math.round((BOARD_H - size.h) / 2), w: size.w, h: size.h, data: kind === 'steps' ? { title: 'Adım adım', steps: ['', ''] } : kind === 'timer' ? { seconds: 0 } : {} };
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

  const saveLabel = (
    <span className={`${styles.saveState} ${saveState === 'error' ? styles.saveWarn : ''}`} role="status" title={saveError || undefined}>
      {saveState === 'saved' ? 'Kaydedildi' : saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'error' ? `Kaydedilemedi: ${saveError}` : 'Değişiklik var'}
      {size > MAX_BOARD_BYTES * 0.6 ? ` · ${Math.round((size / MAX_BOARD_BYTES) * 100)}% dolu` : ''}
    </span>
  );
  const deleteConfirm = confirmDelete && (
    <div className={styles.confirmOverlay} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
      <div className={styles.confirmBox} role="alertdialog" aria-modal="true" aria-labelledby="page-del-title" aria-describedby="page-del-text">
        <h3 id="page-del-title">Sayfayı sil</h3>
        <p id="page-del-text">{pageIndex + 1}. sayfa silinsin mi?{page.elements.length ? ` Sayfada ${page.elements.length} öğe var.` : ' Sayfa boş.'} Yanlışlıkla silerseniz “Geri al” ile geri getirebilirsiniz.</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmCancel} onClick={() => setConfirmDelete(false)} autoFocus>Vazgeç</button>
          <button type="button" className={styles.confirmDanger} onClick={doDeletePage}>Sayfayı sil</button>
        </div>
      </div>
    </div>
  );
  const printArea = printing && (
    <div className="print-only" data-print-area>
      {content.pages.map((p, i) => (
        <div key={p.id} style={{ breakAfter: 'page', padding: '4mm 0' }}>
          <p style={{ margin: '0 0 4px', font: '600 12px system-ui' }}>{board.title} · {i + 1}/{content.pages.length}</p>
          <BoardCanvas page={p} imageUrls={imageUrls} thumbnail />
        </div>
      ))}
    </div>
  );

  // Normal görünüm: yalnızca önizleme. Tuval bu boyutta küçük kaldığı için düzenleme tam ekranda yapılır.
  if (!full) {
    return (
      <div ref={rootRef} className={styles.preview}>
        <div className={styles.previewHead}>
          <button type="button" className={styles.tool} onClick={onClose} aria-label="Tahtalarıma dön" title="Tahtalarıma dön"><ArrowLeft size={20} aria-hidden="true" /></button>
          <h2>{board.title}</h2>
          {saveLabel}
          <span className={styles.spacer} />
          <button type="button" className={styles.presentButton} onClick={startPresent} title="Derste göster: düzenleme yok, kalemle yazılanlar kaydedilmez">
            <Play size={20} aria-hidden="true" />Sun
          </button>
          <button type="button" className={styles.openButton} onClick={toggleFull}>
            <Maximize size={22} aria-hidden="true" />Tam ekranda düzenle
          </button>
        </div>
        <div className={styles.previewBody}>
          <nav aria-label="Sayfalar (sırayı değiştirmek için sürükleyin)" className={styles.pages}>
            {content.pages.map((p, i) => (
              <React.Fragment key={p.id}>
              <button
                type="button"
                className={`${styles.pageThumb} ${dragPage === i ? styles.pageDragging : ''} ${dropPage === i && dragPage !== i ? styles.pageDropTarget : ''}`}
                aria-current={i === pageIndex ? 'true' : undefined}
                onClick={() => setPageIndex(i)}
                aria-label={`${i + 1}. sayfa`}
                title="Sırasını değiştirmek için sürükleyin"
                draggable
                onDragStart={(e) => { setDragPage(i); e.dataTransfer.setData('application/x-board-page', String(i)); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-board-page')) { e.preventDefault(); setDropPage(i); } }}
                onDragLeave={() => setDropPage((cur) => (cur === i ? null : cur))}
                onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData('application/x-board-page')); setDragPage(null); setDropPage(null); if (!Number.isNaN(from)) movePageTo(from, i); }}
                onDragEnd={() => { setDragPage(null); setDropPage(null); }}
              >
                <span>{i + 1}</span>
                <BoardCanvas page={p} imageUrls={imageUrls} thumbnail />
              </button>
              {i === pageIndex && (
              <div className={styles.pageTools} role="toolbar" aria-label={`${pageIndex + 1}. sayfa işlemleri`}>
                <button type="button" className={styles.tool} onClick={addPage} aria-label="Sayfa ekle" title="Sayfa ekle"><Plus size={18} aria-hidden="true" /></button>
                <button type="button" className={styles.tool} onClick={() => movePage(-1)} disabled={pageIndex === 0} aria-label="Sayfayı yukarı taşı" title="Yukarı taşı"><ChevronUp size={18} aria-hidden="true" /></button>
                <button type="button" className={styles.tool} onClick={() => movePage(1)} disabled={pageIndex >= content.pages.length - 1} aria-label="Sayfayı aşağı taşı" title="Aşağı taşı"><ChevronDown size={18} aria-hidden="true" /></button>
                <button type="button" className={styles.tool} onClick={deletePage} disabled={content.pages.length <= 1} aria-label="Sayfayı sil" title={content.pages.length <= 1 ? 'Tek sayfa silinemez' : 'Sayfayı sil'}><Trash2 size={18} aria-hidden="true" /></button>
              </div>
              )}
              </React.Fragment>
            ))}
            {content.pages.length > 1 && <p className={styles.pagesHint}>Sayfayı sürükleyerek de sıralayabilirsiniz.</p>}
          </nav>
          <div className={styles.stage}>
            <BoardCanvas page={page} imageUrls={imageUrls} renderWidget={(w) => <WidgetView el={w} ctx={ctx} />} widgetsPassive ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa (önizleme)`} />
            <p className={styles.hintText}>Derste göstermek için “Sun”; çizmek, şekil ve parça eklemek, sayfaları düzenlemek için “Tam ekranda düzenle”.</p>
          </div>
        </div>
        {deleteConfirm}
        {printArea}
      </div>
    );
  }

  // Sunum: sade ekran, altta küçük çubuk; yazılanlar kaydedilmez
  if (presenting) {
    const layer = annot[page.id] || [];
    return (
      <div ref={rootRef} className={`${styles.editor} ${styles.editorFull}`}>
        <div className={styles.stage}>
          <BoardCanvas
            page={page}
            tool={presentTool}
            color={presentColor}
            width={presentTool === 'highlighter' ? 6 : 5}
            layer={layer}
            onLayerCommit={(strokes) => { setAnnotPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), annot]); setAnnot({ ...annot, [page.id]: strokes }); }}
            imageUrls={imageUrls}
            renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
            ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa (sunum)`}
          />
        </div>
        <div className={styles.presentBar} role="toolbar" aria-label="Sunum araçları">
          <button
            type="button"
            className={`${styles.toolIconBtn} ${presentTool === 'pen' ? styles.toolActive : ''}`}
            aria-pressed={presentTool === 'pen'}
            onClick={() => setPresentTool('pen')}
            title="Kalem"
            aria-label="Kalem"
          >
            <Pen size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.toolIconBtn} ${presentTool === 'highlighter' ? styles.toolActive : ''}`}
            aria-pressed={presentTool === 'highlighter'}
            onClick={() => setPresentTool('highlighter')}
            title="Vurgulayıcı"
            aria-label="Vurgulayıcı"
          >
            <Highlighter size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.toolIconBtn} ${presentTool === 'eraser' ? styles.toolActive : ''}`}
            aria-pressed={presentTool === 'eraser'}
            onClick={() => setPresentTool('eraser')}
            title="Silgi"
            aria-label="Silgi"
          >
            <Eraser size={18} aria-hidden="true" />
          </button>
          <span className={styles.sep} aria-hidden="true" />
          {['#d03b3b', '#2a78d6', '#1f2a24', '#1e7a4c', '#e0a800'].map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.colorSwatch} ${presentColor === c ? styles.colorSwatchActive : ''}`}
              style={{ background: c }}
              aria-pressed={presentColor === c}
              onClick={() => { setPresentColor(c); if (presentTool === 'eraser') setPresentTool('pen'); }}
              aria-label={`Renk ${c}`}
            />
          ))}
          <span className={styles.sep} aria-hidden="true" />
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={undoAnnot}
            disabled={!annotPast.length}
            title="Geri al"
            aria-label="Geri al"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={() => { if (!layer.length) return; setAnnotPast((p) => [...p, annot]); setAnnot({ ...annot, [page.id]: [] }); }}
            disabled={!layer.length}
            title="Bu sayfadaki çizimleri temizle"
            aria-label="Temizle"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
          <span className={styles.sep} aria-hidden="true" />
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={prevPage}
            disabled={pageIndex === 0}
            aria-label="Önceki sayfa"
            title="Önceki sayfa"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className={styles.saveState}>{pageIndex + 1} / {content.pages.length}</span>
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={nextPage}
            disabled={pageIndex >= content.pages.length - 1}
            aria-label="Sonraki sayfa"
            title="Sonraki sayfa"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <span className={styles.sep} aria-hidden="true" />
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={toggleFull}
            title="Sunumdan çık (Esc)"
            aria-label="Sunumdan çık"
          >
            <Minimize size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // Tam ekran: bütün düzenleme araçları + sağda sayfa ve ayar paneli
  return (
    <div ref={rootRef} className={`${styles.editor} ${styles.editorFull}`}>
      <div className={styles.stage}>
        {toolsHidden ? (
          <button
            type="button"
            className={styles.toolsReveal}
            onClick={() => setToolsHidden(false)}
            title="Araç çubuğunu göster"
          >
            <Eye size={18} aria-hidden="true" />
            <span>Araçlar</span>
          </button>
        ) : (
          <div className={styles.dockWrapper} ref={dockRef}>
            {/* Canva-stili Kalem & Renk & Kalınlık Açılır Menüsü */}
            {activePopover === 'draw' && (
              <div className={styles.popoverCard} role="dialog" aria-label="Çizim aracı ve renk ayarları">
                <div className={styles.popoverSection}>
                  <span className={styles.popoverLabel}>Çizim aracı</span>
                  <div className={styles.brushRow}>
                    <button
                      type="button"
                      className={`${styles.brushCard} ${tool === 'pen' ? styles.brushActive : ''}`}
                      onClick={() => setTool('pen')}
                      title="İnce Kalem (P)"
                    >
                      <div className={styles.brushPreview} style={{ borderColor: tool === 'pen' ? color : '#dedad0' }}>
                        <Pen size={20} color={tool === 'pen' ? color : 'currentColor'} />
                      </div>
                      <span>Kalem</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.brushCard} ${tool === 'highlighter' ? styles.brushActive : ''}`}
                      onClick={() => setTool('highlighter')}
                      title="Vurgulayıcı / Fosforlu (H)"
                    >
                      <div className={styles.brushPreview} style={{ borderColor: tool === 'highlighter' ? color : '#dedad0' }}>
                        <Highlighter size={20} color={tool === 'highlighter' ? color : 'currentColor'} />
                      </div>
                      <span>Vurgu</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.brushCard} ${tool === 'eraser' ? styles.brushActive : ''}`}
                      onClick={() => setTool('eraser')}
                      title="Silgi (E)"
                    >
                      <div className={styles.brushPreview} style={{ borderColor: tool === 'eraser' ? '#d03b3b' : '#dedad0' }}>
                        <Eraser size={20} color={tool === 'eraser' ? '#d03b3b' : 'currentColor'} />
                      </div>
                      <span>Silgi</span>
                    </button>
                  </div>
                </div>

                {tool !== 'eraser' && (
                  <div className={styles.popoverSection}>
                    <div className={styles.popoverHeaderRow}>
                      <span className={styles.popoverLabel}>
                        <Palette size={14} aria-hidden="true" />
                        {tool === 'highlighter' ? 'Vurgu renkleri' : 'Kalem renkleri'}
                      </span>
                    </div>
                    <div className={styles.colorPalette}>
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            setColor(c);
                            if (selected && 'color' in selected && selected.type !== 'note') {
                              patchElement(selected.id, { color: c });
                            }
                          }}
                          title={`Renk: ${c}`}
                          aria-label={`Renk ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {tool === 'eraser' ? (
                  <p className={styles.hintText}>
                    Dokunduğunuz çizgi veya şeklin tamamını siler. Geri al ile geri getirebilirsiniz.
                  </p>
                ) : (
                <div className={styles.popoverSection}>
                  <div className={styles.popoverHeaderRow}>
                    <span className={styles.popoverLabel}>
                      <Sliders size={14} aria-hidden="true" />
                      Çizgi kalınlığı
                    </span>
                    <span className={styles.widthValue}>{width} px</span>
                  </div>

                  <div className={styles.widthPresets}>
                    {[
                      { label: 'İnce', value: 2, dot: 4 },
                      { label: 'Orta', value: 6, dot: 8 },
                      { label: 'Kalın', value: 12, dot: 13 },
                      { label: 'Çok kalın', value: 20, dot: 18 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={`${styles.widthPresetBtn} ${width === preset.value ? styles.widthPresetActive : ''}`}
                        onClick={() => {
                          setWidth(preset.value);
                          if (selected && 'width' in selected) patchElement(selected.id, { width: preset.value });
                        }}
                        title={`${preset.label} (${preset.value}px)`}
                      >
                        <span
                          className={styles.widthDotPreview}
                          style={{
                            width: preset.dot,
                            height: preset.dot,
                            backgroundColor: color,
                          }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min={tool === 'highlighter' ? 6 : 1}
                    max={36}
                    value={width}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setWidth(val);
                      if (selected && 'width' in selected) patchElement(selected.id, { width: val });
                    }}
                    className={styles.widthSlider}
                    aria-label="Çizgi kalınlığı ayar kaydırıcısı"
                  />
                </div>
                )}
              </div>
            )}

            {/* Şekiller Açılır Menüsü */}
            {activePopover === 'shapes' && (
              <div className={styles.popoverCard} role="dialog" aria-label="Şekil seçimi ve ayarları">
                <div className={styles.popoverSection}>
                  <span className={styles.popoverLabel}>Şekil türü</span>
                  <div className={styles.shapesGrid}>
                    {[
                      { id: 'line', label: 'Çizgi', icon: <Minus size={22} /> },
                      { id: 'arrow', label: 'Ok', icon: <ArrowRight size={22} /> },
                      { id: 'rect', label: 'Dikdörtgen', icon: <Square size={22} /> },
                      { id: 'ellipse', label: 'Daire', icon: <Circle size={22} /> },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`${styles.shapeBtn} ${tool === s.id ? styles.shapeBtnActive : ''}`}
                        onClick={() => setTool(s.id as Tool)}
                        title={s.label}
                      >
                        {s.icon}
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.popoverSection}>
                  <span className={styles.popoverLabel}>Şekil rengi</span>
                  <div className={styles.colorPalette}>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchActive : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          setColor(c);
                          if (selected && 'color' in selected && selected.type !== 'note') {
                            patchElement(selected.id, { color: c });
                          }
                        }}
                        title={`Renk: ${c}`}
                        aria-label={`Renk ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.popoverSection}>
                  <div className={styles.popoverHeaderRow}>
                    <span className={styles.popoverLabel}>Kenar kalınlığı</span>
                    <span className={styles.widthValue}>{width} px</span>
                  </div>
                  <div className={styles.widthPresets}>
                    {[
                      { label: 'İnce', value: 2, dot: 4 },
                      { label: 'Orta', value: 5, dot: 8 },
                      { label: 'Kalın', value: 10, dot: 13 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={`${styles.widthPresetBtn} ${width === preset.value ? styles.widthPresetActive : ''}`}
                        onClick={() => {
                          setWidth(preset.value);
                          if (selected && 'width' in selected) patchElement(selected.id, { width: preset.value });
                        }}
                        title={`${preset.label} (${preset.value}px)`}
                      >
                        <span
                          className={styles.widthDotPreview}
                          style={{ width: preset.dot, height: preset.dot, backgroundColor: color }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Parçalar Açılır Menüsü */}
            {activePopover === 'widget' && (
              <div className={styles.popoverCard} role="dialog" aria-label="Sınıf Araçları ve Parçalar">
                <div className={styles.popoverSection}>
                  <span className={styles.popoverLabel}>Sınıf Araçları Ekle</span>
                  <div className={styles.widgetsList}>
                    {(Object.keys(WIDGET_LABEL) as WidgetKind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={styles.widgetItemBtn}
                        onClick={() => {
                          setActivePopover(null);
                          addWidget(k);
                        }}
                      >
                        <span className={styles.widgetItemIcon}>
                          {k === 'timer' ? <Clock size={16} /> :
                           k === 'minitest' ? <Component size={16} /> :
                           k === 'reveal' ? <Eye size={16} /> :
                           <Layers size={16} />}
                        </span>
                        <span className={styles.widgetItemTitle}>{WIDGET_LABEL[k]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Alt Yüzen Araç Çubuğu (Yalnızca İkonlar) */}
            <div className={styles.toolbar} role="toolbar" aria-label="Tahta araçları">
              <div className={styles.toolGroup} role="group" aria-label="Çizim araçları">
              {/* Seçim */}
              <button
                type="button"
                className={styles.toolIconBtn}
                aria-pressed={tool === 'select'}
                onClick={() => {
                  setTool('select');
                  setActivePopover(null);
                }}
                title="Seçim Aracı (V)"
                aria-label="Seç"
              >
                <MousePointer size={19} aria-hidden="true" />
              </button>

              {/* Kalem */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${tool === 'pen' ? styles.toolActive : ''}`}
                aria-pressed={tool === 'pen'}
                onClick={() => {
                  setTool('pen');
                  setActivePopover((cur) => (cur === 'draw' && tool === 'pen' ? null : 'draw'));
                }}
                title="Kalem (P) · Çeşit, renk ve boyut için tıklayın"
                aria-label="Kalem"
              >
                <Pen size={19} aria-hidden="true" />
                <ChevronDown className={styles.toolDisclosure} size={9} aria-hidden="true" />
                <span className={styles.toolColorBadge} style={{ backgroundColor: color }} />
              </button>

              {/* Vurgulayıcı */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${tool === 'highlighter' ? styles.toolActive : ''}`}
                aria-pressed={tool === 'highlighter'}
                onClick={() => {
                  setTool('highlighter');
                  setActivePopover((cur) => (cur === 'draw' && tool === 'highlighter' ? null : 'draw'));
                }}
                title="Vurgulayıcı (H) · Renk ve boyut için tıklayın"
                aria-label="Vurgulayıcı"
              >
                <Highlighter size={19} aria-hidden="true" />
                <span className={styles.toolColorBadge} style={{ backgroundColor: color, opacity: 0.8 }} />
              </button>

              {/* Silgi */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${tool === 'eraser' ? styles.toolActive : ''}`}
                aria-pressed={tool === 'eraser'}
                onClick={() => {
                  setTool('eraser');
                  setActivePopover((cur) => (cur === 'draw' && tool === 'eraser' ? null : 'draw'));
                }}
                title="Silgi (E) · Boyut için tıklayın"
                aria-label="Silgi"
              >
                <Eraser size={19} aria-hidden="true" />
              </button>

              </div>
              <div className={styles.toolGroup} role="group" aria-label="İçerik ekle">
              {/* Şekiller */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${['line', 'arrow', 'rect', 'ellipse'].includes(tool) ? styles.toolActive : ''}`}
                aria-pressed={['line', 'arrow', 'rect', 'ellipse'].includes(tool)}
                onClick={() => {
                  if (!['line', 'arrow', 'rect', 'ellipse'].includes(tool)) {
                    setTool('rect');
                  }
                  setActivePopover((cur) => (cur === 'shapes' ? null : 'shapes'));
                }}
                title="Şekiller (Dikdörtgen, Daire, Çizgi, Ok)"
                aria-label="Şekiller"
              >
                {tool === 'line' ? <Minus size={19} aria-hidden="true" /> :
                 tool === 'arrow' ? <ArrowRight size={19} aria-hidden="true" /> :
                 tool === 'rect' ? <Square size={19} aria-hidden="true" /> :
                 tool === 'ellipse' ? <Circle size={19} aria-hidden="true" /> :
                 <Shapes size={19} aria-hidden="true" />}
              </button>

              {/* Not */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${tool === 'note' ? styles.toolActive : ''}`}
                aria-pressed={tool === 'note'}
                onClick={() => {
                  setTool('note');
                  setActivePopover(null);
                }}
                title="Yapışkan Not (N)"
                aria-label="Yapışkan Not"
              >
                <StickyNote size={19} aria-hidden="true" />
              </button>

              {/* Metin */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${tool === 'text' ? styles.toolActive : ''}`}
                aria-pressed={tool === 'text'}
                onClick={() => {
                  setTool('text');
                  setActivePopover(null);
                }}
                title="Metin (T)"
                aria-label="Metin"
              >
                <Type size={19} aria-hidden="true" />
              </button>

              {/* Görsel (Kütüphane ve Medya Çekmecesi) */}
              <input
                ref={fileInput}
                type="file"
                accept={BOARD_IMAGE_TYPES.join(',')}
                hidden
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  window.setTimeout(() => {
                    isUploadingRef.current = false;
                    if (full && !document.fullscreenElement) {
                      rootRef.current?.requestFullscreen?.().catch(() => {});
                    }
                  }, 400);
                }}
              />
              <button
                type="button"
                className={`${styles.toolIconBtn} ${panelOpen && !selectedId ? styles.toolActive : ''}`}
                onClick={() => {
                  setActivePopover(null);
                  setSelectedId(null);
                  setPanelOpen((v) => !(v && !selectedId));
                }}
                title="Görseller & Kütüphane paneli"
                aria-label="Görseller ve Kütüphane"
              >
                <ImageIcon size={19} aria-hidden="true" />
              </button>

              {/* Parçalar */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${activePopover === 'widget' ? styles.toolActive : ''}`}
                aria-pressed={activePopover === 'widget'}
                onClick={() => setActivePopover((cur) => (cur === 'widget' ? null : 'widget'))}
                title="Sınıf Araçları (Kronometre, Sayaç, Çarkıfelek, Mini test)"
                aria-label="Parça Ekle"
              >
                <Component size={19} aria-hidden="true" />
              </button>

              </div>
              <span className={styles.sep} aria-hidden="true" />

              <div className={styles.toolGroup} role="group" aria-label="Renk ve geçmiş">
              {/* Renk & Kalınlık Seçici Buton */}
              <button
                type="button"
                className={styles.colorPickerTrigger}
                onClick={() => setActivePopover((cur) => (cur === 'draw' ? null : 'draw'))}
                title={`Renk: ${color}, Kalınlık: ${width}px · Ayarları aç`}
                aria-label="Renk ve Kalınlık Seçimi"
              >
                <span className={styles.colorPickerCircle} style={{ backgroundColor: color }}>
                  <span
                    className={styles.colorPickerDot}
                    style={{
                      width: Math.min(10, Math.max(3, width)),
                      height: Math.min(10, Math.max(3, width)),
                      backgroundColor: color === '#ffffff' ? '#1f2a24' : '#ffffff',
                    }}
                  />
                </span>
              </button>

              {/* Geri Al */}
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={undo}
                disabled={!past.length}
                title="Geri al (Ctrl+Z)"
                aria-label="Geri al"
              >
                <RotateCcw size={19} aria-hidden="true" />
              </button>

              {/* Yinele */}
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={redo}
                disabled={!future.length}
                title="Yinele (Ctrl+Y)"
                aria-label="Yinele"
              >
                <RotateCw size={19} aria-hidden="true" />
              </button>

              <span className={styles.sep} aria-hidden="true" />

              </div>
              {/* Kayıt Durumu */}
              <span
                className={`${styles.saveStatusBadge} ${saveState === 'error' ? styles.saveWarn : ''}`}
                role="status"
                title={
                  saveState === 'saved' ? 'Tüm değişiklikler kaydedildi' :
                  saveState === 'saving' ? 'Kaydediliyor…' :
                  saveState === 'error' ? `Kayıt hatası: ${saveError}` :
                  'Kaydedilmemiş değişiklikler var'
                }
                aria-label={
                  saveState === 'saved' ? 'Kaydedildi' :
                  saveState === 'saving' ? 'Kaydediliyor' :
                  saveState === 'error' ? 'Hata' : 'Değişiklik var'
                }
              >
                {saveState === 'saving' ? (
                  <span className={styles.savingSpinner} aria-hidden="true" />
                ) : saveState === 'saved' ? (
                  <Check size={16} color="#1e7a4c" aria-hidden="true" />
                ) : saveState === 'error' ? (
                  <AlertCircle size={16} color="#d03b3b" aria-hidden="true" />
                ) : (
                  <span className={styles.dirtyDot} aria-hidden="true" />
                )}
                <span className={styles.saveStatusText}>
                  {saveState === 'saved' ? 'Kaydedildi' : saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'error' ? 'Kayıt hatası' : 'Değişiklik var'}
                </span>
              </span>

              <span className={styles.sep} aria-hidden="true" />

              <div className={styles.toolGroup} role="group" aria-label="Belge ve görünüm">
              {/* Panel */}
              <button
                type="button"
                className={`${styles.toolIconBtn} ${panelOpen ? styles.toolActive : ''}`}
                aria-expanded={panelOpen}
                aria-controls="board-drawer"
                onClick={() => {
                  setActivePopover(null);
                  setPanelOpen((v) => !v);
                }}
                title="Sayfalar, Zemin, Medya ve Ayarlar Paneli"
                aria-label="Panel"
              >
                <Layers size={19} aria-hidden="true" />
              </button>

              {/* PNG İndir */}
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={() => {
                  setActivePopover(null);
                  exportPng();
                }}
                disabled={busy}
                title="Bu sayfayı PNG görsel olarak indir"
                aria-label="PNG İndir"
              >
                <Download size={19} aria-hidden="true" />
              </button>

              {/* Yazdır / PDF */}
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={() => {
                  setActivePopover(null);
                  exportPdf();
                }}
                title="Bütün sayfaları yazdır / PDF olarak kaydet"
                aria-label="PDF / Yazdır"
              >
                <Printer size={19} aria-hidden="true" />
              </button>

              {/* Gizle */}
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={() => {
                  setActivePopover(null);
                  setToolsHidden(true);
                }}
                title="Araç çubuğunu gizle"
                aria-label="Gizle"
              >
                <EyeOff size={19} aria-hidden="true" />
              </button>

              {/* Çık */}
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={() => {
                  setActivePopover(null);
                  toggleFull();
                }}
                title="Tam ekrandan çık (Esc)"
                aria-label="Tam ekrandan çık"
              >
                <Minimize size={19} aria-hidden="true" />
              </button>
              </div>
            </div>
          </div>
        )}
        {notice && <p className={`${styles.saveWarn} ${styles.floatNotice}`} role="alert" onClick={() => setNotice(null)}>{notice}</p>}
        <BoardCanvas
          page={page}
          editable
          tool={tool}
          color={color}
          width={width}
          onCommit={commitElements}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            // Not ve parçaların ayarları panelde: seçilince panel açılır
            const el = id ? page.elements.find((e) => e.id === id) : undefined;
            if (el && (el.type === 'widget' || el.type === 'note')) setPanelOpen(true);
          }}
          onToolChange={setTool}
          editingNoteId={editingNoteId}
          onEditNote={setEditingNoteId}
          colors={COLORS}
          onPatchElement={patchElement}
          onDeleteElement={(id) => {
            commitElements(page.elements.filter((e) => e.id !== id));
            if (selectedId === id) setSelectedId(null);
          }}
          onNoteText={(id, text) => {
            const el = page.elements.find((e) => e.id === id) as NoteEl | undefined;
            if (!el) return;
            if (el.variant === 'text' && !text.trim()) {
              commitElements(page.elements.filter((e) => e.id !== id));
              if (selectedId === id) setSelectedId(null);
              return;
            }
            if (el.text !== text) patchElement(id, { text });
          }}
          imageUrls={imageUrls}
          renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
          widgetsControlsOnly={tool === 'select'}
          onDropMedia={(payload, x, y) => { try { insertMedia(JSON.parse(payload), x, y); } catch { /* geçersiz */ } }}
          svgRef={(node) => { svgRef.current = node; }}
          ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa`}
        />
      </div>

      <aside id="board-drawer" className={`${styles.drawer} ${panelOpen ? styles.drawerOpen : ''}`} aria-label="Sayfalar ve ayarlar" aria-hidden={!panelOpen || undefined} inert={!panelOpen || undefined}>
        <div className={styles.drawerHead}>
          <strong>Panel</strong>
          <button type="button" className={styles.tool} onClick={() => setPanelOpen(false)} aria-label="Paneli kapat">Kapat</button>
        </div>
        <section className={styles.panel}>
          <h3>Sayfa {pageIndex + 1} / {content.pages.length}</h3>
          <div className={styles.pageTools}>
            <button type="button" className={styles.tool} onClick={() => { setPageIndex((i) => Math.max(0, i - 1)); setSelectedId(null); }} disabled={pageIndex === 0} title="Önceki sayfa (←)"><ChevronUp size={18} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }} /></button>
            <button type="button" className={styles.tool} onClick={() => { setPageIndex((i) => Math.min(content.pages.length - 1, i + 1)); setSelectedId(null); }} disabled={pageIndex >= content.pages.length - 1} title="Sonraki sayfa (→)"><ChevronDown size={18} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }} /></button>
            <button type="button" className={styles.tool} onClick={addPage} title="Sayfa ekle"><Plus size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={duplicatePage} title="Sayfayı çoğalt"><Copy size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => movePage(-1)} disabled={pageIndex === 0} title="Sayfayı öne taşı"><ChevronUp size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => movePage(1)} disabled={pageIndex >= content.pages.length - 1} title="Sayfayı arkaya taşı"><ChevronDown size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={deletePage} disabled={content.pages.length <= 1} title="Sayfayı sil"><Trash2 size={18} aria-hidden="true" /></button>
          </div>
          <label>Zemin
            <CustomSelect value={page.background} onChange={(v) => updatePage({ background: v as Background })} options={(Object.keys(BACKGROUND_LABEL) as Background[]).map((b) => ({ value: b, label: BACKGROUND_LABEL[b] }))} />
          </label>
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
          <MediaDrawer
            onInsert={(m) => insertMedia(m)}
            onUpload={() => {
              isUploadingRef.current = true;
              fileInput.current?.click();
            }}
            busy={busy}
          />
        )}
        <p className={styles.hintText}>Kısayollar: V seç, P kalem, E silgi, N not, T metin · Ctrl+Z geri al · Delete sil · ←/→ sayfa · Esc çık. “Seç” aracında parçanın düğmeleri çalışır; parçayı taşımak için düğme olmayan yerinden tutup sürükleyin.</p>
      </aside>
      {deleteConfirm}
      {printArea}
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
  const title = el.type === 'widget' ? WIDGET_LABEL[el.kind] : (el.type === 'note' && el.variant === 'text') ? 'Metin' : { stroke: 'Çizim', line: 'Çizgi', arrow: 'Ok', rect: 'Dikdörtgen', ellipse: 'Daire', note: 'Not', image: 'Görsel' }[el.type];
  return (
    <section className={styles.panel}>
      <h3>{title}</h3>
      {el.type === 'note' && (
        <>
          <label>Metin<textarea value={el.text} maxLength={2000} onChange={(e) => onPatch({ text: e.target.value })} /></label>

          <label>Yazı tipi
            <CustomSelect
              value={el.fontFamily || 'sans'}
              onChange={(v) => onPatch({ fontFamily: v as 'sans' | 'hand' | 'display' })}
              options={[
                { value: 'sans', label: 'Düz' },
                { value: 'hand', label: 'El yazısı' },
                { value: 'display', label: 'Başlık' },
              ]}
            />
          </label>

          <label>Yazı boyutu
            <CustomSelect
              value={String(el.fontSize || 42)}
              onChange={(v) => onPatch({ fontSize: Number(v) })}
              options={[24, 32, 42, 56, 72, 96].map((n) => ({ value: String(n), label: `${n}` }))}
            />
          </label>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={`${styles.tool} ${el.fontWeight === 700 ? styles.toolActive : ''}`}
              aria-pressed={el.fontWeight === 700}
              onClick={() => onPatch({ fontWeight: el.fontWeight === 700 ? 400 : 700 })}
              title="Kalın"
              aria-label="Kalın"
            >
              <Bold size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.italic ? styles.toolActive : ''}`}
              aria-pressed={Boolean(el.italic)}
              onClick={() => onPatch({ italic: !el.italic })}
              title="İtalik"
              aria-label="İtalik"
            >
              <Italic size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.underline ? styles.toolActive : ''}`}
              aria-pressed={Boolean(el.underline)}
              onClick={() => onPatch({ underline: !el.underline })}
              title="Altı çizili"
              aria-label="Altı çizili"
            >
              <Underline size={16} aria-hidden="true" />
            </button>

            <span style={{ width: 1, height: 18, background: '#c9c5b8', margin: '0 2px' }} />

            <button
              type="button"
              className={`${styles.tool} ${el.fontWeight === 300 ? styles.toolActive : ''}`}
              aria-pressed={el.fontWeight === 300}
              onClick={() => onPatch({ fontWeight: 300 })}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              İnce
            </button>
            <button
              type="button"
              className={`${styles.tool} ${(el.fontWeight ?? 400) === 400 ? styles.toolActive : ''}`}
              aria-pressed={(el.fontWeight ?? 400) === 400}
              onClick={() => onPatch({ fontWeight: 400 })}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              Normal
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.fontWeight === 700 ? styles.toolActive : ''}`}
              aria-pressed={el.fontWeight === 700}
              onClick={() => onPatch({ fontWeight: 700 })}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              Kalın
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`${styles.tool} ${(!el.align || el.align === 'left') ? styles.toolActive : ''}`}
              aria-pressed={!el.align || el.align === 'left'}
              onClick={() => onPatch({ align: 'left' })}
              title="Sola hizala"
              aria-label="Sola hizala"
            >
              <AlignLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.align === 'center' ? styles.toolActive : ''}`}
              aria-pressed={el.align === 'center'}
              onClick={() => onPatch({ align: 'center' })}
              title="Ortaya hizala"
              aria-label="Ortaya hizala"
            >
              <AlignCenter size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.align === 'right' ? styles.toolActive : ''}`}
              aria-pressed={el.align === 'right'}
              onClick={() => onPatch({ align: 'right' })}
              title="Sağa hizala"
              aria-label="Sağa hizala"
            >
              <AlignRight size={16} aria-hidden="true" />
            </button>
          </div>

          <label>Yazı rengi
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={styles.swatch}
                  style={{ background: c }}
                  aria-pressed={(el.textColor || '#1f2a24') === c}
                  onClick={() => onPatch({ textColor: c })}
                  aria-label={`Yazı rengi ${c}`}
                />
              ))}
            </div>
          </label>

          {el.variant !== 'text' && (
            <label>Zemin rengi
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.swatch}
                    style={{ background: c }}
                    aria-pressed={el.color === c}
                    onClick={() => onPatch({ color: c })}
                    aria-label={`Not zemin rengi ${c}`}
                  />
                ))}
              </div>
            </label>
          )}
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
      {el.type === 'widget' && el.kind === 'steps' && (() => {
        const stepsList = el.data.steps || [];
        const totalChars = stepsList.reduce((acc, s) => acc + s.length, 0);
        const atMaxSteps = stepsList.length >= 20;
        const atMaxChars = totalChars >= 3000;

        const updateStep = (idx: number, text: string) => {
          const currentLen = stepsList[idx]?.length || 0;
          const otherChars = totalChars - currentLen;
          const maxAllowed = Math.max(0, 3000 - otherChars);
          const clamped = text.slice(0, maxAllowed);
          const next = [...stepsList];
          next[idx] = clamped;
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        const moveStep = (from: number, to: number) => {
          if (to < 0 || to >= stepsList.length) return;
          const next = [...stepsList];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        const removeStep = (idx: number) => {
          const next = stepsList.filter((_, i) => i !== idx);
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        const addStep = () => {
          if (atMaxSteps || atMaxChars) return;
          const next = [...stepsList, ''];
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        return (
          <>
            <label>
              Başlık
              <input
                type="text"
                value={el.data.title ?? ''}
                placeholder="Adım adım"
                maxLength={80}
                onChange={(e) => onPatch({ data: { ...el.data, title: e.target.value } } as Partial<BoardEl>)}
              />
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={Boolean(el.data.lastIsResult)}
                onChange={(e) => onPatch({ data: { ...el.data, lastIsResult: e.target.checked } } as Partial<BoardEl>)}
              />
              <span>Son adımı sonuç olarak göster</span>
            </label>

            <div className={styles.stepEditorSection}>
              <div className={styles.stepEditorHeaderRow}>
                <span className={styles.stepEditorTitle}>Adımlar</span>
                <span className={styles.stepStatsText}>
                  {stepsList.length} / 20 adım · {totalChars} / 3000 k.
                </span>
              </div>

              {stepsList.length === 0 ? (
                <p className={styles.hintText}>Henüz adım eklenmedi.</p>
              ) : (
                <div className={styles.stepEditorList}>
                  {stepsList.map((stepText, idx) => {
                    const isResultStep = Boolean(el.data.lastIsResult && idx === stepsList.length - 1);
                    return (
                      <div key={idx} className={styles.stepEditorRow}>
                        <div className={styles.stepRowHeader}>
                          <span className={styles.stepRowBadge}>
                            <b>{idx + 1}.</b>
                            {isResultStep && <span className={styles.stepRowResultTag}>Sonuç</span>}
                          </span>
                          <div className={styles.stepRowActions}>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => moveStep(idx, idx - 1)}
                              disabled={idx === 0}
                              title="Yukarı taşı"
                              aria-label={`${idx + 1}. adımı yukarı taşı`}
                            >
                              <ChevronUp size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => moveStep(idx, idx + 1)}
                              disabled={idx === stepsList.length - 1}
                              title="Aşağı taşı"
                              aria-label={`${idx + 1}. adımı aşağı taşı`}
                            >
                              <ChevronDown size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.stepActionBtn} ${styles.stepDeleteBtn}`}
                              onClick={() => removeStep(idx)}
                              title="Sil"
                              aria-label={`${idx + 1}. adımı sil`}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <textarea
                          className={styles.stepTextarea}
                          rows={2}
                          value={stepText}
                          placeholder={`${idx + 1}. adımı yazın (satır sonu serbest)…`}
                          onChange={(e) => updateStep(idx, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                className={styles.addStepBtn}
                onClick={addStep}
                disabled={atMaxSteps || atMaxChars}
              >
                + Adım ekle
              </button>

              {(atMaxSteps || atMaxChars) && (
                <p className={styles.limitWarnText}>
                  {atMaxSteps
                    ? 'En fazla 20 adım eklenebilir.'
                    : 'Toplam 3000 karakter sınırına ulaşıldı.'}
                </p>
              )}
            </div>
          </>
        );
      })()}
      {el.type === 'widget' && el.kind === 'timer' && (
        <fieldset className={styles.timeField}>
          <legend>Geri sayım süresi</legend>
          <div className={styles.timeInputs}>
            <label>Dakika
              <input type="number" min={0} max={60} inputMode="numeric" value={Math.floor((el.data.seconds ?? 0) / 60)}
                onChange={(e) => { const m = Math.max(0, Math.min(60, Math.floor(Number(e.target.value) || 0))); onPatch({ data: { ...el.data, seconds: Math.min(3600, m * 60 + ((el.data.seconds ?? 0) % 60)) } } as Partial<BoardEl>); }} />
            </label>
            <label>Saniye
              <input type="number" min={0} max={59} inputMode="numeric" value={(el.data.seconds ?? 0) % 60}
                onChange={(e) => { const sec = Math.max(0, Math.min(59, Math.floor(Number(e.target.value) || 0))); onPatch({ data: { ...el.data, seconds: Math.min(3600, Math.floor((el.data.seconds ?? 0) / 60) * 60 + sec) } } as Partial<BoardEl>); }} />
            </label>
          </div>
          <div className={styles.pageTools}>
            {[1, 3, 5, 10].map((m) => (
              <button key={m} type="button" className={styles.tool} aria-pressed={(el.data.seconds ?? 0) === m * 60} onClick={() => onPatch({ data: { ...el.data, seconds: m * 60 } } as Partial<BoardEl>)}>{m} dk</button>
            ))}
          </div>
          <p className={styles.hintText}>Dakika ve saniye 0 ise kronometre olur (ileri sayar). En fazla 60 dakika.</p>
        </fieldset>
      )}
      <div className={styles.pageTools}>
        <button type="button" className={styles.tool} onClick={() => onOrder('front')}>Öne getir</button>
        <button type="button" className={styles.tool} onClick={() => onOrder('back')}>Arkaya gönder</button>
        <button type="button" className={styles.tool} onClick={onDelete} style={{ color: '#a3283a' }}><Trash2 size={18} aria-hidden="true" /> Sil</button>
      </div>
      {el.type === 'widget' && <p className={styles.hintText}>Parçanın düğmeleri “Seç” aracında da çalışır; taşımak için düğme olmayan yerinden tutup sürükleyin.</p>}
    </section>
  );
}

// --------------------------------------------------------
// Medya çekmecesi: Dosyalarım ve ortak kütüphanedeki resimler
// --------------------------------------------------------
function MediaDrawer({ onInsert, onUpload, busy }: { onInsert: (m: MediaItem) => void; onUpload?: () => void; busy: boolean }) {
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
      <h3>Medya ve Kütüphane</h3>
      <div className={styles.pageTools}>
        <button type="button" className={styles.tool} aria-pressed={source === 'mine'} onClick={() => setSource('mine')}>Dosyalarım</button>
        <button type="button" className={styles.tool} aria-pressed={source === 'library'} onClick={() => setSource('library')}>Kütüphane</button>
        {onUpload && (
          <button type="button" className={styles.tool} onClick={onUpload} disabled={busy} title="Bilgisayardan yeni görsel yükle">
            <Upload size={16} aria-hidden="true" /> Yükle
          </button>
        )}
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
