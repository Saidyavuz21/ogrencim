'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from './AdminManagement.module.css';
import { RotateCcw, Trash2 } from '../icons';
import { useDialog } from '../ConfirmDialog';
import { DeletedStudent, eraseStudent, listDeletedStudents, restoreStudent } from '../../lib/privacyData';
import { AdminData, EmptyState, FilterBar, Notify, SearchInput, formatDate, matchesQuery } from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
}

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/**
 * Silinenler: silinen öğrenciler 30 gün burada durur. Geri alınınca puanları, notları, ödevleri ve
 * mesajlarıyla birlikte eski hâline döner. Süre dolunca kopya kendiliğinden temizlenir.
 */
export function AdminTrashPage({ data, notify }: Props) {
  const { confirm } = useDialog();
  const [rows, setRows] = useState<DeletedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const res = await listDeletedStudents();
    setLoading(false);
    if (!res.ok) return setLoadError(res.error);
    setLoadError(null);
    setRows(res.data);
  }, []);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const handleRestore = async (s: DeletedStudent) => {
    setBusyId(s.student_id);
    const res = await restoreStudent(s.student_id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error);
    notify('ok', `${s.name} geri alındı; puanları, notları ve ödevleriyle birlikte listede.`);
    await load();
    data.refresh();
  };

  const handleErase = async (s: DeletedStudent) => {
    const ok = await confirm({
      title: 'Kalıcı olarak sil',
      message: `"${s.name}" (${s.student_number}) öğrencisinin bütün verisi ve ödev dosyaları kalıcı olarak silinecek.\nBu işlem geri alınamaz.`,
      confirmText: 'Kalıcı sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(s.student_id);
    const res = await eraseStudent(s.student_id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error);
    notify(res.data.fileWarning ? 'error' : 'ok', res.data.fileWarning || `${s.name} kalıcı olarak silindi.`);
    await load();
  };

  const filtered = rows.filter((r) => matchesQuery(query, r.name, r.student_number, r.class_name, r.school_name));
  const showSchool = new Set(rows.map((r) => r.school_id)).size > 1;

  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-labelledby="trash-title">
        <h2 id="trash-title" className={styles.sectionTitle}>Silinen öğrenciler ({rows.length})</h2>
        <p className={styles.muted}>
          Silinen öğrenci 30 gün burada bekler. Bu sürede geri alırsanız puanları, notları, ödevleri, quizleri ve
          mesajlarıyla birlikte eski hâline döner. Süre dolunca kayıt kendiliğinden temizlenir.
          Veli silme talebinde bulunduysa beklemeden <strong>Kalıcı sil</strong> kullanın.
        </p>
        {rows.length > 5 && (
          <FilterBar>
            <SearchInput id="trash-search" value={query} onChange={setQuery} placeholder="Ad, okul numarası veya sınıf ara" />
          </FilterBar>
        )}

        {loading && <EmptyState>Yükleniyor…</EmptyState>}
        {!loading && loadError && <EmptyState>Liste alınamadı: {loadError}</EmptyState>}
        {!loading && !loadError && rows.length === 0 && <EmptyState>Silinen öğrenci yok.</EmptyState>}
        {!loading && rows.length > 0 && filtered.length === 0 && <EmptyState>Aramanıza uyan öğrenci yok.</EmptyState>}

        {filtered.length > 0 && (
          <ul className={styles.list}>
            {filtered.map((s) => (
              <li key={s.student_id} className={styles.row}>
                <div className={styles.details}>
                  <span className={styles.name}>{s.name}</span>
                  <span className={styles.muted}>
                    {[`No ${s.student_number}`, s.class_name || 'Sınıfı yok', showSchool ? s.school_name : null].filter(Boolean).join(' • ')}
                  </span>
                  <span className={styles.muted}>
                    {formatDate(s.deleted_at)} tarihinde {s.deleted_by_name ? `${s.deleted_by_name} sildi` : 'silindi'} •{' '}
                    <strong>{daysLeft(s.purge_after)} gün</strong> sonra tamamen silinecek
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.primary} disabled={busyId === s.student_id} onClick={() => handleRestore(s)}>
                    <RotateCcw className={styles.icon} /> Geri al
                  </button>
                  <button type="button" className={styles.danger} disabled={busyId === s.student_id} onClick={() => handleErase(s)}>
                    <Trash2 className={styles.icon} /> Kalıcı sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
