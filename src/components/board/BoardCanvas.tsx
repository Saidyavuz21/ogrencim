'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Highlighter, Italic, Square, Underline } from '../icons';
import {
  Background, BOARD_H, BOARD_W, BoardEl, BoardPage, imageKey, newId, NoteEl, scaleElements, ShapeEl, simplifyPoints, StrokeEl, WIDGET_LABEL, WidgetEl,
} from '../../lib/boardData';
import { LIBRARY_ITEMS } from '../../lib/boardLibrary';
import { RichText } from '../math/RichText';
import { MathPalette, insertMathTemplate } from '../math/MathPalette';
import { hasMath } from '../../lib/math/parseMath';
import { hasRich, stripRich } from '../../lib/math/parseRich';
import {
  BOARD_FONT,
  computeTextHeight,
  getFontFamily,
  lineHeightOf,
  textPad,
  wrapLines,
  wrapTextLines,
} from './textLayout';
import styles from './Board.module.css';

export { getFontFamily, wrapLines, wrapTextLines };

export type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'note' | 'text';
export const DRAW_TOOLS: Tool[] = ['pen', 'highlighter', 'eraser'];

type Box = { x: number; y: number; w: number; h: number };

// --------------------------------------------------------
// Geometri
// --------------------------------------------------------
export function pointsToSvg(points: number[]): string {
  let s = '';
  for (let i = 0; i < points.length; i += 2) {
    if (i > 0) s += ' ';
    s += `${points[i]},${points[i + 1]}`;
  }
  return s;
}

export const isShape = (el: BoardEl): el is ShapeEl => el.type === 'line' || el.type === 'arrow' || el.type === 'rect' || el.type === 'ellipse';

export const measuredHtmlHeights = new Map<string, number>();
export const measuredMathHeights = measuredHtmlHeights;

export function bbox(el: BoardEl): Box {
  if (el.type === 'stroke' || el.type === 'poly') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < el.points.length; i += 2) {
      minX = Math.min(minX, el.points[i]); maxX = Math.max(maxX, el.points[i]);
      minY = Math.min(minY, el.points[i + 1]); maxY = Math.max(maxY, el.points[i + 1]);
    }
    if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
    const pad = el.width / 2;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (isShape(el)) {
    return { x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2), w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) };
  }
  if (el.type === 'note') {
    if (el.variant === 'text') {
      const measuredH = measuredHtmlHeights.get(el.id);
      if (measuredH) {
        return { x: el.x, y: el.y, w: el.w, h: measuredH };
      }
      return { x: el.x, y: el.y, w: el.w, h: computeTextHeight(el) };
    }
    const measuredH = measuredHtmlHeights.get(el.id);
    if (measuredH && measuredH > el.h) {
      return { x: el.x, y: el.y, w: el.w, h: measuredH };
    }
  }
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function combinedBbox(boxes: Box[]): Box {
  if (!boxes.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function boxContains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1, dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

export function hitTest(el: BoardEl, x: number, y: number, slack = 10): boolean {
  if (el.type === 'stroke') {
    const tol = el.width / 2 + slack;
    if (el.points.length === 2) return Math.hypot(x - el.points[0], y - el.points[1]) <= tol;
    for (let i = 0; i < el.points.length - 2; i += 2) {
      if (distToSegment(x, y, el.points[i], el.points[i + 1], el.points[i + 2], el.points[i + 3]) <= tol) return true;
    }
    return false;
  }
  if (el.type === 'line' || el.type === 'arrow') return distToSegment(x, y, el.x1, el.y1, el.x2, el.y2) <= el.width / 2 + slack;
  if (el.type === 'rect' && !el.fill) {
    const b = bbox(el);
    const inner = x > b.x + slack && x < b.x + b.w - slack && y > b.y + slack && y < b.y + b.h - slack;
    return x >= b.x - slack && x <= b.x + b.w + slack && y >= b.y - slack && y <= b.y + b.h + slack && !inner;
  }
  if (el.type === 'ellipse' && !el.fill) {
    const b = bbox(el);
    const rx = b.w / 2 || 1, ry = b.h / 2 || 1;
    const d = Math.hypot((x - (b.x + rx)) / rx, (y - (b.y + ry)) / ry);
    return Math.abs(d - 1) * Math.min(rx, ry) <= slack + el.width;
  }
  if (el.type === 'poly') {
    const p = el.points;
    if (p.length < 6) return false;
    if (el.fill) {
      let inside = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const xi = p[i], yi = p[i + 1];
        const xj = p[j], yj = p[j + 1];
        const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      if (inside) return true;
    }
    const tol = el.width / 2 + slack;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      if (distToSegment(x, y, p[j], p[j + 1], p[i], p[i + 1]) <= tol) return true;
    }
    return false;
  }
  const b = bbox(el);
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function translate(el: BoardEl, dx: number, dy: number): BoardEl {
  if (el.type === 'stroke' || el.type === 'poly') return { ...el, points: el.points.map((v, i) => Math.round(v + (i % 2 ? dy : dx))) };
  if (isShape(el)) {
    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
  }
  return { ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
}

export const FONT_SIZES = [24, 32, 42, 56, 72, 96];

export function getFontSizeOptions(currentSize?: number): number[] {
  const base = [24, 32, 42, 56, 72, 96];
  if (currentSize && !base.includes(currentSize)) {
    return [...base, currentSize].sort((a, b) => a - b);
  }
  return base;
}

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

export function ElementView({ el, imageUrls, editingNote }: { el: BoardEl; imageUrls: Record<string, string>; editingNote?: boolean }) {
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

// --------------------------------------------------------
// Tuval
// --------------------------------------------------------
type Draft =
  | { kind: 'stroke'; el: StrokeEl }
  | { kind: 'shape'; el: ShapeEl }
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
  /** Dışa aktarma için SVG öğesi */
  svgRef?: (node: SVGSVGElement | null) => void;
  /** Etkileşimsiz küçük önizleme */
  thumbnail?: boolean;
  ariaLabel?: string;
}

function applyTagToSelection(
  textarea: HTMLTextAreaElement,
  tag: 'b' | 'i' | 'u',
  onChange: (nextText: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  if (start >= end) return false;

  const selected = text.slice(start, end);
  const openTag = `[${tag}]`;
  const closeTag = `[/${tag}]`;

  // 1. Seçim doğrudan [tag]...[/tag] ile mi sarılı?
  if (
    selected.toLowerCase().startsWith(openTag) &&
    selected.toLowerCase().endsWith(closeTag) &&
    selected.length >= openTag.length + closeTag.length
  ) {
    const inner = selected.slice(openTag.length, -closeTag.length);
    const next = text.slice(0, start) + inner + text.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(start, start + inner.length);
    });
    return true;
  }

  // 2. Seçimin hemen dışı [tag]...[/tag] mı?
  if (
    start >= openTag.length &&
    end + closeTag.length <= text.length &&
    text.slice(start - openTag.length, start).toLowerCase() === openTag &&
    text.slice(end, end + closeTag.length).toLowerCase() === closeTag
  ) {
    const next = text.slice(0, start - openTag.length) + selected + text.slice(end + closeTag.length);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(start - openTag.length, start - openTag.length + selected.length);
    });
    return true;
  }

  // 3. Etiketle sar
  const wrapped = `${openTag}${selected}${closeTag}`;
  const next = text.slice(0, start) + wrapped + text.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.value = next;
    textarea.setSelectionRange(start, start + wrapped.length);
  });
  return true;
}

function applyColorToSelection(
  textarea: HTMLTextAreaElement,
  color: string,
  onChange: (nextText: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  if (start >= end) return false;

  const selected = text.slice(start, end);
  const openTag = `[c=${color}]`;
  const closeTag = `[/c]`;

  const cMatch = /^\[c=#[0-9a-fA-F]{6}\]([\s\S]*)\[\/c\]$/i.exec(selected);
  if (cMatch) {
    const inner = cMatch[1];
    const wrapped = `${openTag}${inner}${closeTag}`;
    const next = text.slice(0, start) + wrapped + text.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(start, start + wrapped.length);
    });
    return true;
  }

  const before = text.slice(0, start);
  const after = text.slice(end);
  const beforeMatch = /\[c=#[0-9a-fA-F]{6}\]$/i.exec(before);
  if (beforeMatch && after.toLowerCase().startsWith('[/c]')) {
    const next = before.slice(0, -beforeMatch[0].length) + openTag + selected + closeTag + after.slice(4);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(start - beforeMatch[0].length, start - beforeMatch[0].length + openTag.length + selected.length + closeTag.length);
    });
    return true;
  }

  const wrapped = `${openTag}${selected}${closeTag}`;
  const next = text.slice(0, start) + wrapped + text.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.value = next;
    textarea.setSelectionRange(start, start + wrapped.length);
  });
  return true;
}

function applyHighlightToSelection(
  textarea: HTMLTextAreaElement,
  color: string | null,
  onChange: (nextText: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  if (start >= end) return false;

  const selected = text.slice(start, end);

  if (!color) {
    const hMatch = /^\[h=#[0-9a-fA-F]{6}\]([\s\S]*)\[\/h\]$/i.exec(selected);
    if (hMatch) {
      const inner = hMatch[1];
      const next = text.slice(0, start) + inner + text.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        textarea.value = next;
        textarea.setSelectionRange(start, start + inner.length);
      });
      return true;
    }
    const before = text.slice(0, start);
    const after = text.slice(end);
    const beforeMatch = /\[h=#[0-9a-fA-F]{6}\]$/i.exec(before);
    if (beforeMatch && after.toLowerCase().startsWith('[/h]')) {
      const next = before.slice(0, -beforeMatch[0].length) + selected + after.slice(4);
      onChange(next);
      requestAnimationFrame(() => {
        textarea.value = next;
        textarea.setSelectionRange(start - beforeMatch[0].length, start - beforeMatch[0].length + selected.length);
      });
      return true;
    }
    return false;
  }

  const openTag = `[h=${color}]`;
  const closeTag = `[/h]`;

  const hMatch = /^\[h=#[0-9a-fA-F]{6}\]([\s\S]*)\[\/h\]$/i.exec(selected);
  if (hMatch) {
    const inner = hMatch[1];
    const wrapped = `${openTag}${inner}${closeTag}`;
    const next = text.slice(0, start) + wrapped + text.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(start, start + wrapped.length);
    });
    return true;
  }

  const before = text.slice(0, start);
  const after = text.slice(end);
  const beforeMatch = /\[h=#[0-9a-fA-F]{6}\]$/i.exec(before);
  if (beforeMatch && after.toLowerCase().startsWith('[/h]')) {
    const next = before.slice(0, -beforeMatch[0].length) + openTag + selected + closeTag + after.slice(4);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(start - beforeMatch[0].length, start - beforeMatch[0].length + openTag.length + selected.length + closeTag.length);
    });
    return true;
  }

  const wrapped = `${openTag}${selected}${closeTag}`;
  const next = text.slice(0, start) + wrapped + text.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.value = next;
    textarea.setSelectionRange(start, start + wrapped.length);
  });
  return true;
}

function toggleListLines(
  textarea: HTMLTextAreaElement,
  type: 'bullet' | 'number',
  onChange: (nextText: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = text.length;

  const block = text.slice(lineStart, lineEnd);
  const lines = block.split('\n');

  if (type === 'bullet') {
    const allBullet = lines.every((l) => /^\s*•\s*/.test(l));
    let newLines: string[];
    if (allBullet) {
      newLines = lines.map((l) => l.replace(/^\s*•\s*/, ''));
    } else {
      newLines = lines.map((l) => {
        const clean = l.replace(/^\s*(?:•|\d+\.)\s*/, '');
        return `• ${clean}`;
      });
    }
    const newBlock = newLines.join('\n');
    const next = text.slice(0, lineStart) + newBlock + text.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(lineStart, lineStart + newBlock.length);
    });
  } else {
    const allNumber = lines.every((l) => /^\s*\d+\.\s*/.test(l));
    let newLines: string[];
    if (allNumber) {
      newLines = lines.map((l) => l.replace(/^\s*\d+\.\s*/, ''));
    } else {
      let count = 1;
      newLines = lines.map((l) => {
        const clean = l.replace(/^\s*(?:•|\d+\.)\s*/, '');
        return `${count++}. ${clean}`;
      });
    }
    const newBlock = newLines.join('\n');
    const next = text.slice(0, lineStart) + newBlock + text.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.value = next;
      textarea.setSelectionRange(lineStart, lineStart + newBlock.length);
    });
  }
}

function toggleTextList(text: string, type: 'bullet' | 'number'): string {
  const lines = text.split('\n');
  if (type === 'bullet') {
    const allBullet = lines.every((l) => /^\s*•\s*/.test(l));
    if (allBullet) {
      return lines.map((l) => l.replace(/^\s*•\s*/, '')).join('\n');
    }
    return lines.map((l) => `• ${l.replace(/^\s*(?:•|\d+\.)\s*/, '')}`).join('\n');
  } else {
    const allNumber = lines.every((l) => /^\s*\d+\.\s*/.test(l));
    if (allNumber) {
      return lines.map((l) => l.replace(/^\s*\d+\.\s*/, '')).join('\n');
    }
    let count = 1;
    return lines.map((l) => `${count++}. ${l.replace(/^\s*(?:•|\d+\.)\s*/, '')}`).join('\n');
  }
}

function FormatBar({
  el,
  colors,
  barRef,
  textareaRef,
  onPatch,
}: {
  el: NoteEl;
  colors: string[];
  barRef?: React.RefObject<HTMLDivElement | null>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPatch: (patch: Partial<NoteEl>) => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);

  const b = bbox(el);
  const topPct = b.y < 70
    ? ((b.y + b.h + 12) / BOARD_H) * 100
    : (b.y / BOARD_H) * 100;
  const transform = b.y < 70 ? 'none' : 'translateY(calc(-100% - 12px))';
  const leftPct = Math.max(1, Math.min(65, (b.x / BOARD_W) * 100));

  const fontSizes = getFontSizeOptions(el.fontSize);

  return (
    <div
      ref={barRef}
      className={styles.formatBar}
      role="toolbar"
      aria-label="Metin biçimlendirme"
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        transform,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Yazı tipi */}
      <select
        className={styles.formatSelect}
        value={el.fontFamily || 'sans'}
        onChange={(e) => onPatch({ fontFamily: e.target.value as 'sans' | 'hand' | 'display' | 'school' })}
        aria-label="Yazı tipi"
      >
        <option value="sans">Düz</option>
        <option value="hand">El yazısı</option>
        <option value="display">Başlık</option>
        <option value="school">Okul</option>
      </select>

      {/* Boyut */}
      <select
        className={styles.formatSelect}
        value={String(el.fontSize || 42)}
        onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
        aria-label="Yazı boyutu"
      >
        {fontSizes.map((sz) => (
          <option key={sz} value={sz}>{sz}</option>
        ))}
      </select>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* B */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.fontWeight === 700}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta && ta.selectionStart < ta.selectionEnd) {
            applyTagToSelection(ta, 'b', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ fontWeight: el.fontWeight === 700 ? 400 : 700 });
          }
        }}
        title="Kalın (Ctrl+B)"
        aria-label="Kalın"
      >
        <Bold size={16} aria-hidden="true" />
      </button>

      {/* I */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={Boolean(el.italic)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta && ta.selectionStart < ta.selectionEnd) {
            applyTagToSelection(ta, 'i', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ italic: !el.italic });
          }
        }}
        title="İtalik (Ctrl+I)"
        aria-label="İtalik"
      >
        <Italic size={16} aria-hidden="true" />
      </button>

      {/* U */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={Boolean(el.underline)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta && ta.selectionStart < ta.selectionEnd) {
            applyTagToSelection(ta, 'u', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ underline: !el.underline });
          }
        }}
        title="Altı çizili (Ctrl+U)"
        aria-label="Altı çizili"
      >
        <Underline size={16} aria-hidden="true" />
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* İnce · Normal · Kalın */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.fontWeight === 300}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ fontWeight: 300 })}
        title="İnce yazı"
      >
        İnce
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={(el.fontWeight ?? 400) === 400}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ fontWeight: 400 })}
        title="Normal yazı"
      >
        Normal
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.fontWeight === 700}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ fontWeight: 700 })}
        title="Kalın yazı"
      >
        Kalın
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Renk */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatColorTrigger}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setColorOpen((v) => !v)}
          title="Yazı rengi"
          aria-label="Yazı rengi"
          aria-haspopup="true"
          aria-expanded={colorOpen}
        >
          <span
            className={styles.formatColorDot}
            style={{ backgroundColor: el.textColor || '#1f2a24' }}
          />
        </button>

        {colorOpen && (
          <div className={styles.formatColorPopover}>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.formatColorSwatch}
                style={{ backgroundColor: c }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const ta = textareaRef?.current;
                  if (ta && ta.selectionStart < ta.selectionEnd) {
                    applyColorToSelection(ta, c, (nextText) => onPatch({ text: nextText }));
                  } else {
                    onPatch({ textColor: c });
                  }
                  setColorOpen(false);
                }}
                aria-label={`Renk ${c}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Vurgu (Highlighter) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={highlightOpen}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setHighlightOpen((v) => !v)}
          title="Vurgu rengi (Fosforlu kalem)"
          aria-label="Vurgu rengi"
          aria-haspopup="true"
          aria-expanded={highlightOpen}
        >
          <Highlighter size={16} aria-hidden="true" />
        </button>

        {highlightOpen && (
          <div
            className={styles.formatColorPopover}
            style={{
              minWidth: 140,
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { c: '#ffe066', name: 'Sarı' },
                { c: '#b2f2bb', name: 'Yeşil' },
                { c: '#fcc2d7', name: 'Pembe' },
                { c: '#a5d8ff', name: 'Mavi' },
              ].map(({ c, name }) => (
                <button
                  key={c}
                  type="button"
                  className={styles.formatColorSwatch}
                  style={{ backgroundColor: c, border: '1px solid rgba(0,0,0,0.15)' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const ta = textareaRef?.current;
                    if (ta && ta.selectionStart < ta.selectionEnd) {
                      applyHighlightToSelection(ta, c, (nextText) => onPatch({ text: nextText }));
                    }
                    setHighlightOpen(false);
                  }}
                  title={name}
                  aria-label={name}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.formatBtn}
              style={{
                width: '100%',
                fontSize: '11px',
                height: '24px',
                minHeight: '24px',
                padding: '0 4px',
                justifyContent: 'center',
                border: '1px solid #d4d0c5',
                borderRadius: '4px',
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const ta = textareaRef?.current;
                if (ta && ta.selectionStart < ta.selectionEnd) {
                  applyHighlightToSelection(ta, null, (nextText) => onPatch({ text: nextText }));
                }
                setHighlightOpen(false);
              }}
            >
              Vurguyu kaldır
            </button>
          </div>
        )}
      </div>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Hizalama */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={(!el.align || el.align === 'left')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ align: 'left' })}
        title="Sola hizala"
        aria-label="Sola hizala"
      >
        <AlignLeft size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.align === 'center'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ align: 'center' })}
        title="Ortaya hizala"
        aria-label="Ortaya hizala"
      >
        <AlignCenter size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.align === 'right'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ align: 'right' })}
        title="Sağa hizala"
        aria-label="Sağa hizala"
      >
        <AlignRight size={16} aria-hidden="true" />
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Kutu (Zemin, Kenarlık, Köşe) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={boxOpen || Boolean(el.boxFill || el.boxBorder)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setBoxOpen((v) => !v);
            setColorOpen(false);
            setHighlightOpen(false);
            setSpacingOpen(false);
            setMathOpen(false);
          }}
          title="Metin kutusu (zemin, kenarlık, köşe)"
          aria-label="Metin kutusu"
          aria-haspopup="true"
          aria-expanded={boxOpen}
        >
          <Square size={16} aria-hidden="true" />
          <span style={{ fontSize: 12, marginLeft: 2 }}>Kutu</span>
        </button>

        {boxOpen && (
          <div
            className={styles.formatColorPopover}
            style={{
              minWidth: 220,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Zemin */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Zemin
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.formatBtn}
                  style={{
                    height: 24,
                    minHeight: 24,
                    minWidth: 32,
                    padding: '0 4px',
                    fontSize: 11,
                    border: '1px solid #d4d0c5',
                    borderRadius: 4,
                  }}
                  aria-pressed={!el.boxFill}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPatch({ boxFill: null })}
                >
                  Yok
                </button>
                {[
                  { c: '#fff3bf', label: 'Sarı' },
                  { c: '#d3f9d8', label: 'Yeşil' },
                  { c: '#d0ebff', label: 'Mavi' },
                  { c: '#ffdeeb', label: 'Pembe' },
                  { c: '#f1f3f5', label: 'Gri' },
                  { c: '#25634b', label: 'Koyu Yeşil' },
                ].map(({ c, label }) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.formatColorSwatch}
                    style={{
                      backgroundColor: c,
                      outline: el.boxFill === c ? '2px solid #25634b' : 'none',
                      outlineOffset: 1,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (c === '#25634b') {
                        onPatch({ boxFill: c, textColor: '#ffffff' });
                      } else {
                        onPatch({ boxFill: c });
                      }
                    }}
                    title={label}
                    aria-label={label}
                  />
                ))}
              </div>
              {el.boxFill === '#25634b' && (
                <button
                  type="button"
                  className={styles.formatBtn}
                  style={{
                    marginTop: 6,
                    width: '100%',
                    height: 22,
                    minHeight: 22,
                    fontSize: 11,
                    border: '1px solid #25634b',
                    borderRadius: 4,
                    color: '#25634b',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPatch({ textColor: '#ffffff' })}
                >
                  Yazı rengini beyaz yap
                </button>
              )}
            </div>

            {/* Kenarlık */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Kenarlık
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.formatBtn}
                  style={{
                    height: 24,
                    minHeight: 24,
                    minWidth: 32,
                    padding: '0 4px',
                    fontSize: 11,
                    border: '1px solid #d4d0c5',
                    borderRadius: 4,
                  }}
                  aria-pressed={!el.boxBorder}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPatch({ boxBorder: null })}
                >
                  Yok
                </button>
                {['#1f2a24', '#25634b', '#e03131', '#1971c2', '#f08c00'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.formatColorSwatch}
                    style={{
                      backgroundColor: c,
                      outline: el.boxBorder === c ? '2px solid #25634b' : 'none',
                      outlineOffset: 1,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ boxBorder: c })}
                    title={`Kenarlık ${c}`}
                    aria-label={`Kenarlık ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Köşe */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Köşe
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { r: 0 as const, label: 'Keskin' },
                  { r: 12 as const, label: 'Yuvarlak' },
                  { r: 999 as const, label: 'Hap' },
                ].map(({ r, label }) => (
                  <button
                    key={r}
                    type="button"
                    className={styles.formatBtn}
                    style={{
                      flex: 1,
                      height: 26,
                      minHeight: 26,
                      padding: '0 4px',
                      fontSize: 11,
                      border: '1px solid #d4d0c5',
                      borderRadius: 4,
                    }}
                    aria-pressed={(el.boxRadius ?? 0) === r}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ boxRadius: r })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aralık (Satır & Harf) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={spacingOpen || Boolean(el.lineHeight && el.lineHeight !== 1.3) || Boolean(el.letterSpacing)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setSpacingOpen((v) => !v);
            setColorOpen(false);
            setHighlightOpen(false);
            setBoxOpen(false);
            setMathOpen(false);
          }}
          title="Satır ve harf aralığı"
          aria-label="Aralık"
          aria-haspopup="true"
          aria-expanded={spacingOpen}
        >
          <span style={{ fontSize: 12, fontWeight: 600 }}>Aralık</span>
        </button>

        {spacingOpen && (
          <div
            className={styles.formatColorPopover}
            style={{
              minWidth: 180,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Satır Aralığı */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Satır Aralığı
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { lh: 1 as const, label: '1' },
                  { lh: 1.3 as const, label: '1.3' },
                  { lh: 1.6 as const, label: '1.6' },
                  { lh: 2 as const, label: '2' },
                ].map(({ lh, label }) => (
                  <button
                    key={lh}
                    type="button"
                    className={styles.formatBtn}
                    style={{
                      flex: 1,
                      height: 26,
                      minHeight: 26,
                      padding: '0 4px',
                      fontSize: 11,
                      border: '1px solid #d4d0c5',
                      borderRadius: 4,
                    }}
                    aria-pressed={(el.lineHeight ?? 1.3) === lh}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ lineHeight: lh })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Harf Aralığı */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Harf Aralığı
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { ls: 0 as const, label: 'Normal' },
                  { ls: 0.05 as const, label: 'Geniş' },
                  { ls: 0.1 as const, label: 'Çok geniş' },
                ].map(({ ls, label }) => (
                  <button
                    key={ls}
                    type="button"
                    className={styles.formatBtn}
                    style={{
                      flex: 1,
                      height: 26,
                      minHeight: 26,
                      padding: '0 4px',
                      fontSize: 10,
                      border: '1px solid #d4d0c5',
                      borderRadius: 4,
                    }}
                    aria-pressed={(el.letterSpacing ?? 0) === ls}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ letterSpacing: ls })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* • Liste */}
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta) {
            toggleListLines(ta, 'bullet', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ text: toggleTextList(el.text || '', 'bullet') });
          }
        }}
        title="Madde işaretli liste"
        aria-label="Madde işaretli liste"
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>• Liste</span>
      </button>

      {/* 1. Liste */}
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta) {
            toggleListLines(ta, 'number', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ text: toggleTextList(el.text || '', 'number') });
          }
        }}
        title="Numaralı liste"
        aria-label="Numaralı liste"
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>1. Liste</span>
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Formül Paleti (∑) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={mathOpen}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMathOpen((v) => !v)}
          title="Formül ekle (∑)"
          aria-label="Formül ekle"
        >
          <span style={{ fontWeight: 700, fontSize: 16 }}>∑</span>
        </button>

        {mathOpen && (
          <MathPalette
            onInsert={(tpl) => {
              if (textareaRef?.current) {
                insertMathTemplate(textareaRef.current, tpl, (nextText) => {
                  onPatch({ text: nextText });
                });
              } else {
                const cur = el.text || '';
                const unescapedDollars = (cur.match(/(?<!\\)\$/g) || []).length;
                const inside = unescapedDollars % 2 === 1;
                const addition = inside ? tpl : `$${tpl}$`;
                const next = cur ? `${cur} ${addition}` : addition;
                onPatch({ text: next });
              }
            }}
            onClose={() => setMathOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function MultiSelectBar({
  elements,
  onDuplicate,
  onOrder,
  onDelete,
  onGroup,
  onUngroup,
  onConfigure,
  onSaveToLibrary,
}: {
  elements: BoardEl[];
  onDuplicate?: () => void;
  onOrder?: (dir: 'front' | 'back') => void;
  onDelete?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onConfigure?: () => void;
  onSaveToLibrary?: () => void;
}) {
  const cb = combinedBbox(elements.map(bbox));
  const topPct = cb.y < 70
    ? ((cb.y + cb.h + 12) / BOARD_H) * 100
    : (cb.y / BOARD_H) * 100;
  const transform = cb.y < 70 ? 'none' : 'translateY(calc(-100% - 12px))';
  const leftPct = Math.max(1, Math.min(65, (cb.x / BOARD_W) * 100));

  const hasGroup = elements.some((el) => !!el.groupId);
  const firstGid = elements[0]?.groupId;
  const allSameGroup = hasGroup && elements.every((el) => el.groupId && el.groupId === firstGid);
  const canGroup = elements.length >= 2 && !allSameGroup;
  const canUngroup = hasGroup;

  const firstLibId = elements[0]?.lib?.id;
  const allSameLib = allSameGroup && !!firstLibId && elements.every((el) => el.lib?.id === firstLibId);
  const libItem = allSameLib ? LIBRARY_ITEMS.find((it) => it.id === firstLibId) : undefined;
  const canConfigure = !!(allSameLib && libItem && libItem.params && libItem.params.length > 0 && onConfigure);

  return (
    <div
      className={styles.formatBar}
      role="toolbar"
      aria-label="Seçim işlemleri"
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        transform,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className={styles.multiSelectBadge}>
        {allSameGroup ? 'Grup' : `${elements.length} öğe`}
      </span>
      {canConfigure && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfigure}
          title="Şekil ayarları"
        >
          Ayarlar
        </button>
      )}
      {canGroup && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onGroup}
          title="Grupla (Ctrl+G)"
        >
          Grupla
        </button>
      )}
      {canUngroup && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onUngroup}
          title="Grubu çöz (Ctrl+Shift+G)"
        >
          Grubu çöz
        </button>
      )}
      <span className={styles.formatDivider} aria-hidden="true" />
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDuplicate}
        title="Çoğalt (Ctrl+D)"
      >
        Çoğalt
      </button>
      {onSaveToLibrary && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSaveToLibrary}
          title="Kütüphaneye kaydet"
        >
          Kaydet
        </button>
      )}
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onOrder?.('front')}
        title="En öne getir"
      >
        Öne
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onOrder?.('back')}
        title="En arkaya gönder"
      >
        Arkaya
      </button>
      <span className={styles.formatDivider} aria-hidden="true" />
      <button
        type="button"
        className={`${styles.formatBtn} ${styles.formatDeleteBtn}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDelete}
        title="Sil (Delete)"
      >
        Sil
      </button>
    </div>
  );
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
    svgRef,
    thumbnail,
    ariaLabel,
  } = props;
  const uid = useId().replace(/:/g, '');
  const patternId = `bg-${uid}`;
  const localSvg = useRef<SVGSVGElement | null>(null);
  const draft = useRef<Draft | null>(null);
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
    } else if (t === 'note') {
      const note: NoteEl = { id: newId(), type: 'note', x: Math.round(Math.min(x, BOARD_W - 420)), y: Math.round(Math.min(y, BOARD_H - 240)), w: 420, h: 240, text: '', color: '#fff3b0', fontSize: 32 };
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
      };
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

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement | SVGRectElement>) => {
    const d = draft.current;
    if (!d) return;
    const { x, y } = toPoint(e.clientX, e.clientY);
    if (d.kind === 'stroke') {
      const p = d.el.points;
      const lx = p[p.length - 2], ly = p[p.length - 1];
      if (Math.hypot(x - lx, y - ly) < 1.5) return;
      d.el = { ...d.el, points: [...p, x, y] };
      setPreview({ el: d.el });
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
      setPreview({ el: d.el });
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

  const finish = () => {
    const d = draft.current;
    draft.current = null;
    const p = preview;
    setPreview(null);
    setIsResizing(false);
    if (!d) return;
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
      onCommit?.([...elements, el]);
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
      const moved = p.el;
      const b0 = bbox(d.orig), b1 = bbox(moved);
      if (b0.x === b1.x && b0.y === b1.y && b0.w === b1.w && b0.h === b1.h) return;
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
        const insideElements = elements.filter((el) => boxContains(mbox, bbox(el)));
        let finalInsideIds: string[];
        if (activeGroupId) {
          finalInsideIds = insideElements.filter((el) => el.groupId === activeGroupId).map((el) => el.id);
        } else {
          const groupIds = new Set(insideElements.map((el) => el.groupId).filter(Boolean));
          finalInsideIds = elements
            .filter((el) => boxContains(mbox, bbox(el)) || (el.groupId && groupIds.has(el.groupId)))
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
  const cursor = !interactive ? 'default' : drawingOnLayer || DRAW_TOOLS.includes(tool) ? 'crosshair' : tool === 'select' ? 'default' : 'crosshair';

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
            width: `${(editingNote.w / BOARD_W) * 100}%`,
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
              const autoH = computeTextHeight(editingNote, val);
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
                const pos = ta.selectionStart;
                const val = ta.value;
                const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
                let lineEnd = val.indexOf('\n', pos);
                if (lineEnd === -1) lineEnd = val.length;
                const line = val.slice(lineStart, lineEnd);

                const bulletMatch = /^\s*•\s*(.*)$/.exec(line);
                if (bulletMatch) {
                  e.preventDefault();
                  const content = bulletMatch[1];
                  if (content.trim() === '') {
                    const next = val.slice(0, lineStart) + val.slice(lineEnd);
                    setEditingTextOverride({ id: editingNote.id, text: next });
                    requestAnimationFrame(() => {
                      ta.value = next;
                      ta.setSelectionRange(lineStart, lineStart);
                    });
                  } else {
                    const insert = '\n• ';
                    const next = val.slice(0, pos) + insert + val.slice(pos);
                    setEditingTextOverride({ id: editingNote.id, text: next });
                    requestAnimationFrame(() => {
                      ta.value = next;
                      ta.setSelectionRange(pos + insert.length, pos + insert.length);
                    });
                  }
                  return;
                }

                const numMatch = /^\s*(\d+)\.\s*(.*)$/.exec(line);
                if (numMatch) {
                  e.preventDefault();
                  const num = parseInt(numMatch[1], 10);
                  const content = numMatch[2];
                  if (content.trim() === '') {
                    const next = val.slice(0, lineStart) + val.slice(lineEnd);
                    setEditingTextOverride({ id: editingNote.id, text: next });
                    requestAnimationFrame(() => {
                      ta.value = next;
                      ta.setSelectionRange(lineStart, lineStart);
                    });
                  } else {
                    const insert = `\n${num + 1}. `;
                    const next = val.slice(0, pos) + insert + val.slice(pos);
                    setEditingTextOverride({ id: editingNote.id, text: next });
                    requestAnimationFrame(() => {
                      ta.value = next;
                      ta.setSelectionRange(pos + insert.length, pos + insert.length);
                    });
                  }
                  return;
                }
              }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
              e.preventDefault();
              const ta = textareaRef.current;
              if (ta && ta.selectionStart < ta.selectionEnd) {
                applyTagToSelection(ta, 'b', (next) => {
                  setEditingTextOverride({ id: editingNote.id, text: next });
                  onNoteText?.(editingNote.id, next);
                });
              } else {
                const newWeight = editingNote.fontWeight === 700 ? 400 : 700;
                if (onPatchElement) onPatchElement(editingNote.id, { fontWeight: newWeight });
              }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
              e.preventDefault();
              const ta = textareaRef.current;
              if (ta && ta.selectionStart < ta.selectionEnd) {
                applyTagToSelection(ta, 'i', (next) => {
                  setEditingTextOverride({ id: editingNote.id, text: next });
                  onNoteText?.(editingNote.id, next);
                });
              } else {
                const newItalic = !editingNote.italic;
                if (onPatchElement) onPatchElement(editingNote.id, { italic: newItalic });
              }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
              e.preventDefault();
              const ta = textareaRef.current;
              if (ta && ta.selectionStart < ta.selectionEnd) {
                applyTagToSelection(ta, 'u', (next) => {
                  setEditingTextOverride({ id: editingNote.id, text: next });
                  onNoteText?.(editingNote.id, next);
                });
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
