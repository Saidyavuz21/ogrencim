'use client';

// Canlı dersin öğretmen ve öğrenci ekranlarında ortak parçalar.
import { useCallback, useEffect, useRef, useState } from 'react';
import { BoardPage, HISTORY_LIMIT, StrokeEl } from '../../lib/boardData';
import { CHOICE_LETTERS } from '../../lib/quizData';
import { LiveLayer, LiveQuestion, saveLiveLayer } from '../../lib/liveData';
import { RichText } from '../math/RichText';
import styles from './Live.module.css';

/** Saniyede bir güncellenen saat (yalnızca gerektiğinde) */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [active, ms]);
  return now;
}

/** Sayfanın öğelerine başkalarının çizgilerini (yalnızca görüntü) ekler */
export function withStrokes(page: BoardPage, strokes: StrokeEl[]): BoardPage {
  if (!strokes.length) return page;
  return { ...page, elements: [...page.elements, ...strokes] };
}

/** Katmanlardan seçilenlerin çizgileri (sunucudaki sırayla) */
export function strokesOf(layers: LiveLayer[], pageId: string, pick: (l: LiveLayer) => boolean): StrokeEl[] {
  return layers.filter((l) => l.page_id === pageId && pick(l)).flatMap((l) => l.strokes || []);
}

/**
 * Kişinin kendi katmanı: ekranda hemen görünür, 400 ms sonra sunucuya yazılır (sayfa başına).
 * İlk yüklemede sunucudaki hâl alınır; sonra yerel hâl esastır.
 */
export function useOwnLayer(sessionId: string | null, kind: 'shared' | 'private', serverLayers: LiveLayer[] | null, mine: (l: LiveLayer) => boolean) {
  const [layer, setLayer] = useState<Record<string, StrokeEl[]>>({});
  const [past, setPast] = useState<Record<string, StrokeEl[]>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);
  const timers = useRef<Record<string, number>>({});
  const latest = useRef(layer);
  useEffect(() => { latest.current = layer; }, [layer]);

  useEffect(() => {
    if (loaded.current || !serverLayers) return;
    loaded.current = true;
    const init: Record<string, StrokeEl[]> = {};
    serverLayers.filter(mine).forEach((l) => { init[l.page_id] = l.strokes || []; });
    queueMicrotask(() => setLayer(init));
  }, [serverLayers, mine]);

  const flush = useCallback(async (pageId: string) => {
    if (!sessionId) return;
    setSaving(true);
    const res = await saveLiveLayer(sessionId, pageId, kind, latest.current[pageId] || []);
    setSaving(false);
    setError(res.ok ? null : res.error);
  }, [sessionId, kind]);

  const schedule = useCallback((pageId: string) => {
    window.clearTimeout(timers.current[pageId]);
    timers.current[pageId] = window.setTimeout(() => { void flush(pageId); }, 400);
  }, [flush]);
  useEffect(() => () => { Object.values(timers.current).forEach((t) => window.clearTimeout(t)); }, []);

  const commit = (pageId: string, strokes: StrokeEl[]) => {
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), layer]);
    setLayer({ ...layer, [pageId]: strokes });
    latest.current = { ...layer, [pageId]: strokes };
    schedule(pageId);
  };
  const undo = (pageId: string) => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setLayer(prev);
    latest.current = prev;
    schedule(pageId);
  };
  /** Sunucu tarafında temizlenen sayfayı yerelde de boşaltır (geri alınamaz) */
  const resetPage = (pageId: string) => {
    setLayer((cur) => ({ ...cur, [pageId]: [] }));
    latest.current = { ...latest.current, [pageId]: [] };
    setPast([]);
  };
  return { layer, commit, undo, canUndo: past.length > 0, resetPage, error, saving };
}

/** Seçeneklerin dağılımı (öğretmen paneli ve cevap açıklanınca öğrenci) */
export function QuestionBars({ question, counts, total }: { question: LiveQuestion; counts: number[]; total: number }) {
  return (
    <ul className={styles.bars}>
      {question.choices.map((c, i) => {
        const n = counts[i] || 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        const ok = question.correct_index === i;
        return (
          <li key={i} className={`${styles.bar} ${ok ? styles.barOk : ''}`}>
            <b aria-hidden="true">{CHOICE_LETTERS[i]}</b>
            <span className={styles.barTrack}>
              <span className={styles.barFill} style={{ width: `${pct}%` }} aria-hidden="true" />
              <span className={styles.barText}><RichText text={c} inline />{ok ? ' · doğru cevap' : ''}</span>
            </span>
            <span className={styles.barCount} aria-label={`${CHOICE_LETTERS[i]} seçeneği: ${n} öğrenci, yüzde ${pct}`}>{n} · %{pct}</span>
          </li>
        );
      })}
    </ul>
  );
}

export const isOnline = (lastSeen: string | undefined, now: number) => Boolean(lastSeen && now - new Date(lastSeen).getTime() < 75_000);

export const penLeft = (until: string | null, now: number) => (until ? Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000)) : 0);

export function LiveBadge({ connected }: { connected: boolean }) {
  return <span className={`${styles.liveDot} ${connected ? '' : styles.offline}`} title={connected ? 'Canlı bağlantı açık' : 'Bağlantı bekleniyor; birkaç saniyede bir yenileniyor'}>{connected ? 'Canlı' : 'Bağlanıyor'}</span>;
}

export function QuestionBody({ question }: { question: LiveQuestion }) {
  return (
    <>
      <p className={styles.qBody}><RichText text={question.body} inline /></p>
      {question.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.qImage} src={question.image_url} alt="Soru görseli" />
      )}
    </>
  );
}

