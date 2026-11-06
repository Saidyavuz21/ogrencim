'use client';

import React, { useState } from 'react';
import styles from './AdminManagement.module.css';
import { Check, Trash2, Plus } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { approveSchool, mergeSchool, deleteSchool, SchoolRecord } from '../../lib/supabaseClient';
import { AdminData, EmptyState, Notify } from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
  /** Okullar sayfasını ekleme formu açık hâlde açar */
  onAddSchools: () => void;
}

/** Öğretmenlerin "Okulum listede yok" ile eklediği okullar: onayla, birleştir veya sil */
export function AdminSchoolRequestsPage({ data, notify, onAddSchools }: Props) {
  const { confirm, prompt } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mergeFor, setMergeFor] = useState<SchoolRecord | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');

  const pending = data.schools.filter((s) => s.status === 'pending');
  const teachersOf = (schoolId: string) => data.profiles.filter((p) => p.school_id === schoolId);
  const mergeOptions = mergeFor
    ? data.schools.filter((s) => s.status === 'approved' && s.city === mergeFor.city && s.district === mergeFor.district)
    : [];

  const handleApprove = async (s: SchoolRecord) => {
    const corrected = await prompt({
      title: 'Okulu Onayla',
      message: 'Okul adını kontrol edin (gerekirse düzeltin) ve onaylayın:',
      defaultValue: s.name,
      confirmText: 'Onayla ve Ekle',
      cancelText: 'Vazgeç',
      variant: 'primary',
    });
    if (corrected === null) return;
    setBusyId(s.id);
    const res = await approveSchool(s.id, corrected);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Onaylanamadı.');
    notify('ok', `${corrected.trim() || s.name} okul listesine eklendi.`);
    data.refresh();
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeFor || !mergeTarget) return;
    setBusyId(mergeFor.id);
    const res = await mergeSchool(mergeFor.id, mergeTarget);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Birleştirilemedi.');
    const target = mergeOptions.find((o) => o.id === mergeTarget);
    notify('ok', `"${mergeFor.name}" → "${target?.name}" ile birleştirildi; öğretmenleri taşındı.`);
    setMergeFor(null);
    data.refresh();
  };

  const handleDelete = async (s: SchoolRecord) => {
    const ok = await confirm({
      title: 'Okulu Sil',
      message: `"${s.name}" silinsin mi?\nBu okulu seçen öğretmenlerin okul bilgisi boşalır.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(s.id);
    const res = await deleteSchool(s.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', `"${s.name}" silindi.`);
    data.refresh();
  };

  return (
    <section className={styles.section} aria-labelledby="school-requests-title">
      <div className={styles.between}>
        <h2 id="school-requests-title" className={styles.sectionTitle}>Onay bekleyen okullar ({pending.length})</h2>
        <button type="button" className={styles.button} onClick={onAddSchools}>
          <Plus className={styles.icon} /> Okul ekle
        </button>
      </div>
      <p className={styles.muted}>
        Listede olmayan okullar öğretmen kaydında buraya düşer. Doğruysa onaylayın; yazım farkıyla tekrar eklenmiş bir okulsa
        listedeki okulla birleştirin, öğretmenleri oraya taşınır.
      </p>

      {data.loading && <EmptyState>Okullar yükleniyor…</EmptyState>}
      {!data.loading && pending.length === 0 && <EmptyState>Onay bekleyen okul yok.</EmptyState>}

      {pending.length > 0 && (
        <ul className={styles.cardList}>
          {pending.map((s) => {
            const teachers = teachersOf(s.id);
            const busy = busyId === s.id;
            return (
              <li key={s.id} className={styles.pendingRow}>
                <div className={styles.details}>
                  <span className={styles.name}>{s.name}</span>
                  <span className={styles.muted}>{s.district} / {s.city}</span>
                  <span className={styles.muted}>
                    {teachers.length
                      ? `Seçen öğretmen: ${teachers.map((t) => t.full_name || t.email).join(', ')}`
                      : 'Bu okulu seçen öğretmen yok.'}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button type="button" disabled={busy} onClick={() => handleDelete(s)} aria-label={`${s.name} okulunu sil`} className={styles.danger}>
                    <Trash2 className={styles.icon} />
                  </button>
                  <button type="button" disabled={busy} onClick={() => { setMergeFor(s); setMergeTarget(''); }} className={styles.button}>
                    Birleştir
                  </button>
                  <button type="button" disabled={busy} onClick={() => handleApprove(s)} className={styles.primary}>
                    <Check className={styles.icon} /> Onayla
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {mergeFor && (
        <div className={styles.backdrop}>
          <form onSubmit={handleMerge} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="merge-title">
            <h3 id="merge-title" className={styles.sectionTitle}>Okulu birleştir</h3>
            <p className={styles.muted}>
              <strong>{mergeFor.name}</strong> ({mergeFor.district}/{mergeFor.city}) aslında listedeki hangi okul? Bu okulu seçen
              öğretmenler seçtiğiniz okula taşınır ve bu kayıt silinir.
            </p>
            {mergeOptions.length === 0 ? (
              <p className={styles.muted}>Bu ilçede henüz onaylı okul yok. Birleştirmek yerine okulu onaylayabilirsiniz.</p>
            ) : (
              <CustomSelect
                value={mergeTarget}
                onChange={(val) => setMergeTarget(val)}
                placeholder="Okul seçin"
                options={mergeOptions.map((o) => ({ value: o.id, label: o.name }))}
              />
            )}
            <div className={styles.actions}>
              <button type="button" onClick={() => setMergeFor(null)} className={styles.button}>Vazgeç</button>
              <button type="submit" disabled={!mergeTarget || busyId === mergeFor.id} className={styles.primary}>Birleştir</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
