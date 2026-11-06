'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Minus } from '../icons';
import { givePoints, listPointHistory, PointHistoryRow } from '../../lib/teacherData';
import { CollapsiblePanel, Notice, NoticeState, formatDateTime, initialsOf, StudentSortToggle, useClassStudents } from './TeacherUi';
import { Spinner } from '../Spinner';
import styles from './TeacherDashboard.module.css';

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
        {students.map((s) => (
          <div key={s.id} className={styles.pointRow}>
            <div className={styles.studentIdentity}>
              <span className={styles.studentAvatar} aria-hidden="true">{initialsOf(s.name)}</span>
              <div>
                <h4>{s.name}</h4>
                <p>No {s.student_number} · {s.points} puan · +{s.plus_count} / −{s.minus_count}</p>
              </div>
            </div>
            <div className={styles.pointActions}>
              <button type="button" className={styles.minusButton} disabled={busyId === s.id} onClick={() => handleGive(s.id, -1)} aria-label={`${s.name} eksi puan`}><Minus size={18} aria-hidden="true" />1</button>
              <button type="button" className={styles.plusButton} disabled={busyId === s.id} onClick={() => handleGive(s.id, 1)} aria-label={`${s.name} artı puan`}><Plus size={18} aria-hidden="true" />1</button>
            </div>
          </div>
        ))}
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
