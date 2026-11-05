'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Maximize, Minimize } from '../icons';
import {
  AquariumInput, CROWN_POINTS, SPARKLE_POINTS, eggCracks, fishForm, fishSize, isFish, seeded, shortNames,
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

const TANK_H = 56.25; // 16:9 → yükseklik = genişliğin %56.25'i (cqw)
const FISH_RATIO = 92 / 124; // FishArt viewBox oranı

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

  // ---- Balık yerleşimi: kalabalık sınıfta daha çok sütun; her sütunda balıklar boylarına göre dağıtılır ----
  const fishTop = 4.5;
  const fishBottom = TANK_H - sandH - 1;
  const LABEL_H = 2.7; // isim etiketi + boşluk (cqw)
  const layout = useMemo(() => {
    const colCount = fish.length <= 8 ? 2 : fish.length <= 18 ? 3 : 4;
    const cols: AquariumInput[][] = Array.from({ length: colCount }, () => []);
    fish.forEach((f, i) => cols[i % colCount].push(f));
    const region = fishBottom - fishTop;
    const colW = 96 / colCount;
    // Sütun sığmıyorsa balıklar orantılı küçültülür (en fazla %35; daha kalabalıksa hafif üst üste binebilir)
    const need = Math.max(...cols.map((c) => c.reduce((sum, f) => sum + (fishSize(f.points) / 10) * FISH_RATIO + LABEL_H, 0)), 0.001);
    const scale = Math.max(0.65, Math.min(1, region / need));
    const out: Record<string, { left: number; top: number; size: number; dist: number }> = {};
    cols.forEach((col, ci) => {
      const heights = col.map((f) => (fishSize(f.points) / 10) * scale * FISH_RATIO);
      const used = heights.reduce((a, h) => a + h + LABEL_H, 0);
      const gap = col.length ? (region - used) / col.length : 0;
      let y = fishTop + Math.max(0, gap) / 2;
      col.forEach((f, i) => {
        const size = (fishSize(f.points) / 10) * scale;
        const minX = 2 + ci * colW;
        const maxX = minX + colW; // sütunlar yatayda birbirine karışmaz
        const room = Math.max(0, maxX - minX - size);
        const left = minX + seeded(f.id, 2) * room * 0.4;
        const dist = Math.max(0, Math.min(room * (0.5 + seeded(f.id, 3) * 0.4), maxX - left - size));
        out[f.id] = { left, top: y, size, dist };
        y += heights[i] + LABEL_H + gap;
      });
    });
    return out;
  }, [fish, fishBottom]);

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

      <div className={styles.tank} role="img" aria-label={summary}>
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
          const { left, top, size, dist } = layout[s.id];
          const h = size * FISH_RATIO;
          const r2 = seeded(s.id, 3);
          const r3 = seeded(s.id, 4);
          const duration = 16 + r3 * 14;
          const delay = -seeded(s.id, 5) * duration;
          const me = s.id === highlightId;
          const born = newlyHatched.has(s.id);
          const form = fishForm(s.points);
          return (
            <div
              key={s.id}
              className={`${styles.swimmer} ${born ? styles.born : ''}`}
              style={{
                left: `${left}cqw`,
                top: `${top}cqw`,
                width: `${size}cqw`,
                '--dist': `${dist}cqw`,
                '--dur': `${duration.toFixed(1)}s`,
                '--delay': `${delay.toFixed(1)}s`,
                '--bob': `${(3 + r2 * 2.5).toFixed(1)}s`,
              } as CSSVars}
            >
              <div className={styles.bob}>
                <div className={`${styles.flip} ${me ? styles.meGlow : ''}`} style={{ height: `${h}cqw`, '--hue': `${((seeded(s.id, 7) - 0.5) * 36).toFixed(0)}deg` } as CSSVars}>
                  <FishArt form={form} crown={s.points >= CROWN_POINTS} />
                  {s.points >= SPARKLE_POINTS && (
                    <span className={styles.sparkles} aria-hidden="true"><i /><i /><i /></span>
                  )}
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
          <li><strong>5 puan</strong> yumurtadan çıkar; bir daha yumurta olmaz</li>
          <li>Her <strong>5 puanda</strong> yeni balık: {FORM_NAMES.join(' → ')}</li>
          <li>Her puanda biraz büyür · <strong>{SPARKLE_POINTS}</strong> puanda parıltı · <strong>{CROWN_POINTS}</strong> puanda taç</li>
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
