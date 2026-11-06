'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Akvaryum sesi tamamen tarayıcıda üretilir (dosya yok):
 * - ortam: alçak geçiren süzgeçten geçmiş yumuşak akıntı uğultusu + ara ara kabarcık
 * - kovalamaca: hızlı kabarcık dizisi ve kısa bir "vuşş"
 * - yutma: alçalan "glup"
 * Ses yalnızca kullanıcı düğmeye bastığında başlar.
 */

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  /** Efektler (kabarcık, glup) ortam uğultusundan bağımsız buradan çıkar */
  fx: GainNode;
  noise: AudioBuffer;
  stop: () => void;
};

const MASTER = 0.9;

/** Kahverengi gürültü: derin, yumuşak "su" dokusu */
function brownNoise(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

/** Tek kabarcık: kısa sinüs, perdesi hızla yükselir (gerçek kabarcık sesi böyle) */
function bubble(g: Graph, at: number, freq: number, volume: number, length = 0.07) {
  const { ctx } = g;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 2.6, at + length);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain);
  gain.connect(g.fx);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** Süzgeci kayan gürültü: su içinde hızlı hareket */
function whoosh(g: Graph, at: number, duration: number, from: number, to: number, volume: number) {
  const { ctx } = g;
  const src = ctx.createBufferSource();
  src.buffer = g.noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(from, at);
  band.frequency.exponentialRampToValueAtTime(to, at + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(volume, at + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(band);
  band.connect(gain);
  gain.connect(g.fx);
  src.onended = () => { src.disconnect(); band.disconnect(); gain.disconnect(); };
  src.start(at, Math.random() * 2);
  src.stop(at + duration + 0.05);
}

/** Efekt çalınabilir mi (ses açık, sekme görünür, motor çalışıyor) */
function liveGraph(g: Graph | null, on: boolean) {
  if (!on || document.hidden || !g || g.ctx.state !== 'running') return null;
  return g;
}

function fade(g: Graph, to: number, seconds: number) {
  const t = g.ctx.currentTime;
  g.master.gain.cancelScheduledValues(t);
  g.master.gain.setValueAtTime(g.master.gain.value, t);
  g.master.gain.linearRampToValueAtTime(to, t + seconds);
}

function buildGraph(ctx: AudioContext): Graph {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const fx = ctx.createGain();
  fx.gain.value = 1;
  fx.connect(master);
  const noise = brownNoise(ctx, 4);

  // Ortam: döngüdeki gürültü → alçak geçiren süzgeç (yavaşça dalgalanır) → çok kısık ses
  const bed = ctx.createBufferSource();
  bed.buffer = noise;
  bed.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 320;
  low.Q.value = 0.4;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.09;
  // Akıntı: süzgeç ve ses düzeyi birkaç saniyede bir hafifçe kabarıp söner
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 120;
  lfo.connect(lfoDepth);
  lfoDepth.connect(low.frequency);
  const swell = ctx.createOscillator();
  swell.frequency.value = 0.07;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.03;
  swell.connect(swellDepth);
  swellDepth.connect(bedGain.gain);
  bed.connect(low);
  low.connect(bedGain);
  bedGain.connect(master);
  bed.start();
  lfo.start();
  swell.start();

  const graph: Graph = {
    ctx,
    master,
    fx,
    noise,
    stop: () => {
      [bed, lfo, swell].forEach((n) => { try { n.stop(); } catch { /* zaten durdu */ } });
      [bed, low, bedGain, lfo, lfoDepth, swell, swellDepth, fx, master].forEach((n) => n.disconnect());
    },
  };
  return graph;
}

export function useAquariumSound() {
  const graph = useRef<Graph | null>(null);
  const enabledRef = useRef(false);
  const pending = useRef(false);
  const lastChase = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  /** Kovalamaca başladı: hızlı kabarcık dizisi + vuşş */
  const playChase = useCallback(() => {
    const g = liveGraph(graph.current, enabledRef.current);
    if (!g) return;
    const now = performance.now();
    if (now - lastChase.current < 800) return;
    lastChase.current = now;
    const t = g.ctx.currentTime + 0.02;
    whoosh(g, t, 0.55, 260, 1400, 0.35);
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      bubble(g, t + 0.05 + i * (0.045 + Math.random() * 0.03), 500 + Math.random() * 700, 0.13, 0.05 + Math.random() * 0.04);
    }
  }, []);

  /** Büyük balık yuttu: alçalan "glup" ve birkaç kabarcık */
  const playGulp = useCallback(() => {
    const g = liveGraph(graph.current, enabledRef.current);
    if (!g) return;
    const { ctx } = g;
    const t = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.22);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain);
    gain.connect(g.fx);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(t);
    osc.stop(t + 0.32);
    for (let i = 0; i < 3; i++) bubble(g, t + 0.25 + i * 0.09, 380 + Math.random() * 300, 0.1);
  }, []);

  const toggle = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      if (enabledRef.current) {
        enabledRef.current = false;
        setEnabled(false);
        const g = graph.current;
        if (g) {
          fade(g, 0, 0.4);
          window.setTimeout(() => { if (!enabledRef.current) void g.ctx.suspend().catch(() => {}); }, 450);
        }
        return;
      }
      const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('Audio unsupported');
      if (!graph.current || graph.current.ctx.state === 'closed') graph.current = buildGraph(new Ctor());
      const g = graph.current;
      await g.ctx.resume();
      if (g.ctx.state !== 'running') throw new Error('Audio unavailable');
      enabledRef.current = true;
      setEnabled(true);
      setUnavailable(false);
      fade(g, MASTER, 1.2);
      bubble(g, g.ctx.currentTime + 0.3, 520, 0.12);
      bubble(g, g.ctx.currentTime + 0.42, 700, 0.1);
    } catch {
      enabledRef.current = false;
      setEnabled(false);
      setUnavailable(true);
    } finally {
      pending.current = false;
    }
  }, []);

  useEffect(() => {
    // Ara ara kendiliğinden yükselen kabarcıklar (1–3 tane, 2–6 sn arayla)
    let timer = 0;
    const idle = () => {
      const g = liveGraph(graph.current, enabledRef.current);
      if (g) {
        const t = g.ctx.currentTime + 0.02;
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) bubble(g, t + i * (0.08 + Math.random() * 0.12), 350 + Math.random() * 650, 0.05 + Math.random() * 0.05);
      }
      timer = window.setTimeout(idle, 2000 + Math.random() * 4000);
    };
    timer = window.setTimeout(idle, 2500);

    const visibility = () => {
      const g = graph.current;
      if (!g) return;
      if (document.hidden) void g.ctx.suspend().catch(() => {});
      else if (enabledRef.current) void g.ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
      enabledRef.current = false;
      const g = graph.current;
      graph.current = null;
      if (g) { g.stop(); void g.ctx.close().catch(() => {}); }
    };
  }, []);

  return { enabled, unavailable, toggle, playChase, playGulp };
}
