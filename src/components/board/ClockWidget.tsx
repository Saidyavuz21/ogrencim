'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  normalizeClockHour,
  normalizeClockMinute,
  normalizeClockMode,
  normalizeClockReadInput,
  normalizeClockStep,
  WidgetEl,
} from '../../lib/boardData';
import styles from './ClockWidget.module.css';
import bs from './Board.module.css';

type HandKind = 'hour' | 'minute';

const HOUR_NAMES = [
  '',
  'bir',
  'iki',
  'üç',
  'dört',
  'beş',
  'altı',
  'yedi',
  'sekiz',
  'dokuz',
  'on',
  'on bir',
  'on iki',
];

const HOUR_ACC = [
  '',
  'biri',
  'ikiyi',
  'üçü',
  'dördü',
  'beşi',
  'altıyı',
  'yediyi',
  'sekizi',
  'dokuzu',
  'onu',
  'on biri',
  'on ikiyi',
];

const HOUR_DAT = [
  '',
  'bire',
  'ikiye',
  'üçe',
  'dörde',
  'beşe',
  'altıya',
  'yediye',
  'sekize',
  'dokuza',
  'ona',
  'on bire',
  'on ikiye',
];

function numberToTurkish(n: number): string {
  const ones = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli'];
  if (n <= 0) return 'sıfır';
  const t = Math.floor(n / 10);
  const o = n % 10;
  return [tens[t] || '', ones[o] || ''].filter(Boolean).join(' ');
}

export function formatTurkishTime(hour: number, minute: number): string {
  const h = normalizeClockHour(hour);
  const m = normalizeClockMinute(minute);
  if (m === 0) return `Saat ${HOUR_NAMES[h]}`;
  if (m === 30) return `${HOUR_NAMES[h]} buçuk`;
  if (m === 15) return `${HOUR_ACC[h]} çeyrek geçiyor`;
  if (m === 45) {
    const nextH = h === 12 ? 1 : h + 1;
    return `${HOUR_DAT[nextH]} çeyrek var`;
  }
  if (m < 30) return `${HOUR_ACC[h]} ${numberToTurkish(m)} geçiyor`;
  const nextH = h === 12 ? 1 : h + 1;
  return `${HOUR_DAT[nextH]} ${numberToTurkish(60 - m)} var`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildDeterministicChoices(hour: number, minute: number): string[] {
  const correct = `${pad2(hour)}:${pad2(minute)}`;
  const candidates: Array<[number, number]> = [
    [hour === 12 ? 1 : hour + 1, minute],
    [hour, (minute + 15) % 60],
    [hour === 1 ? 12 : hour - 1, (minute + 30) % 60],
    [hour, (minute + 30) % 60],
    [hour === 12 ? 1 : hour + 1, (minute + 5) % 60],
  ];
  const out = [correct];
  for (const [h, m] of candidates) {
    const label = `${pad2(h)}:${pad2(m)}`;
    if (!out.includes(label)) out.push(label);
    if (out.length === 4) break;
  }
  // Saat değerine göre deterministik sıralama
  const shift = (hour + minute) % 4;
  return out.map((_, idx) => out[(idx + shift) % out.length]);
}

export function ClockWidget({ el }: { el: WidgetEl }) {
  const title = el.data.title?.trim() || 'Saat';
  const mode = normalizeClockMode(el.data.clockMode);
  const initHour = normalizeClockHour(el.data.clockHour, 3);
  const initMinute = normalizeClockMinute(el.data.clockMinute, 0);
  const targetHour = normalizeClockHour(el.data.clockTargetHour, 3);
  const targetMinute = normalizeClockMinute(el.data.clockTargetMinute, 30);
  const step = normalizeClockStep(el.data.clockStep);
  const readInputType = normalizeClockReadInput(el.data.clockReadInput);

  const [hour, setHour] = useState(initHour);
  const [minute, setMinute] = useState(initMinute);
  const [selectedHand, setSelectedHand] = useState<HandKind | null>('minute');
  const [showDigital, setShowDigital] = useState(el.data.clockShowDigital !== false);
  const [showTurkish, setShowTurkish] = useState(el.data.clockShowTurkish === true);

  const [readHour, setReadHour] = useState('');
  const [readMinute, setReadMinute] = useState('');
  const [readChoice, setReadChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const dragRef = useRef<{ hand: HandKind; moved: boolean; startX: number; startY: number; lastMinute: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const displayHour = mode === 'read' ? initHour : hour;
  const displayMinute = mode === 'read' ? initMinute : minute;
  const interactive = mode !== 'read';

  const choices = useMemo(() => buildDeterministicChoices(initHour, initMinute), [initHour, initMinute]);

  const pointerAngleDeg = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  };

  const applyMinuteWithCarry = (nextMinRaw: number, prevMin: number) => {
    const snapped = (Math.round(nextMinRaw / step) * step) % 60;
    const nextMin = (snapped + 60) % 60;
    if (prevMin >= 45 && nextMin <= 15) {
      setHour((h) => (h === 12 ? 1 : h + 1));
    } else if (prevMin <= 15 && nextMin >= 45) {
      setHour((h) => (h === 1 ? 12 : h - 1));
    }
    setMinute(nextMin);
    setChecked(false);
    return nextMin;
  };

  const applyHourFromAngle = (deg: number) => {
    const rawHour = deg / 30 - minute / 60;
    const snapped = Math.round(rawHour);
    const nextH = ((snapped - 1) % 12 + 12) % 12 + 1;
    setHour(nextH);
    setChecked(false);
  };

  const stepHand = (hand: HandKind, dir: 1 | -1) => {
    if (!interactive) return;
    if (hand === 'minute') {
      const nextRaw = minute + dir * step;
      if (nextRaw >= 60) {
        setHour((h) => (h === 12 ? 1 : h + 1));
        setMinute(nextRaw - 60);
      } else if (nextRaw < 0) {
        setHour((h) => (h === 1 ? 12 : h - 1));
        setMinute(60 + nextRaw);
      } else {
        setMinute(nextRaw);
      }
    } else {
      setHour((h) => ((h - 1 + dir + 12) % 12) + 1);
    }
    setChecked(false);
  };

  const handleNumberTap = (n: number) => {
    if (!interactive || !selectedHand) return;
    if (selectedHand === 'minute') {
      setMinute((n % 12) * 5);
    } else {
      setHour(n);
    }
    setChecked(false);
  };

  const resetClock = () => {
    setHour(initHour);
    setMinute(initMinute);
    setReadHour('');
    setReadMinute('');
    setReadChoice(null);
    setChecked(false);
  };

  const CX = 180;
  const CY = 180;
  const R = 162;

  const hourAngleRad = (((displayHour % 12) + displayMinute / 60) * 30 * Math.PI) / 180;
  const minAngleRad = (displayMinute * 6 * Math.PI) / 180;
  const hx2 = CX + 88 * Math.sin(hourAngleRad);
  const hy2 = CY - 88 * Math.cos(hourAngleRad);
  const mx2 = CX + 132 * Math.sin(minAngleRad);
  const my2 = CY - 132 * Math.cos(minAngleRad);

  const isSetCorrect = hour === targetHour && minute === targetMinute;
  const isReadCorrect = readInputType === 'choice'
    ? readChoice === `${pad2(initHour)}:${pad2(initMinute)}`
    : readHour.trim() !== '' && readMinute.trim() !== '' && Number(readHour) === initHour && Number(readMinute) === initMinute;

  const modeBadge = mode === 'set' ? 'Saati kur' : mode === 'read' ? 'Saat kaç?' : 'Serbest';

  return (
    <div className={`${bs.widget} ${styles.wrap}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.badge}>{modeBadge}</span>
      </div>

      {mode === 'set' && (
        <div className={styles.targetBanner}>
          Hedef: {pad2(targetHour)}:{pad2(targetMinute)}
          {showTurkish ? ` · ${formatTurkishTime(targetHour, targetMinute)}` : ''}
        </div>
      )}

      <div className={styles.clockArea}>
        <svg
          ref={svgRef}
          className={styles.clockSvg}
          viewBox="0 0 360 360"
          tabIndex={interactive ? 0 : undefined}
          role="img"
          aria-label={`Analog saat ${pad2(displayHour)}:${pad2(displayMinute)}`}
          onKeyDown={(e) => {
            if (!interactive || !selectedHand) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              stepHand(selectedHand, 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              stepHand(selectedHand, -1);
            }
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d || !interactive) return;
            if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4) {
              d.moved = true;
            }
            if (!d.moved) return;
            const deg = pointerAngleDeg(e.clientX, e.clientY);
            if (deg === null) return;
            if (d.hand === 'minute') {
              const rawMin = (deg / 6) % 60;
              d.lastMinute = applyMinuteWithCarry(rawMin, d.lastMinute);
            } else {
              applyHourFromAngle(deg);
            }
          }}
          onPointerUp={() => {
            const d = dragRef.current;
            if (d && !d.moved) {
              setSelectedHand((prev) => (prev === d.hand ? null : d.hand));
            }
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {/* Dış çember */}
          <circle cx={CX} cy={CY} r={R} fill="#ffffff" stroke="#1f2a24" strokeWidth={4} />

          {/* 60 dakika çizgisi */}
          {Array.from({ length: 60 }).map((_, i) => {
            const isFive = i % 5 === 0;
            const rad = (i * 6 * Math.PI) / 180;
            const rIn = isFive ? 146 : 153;
            return (
              <line
                key={i}
                x1={CX + rIn * Math.sin(rad)}
                y1={CY - rIn * Math.cos(rad)}
                x2={CX + R * Math.sin(rad)}
                y2={CY - R * Math.cos(rad)}
                stroke="#1f2a24"
                strokeWidth={isFive ? 3 : 1.2}
                strokeLinecap="round"
              />
            );
          })}

          {/* 1–12 rakamları (geniş dokunma alanı) */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const n = idx + 1;
            const rad = (n * 30 * Math.PI) / 180;
            const nx = CX + 122 * Math.sin(rad);
            const ny = CY - 122 * Math.cos(rad);
            return (
              <g
                key={n}
                style={{ cursor: interactive && selectedHand ? 'pointer' : 'default' }}
                onPointerDown={(e) => {
                  if (!interactive || !selectedHand) return;
                  e.stopPropagation();
                  handleNumberTap(n);
                }}
              >
                <circle cx={nx} cy={ny} r={22} fill="transparent" />
                <text
                  x={nx}
                  y={ny + 7}
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={700}
                  fill="#1f2a24"
                >
                  {n}
                </text>
              </g>
            );
          })}

          {/* Akrep (saat ibresi) */}
          <g
            style={{ cursor: interactive ? 'grab' : 'default' }}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              setSelectedHand('hour');
              dragRef.current = { hand: 'hour', moved: false, startX: e.clientX, startY: e.clientY, lastMinute: minute };
            }}
          >
            {interactive && selectedHand === 'hour' && (
              <line x1={CX} y1={CY} x2={hx2} y2={hy2} stroke="#d97706" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
            )}
            <line x1={CX} y1={CY} x2={hx2} y2={hy2} stroke="#1f2a24" strokeWidth={8} strokeLinecap="round" />
            <line x1={CX} y1={CY} x2={hx2} y2={hy2} stroke="transparent" strokeWidth={24} strokeLinecap="round" />
          </g>

          {/* Yelkovan (dakika ibresi) */}
          <g
            style={{ cursor: interactive ? 'grab' : 'default' }}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              setSelectedHand('minute');
              dragRef.current = { hand: 'minute', moved: false, startX: e.clientX, startY: e.clientY, lastMinute: minute };
            }}
          >
            {interactive && selectedHand === 'minute' && (
              <line x1={CX} y1={CY} x2={mx2} y2={my2} stroke="#25634b" strokeWidth={12} strokeLinecap="round" opacity={0.32} />
            )}
            <line x1={CX} y1={CY} x2={mx2} y2={my2} stroke="#25634b" strokeWidth={5} strokeLinecap="round" />
            <line x1={CX} y1={CY} x2={mx2} y2={my2} stroke="transparent" strokeWidth={24} strokeLinecap="round" />
          </g>

          {/* Merkez pimi */}
          <circle cx={CX} cy={CY} r={7} fill="#1f2a24" stroke="#ffffff" strokeWidth={2} />
        </svg>
      </div>

      {interactive && (
        <div className={styles.handSelectRow} onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.handBtn}
            aria-pressed={selectedHand === 'hour'}
            onClick={() => setSelectedHand((p) => (p === 'hour' ? null : 'hour'))}
          >
            <span className={styles.handDotHour} aria-hidden="true" />
            <span>Akrep</span>
          </button>
          <button
            type="button"
            className={styles.handBtn}
            aria-pressed={selectedHand === 'minute'}
            onClick={() => setSelectedHand((p) => (p === 'minute' ? null : 'minute'))}
          >
            <span className={styles.handDotMin} aria-hidden="true" />
            <span>Yelkovan</span>
          </button>
          {mode === 'free' && (
            <>
              <button
                type="button"
                className={styles.handBtn}
                aria-pressed={showDigital}
                onClick={() => setShowDigital((v) => !v)}
              >
                Dijital
              </button>
              <button
                type="button"
                className={styles.handBtn}
                aria-pressed={showTurkish}
                onClick={() => setShowTurkish((v) => !v)}
              >
                Okunuş
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'free' && (showDigital || showTurkish) && (
        <div className={styles.readout}>
          {showDigital && <div className={styles.digital}>{pad2(displayHour)}:{pad2(displayMinute)}</div>}
          {showTurkish && <div className={styles.turkish}>{formatTurkishTime(displayHour, displayMinute)}</div>}
        </div>
      )}

      {mode === 'read' && readInputType === 'box' && (
        <div className={styles.readBoxRow} onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="text"
            inputMode="numeric"
            className={styles.timeInput}
            value={readHour}
            onChange={(e) => { setReadHour(e.target.value); setChecked(false); }}
            placeholder="SS"
            aria-label="Saat"
          />
          <span className={styles.timeColon}>:</span>
          <input
            type="text"
            inputMode="numeric"
            className={styles.timeInput}
            value={readMinute}
            onChange={(e) => { setReadMinute(e.target.value); setChecked(false); }}
            placeholder="DD"
            aria-label="Dakika"
          />
        </div>
      )}

      {mode === 'read' && readInputType === 'choice' && (
        <div className={styles.choiceGrid} onPointerDown={(e) => e.stopPropagation()}>
          {choices.map((ch) => (
            <button
              key={ch}
              type="button"
              className={styles.choiceBtn}
              aria-pressed={readChoice === ch}
              onClick={() => { setReadChoice(ch); setChecked(false); }}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      <div className={styles.actions} onPointerDown={(e) => e.stopPropagation()}>
        <div className={styles.actionBtns}>
          {mode !== 'free' && (
            <button type="button" className={styles.primaryBtn} onClick={() => setChecked(true)}>
              Kontrol et
            </button>
          )}
          <button type="button" className={styles.ghostBtn} onClick={resetClock}>
            Sıfırla
          </button>
        </div>
        {checked && mode === 'set' && (
          <span className={isSetCorrect ? styles.feedbackOk : styles.feedbackBad}>
            {isSetCorrect ? 'Doğru!' : 'Tekrar dene.'}
          </span>
        )}
        {checked && mode === 'read' && (
          <span className={isReadCorrect ? styles.feedbackOk : styles.feedbackBad}>
            {isReadCorrect ? 'Doğru!' : `Doğrusu: ${pad2(initHour)}:${pad2(initMinute)}`}
          </span>
        )}
      </div>
    </div>
  );
}

