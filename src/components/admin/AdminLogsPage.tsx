'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { CustomSelect } from '../CustomSelect';
import { X } from '../icons';
import {
  AccessRow, AuditRow, AUDIT_PAGE_SIZE, ClientErrorRow, listAccessLog, listAuditLog, listClientErrors, profileNames,
} from '../../lib/privacyData';
import { AdminData, EmptyState, FilterBar, SearchInput, matchesQuery } from './adminShared';

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

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/**
 * İşlem kaydı ve erişim kaydı.
 * Arama, filtreleme ve sayfalama ile desteklenir.
 */
export function AdminLogsPage({ data }: Props) {
  const [tab, setTab] = useState<Tab>('audit');
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');
  const [accessAction, setAccessAction] = useState('');
  const [errorKind, setErrorKind] = useState('');
  const [query, setQuery] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

  const actorName = useCallback(
    (id: string | null, kind: string) => (id && names[id]) || ACTOR_LABEL[kind] || kind,
    [names]
  );

  const studentOf = useCallback(
    (row: AuditRow): string | null => {
      const d = row.new_data || row.old_data || {};
      const id = row.table_name === 'students' ? row.row_id : (d.student_id as string | undefined) ?? null;
      if (!id) return null;
      return studentNames[id] || (typeof d.name === 'string' && row.table_name === 'students' ? d.name : null);
    },
    [studentNames]
  );

  // --- Filtrelenmiş Kayıtlar ---
  const filteredAudit = useMemo(() => {
    return audit.filter((r) => {
      if (!query) return true;
      const student = studentOf(r) || '';
      const actor = actorName(r.actor_id, r.actor_kind);
      const sum = summarize(r);
      const tbl = TABLE_LABEL[r.table_name] || r.table_name;
      return matchesQuery(query, student, actor, sum, tbl);
    });
  }, [audit, query, actorName, studentOf]);

  const filteredAccess = useMemo(() => {
    return access.filter((r) => {
      if (accessAction && r.action !== accessAction) return false;
      if (!query) return true;
      const std = studentNames[r.student_id] || '';
      const actor = actorName(r.actor_id, r.actor_kind);
      return matchesQuery(query, std, actor);
    });
  }, [access, accessAction, query, actorName, studentNames]);

  const filteredErrors = useMemo(() => {
    return errors.filter((r) => {
      if (errorKind && r.kind !== errorKind) return false;
      if (!query) return true;
      return matchesQuery(query, r.message, r.path || '', r.stack || '');
    });
  }, [errors, errorKind, query]);

  // Geçerli sekmenin filtrelenmiş satırları
  const currentFilteredRows = tab === 'audit' ? filteredAudit : tab === 'access' ? filteredAccess : filteredErrors;

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(currentFilteredRows.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, currentFilteredRows.length);
  const paginatedRows = currentFilteredRows.slice(startIndex, endIndex);

  const rawRows: { id: number }[] = tab === 'audit' ? audit : tab === 'access' ? access : errors;
  const last = rawRows[rawRows.length - 1]?.id;

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setPage(1);
    setQuery('');
  };

  const hasFilters = Boolean(query || table || action || accessAction || errorKind);
  const handleClearFilters = () => {
    setQuery('');
    setTable('');
    setAction('');
    setAccessAction('');
    setErrorKind('');
    setPage(1);
  };

  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-labelledby="logs-title">
        <div className={styles.between}>
          <h2 id="logs-title" className={styles.sectionTitle}>{TAB_TITLE[tab]}</h2>
          <div className={styles.segmented} role="group" aria-label="Kayıt türü">
            <button type="button" aria-pressed={tab === 'audit'} onClick={() => handleTabChange('audit')}>İşlemler</button>
            <button type="button" aria-pressed={tab === 'access'} onClick={() => handleTabChange('access')}>Erişimler</button>
            <button type="button" aria-pressed={tab === 'errors'} onClick={() => handleTabChange('errors')}>Hatalar</button>
          </div>
        </div>
        <p className={styles.muted}>
          {tab === 'audit'
            ? 'Kim, ne zaman, hangi kaydı ekledi, değiştirdi veya sildi. Değişikliklerde eski ve yeni değer görünür; PIN gibi gizli alanlar *** yazılır.'
            : tab === 'access'
              ? "Kim, hangi öğrencinin verisini ne zaman görüntüledi (PIN, rapor, dışa aktarma). Aynı kişi aynı öğrenciyi 10 dakika içinde tekrar açarsa bir kez yazılır."
              : 'Kullanıcıların tarayıcısında oluşan beklenmedik hatalar. E-posta, kimlik ve uzun sayılar kayda geçmeden silinir; kayıtlar 30 gün tutulur. Yalnızca süper admin görür.'}
        </p>

        {/* Çoklu Filtre Çubuğu */}
        <FilterBar>
          <SearchInput
            id="log-search"
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder={
              tab === 'audit'
                ? 'Kişi, öğrenci adı veya değişiklik ara...'
                : tab === 'access'
                ? 'Öğrenci adı veya görüntüleyen kişi ara...'
                : 'Hata mesajı veya sayfa yolu ara...'
            }
          />

          {tab === 'audit' && (
            <>
              <div className={styles.filterSelect}>
                <CustomSelect
                  value={table}
                  onChange={(v) => { setTable(v); setPage(1); }}
                  options={[{ value: '', label: 'Bütün kayıt türleri' }, ...Object.entries(TABLE_LABEL).map(([value, label]) => ({ value, label }))]}
                  placeholder="Kayıt türü"
                />
              </div>
              <div className={styles.filterSelect}>
                <CustomSelect
                  value={action}
                  onChange={(v) => { setAction(v); setPage(1); }}
                  options={[{ value: '', label: 'Bütün işlemler' }, ...Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))]}
                  placeholder="İşlem"
                />
              </div>
            </>
          )}

          {tab === 'access' && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={accessAction}
                onChange={(v) => { setAccessAction(v); setPage(1); }}
                options={[{ value: '', label: 'Bütün erişim türleri' }, ...Object.entries(ACCESS_LABEL).map(([value, label]) => ({ value, label }))]}
                placeholder="Erişim türü"
              />
            </div>
          )}

          {tab === 'errors' && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={errorKind}
                onChange={(v) => { setErrorKind(v); setPage(1); }}
                options={[{ value: '', label: 'Bütün hata türleri' }, ...Object.entries(ERROR_KIND_LABEL).map(([value, label]) => ({ value, label }))]}
                placeholder="Hata türü"
              />
            </div>
          )}

          {hasFilters && (
            <button
              type="button"
              className={styles.clearFilterButton}
              onClick={handleClearFilters}
            >
              <X size={15} /> Temizle
            </button>
          )}
        </FilterBar>

        {error && <EmptyState>Kayıtlar alınamadı: {error}</EmptyState>}
        {!error && !loading && currentFilteredRows.length === 0 && (
          <EmptyState>Aramanıza veya filtrelere uyan kayıt bulunamadı.</EmptyState>
        )}

        {/* Tab 1: İşlem Kaydı */}
        {tab === 'audit' && currentFilteredRows.length > 0 && (
          <ul className={styles.list}>
            {(paginatedRows as AuditRow[]).map((r) => {
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

        {/* Tab 2: Erişim Kaydı */}
        {tab === 'access' && currentFilteredRows.length > 0 && (
          <ul className={styles.list}>
            {(paginatedRows as AccessRow[]).map((r) => (
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

        {/* Tab 3: Hatalar */}
        {tab === 'errors' && currentFilteredRows.length > 0 && (
          <ul className={styles.list}>
            {(paginatedRows as ClientErrorRow[]).map((r) => (
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

        {/* Sayfalama (Pagination) */}
        {currentFilteredRows.length > pageSize && (
          <nav className={styles.pagination} aria-label="Kayıtlar sayfalama">
            <div className={styles.paginationInfo}>
              Toplam <strong>{currentFilteredRows.length}</strong> kayıttan <strong>{startIndex + 1}–{endIndex}</strong> arası gösteriliyor
            </div>
            <div className={styles.paginationControls}>
              <div className={styles.pageSizeSelector}>
                <label htmlFor="log-page-size-select">Sayfa başı:</label>
                <select
                  id="log-page-size-select"
                  className={styles.pageSizeSelect}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </button>

              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                p === '...' ? (
                  <span key={`log-dots-${idx}`} className={styles.pageDots}>…</span>
                ) : (
                  <button
                    key={`log-p-${p}`}
                    type="button"
                    className={`${styles.pageButton} ${p === currentPage ? styles.pageButtonActive : ''}`}
                    onClick={() => setPage(Number(p))}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sonraki
              </button>
            </div>
          </nav>
        )}

        {loading && <EmptyState>Yükleniyor…</EmptyState>}
        {!loading && hasMore && last !== undefined && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button type="button" className={styles.button} onClick={() => load(true, last)}>
              Sunucudan daha eski kayıtları getir ({AUDIT_PAGE_SIZE} kayıt)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
