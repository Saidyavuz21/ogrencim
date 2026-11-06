'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, X } from '../icons';
import { playAlarm } from '../teacher/classtools/Countdown';
import { MAX_WORDS, READING_SECONDS } from '../../lib/readingData';
import styles from './Reading.module.css';

type Phase = 'ready' | 'running' | 'entry';

/**
 * Ölçüm penceresi: öğrenci adı → "Süreyi başlat" → 1 dakika geri sayım → okunan kelime sayısı.
 * Süre bitince bip çalar ve form kendiliğinden açılır.
 */
export function ReadingTimerModal({ studentName, initialWords, late, onSave, onClose }: {
  studentName: string;
  /** Daha önce girilmiş sonuç (yeniden ölçüm) */
  initialWords?: number;
  /** Yarışma bittikten sonra ekleniyor */
  late?: boolean;
  onSave: (words: number) => Promise<string | null>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [words, setWords] = useState(initialWords != null ? String(initialWords) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const titleId = 'reading-modal-title';

  // Geri sayım: süre dolunca bip ve forma geç
  useEffect(() => {
    if (phase !== 'running') return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        playAlarm(audioRef.current);
        setPhase('entry');
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, endAt]);

  useEffect(() => () => { audioRef.current?.close().catch(() => {}); }, []);

  // Esc: süre işlerken yanlışlıkla kapanmasın
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'running' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [phase, saving, onClose]);

  const start = () => {
    // Tarayıcılar sesi ancak bir dokunuştan sonra açar: başlat düğmesinde hazırlanır
    if (!audioRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    }
    const t = Date.now();
    setNow(t);
    setEndAt(t + READING_SECONDS * 1000);
    setPhase('running');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(words);
    if (words.trim() === '' || !Number.isInteger(n) || n < 0 || n > MAX_WORDS) {
      setError(`Okunan kelime sayısını yazın (0–${MAX_WORDS}).`);
      return;
    }
    setSaving(true);
    const err = await onSave(n);
    setSaving(false);
    if (err) setError(err);
  };

  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
  const progress = phase === 'running' ? Math.min(1, Math.max(0, 1 - (endAt - now) / (READING_SECONDS * 1000))) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <p className={styles.modalKicker}>{late ? 'Sonradan ölçüm' : 'Okuma ölçümü'}</p>
            <h2 id={titleId} className={styles.modalTitle}>{studentName}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} disabled={phase === 'running' || saving} aria-label="Kapat" title={phase === 'running' ? 'Süre işlerken kapatılamaz' : 'Kapat'}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {phase === 'ready' && (
          <div className={styles.modalBody}>
            <p className={styles.modalText}>Öğrenci kitaptan okumaya hazır olunca süreyi başlatın. {READING_SECONDS} saniye sonra bip sesi çalar.</p>
            <button type="button" className={styles.startButton} onClick={start} autoFocus>
              <Play size={28} aria-hidden="true" />Süreyi başlat
            </button>
            <button type="button" className={styles.linkButton} onClick={() => setPhase('entry')}>
              Süreyi başka yerde tuttum, sonucu yazacağım
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className={styles.modalBody}>
            <div className={styles.timer} role="timer" aria-live="off" aria-label={`Kalan süre ${remaining} saniye`}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx={60} cy={60} r={R} className={styles.timerTrack} />
                <circle cx={60} cy={60} r={R} className={styles.timerArc} strokeDasharray={C} strokeDashoffset={C * progress} />
              </svg>
              <span className={`${styles.timerValue} ${remaining <= 10 ? styles.timerSoon : ''}`}>
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </span>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPhase('entry')}>Erken bitir</button>
              <button type="button" className={styles.secondaryButton} onClick={() => setPhase('ready')}>
                <RotateCcw size={18} aria-hidden="true" />Baştan
              </button>
            </div>
          </div>
        )}

        {phase === 'entry' && (
          <form className={styles.modalBody} onSubmit={save}>
            <label className={styles.wordsField}>
              <span>Okuduğu kelime sayısı</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_WORDS}
                step={1}
                value={words}
                onChange={(e) => { setWords(e.target.value); setError(null); }}
                autoFocus
                aria-describedby={error ? 'reading-words-error' : undefined}
              />
            </label>
            {error && <p id="reading-words-error" className={styles.error} role="alert">{error}</p>}
            <div className={styles.modalActions}>
              <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
              <button type="button" className={styles.secondaryButton} disabled={saving} onClick={() => { setPhase('ready'); setError(null); }}>
                <RotateCcw size={18} aria-hidden="true" />Yeniden ölç
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
