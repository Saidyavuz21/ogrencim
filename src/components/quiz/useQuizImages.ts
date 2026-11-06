'use client';

import { useEffect, useState } from 'react';
import { quizImageUrls } from '../../lib/quizData';

/** Soru görsellerinin kısa süreli adreslerini toplu alır (yol listesi değişince) */
export function useQuizImages(paths: (string | null | undefined)[]) {
  const key = Array.from(new Set(paths.filter((p): p is string => !!p))).sort().join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!key) return;
    let alive = true;
    quizImageUrls(key.split('|')).then((u) => { if (alive) setUrls((prev) => ({ ...prev, ...u })); });
    return () => { alive = false; };
  }, [key]);
  return urls;
}
