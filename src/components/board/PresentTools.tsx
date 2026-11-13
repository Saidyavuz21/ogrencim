'use client';

import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronDown, Maximize } from '../icons';
import s from './PresentTools.module.css';

export type PresentOverlayTool = 'laser' | 'curtain' | 'spotlight' | null;

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
}

export function PresentOverlay({ tool }: { tool: PresentOverlayTool }) {
  if (tool === 'laser') return <LaserOverlay />;
  if (tool === 'curtain') return <CurtainOverlay />;
  if (tool === 'spotlight') return <SpotlightOverlay />;
  return null;
}

// --------------------------------------------------------
// 1. Lazer işaretçi: 1 saniyede sönen kırmızı iz (fare, dokunmatik, kalem)
// --------------------------------------------------------
interface TrailPoint {
  x: number;
  y: number;
  t: number;
  breakBefore?: boolean;
}

function LaserOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<TrailPoint[]>([]);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const downRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const reduced = useReducedMotion();
  const ttlRef = useRef(1000);
  useEffect(() => { ttlRef.current = reduced ? 350 : 1000; }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scheduleDraw = () => {
    if (rafRef.current != null) return;
    const draw = () => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      const dpr = window.devicePixelRatio || 1;
      const now = performance.now();
      const ttl = ttlRef.current;

      pointsRef.current = pointsRef.current.filter((p) => now - p.t < ttl);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const pts = pointsRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (b.breakBefore) continue;
        const alpha = Math.max(0, 1 - (now - b.t) / ttl);
        if (alpha <= 0) continue;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(220, 38, 38, ${(alpha * 0.32).toFixed(3)})`;
        ctx.lineWidth = 14;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(239, 68, 68, ${(alpha * 0.95).toFixed(3)})`;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }

      const cur = cursorRef.current;
      if (cur) {
        ctx.beginPath();
        ctx.arc(cur.x, cur.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cur.x, cur.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      if (pts.length > 0 || cursorRef.current != null) {
        rafRef.current = window.requestAnimationFrame(draw);
      }
    };
    rafRef.current = window.requestAnimationFrame(draw);
  };

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const addPoint = (x: number, y: number, breakBefore = false) => {
    pointsRef.current.push({ x, y, t: performance.now(), breakBefore });
    cursorRef.current = { x, y };
    scheduleDraw();
  };

  return (
    <canvas
      ref={canvasRef}
      className={s.laserCanvas}
      aria-label="Lazer işaretçi alanı"
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        downRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = toLocal(e);
        addPoint(p.x, p.y, true);
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' && !downRef.current) return;
        const p = toLocal(e);
        const last = pointsRef.current[pointsRef.current.length - 1];
        const breakBefore = !last || (e.pointerType === 'mouse' && cursorRef.current === null);
        addPoint(p.x, p.y, breakBefore);
      }}
      onPointerUp={() => { downRef.current = false; }}
      onPointerCancel={() => { downRef.current = false; cursorRef.current = null; scheduleDraw(); }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !downRef.current) {
          cursorRef.current = null;
          scheduleDraw();
        }
      }}
    />
  );
}

// --------------------------------------------------------
// 2. Ekran perdesi: üstten aşağıya çekilerek içerik satır satır açılır
// --------------------------------------------------------
function CurtainOverlay() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Açılan üst kısmın yüzdesi (0 = tamamen kapalı, 100 = tamamen açık)
  const [revealPct, setRevealPct] = useState(0);
  const dragRef = useRef<{ startY: number; startPct: number; height: number } | null>(null);

  const onHandleDown = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const h = wrapRef.current?.getBoundingClientRect().height || window.innerHeight || 1;
    dragRef.current = { startY: e.clientY, startPct: revealPct, height: h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    const next = Math.max(0, Math.min(100, d.startPct + (dy / d.height) * 100));
    setRevealPct(next);
  };

  const onHandleUp = () => { dragRef.current = null; };

  const edgeClass =
    revealPct <= 4
      ? `${s.curtainEdge} ${s.curtainEdgeTop}`
      : revealPct >= 94
        ? `${s.curtainEdge} ${s.curtainEdgeBottom}`
        : s.curtainEdge;

  return (
    <div ref={wrapRef} className={s.curtainWrap}>
      <div className={s.curtainSheet} style={{ top: `${revealPct}%` }}>
        <div
          className={edgeClass}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <button
            type="button"
            className={s.curtainHandle}
            aria-label={`Ekran perdesi (%${Math.round(revealPct)} açık). Açmak için aşağı sürükleyin ya da ok tuşlarını kullanın.`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setRevealPct((v) => Math.min(100, v + 5)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setRevealPct((v) => Math.max(0, v - 5)); }
              else if (e.key === 'Home') { e.preventDefault(); setRevealPct(0); }
              else if (e.key === 'End') { e.preventDefault(); setRevealPct(100); }
            }}
          >
            <ChevronDown size={16} aria-hidden="true" />
            <span>{revealPct >= 95 ? 'Perdeyi kapat' : 'Perdeyi çek'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 3. Spot ışığı: ekran kararır, yuvarlak alan sürüklenir, köşeden boyutu değişir
// --------------------------------------------------------
function SpotlightOverlay() {
  const maskId = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1280, h: 720 });
  const [spot, setSpot] = useState<{ cx: number; cy: number; r: number } | null>(null);
  const modeRef = useRef<'move' | 'resize' | null>(null);
  const originRef = useRef<{ x: number; y: number; cx: number; cy: number; r: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setSize({ w: rect.width, h: rect.height });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minR = 60;
  const maxR = Math.max(200, Math.min(size.w, size.h) * 0.65);
  const cur = spot ?? { cx: size.w / 2, cy: size.h / 2, r: Math.max(minR, Math.min(220, Math.min(size.w, size.h) * 0.24)) };
  const clampedCx = Math.max(0, Math.min(size.w, cur.cx));
  const clampedCy = Math.max(0, Math.min(size.h, cur.cy));
  const clampedR = Math.max(minR, Math.min(maxR, cur.r));

  const toLocal = (clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  const startDrag = (kind: 'move' | 'resize', e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    modeRef.current = kind;
    originRef.current = { x: e.clientX, y: e.clientY, cx: clampedCx, cy: clampedCy, r: clampedR };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const o = originRef.current;
    if (!o || !modeRef.current) return;
    if (modeRef.current === 'move') {
      const nx = Math.max(0, Math.min(size.w, o.cx + (e.clientX - o.x)));
      const ny = Math.max(0, Math.min(size.h, o.cy + (e.clientY - o.y)));
      setSpot({ cx: nx, cy: ny, r: o.r });
    } else {
      const p = toLocal(e.clientX, e.clientY);
      const nr = Math.max(minR, Math.min(maxR, Math.hypot(p.x - o.cx, p.y - o.cy)));
      setSpot({ cx: o.cx, cy: o.cy, r: nr });
    }
  };

  const stopDrag = () => { modeRef.current = null; originRef.current = null; };

  const handleOffset = clampedR * Math.SQRT1_2;

  return (
    <div
      ref={wrapRef}
      className={s.spotWrap}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        const p = toLocal(e.clientX, e.clientY);
        modeRef.current = 'move';
        originRef.current = { x: e.clientX, y: e.clientY, cx: p.x, cy: p.y, r: clampedR };
        setSpot({ cx: p.x, cy: p.y, r: clampedR });
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={onMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      <svg className={s.spotSvg} aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <circle cx={clampedCx} cy={clampedCy} r={clampedR} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(16, 26, 21, 0.84)" mask={`url(#${maskId})`} />
        <circle cx={clampedCx} cy={clampedCy} r={clampedR} fill="none" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="2" />
      </svg>

      <button
        type="button"
        className={s.spotDragArea}
        style={{ left: clampedCx, top: clampedCy, width: clampedR * 2, height: clampedR * 2 }}
        aria-label="Spot ışığını taşı (sürükleyin veya ok tuşlarını kullanın)"
        onPointerDown={(e) => startDrag('move', e)}
        onPointerMove={onMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={(e) => {
          const step = 24;
          if (e.key === 'ArrowLeft') { e.preventDefault(); setSpot({ cx: Math.max(0, clampedCx - step), cy: clampedCy, r: clampedR }); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); setSpot({ cx: Math.min(size.w, clampedCx + step), cy: clampedCy, r: clampedR }); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSpot({ cx: clampedCx, cy: Math.max(0, clampedCy - step), r: clampedR }); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); setSpot({ cx: clampedCx, cy: Math.min(size.h, clampedCy + step), r: clampedR }); }
        }}
      />

      <button
        type="button"
        className={s.spotResizeHandle}
        style={{ left: clampedCx + handleOffset, top: clampedCy + handleOffset }}
        aria-label="Spot ışığı boyutunu değiştir"
        title="Boyutu değiştirmek için sürükleyin"
        onPointerDown={(e) => startDrag('resize', e)}
        onPointerMove={onMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={(e) => {
          const step = 16;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setSpot({ cx: clampedCx, cy: clampedCy, r: Math.min(maxR, clampedR + step) }); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setSpot({ cx: clampedCx, cy: clampedCy, r: Math.max(minR, clampedR - step) }); }
        }}
      >
        <span className={s.spotResizeKnob} aria-hidden="true">
          <Maximize size={14} />
        </span>
      </button>
    </div>
  );
}

