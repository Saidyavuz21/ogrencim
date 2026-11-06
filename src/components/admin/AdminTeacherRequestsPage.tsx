'use client';

import React from 'react';
import styles from './AdminManagement.module.css';
import { Check, X, FileText } from '../icons';
import { AdminData, EmptyState, Notify, formatDate, useTeacherActions } from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
  onOpenSchoolRequests: () => void;
}

/** Onay bekleyen öğretmenler: belgeyi incele, onayla veya reddet */
export function AdminTeacherRequestsPage({ data, notify, onOpenSchoolRequests }: Props) {
  const pendingSchoolIds = new Set(data.schools.filter((s) => s.status === 'pending').map((s) => s.id));
  const { busyId, approve, remove, viewDocument } = useTeacherActions(notify, data.refresh, pendingSchoolIds);
  const pending = data.profiles
    .filter((p) => p.role === 'ogretmen' && !p.approved)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <section className={styles.section} aria-labelledby="teacher-requests-title">
      <div className={styles.between}>
        <h2 id="teacher-requests-title" className={styles.sectionTitle}>Onay bekleyen ({pending.length})</h2>
      </div>
      <p className={styles.muted}>
        Öğretmen, kayıtta öğretmen olduğunu gösteren bir belge (MEBBİS ekran görüntüsü, öğretmenlik belgesi vb.) yükler.
        Belgeyi inceleyip onaylayın. Reddedilen başvurunun hesabı ve belgesi silinir.
      </p>

      {data.loading && <EmptyState>Başvurular yükleniyor…</EmptyState>}
      {!data.loading && pending.length === 0 && <EmptyState>Onay bekleyen öğretmen başvurusu yok.</EmptyState>}

      {pending.length > 0 && (
        <ul className={styles.cardList}>
          {pending.map((p) => {
            const busy = busyId === p.id;
            const newSchool = p.school_id && pendingSchoolIds.has(p.school_id);
            return (
              <li key={p.id} className={styles.pendingRow}>
                <div className={styles.details}>
                  <span className={styles.name}>{p.full_name || '(isimsiz)'}</span>
                  <span className={styles.muted}>{p.email}</span>
                  <dl className={styles.factList}>
                    <div><dt>Branş</dt><dd>{p.branch || '—'}</dd></div>
                    <div><dt>Okul</dt><dd>{p.school_name || '—'}</dd></div>
                    <div><dt>Yer</dt><dd>{[p.district, p.city].filter(Boolean).join(' / ') || '—'}</dd></div>
                    <div><dt>Sınıf</dt><dd>{p.class_name || '—'}</dd></div>
                    <div><dt>Başvuru</dt><dd>{formatDate(p.created_at)}</dd></div>
                  </dl>
                  <span className={styles.badgeRow}>
                    {newSchool && (
                      <button type="button" className={styles.warningBadgeButton} onClick={onOpenSchoolRequests}>
                        Yeni okul: önce okulu onaylayın veya birleştirin →
                      </button>
                    )}
                    {!p.verification_doc && <span className={styles.errorBadge}>Belge yüklenmemiş</span>}
                  </span>
                </div>
                <div className={styles.actions}>
                  {p.verification_doc && (
                    <button type="button" onClick={() => viewDocument(p)} className={styles.button}>
                      <FileText className={styles.icon} /> Belgeyi gör
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={() => remove(p)} className={styles.danger}>
                    <X className={styles.icon} /> Reddet
                  </button>
                  <button type="button" disabled={busy} onClick={() => approve(p)} className={styles.primary}>
                    <Check className={styles.icon} /> Onayla
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!data.loading && pending.length > 0 && (
        <p className={styles.muted}>Onaylanan öğretmen hemen giriş yapabilir ve Öğretmenler sayfasında listelenir.</p>
      )}
    </section>
  );
}
