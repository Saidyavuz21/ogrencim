'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LIBRARY_CATEGORY_LABEL, LibraryCategory, LibraryItem } from '../../lib/boardLibrary';
import styles from './Board.module.css';

export interface EditShapeModalProps {
  item: LibraryItem;
  initialField?: 'name' | 'category';
  schoolSharingEnabled?: boolean;
  onSave: (id: string, patch: { name: string; category: LibraryCategory; visibility?: 'private' | 'school' }) => Promise<void>;
  onClose: () => void;
  busy?: boolean;
}

export function EditShapeModal({
  item,
  initialField = 'name',
  schoolSharingEnabled = false,
  onSave,
  onClose,
  busy = false,
}: EditShapeModalProps) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<LibraryCategory>(item.category);
  const [visibility, setVisibility] = useState<'private' | 'school'>(item.visibility || 'private');
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialField === 'name') {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [initialField]);

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
      const rowId = item.rowId || item.id.replace(/^user:/, '');
      await onSave(rowId, { name: trimmed, category, visibility });
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
        aria-labelledby="edit-shape-title"
        style={{ width: 'min(100%, 460px)', gap: '14px' }}
      >
        <h3 id="edit-shape-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
          Şekli düzenle
        </h3>

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
              htmlFor="edit-shape-name-input"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
            >
              Ad (en fazla 80 karakter)
            </label>
            <input
              id="edit-shape-name-input"
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
                  name="edit-visibility"
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
                  name="edit-visibility"
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

