// Tahta hizalama kılavuzları, yapışma hesabı ve çoklu seçim hizalama/dağıtma yardımcıları.
import { BOARD_H, BOARD_W, type BoardEl } from '../../lib/boardData';
import { bbox, type Box, combinedBbox, translate } from './boardGeometry';

export const SNAP_THRESHOLD = 6;

export interface GuideLine {
  axis: 'x' | 'y';
  pos: number;
  from: number;
  to: number;
}

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

/**
 * Sürüklenen öğelerin sınır kutusunu diğer öğelerin kenar/merkezlerine ve sayfa merkezine
 * 6 px içinde yaklaşınca yapıştırır; çizilecek kılavuz çizgilerini döndürür.
 */
export function computeSnap(
  movingBox: Box,
  otherBoxes: Box[],
  threshold = SNAP_THRESHOLD,
): { dx: number; dy: number; guides: GuideLine[] } {
  const mXs = [movingBox.x, movingBox.x + movingBox.w / 2, movingBox.x + movingBox.w];
  const mYs = [movingBox.y, movingBox.y + movingBox.h / 2, movingBox.y + movingBox.h];

  type Target = { pos: number; from: number; to: number };
  const xTargets: Target[] = [{ pos: BOARD_W / 2, from: 0, to: BOARD_H }];
  const yTargets: Target[] = [{ pos: BOARD_H / 2, from: 0, to: BOARD_W }];

  for (const b of otherBoxes) {
    xTargets.push(
      { pos: b.x, from: b.y, to: b.y + b.h },
      { pos: b.x + b.w / 2, from: b.y, to: b.y + b.h },
      { pos: b.x + b.w, from: b.y, to: b.y + b.h },
    );
    yTargets.push(
      { pos: b.y, from: b.x, to: b.x + b.w },
      { pos: b.y + b.h / 2, from: b.x, to: b.x + b.w },
      { pos: b.y + b.h, from: b.x, to: b.x + b.w },
    );
  }

  let bestDx = 0;
  let bestDistX = threshold + 0.001;
  let snapXPos: number | null = null;

  for (const mx of mXs) {
    for (const t of xTargets) {
      const dist = Math.abs(t.pos - mx);
      if (dist < bestDistX) {
        bestDistX = dist;
        bestDx = t.pos - mx;
        snapXPos = t.pos;
      }
    }
  }

  let bestDy = 0;
  let bestDistY = threshold + 0.001;
  let snapYPos: number | null = null;

  for (const my of mYs) {
    for (const t of yTargets) {
      const dist = Math.abs(t.pos - my);
      if (dist < bestDistY) {
        bestDistY = dist;
        bestDy = t.pos - my;
        snapYPos = t.pos;
      }
    }
  }

  const guides: GuideLine[] = [];
  const snappedBox: Box = {
    x: movingBox.x + bestDx,
    y: movingBox.y + bestDy,
    w: movingBox.w,
    h: movingBox.h,
  };

  if (snapXPos != null) {
    const matching = xTargets.filter((t) => Math.abs(t.pos - snapXPos!) < 0.5);
    const from = Math.min(snappedBox.y, ...matching.map((t) => t.from));
    const to = Math.max(snappedBox.y + snappedBox.h, ...matching.map((t) => t.to));
    guides.push({ axis: 'x', pos: Math.round(snapXPos), from: Math.round(from), to: Math.round(to) });
  }

  if (snapYPos != null) {
    const matching = yTargets.filter((t) => Math.abs(t.pos - snapYPos!) < 0.5);
    const from = Math.min(snappedBox.x, ...matching.map((t) => t.from));
    const to = Math.max(snappedBox.x + snappedBox.w, ...matching.map((t) => t.to));
    guides.push({ axis: 'y', pos: Math.round(snapYPos), from: Math.round(from), to: Math.round(to) });
  }

  return { dx: bestDx, dy: bestDy, guides };
}

/** Seçili öğeleri (aynı groupId'li olanları tek birim sayarak) gruplar */
function selectionUnits(elements: BoardEl[], selectedIds: string[]): { ids: string[]; box: Box }[] {
  const idSet = new Set(selectedIds);
  const selected = elements.filter((el) => idSet.has(el.id) && !el.locked);
  const units = new Map<string, BoardEl[]>();
  for (const el of selected) {
    const key = el.groupId ? `g:${el.groupId}` : `e:${el.id}`;
    const list = units.get(key) || [];
    list.push(el);
    units.set(key, list);
  }
  return Array.from(units.values()).map((els) => ({
    ids: els.map((e) => e.id),
    box: combinedBbox(els.map(bbox)),
  }));
}

export function alignElements(elements: BoardEl[], selectedIds: string[], mode: AlignMode): BoardEl[] {
  const units = selectionUnits(elements, selectedIds);
  if (units.length < 2) return elements;
  const total = combinedBbox(units.map((u) => u.box));
  const deltaById = new Map<string, { dx: number; dy: number }>();

  for (const u of units) {
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = total.x - u.box.x;
    else if (mode === 'center') dx = (total.x + total.w / 2) - (u.box.x + u.box.w / 2);
    else if (mode === 'right') dx = (total.x + total.w) - (u.box.x + u.box.w);
    else if (mode === 'top') dy = total.y - u.box.y;
    else if (mode === 'middle') dy = (total.y + total.h / 2) - (u.box.y + u.box.h / 2);
    else if (mode === 'bottom') dy = (total.y + total.h) - (u.box.y + u.box.h);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    for (const id of u.ids) deltaById.set(id, { dx, dy });
  }

  if (!deltaById.size) return elements;
  return elements.map((el) => {
    const d = deltaById.get(el.id);
    return d ? translate(el, d.dx, d.dy) : el;
  });
}

export function distributeElements(elements: BoardEl[], selectedIds: string[], axis: DistributeAxis): BoardEl[] {
  const units = selectionUnits(elements, selectedIds);
  if (units.length < 3) return elements;

  const sorted = [...units].sort((a, b) =>
    axis === 'horizontal'
      ? (a.box.x + a.box.w / 2) - (b.box.x + b.box.w / 2)
      : (a.box.y + a.box.h / 2) - (b.box.y + b.box.h / 2),
  );

  const deltaById = new Map<string, { dx: number; dy: number }>();
  if (axis === 'horizontal') {
    const first = sorted[0].box;
    const last = sorted[sorted.length - 1].box;
    const totalW = sorted.reduce((sum, u) => sum + u.box.w, 0);
    const span = (last.x + last.w) - first.x;
    const gap = (span - totalW) / (sorted.length - 1);
    let cursor = first.x + first.w + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      const u = sorted[i];
      const dx = cursor - u.box.x;
      if (Math.abs(dx) >= 0.5) {
        for (const id of u.ids) deltaById.set(id, { dx, dy: 0 });
      }
      cursor += u.box.w + gap;
    }
  } else {
    const first = sorted[0].box;
    const last = sorted[sorted.length - 1].box;
    const totalH = sorted.reduce((sum, u) => sum + u.box.h, 0);
    const span = (last.y + last.h) - first.y;
    const gap = (span - totalH) / (sorted.length - 1);
    let cursor = first.y + first.h + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      const u = sorted[i];
      const dy = cursor - u.box.y;
      if (Math.abs(dy) >= 0.5) {
        for (const id of u.ids) deltaById.set(id, { dx: 0, dy });
      }
      cursor += u.box.h + gap;
    }
  }

  if (!deltaById.size) return elements;
  return elements.map((el) => {
    const d = deltaById.get(el.id);
    return d ? translate(el, d.dx, d.dy) : el;
  });
}

