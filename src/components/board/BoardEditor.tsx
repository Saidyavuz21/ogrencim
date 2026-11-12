'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, Component,
  Copy, Diamond, Download, Eraser, Hexagon, Highlighter, History, HelpCircle, Image as ImageIcon, Layers, Maximize, Mic, Minimize, Minus, MousePointer,
  Palette, Pen, Play, Plus, Printer, Radio, RotateCcw, RotateCw, Save, Shapes, Shuffle, Sliders, Square, Star, StickyNote, Trash2, Triangle, Type, X,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import {
  Background, BACKGROUND_LABEL, BOARD_H, BOARD_IMAGE_BUCKET, BOARD_IMAGE_TYPES, BOARD_W, BoardContent, BoardEl,
  boardImageUrls, BoardPage, BoardRow, byteSize, cloneElements, copyImageToBoard, exportBoardPng, getBoard,
  HISTORY_LIMIT, imageKey, ImageEl, MAX_BOARD_BYTES, mediaRefs, MAX_PAGES, newId, newPage, NoteEl, saveBoard, scaleElements,
  ADDABLE_WIDGETS, StrokeEl, uploadBoardImage, WIDGET_LABEL, WIDGET_SIZE, WidgetEl, WidgetKind,
} from '../../lib/boardData';
import { listQuestions, QuestionRow } from '../../lib/quizData';
import { listMyFiles, signedFileUrl, uploadTeacherFiles } from '../../lib/filesData';
import { fileSlug } from '../../lib/reportData';
import { BoardCanvas, DRAW_TOOLS, SHAPE_TOOLS, Tool, wrapTextLines } from './BoardCanvas';
import { computeTextHeight, fitTextWidth, isDarkFill } from './textLayout';
import { translate } from './boardGeometry';
import { normalizeWholeTags } from './BoardFormatBars';
import { WidgetContext, WidgetView } from './Widgets';
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
  return false;
}

let boardClipboard: BoardEl[] | null = null;
let boardClipboardPageId: string | null = null;

const WIDTHS = [3, 6, 12];
/** Sunum kalemi kalınlıkları (düğme sırayla değiştirir) */
const PRESENT_WIDTHS = [{ value: 3, label: 'İnce', dot: 5 }, { value: 5, label: 'Orta', dot: 9 }, { value: 10, label: 'Kalın', dot: 14 }];
const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Seç', key: 'v' }, { id: 'pen', label: 'Kalem', key: 'p' }, { id: 'highlighter', label: 'Vurgu', key: 'h' },
  { id: 'eraser', label: 'Silgi', key: 'e' }, { id: 'line', label: 'Çizgi', key: 'l' }, { id: 'arrow', label: 'Ok', key: 'a' },
  { id: 'rect', label: 'Dikdörtgen', key: 'r' }, { id: 'ellipse', label: 'Daire', key: 'o' }, { id: 'note', label: 'Not', key: 'n' },
  { id: 'text', label: 'Metin', key: 't' },
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
  { id: 'media', label: 'Görseller' }, { id: 'widgets', label: 'Parçalar' }, { id: 'page', label: 'Zemin' },
];
const tabOfTool = (t: Tool): SideTab | null => (
  DRAW_TOOLS.includes(t) ? 'draw' : SHAPE_TOOLS.includes(t) ? 'shapes' : t === 'text' || t === 'note' ? 'text' : null
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
  const [annotPast, setAnnotPast] = useState<Record<string, StrokeEl[]>[]>([]);
  const [presentTool, setPresentTool] = useState<Tool>('pen');
  const [presentColor, setPresentColor] = useState('#d03b3b');
  const [presentWidth, setPresentWidth] = useState(5);
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
    const armPen = id === 'draw' && !DRAW_TOOLS.includes(tool);
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
      document.exitFullscreen().catch(() => {});
    } else {
      wantFsRef.current = true;
      rootRef.current?.requestFullscreen?.().catch(() => {});
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
        if (fullRef.current && wantFsRef.current && !document.fullscreenElement) rootRef.current?.requestFullscreen?.().catch(() => {});
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
    if (!strokes.length) return;
    const next: BoardContent = { ...content, pages: content.pages.map((p) => (p.id === page.id ? { ...p, elements: [...p.elements, ...strokes] } : p)) };
    if (byteSize(next) > MAX_BOARD_BYTES) { setNotice('Tahta boyutu sınırına ulaşıldı, yazılanlar kaydedilemedi.'); return; }
    apply(next);
    setAnnot({ ...annot, [page.id]: [] });
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
    commitElements(page.elements.filter((el) => !idSet.has(el.id)));
    setSelectedIds([]);
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

  // ---- Tam ekran sunum ----
  const toggleFull = () => {
    if (!full) {
      setFull(true);
      setSelectedIds([]);
      wantFsRef.current = true;
      const req = rootRef.current?.requestFullscreen?.();
      req?.catch(() => {});
    } else {
      setFull(false);
      setPresenting(false);
      wantFsRef.current = false;
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && page) {
        e.preventDefault();
        setSelectedIds(page.elements.map((el) => el.id));
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
        const next = { ...latest.content, pages: latest.content.pages.map((candidate) => candidate.id === targetPage.id
          ? { ...candidate, elements: [...candidate.elements, ...images] }
          : candidate) };
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

  const handleSaveShape = async (name: string, category: LibraryCategory, visibility: 'private' | 'school') => {
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

  const handleUpdateShape = async (id: string, patch: { name: string; category: LibraryCategory; visibility?: 'private' | 'school' }) => {
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
    const nextVisibility = item.visibility === 'school' ? 'private' : 'school';
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
  const addTextPreset = (kind: 'title' | 'subtitle' | 'body' | 'boxed' | 'note') => {
    if (!page) return;
    let el: NoteEl;
    if (kind === 'note') {
      el = { id: newId(), type: 'note', x: Math.round((BOARD_W - 420) / 2), y: Math.round((BOARD_H - 240) / 2), w: 420, h: 240, text: '', color: '#fff3b0', fontSize: 32 };
    } else {
      const w = kind === 'title' ? 900 : 620;
      const base: NoteEl = {
        id: newId(), type: 'note', variant: 'text', x: Math.round((BOARD_W - w) / 2), y: 0, w, h: 0, text: '', color: 'transparent',
        textColor: '#1f2a24', fontSize: kind === 'title' ? 72 : kind === 'subtitle' ? 42 : 32,
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
    const el: WidgetEl = { id: newId(), type: 'widget', kind, x: Math.round((BOARD_W - size.w) / 2), y: Math.round((BOARD_H - size.h) / 2), w: size.w, h: size.h, data: kind === 'steps' ? { title: 'Adım adım', steps: ['', ''] } : kind === 'timer' ? { seconds: 0 } : kind === 'match' ? { title: 'Eşleştirme', pairs: [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }] } : kind === 'audio' ? { title: 'Sesli not' } : {} };
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
    if (toDers) setStepOpen({});
    setPresenting(toDers);
  };
  // Hangi alanda olunduğu her zaman görünür: sol üstte iki parçalı seçim
  const modeSwitch = (
    <div className={`${styles.modeSwitch} ${presenting ? styles.modeSwitchDers : ''}`} role="group" aria-label="Tahta alanı">
      <button type="button" aria-pressed={!presenting} onClick={() => switchMode(false)} title="Düzenleme alanı: çizim, şekil, parça ve sayfa hazırlığı">
        <Pen size={18} aria-hidden="true" /><span>Düzenleme</span>
      </button>
      <button type="button" aria-pressed={presenting} onClick={() => switchMode(true)} title="Ders alanı: düzenleme kapalı; yazılanlar “Sayfaya kaydet”e basılmadıkça saklanmaz">
        <Play size={18} aria-hidden="true" /><span>Ders</span>
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
          <button type="button" className={styles.openButton} onClick={toggleFull} aria-label="Düzenle" title="Düzenleme alanı: çizim, şekil, parça ve sayfa hazırlığı (tam ekran)">
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
            <p className={styles.hintText}>Hazırlık için “Düzenle”: çizim, şekil, parça ve sayfalar. Sınıfta tahtanın başında “Derste kullan”: düzenleme kapalıdır, yalnızca kalemle yazılır.</p>
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
    return (
      <div ref={rootRef} className={`${styles.editor} ${styles.editorFull}`}>
        <div className={styles.stage}>
          {modeSwitch}
          <BoardCanvas
            page={page}
            tool={presentTool}
            color={presentColor}
            width={presentWidth}
            layer={layer}
            onLayerCommit={(strokes) => { setAnnotPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), annot]); setAnnot({ ...annot, [page.id]: strokes }); }}
            imageUrls={imageUrls}
            renderWidget={(w) => <WidgetView el={w} ctx={ctx} />}
            ariaLabel={`${board.title}, ${pageIndex + 1}. sayfa (sunum)`}
          />
          {notice && <p className={`${styles.saveWarn} ${styles.floatNotice}`} role="status" onClick={() => setNotice(null)}>{notice}</p>}
        </div>
        <div className={styles.presentBar} role="toolbar" aria-label="Ders araçları">
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
          {['#ffffff', '#d03b3b', '#2a78d6', '#1f2a24', '#1e7a4c', '#e0a800'].map((c) => (
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
          {(() => {
            const i = Math.max(0, PRESENT_WIDTHS.findIndex((w) => w.value === presentWidth));
            const cur = PRESENT_WIDTHS[i];
            return (
              <button
                type="button"
                className={styles.toolIconBtn}
                onClick={() => setPresentWidth(PRESENT_WIDTHS[(i + 1) % PRESENT_WIDTHS.length].value)}
                title={`Kalınlık: ${cur.label} (değiştirmek için dokunun)`}
                aria-label={`Kalem kalınlığı: ${cur.label}. Değiştir`}
              >
                <span aria-hidden="true" style={{ width: cur.dot, height: cur.dot, borderRadius: '50%', background: presentColor, boxShadow: '0 0 0 2px #ffffff' }} />
              </button>
            );
          })()}
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
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={savePresentAnnotations}
            disabled={!layer.length}
            title="Yazılanları bu sayfaya kaydet (kaydetmezseniz sunum bitince silinir)"
            aria-label="Yazılanları sayfaya kaydet"
          >
            <Save size={18} aria-hidden="true" />
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
          <button
            type="button"
            className={styles.toolIconBtn}
            onClick={addPage}
            title="Bu sayfadan sonra boş sayfa ekle"
            aria-label="Boş sayfa ekle"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <span className={styles.sep} aria-hidden="true" />
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
            onClick={toggleFull}
            title="Dersi kapat, tahta sayfasına dön"
            aria-label="Dersi kapat"
          >
            <X size={18} aria-hidden="true" />
          </button>
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
          <button type="button" className={styles.tool} onClick={toggleFull} aria-label="Düzenlemeden çık" title="Düzenlemeden çık (Esc)">
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
            onPatch={(patch) => patchElement(selected.id, patch)}
            onDelete={() => deleteSelected([selected.id])}
            onOrder={(dir) => reorderElements(dir, [selected.id])}
            onConfigure={canConfigureSelected ? handleOpenConfigureSelected : undefined}
            onSaveToLibrary={canSaveToLibrary([selected]) ? () => handleOpenSaveModal([selected]) : undefined}
            onSaveImage={selected.type === 'image' && !imageInMyFiles(selected) ? () => saveImageToFiles(selected) : undefined}
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
            onConfigure={canConfigureSelected ? handleOpenConfigureSelected : undefined}
            onSaveToLibrary={canSaveToLibrary(page.elements.filter((el) => selectedIds.includes(el.id))) ? () => handleOpenSaveModal(page.elements.filter((el) => selectedIds.includes(el.id))) : undefined}
          />
        ) : null}

        {!settingsView && sideTab === 'draw' && (
          <div className={styles.sideCard}>
            <div className={styles.popoverSection}>
              <span className={styles.popoverLabel}>Çizim aracı</span>
              <div className={styles.brushRow}>
                <button type="button" className={`${styles.brushCard} ${tool === 'pen' ? styles.brushActive : ''}`} aria-pressed={tool === 'pen'} onClick={() => setTool('pen')} title="Kalem (P)">
                  <div className={styles.brushPreview} style={{ borderColor: tool === 'pen' ? color : '#dedad0' }}>
                    <Pen size={20} color={tool === 'pen' ? color : 'currentColor'} />
                  </div>
                  <span>Kalem</span>
                </button>
                <button type="button" className={`${styles.brushCard} ${tool === 'highlighter' ? styles.brushActive : ''}`} aria-pressed={tool === 'highlighter'} onClick={() => setTool('highlighter')} title="Vurgulayıcı (H)">
                  <div className={styles.brushPreview} style={{ borderColor: tool === 'highlighter' ? color : '#dedad0' }}>
                    <Highlighter size={20} color={tool === 'highlighter' ? color : 'currentColor'} />
                  </div>
                  <span>Vurgu</span>
                </button>
                <button type="button" className={`${styles.brushCard} ${tool === 'eraser' ? styles.brushActive : ''}`} aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')} title="Silgi (E)">
                  <div className={styles.brushPreview} style={{ borderColor: tool === 'eraser' ? '#d03b3b' : '#dedad0' }}>
                    <Eraser size={20} color={tool === 'eraser' ? '#d03b3b' : 'currentColor'} />
                  </div>
                  <span>Silgi</span>
                </button>
              </div>
            </div>
            {tool === 'eraser' ? (
              <p className={styles.hintText}>Dokunduğunuz çizgi veya şeklin tamamını siler. Geri al ile geri getirebilirsiniz.</p>
            ) : (
              <>
                <div className={styles.popoverSection}>
                  <span className={styles.popoverLabel}><Palette size={14} aria-hidden="true" />{tool === 'highlighter' ? 'Vurgu rengi' : 'Kalem rengi'}</span>
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
                    <span className={styles.widthDotPreview} style={{ width: preset.dot, height: preset.dot, backgroundColor: color }} />
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
              </>
            )}
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
                    <span className={styles.widthDotPreview} style={{ width: preset.dot, height: preset.dot, backgroundColor: color }} />
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
              {ADDABLE_WIDGETS.map((k) => (
                <button key={k} type="button" className={styles.widgetItemBtn} onClick={() => addWidget(k)}>
                  <span className={styles.widgetItemIcon}>
                    {k === 'timer' ? <Clock size={16} /> :
                     k === 'minitest' ? <Component size={16} /> :
                     k === 'match' ? <Shuffle size={16} /> :
                     k === 'audio' ? <Mic size={16} /> :
                     <Layers size={16} />}
                  </span>
                  <span className={styles.widgetItemTitle}>{WIDGET_LABEL[k]}</span>
                </button>
              ))}
            </div>
            <p className={styles.hintText}>Parça tahtanın ortasına eklenir; ayarları bu panelde açılır. “Geri” ile listeye dönersiniz.</p>
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
          </section>
        )}
      </aside>

      <div className={styles.workStage}>
        {notice && <p className={`${styles.saveWarn} ${styles.floatNotice}`} role="alert" onClick={() => setNotice(null)}>{notice}</p>}
        <BoardCanvas
          page={page}
          editable
          tool={tool}
          color={color}
          width={width}
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
          items.push({ label: 'Sil', key: 'Delete', onClick: run(() => deleteSelected(ids)), danger: true, sep: true });
        } else {
          items.push({ label: 'Yapıştır', key: 'Ctrl+V', onClick: run(() => pasteClipboard()), disabled: !boardClipboard || !boardClipboard.length });
          items.push({ label: 'Tümünü seç', key: 'Ctrl+A', onClick: run(() => setSelectedIds(page.elements.map((el) => el.id))), disabled: !page.elements.length });
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
    </div>
  );
}
