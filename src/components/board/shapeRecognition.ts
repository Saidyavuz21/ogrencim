import type { PolyEl, ShapeEl } from '../../lib/boardData';

interface Pt {
  x: number;
  y: number;
}

function toPoints(flat: number[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    out.push({ x: flat[i], y: flat[i + 1] });
  }
  return out;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pathLen(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += dist(pts[i - 1], pts[i]);
  }
  return len;
}

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-6) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length <= 2) return pts;
  let maxD = 0;
  let idx = 0;
  const a = pts[0];
  const b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [a, b];
  const left = rdp(pts.slice(0, idx + 1), eps);
  const right = rdp(pts.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}

function angleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-4 || m2 < 1e-4) return 180;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function isLine(pts: Pt[], len: number): ShapeEl | null {
  const a = pts[0];
  const b = pts[pts.length - 1];
  const d = dist(a, b);
  if (d < 40 || d / len < 0.9) return null;
  const maxAllowed = Math.max(14, d * 0.08);
  for (let i = 1; i < pts.length - 1; i += 1) {
    if (perpDist(pts[i], a, b) > maxAllowed) return null;
  }
  return {
    id: '',
    type: 'line',
    x1: Math.round(a.x),
    y1: Math.round(a.y),
    x2: Math.round(b.x),
    y2: Math.round(b.y),
    color: '',
    width: 6,
  };
}

function isArrow(pts: Pt[], len: number): ShapeEl | null {
  if (pts.length < 6 || len < 60) return null;
  const start = pts[0];
  // Gövde ucunu bul: başlangıca en uzak nokta okun ucu olabilir
  let tipIdx = 0;
  let maxD = 0;
  for (let i = 2; i < pts.length; i += 1) {
    const d = dist(start, pts[i]);
    if (d > maxD) {
      maxD = d;
      tipIdx = i;
    }
  }
  if (maxD < 48 || tipIdx < 2 || tipIdx >= pts.length - 2) return null;
  const shaft = pts.slice(0, tipIdx + 1);
  const shaftLen = pathLen(shaft);
  if (maxD / shaftLen < 0.9) return null;
  const tip = pts[tipIdx];
  const maxShaftErr = Math.max(14, maxD * 0.08);
  for (let i = 1; i < shaft.length - 1; i += 1) {
    if (perpDist(shaft[i], start, tip) > maxShaftErr) return null;
  }
  // Uçtan sonraki kuyruk: ok başı (kısa ve geriye doğru açılı)
  const head = pts.slice(tipIdx);
  const headLen = pathLen(head);
  if (headLen < 14 || headLen > maxD * 0.85) return null;
  const end = pts[pts.length - 1];
  if (dist(tip, end) < 10) return null;
  const tipAngle = angleDeg(start, tip, end);
  if (tipAngle < 12 || tipAngle > 80) return null;
  return {
    id: '',
    type: 'arrow',
    x1: Math.round(start.x),
    y1: Math.round(start.y),
    x2: Math.round(tip.x),
    y2: Math.round(tip.y),
    color: '',
    width: 6,
  };
}

/**
 * Serbest el çizimini düz çizgi, ok, üçgen, dikdörtgen/kare veya daire/elipse dönüştürür.
 * Kısa karalamalar veya belirsiz şekiller için null döner (çizgi olduğu gibi kalır).
 */
export function recognizeShape(
  flatPoints: number[],
  color: string,
  width: number,
  newId: () => string
): ShapeEl | PolyEl | null {
  const pts = toPoints(flatPoints);
  if (pts.length < 4) return null;
  const len = pathLen(pts);
  if (len < 40) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const diag = Math.hypot(w, h);
  if (diag < 36) return null;

  const line = isLine(pts, len);
  if (line) return { ...line, id: newId(), color, width };

  const arrow = isArrow(pts, len);
  if (arrow) return { ...arrow, id: newId(), color, width };

  // Kapalı şekil kontrolü
  const gap = dist(pts[0], pts[pts.length - 1]);
  if (gap > Math.max(42, diag * 0.28) || w < 32 || h < 32) return null;

  // Daire / elips kontrolü
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = w / 2;
  const ry = h / 2;
  const aspect = Math.min(w, h) / Math.max(w, h);
  if (aspect >= 0.35) {
    let sumSq = 0;
    for (const p of pts) {
      const nx = (p.x - cx) / rx;
      const ny = (p.y - cy) / ry;
      const r = Math.hypot(nx, ny);
      sumSq += (r - 1) * (r - 1);
    }
    const rms = Math.sqrt(sumSq / pts.length);
    if (rms <= 0.16) {
      return {
        id: newId(),
        type: 'ellipse',
        x1: Math.round(minX),
        y1: Math.round(minY),
        x2: Math.round(maxX),
        y2: Math.round(maxY),
        color,
        width,
      };
    }
  }

  // Çokgen köşe sadeleştirme
  const closed = [...pts, pts[0]];
  let corners = rdp(closed, Math.max(10, diag * 0.08));
  if (corners.length > 1 && dist(corners[0], corners[corners.length - 1]) < Math.max(18, diag * 0.12)) {
    corners = corners.slice(0, -1);
  }
  const perim = corners.reduce((acc, p, i) => acc + dist(p, corners[(i + 1) % corners.length]), 0);
  if (perim < 60 || len / perim > 1.25) return null;

  // Üçgen
  if (corners.length === 3) {
    const [a, b, c] = corners;
    const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
    if (area >= 400) {
      return {
        id: newId(),
        type: 'poly',
        points: [
          Math.round(a.x), Math.round(a.y),
          Math.round(b.x), Math.round(b.y),
          Math.round(c.x), Math.round(c.y),
        ],
        color,
        width,
      };
    }
  }

  // Dikdörtgen / kare
  if (corners.length === 4) {
    let okAngles = true;
    for (let i = 0; i < 4; i += 1) {
      const deg = angleDeg(corners[(i + 3) % 4], corners[i], corners[(i + 1) % 4]);
      if (Math.abs(deg - 90) > 25) {
        okAngles = false;
        break;
      }
    }
    if (okAngles) {
      return {
        id: newId(),
        type: 'rect',
        x1: Math.round(minX),
        y1: Math.round(minY),
        x2: Math.round(maxX),
        y2: Math.round(maxY),
        color,
        width,
      };
    }
  }

  return null;
}

