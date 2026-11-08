'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bold, Highlighter, Italic, Underline } from '../icons';
import { RichText } from './RichText';
import { MathPalette } from './MathPalette';
import { hasMath } from '../../lib/math/parseMath';
import { hasRich } from '../../lib/math/parseRich';
import {
  applyEditToElement,
  handleListEnter,
  insertTemplate,
  toggleList,
  wrapSelection,
} from './richEditing';
import styles from './RichTextField.module.css';

const TEXT_COLORS = ['#1f2a24', '#25634b', '#e03131', '#1971c2', '#f08c00', '#7950f2'];

const HIGHLIGHT_COLORS = [
  { c: '#ffe066', label: 'Sarı' },
  { c: '#b2f2bb', label: 'Yeşil' },
  { c: '#fcc2d7', label: 'Pembe' },
  { c: '#a5d8ff', label: 'Mavi' },
];

export interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  rows?: number;
  autoFocus?: boolean;
  'data-autofocus'?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

export function RichTextField({
  value,
  onChange,
  multiline = false,
  maxLength,
  placeholder,
  id,
  'aria-label': ariaLabel,
  rows = 3,
  autoFocus,
  'data-autofocus': dataAutoFocus,
  className,
  disabled,
  required,
  name,
}: RichTextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);
  const [toolbarActiveIdx, setToolbarActiveIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const hasFormatting = hasMath(value) || hasRich(value);
  const showToolbarActive = isFocused || hasFormatting || colorOpen || highlightOpen || mathOpen;

  // Dışarı tıklanınca popover'ları kapat
  useEffect(() => {
    if (!colorOpen && !highlightOpen && !mathOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setColorOpen(false);
        setHighlightOpen(false);
        setMathOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [colorOpen, highlightOpen, mathOpen]);

  const handleWrapTag = (tag: 'b' | 'i' | 'u') => {
    const el = inputRef.current;
    if (!el) return;
    const res = wrapSelection(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, tag);
    applyEditToElement(el, res, onChange);
  };

  const handleColor = (color: string) => {
    const el = inputRef.current;
    if (!el) return;
    const res = wrapSelection(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, 'c', color);
    applyEditToElement(el, res, onChange);
    setColorOpen(false);
  };

  const handleHighlight = (color: string | null) => {
    const el = inputRef.current;
    if (!el) return;
    const res = wrapSelection(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, 'h', color);
    applyEditToElement(el, res, onChange);
    setHighlightOpen(false);
  };

  const handleToggleList = (type: 'bullet' | 'number') => {
    const el = inputRef.current;
    if (!el) return;
    const res = toggleList(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, type);
    applyEditToElement(el, res, onChange);
  };

  const handleInsertMath = (tpl: string) => {
    const el = inputRef.current;
    if (!el) return;
    const res = insertTemplate(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, tpl);
    applyEditToElement(el, res, onChange);
    setMathOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      handleWrapTag('b');
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      handleWrapTag('i');
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      handleWrapTag('u');
    } else if (multiline && e.key === 'Enter' && !e.shiftKey) {
      const el = inputRef.current;
      if (el) {
        const res = handleListEnter(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length);
        if (res.handled) {
          e.preventDefault();
          applyEditToElement(el, res, onChange);
        }
      }
    }
  };

  // Araç çubuğu ok tuşları (Roving tabindex)
  const handleToolbarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const toolbar = e.currentTarget;
    const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button[data-toolbar-btn="true"]'));
    if (!buttons.length) return;
    const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIdx === -1) return;

    e.preventDefault();
    let nextIdx = currentIdx;
    if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = buttons.length - 1;

    setToolbarActiveIdx(nextIdx);
    buttons[nextIdx]?.focus();
  };

  return (
    <div ref={containerRef} className={`${styles.wrapper} ${className || ''}`}>
      {/* Araç Çubuğu */}
      <div
        className={`${styles.toolbar} ${showToolbarActive ? styles.toolbarActive : ''}`}
        role="toolbar"
        aria-label="Metin biçimi"
        onKeyDown={handleToolbarKeyDown}
      >
        {/* B */}
        <button
          type="button"
          data-toolbar-btn="true"
          tabIndex={toolbarActiveIdx === 0 ? 0 : -1}
          className={styles.toolBtn}
          title="Kalın (Ctrl+B)"
          aria-label="Kalın (Ctrl+B)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleWrapTag('b')}
          onFocus={() => setToolbarActiveIdx(0)}
        >
          <Bold size={15} aria-hidden="true" />
        </button>

        {/* I */}
        <button
          type="button"
          data-toolbar-btn="true"
          tabIndex={toolbarActiveIdx === 1 ? 0 : -1}
          className={styles.toolBtn}
          title="İtalik (Ctrl+I)"
          aria-label="İtalik (Ctrl+I)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleWrapTag('i')}
          onFocus={() => setToolbarActiveIdx(1)}
        >
          <Italic size={15} aria-hidden="true" />
        </button>

        {/* U */}
        <button
          type="button"
          data-toolbar-btn="true"
          tabIndex={toolbarActiveIdx === 2 ? 0 : -1}
          className={styles.toolBtn}
          title="Altı çizili (Ctrl+U)"
          aria-label="Altı çizili (Ctrl+U)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleWrapTag('u')}
          onFocus={() => setToolbarActiveIdx(2)}
        >
          <Underline size={15} aria-hidden="true" />
        </button>

        <span className={styles.divider} aria-hidden="true" />

        {/* Renk */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            data-toolbar-btn="true"
            tabIndex={toolbarActiveIdx === 3 ? 0 : -1}
            className={styles.colorTrigger}
            title="Yazı rengi"
            aria-label="Yazı rengi"
            aria-haspopup="true"
            aria-expanded={colorOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setColorOpen((v) => !v);
              setHighlightOpen(false);
              setMathOpen(false);
            }}
            onFocus={() => setToolbarActiveIdx(3)}
          >
            <span className={styles.colorDot} style={{ backgroundColor: '#1f2a24' }} />
          </button>
          {colorOpen && (
            <div className={styles.popover}>
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={styles.swatch}
                  style={{ backgroundColor: c }}
                  title={`Renk ${c}`}
                  aria-label={`Renk ${c}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleColor(c)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Vurgu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            data-toolbar-btn="true"
            tabIndex={toolbarActiveIdx === 4 ? 0 : -1}
            className={styles.toolBtn}
            title="Vurgu rengi"
            aria-label="Vurgu rengi"
            aria-haspopup="true"
            aria-expanded={highlightOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setHighlightOpen((v) => !v);
              setColorOpen(false);
              setMathOpen(false);
            }}
            onFocus={() => setToolbarActiveIdx(4)}
          >
            <Highlighter size={15} aria-hidden="true" />
          </button>
          {highlightOpen && (
            <div className={styles.popover} style={{ flexDirection: 'column', minWidth: 130 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {HIGHLIGHT_COLORS.map(({ c, label }) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.swatch}
                    style={{ backgroundColor: c, border: '1px solid rgba(0,0,0,0.15)' }}
                    title={label}
                    aria-label={label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleHighlight(c)}
                  />
                ))}
              </div>
              <button
                type="button"
                className={styles.toolBtn}
                style={{
                  width: '100%',
                  fontSize: 11,
                  height: 24,
                  minHeight: 24,
                  padding: '0 4px',
                  border: '1px solid #d4d0c5',
                  borderRadius: 4,
                  marginTop: 2,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleHighlight(null)}
              >
                Vurguyu kaldır
              </button>
            </div>
          )}
        </div>

        {multiline && (
          <>
            <span className={styles.divider} aria-hidden="true" />
            <button
              type="button"
              data-toolbar-btn="true"
              tabIndex={toolbarActiveIdx === 5 ? 0 : -1}
              className={styles.toolBtn}
              title="Madde işaretli liste"
              aria-label="Madde işaretli liste"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleToggleList('bullet')}
              onFocus={() => setToolbarActiveIdx(5)}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>• Liste</span>
            </button>
            <button
              type="button"
              data-toolbar-btn="true"
              tabIndex={toolbarActiveIdx === 6 ? 0 : -1}
              className={styles.toolBtn}
              title="Numaralı liste"
              aria-label="Numaralı liste"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleToggleList('number')}
              onFocus={() => setToolbarActiveIdx(6)}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>1. Liste</span>
            </button>
          </>
        )}

        <span className={styles.divider} aria-hidden="true" />

        {/* ∑ Formül */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            data-toolbar-btn="true"
            tabIndex={toolbarActiveIdx === (multiline ? 7 : 5) ? 0 : -1}
            className={styles.toolBtn}
            title="Formül ekle (∑)"
            aria-label="Formül ekle (∑)"
            aria-haspopup="true"
            aria-expanded={mathOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setMathOpen((v) => !v);
              setColorOpen(false);
              setHighlightOpen(false);
            }}
            onFocus={() => setToolbarActiveIdx(multiline ? 7 : 5)}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>∑</span>
          </button>
          {mathOpen && (
            <MathPalette
              onInsert={handleInsertMath}
              onClose={() => setMathOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Alan (Input veya Textarea) */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement | null>}
          id={id}
          name={name}
          className={styles.inputAttached}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={ariaLabel}
          rows={rows}
          autoFocus={autoFocus}
          data-autofocus={dataAutoFocus}
          disabled={disabled}
          required={required}
          spellCheck={true}
          lang="tr"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement | null>}
          type="text"
          id={id}
          name={name}
          className={styles.inputAttached}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          data-autofocus={dataAutoFocus}
          disabled={disabled}
          required={required}
          spellCheck={true}
          lang="tr"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
        />
      )}

      {/* Canlı Önizleme */}
      {hasFormatting && (
        <div className={styles.preview} aria-live="polite">
          <div className={styles.previewLabel}>Önizleme</div>
          <div className={styles.previewContent}>
            <RichText text={value} inline={!multiline} />
          </div>
        </div>
      )}
    </div>
  );
}
