'use client';

import React, { useId, useRef, useState } from 'react';
import {
  Background, BOARD_H, BOARD_W, BoardEl, BoardPage, imageKey, newId, NoteEl, ShapeEl, simplifyPoints, StrokeEl, WIDGET_LABEL, WidgetEl,
} from '../../lib/boardData';
import styles from './Board.module.css';

export type Tool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'note';
export const DRAW_TOOLS: Tool[] = ['pen', 'highlighter', 'eraser'];

type Box = { x: number; y: number; w: number; h: number };
/** Uygulamanın yazı tipi (tahtadaki notlar ve parça başlıkları) */
const BOARD_FONT = 'var(--font-geist-sans), system-ui, sans-serif';

// --------------------------------------------------------
// Geometri
// --------------------------------------------------------
export const isShape = (el: BoardEl): el is ShapeEl => el.type === 'line' || el.type === 'arrow' || el.type === 'rect' || el.type === 'ellipse';
export function bbox(el: BoardEl): Box {
  if (el.type === 'stroke') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < el.points.length; i += 2) {
      minX = Math.min(minX, el.points[i]); maxX = Math.max(maxX, el.points[i]);
      minY = Math.min(minY, el.points[i + 1]); maxY = Math.max(maxY, el.points[i + 1]);
    }
    const pad = el.width / 2;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (isShape(el)) {
    return { x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2), w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) };
  }
  return { x: el.x, y: el.y, w: el.w, h: el.h };
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
  const b = bbox(el);
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

function translate(el: BoardEl, dx: number, dy: number): BoardEl {
  if (el.type === 'stroke') return { ...el, points: el.points.map((v, i) => Math.round(v + (i % 2 ? dy : dx))) };
  if (isShape(el)) {
    return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
  }
  return { ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) };
}

function resize(el: BoardEl, dx: number, dy: number): BoardEl {
  if (isShape(el)) return { ...el, x2: el.x2 + dx, y2: el.y2 + dy };
  if (el.type === 'image') {
    const w = Math.max(60, el.w + dx);
    return { ...el, w: Math.round(w), h: Math.round((w * el.h) / el.w) };
  }
  if (el.type === 'note' || el.type === 'widget') return { ...el, w: Math.round(Math.max(160, el.w + dx)), h: Math.round(Math.max(100, el.h + dy)) };
  return el;
}

const clampPt = (v: number, max: number) => Math.max(0, Math.min(max, v));

/** Not metnini kutuya sığacak satırlara böler (yaklaşık karakter genişliğiyle) */
export function wrapLines(text: string, width: number, fontSize: number): string[] {
  const perLine = Math.max(4, Math.floor(width / (fontSize * 0.54)));
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if ((line ? `${line} ${word}` : word).length <= perLine) line = line ? `${line} ${word}` : word;
      else {
        if (line) out.push(line);
        let w = word;
        while (w.length > perLine) { out.push(w.slice(0, perLine)); w = w.slice(perLine); }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

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
      return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={el.fill || 'none'} stroke={el.color} strokeWidth={el.width} />;
    }
    case 'ellipse': {
      const b = bbox(el);
      return <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} fill={el.fill || 'none'} stroke={el.color} strokeWidth={el.width} />;
    }
    case 'note': {
      const lines = wrapLines(el.text, el.w - 40, el.fontSize);
      return (
        <g>
          <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={14} fill={el.color} stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
          {!editingNote && (
            <text x={el.x + 20} y={el.y + 20 + el.fontSize} fontSize={el.fontSize} fill="#1f2a24" style={{ fontFamily: BOARD_FONT }}>
              {lines.map((l, i) => <tspan key={i} x={el.x + 20} dy={i ? el.fontSize * 1.3 : 0}>{l || ' '}</tspan>)}
            </text>
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
  | { kind: 'move'; id: string; sx: number; sy: number; orig: BoardEl }
  | { kind: 'resize'; id: string; sx: number; sy: number; orig: BoardEl };

export interface BoardCanvasProps {
  page: BoardPage;
  /** Sayfa öğeleri düzenlenebilir mi (öğretmen) */
  editable?: boolean;
  tool?: Tool;
  color?: string;
  width?: number;
  onCommit?: (elements: BoardEl[]) => void;
  /** Öğrenci katmanı: verilirse kalem/silgi yalnızca bu katmana çizer */
  layer?: StrokeEl[];
  onLayerCommit?: (strokes: StrokeEl[]) => void;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onToolChange?: (tool: Tool) => void;
  editingNoteId?: string | null;
  onEditNote?: (id: string | null) => void;
  onNoteText?: (id: string, text: string) => void;
  imageUrls: Record<string, string>;
  /** Parçaların etkileşimli HTML katmanı (sunum / öğrenci) */
  renderWidget?: (el: WidgetEl) => React.ReactNode;
  /** Parçalar görünür ama tıklanmaz (düzenlerken seçip taşımak için) */
  widgetsPassive?: boolean;
  /** Parçanın yalnızca düğme/alanları tıklanır; geri kalanı seçme ve taşıma için tuvale geçer */
  widgetsControlsOnly?: boolean;
  onDropMedia?: (payload: string, x: number, y: number) => void;
  /** Dışa aktarma için SVG öğesi */
  svgRef?: (node: SVGSVGElement | null) => void;
  /** Etkileşimsiz küçük önizleme */
  thumbnail?: boolean;
  ariaLabel?: string;
}

export function BoardCanvas(props: BoardCanvasProps) {
  const { page, editable, tool = 'select', color = '#1f2a24', width = 6, onCommit, layer, onLayerCommit, selectedId, onSelect, onToolChange, editingNoteId, onEditNote, onNoteText, imageUrls, renderWidget, widgetsPassive, widgetsControlsOnly, onDropMedia, svgRef, thumbnail, ariaLabel } = props;
  const uid = useId().replace(/:/g, '');
  const patternId = `bg-${uid}`;
  const localSvg = useRef<SVGSVGElement | null>(null);
  const draft = useRef<Draft | null>(null);
  const [preview, setPreview] = useState<{ el?: BoardEl; erased?: Set<string> } | null>(null);
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
  const layerStrokes = layer || [];

  const eraseAt = (x: number, y: number, d: Extract<Draft, { kind: 'erase' }>) => {
    const pool: BoardEl[] = drawingOnLayer ? layerStrokes : elements.filter((e) => e.type === 'stroke' || e.type === 'line' || e.type === 'arrow' || e.type === 'rect' || e.type === 'ellipse');
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
    if (editingNoteId) onEditNote?.(null);
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
      const note: NoteEl = { id: newId(), type: 'note', x: Math.round(Math.min(x, BOARD_W - 420)), y: Math.round(Math.min(y, BOARD_H - 240)), w: 420, h: 240, text: '', color: '#fff3b0', fontSize: 34 };
      onCommit?.([...elements, note]);
      onSelect?.(note.id);
      onEditNote?.(note.id);
      onToolChange?.('select');
      return;
    } else {
      // Seçim: önce seçili öğenin boyut tutamağı, sonra en üstteki öğe
      const sel = selectedId ? elements.find((el) => el.id === selectedId) : undefined;
      if (sel && sel.type !== 'stroke') {
        const b = bbox(sel);
        if (Math.hypot(x - (b.x + b.w), y - (b.y + b.h)) < 30) {
          draft.current = { kind: 'resize', id: sel.id, sx: x, sy: y, orig: sel };
          (e.target as Element).setPointerCapture?.(e.pointerId);
          return;
        }
      }
      const hit = [...elements].reverse().find((el) => hitTest(el, x, y));
      onSelect?.(hit ? hit.id : null);
      if (hit) draft.current = { kind: 'move', id: hit.id, sx: x, sy: y, orig: hit };
    }
    localSvg.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
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
      setPreview({ el: translate(d.orig, x - d.sx, y - d.sy) });
    } else if (d.kind === 'resize') {
      setPreview({ el: resize(d.orig, x - d.sx, y - d.sy) });
    }
  };

  const finish = () => {
    const d = draft.current;
    draft.current = null;
    const p = preview;
    setPreview(null);
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
      onSelect?.(el.id);
      onToolChange?.('select');
    } else if ((d.kind === 'move' || d.kind === 'resize') && p?.el) {
      const moved = p.el;
      const b0 = bbox(d.orig), b1 = bbox(moved);
      if (b0.x === b1.x && b0.y === b1.y && b0.w === b1.w && b0.h === b1.h) return;
      onCommit?.(elements.map((el) => (el.id === d.id ? moved : el)));
    }
  };

  const shown = elements.map((el) => (preview?.el && preview.el.id === el.id ? preview.el : el)).filter((el) => !(!drawingOnLayer && preview?.erased?.has(el.id)));
  const draftNew = preview?.el && !elements.some((el) => el.id === preview.el!.id) && !layerStrokes.some((s) => s.id === preview.el!.id) ? preview.el : null;
  const shownLayer = layerStrokes.filter((s) => !(drawingOnLayer && preview?.erased?.has(s.id)));
  const selected = selectedId ? shown.find((el) => el.id === selectedId) : undefined;
  const editingNote = editingNoteId ? (elements.find((el) => el.id === editingNoteId) as NoteEl | undefined) : undefined;
  const widgets = renderWidget ? shown.filter((el): el is WidgetEl => el.type === 'widget') : [];
  const cursor = !interactive ? 'default' : drawingOnLayer || DRAW_TOOLS.includes(tool) ? 'crosshair' : tool === 'select' ? 'default' : 'crosshair';

  return (
    <div
      className={`${styles.canvas} ${thumbnail ? styles.thumb : ''}`}
      onDragOver={(e) => { if (onDropMedia && e.dataTransfer.types.includes('application/x-board-media')) e.preventDefault(); }}
      onDrop={(e) => {
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
          const hit = [...elements].reverse().find((el) => el.type === 'note' && hitTest(el, x, y));
          if (hit) { onSelect?.(hit.id); onEditNote?.(hit.id); }
        }}
      >
        <defs><BackgroundDefs id={patternId} bg={page.background} /></defs>
        <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#ffffff" />
        {page.background !== 'blank' && <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill={`url(#${patternId})`} />}
        {page.background === 'coord' && <CoordAxes />}
        {shown.map((el) => <ElementView key={el.id} el={el} imageUrls={imageUrls} editingNote={el.id === editingNoteId} />)}
        {shownLayer.map((el) => <ElementView key={el.id} el={el} imageUrls={imageUrls} />)}
        {draftNew && <ElementView el={draftNew} imageUrls={imageUrls} />}
        {editable && selected && (() => {
          const b = bbox(selected);
          return (
            <g pointerEvents="none">
              <rect x={b.x - 8} y={b.y - 8} width={b.w + 16} height={b.h + 16} fill="none" stroke="#2a78d6" strokeWidth={3} strokeDasharray="12 8" />
              {selected.type !== 'stroke' && <rect x={b.x + b.w - 14} y={b.y + b.h - 14} width={28} height={28} rx={6} fill="#2a78d6" stroke="#fff" strokeWidth={3} />}
            </g>
          );
        })()}
      </svg>

      {widgets.length > 0 && (
        <div className={styles.overlay}>
          {widgets.map((w) => (
            <div key={w.id} className={`${styles.widgetBox} ${widgetsControlsOnly && !widgetsPassive ? styles.widgetControlsOnly : ''}`} style={{ pointerEvents: widgetsPassive ? 'none' : undefined, left: `${(w.x / BOARD_W) * 100}%`, top: `${(w.y / BOARD_H) * 100}%`, width: `${(w.w / BOARD_W) * 100}%`, height: `${(w.h / BOARD_H) * 100}%` }}>
              {renderWidget!(w)}
            </div>
          ))}
        </div>
      )}

      {editingNote && (
        <textarea
          className={styles.noteEditor}
          autoFocus
          aria-label="Not metni"
          defaultValue={editingNote.text}
          maxLength={2000}
          style={{
            left: `${(editingNote.x / BOARD_W) * 100}%`, top: `${(editingNote.y / BOARD_H) * 100}%`,
            width: `${(editingNote.w / BOARD_W) * 100}%`, height: `${(editingNote.h / BOARD_H) * 100}%`,
            background: editingNote.color, fontSize: `${(editingNote.fontSize / BOARD_W) * 100}cqw`,
          }}
          onBlur={(e) => { onNoteText?.(editingNote.id, e.target.value); onEditNote?.(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); }}
        />
      )}
    </div>
  );
}
