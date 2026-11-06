'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen } from '../icons';
import { Spinner } from '../Spinner';
import { getReadingOverview, ReadingOverviewContest } from '../../lib/readingData';
import { MedalBadge } from './TeacherReadingPage';
import styles from './Reading.module.css';

const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

/** Öğrenci: kendi okuma hızı, gelişimi, sınıfta ilk 10 ve kendi yeri */
export function StudentReadingPage() {
  const [contests, setContests] = useState<ReadingOverviewContest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    let alive = true;
    getReadingOverview().then((res) => {
      if (!alive) return;
      if (res.ok) setContests(res.data);
      else setError(`Okuma yarışmaları alınamadı: ${res.error}`);
    });
    return () => { alive = false; };
  }, []);

  if (error) return <p className={styles.error} role="alert">{error}</p>;
  if (!contests) return <Spinner center label="Yükleniyor…" />;
  if (!contests.length) {
    return (
      <section className={styles.empty}>
        <BookOpen size={32} aria-hidden="true" />
        <h2>Henüz okuma yarışması yok</h2>
        <p>Öğretmenin sınıfında okuma yarışması yaptığında sonucun ve sıralaman burada görünecek.</p>
      </section>
    );
  }

  const active = contests.find((c) => c.id === activeId) || contests[0];
  const mine = active.mine;
  const meInTop = active.top.some((t) => t.me);

  return (
    <div className={styles.page}>
      <div className={styles.tabs} role="group" aria-label="Yarışma seç">
        {contests.map((c) => (
          <button key={c.id} type="button" aria-pressed={c.id === active.id} onClick={() => setActiveId(c.id)}>{c.title}</button>
        ))}
      </div>

      <section className={styles.hero} aria-label={`${active.title} sonucun`}>
        <p className={styles.heroKicker}>{active.title} · {shortDate(active.date)}{active.finished ? '' : ' · sürüyor'}</p>
        {mine ? (
          <>
            <p className={styles.heroValue}><strong>{mine.words}</strong> kelime/dk</p>
            <p className={styles.heroText}>
              Sınıfta <b>{mine.rank}.</b> sıradasın ({active.participants} öğrenci)
              {mine.medal ? ` · ${['', 'altın', 'gümüş', 'bronz'][mine.medal]} madalya` : ''}
              {mine.late ? ' · sonradan ölçüldün' : ''}
            </p>
            {mine.gain != null && (
              <p className={styles.heroText}>
                {mine.gain > 0 ? `Bir önceki yarışmadan ${mine.gain} kelime daha hızlısın!`
                  : mine.gain === 0 ? 'Bir önceki yarışmayla aynı hızdasın.'
                  : `Bir önceki yarışmadan ${-mine.gain} kelime yavaşsın. Bir dahakine daha iyi olacak!`}
              </p>
            )}
          </>
        ) : (
          <p className={styles.heroText}>Bu yarışmada henüz ölçülmedin.</p>
        )}
        {active.class_avg != null && <p className={styles.heroMuted}>Sınıf ortalaması: {active.class_avg} kelime/dk</p>}
      </section>

      <ProgressChart contests={contests} />

      <div className={styles.twoCol}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>En hızlılar · ilk 10</h3>
          {active.top.length === 0 ? <p className={styles.muted}>Henüz sonuç yok.</p> : (
            <ol className={styles.list}>
              {active.top.map((t, i) => (
                <li key={`${t.name}-${i}`} className={`${styles.row} ${t.me ? styles.meRow : ''}`}>
                  <MedalBadge rank={t.rank} medal={t.medal} />
                  <span className={styles.who}><strong>{t.me ? `${t.name} (sen)` : t.name}</strong>{t.late && <span>sonradan</span>}</span>
                  <span className={styles.result}><strong>{t.words}</strong></span>
                </li>
              ))}
            </ol>
          )}
          {mine && !meInTop && <p className={styles.muted}>Sen {mine.rank}. sıradasın ({mine.words} kelime).</p>}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>En çok gelişenler · ilk 10</h3>
          {active.top_gain.length === 0 ? (
            <p className={styles.muted}>Gelişim, bir önceki yarışmaya göre hesaplanır.</p>
          ) : (
            <ol className={styles.list}>
              {active.top_gain.map((g, i) => (
                <li key={`${g.name}-${i}`} className={`${styles.row} ${g.me ? styles.meRow : ''}`}>
                  <MedalBadge rank={g.rank} medal={g.rank <= 3 ? (g.rank as 1 | 2 | 3) : null} />
                  <span className={styles.who}><strong>{g.me ? `${g.name} (sen)` : g.name}</strong></span>
                  <span className={`${styles.gain} ${styles.gainUp}`}>+{g.gain}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/** Yarışmadan yarışmaya: kendi hızın ve sınıf ortalaması (çizgi grafik + tablo görünümü) */
function ProgressChart({ contests }: { contests: ReadingOverviewContest[] }) {
  const points = useMemo(() => [...contests].sort((a, b) => a.seq - b.seq), [contests]);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const mineCount = points.filter((p) => p.mine).length;
  if (mineCount === 0) return null;

  const W = 640;
  const H = 220;
  const pad = { l: 40, r: 56, t: 16, b: 32 };
  const values = points.flatMap((p) => [p.mine?.words, p.class_avg]).filter((v): v is number => v != null);
  const maxRaw = Math.max(10, ...values);
  const step = maxRaw > 150 ? 50 : maxRaw > 60 ? 20 : 10;
  const yMax = Math.ceil(maxRaw / step) * step;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const path = (pick: (p: ReadingOverviewContest) => number | null | undefined) =>
    points.map((p, i) => ({ v: pick(p), i })).filter((d) => d.v != null)
      .map((d, k) => `${k ? 'L' : 'M'}${x(d.i).toFixed(1)} ${y(d.v!).toFixed(1)}`).join(' ');
  const ticks = Array.from({ length: yMax / step + 1 }, (_, k) => k * step);
  const lastMine = [...points].map((p, i) => ({ p, i })).reverse().find((d) => d.p.mine);
  const lastAvg = [...points].map((p, i) => ({ p, i })).reverse().find((d) => d.p.class_avg != null);

  return (
    <section className={styles.card} aria-label="Okuma hızı gelişimin">
      <div className={styles.chartHead}>
        <h3 className={styles.cardTitle}>Gelişimin</h3>
        <ul className={styles.legend}>
          <li><span className={styles.swatchMe} aria-hidden="true" />Sen</li>
          <li><span className={styles.swatchAvg} aria-hidden="true" />Sınıf ortalaması</li>
        </ul>
        <button type="button" className={styles.linkButton} onClick={() => setShowTable((v) => !v)}>{showTable ? 'Grafiği göster' : 'Tablo olarak göster'}</button>
      </div>

      {showTable ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">Yarışma</th><th scope="col">Sen</th><th scope="col">Sınıf ortalaması</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id}><th scope="row">{p.title}</th><td>{p.mine?.words ?? '—'}</td><td>{p.class_avg ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.chartBox}>
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label={`Kelime/dk: ${points.map((p) => `${p.seq}. yarışma ${p.mine?.words ?? 'ölçülmedi'}`).join(', ')}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={styles.grid} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className={styles.axis}>{t}</text>
              </g>
            ))}
            {points.map((p, i) => (
              <text key={p.id} x={x(i)} y={H - 10} textAnchor="middle" className={styles.axis}>{p.seq}.</text>
            ))}
            <path d={path((p) => p.class_avg)} className={styles.lineAvg} />
            <path d={path((p) => p.mine?.words)} className={styles.lineMe} />
            {points.map((p, i) => (
              <g key={p.id}>
                {p.class_avg != null && <circle cx={x(i)} cy={y(p.class_avg)} r={4} className={styles.dotAvg} />}
                {p.mine && <circle cx={x(i)} cy={y(p.mine.words)} r={5} className={styles.dotMe} />}
              </g>
            ))}
            {lastMine && <text x={x(lastMine.i) + 10} y={y(lastMine.p.mine!.words) + 4} className={styles.endLabel}>{lastMine.p.mine!.words}</text>}
            {lastAvg && lastAvg.p.class_avg !== lastMine?.p.mine?.words && (
              <text x={x(lastAvg.i) + 10} y={y(lastAvg.p.class_avg!) + 4} className={styles.endLabelMuted}>{lastAvg.p.class_avg}</text>
            )}
            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className={styles.crosshair} />}
            {/* Geniş dokunma alanları: her yarışma sütunu */}
            {points.map((p, i) => {
              const half = points.length === 1 ? (W - pad.l - pad.r) / 2 : (W - pad.l - pad.r) / (points.length - 1) / 2;
              return (
                <rect
                  key={p.id}
                  x={x(i) - half}
                  y={pad.t}
                  width={half * 2}
                  height={H - pad.t - pad.b}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onTouchStart={() => setHover(i)}
                />
              );
            })}
          </svg>
          {hover != null && (
            <div className={styles.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
              <strong>{points[hover].title}</strong>
              <span><i className={styles.swatchMe} aria-hidden="true" />Sen: {points[hover].mine?.words ?? 'ölçülmedi'}</span>
              <span><i className={styles.swatchAvg} aria-hidden="true" />Sınıf: {points[hover].class_avg ?? '—'}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
