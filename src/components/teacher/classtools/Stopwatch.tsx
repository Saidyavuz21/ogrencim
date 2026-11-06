'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, Maximize, Minimize, Pause, Play, RotateCcw } from '../../icons';
import { useFullscreen } from './useFullscreen';
import s from './ClassTools.module.css';

/**
 * Kronometre
 *  - Başlat / duraklat / sıfırla, tur zamanları (tur süresi + toplam)
 *  - Süre başlangıç anından hesaplanır; sayfa yenilense ya da sekme değişse de doğru devam eder
 *  - Tam ekranda: boşluk = başlat/duraklat, T = tur, R = sıfırla
 */

interface StopwatchState {
  /** Çalışıyorsa başlama anı (ms), duruyorsa null */
  startedAt: number | null;
  /** Önceki çalışma dilimlerinin toplamı (ms) */
  accumulated: number;
  /** Her turun alındığı andaki toplam süre (ms) */
  laps: number[];
}

const STORE_KEY = 'kronometre';
const EMPTY: StopwatchState = { startedAt: null, accumulated: 0, laps: [] };

function readState(): StopwatchState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as StopwatchState;
    return { startedAt: v.startedAt ?? null, accumulated: v.accumulated || 0, laps: Array.isArray(v.laps) ? v.laps : [] };
  } catch {
    return EMPTY;
  }
}

/** 1:02:03 · 02:03 ve ayrıca salise (2 hane) */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const sec = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { main: h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`, cs: pad(cs) };
}

const elapsedOf = (st: StopwatchState, now: number) => st.accumulated + (st.startedAt ? now - st.startedAt : 0);

export function Stopwatch() {
  const [state, setState] = useState<StopwatchState>(readState);
  const [now, setNow] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);
  const running = state.startedAt !== null;

  useEffect(() => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* gizli sekme vb. */ }
  }, [state]);

  // Çalışırken ekranı her karede tazele
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const toggleRun = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setState((st) => (st.startedAt
      ? { ...st, startedAt: null, accumulated: st.accumulated + (t - st.startedAt) }
      : { ...st, startedAt: t }));
  }, []);

  const lap = useCallback(() => {
    const t = Date.now();
    setState((st) => (st.startedAt ? { ...st, laps: [...st.laps, elapsedOf(st, t)] } : st));
  }, []);

  const reset = useCallback(() => {
    setState(EMPTY);
    setNow(Date.now());
  }, []);

  // Tam ekran kısayolları
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleRun(); }
      else if (e.key.toLocaleLowerCase('tr-TR') === 't') lap();
      else if (e.key.toLocaleLowerCase('tr-TR') === 'r') reset();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full, toggleRun, lap, reset]);

  const elapsed = elapsedOf(state, now);
  const { main, cs } = formatDuration(elapsed);
  const lapTimes = state.laps.map((total, i) => total - (i ? state.laps[i - 1] : 0));
  const fastest = lapTimes.length >= 3 ? Math.min(...lapTimes) : -1;
  const slowest = lapTimes.length >= 3 ? Math.max(...lapTimes) : -1;
  const currentLap = elapsed - (state.laps.length ? state.laps[state.laps.length - 1] : 0);

  return (
    <div className={s.layout}>
      <div ref={stageRef} className={`${s.stage} ${full ? s.full : ''}`}>
        <div className={s.stageTop}>
          <span className={s.counter}>{running ? 'Çalışıyor' : elapsed > 0 ? 'Duraklatıldı' : 'Hazır'}</span>
          <button type="button" className={s.ghost} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
            <span>{full ? 'Küçült' : 'Tam ekran'}</span>
          </button>
        </div>

        <div className={s.display}>
          <div className={s.clock} role="timer" aria-live="off" aria-label={`Geçen süre ${main}`}>
            <span className={s.clockMain}>{main}</span>
            <span className={s.clockCs}>.{cs}</span>
          </div>
          {state.laps.length > 0 && (
            <p className={s.clockSub}>Tur {state.laps.length + 1}: {formatDuration(currentLap).main}.{formatDuration(currentLap).cs}</p>
          )}
        </div>

        <div className={s.controls}>
          <button type="button" className={s.primary} onClick={toggleRun}>
            {running ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
            {running ? 'Duraklat' : elapsed > 0 ? 'Devam et' : 'Başlat'}
          </button>
          {running ? (
            <button type="button" className={s.secondary} onClick={lap}>
              <Flag size={20} aria-hidden="true" />Tur
            </button>
          ) : elapsed > 0 ? (
            <button type="button" className={s.secondary} onClick={reset}>
              <RotateCcw size={20} aria-hidden="true" />Sıfırla
            </button>
          ) : null}
        </div>
        {full && <p className={s.hint}>Boşluk: başlat/duraklat · T: tur · R: sıfırla · Esc: çık</p>}
      </div>

      <aside className={s.side}>
        <section className={s.panel} aria-labelledby="stopwatch-laps-title">
          <div className={s.panelHead}>
            <h2 id="stopwatch-laps-title">Turlar <span className={s.pill}>{state.laps.length}</span></h2>
          </div>
          {state.laps.length === 0 ? (
            <p className={s.muted}>Kronometre çalışırken &quot;Tur&quot;a basın: her turun süresi burada listelenir.</p>
          ) : (
            <ol className={s.laps}>
              {[...lapTimes].map((lt, i) => ({ lt, i })).reverse().map(({ lt, i }) => (
                <li key={i} className={lt === fastest ? s.lapFast : lt === slowest ? s.lapSlow : undefined}>
                  <span className={s.lapNo}>Tur {i + 1}</span>
                  <span className={s.lapTime}>{formatDuration(lt).main}.{formatDuration(lt).cs}</span>
                  <span className={s.lapTotal}>{formatDuration(state.laps[i]).main}</span>
                </li>
              ))}
            </ol>
          )}
          {lapTimes.length >= 3 && <p className={s.muted}>Yeşil: en hızlı tur · Kırmızı: en yavaş tur</p>}
        </section>
      </aside>
    </div>
  );
}
