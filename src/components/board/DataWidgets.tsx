'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  normalizeBarCategories,
  normalizeBarMode,
  normalizeBarOrientation,
  normalizeBarQuestions,
  normalizeBarStep,
  normalizeNumGridHidden,
  normalizeNumGridRange,
  normalizeNumGridRule,
  normalizeTallyItems,
  normalizeTallyMode,
  NumGridRule,
  TALLY_MAX_COUNT,
  WidgetEl,
} from '../../lib/boardData';
import styles from './DataWidgets.module.css';
import bs from './Board.module.css';

const BAR_PALETTE = [
  '#25634b',
  '#2b7a9b',
  '#d97706',
  '#7c3aed',
  '#c2416c',
  '#0f766e',
  '#b45309',
  '#4f46e5',
];

const DEFAULT_BAR_CATS = [
  { label: 'Elma', value: 4 },
  { label: 'Armut', value: 6 },
  { label: 'Muz', value: 3 },
];

const DEFAULT_TALLY_ITEMS = [
  { label: 'Kırmızı', count: 7 },
  { label: 'Mavi', count: 5 },
  { label: 'Yeşil', count: 9 },
];

function snapToStep(raw: number, step: number, maxVal: number): number {
  const clamped = Math.max(0, Math.min(maxVal, raw));
  const snapped = Math.round(clamped / step) * step;
  return Math.max(0, Math.min(maxVal, snapped));
}

function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

// ============================================================================
// 1. Sütun Grafiği (kind: 'bar')
// ============================================================================

export function BarChartWidget({ el }: { el: WidgetEl }) {
  const title = el.data.title?.trim() || 'Sütun Grafiği';
  const mode = normalizeBarMode(el.data.barMode);
  const orientation = normalizeBarOrientation(el.data.barOrientation);
  const step = normalizeBarStep(el.data.barStep);
  const xAxisLabel = el.data.barXAxis?.trim() || '';
  const yAxisLabel = el.data.barYAxis?.trim() || '';

  const categories = useMemo(() => {
    const list = normalizeBarCategories(el.data.barCategories);
    return list.length >= 2 ? list : DEFAULT_BAR_CATS;
  }, [el.data.barCategories]);

  const questions = useMemo(() => {
    const list = normalizeBarQuestions(el.data.barQuestions);
    return list.length > 0
      ? list
      : [{ prompt: 'En yüksek değer hangi kategoride?', answer: '' }];
  }, [el.data.barQuestions]);

  const maxAxis = useMemo(() => {
    const peak = Math.max(step * 4, ...categories.map((c) => c.value));
    const stepsNeeded = Math.max(4, Math.ceil(peak / step) + 1);
    return stepsNeeded * step;
  }, [categories, step]);

  const ticks = useMemo(() => {
    const count = Math.round(maxAxis / step);
    // Çok sık çizgi olmasın (en fazla ~10 ana çizgi)
    const tickStride = count > 10 ? Math.ceil(count / 8) : 1;
    const out: number[] = [];
    for (let i = 0; i <= count; i += tickStride) out.push(i * step);
    if (out[out.length - 1] !== maxAxis) out.push(maxAxis);
    return out;
  }, [maxAxis, step]);

  const [drawn, setDrawn] = useState<number[]>(() => categories.map(() => 0));
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [checked, setChecked] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const drawnValues = categories.map((_, idx) => drawn[idx] ?? 0);
  const answerValues = questions.map((_, idx) => answers[idx] ?? '');

  const SVG_W = 560;
  const SVG_H = 310;
  const padL = orientation === 'horizontal' ? 110 : yAxisLabel ? 64 : 48;
  const padR = 24;
  const padT = 24;
  const padB = xAxisLabel ? 66 : 48;
  const plotW = SVG_W - padL - padR;
  const plotH = SVG_H - padT - padB;

  const updateBarFromPointer = (idx: number, clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (orientation === 'vertical') {
      const svgY = ((clientY - rect.top) / rect.height) * SVG_H;
      const ratio = (padT + plotH - svgY) / plotH;
      const val = snapToStep(ratio * maxAxis, step, maxAxis);
      setDrawn((prev) => {
        const next = categories.map((_, i) => prev[i] ?? 0);
        next[idx] = val;
        return next;
      });
    } else {
      const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
      const ratio = (svgX - padL) / plotW;
      const val = snapToStep(ratio * maxAxis, step, maxAxis);
      setDrawn((prev) => {
        const next = categories.map((_, i) => prev[i] ?? 0);
        next[idx] = val;
        return next;
      });
    }
    setChecked(false);
  };

  const adjustBar = (idx: number, delta: number) => {
    setDrawn((prev) => {
      const next = categories.map((_, i) => prev[i] ?? 0);
      next[idx] = snapToStep((next[idx] ?? 0) + delta * step, step, maxAxis);
      return next;
    });
    setChecked(false);
  };

  const resetAll = () => {
    setDrawn(categories.map(() => 0));
    setAnswers(questions.map(() => ''));
    setChecked(false);
  };

  const drawCorrectCount = categories.filter((c, i) => (drawnValues[i] ?? 0) === c.value).length;
  const readCorrectCount = questions.filter((q, i) => {
    if (!q.answer.trim()) return false;
    return normalizeAnswer(answerValues[i] ?? '') === normalizeAnswer(q.answer);
  }).length;

  const modeBadge = mode === 'draw' ? 'Öğrenci çizsin' : mode === 'read' ? 'Öğrenci okusun' : 'Göster';

  return (
    <div className={`${bs.widget} ${styles.wrap}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.badge}>{modeBadge}</span>
      </div>

      <div className={styles.chartArea}>
        <svg
          ref={svgRef}
          className={styles.chartSvg}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label={title}
          onPointerMove={(e) => {
            if (dragIdx !== null && mode === 'draw') {
              updateBarFromPointer(dragIdx, e.clientX, e.clientY);
            }
          }}
          onPointerUp={() => setDragIdx(null)}
          onPointerCancel={() => setDragIdx(null)}
        >
          {/* Izgara çizgileri ve eksen ölçeği */}
          {ticks.map((t) => {
            if (orientation === 'vertical') {
              const y = padT + plotH - (t / maxAxis) * plotH;
              return (
                <g key={t}>
                  <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke={t === 0 ? '#6e7c74' : '#e6e3da'} strokeWidth={t === 0 ? 1.6 : 1} />
                  <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={12} fontWeight={600} fill="#4b5a52">{t}</text>
                </g>
              );
            }
            const x = padL + (t / maxAxis) * plotW;
            return (
              <g key={t}>
                <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke={t === 0 ? '#6e7c74' : '#e6e3da'} strokeWidth={t === 0 ? 1.6 : 1} />
                <text x={x} y={padT + plotH + 18} textAnchor="middle" fontSize={12} fontWeight={600} fill="#4b5a52">{t}</text>
              </g>
            );
          })}

          {/* Eksen çizgileri */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#5b6962" strokeWidth={1.6} />
          <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#5b6962" strokeWidth={1.6} />

          {/* Eksen adları */}
          {xAxisLabel && (
            <text x={padL + plotW / 2} y={SVG_H - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="#2b3932">
              {xAxisLabel}
            </text>
          )}
          {yAxisLabel && orientation === 'vertical' && (
            <text
              x={16}
              y={padT + plotH / 2}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="#2b3932"
              transform={`rotate(-90 16 ${padT + plotH / 2})`}
            >
              {yAxisLabel}
            </text>
          )}

          {/* Sütunlar */}
          {categories.map((cat, idx) => {
            const val = mode === 'draw' ? drawnValues[idx] : cat.value;
            const color = BAR_PALETTE[idx % BAR_PALETTE.length];
            const isOk = mode === 'draw' && checked ? val === cat.value : null;
            const slotSize = (orientation === 'vertical' ? plotW : plotH) / categories.length;
            const barThickness = Math.min(48, slotSize * 0.62);

            if (orientation === 'vertical') {
              const x = padL + idx * slotSize + (slotSize - barThickness) / 2;
              const barH = Math.max(0, (val / maxAxis) * plotH);
              const y = padT + plotH - barH;
              return (
                <g key={idx}>
                  {mode === 'draw' && (
                    <rect
                      x={padL + idx * slotSize + 2}
                      y={padT}
                      width={Math.max(10, slotSize - 4)}
                      height={plotH}
                      fill="transparent"
                      style={{ cursor: 'ns-resize' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                        setDragIdx(idx);
                        updateBarFromPointer(idx, e.clientX, e.clientY);
                      }}
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={barThickness}
                    height={barH}
                    rx={5}
                    fill={color}
                    opacity={isOk === false ? 0.55 : 0.92}
                    stroke={isOk === true ? '#14532d' : isOk === false ? '#c92a2a' : 'none'}
                    strokeWidth={isOk !== null ? 2.5 : 0}
                    style={mode === 'draw' ? { pointerEvents: 'none' } : undefined}
                  />
                  {mode === 'draw' && (
                    <circle
                      cx={x + barThickness / 2}
                      cy={y}
                      r={6}
                      fill="#ffffff"
                      stroke={color}
                      strokeWidth={2.5}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  <text
                    x={x + barThickness / 2}
                    y={Math.max(padT + 12, y - 8)}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={700}
                    fill={isOk === false ? '#b42318' : '#1f2a24'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {val}
                  </text>
                  <text
                    x={x + barThickness / 2}
                    y={padT + plotH + 20}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="#2b3932"
                  >
                    {(cat.label || `Kat. ${idx + 1}`).slice(0, 12)}
                  </text>
                </g>
              );
            }

            // Yatay sütunlar
            const y = padT + idx * slotSize + (slotSize - barThickness) / 2;
            const barW = Math.max(0, (val / maxAxis) * plotW);
            return (
              <g key={idx}>
                {mode === 'draw' && (
                  <rect
                    x={padL}
                    y={padT + idx * slotSize + 2}
                    width={plotW}
                    height={Math.max(10, slotSize - 4)}
                    fill="transparent"
                    style={{ cursor: 'ew-resize' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                      setDragIdx(idx);
                      updateBarFromPointer(idx, e.clientX, e.clientY);
                    }}
                  />
                )}
                <rect
                  x={padL}
                  y={y}
                  width={barW}
                  height={barThickness}
                  rx={5}
                  fill={color}
                  opacity={isOk === false ? 0.55 : 0.92}
                  stroke={isOk === true ? '#14532d' : isOk === false ? '#c92a2a' : 'none'}
                  strokeWidth={isOk !== null ? 2.5 : 0}
                  style={mode === 'draw' ? { pointerEvents: 'none' } : undefined}
                />
                {mode === 'draw' && (
                  <circle
                    cx={padL + barW}
                    cy={y + barThickness / 2}
                    r={6}
                    fill="#ffffff"
                    stroke={color}
                    strokeWidth={2.5}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <text
                  x={Math.min(SVG_W - 8, padL + barW + 8)}
                  y={y + barThickness / 2 + 4}
                  textAnchor="start"
                  fontSize={13}
                  fontWeight={700}
                  fill={isOk === false ? '#b42318' : '#1f2a24'}
                  style={{ pointerEvents: 'none' }}
                >
                  {val}
                </text>
                <text
                  x={padL - 8}
                  y={y + barThickness / 2 + 4}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={600}
                  fill="#2b3932"
                >
                  {(cat.label || `Kat. ${idx + 1}`).slice(0, 14)}
                </text>
              </g>
            );
          })}
        </svg>

        {mode === 'draw' && (
          <div className={styles.drawControls} onPointerDown={(e) => e.stopPropagation()}>
            {categories.map((cat, idx) => (
              <div key={idx} className={styles.stepperChip}>
                <span>{cat.label || `Kat. ${idx + 1}`}</span>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => adjustBar(idx, -1)}
                  disabled={drawnValues[idx] <= 0}
                  aria-label={`${cat.label || `Kategori ${idx + 1}`} azalt`}
                >
                  −
                </button>
                <span>{drawnValues[idx]}</span>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => adjustBar(idx, 1)}
                  disabled={drawnValues[idx] >= maxAxis}
                  aria-label={`${cat.label || `Kategori ${idx + 1}`} artır`}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}

        {mode === 'read' && (
          <div className={styles.questionsList} onPointerDown={(e) => e.stopPropagation()}>
            {questions.map((q, idx) => {
              const hasKey = q.answer.trim().length > 0;
              const isOk = checked && hasKey ? normalizeAnswer(answerValues[idx]) === normalizeAnswer(q.answer) : null;
              return (
                <div key={idx} className={styles.questionRow}>
                  <span className={styles.questionPrompt}>{idx + 1}. {q.prompt || 'Soru'}</span>
                  <input
                    type="text"
                    className={`${styles.inlineInput} ${isOk === true ? styles.inputOk : isOk === false ? styles.inputBad : ''}`}
                    value={answerValues[idx]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAnswers((prev) => {
                        const next = questions.map((_, i) => prev[i] ?? '');
                        next[idx] = v;
                        return next;
                      });
                      setChecked(false);
                    }}
                    placeholder="Cevap"
                    aria-label={`Soru ${idx + 1} cevabı`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mode !== 'show' && (
        <div className={styles.actions} onPointerDown={(e) => e.stopPropagation()}>
          <div className={styles.actionBtns}>
            <button type="button" className={styles.primaryBtn} onClick={() => setChecked(true)}>
              Kontrol et
            </button>
            <button type="button" className={styles.ghostBtn} onClick={resetAll}>
              Sıfırla
            </button>
          </div>
          {checked && mode === 'draw' && (
            <span className={drawCorrectCount === categories.length ? styles.feedbackOk : styles.feedbackBad}>
              {drawCorrectCount === categories.length
                ? 'Harika! Tüm sütunlar doğru.'
                : `${drawCorrectCount} / ${categories.length} sütun doğru.`}
            </span>
          )}
          {checked && mode === 'read' && (
            <span className={readCorrectCount === questions.length ? styles.feedbackOk : styles.feedbackBad}>
              {readCorrectCount === questions.length
                ? 'Tüm cevaplar doğru!'
                : `${readCorrectCount} / ${questions.length} cevap doğru.`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. Çetele Tablosu (kind: 'tally')
// ============================================================================

function TallyMarksSvg({ count }: { count: number }) {
  const safe = Math.max(0, Math.min(TALLY_MAX_COUNT, Math.round(count)));
  const groups = Math.ceil(safe / 5);
  const groupW = 32;
  const gap = 10;
  const totalW = Math.max(36, groups * (groupW + gap));

  return (
    <svg className={styles.tallySvg} viewBox={`0 0 ${totalW} 28`} aria-label={`${safe} çetele çizgisi`}>
      {Array.from({ length: groups }).map((_, gIdx) => {
        const rem = Math.min(5, safe - gIdx * 5);
        const gx = gIdx * (groupW + gap) + 4;
        const verticals = Math.min(4, rem);
        return (
          <g key={gIdx}>
            {Array.from({ length: verticals }).map((__, sIdx) => (
              <line
                key={sIdx}
                x1={gx + sIdx * 6}
                y1={4}
                x2={gx + sIdx * 6}
                y2={24}
                stroke="#1f2a24"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            ))}
            {rem === 5 && (
              <line
                x1={gx - 3}
                y1={21}
                x2={gx + 21}
                y2={7}
                stroke="#25634b"
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function TallyWidget({ el }: { el: WidgetEl }) {
  const title = el.data.title?.trim() || 'Çetele Tablosu';
  const mode = normalizeTallyMode(el.data.tallyMode);

  const items = useMemo(() => {
    const list = normalizeTallyItems(el.data.tallyItems);
    return list.length >= 2 ? list : DEFAULT_TALLY_ITEMS;
  }, [el.data.tallyItems]);

  const [studentTallies, setStudentTallies] = useState<number[]>(() => items.map(() => 0));
  const [studentCounts, setStudentCounts] = useState<string[]>(() => items.map(() => ''));
  const [checked, setChecked] = useState(false);

  const tallyValues = items.map((_, i) => studentTallies[i] ?? 0);
  const countValues = items.map((_, i) => studentCounts[i] ?? '');

  const adjustTally = (idx: number, delta: number) => {
    setStudentTallies((prev) => {
      const next = items.map((_, i) => prev[i] ?? 0);
      next[idx] = Math.max(0, Math.min(TALLY_MAX_COUNT, (next[idx] ?? 0) + delta));
      return next;
    });
    setChecked(false);
  };

  const resetAll = () => {
    setStudentTallies(items.map(() => 0));
    setStudentCounts(items.map(() => ''));
    setChecked(false);
  };

  const rowResults = items.map((item, idx) => {
    const parsed = Number(countValues[idx].trim());
    const countOk = countValues[idx].trim() !== '' && Number.isFinite(parsed) && parsed === item.count;
    if (mode === 'count') return countOk;
    if (mode === 'tally') return tallyValues[idx] === item.count && countOk;
    return true;
  });

  const okCount = rowResults.filter(Boolean).length;
  const modeBadge = mode === 'tally' ? 'Çetele tut' : mode === 'count' ? 'Say ve yaz' : 'Göster';

  return (
    <div className={`${bs.widget} ${styles.wrap}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.badge}>{modeBadge}</span>
      </div>

      <div className={styles.tallyTableWrap} onPointerDown={(e) => e.stopPropagation()}>
        <table className={styles.tallyTable}>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Çetele</th>
              <th>Sayı</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const shownTally = mode === 'tally' ? tallyValues[idx] : item.count;
              const rowClass = checked && mode !== 'show'
                ? (rowResults[idx] ? styles.rowStatusOk : styles.rowStatusBad)
                : '';
              return (
                <tr key={idx} className={rowClass}>
                  <td><strong>{item.label || `Kategori ${idx + 1}`}</strong></td>
                  <td>
                    <div className={styles.tallyCell}>
                      {mode === 'tally' && (
                        <>
                          <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => adjustTally(idx, -1)}
                            disabled={tallyValues[idx] <= 0}
                            aria-label={`${item.label || `Kategori ${idx + 1}`} çetele azalt`}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => adjustTally(idx, 1)}
                            disabled={tallyValues[idx] >= TALLY_MAX_COUNT}
                            aria-label={`${item.label || `Kategori ${idx + 1}`} çetele ekle`}
                          >
                            +
                          </button>
                        </>
                      )}
                      <TallyMarksSvg count={shownTally} />
                    </div>
                  </td>
                  <td>
                    {mode === 'show' ? (
                      <strong>{item.count}</strong>
                    ) : (
                      <div className={styles.tallyCountCell}>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${styles.inlineInput} ${checked ? (rowResults[idx] ? styles.inputOk : styles.inputBad) : ''}`}
                          style={{ width: '4.8cqw' }}
                          value={countValues[idx]}
                          onChange={(e) => {
                            const v = e.target.value;
                            setStudentCounts((prev) => {
                              const next = items.map((_, i) => prev[i] ?? '');
                              next[idx] = v;
                              return next;
                            });
                            setChecked(false);
                          }}
                          placeholder="?"
                          aria-label={`${item.label || `Kategori ${idx + 1}`} sayısı`}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mode !== 'show' && (
        <div className={styles.actions} onPointerDown={(e) => e.stopPropagation()}>
          <div className={styles.actionBtns}>
            <button type="button" className={styles.primaryBtn} onClick={() => setChecked(true)}>
              Kontrol et
            </button>
            <button type="button" className={styles.ghostBtn} onClick={resetAll}>
              Sıfırla
            </button>
          </div>
          {checked && (
            <span className={okCount === items.length ? styles.feedbackOk : styles.feedbackBad}>
              {okCount === items.length ? 'Harika! Hepsi doğru.' : `${okCount} / ${items.length} satır doğru.`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. Sayı Tablosu (kind: 'numgrid')
// ============================================================================

const GRID_BRUSHES = [
  { id: 'green', label: 'Yeşil', bg: '#cce8d4' },
  { id: 'yellow', label: 'Sarı', bg: '#fef08a' },
  { id: 'blue', label: 'Mavi', bg: '#bae6fd' },
] as const;

const RULE_LABEL: Record<NumGridRule, string> = {
  none: 'Serbest boyama',
  mult2: "2'nin katlarını boya",
  mult5: "5'in katlarını boya",
  mult10: "10'un katlarını boya",
  even: 'Çift sayıları boya',
  odd: 'Tek sayıları boya',
};

function matchesRule(n: number, rule: NumGridRule): boolean {
  if (rule === 'mult2' || rule === 'even') return n % 2 === 0;
  if (rule === 'mult5') return n % 5 === 0;
  if (rule === 'mult10') return n % 10 === 0;
  if (rule === 'odd') return Math.abs(n % 2) === 1;
  return false;
}

export function NumGridWidget({ el }: { el: WidgetEl }) {
  const title = el.data.title?.trim() || 'Sayı Tablosu';
  const { start, end } = normalizeNumGridRange(el.data.numGridStart, el.data.numGridEnd);
  const hiddenSet = useMemo(
    () => new Set(normalizeNumGridHidden(el.data.numGridHidden, start, end)),
    [el.data.numGridHidden, start, end]
  );
  const rule = normalizeNumGridRule(el.data.numGridRule);

  const numbers = useMemo(() => {
    const arr: number[] = [];
    for (let n = start; n <= end; n += 1) arr.push(n);
    return arr;
  }, [start, end]);

  const [brush, setBrush] = useState<string>(GRID_BRUSHES[0].bg);
  const [painted, setPainted] = useState<Record<number, string>>({});
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  const togglePaint = (n: number) => {
    setPainted((prev) => {
      const next = { ...prev };
      if (next[n] === brush) delete next[n];
      else next[n] = brush;
      return next;
    });
    setChecked(false);
  };

  const clearAll = () => {
    setPainted({});
    setInputs({});
    setChecked(false);
  };

  const needsCheck = hiddenSet.size > 0 || rule !== 'none';

  const checkSummary = useMemo(() => {
    if (!checked) return null;
    let hiddenOk = 0;
    hiddenSet.forEach((n) => {
      const val = (inputs[n] ?? '').trim();
      if (val !== '' && Number(val) === n) hiddenOk += 1;
    });
    let ruleErrors = 0;
    if (rule !== 'none') {
      for (const n of numbers) {
        const shouldPaint = matchesRule(n, rule);
        const isPainted = Boolean(painted[n]);
        if (shouldPaint !== isPainted) ruleErrors += 1;
      }
    }
    const allOk = hiddenOk === hiddenSet.size && ruleErrors === 0;
    return { hiddenOk, ruleErrors, allOk };
  }, [checked, hiddenSet, inputs, rule, numbers, painted]);

  const rows = Math.max(1, Math.ceil(numbers.length / 10));

  return (
    <div className={`${bs.widget} ${styles.wrap}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.badge}>{RULE_LABEL[rule]}</span>
      </div>

      <div className={styles.gridToolbar} onPointerDown={(e) => e.stopPropagation()}>
        <div className={styles.brushGroup} role="group" aria-label="Boyama rengi">
          {GRID_BRUSHES.map((b) => (
            <button
              key={b.id}
              type="button"
              className={styles.brushBtn}
              aria-pressed={brush === b.bg}
              onClick={() => setBrush(b.bg)}
            >
              <span className={styles.brushDot} style={{ background: b.bg }} aria-hidden="true" />
              <span>{b.label}</span>
            </button>
          ))}
        </div>
        <div className={styles.actionBtns}>
          {needsCheck && (
            <button type="button" className={styles.primaryBtn} onClick={() => setChecked(true)}>
              Kontrol et
            </button>
          )}
          <button type="button" className={styles.ghostBtn} onClick={clearAll}>
            Temizle
          </button>
        </div>
      </div>

      <div
        className={styles.numGrid}
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {numbers.map((n) => {
          const isHidden = hiddenSet.has(n);
          const bg = painted[n];
          let statusClass = '';
          if (checked) {
            if (isHidden) {
              const val = (inputs[n] ?? '').trim();
              statusClass = val !== '' && Number(val) === n ? styles.numCellOk : styles.numCellBad;
            } else if (rule !== 'none') {
              const shouldPaint = matchesRule(n, rule);
              const isPainted = Boolean(bg);
              if (shouldPaint && isPainted) statusClass = styles.numCellOk;
              else if (shouldPaint && !isPainted) statusClass = styles.numCellMissed;
              else if (!shouldPaint && isPainted) statusClass = styles.numCellBad;
            }
          }

          if (isHidden) {
            return (
              <div key={n} className={`${styles.numCell} ${statusClass}`} style={bg ? { background: bg } : undefined}>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.numInput}
                  value={inputs[n] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInputs((prev) => ({ ...prev, [n]: v }));
                    setChecked(false);
                  }}
                  placeholder="?"
                  aria-label="Eksik sayı"
                />
              </div>
            );
          }

          return (
            <button
              key={n}
              type="button"
              className={`${styles.numCell} ${statusClass}`}
              style={bg ? { background: bg } : undefined}
              onClick={() => togglePaint(n)}
              aria-pressed={Boolean(bg)}
            >
              {n}
            </button>
          );
        })}
      </div>

      {checkSummary && (
        <div className={styles.actions}>
          <span className={checkSummary.allOk ? styles.feedbackOk : styles.feedbackBad}>
            {checkSummary.allOk
              ? 'Harika! Her şey doğru.'
              : [
                  hiddenSet.size > 0 ? `Gizli sayılar: ${checkSummary.hiddenOk}/${hiddenSet.size}` : '',
                  rule !== 'none' ? `Boyama hatası: ${checkSummary.ruleErrors}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}

