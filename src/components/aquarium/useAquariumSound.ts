'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Local CC0 hydrophone recording; playback requires an explicit user gesture. */
export function useAquariumSound() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(false);
  const pending = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const toggle = useCallback(async () => {
    if (pending.current) return;
    if (enabledRef.current) {
      enabledRef.current = false;
      audio.current?.pause();
      setEnabled(false);
      return;
    }
    pending.current = true;
    try {
      if (!audio.current) {
        const player = new Audio('/audio/underwater.mp3');
        player.loop = true;
        player.volume = 0.5;
        player.preload = 'none';
        audio.current = player;
      }
      const player = audio.current;
      await player.play();
      if (audio.current !== player) { player.pause(); return; }
      enabledRef.current = true;
      setEnabled(true);
      setUnavailable(false);
      if (document.hidden) player.pause();
    } catch {
      enabledRef.current = false;
      setEnabled(false);
      setUnavailable(true);
    } finally {
      pending.current = false;
    }
  }, []);

  useEffect(() => {
    const visibility = () => {
      const player = audio.current;
      if (!player) return;
      if (document.hidden) player.pause();
      else if (enabledRef.current) void player.play().catch(() => {
        enabledRef.current = false;
        setEnabled(false);
        setUnavailable(true);
      });
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      enabledRef.current = false;
      const player = audio.current;
      audio.current = null;
      if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
    };
  }, []);

  return { enabled, unavailable, toggle };
}
