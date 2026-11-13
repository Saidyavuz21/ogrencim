'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from '../icons';
import {
  imageKey, normalizeFractionParts, normalizeFractionShape, ORDER_MIN, WidgetEl,
} from '../../lib/boardData';
import styles from './ActivityWidgets.module.css';

function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  const out = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function initialOrderIndices(n: number, seed: string): number[] {
  const base = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return base;
  const shuffled = seededShuffle(base, seed);
  if (shuffled.every((v, i) => v === i)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

// --------------------------------------------------------
// 1. Sıralama (order)
// --------------------------------------------------------
export function OrderWidget({ el }: { el: WidgetEl }) {
  const items = useMemo(() => (el.data.orderItems || []).map((s) => s.trim()).filter(Boolean), [el.data.orderItems]);
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const [order, setOrder] = useState<number[]>(() => initialOrderIndices(items.length, `${el.id}-0`));
  const [checked, setChecked] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragDy, setDragDy] = useState(0);
  const dragStartRef = useRef<{ y: number; scale: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Öğretmen madde sayısını değiştirirse sırayı güvenli şekilde yenile
  const activeOrder = order.length === items.length
    ? order
    : initialOrderIndices(items.length, `${el.id}-${shuffleNonce}`);

  if (items.length < ORDER_MIN) {
    return (
      <div className={styles.wrap}>
        <p className={styles.title}>{el.data.title?.trim() || 'Sıralama'}</p>
        <p className={styles.note}>En az {ORDER_MIN} madde gerekli. Parçayı seçip sağdaki panelden maddeleri yazın.</p>
      </div>
    );
  }

  const moveItem = (fromPos: number, toPos: number) => {
    if (toPos < 0 || toPos >= items.length || fromPos === toPos) return;
    setChecked(false);
    const next = [...activeOrder];
    const [picked] = next.splice(fromPos, 1);
    next.splice(toPos, 0, picked);
    setOrder(next);
  };

  const reshuffle = () => {
    const nextNonce = shuffleNonce + 1;
    setShuffleNonce(nextNonce);
    setOrder(initialOrderIndices(items.length, `${el.id}-${nextNonce}-${Date.now()}`));
    setChecked(false);
  };

  const correctCount = activeOrder.reduce((acc, origIdx, pos) => acc + (origIdx === pos ? 1 : 0), 0);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <div className={styles.header}>
        <p className={styles.title}>{el.data.title?.trim() || 'Sıralama'}</p>
        <span className={styles.badge}>{items.length} madde</span>
      </div>
      <ol className={styles.list}>
        {activeOrder.map((origIdx, pos) => {
          const stateCls = checked ? (origIdx === pos ? styles.ok : styles.bad) : '';
          return (
            <li
              key={`${origIdx}-${pos}`}
              data-order-idx={pos}
              className={`${styles.orderRow} ${stateCls} ${dragIdx === pos ? styles.chipDragging : ''}`}
              style={dragIdx === pos ? { transform: `translateY(${dragDy}px)` } : undefined}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                dragStartRef.current = { y: e.clientY, scale: e.currentTarget.offsetHeight ? r.height / e.currentTarget.offsetHeight : 1, moved: false };
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragIdx(pos);
                setDragDy(0);
              }}
              onPointerMove={(e) => {
                const s0 = dragStartRef.current;
                if (!s0 || dragIdx !== pos) return;
                const dy = e.clientY - s0.y;
                if (!s0.moved && Math.abs(dy) < 5) return;
                s0.moved = true;
                setDragDy(dy / s0.scale);
              }}
              onPointerUp={(e) => {
                const s0 = dragStartRef.current;
                dragStartRef.current = null;
                setDragIdx(null);
                setDragDy(0);
                if (!s0?.moved) return;
                const target = document.elementsFromPoint(e.clientX, e.clientY)
                  .map((n) => (n as HTMLElement).closest?.('[data-order-idx]') as HTMLElement | null)
                  .find((n) => n && rootRef.current?.contains(n));
                if (target) moveItem(pos, Number(target.dataset.orderIdx));
              }}
              onPointerCancel={() => { dragStartRef.current = null; setDragIdx(null); setDragDy(0); }}
            >
              <span className={styles.orderIdx}>{pos + 1}</span>
              <span className={styles.orderText}>{items[origIdx]}</span>
              <div className={styles.orderBtns}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => moveItem(pos, pos - 1)}
                  disabled={pos === 0}
                  aria-label={`${items[origIdx]} maddesini yukarı taşı`}
                >
                  <ChevronUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => moveItem(pos, pos + 1)}
                  disabled={pos === items.length - 1}
                  aria-label={`${items[origIdx]} maddesini aşağı taşı`}
                >
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => setChecked(true)}>
            Kontrol et
          </button>
          <button type="button" className={styles.actionBtn} onClick={reshuffle}>
            <RotateCcw size={15} aria-hidden="true" /> Yeniden karıştır
          </button>
        </div>
        {checked && (
          <span className={`${styles.resultText} ${correctCount < items.length ? styles.resultBad : ''}`}>
            {correctCount}/{items.length} doğru
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 2. Gruplara Ayırma (sort)
// --------------------------------------------------------
export function SortWidget({ el }: { el: WidgetEl }) {
  const groups = useMemo(
    () => (el.data.sortGroups || [])
      .map((g) => ({ title: g.title.trim(), items: g.items.map((x) => x.trim()).filter(Boolean) }))
      .filter((g) => g.title),
    [el.data.sortGroups]
  );

  const flatItems = useMemo(() => {
    const out: { id: number; text: string; groupIdx: number }[] = [];
    groups.forEach((g, gIdx) => {
      g.items.forEach((text) => {
        out.push({ id: out.length, text, groupIdx: gIdx });
      });
    });
    return out;
  }, [groups]);

  const [seedNonce, setSeedNonce] = useState(0);
  const poolOrder = useMemo(
    () => seededShuffle(flatItems.map((it) => it.id), `${el.id}-${seedNonce}`),
    [flatItems, el.id, seedNonce]
  );

  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [pickedItem, setPickedItem] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [drag, setDrag] = useState<{ itemId: number; dx: number; dy: number } | null>(null);
  const startRef = useRef<{ x: number; y: number; scale: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  if (groups.length < 2 || flatItems.length < 2) {
    return (
      <div className={styles.wrap}>
        <p className={styles.title}>{el.data.title?.trim() || 'Gruplara Ayırma'}</p>
        <p className={styles.note}>En az 2 grup ve maddeler gerekli. Parçayı seçip sağdaki panelden grupları yazın.</p>
      </div>
    );
  }

  const placeItem = (itemId: number, groupIdx: number) => {
    setChecked(false);
    setPlaced((prev) => ({ ...prev, [itemId]: groupIdx }));
    setPickedItem(null);
  };

  const unplaceItem = (itemId: number) => {
    setChecked(false);
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const reshuffle = () => {
    setPlaced({});
    setPickedItem(null);
    setChecked(false);
    setSeedNonce((n) => n + 1);
  };

  const correctCount = flatItems.reduce((acc, it) => acc + (placed[it.id] === it.groupIdx ? 1 : 0), 0);
  const unplacedIds = poolOrder.filter((id) => placed[id] === undefined);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <div className={styles.header}>
        <p className={styles.title}>{el.data.title?.trim() || 'Gruplara Ayırma'}</p>
        <span className={styles.badge}>{Object.keys(placed).length} / {flatItems.length}</span>
      </div>

      <div className={styles.pool} role="group" aria-label="Yerleştirilecek maddeler">
        {unplacedIds.map((id) => {
          const item = flatItems[id];
          if (!item) return null;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.chip} ${pickedItem === id ? styles.chipPicked : ''} ${drag?.itemId === id ? styles.chipDragging : ''}`}
              style={drag?.itemId === id ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
              aria-pressed={pickedItem === id}
              onPointerDown={(e) => {
                e.stopPropagation();
                const t = e.currentTarget;
                const r = t.getBoundingClientRect();
                startRef.current = { x: e.clientX, y: e.clientY, scale: t.offsetWidth ? r.width / t.offsetWidth : 1, moved: false };
                t.setPointerCapture(e.pointerId);
                setDrag({ itemId: id, dx: 0, dy: 0 });
              }}
              onPointerMove={(e) => {
                const s0 = startRef.current;
                if (!s0 || !drag || drag.itemId !== id) return;
                const dx = e.clientX - s0.x;
                const dy = e.clientY - s0.y;
                if (!s0.moved && Math.hypot(dx, dy) < 6) return;
                s0.moved = true;
                setDrag({ itemId: id, dx: dx / s0.scale, dy: dy / s0.scale });
              }}
              onPointerUp={(e) => {
                const s0 = startRef.current;
                startRef.current = null;
                setDrag(null);
                if (!s0) return;
                if (!s0.moved) {
                  setPickedItem((cur) => (cur === id ? null : id));
                  return;
                }
                const target = document.elementsFromPoint(e.clientX, e.clientY)
                  .map((n) => (n as HTMLElement).closest?.('[data-sort-group]') as HTMLElement | null)
                  .find((n) => n && rootRef.current?.contains(n));
                if (target) placeItem(id, Number(target.dataset.sortGroup));
              }}
              onPointerCancel={() => { startRef.current = null; setDrag(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPickedItem((cur) => (cur === id ? null : id));
                }
              }}
            >
              {item.text}
            </button>
          );
        })}
        {unplacedIds.length === 0 && <p className={styles.note}>Tüm maddeler gruplara yerleştirildi.</p>}
      </div>

      <div className={styles.sortGrid}>
        {groups.map((g, gIdx) => {
          const groupItems = flatItems.filter((it) => placed[it.id] === gIdx);
          return (
            <div
              key={gIdx}
              data-sort-group={gIdx}
              className={`${styles.sortBox} ${pickedItem !== null ? styles.sortBoxReady : ''}`}
            >
              <button
                type="button"
                className={styles.sortBoxTitle}
                onClick={() => { if (pickedItem !== null) placeItem(pickedItem, gIdx); }}
                aria-label={`${g.title} grubu${pickedItem !== null ? 'na yerleştir' : ''}`}
              >
                {g.title}
              </button>
              <div className={styles.sortItems}>
                {groupItems.map((it) => {
                  const stateCls = checked ? (it.groupIdx === gIdx ? styles.ok : styles.bad) : '';
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`${styles.chip} ${stateCls}`}
                      onClick={() => unplaceItem(it.id)}
                      title="Havuza geri al"
                    >
                      {it.text}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => setChecked(true)}>
            Kontrol et
          </button>
          <button type="button" className={styles.actionBtn} onClick={reshuffle}>
            <RotateCcw size={15} aria-hidden="true" /> Yeniden karıştır
          </button>
        </div>
        {checked && (
          <span className={`${styles.resultText} ${correctCount < flatItems.length ? styles.resultBad : ''}`}>
            {correctCount}/{flatItems.length} doğru
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 3. Boşluk Doldurma (blanks)
// --------------------------------------------------------
type BlankSeg = { kind: 'text'; value: string } | { kind: 'blank'; index: number; answer: string };

function parseBlanks(raw: string): { segments: BlankSeg[]; answers: string[] } {
  const segments: BlankSeg[] = [];
  const answers: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: raw.slice(last, m.index) });
    const answer = m[1].trim();
    if (answer) {
      segments.push({ kind: 'blank', index: answers.length, answer });
      answers.push(answer);
    } else {
      segments.push({ kind: 'text', value: m[0] });
    }
    last = re.lastIndex;
  }
  if (last < raw.length) segments.push({ kind: 'text', value: raw.slice(last) });
  return { segments, answers };
}

export function BlanksWidget({ el }: { el: WidgetEl }) {
  const { segments, answers } = useMemo(() => parseBlanks(el.data.blanksText || ''), [el.data.blanksText]);
  const distractors = useMemo(() => (el.data.blanksDistractors || []).map((s) => s.trim()).filter(Boolean), [el.data.blanksDistractors]);
  const bankWords = useMemo(() => [...answers, ...distractors], [answers, distractors]);

  const [seedNonce, setSeedNonce] = useState(0);
  const bankOrder = useMemo(
    () => seededShuffle(bankWords.map((_, i) => i), `${el.id}-${seedNonce}`),
    [bankWords, el.id, seedNonce]
  );

  // blankIdx -> bankIdx
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [pickedBankIdx, setPickedBankIdx] = useState<number | null>(null);
  const [pickedBlankIdx, setPickedBlankIdx] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [drag, setDrag] = useState<{ bankIdx: number; dx: number; dy: number } | null>(null);
  const startRef = useRef<{ x: number; y: number; scale: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  if (answers.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.title}>{el.data.title?.trim() || 'Boşluk Doldurma'}</p>
        <p className={styles.note}>Metinde [köşeli parantez] içinde en az bir boşluk yazın. Örnek: Türkiye’nin başkenti [Ankara]’dır.</p>
      </div>
    );
  }

  const usedBankIndices = new Set(Object.values(placed));

  const assignWord = (blankIdx: number, bankIdx: number) => {
    setChecked(false);
    setPlaced((prev) => {
      const next: Record<number, number> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (v !== bankIdx && Number(k) !== blankIdx) next[Number(k)] = v;
      });
      next[blankIdx] = bankIdx;
      return next;
    });
    setPickedBankIdx(null);
    setPickedBlankIdx(null);
  };

  const clearBlank = (blankIdx: number) => {
    setChecked(false);
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[blankIdx];
      return next;
    });
  };

  const resetAll = () => {
    setPlaced({});
    setPickedBankIdx(null);
    setPickedBlankIdx(null);
    setChecked(false);
    setSeedNonce((n) => n + 1);
  };

  const isBlankCorrect = (blankIdx: number) => {
    const bIdx = placed[blankIdx];
    if (bIdx === undefined) return false;
    return bankWords[bIdx].trim().toLocaleLowerCase('tr-TR') === answers[blankIdx].trim().toLocaleLowerCase('tr-TR');
  };

  const correctCount = answers.reduce((acc, _, idx) => acc + (isBlankCorrect(idx) ? 1 : 0), 0);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <div className={styles.header}>
        <p className={styles.title}>{el.data.title?.trim() || 'Boşluk Doldurma'}</p>
        <span className={styles.badge}>{Object.keys(placed).length} / {answers.length}</span>
      </div>

      <div className={styles.blanksBody}>
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.value}</span>;
          const bIdx = placed[seg.index];
          const stateCls = checked && bIdx !== undefined ? (isBlankCorrect(seg.index) ? styles.ok : styles.bad) : '';
          const readyCls = (pickedBankIdx !== null || pickedBlankIdx === seg.index) ? styles.slotReady : '';
          return (
            <button
              key={i}
              type="button"
              data-blank-idx={seg.index}
              className={`${styles.slot} ${stateCls} ${readyCls}`}
              onClick={() => {
                if (pickedBankIdx !== null) assignWord(seg.index, pickedBankIdx);
                else if (bIdx !== undefined) clearBlank(seg.index);
                else setPickedBlankIdx((cur) => (cur === seg.index ? null : seg.index));
              }}
              aria-label={bIdx !== undefined ? `${seg.index + 1}. boşluk: ${bankWords[bIdx]}. Kaldırmak için dokun.` : `${seg.index + 1}. boşluk`}
            >
              {bIdx !== undefined ? bankWords[bIdx] : '____'}
            </button>
          );
        })}
      </div>

      <div className={styles.pool} role="group" aria-label="Kelime havuzu">
        {bankOrder.map((bankIdx) => {
          if (usedBankIndices.has(bankIdx)) return null;
          return (
            <button
              key={bankIdx}
              type="button"
              className={`${styles.chip} ${pickedBankIdx === bankIdx ? styles.chipPicked : ''} ${drag?.bankIdx === bankIdx ? styles.chipDragging : ''}`}
              style={drag?.bankIdx === bankIdx ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
              aria-pressed={pickedBankIdx === bankIdx}
              onPointerDown={(e) => {
                e.stopPropagation();
                const t = e.currentTarget;
                const r = t.getBoundingClientRect();
                startRef.current = { x: e.clientX, y: e.clientY, scale: t.offsetWidth ? r.width / t.offsetWidth : 1, moved: false };
                t.setPointerCapture(e.pointerId);
                setDrag({ bankIdx, dx: 0, dy: 0 });
              }}
              onPointerMove={(e) => {
                const s0 = startRef.current;
                if (!s0 || !drag || drag.bankIdx !== bankIdx) return;
                const dx = e.clientX - s0.x;
                const dy = e.clientY - s0.y;
                if (!s0.moved && Math.hypot(dx, dy) < 6) return;
                s0.moved = true;
                setDrag({ bankIdx, dx: dx / s0.scale, dy: dy / s0.scale });
              }}
              onPointerUp={(e) => {
                const s0 = startRef.current;
                startRef.current = null;
                setDrag(null);
                if (!s0) return;
                if (!s0.moved) {
                  if (pickedBlankIdx !== null) assignWord(pickedBlankIdx, bankIdx);
                  else setPickedBankIdx((cur) => (cur === bankIdx ? null : bankIdx));
                  return;
                }
                const target = document.elementsFromPoint(e.clientX, e.clientY)
                  .map((n) => (n as HTMLElement).closest?.('[data-blank-idx]') as HTMLElement | null)
                  .find((n) => n && rootRef.current?.contains(n));
                if (target) assignWord(Number(target.dataset.blankIdx), bankIdx);
              }}
              onPointerCancel={() => { startRef.current = null; setDrag(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (pickedBlankIdx !== null) assignWord(pickedBlankIdx, bankIdx);
                  else setPickedBankIdx((cur) => (cur === bankIdx ? null : bankIdx));
                }
              }}
            >
              {bankWords[bankIdx]}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => setChecked(true)}>
            Kontrol et
          </button>
          <button type="button" className={styles.actionBtn} onClick={resetAll}>
            <RotateCcw size={15} aria-hidden="true" /> Yeniden karıştır
          </button>
        </div>
        {checked && (
          <span className={`${styles.resultText} ${correctCount < answers.length ? styles.resultBad : ''}`}>
            {correctCount}/{answers.length} doğru
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 4. Görsel Etiketleme (label)
// --------------------------------------------------------
export function LabelWidget({ el, mediaUrls }: { el: WidgetEl; mediaUrls?: Record<string, string> }) {
  const imgRef = el.data.labelImage;
  const imgUrl = imgRef ? mediaUrls?.[imageKey(imgRef)] : undefined;
  const points = useMemo(() => (el.data.labelPoints || []).filter((p) => p.text.trim()), [el.data.labelPoints]);
  const [seedNonce, setSeedNonce] = useState(0);
  const chipOrder = useMemo(
    () => seededShuffle(points.map((_, i) => i), `${el.id}-${seedNonce}`),
    [points, el.id, seedNonce]
  );

  // pointIdx -> chipIdx
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [pickedChip, setPickedChip] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [drag, setDrag] = useState<{ chipIdx: number; dx: number; dy: number } | null>(null);
  const startRef = useRef<{ x: number; y: number; scale: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  if (!imgRef || points.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.title}>{el.data.title?.trim() || 'Görsel Etiketleme'}</p>
        <p className={styles.note}>Parçayı seçip sağdaki panelden tahtadaki bir görseli seçin ve üzerine etiket noktaları ekleyin.</p>
      </div>
    );
  }

  const usedChips = new Set(Object.values(placed));

  const placeLabel = (pointIdx: number, chipIdx: number) => {
    setChecked(false);
    setPlaced((prev) => {
      const next: Record<number, number> = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (v !== chipIdx && Number(k) !== pointIdx) next[Number(k)] = v;
      });
      next[pointIdx] = chipIdx;
      return next;
    });
    setPickedChip(null);
  };

  const unplaceLabel = (pointIdx: number) => {
    setChecked(false);
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[pointIdx];
      return next;
    });
  };

  const resetAll = () => {
    setPlaced({});
    setPickedChip(null);
    setChecked(false);
    setSeedNonce((n) => n + 1);
  };

  const isPinOk = (pointIdx: number) => {
    const cIdx = placed[pointIdx];
    if (cIdx === undefined) return false;
    return points[cIdx].text.trim().toLocaleLowerCase('tr-TR') === points[pointIdx].text.trim().toLocaleLowerCase('tr-TR');
  };

  const correctCount = points.reduce((acc, _, idx) => acc + (isPinOk(idx) ? 1 : 0), 0);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <div className={styles.header}>
        <p className={styles.title}>{el.data.title?.trim() || 'Görsel Etiketleme'}</p>
        <span className={styles.badge}>{Object.keys(placed).length} / {points.length}</span>
      </div>

      <div className={styles.labelStage}>
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={el.data.title?.trim() || 'Etiketlenecek görsel'} className={styles.labelImg} draggable={false} />
        ) : (
          <p className={styles.note}>Görsel yükleniyor…</p>
        )}
        {points.map((pt, idx) => {
          const cIdx = placed[idx];
          const stateCls = checked && cIdx !== undefined ? (isPinOk(idx) ? styles.ok : styles.bad) : '';
          return (
            <div key={pt.id} className={styles.pinWrap} style={{ left: `${pt.x}%`, top: `${pt.y}%` }}>
              <button
                type="button"
                data-label-pin={idx}
                className={`${styles.pinBtn} ${cIdx !== undefined ? styles.pinFilled : ''} ${stateCls}`}
                onClick={() => {
                  if (pickedChip !== null) placeLabel(idx, pickedChip);
                  else if (cIdx !== undefined) unplaceLabel(idx);
                }}
                aria-label={cIdx !== undefined ? `${idx + 1}. nokta: ${points[cIdx].text}. Kaldırmak için dokun.` : `${idx + 1}. nokta`}
              >
                {cIdx !== undefined ? `${idx + 1}. ${points[cIdx].text}` : idx + 1}
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.pool} role="group" aria-label="Etiketler">
        {chipOrder.map((chipIdx) => {
          if (usedChips.has(chipIdx)) return null;
          return (
            <button
              key={chipIdx}
              type="button"
              className={`${styles.chip} ${pickedChip === chipIdx ? styles.chipPicked : ''} ${drag?.chipIdx === chipIdx ? styles.chipDragging : ''}`}
              style={drag?.chipIdx === chipIdx ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
              aria-pressed={pickedChip === chipIdx}
              onPointerDown={(e) => {
                e.stopPropagation();
                const t = e.currentTarget;
                const r = t.getBoundingClientRect();
                startRef.current = { x: e.clientX, y: e.clientY, scale: t.offsetWidth ? r.width / t.offsetWidth : 1, moved: false };
                t.setPointerCapture(e.pointerId);
                setDrag({ chipIdx, dx: 0, dy: 0 });
              }}
              onPointerMove={(e) => {
                const s0 = startRef.current;
                if (!s0 || !drag || drag.chipIdx !== chipIdx) return;
                const dx = e.clientX - s0.x;
                const dy = e.clientY - s0.y;
                if (!s0.moved && Math.hypot(dx, dy) < 6) return;
                s0.moved = true;
                setDrag({ chipIdx, dx: dx / s0.scale, dy: dy / s0.scale });
              }}
              onPointerUp={(e) => {
                const s0 = startRef.current;
                startRef.current = null;
                setDrag(null);
                if (!s0) return;
                if (!s0.moved) {
                  setPickedChip((cur) => (cur === chipIdx ? null : chipIdx));
                  return;
                }
                const target = document.elementsFromPoint(e.clientX, e.clientY)
                  .map((n) => (n as HTMLElement).closest?.('[data-label-pin]') as HTMLElement | null)
                  .find((n) => n && rootRef.current?.contains(n));
                if (target) placeLabel(Number(target.dataset.labelPin), chipIdx);
              }}
              onPointerCancel={() => { startRef.current = null; setDrag(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPickedChip((cur) => (cur === chipIdx ? null : chipIdx));
                }
              }}
            >
              {points[chipIdx].text}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => setChecked(true)}>
            Kontrol et
          </button>
          <button type="button" className={styles.actionBtn} onClick={resetAll}>
            <RotateCcw size={15} aria-hidden="true" /> Sıfırla
          </button>
        </div>
        {checked && (
          <span className={`${styles.resultText} ${correctCount < points.length ? styles.resultBad : ''}`}>
            {correctCount}/{points.length} doğru
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 5. Kesir Boyama (fraction)
// --------------------------------------------------------
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function gridDims(parts: number): { cols: number; rows: number } {
  let bestCols = parts;
  let bestRows = 1;
  for (let r = 2; r <= Math.floor(Math.sqrt(parts)); r += 1) {
    if (parts % r === 0) {
      bestRows = r;
      bestCols = parts / r;
    }
  }
  return { cols: bestCols, rows: bestRows };
}

export function FractionWidget({ el }: { el: WidgetEl }) {
  const parts = normalizeFractionParts(el.data.fractionParts);
  const shape = normalizeFractionShape(el.data.fractionShape);
  const targetNum = Math.max(0, Math.round(el.data.fractionNum ?? 1));
  const targetDen = Math.max(1, Math.round(el.data.fractionDen ?? parts));
  const showFraction = el.data.showFraction !== false;

  const [filled, setFilled] = useState<boolean[]>(() => Array(parts).fill(false));
  const [checked, setChecked] = useState(false);

  const activeFilled = filled.length === parts ? filled : Array(parts).fill(false);
  const painted = activeFilled.filter(Boolean).length;
  const g = gcd(painted, parts);
  const sNum = painted / g;
  const sDen = parts / g;
  const isCorrect = painted * targetDen === targetNum * parts;

  const togglePart = (idx: number) => {
    setChecked(false);
    const next = [...activeFilled];
    next[idx] = !next[idx];
    setFilled(next);
  };

  const reset = () => {
    setFilled(Array(parts).fill(false));
    setChecked(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}>{el.data.title?.trim() || 'Kesir Boyama'}</p>
        {showFraction && (
          <span className={styles.badge}>Hedef: {targetNum}/{targetDen}</span>
        )}
      </div>

      <div className={styles.fractionStage}>
        {shape === 'circle' && (
          <svg viewBox="0 0 220 220" className={styles.fractionSvg} role="group" aria-label="Kesir dairesi">
            {Array.from({ length: parts }, (_, i) => {
              const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / parts;
              const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / parts;
              const r = 96;
              const cx = 110;
              const cy = 110;
              const x1 = cx + r * Math.cos(a0);
              const y1 = cy + r * Math.sin(a0);
              const x2 = cx + r * Math.cos(a1);
              const y2 = cy + r * Math.sin(a1);
              const largeArc = (2 * Math.PI) / parts > Math.PI ? 1 : 0;
              const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
              const on = activeFilled[i];
              return (
                <path
                  key={i}
                  d={d}
                  className={styles.fractionPart}
                  fill={on ? '#2a8c5f' : '#ffffff'}
                  stroke="#1f2a24"
                  strokeWidth={2}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={`${i + 1}. parça`}
                  onClick={() => togglePart(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePart(i); } }}
                />
              );
            })}
          </svg>
        )}

        {shape === 'strip' && (
          <svg viewBox="0 0 360 100" className={styles.fractionSvg} role="group" aria-label="Kesir şeridi">
            {Array.from({ length: parts }, (_, i) => {
              const w = 340 / parts;
              const on = activeFilled[i];
              return (
                <rect
                  key={i}
                  x={10 + i * w}
                  y={14}
                  width={w}
                  height={72}
                  className={styles.fractionPart}
                  fill={on ? '#2a8c5f' : '#ffffff'}
                  stroke="#1f2a24"
                  strokeWidth={2}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={`${i + 1}. parça`}
                  onClick={() => togglePart(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePart(i); } }}
                />
              );
            })}
          </svg>
        )}

        {shape === 'grid' && (() => {
          const { cols, rows } = gridDims(parts);
          const cellW = 280 / cols;
          const cellH = 180 / rows;
          return (
            <svg viewBox="0 0 300 200" className={styles.fractionSvg} role="group" aria-label="Kesir ızgarası">
              {Array.from({ length: parts }, (_, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const on = activeFilled[i];
                return (
                  <rect
                    key={i}
                    x={10 + col * cellW}
                    y={10 + row * cellH}
                    width={cellW}
                    height={cellH}
                    className={styles.fractionPart}
                    fill={on ? '#2a8c5f' : '#ffffff'}
                    stroke="#1f2a24"
                    strokeWidth={2}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    aria-label={`${i + 1}. parça`}
                    onClick={() => togglePart(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePart(i); } }}
                  />
                );
              })}
            </svg>
          );
        })()}
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={() => setChecked(true)}>
            Kontrol et
          </button>
          <button type="button" className={styles.actionBtn} onClick={reset}>
            <RotateCcw size={15} aria-hidden="true" /> Temizle
          </button>
        </div>
        <span className={`${styles.resultText} ${checked && !isCorrect ? styles.resultBad : ''}`}>
          Boyadığın: {painted}/{parts}
          {painted > 0 && g > 1 ? ` (= ${sNum}/${sDen})` : ''}
          {checked ? (isCorrect ? ' · Doğru!' : ' · Tekrar dene') : ''}
        </span>
      </div>
    </div>
  );
}

