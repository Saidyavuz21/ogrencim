'use client';

import React, { useMemo } from 'react';
import { BoardEl } from '../../lib/boardData';
import { getElementsBbox } from '../../lib/boardLibrary';
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
  const viewBox = `${b.x - pad} ${b.y - pad} ${Math.max(1, b.w + pad * 2)} ${Math.max(1, b.h + pad * 2)}`;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={{ width: '100%', height: '100%', overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      {elements.map((el) => (
        <ElementView key={el.id} el={el} imageUrls={{}} />
      ))}
    </svg>
  );
}

