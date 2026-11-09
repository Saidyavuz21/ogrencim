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

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 42, 56, 72, 96];

export function getFontSizeOptions(currentSize?: number): number[] {
  const base = FONT_SIZES;
  if (currentSize && !base.includes(currentSize)) {
    return [...base, currentSize].sort((a, b) => a - b);
  }
  return base;
}
