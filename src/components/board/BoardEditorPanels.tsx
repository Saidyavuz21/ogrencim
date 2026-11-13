'use client';

// Tahta düzenleyicinin yan panelleri: seçili öğe ayarları, çoklu seçim ve medya çekmecesi.
// (BoardEditor.tsx'ten ayrıldı.)

import React, { useEffect, useRef, useState } from 'react';
import {
  AlignBottom, AlignCenter, AlignLeft, AlignMiddle, AlignRight, AlignTop, Bold, Bookmark, ChevronDown, ChevronUp, Component, Copy, DistributeH, DistributeV, Italic, Layers, Lock, Sliders,
  Mic, Square, Trash2, Underline, Upload,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { AUDIO_MAX_SECONDS, BLANKS_MAX_DISTRACTORS, BOARD_IMAGE_TYPES, BoardEl, boardImageUrls, DICE_MAX, FRACTION_MAX_PARTS, FRACTION_MIN_PARTS, FractionShape, imageKey, MATCH_MAX_PAIRS, normalizeDiceCount, normalizeFractionParts, normalizeFractionShape, normalizeSlices, ORDER_MAX, ORDER_MIN, parseVideoUrl, SORT_MAX_GROUPS, SORT_MIN_GROUPS, SPINNER_MAX_SLICES, SPINNER_MIN_SLICES, SPINNER_SLICE_MAX_CHARS, uploadBoardAudio, WIDGET_LABEL, WidgetData, WidgetEl } from '../../lib/boardData';
import type { AlignMode, DistributeAxis } from './snapGuides';
import { FILES_BUCKET, LIBRARY_BUCKET, libraryFileName, listLibrary, listMyFiles } from '../../lib/filesData';
import { CHOICE_LETTERS, QuestionRow } from '../../lib/quizData';
import { getFontSizeOptions } from './BoardCanvas';
import { ShapeLibraryPanel } from './ShapeLibraryPanel';
import { LIBRARY_ITEMS, LibraryItem } from '../../lib/boardLibrary';
import { SCHOOL_ITEMS } from '../../lib/boardLibrary/itemsSchool';
import { MathPalette, insertMathTemplate } from '../math/MathPalette';
import { MathText } from '../math/MathText';
import { hasMath } from '../../lib/math/parseMath';
import styles from './Board.module.css';
import { BOX_BORDERS, BOX_FILLS, isDarkFill } from './textLayout';

export const COLORS = ['#1f2a24', '#d03b3b', '#2a78d6', '#1e7a4c', '#eb6834', '#7a3fd0', '#e0a800', '#ffffff'];
export const NOTE_COLORS = ['#fff3b0', '#dff3df', '#dbe8f8', '#fbe2ec', '#ffffff'];
export type MediaItem = { key: string; bucket: string; path: string; name: string; shapeId?: string; thumbnail?: string };

const BUILTIN_IMAGES: MediaItem[] = SCHOOL_ITEMS.map((item) => ({
  key: item.id,
  bucket: 'builtin-library',
  path: item.imageSource!,
  name: item.name,
  shapeId: item.id,
  thumbnail: item.imageSource,
}));

// --------------------------------------------------------
// Seçili öğenin ayarları
// --------------------------------------------------------
export function SelectionPanel({ el, questions, minitests, boardImages, imageUrls, onPatch, onDelete, onOrder, onLock, onConfigure, onSaveToLibrary, onSaveImage, busy }: {
  el: BoardEl;
  questions: QuestionRow[];
  minitests: WidgetEl[];
  boardImages?: { bucket: string; path: string }[];
  imageUrls?: Record<string, string>;
  onPatch: (patch: Partial<BoardEl>) => void;
  onDelete: () => void;
  onOrder: (dir: 'front' | 'back') => void;
  onLock?: () => void;
  onConfigure?: () => void;
  onSaveToLibrary?: () => void;
  /** Seçili resmi öğretmenin Dosyalarım alanına kopyalar */
  onSaveImage?: () => void;
  busy?: boolean;
}) {
  const [mathStepIdx, setMathStepIdx] = useState<number | null>(null);
  const stepTextareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const title = el.type === 'widget' ? WIDGET_LABEL[el.kind] : (el.type === 'note' && el.variant === 'text') ? 'Metin' : { stroke: 'Çizim', line: 'Çizgi', arrow: 'Ok', rect: 'Dikdörtgen', ellipse: 'Daire', note: 'Not', image: 'Görsel', poly: 'Çokgen' }[el.type];
  return (
    <section className={styles.panel}>
      <h3>{title}</h3>
      {el.type === 'note' && (
        <>
          <label>Metin<textarea value={el.text} maxLength={2000} onChange={(e) => onPatch({ text: e.target.value })} /></label>

          <label>Yazı tipi
            <CustomSelect
              value={el.fontFamily || 'sans'}
              onChange={(v) => onPatch({ fontFamily: v as 'sans' | 'hand' | 'display' | 'school' })}
              options={[
                { value: 'sans', label: 'Düz' },
                { value: 'hand', label: 'El yazısı' },
                { value: 'display', label: 'Başlık' },
                { value: 'school', label: 'Okul' },
              ]}
            />
          </label>

          <label>Yazı boyutu
            <CustomSelect
              value={String(el.fontSize || 42)}
              onChange={(v) => onPatch({ fontSize: Number(v) })}
              options={getFontSizeOptions(el.fontSize).map((n) => ({ value: String(n), label: `${n}` }))}
            />
          </label>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={`${styles.tool} ${el.fontWeight === 700 ? styles.toolActive : ''}`}
              aria-pressed={el.fontWeight === 700}
              onClick={() => onPatch({ fontWeight: el.fontWeight === 700 ? 400 : 700 })}
              title="Kalın"
              aria-label="Kalın"
            >
              <Bold size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.italic ? styles.toolActive : ''}`}
              aria-pressed={Boolean(el.italic)}
              onClick={() => onPatch({ italic: !el.italic })}
              title="İtalik"
              aria-label="İtalik"
            >
              <Italic size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.underline ? styles.toolActive : ''}`}
              aria-pressed={Boolean(el.underline)}
              onClick={() => onPatch({ underline: !el.underline })}
              title="Altı çizili"
              aria-label="Altı çizili"
            >
              <Underline size={16} aria-hidden="true" />
            </button>

            <span style={{ width: 1, height: 18, background: '#c9c5b8', margin: '0 2px' }} />

            <button
              type="button"
              className={`${styles.tool} ${el.fontWeight === 300 ? styles.toolActive : ''}`}
              aria-pressed={el.fontWeight === 300}
              onClick={() => onPatch({ fontWeight: 300 })}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              İnce
            </button>
            <button
              type="button"
              className={`${styles.tool} ${(el.fontWeight ?? 400) === 400 ? styles.toolActive : ''}`}
              aria-pressed={(el.fontWeight ?? 400) === 400}
              onClick={() => onPatch({ fontWeight: 400 })}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              Normal
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.fontWeight === 700 ? styles.toolActive : ''}`}
              aria-pressed={el.fontWeight === 700}
              onClick={() => onPatch({ fontWeight: 700 })}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              Kalın
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`${styles.tool} ${(!el.align || el.align === 'left') ? styles.toolActive : ''}`}
              aria-pressed={!el.align || el.align === 'left'}
              onClick={() => onPatch({ align: 'left' })}
              title="Sola hizala"
              aria-label="Sola hizala"
            >
              <AlignLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.align === 'center' ? styles.toolActive : ''}`}
              aria-pressed={el.align === 'center'}
              onClick={() => onPatch({ align: 'center' })}
              title="Ortaya hizala"
              aria-label="Ortaya hizala"
            >
              <AlignCenter size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${el.align === 'right' ? styles.toolActive : ''}`}
              aria-pressed={el.align === 'right'}
              onClick={() => onPatch({ align: 'right' })}
              title="Sağa hizala"
              aria-label="Sağa hizala"
            >
              <AlignRight size={16} aria-hidden="true" />
            </button>
          </div>

          <label>Yazı rengi
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={styles.swatch}
                  style={{ background: c }}
                  aria-pressed={(el.textColor || '#1f2a24') === c}
                  onClick={() => onPatch({ textColor: c })}
                  aria-label={`Yazı rengi ${c}`}
                />
              ))}
            </div>
          </label>

          {el.variant === 'text' && (
            <>
              <label>Kutu zemini
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                  <button
                    type="button"
                    className={styles.swatch}
                    style={{ background: '#ffffff', border: '1px dashed #c9c5b8', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-pressed={!el.boxFill}
                    onClick={() => onPatch({ boxFill: null })}
                    title="Yok"
                  >
                    ✕
                  </button>
                  {BOX_FILLS.map(({ c, label, dark }) => (
                    <button
                      key={c}
                      type="button"
                      className={styles.swatch}
                      style={{ background: c, outline: el.boxFill === c ? '2px solid #25634b' : undefined }}
                      aria-pressed={el.boxFill === c}
                      onClick={() => {
                        if (dark) {
                          onPatch({ boxFill: c, textColor: '#ffffff' });
                        } else {
                          onPatch({ boxFill: c });
                        }
                      }}
                      title={label}
                      aria-label={`Kutu zemini ${label}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(el.boxFill || '') ? (el.boxFill as string) : '#ffffff'}
                    onChange={(e) => onPatch({ boxFill: e.target.value })}
                    title="Başka bir zemin rengi seç"
                    aria-label="Kutu zemini için başka renk"
                    style={{ width: 28, height: 28, padding: 0, border: '1px solid #c9c5b8', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                  />
                </div>
                {isDarkFill(el.boxFill) && el.textColor !== '#ffffff' && (
                  <button
                    type="button"
                    style={{ marginTop: 6, fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #25634b', background: '#e4f0ea', color: '#25634b', cursor: 'pointer' }}
                    onClick={() => onPatch({ textColor: '#ffffff' })}
                  >
                    Yazı rengini beyaz yap
                  </button>
                )}
              </label>

              <label>Kutu kenarlığı
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                  <button
                    type="button"
                    className={styles.swatch}
                    style={{ background: '#ffffff', border: '1px dashed #c9c5b8', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-pressed={!el.boxBorder}
                    onClick={() => onPatch({ boxBorder: null })}
                    title="Yok"
                  >
                    ✕
                  </button>
                  {BOX_BORDERS.map(({ c, label }) => (
                    <button
                      key={c}
                      type="button"
                      className={styles.swatch}
                      style={{ background: c, outline: el.boxBorder === c ? '2px solid #25634b' : undefined }}
                      aria-pressed={el.boxBorder === c}
                      onClick={() => onPatch({ boxBorder: c })}
                      title={label}
                      aria-label={`Kutu kenarlığı ${label}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(el.boxBorder || '') ? (el.boxBorder as string) : '#1f2a24'}
                    onChange={(e) => onPatch({ boxBorder: e.target.value })}
                    title="Başka bir kenarlık rengi seç"
                    aria-label="Kutu kenarlığı için başka renk"
                    style={{ width: 28, height: 28, padding: 0, border: '1px solid #c9c5b8', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                  />
                </div>
              </label>

              <label>Köşe biçimi
                <CustomSelect
                  value={String(el.boxRadius ?? 0)}
                  onChange={(v) => onPatch({ boxRadius: Number(v) as 0 | 12 | 999 })}
                  options={[
                    { value: '0', label: 'Keskin' },
                    { value: '12', label: 'Yuvarlak' },
                    { value: '999', label: 'Hap' },
                  ]}
                />
              </label>

              <label>Satır aralığı
                <CustomSelect
                  value={String(el.lineHeight ?? 1.3)}
                  onChange={(v) => onPatch({ lineHeight: Number(v) as 1 | 1.3 | 1.6 | 2 })}
                  options={[
                    { value: '1', label: '1' },
                    { value: '1.3', label: '1.3 (Varsayılan)' },
                    { value: '1.6', label: '1.6' },
                    { value: '2', label: '2' },
                  ]}
                />
              </label>

              <label>Harf aralığı
                <CustomSelect
                  value={String(el.letterSpacing ?? 0)}
                  onChange={(v) => onPatch({ letterSpacing: Number(v) as 0 | 0.05 | 0.1 })}
                  options={[
                    { value: '0', label: 'Normal' },
                    { value: '0.05', label: 'Geniş' },
                    { value: '0.1', label: 'Çok geniş' },
                  ]}
                />
              </label>
            </>
          )}

          {el.variant !== 'text' && (
            <label>Zemin rengi
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.swatch}
                    style={{ background: c }}
                    aria-pressed={el.color === c}
                    onClick={() => onPatch({ color: c })}
                    aria-label={`Not zemin rengi ${c}`}
                  />
                ))}
              </div>
            </label>
          )}
        </>
      )}
      {(el.type === 'rect' || el.type === 'ellipse' || el.type === 'poly') && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!el.fill} onChange={(e) => onPatch({ fill: e.target.checked ? `${el.color}33` : null })} /> İçi dolu
          </label>
          {el.fill && (
            <div role="group" aria-label="Dolgu rengi">
              <span style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Dolgu rengi</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Kenar renginin soluk tonu: "İçi dolu" işaretlenince gelen varsayılan */}
                <button
                  type="button"
                  className={styles.swatch}
                  style={{ background: `${el.color}33`, outline: el.fill === `${el.color}33` ? '2px solid #25634b' : undefined }}
                  aria-pressed={el.fill === `${el.color}33`}
                  onClick={() => onPatch({ fill: `${el.color}33` })}
                  title="Kenar renginin açık tonu"
                  aria-label="Dolgu: kenar renginin açık tonu"
                />
                {BOX_FILLS.map(({ c, label }) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.swatch}
                    style={{ background: c, outline: el.fill === c ? '2px solid #25634b' : undefined }}
                    aria-pressed={el.fill === c}
                    onClick={() => onPatch({ fill: c })}
                    title={label}
                    aria-label={`Dolgu ${label}`}
                  />
                ))}
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}/i.test(el.fill) ? el.fill.slice(0, 7) : '#ffffff'}
                  onChange={(e) => onPatch({ fill: e.target.value })}
                  title="Başka bir dolgu rengi seç"
                  aria-label="Dolgu için başka renk"
                  style={{ width: 28, height: 28, padding: 0, border: '1px solid #c9c5b8', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </>
      )}
      {el.type === 'widget' && el.kind === 'minitest' && (
        <label>Soru (soru bankasından)
          {questions.length === 0 ? <span className={styles.saveState}>Bankanızda soru yok. Önce Soru bankası sayfasından soru ekleyin.</span> : (
            <CustomSelect
              value={el.data.questionId || ''}
              onChange={(v) => onPatch({ data: { ...el.data, questionId: v } } as Partial<BoardEl>)}
              placeholder="Soru seçin"
              options={questions.map((q) => ({ value: q.id, label: q.body.length > 60 ? `${q.body.slice(0, 60)}…` : q.body, description: `Doğru: ${CHOICE_LETTERS[q.correct_index]}${q.subject ? ` · ${q.subject}` : ''}` }))}
            />
          )}
        </label>
      )}
      {el.type === 'widget' && el.kind === 'minitest' && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <input type="checkbox" checked={!!el.data.allowReveal} onChange={(e) => onPatch({ data: { ...el.data, allowReveal: e.target.checked } } as Partial<BoardEl>)} />
          <span>Öğrenci cevabı görebilsin<span className={styles.saveState} style={{ display: 'block' }}>Ödevde &quot;Cevabı göster&quot; düğmesi çıkar; cevabı açan bu sorudan puan alamaz. Sınav modunda çalışmaz.</span></span>
        </label>
      )}
      {el.type === 'widget' && el.kind === 'reveal' && (
        <label>Bağlı Mini Test
          {minitests.length === 0 ? <span className={styles.saveState}>Tahtada Mini Test yok.</span> : (
            <CustomSelect
              value={el.data.targetId || ''}
              onChange={(v) => onPatch({ data: { ...el.data, targetId: v } } as Partial<BoardEl>)}
              placeholder="Mini Test seçin"
              options={minitests.map((m, i) => {
                const q = questions.find((x) => x.id === m.data.questionId);
                return { value: m.id, label: `${i + 1}. Mini Test${q ? `: ${q.body.slice(0, 40)}` : ''}` };
              })}
            />
          )}
        </label>
      )}
      {el.type === 'widget' && el.kind === 'steps' && (() => {
        const stepsList = el.data.steps || [];
        const totalChars = stepsList.reduce((acc, s) => acc + s.length, 0);
        const atMaxSteps = stepsList.length >= 20;
        const atMaxChars = totalChars >= 3000;

        const updateStep = (idx: number, text: string) => {
          const currentLen = stepsList[idx]?.length || 0;
          const otherChars = totalChars - currentLen;
          const maxAllowed = Math.max(0, 3000 - otherChars);
          const clamped = text.slice(0, maxAllowed);
          const next = [...stepsList];
          next[idx] = clamped;
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        const moveStep = (from: number, to: number) => {
          if (to < 0 || to >= stepsList.length) return;
          const next = [...stepsList];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        const removeStep = (idx: number) => {
          const next = stepsList.filter((_, i) => i !== idx);
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        const addStep = () => {
          if (atMaxSteps || atMaxChars) return;
          const next = [...stepsList, ''];
          onPatch({ data: { ...el.data, steps: next } } as Partial<BoardEl>);
        };

        return (
          <>
            <label>
              Başlık
              <input
                type="text"
                value={el.data.title ?? ''}
                placeholder="Adım adım"
                maxLength={80}
                onChange={(e) => onPatch({ data: { ...el.data, title: e.target.value } } as Partial<BoardEl>)}
              />
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={Boolean(el.data.lastIsResult)}
                onChange={(e) => onPatch({ data: { ...el.data, lastIsResult: e.target.checked } } as Partial<BoardEl>)}
              />
              <span>Son adımı sonuç olarak göster</span>
            </label>

            <div className={styles.stepEditorSection}>
              <div className={styles.stepEditorHeaderRow}>
                <span className={styles.stepEditorTitle}>Adımlar</span>
                <span className={styles.stepStatsText}>
                  {stepsList.length} / 20 adım · {totalChars} / 3000 k.
                </span>
              </div>

              {stepsList.length === 0 ? (
                <p className={styles.hintText}>Henüz adım eklenmedi.</p>
              ) : (
                <div className={styles.stepEditorList}>
                  {stepsList.map((stepText, idx) => {
                    const isResultStep = Boolean(el.data.lastIsResult && idx === stepsList.length - 1);
                    return (
                      <div key={idx} className={styles.stepEditorRow}>
                        <div className={styles.stepRowHeader}>
                          <span className={styles.stepRowBadge}>
                            <b>{idx + 1}.</b>
                            {isResultStep && <span className={styles.stepRowResultTag}>Sonuç</span>}
                          </span>
                          <div className={styles.stepRowActions}>
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className={styles.stepActionBtn}
                                onClick={() => setMathStepIdx(mathStepIdx === idx ? null : idx)}
                                title="Formül ekle (∑)"
                                aria-label={`${idx + 1}. adıma formül ekle`}
                              >
                                <span style={{ fontWeight: 700, fontSize: 13 }}>∑</span>
                              </button>
                              {mathStepIdx === idx && (
                                <MathPalette
                                  style={{ right: 0, left: 'auto', top: '100%' }}
                                  onInsert={(tpl) => {
                                    const textarea = stepTextareaRefs.current[idx];
                                    if (textarea) {
                                      insertMathTemplate(textarea, tpl, (newVal) => {
                                        updateStep(idx, newVal);
                                      });
                                    } else {
                                      updateStep(idx, stepText ? `${stepText} $${tpl}$` : `$${tpl}$`);
                                    }
                                  }}
                                  onClose={() => setMathStepIdx(null)}
                                />
                              )}
                            </div>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => moveStep(idx, idx - 1)}
                              disabled={idx === 0}
                              title="Yukarı taşı"
                              aria-label={`${idx + 1}. adımı yukarı taşı`}
                            >
                              <ChevronUp size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => moveStep(idx, idx + 1)}
                              disabled={idx === stepsList.length - 1}
                              title="Aşağı taşı"
                              aria-label={`${idx + 1}. adımı aşağı taşı`}
                            >
                              <ChevronDown size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`${styles.stepActionBtn} ${styles.stepDeleteBtn}`}
                              onClick={() => removeStep(idx)}
                              title="Sil"
                              aria-label={`${idx + 1}. adımı sil`}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <textarea
                          ref={(el) => { stepTextareaRefs.current[idx] = el; }}
                          className={styles.stepTextarea}
                          rows={2}
                          value={stepText}
                          placeholder={`${idx + 1}. adımı yazın (satır sonu serbest)…`}
                          onChange={(e) => updateStep(idx, e.target.value)}
                        />
                        {hasMath(stepText) && (
                          <div style={{ marginTop: 4, padding: '4px 8px', background: '#f5faf7', border: '1px solid #d4e7dd', borderRadius: 6, fontSize: 13 }}>
                            <span style={{ fontSize: 11, color: '#25634b', fontWeight: 600, display: 'block', marginBottom: 2 }}>Önizleme:</span>
                            <MathText text={stepText} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                className={styles.addStepBtn}
                onClick={addStep}
                disabled={atMaxSteps || atMaxChars}
              >
                + Adım ekle
              </button>

              {(atMaxSteps || atMaxChars) && (
                <p className={styles.limitWarnText}>
                  {atMaxSteps
                    ? 'En fazla 20 adım eklenebilir.'
                    : 'Toplam 3000 karakter sınırına ulaşıldı.'}
                </p>
              )}
            </div>
          </>
        );
      })()}
      {el.type === 'widget' && el.kind === 'timer' && (
        <fieldset className={styles.timeField}>
          <legend>Geri sayım süresi</legend>
          <div className={styles.timeInputs}>
            <label>Dakika
              <input type="number" min={0} max={60} inputMode="numeric" value={Math.floor((el.data.seconds ?? 0) / 60)}
                onChange={(e) => { const m = Math.max(0, Math.min(60, Math.floor(Number(e.target.value) || 0))); onPatch({ data: { ...el.data, seconds: Math.min(3600, m * 60 + ((el.data.seconds ?? 0) % 60)) } } as Partial<BoardEl>); }} />
            </label>
            <label>Saniye
              <input type="number" min={0} max={59} inputMode="numeric" value={(el.data.seconds ?? 0) % 60}
                onChange={(e) => { const sec = Math.max(0, Math.min(59, Math.floor(Number(e.target.value) || 0))); onPatch({ data: { ...el.data, seconds: Math.min(3600, Math.floor((el.data.seconds ?? 0) / 60) * 60 + sec) } } as Partial<BoardEl>); }} />
            </label>
          </div>
          <div className={styles.pageTools}>
            {[1, 3, 5, 10].map((m) => (
              <button key={m} type="button" className={styles.tool} aria-pressed={(el.data.seconds ?? 0) === m * 60} onClick={() => onPatch({ data: { ...el.data, seconds: m * 60 } } as Partial<BoardEl>)}>{m} dk</button>
            ))}
          </div>
          <p className={styles.hintText}>Dakika ve saniye 0 ise kronometre olur (ileri sayar). En fazla 60 dakika.</p>
        </fieldset>
      )}
      {el.type === 'widget' && el.kind === 'match' && (
        <MatchEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'audio' && (
        <AudioEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'video' && (
        <VideoEditor key={el.id} data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'spinner' && (
        <SpinnerEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'dice' && (
        <DiceEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'order' && (
        <OrderEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'sort' && (
        <SortEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'blanks' && (
        <BlanksEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'label' && (
        <LabelEditor data={el.data} boardImages={boardImages || []} imageUrls={imageUrls || {}} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      {el.type === 'widget' && el.kind === 'fraction' && (
        <FractionEditor data={el.data} onChange={(data) => onPatch({ data } as Partial<BoardEl>)} />
      )}
      <div className={styles.pageTools}>
        {onConfigure && (
          <button type="button" className={styles.tool} onClick={onConfigure} title="Şekil ayarları">
            <Sliders size={18} aria-hidden="true" /> Ayarlar
          </button>
        )}
        {onSaveToLibrary && (
          <button type="button" className={styles.tool} onClick={onSaveToLibrary} title="Kütüphaneye kaydet">
            <Bookmark size={18} aria-hidden="true" /> Kütüphaneye kaydet
          </button>
        )}
        {el.type === 'image' && onSaveImage && (
          <button type="button" className={styles.tool} onClick={onSaveImage} disabled={busy} title="Bu resmi Dosyalarım'a kaydet; diğer tahtalarda da kullanılabilir">
            <Bookmark size={18} aria-hidden="true" /> Dosyalarıma kaydet
          </button>
        )}
        <button type="button" className={styles.tool} onClick={() => onOrder('front')}>Öne getir</button>
        <button type="button" className={styles.tool} onClick={() => onOrder('back')}>Arkaya gönder</button>
        {onLock && (
          <button type="button" className={styles.tool} onClick={onLock}>
            <Lock size={16} aria-hidden="true" /> Kilitle
          </button>
        )}
        <button type="button" className={styles.tool} onClick={onDelete} style={{ color: '#a3283a' }}><Trash2 size={18} aria-hidden="true" /> Sil</button>
      </div>
      {el.type === 'widget' && <p className={styles.hintText}>Parçanın düğmeleri “Seç” aracında da çalışır; taşımak için düğme olmayan yerinden tutup sürükleyin.</p>}
    </section>
  );
}

export function MultiSelectionPanel({
  elements,
  onDuplicate,
  onOrder,
  onDelete,
  onGroup,
  onUngroup,
  onLock,
  onAlign,
  onDistribute,
  onConfigure,
  onSaveToLibrary,
}: {
  elements: BoardEl[];
  onDuplicate: () => void;
  onOrder: (dir: 'front' | 'back') => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLock?: () => void;
  onAlign?: (mode: AlignMode) => void;
  onDistribute?: (axis: DistributeAxis) => void;
  onConfigure?: () => void;
  onSaveToLibrary?: () => void;
}) {
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
    <section className={styles.panel}>
      <h3>{allSameGroup ? 'Grup' : 'Çoklu seçim'}</h3>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280' }}>
        {elements.length} öğe seçili
      </p>
      <div className={styles.pageTools} style={{ flexWrap: 'wrap', gap: '8px' }}>
        {canConfigure && (
          <button type="button" className={styles.tool} onClick={onConfigure} title="Şekil ayarları">
            <Sliders size={16} aria-hidden="true" /> Ayarlar
          </button>
        )}
        {canGroup && (
          <button type="button" className={styles.tool} onClick={onGroup} title="Grupla (Ctrl+G)">
            <Component size={16} aria-hidden="true" /> Grupla
          </button>
        )}
        {canUngroup && (
          <button type="button" className={styles.tool} onClick={onUngroup} title="Grubu çöz (Ctrl+Shift+G)">
            <Layers size={16} aria-hidden="true" /> Grubu çöz
          </button>
        )}
        <button type="button" className={styles.tool} onClick={onDuplicate} title="Çoğalt (Ctrl+D)">
          <Copy size={16} aria-hidden="true" /> Çoğalt
        </button>
        {onSaveToLibrary && (
          <button type="button" className={styles.tool} onClick={onSaveToLibrary} title="Kütüphaneye kaydet">
            <Bookmark size={16} aria-hidden="true" /> Kütüphaneye kaydet
          </button>
        )}
        <button type="button" className={styles.tool} onClick={() => onOrder('front')} title="En öne getir">
          Öne getir
        </button>
        <button type="button" className={styles.tool} onClick={() => onOrder('back')} title="En arkaya gönder">
          Arkaya gönder
        </button>
        {onLock && (
          <button type="button" className={styles.tool} onClick={onLock} title="Seçili öğeleri kilitle">
            <Lock size={16} aria-hidden="true" /> Kilitle
          </button>
        )}
        <button type="button" className={styles.tool} onClick={onDelete} style={{ color: '#a3283a' }} title="Sil (Delete)">
          <Trash2 size={16} aria-hidden="true" /> Sil
        </button>
      </div>
      {onAlign && (
        <div className={styles.propGroup} style={{ marginTop: 12 }}>
          <span className={styles.propLabel}>Hizala</span>
          <div className={styles.pageTools} style={{ flexWrap: 'wrap', gap: '6px' }}>
            <button type="button" className={styles.tool} onClick={() => onAlign('left')} title="Sola hizala" aria-label="Sola hizala"><AlignLeft size={16} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => onAlign('center')} title="Yatay ortala" aria-label="Yatay ortala"><AlignCenter size={16} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => onAlign('right')} title="Sağa hizala" aria-label="Sağa hizala"><AlignRight size={16} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => onAlign('top')} title="Üste hizala" aria-label="Üste hizala"><AlignTop size={16} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => onAlign('middle')} title="Dikey ortala" aria-label="Dikey ortala"><AlignMiddle size={16} aria-hidden="true" /></button>
            <button type="button" className={styles.tool} onClick={() => onAlign('bottom')} title="Alta hizala" aria-label="Alta hizala"><AlignBottom size={16} aria-hidden="true" /></button>
            {onDistribute && elements.length >= 3 && (
              <>
                <button type="button" className={styles.tool} onClick={() => onDistribute('horizontal')} title="Yatay eşit dağıt" aria-label="Yatay eşit dağıt"><DistributeH size={16} aria-hidden="true" /></button>
                <button type="button" className={styles.tool} onClick={() => onDistribute('vertical')} title="Dikey eşit dağıt" aria-label="Dikey eşit dağıt"><DistributeV size={16} aria-hidden="true" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// --------------------------------------------------------
// Medya çekmecesi: Dosyalarım ve ortak kütüphanedeki resimler
// --------------------------------------------------------
export function MediaDrawer({
  onInsert,
  onInsertShape,
  onUpload,
  busy,
  userItems,
  schoolItems,
  isLoadingUserItems,
  userItemsError,
  onReloadUserItems,
  onEditItem,
  onDeleteItem,
  onToggleSchoolShare,
  onCopySchoolItem,
  schoolSharingEnabled,
  only,
}: {
  /** Yalnızca resimler ya da yalnızca şekiller (sol panelin ayrı sekmeleri); verilmezse üçü de sekmeli */
  only?: 'images' | 'shapes';
  onInsert: (m: MediaItem) => void;
  onInsertShape?: (shapeId: string) => void;
  onUpload?: () => void;
  busy: boolean;
  userItems?: LibraryItem[];
  schoolItems?: LibraryItem[];
  isLoadingUserItems?: boolean;
  userItemsError?: string | null;
  onReloadUserItems?: () => void;
  onEditItem?: (item: LibraryItem, field: 'name' | 'category') => void;
  onDeleteItem?: (item: LibraryItem) => void;
  onToggleSchoolShare?: (item: LibraryItem) => void;
  onCopySchoolItem?: (item: LibraryItem) => void;
  schoolSharingEnabled?: boolean;
}) {
  // Kaynak: resimler (Dosyalarım, Kütüphane) ya da şekiller (kaydedilenler üstte, hazır şekiller altta)
  const [source, setSource] = useState<'mine' | 'library' | 'shapes'>(only === 'shapes' ? 'shapes' : 'mine');
  const isShapeSource = source === 'shapes';
  const [items, setItems] = useState<Record<string, MediaItem[] | null>>({ mine: null, library: null });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const sharedImages = items.library || [];
  const localImages = BUILTIN_IMAGES.filter((image) => !sharedImages.some((shared) => shared.name.replace(/\.png$/i, '') === image.name));
  const list = isShapeSource ? null : source === 'library' ? [...localImages, ...sharedImages] : items[source];

  useEffect(() => {
    if (isShapeSource || items[source]) return;
    let alive = true;
    (async () => {
      let out: MediaItem[] = [];
      if (source === 'mine') {
        const r = await listMyFiles();
        if (r.ok) out = r.data.filter((f) => BOARD_IMAGE_TYPES.includes(f.mime)).map((f) => ({ key: f.id, bucket: FILES_BUCKET, path: f.path, name: f.name }));
      } else if (source === 'library') {
        const r = await listLibrary();
        if (r.ok) out = r.data.filter((f) => BOARD_IMAGE_TYPES.includes(f.mime)).map((f) => ({ key: f.id, bucket: LIBRARY_BUCKET, path: f.path, name: libraryFileName(f) }));
      }
      if (!alive) return;
      // Adresler listeden önce alınır: liste yazılınca bu etki yeniden çalışır ve "alive" kapanır;
      // adresler sonradan gelseydi atılır, küçük resimler boş kalırdı.
      const u = await boardImageUrls(out.slice(0, 60));
      if (!alive) return;
      setUrls((prev) => ({ ...prev, ...u }));
      setItems((prev) => ({ ...prev, [source]: out }));
    })();
    return () => { alive = false; };
  }, [source, items, isShapeSource]);

  return (
    <section className={styles.panel} aria-label="Medya çekmecesi">
      {!only && <h3>Medya ve Kütüphane</h3>}
      {only !== 'shapes' && (
      <div className={styles.pageTools}>
        <button type="button" className={styles.tool} aria-pressed={source === 'mine'} onClick={() => setSource('mine')}>Dosyalarım</button>
        <button type="button" className={styles.tool} aria-pressed={source === 'library'} onClick={() => setSource('library')}>Kütüphane</button>
        {!only && <button type="button" className={styles.tool} aria-pressed={source === 'shapes'} onClick={() => setSource('shapes')}>Şekiller</button>}
        {!isShapeSource && onUpload && (
          <button type="button" className={styles.tool} onClick={onUpload} disabled={busy} title="Bilgisayardan yeni görsel yükle">
            <Upload size={16} aria-hidden="true" /> Yükle
          </button>
        )}
      </div>
      )}
      {isShapeSource ? (
        <ShapeLibraryPanel
          onInsert={(shapeId) => onInsertShape?.(shapeId)}
          userItems={userItems}
          schoolItems={schoolItems}
          isLoadingUserItems={isLoadingUserItems}
          userItemsError={userItemsError}
          onReloadUserItems={onReloadUserItems}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          onToggleSchoolShare={onToggleSchoolShare}
          onCopySchoolItem={onCopySchoolItem}
          schoolSharingEnabled={schoolSharingEnabled}
        />
      ) : !list ? <Spinner label="Yükleniyor…" /> : list.length === 0 ? <p className={styles.saveState}>Burada resim yok.</p> : (
        <div className={styles.mediaGrid}>
          {list.map((m) => (
            <button
              key={m.key}
              type="button"
              className={styles.mediaItem}
              draggable
              disabled={busy}
              onDragStart={(e) => {
                if (m.shapeId) e.dataTransfer.setData('application/x-board-shape', JSON.stringify({ id: m.shapeId }));
                else e.dataTransfer.setData('application/x-board-media', JSON.stringify({ bucket: m.bucket, path: m.path, name: m.name }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => m.shapeId ? onInsertShape?.(m.shapeId) : onInsert(m)}
              title={`${m.name} — tahtaya sürükleyin ya da basın`}
            >
              {m.thumbnail || urls[`${m.bucket}/${m.path}`]
                // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
                ? <img src={m.thumbnail || urls[`${m.bucket}/${m.path}`]} alt="" style={m.thumbnail ? { objectFit: 'contain' } : undefined} />
                : <span style={{ aspectRatio: '4 / 3', display: 'block', background: '#f0eee7', borderRadius: 6 }} />}
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// --------------------------------------------------------
// Eşleştirme çiftleri
// --------------------------------------------------------
function MatchEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const pairs = data.pairs?.length ? data.pairs : [{ a: '', b: '' }, { a: '', b: '' }];
  const set = (i: number, side: 'a' | 'b', v: string) => onChange({ ...data, pairs: pairs.map((p, j) => (j === i ? { ...p, [side]: v.slice(0, 120) } : p)) });
  const ready = pairs.filter((p) => p.a.trim() && p.b.trim()).length;
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Eşleştirme" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <div className={styles.stepEditorSection}>
        <div className={styles.stepEditorHeaderRow}>
          <span className={styles.stepEditorTitle}>Çiftler</span>
          <span className={styles.stepStatsText}>{ready} hazır · en çok {MATCH_MAX_PAIRS}</span>
        </div>
        <div className={styles.stepEditorList}>
          {pairs.map((p, i) => (
            <div key={i} className={styles.stepEditorRow}>
              <div className={styles.stepRowHeader}>
                <span className={styles.stepRowBadge}><b>{i + 1}.</b></span>
                <div className={styles.stepRowActions}>
                  <button type="button" className={`${styles.stepActionBtn} ${styles.stepDeleteBtn}`} onClick={() => onChange({ ...data, pairs: pairs.filter((_, j) => j !== i) })} disabled={pairs.length <= 2} title="Sil" aria-label={`${i + 1}. çifti sil`}>
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <input type="text" value={p.a} placeholder="Sol (ör. 3 × 4)" onChange={(e) => set(i, 'a', e.target.value)} aria-label={`${i + 1}. çift, sol`} />
              <input type="text" value={p.b} placeholder="Eşi (ör. 12)" onChange={(e) => set(i, 'b', e.target.value)} aria-label={`${i + 1}. çift, eşi`} />
            </div>
          ))}
        </div>
        <button type="button" className={styles.addStepBtn} onClick={() => onChange({ ...data, pairs: [...pairs, { a: '', b: '' }] })} disabled={pairs.length >= MATCH_MAX_PAIRS}>+ Çift ekle</button>
        <p className={styles.hintText}>Öğrenciye sağdaki kartlar karışık gelir; sürükleyip (ya da dokunup) eşinin yanına bırakır. Formül için $…$ kullanılabilir.</p>
      </div>
    </>
  );
}

// --------------------------------------------------------
// Çark dilimleri
// --------------------------------------------------------
function SpinnerEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const stored = normalizeSlices(data.slices);
  const slices = stored.length >= SPINNER_MIN_SLICES ? stored : [...stored, ...Array(SPINNER_MIN_SLICES - stored.length).fill('')];
  const set = (i: number, v: string) => onChange({ ...data, slices: slices.map((s, j) => (j === i ? v.slice(0, SPINNER_SLICE_MAX_CHARS) : s)) });
  const ready = slices.filter((s) => s.trim()).length;
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Çark" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <div className={styles.stepEditorSection}>
        <div className={styles.stepEditorHeaderRow}>
          <span className={styles.stepEditorTitle}>Dilimler</span>
          <span className={styles.stepStatsText}>{ready} hazır · en çok {SPINNER_MAX_SLICES}</span>
        </div>
        <div className={styles.stepEditorList}>
          {slices.map((s, i) => (
            <div key={i} className={styles.stepEditorRow}>
              <div className={styles.stepRowHeader}>
                <span className={styles.stepRowBadge}><b>{i + 1}.</b></span>
                <div className={styles.stepRowActions}>
                  <button type="button" className={`${styles.stepActionBtn} ${styles.stepDeleteBtn}`} onClick={() => onChange({ ...data, slices: slices.filter((_, j) => j !== i) })} disabled={slices.length <= SPINNER_MIN_SLICES} title="Sil" aria-label={`${i + 1}. dilimi sil`}>
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <input type="text" value={s} placeholder="Ör. Ayşe ya da 5 puan" maxLength={SPINNER_SLICE_MAX_CHARS} onChange={(e) => set(i, e.target.value)} aria-label={`${i + 1}. dilim`} />
            </div>
          ))}
        </div>
        <button type="button" className={styles.addStepBtn} onClick={() => onChange({ ...data, slices: [...slices, ''] })} disabled={slices.length >= SPINNER_MAX_SLICES}>+ Dilim ekle</button>
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <input type="checkbox" checked={data.removeWinner === true} onChange={(e) => onChange({ ...data, removeWinner: e.target.checked })} />
        <span>&quot;Çıkanı kaldır&quot; açık başlasın<span className={styles.saveState} style={{ display: 'block' }}>Çıkan dilim yalnızca o derste gizlenir; Sıfırla hepsini geri getirir. Tahtadaki dilimler silinmez.</span></span>
      </label>
    </>
  );
}

// --------------------------------------------------------
// Zar sayısı
// --------------------------------------------------------
function DiceEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const count = normalizeDiceCount(data.dice);
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Zar" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <fieldset className={styles.timeField}>
        <legend>Zar sayısı</legend>
        <div className={styles.pageTools}>
          {Array.from({ length: DICE_MAX }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className={styles.tool} aria-pressed={count === n} onClick={() => onChange({ ...data, dice: n })}>{n} zar</button>
          ))}
        </div>
        <p className={styles.hintText}>Birden çok zarda toplam da yazılır.</p>
      </fieldset>
    </>
  );
}

// --------------------------------------------------------
// Sesli not: mikrofondan kayıt (en çok 3 dk) ya da ses dosyası
// --------------------------------------------------------
function pickRecorderType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
}

function AudioEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Panel kapanırsa kayıt ve mikrofon kapanır
  useEffect(() => () => { const r = rec.current; if (r && r.state !== 'inactive') { r.onstop = null; r.stop(); r.stream.getTracks().forEach((t) => t.stop()); } }, []);
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => {
      const sec = (Date.now() - startedAt.current) / 1000;
      setElapsed(sec);
      if (sec >= AUDIO_MAX_SECONDS) rec.current?.stop();
    }, 250);
    return () => window.clearInterval(t);
  }, [recording]);

  const upload = async (blob: Blob, name: string, seconds?: number) => {
    setBusy(true);
    setError(null);
    const res = await uploadBoardAudio(blob, name, seconds);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onChange({ ...data, audio: res.data });
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Bu tarayıcı ses kaydını desteklemiyor. Ses dosyası yükleyebilirsiniz.'); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Mikrofona izin verilmedi. Tarayıcının adres çubuğundaki mikrofon simgesinden izin verebilirsiniz.');
      return;
    }
    const type = pickRecorderType();
    const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 64000 } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const seconds = (Date.now() - startedAt.current) / 1000;
      const blob = new Blob(chunks, { type: (r.mimeType || type || 'audio/webm').split(';')[0] });
      if (blob.size) void upload(blob, 'kayit', seconds);
    };
    rec.current = r;
    startedAt.current = Date.now();
    setElapsed(0);
    r.start(1000);
    setRecording(true);
  };
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Sesli not" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <div className={styles.pageTools}>
        {recording ? (
          <button type="button" className={styles.tool} onClick={() => rec.current?.stop()}><Square size={16} aria-hidden="true" /> Durdur · {fmt(elapsed)}</button>
        ) : (
          <button type="button" className={styles.tool} onClick={start} disabled={busy}><Mic size={16} aria-hidden="true" /> {data.audio ? 'Yeniden kaydet' : 'Kaydet'}</button>
        )}
        <button type="button" className={styles.tool} onClick={() => fileRef.current?.click()} disabled={busy || recording}><Upload size={16} aria-hidden="true" /> Dosya</button>
        <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f, f.name); }} />
      </div>
      {busy && <p className={styles.hintText} role="status">Yükleniyor…</p>}
      {error && <p className={styles.limitWarnText} role="alert">{error}</p>}
      <p className={styles.hintText}>{recording ? `Kayıt sürüyor; ${fmt(AUDIO_MAX_SECONDS)} olunca kendiliğinden durur.` : data.audio ? 'Ses eklendi. Tahtada oynat düğmesiyle dinlenir.' : 'En çok 3 dakika ya da 5 MB. Ödeve gönderilince ses de öğrenciye gider.'}</p>
    </>
  );
}

function VideoEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const current = data.video ? `https://youtu.be/${data.video.id}${data.video.start ? `?t=${data.video.start}` : ''}` : '';
  const [text, setText] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const apply = (value: string) => {
    if (!value.trim()) { setError(null); if (data.video) onChange({ ...data, video: undefined }); return; }
    const v = parseVideoUrl(value);
    if (!v) { setError('YouTube bağlantısı tanınmadı. Videonun adres çubuğundaki ya da Paylaş düğmesindeki bağlantıyı yapıştırın.'); return; }
    setError(null);
    if (v.id !== data.video?.id || v.start !== data.video?.start) onChange({ ...data, video: v });
  };
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Video" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <label>YouTube bağlantısı
        <input
          type="url"
          inputMode="url"
          value={text}
          placeholder="https://www.youtube.com/watch?v=…"
          onChange={(e) => { setText(e.target.value); setError(null); }}
          onBlur={(e) => apply(e.target.value)}
          onPaste={(e) => { const v = e.clipboardData.getData('text'); if (v) { e.preventDefault(); setText(v.trim()); apply(v); } }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(e.currentTarget.value); } }}
        />
      </label>
      {error && <p className={styles.limitWarnText} role="alert">{error}</p>}
      <p className={styles.hintText}>
        {data.video
          ? 'Video eklendi. Tahtada Oynat düğmesiyle açılır; bağlantıda başlangıç süresi (?t=90) varsa oradan başlar.'
          : 'Bağlantıyı yapıştırın. Video dosyası yüklenmez, kotanızdan yer harcamaz. Oynat düğmesine basılana kadar YouTube’a bağlanılmaz.'}
      </p>
    </>
  );
}


function OrderEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const items = data.orderItems?.length ? data.orderItems : ['1. Adım', '2. Adım', '3. Adım'];
  const update = (next: string[]) => onChange({ ...data, orderItems: next.slice(0, ORDER_MAX) });
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Sıralama" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <span className={styles.propLabel}>Doğru sıra ({ORDER_MIN}–{ORDER_MAX} madde)</span>
      {items.map((item, i) => (
        <div key={i} className={styles.stepEditRow}>
          <span className={styles.stepEditNum}>{i + 1}.</span>
          <input
            type="text"
            value={item}
            maxLength={120}
            placeholder={`${i + 1}. madde`}
            onChange={(e) => update(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {items.length > ORDER_MIN && (
            <button type="button" className={styles.tool} onClick={() => update(items.filter((_, j) => j !== i))} aria-label={`${i + 1}. maddeyi sil`}>×</button>
          )}
        </div>
      ))}
      {items.length < ORDER_MAX && (
        <button type="button" className={styles.tool} onClick={() => update([...items, `${items.length + 1}. Madde`])}>+ Madde ekle</button>
      )}
      <p className={styles.hintText}>Öğrenciye karışık sırada gelir; sürükleyerek veya ok düğmeleriyle sıralar.</p>
    </>
  );
}

function SortEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const groups = data.sortGroups?.length ? data.sortGroups : [{ title: '1. Grup', items: ['Öğe 1'] }, { title: '2. Grup', items: ['Öğe 2'] }];
  const update = (next: { title: string; items: string[] }[]) => onChange({ ...data, sortGroups: next.slice(0, SORT_MAX_GROUPS) });
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Gruplara Ayırma" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      {groups.map((g, gi) => (
        <div key={gi} className={styles.propGroup}>
          <div className={styles.stepEditRow}>
            <input
              type="text"
              value={g.title}
              maxLength={60}
              placeholder={`${gi + 1}. grup başlığı`}
              onChange={(e) => update(groups.map((gr, j) => (j === gi ? { ...gr, title: e.target.value } : gr)))}
            />
            {groups.length > SORT_MIN_GROUPS && (
              <button type="button" className={styles.tool} onClick={() => update(groups.filter((_, j) => j !== gi))} aria-label={`${gi + 1}. grubu sil`}>×</button>
            )}
          </div>
          <textarea
            rows={2}
            value={g.items.join('\n')}
            placeholder="Her satıra bir madde yazın"
            onChange={(e) => update(groups.map((gr, j) => (j === gi ? { ...gr, items: e.target.value.split('\n') } : gr)))}
          />
        </div>
      ))}
      {groups.length < SORT_MAX_GROUPS && (
        <button type="button" className={styles.tool} onClick={() => update([...groups, { title: `${groups.length + 1}. Grup`, items: ['Yeni madde'] }])}>+ Grup ekle</button>
      )}
      <p className={styles.hintText}>Her grubun maddelerini alt satırlara yazın (2–4 grup).</p>
    </>
  );
}

function BlanksEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const distractors = data.blanksDistractors || [];
  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Boşluk Doldurma" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <label>Metin ([kelime] boşluk olur)
        <textarea
          rows={4}
          value={data.blanksText ?? ''}
          placeholder="Örnek: Türkiye’nin başkenti [Ankara]’dır."
          onChange={(e) => onChange({ ...data, blanksText: e.target.value })}
        />
      </label>
      <span className={styles.propLabel}>Çeldirici kelimeler (0–{BLANKS_MAX_DISTRACTORS})</span>
      {distractors.map((d, i) => (
        <div key={i} className={styles.stepEditRow}>
          <input
            type="text"
            value={d}
            maxLength={40}
            placeholder={`${i + 1}. çeldirici`}
            onChange={(e) => onChange({ ...data, blanksDistractors: distractors.map((x, j) => (j === i ? e.target.value : x)) })}
          />
          <button type="button" className={styles.tool} onClick={() => onChange({ ...data, blanksDistractors: distractors.filter((_, j) => j !== i) })} aria-label="Çeldiriciyi sil">×</button>
        </div>
      ))}
      {distractors.length < BLANKS_MAX_DISTRACTORS && (
        <button type="button" className={styles.tool} onClick={() => onChange({ ...data, blanksDistractors: [...distractors, ''] })}>+ Çeldirici ekle</button>
      )}
    </>
  );
}

function LabelEditor({
  data,
  boardImages,
  imageUrls,
  onChange,
}: {
  data: WidgetData;
  boardImages: { bucket: string; path: string }[];
  imageUrls: Record<string, string>;
  onChange: (data: WidgetData) => void;
}) {
  const points = data.labelPoints || [];
  const selectedKey = data.labelImage ? imageKey(data.labelImage) : '';
  const selectedUrl = selectedKey ? imageUrls[selectedKey] : undefined;

  const imgOptions = [
    { value: '', label: 'Tahtadan görsel seçin…' },
    ...boardImages.map((img, i) => {
      const k = imageKey(img);
      const name = img.path.split('/').pop() || `Görsel ${i + 1}`;
      return { value: k, label: name };
    }),
  ];

  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Görsel Etiketleme" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <label>Tahtadaki görsel
        <CustomSelect
          value={selectedKey}
          options={imgOptions}
          onChange={(val) => {
            const found = boardImages.find((img) => imageKey(img) === val);
            onChange({ ...data, labelImage: found ? { bucket: found.bucket, path: found.path } : undefined });
          }}
        />
      </label>
      {selectedUrl && (
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #d5d0c4', background: '#faf8f3', cursor: 'crosshair' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedUrl}
            alt="Nokta eklemek için tıklayın"
            style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'contain' }}
            onClick={(e) => {
              if (points.length >= 12) return;
              const r = e.currentTarget.getBoundingClientRect();
              const x = Math.round(Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100)));
              const y = Math.round(Math.max(5, Math.min(95, ((e.clientY - r.top) / r.height) * 100)));
              const next = [...points, { id: `pt-${Date.now()}-${points.length}`, x, y, text: `Etiket ${points.length + 1}` }];
              onChange({ ...data, labelPoints: next });
            }}
          />
          {points.map((pt, i) => (
            <span
              key={pt.id}
              style={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#1f5c41',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      )}
      {points.map((pt, i) => (
        <div key={pt.id} className={styles.stepEditRow}>
          <span className={styles.stepEditNum}>{i + 1}.</span>
          <input
            type="text"
            value={pt.text}
            maxLength={50}
            placeholder={`${i + 1}. etiket`}
            onChange={(e) => onChange({ ...data, labelPoints: points.map((p, j) => (j === i ? { ...p, text: e.target.value } : p)) })}
          />
          <button type="button" className={styles.tool} onClick={() => onChange({ ...data, labelPoints: points.filter((_, j) => j !== i) })} aria-label={`${i + 1}. noktayı sil`}>×</button>
        </div>
      ))}
      <p className={styles.hintText}>Önce tahtadaki bir görseli seçin, sonra önizlemenin üzerine tıklayarak numaralı nokta ekleyin.</p>
    </>
  );
}

function FractionEditor({ data, onChange }: { data: WidgetData; onChange: (data: WidgetData) => void }) {
  const shape = normalizeFractionShape(data.fractionShape);
  const parts = normalizeFractionParts(data.fractionParts);
  const den = data.fractionDen ?? parts;
  const num = data.fractionNum ?? 1;
  const showFraction = data.showFraction !== false;

  return (
    <>
      <label>Başlık
        <input type="text" value={data.title ?? ''} placeholder="Kesir Boyama" maxLength={80} onChange={(e) => onChange({ ...data, title: e.target.value })} />
      </label>
      <label>Şekil
        <CustomSelect
          value={shape}
          options={[
            { value: 'circle', label: 'Daire' },
            { value: 'strip', label: 'Dikdörtgen şerit' },
            { value: 'grid', label: 'Kare ızgara' },
          ]}
          onChange={(v) => onChange({ ...data, fractionShape: v as FractionShape })}
        />
      </label>
      <label>Parça sayısı ({FRACTION_MIN_PARTS}–{FRACTION_MAX_PARTS})
        <input
          type="number"
          min={FRACTION_MIN_PARTS}
          max={FRACTION_MAX_PARTS}
          value={parts}
          onChange={(e) => onChange({ ...data, fractionParts: normalizeFractionParts(Number(e.target.value)) })}
        />
      </label>
      <div className={styles.stepEditRow}>
        <label style={{ flex: 1 }}>Hedef pay
          <input
            type="number"
            min={0}
            max={den}
            value={num}
            onChange={(e) => onChange({ ...data, fractionNum: Math.max(0, Math.min(den, Math.round(Number(e.target.value) || 0))) })}
          />
        </label>
        <label style={{ flex: 1 }}>Hedef payda
          <input
            type="number"
            min={1}
            max={24}
            value={den}
            onChange={(e) => {
              const nextDen = Math.max(1, Math.min(24, Math.round(Number(e.target.value) || 1)));
              onChange({ ...data, fractionDen: nextDen, fractionNum: Math.min(num, nextDen) });
            }}
          />
        </label>
      </div>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={showFraction}
          onChange={(e) => onChange({ ...data, showFraction: e.target.checked })}
        />
        <span>Hedef kesri göster</span>
      </label>
    </>
  );
}
