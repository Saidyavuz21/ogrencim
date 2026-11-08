'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BoardEl, cloneElements } from '../../lib/boardData';
import { getElementsBbox, LIBRARY_CATEGORY_LABEL, LIBRARY_ITEMS, LibraryCategory } from '../../lib/boardLibrary';
import { LibraryPreview } from './LibraryPreview';
import styles from './Board.module.css';

export interface SaveShapeModalProps {
  elements: BoardEl[];
  onSave: (name: string, category: LibraryCategory, visibility: 'private' | 'school') => Promise<void>;
  onClose: () => void;
  busy?: boolean;
  schoolSharingEnabled?: boolean;
}

export function SaveShapeModal({
  elements,
  onSave,
  onClose,
  busy = false,
  schoolSharingEnabled = false,
}: SaveShapeModalProps) {
  // Varsayılan ad ve kategori belirleme
  const { initialName, initialCategory } = useMemo(() => {
    const firstLibId = elements[0]?.lib?.id;
    const allSameLib = firstLibId && elements.every((el) => el.lib?.id === firstLibId);
    if (allSameLib) {
      const found = LIBRARY_ITEMS.find((it) => it.id === firstLibId);
      if (found) {
        return { initialName: found.name, initialCategory: found.category };
      }
    }
    return { initialName: 'Şeklim', initialCategory: 'genel' as LibraryCategory };
  }, [elements]);

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<LibraryCategory>(initialCategory);
  const [visibility, setVisibility] = useState<'private' | 'school'>('private');
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  // Önizleme için (0,0)'a kaydırılmış öğeler
  const previewElements = useMemo(() => {
    if (!elements.length) return [];
    const b = getElementsBbox(elements);
    return cloneElements(elements, -b.x, -b.y);
  }, [elements]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Lütfen şekil için bir ad yazın.');
      return;
    }
    setError(null);
    try {
      await onSave(trimmed, category, visibility);
    } catch (err) {
      const msg = (err as Error).message || 'Kaydedilirken bir hata oluştu.';
      setError(msg);
      if (msg.includes('Okulunuz tanımlı olmadığı')) {
        setVisibility('private');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'BUTTON') {
        e.preventDefault();
        handleSubmit();
        return;
      }
    }
    if (e.key === 'Tab') {
      if (!modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const categories: LibraryCategory[] = ['matematik', 'fen', 'genel', 'diger'];

  return (
    <div
      className={styles.confirmOverlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        className={styles.confirmBox}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-shape-title"
        style={{ width: 'min(100%, 460px)', gap: '14px' }}
      >
        <h3 id="save-shape-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
          Kütüphaneye kaydet
        </h3>

        {/* Küçük önizleme */}
        <div
          style={{
            width: '100%',
            height: '110px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#faf9f5',
            border: '1px solid #e5e3dc',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          {previewElements.length > 0 && <LibraryPreview elements={previewElements} />}
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fdf2f2',
              border: '1px solid #f8b4b4',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label
              htmlFor="shape-name-input"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
            >
              Ad (en fazla 80 karakter)
            </label>
            <input
              id="shape-name-input"
              ref={nameInputRef}
              type="text"
              value={name}
              maxLength={80}
              required
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              placeholder="Şekil adı…"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #dcd8ce',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Kategori
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="radiogroup" aria-label="Kategori">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={category === cat}
                  className={styles.tool}
                  disabled={busy}
                  style={{
                    minHeight: '32px',
                    fontSize: '13px',
                    background: category === cat ? '#25634b' : '#fff',
                    color: category === cat ? '#fff' : '#1f2a24',
                    borderColor: category === cat ? '#25634b' : '#dcd8ce',
                  }}
                  onClick={() => setCategory(cat)}
                >
                  {LIBRARY_CATEGORY_LABEL[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Görünürlük
            </span>
            <div style={{ display: 'grid', gap: '6px' }} role="radiogroup" aria-label="Görünürlük">
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  disabled={busy}
                  onChange={() => setVisibility('private')}
                />
                <span>Yalnızca ben</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  cursor: !schoolSharingEnabled || busy ? 'not-allowed' : 'pointer',
                  opacity: !schoolSharingEnabled ? 0.55 : 1,
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="school"
                  checked={visibility === 'school'}
                  disabled={!schoolSharingEnabled || busy}
                  onChange={() => setVisibility('school')}
                />
                <span>Okulumla paylaş</span>
              </label>
              {schoolSharingEnabled && (
                <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '24px', lineHeight: 1.35 }}>
                  Okulunuzdaki öğretmenler bu şekli görüp kendi tahtalarına ekleyebilir; değiştiremez.
                </span>
              )}
            </div>
          </div>

          <div className={styles.confirmActions} style={{ marginTop: '4px' }}>
            <button
              type="button"
              className={styles.confirmCancel}
              onClick={onClose}
              disabled={busy}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className={styles.confirmDanger}
              style={{ background: '#25634b', borderColor: '#25634b' }}
              disabled={busy || !name.trim()}
            >
              {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

