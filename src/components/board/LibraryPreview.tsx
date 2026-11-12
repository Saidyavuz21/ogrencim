'use client';

import React, { useMemo } from 'react';
import { BoardEl, imageKey } from '../../lib/boardData';
import { getElementsBbox, LIBRARY_ITEMS } from '../../lib/boardLibrary';
import { ElementView } from './BoardCanvas';

export function LibraryPreview({
  elements,
  className,
  style,
  pad = 16,
}: {
  elements: BoardEl[];
  className?: string;
  style?: React.CSSProperties;
  pad?: number;
}) {
  const b = useMemo(() => getElementsBbox(elements), [elements]);
  const imageUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    for (const el of elements) {
      if (el.type === 'image' && el.bucket === 'builtin-library' && LIBRARY_ITEMS.some((item) => item.imageSource === el.path)) {
        urls[imageKey(el)] = el.path;
      }
    }
    return urls;
  }, [elements]);
  const viewBox = `${b.x - pad} ${b.y - pad} ${Math.max(1, b.w + pad * 2)} ${Math.max(1, b.h + pad * 2)}`;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={{ width: '100%', height: '100%', overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      {elements.map((el) => (
        <ElementView key={el.id} el={el} imageUrls={imageUrls} />
      ))}
    </svg>
  );
}

