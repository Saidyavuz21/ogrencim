'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from '../icons';
import { CollapsiblePanel } from './TeacherUi';
import { DeletedStudent, listDeletedStudents, restoreStudent } from '../../lib/privacyData';
import styles from './TeacherDashboard.module.css';

const daysLeft = (iso: string, now: number) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));

/**
 * Öğretmenin kendi sınıflarından silinen öğrenciler (30 gün geri alınabilir).
 * Liste boşsa hiç gösterilmez. `refreshKey` değişince (ör. yeni silme) yeniden yüklenir.
 */
export function TeacherDeletedStudents({ refreshKey, onRestored }: { refreshKey: number; onRestored: () => void }) {
  const [rows, setRows] = useState<DeletedStudent[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await listDeletedStudents();
    setLoadedAt(Date.now());
    if (res.ok) setRows(res.data);
  }, []);

  useEffect(() => { queueMicrotask(load); }, [load, refreshKey]);

  const handleRestore = async (s: DeletedStudent) => {
    setBusyId(s.student_id);
    const res = await restoreStudent(s.student_id);
    setBusyId(null);
    if (!res.ok) return setMessage({ ok: false, text: res.error });
    setMessage({ ok: true, text: `${s.name} geri alındı; puanları, notları ve ödevleriyle birlikte listede.` });
    await load();
    onRestored();
  };

  if (!rows.length && !message) return null;

  return (
    <CollapsiblePanel title={`Silinen öğrenciler (${rows.length})`} summary="30 gün içinde geri alınabilir">
      <p className={styles.hintText}>Silinen öğrenci 30 gün burada bekler; geri alınca bütün kayıtlarıyla döner. Süre dolunca kendiliğinden silinir.</p>
      {message && <p role={message.ok ? 'status' : 'alert'} className={message.ok ? styles.noticeOk : styles.noticeError}>{message.text}</p>}
      <ul className={styles.studentCards}>
        {rows.map((s) => (
          <li key={s.student_id} className={styles.studentCard}>
            <div className={styles.studentCardHead}>
              <div className={styles.studentCardInfo}>
                <strong>{s.name}</strong>
                <span>No {s.student_number} · {s.class_name || 'Sınıf yok'} · {daysLeft(s.purge_after, loadedAt)} gün kaldı</span>
              </div>
              <button type="button" className={styles.secondary} disabled={busyId === s.student_id} onClick={() => handleRestore(s)}>
                <RotateCcw size={16} aria-hidden="true" /><span>Geri al</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </CollapsiblePanel>
  );
}
