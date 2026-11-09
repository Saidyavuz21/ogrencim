'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { CustomSelect } from '../CustomSelect';
import {
  AccessRow, AuditRow, AUDIT_PAGE_SIZE, ClientErrorRow, listAccessLog, listAuditLog, listClientErrors, profileNames,
} from '../../lib/privacyData';
import { AdminData, EmptyState, FilterBar } from './adminShared';

interface Props {
  data: AdminData;
}

type Tab = 'audit' | 'access' | 'errors';

const TABLE_LABEL: Record<string, string> = {
  students: 'Öğrenci',
  student_credentials: 'Öğrenci PIN',
  points_history: 'Puan',
  grades: 'Not',
  homework_checks: 'Ödev kontrolü',
  homeworks: 'Ödev',
  homework_submissions: 'Ödev teslimi',
  reading_contests: 'Okuma yarışması',
  reading_results: 'Okuma sonucu',
  announcements: 'Duyuru',
  profiles: 'Hesap',
  schools: 'Okul',
  teacher_classes: 'Öğretmen sınıfı',
  class_members: 'Sınıf üyeliği',
  data_requests: 'KVKK talebi',
};

const ACTION_LABEL: Record<AuditRow['action'], string> = {
  INSERT: 'Ekleme',
  UPDATE: 'Değişiklik',
  DELETE: 'Silme',
  RESTORE: 'Geri alma',
  ERASE: 'Kalıcı silme',
};

const ACTOR_LABEL: Record<string, string> = {
  admin: 'Admin',
  staff: 'Öğretmen',
  student: 'Öğrenci',
  system: 'Sistem',
  user: 'Kullanıcı',
  visitor: 'Ziyaretçi',
};

const ERROR_KIND_LABEL: Record<ClientErrorRow['kind'], string> = {
  error: 'Hata',
  promise: 'İşlem hatası',
  render: 'Sayfa çöktü',
};

const TAB_TITLE: Record<Tab, string> = { audit: 'İşlem kaydı', access: 'Erişim kaydı', errors: 'Hata kaydı' };

const ACCESS_LABEL: Record<string, string> = {
  pins: "giriş PIN'ini görüntüledi",
  profile: 'profilini açtı',
  report: 'raporunu açtı',
  messages: 'mesajlarını açtı',
  grades: 'notlarını açtı',
  export: 'verisini dışa aktardı',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'evet' : 'hayır';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
};

/** Kaydın tek satırlık özeti: değişiklikte "alan: eski → yeni", eklemede/silmede ad/başlık/miktar */
function summarize(row: AuditRow): string {
  const d = row.new_data || row.old_data || {};
  if (row.action === 'UPDATE' && row.new_data) {
    return Object.keys(row.new_data)
      .slice(0, 4)
      .map((k) => `${k}: ${show(row.old_data?.[k])} → ${show(row.new_data?.[k])}`)
      .join(' · ');
  }
  const parts = ['name', 'full_name', 'title', 'student_number', 'class_name', 'amount', 'reason', 'subject', 'score', 'status']
    .filter((k) => d[k] !== undefined && d[k] !== null && d[k] !== '')
    .slice(0, 4)
    .map((k) => `${k}: ${show(d[k])}`);
  return parts.join(' · ') || (row.action === 'ERASE' ? 'Kişisel veriler kalıcı olarak silindi' : '');
}

/**
 * İşlem kaydı (kim, ne zaman, neyi değiştirdi) ve erişim kaydı (kim hangi öğrencinin verisini görüntüledi).
 * Süper admin bütün okulları, okul yöneticisi yalnızca kendi okulunu görür (RLS).
 */
export function AdminLogsPage({ data }: Props) {
  const [tab, setTab] = useState<Tab>('audit');
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [errors, setErrors] = useState<ClientErrorRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const studentNames = useMemo(() => {
    const map: Record<string, string> = {};
    data.students.forEach((s) => { map[s.id] = `${s.name} (${s.class_name || 'sınıfsız'})`; });
    return map;
  }, [data.students]);

  const addNames = useCallback(async (ids: (string | null)[]) => {
    const found = await profileNames(ids.filter((x): x is string => Boolean(x)));
    setNames((prev) => ({ ...prev, ...found }));
  }, []);

  const load = useCallback(async (append: boolean, before?: number) => {
    setLoading(true);
    if (tab === 'audit') {
      const res = await listAuditLog({ table: table || undefined, action: action || undefined, before });
      setLoading(false);
      if (!res.ok) return setError(res.error);
      setError(null);
      setAudit((prev) => (append ? [...prev, ...res.data] : res.data));
      setHasMore(res.data.length === AUDIT_PAGE_SIZE);
      addNames(res.data.map((r) => r.actor_id));
    } else if (tab === 'errors') {
      const res = await listClientErrors(before);
      setLoading(false);
      if (!res.ok) return setError(res.error);
      setError(null);
      setErrors((prev) => (append ? [...prev, ...res.data] : res.data));
      setHasMore(res.data.length === AUDIT_PAGE_SIZE);
    } else {
      const res = await listAccessLog({ before });
      setLoading(false);
      if (!res.ok) return setError(res.error);
      setError(null);
      setAccess((prev) => (append ? [...prev, ...res.data] : res.data));
      setHasMore(res.data.length === AUDIT_PAGE_SIZE);
      addNames(res.data.map((r) => r.actor_id));
    }
  }, [tab, table, action, addNames]);

  useEffect(() => { queueMicrotask(() => load(false)); }, [load]);

  const actorName = (id: string | null, kind: string) => (id && names[id]) || ACTOR_LABEL[kind] || kind;

  const studentOf = (row: AuditRow): string | null => {
    const d = row.new_data || row.old_data || {};
    const id = row.table_name === 'students' ? row.row_id : (d.student_id as string | undefined) ?? null;
    if (!id) return null;
    return studentNames[id] || (typeof d.name === 'string' && row.table_name === 'students' ? d.name : null);
  };

  const rows: { id: number }[] = tab === 'audit' ? audit : tab === 'access' ? access : errors;
  const last = rows[rows.length - 1]?.id;

  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-labelledby="logs-title">
        <div className={styles.between}>
          <h2 id="logs-title" className={styles.sectionTitle}>{TAB_TITLE[tab]}</h2>
          <div className={styles.segmented} role="group" aria-label="Kayıt türü">
            <button type="button" aria-pressed={tab === 'audit'} onClick={() => setTab('audit')}>İşlemler</button>
            <button type="button" aria-pressed={tab === 'access'} onClick={() => setTab('access')}>Erişimler</button>
            <button type="button" aria-pressed={tab === 'errors'} onClick={() => setTab('errors')}>Hatalar</button>
          </div>
        </div>
        <p className={styles.muted}>
          {tab === 'audit'
            ? 'Kim, ne zaman, hangi kaydı ekledi, değiştirdi veya sildi. Değişikliklerde eski ve yeni değer görünür; PIN gibi gizli alanlar *** yazılır.'
            : tab === 'access'
              ? "Kim, hangi öğrencinin verisini ne zaman görüntüledi (PIN, rapor, dışa aktarma). Aynı kişi aynı öğrenciyi 10 dakika içinde tekrar açarsa bir kez yazılır."
              : 'Kullanıcıların tarayıcısında oluşan beklenmedik hatalar. E-posta, kimlik ve uzun sayılar kayda geçmeden silinir; kayıtlar 30 gün tutulur. Yalnızca süper admin görür.'}
        </p>

        {tab === 'audit' && (
          <FilterBar>
            <div className={styles.filterSelect}>
              <CustomSelect
                value={table}
                onChange={setTable}
                options={[{ value: '', label: 'Bütün kayıt türleri' }, ...Object.entries(TABLE_LABEL).map(([value, label]) => ({ value, label }))]}
                placeholder="Kayıt türü"
              />
            </div>
            <div className={styles.filterSelect}>
              <CustomSelect
                value={action}
                onChange={setAction}
                options={[{ value: '', label: 'Bütün işlemler' }, ...Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))]}
                placeholder="İşlem"
              />
            </div>
          </FilterBar>
        )}

        {error && <EmptyState>Kayıtlar alınamadı: {error}</EmptyState>}
        {!error && !loading && rows.length === 0 && <EmptyState>Henüz kayıt yok.</EmptyState>}

        {tab === 'audit' && audit.length > 0 && (
          <ul className={styles.list}>
            {audit.map((r) => {
              const student = studentOf(r);
              return (
                <li key={r.id} className={styles.row}>
                  <div className={styles.details}>
                    <div className={styles.identity}>
                      <span className={r.action === 'DELETE' || r.action === 'ERASE' ? styles.errorBadge : r.action === 'INSERT' || r.action === 'RESTORE' ? styles.activeBadge : styles.badge}>
                        {ACTION_LABEL[r.action]}
                      </span>
                      <span className={styles.name}>{TABLE_LABEL[r.table_name] || r.table_name}{student ? ` · ${student}` : ''}</span>
                    </div>
                    <span className={styles.muted}>{formatTime(r.at)} · {actorName(r.actor_id, r.actor_kind)}</span>
                    {summarize(r) && <span className={styles.muted}>{summarize(r)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {tab === 'access' && access.length > 0 && (
          <ul className={styles.list}>
            {access.map((r) => (
              <li key={r.id} className={styles.row}>
                <div className={styles.details}>
                  <span className={styles.name}>
                    {actorName(r.actor_id, r.actor_kind)}, {studentNames[r.student_id] || 'silinmiş öğrenci'} adlı öğrencinin {ACCESS_LABEL[r.action] || r.action}
                  </span>
                  <span className={styles.muted}>{formatTime(r.at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === 'errors' && errors.length > 0 && (
          <ul className={styles.list}>
            {errors.map((r) => (
              <li key={r.id} className={styles.row}>
                <div className={styles.details}>
                  <div className={styles.identity}>
                    <span className={r.kind === 'render' ? styles.errorBadge : styles.warningBadge}>{ERROR_KIND_LABEL[r.kind]}</span>
                    <span className={styles.name}>{r.message}</span>
                  </div>
                  <span className={styles.muted}>
                    {formatTime(r.at)} · {ACTOR_LABEL[r.actor_kind || ''] || r.actor_kind || 'Bilinmiyor'} · {r.path || '/'}
                  </span>
                  {r.stack && (
                    <details>
                      <summary className={styles.muted}>Ayrıntı</summary>
                      <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 12, color: '#58665f' }}>{r.stack}</pre>
                      {r.user_agent && <span className={styles.muted}>{r.user_agent}</span>}
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {loading && <EmptyState>Yükleniyor…</EmptyState>}
        {!loading && hasMore && last !== undefined && (
          <button type="button" className={styles.button} onClick={() => load(true, last)}>Daha eski kayıtlar</button>
        )}
      </section>
    </div>
  );
}
