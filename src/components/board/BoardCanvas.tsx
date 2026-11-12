'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Background, BOARD_H, BOARD_W, BoardEl, BoardPage, imageKey, newId, NoteEl, PolyEl, scaleElements, ShapeEl, simplifyPoints, StrokeEl, WIDGET_LABEL, WidgetEl,
} from '../../lib/boardData';
import { RichText } from '../math/RichText';
import { hasMath } from '../../lib/math/parseMath';
import { hasRich, stripRich } from '../../lib/math/parseRich';
import { applyEditToElement, handleListEnter } from '../math/richEditing';
import {
  BOARD_FONT,
  computeTextHeight,
  getFontFamily,
  lineHeightOf,
  textEditWidth,
  textPad,
  wrapLines,
  wrapTextLines,
} from './textLayout';
import styles from './Board.module.css';
import {
  bbox, boxContains, combinedBbox, FONT_SIZES, getFontSizeOptions, hitTest, isShape, measuredHtmlHeights,
  measuredMathHeights, pointsToSvg, translate, type Box,
  isPolyShape, marqueeHits, polyShapePoints, type PolyShape,
} from './boardGeometry';
import { applyTagOrElement, FormatBar, MultiSelectBar } from './BoardFormatBars';

export { getFontFamily, wrapLines, wrapTextLines };
export {
  bbox, boxContains, combinedBbox, FONT_SIZES, getFontSizeOptions, hitTest, isShape, measuredHtmlHeights,
  measuredMathHeights, pointsToSvg, translate,
};

export type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'ellipse' | PolyShape | 'note' | 'text';
export const DRAW_TOOLS: Tool[] = ['pen', 'highlighter', 'eraser'];
/** Şekiller menüsündeki araçlar (çizgi, ok, dikdörtgen, daire ve hazır çokgenler) */
export const SHAPE_TOOLS: Tool[] = ['line', 'arrow', 'rect', 'ellipse', 'triangle', 'diamond', 'hexagon', 'star'];

/** Sürüklenen kutudan hazır çokgen öğesi (üçgen, eşkenar dörtgen, altıgen, yıldız) */
const polyFromBox = (el: ShapeEl, shape: PolyShape): PolyEl => ({
  id: el.id, type: 'poly', points: polyShapePoints(shape, el.x1, el.y1, el.x2, el.y2), color: el.color, width: el.width,
});

const FONT_FACES: Record<string, string[]> = {
  hand: ["400 42px 'Patrick Hand'"],
  display: ["300 42px 'Fredoka'", "400 42px 'Fredoka'", "700 42px 'Fredoka'"],
  school: ["400 42px 'Andika'", "700 42px 'Andika'"],
};

/** Yalnızca verilen yazı tiplerini yükler (Andika gibi büyük dosyalar kullanılmıyorsa indirilmez) */
export async function preloadBoardFonts(families: Iterable<string>): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const faces = Array.from(new Set(families)).flatMap((f) => FONT_FACES[f] || []);
  if (!faces.length) return;
  try {
    await Promise.all(faces.map((f) => document.fonts.load(f)));
  } catch {
    // Tarayıcı font yükleme hatası yutulur
  }
}

function resize(el: BoardEl, dx: number, dy: number): BoardEl {
  if (isShape(el)) return { ...el, x2: el.x2 + dx, y2: el.y2 + dy };
  if (el.type === 'poly') {
    const b = bbox(el);
    const origW = Math.max(1, b.w);
    const origH = Math.max(1, b.h);
    const newW = Math.max(20, origW + dx);
    const newH = Math.max(20, origH + dy);
    const scaleX = newW / origW;
    const scaleY = newH / origH;
    const points = el.points.map((v, i) => {
      const origOrigin = i % 2 === 0 ? b.x : b.y;
      return Math.round(origOrigin + (v - origOrigin) * (i % 2 === 0 ? scaleX : scaleY));
    });
    return { ...el, points };
  }
  if (el.type === 'image') {
    const w = Math.max(60, el.w + dx);
    return { ...el, w: Math.round(w), h: Math.round((w * el.h) / el.w) };
  }
  if (el.type === 'note' && el.variant === 'text') {
    const w = Math.round(Math.max(80, el.w + dx));
    const nextEl = { ...el, w };
    const h = computeTextHeight(nextEl);
    return { ...nextEl, h };
  }
  if (el.type === 'note' || el.type === 'widget') return { ...el, w: Math.round(Math.max(160, el.w + dx)), h: Math.round(Math.max(100, el.h + dy)) };
  return el;
}

const clampPt = (v: number, max: number) => Math.max(0, Math.min(max, v));

// --------------------------------------------------------
// Çizim
// --------------------------------------------------------
function BackgroundDefs({ id, bg }: { id: string; bg: Background }) {
  if (bg === 'grid') {
    return <pattern id={id} width={48} height={48} patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#dce4ec" strokeWidth={1.5} /></pattern>;
  }
  if (bg === 'lines') {
    return <pattern id={id} width={BOARD_W} height={60} patternUnits="userSpaceOnUse"><line x1={0} x2={BOARD_W} y1={59} y2={59} stroke="#cdd9e6" strokeWidth={2} /></pattern>;
  }
  if (bg === 'dots') {
    return <pattern id={id} width={40} height={40} patternUnits="userSpaceOnUse"><circle cx={20} cy={20} r={2.4} fill="#c3ccd6" /></pattern>;
  }
  if (bg === 'coord') {
    return <pattern id={id} width={40} height={40} patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#e1e7ee" strokeWidth={1.2} /></pattern>;
  }
  return null;
}

function CoordAxes() {
  const cx = BOARD_W / 2, cy = BOARD_H / 2;
  const ticks: React.ReactNode[] = [];
  for (let i = -11; i <= 11; i++) {
    if (!i) continue;
    const x = cx + i * 80;
    if (x > 20 && x < BOARD_W - 20) ticks.push(<g key={`x${i}`}><line x1={x} x2={x} y1={cy - 8} y2={cy + 8} stroke="#5b6b7a" strokeWidth={2} /><text x={x} y={cy + 30} textAnchor="middle" fontSize={20} fill="#5b6b7a">{i * 2}</text></g>);
  }
  for (let i = -6; i <= 6; i++) {
    if (!i) continue;
    const y = cy - i * 80;
    if (y > 20 && y < BOARD_H - 20) ticks.push(<g key={`y${i}`}><line x1={cx - 8} x2={cx + 8} y1={y} y2={y} stroke="#5b6b7a" strokeWidth={2} /><text x={cx - 16} y={y + 7} textAnchor="end" fontSize={20} fill="#5b6b7a">{i * 2}</text></g>);
  }
  return (
    <g>
      <line x1={0} x2={BOARD_W} y1={cy} y2={cy} stroke="#3c4b5a" strokeWidth={3} />
      <line x1={cx} x2={cx} y1={0} y2={BOARD_H} stroke="#3c4b5a" strokeWidth={3} />
      <path d={`M${BOARD_W - 4} ${cy}l-22 -10v20z M${cx} 4l-10 22h20z`} fill="#3c4b5a" />
      <text x={BOARD_W - 30} y={cy - 18} fontSize={26} fontStyle="italic" fill="#3c4b5a">x</text>
      <text x={cx + 18} y={34} fontSize={26} fontStyle="italic" fill="#3c4b5a">y</text>
      {ticks}
    </g>
  );
}

function strokePath(points: number[]) {
  if (points.length === 2) return `M${points[0]} ${points[1]}l0.01 0`;
  let d = `M${points[0]} ${points[1]}`;
  // Yumuşak çizgi: ara noktalardan geçen ikinci dereceden eğriler
  for (let i = 2; i < points.length - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2;
    const my = (points[i + 1] + points[i + 3]) / 2;
    d += ` Q${points[i]} ${points[i + 1]} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  d += ` L${points[points.length - 2]} ${points[points.length - 1]}`;
  return d;
}

function ElementViewImpl({ el, imageUrls, editingNote }: { el: BoardEl; imageUrls: Record<string, string>; editingNote?: boolean }) {
  switch (el.type) {
    case 'stroke':
      return <path d={strokePath(el.points)} fill="none" stroke={el.color} strokeWidth={el.width} strokeLinecap="round" strokeLinejoin="round" opacity={el.highlighter ? 0.38 : 1} />;
    case 'line':
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />;
    case 'arrow': {
      const ang = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const head = Math.max(18, el.width * 3.2);
      const p1 = [el.x2 - head * Math.cos(ang - 0.42), el.y2 - head * Math.sin(ang - 0.42)];
      const p2 = [el.x2 - head * Math.cos(ang + 0.42), el.y2 - head * Math.sin(ang + 0.42)];
      return (
        <g>
          <line x1={el.x1} y1={el.y1} x2={el.x2 - (head * 0.6) * Math.cos(ang)} y2={el.y2 - (head * 0.6) * Math.sin(ang)} stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
          <path d={`M${el.x2} ${el.y2}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z`} fill={el.color} />
        </g>
      );
    }
    case 'rect': {
      const b = bbox(el);
      return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={Math.min(el.rx ?? 6, b.w / 2, b.h / 2)} fill={el.fill || 'none'} stroke={el.color} strokeWidth={el.width} />;
    }
    case 'ellipse': {
      const b = bbox(el);
      return <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} fill={el.fill || 'none'} stroke={el.color} strokeWidth={el.width} />;
    }
    case 'poly':
      return (
        <polygon
          points={pointsToSvg(el.points)}
          fill={el.fill || 'none'}
          stroke={el.color}
          strokeWidth={el.width}
          strokeLinejoin="round"
        />
      );
    case 'note': {
      const isText = el.variant === 'text';
      const pad = textPad(el);
      const fontFamily = getFontFamily(el.fontFamily);
      const fontWeight = el.fontWeight || 400;
      const fontStyle = el.italic ? 'italic' : 'normal';
      const textDecoration = el.underline ? 'underline' : 'none';
      const fill = el.textColor || '#1f2a24';
      const align = el.align || 'left';
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
      const textX = align === 'center' ? el.x + el.w / 2 : align === 'right' ? el.x + el.w - pad : el.x + pad;
      const textY = el.y + pad + el.fontSize;
      const containsMath = hasMath(el.text || '');
      const containsRich = hasRich(el.text || '');
      const useHtml = containsMath || containsRich;
      const lh = lineHeightOf(el);
      const ls = el.letterSpacing ? `${el.letterSpacing}em` : undefined;

      const lines = isText
        ? wrapTextLines(el.text || '', el.w - pad * 2, el.fontSize, el.fontFamily, el.fontWeight, el.italic, el.letterSpacing)
        : wrapLines(stripRich(el.text || ''), el.w - 40, el.fontSize);

      const measuredH = measuredHtmlHeights.get(el.id);
      const renderH = measuredH ? Math.max(el.h, measuredH) : el.h;
      const boxRadius = el.boxRadius ?? 0;
      const effectiveRx = Math.min(boxRadius, renderH / 2);

      return (
        <g>
          {!isText && (
            <rect x={el.x} y={el.y} width={el.w} height={renderH} rx={14} fill={el.color} stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
          )}
          {isText && (el.boxFill || el.boxBorder) && (
            <rect
              x={el.x}
              y={el.y}
              width={el.w}
              height={renderH}
              rx={effectiveRx}
              fill={el.boxFill || 'none'}
              stroke={el.boxBorder || 'none'}
              strokeWidth={el.boxBorder ? 2 : 0}
            />
          )}
          {!editingNote && (
            useHtml ? (
              <foreignObject
                x={el.x}
                y={el.y}
                width={el.w}
                height={renderH}
                style={{ overflow: 'visible' }}
              >
                <div
                  {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
                  ref={(node) => {
                    if (node) {
                      const h = Math.ceil(node.scrollHeight || node.offsetHeight || node.getBoundingClientRect().height);
                      if (h && h !== measuredHtmlHeights.get(el.id)) {
                        measuredHtmlHeights.set(el.id, h);
                      }
                    }
                  }}
                  style={{
                    boxSizing: 'border-box',
                    width: `${el.w}px`,
                    minHeight: `${el.h}px`,
                    padding: `${pad}px`,
                    fontFamily,
                    fontSize: `${el.fontSize}px`,
                    fontWeight,
                    fontStyle,
                    textDecoration,
                    color: fill,
                    textAlign: align,
                    lineHeight: lh,
                    letterSpacing: ls,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <RichText text={el.text || ''} inline={false} />
                </div>
              </foreignObject>
            ) : (
              <text
                x={textX}
                y={textY}
                fontSize={el.fontSize}
                fill={fill}
                textAnchor={anchor}
                letterSpacing={ls}
                style={{
                  fontFamily,
                  fontWeight,
                  fontStyle,
                  textDecoration,
                }}
              >
                {lines.map((l, i) => (
                  <tspan key={i} x={textX} dy={i ? el.fontSize * lh : 0}>
                    {l || ' '}
                  </tspan>
                ))}
              </text>
            )
          )}
        </g>
      );
    }
    case 'image': {
      const url = imageUrls[imageKey(el)];
      return url
        ? <image href={url} x={el.x} y={el.y} width={el.w} height={el.h} preserveAspectRatio="xMidYMid meet" />
        : <rect x={el.x} y={el.y} width={el.w} height={el.h} fill="#eceae4" stroke="#c9c5b8" strokeDasharray="10 8" strokeWidth={2} />;
    }
    case 'widget':
      return (
        <g>
          <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={18} fill="#ffffff" stroke="#c9c5b8" strokeWidth={3} />
          <text x={el.x + 24} y={el.y + 48} fontSize={30} fontWeight={700} fill="#25634b" style={{ fontFamily: BOARD_FONT }}>{WIDGET_LABEL[el.kind]}</text>
          {el.kind === 'steps' && el.data.title && <text x={el.x + 24} y={el.y + 92} fontSize={26} fill="#3c4b44" style={{ fontFamily: BOARD_FONT }}>{el.data.title.slice(0, 40)}</text>}
        </g>
      );
  }
}

/**
 * Öğe değişmediyse yeniden çizilmez: kalemle yazarken her harekette sayfadaki bütün çizgilerin
 * baştan hesaplanması akıllı tahtalarda çizimi geciktiriyordu. Notlar yazı tipi yüklenince ve
 * ölçülen yükseklik değişince yeniden çizilmesi gerektiği için kapsam dışıdır.
 */
export const ElementView = React.memo(ElementViewImpl, (a, b) => (
  a.el === b.el && a.imageUrls === b.imageUrls && a.editingNote === b.editingNote && a.el.type !== 'note'
));

// --------------------------------------------------------
// Tuval
// --------------------------------------------------------
type Draft =
  | { kind: 'stroke'; el: StrokeEl }
  | { kind: 'shape'; el: ShapeEl; /** Hazır çokgen çiziliyorsa türü; el sürüklenen kutuyu tutar */ poly?: PolyShape }
  | { kind: 'erase'; removed: Set<string> }
  | { kind: 'move'; ids: string[]; sx: number; sy: number; origs: BoardEl[]; clickHitId?: string; dragged?: boolean }
  | { kind: 'resize'; id: string; sx: number; sy: number; orig: BoardEl }
  | { kind: 'resizeMulti'; sx: number; sy: number; origs: BoardEl[]; origBbox: Box }
  | { kind: 'marquee'; sx: number; sy: number; x: number; y: number; additive: boolean; base: string[] };

export interface BoardCanvasProps {
  page: BoardPage;
  /** Sayfa öğeleri düzenlenebilir mi (öğretmen) */
  editable?: boolean;
  tool?: Tool;
  color?: string;
  width?: number;
  colors?: string[];
  onCommit?: (elements: BoardEl[]) => void;
  /** Öğrenci katmanı: verilirse kalem/silgi yalnızca bu katmana çizer */
  layer?: StrokeEl[];
  onLayerCommit?: (strokes: StrokeEl[]) => void;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  onDuplicate?: (ids: string[]) => void;
  onOrder?: (dir: 'front' | 'back', ids: string[]) => void;
  onDeleteSelected?: (ids: string[]) => void;
  onGroup?: (ids: string[]) => void;
  onUngroup?: (ids: string[]) => void;
  onConfigureShape?: () => void;
  onSaveToLibrary?: (selectedIds: string[]) => void;
  onToolChange?: (tool: Tool) => void;
  editingNoteId?: string | null;
  onEditNote?: (id: string | null) => void;
  onNoteText?: (id: string, text: string) => void;
  onPatchElement?: (id: string, patch: Partial<BoardEl>) => void;
  onDeleteElement?: (id: string) => void;
  imageUrls: Record<string, string>;
  /** Parçaların etkileşimli HTML katmanı (sunum / öğrenci) */
  renderWidget?: (el: WidgetEl) => React.ReactNode;
  /** Parçalar görünür ama tıklanmaz (düzenlerken seçip taşımak için) */
  widgetsPassive?: boolean;
  /** Parçanın yalnızca düğme/alanları tıklanır; geri kalanı seçme ve taşıma için tuvale geçer */
  widgetsControlsOnly?: boolean;
  onDropMedia?: (payload: string, x: number, y: number) => void;
  onDropShape?: (id: string, x: number, y: number) => void;
  /** Sağ tık: tıklanan öğe(ler) seçilir ve menü istenir; boş alanda ids boştur. Koordinatlar ekran pikseli */
  onElementMenu?: (ids: string[], clientX: number, clientY: number) => void;
  /** Dışa aktarma için SVG öğesi */
  svgRef?: (node: SVGSVGElement | null) => void;
  /** Etkileşimsiz küçük önizleme */
  thumbnail?: boolean;
  ariaLabel?: string;
}

/**
 * Çizim imleci: kalemde seçili renkte nokta, silgide boş daire, vurgulayıcıda yarı saydam kare.
 * Koyu + beyaz çift halka sayesinde beyaz tahtada da koyu zeminde de görünür (tarayıcının ince artısı kayboluyordu).
 */
function drawCursor(tool: Tool, color: string): string {
  const c = /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#1f2a24';
  let shape: string;
  if (tool === 'eraser') {
    shape = "<circle cx='12' cy='12' r='9' fill='rgba(255,255,255,0.6)' stroke='#ffffff' stroke-width='4'/><circle cx='12' cy='12' r='9' fill='none' stroke='#1f2a24' stroke-width='1.6'/>";
  } else if (tool === 'highlighter') {
    shape = `<rect x='5' y='5' width='14' height='14' rx='3' fill='${c}' fill-opacity='0.55' stroke='#ffffff' stroke-width='3'/><rect x='5' y='5' width='14' height='14' rx='3' fill='none' stroke='#1f2a24' stroke-width='1.2'/>`;
  } else {
    shape = `<circle cx='12' cy='12' r='6' fill='${c}' stroke='#ffffff' stroke-width='3'/><circle cx='12' cy='12' r='7.5' fill='none' stroke='#1f2a24' stroke-width='1.2'/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>${shape}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
}

export function BoardCanvas(props: BoardCanvasProps) {
  const {
    page,
    editable,
    tool = 'select',
    color = '#1f2a24',
    width = 6,
    colors = ['#1f2a24', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5', '#ffd43b', '#ffffff'],
    onCommit,
    layer,
    onLayerCommit,
    selectedIds = [],
    onSelect,
    onDuplicate,
    onOrder,
    onDeleteSelected,
    onGroup,
    onUngroup,
    onConfigureShape,
    onSaveToLibrary,
    onToolChange,
    editingNoteId,
    onEditNote,
    onNoteText,
    onPatchElement,
    onDeleteElement,
    imageUrls,
    renderWidget,
    widgetsPassive,
    widgetsControlsOnly,
    onDropMedia,
    onDropShape,
    onElementMenu,
    svgRef,
    thumbnail,
    ariaLabel,
  } = props;
  const uid = useId().replace(/:/g, '');
  const patternId = `bg-${uid}`;
  const localSvg = useRef<SVGSVGElement | null>(null);
  const draft = useRef<Draft | null>(null);
  // Çizimi sürdüren parmak/kalem: ikinci bir dokunuş (avuç içi, başka parmak) süren çizimi bozmaz
  const activePointer = useRef<number | null>(null);
  const lastPointerAt = useRef(0);
  const strokeRaf = useRef(0);
  const [preview, setPreview] = useState<{ el?: BoardEl; els?: BoardEl[]; erased?: Set<string>; marquee?: Box } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [editingHeight, setEditingHeight] = useState<{ id: string; h: number } | null>(null);
  const [editingTextOverride, setEditingTextOverride] = useState<{ id: string; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formatBarRef = useRef<HTMLDivElement | null>(null);
  const [enteredGroupId, setEnteredGroupId] = useState<string | null>(null);
  const [, setFontsReady] = useState(0);

  // Sayfada kullanılan web yazı tipleri (Düz = sistem/Geist, yüklemeye gerek yok)
  const usedFontKey = Array.from(new Set(page.elements.flatMap((el) => (el.type === 'note' && el.fontFamily && el.fontFamily !== 'sans' ? [el.fontFamily] : [])))).sort().join(',');
  useEffect(() => {
    let active = true;
    preloadBoardFonts(usedFontKey ? usedFontKey.split(',') : []).then(() => {
      if (active) setFontsReady((c) => c + 1);
    });
    const onDone = () => {
      if (active) setFontsReady((c) => c + 1);
    };
    document.fonts?.addEventListener?.('loadingdone', onDone);
    return () => {
      active = false;
      document.fonts?.removeEventListener?.('loadingdone', onDone);
    };
  }, [usedFontKey]);

  // Yazma kutusu açılınca odak bir kare sonra da verilir (tıklamanın odak değişimi kutuyu kapatmasın)
  useEffect(() => {
    if (!editingNoteId) return;
    const raf = requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta && document.activeElement !== ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [editingNoteId]);

  const drawingOnLayer = !!onLayerCommit;
  const interactive = !thumbnail && (editable || drawingOnLayer);

  const setRefs = (node: SVGSVGElement | null) => {
    localSvg.current = node;
    svgRef?.(node);
  };

  const toPoint = (clientX: number, clientY: number) => {
    const r = localSvg.current!.getBoundingClientRect();
    return { x: clampPt(((clientX - r.left) / r.width) * BOARD_W, BOARD_W), y: clampPt(((clientY - r.top) / r.height) * BOARD_H, BOARD_H) };
  };

  const elements = page.elements;
  const activeGroupId = (enteredGroupId && selectedIds.length && elements.some((e) => e.groupId === enteredGroupId && selectedIds.includes(e.id))) ? enteredGroupId : null;
  const layerStrokes = layer || [];

  const eraseAt = (x: number, y: number, d: Extract<Draft, { kind: 'erase' }>) => {
    const pool: BoardEl[] = drawingOnLayer ? layerStrokes : elements.filter((e) => e.type === 'stroke' || e.type === 'line' || e.type === 'arrow' || e.type === 'rect' || e.type === 'ellipse' || e.type === 'poly');
    let changed = false;
    for (const el of pool) {
      if (!d.removed.has(el.id) && hitTest(el, x, y, 14)) { d.removed.add(el.id); changed = true; }
    }
    if (changed) setPreview({ erased: new Set(d.removed) });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (draft.current && activePointer.current !== null && activePointer.current !== e.pointerId) {
      // Çizim sürerken gelen ikinci dokunuş yok sayılır. Bırakma olayı kaçmış, yarım kalmış bir
      // çizim varsa (1 sn'dir hareket yok) önce o tamamlanır, yeni dokunuş olağan işlenir.
      if (e.timeStamp - lastPointerAt.current < 1000) return;
      finish();
    }
    activePointer.current = e.pointerId;
    lastPointerAt.current = e.timeStamp;
    const { x, y } = toPoint(e.clientX, e.clientY);
    const t: Tool = drawingOnLayer && !DRAW_TOOLS.includes(tool) ? 'pen' : tool;
    if (editingNoteId) {
      const curVal = textareaRef.current ? textareaRef.current.value : (editingNote?.text || '');
      if (editingNote && editingNote.variant === 'text' && !curVal.trim()) {
        if (onDeleteElement) onDeleteElement(editingNote.id);
        else onCommit?.(elements.filter((el) => el.id !== editingNote.id));
      } else if (editingNote && curVal !== editingNote.text) {
        onNoteText?.(editingNote.id, curVal);
      }
      setEditingHeight(null);
      onEditNote?.(null);
    }
    if (t === 'pen' || t === 'highlighter') {
      const hl = t === 'highlighter';
      draft.current = { kind: 'stroke', el: { id: newId(), type: 'stroke', points: [x, y], color, width: hl ? Math.max(18, width * 3) : width, highlighter: hl || undefined } };
      setPreview({ el: draft.current.el });
    } else if (t === 'eraser') {
      draft.current = { kind: 'erase', removed: new Set() };
      eraseAt(x, y, draft.current);
    } else if (!editable) {
      return;
    } else if (t === 'line' || t === 'arrow' || t === 'rect' || t === 'ellipse') {
      draft.current = { kind: 'shape', el: { id: newId(), type: t, x1: x, y1: y, x2: x, y2: y, color, width } };
      setPreview({ el: draft.current.el });
    } else if (isPolyShape(t)) {
      const box: ShapeEl = { id: newId(), type: 'rect', x1: x, y1: y, x2: x, y2: y, color, width };
      draft.current = { kind: 'shape', el: box, poly: t };
      setPreview({ el: polyFromBox(box, t) });
    } else if (t === 'note') {
      const note: NoteEl = { id: newId(), type: 'note', x: Math.round(Math.min(x, BOARD_W - 420)), y: Math.round(Math.min(y, BOARD_H - 240)), w: 420, h: 240, text: '', color: '#fff3b0', fontSize: 32 };
      // Tarayıcının bu tıklamadaki varsayılan odak değişimi yeni açılan yazma kutusunun odağını
      // hemen çalıyordu (kutu kapanıyor, boş metin siliniyordu); engellenir.
      e.preventDefault();
      onCommit?.([...elements, note]);
      onSelect?.([note.id]);
      onEditNote?.(note.id);
      onToolChange?.('select');
      return;
    } else if (t === 'text') {
      const initialH = computeTextHeight({ id: '', type: 'note', variant: 'text', x: 0, y: 0, w: 520, h: 0, text: '', color: 'transparent', fontSize: 42 });
      const textEl: NoteEl = {
        id: newId(),
        type: 'note',
        variant: 'text',
        x: Math.round(Math.min(x, BOARD_W - 520)),
        y: Math.round(Math.min(y, BOARD_H - initialH)),
        w: 520,
        h: initialH,
        text: '',
        color: 'transparent',
        textColor: color,
        fontSize: 42,
        // Yazı bitince kutu yazının genişliğine oturur
        autoW: true,
      };
      e.preventDefault(); // bkz. Not: yazma kutusunun odağı korunur
      onCommit?.([...elements, textEl]);
      onSelect?.([textEl.id]);
      onEditNote?.(textEl.id);
      onToolChange?.('select');
      return;
    } else {
      // Seçim
      const curSelectedEls = elements.filter((el) => selectedIds.includes(el.id));
      if (curSelectedEls.length > 1 && !activeGroupId) {
        const cb = combinedBbox(curSelectedEls.map(bbox));
        if (Math.hypot(x - (cb.x + cb.w), y - (cb.y + cb.h)) < 24) {
          draft.current = { kind: 'resizeMulti', sx: x, sy: y, origs: curSelectedEls, origBbox: cb };
          setIsResizing(true);
          localSvg.current?.setPointerCapture(e.pointerId);
          return;
        }
      } else if (curSelectedEls.length === 1) {
        const sel = curSelectedEls[0];
        if (sel.type !== 'stroke') {
          const b = bbox(sel);
          if (Math.hypot(x - (b.x + b.w), y - (b.y + b.h)) < 24) {
            if (sel.groupId && !activeGroupId) {
              draft.current = { kind: 'resizeMulti', sx: x, sy: y, origs: [sel], origBbox: b };
            } else {
              draft.current = { kind: 'resize', id: sel.id, sx: x, sy: y, orig: sel };
            }
            setIsResizing(true);
            localSvg.current?.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      // Hit tespiti: önce tıklanan öğeyi bul
      const hit = [...elements].reverse().find((el) => hitTest(el, x, y));

      if (hit) {
        if (activeGroupId && hit.groupId === activeGroupId) {
          // Grup içi kipindeyiz: tekil öğe seçimi / taşıması
          if (e.shiftKey) {
            const next = selectedIds.includes(hit.id)
              ? selectedIds.filter((id) => id !== hit.id)
              : [...selectedIds, hit.id];
            onSelect?.(next);
          } else if (selectedIds.includes(hit.id)) {
            const origs = elements.filter((el) => selectedIds.includes(el.id));
            draft.current = { kind: 'move', ids: selectedIds, sx: x, sy: y, origs, clickHitId: hit.id, dragged: false };
          } else {
            onSelect?.([hit.id]);
            draft.current = { kind: 'move', ids: [hit.id], sx: x, sy: y, origs: [hit], clickHitId: hit.id, dragged: false };
          }
        } else {
          // Eğer grup içi kipindeysek ve grup dışındaki bir öğeye tıklandıysa:
          // Kipten çık ve tıklanan öğeyi (ya da grubunu) seç!
          if (activeGroupId) {
            setEnteredGroupId(null);
          }

          // Normal seçim: eğer öğenin grubu varsa tüm grup seçilir
          const targetIds = hit.groupId
            ? elements.filter((el) => el.groupId === hit.groupId).map((el) => el.id)
            : [hit.id];

          if (e.shiftKey) {
            const isAnySelected = targetIds.some((id) => selectedIds.includes(id));
            const next = isAnySelected
              ? selectedIds.filter((id) => !targetIds.includes(id))
              : Array.from(new Set([...selectedIds, ...targetIds]));
            onSelect?.(next);
          } else {
            const isAllSelected = targetIds.every((id) => selectedIds.includes(id));
            if (isAllSelected && selectedIds.length >= targetIds.length) {
              const origs = elements.filter((el) => selectedIds.includes(el.id));
              draft.current = { kind: 'move', ids: selectedIds, sx: x, sy: y, origs, clickHitId: hit.id, dragged: false };
            } else {
              onSelect?.(targetIds);
              const origs = elements.filter((el) => targetIds.includes(el.id));
              draft.current = { kind: 'move', ids: targetIds, sx: x, sy: y, origs, clickHitId: hit.id, dragged: false };
            }
          }
        }
      } else {
        // Boş alana tıklandı: grup içi kipindeysek çık
        if (activeGroupId) {
          setEnteredGroupId(null);
        }
        draft.current = { kind: 'marquee', sx: x, sy: y, x, y, additive: e.shiftKey, base: e.shiftKey ? selectedIds : [] };
      }
    }
    localSvg.current?.setPointerCapture(e.pointerId);
  };

  // Sağ tık menüsü: tarayıcının menüsü yerine tahtanın kendi işlemleri (yazı alanlarında tarayıcı menüsü kalır)
  const onContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !editable || !onElementMenu || drawingOnLayer || editingNoteId) return;
    if ((e.target as Element).closest?.('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    const { x, y } = toPoint(e.clientX, e.clientY);
    const hit = [...elements].reverse().find((el) => hitTest(el, x, y));
    let ids: string[] = [];
    if (hit) {
      if (selectedIds.includes(hit.id)) {
        ids = selectedIds;
      } else {
        const inEnteredGroup = !!activeGroupId && hit.groupId === activeGroupId;
        ids = hit.groupId && !inEnteredGroup ? elements.filter((el) => el.groupId === hit.groupId).map((el) => el.id) : [hit.id];
        onSelect?.(ids);
      }
    }
    onElementMenu(ids, e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement | SVGRectElement>) => {
    const d = draft.current;
    if (!d) return;
    if (activePointer.current !== null && e.pointerId !== activePointer.current) return;
    lastPointerAt.current = e.timeStamp;
    const { x, y } = toPoint(e.clientX, e.clientY);
    if (d.kind === 'stroke') {
      // Tarayıcının iki kare arasında biriktirdiği ara noktalar da alınır (hızlı yazıda köşeli çizgi olmasın)
      const native = e.nativeEvent as PointerEvent;
      const batch = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
      const pts = batch.length ? batch.map((ev) => toPoint(ev.clientX, ev.clientY)) : [{ x, y }];
      const p = d.el.points;
      let added = false;
      for (const pt of pts) {
        if (Math.hypot(pt.x - p[p.length - 2], pt.y - p[p.length - 1]) < 1.5) continue;
        p.push(pt.x, pt.y);
        added = true;
      }
      if (!added) return;
      // Ekran karesi başına en çok bir kez çizilir
      if (!strokeRaf.current) {
        strokeRaf.current = requestAnimationFrame(() => {
          strokeRaf.current = 0;
          const cur = draft.current;
          if (cur?.kind !== 'stroke') return;
          cur.el = { ...cur.el };
          setPreview({ el: cur.el });
        });
      }
    } else if (d.kind === 'erase') {
      eraseAt(x, y, d);
    } else if (d.kind === 'shape') {
      let x2 = x, y2 = y;
      // Shift: düz çizgi / kare / daire
      if (e.shiftKey) {
        if (d.el.type === 'line' || d.el.type === 'arrow') {
          if (Math.abs(x - d.el.x1) > Math.abs(y - d.el.y1)) y2 = d.el.y1; else x2 = d.el.x1;
        } else {
          const s = Math.max(Math.abs(x - d.el.x1), Math.abs(y - d.el.y1));
          x2 = d.el.x1 + Math.sign(x - d.el.x1 || 1) * s;
          y2 = d.el.y1 + Math.sign(y - d.el.y1 || 1) * s;
        }
      }
      d.el = { ...d.el, x2, y2 };
      setPreview({ el: d.poly ? polyFromBox(d.el, d.poly) : d.el });
    } else if (d.kind === 'move') {
      const dx = x - d.sx;
      const dy = y - d.sy;
      if (Math.hypot(dx, dy) >= 3) d.dragged = true;
      setPreview({ els: d.origs.map((orig) => translate(orig, dx, dy)) });
    } else if (d.kind === 'resize') {
      setPreview({ el: resize(d.orig, x - d.sx, y - d.sy) });
    } else if (d.kind === 'resizeMulti') {
      const cb = d.origBbox;
      const w = Math.max(1, cb.w);
      const h = Math.max(1, cb.h);
      const dx = x - d.sx;
      const dy = y - d.sy;
      const rawS = Math.max((w + dx) / w, (h + dy) / h);
      const sMin = Math.max(40 / w, 40 / h);
      const sMax = Math.min((BOARD_W - cb.x) / w, (BOARD_H - cb.y) / h);
      let s = rawS;
      if (sMax >= sMin) {
        s = Math.min(sMax, Math.max(sMin, rawS));
      } else {
        s = sMin;
      }
      const scaledEls = scaleElements(d.origs, cb.x, cb.y, s, wrapTextLines);
      setPreview({ els: scaledEls });
    } else if (d.kind === 'marquee') {
      d.x = x;
      d.y = y;
      const mbox = {
        x: Math.min(d.sx, x),
        y: Math.min(d.sy, y),
        w: Math.abs(x - d.sx),
        h: Math.abs(y - d.sy),
      };
      setPreview({ marquee: mbox });
    }
  };

  const finish = (e?: React.PointerEvent) => {
    const d = draft.current;
    if (!d) return;
    // Çizimi başlatmayan parmağın kalkması çizimi bitirmez
    if (e && activePointer.current !== null && e.pointerId !== activePointer.current) return;
    draft.current = null;
    activePointer.current = null;
    if (strokeRaf.current) { cancelAnimationFrame(strokeRaf.current); strokeRaf.current = 0; }
    const p = preview;
    setPreview(null);
    setIsResizing(false);
    if (d.kind === 'stroke') {
      const el = { ...d.el, points: simplifyPoints(d.el.points) };
      if (drawingOnLayer) onLayerCommit?.([...layerStrokes, el]);
      else onCommit?.([...elements, el]);
    } else if (d.kind === 'erase') {
      if (!d.removed.size) return;
      if (drawingOnLayer) onLayerCommit?.(layerStrokes.filter((s) => !d.removed.has(s.id)));
      else onCommit?.(elements.filter((el) => !d.removed.has(el.id)));
    } else if (d.kind === 'shape') {
      const el = { ...d.el, x1: Math.round(d.el.x1), y1: Math.round(d.el.y1), x2: Math.round(d.el.x2), y2: Math.round(d.el.y2) };
      if (Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 6) return;
      // Hazır çokgen: tek yönde sürüklenmiş (alanı olmayan) kutu şekil vermez
      if (d.poly && (Math.abs(el.x2 - el.x1) < 6 || Math.abs(el.y2 - el.y1) < 6)) return;
      onCommit?.([...elements, d.poly ? polyFromBox(el, d.poly) : el]);
      onSelect?.([el.id]);
      onToolChange?.('select');
    } else if (d.kind === 'move') {
      if (d.dragged && p?.els && p.els.length) {
        const idMap = new Map(p.els.map((el) => [el.id, el]));
        onCommit?.(elements.map((el) => idMap.get(el.id) || el));
      } else if (!d.dragged && d.clickHitId && d.ids.length > 1) {
        onSelect?.([d.clickHitId]);
      }
    } else if (d.kind === 'resizeMulti') {
      if (p?.els && p.els.length) {
        const idMap = new Map(p.els.map((el) => [el.id, el]));
        onCommit?.(elements.map((el) => idMap.get(el.id) || el));
      }
    } else if (d.kind === 'resize' && p?.el) {
      const b0 = bbox(d.orig), b1 = bbox(p.el);
      if (b0.x === b1.x && b0.y === b1.y && b0.w === b1.w && b0.h === b1.h) return;
      // Metin kutusu elle boyutlandırıldı: genişlik artık yazıya göre ayarlanmaz
      const moved = p.el.type === 'note' && p.el.autoW ? { ...p.el, autoW: false } : p.el;
      onCommit?.(elements.map((el) => (el.id === d.id ? moved : el)));
    } else if (d.kind === 'marquee') {
      const mbox = {
        x: Math.min(d.sx, d.x),
        y: Math.min(d.sy, d.y),
        w: Math.abs(d.x - d.sx),
        h: Math.abs(d.y - d.sy),
      };
      if (mbox.w < 4 && mbox.h < 4) {
        if (!d.additive) onSelect?.([]);
      } else {
        // Çerçevenin dokunduğu öğeler seçilir (tamamen içinde olması gerekmez)
        const insideElements = elements.filter((el) => marqueeHits(mbox, el));
        let finalInsideIds: string[];
        if (activeGroupId) {
          finalInsideIds = insideElements.filter((el) => el.groupId === activeGroupId).map((el) => el.id);
        } else {
          const groupIds = new Set(insideElements.map((el) => el.groupId).filter(Boolean));
          finalInsideIds = elements
            .filter((el) => marqueeHits(mbox, el) || (el.groupId && groupIds.has(el.groupId)))
            .map((el) => el.id);
        }
        const finalIds = d.additive ? Array.from(new Set([...d.base, ...finalInsideIds])) : finalInsideIds;
        onSelect?.(finalIds);
      }
    }
  };

  const shown = elements
    .map((el) => {
      if (preview?.els) {
        const found = preview.els.find((p) => p.id === el.id);
        if (found) return found;
      }
      if (preview?.el && preview.el.id === el.id) return preview.el;
      return el;
    })
    .filter((el) => !(!drawingOnLayer && preview?.erased?.has(el.id)));
  const draftNew = preview?.el && !elements.some((el) => el.id === preview.el!.id) && !layerStrokes.some((s) => s.id === preview.el!.id) ? preview.el : null;
  const shownLayer = layerStrokes.filter((s) => !(drawingOnLayer && preview?.erased?.has(s.id)));
  const selectedElements = shown.filter((el) => selectedIds.includes(el.id));
  const selected = selectedElements.length === 1 ? selectedElements[0] : undefined;
  const editingNote = editingNoteId ? (elements.find((el) => el.id === editingNoteId) as NoteEl | undefined) : undefined;
  const editingText = (editingNote && editingTextOverride?.id === editingNote.id)
    ? editingTextOverride.text
    : (editingNote?.text || '');
  const currentEditingHeight = editingNote
    ? ((editingNote.variant === 'text' && editingHeight?.id === editingNote.id)
      ? editingHeight.h
      : bbox(editingNote).h)
    : 0;
  const activeNote = (editable && !widgetsPassive)
    ? (shown.find((el) => (el.id === editingNoteId || (selectedIds.length === 1 && el.id === selectedIds[0])) && el.type === 'note') as NoteEl | undefined)
    : undefined;
  const widgets = renderWidget ? shown.filter((el): el is WidgetEl => el.type === 'widget') : [];
  const drawTool = drawingOnLayer || DRAW_TOOLS.includes(tool);
  const cursor = !interactive ? 'default' : drawTool ? drawCursor(tool, color) : tool === 'select' ? 'default' : 'crosshair';

  // Boyut tutamağı: çoklu seçim / grup için birleşik çerçevenin, tek seçimde öğenin sağ alt köşesi
  let handlePos: { x: number; y: number; kind: 'multi' } | { x: number; y: number; kind: 'single'; sel: BoardEl } | null = null;
  if (editable) {
    if (selectedElements.length > 1 && !activeGroupId) {
      const cb = combinedBbox(selectedElements.map(bbox));
      handlePos = { x: cb.x + cb.w, y: cb.y + cb.h, kind: 'multi' };
    } else if (selected && selected.type !== 'stroke') {
      const b = bbox(selected);
      handlePos = { x: b.x + b.w, y: b.y + b.h, kind: 'single', sel: selected };
    }
  }
  const onHandlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (!handlePos) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointer.current = e.pointerId;
    lastPointerAt.current = e.timeStamp;
    const { x, y } = toPoint(e.clientX, e.clientY);
    if (handlePos.kind === 'multi') {
      const cb = combinedBbox(selectedElements.map(bbox));
      const origs = elements.filter((el) => selectedIds.includes(el.id));
      draft.current = { kind: 'resizeMulti', sx: x, sy: y, origs, origBbox: cb };
    } else if (handlePos.sel.groupId && !activeGroupId) {
      draft.current = { kind: 'resizeMulti', sx: x, sy: y, origs: [handlePos.sel], origBbox: bbox(handlePos.sel) };
    } else {
      draft.current = { kind: 'resize', id: handlePos.sel.id, sx: x, sy: y, orig: handlePos.sel };
    }
    setIsResizing(true);
  };

  return (
    <div
      className={`${styles.canvas} ${thumbnail ? styles.thumb : ''}`}
      onDragOver={(e) => {
        if (
          (onDropMedia && e.dataTransfer.types.includes('application/x-board-media')) ||
          (onDropShape && e.dataTransfer.types.includes('application/x-board-shape'))
        ) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (onDropShape && e.dataTransfer.types.includes('application/x-board-shape')) {
          const payload = e.dataTransfer.getData('application/x-board-shape');
          if (payload) {
            e.preventDefault();
            try {
              const data = JSON.parse(payload);
              const { x, y } = toPoint(e.clientX, e.clientY);
              onDropShape(data.id, x, y);
            } catch { /* geçersiz */ }
            return;
          }
        }
        const payload = e.dataTransfer.getData('application/x-board-media');
        if (!payload || !onDropMedia) return;
        e.preventDefault();
        const { x, y } = toPoint(e.clientX, e.clientY);
        onDropMedia(payload, x, y);
      }}
    >
      <svg
        ref={setRefs}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        className={styles.svg}
        role="img"
        aria-label={ariaLabel || 'Tahta sayfası'}
        style={{ cursor, touchAction: interactive ? 'none' : 'auto' }}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onDoubleClick={(e) => {
          if (!editable || tool !== 'select') return;
          const { x, y } = toPoint(e.clientX, e.clientY);
          const hit = [...elements].reverse().find((el) => hitTest(el, x, y));
          if (!hit) return;

          if (!activeGroupId && hit.groupId) {
            setEnteredGroupId(hit.groupId);
            onSelect?.([hit.id]);
            return;
          }

          if (hit.type === 'note') {
            onSelect?.([hit.id]);
            onEditNote?.(hit.id);
          }
        }}
      >
        <defs><BackgroundDefs id={patternId} bg={page.background} /></defs>
        <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#ffffff" />
        {page.background !== 'blank' && <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill={`url(#${patternId})`} />}
        {page.background === 'coord' && <CoordAxes />}
        {shown.map((el) => {
          const isMuted = activeGroupId && el.groupId !== activeGroupId;
          return (
            <g key={el.id} opacity={isMuted ? 0.4 : 1} style={{ transition: 'opacity 150ms ease' }}>
              <ElementView el={el} imageUrls={imageUrls} editingNote={el.id === editingNoteId} />
            </g>
          );
        })}
        {shownLayer.map((el) => <ElementView key={el.id} el={el} imageUrls={imageUrls} />)}
        {draftNew && <ElementView el={draftNew} imageUrls={imageUrls} />}
        {preview?.marquee && (
          <rect
            x={preview.marquee.x}
            y={preview.marquee.y}
            width={preview.marquee.w}
            height={preview.marquee.h}
            fill="rgba(42, 120, 214, 0.08)"
            stroke="#2a78d6"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )}
        {editable && selected && (() => {
          const b = bbox(selected);
          return (
            <g pointerEvents="none">
              <rect x={b.x - 8} y={b.y - 8} width={b.w + 16} height={b.h + 16} fill="none" stroke="#2a78d6" strokeWidth={3} strokeDasharray="12 8" />
              {selected.type !== 'stroke' && (
                <rect
                  x={b.x + b.w - 9}
                  y={b.y + b.h - 9}
                  width={18}
                  height={18}
                  rx={2}
                  fill="#ffffff"
                  stroke="#2a78d6"
                  strokeWidth={2}
                  style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
                />
              )}
            </g>
          );
        })()}
        {editable && selectedElements.length > 1 && (() => {
          const cb = combinedBbox(selectedElements.map(bbox));
          return (
            <g pointerEvents="none">
              {selectedElements.map((el) => {
                const b = bbox(el);
                return (
                  <rect
                    key={`sel-${el.id}`}
                    x={b.x - 4}
                    y={b.y - 4}
                    width={b.w + 8}
                    height={b.h + 8}
                    fill="none"
                    stroke="rgba(42, 120, 214, 0.45)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                );
              })}
              <rect
                x={cb.x - 8}
                y={cb.y - 8}
                width={cb.w + 16}
                height={cb.h + 16}
                fill="none"
                stroke="#2a78d6"
                strokeWidth={2}
                strokeDasharray="8 6"
              />
              {!activeGroupId && (
                <rect
                  x={cb.x + cb.w - 9}
                  y={cb.y + cb.h - 9}
                  width={18}
                  height={18}
                  rx={2}
                  fill="#ffffff"
                  stroke="#2a78d6"
                  strokeWidth={2}
                  style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
                />
              )}
            </g>
          );
        })()}
      </svg>

      {editable && !widgetsPassive && selectedElements.length >= 2 && !isResizing && (
        <MultiSelectBar
          elements={selectedElements}
          onDuplicate={() => onDuplicate?.(selectedIds)}
          onOrder={(dir) => onOrder?.(dir, selectedIds)}
          onDelete={() => onDeleteSelected?.(selectedIds)}
          onGroup={() => onGroup?.(selectedIds)}
          onUngroup={() => onUngroup?.(selectedIds)}
          onConfigure={onConfigureShape}
          onSaveToLibrary={onSaveToLibrary ? () => onSaveToLibrary(selectedIds) : undefined}
        />
      )}

      {activeNote && !isResizing && (
        <FormatBar
          el={activeNote}
          colors={colors}
          barRef={formatBarRef}
          textareaRef={textareaRef}
          onPatch={(patch) => {
            let finalPatch: Partial<NoteEl> = { ...patch };
            if (activeNote.variant === 'text') {
              const curText = (editingNote && editingNote.id === activeNote.id && textareaRef.current)
                ? textareaRef.current.value
                : (activeNote.text || ' ');
              const nextNote: NoteEl = { ...activeNote, ...patch, text: curText };
              const autoH = computeTextHeight(nextNote, curText);
              finalPatch = { ...finalPatch, h: autoH };
              if (editingNote && editingNote.id === activeNote.id) {
                setEditingHeight({ id: activeNote.id, h: autoH });
                if (curText !== activeNote.text) {
                  finalPatch.text = curText;
                }
              }
            }
            if (onPatchElement) {
              onPatchElement(activeNote.id, finalPatch);
            } else {
              onCommit?.(elements.map((el) => (el.id === activeNote.id ? ({ ...el, ...finalPatch } as NoteEl) : el)));
            }
          }}
        />
      )}

      {widgets.length > 0 && (
        <div className={styles.overlay}>
          {widgets.map((w) => (
            <div key={w.id} className={`${styles.widgetBox} ${widgetsControlsOnly && !widgetsPassive ? styles.widgetControlsOnly : ''}`} style={{ pointerEvents: widgetsPassive ? 'none' : undefined, left: `${(w.x / BOARD_W) * 100}%`, top: `${(w.y / BOARD_H) * 100}%`, width: `${(w.w / BOARD_W) * 100}%`, height: `${(w.h / BOARD_H) * 100}%` }}>
              {renderWidget!(w)}
            </div>
          ))}
        </div>
      )}

      {/* Widget katmanının üzerinde tutamak overlay'i */}
      {handlePos && (
        <svg
          className={styles.overlay}
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          style={{ zIndex: 15, pointerEvents: 'none' }}
        >
          <rect
            x={handlePos.x - 9}
            y={handlePos.y - 9}
            width={18}
            height={18}
            rx={2}
            fill="#ffffff"
            stroke="#2a78d6"
            strokeWidth={2}
            style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finish}
            onPointerCancel={finish}
          />
        </svg>
      )}

      {editingNote && (
        <>
          <textarea
          ref={textareaRef}
          className={`${styles.noteEditor} ${editingNote.variant === 'text' ? styles.textEditor : ''}`}
          autoFocus
          aria-label={editingNote.variant === 'text' ? 'Metin içeriği' : 'Not metni'}
          defaultValue={editingNote.text}
          maxLength={2000}
          style={{
            left: `${(editingNote.x / BOARD_W) * 100}%`,
            top: `${(editingNote.y / BOARD_H) * 100}%`,
            width: `${(textEditWidth(editingNote) / BOARD_W) * 100}%`,
            height: `${(currentEditingHeight / BOARD_H) * 100}%`,
            background: editingNote.variant === 'text' ? (editingNote.boxFill || 'transparent') : editingNote.color,
            color: editingNote.textColor || '#1f2a24',
            fontSize: `${(editingNote.fontSize / BOARD_W) * 100}cqw`,
            fontFamily: getFontFamily(editingNote.fontFamily),
            fontWeight: editingNote.fontWeight || 400,
            fontStyle: editingNote.italic ? 'italic' : 'normal',
            textDecoration: editingNote.underline ? 'underline' : 'none',
            textAlign: editingNote.align || 'left',
            lineHeight: lineHeightOf(editingNote),
            letterSpacing: editingNote.letterSpacing ? `${editingNote.letterSpacing}em` : undefined,
            padding: `${(textPad(editingNote) / BOARD_W) * 100}cqw`,
            border: (editingNote.variant === 'text' && editingNote.boxBorder) ? `2px solid ${editingNote.boxBorder}` : undefined,
            borderRadius: (editingNote.variant === 'text' && editingNote.boxRadius) ? `${(Math.min(editingNote.boxRadius, currentEditingHeight / 2) / BOARD_W) * 100}cqw` : undefined,
          }}
          spellCheck={true}
          lang="tr"
          onInput={(e) => {
            const val = (e.target as HTMLTextAreaElement).value;
            setEditingTextOverride({ id: editingNote.id, text: val });
            if (editingNote.variant === 'text') {
              const autoH = computeTextHeight({ ...editingNote, w: textEditWidth(editingNote) }, val);
              setEditingHeight({ id: editingNote.id, h: autoH });
            }
          }}
          onBlur={(e) => {
            const related = e.relatedTarget as Node | null;
            const isInsideFormatBar = related && formatBarRef.current?.contains(related);
            const val = e.target.value;
            const trimmed = val.trim();

            if (isInsideFormatBar) {
              if (val !== editingNote.text) {
                onNoteText?.(editingNote.id, val);
              }
              return;
            }

            if (editingNote.variant === 'text' && !trimmed) {
              if (onDeleteElement) {
                onDeleteElement(editingNote.id);
              } else {
                onCommit?.(elements.filter((el) => el.id !== editingNote.id));
              }
            } else {
              onNoteText?.(editingNote.id, val);
            }
            setEditingTextOverride(null);
            setEditingHeight(null);
            onEditNote?.(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              (e.target as HTMLTextAreaElement).blur();
            } else if (e.key === 'Enter' && !e.shiftKey) {
              const ta = textareaRef.current;
              if (ta) {
                const res = handleListEnter(ta.value, ta.selectionStart, ta.selectionEnd);
                if (res.handled) {
                  e.preventDefault();
                  applyEditToElement(ta, res, (next) => {
                    setEditingTextOverride({ id: editingNote.id, text: next });
                  });
                  return;
                }
              }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
              e.preventDefault();
              const ta = textareaRef.current;
              if (ta && ta.selectionStart < ta.selectionEnd) {
                applyTagOrElement(ta, 'b', (next) => {
                  setEditingTextOverride({ id: editingNote.id, text: next });
                  onNoteText?.(editingNote.id, next);
                }, () => onPatchElement?.(editingNote.id, { fontWeight: editingNote.fontWeight === 700 ? 400 : 700 }));
              } else {
                const newWeight = editingNote.fontWeight === 700 ? 400 : 700;
                if (onPatchElement) onPatchElement(editingNote.id, { fontWeight: newWeight });
              }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
              e.preventDefault();
              const ta = textareaRef.current;
              if (ta && ta.selectionStart < ta.selectionEnd) {
                applyTagOrElement(ta, 'i', (next) => {
                  setEditingTextOverride({ id: editingNote.id, text: next });
                  onNoteText?.(editingNote.id, next);
                }, () => onPatchElement?.(editingNote.id, { italic: !editingNote.italic }));
              } else {
                const newItalic = !editingNote.italic;
                if (onPatchElement) onPatchElement(editingNote.id, { italic: newItalic });
              }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
              e.preventDefault();
              const ta = textareaRef.current;
              if (ta && ta.selectionStart < ta.selectionEnd) {
                applyTagOrElement(ta, 'u', (next) => {
                  setEditingTextOverride({ id: editingNote.id, text: next });
                  onNoteText?.(editingNote.id, next);
                }, () => onPatchElement?.(editingNote.id, { underline: !editingNote.underline }));
              } else {
                const newUnderline = !editingNote.underline;
                if (onPatchElement) onPatchElement(editingNote.id, { underline: newUnderline });
              }
            }
          }}
        />
        {(hasMath(editingText) || hasRich(editingText)) && (
          <div
            style={{
              position: 'absolute',
              left: `${(editingNote.x / BOARD_W) * 100}%`,
              top: `calc(${((editingNote.y + currentEditingHeight) / BOARD_H) * 100}% + 8px)`,
              minWidth: `${Math.max(16, (editingNote.w / BOARD_W) * 100)}%`,
              maxWidth: '80%',
              background: '#ffffff',
              border: '1px solid #25634b',
              borderRadius: '8px',
              padding: '6px 12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
              zIndex: 35,
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#25634b', marginBottom: 2 }}>
              Canlı Önizleme
            </div>
            <div
              style={{
                color: editingNote.textColor || '#1f2a24',
                fontSize: `${(editingNote.fontSize / BOARD_W) * 100}cqw`,
                fontFamily: getFontFamily(editingNote.fontFamily),
                fontWeight: editingNote.fontWeight || 400,
                fontStyle: editingNote.italic ? 'italic' : 'normal',
                textDecoration: editingNote.underline ? 'underline' : 'none',
                textAlign: editingNote.align || 'left',
                lineHeight: lineHeightOf(editingNote),
                letterSpacing: editingNote.letterSpacing ? `${editingNote.letterSpacing}em` : undefined,
              }}
            >
              <RichText text={editingText} inline={false} />
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
