'use client';

import React, { useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { Edit, Trash2, FileText } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { ProfileRecord } from '../../lib/supabaseClient';
import {
  AdminData,
  EmptyState,
  FilterBar,
  Notify,
  SearchInput,
  TeacherEditDialog,
  displayName,
  matchesQuery,
  useTeacherActions,
} from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
}

type StatusFilter = 'all' | 'active' | 'passive';

/** Onaylı öğretmenler: arama ve filtre, düzenleme, pasif/aktif, silme */
export function AdminTeachersPage({ data, notify }: Props) {
  const pendingSchoolIds = useMemo(
    () => new Set(data.schools.filter((s) => s.status === 'pending').map((s) => s.id)),
    [data.schools]
  );
  const { busyId, remove, toggleActive, viewDocument } = useTeacherActions(notify, data.refresh, pendingSchoolIds);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [schoolId, setSchoolId] = useState('');
  const [editing, setEditing] = useState<ProfileRecord | null>(null);

  const teachers = useMemo(
    () => data.profiles
      .filter((p) => p.role === 'ogretmen' && p.approved)
      .sort((a, b) => displayName(a).localeCompare(displayName(b), 'tr')),
    [data.profiles]
  );
  const schoolOptions = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => { if (t.school_id) map.set(t.school_id, t.school_name || 'Adsız okul'); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'tr'));
  }, [teachers]);

  const filtered = teachers.filter((t) =>
    matchesQuery(query, t.full_name, t.email, t.branch, t.school_name, t.class_name)
    && (status === 'all' || (status === 'active' ? t.is_active : !t.is_active))
    && (!schoolId || t.school_id === schoolId)
  );
  const passiveCount = teachers.filter((t) => !t.is_active).length;

  return (
    <section className={styles.section} aria-labelledby="teachers-title">
      <div className={styles.between}>
        <h2 id="teachers-title" className={styles.sectionTitle}>Öğretmenler ({teachers.length})</h2>
        {passiveCount > 0 && <span className={styles.errorBadge}>{passiveCount} pasif</span>}
      </div>
      <p className={styles.muted}>Pasif öğretmen giriş yapamaz ve açık oturumu hiçbir veriye erişemez. Silinen hesap geri getirilemez.</p>

      <FilterBar>
        <SearchInput id="teacher-search" value={query} onChange={setQuery} placeholder="Ad, e-posta, branş veya okul ara" />
        <div className={styles.segmented} role="group" aria-label="Durum">
          {([['all', 'Tümü'], ['active', 'Aktif'], ['passive', 'Pasif']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)}>{label}</button>
          ))}
        </div>
        {schoolOptions.length > 1 && (
          <div className={styles.filterSelect}>
            <CustomSelect
              value={schoolId}
              onChange={setSchoolId}
              options={[{ value: '', label: 'Bütün okullar' }, ...schoolOptions.map(([id, name]) => ({ value: id, label: name }))]}
              placeholder="Okul"
            />
          </div>
        )}
      </FilterBar>

      {data.loading && <EmptyState>Öğretmenler yükleniyor…</EmptyState>}
      {!data.loading && teachers.length === 0 && <EmptyState>Henüz onaylı öğretmen yok.</EmptyState>}
      {!data.loading && teachers.length > 0 && filtered.length === 0 && <EmptyState>Aramanıza uyan öğretmen yok.</EmptyState>}

      {filtered.length > 0 && (
        <ul className={styles.list}>
          {filtered.map((p) => {
            const busy = busyId === p.id;
            const isMe = p.id === data.myId;
            return (
              <li key={p.id} className={styles.row}>
                <div className={styles.details}>
                  <span className={styles.identity}>
                    <span className={p.is_active ? styles.name : styles.inactiveName}>{displayName(p)}</span>
                    <span className={p.is_active ? styles.activeBadge : styles.errorBadge}>{p.is_active ? 'Aktif' : 'Pasif'}</span>
                  </span>
                  <span className={styles.muted}>
                    {[p.email, p.branch, p.school_name, p.class_name ? `Sınıf ${p.class_name}` : null].filter(Boolean).join(' • ')}
                  </span>
                </div>
                {!isMe && (
                  <div className={styles.actions}>
                    {p.verification_doc && (
                      <button type="button" onClick={() => viewDocument(p)} className={styles.button} aria-label={`${displayName(p)} belgesini gör`}>
                        <FileText className={styles.icon} /><span className={styles.hideNarrow}>Belge</span>
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={() => setEditing(p)} className={styles.button}>
                      <Edit className={styles.icon} /> Düzenle
                    </button>
                    <button type="button" disabled={busy} onClick={() => toggleActive(p)} className={styles.button}>
                      {p.is_active ? 'Pasif yap' : 'Aktif yap'}
                    </button>
                    <button type="button" disabled={busy} onClick={() => remove(p)} aria-label={`${displayName(p)} hesabını sil`} className={styles.danger}>
                      <Trash2 className={styles.icon} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <TeacherEditDialog
          teacher={editing}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); data.refresh(); }}
        />
      )}
    </section>
  );
}
