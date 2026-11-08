'use client';

import React, { useMemo, useState } from 'react';
import { Sliders } from '../icons';
import { LibraryPreview } from './LibraryPreview';
import {
  getElementsBbox,
  LIBRARY_CATEGORY_LABEL,
  LIBRARY_ITEMS,
  LibraryCategory,
  LibraryItem,
} from '../../lib/boardLibrary';
import styles from './Board.module.css';

function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function ShapeLibraryPanel({
  onInsert,
}: {
  onInsert: (shapeId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | LibraryCategory>('all');

  // Her parçanın önizleme öğeleri ve kutusu bir kez hesaplansın
  const itemPreviews = useMemo(() => {
    const map = new Map<string, { elements: ReturnType<LibraryItem['build']>; bbox: ReturnType<typeof getElementsBbox> }>();
    for (const item of LIBRARY_ITEMS) {
      const elements = item.build();
      const b = getElementsBbox(elements);
      map.set(item.id, { elements, bbox: b });
    }
    return map;
  }, []);

  const categories: LibraryCategory[] = ['matematik', 'fen', 'genel'];

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return LIBRARY_ITEMS.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!query) return true;

      const normName = normalizeSearch(item.name);
      if (normName.includes(query)) return true;

      if (item.keywords) {
        return item.keywords.some((kw) => normalizeSearch(kw).includes(query));
      }
      return false;
    });
  }, [search, category]);

  return (
    <div className={styles.shapeLibraryPanel}>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="search"
          placeholder="Şekil ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #dcd8ce',
            boxSizing: 'border-box',
          }}
          aria-label="Şekillerde ara"
        />
      </div>

      <div
        className={styles.pageTools}
        style={{ flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}
        role="group"
        aria-label="Kategori filtresi"
      >
        <button
          type="button"
          className={styles.tool}
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
          style={{ minHeight: '32px', fontSize: '13px' }}
        >
          Tümü
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={styles.tool}
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
            style={{ minHeight: '32px', fontSize: '13px' }}
          >
            {LIBRARY_CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p style={{ margin: '20px 0', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
          Aramanıza uygun şekil yok.
        </p>
      ) : (
        <div className={styles.mediaGrid}>
          {filteredItems.map((item) => {
            const preview = itemPreviews.get(item.id);
            const isConfigurable = Boolean(item.params && item.params.length > 0);

            return (
              <button
                key={item.id}
                type="button"
                className={styles.mediaItem}
                style={{
                  position: 'relative',
                  minHeight: '96px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  background: '#ffffff',
                  border: '1px solid #e5e3dc',
                  borderRadius: '10px',
                  cursor: 'grab',
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-board-shape', JSON.stringify({ id: item.id }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onInsert(item.id)}
                aria-label={`${item.name} şeklini ekle${isConfigurable ? ', ayarlanabilir' : ''}`}
                title={`${item.name} · Tıkla veya sürükleyerek ekle${isConfigurable ? ' (ayarlanabilir)' : ''}`}
              >
                {isConfigurable && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-hidden="true"
                    title="Ayarlanabilir"
                  >
                    <Sliders size={13} />
                  </span>
                )}
                <div style={{ width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {preview?.elements && <LibraryPreview elements={preview.elements} />}
                </div>
                <span
                  className={styles.mediaName}
                  style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: '1.2',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

