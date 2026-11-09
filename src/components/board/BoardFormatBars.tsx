'use client';

// Seçili öğenin üstünde açılan araç çubukları: metin biçimlendirme (FormatBar) ve
// çoklu seçim işlemleri (MultiSelectBar). (BoardCanvas.tsx'ten ayrıldı.)
import React, { useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Highlighter, Italic, Square, Underline } from '../icons';
import { BOARD_H, BOARD_W, BoardEl, NoteEl } from '../../lib/boardData';
import { LIBRARY_ITEMS } from '../../lib/boardLibrary';
import { MathPalette, insertMathTemplate } from '../math/MathPalette';
import { applyEditToElement, toggleList, toggleTextList, wrapSelection } from '../math/richEditing';
import { bbox, combinedBbox, getFontSizeOptions } from './boardGeometry';
import styles from './Board.module.css';

export function applyTagToSelection(
  textarea: HTMLTextAreaElement,
  tag: 'b' | 'i' | 'u',
  onChange: (nextText: string) => void
) {
  const res = wrapSelection(textarea.value, textarea.selectionStart, textarea.selectionEnd, tag);
  applyEditToElement(textarea, res, onChange);
  return true;
}

export function applyColorToSelection(
  textarea: HTMLTextAreaElement,
  color: string,
  onChange: (nextText: string) => void
) {
  const res = wrapSelection(textarea.value, textarea.selectionStart, textarea.selectionEnd, 'c', color);
  applyEditToElement(textarea, res, onChange);
  return true;
}

export function applyHighlightToSelection(
  textarea: HTMLTextAreaElement,
  color: string | null,
  onChange: (nextText: string) => void
) {
  const res = wrapSelection(textarea.value, textarea.selectionStart, textarea.selectionEnd, 'h', color);
  applyEditToElement(textarea, res, onChange);
  return true;
}

export function toggleListLines(
  textarea: HTMLTextAreaElement,
  type: 'bullet' | 'number',
  onChange: (nextText: string) => void
) {
  const res = toggleList(textarea.value, textarea.selectionStart, textarea.selectionEnd, type);
  applyEditToElement(textarea, res, onChange);
}

export function FormatBar({
  el,
  colors,
  barRef,
  textareaRef,
  onPatch,
}: {
  el: NoteEl;
  colors: string[];
  barRef?: React.RefObject<HTMLDivElement | null>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPatch: (patch: Partial<NoteEl>) => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);

  const b = bbox(el);
  const topPct = b.y < 70
    ? ((b.y + b.h + 12) / BOARD_H) * 100
    : (b.y / BOARD_H) * 100;
  const transform = b.y < 70 ? 'none' : 'translateY(calc(-100% - 12px))';
  const leftPct = Math.max(1, Math.min(65, (b.x / BOARD_W) * 100));

  const fontSizes = getFontSizeOptions(el.fontSize);

  return (
    <div
      ref={barRef}
      className={styles.formatBar}
      role="toolbar"
      aria-label="Metin biçimlendirme"
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        transform,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Yazı tipi */}
      <select
        className={styles.formatSelect}
        value={el.fontFamily || 'sans'}
        onChange={(e) => onPatch({ fontFamily: e.target.value as 'sans' | 'hand' | 'display' | 'school' })}
        aria-label="Yazı tipi"
      >
        <option value="sans">Düz</option>
        <option value="hand">El yazısı</option>
        <option value="display">Başlık</option>
        <option value="school">Okul</option>
      </select>

      {/* Boyut */}
      <select
        className={styles.formatSelect}
        value={String(el.fontSize || 42)}
        onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
        aria-label="Yazı boyutu"
      >
        {fontSizes.map((sz) => (
          <option key={sz} value={sz}>{sz}</option>
        ))}
      </select>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* B */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.fontWeight === 700}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta && ta.selectionStart < ta.selectionEnd) {
            applyTagToSelection(ta, 'b', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ fontWeight: el.fontWeight === 700 ? 400 : 700 });
          }
        }}
        title="Kalın (Ctrl+B)"
        aria-label="Kalın"
      >
        <Bold size={16} aria-hidden="true" />
      </button>

      {/* I */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={Boolean(el.italic)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta && ta.selectionStart < ta.selectionEnd) {
            applyTagToSelection(ta, 'i', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ italic: !el.italic });
          }
        }}
        title="İtalik (Ctrl+I)"
        aria-label="İtalik"
      >
        <Italic size={16} aria-hidden="true" />
      </button>

      {/* U */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={Boolean(el.underline)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta && ta.selectionStart < ta.selectionEnd) {
            applyTagToSelection(ta, 'u', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ underline: !el.underline });
          }
        }}
        title="Altı çizili (Ctrl+U)"
        aria-label="Altı çizili"
      >
        <Underline size={16} aria-hidden="true" />
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* İnce · Normal · Kalın */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.fontWeight === 300}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ fontWeight: 300 })}
        title="İnce yazı"
      >
        İnce
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={(el.fontWeight ?? 400) === 400}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ fontWeight: 400 })}
        title="Normal yazı"
      >
        Normal
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.fontWeight === 700}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ fontWeight: 700 })}
        title="Kalın yazı"
      >
        Kalın
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Renk */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatColorTrigger}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setColorOpen((v) => !v)}
          title="Yazı rengi"
          aria-label="Yazı rengi"
          aria-haspopup="true"
          aria-expanded={colorOpen}
        >
          <span
            className={styles.formatColorDot}
            style={{ backgroundColor: el.textColor || '#1f2a24' }}
          />
        </button>

        {colorOpen && (
          <div className={styles.formatColorPopover}>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.formatColorSwatch}
                style={{ backgroundColor: c }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const ta = textareaRef?.current;
                  if (ta && ta.selectionStart < ta.selectionEnd) {
                    applyColorToSelection(ta, c, (nextText) => onPatch({ text: nextText }));
                  } else {
                    onPatch({ textColor: c });
                  }
                  setColorOpen(false);
                }}
                aria-label={`Renk ${c}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Vurgu (Highlighter) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={highlightOpen}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setHighlightOpen((v) => !v)}
          title="Vurgu rengi (Fosforlu kalem)"
          aria-label="Vurgu rengi"
          aria-haspopup="true"
          aria-expanded={highlightOpen}
        >
          <Highlighter size={16} aria-hidden="true" />
        </button>

        {highlightOpen && (
          <div
            className={styles.formatColorPopover}
            style={{
              minWidth: 140,
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { c: '#ffe066', name: 'Sarı' },
                { c: '#b2f2bb', name: 'Yeşil' },
                { c: '#fcc2d7', name: 'Pembe' },
                { c: '#a5d8ff', name: 'Mavi' },
              ].map(({ c, name }) => (
                <button
                  key={c}
                  type="button"
                  className={styles.formatColorSwatch}
                  style={{ backgroundColor: c, border: '1px solid rgba(0,0,0,0.15)' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const ta = textareaRef?.current;
                    if (ta && ta.selectionStart < ta.selectionEnd) {
                      applyHighlightToSelection(ta, c, (nextText) => onPatch({ text: nextText }));
                    }
                    setHighlightOpen(false);
                  }}
                  title={name}
                  aria-label={name}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.formatBtn}
              style={{
                width: '100%',
                fontSize: '11px',
                height: '24px',
                minHeight: '24px',
                padding: '0 4px',
                justifyContent: 'center',
                border: '1px solid #d4d0c5',
                borderRadius: '4px',
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const ta = textareaRef?.current;
                if (ta && ta.selectionStart < ta.selectionEnd) {
                  applyHighlightToSelection(ta, null, (nextText) => onPatch({ text: nextText }));
                }
                setHighlightOpen(false);
              }}
            >
              Vurguyu kaldır
            </button>
          </div>
        )}
      </div>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Hizalama */}
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={(!el.align || el.align === 'left')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ align: 'left' })}
        title="Sola hizala"
        aria-label="Sola hizala"
      >
        <AlignLeft size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.align === 'center'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ align: 'center' })}
        title="Ortaya hizala"
        aria-label="Ortaya hizala"
      >
        <AlignCenter size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        aria-pressed={el.align === 'right'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPatch({ align: 'right' })}
        title="Sağa hizala"
        aria-label="Sağa hizala"
      >
        <AlignRight size={16} aria-hidden="true" />
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Kutu (Zemin, Kenarlık, Köşe) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={boxOpen || Boolean(el.boxFill || el.boxBorder)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setBoxOpen((v) => !v);
            setColorOpen(false);
            setHighlightOpen(false);
            setSpacingOpen(false);
            setMathOpen(false);
          }}
          title="Metin kutusu (zemin, kenarlık, köşe)"
          aria-label="Metin kutusu"
          aria-haspopup="true"
          aria-expanded={boxOpen}
        >
          <Square size={16} aria-hidden="true" />
          <span style={{ fontSize: 12, marginLeft: 2 }}>Kutu</span>
        </button>

        {boxOpen && (
          <div
            className={styles.formatColorPopover}
            style={{
              minWidth: 220,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Zemin */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Zemin
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.formatBtn}
                  style={{
                    height: 24,
                    minHeight: 24,
                    minWidth: 32,
                    padding: '0 4px',
                    fontSize: 11,
                    border: '1px solid #d4d0c5',
                    borderRadius: 4,
                  }}
                  aria-pressed={!el.boxFill}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPatch({ boxFill: null })}
                >
                  Yok
                </button>
                {[
                  { c: '#fff3bf', label: 'Sarı' },
                  { c: '#d3f9d8', label: 'Yeşil' },
                  { c: '#d0ebff', label: 'Mavi' },
                  { c: '#ffdeeb', label: 'Pembe' },
                  { c: '#f1f3f5', label: 'Gri' },
                  { c: '#25634b', label: 'Koyu Yeşil' },
                ].map(({ c, label }) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.formatColorSwatch}
                    style={{
                      backgroundColor: c,
                      outline: el.boxFill === c ? '2px solid #25634b' : 'none',
                      outlineOffset: 1,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (c === '#25634b') {
                        onPatch({ boxFill: c, textColor: '#ffffff' });
                      } else {
                        onPatch({ boxFill: c });
                      }
                    }}
                    title={label}
                    aria-label={label}
                  />
                ))}
              </div>
              {el.boxFill === '#25634b' && (
                <button
                  type="button"
                  className={styles.formatBtn}
                  style={{
                    marginTop: 6,
                    width: '100%',
                    height: 22,
                    minHeight: 22,
                    fontSize: 11,
                    border: '1px solid #25634b',
                    borderRadius: 4,
                    color: '#25634b',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPatch({ textColor: '#ffffff' })}
                >
                  Yazı rengini beyaz yap
                </button>
              )}
            </div>

            {/* Kenarlık */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Kenarlık
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.formatBtn}
                  style={{
                    height: 24,
                    minHeight: 24,
                    minWidth: 32,
                    padding: '0 4px',
                    fontSize: 11,
                    border: '1px solid #d4d0c5',
                    borderRadius: 4,
                  }}
                  aria-pressed={!el.boxBorder}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPatch({ boxBorder: null })}
                >
                  Yok
                </button>
                {['#1f2a24', '#25634b', '#e03131', '#1971c2', '#f08c00'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.formatColorSwatch}
                    style={{
                      backgroundColor: c,
                      outline: el.boxBorder === c ? '2px solid #25634b' : 'none',
                      outlineOffset: 1,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ boxBorder: c })}
                    title={`Kenarlık ${c}`}
                    aria-label={`Kenarlık ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Köşe */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Köşe
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { r: 0 as const, label: 'Keskin' },
                  { r: 12 as const, label: 'Yuvarlak' },
                  { r: 999 as const, label: 'Hap' },
                ].map(({ r, label }) => (
                  <button
                    key={r}
                    type="button"
                    className={styles.formatBtn}
                    style={{
                      flex: 1,
                      height: 26,
                      minHeight: 26,
                      padding: '0 4px',
                      fontSize: 11,
                      border: '1px solid #d4d0c5',
                      borderRadius: 4,
                    }}
                    aria-pressed={(el.boxRadius ?? 0) === r}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ boxRadius: r })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aralık (Satır & Harf) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={spacingOpen || Boolean(el.lineHeight && el.lineHeight !== 1.3) || Boolean(el.letterSpacing)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setSpacingOpen((v) => !v);
            setColorOpen(false);
            setHighlightOpen(false);
            setBoxOpen(false);
            setMathOpen(false);
          }}
          title="Satır ve harf aralığı"
          aria-label="Aralık"
          aria-haspopup="true"
          aria-expanded={spacingOpen}
        >
          <span style={{ fontSize: 12, fontWeight: 600 }}>Aralık</span>
        </button>

        {spacingOpen && (
          <div
            className={styles.formatColorPopover}
            style={{
              minWidth: 180,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Satır Aralığı */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Satır Aralığı
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { lh: 1 as const, label: '1' },
                  { lh: 1.3 as const, label: '1.3' },
                  { lh: 1.6 as const, label: '1.6' },
                  { lh: 2 as const, label: '2' },
                ].map(({ lh, label }) => (
                  <button
                    key={lh}
                    type="button"
                    className={styles.formatBtn}
                    style={{
                      flex: 1,
                      height: 26,
                      minHeight: 26,
                      padding: '0 4px',
                      fontSize: 11,
                      border: '1px solid #d4d0c5',
                      borderRadius: 4,
                    }}
                    aria-pressed={(el.lineHeight ?? 1.3) === lh}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ lineHeight: lh })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Harf Aralığı */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3c4b44', marginBottom: 4 }}>
                Harf Aralığı
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { ls: 0 as const, label: 'Normal' },
                  { ls: 0.05 as const, label: 'Geniş' },
                  { ls: 0.1 as const, label: 'Çok geniş' },
                ].map(({ ls, label }) => (
                  <button
                    key={ls}
                    type="button"
                    className={styles.formatBtn}
                    style={{
                      flex: 1,
                      height: 26,
                      minHeight: 26,
                      padding: '0 4px',
                      fontSize: 10,
                      border: '1px solid #d4d0c5',
                      borderRadius: 4,
                    }}
                    aria-pressed={(el.letterSpacing ?? 0) === ls}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPatch({ letterSpacing: ls })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* • Liste */}
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta) {
            toggleListLines(ta, 'bullet', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ text: toggleTextList(el.text || '', 'bullet') });
          }
        }}
        title="Madde işaretli liste"
        aria-label="Madde işaretli liste"
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>• Liste</span>
      </button>

      {/* 1. Liste */}
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const ta = textareaRef?.current;
          if (ta) {
            toggleListLines(ta, 'number', (nextText) => onPatch({ text: nextText }));
          } else {
            onPatch({ text: toggleTextList(el.text || '', 'number') });
          }
        }}
        title="Numaralı liste"
        aria-label="Numaralı liste"
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>1. Liste</span>
      </button>

      <span className={styles.formatDivider} aria-hidden="true" />

      {/* Formül Paleti (∑) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.formatBtn}
          aria-pressed={mathOpen}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMathOpen((v) => !v)}
          title="Formül ekle (∑)"
          aria-label="Formül ekle"
        >
          <span style={{ fontWeight: 700, fontSize: 16 }}>∑</span>
        </button>

        {mathOpen && (
          <MathPalette
            onInsert={(tpl) => {
              if (textareaRef?.current) {
                insertMathTemplate(textareaRef.current, tpl, (nextText) => {
                  onPatch({ text: nextText });
                });
              } else {
                const cur = el.text || '';
                const unescapedDollars = (cur.match(/(?<!\\)\$/g) || []).length;
                const inside = unescapedDollars % 2 === 1;
                const addition = inside ? tpl : `$${tpl}$`;
                const next = cur ? `${cur} ${addition}` : addition;
                onPatch({ text: next });
              }
            }}
            onClose={() => setMathOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export function MultiSelectBar({
  elements,
  onDuplicate,
  onOrder,
  onDelete,
  onGroup,
  onUngroup,
  onConfigure,
  onSaveToLibrary,
}: {
  elements: BoardEl[];
  onDuplicate?: () => void;
  onOrder?: (dir: 'front' | 'back') => void;
  onDelete?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onConfigure?: () => void;
  onSaveToLibrary?: () => void;
}) {
  const cb = combinedBbox(elements.map(bbox));
  const topPct = cb.y < 70
    ? ((cb.y + cb.h + 12) / BOARD_H) * 100
    : (cb.y / BOARD_H) * 100;
  const transform = cb.y < 70 ? 'none' : 'translateY(calc(-100% - 12px))';
  const leftPct = Math.max(1, Math.min(65, (cb.x / BOARD_W) * 100));

  const hasGroup = elements.some((el) => !!el.groupId);
  const firstGid = elements[0]?.groupId;
  const allSameGroup = hasGroup && elements.every((el) => el.groupId && el.groupId === firstGid);
  const canGroup = elements.length >= 2 && !allSameGroup;
  const canUngroup = hasGroup;

  const firstLibId = elements[0]?.lib?.id;
  const allSameLib = allSameGroup && !!firstLibId && elements.every((el) => el.lib?.id === firstLibId);
  const libItem = allSameLib ? LIBRARY_ITEMS.find((it) => it.id === firstLibId) : undefined;
  const canConfigure = !!(allSameLib && libItem && libItem.params && libItem.params.length > 0 && onConfigure);

  return (
    <div
      className={styles.formatBar}
      role="toolbar"
      aria-label="Seçim işlemleri"
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        transform,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className={styles.multiSelectBadge}>
        {allSameGroup ? 'Grup' : `${elements.length} öğe`}
      </span>
      {canConfigure && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfigure}
          title="Şekil ayarları"
        >
          Ayarlar
        </button>
      )}
      {canGroup && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onGroup}
          title="Grupla (Ctrl+G)"
        >
          Grupla
        </button>
      )}
      {canUngroup && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onUngroup}
          title="Grubu çöz (Ctrl+Shift+G)"
        >
          Grubu çöz
        </button>
      )}
      <span className={styles.formatDivider} aria-hidden="true" />
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDuplicate}
        title="Çoğalt (Ctrl+D)"
      >
        Çoğalt
      </button>
      {onSaveToLibrary && (
        <button
          type="button"
          className={styles.formatBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSaveToLibrary}
          title="Kütüphaneye kaydet"
        >
          Kaydet
        </button>
      )}
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onOrder?.('front')}
        title="En öne getir"
      >
        Öne
      </button>
      <button
        type="button"
        className={styles.formatBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onOrder?.('back')}
        title="En arkaya gönder"
      >
        Arkaya
      </button>
      <span className={styles.formatDivider} aria-hidden="true" />
      <button
        type="button"
        className={`${styles.formatBtn} ${styles.formatDeleteBtn}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDelete}
        title="Sil (Delete)"
      >
        Sil
      </button>
    </div>
  );
}
