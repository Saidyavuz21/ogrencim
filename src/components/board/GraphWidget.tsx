'use client';

import React, { useMemo, useRef, useState } from 'react';
import { WidgetEl } from '../../lib/boardData';
import { compileMathExpr } from '../../lib/mathExpr';
import styles from './ActivityWidgets.module.css';
import bs from './Board.module.css';

const SVG_W = 400;
const SVG_H = 260;

function niceStep(range: number): number {
  const rough = range / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1e-6, rough))));
  const frac = rough / pow;
  if (frac <= 1.5) return 1 * pow;
  if (frac <= 3.5) return 2 * pow;
  if (frac <= 7.5) return 5 * pow;
  return 10 * pow;
}

function buildPaths(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): string[] {
  const steps = 260;
  const dx = (xMax - xMin) / steps;
  const ySpan = yMax - yMin;
  const paths: string[] = [];
  let seg: string[] = [];
  let prevPy: number | null = null;

  for (let i = 0; i <= steps; i += 1) {
    const x = xMin + i * dx;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      if (seg.length > 1) paths.push(seg.join(' '));
      seg = [];
      prevPy = null;
      continue;
    }
    const px = ((x - xMin) / (xMax - xMin)) * SVG_W;
    const py = SVG_H - ((y - yMin) / ySpan) * SVG_H;
    // Asimptot sıçramalarında çizgiyi kopar (ör. tan(x), 1/x)
    if (prevPy !== null && Math.abs(py - prevPy) > SVG_H * 0.85) {
      if (seg.length > 1) paths.push(seg.join(' '));
      seg = [];
    }
    const cmd = seg.length === 0 ? 'M' : 'L';
    seg.push(`${cmd} ${px.toFixed(1)} ${py.toFixed(1)}`);
    prevPy = py;
  }
  if (seg.length > 1) paths.push(seg.join(' '));
  return paths;
}

export function GraphWidget({ el }: { el: WidgetEl }) {
  const expr1 = (el.data.graphExpr1 ?? '2x+1').trim();
  const expr2 = (el.data.graphExpr2 ?? '').trim();
  const xMin = el.data.graphXMin ?? -10;
  const xMax = el.data.graphXMax ?? 10;
  const yMin = el.data.graphYMin ?? -10;
  const yMax = el.data.graphYMax ?? 10;

  const c1 = useMemo(() => (expr1 ? compileMathExpr(expr1) : null), [expr1]);
  const c2 = useMemo(() => (expr2 ? compileMathExpr(expr2) : null), [expr2]);

  const paths1 = useMemo(
    () => (c1?.ok ? buildPaths(c1.eval, xMin, xMax, yMin, yMax) : []),
    [c1, xMin, xMax, yMin, yMax]
  );
  const paths2 = useMemo(
    () => (c2?.ok ? buildPaths(c2.eval, xMin, xMax, yMin, yMax) : []),
    [c2, xMin, xMax, yMin, yMax]
  );

  const [probeX, setProbeX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const toMathX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (!r.width) return null;
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return xMin + t * (xMax - xMin);
  };

  const xStep = niceStep(xMax - xMin);
  const yStep = niceStep(yMax - yMin);
  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax + 1e-9; v += xStep) {
    xTicks.push(Number(v.toFixed(4)));
  }
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax + 1e-9; v += yStep) {
    yTicks.push(Number(v.toFixed(4)));
  }

  const axisX = xMin <= 0 && xMax >= 0 ? ((0 - xMin) / (xMax - xMin)) * SVG_W : null;
  const axisY = yMin <= 0 && yMax >= 0 ? SVG_H - ((0 - yMin) / (yMax - yMin)) * SVG_H : null;

  const p1y = probeX !== null && c1?.ok ? c1.eval(probeX) : NaN;
  const p2y = probeX !== null && c2?.ok ? c2.eval(probeX) : NaN;
  const probePx = probeX !== null ? ((probeX - xMin) / (xMax - xMin)) * SVG_W : null;
  const probePy1 = Number.isFinite(p1y) ? SVG_H - ((p1y - yMin) / (yMax - yMin)) * SVG_H : null;
  const probePy2 = Number.isFinite(p2y) ? SVG_H - ((p2y - yMin) / (yMax - yMin)) * SVG_H : null;

  return (
    <div className={`${bs.widget} ${styles.wrap}`}>
      <div className={styles.header}>
        <p className={styles.title}>{el.data.title?.trim() || 'Fonksiyon Grafiği'}</p>
        <div className={styles.actions}>
          {expr1 && <span className={styles.badge} style={{ color: '#1f5c41' }}>f(x) = {expr1}</span>}
          {expr2 && <span className={styles.badge} style={{ color: '#c93b47' }}>g(x) = {expr2}</span>}
        </div>
      </div>

      {(c1 && !c1.ok) || (c2 && !c2.ok) ? (
        <p className={styles.note} style={{ color: '#c93b47', fontWeight: 600 }} role="alert">
          {c1 && !c1.ok ? `f(x): ${c1.error}` : ''} {c2 && !c2.ok ? `g(x): ${c2.error}` : ''}
        </p>
      ) : null}

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', height: '100%', borderRadius: 8, border: '1px solid #dfd9cc', background: '#ffffff', touchAction: 'none', cursor: 'crosshair' }}
          role="img"
          aria-label="Koordinat düzlemi ve fonksiyon grafiği"
          onPointerDown={(e) => {
            e.stopPropagation();
            const mx = toMathX(e.clientX);
            if (mx !== null) setProbeX(mx);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === 'mouse') return;
            const mx = toMathX(e.clientX);
            if (mx !== null) setProbeX(mx);
          }}
        >
          {xTicks.map((v) => {
            const px = ((v - xMin) / (xMax - xMin)) * SVG_W;
            return <line key={`gx-${v}`} x1={px} y1={0} x2={px} y2={SVG_H} stroke="#efeae0" strokeWidth={1} />;
          })}
          {yTicks.map((v) => {
            const py = SVG_H - ((v - yMin) / (yMax - yMin)) * SVG_H;
            return <line key={`gy-${v}`} x1={0} y1={py} x2={SVG_W} y2={py} stroke="#efeae0" strokeWidth={1} />;
          })}

          {axisX !== null && <line x1={axisX} y1={0} x2={axisX} y2={SVG_H} stroke="#58665f" strokeWidth={1.6} />}
          {axisY !== null && <line x1={0} y1={axisY} x2={SVG_W} y2={axisY} stroke="#58665f" strokeWidth={1.6} />}

          {xTicks.map((v) => {
            if (Math.abs(v) < 1e-6) return null;
            const px = ((v - xMin) / (xMax - xMin)) * SVG_W;
            const ty = axisY !== null ? Math.min(SVG_H - 6, Math.max(12, axisY + 12)) : SVG_H - 6;
            return (
              <text key={`tx-${v}`} x={px} y={ty} fontSize={9} fill="#6c7872" textAnchor="middle">
                {v}
              </text>
            );
          })}
          {yTicks.map((v) => {
            if (Math.abs(v) < 1e-6) return null;
            const py = SVG_H - ((v - yMin) / (yMax - yMin)) * SVG_H;
            const tx = axisX !== null ? Math.min(SVG_W - 14, Math.max(16, axisX - 6)) : 20;
            return (
              <text key={`ty-${v}`} x={tx} y={py + 3} fontSize={9} fill="#6c7872" textAnchor="end">
                {v}
              </text>
            );
          })}

          {paths1.map((d, i) => (
            <path key={`p1-${i}`} d={d} fill="none" stroke="#1f5c41" strokeWidth={2.4} strokeLinejoin="round" />
          ))}
          {paths2.map((d, i) => (
            <path key={`p2-${i}`} d={d} fill="none" stroke="#c93b47" strokeWidth={2.4} strokeLinejoin="round" />
          ))}

          {probePx !== null && (
            <>
              <line x1={probePx} y1={0} x2={probePx} y2={SVG_H} stroke="#9aa59f" strokeWidth={1} strokeDasharray="4 3" />
              {probePy1 !== null && probePy1 >= -20 && probePy1 <= SVG_H + 20 && (
                <circle cx={probePx} cy={probePy1} r={4.5} fill="#1f5c41" stroke="#ffffff" strokeWidth={1.5} />
              )}
              {probePy2 !== null && probePy2 >= -20 && probePy2 <= SVG_H + 20 && (
                <circle cx={probePx} cy={probePy2} r={4.5} fill="#c93b47" stroke="#ffffff" strokeWidth={1.5} />
              )}
            </>
          )}
        </svg>
      </div>

      <div className={styles.footer}>
        <span className={styles.note}>
          {probeX !== null
            ? `x = ${probeX.toFixed(2)}${Number.isFinite(p1y) ? ` · f(x) = ${p1y.toFixed(2)}` : ''}${Number.isFinite(p2y) ? ` · g(x) = ${p2y.toFixed(2)}` : ''}`
            : 'Nokta değerini görmek için grafik üzerine dokunun.'}
        </span>
      </div>
    </div>
  );
}

