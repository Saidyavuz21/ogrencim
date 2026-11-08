'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, X } from '../icons';
import { LibraryItem, resolveParams } from '../../lib/boardLibrary';
import { LibraryPreview } from './LibraryPreview';
import styles from './Board.module.css';

export interface ShapeConfigModalProps {
  mode: 'insert' | 'edit';
  item: LibraryItem;
  initialParams?: Record<string, number>;
  onConfirm: (params: Record<string, number>) => void;
  onClose: () => void;
}

export function ShapeConfigModal({
  mode,
  item,
  initialParams,
  onConfirm,
  onClose,
}: ShapeConfigModalProps) {
  const [params, setParams] = useState<Record<string, number>>(() =>
    resolveParams(item, initialParams)
  );

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Açılınca ilk sayı kutusuna odaklan
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const previewElements = useMemo(() => item.build(params), [item, params]);

  const updateParam = (key: string, nextVal: number) => {
    setParams((prev) => resolveParams(item, { ...prev, [key]: nextVal }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      // Düğmeler üzerinde basılmışsa düğmenin kendi onClick'i çalışsın
      const target = e.target as HTMLElement;
      if (target.tagName !== 'BUTTON') {
        e.preventDefault();
        onConfirm(params);
        return;
      }
    }
    if (e.key === 'Tab') {
      if (!modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])'
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

  return (
    <div
      className={styles.confirmOverlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        className={styles.confirmBox}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shape-config-title"
        style={{
          width: 'min(100%, 460px)',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 id="shape-config-title" style={{ margin: 0, fontSize: '18px' }}>
            {item.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
            className={styles.tool}
            style={{ minHeight: '36px', minWidth: '36px', padding: 0 }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Canlı SVG Önizlemesi */}
        <div
          style={{
            width: '100%',
            height: '170px',
            background: '#faf8f4',
            border: '1px solid #e5e3dc',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            boxSizing: 'border-box',
          }}
        >
          <LibraryPreview elements={previewElements} />
        </div>

        {/* Parametre denetimleri */}
        <div style={{ display: 'grid', gap: '12px', margin: '8px 0' }}>
          {(item.params || []).map((p, idx) => {
            const val = params[p.key] ?? p.default;
            const min = p.minFrom && p.minFrom in params ? Math.max(p.min, params[p.minFrom]) : p.min;
            const max = p.maxFrom && p.maxFrom in params ? Math.min(p.max, params[p.maxFrom]) : p.max;
            const step = p.step || 1;

            return (
              <div
                key={p.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <label
                  htmlFor={`param-${p.key}`}
                  style={{ fontSize: '14px', fontWeight: 600, color: '#1f2a24', flex: '1', minWidth: '110px' }}
                >
                  {p.label}
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => updateParam(p.key, val - step)}
                    disabled={val <= min}
                    aria-label={`${p.label} değerini azalt`}
                    style={{
                      minWidth: '44px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      border: '1px solid #dedad0',
                      background: val <= min ? '#f4f3ef' : '#ffffff',
                      color: val <= min ? '#9ca3af' : '#1f2a24',
                      cursor: val <= min ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>

                  <input
                    ref={idx === 0 ? firstInputRef : undefined}
                    id={`param-${p.key}`}
                    type="text"
                    inputMode="numeric"
                    value={val}
                    onChange={(e) => {
                      const parsed = Number(e.target.value.replace(/[^0-9.-]/g, ''));
                      if (!Number.isNaN(parsed)) {
                        updateParam(p.key, parsed);
                      }
                    }}
                    style={{
                      width: '64px',
                      minHeight: '44px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      border: '1px solid #dedad0',
                      background: '#ffffff',
                      color: '#1f2a24',
                      padding: '0 4px',
                      boxSizing: 'border-box',
                    }}
                    aria-label={p.label}
                  />

                  <button
                    type="button"
                    onClick={() => updateParam(p.key, val + step)}
                    disabled={val >= max}
                    aria-label={`${p.label} değerini artır`}
                    style={{
                      minWidth: '44px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      border: '1px solid #dedad0',
                      background: val >= max ? '#f4f3ef' : '#ffffff',
                      color: val >= max ? '#9ca3af' : '#1f2a24',
                      cursor: val >= max ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {mode === 'edit' && (
          <p style={{ margin: '4px 0 8px', fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
            Uygulayınca bu şekil yeniden çizilir; içinde elle yaptığınız değişiklikler kaybolur.
          </p>
        )}

        {/* Eylemler */}
        <div className={styles.confirmActions} style={{ marginTop: '12px', gap: '8px' }}>
          <button type="button" className={styles.confirmCancel} onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className={styles.confirmCancel}
            onClick={() => onConfirm(params)}
            style={{
              background: '#25634b',
              color: '#ffffff',
              borderColor: '#25634b',
            }}
          >
            {mode === 'edit' ? 'Uygula' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

