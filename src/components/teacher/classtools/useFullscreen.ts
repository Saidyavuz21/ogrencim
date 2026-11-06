'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Elemanı tam ekran yapar. Tarayıcı izin vermezse (ör. iPhone) sayfayı kaplayan görünüme geçer.
 * full = true iken bileşen kendi "tam ekran" stilini uygular.
 */
export function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [nativeFull, setNativeFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);

  useEffect(() => {
    const onChange = () => setNativeFull(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  useEffect(() => {
    if (!pseudoFull) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPseudoFull(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [pseudoFull]);

  const toggle = useCallback(async () => {
    if (pseudoFull) { setPseudoFull(false); return; }
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    const el = ref.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        /* izin verilmedi: sayfayı kaplayan görünüme geç */
      }
    }
    setPseudoFull(true);
  }, [pseudoFull, ref]);

  return { full: nativeFull || pseudoFull, toggle };
}
