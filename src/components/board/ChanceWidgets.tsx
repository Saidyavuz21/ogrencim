'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dice, RotateCcw, Wheel } from '../icons';
import { normalizeDiceCount, normalizeSlices, WidgetEl } from '../../lib/boardData';
import styles from './Board.module.css';
import cs from './ChanceWidgets.module.css';

// --------------------------------------------------------
// Ortak yardımcılar
// --------------------------------------------------------

/** 0 … n-1 arası eşit olasılıklı tam sayı (crypto.getRandomValues, sapmasız) */
export function randomInt(n: number): number {
  if (n <= 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
}

/** Bileşen kapanınca bekleyen zamanlayıcıları temizler */
function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => { ids.current.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); }); }, []);
  return ids;
}

// --------------------------------------------------------
// Çark: dilimler arasından rastgele seçim. "Çıkanı kaldır" yalnızca bu oturumda gizler.
// --------------------------------------------------------

/** Tahta kalem paletiyle uyumlu; komşu dilimler farklı renk */
const SLICE_COLORS = ['#1e7a4c', '#e0a800', '#d03b3b', '#2a78d6', '#eb6834', '#7a3fd0', '#c2417a', '#8a5a2b', '#2f8f8a', '#34507a', '#b88a00', '#5f6b66'];
const LIGHT_SLICES = new Set(['#e0a800', '#b88a00']);
const SPIN_MS = 3000;
const SPIN_REDUCED_MS = 400;

function slicePath(start: number, end: number, r: number): string {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(Math.sin(a) * r).toFixed(3)} ${(-Math.cos(a) * r).toFixed(3)}`;
  };
  return `M0 0 L${p(start)} A${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${p(end)} Z`;
}

function shortLabel(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function SpinnerWidget({ el }: { el: WidgetEl }) {
  const title = el.data.title?.trim() || 'Çark';
  const all = normalizeSlices(el.data.slices).map((s) => s.trim());
  const slices = all.filter(Boolean);
  const [removed, setRemoved] = useState<number[]>([]);
  const [removeOn, setRemoveOn] = useState(el.data.removeWinner === true);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const timers = useTimers();

  if (slices.length < 2) {
    return (
      <div className={styles.widget}>
        <p className={styles.widgetTitle}>{title}</p>
        <p className={styles.widgetNote}>En az iki dilim gerekli. Parçayı seçip yandaki panelden dilimleri yazın.</p>
      </div>
    );
  }

  // Dilim listesi değiştiyse eski kayıtlar geçersiz kalmasın
  const validRemoved = removed.filter((i) => i < slices.length);
  const validResult = result != null && result < slices.length ? result : null;
  // Çıkan dilim bir sonraki çevirişte kaldırılır; sonuç çark üstünde görünür kalır
  const willRemove = removeOn && validResult != null && !validRemoved.includes(validResult);
  const active = slices.map((_, i) => i).filter((i) => !validRemoved.includes(i));
  const nextActive = willRemove ? active.filter((i) => i !== validResult) : active;
  const seg = 360 / Math.max(1, active.length);
  const labelMax = active.length <= 4 ? 16 : active.length <= 8 ? 12 : 9;
  const fontSize = active.length <= 4 ? 12 : active.length <= 8 ? 10 : 8;
  const duration = reduced ? SPIN_REDUCED_MS : SPIN_MS;

  const spin = () => {
    if (spinning || !nextActive.length) return;
    const pool = nextActive;
    if (willRemove && validResult != null) setRemoved([...validRemoved, validResult]);
    const pos = randomInt(pool.length);
    const winner = pool[pos];
    const s = 360 / pool.length;
    const jitter = ((randomInt(1000) / 1000) - 0.5) * s * 0.7;
    const target = (((360 - ((pos + 0.5) * s + jitter)) % 360) + 360) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const delta = (target - current + 360) % 360;
    setResult(null);
    setSpinning(true);
    setRotation(rotation + (reduced ? 360 : 360 * 5) + delta);
    timers.current.push(window.setTimeout(() => { setSpinning(false); setResult(winner); }, duration));
  };

  const reset = () => {
    if (spinning) return;
    setRemoved([]);
    setResult(null);
  };

  return (
    <div className={`${styles.widget} ${cs.spinner}`}>
      <div className={cs.head}>
        <p className={styles.widgetTitle}>{title}</p>
        {(validRemoved.length > 0 || willRemove) && (
          <span className={styles.stepsCounter}>{nextActive.length} / {slices.length} kaldı</span>
        )}
      </div>
      <div className={cs.wheelArea}>
        <svg
          className={cs.wheel}
          viewBox="-100 -100 200 200"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${duration}ms cubic-bezier(0.12, 0.7, 0.15, 1)` : 'none' }}
          role="img"
          aria-label={`Çark: ${active.map((i) => slices[i]).join(', ')}`}
        >
          {active.length === 1 ? (
            <circle r={92} fill={SLICE_COLORS[active[0] % SLICE_COLORS.length]} />
          ) : active.map((i, k) => (
            <path key={i} d={slicePath(k * seg, (k + 1) * seg, 92)} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="#fff" strokeWidth={1.2} />
          ))}
          {active.map((i, k) => {
            const mid = (k + 0.5) * seg;
            return (
              <text
                key={`t${i}`}
                transform={`rotate(${mid - 90}) translate(56 0)`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={700}
                fill={LIGHT_SLICES.has(SLICE_COLORS[i % SLICE_COLORS.length]) ? '#1f2a24' : '#fff'}
              >
                {shortLabel(slices[i], labelMax)}
              </text>
            );
          })}
          <circle r={92} fill="none" stroke="#20352d" strokeWidth={2} />
        </svg>
        <svg className={cs.wheelStatic} viewBox="-100 -100 200 200" aria-hidden="true">
          <circle r={9} fill="#fff" stroke="#20352d" strokeWidth={2} />
          <path d="M-8 -100 L8 -100 L0 -82 Z" fill="#20352d" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      </div>
      <p className={cs.result} role="status" aria-live="polite">
        {spinning ? 'Dönüyor…' : validResult != null ? slices[validResult] : nextActive.length ? '\u00a0' : 'Bütün dilimler çıktı.'}
      </p>
      <div className={cs.controls}>
        <button type="button" className={styles.widgetButton} onClick={spin} disabled={spinning || !nextActive.length}>
          <Wheel size={18} aria-hidden="true" />
          <span>Çevir</span>
        </button>
        <button type="button" className={`${styles.widgetButton} ${styles.secondary}`} onClick={reset} disabled={spinning || (!validRemoved.length && validResult == null)}>
          <RotateCcw size={18} aria-hidden="true" />
          <span>Sıfırla</span>
        </button>
        <label className={cs.check}>
          <input type="checkbox" checked={removeOn} onChange={(e) => setRemoveOn(e.target.checked)} disabled={spinning} />
          <span>Çıkanı kaldır</span>
        </label>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// Zar: 1–3 zar, kısa animasyon, toplam
// --------------------------------------------------------
const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
const ROLL_MS = 700;
const ROLL_TICK_MS = 80;

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const on = PIPS[value] || PIPS[1];
  return (
    <span className={`${cs.die} ${rolling ? cs.dieRolling : ''}`} role="img" aria-label={rolling ? 'Zar dönüyor' : `${value}`}>
      {Array.from({ length: 9 }, (_, i) => <span key={i} className={on.includes(i) ? cs.pip : cs.pipEmpty} />)}
    </span>
  );
}

export function DiceWidget({ el }: { el: WidgetEl }) {
  const title = el.data.title?.trim() || 'Zar';
  const count = normalizeDiceCount(el.data.dice);
  const [faces, setFaces] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const reduced = useReducedMotion();
  const timers = useTimers();

  const roll = () => {
    if (rolling) return;
    const final = Array.from({ length: count }, () => randomInt(6) + 1);
    if (reduced) { setFaces(final); return; }
    setRolling(true);
    const tick = window.setInterval(() => setFaces(Array.from({ length: count }, () => randomInt(6) + 1)), ROLL_TICK_MS);
    timers.current.push(tick);
    timers.current.push(window.setTimeout(() => { window.clearInterval(tick); setFaces(final); setRolling(false); }, ROLL_MS));
  };

  const shown = Array.from({ length: count }, (_, i) => faces?.[i] ?? 1);
  const total = shown.reduce((a, b) => a + b, 0);

  return (
    <div className={`${styles.widget} ${cs.diceWidget}`}>
      <p className={styles.widgetTitle}>{title}</p>
      <div className={cs.diceRow}>
        {shown.map((v, i) => <Die key={i} value={v} rolling={rolling} />)}
      </div>
      <p className={cs.result} role="status" aria-live="polite">
        {rolling ? 'Atılıyor…' : faces ? (count > 1 ? `Toplam: ${total}` : `Gelen: ${total}`) : '\u00a0'}
      </p>
      <div className={cs.controls}>
        <button type="button" className={styles.widgetButton} onClick={roll} disabled={rolling}>
          <Dice size={18} aria-hidden="true" />
          <span>At</span>
        </button>
      </div>
    </div>
  );
}

