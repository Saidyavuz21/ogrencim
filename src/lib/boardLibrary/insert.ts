import { BoardEl, BOARD_H, BOARD_W, cloneElements, isShape, newId } from '../boardData';
import { LibraryItem } from './types';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getElementsBbox(elements: BoardEl[]): Box {
  if (!elements.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.type === 'stroke') {
      const p = el.points;
      for (let i = 0; i < p.length; i += 2) {
        minX = Math.min(minX, p[i]);
        maxX = Math.max(maxX, p[i]);
        minY = Math.min(minY, p[i + 1]);
        maxY = Math.max(maxY, p[i + 1]);
      }
    } else if (isShape(el)) {
      minX = Math.min(minX, el.x1, el.x2);
      maxX = Math.max(maxX, el.x1, el.x2);
      minY = Math.min(minY, el.y1, el.y2);
      maxY = Math.max(maxY, el.y1, el.y2);
    } else {
      minX = Math.min(minX, el.x);
      maxX = Math.max(maxX, el.x + el.w);
      minY = Math.min(minY, el.y);
      maxY = Math.max(maxY, el.y + el.h);
    }
  }

  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export function instantiateItem(
  item: LibraryItem,
  at: { x: number; y: number },
  params?: Record<string, number>
): BoardEl[] {
  const raw = item.build(params);
  if (!raw.length) return [];

  const b = getElementsBbox(raw);
  const targetCenterX = at.x;
  const targetCenterY = at.y;

  let destX = targetCenterX - b.w / 2;
  let destY = targetCenterY - b.h / 2;

  // Tahta sınırlarına sığması için kaydırma kırpılır (0..BOARD_W, 0..BOARD_H).
  // Parça tahtadan büyükse sol üste yaslanır.
  if (b.w >= BOARD_W) {
    destX = 0;
  } else {
    destX = Math.max(0, Math.min(BOARD_W - b.w, destX));
  }

  if (b.h >= BOARD_H) {
    destY = 0;
  } else {
    destY = Math.max(0, Math.min(BOARD_H - b.h, destY));
  }

  const dx = Math.round(destX - b.x);
  const dy = Math.round(destY - b.y);

  const cloned = cloneElements(raw, dx, dy);
  if (cloned.length >= 2) {
    const gid = newId();
    for (const el of cloned) {
      el.groupId = gid;
    }
  }
  return cloned;
}

