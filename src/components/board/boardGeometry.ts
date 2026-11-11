// Tahta geometrisi: sınır kutusu, isabet testi, taşıma ve yazı boyutu seçenekleri.
// (BoardCanvas.tsx'ten ayrıldı; BoardCanvas aynı adlarla yeniden dışa açar.)
import type { BoardEl, ShapeEl } from '../../lib/boardData';
import { computeTextHeight } from './textLayout';

export type Box = { x: number; y: number; w: number; h: number };

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

/** Sürükleyerek çizilen hazır çokgenler; tahtaya 'poly' öğesi olarak kaydedilir */
export type PolyShape = 'triangle' | 'diamond' | 'hexagon' | 'star';
export const POLY_SHAPES: PolyShape[] = ['triangle', 'diamond', 'hexagon', 'star'];
export const isPolyShape = (t: string): t is PolyShape => (POLY_SHAPES as string[]).includes(t);

/** Birim karede (0–1) köşe koordinatları: [x1, y1, x2, y2, …] */
const UNIT_POLY: Record<PolyShape, number[]> = {
  triangle: [0.5, 0, 1, 1, 0, 1],
  diamond: [0.5, 0, 1, 0.5, 0.5, 1, 0, 0.5],
  hexagon: [0.25, 0, 0.75, 0, 1, 0.5, 0.75, 1, 0.25, 1, 0, 0.5],
  star: (() => {
    // Beş köşeli yıldız: dış ve iç köşeler sırayla; kendi sınır kutusuna oturtulur
    const raw: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180;
      const r = i % 2 ? 0.382 : 1;
      raw.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const xs = raw.map((p) => p[0]);
    const ys = raw.map((p) => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
    return raw.flatMap(([x, y]) => [(x - minX) / w, (y - minY) / h]);
  })(),
};

/** Sürüklenen kutuya (iki köşe) oturan çokgenin köşeleri; şekil her zaman dik durur */
export function polyShapePoints(shape: PolyShape, x1: number, y1: number, x2: number, y2: number): number[] {
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  return UNIT_POLY[shape].map((v, i) => Math.round(i % 2 ? y + v * h : x + v * w));
}

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

const boxesOverlap = (a: Box, b: Box) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
const inBox = (m: Box, x: number, y: number) => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h;

/**
 * Sürükleyerek seçim: çerçeve öğeye dokunuyorsa seçilir (tamamen içine alması gerekmez).
 * İçi boş şekillerde çerçeve yalnızca şeklin iç boşluğunda kalıyorsa seçilmez; böylece büyük bir
 * dairenin içindeki yazıları seçerken daire de seçilmez.
 */
export function marqueeHits(m: Box, el: BoardEl): boolean {
  const b = bbox(el);
  if (!boxesOverlap(m, b)) return false;
  if (boxContains(m, b)) return true;
  if (el.type === 'stroke') {
    for (let i = 0; i < el.points.length; i += 2) if (inBox(m, el.points[i], el.points[i + 1])) return true;
    return false;
  }
  if (el.type === 'line' || el.type === 'arrow') {
    // Doğru parçası üzerinde sık aralıklarla nokta denenir
    const steps = Math.max(8, Math.ceil(Math.hypot(el.x2 - el.x1, el.y2 - el.y1) / 12));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (inBox(m, el.x1 + (el.x2 - el.x1) * t, el.y1 + (el.y2 - el.y1) * t)) return true;
    }
    return false;
  }
  const corners: [number, number][] = [[m.x, m.y], [m.x + m.w, m.y], [m.x, m.y + m.h], [m.x + m.w, m.y + m.h]];
  if (el.type === 'ellipse' && !el.fill) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const rx = Math.max(1, b.w / 2 - el.width), ry = Math.max(1, b.h / 2 - el.width);
    // Çerçevenin dört köşesi de elipsin içindeyse çerçeve iç boşlukta kalıyor demektir
    return !corners.every(([x, y]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1);
  }
  if (el.type === 'rect' && !el.fill) {
    const inner: Box = { x: b.x + el.width, y: b.y + el.width, w: b.w - el.width * 2, h: b.h - el.width * 2 };
    return !(inner.w > 0 && inner.h > 0 && boxContains(inner, m));
  }
  return true;
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

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 42, 56, 72, 96];

export function getFontSizeOptions(currentSize?: number): number[] {
  const base = FONT_SIZES;
  if (currentSize && !base.includes(currentSize)) {
    return [...base, currentSize].sort((a, b) => a - b);
  }
  return base;
}
