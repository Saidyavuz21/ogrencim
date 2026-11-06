'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Maximize, Minimize, RotateCcw, Shuffle, UserX } from '../../icons';
import type { ClassStudent } from '../../../lib/teacherData';
import { initialsOf } from '../TeacherUi';
import { useFullscreen } from './useFullscreen';
import s from './ClassTools.module.css';

/**
 * Rastgele öğrenci seçici
 *  - Adil tur: herkes bir kez seçilene kadar aynı öğrenci tekrar çıkmaz (isteğe bağlı kapatılır)
 *  - "Yok" işaretlenen öğrenci atlanır (sınıf + gün bazında bu cihazda hatırlanır)
 *  - Çekiliş animasyonu: isimler hızla döner, yavaşlayarak durur
 */

type Phase = 'idle' | 'rolling' | 'done';

const today = () => new Date().toISOString().slice(0, 10);
const keys = (cls: string) => ({
  absent: `secici-yok:${cls}:${today()}`,
  round: `secici-tur:${cls}`,
  repeat: 'secici-tekrar',
});

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* gizli sekme vb. */ }
}

/** Güvenli rastgele tam sayı [0, n) */
function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

const shortName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function RandomPicker({ className, students }: { className: string; students: ClassStudent[] }) {
  const k = keys(className);
  const [absent, setAbsent] = useState<string[]>(() => readJson(k.absent, []));
  const [picked, setPicked] = useState<string[]>(() => readJson(k.round, []));
  const [allowRepeat, setAllowRepeat] = useState<boolean>(() => readJson(k.repeat, false));
  const [phase, setPhase] = useState<Phase>('idle');
  const [shownId, setShownId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);

  useEffect(() => writeJson(k.absent, absent), [k.absent, absent]);
  useEffect(() => writeJson(k.round, picked), [k.round, picked]);
  useEffect(() => writeJson(k.repeat, allowRepeat), [k.repeat, allowRepeat]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const byId = useMemo(() => new Map(students.map((st) => [st.id, st])), [students]);
  // Silinmiş/taşınmış öğrenciler listelerden düşer
  const present = useMemo(() => students.filter((st) => !absent.includes(st.id)), [students, absent]);
  const pickedInClass = useMemo(() => picked.filter((id) => byId.has(id)), [picked, byId]);
  const pool = useMemo(
    () => (allowRepeat ? present : present.filter((st) => !pickedInClass.includes(st.id))),
    [allowRepeat, present, pickedInClass]
  );
  const roundOver = !allowRepeat && present.length > 0 && pool.length === 0;
  const shown = shownId ? byId.get(shownId) : undefined;

  const pick = useCallback(() => {
    if (phase === 'rolling' || pool.length === 0) return;
    // Tekrar serbestken bile az önce seçilen hemen tekrar çıkmasın (2+ kişi varsa)
    const candidates = allowRepeat && pool.length > 1 ? pool.filter((st) => st.id !== shownId) : pool;
    const winner = candidates[randomIndex(candidates.length)];
    const finish = () => {
      setShownId(winner.id);
      setPhase('done');
      setPicked((prev) => (prev.includes(winner.id) && !allowRepeat ? prev : [...prev, winner.id]));
    };
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || present.length < 2) {
      finish();
      return;
    }
    // Çekiliş: isimler hızla döner, giderek yavaşlar (~2,4 sn)
    setPhase('rolling');
    let delay = 0;
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      delay += 45 + Math.pow(i / steps, 2.4) * 330;
      const flash = present[randomIndex(present.length)];
      timers.current.push(window.setTimeout(() => setShownId(flash.id), delay));
    }
    timers.current.push(window.setTimeout(finish, delay + 360));
  }, [phase, pool, allowRepeat, shownId, present]);

  // Tam ekranda boşluk / Enter ile seçim
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        pick();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full, pick]);

  const toggleAbsent = (id: string) =>
    setAbsent((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /** Seçilen öğrenci derste yoksa: "yok" işaretle, turdan çıkar, hemen başkasını seç */
  const skipShown = () => {
    if (!shownId) return;
    const id = shownId;
    setAbsent((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setPicked((prev) => prev.filter((x) => x !== id));
    setShownId(null);
    setPhase('idle');
  };

  const newRound = () => {
    setPicked([]);
    setShownId(null);
    setPhase('idle');
  };

  const remaining = allowRepeat ? present.length : pool.length;

  if (!students.length) {
    return <p className={s.empty}>{className} sınıfında öğrenci yok. Önce &quot;Öğrenciler&quot; sayfasından öğrenci ekleyin.</p>;
  }

  return (
    <div className={s.layout}>
      <div ref={stageRef} className={`${s.stage} ${full ? s.full : ''}`}>
        <div className={s.stageTop}>
          <span className={s.counter}>
            {allowRepeat ? `${present.length} öğrenci arasından` : `Bu turda kalan: ${remaining} / ${present.length}`}
          </span>
          <button type="button" className={s.ghost} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
            <span>{full ? 'Küçült' : 'Tam ekran'}</span>
          </button>
        </div>

        <div className={s.display} aria-live="polite" aria-atomic="true">
          {phase === 'idle' && !roundOver && (
            <p className={s.prompt}>{present.length ? 'Kim çıkacak?' : 'Bütün öğrenciler "yok" işaretli.'}</p>
          )}
          {phase === 'idle' && roundOver && (
            <p className={s.prompt}>Tur bitti! Herkes bir kez seçildi.</p>
          )}
          {phase !== 'idle' && shown && (
            <div key={phase === 'done' ? `w-${shown.id}` : 'roll'} className={`${s.card} ${phase === 'done' ? s.winner : s.rolling}`}>
              <span className={s.avatar} aria-hidden="true">{initialsOf(shown.name)}</span>
              <strong className={s.name}>{phase === 'done' ? shown.name : shortName(shown.name)}</strong>
              {phase === 'done' && <span className={s.meta}>No {shown.student_number}</span>}
            </div>
          )}
        </div>

        <div className={s.controls}>
          {roundOver ? (
            <button type="button" className={s.primary} onClick={newRound}>
              <RotateCcw size={22} aria-hidden="true" />Yeni tur
            </button>
          ) : (
            <button type="button" className={s.primary} onClick={pick} disabled={phase === 'rolling' || pool.length === 0}>
              <Shuffle size={22} aria-hidden="true" />{phase === 'rolling' ? 'Seçiliyor…' : phase === 'done' ? 'Sıradaki' : 'Öğrenci seç'}
            </button>
          )}
          {phase === 'done' && shown && (
            <button type="button" className={s.secondary} onClick={skipShown}>
              <UserX size={20} aria-hidden="true" />Derste yok, atla
            </button>
          )}
        </div>
        {full && <p className={s.hint}>Boşluk ya da Enter ile seç · Esc ile çık</p>}
      </div>

      <aside className={s.side}>
        <section className={s.panel} aria-labelledby="picker-round-title">
          <div className={s.panelHead}>
            <h2 id="picker-round-title">Bu turda seçilenler <span className={s.pill}>{pickedInClass.length}</span></h2>
            {pickedInClass.length > 0 && (
              <button type="button" className={s.link} onClick={newRound}><RotateCcw size={16} aria-hidden="true" />Yeni tur</button>
            )}
          </div>
          {pickedInClass.length === 0 ? (
            <p className={s.muted}>Henüz kimse seçilmedi.</p>
          ) : (
            <ol className={s.history}>
              {pickedInClass.map((id, i) => (
                <li key={`${id}-${i}`}>{byId.get(id)?.name}</li>
              ))}
            </ol>
          )}
          <label className={s.option}>
            <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} />
            Aynı öğrenci tekrar seçilebilsin
          </label>
        </section>

        <section className={s.panel} aria-labelledby="picker-roster-title">
          <div className={s.panelHead}>
            <h2 id="picker-roster-title">Sınıf listesi</h2>
            {absent.some((id) => byId.has(id)) && (
              <button type="button" className={s.link} onClick={() => setAbsent([])}>Herkes burada</button>
            )}
          </div>
          <p className={s.muted}>Gelmeyen öğrenciye dokunun: &quot;yok&quot; olur ve seçilmez. Bugün için hatırlanır.</p>
          <ul className={s.roster}>
            {students.map((st) => {
              const isAbsent = absent.includes(st.id);
              const done = pickedInClass.includes(st.id);
              return (
                <li key={st.id}>
                  <button
                    type="button"
                    className={`${s.chip} ${isAbsent ? s.chipAbsent : ''} ${done ? s.chipDone : ''}`}
                    aria-pressed={isAbsent}
                    aria-label={`${st.name}${isAbsent ? ', yok' : ''}${done ? ', bu turda seçildi' : ''}`}
                    onClick={() => toggleAbsent(st.id)}
                  >
                    {done && !isAbsent && <Check size={14} aria-hidden="true" />}
                    {isAbsent && <UserX size={14} aria-hidden="true" />}
                    {st.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
