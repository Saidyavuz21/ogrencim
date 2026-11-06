'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Maximize, Minimize, Pause, Play, Plus, RotateCcw } from '../../icons';
import { useFullscreen } from './useFullscreen';
import s from './ClassTools.module.css';

/**
 * Geri sayım
 *  - Hazır süreler (1, 3, 5, 10, 15 dk) ve özel süre
 *  - İlerleme halkası; son 10 sn uyarı rengi, bitişte "Süre doldu!" + ses (kapatılabilir)
 *  - Bitiş anı saklanır: sayfa yenilense de doğru devam eder
 *  - Tam ekranda: boşluk = başlat/duraklat, R = sıfırla, + = 1 dk ekle
 */

interface CountdownState {
  /** Ayarlanan toplam süre (ms) */
  duration: number;
  /** Çalışıyorsa bitiş anı (ms) */
  endAt: number | null;
  /** Duraklatılmışken kalan süre (ms) */
  remaining: number;
  /** Süre doldu mu */
  finished: boolean;
}

const STORE_KEY = 'geri-sayim';
const SOUND_KEY = 'geri-sayim-ses';
const PRESETS = [1, 3, 5, 10, 15];
const WARN_MS = 10_000;
const MAX_MS = 99 * 60_000 + 59_000;

const fresh = (ms: number): CountdownState => ({ duration: ms, endAt: null, remaining: ms, finished: false });

function readState(): CountdownState {
  if (typeof window === 'undefined') return fresh(5 * 60_000);
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return fresh(5 * 60_000);
    const v = JSON.parse(raw) as CountdownState;
    const st: CountdownState = { duration: v.duration || 5 * 60_000, endAt: v.endAt ?? null, remaining: v.remaining ?? v.duration, finished: !!v.finished };
    // Sayfa kapalıyken süre dolduysa: sessizce "doldu" durumunda aç
    if (st.endAt && st.endAt <= Date.now()) return { ...st, endAt: null, remaining: 0, finished: true };
    return st;
  } catch {
    return fresh(5 * 60_000);
  }
}

const fmt = (ms: number) => {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/** Ses dosyası olmadan kısa uyarı: üç bip, iki kez */
export function playAlarm(ctx: AudioContext | null) {
  if (!ctx) return;
  const start = ctx.currentTime + 0.05;
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 3; i++) {
      const t = start + round * 1.1 + i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    }
  }
}

export function Countdown() {
  const [state, setState] = useState<CountdownState>(readState);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSoundState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try { return window.localStorage.getItem(SOUND_KEY) !== '0'; } catch { return true; }
  });
  const [customMin, setCustomMin] = useState('');
  const [customSec, setCustomSec] = useState('');
  const audioRef = useRef<AudioContext | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);
  const running = state.endAt !== null;

  useEffect(() => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* gizli sekme vb. */ }
  }, [state]);

  const setSound = (on: boolean) => {
    setSoundState(on);
    try { window.localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* gizli sekme vb. */ }
  };

  /** Tarayıcılar sesi ancak bir dokunuştan sonra açar: başlat düğmesinde hazırlanır */
  const ensureAudio = () => {
    if (audioRef.current || typeof window === 'undefined') return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audioRef.current = new Ctor();
  };
  useEffect(() => () => { audioRef.current?.close().catch(() => {}); }, []);

  // Çalışırken ekranı tazele; süre dolunca bitir ve sesi çal (bitiş anı +1 dk ile değişirse efekt yenilenir)
  const endAt = state.endAt;
  useEffect(() => {
    if (endAt === null) return;
    let raf = 0;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        setState((st) => (st.endAt === endAt ? { ...st, endAt: null, remaining: 0, finished: true } : st));
        if (sound) playAlarm(audioRef.current);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endAt, sound]);

  const remaining = state.endAt ? Math.max(0, state.endAt - now) : state.remaining;

  const toggleRun = useCallback(() => {
    ensureAudio();
    audioRef.current?.resume().catch(() => {});
    const t = Date.now();
    setNow(t);
    setState((st) => {
      if (st.endAt) return { ...st, endAt: null, remaining: Math.max(0, st.endAt - t) };
      if (st.finished || st.remaining <= 0) return { ...st, finished: false, remaining: st.duration, endAt: t + st.duration };
      return { ...st, endAt: t + st.remaining };
    });
  }, []);

  const reset = useCallback(() => {
    setNow(Date.now());
    setState((st) => fresh(st.duration));
  }, []);

  const addMinute = useCallback(() => {
    setState((st) => {
      if (st.endAt) return { ...st, endAt: Math.min(st.endAt + 60_000, Date.now() + MAX_MS), duration: st.duration + 60_000 };
      const rem = Math.min((st.finished ? 0 : st.remaining) + 60_000, MAX_MS);
      return { ...st, finished: false, remaining: rem, duration: Math.max(st.duration, rem) };
    });
  }, []);

  const setDuration = (ms: number) => {
    const v = Math.min(MAX_MS, Math.max(1000, ms));
    setNow(Date.now());
    setState(fresh(v));
  };

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const ms = ((parseInt(customMin, 10) || 0) * 60 + (parseInt(customSec, 10) || 0)) * 1000;
    if (ms <= 0) return;
    setDuration(ms);
    setCustomMin('');
    setCustomSec('');
  };

  // Tam ekran kısayolları
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleRun(); }
      else if (e.key.toLocaleLowerCase('tr-TR') === 'r') reset();
      else if (e.key === '+') addMinute();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full, toggleRun, reset, addMinute]);

  const progress = state.finished || !state.duration ? 0 : Math.min(1, remaining / state.duration);
  const warn = !state.finished && remaining <= WARN_MS && (running || remaining < state.duration);
  const R = 46;
  const C = 2 * Math.PI * R;
  const touched = running || state.finished || remaining < state.duration;

  return (
    <div className={s.layout}>
      <div ref={stageRef} className={`${s.stage} ${full ? s.full : ''} ${state.finished ? s.stageDone : warn ? s.stageWarn : ''}`}>
        <div className={s.stageTop}>
          <span className={s.counter}>{state.finished ? 'Süre doldu' : running ? 'Geri sayılıyor' : touched ? 'Duraklatıldı' : `Süre: ${fmt(state.duration)}`}</span>
          <button type="button" className={s.ghost} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
            <span>{full ? 'Küçült' : 'Tam ekran'}</span>
          </button>
        </div>

        <div className={s.display}>
          <div className={s.ring}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r={R} className={s.ringTrack} />
              {/* Süre bitince yuvarlak uç nokta olarak kalmasın diye çizgi gizlenir */}
              {progress > 0.002 && <circle cx="50" cy="50" r={R} className={s.ringBar} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />}
            </svg>
            <div className={s.ringText} role="timer" aria-live="off" aria-label={`Kalan süre ${fmt(remaining)}`}>
              {state.finished ? <span className={s.doneText}>Süre doldu!</span> : <span className={s.countMain}>{fmt(remaining)}</span>}
            </div>
          </div>
        </div>

        <div className={s.controls}>
          <button type="button" className={s.primary} onClick={toggleRun}>
            {running ? <Pause size={22} aria-hidden="true" /> : state.finished ? <RotateCcw size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
            {running ? 'Duraklat' : state.finished ? 'Yeniden başlat' : touched ? 'Devam et' : 'Başlat'}
          </button>
          {(running || touched) && (
            <button type="button" className={s.secondary} onClick={addMinute}>
              <Plus size={20} aria-hidden="true" />1 dk
            </button>
          )}
          {touched && !running && (
            <button type="button" className={s.secondary} onClick={reset}>
              <RotateCcw size={20} aria-hidden="true" />Sıfırla
            </button>
          )}
        </div>
        {full && <p className={s.hint}>Boşluk: başlat/duraklat · +: 1 dk ekle · R: sıfırla · Esc: çık</p>}
      </div>

      <aside className={s.side}>
        <section className={s.panel} aria-labelledby="countdown-set-title">
          <h2 id="countdown-set-title" className={s.panelTitle}>Süre</h2>
          <div className={s.presets}>
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                className={s.preset}
                aria-pressed={!touched && state.duration === m * 60_000}
                onClick={() => setDuration(m * 60_000)}
              >
                {m} dk
              </button>
            ))}
          </div>
          <form className={s.custom} onSubmit={applyCustom}>
            <label>
              <span>Dakika</span>
              <input inputMode="numeric" value={customMin} onChange={(e) => setCustomMin(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" />
            </label>
            <label>
              <span>Saniye</span>
              <input inputMode="numeric" value={customSec} onChange={(e) => setCustomSec(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" />
            </label>
            <button type="submit" className={s.setButton} disabled={!customMin && !customSec}>Ayarla</button>
          </form>
          <p className={s.muted}>Süre değiştirilince geri sayım baştan başlar.</p>
        </section>

        <section className={s.panel} aria-labelledby="countdown-sound-title">
          <h2 id="countdown-sound-title" className={s.panelTitle}>Uyarı</h2>
          <label className={s.option}>
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
            <Bell size={16} aria-hidden="true" />Süre dolunca ses çalsın
          </label>
          <p className={s.muted}>Son 10 saniyede ekran sarıya döner; süre dolunca kırmızı yanıp söner.</p>
        </section>
      </aside>
    </div>
  );
}
