'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Minus } from '../icons';
import { givePoints, listPointHistory, PointHistoryRow } from '../../lib/teacherData';
import { CollapsiblePanel, Notice, NoticeState, formatDateTime, initialsOf, StudentSortToggle, useClassStudents } from './TeacherUi';
import { Spinner } from '../Spinner';
import styles from './TeacherDashboard.module.css';
import pStyles from './TeacherPoints.module.css';

type PointAnimation = {
  id: string;
  studentId: string;
  delta: 1 | -1;
};

/** Puan verildiğinde hafif, hoş bir ses efekti çalar (Web Audio API) */
function playPointSound(delta: 1 | -1) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (delta > 0) {
      // Çift tonlu neşeli 'ding' (E5 -> G5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Düşük yumuşak ton (G4 -> E4)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392.00, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Ses desteği yoksa sessizce devam et
  }
}

const QUICK_REASONS = {
  plus: ['Derse aktif katılım', 'Ödevini eksiksiz yaptı', 'Arkadaşına yardım etti', 'Düzenli ve özenli çalıştı'],
  minus: ['Ödevini yapmadı', 'Ders araç-gereci eksik', 'Dersi olumsuz etkiledi', 'Geç kaldı'],
};

export function TeacherPointsPage({ selectedClass }: { selectedClass: string }) {
  const { students, setStudents, loading, error } = useClassStudents(selectedClass);
  const [history, setHistory] = useState<PointHistoryRow[]>([]);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [animations, setAnimations] = useState<PointAnimation[]>([]);

  const studentIdsKey = students.map((s) => s.id).join(',');
  useEffect(() => {
    const ids = studentIdsKey ? studentIdsKey.split(',') : [];
    let alive = true;
    listPointHistory(ids, 20).then((res) => { if (alive && res.ok) setHistory(res.data); });
    return () => { alive = false; };
  }, [studentIdsKey, historyVersion]);

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name || 'Öğrenci';

  const handleGive = async (studentId: string, delta: 1 | -1) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    // Görsel animasyonu ve sesi anında başlat
    playPointSound(delta);
    const animId = `${studentId}-${Date.now()}`;
    setAnimations((prev) => [...prev.filter((a) => a.studentId !== studentId), { id: animId, studentId, delta }]);
    setTimeout(() => {
      setAnimations((prev) => prev.filter((a) => a.id !== animId));
    }, 850);

    setBusyId(studentId);
    const res = await givePoints(studentId, delta, reason);
    setBusyId(null);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Puan verilemedi: ${res.error}` });
      return;
    }
    setStudents((prev) => prev.map((s) => s.id === studentId
      ? { ...s, points: res.data, plus_count: s.plus_count + (delta > 0 ? 1 : 0), minus_count: s.minus_count + (delta < 0 ? 1 : 0) }
      : s));
    setNotice({ kind: 'ok', text: `${student.name}: ${delta > 0 ? '+1' : '−1'} puan kaydedildi${reason.trim() ? ` (${reason.trim()})` : ''}. Yeni puan: ${res.data}.` });
    setHistoryVersion((v) => v + 1);
  };

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.pointsLayout}>
      <section className={styles.studentList} aria-label="Öğrenci puanları">
        {students.length > 1 && <div className={styles.listSortBar}><StudentSortToggle /></div>}
        {loading && <Spinner center label="Öğrenciler yükleniyor…" />}
        {error && <p className={`${styles.noticeError} ${styles.listPad}`}>{error}</p>}
        {!loading && !error && students.length === 0 && <p className={`${styles.mutedText} ${styles.listPad}`}>{selectedClass} sınıfında kayıtlı öğrenci yok.</p>}
        {students.map((s) => {
          const anim = animations.find((a) => a.studentId === s.id);
          const pulseClass = anim ? (anim.delta > 0 ? pStyles.rowPulsePlus : pStyles.rowPulseMinus) : '';

          return (
            <div key={s.id} className={`${styles.pointRow} ${pulseClass}`} style={{ position: 'relative' }}>
              {anim && (
                <span
                  key={anim.id}
                  className={`${pStyles.floatBadge} ${anim.delta > 0 ? pStyles.floatPlus : pStyles.floatMinus}`}
                  aria-hidden="true"
                >
                  {anim.delta > 0 ? '+1' : '−1'}
                </span>
              )}
              <div className={styles.studentIdentity}>
                <span className={styles.studentAvatar} aria-hidden="true">{initialsOf(s.name)}</span>
                <div>
                  <h4>{s.name}</h4>
                  <p>No {s.student_number} · {s.points} puan · +{s.plus_count} / −{s.minus_count}</p>
                </div>
              </div>
              <div className={styles.pointActions}>
                <button
                  type="button"
                  className={styles.minusButton}
                  disabled={busyId === s.id}
                  onClick={() => handleGive(s.id, -1)}
                  aria-label={`${s.name} eksi puan`}
                >
                  <Minus size={18} aria-hidden="true" />1
                </button>
                <button
                  type="button"
                  className={styles.plusButton}
                  disabled={busyId === s.id}
                  onClick={() => handleGive(s.id, 1)}
                  aria-label={`${s.name} artı puan`}
                >
                  <Plus size={18} aria-hidden="true" />1
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <aside className={styles.pointsAside}>
      <CollapsiblePanel title="Gerekçe seçin" summary={reason ? `Seçili: ${reason}` : 'İsteğe bağlı'}>
        <label className={styles.field}>Gerekçe (isteğe bağlı, sonraki puanlara uygulanır)
          <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} placeholder="Örn: Derse aktif katılım" />
        </label>
        <div className={styles.chipRow}>
          {[...QUICK_REASONS.plus, ...QUICK_REASONS.minus].map((r) => (
            <button key={r} type="button" className={`${styles.chip} ${reason === r ? styles.chipActive : ''}`} onClick={() => setReason(reason === r ? '' : r)} aria-pressed={reason === r}>{r}</button>
          ))}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Son verilen puanlar" summary={`${history.length} kayıt`}>
        <h2 id="points-history-title" className={styles.panelTitle}>Son verilen puanlar</h2>
        {history.length === 0 && <p className={styles.mutedText}>Bu sınıfta henüz puan verilmedi.</p>}
        <ul className={styles.historyList}>
          {history.map((h) => (
            <li key={h.id}>
              <span className={h.amount > 0 ? styles.historyPlus : styles.historyMinus}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
              <span><strong>{nameOf(h.student_id)}</strong> · {h.reason}</span>
              <span className={styles.mutedText}>{h.teacher_name} · {formatDateTime(h.created_at)}</span>
            </li>
          ))}
        </ul>
      </CollapsiblePanel>
      </aside>
      </div>
    </div>
  );
}
