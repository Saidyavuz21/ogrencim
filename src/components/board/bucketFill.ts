// Boya kovası: tıklanan noktayı çevreleyen kapalı alanı bulur ve dolgulu, kenarsız bir çokgen
// ('poly', width 0) olarak döndürür. Çizgi, şekil kenarı ve dolgulu şekil sınırları duvar sayılır;
// not, görsel ve parçalar sayılmaz. Delikler (alanın içindeki ada) şimdilik ayrıca açılmaz.

import { BOARD_H, BOARD_W, type BoardEl, newId, type PolyEl } from '../../lib/boardData';

/** Elle çizimdeki küçük boşlukları kapatmak için duvarlar her yandan bu kadar kalınlaştırılır (px) */
const GAP = 2;
/** Çokgen sadeleştirme toleransı (px) */
const SIMPLIFY = 0.9;

/** Kova ile oluşturulmuş dolgu mu (kenarsız, dolgulu çokgen) */
export const isBucketFill = (el: BoardEl): boolean => el.type === 'poly' && el.width === 0 && !!el.fill;

export type BucketResult =
  | { ok: true; elements: BoardEl[] }
  | { ok: false; reason: 'open' | 'onLine' | 'tooSmall' };

function pointInPoly(p: number[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Öğenin dolgusu (ya da görseli) noktayı örtüyor mu */
function covers(el: BoardEl, x: number, y: number): boolean {
  if (el.type === 'rect' && el.fill) {
    return x >= Math.min(el.x1, el.x2) && x <= Math.max(el.x1, el.x2) && y >= Math.min(el.y1, el.y2) && y <= Math.max(el.y1, el.y2);
  }
  if (el.type === 'ellipse' && el.fill) {
    const rx = Math.abs(el.x2 - el.x1) / 2 || 1, ry = Math.abs(el.y2 - el.y1) / 2 || 1;
    const cx = Math.min(el.x1, el.x2) + rx, cy = Math.min(el.y1, el.y2) + ry;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  }
  if (el.type === 'poly' && el.fill) return pointInPoly(el.points, x, y);
  if (el.type === 'image') return x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h;
  return false;
}

/** Duvarları (çizgi ve şekil kenarları) tuvale çizer */
function drawWalls(ctx: CanvasRenderingContext2D, elements: BoardEl[]) {
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const el of elements) {
    if (isBucketFill(el)) continue;
    const hasFill = 'fill' in el && !!el.fill;
    const w = 'width' in el && typeof el.width === 'number' ? el.width : 0;
    if (w <= 0 && !hasFill) continue;
    ctx.lineWidth = Math.max(w, 1) + GAP * 2;
    ctx.beginPath();
    if (el.type === 'stroke') {
      const p = el.points;
      if (p.length < 2) continue;
      ctx.moveTo(p[0], p[1]);
      if (p.length === 2) ctx.lineTo(p[0] + 0.01, p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    } else if (el.type === 'line' || el.type === 'arrow') {
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
    } else if (el.type === 'rect') {
      const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2);
      const bw = Math.abs(el.x2 - el.x1), bh = Math.abs(el.y2 - el.y1);
      ctx.roundRect(x, y, bw, bh, Math.min(el.rx ?? 6, bw / 2, bh / 2));
    } else if (el.type === 'ellipse') {
      const rx = Math.abs(el.x2 - el.x1) / 2, ry = Math.abs(el.y2 - el.y1) / 2;
      ctx.ellipse(Math.min(el.x1, el.x2) + rx, Math.min(el.y1, el.y2) + ry, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    } else if (el.type === 'poly') {
      const p = el.points;
      if (p.length < 6) continue;
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.closePath();
    } else {
      continue;
    }
    ctx.stroke();
    if (el.type === 'arrow') {
      const ang = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const head = Math.max(18, el.width * 3.2);
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(el.x2 - head * Math.cos(ang - 0.42), el.y2 - head * Math.sin(ang - 0.42));
      ctx.lineTo(el.x2 - head * Math.cos(ang + 0.42), el.y2 - head * Math.sin(ang + 0.42));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** Ramer–Douglas–Peucker (kapalı çokgen için uçlar sabit) */
function simplify(pts: number[][], eps: number): number[][] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx > 0 && maxD > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function bucketFill(elements: BoardEl[], px: number, py: number, color: string): BucketResult {
  // 1) Daha önce kovayla doldurulmuş alana tıklandıysa yalnızca rengi değişir
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'poly' && isBucketFill(el) && pointInPoly((el as PolyEl).points, px, py)) {
      return { ok: true, elements: elements.map((e) => (e.id === el.id ? { ...el, fill: color } : e)) };
    }
    if (covers(el, px, py)) break;
  }

  const W = BOARD_W, H = BOARD_H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { ok: false, reason: 'open' };
  drawWalls(ctx, elements);
  const data = ctx.getImageData(0, 0, W, H).data;

  const sx = Math.min(W - 1, Math.max(0, Math.round(px)));
  const sy = Math.min(H - 1, Math.max(0, Math.round(py)));
  const wall = (i: number) => data[i * 4 + 3] > 0;
  if (wall(sy * W + sx)) return { ok: false, reason: 'onLine' };

  // 2) Taşma dolgusu (4 komşulu); sayfa kenarına ulaşırsa alan kapalı değildir
  const region = new Uint8Array(W * H);
  const stack = [sy * W + sx];
  region[sy * W + sx] = 1;
  let minX = sx, maxX = sx, minY = sy, maxY = sy, count = 0;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W, y = (i - x) / W;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return { ok: false, reason: 'open' };
    count++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    for (const n of [i - 1, i + 1, i - W, i + W]) {
      if (!region[n] && !wall(n)) { region[n] = 1; stack.push(n); }
    }
  }
  if (count < 30) return { ok: false, reason: 'tooSmall' };

  // 3) Kalınlaştırılmış duvar payı kadar genişlet: dolgu çizginin altına girer, arada beyaz şerit kalmaz
  const grow = GAP + 1;
  minX = Math.max(1, minX - grow); maxX = Math.min(W - 2, maxX + grow);
  minY = Math.max(1, minY - grow); maxY = Math.min(H - 2, maxY + grow);
  let cur = region;
  for (let k = 0; k < grow; k++) {
    const next = cur.slice();
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const i = y * W + x;
        if (!cur[i] && (cur[i - 1] || cur[i + 1] || cur[i - W] || cur[i + W])) next[i] = 1;
      }
    }
    cur = next;
  }
  const inR = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && cur[y * W + x] === 1;

  // 4) Dış sınırı piksel kenarları boyunca izle (alan sağda kalacak şekilde, saat yönünde)
  let startX = -1, startY = -1;
  outer: for (let y = minY - 1; y <= maxY + 1; y++) {
    for (let x = minX - 1; x <= maxX + 1; x++) {
      if (inR(x, y)) { startX = x; startY = y; break outer; }
    }
  }
  if (startX < 0) return { ok: false, reason: 'tooSmall' };
  const pts: number[][] = [];
  let vx = startX, vy = startY, dx = 1, dy = 0;
  const limit = (maxX - minX + 4) * (maxY - minY + 4) * 4;
  for (let steps = 0; steps < limit; steps++) {
    // Gidiş yönünün önündeki iki piksel: sol-ön ve sağ-ön
    const rx = -dy, ry = dx; // sağ normal (y aşağı)
    const lx = dy, ly = -dx; // sol normal
    const ar = inR(vx + Math.min(0, dx) + Math.min(0, rx), vy + Math.min(0, dy) + Math.min(0, ry));
    const al = inR(vx + Math.min(0, dx) + Math.min(0, lx), vy + Math.min(0, dy) + Math.min(0, ly));
    let ndx = dx, ndy = dy;
    if (!ar) { ndx = rx; ndy = ry; } // sağa dön
    else if (al) { ndx = lx; ndy = ly; } // sola dön
    if (ndx !== dx || ndy !== dy || steps === 0) pts.push([vx, vy]);
    dx = ndx; dy = ndy;
    vx += dx; vy += dy;
    // Başlangıç köşesinin yalnızca sağ-alt pikseli alandadır; sınır o köşeden bir kez geçer
    if (vx === startX && vy === startY) break;
  }
  if (pts.length < 3) return { ok: false, reason: 'tooSmall' };

  pts.push([pts[0][0], pts[0][1]]);
  // Kapalı halkada uçlar aynı nokta olduğundan halka, başlangıca en uzak noktadan ikiye bölünüp sadeleştirilir
  let far = 0, farD = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > farD) { farD = d; far = i; }
  }
  const simple = [...simplify(pts.slice(0, far + 1), SIMPLIFY), ...simplify(pts.slice(far), SIMPLIFY).slice(1)];
  simple.pop();
  if (simple.length < 3) return { ok: false, reason: 'tooSmall' };

  const fillEl: PolyEl = { id: newId(), type: 'poly', points: simple.flat(), color, width: 0, fill: color };

  // 5) Sıra: noktayı örten en üstteki dolgulu şeklin/görselin hemen üstüne; yoksa en alta.
  // Böylece alanı çizen çizgiler dolgunun üstünde kalır.
  let insertAt = 0;
  for (let i = elements.length - 1; i >= 0; i--) {
    if (covers(elements[i], px, py)) { insertAt = i + 1; break; }
  }
  const next = [...elements];
  next.splice(insertAt, 0, fillEl);
  return { ok: true, elements: next };
}
