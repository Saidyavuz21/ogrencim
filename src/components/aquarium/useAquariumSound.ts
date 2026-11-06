'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Quiet, locally synthesized effects; audio starts only from a user gesture. */
export function useAquariumSound() {
  const context = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const play = useCallback((chase = false) => {
    const ctx = context.current;
    if (!enabledRef.current || document.hidden || !ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime;
    const count = chase ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = start + i * (chase ? 0.065 : 0.16);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(380 + Math.random() * 420, at);
      oscillator.frequency.exponentialRampToValueAtTime(130 + Math.random() * 100, at + 0.14);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(chase ? 0.045 : 0.025, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(at);
      oscillator.stop(at + 0.2);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (enabledRef.current) {
      enabledRef.current = false;
      setEnabled(false);
      await context.current?.suspend().catch(() => {});
      return;
    }
    try {
      if (!context.current) context.current = new AudioContext();
      await context.current.resume();
      if (context.current.state !== 'running') throw new Error('Audio unavailable');
      enabledRef.current = true;
      setEnabled(true);
      setUnavailable(false);
      play();
    } catch {
      enabledRef.current = false;
      setEnabled(false);
      setUnavailable(true);
    }
  }, [play]);

  useEffect(() => {
    const timer = window.setInterval(() => play(), 2800);
    const visibility = () => {
      const ctx = context.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend().catch(() => {});
      else if (enabledRef.current) void ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      enabledRef.current = false;
      const ctx = context.current;
      context.current = null;
      if (ctx) void ctx.close().catch(() => {});
    };
  }, [play]);

  return { enabled, unavailable, toggle, playChase: play };
}
