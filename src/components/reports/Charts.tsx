'use client';

import React, { useRef, useState } from 'react';
import { Download } from '../icons';
import { downloadSvgAsPng, fileSlug, fmt } from '../../lib/reportData';
import styles from './Reports.module.css';

// Doğrulanmış palet (dataviz): seri 1 mavi, seri 2 turuncu; mürekkep ve ızgara nötr.
// Renkler SVG'nin içine yazılır ki PNG'ye aynen geçsin.
export const SERIES = ['#2a78d6', '#eb6834'];
const INK = '#0b0b0b';
const INK_2 = '#52514e';
const MUTED = '#898781';
const GRID = '#e6e4de';
const SURFACE = '#fcfcfb';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function niceMax(max: number) {
  if (max <= 0) return 10;
  const step = max > 200 ? 50 : max > 100 ? 25 : max > 40 ? 10 : max > 10 ? 5 : 2;
  return Math.ceil(max / step) * step;
}

/** Ortak çerçeve: başlık, gösterge, "Tablo olarak göster", "PNG indir" */
function ChartFrame({ title, legend, svgRef, table, children }: {
  title: string;
  legend?: { name: string; color: string }[];
  svgRef: React.RefObject<SVGSVGElement | null>;
  table: React.ReactNode;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const png = async () => {
    setError(null);
    if (!svgRef.current) { setShowTable(false); return; }
    try { await downloadSvgAsPng(svgRef.current, `${fileSlug(title)}.png`); } catch (e) { setError((e as Error).message); }
  };
  return (
    <figure className={styles.chart}>
      <div className={styles.chartHead}>
        <figcaption className={styles.chartTitle}>{title}</figcaption>
        {legend && legend.length > 1 && (
          <ul className={styles.legend}>
            {legend.map((l) => <li key={l.name}><span style={{ background: l.color }} aria-hidden="true" />{l.name}</li>)}
          </ul>
        )}
        <span className={`${styles.chartTools} ${styles.noPrint}`}>
          <button type="button" className={styles.linkButton} onClick={() => setShowTable((v) => !v)}>{showTable ? 'Grafiği göster' : 'Tablo olarak göster'}</button>
          {!showTable && <button type="button" className={styles.linkButton} onClick={png}><Download size={14} aria-hidden="true" /> PNG</button>}
        </span>
      </div>
      {error && <p className={styles.error} role="alert">PNG oluşturulamadı: {error}</p>}
      {showTable ? table : children}
    </figure>
  );
}

/** Çubuk grafik (ör. not dağılımı): tek seri, değerler çubuk üstünde */
export function BarChart({ title, labels, values, color = SERIES[0], unit = '', describe }: {
  title: string;
  labels: string[];
  values: number[];
  color?: string;
  unit?: string;
  /** Erişilebilir özet */
  describe?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 240;
  const pad = { l: 40, r: 12, t: 22, b: 34 };
  const yMax = niceMax(Math.max(...values, 0));
  const slot = (W - pad.l - pad.r) / Math.max(labels.length, 1);
  const barW = Math.min(64, slot * 0.62);
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const ticks = [0, yMax / 2, yMax];
  const table = (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th scope="col">Aralık</th><th scope="col" className={styles.num}>Değer</th></tr></thead>
        <tbody>{labels.map((l, i) => <tr key={l}><th scope="row">{l}</th><td className={styles.num}>{fmt(values[i])}{unit}</td></tr>)}</tbody>
      </table>
    </div>
  );
  return (
    <ChartFrame title={title} svgRef={svgRef} table={table}>
      <div className={styles.chartBox}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={describe || `${title}: ${labels.map((l, i) => `${l} ${values[i]}${unit}`).join(', ')}`} fontFamily={FONT}>
          <rect x={0} y={0} width={W} height={H} fill={SURFACE} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill={MUTED}>{fmt(t, 0)}</text>
            </g>
          ))}
          {labels.map((l, i) => {
            const cx = pad.l + slot * i + slot / 2;
            const top = y(values[i]);
            const h = Math.max(0, H - pad.b - top);
            return (
              <g key={l} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
                {/* Geniş dokunma alanı */}
                <rect x={cx - slot / 2} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
                {h > 0 && <rect x={cx - barW / 2} y={top} width={barW} height={h} rx={4} fill={color} opacity={hover == null || hover === i ? 1 : 0.55} />}
                <text x={cx} y={top - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK}>{fmt(values[i])}{unit}</text>
                <text x={cx} y={H - 12} textAnchor="middle" fontSize={12} fill={INK_2}>{l}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </ChartFrame>
  );
}

/** Çizgi grafik (ör. puan değişimi, sınav sırasına göre not): 1–2 seri, üzerine gelince değerler */
export function LineChart({ title, labels, series, unit = '', yMin, yMax: yMaxProp, describe }: {
  title: string;
  labels: string[];
  series: { name: string; values: (number | null)[]; color?: string }[];
  unit?: string;
  yMin?: number;
  yMax?: number;
  describe?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 240;
  const pad = { l: 44, r: 56, t: 16, b: 34 };
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const lo = yMin ?? Math.min(0, ...all);
  const hi = yMaxProp ?? niceMax(Math.max(...all, lo + 1));
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  // X ekseninde en fazla ~8 etiket
  const every = Math.max(1, Math.ceil(n / 8));
  const colored = series.map((s, k) => ({ ...s, color: s.color || SERIES[k % SERIES.length] }));
  const path = (vals: (number | null)[]) => vals.map((v, i) => ({ v, i })).filter((d) => d.v != null)
    .map((d, k) => `${k ? 'L' : 'M'}${x(d.i).toFixed(1)} ${y(d.v!).toFixed(1)}`).join(' ');
  const table = (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th scope="col">Zaman</th>{colored.map((s) => <th key={s.name} scope="col" className={styles.num}>{s.name}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={`${l}-${i}`}><th scope="row">{l}</th>{colored.map((s) => <td key={s.name} className={styles.num}>{fmt(s.values[i])}{s.values[i] != null ? unit : ''}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
  const half = n <= 1 ? (W - pad.l - pad.r) / 2 : (W - pad.l - pad.r) / (n - 1) / 2;
  return (
    <ChartFrame title={title} legend={colored} svgRef={svgRef} table={table}>
      <div className={styles.chartBox}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={describe || title} fontFamily={FONT}>
          <rect x={0} y={0} width={W} height={H} fill={SURFACE} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill={MUTED}>{fmt(t, 0)}</text>
            </g>
          ))}
          {labels.map((l, i) => (i % every === 0 || i === n - 1) && (
            <text key={`${l}-${i}`} x={x(i)} y={H - 12} textAnchor="middle" fontSize={12} fill={INK_2}>{l}</text>
          ))}
          {colored.map((s) => <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
          {colored.map((s) => s.values.map((v, i) => v != null && (n <= 24 || i === hover || i === n - 1) && (
            <circle key={`${s.name}-${i}`} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
          )))}
          {/* Son değer etiketi (seri başına) */}
          {colored.map((s) => {
            const lastI = [...s.values.keys()].reverse().find((i) => s.values[i] != null);
            if (lastI == null) return null;
            return <text key={`end-${s.name}`} x={x(lastI) + 10} y={y(s.values[lastI]!) + 4} fontSize={13} fontWeight={600} fill={INK}>{fmt(s.values[lastI])}</text>;
          })}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke={MUTED} strokeWidth={1} strokeDasharray="3 3" />}
          {labels.map((l, i) => (
            <rect key={`hit-${i}`} x={x(i) - half} y={pad.t} width={half * 2} height={H - pad.t - pad.b} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)} />
          ))}
        </svg>
        {hover != null && (
          <div className={styles.tooltip} style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
            <strong>{labels[hover]}</strong>
            {colored.map((s) => (
              <span key={s.name}><i style={{ background: s.color }} aria-hidden="true" />{s.name}: {fmt(s.values[hover])}{s.values[hover] != null ? unit : ''}</span>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
