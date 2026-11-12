'use client';

// Tahta düzenleyicinin yan panelleri: seçili öğe ayarları, çoklu seçim ve medya çekmecesi.
// (BoardEditor.tsx'ten ayrıldı.)

import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Bookmark, ChevronDown, ChevronUp, Component, Copy, Italic, Layers, Sliders,
  Mic, Square, Trash2, Underline, Upload,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { AUDIO_MAX_SECONDS, BOARD_IMAGE_TYPES, BoardEl, boardImageUrls, MATCH_MAX_PAIRS, uploadBoardAudio, WIDGET_LABEL, WidgetData, WidgetEl } from '../../lib/boardData';
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
export function SelectionPanel({ el, questions, minitests, onPatch, onDelete, onOrder, onConfigure, onSaveToLibrary, onSaveImage, busy }: {
  el: BoardEl;
  questions: QuestionRow[];
  minitests: WidgetEl[];
  onPatch: (patch: Partial<BoardEl>) => void;
  onDelete: () => void;
  onOrder: (dir: 'front' | 'back') => void;
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
  onConfigure,
  onSaveToLibrary,
}: {
  elements: BoardEl[];
  onDuplicate: () => void;
  onOrder: (dir: 'front' | 'back') => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
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
        <button type="button" className={styles.tool} onClick={onDelete} style={{ color: '#a3283a' }} title="Sil (Delete)">
          <Trash2 size={16} aria-hidden="true" /> Sil
        </button>
      </div>
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
