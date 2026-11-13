'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, Columns, CompassTool, Component,
  Copy, Diamond, Dice, Download, Eraser, Grid3x3, Hand, Hexagon, Highlighter, History, HelpCircle, IconProps, Image as ImageIcon, LaserPointer, Layers, ListOrdered, Maximize, Mic, Minimize, Minus, MousePointer,
  PaintBucket, Palette, Pen, PieChart, Play, Plus, Printer, Protractor, Radio, RotateCcw, RotateCw, Ruler, Save, ScreenCurtain, SetSquare3060, SetSquare45, Shapes, Shuffle, Sliders, Sparkles, Spotlight, Square, Star, StickyNote, Tag, Tally5, TextCursorInput, Timer, Trash2, TrendingUp, Triangle, Type, Unlock, Video, Wheel, X,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import {
  Background, BACKGROUND_LABEL, BOARD_FONT_OPTIONS, BOARD_H, BOARD_IMAGE_BUCKET, BOARD_IMAGE_TYPES, BOARD_W, BoardContent, BoardEl, BoardFontFamily,
  boardImageUrls, BoardPage, BoardRow, byteSize, cloneElements, copyImageToBoard, exportBoardPng, getBoard,
  HISTORY_LIMIT, imageKey, ImageEl, MAX_BOARD_BYTES, mediaRefs, MAX_PAGES, newId, newPage, normalizeTallyItems, NoteEl, PolyEl, saveBoard, scaleElements,
  getWidgetGroups, StrokeEl, uploadBoardImage, WIDGET_LABEL, WIDGET_SIZE, WidgetEl, WidgetKind,
} from '../../lib/boardData';
import { listQuestions, QuestionRow } from '../../lib/quizData';
import { listMyFiles, signedFileUrl, uploadTeacherFiles } from '../../lib/filesData';
import { fileSlug } from '../../lib/reportData';
import { BoardCanvas, DRAW_TOOLS, SHAPE_TOOLS, Tool, wrapTextLines } from './BoardCanvas';
import { computeTextHeight, fitTextWidth, getFontFamily, isDarkFill } from './textLayout';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, translate, ZOOM_STEP } from './boardGeometry';
import { alignElements, distributeElements, type AlignMode, type DistributeAxis } from './snapGuides';
import { normalizeWholeTags } from './BoardFormatBars';
import { WidgetContext, WidgetView } from './Widgets';
import { PresentOverlay, PresentOverlayTool } from './PresentTools';
import { createMeasureTool, MeasureToolItem, MeasureToolKind } from './measureTools';
import { PdfImportModal } from './PdfImportModal';
import {
  getLastUsedParams, getElementsBbox, instantiateItem, LIBRARY_ITEMS, LibraryCategory, LibraryItem, listMyLibraryItems,
  listSchoolLibraryItems, resolveParams, saveLibraryItem, setLastUsedParams, updateLibraryItem, deleteLibraryItem,
} from '../../lib/boardLibrary';
import { ShapeConfigModal } from './ShapeConfigModal';
import { SaveShapeModal } from './SaveShapeModal';
import { EditShapeModal } from './EditShapeModal';
import { BoardVersionsModal } from './BoardVersions';
import { ElementBar } from './BoardElementBar';
import { LiveTeacherSession } from '../live/LiveTeacherSession';

import styles from './Board.module.css';
import { COLORS, MediaDrawer, MultiSelectionPanel, SelectionPanel } from './BoardEditorPanels';

/** Depo yolundan dosyanın adı: "kullanıcı/zamanDamgası-ad.uzantı" → "ad.uzantı" (Dosyalarım ile tahta kopyası aynı adı taşır) */
const storedFileKey = (path: string) => (path.split('/').pop() || '').replace(/^[0-9a-z]{6,12}-/, '').toLowerCase();

/** Parça henüz kurulmamış mı? (ayarları yalnızca panelde olduğu için seçilince panel açılır) */
function widgetNeedsSetup(el: WidgetEl): boolean {
  const d = el.data;
  if (el.kind === 'minitest') return !d.questionId && !d.itemId;
  if (el.kind === 'reveal') return !d.targetId;
  if (el.kind === 'steps') return !(d.steps || []).some((x) => x.trim());
  if (el.kind === 'match') return !(d.pairs || []).some((x) => x.a.trim() || x.b.trim());
  if (el.kind === 'audio') return !d.audio;
  if (el.kind === 'video') return !d.video;
  if (el.kind === 'spinner') return (d.slices || []).filter((x) => typeof x === 'string' && x.trim()).length < 2;
  return false;
}

let boardClipboard: BoardEl[] | null = null;
let boardClipboardPageId: string | null = null;

const WIDTHS = [3, 6, 12];
/** Sunum kalemi kalınlıkları (düğme sırayla değiştirir) */
const PRESENT_WIDTHS = [{ value: 3, label: 'İnce', dot: 5 }, { value: 5, label: 'Orta', dot: 9 }, { value: 10, label: 'Kalın', dot: 14 }];
const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Seç', key: 'v' }, { id: 'pen', label: 'Kalem', key: 'p' }, { id: 'highlighter', label: 'Vurgu', key: 'h' },
  { id: 'eraser', label: 'Silgi', key: 'e' }, { id: 'fill', label: 'Doldur', key: 'f' }, { id: 'line', label: 'Çizgi', key: 'l' }, { id: 'arrow', label: 'Ok', key: 'a' },
  { id: 'rect', label: 'Dikdörtgen', key: 'r' }, { id: 'ellipse', label: 'Daire', key: 'o' }, { id: 'note', label: 'Not', key: 'n' },
  { id: 'text', label: 'Metin', key: 't' },
];

const MEASURE_TOOL_ITEMS: { kind: MeasureToolKind; label: string; icon: React.FC<IconProps> }[] = [
  { kind: 'ruler', label: 'Cetvel', icon: Ruler },
  { kind: 'set45', label: 'Gönye 45°', icon: SetSquare45 },
  { kind: 'set3060', label: 'Gönye 30-60°', icon: SetSquare3060 },
  { kind: 'protractor', label: 'İletki', icon: Protractor },
  { kind: 'compass', label: 'Pergel', icon: CompassTool },
];

export const BOARD_BG_COLORS: { c: string; label: string; dark?: boolean }[] = [
  { c: '#ffffff', label: 'Beyaz' },
  { c: '#faf8f0', label: 'Krem' },
  { c: '#f0f5fa', label: 'Buz Mavisi' },
  { c: '#f2f7f2', label: 'Nane Yeşili' },
  { c: '#fff9e6', label: 'Açık Sarı' },
  { c: '#f3f4f6', label: 'Açık Gri' },
  { c: '#1a3c2f', label: 'Yeşil Tahta', dark: true },
  { c: '#1f2421', label: 'Kara Tahta', dark: true },
  { c: '#182635', label: 'Gece Mavisi', dark: true },
];
const TOOL_LABEL: Record<string, string> = {
  ...Object.fromEntries(TOOLS.map((t) => [t.id, t.label])),
  triangle: 'Üçgen', diamond: 'Eşkenar dörtgen', hexagon: 'Altıgen', star: 'Yıldız',
};

/** Düzenleme alanının sol şeridi: seçilen grubun ayarları yanındaki panelde açılır */
type SideTab = 'draw' | 'shapes' | 'text' | 'media' | 'widgets' | 'page';
const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: 'draw', label: 'Çizim' }, { id: 'shapes', label: 'Şekiller' }, { id: 'text', label: 'Metin' },
  { id: 'media', label: 'Görseller' }, { id: 'widgets', label: 'Öğeler' }, { id: 'page', label: 'Zemin' },
];
const tabOfTool = (t: Tool): SideTab | null => (
  DRAW_TOOLS.includes(t) || t === 'fill' ? 'draw' : SHAPE_TOOLS.includes(t) ? 'shapes' : t === 'text' || t === 'note' ? 'text' : null
);

/** Sayfa şeridindeki küçük resim: sayfa değişmedikçe yeniden çizilmez */
const PageThumb = React.memo(function PageThumb({ page, imageUrls }: { page: BoardPage; imageUrls: Record<string, string> }) {
  return <BoardCanvas page={page} imageUrls={imageUrls} thumbnail />;
});

/** Öğretmen: tahta düzenleyici (çizim, şekil, not, görsel, parçalar, sayfalar, sunum) */
export function BoardEditor({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [content, setContent] = useState<BoardContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(COLORS[0]);
  const isWhiteColor = color?.toLowerCase() === '#ffffff' || color?.toLowerCase() === '#fff';
  const [width, setWidth] = useState(WIDTHS[1]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [past, setPast] = useState<BoardContent[]>([]);
  const [future, setFuture] = useState<BoardContent[]>([]);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  // Sunum: düzenleme yok; kalemle yazılanlar geçicidir (kaydedilmez), sayfa başına ayrı
  const [presenting, setPresenting] = useState(false);
  const [annot, setAnnot] = useState<Record<string, StrokeEl[]>>({});
  const [annotFills, setAnnotFills] = useState<Record<string, PolyEl[]>>({});
  const [annotPast, setAnnotPast] = useState<{ strokes: Record<string, StrokeEl[]>; fills: Record<string, PolyEl[]> }[]>([]);
  const [presentTool, setPresentTool] = useState<Tool>('hand');
  const [presentColor, setPresentColor] = useState('#d03b3b');
  const [presentWidth, setPresentWidth] = useState(5);
  const [penMenuOpen, setPenMenuOpen] = useState(false);
  const [presentPenType, setPresentPenType] = useState<'pen' | 'highlighter' | 'brush' | 'fill'>('pen');
  const [presentOverlay, setPresentOverlay] = useState<PresentOverlayTool>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  // Yakınlaştırma ve kaydırma (oturum içi, kaydedilmez)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [smartPen, setSmartPen] = useState(false);
  const [measureTools, setMeasureTools] = useState<MeasureToolItem[]>([]);
  const [measureMenuOpen, setMeasureMenuOpen] = useState(false);
  const toggleMeasureTool = (k: MeasureToolKind) => {
    setMeasureTools((prev) => (prev.some((t) => t.kind === k) ? prev.filter((t) => t.kind !== k) : [...prev, createMeasureTool(k, newId())]));
  };
  const [showPdfImport, setShowPdfImport] = useState(false);
  const stagePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number; zoom: number; pan: { x: number; y: number } } | null>(null);
  const spacePanRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (!penMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (penMenuRef.current && !penMenuRef.current.contains(e.target as Node)) {
        setPenMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [penMenuOpen]);

  useEffect(() => {
    if (!full || presenting) return;
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const typing = (e.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]');
      if (typing) return;
      e.preventDefault();
      setSpaceDown(true);
    };
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false); };
    const onBlur = () => setSpaceDown(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [full, presenting]);
  const [printing, setPrinting] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Dosyalarım'daki dosyaların adları: tahtadaki resim zaten oradaysa "Dosyalarıma kaydet" gösterilmez
  const [myFileKeys, setMyFileKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let alive = true;
    listMyFiles().then((r) => { if (alive && r.ok) setMyFileKeys(new Set(r.data.map((f) => storedFileKey(f.path)))); });
    return () => { alive = false; };
  }, []);
  const imageInMyFiles = (el: ImageEl) => myFileKeys.has(storedFileKey(el.path));
  // Sağ tık menüsü: konum (ekran pikseli) ve ilgili öğeler (boş alanda ids boş)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; ids: string[] } | null>(null);
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest?.('[data-board-ctx]')) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [ctxMenu]);
  const [showVersions, setShowVersions] = useState(false);
  const [live, setLive] = useState(false);
  // Tam ekranda sağdan açılan panel (sayfalar, zemin, seçili öğe, medya)
  const [panelOpen, setPanelOpen] = useState(false);
  // Panel seçimle kendiliğinden açıldıysa true: seçim bırakılınca yine kendiliğinden kapanır.
  // Kullanıcı paneli kendi açtıysa ya da kapattıysa false; o zaman dokunulmaz.
  const [panelAuto, setPanelAuto] = useState(false);
  /** Paneli kullanıcı açtı: seçim bırakılınca kendiliğinden kapanmaz */
  const openPanelManually = () => { setPanelAuto(false); setPanelOpen(true); };
  // Sol panel: hangi araç grubu açık (dar ekranda kapalı başlar, tahtanın üstünde açılır)
  const [sideTab, setSideTab] = useState<SideTab>('draw');
  const [sideOpen, setSideOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 1100);
  /** Araç seçilince ilgili grup sol panelde açılır (klavye kısayolları da buradan geçer) */
  const chooseTool = (t: Tool) => {
    setTool(t);
    const tab = tabOfTool(t);
    if (tab) { setSideTab(tab); setSideOpen(true); }
  };
  const openTab = (id: SideTab) => {
    const armPen = id === 'draw' && !DRAW_TOOLS.includes(tool) && tool !== 'fill';
    if (armPen) setTool('pen');
    // Ayar görünümü açıksa şerit düğmesi araç listesine döndürür
    if (panelOpen && selectedIds.length) { setPanelAuto(false); setPanelOpen(false); setSideTab(id); setSideOpen(true); return; }
    if (sideOpen && sideTab === id && !armPen) { setSideOpen(false); return; }
    setSideTab(id);
    setSideOpen(true);
  };
  // Sayfa silme onayı tahtanın içinde açılır (tarayıcı tam ekrandayken dışarıdaki pencereler görünmez)
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Ayarlı kütüphane şekilleri için modal (ekleme veya düzenleme)
  const [configModal, setConfigModal] = useState<{
    mode: 'insert' | 'edit';
    item: LibraryItem;
    initialParams?: Record<string, number>;
    groupId?: string;
    elementId?: string;
  } | null>(null);
  // Kütüphaneme kaydet / düzenle pencereleri ve kayıtlı şekiller
  const [saveModal, setSaveModal] = useState<{ elements: BoardEl[] } | null>(null);
  const [editModal, setEditModal] = useState<{ item: LibraryItem; initialField: 'name' | 'category' } | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [userLibraryItems, setUserLibraryItems] = useState<LibraryItem[]>([]);
  const [schoolLibraryItems, setSchoolLibraryItems] = useState<LibraryItem[]>([]);
  const [isLoadingUserItems, setIsLoadingUserItems] = useState(false);
  const [userItemsError, setUserItemsError] = useState<string | null>(null);
  // Önizlemede sayfa sırası sürükle-bırakla değişir
  const [dragPage, setDragPage] = useState<number | null>(null);
  const [dropPage, setDropPage] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  // Sun kipi ve ortak adım durumu: widget kimliği → açık adım sayısı
  const [stepOpen, setStepOpen] = useState<Record<string, number>>({});

  const loadUserLibrary = async () => {
    setIsLoadingUserItems(true);
    setUserItemsError(null);
    try {
      const res = await listMyLibraryItems();
      if (!res.ok) {
        setUserItemsError(res.error);
      } else {
        setUserLibraryItems(res.data);
      }
    } catch (e) {
      setUserItemsError((e as Error).message || 'Kütüphane yüklenemedi.');
    } finally {
      setIsLoadingUserItems(false);
    }
  };

  const loadSchoolLibrary = async () => {
    try {
      const res = await listSchoolLibraryItems();
      if (res.ok) {
        setSchoolLibraryItems(res.data);
      }
    } catch {
      // Okul kayıtları yüklenemezse sessiz geç
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadUserLibrary();
      loadSchoolLibrary();
    });
  }, []);

  // Dosya seçme penceresi açılınca tarayıcı tam ekrandan kendiliğinden çıkar. Geri dönmek kullanıcı
  // hareketi ister: önce hemen denenir, tarayıcı reddederse tahtaya ilk dokunuşta yeniden girilir.
  const fullRef = useRef(full);
  useEffect(() => { fullRef.current = full; }, [full]);
  // Tarayıcı tam ekranı tahtadan bağımsızdır: tam ekrandan çıkılınca düzenleme / ders açık kalır
  const [fsActive, setFsActive] = useState(false);
  const wantFsRef = useRef(false);
  const toggleBrowserFs = () => {
    if (document.fullscreenElement) {
      wantFsRef.current = false;
      document.exitFullscreen().catch(() => { });
    } else {
      wantFsRef.current = true;
      rootRef.current?.requestFullscreen?.().catch(() => { });
    }
  };
  // Üst çubuktaki biçim satırı (metin ve çoklu seçim çubukları burada gösterilir) ve kısayol penceresi
  const [barHost, setBarHost] = useState<HTMLDivElement | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const fsRetryRef = useRef<(() => void) | null>(null);
  const reenterFullscreen = () => {
    isUploadingRef.current = false;
    const el = rootRef.current;
    if (!fullRef.current || !wantFsRef.current || !el?.requestFullscreen || document.fullscreenElement || fsRetryRef.current) return;
    el.requestFullscreen().catch(() => {
      if (fsRetryRef.current) return;
      const once = () => {
        document.removeEventListener('pointerdown', once, true);
        fsRetryRef.current = null;
        if (fullRef.current && wantFsRef.current && !document.fullscreenElement) rootRef.current?.requestFullscreen?.().catch(() => { });
      };
      fsRetryRef.current = once;
      document.addEventListener('pointerdown', once, true);
    });
  };
  const reenterFullscreenRef = useRef(reenterFullscreen);
  useEffect(() => { reenterFullscreenRef.current = reenterFullscreen; });
  useEffect(() => () => {
    if (fsRetryRef.current) document.removeEventListener('pointerdown', fsRetryRef.current, true);
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (isUploadingRef.current) window.setTimeout(() => reenterFullscreenRef.current(), 500);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

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
  const libraryInsertState = useRef<{ content: BoardContent | null; pageId?: string } | null>(null);
  const libraryImageRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    libraryInsertState.current = { content, pageId: page?.id };
  }, [content, page?.id]);
  useEffect(() => () => {
    libraryInsertState.current = null;
    libraryImageRequest.current?.abort();
  }, []);
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
    mediaUrls: imageUrls,
  }), [questionMap, allWidgets, stepState, imageUrls]);

  // Görsel adresleri
  const imageKeys = useMemo(() => Array.from(new Set(mediaRefs(content?.pages || []).map((e) => imageKey(e)))).sort().join('|'), [content]);
  useEffect(() => {
    const missing = imageKeys ? imageKeys.split('|').filter((k) => !imageUrls[k]) : [];
    if (!missing.length) return;
    let alive = true;
    boardImageUrls(missing.map((k) => ({ bucket: k.slice(0, k.indexOf('/')), path: k.slice(k.indexOf('/') + 1) }))).then((u) => { if (alive) setImageUrls((prev) => ({ ...prev, ...u })); });
    return () => { alive = false; };
  }, [imageKeys, imageUrls]);

  // ---- Değişiklik + geçmiş (50 adım) ----
  const apply = (next: BoardContent, previous = content) => {
    if (previous) setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), previous]);
    setFuture([]);
    setContent(next);
    setSaveState('dirty');
  };
  const updatePage = (patch: Partial<BoardPage>) => {
    if (!content || !page) return;
    apply({ ...content, pages: content.pages.map((p) => (p.id === page.id ? { ...p, ...patch } : p)) });
  };
  const handleBgColorChange = (newBg: string) => {
    updatePage({ backgroundColor: newBg });
    if (isDarkFill(newBg) && (color === '#1f2a24' || color === '#20352d')) {
      setColor('#ffffff');
    } else if (!isDarkFill(newBg) && color === '#ffffff') {
      setColor('#1f2a24');
    }
  };
  const applyBgToAllPages = () => {
    if (!content || !page) return;
    const bg = page.background;
    const bgColor = page.backgroundColor || '#ffffff';
    apply({
      ...content,
      pages: content.pages.map((p) => ({
        ...p,
        background: bg,
        backgroundColor: bgColor,
      })),
    });
    setNotice('Zemin tüm sayfalara uygulandı.');
  };
  const commitElements = (elements: BoardEl[]) => updatePage({ elements });
  const patchElement = (id: string, patch: Partial<BoardEl>) => {
    if (!page) return;
    commitElements(page.elements.map((e) => {
      if (e.id !== id) return e;
      let next = { ...e, ...patch } as BoardEl;
      if (next.type === 'note' && next.variant === 'text') {
        // Yazıya oturan kutu: yazma sürmüyorken biçim değişince (boyut, kalınlık…) genişlik yeniden hesaplanır
        if (next.autoW !== false && id !== editingNoteId && !('w' in patch)) {
          const fitted = fitTextWidth(next);
          if (fitted != null) next = { ...next, w: fitted, autoW: true };
        }
        const autoH = computeTextHeight(next);
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
    setSelectedIds([]);
    setSaveState('dirty');
  };
  const redo = () => {
    if (!future.length || !content) return;
    setPast((p) => [...p, content].slice(-HISTORY_LIMIT));
    setContent(future[0]);
    setFuture((f) => f.slice(1));
    setSelectedIds([]);
    setSaveState('dirty');
  };

  // Ok tuşlarıyla kaydırma: tuşa basılı tutulunca geçmiş tek adım olarak kalır (50 adımlık geri al dolmasın)
  const nudgeRef = useRef<{ key: string; at: number } | null>(null);
  const nudgeSelected = (dx: number, dy: number) => {
    if (!content || !page || !selectedIds.length) return;
    const idSet = new Set(selectedIds);
    const next: BoardContent = {
      ...content,
      pages: content.pages.map((p) => (p.id === page.id ? { ...p, elements: p.elements.map((el) => (idSet.has(el.id) ? translate(el, dx, dy) : el)) } : p)),
    };
    const key = `${page.id}:${selectedIds.join(',')}`;
    const now = Date.now();
    const last = nudgeRef.current;
    nudgeRef.current = { key, at: now };
    if (last && last.key === key && now - last.at < 800) {
      setContent(next);
      setSaveState('dirty');
    } else {
      apply(next);
    }
  };

  /** Sunumda bu sayfaya yazılanları tahtanın kendisine ekler (istenirse; yoksa sunum bitince silinir) */
  const savePresentAnnotations = () => {
    if (!content || !page) return;
    const strokes = annot[page.id] || [];
    const fills = annotFills[page.id] || [];
    if (!strokes.length && !fills.length) return;
    const next: BoardContent = { ...content, pages: content.pages.map((p) => (p.id === page.id ? { ...p, elements: [...p.elements, ...fills, ...strokes] } : p)) };
    if (byteSize(next) > MAX_BOARD_BYTES) { setNotice('Tahta boyutu sınırına ulaşıldı, yazılanlar kaydedilemedi.'); return; }
    apply(next);
    setAnnot({ ...annot, [page.id]: [] });
    setAnnotFills({ ...annotFills, [page.id]: [] });
    // Kaydedilen çizgiler artık sayfanın parçası: sunum geri al'ı onları ikinci kez getirmesin
    setAnnotPast([]);
    setNotice('Yazılanlar bu sayfaya kaydedildi.');
  };

  // Bu özellikten önce eklenmiş, yazısından uzun metin kutusu seçilince bir kez yazıya oturtulur.
  // Her kutu oturumda yalnızca bir kez denenir; böylece geri al (Ctrl+Z) bu düzeltmeye takılıp kalmaz.
  // Seçim anında değil, bir sonraki çizimden sonra çağrılır (ref güncel sayfayı görür); aynı tıklamada
  // yapılmış başka bir kaydın (ör. düzenlenen yazının) üzerine eski sayfayla yazılmaz.
  const fittedOnceRef = useRef(new Set<string>());
  const fitLegacyText = (id: string) => {
    if (!page || editingNoteId) return;
    const el = page.elements.find((e) => e.id === id);
    if (!el || el.type !== 'note' || el.variant !== 'text' || el.autoW !== undefined) return;
    if (fittedOnceRef.current.has(el.id)) return;
    fittedOnceRef.current.add(el.id);
    const fitted = fitTextWidth(el);
    if (fitted != null && fitted < el.w) patchElement(el.id, { w: fitted, autoW: true } as Partial<BoardEl>);
  };
  const fitLegacyTextRef = useRef(fitLegacyText);
  useEffect(() => { fitLegacyTextRef.current = fitLegacyText; });

  const deleteSelected = (idsToDelete?: string[]) => {
    const targetIds = idsToDelete || selectedIds;
    if (!page || !targetIds.length) return;
    const idSet = new Set(targetIds);
    commitElements(page.elements.filter((el) => !idSet.has(el.id) || el.locked));
    setSelectedIds([]);
  };

  const lockElements = (ids: string[]) => {
    if (!page || !ids.length) return;
    const idSet = new Set(ids);
    commitElements(page.elements.map((el) => (idSet.has(el.id) ? { ...el, locked: true } : el)));
    setSelectedIds([]);
  };

  const unlockAllOnPage = () => {
    if (!page) return;
    if (!page.elements.some((el) => el.locked)) return;
    commitElements(page.elements.map((el) => (el.locked ? { ...el, locked: undefined } : el)));
  };

  const handleAlign = (mode: AlignMode) => {
    if (!page || selectedIds.length < 2) return;
    commitElements(alignElements(page.elements, selectedIds, mode));
  };

  const handleDistribute = (axis: DistributeAxis) => {
    if (!page || selectedIds.length < 3) return;
    commitElements(distributeElements(page.elements, selectedIds, axis));
  };

  const reorderElements = (dir: 'front' | 'back', targetIds?: string[]) => {
    const ids = targetIds || selectedIds;
    if (!page || !ids.length) return;
    const idSet = new Set(ids);
    const selectedList = page.elements.filter((el) => idSet.has(el.id));
    const unselectedList = page.elements.filter((el) => !idSet.has(el.id));
    const next = dir === 'front' ? [...unselectedList, ...selectedList] : [...selectedList, ...unselectedList];
    commitElements(next);
  };

  const duplicateElements = (targetIds?: string[]) => {
    const ids = targetIds || selectedIds;
    if (!page || !ids.length) return;
    const idSet = new Set(ids);
    const toClone = page.elements.filter((el) => idSet.has(el.id));
    if (!toClone.length) return;
    const clones = cloneElements(toClone, 24, 24);
    commitElements([...page.elements, ...clones]);
    setSelectedIds(clones.map((c) => c.id));
  };

  const copySelected = () => {
    if (!page || !selectedIds.length) return;
    const idSet = new Set(selectedIds);
    const toCopy = page.elements.filter((el) => idSet.has(el.id));
    if (!toCopy.length) return;
    boardClipboard = toCopy;
    boardClipboardPageId = page.id;
  };

  const pasteClipboard = () => {
    if (!page || !boardClipboard || !boardClipboard.length) return;
    const isSamePage = boardClipboardPageId === page.id;
    const offset = isSamePage ? 24 : 0;
    const pasted = cloneElements(boardClipboard, offset, offset);
    if (isSamePage) {
      boardClipboard = pasted;
    }
    commitElements([...page.elements, ...pasted]);
    setSelectedIds(pasted.map((p) => p.id));
  };

  const groupSelected = (targetIds?: string[]) => {
    const ids = targetIds || selectedIds;
    if (!page || ids.length < 2) return;
    const gid = newId();
    const idSet = new Set(ids);
    commitElements(page.elements.map((el) => (idSet.has(el.id) ? { ...el, groupId: gid } : el)));
  };

  const ungroupSelected = (targetIds?: string[]) => {
    const ids = targetIds || selectedIds;
    if (!page || !ids.length) return;
    const idSet = new Set(ids);
    const selectedElements = page.elements.filter((el) => idSet.has(el.id));
    const targetGroupIds = new Set(selectedElements.map((el) => el.groupId).filter(Boolean));
    commitElements(
      page.elements.map((el) => {
        if (idSet.has(el.id) || (el.groupId && targetGroupIds.has(el.groupId))) {
          const next = { ...el };
          delete next.groupId;
          delete next.lib;
          return next;
        }
        return el;
      })
    );
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

  // ---- Tam ekran sunum / düzenleme alanı ----
  const toggleFull = (enterBrowserFs = true) => {
    if (!full) {
      setFull(true);
      setSelectedIds([]);
      if (enterBrowserFs) {
        wantFsRef.current = true;
        const req = rootRef.current?.requestFullscreen?.();
        req?.catch(() => { });
      } else {
        wantFsRef.current = false;
      }
    } else {
      setFull(false);
      setPresenting(false);
      setPresentOverlay(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      wantFsRef.current = false;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    }
  };
  const startPresent = () => {
    setPresenting(true);
    setPresentTool('hand');
    setAnnot({});
    setAnnotFills({});
    setAnnotPast([]);
    setEditingNoteId(null);
    setStepOpen({});
    toggleFull(true);
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
      const prev = annotPast[annotPast.length - 1];
      setAnnot(prev.strokes);
      setAnnotFills(prev.fills);
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
          if (e.key === 'Escape') {
            if (penMenuOpen) { setPenMenuOpen(false); return; }
            if (presentOverlay) { setPresentOverlay(null); return; }
            toggleFull();
            return;
          }
          if (e.defaultPrevented) return;
          if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); advancePresentStepOrPage(); return; }
          if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); revertPresentStepOrPage(); return; }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoAnnot(); return; }
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          const k = e.key.toLowerCase();
          if (k === 'h') { setPresentOverlay((cur) => (cur === 'laser' ? null : cur)); setPenMenuOpen(false); setPresentTool('hand'); }
          if (k === 'p') { setPresentOverlay((cur) => (cur === 'laser' ? null : cur)); setPresentTool('pen'); }
          if (k === 'e') { setPresentOverlay((cur) => (cur === 'laser' ? null : cur)); setPenMenuOpen(false); setPresentTool('eraser'); }
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && page) {
          e.preventDefault();
          setSelectedIds(page.elements.filter((el) => !el.locked).map((el) => el.id));
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedIds.length && page) {
          e.preventDefault();
          copySelected();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && page) {
          e.preventDefault();
          pasteClipboard();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && page) {
          e.preventDefault();
          duplicateElements();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g' && page) {
          e.preventDefault();
          if (e.shiftKey) {
            ungroupSelected();
          } else {
            groupSelected();
          }
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length && page) {
          e.preventDefault();
          deleteSelected();
          return;
        }
        if (e.key === 'Escape') {
          if (editingNoteId) {
            setEditingNoteId(null);
            return;
          }
          if (panelOpen) {
            setPanelAuto(false);
            setPanelOpen(false);
            return;
          }
          if (selectedIds.length) {
            setSelectedIds([]);
            return;
          }
          if (full) toggleFull();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && selectedIds.length === 1 && page) {
          const sel = page.elements.find((el) => el.id === selectedIds[0]);
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
        // Seçili öğe varken ok tuşları öğeyi kaydırır (Shift ile büyük adım); seçim yokken sayfa değiştirir
        if (selectedIds.length && e.key.startsWith('Arrow')) {
          const step = e.shiftKey ? 20 : 2;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          if (dx || dy) { e.preventDefault(); nudgeSelected(dx, dy); return; }
        }
        const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
        if (t) chooseTool(t.id);
        if (e.key === 'ArrowRight' && full && content) setPageIndex((i) => Math.min(content.pages.length - 1, i + 1));
        if (e.key === 'ArrowLeft' && full) setPageIndex((i) => Math.max(0, i - 1));
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    });

    useEffect(() => {
      const onFs = () => {
        const on = !!document.fullscreenElement;
        setFsActive(on);
        // Dosya seçme penceresi tam ekranı kendiliğinden kapatır; o durumda geri dönülür. Kullanıcı kendi çıktıysa dönülmez.
        if (!on && !isUploadingRef.current) wantFsRef.current = false;
      };
      document.addEventListener('fullscreenchange', onFs);
      return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);

    // ---- Sayfalar ----
    const addPage = () => {
      if (!content) return;
      if (content.pages.length >= MAX_PAGES) { setNotice(`En fazla ${MAX_PAGES} sayfa olabilir.`); return; }
      const pages = [...content.pages];
      pages.splice(pageIndex + 1, 0, newPage(page?.background || 'blank', page?.backgroundColor || '#ffffff'));
      apply({ ...content, pages });
      setPageIndex(pageIndex + 1);
    };
    const duplicatePage = () => {
      if (!content || !page) return;
      if (content.pages.length >= MAX_PAGES) { setNotice(`En fazla ${MAX_PAGES} sayfa olabilir.`); return; }
      const copy: BoardPage = { ...page, id: newId(), elements: cloneElements(page.elements) };
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
      setSelectedIds([]);
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
      setSelectedIds([el.id]);
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
    /** Tahtadaki resmi Dosyalarım'a kopyalar: dosya indirilir ve olağan yükleme yolundan (tür, boyut, kota denetimi) geçer */
    const saveImageToFiles = async (el: ImageEl) => {
      if (busy) return;
      setBusy(true);
      try {
        const signed = await signedFileUrl(el.bucket, el.path);
        if (!signed.ok) { setNotice(`Resim kaydedilemedi: ${signed.error}`); return; }
        const res = await fetch(signed.data);
        if (!res.ok) { setNotice('Resim kaydedilemedi: dosya okunamadı.'); return; }
        const blob = await res.blob();
        // Depodaki ad "zamanDamgası-ad.uzantı" biçimindedir; Dosyalarım'da okunaklı görünsün diye damga atılır
        const name = (el.path.split('/').pop() || 'resim').replace(/^[0-9a-z]{6,12}-/, '') || 'resim';
        const { uploaded, errors } = await uploadTeacherFiles([new File([blob], name, { type: blob.type })], null, {}, 0);
        if (uploaded.length) setMyFileKeys((prev) => new Set(prev).add(storedFileKey(el.path)));
        setNotice(uploaded.length ? 'Resim Dosyalarım’a kaydedildi.' : `Resim kaydedilemedi: ${errors[0] || 'bilinmeyen hata'}`);
      } catch {
        setNotice('Resim kaydedilemedi: bağlantı hatası.');
      } finally {
        setBusy(false);
      }
    };
    const insertMedia = async (m: { bucket: string; path: string; name: string }, x?: number, y?: number) => {
      setBusy(true);
      const res = await copyImageToBoard(m.bucket, m.path, m.name);
      setBusy(false);
      if (!res.ok) { setNotice(`Görsel eklenemedi: ${res.error}`); return; }
      placeImage(res.data, x, y);
    };
    const insertShape = async (shapeId: string, cx = BOARD_W / 2, cy = BOARD_H / 2, params?: Record<string, number>) => {
    if (shapeId === 'math.clock') { addWidget('clock'); return; }
      if (!page) return;
      const allItems = [...userLibraryItems, ...schoolLibraryItems, ...LIBRARY_ITEMS];
      const item = allItems.find((it) => it.id === shapeId);
      if (!item) return;
      const newElements = instantiateItem(item, { x: cx, y: cy }, params);
      if (!newElements.length) return;

      if (item.imageSource) {
        if (busy || libraryImageRequest.current) return;
        const controller = new AbortController();
        libraryImageRequest.current = controller;
        setBusy(true);
        try {
          const response = await fetch(item.imageSource, { signal: controller.signal });
          if (!response.ok) throw new Error('Görsel dosyası okunamadı.');
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          const filename = `${newId()}-${item.imageSource.split('/').pop() || 'okul-esyasi.png'}`;
          const uploaded = await uploadBoardImage(new File([blob], filename, { type: blob.type }));
          if (controller.signal.aborted) return;
          if (!uploaded.ok) { setNotice(`Görsel eklenemedi: ${uploaded.error}`); return; }
          const latest = libraryInsertState.current;
          const targetPage = latest?.content?.pages.find((candidate) => candidate.id === page.id);
          if (!latest?.content || !targetPage) return;
          const images = newElements.map((element) => element.type === 'image'
            ? { ...element, bucket: BOARD_IMAGE_BUCKET, path: uploaded.data.path }
            : element);
          const next = {
            ...latest.content, pages: latest.content.pages.map((candidate) => candidate.id === targetPage.id
              ? { ...candidate, elements: [...candidate.elements, ...images] }
              : candidate)
          };
          if (byteSize(next) > MAX_BOARD_BYTES) { setNotice('Tahta boyutu sınırına ulaşıldı, görsel eklenemedi.'); return; }
          apply(next, latest.content);
          if (latest.pageId === targetPage.id) {
            setSelectedIds(images.map((element) => element.id));
            setTool('select');
          }
        } catch (error) {
          if (!controller.signal.aborted) setNotice(error instanceof Error ? `Görsel eklenemedi: ${error.message}` : 'Görsel eklenemedi. Yeniden deneyin.');
        } finally {
          libraryImageRequest.current = null;
          if (libraryInsertState.current) setBusy(false);
        }
        return;
      }

      const nextElements = [...page.elements, ...newElements];
      if (content) {
        const nextPages = content.pages.map((p) => (p.id === page.id ? { ...p, elements: nextElements } : p));
        if (byteSize({ ...content, pages: nextPages }) > MAX_BOARD_BYTES) {
          setNotice('Tahta boyutu sınırına ulaşıldı, şekil eklenemedi.');
          return;
        }
      }

      commitElements(nextElements);
      setSelectedIds(newElements.map((el) => el.id));
      setTool('select');
    };

    const handleRequestInsertShape = (shapeId: string) => {
      // Şekiller'deki "Saat" sabit çizim yerine kolları oynatılabilen Saat parçasını ekler
      if (shapeId === 'math.clock') { addWidget('clock'); return; }
      const allItems = [...userLibraryItems, ...schoolLibraryItems, ...LIBRARY_ITEMS];
      const item = allItems.find((it) => it.id === shapeId);
      if (!item) return;
      if (item.params && item.params.length > 0) {
        const last = getLastUsedParams(item.id);
        const initial = last ? resolveParams(item, last) : resolveParams(item);
        setConfigModal({
          mode: 'insert',
          item,
          initialParams: initial,
        });
      } else {
        insertShape(shapeId);
      }
    };

    /** Resimler ve Mini Test / Cevabı Göster parçaları kütüphaneye kaydedilemez; seçimde varsa düğme gösterilmez */
    const canSaveToLibrary = (els: BoardEl[]) => els.length > 0 && !els.some((el) => (
      el.type === 'image' || (el.type === 'widget' && (el.kind === 'minitest' || el.kind === 'reveal'))
    ));
    const handleOpenSaveModal = (elementsToSave: BoardEl[]) => {
      if (!elementsToSave.length) return;
      if (!canSaveToLibrary(elementsToSave)) {
        setNotice('Resimler ve Mini Test/Cevabı Göster parçaları kütüphaneye kaydedilemez.');
        return;
      }
      setSaveModal({ elements: elementsToSave });
    };

    const handleSaveShape = async (name: string, category: LibraryCategory, visibility: 'private' | 'school' | 'branch') => {
      if (!saveModal) return;
      setSaveBusy(true);
      const res = await saveLibraryItem({
        name,
        category,
        elements: saveModal.elements,
        visibility,
      });
      setSaveBusy(false);
      if (!res.ok) {
        throw new Error(res.error);
      }
      setSaveModal(null);
      setNotice('Kütüphanenize kaydedildi.');
      loadUserLibrary();
    };

    const handleUpdateShape = async (id: string, patch: { name: string; category: LibraryCategory; visibility?: 'private' | 'school' | 'branch' }) => {
      setSaveBusy(true);
      const res = await updateLibraryItem(id, patch);
      setSaveBusy(false);
      if (!res.ok) {
        throw new Error(res.error);
      }
      setEditModal(null);
      setNotice('Şekil güncellendi.');
      loadUserLibrary();
    };

    const handleDeleteShape = async (item: LibraryItem) => {
      const rowId = item.rowId || item.id.replace(/^user:/, '');
      const res = await deleteLibraryItem(rowId);
      if (!res.ok) {
        setNotice(`Şekil silinemedi: ${res.error}`);
        return;
      }
      setNotice('Şekil kütüphanenizden silindi.');
      loadUserLibrary();
    };

    const handleToggleSchoolShare = async (item: LibraryItem) => {
      const rowId = item.rowId || item.id.replace(/^user:/, '');
      // Paylaşılmışsa (okul ya da zümre) kaldırılır, değilse okulla paylaşılır
      const nextVisibility = item.visibility && item.visibility !== 'private' ? 'private' : 'school';
      const res = await updateLibraryItem(rowId, { visibility: nextVisibility });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setNotice(nextVisibility === 'school' ? 'Okulunuzla paylaşıldı.' : 'Paylaşım kaldırıldı.');
      loadUserLibrary();
      loadSchoolLibrary();
    };

    const handleCopySchoolItem = async (item: LibraryItem) => {
      setSaveBusy(true);
      const res = await saveLibraryItem({
        name: `${item.name} (kopya)`.slice(0, 80),
        category: item.category,
        elements: item.build(),
        visibility: 'private',
      });
      setSaveBusy(false);
      if (!res.ok) {
        setNotice(`Kopyalanamadı: ${res.error}`);
        return;
      }
      setNotice('Kütüphanenize kopyalandı.');
      loadUserLibrary();
    };

    const canConfigureSelected = useMemo(() => {
      if (!page || !selectedIds.length) return false;
      const selectedElements = page.elements.filter((el) => selectedIds.includes(el.id));
      if (!selectedElements.length) return false;
      const firstLib = selectedElements[0].lib;
      if (!firstLib) return false;
      const item = LIBRARY_ITEMS.find((it) => it.id === firstLib.id);
      if (!item || !item.params || !item.params.length) return false;
      const gid = selectedElements[0].groupId;
      const allSameGroup = gid ? selectedElements.every((el) => el.groupId === gid) : selectedElements.length === 1;
      return allSameGroup && selectedElements.every((el) => el.lib?.id === item.id);
    }, [page, selectedIds]);

    const handleOpenConfigureSelected = () => {
      if (!page || !selectedIds.length) return;
      const selectedElements = page.elements.filter((el) => selectedIds.includes(el.id));
      if (!selectedElements.length) return;
      const firstLib = selectedElements[0].lib;
      if (!firstLib) return;
      const item = LIBRARY_ITEMS.find((it) => it.id === firstLib.id);
      if (!item || !item.params || !item.params.length) return;
      const allSameLib = selectedElements.every((el) => el.lib?.id === item.id);
      if (!allSameLib) return;

      const gid = selectedElements[0].groupId;
      setConfigModal({
        mode: 'edit',
        item,
        initialParams: firstLib.params || resolveParams(item),
        groupId: gid,
        elementId: gid ? undefined : selectedElements[0].id,
      });
    };

    const applyShapeConfig = (
      item: LibraryItem,
      newParams: Record<string, number>,
      targetGroupId?: string,
      targetElementId?: string
    ) => {
      if (!page) return;
      const targetElements = page.elements.filter((el) =>
        targetGroupId ? el.groupId === targetGroupId : el.id === targetElementId
      );
      if (!targetElements.length) return;

      const prevScale = targetElements[0]?.lib?.scale ?? 1;
      const oldBbox = getElementsBbox(targetElements);
      const resolved = resolveParams(item, newParams);
      if (item.params && item.params.length > 0) {
        setLastUsedParams(item.id, resolved);
      }

      let raw = item.build(resolved);
      if (!raw.length) return;
      if (prevScale !== 1) {
        raw = scaleElements(raw, 0, 0, prevScale, wrapTextLines);
      }
      const rawBbox = getElementsBbox(raw);

      let destX = oldBbox.x;
      let destY = oldBbox.y;
      if (destX + rawBbox.w > BOARD_W) {
        destX = Math.max(0, BOARD_W - rawBbox.w);
      }
      if (destY + rawBbox.h > BOARD_H) {
        destY = Math.max(0, BOARD_H - rawBbox.h);
      }
      const dx = Math.round(destX - rawBbox.x);
      const dy = Math.round(destY - rawBbox.y);

      const regenerated = cloneElements(raw, dx, dy);
      const gid = targetGroupId || (regenerated.length >= 2 ? newId() : undefined);
      for (const el of regenerated) {
        if (gid) el.groupId = gid;
        el.lib = { id: item.id, params: resolved, scale: prevScale };
      }

      const oldIdSet = new Set(targetElements.map((el) => el.id));
      const firstIdx = page.elements.findIndex((el) => oldIdSet.has(el.id));
      if (firstIdx === -1) return;

      const before = page.elements.slice(0, firstIdx).filter((el) => !oldIdSet.has(el.id));
      const after = page.elements.slice(firstIdx).filter((el) => !oldIdSet.has(el.id));
      const finalElements = [...before, ...regenerated, ...after];

      if (content) {
        const nextPages = content.pages.map((p) => (p.id === page.id ? { ...p, elements: finalElements } : p));
        if (byteSize({ ...content, pages: nextPages }) > MAX_BOARD_BYTES) {
          setNotice('Tahta boyutu sınırına ulaşıldı, ayarlar uygulanamadı.');
          return;
        }
      }

      commitElements(finalElements);
      setSelectedIds(regenerated.map((el) => el.id));
    };
    /** Hazır metin türü: tahtanın ortasına eklenir ve yazmaya hazır açılır */
    const addTextPreset = (kind: 'title' | 'subtitle' | 'body' | 'boxed' | 'note', fontFamily?: BoardFontFamily) => {
      if (!page) return;
      let el: NoteEl;
      if (kind === 'note') {
        el = { id: newId(), type: 'note', x: Math.round((BOARD_W - 420) / 2), y: Math.round((BOARD_H - 240) / 2), w: 420, h: 240, text: '', color: '#fff3b0', fontSize: 32, ...(fontFamily ? { fontFamily } : {}) };
      } else {
        const w = kind === 'title' ? 900 : 620;
        const fontSize = kind === 'title' ? 72 : kind === 'subtitle' ? 42 : fontFamily ? 42 : 32;
        const base: NoteEl = {
          id: newId(), type: 'note', variant: 'text', x: Math.round((BOARD_W - w) / 2), y: 0, w, h: 0, text: '', color: 'transparent',
          textColor: '#1f2a24', fontSize,
          ...(fontFamily ? { fontFamily } : {}),
          ...(kind === 'title' || kind === 'subtitle' ? { fontWeight: 700 as const } : {}),
          ...(kind === 'boxed' ? { boxFill: '#fff3d6', boxBorder: '#f08c00', boxRadius: 12 as const } : {}),
          autoW: true,
        };
        const h = computeTextHeight(base);
        el = { ...base, h, y: Math.round((BOARD_H - h) / 2) };
      }
      commitElements([...page.elements, el]);
      setTool('select');
      setSelectedIds([el.id]);
      setEditingNoteId(el.id);
    };
    const addWidget = (kind: WidgetKind) => {
      if (!page) return;
      const size = WIDGET_SIZE[kind];
      const defaultData =
        kind === 'steps' ? { title: 'Adım adım', steps: ['', ''] } :
          kind === 'timer' ? { seconds: 0 } :
            kind === 'match' ? { title: 'Eşleştirme', pairs: [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }] } :
              kind === 'order' ? { title: 'Sıralama', orderItems: ['1. Adım', '2. Adım', '3. Adım'] } :
                kind === 'sort' ? { title: 'Gruplara Ayırma', sortGroups: [{ title: '1. Grup', items: ['Öğe 1'] }, { title: '2. Grup', items: ['Öğe 2'] }] } :
                  kind === 'blanks' ? { title: 'Boşluk Doldurma', blanksText: 'Türkiye’nin başkenti [Ankara]’dır.', blanksDistractors: ['İstanbul'] } :
                    kind === 'label' ? { title: 'Görsel Etiketleme', labelPoints: [] } :
                      kind === 'fraction' ? { title: 'Kesir Boyama', fractionShape: 'circle' as const, fractionParts: 4, fractionNum: 3, fractionDen: 4, showFraction: true } :
                        kind === 'graph' ? { title: 'Fonksiyon Grafiği', graphExpr1: '2x+1', graphExpr2: '', graphXMin: -10, graphXMax: 10, graphYMin: -10, graphYMax: 10 } :
                          kind === 'bar' ? { title: 'Sütun Grafiği', barMode: 'show' as const, barOrientation: 'vertical' as const, barStep: 1 as const, barXAxis: '', barYAxis: '', barCategories: [{ label: 'Elma', value: 4 }, { label: 'Armut', value: 6 }, { label: 'Muz', value: 3 }], barQuestions: [{ prompt: 'En çok hangisi?', answer: 'Armut' }] } :
                            kind === 'tally' ? { title: 'Çetele Tablosu', tallyMode: 'show' as const, tallyItems: [{ label: 'Kırmızı', count: 7 }, { label: 'Mavi', count: 5 }, { label: 'Yeşil', count: 9 }] } :
                              kind === 'numgrid' ? { title: 'Sayı Tablosu', numGridStart: 1, numGridEnd: 100, numGridHidden: [], numGridRule: 'none' as const } :
                                kind === 'clock' ? { title: 'Saat', clockMode: 'free' as const, clockHour: 3, clockMinute: 0, clockTargetHour: 3, clockTargetMinute: 30, clockStep: 5 as const, clockShowDigital: true, clockShowTurkish: false, clockReadInput: 'box' as const } :
                                  kind === 'audio' ? { title: 'Sesli not' } :
                                    kind === 'video' ? { title: 'Video' } :
                                      kind === 'spinner' ? { title: 'Çark', slices: ['1', '2', '3', '4', '5', '6'], removeWinner: false } :
                                        kind === 'dice' ? { title: 'Zar', dice: 2 } : {};
      const el: WidgetEl = { id: newId(), type: 'widget', kind, x: Math.round((BOARD_W - size.w) / 2), y: Math.round((BOARD_H - size.h) / 2), w: size.w, h: size.h, data: defaultData };
      commitElements([...page.elements, el]);
      setTool('select');
      setSelectedIds([el.id]);
      // Yeni parçanın ayarları panelde yapılır
      if (widgetNeedsSetup(el)) { if (!panelOpen) setPanelAuto(true); setPanelOpen(true); }
    };

    // ---- Dışa aktarma ----
    const exportPng = async () => {
      if (!svgRef.current || !board) return;
      setBusy(true);
      try {
        await exportBoardPng(
          svgRef.current,
          `${fileSlug(board.title)}-sayfa-${pageIndex + 1}.png`,
          (msg) => setNotice(msg)
        );
      } catch (e) {
        setNotice((e as Error).message);
      }
      setBusy(false);
    };
    const exportPdf = () => {
      setPrinting(true);
      window.setTimeout(() => { window.print(); setPrinting(false); }, 400);
    };

    if (error) return <p className={styles.saveWarn} role="alert">Tahta açılamadı: {error}</p>;
    if (!content || !board || !page) return <Spinner center label="Tahta yükleniyor…" />;

    const selected = selectedIds.length === 1 ? page.elements.find((e) => e.id === selectedIds[0]) : undefined;
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

    /** Tam ekrandan çıkmadan düzenleme ↔ ders arasında geçiş */
    const switchMode = (toDers: boolean) => {
      if (toDers === presenting) return;
      setSelectedIds([]);
      setEditingNoteId(null);
      setCtxMenu(null);
      setPanelAuto(false);
      setPanelOpen(false);
      if (toDers) {
        setStepOpen({});
        setPresentTool('hand');
      } else {
        setPresentOverlay(null);
      }
      setPresenting(toDers);
    };
    // Hangi alanda olunduğu her zaman görünür: sol üstte iki parçalı seçim
    const modeSwitch = (
      <div className={`${styles.modeSwitch} ${presenting ? styles.modeSwitchDers : ''}`} role="group" aria-label="Tahta alanı">
        <button type="button" aria-pressed={!presenting} onClick={() => switchMode(false)} title="Düzenleme alanı: çizim, şekil, öğe ve sayfa hazırlığı">
          <Pen size={18} aria-hidden="true" /><span>Düzenleme</span>
        </button>
        <button type="button" aria-pressed={presenting} onClick={() => switchMode(true)} title="Ders alanı: düzenleme kapalı; yazılanlar “Sayfaya kaydet”e basılmadıkça saklanmaz">
          <Play size={18} aria-hidden="true" /><span>Ders</span>
        </button>
      </div>
    );

    const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
    const stepZoom = (delta: number) => {
      setZoom((z) => {
        const nz = clampZoom(z + delta);
        if (nz <= 1) setPan({ x: 0, y: 0 });
        return nz;
      });
    };
    const zoomStyle: React.CSSProperties | undefined = (zoom !== 1 || pan.x !== 0 || pan.y !== 0)
      ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }
      : undefined;

    const stageZoomProps = {
      onWheel: (e: React.WheelEvent<HTMLDivElement>) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        setZoom((z) => {
          const nz = clampZoom(z - e.deltaY * 0.002);
          if (nz <= 1) setPan({ x: 0, y: 0 });
          return nz;
        });
      },
      onPointerDownCapture: (e: React.PointerEvent<HTMLDivElement>) => {
        const handPan = presenting && presentTool === 'hand' && !presentOverlay && zoom > 1 && e.button === 0 && !(e.target as Element)?.closest?.('foreignObject');
        if (((spaceDown && full && !presenting && zoom > 1 && e.button === 0) || handPan)) {
          spacePanRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
          setIsPanning(true);
          e.stopPropagation();
          return;
        }
        if (e.pointerType === 'touch') {
          stagePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (stagePointersRef.current.size === 2) {
            const pts = Array.from(stagePointersRef.current.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const cx = (pts[0].x + pts[1].x) / 2;
            const cy = (pts[0].y + pts[1].y) / 2;
            pinchRef.current = { dist: Math.max(1, dist), cx, cy, zoom, pan };
            setIsPanning(true);
          }
        }
      },
      onPointerMoveCapture: (e: React.PointerEvent<HTMLDivElement>) => {
        if (spacePanRef.current) {
          setPan({ x: spacePanRef.current.px + (e.clientX - spacePanRef.current.sx), y: spacePanRef.current.py + (e.clientY - spacePanRef.current.sy) });
          e.stopPropagation();
          return;
        }
        if (e.pointerType === 'touch' && stagePointersRef.current.has(e.pointerId)) {
          stagePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinchRef.current && stagePointersRef.current.size === 2) {
            const pts = Array.from(stagePointersRef.current.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const cx = (pts[0].x + pts[1].x) / 2;
            const cy = (pts[0].y + pts[1].y) / 2;
            const nz = clampZoom(pinchRef.current.zoom * (dist / pinchRef.current.dist));
            setZoom(nz);
            setPan(nz <= 1 ? { x: 0, y: 0 } : {
              x: pinchRef.current.pan.x + (cx - pinchRef.current.cx),
              y: pinchRef.current.pan.y + (cy - pinchRef.current.cy),
            });
            e.stopPropagation();
          }
        }
      },
      onPointerUpCapture: (e: React.PointerEvent<HTMLDivElement>) => {
        if (spacePanRef.current) { spacePanRef.current = null; setIsPanning(false); }
        if (e.pointerType === 'touch') {
          stagePointersRef.current.delete(e.pointerId);
          if (stagePointersRef.current.size < 2) { pinchRef.current = null; setIsPanning(false); }
        }
      },
      onPointerCancelCapture: (e: React.PointerEvent<HTMLDivElement>) => {
        if (spacePanRef.current) { spacePanRef.current = null; setIsPanning(false); }
        if (e.pointerType === 'touch') {
          stagePointersRef.current.delete(e.pointerId);
          if (stagePointersRef.current.size < 2) { pinchRef.current = null; setIsPanning(false); }
        }
      },
    };

    const zoomControls = (
      <div className={styles.zoomGroup} role="group" aria-label="Yakınlaştırma">
        <button
          type="button"
          className={styles.toolIconBtn}
          onClick={() => stepZoom(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          title="Uzaklaştır"
          aria-label="Uzaklaştır"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <span className={styles.zoomValue} aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className={styles.toolIconBtn}
          onClick={() => stepZoom(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          title="Yakınlaştır"
          aria-label="Yakınlaştır"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.zoomFitBtn}
          onClick={resetZoom}
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          title="Sayfayı ekrana sığdır"
        >
          Sığdır
        </button>
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
            <button type="button" className={styles.tool} onClick={() => setShowVersions(true)} title="Sürüm geçmişi" aria-label="Sürüm geçmişi">
              <History size={20} aria-hidden="true" />
            </button>
            <div className={styles.previewActions}>
              <div className={styles.modeGroup} role="group" aria-label="Hazırlık">
                <span className={styles.modeCaption} aria-hidden="true">Hazırlık</span>
                <button type="button" className={styles.openButton} onClick={() => toggleFull(false)} aria-label="Düzenle" title="Düzenleme alanı: çizim, şekil, öğe ve sayfa hazırlığı">
                  <Pen size={20} aria-hidden="true" /><span>Düzenle</span>
                </button>
              </div>
              <div className={styles.modeGroup} role="group" aria-label="Derste">
                <span className={styles.modeCaption} aria-hidden="true">Derste</span>
                <button type="button" className={styles.presentButton} onClick={startPresent} aria-label="Derste kullan" title="Ders alanı: düzenleme kapalı; kalemle yazılanlar “Sayfaya kaydet”e basılmadıkça saklanmaz">
                  <Play size={20} aria-hidden="true" /><span>Derste kullan</span>
                </button>
                <button
                  type="button"
                  className={styles.presentButton}
                  aria-label="Canlı ders"
                  onClick={() => { if (saveState !== 'saved') { setNotice('Canlı dersten önce değişikliklerin kaydedilmesini bekleyin.'); return; } setLive(true); }}
                  title="Sınıfla canlı ders: öğrenciler tahtayı kendi ekranında izler, soruları cevaplar, sırası gelince yazar"
                >
                  <Radio size={20} aria-hidden="true" /><span>Canlı ders</span>
                </button>
              </div>
            </div>
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
              <p className={styles.hintText}>Hazırlık için “Düzenle”: çizim, şekil, öğe ve sayfalar. Sınıfta tahtanın başında “Derste kullan”: düzenleme kapalıdır, yalnızca kalemle yazılır.</p>
            </div>
          </div>
          {deleteConfirm}
          {printArea}
          {notice && <p className={`${styles.saveWarn} ${styles.floatNotice}`} role="alert" onClick={() => setNotice(null)}>{notice}</p>}
          {showVersions && (
            <BoardVersionsModal
              boardId={boardId}
              blocked={saveState !== 'saved'}
              imageUrls={imageUrls}
              onClose={() => setShowVersions(false)}
              onRestored={(c) => {
                setContent(c);
                setPast([]);
                setFuture([]);
                setSelectedIds([]);
                setPageIndex(0);
                setSaveState('saved');
                setShowVersions(false);
                setNotice('Tahta seçilen sürüme döndü. Önceki hâli de geçmişte duruyor.');
              }}
            />
          )}
          {live && (
            <LiveTeacherSession
              boardId={boardId}
              title={board.title}
              content={content}
              imageUrls={imageUrls}
              questions={questions}
              onClose={() => setLive(false)}
            />
          )}
        </div>
      );
    }

    // Sunum: sade ekran, altta küçük çubuk; yazılanlar kaydedilmez
    if (presenting) {
      const layer = annot[page.id] || [];
      const layerFills = annotFills[page.id] || [];
      return (
        <div ref={rootRef} className={`${styles.editor} ${styles.editorFull}`}>
          <div className={styles.stage} {...stageZoomProps}>
            {modeSwitch}
            <BoardCanvas
              page={page}
              tool={presentTool}
              color={presentColor}
              width={presentWidth}
              layer={layer}
              onLayerCommit={(strokes) => { setAnnotPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), { strokes: annot, fills: annotFills }]); setAnnot({ ...annot, [page.id]: strokes }); }}
              layerFills={layerFills}
              onLayerFillCommit={(fills) => { setAnnotPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), { strokes: annot, fills: annotFills }]); setAnnotFills({ ...annotFills, [page.id]: fills }); }}
              zoomStyle={zoomStyle}
              panning={isPanning}
              measureTools={measureTools}
              onMeasureToolsChange={setMeasureTools}
              onCloseMeasureTool={(id) => setMeasureTools((p) => p.filter((t) => t.id !== id))}
              imageUrls={imageUrls}
              renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
              ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa (sunum)`}
            />
            <PresentOverlay tool={presentOverlay} />
            {notice && <p className={`${styles.saveWarn} ${styles.floatNotice}`} role="status" onClick={() => setNotice(null)}>{notice}</p>}
          </div>
          <div className={styles.presentBar} role="toolbar" aria-label="Ders araçları">
            {/* Çizim Araçları Grubu */}
            <div className={styles.presentGroup}>
              <button
                type="button"
                className={`${styles.toolIconBtn} ${presentTool === 'hand' && presentOverlay !== 'laser' ? styles.toolActive : ''}`}
                aria-pressed={presentTool === 'hand' && presentOverlay !== 'laser'}
                onClick={() => {
                  setPresentOverlay((cur) => (cur === 'laser' ? null : cur));
                  setPenMenuOpen(false);
                  setPresentTool('hand');
                }}
                title="El: çizmeden etkileşim (H)"
                aria-label="El: çizmeden etkileşim"
              >
                <Hand size={20} aria-hidden="true" />
              </button>
              <div className={styles.penButtonWrapper} ref={penMenuRef}>
                <button
                  type="button"
                  className={`${styles.toolIconBtn} ${styles.presentPenBtn} ${presentTool !== 'eraser' && presentTool !== 'hand' && presentOverlay !== 'laser' ? styles.toolActive : ''}`}
                  aria-pressed={presentTool !== 'eraser' && presentTool !== 'hand' && presentOverlay !== 'laser'}
                  onClick={() => {
                    setPresentOverlay((cur) => (cur === 'laser' ? null : cur));
                    if (presentTool === 'eraser' || presentTool === 'hand' || presentOverlay === 'laser') {
                      setPresentTool(presentPenType === 'fill' ? 'fill' : presentPenType === 'highlighter' ? 'highlighter' : 'pen');
                      setPenMenuOpen(true);
                    } else {
                      setPenMenuOpen((prev) => !prev);
                    }
                  }}
                  title="Kalem ve renk ayarları (seçenekleri açmak için tıklayın)"
                  aria-label="Kalem ve renk ayarları"
                >
                  {presentPenType === 'fill' ? (
                    <PaintBucket size={19} aria-hidden="true" />
                  ) : presentPenType === 'highlighter' ? (
                    <Highlighter size={19} aria-hidden="true" />
                  ) : (
                    <Pen size={19} aria-hidden="true" />
                  )}
                  <span
                    className={styles.penColorIndicator}
                    style={{ background: presentColor }}
                    aria-hidden="true"
                  />
                </button>

                {penMenuOpen && (
                  <div className={styles.presentPenPopover} role="dialog" aria-label="Kalem ayarları">
                    <div className={styles.popoverSection}>
                      <div className={styles.popoverLabel}>Kalem Türü</div>
                      <div className={styles.penTypeGrid}>
                        <button
                          type="button"
                          className={`${styles.penTypeBtn} ${presentPenType === 'pen' ? styles.penTypeActive : ''}`}
                          onClick={() => {
                            setPresentPenType('pen');
                            setPresentTool('pen');
                            setPresentWidth(5);
                          }}
                        >
                          <Pen size={15} aria-hidden="true" />
                          <span>Normal</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.penTypeBtn} ${presentPenType === 'highlighter' ? styles.penTypeActive : ''}`}
                          onClick={() => {
                            setPresentPenType('highlighter');
                            setPresentTool('highlighter');
                            setPresentWidth(6);
                          }}
                        >
                          <Highlighter size={15} aria-hidden="true" />
                          <span>Vurgu</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.penTypeBtn} ${presentPenType === 'brush' ? styles.penTypeActive : ''}`}
                          onClick={() => {
                            setPresentPenType('brush');
                            setPresentTool('pen');
                            setPresentWidth(12);
                          }}
                        >
                          <span style={{ fontSize: 14, lineHeight: 1 }}>🖌</span>
                          <span>Fırça</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.penTypeBtn} ${presentPenType === 'fill' ? styles.penTypeActive : ''}`}
                          onClick={() => {
                            setPresentPenType('fill');
                            setPresentTool('fill');
                          }}
                        >
                          <PaintBucket size={15} aria-hidden="true" />
                          <span>Doldur</span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.popoverSection}>
                      <div className={styles.popoverLabel}>Renk</div>
                      <div className={styles.presentColorGrid}>
                        {['#1f2a24', '#d03b3b', '#2a78d6', '#1e7a4c', '#e0a800', '#ffffff'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`${styles.popoverColorSwatch} ${presentColor === c ? styles.popoverColorActive : ''}`}
                            style={{ background: c }}
                            onClick={() => {
                              setPresentColor(c);
                              if (presentTool === 'eraser') {
                                setPresentTool(presentPenType === 'highlighter' ? 'highlighter' : 'pen');
                              }
                            }}
                            aria-label={`Renk ${c}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.popoverSection}>
                      <div className={styles.popoverLabel}>Kalınlık</div>
                      <div className={styles.widthRow}>
                        {[
                          { value: 2, label: 'İnce', dot: 4 },
                          { value: 5, label: 'Orta', dot: 8 },
                          { value: 10, label: 'Kalın', dot: 13 },
                          { value: 16, label: 'Çok Kalın', dot: 18 },
                        ].map((w) => (
                          <button
                            key={w.value}
                            type="button"
                            className={`${styles.widthOptionBtn} ${presentWidth === w.value ? styles.widthOptionActive : ''}`}
                            onClick={() => setPresentWidth(w.value)}
                            title={w.label}
                            aria-label={`Kalınlık ${w.label}`}
                          >
                            <span
                              style={{
                                width: w.dot,
                                height: w.dot,
                                borderRadius: '50%',
                                background: presentColor === '#ffffff' ? '#333333' : presentColor,
                              }}
                            />
                            <span className={styles.widthLabelText}>{w.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className={`${styles.toolIconBtn} ${presentTool === 'eraser' && presentOverlay !== 'laser' ? styles.toolActive : ''}`}
                aria-pressed={presentTool === 'eraser' && presentOverlay !== 'laser'}
                onClick={() => {
                  setPresentOverlay((cur) => (cur === 'laser' ? null : cur));
                  setPresentTool('eraser');
                  setPenMenuOpen(false);
                }}
                title="Silgi (çizimleri sil)"
                aria-label="Silgi"
              >
                <Eraser size={19} aria-hidden="true" />
              </button>
            </div>

            <span className={styles.presentSep} aria-hidden="true" />

            {/* Sunum Araçları Grubu: Lazer, Perde, Spot Işığı */}
            <div className={styles.presentGroup}>
              <button
                type="button"
                className={`${styles.toolIconBtn} ${presentOverlay === 'laser' ? styles.toolActive : ''}`}
                aria-pressed={presentOverlay === 'laser'}
                onClick={() => {
                  setPenMenuOpen(false);
                  setPresentOverlay((cur) => (cur === 'laser' ? null : 'laser'));
                }}
                title="Lazer işaretçi (Esc ile kapat)"
                aria-label="Lazer işaretçi"
              >
                <LaserPointer size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.toolIconBtn} ${presentOverlay === 'curtain' ? styles.toolActive : ''}`}
                aria-pressed={presentOverlay === 'curtain'}
                onClick={() => {
                  setPenMenuOpen(false);
                  setPresentOverlay((cur) => (cur === 'curtain' ? null : 'curtain'));
                }}
                title="Ekran perdesi (Esc ile kapat)"
                aria-label="Ekran perdesi"
              >
                <ScreenCurtain size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.toolIconBtn} ${presentOverlay === 'spotlight' ? styles.toolActive : ''}`}
                aria-pressed={presentOverlay === 'spotlight'}
                onClick={() => {
                  setPenMenuOpen(false);
                  setPresentOverlay((cur) => (cur === 'spotlight' ? null : 'spotlight'));
                }}
                title="Spot ışığı (Esc ile kapat)"
                aria-label="Spot ışığı"
              >
                <Spotlight size={19} aria-hidden="true" />
              </button>
              <div className={styles.penButtonWrapper}>
                <button
                  type="button"
                  className={`${styles.toolIconBtn} ${measureTools.length > 0 ? styles.toolActive : ''}`}
                  aria-pressed={measureMenuOpen}
                  onClick={() => {
                    setPenMenuOpen(false);
                    setMeasureMenuOpen((v) => !v);
                  }}
                  title="Ölçme araçları (Cetvel, Gönye, İletki, Pergel)"
                  aria-label="Ölçme araçları"
                >
                  <Ruler size={19} aria-hidden="true" />
                </button>
                {measureMenuOpen && (
                  <div className={styles.presentPenPopover} role="dialog" aria-label="Ölçme araçları">
                    <div className={styles.popoverSection}>
                      <div className={styles.popoverLabel}>Ölçme Araçları</div>
                      <div className={styles.measureTypeGrid}>
                        {MEASURE_TOOL_ITEMS.map(({ kind, label, icon: Icon }) => {
                          const active = measureTools.some((t) => t.kind === kind);
                          return (
                            <button
                              key={kind}
                              type="button"
                              aria-pressed={active}
                              className={`${styles.measureTypeBtn} ${active ? styles.measureTypeActive : ''}`}
                              onClick={() => {
                                toggleMeasureTool(kind);
                                setMeasureMenuOpen(false);
                              }}
                            >
                              <Icon size={15} aria-hidden="true" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <span className={styles.presentSep} aria-hidden="true" />

            {/* İşlemler Grubu */}
            <div className={styles.presentGroup}>
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
                onClick={savePresentAnnotations}
                disabled={!layer.length && !layerFills.length}
                title="Yazılanları bu sayfaya kaydet"
                aria-label="Yazılanları sayfaya kaydet"
              >
                <Save size={18} aria-hidden="true" />
              </button>
            </div>

            <span className={styles.presentSep} aria-hidden="true" />

            {/* Sayfa Gezinme Grubu */}
            <div className={styles.presentGroup}>
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
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={addPage}
                title="Bu sayfadan sonra boş sayfa ekle"
                aria-label="Boş sayfa ekle"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>

            <span className={styles.presentSep} aria-hidden="true" />

            {zoomControls}

            <span className={styles.presentSep} aria-hidden="true" />

            {/* Ekran / Kapatma Grubu */}
            <div className={styles.presentGroup}>
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={toggleBrowserFs}
                title={fsActive ? 'Tam ekrandan çık' : 'Tam ekran yap'}
                aria-label={fsActive ? 'Tam ekrandan çık' : 'Tam ekran yap'}
              >
                {fsActive ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={() => toggleFull(false)}
                title="Dersi kapat, tahta sayfasına dön"
                aria-label="Dersi kapat"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Düzenleme alanı: üstte sabit çubuk, solda araç şeridi ve paneli, ortada tahta, altta sayfa şeridi
    const sideLabel = SIDE_TABS.find((t) => t.id === sideTab)?.label || '';
    // Seçili öğenin uzun ayarları (parçalar) sol panelde açılır; "Geri" araç listesine döndürür
    const settingsView = panelOpen && selectedIds.length > 0;
    const closeSettings = () => { setPanelAuto(false); setPanelOpen(false); };
    return (
      <div ref={rootRef} className={styles.workspace}>
        <input
          ref={fileInput}
          type="file"
          accept={BOARD_IMAGE_TYPES.join(',')}
          hidden
          onChange={(e) => {
            upload(e.target.files?.[0]);
            window.setTimeout(() => reenterFullscreenRef.current(), 400);
          }}
        />
        <header className={styles.workTop}>
          <div className={styles.workTopGroup}>
            <button type="button" className={styles.tool} onClick={() => toggleFull(false)} aria-label="Düzenlemeden çık" title="Düzenlemeden çık (Esc)">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
              <strong className={styles.workTitle} title={board.title}>{board.title}</strong>
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
          </div>
          <div className={styles.workTopGroup} role="toolbar" aria-label="Tahta araçları">
            <button
              type="button"
              className={styles.toolIconBtn}
              aria-pressed={tool === 'select'}
              onClick={() => setTool('select')}
              title="Seçim aracı (V): öğeleri seç, taşı, boyutlandır"
              aria-label="Seç"
            >
              <MousePointer size={20} aria-hidden="true" />
            </button>
            <span className={styles.sep} aria-hidden="true" />
            <button type="button" className={styles.toolIconBtn} onClick={undo} disabled={!past.length} title="Geri al (Ctrl+Z)" aria-label="Geri al">
              <RotateCcw size={20} aria-hidden="true" />
            </button>
            <button type="button" className={styles.toolIconBtn} onClick={redo} disabled={!future.length} title="Yinele (Ctrl+Y)" aria-label="Yinele">
              <RotateCw size={20} aria-hidden="true" />
            </button>
            {tool !== 'select' && (
              <button
                type="button"
                className={styles.toolChip}
                onClick={() => { const tab = tabOfTool(tool); if (tab) { setSideTab(tab); setSideOpen(true); } }}
                title="Etkin araç · ayarlarını sol panelde aç"
              >
                {tool !== 'eraser' && <span className={styles.toolChipDot} style={{ backgroundColor: color }} aria-hidden="true" />}
                <span>{TOOL_LABEL[tool] || tool}</span>
              </button>
            )}
          </div>
          <div className={styles.workTopGroup}>
            {zoomControls}
            <span className={styles.sep} aria-hidden="true" />
            <button type="button" className={styles.toolIconBtn} onClick={exportPng} disabled={busy} title="Bu sayfayı PNG görsel olarak indir" aria-label="PNG indir">
              <Download size={20} aria-hidden="true" />
            </button>
            <button type="button" className={styles.toolIconBtn} onClick={exportPdf} title="Bütün sayfaları yazdır / PDF olarak kaydet" aria-label="PDF / Yazdır">
              <Printer size={20} aria-hidden="true" />
            </button>
            <span className={styles.keysWrap}>
              <button type="button" className={styles.toolIconBtn} aria-pressed={showKeys} aria-expanded={showKeys} onClick={() => setShowKeys((v) => !v)} title="Klavye kısayolları" aria-label="Klavye kısayolları">
                <HelpCircle size={20} aria-hidden="true" />
              </button>
              {showKeys && (
                <div className={styles.keysPop} role="note">
                  <strong>Klavye kısayolları</strong>
                  <p>V seç · P kalem · H vurgu · E silgi · N not · T metin</p>
                  <p>Ctrl+Z geri al · Ctrl+Y yinele · Delete sil</p>
                  <p>Ctrl+A tümünü seç · Ctrl+C / Ctrl+V kopyala, yapıştır · Ctrl+D çoğalt · Ctrl+G grupla</p>
                  <p>Ok tuşları seçili öğeyi kaydırır (Shift ile hızlı); seçim yokken ← / → sayfa değiştirir</p>
                  <p>Parçanın düğmeleri “Seç” aracında çalışır; taşımak için düğme olmayan yerinden sürükleyin.</p>
                </div>
              )}
            </span>
            <button type="button" className={styles.toolIconBtn} onClick={toggleBrowserFs} title={fsActive ? 'Tam ekrandan çık' : 'Tam ekran yap'} aria-label={fsActive ? 'Tam ekrandan çık' : 'Tam ekran yap'}>
              {fsActive ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
            </button>
            {modeSwitch}
          </div>
        </header>
        <div ref={setBarHost} className={styles.workBar} data-empty-text="Bir öğe seçince ayarları burada açılır." />

        <nav className={styles.workRail} aria-label="Araç grupları">
          {SIDE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.railBtn}
              aria-pressed={!settingsView && sideOpen && sideTab === t.id}
              aria-controls="board-side"
              onClick={() => openTab(t.id)}
            >
              {t.id === 'draw' ? <Pen size={22} aria-hidden="true" /> :
                t.id === 'shapes' ? <Shapes size={22} aria-hidden="true" /> :
                  t.id === 'text' ? <Type size={22} aria-hidden="true" /> :
                    t.id === 'media' ? <ImageIcon size={22} aria-hidden="true" /> :
                      t.id === 'widgets' ? <Component size={22} aria-hidden="true" /> :
                        <Layers size={22} aria-hidden="true" />}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <aside id="board-side" className={styles.workSide} aria-label={settingsView ? 'Seçili öğe ayarları' : `${sideLabel} paneli`} hidden={!sideOpen && !settingsView}>
          {settingsView ? (
            <div className={styles.drawerHead}>
              <button type="button" className={styles.tool} onClick={closeSettings} aria-label="Geri: araç listesine dön" title="Araç listesine dön">
                <ArrowLeft size={18} aria-hidden="true" /> Geri
              </button>
              <strong>{selectedIds.length > 1 ? `${selectedIds.length} öğe seçili` : 'Ayarlar'}</strong>
            </div>
          ) : (
            <div className={styles.drawerHead}>
              <strong>{sideLabel}</strong>
              <button type="button" className={styles.tool} onClick={() => setSideOpen(false)} aria-label="Sol paneli kapat">Kapat</button>
            </div>
          )}
          {!settingsView ? null : selectedIds.length === 1 && selected ? (
            <SelectionPanel
              el={selected}
              questions={questions}
              minitests={minitests}
              boardImages={Array.from(
                new Map([
                  // Etiketleme parçasına taşınmış görsel tahtada artık yok; seçim listesinde görünmeye devam etsin
                  ...(selected.type === 'widget' && selected.kind === 'label' && selected.data.labelImage
                    ? [[imageKey(selected.data.labelImage), selected.data.labelImage] as const]
                    : []),
                  ...content.pages
                    .flatMap((p) => p.elements)
                    .filter((e): e is ImageEl => e.type === 'image')
                    .map((e) => [imageKey(e), { bucket: e.bucket, path: e.path }] as const),
                ]).values()
              )}
              imageUrls={imageUrls}
              onPatch={(patch) => {
                // Görsel Etiketleme: tahtadan seçilen görsel parçanın içine taşınır (sayfadaki kopyası kalkar; Geri al ile döner)
                const nextImg = selected.type === 'widget' && selected.kind === 'label' ? (patch as Partial<WidgetEl>).data?.labelImage : undefined;
                const prevImg = selected.type === 'widget' ? selected.data.labelImage : undefined;
                if (page && nextImg && (!prevImg || imageKey(nextImg) !== imageKey(prevImg))) {
                  const key = imageKey(nextImg);
                  const onPage = page.elements.find((e) => e.type === 'image' && !e.locked && imageKey(e) === key);
                  if (onPage) {
                    commitElements(page.elements.filter((e) => e.id !== onPage.id).map((e) => (e.id === selected.id ? ({ ...e, ...patch } as BoardEl) : e)));
                    return;
                  }
                }
                patchElement(selected.id, patch);
              }}
              onDelete={() => deleteSelected([selected.id])}
              onOrder={(dir) => reorderElements(dir, [selected.id])}
              onLock={() => lockElements([selected.id])}
              onConfigure={canConfigureSelected ? handleOpenConfigureSelected : undefined}
              onSaveToLibrary={canSaveToLibrary([selected]) ? () => handleOpenSaveModal([selected]) : undefined}
              onSaveImage={selected.type === 'image' && !imageInMyFiles(selected) ? () => saveImageToFiles(selected) : undefined}
              onConvertTallyToBar={(tallyEl) => {
                if (!page) return;
                const items = normalizeTallyItems(tallyEl.data.tallyItems);
                const cats = items.length >= 2 ? items.map((it) => ({ label: it.label, value: it.count })) : [{ label: 'Kırmızı', value: 7 }, { label: 'Mavi', value: 5 }, { label: 'Yeşil', value: 9 }];
                const size = WIDGET_SIZE.bar;
                const x = Math.min(BOARD_W - size.w - 20, tallyEl.x + tallyEl.w + 24);
                const y = Math.min(BOARD_H - size.h - 20, Math.max(20, tallyEl.y));
                const barEl: WidgetEl = {
                  id: newId(),
                  type: 'widget',
                  kind: 'bar',
                  x: Math.max(20, x),
                  y,
                  w: size.w,
                  h: size.h,
                  data: {
                    title: tallyEl.data.title?.trim() || 'Sütun Grafiği',
                    barMode: 'show',
                    barOrientation: 'vertical',
                    barStep: 1,
                    barCategories: cats,
                    barQuestions: [],
                  },
                };
                commitElements([...page.elements, barEl]);
                setSelectedIds([barEl.id]);
              }}
              busy={busy}
            />
          ) : selectedIds.length > 1 ? (
            <MultiSelectionPanel
              elements={page.elements.filter((el) => selectedIds.includes(el.id))}
              onDuplicate={() => duplicateElements()}
              onOrder={(dir) => reorderElements(dir)}
              onDelete={() => deleteSelected()}
              onGroup={() => groupSelected()}
              onUngroup={() => ungroupSelected()}
              onLock={() => lockElements(selectedIds)}
              onAlign={handleAlign}
              onDistribute={handleDistribute}
              onConfigure={canConfigureSelected ? handleOpenConfigureSelected : undefined}
              onSaveToLibrary={canSaveToLibrary(page.elements.filter((el) => selectedIds.includes(el.id))) ? () => handleOpenSaveModal(page.elements.filter((el) => selectedIds.includes(el.id))) : undefined}
            />
          ) : null}

          {!settingsView && sideTab === 'draw' && (
            <div className={styles.sideCard}>
              <div className={styles.popoverSection}>
                <span className={styles.popoverLabel}>Çizim aracı</span>
                <div className={styles.brushRow}>
                  <button type="button" className={`${styles.brushCard} ${tool === 'pen' && !smartPen ? styles.brushActive : ''}`} aria-pressed={tool === 'pen' && !smartPen} onClick={() => { setTool('pen'); setSmartPen(false); }} title="Kalem (P)">
                    <div
                      className={styles.brushPreview}
                      style={{
                        borderColor: tool === 'pen' && !smartPen ? (isWhiteColor ? '#20352d' : color) : '#dedad0',
                        backgroundColor: tool === 'pen' && !smartPen && isWhiteColor ? '#20352d' : '#ffffff',
                      }}
                    >
                      <Pen size={20} color={tool === 'pen' && !smartPen ? (isWhiteColor ? '#ffffff' : color) : 'currentColor'} />
                    </div>
                    <span>Kalem</span>
                  </button>
                  <button type="button" className={`${styles.brushCard} ${tool === 'highlighter' ? styles.brushActive : ''}`} aria-pressed={tool === 'highlighter'} onClick={() => { setTool('highlighter'); setSmartPen(false); }} title="Vurgulayıcı (H)">
                    <div
                      className={styles.brushPreview}
                      style={{
                        borderColor: tool === 'highlighter' ? (isWhiteColor ? '#20352d' : color) : '#dedad0',
                        backgroundColor: tool === 'highlighter' && isWhiteColor ? '#20352d' : '#ffffff',
                      }}
                    >
                      <Highlighter size={20} color={tool === 'highlighter' ? (isWhiteColor ? '#ffffff' : color) : 'currentColor'} />
                    </div>
                    <span>Vurgu</span>
                  </button>
                  <button type="button" className={`${styles.brushCard} ${tool === 'eraser' ? styles.brushActive : ''}`} aria-pressed={tool === 'eraser'} onClick={() => { setTool('eraser'); setSmartPen(false); }} title="Silgi (E)">
                    <div className={styles.brushPreview} style={{ borderColor: tool === 'eraser' ? '#d03b3b' : '#dedad0' }}>
                      <Eraser size={20} color={tool === 'eraser' ? '#d03b3b' : 'currentColor'} />
                    </div>
                    <span>Silgi</span>
                  </button>
                  <button type="button" className={`${styles.brushCard} ${tool === 'fill' ? styles.brushActive : ''}`} aria-pressed={tool === 'fill'} onClick={() => { setTool('fill'); setSmartPen(false); }} title="Doldur (F)">
                    <div
                      className={styles.brushPreview}
                      style={{
                        borderColor: tool === 'fill' ? (isWhiteColor ? '#20352d' : color) : '#dedad0',
                        backgroundColor: tool === 'fill' && isWhiteColor ? '#20352d' : '#ffffff',
                      }}
                    >
                      <PaintBucket size={20} color={tool === 'fill' ? (isWhiteColor ? '#ffffff' : color) : 'currentColor'} />
                    </div>
                    <span>Doldur</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.brushCard} ${tool === 'pen' && smartPen ? styles.brushActive : ''}`}
                    aria-pressed={tool === 'pen' && smartPen}
                    onClick={() => {
                      if (tool === 'pen' && smartPen) {
                        setSmartPen(false);
                      } else {
                        setTool('pen');
                        setSmartPen(true);
                      }
                    }}
                    title="Akıllı kalem: çizilen düz çizgi, ok, üçgen, dikdörtgen ve daireyi otomatik düzeltir"
                  >
                    <div className={styles.brushPreview} style={{ borderColor: tool === 'pen' && smartPen ? '#1f5c41' : '#dedad0' }}>
                      <Sparkles size={20} color={tool === 'pen' && smartPen ? '#1f5c41' : 'currentColor'} />
                    </div>
                    <span>Akıllı kalem</span>
                  </button>
                </div>
              </div>
              {tool === 'eraser' ? (
                <p className={styles.hintText}>Dokunduğunuz çizgi veya şeklin tamamını siler. Geri al ile geri getirebilirsiniz.</p>
              ) : (
                <>
                  <div className={styles.popoverSection}>
                    <span className={styles.popoverLabel}><Palette size={14} aria-hidden="true" />{tool === 'highlighter' ? 'Vurgu rengi' : tool === 'fill' ? 'Dolgu rengi' : 'Kalem rengi'}</span>
                    <div className={styles.colorPalette}>
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            setColor(c);
                            if (tool !== 'fill' && selected && 'color' in selected && selected.type !== 'note') patchElement(selected.id, { color: c });
                          }}
                          title={`Renk: ${c}`}
                          aria-label={`Renk ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  {tool === 'fill' ? (
                    <p className={styles.hintText}>Çizgilerle kapanmış bir alanın içine dokunun; alan seçili renkle dolar. Dolu alana yeniden dokunmak rengini değiştirir. Dolguyu kaldırmak için Seç ile tıklayıp silin.</p>
                  ) : (
                    <div className={styles.popoverSection}>
                      <div className={styles.popoverHeaderRow}>
                        <span className={styles.popoverLabel}><Sliders size={14} aria-hidden="true" />Çizgi kalınlığı</span>
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
                                boxShadow: isWhiteColor ? '0 0 0 1.5px #58665f' : undefined,
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
                        aria-label="Çizgi kalınlığı"
                      />
                    </div>
                  )}
                </>
              )}
              <div className={styles.popoverSection} style={{ marginTop: 12 }}>
                <span className={styles.popoverLabel}>Ölçme araçları</span>
                <div className={styles.measureDrawGrid}>
                  {MEASURE_TOOL_ITEMS.map(({ kind, label, icon: Icon }) => {
                    const active = measureTools.some((t) => t.kind === kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={active}
                        className={`${styles.measureDrawBtn} ${active ? styles.brushActive : ''}`}
                        onClick={() => toggleMeasureTool(kind)}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!settingsView && sideTab === 'shapes' && (
            <>
              <div className={styles.sideCard}>
                <div className={styles.popoverSection}>
                  <span className={styles.popoverLabel}>Şekil çiz</span>
                  <div className={styles.shapesGrid}>
                    {[
                      { id: 'line', label: 'Çizgi', icon: <Minus size={22} /> },
                      { id: 'arrow', label: 'Ok', icon: <ArrowRight size={22} /> },
                      { id: 'rect', label: 'Dikdörtgen', icon: <Square size={22} /> },
                      { id: 'ellipse', label: 'Daire', icon: <Circle size={22} /> },
                      { id: 'triangle', label: 'Üçgen', icon: <Triangle size={22} /> },
                      { id: 'diamond', label: 'Eşkenar', icon: <Diamond size={22} /> },
                      { id: 'hexagon', label: 'Altıgen', icon: <Hexagon size={22} /> },
                      { id: 'star', label: 'Yıldız', icon: <Star size={22} /> },
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        className={`${styles.shapeBtn} ${tool === sh.id ? styles.shapeBtnActive : ''}`}
                        onClick={() => setTool(sh.id as Tool)}
                        aria-pressed={tool === sh.id}
                        title={sh.id === 'diamond' ? 'Eşkenar dörtgen' : sh.label}
                        aria-label={sh.id === 'diamond' ? 'Eşkenar dörtgen' : undefined}
                      >
                        {sh.icon}
                        <span>{sh.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className={styles.hintText}>Şekli seçip tahtada sürükleyerek çizin. Shift: düz çizgi, kare, daire.</p>
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
                          if (selected && 'color' in selected && selected.type !== 'note') patchElement(selected.id, { color: c });
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
                          style={{
                            width: preset.dot,
                            height: preset.dot,
                            backgroundColor: color,
                            boxShadow: isWhiteColor ? '0 0 0 1.5px #58665f' : undefined,
                          }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <MediaDrawer
                only="shapes"
                onInsert={(m) => insertMedia(m)}
                onInsertShape={handleRequestInsertShape}
                onUpload={() => {
                  isUploadingRef.current = true;
                  fileInput.current?.click();
                }}
                busy={busy}
                userItems={userLibraryItems}
                schoolItems={schoolLibraryItems}
                isLoadingUserItems={isLoadingUserItems}
                userItemsError={userItemsError}
                onReloadUserItems={loadUserLibrary}
                onEditItem={(it, f) => setEditModal({ item: it, initialField: f })}
                onDeleteItem={handleDeleteShape}
                onToggleSchoolShare={handleToggleSchoolShare}
                onCopySchoolItem={handleCopySchoolItem}
                // Okul paylaşımı panelde kapalı (Okulum listesi kaldırıldı); altyapı duruyor, true yapınca geri gelir
                schoolSharingEnabled={false}
              />
            </>
          )}

          {!settingsView && sideTab === 'text' && (
            <div className={styles.sideCard}>
              <div className={styles.textPresets}>
                <button type="button" className={styles.textPreset} onClick={() => addTextPreset('title')}><span style={{ fontSize: 26, fontWeight: 700 }}>Başlık ekle</span></button>
                <button type="button" className={styles.textPreset} onClick={() => addTextPreset('subtitle')}><span style={{ fontSize: 19, fontWeight: 700 }}>Alt başlık ekle</span></button>
                <button type="button" className={styles.textPreset} onClick={() => addTextPreset('body')}><span style={{ fontSize: 15 }}>Düz metin ekle</span></button>
                <button type="button" className={`${styles.textPreset} ${styles.textPresetBoxed}`} onClick={() => addTextPreset('boxed')}><span style={{ fontSize: 15 }}>Kutulu metin ekle</span></button>
                <button type="button" className={`${styles.textPreset} ${styles.textPresetNote}`} onClick={() => addTextPreset('note')}><StickyNote size={16} aria-hidden="true" /><span style={{ fontSize: 15 }}>Yapışkan not ekle</span></button>
              </div>
              <div className={styles.textFontSection}>
                <span className={styles.textFontHeading}>Yazı tipleri</span>
                <div className={styles.textFontGrid}>
                  {BOARD_FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={styles.textFontBtn}
                      onClick={() => addTextPreset('body', f.value)}
                    >
                      <span className={styles.textFontName} style={{ fontFamily: getFontFamily(f.value) }}>{f.label}</span>
                      <span className={styles.textFontSample} style={{ fontFamily: getFontFamily(f.value) }}>{f.sample}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className={styles.hintText}>Seçtiğiniz tür tahtanın ortasına gelir ve yazmaya hazır açılır. Belirli bir yere yazmak için T tuşuna basıp tahtada o yere tıklayın. Biçim ayarları, yazı seçiliyken üst satırda açılır.</p>
            </div>
          )}

          {!settingsView && sideTab === 'media' && (
            <MediaDrawer
              only="images"
              onInsert={(m) => insertMedia(m)}
              onInsertShape={handleRequestInsertShape}
              onUpload={() => {
                isUploadingRef.current = true;
                fileInput.current?.click();
              }}
              busy={busy}
              userItems={userLibraryItems}
              schoolItems={schoolLibraryItems}
              isLoadingUserItems={isLoadingUserItems}
              userItemsError={userItemsError}
              onReloadUserItems={loadUserLibrary}
              onEditItem={(it, f) => setEditModal({ item: it, initialField: f })}
              onDeleteItem={handleDeleteShape}
              onToggleSchoolShare={handleToggleSchoolShare}
              onCopySchoolItem={handleCopySchoolItem}
              // Okul paylaşımı panelde kapalı (Okulum listesi kaldırıldı); altyapı duruyor, true yapınca geri gelir
              schoolSharingEnabled={false}
            />
          )}

          {!settingsView && sideTab === 'widgets' && (
            <div className={styles.sideCard}>
              <div className={styles.widgetsList}>
                {getWidgetGroups().map((group) => (
                  <div key={group.id} className={styles.widgetGroup}>
                    <h4 className={styles.widgetGroupTitle}>{group.label}</h4>
                    <div className={styles.widgetGroupItems}>
                      {group.items.map((k) => (
                        <button key={k} type="button" className={styles.widgetItemBtn} onClick={() => addWidget(k)}>
                          <span
                            className={styles.widgetItemIcon}
                            style={{ backgroundColor: group.bg, color: group.color }}
                          >
                            {k === 'timer' ? <Timer size={16} /> :
                              k === 'minitest' ? <Component size={16} /> :
                                k === 'match' ? <Shuffle size={16} /> :
                                  k === 'audio' ? <Mic size={16} /> :
                                    k === 'video' ? <Video size={16} /> :
                                      k === 'spinner' ? <Wheel size={16} /> :
                                        k === 'dice' ? <Dice size={16} /> :
                                          k === 'order' ? <ListOrdered size={16} /> :
                                            k === 'sort' ? <Columns size={16} /> :
                                              k === 'blanks' ? <TextCursorInput size={16} /> :
                                                k === 'label' ? <Tag size={16} /> :
                                                  k === 'fraction' ? <PieChart size={16} /> :
                                                    k === 'graph' ? <TrendingUp size={16} /> :
                                                      k === 'bar' ? <BarChart3 size={16} /> :
                                                        k === 'tally' ? <Tally5 size={16} /> :
                                                          k === 'numgrid' ? <Grid3x3 size={16} /> :
                                                            k === 'clock' ? <Clock size={16} /> :
                                                              <Layers size={16} />}
                          </span>
                          <span className={styles.widgetItemTitle}>{WIDGET_LABEL[k]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className={styles.hintText}>Öğe tahtanın ortasına eklenir; ayarları bu panelde açılır. “Geri” ile listeye dönersiniz.</p>
            </div>
          )}

          {!settingsView && sideTab === 'page' && (
            <section className={styles.panel}>
              <label>Bu sayfanın zemini
                <CustomSelect value={page.background} onChange={(v) => updatePage({ background: v as Background })} options={(Object.keys(BACKGROUND_LABEL) as Background[]).map((b) => ({ value: b, label: BACKGROUND_LABEL[b] }))} />
              </label>

              <div className={styles.bgSection}>
                <span className={styles.bgSectionTitle}>Zemin rengi</span>
                <div className={styles.bgSwatches}>
                  {BOARD_BG_COLORS.map(({ c, label }) => {
                    const currentBg = (page.backgroundColor || '#ffffff').toLowerCase();
                    const active = currentBg === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        className={styles.swatch}
                        style={{
                          background: c,
                          boxShadow: active ? '0 0 0 3px #25634b' : '0 0 0 1px #c9c5b8',
                        }}
                        aria-pressed={active}
                        onClick={() => handleBgColorChange(c)}
                        title={label}
                        aria-label={`Zemin rengi ${label}`}
                      />
                    );
                  })}
                  <input
                    type="color"
                    className={styles.bgColorInput}
                    value={page.backgroundColor || '#ffffff'}
                    onChange={(e) => handleBgColorChange(e.target.value)}
                    title="Özel bir zemin rengi seçin"
                    aria-label="Özel zemin rengi"
                  />
                </div>
              </div>

              {content && content.pages.length > 1 && (
                <button
                  type="button"
                  className={styles.bgApplyAllBtn}
                  onClick={applyBgToAllPages}
                >
                  Bu zemini tüm sayfalara uygula
                </button>
              )}
              {page.elements.some((el) => el.locked) && (
                <button
                  type="button"
                  className={styles.bgApplyAllBtn}
                  onClick={unlockAllOnPage}
                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Unlock size={16} aria-hidden="true" />
                  Tüm kilitleri aç ({page.elements.filter((el) => el.locked).length})
                </button>
              )}
              <button
                type="button"
                className={styles.bgApplyAllBtn}
                onClick={() => setShowPdfImport(true)}
                style={{ marginTop: 8 }}
              >
                PDF’ten sayfa ekle
              </button>
            </section>
          )}
        </aside>

        <div className={styles.workStage} {...stageZoomProps}>
          {notice && <p className={`${styles.saveWarn} ${styles.floatNotice}`} role="alert" onClick={() => setNotice(null)}>{notice}</p>}
          <BoardCanvas
            page={page}
            editable
            tool={tool}
            color={color}
            width={width}
            zoomStyle={zoomStyle}
            panning={(full && !presenting && spaceDown) || isPanning}
            smartPen={smartPen}
            measureTools={measureTools}
            onMeasureToolsChange={setMeasureTools}
            onCloseMeasureTool={(id) => setMeasureTools((p) => p.filter((t) => t.id !== id))}
            onNotice={setNotice}
            onCommit={commitElements}
            selectedIds={selectedIds}
            onElementMenu={(ids, x, y) => setCtxMenu({ ids, x, y })}
            onSelect={(ids) => {
              setSelectedIds(ids);
              // Panel kuralı: başka bir öğe (ya da öğeler) seçilince açılır. "Kapat"a basılınca seçim durur ama
              // panel, seçim değişene kadar kapalı kalır (aynı öğeye yeniden tıklamak onSelect çağırmaz).
              // Seçimle açılan panel, seçim bırakılınca kendiliğinden kapanır; elle açılan panel açık kalır.
              const single = ids.length === 1 ? page.elements.find((e) => e.id === ids[0]) : undefined;
              // Sağdaki panel yalnızca parçalarda (uzun ayarlar) açılır; diğer öğelerin ayarları üst satırdadır
              if (single && single.type === 'widget') {
                if (!panelOpen) setPanelAuto(true);
                setPanelOpen(true);
              } else if (panelAuto || ids.length) {
                setPanelAuto(false);
                setPanelOpen(false);
              }
              if (ids.length === 1) {
                const el = page.elements.find((e) => e.id === ids[0]);
                if (el && el.type === 'note') window.setTimeout(() => fitLegacyTextRef.current(ids[0]), 0);
              }
            }}
            onDuplicate={(ids) => duplicateElements(ids)}
            onOrder={(dir, ids) => reorderElements(dir, ids)}
            onDeleteSelected={(ids) => deleteSelected(ids)}
            onGroup={(ids) => groupSelected(ids)}
            onUngroup={(ids) => ungroupSelected(ids)}
            onLockSelected={(ids) => lockElements(ids)}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
            onToolChange={setTool}
            editingNoteId={editingNoteId}
            onEditNote={setEditingNoteId}
            colors={COLORS}
            onPatchElement={patchElement}
            onDeleteElement={(id) => deleteSelected([id])}
            onNoteText={(id, rawText) => {
              const el = page.elements.find((e) => e.id === id) as NoteEl | undefined;
              if (!el) return;
              if (el.variant === 'text' && !rawText.trim()) {
                deleteSelected([id]);
                return;
              }
              // Yazının tamamını saran [b]/[i]/[u] işaretleri kutunun kendi biçimine çevrilir (yazıda işaret kalmaz)
              const whole = el.variant === 'text' ? normalizeWholeTags(rawText) : null;
              const text = whole ? whole.text : rawText;
              if (whole) {
                const styled = { ...el, ...whole.patch } as NoteEl;
                const w = fitTextWidth(styled, text);
                patchElement(id, { ...whole.patch, text, ...(w != null ? { w, autoW: true } : {}) } as Partial<BoardEl>);
                return;
              }
              // Yazıya oturan metin kutusu: yazı bitince genişlik en uzun satıra göre ayarlanır
              const fitted = fitTextWidth(el, text);
              if (fitted != null && fitted !== el.w) patchElement(id, { text, w: fitted, autoW: true } as Partial<BoardEl>);
              else if (el.text !== text) patchElement(id, { text });
            }}
            imageUrls={imageUrls}
            renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
            widgetsControlsOnly={tool === 'select'}
            barHost={barHost}
            onDropMedia={(payload, x, y) => { try { insertMedia(JSON.parse(payload), x, y); } catch { /* geçersiz */ } }}
            onDropShape={(id, x, y) => insertShape(id, x, y, getLastUsedParams(id))}
            onConfigureShape={canConfigureSelected ? handleOpenConfigureSelected : undefined}
            onSaveToLibrary={canSaveToLibrary(page.elements.filter((el) => selectedIds.includes(el.id))) ? (ids) => handleOpenSaveModal(page.elements.filter((el) => ids.includes(el.id))) : undefined}
            svgRef={(node) => { svgRef.current = node; }}
            ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa`}
          />
        </div>

        <footer className={styles.pageStrip}>
          <nav className={styles.pageStripList} aria-label="Sayfalar (sırayı değiştirmek için sürükleyin)">
            {content.pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.pageThumb} ${dragPage === i ? styles.pageDragging : ''} ${dropPage === i && dragPage !== i ? styles.pageDropTarget : ''}`}
                aria-current={i === pageIndex ? 'true' : undefined}
                onClick={() => { setPageIndex(i); setSelectedIds([]); }}
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
                <PageThumb page={p} imageUrls={imageUrls} />
              </button>
            ))}
            <button type="button" className={styles.pageAdd} onClick={addPage} disabled={content.pages.length >= MAX_PAGES} title={content.pages.length >= MAX_PAGES ? `En fazla ${MAX_PAGES} sayfa olabilir` : 'Bu sayfadan sonra boş sayfa ekle'}>
              <Plus size={22} aria-hidden="true" />
              <span>Sayfa ekle</span>
            </button>
          </nav>
          <div className={styles.pageStripTools} role="toolbar" aria-label={`${pageIndex + 1}. sayfa işlemleri`}>
            <span className={styles.saveState}>Sayfa {pageIndex + 1} / {content.pages.length}</span>
            <button type="button" className={styles.tool} onClick={duplicatePage} title="Sayfayı çoğalt" aria-label="Sayfayı çoğalt"><Copy size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => movePage(-1)} disabled={pageIndex === 0} title="Sayfayı sola taşı" aria-label="Sayfayı sola taşı"><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => movePage(1)} disabled={pageIndex >= content.pages.length - 1} title="Sayfayı sağa taşı" aria-label="Sayfayı sağa taşı"><ChevronRight size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={deletePage} disabled={content.pages.length <= 1} title={content.pages.length <= 1 ? 'Tek sayfa silinemez' : 'Sayfayı sil'} aria-label="Sayfayı sil"><Trash2 size={18} aria-hidden="true" /></button>
          </div>
        </footer>

        {barHost && selectedIds.length === 1 && selected && selected.type !== 'note' && createPortal(
          <ElementBar
            key={selected.id}
            el={selected}
            colors={COLORS}
            onPatch={(patch) => patchElement(selected.id, patch)}
            onDuplicate={() => duplicateElements([selected.id])}
            onOrder={(dir) => reorderElements(dir, [selected.id])}
            onDelete={() => deleteSelected([selected.id])}
            onLock={() => lockElements([selected.id])}
            onConfigure={canConfigureSelected ? handleOpenConfigureSelected : undefined}
            onSaveToLibrary={canSaveToLibrary([selected]) ? () => handleOpenSaveModal([selected]) : undefined}
            onSaveImage={selected.type === 'image' && !imageInMyFiles(selected) ? () => saveImageToFiles(selected) : undefined}
            onOpenSettings={selected.type === 'widget' ? openPanelManually : undefined}
            busy={busy}
          />,
          barHost,
        )}
        {ctxMenu && (() => {
          const ids = ctxMenu.ids;
          const els = page.elements.filter((el) => ids.includes(el.id));
          const run = (fn: () => void) => () => { setCtxMenu(null); fn(); };
          type Item = { label: string; key?: string; onClick: () => void; danger?: boolean; disabled?: boolean; sep?: boolean };
          const items: Item[] = [];
          if (els.length) {
            const image = els.length === 1 && els[0].type === 'image' ? els[0] : null;
            const oneGroup = els.length >= 2 && !!els[0].groupId && els.every((el) => el.groupId === els[0].groupId);
            items.push({ label: 'Kopyala', key: 'Ctrl+C', onClick: run(() => copySelected()) });
            items.push({ label: 'Çoğalt', key: 'Ctrl+D', onClick: run(() => duplicateElements(ids)) });
            items.push({ label: 'Öne getir', onClick: run(() => reorderElements('front', ids)), sep: true });
            items.push({ label: 'Arkaya gönder', onClick: run(() => reorderElements('back', ids)) });
            items.push({ label: 'Ayarlar', onClick: run(openPanelManually), sep: true });
            if (els.length >= 2 && !oneGroup) items.push({ label: 'Grupla', key: 'Ctrl+G', onClick: run(() => groupSelected(ids)), sep: true });
            if (els.some((el) => !!el.groupId)) items.push({ label: 'Grubu çöz', key: 'Ctrl+Shift+G', onClick: run(() => ungroupSelected(ids)), sep: !(els.length >= 2 && !oneGroup) });
            if (canSaveToLibrary(els)) items.push({ label: 'Kütüphaneye kaydet', onClick: run(() => handleOpenSaveModal(els)), sep: true });
            if (image && !imageInMyFiles(image)) items.push({ label: 'Dosyalarıma kaydet', onClick: run(() => { void saveImageToFiles(image); }), disabled: busy, sep: true });
            items.push({ label: 'Kilitle', onClick: run(() => lockElements(ids)), sep: true });
            items.push({ label: 'Sil', key: 'Delete', onClick: run(() => deleteSelected(ids)), danger: true, sep: true });
          } else {
            items.push({ label: 'Yapıştır', key: 'Ctrl+V', onClick: run(() => pasteClipboard()), disabled: !boardClipboard || !boardClipboard.length });
            const unlockedIds = page.elements.filter((el) => !el.locked).map((el) => el.id);
            items.push({ label: 'Tümünü seç', key: 'Ctrl+A', onClick: run(() => setSelectedIds(unlockedIds)), disabled: !unlockedIds.length });
            if (page.elements.some((el) => el.locked)) {
              items.push({ label: 'Tüm kilitleri aç', onClick: run(unlockAllOnPage), sep: true });
            }
          }
          const height = items.length * 44 + items.filter((i) => i.sep).length * 9 + 14;
          const left = Math.max(8, Math.min(ctxMenu.x, window.innerWidth - 236));
          const top = Math.max(8, Math.min(ctxMenu.y, window.innerHeight - height - 8));
          return (
            <div
              className={styles.ctxMenu}
              style={{ left, top }}
              role="menu"
              aria-label={els.length ? 'Seçili öğe işlemleri' : 'Tahta işlemleri'}
              data-board-ctx=""
              onContextMenu={(e) => e.preventDefault()}
            >
              {items.map((it, i) => (
                <React.Fragment key={it.label}>
                  {it.sep && i > 0 && <span className={styles.ctxSep} role="separator" />}
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.ctxItem} ${it.danger ? styles.ctxDanger : ''}`}
                    onClick={it.onClick}
                    disabled={it.disabled}
                    autoFocus={i === 0}
                  >
                    <span>{it.label}</span>
                    {it.key && <span className={styles.ctxKey} aria-hidden="true">{it.key}</span>}
                  </button>
                </React.Fragment>
              ))}
            </div>
          );
        })()}
        {deleteConfirm}
        {printArea}
        {configModal && (
          <ShapeConfigModal
            mode={configModal.mode}
            item={configModal.item}
            initialParams={configModal.initialParams}
            onConfirm={(params) => {
              if (configModal.mode === 'insert') {
                insertShape(configModal.item.id, BOARD_W / 2, BOARD_H / 2, params);
              } else {
                applyShapeConfig(configModal.item, params, configModal.groupId, configModal.elementId);
              }
              setConfigModal(null);
            }}
            onClose={() => setConfigModal(null)}
          />
        )}
        {saveModal && (
          <SaveShapeModal
            elements={saveModal.elements}
            onSave={handleSaveShape}
            onClose={() => setSaveModal(null)}
            busy={saveBusy}
            schoolSharingEnabled={false}
          />
        )}
        {editModal && (
          <EditShapeModal
            item={editModal.item}
            initialField={editModal.initialField}
            onSave={handleUpdateShape}
            onClose={() => setEditModal(null)}
            busy={saveBusy}
            schoolSharingEnabled={false}
          />
        )}
        {showPdfImport && content && (
          <PdfImportModal
            currentPageCount={content.pages.length}
            onClose={() => setShowPdfImport(false)}
            onImported={(newPages, urls) => {
              const next: BoardContent = { ...content, pages: [...content.pages, ...newPages] };
              if (byteSize(next) > MAX_BOARD_BYTES) {
                setNotice('Tahta boyutu sınırına ulaşıldı, PDF sayfaları eklenemedi.');
                setShowPdfImport(false);
                return;
              }
              setImageUrls((prev) => ({ ...prev, ...urls }));
              const firstNewIdx = content.pages.length;
              apply(next);
              setPageIndex(firstNewIdx);
              setSelectedIds([]);
              setShowPdfImport(false);
              setNotice(`${newPages.length} PDF sayfası eklendi.`);
            }}
          />
        )}
      </div>
    );
  }
