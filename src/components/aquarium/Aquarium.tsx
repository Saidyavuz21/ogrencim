'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Maximize, Minimize } from '../icons';
import { Volume2, VolumeX } from '../icons';
import { useAquariumSound } from './useAquariumSound';
import {
  AquariumInput, CHASE_RATIO, CROWN_POINTS, SPARKLE_POINTS, SWALLOW_MS, SWALLOW_POINTS, canSwallow, eggCracks, fishForm, fishSize, isFish, seeded, shortNames,
} from '../../lib/aquarium';
import { EggArt, FishArt, FORM_NAMES } from './FishArt';
import styles from './Aquarium.module.css';

interface AquariumProps {
  students: AquariumInput[];
  /** Öğrenci panelinde kendi balığı "Sen" etiketiyle vurgulanır */
  highlightId?: string;
  /** Yeni çıkan balık kutlamasının hangi sınıf için hatırlanacağı */
  scopeKey: string;
  title?: string;
}

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

/** "Yeme" oyunu: büyük balık saldırır (chase), küçük kaçar (flee) */
type ChaseRole = 'chase' | 'flee';
const CHASE_MS = 1300;
const FLEE_MS = 1700;
const CHASE_COOLDOWN_MS = 15000;
const CHASE_CHECK_S = 0.35;
/** Yayılma: hedef seçerken denenen aday sayısı, kişisel alan payı (cqw) ve itme gücü (cqw/sn) */
// Değerler 19 balıklı sınıfla simülasyonda seçildi: üst üste binen çift ortalama 7,6 → ~0,1
const TARGET_CANDIDATES = 10;
const SPACE_X = 5;
const SPACE_Y = 2.5;
const SEPARATION = 12;
/** Kişisel alanın hemen dışında karşılaşınca saldırı başlar (cqw) */
const CHASE_GAP = SPACE_X + 2;

/** Yutma modu: kovalamaca daha uzun, av daha yavaş kaçar; büyük balık ağzını avın üstüne getirince yutar */
const SWALLOW_CHASE_MS = 7000;
const SWALLOW_FLEE_MS = 7000;
const SWALLOW_COOLDOWN_MS = 4000;
const SWALLOW_TOGGLE_KEY = 'akvaryum-yutma';

/** Geçici yutma kaydı: yutan, yutulanın o anki puanını `until` anına kadar taşır */
interface Meal { eaterId: string; preyId: string; amount: number; until: number }
/** Ekrana yansıyan yutma durumu: geçici ek puanlar ve şu an midede olanlar */
interface Feast {
  bonus: Record<string, number>;
  eaten: Record<string, true>;
  /** Yutulmakta olan av (ağza çekilip küçülür) ve ağzını açmış yutan */
  swallowing: Record<string, true>;
  gulping: Record<string, true>;
  /** Yeni yutmuş balık: yutkunma şişmesi + "Hap!" rozeti (değer: rozet anahtarı) */
  gulp: Record<string, number>;
}
const EMPTY_FEAST: Feast = { bonus: {}, eaten: {}, swallowing: {}, gulping: {}, gulp: {} };
/** Yutma sahnesi: ağız avın boyu kadar açılır (ilk %35), sonra büyük balık öne atılıp avı ağzına alır */
const GULP_MS = 1100;
const GULP_OPEN = 0.35;
/** Yutma modunda kovalamaca: av gerçekten kaçar; avcı önce az geride kalır, sonra atak yapar */
const FEAST_FLEE = 5;
const SWALLOW_MIN_CHASE_MS = 2200;
/** Burun ucunun balık genişliğine oranı (sağa bakarken) */
const MOUTH_AT = 0.88;

/** Ek puanla büyüyen balığın genişliği: yerleşimdeki ölçek korunur */
const grownSize = (base: number, real: number, extra: number) =>
  extra > 0 ? base * (fishSize(real + extra) / fishSize(real)) : base;

/**
 * Yüzme motorundaki balık durumu (cqw biriminde, akvaryumun sol üstüne göre).
 * Her balık akvaryumun tamamında rastgele hedeflere yüzer; gittiği yöne bakar.
 */
interface Mover {
  x: number; y: number;
  tx: number; ty: number;
  vx: number; vy: number;
  size: number; h: number;
  points: number;
  speed: number;
  face: 1 | -1;
  rest: number;
  mode: 'wander' | ChaseRole;
  modeUntil: number;
  preyId?: string;
  /** Yerleşimdeki boy ve gerçek puan (yutma modunda geçici büyümeden önce) */
  base: number;
  real: number;
  /** Yutuldu: yüzmez, görünmez */
  hidden?: boolean;
  /** Şu an bu balık tarafından yutuluyor (ağza çekiliyor) */
  gulpBy?: string;
  gulpUntil?: number;
  /** Kovalamacanın başladığı an ve kaçışın zikzak evresi */
  chaseAt?: number;
  wobble?: number;
}

const TANK_H = 56.25; // 16:9 → yükseklik = genişliğin %56.25'i (cqw)
const FISH_RATIO = 92 / 124; // FishArt viewBox oranı
const FISH_TOP = 4.5; // balıkların çıkabileceği en üst nokta (cqw)
const LABEL_H = 2.2; // isim etiketi + boşluk (cqw)

const BUBBLES = [6, 14, 23, 37, 48, 61, 72, 81, 90, 96];
const PLANTS: { x: number; h: number; hue: number; flip?: boolean }[] = [
  { x: 2, h: 30, hue: 0 },
  { x: 7, h: 22, hue: 18, flip: true },
  { x: 86, h: 34, hue: -10 },
  { x: 92, h: 24, hue: 24, flip: true },
  { x: 44, h: 16, hue: 10 },
];

const noopSubscribe = () => () => {};

function seenKey(scope: string) {
  return `akvaryum-gorulen:${scope}`;
}

/** Bu cihazda daha önce balık olarak görülenler; ilk açılışta herkes "görülmüş" sayılır (toplu kutlama olmaz) */
function readNewlyHatched(scope: string, fishIds: string[]): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(seenKey(scope));
    if (!raw) return new Set();
    const seen = new Set<string>(JSON.parse(raw) as string[]);
    return new Set(fishIds.filter((id) => !seen.has(id)));
  } catch {
    return new Set();
  }
}

export function Aquarium(props: AquariumProps) {
  // Akvaryum yalnızca tarayıcıda çizilir (cihazda hatırlanan kutlama bilgisi sunucuda bilinmez)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <div className={styles.placeholder} aria-hidden="true" />;
  return <AquariumView {...props} />;
}

function AquariumView({ students, highlightId, scopeKey, title = 'Sınıf akvaryumu' }: AquariumProps) {
  const { enabled: soundEnabled, unavailable: soundUnavailable, toggle: toggleSound, playChase, playGulp } = useAquariumSound();
  const stageRef = useRef<HTMLDivElement>(null);
  const tankRef = useRef<HTMLDivElement>(null);
  const swimmerRefs = useRef(new Map<string, HTMLDivElement>());
  const faceRefs = useRef(new Map<string, HTMLDivElement>());
  const moversRef = useRef(new Map<string, Mover>());
  const [chase, setChase] = useState<Record<string, ChaseRole>>({});
  // "Balıklar birbirini yutsun": bu cihazda hatırlanır, varsayılan kapalı
  const [swallowOn, setSwallowOn] = useState(() => {
    try { return window.localStorage.getItem(SWALLOW_TOGGLE_KEY) === '1'; } catch { return false; }
  });
  const swallowRef = useRef(swallowOn);
  const mealsRef = useRef<Meal[]>([]);
  const [feast, setFeast] = useState<Feast>(EMPTY_FEAST);
  const toggleSwallow = useCallback(() => {
    setSwallowOn((prev) => {
      const next = !prev;
      swallowRef.current = next;
      try { window.localStorage.setItem(SWALLOW_TOGGLE_KEY, next ? '1' : '0'); } catch { /* gizli sekme */ }
      return next;
    });
  }, []);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [nativeFull, setNativeFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);
  const full = nativeFull || pseudoFull;

  const names = useMemo(() => shortNames(students), [students]);
  const fish = useMemo(
    () => students.filter(isFish).sort((a, b) => seeded(a.id, 1) - seeded(b.id, 1)),
    [students]
  );
  const eggs = useMemo(
    () => students.filter((s) => !isFish(s)).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr')),
    [students]
  );

  // Yeni yumurtadan çıkanlar yalnızca bileşen açılırken hesaplanır; kutlama CSS ile bir kez oynar
  const [newlyHatched] = useState(() => readNewlyHatched(scopeKey, fish.map((f) => f.id)));
  useEffect(() => {
    try {
      window.localStorage.setItem(seenKey(scopeKey), JSON.stringify(fish.map((f) => f.id)));
    } catch {
      /* depolama kapalıysa kutlama hatırlanmaz; sorun değil */
    }
  }, [scopeKey, fish]);

  // Tam ekran: tarayıcı destekliyorsa gerçek tam ekran, desteklemiyorsa (ör. iPhone) sayfayı kaplayan görünüm
  useEffect(() => {
    const onChange = () => setNativeFull(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!pseudoFull) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPseudoFull(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pseudoFull]);

  const toggleFull = useCallback(async () => {
    if (pseudoFull) { setPseudoFull(false); return; }
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    const el = stageRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        /* izin verilmedi: sayfayı kaplayan görünüme geç */
      }
    }
    setPseudoFull(true);
  }, [pseudoFull]);

  // ---- Yumurta yerleşimi: kumun üzerinde sıralar halinde ----
  const eggCols = Math.max(1, Math.min(eggs.length, 12));
  const eggRows = Math.ceil(eggs.length / eggCols) || 0;
  let eggW = Math.min(7.5, 92 / eggCols);
  if (eggRows) eggW = Math.min(eggW, 24 / (eggRows * 1.25 * 0.92));
  const eggH = eggW * 1.25;
  const sandH = Math.max(7, eggRows ? eggRows * eggH * 0.92 + 3 : 7);

  // ---- Başlangıç yerleşimi ve boyut: balıklar sütunlara dağılarak başlar, sonra her yere yüzer ----
  const fishBottom = TANK_H - sandH - 1;
  const layout = useMemo(() => {
    const colCount = fish.length <= 8 ? 2 : fish.length <= 18 ? 3 : 4;
    const cols: AquariumInput[][] = Array.from({ length: colCount }, () => []);
    fish.forEach((f, i) => cols[i % colCount].push(f));
    const region = fishBottom - FISH_TOP;
    const colW = 96 / colCount;
    // Sütun sığmıyorsa balıklar orantılı küçültülür (en fazla %45; boy oranları korunur; daha kalabalıksa hafif üst üste binebilir)
    const need = Math.max(...cols.map((c) => c.reduce((sum, f) => sum + (fishSize(f.points) / 10) * FISH_RATIO + LABEL_H, 0)), 0.001);
    const scale = Math.max(0.55, Math.min(1, region / need));
    const out: Record<string, { left: number; top: number; size: number }> = {};
    cols.forEach((col, ci) => {
      const heights = col.map((f) => (fishSize(f.points) / 10) * scale * FISH_RATIO);
      const used = heights.reduce((a, h) => a + h + LABEL_H, 0);
      const gap = col.length ? (region - used) / col.length : 0;
      let y = FISH_TOP + Math.max(0, gap) / 2;
      col.forEach((f, i) => {
        const size = (fishSize(f.points) / 10) * scale;
        const minX = 2 + ci * colW;
        const maxX = minX + colW;
        const room = Math.max(0, maxX - minX - size);
        const left = minX + seeded(f.id, 2) * room * 0.4;
        out[f.id] = { left, top: y, size };
        y += heights[i] + LABEL_H + gap;
      });
    });
    return out;
  }, [fish, fishBottom]);

  // ---- Yüzme motoru: balıklar akvaryumun her yerine yüzer; "yeme" oyunu da burada ----
  // Konumlar React'e uğramadan doğrudan transform ile yazılır (saniyede 60 kez yeniden çizim yok).
  useEffect(() => {
    const movers = moversRef.current;
    // Sayfa yenilenince balıklar kaldıkları yerden devam eder (bu cihazda, sınıf bazında)
    const posKey = `akvaryum-konum:${scopeKey}`;
    let saved: Record<string, [number, number, 1 | -1]> = {};
    try { saved = JSON.parse(window.localStorage.getItem(posKey) || '{}'); } catch { saved = {}; }
    const savePositions = () => {
      const out: Record<string, [number, number, 1 | -1]> = {};
      movers.forEach((m, id) => { out[id] = [Math.round(m.x * 100) / 100, Math.round(m.y * 100) / 100, m.face]; });
      try { window.localStorage.setItem(posKey, JSON.stringify(out)); } catch { /* gizli sekme vb. */ }
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ids = new Set(fish.map((f) => f.id));
    for (const id of [...movers.keys()]) if (!ids.has(id)) movers.delete(id);

    const bounds = (m: Mover) => ({
      minX: 0.5,
      maxX: Math.max(0.5, 99.5 - m.size),
      minY: FISH_TOP,
      maxY: Math.max(FISH_TOP, fishBottom - m.h - LABEL_H),
    });
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    // Merkez: balık + altındaki isim etiketi birlikte
    const cx = (m: Mover, x = m.x) => x + m.size / 2;
    const cy = (m: Mover, y = m.y) => y + (m.h + LABEL_H) / 2;
    // İki balığın "kişisel alanı" (etiket dahil, biraz boşlukla)
    const reachX = (a: Mover, o: Mover) => (a.size + o.size) / 2 + SPACE_X;
    const reachY = (a: Mover, o: Mover) => (a.h + o.h) / 2 + LABEL_H + SPACE_Y;
    /** Yeni hedef: birkaç aday noktadan diğer balıklara (ve hedeflerine) en uzak olanı; balıklar akvaryuma yayılır */
    const pickTarget = (m: Mover) => {
      const b = bounds(m);
      let best = { x: m.x, y: m.y, score: -1 };
      for (let i = 0; i < TARGET_CANDIDATES; i++) {
        const x = b.minX + Math.random() * (b.maxX - b.minX);
        const y = b.minY + Math.random() * (b.maxY - b.minY);
        let score = Infinity;
        movers.forEach((o) => {
          if (o === m) return;
          for (const [ox, oy] of [[cx(o), cy(o)], [cx(o, o.tx), cy(o, o.ty)]]) {
            const d = Math.hypot((cx(m, x) - ox) / reachX(m, o), (cy(m, y) - oy) / reachY(m, o));
            if (d < score) score = d;
          }
        });
        if (score > best.score) best = { x, y, score };
      }
      m.tx = best.x;
      m.ty = best.y;
    };
    /** Büyük balık yavaş ve ağır, küçük balık daha çevik; her balığın kendi temposu var */
    const speedFor = (size: number, id: string) => 0.7 + 2 * (1 - Math.min(1, size / 13)) + seeded(id, 8) * 0.5;
    const agilityFor = (size: number) => 0.8 + 1.2 * (1 - Math.min(1, size / 13));
    const paint = (id: string, m: Mover) => {
      const el = swimmerRefs.current.get(id);
      if (el) el.style.transform = `translate3d(${m.x.toFixed(2)}cqw, ${m.y.toFixed(2)}cqw, 0)`;
      const face = faceRefs.current.get(id);
      if (face) face.style.transform = `scaleX(${m.face})`;
    };

    for (const f of fish) {
      const L = layout[f.id];
      const h = L.size * FISH_RATIO;
      const existing = movers.get(f.id);
      if (existing) {
        existing.base = L.size;
        existing.real = f.points;
        const extra = mealsRef.current.filter((x) => x.eaterId === f.id).reduce((a, x) => a + x.amount, 0);
        existing.points = f.points + extra;
        existing.size = grownSize(L.size, f.points, extra);
        existing.h = existing.size * FISH_RATIO;
        existing.speed = speedFor(L.size, f.id);
        const b = bounds(existing);
        existing.x = clamp(existing.x, b.minX, b.maxX);
        existing.y = clamp(existing.y, b.minY, b.maxY);
      } else {
        const m: Mover = {
          x: L.left, y: L.top, tx: L.left, ty: L.top, vx: 0, vy: 0, size: L.size, h, points: f.points, base: L.size, real: f.points,
          speed: speedFor(L.size, f.id),
          face: seeded(f.id, 9) < 0.5 ? 1 : -1,
          rest: 0, mode: 'wander', modeUntil: 0,
        };
        pickTarget(m);
        const last = saved[f.id];
        if (last) {
          const b = bounds(m);
          m.x = clamp(last[0], b.minX, b.maxX);
          m.y = clamp(last[1], b.minY, b.maxY);
          m.face = last[2] === -1 ? -1 : 1;
        }
        movers.set(f.id, m);
      }
    }
    movers.forEach((m, id) => paint(id, m));
    if (reduce) {
      mealsRef.current = [];
      movers.forEach((m) => { m.hidden = false; });
      return;
    }

    const busyUntil = new Map<string, number>();
    const timers: number[] = [];
    // Akvaryum genelinde iki saldırı arası 8–16 sn (dakikada en fazla ~5)
    let nextChaseAt = Date.now() + 4000;

    const startChase = (bigId: string, big: Mover, smallId: string, small: Mover, now: number) => {
      const away: 1 | -1 = small.x + small.size / 2 >= big.x + big.size / 2 ? 1 : -1;
      const feasting = swallowRef.current;
      big.mode = 'chase';
      big.preyId = smallId;
      big.chaseAt = now;
      small.wobble = Math.random() * Math.PI * 2;
      big.modeUntil = now + (feasting ? SWALLOW_CHASE_MS : CHASE_MS);
      small.mode = 'flee';
      small.modeUntil = now + (feasting ? SWALLOW_FLEE_MS : FLEE_MS);
      const b = bounds(small);
      // Duvara sıkışmışsa öbür yana değil yukarı/aşağı kaçar
      const room = away > 0 ? b.maxX - small.x : small.x - b.minX;
      small.tx = room > 12 ? clamp(small.x + away * 30, b.minX, b.maxX) : small.x;
      small.ty = clamp(small.y + (room > 12 ? (Math.random() - 0.5) * 14 : (small.y > (b.minY + b.maxY) / 2 ? -18 : 18)), b.minY, b.maxY);
      busyUntil.set(bigId, now + (feasting ? SWALLOW_COOLDOWN_MS : CHASE_COOLDOWN_MS));
      busyUntil.set(smallId, now + (feasting ? SWALLOW_COOLDOWN_MS : CHASE_COOLDOWN_MS));
      nextChaseAt = now + (feasting ? 2500 + Math.random() * 3000 : 8000 + Math.random() * 8000);
      setChase({ [bigId]: 'chase', [smallId]: 'flee' });
      playChase();
      timers.push(window.setTimeout(() => setChase({}), feasting ? SWALLOW_FLEE_MS : FLEE_MS));
    };

    // ---- Yutma modu ----
    /** Yutanın boyunu geçici puanına göre yeniden hesaplar */
    const regrow = (id: string) => {
      const m = movers.get(id);
      if (!m) return;
      const extra = mealsRef.current.filter((x) => x.eaterId === id).reduce((a, x) => a + x.amount, 0);
      m.points = m.real + extra;
      m.size = grownSize(m.base, m.real, extra);
      m.h = m.size * FISH_RATIO;
      const b = bounds(m);
      m.x = clamp(m.x, b.minX, b.maxX);
      m.y = clamp(m.y, b.minY, b.maxY);
    };
    let gulps: Record<string, number> = {};
    const publish = () => {
      const bonus: Record<string, number> = {};
      const eaten: Record<string, true> = {};
      const swallowing: Record<string, true> = {};
      const gulping: Record<string, true> = {};
      for (const x of mealsRef.current) {
        bonus[x.eaterId] = (bonus[x.eaterId] || 0) + x.amount;
        eaten[x.preyId] = true;
      }
      movers.forEach((m, id) => {
        if (m.gulpBy) { swallowing[id] = true; gulping[m.gulpBy] = true; }
      });
      setFeast({ bonus, eaten, swallowing, gulping, gulp: gulps });
    };
    /** Balığın burun ucu (cqw): gittiği yöne göre sağ ya da sol uç */
    const mouthX = (m: Mover) => m.x + m.size * (m.face > 0 ? MOUTH_AT : 1 - MOUTH_AT);
    const mouthY = (m: Mover) => m.y + m.h * 0.55;
    /** Yutulan geri gelir: akvaryumun rastgele bir yerinde belirir */
    const release = (preyId: string) => {
      const m = movers.get(preyId);
      if (!m) return;
      m.hidden = false;
      m.mode = 'wander';
      m.preyId = undefined;
      m.vx = 0;
      m.vy = 0;
      const b = bounds(m);
      m.x = b.minX + Math.random() * (b.maxX - b.minX);
      m.y = b.minY + Math.random() * (b.maxY - b.minY);
      pickTarget(m);
      busyUntil.set(preyId, Date.now() + SWALLOW_COOLDOWN_MS * 2);
    };
    /** 1. aşama: yakalandı. Büyük balık durup ağzını açar, av ağzına çekilir (yüzme döngüsü taşır) */
    const swallow = (bigId: string, big: Mover, smallId: string, small: Mover, now: number) => {
      small.gulpBy = bigId;
      small.gulpUntil = now + GULP_MS;
      small.mode = 'wander';
      small.preyId = undefined;
      big.mode = 'wander';
      big.preyId = undefined;
      big.modeUntil = 0;
      big.vx *= 0.2;
      big.vy *= 0.2;
      big.tx = big.x;
      big.ty = big.y;
      big.rest = GULP_MS / 1000 + 0.3;
      // Ağız, avı tamamen içine alacak kadar açılır (avın yüksekliği / yutanın yüksekliği)
      const gape = Math.min(4.6, Math.max(1.6, (small.h / big.h) * (92 / 18) * 1.05));
      const el = swimmerRefs.current.get(bigId);
      if (el) {
        el.style.setProperty('--gape-y', gape.toFixed(2));
        el.style.setProperty('--gape-x', Math.min(2.1, Math.max(1.5, gape * 0.5)).toFixed(2));
      }
      busyUntil.set(bigId, now + SWALLOW_COOLDOWN_MS);
      setChase({});
      publish();
    };
    /** 2. aşama: av midede. Yutan geçici 5 puan alır (bir şekil), yutkunup büyür */
    const finishSwallow = (smallId: string, small: Mover, now: number) => {
      const bigId = small.gulpBy!;
      small.gulpBy = undefined;
      small.gulpUntil = undefined;
      small.hidden = true;
      if (!movers.get(bigId) || movers.get(bigId)!.hidden) {
        // Yutan bu arada kendisi yutulduysa av kurtulur
        release(smallId);
        publish();
        return;
      }
      // Yutulanın midesindekiler kurtulur ve hemen geri gelir (yutan yalnızca 5 puan alır, onları devralmaz)
      const freed = mealsRef.current.filter((x) => x.eaterId === smallId);
      mealsRef.current = mealsRef.current.filter((x) => x.eaterId !== smallId);
      for (const x of freed) { release(x.preyId); regrow(x.preyId); }
      mealsRef.current.push({ eaterId: bigId, preyId: smallId, amount: SWALLOW_POINTS, until: now + SWALLOW_MS });
      regrow(smallId);
      regrow(bigId);
      gulps = { ...gulps, [bigId]: now };
      playGulp();
      publish();
      timers.push(window.setTimeout(() => {
        const { [bigId]: at, ...rest } = gulps;
        if (at === now) { gulps = rest; publish(); }
      }, 1400));
    };
    /** Süresi dolanları geri getir; mod kapatıldıysa herkesi hemen bırak */
    const settleMeals = (now: number) => {
      if (!swallowRef.current) {
        movers.forEach((m, id) => {
          if (m.gulpBy) { m.gulpBy = undefined; m.gulpUntil = undefined; release(id); publish(); }
        });
      }
      const meals = mealsRef.current;
      if (!meals.length) return;
      const done = swallowRef.current ? meals.filter((x) => x.until <= now) : meals;
      if (!done.length) return;
      mealsRef.current = meals.filter((x) => !done.includes(x));
      for (const x of done) {
        release(x.preyId);
        regrow(x.eaterId);
        regrow(x.preyId);
      }
      publish();
    };
    // Önceki açılıştan kalan yutma durumunu (yeniden çizimde) ekrana yansıt
    movers.forEach((m, id) => { m.hidden = mealsRef.current.some((x) => x.preyId === id); });
    queueMicrotask(publish);

    const checkChase = (now: number) => {
      if (now < nextChaseAt) return;
      for (const m of movers.values()) if (m.mode !== 'wander') return; // aynı anda tek kovalamaca
      const feasting = swallowRef.current;
      for (const [bigId, big] of movers) {
        if (big.hidden || big.gulpBy || (busyUntil.get(bigId) || 0) > now) continue;
        for (const [smallId, small] of movers) {
          if (smallId === bigId || small.hidden || small.gulpBy || (busyUntil.get(smallId) || 0) > now) continue;
          if (feasting ? !canSwallow(big.points, small.points) : big.points < CHASE_RATIO * small.points) continue;
          const dx = (small.x + small.size / 2) - (big.x + big.size / 2);
          const dy = (small.y + small.h / 2) - (big.y + big.h / 2);
          const gap = Math.abs(dx) - (big.size + small.size) / 2;
          if (gap < CHASE_GAP && Math.abs(dy) < Math.max(big.h, small.h)) {
            startChase(bigId, big, smallId, small, now);
            return;
          }
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    let sinceCheck = 0;
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const now = Date.now();
      movers.forEach((m, id) => {
        if (m.hidden) return;
        // Yakalandı: av çırpınarak kaçmaya devam eder; büyük balık ağzını açıp öne atılır ve avı ağzına alır.
        // Av yutanın arkasında çizilir, açık ağzın ve başın altında kaybolur (küçülmez)
        if (m.gulpBy) {
          const eater = movers.get(m.gulpBy);
          if (eater) {
            const progress = 1 - Math.max(0, (m.gulpUntil || 0) - now) / GULP_MS;
            const opening = progress < GULP_OPEN;
            const b = bounds(m);
            m.face = eater.face;
            m.x = clamp(m.x + m.face * (opening ? 4 : 1.5) * dt, b.minX, b.maxX);
            // Ağzın hizasına gelir; son anda başın içine doğru çekilir
            const inside = opening ? 0 : (progress - GULP_OPEN) / (1 - GULP_OPEN);
            m.y += (mouthY(eater) - m.h / 2 - m.y) * Math.min(1, dt * (opening ? 3 : 8));
            if (inside > 0.55) m.x += (mouthX(eater) - eater.face * m.size * 0.2 - m.size / 2 - m.x) * Math.min(1, dt * 10);
            // Yutan: açılırken avın kuyruğuna yanaşır, sonra ağzını avın burnunun ötesine atar
            const eb = bounds(eater);
            const reach = opening ? cx(m) - eater.face * m.size * 0.5 : cx(m) + eater.face * m.size * 0.5;
            const want = reach - eater.size * (eater.face > 0 ? MOUTH_AT : 1 - MOUTH_AT);
            eater.x = clamp(eater.x + (want - eater.x) * Math.min(1, dt * (opening ? 4 : 11)), eb.minX, eb.maxX);
            eater.y = clamp(eater.y + (m.y + m.h / 2 - eater.h * 0.55 - eater.y) * Math.min(1, dt * 6), eb.minY, eb.maxY);
            eater.vx = 0;
            eater.vy = 0;
            paint(id, m);
            paint(m.gulpBy, eater);
          }
          if (now >= (m.gulpUntil || 0)) finishSwallow(id, m, now);
          return;
        }
        if (m.mode !== 'wander' && now > m.modeUntil) {
          m.mode = 'wander';
          m.preyId = undefined;
          pickTarget(m);
        }
        const b = bounds(m);
        if (swallowRef.current && m.mode === 'flee') {
          let hunter: Mover | undefined;
          movers.forEach((o) => { if (o.preyId === id && o.mode === 'chase') hunter = o; });
          if (hunter) {
            let ax = cx(m) - cx(hunter);
            let ay = cy(m) - cy(hunter);
            const d = Math.hypot(ax, ay) || 1;
            ax /= d;
            ay /= d;
            // Duvara sıkıştıysa yukarı ya da aşağı sıyrılıp avcının yanından geçmeye çalışır
            const wallX = (ax < 0 && m.x - b.minX < 4) || (ax > 0 && b.maxX - m.x < 4);
            if (wallX) { ay = m.y > (b.minY + b.maxY) / 2 ? -1 : 1; ax *= -0.5; }
            if ((ay < 0 && m.y - b.minY < 2) || (ay > 0 && b.maxY - m.y < 2)) ay = -ay * 0.5;
            const zig = Math.sin(now / 180 + (m.wobble || 0)) * 0.6;
            m.tx = clamp(m.x + (ax - ay * zig) * 20, b.minX, b.maxX);
            m.ty = clamp(m.y + (ay + ax * zig) * 20, b.minY, b.maxY);
          }
        }
        if (m.mode === 'chase' && m.preyId) {
          const prey = movers.get(m.preyId);
          if (prey && !prey.hidden && !prey.gulpBy) {
            if (swallowRef.current) {
              // Yutma modu: ağzını (burun ucunu) avın ortasına getirmeye çalışır
              const toRight = cx(prey) >= cx(m);
              m.tx = clamp(cx(prey) - m.size * (toRight ? MOUTH_AT : 1 - MOUTH_AT), b.minX, b.maxX);
              m.ty = clamp(prey.y + prey.h / 2 - m.h * 0.55, b.minY, b.maxY);
              if (canSwallow(m.points, prey.points)
                  && now - (m.chaseAt || 0) > SWALLOW_MIN_CHASE_MS
                  && Math.abs(cx(prey) - mouthX(m)) < Math.max(prey.size * 0.6, m.size * 0.18)
                  && Math.abs((prey.y + prey.h / 2) - mouthY(m)) < Math.max(prey.h, m.h * 0.35)) {
                swallow(id, m, m.preyId, prey, now);
              }
            } else {
              m.tx = clamp(prey.x + (prey.size - m.size) / 2, b.minX, b.maxX);
              m.ty = clamp(prey.y + (prey.h - m.h) / 2, b.minY, b.maxY);
            }
          }
        }
        const dx = m.tx - m.x;
        const dy = m.ty - m.y;
        const dist = Math.hypot(dx, dy);
        // Hedefe varınca bazen kısa bir mola, sonra yeni hedef
        if (m.mode === 'wander') {
          if (m.rest > 0) {
            m.rest -= dt;
            if (m.rest <= 0) pickTarget(m);
          } else if (dist < 0.8) {
            if (Math.random() < 0.35) m.rest = 0.6 + Math.random() * 1.6;
            else pickTarget(m);
          }
        }
        const boost = m.mode === 'chase' ? (swallowRef.current ? 3.6 : 2.6) : m.mode === 'flee' ? (swallowRef.current ? 1.1 : 3.6) : 1;
        // Yutma modunda büyük (yavaş) balık da avına yetişebilsin: kovalayana hız tabanı, kaçana tavan
        let sp = m.speed * boost;
        if (m.rest > 0) sp = 0;
        else if (swallowRef.current && m.mode === 'flee') sp = FEAST_FLEE + m.speed * 0.5;
        else if (swallowRef.current && m.mode === 'chase') {
          // Önce avın biraz gerisinde kalır (kovalamaca görünsün), sonra atak yapıp yetişir
          const prey = m.preyId ? movers.get(m.preyId) : undefined;
          const run = FEAST_FLEE + (prey?.speed || 0) * 0.5;
          sp = run * (now - (m.chaseAt || 0) < SWALLOW_MIN_CHASE_MS ? 0.85 : 1.4);
        }
        let wantVx = dist > 0.05 ? (dx / dist) * sp : 0;
        let wantVy = dist > 0.05 ? (dy / dist) * sp * 0.75 : 0;

        // Kişisel alan: çok yaklaşan balıktan yumuşakça uzaklaş (kovalamaca çifti birbirini itmez)
        let sepX = 0;
        let sepY = 0;
        movers.forEach((o, oid) => {
          if (o === m || o.hidden || o.gulpBy || oid === m.preyId || o.preyId === id) return;
          const nx = (cx(m) - cx(o)) / reachX(m, o);
          const ny = (cy(m) - cy(o)) / reachY(m, o);
          const d = Math.hypot(nx, ny);
          if (d >= 1) return;
          if (d < 0.001) { sepX += Math.random() - 0.5; return; }
          const w = 1 - d;
          sepX += (nx / d) * w;
          sepY += (ny / d) * w;
        });
        wantVx += sepX * SEPARATION;
        wantVy += sepY * SEPARATION;

        const turn = Math.min(1, dt * (m.mode === 'wander' ? agilityFor(m.size) : 6));
        m.vx += (wantVx - m.vx) * turn;
        m.vy += (wantVy - m.vy) * turn;
        m.x = clamp(m.x + m.vx * dt, b.minX, b.maxX);
        m.y = clamp(m.y + m.vy * dt, b.minY, b.maxY);
        if (Math.abs(m.vx) > 0.3) m.face = m.vx > 0 ? 1 : -1;
        paint(id, m);
      });
      sinceCheck += dt;
      if (sinceCheck > CHASE_CHECK_S) {
        sinceCheck = 0;
        settleMeals(now);
        checkChase(now);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Konumları 2 sn'de bir ve sayfa kapanırken kaydet
    const saveTimer = window.setInterval(savePositions, 2000);
    window.addEventListener('pagehide', savePositions);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(saveTimer);
      window.removeEventListener('pagehide', savePositions);
      savePositions();
      timers.forEach((tm) => window.clearTimeout(tm));
      movers.forEach((m) => { m.mode = 'wander'; m.preyId = undefined; });
    };
  }, [fish, layout, fishBottom, scopeKey, playChase, playGulp]);

  const fishCount = fish.length;
  const summary = `${title}: ${fishCount} balık, ${eggs.length} yumurta`;

  return (
    <div ref={stageRef} className={`${styles.stage} ${full ? styles.full : ''}`}>
      {!full && (
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.counts}>{fishCount} balık · {eggs.length} yumurta</p>
          </div>
        </div>
      )}

      <div ref={tankRef} className={styles.tank} role="img" aria-label={summary}>
        <div className={styles.rays} aria-hidden="true" />

        {BUBBLES.map((x, i) => (
          <span
            key={x}
            className={styles.bubble}
            aria-hidden="true"
            style={{ '--x': `${x}cqw`, '--d': `${7 + (i % 4) * 2.2}s`, '--delay': `${-i * 1.7}s`, '--s': `${0.6 + (i % 3) * 0.35}cqw` } as CSSVars}
          />
        ))}

        {PLANTS.map((p) => (
          <svg
            key={p.x}
            className={styles.plant}
            viewBox="0 0 40 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ '--x': `${p.x}cqw`, '--h': `${p.h}cqw`, '--hue': `${p.hue}deg`, '--sway': p.flip ? '-3deg' : '3deg', '--sand': `${sandH - 1.5}cqw` } as CSSVars}
          >
            <path d="M20 100 Q8 70 18 48 Q28 26 14 2" fill="none" stroke="#2f9e5b" strokeWidth={7} strokeLinecap="round" />
            <path d="M20 100 Q32 76 24 56 Q18 40 30 22" fill="none" stroke="#3dbb6c" strokeWidth={5} strokeLinecap="round" />
          </svg>
        ))}

        <div className={styles.sand} style={{ height: `${sandH}cqw` }} aria-hidden="true">
          <svg className={styles.sandEdge} viewBox="0 0 100 6" preserveAspectRatio="none">
            <path d="M0 6 L0 3 Q12 0 25 2.5 T50 2 T75 3 T100 2 L100 6 Z" fill="#e8cf98" />
          </svg>
          <span className={styles.rock} style={{ left: '14cqw', width: '6cqw' }} />
          <span className={styles.rock} style={{ left: '78cqw', width: '8cqw' }} />
        </div>

        {fish.map((s) => {
          const { left, top, size: baseSize } = layout[s.id];
          // Yutma modunda geçici puanla büyür (yalnızca ekranda)
          const extra = feast.bonus[s.id] || 0;
          const shown = s.points + extra;
          const size = grownSize(baseSize, s.points, extra);
          const h = size * FISH_RATIO;
          const me = s.id === highlightId;
          const born = newlyHatched.has(s.id);
          const form = fishForm(shown);
          const role = chase[s.id];
          const eaten = !!feast.eaten[s.id];
          const swallowing = !!feast.swallowing[s.id];
          const gulping = !!feast.gulping[s.id];
          const gulped = !!feast.gulp[s.id];
          return (
            <div
              key={s.id}
              ref={(el) => { if (el) swimmerRefs.current.set(s.id, el); else swimmerRefs.current.delete(s.id); }}
              className={`${styles.swimmer} ${born ? styles.born : ''} ${role === 'chase' ? styles.chasing : ''} ${role === 'flee' ? styles.fleeing : ''} ${eaten ? styles.eaten : ''} ${extra > 0 ? styles.fed : ''} ${swallowing ? styles.swallowing : ''} ${gulping ? styles.gulping : ''} ${gulped ? styles.gulped : ''}`}
              aria-hidden={eaten || undefined}
              style={{
                // Başlangıç konumu; sonrasını yüzme motoru yazar
                transform: `translate3d(${left.toFixed(2)}cqw, ${top.toFixed(2)}cqw, 0)`,
                width: `${size}cqw`,
                '--bob': `${(3 + seeded(s.id, 3) * 2.5).toFixed(1)}s`,
              } as CSSVars}
            >
              <div className={styles.bob}>
                <div className={`${styles.flip} ${me ? styles.meGlow : ''}`} style={{ height: `${h}cqw`, '--hue': `${((seeded(s.id, 7) - 0.5) * 36).toFixed(0)}deg` } as CSSVars}>
                  <div ref={(el) => { if (el) faceRefs.current.set(s.id, el); else faceRefs.current.delete(s.id); }} className={styles.face}>
                    <FishArt form={form} crown={shown >= CROWN_POINTS} mouthClassName={styles.mouth} />
                    {shown >= SPARKLE_POINTS && (
                      <span className={styles.sparkles} aria-hidden="true"><i /><i /><i /></span>
                    )}
                  </div>
                  {role === 'flee' && <span className={styles.yikes} aria-hidden="true">!</span>}
                </div>
                <span className={`${styles.label} ${me ? styles.labelMe : ''}`}>
                  {me && <b>Sen</b>}{names[s.id]}
                </span>
                {born && <span className={styles.bornBadge}>Yumurtadan çıktı!</span>}
                {feast.gulp[s.id] && <span key={feast.gulp[s.id]} className={styles.gulpBadge} aria-hidden="true">Hap! +{extra}</span>}
              </div>
            </div>
          );
        })}

        {eggs.length > 0 && (
          <div
            className={styles.eggs}
            style={{ '--cols': eggCols, '--egg-w': `${eggW}cqw`, '--egg-h': `${eggH}cqw` } as CSSVars}
          >
            {eggs.map((s) => {
              const cracks = eggCracks(s.points);
              const me = s.id === highlightId;
              return (
                <div key={s.id} className={`${styles.egg} ${cracks >= 3 ? styles.eggWobble : ''} ${me ? styles.meGlow : ''}`}>
                  <EggArt cracks={cracks} />
                  <span className={`${styles.eggName} ${me ? styles.eggNameMe : ''}`}>{me ? 'Sen' : names[s.id]}</span>
                </div>
              );
            })}
          </div>
        )}

        {students.length === 0 && <p className={styles.empty}>Bu sınıfta henüz öğrenci yok.</p>}

        <button
          type="button"
          className={`${styles.fullButton} ${styles.soundButton}`}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Akvaryum sesini kapat' : 'Akvaryum sesini aç'}
          title={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}
        >
          {soundEnabled ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          <span>{soundEnabled ? 'Ses açık' : 'Sesi aç'}</span>
        </button>
        {soundUnavailable && <p className={styles.soundNotice} role="status">Ses açılamadı. Sesi aç düğmesiyle tekrar deneyin.</p>}

        <button
          type="button"
          className={styles.fullButton}
          onClick={toggleFull}
          aria-label={full ? 'Tam ekrandan çık' : 'Akvaryumu tam ekran aç'}
          title={full ? 'Tam ekrandan çık (Esc)' : 'Tam ekran'}
        >
          {full ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
          <span>{full ? 'Küçült' : 'Tam ekran'}</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          role="switch"
          aria-checked={swallowOn}
          className={`${styles.switch} ${swallowOn ? styles.switchOn : ''}`}
          onClick={toggleSwallow}
        >
          <span className={styles.switchTrack} aria-hidden="true"><span className={styles.switchThumb} /></span>
          Balıklar birbirini yutsun
        </button>
        <p className={styles.toolbarHint}>
          {!swallowOn
            ? 'Kapalı: büyük balık küçüğü kovalar, küçük kaçar.'
            : reducedMotion
              ? 'Bu cihazda hareket azaltma açık olduğu için balıklar yüzmüyor.'
              : 'Açık: balık, kendinden küçük şekildeki balığı yutar ve bir dakikalığına 5 puan alıp bir şekil büyür. En büyük şekilde (Ejder) puanı fazla olan diğerini yutar. Yutulan balık bir dakika sonra geri gelir. Gerçek puanlar değişmez.'}
        </p>
      </div>

      {/* Ekran okuyucular için liste */}
      <ul className={styles.srOnly}>
        {students.map((s) => (
          <li key={s.id}>
            {s.name}: {s.points} puan, {isFish(s) ? `${FORM_NAMES[fishForm(s.points) - 1]} balık` : `yumurta (${eggCracks(s.points)} çatlak)`}
          </li>
        ))}
      </ul>
    </div>
  );
}
