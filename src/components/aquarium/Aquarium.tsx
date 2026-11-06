'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Maximize, Minimize } from '../icons';
import {
  AquariumInput, CHASE_RATIO, CROWN_POINTS, SPARKLE_POINTS, eggCracks, fishForm, fishSize, isFish, seeded, shortNames,
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
const CHASE_COOLDOWN_MS = 9000;
const CHASE_CHECK_S = 0.35;

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
  const stageRef = useRef<HTMLDivElement>(null);
  const tankRef = useRef<HTMLDivElement>(null);
  const swimmerRefs = useRef(new Map<string, HTMLDivElement>());
  const faceRefs = useRef(new Map<string, HTMLDivElement>());
  const moversRef = useRef(new Map<string, Mover>());
  const [chase, setChase] = useState<Record<string, ChaseRole>>({});
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
    const pickTarget = (m: Mover) => {
      const b = bounds(m);
      m.tx = b.minX + Math.random() * (b.maxX - b.minX);
      m.ty = b.minY + Math.random() * (b.maxY - b.minY);
    };
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
        existing.size = L.size;
        existing.h = h;
        existing.points = f.points;
        const b = bounds(existing);
        existing.x = clamp(existing.x, b.minX, b.maxX);
        existing.y = clamp(existing.y, b.minY, b.maxY);
      } else {
        const m: Mover = {
          x: L.left, y: L.top, tx: L.left, ty: L.top, vx: 0, vy: 0, size: L.size, h, points: f.points,
          // Küçük balıklar biraz daha hızlı; her balığın kendi temposu var
          speed: 2 + seeded(f.id, 8) * 1.6 + (1 - Math.min(1, L.size / 14)) * 1.6,
          face: seeded(f.id, 9) < 0.5 ? 1 : -1,
          rest: 0, mode: 'wander', modeUntil: 0,
        };
        pickTarget(m);
        movers.set(f.id, m);
      }
    }
    movers.forEach((m, id) => paint(id, m));
    if (reduce) return;

    const busyUntil = new Map<string, number>();
    const timers: number[] = [];

    const startChase = (bigId: string, big: Mover, smallId: string, small: Mover, now: number) => {
      const away: 1 | -1 = small.x + small.size / 2 >= big.x + big.size / 2 ? 1 : -1;
      big.mode = 'chase';
      big.preyId = smallId;
      big.modeUntil = now + CHASE_MS;
      small.mode = 'flee';
      small.modeUntil = now + FLEE_MS;
      const b = bounds(small);
      // Duvara sıkışmışsa öbür yana değil yukarı/aşağı kaçar
      const room = away > 0 ? b.maxX - small.x : small.x - b.minX;
      small.tx = room > 12 ? clamp(small.x + away * 30, b.minX, b.maxX) : small.x;
      small.ty = clamp(small.y + (room > 12 ? (Math.random() - 0.5) * 14 : (small.y > (b.minY + b.maxY) / 2 ? -18 : 18)), b.minY, b.maxY);
      busyUntil.set(bigId, now + CHASE_COOLDOWN_MS);
      busyUntil.set(smallId, now + CHASE_COOLDOWN_MS);
      setChase({ [bigId]: 'chase', [smallId]: 'flee' });
      timers.push(window.setTimeout(() => setChase({}), FLEE_MS));
    };

    const checkChase = (now: number) => {
      for (const m of movers.values()) if (m.mode !== 'wander') return; // aynı anda tek kovalamaca
      for (const [bigId, big] of movers) {
        if ((busyUntil.get(bigId) || 0) > now) continue;
        for (const [smallId, small] of movers) {
          if (smallId === bigId || (busyUntil.get(smallId) || 0) > now) continue;
          if (big.points < CHASE_RATIO * small.points) continue;
          const dx = (small.x + small.size / 2) - (big.x + big.size / 2);
          const dy = (small.y + small.h / 2) - (big.y + big.h / 2);
          const gap = Math.abs(dx) - (big.size + small.size) / 2;
          if (gap < 4 && Math.abs(dy) < Math.max(big.h, small.h)) {
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
        if (m.mode !== 'wander' && now > m.modeUntil) {
          m.mode = 'wander';
          m.preyId = undefined;
          pickTarget(m);
        }
        const b = bounds(m);
        if (m.mode === 'chase' && m.preyId) {
          const prey = movers.get(m.preyId);
          if (prey) {
            m.tx = clamp(prey.x + (prey.size - m.size) / 2, b.minX, b.maxX);
            m.ty = clamp(prey.y + (prey.h - m.h) / 2, b.minY, b.maxY);
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
        const boost = m.mode === 'chase' ? 2.6 : m.mode === 'flee' ? 3.6 : 1;
        const sp = m.rest > 0 ? 0 : m.speed * boost;
        const wantVx = dist > 0.05 ? (dx / dist) * sp : 0;
        const wantVy = dist > 0.05 ? (dy / dist) * sp * 0.75 : 0;
        const turn = Math.min(1, dt * (m.mode === 'wander' ? 1.6 : 6));
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
        checkChase(now);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((tm) => window.clearTimeout(tm));
      movers.forEach((m) => { m.mode = 'wander'; m.preyId = undefined; });
    };
  }, [fish, layout, fishBottom]);

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
          const { left, top, size } = layout[s.id];
          const h = size * FISH_RATIO;
          const me = s.id === highlightId;
          const born = newlyHatched.has(s.id);
          const form = fishForm(s.points);
          const role = chase[s.id];
          return (
            <div
              key={s.id}
              ref={(el) => { if (el) swimmerRefs.current.set(s.id, el); else swimmerRefs.current.delete(s.id); }}
              className={`${styles.swimmer} ${born ? styles.born : ''} ${role === 'chase' ? styles.chasing : ''} ${role === 'flee' ? styles.fleeing : ''}`}
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
                    <FishArt form={form} crown={s.points >= CROWN_POINTS} mouthClassName={styles.mouth} />
                    {s.points >= SPARKLE_POINTS && (
                      <span className={styles.sparkles} aria-hidden="true"><i /><i /><i /></span>
                    )}
                  </div>
                  {role === 'flee' && <span className={styles.yikes} aria-hidden="true">!</span>}
                </div>
                <span className={`${styles.label} ${me ? styles.labelMe : ''}`}>
                  {me && <b>Sen</b>}{names[s.id]}
                </span>
                {born && <span className={styles.bornBadge}>Yumurtadan çıktı!</span>}
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
          className={styles.fullButton}
          onClick={toggleFull}
          aria-label={full ? 'Tam ekrandan çık' : 'Akvaryumu tam ekran aç'}
          title={full ? 'Tam ekrandan çık (Esc)' : 'Tam ekran'}
        >
          {full ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
          <span>{full ? 'Küçült' : 'Tam ekran'}</span>
        </button>
      </div>

      {!full && (
        <ul className={styles.legend}>
          <li><span className={styles.legendEgg} aria-hidden="true" />5 puanın altı: yumurta (her puanda bir çatlak)</li>
          <li><strong>5 puanda</strong> yumurtadan çıkar; 5 puanın altına düşerse yeniden yumurta olur</li>
          <li>Her <strong>5 puanda</strong> yeni balık: {FORM_NAMES.join(' → ')}</li>
          <li>Her puanda büyür · <strong>{SPARKLE_POINTS}</strong> puanda parıltı · <strong>{CROWN_POINTS}</strong> puanda taç</li>
          <li>Puanı yaklaşık <strong>iki katı</strong> olan balık yanındaki küçüğe saldırır, küçük kaçar</li>
        </ul>
      )}

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
