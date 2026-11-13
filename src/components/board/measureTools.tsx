'use client';

import React, { useRef, useState } from 'react';
import { BOARD_H, BOARD_W } from '../../lib/boardData';
import { clientToBoardPoint } from './boardGeometry';
import styles from './measureTools.module.css';

export const PX_PER_CM = 37.8;

export type MeasureToolKind = 'ruler' | 'set45' | 'set3060' | 'protractor' | 'compass';

export interface MeasureToolItem {
  id: string;
  kind: MeasureToolKind;
  x: number;
  y: number;
  angle: number;
  length?: number;
  size?: number;
  radius?: number;
  arm1?: number;
  arm2?: number;
  penAngle?: number;
}

export interface MeasureEdge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export function createMeasureTool(kind: MeasureToolKind, id: string): MeasureToolItem {
  const cx = BOARD_W / 2;
  const cy = BOARD_H / 2;
  if (kind === 'ruler') return { id, kind, x: cx - 280, y: cy - 45, angle: 0, length: Math.round(15 * PX_PER_CM) };
  if (kind === 'set45') return { id, kind, x: cx - 160, y: cy - 160, angle: 0, size: 340 };
  if (kind === 'set3060') return { id, kind, x: cx - 180, y: cy - 140, angle: 0, size: 360 };
  if (kind === 'protractor') return { id, kind, x: cx, y: cy + 60, angle: 0, radius: 190, arm1: 30, arm2: 120 };
  return { id, kind, x: cx, y: cy, angle: 0, radius: 150, penAngle: 0 };
}

function rotatePt(px: number, py: number, ox: number, oy: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dx = px - ox;
  const dy = py - oy;
  return { x: ox + dx * c - dy * s, y: oy + dx * s + dy * c };
}

export function getMeasureEdges(tools: MeasureToolItem[]): MeasureEdge[] {
  const edges: MeasureEdge[] = [];
  for (const t of tools) {
    if (t.kind === 'ruler') {
      const len = t.length ?? Math.round(15 * PX_PER_CM);
      const h = 92;
      const p1 = { x: t.x, y: t.y };
      const p2 = rotatePt(t.x + len, t.y, t.x, t.y, t.angle);
      const p3 = rotatePt(t.x, t.y + h, t.x, t.y, t.angle);
      const p4 = rotatePt(t.x + len, t.y + h, t.x, t.y, t.angle);
      edges.push({ ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y });
      edges.push({ ax: p3.x, ay: p3.y, bx: p4.x, by: p4.y });
    } else if (t.kind === 'set45' || t.kind === 'set3060') {
      const w = t.size ?? 340;
      const h = t.kind === 'set45' ? w : Math.round(w / Math.sqrt(3));
      const p0 = { x: t.x, y: t.y };
      const p1 = rotatePt(t.x + w, t.y, t.x, t.y, t.angle);
      const p2 = rotatePt(t.x, t.y + h, t.x, t.y, t.angle);
      edges.push({ ax: p0.x, ay: p0.y, bx: p1.x, by: p1.y });
      edges.push({ ax: p0.x, ay: p0.y, bx: p2.x, by: p2.y });
      edges.push({ ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y });
    }
  }
  return edges;
}

export function findActiveMeasureEdge(x: number, y: number, tools: MeasureToolItem[], threshold = 22): MeasureEdge | null {
  const edges = getMeasureEdges(tools);
  let best: MeasureEdge | null = null;
  let bestD = threshold;
  for (const e of edges) {
    const dx = e.bx - e.ax;
    const dy = e.by - e.ay;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1) continue;
    const t = ((x - e.ax) * dx + (y - e.ay) * dy) / l2;
    if (t < -0.05 || t > 1.05) continue;
    const tc = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (e.ax + tc * dx), y - (e.ay + tc * dy));
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function projectToEdge(x: number, y: number, e: MeasureEdge): { x: number; y: number } {
  const dx = e.bx - e.ax;
  const dy = e.by - e.ay;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1) return { x, y };
  const t = Math.max(-0.02, Math.min(1.02, ((x - e.ax) * dx + (y - e.ay) * dy) / l2));
  return { x: e.ax + t * dx, y: e.ay + t * dy };
}

type DragAction =
  | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startDeg: number; origAngle: number }
  | { kind: 'arm'; id: string; which: 'arm1' | 'arm2'; cx: number; cy: number; baseAngle: number }
  | { kind: 'radius'; id: string; cx: number; cy: number }
  | { kind: 'compassDraw'; id: string; cx: number; cy: number; r: number; startRad: number; pts: number[] };

export function MeasureToolsLayer({
  tools,
  onChange,
  onCloseTool,
  onCommitCompassStroke,
  strokeColor,
  strokeWidth,
}: {
  tools: MeasureToolItem[];
  onChange: (tools: MeasureToolItem[]) => void;
  onCloseTool: (id: string) => void;
  onCommitCompassStroke: (points: number[], color: string, width: number) => void;
  strokeColor: string;
  strokeWidth: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragAction | null>(null);
  const touchPts = useRef<Map<string, Map<number, { x: number; y: number }>>>(new Map());
  const pinchRot = useRef<{ id: string; startAng: number; origAngle: number; startMid: { x: number; y: number }; ox: number; oy: number } | null>(null);
  const [compassPreview, setCompassPreview] = useState<number[] | null>(null);

  if (tools.length === 0) return null;

  const toPt = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return clientToBoardPoint(clientX, clientY, r, BOARD_W, BOARD_H);
  };

  const patchTool = (id: string, patch: Partial<MeasureToolItem>) => {
    onChange(tools.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && pinchRot.current) {
      const pr = pinchRot.current;
      const map = touchPts.current.get(pr.id);
      if (map && map.has(e.pointerId)) {
        map.set(e.pointerId, toPt(e.clientX, e.clientY));
        if (map.size === 2) {
          const [p1, p2] = Array.from(map.values());
          const ang = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          patchTool(pr.id, {
            angle: pr.origAngle + (ang - pr.startAng),
            x: pr.ox + (mid.x - pr.startMid.x),
            y: pr.oy + (mid.y - pr.startMid.y),
          });
          return;
        }
      }
    }

    const d = dragRef.current;
    if (!d) return;
    const pt = toPt(e.clientX, e.clientY);

    if (d.kind === 'move') {
      patchTool(d.id, { x: d.ox + (pt.x - d.sx), y: d.oy + (pt.y - d.sy) });
    } else if (d.kind === 'rotate') {
      const curDeg = (Math.atan2(pt.y - d.cy, pt.x - d.cx) * 180) / Math.PI;
      let next = d.origAngle + (curDeg - d.startDeg);
      if (e.shiftKey) next = Math.round(next / 15) * 15;
      patchTool(d.id, { angle: next });
    } else if (d.kind === 'arm') {
      const rawDeg = (Math.atan2(pt.y - d.cy, pt.x - d.cx) * 180) / Math.PI;
      // İletki üst yarım daire: yerel açı -180..0 arası (0° sağ, 180° sol)
      let local = -(rawDeg - d.baseAngle);
      local = ((local % 360) + 360) % 360;
      if (local > 270) local = 0;
      if (local > 180) local = 180;
      patchTool(d.id, { [d.which]: Math.round(local) });
    } else if (d.kind === 'radius') {
      const r = Math.max(40, Math.min(480, Math.round(Math.hypot(pt.x - d.cx, pt.y - d.cy))));
      patchTool(d.id, { radius: r });
    } else if (d.kind === 'compassDraw') {
      const ang = Math.atan2(pt.y - d.cy, pt.x - d.cx);
      const px = d.cx + d.r * Math.cos(ang);
      const py = d.cy + d.r * Math.sin(ang);
      const prevX = d.pts[d.pts.length - 2];
      const prevY = d.pts[d.pts.length - 1];
      if (Math.hypot(px - prevX, py - prevY) >= 3) {
        d.pts.push(Math.round(px), Math.round(py));
        setCompassPreview([...d.pts]);
      }
      patchTool(d.id, { penAngle: (ang * 180) / Math.PI });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      touchPts.current.forEach((m) => m.delete(e.pointerId));
      if (pinchRot.current) {
        const m = touchPts.current.get(pinchRot.current.id);
        if (!m || m.size < 2) pinchRot.current = null;
      }
    }
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === 'compassDraw') {
      setCompassPreview(null);
      if (d.pts.length >= 6) {
        onCommitCompassStroke(d.pts, strokeColor, strokeWidth);
      }
    }
  };

  const startToolTouchTrack = (tool: MeasureToolItem, e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    let map = touchPts.current.get(tool.id);
    if (!map) {
      map = new Map();
      touchPts.current.set(tool.id, map);
    }
    map.set(e.pointerId, toPt(e.clientX, e.clientY));
    if (map.size === 2) {
      const [p1, p2] = Array.from(map.values());
      pinchRot.current = {
        id: tool.id,
        startAng: (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI,
        origAngle: tool.angle,
        startMid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        ox: tool.x,
        oy: tool.y,
      };
      dragRef.current = null;
    }
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className={styles.overlay}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {compassPreview && compassPreview.length >= 4 && (
        <polyline
          points={compassPreview.join(' ')}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {tools.map((t) => {
        const normAngle = Math.round(((t.angle % 360) + 360) % 360);

        if (t.kind === 'ruler') {
          const len = t.length ?? Math.round(15 * PX_PER_CM);
          const h = 92;
          const totalMm = Math.floor(len / (PX_PER_CM / 10));
          return (
            <g key={t.id} transform={`translate(${t.x}, ${t.y}) rotate(${t.angle})`}>
              <rect
                x={0}
                y={0}
                width={len}
                height={h}
                rx={6}
                fill="rgba(252, 246, 227, 0.9)"
                stroke="#8d7b54"
                strokeWidth={2}
                className={styles.toolBody}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  startToolTouchTrack(t, e);
                  const pt = toPt(e.clientX, e.clientY);
                  dragRef.current = { kind: 'move', id: t.id, sx: pt.x, sy: pt.y, ox: t.x, oy: t.y };
                }}
              />
              {Array.from({ length: totalMm + 1 }, (_, mm) => {
                const x = mm * (PX_PER_CM / 10);
                const isCm = mm % 10 === 0;
                const isHalf = mm % 5 === 0 && !isCm;
                const tickH = isCm ? 24 : isHalf ? 16 : 10;
                return (
                  <g key={mm} pointerEvents="none">
                    <line x1={x} y1={0} x2={x} y2={tickH} stroke="#3c3424" strokeWidth={isCm ? 1.6 : 0.9} />
                    {isCm && (
                      <text x={x} y={38} fontSize={12} textAnchor="middle" fill="#3c3424" className={styles.badgeText}>
                        {mm / 10}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={len / 2} y={70} fontSize={14} textAnchor="middle" fill="#4f432c" className={styles.badgeText}>
                {normAngle}°
              </text>
              {/* Döndürme tutamacı */}
              <circle
                cx={len - 18}
                cy={h - 18}
                r={13}
                fill="#1f5c41"
                stroke="#ffffff"
                strokeWidth={2}
                className={styles.handle}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  const pt = toPt(e.clientX, e.clientY);
                  const startDeg = (Math.atan2(pt.y - t.y, pt.x - t.x) * 180) / Math.PI;
                  dragRef.current = { kind: 'rotate', id: t.id, cx: t.x, cy: t.y, startDeg, origAngle: t.angle };
                }}
              />
              {/* Kapat düğmesi */}
              <g
                transform={`translate(${len - 52}, ${h - 18})`}
                className={styles.closeBtn}
                onClick={(e) => { e.stopPropagation(); onCloseTool(t.id); }}
              >
                <circle r={12} fill="#ffffff" stroke="#a33342" strokeWidth={1.5} />
                <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#a33342" strokeWidth={2} />
              </g>
            </g>
          );
        }

        if (t.kind === 'set45' || t.kind === 'set3060') {
          const w = t.size ?? 340;
          const h = t.kind === 'set45' ? w : Math.round(w / Math.sqrt(3));
          const cmCount = Math.floor(w / PX_PER_CM);
          return (
            <g key={t.id} transform={`translate(${t.x}, ${t.y}) rotate(${t.angle})`}>
              <polygon
                points={`0,0 ${w},0 0,${h}`}
                fill="rgba(229, 243, 236, 0.85)"
                stroke="#2c664a"
                strokeWidth={2}
                className={styles.toolBody}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  startToolTouchTrack(t, e);
                  const pt = toPt(e.clientX, e.clientY);
                  dragRef.current = { kind: 'move', id: t.id, sx: pt.x, sy: pt.y, ox: t.x, oy: t.y };
                }}
              />
              {Array.from({ length: cmCount + 1 }, (_, cm) => (
                <g key={cm} pointerEvents="none">
                  <line x1={cm * PX_PER_CM} y1={0} x2={cm * PX_PER_CM} y2={14} stroke="#1f4935" strokeWidth={1.3} />
                  {cm > 0 && (
                    <text x={cm * PX_PER_CM} y={26} fontSize={11} textAnchor="middle" fill="#1f4935" className={styles.badgeText}>
                      {cm}
                    </text>
                  )}
                </g>
              ))}
              <text x={54} y={64} fontSize={13} fill="#1f4935" className={styles.badgeText}>
                {t.kind === 'set45' ? '45°' : '30°-60°'} · {normAngle}°
              </text>
              <circle
                cx={w - 38}
                cy={18}
                r={12}
                fill="#1f5c41"
                stroke="#ffffff"
                strokeWidth={2}
                className={styles.handle}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  const pt = toPt(e.clientX, e.clientY);
                  const startDeg = (Math.atan2(pt.y - t.y, pt.x - t.x) * 180) / Math.PI;
                  dragRef.current = { kind: 'rotate', id: t.id, cx: t.x, cy: t.y, startDeg, origAngle: t.angle };
                }}
              />
              <g
                transform="translate(22, 22)"
                className={styles.closeBtn}
                onClick={(e) => { e.stopPropagation(); onCloseTool(t.id); }}
              >
                <circle r={12} fill="#ffffff" stroke="#a33342" strokeWidth={1.5} />
                <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#a33342" strokeWidth={2} />
              </g>
            </g>
          );
        }

        if (t.kind === 'protractor') {
          const r = t.radius ?? 190;
          const arm1 = t.arm1 ?? 30;
          const arm2 = t.arm2 ?? 120;
          const diff = Math.abs(arm2 - arm1);
          const a1Rad = (-arm1 * Math.PI) / 180;
          const a2Rad = (-arm2 * Math.PI) / 180;
          const x1 = r * Math.cos(a1Rad);
          const y1 = r * Math.sin(a1Rad);
          const x2 = r * Math.cos(a2Rad);
          const y2 = r * Math.sin(a2Rad);

          return (
            <g key={t.id} transform={`translate(${t.x}, ${t.y}) rotate(${t.angle})`}>
              <path
                d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`}
                fill="rgba(232, 241, 250, 0.86)"
                stroke="#2a5a8a"
                strokeWidth={2}
                className={styles.toolBody}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  startToolTouchTrack(t, e);
                  const pt = toPt(e.clientX, e.clientY);
                  dragRef.current = { kind: 'move', id: t.id, sx: pt.x, sy: pt.y, ox: t.x, oy: t.y };
                }}
              />
              {Array.from({ length: 181 }, (_, deg) => {
                const rad = (-deg * Math.PI) / 180;
                const is10 = deg % 10 === 0;
                const is5 = deg % 5 === 0 && !is10;
                const inner = r - (is10 ? 18 : is5 ? 12 : 7);
                return (
                  <g key={deg} pointerEvents="none">
                    <line
                      x1={r * Math.cos(rad)}
                      y1={r * Math.sin(rad)}
                      x2={inner * Math.cos(rad)}
                      y2={inner * Math.sin(rad)}
                      stroke="#25476b"
                      strokeWidth={is10 ? 1.5 : 0.7}
                    />
                    {deg % 30 === 0 && (
                      <text
                        x={(r - 30) * Math.cos(rad)}
                        y={(r - 30) * Math.sin(rad) + 4}
                        fontSize={11}
                        textAnchor="middle"
                        fill="#1e3c5c"
                        className={styles.badgeText}
                      >
                        {deg}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* İki açı kolu */}
              <line x1={0} y1={0} x2={x1} y2={y1} stroke="#d03b3b" strokeWidth={2.5} pointerEvents="none" />
              <line x1={0} y1={0} x2={x2} y2={y2} stroke="#1f5c41" strokeWidth={2.5} pointerEvents="none" />
              <circle
                cx={x1}
                cy={y1}
                r={12}
                fill="#d03b3b"
                stroke="#ffffff"
                strokeWidth={2}
                className={styles.handle}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  dragRef.current = { kind: 'arm', id: t.id, which: 'arm1', cx: t.x, cy: t.y, baseAngle: t.angle };
                }}
              />
              <circle
                cx={x2}
                cy={y2}
                r={12}
                fill="#1f5c41"
                stroke="#ffffff"
                strokeWidth={2}
                className={styles.handle}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  svgRef.current?.setPointerCapture(e.pointerId);
                  dragRef.current = { kind: 'arm', id: t.id, which: 'arm2', cx: t.x, cy: t.y, baseAngle: t.angle };
                }}
              />
              <text x={0} y={-24} fontSize={16} textAnchor="middle" fill="#1e3c5c" className={styles.badgeText}>
                {diff}°
              </text>
              <g
                transform={`translate(${r - 22}, -18)`}
                className={styles.closeBtn}
                onClick={(e) => { e.stopPropagation(); onCloseTool(t.id); }}
              >
                <circle r={12} fill="#ffffff" stroke="#a33342" strokeWidth={1.5} />
                <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#a33342" strokeWidth={2} />
              </g>
            </g>
          );
        }

        // Pergel (compass)
        const r = t.radius ?? 150;
        const pRad = ((t.penAngle ?? 0) * Math.PI) / 180;
        const px = r * Math.cos(pRad);
        const py = r * Math.sin(pRad);
        return (
          <g key={t.id} transform={`translate(${t.x}, ${t.y})`}>
            <circle cx={0} cy={0} r={r} fill="none" stroke="rgba(31, 92, 65, 0.25)" strokeWidth={1.5} strokeDasharray="6 4" pointerEvents="none" />
            <line x1={0} y1={0} x2={px} y2={py} stroke="#34443c" strokeWidth={3} pointerEvents="none" />
            {/* Merkez iğnesi (taşıma) */}
            <circle
              cx={0}
              cy={0}
              r={14}
              fill="#34443c"
              stroke="#ffffff"
              strokeWidth={2.5}
              className={styles.toolBody}
              onPointerDown={(e) => {
                e.stopPropagation();
                svgRef.current?.setPointerCapture(e.pointerId);
                const pt = toPt(e.clientX, e.clientY);
                dragRef.current = { kind: 'move', id: t.id, sx: pt.x, sy: pt.y, ox: t.x, oy: t.y };
              }}
            />
            {/* Yarıçap ayar tutamacı */}
            <circle
              cx={px * 0.55}
              cy={py * 0.55}
              r={11}
              fill="#ffffff"
              stroke="#1f5c41"
              strokeWidth={2}
              className={styles.handle}
              onPointerDown={(e) => {
                e.stopPropagation();
                svgRef.current?.setPointerCapture(e.pointerId);
                dragRef.current = { kind: 'radius', id: t.id, cx: t.x, cy: t.y };
              }}
            />
            {/* Çizim kalemi tutamacı */}
            <circle
              cx={px}
              cy={py}
              r={14}
              fill="#1f5c41"
              stroke="#ffffff"
              strokeWidth={2.5}
              className={styles.handle}
              onPointerDown={(e) => {
                e.stopPropagation();
                svgRef.current?.setPointerCapture(e.pointerId);
                const startX = Math.round(t.x + px);
                const startY = Math.round(t.y + py);
                dragRef.current = {
                  kind: 'compassDraw',
                  id: t.id,
                  cx: t.x,
                  cy: t.y,
                  r,
                  startRad: pRad,
                  pts: [startX, startY],
                };
                setCompassPreview([startX, startY]);
              }}
            />
            <text x={0} y={-22} fontSize={13} textAnchor="middle" fill="#1f5c41" className={styles.badgeText}>
              r = {(r / PX_PER_CM).toFixed(1)} cm
            </text>
            <g
              transform="translate(26, -22)"
              className={styles.closeBtn}
              onClick={(e) => { e.stopPropagation(); onCloseTool(t.id); }}
            >
              <circle r={12} fill="#ffffff" stroke="#a33342" strokeWidth={1.5} />
              <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#a33342" strokeWidth={2} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

