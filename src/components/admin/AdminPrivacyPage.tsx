'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './AdminManagement.module.css';
import { Check, Download, Plus, Trash2, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { AdminStudentRecord } from '../../lib/adminData';
import {
  ConsentRow, DataRequest, DataRequestKind, REQUEST_KIND_LABEL,
  createDataRequest, eraseStudent, exportStudentData, listConsents, listDataRequests, resolveDataRequest, setGuardianConsent,
} from '../../lib/privacyData';
import { AdminData, EmptyState, FilterBar, Notify, SearchInput, formatDate, matchesQuery } from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
}

const STATUS_LABEL: Record<DataRequest['status'], string> = { open: 'Açık', done: 'Tamamlandı', rejected: 'Reddedildi' };

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/**
 * KVKK: veli talepleri (verinin kopyası, silinmesi, düzeltilmesi) ve veli açık rızası.
 * Okul ve sınıf filtreleri, talep durumu ve gelişmiş sayfalama ile desteklenir.
 */
export function AdminPrivacyPage({ data, notify }: Props) {
  const { confirm } = useDialog();
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [reqError, setReqError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);

  // Veli Talepleri Filtreleri
  const [requestQuery, setRequestQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [requestKindFilter, setRequestKindFilter] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize] = useState(10);

  // Yeni talep formu
  const [formOpen, setFormOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [picked, setPicked] = useState<AdminStudentRecord | null>(null);
  const [kind, setKind] = useState<DataRequestKind>('export');
  const [requester, setRequester] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');

  // Rıza Listesi ve Filtreleri
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [consentQuery, setConsentQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [consentStatusFilter, setConsentStatusFilter] = useState<'missing' | 'given' | 'all'>('missing');
  const [consentPage, setConsentPage] = useState(1);
  const [consentPageSize, setConsentPageSize] = useState(20);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([listDataRequests(), listConsents()]);
    setLoading(false);
    setLoadedAt(Date.now());
    if (r.ok) { setRequests(r.data); setReqError(null); } else setReqError(r.error);
    if (c.ok) { setConsents(c.data); setConsentError(null); } else setConsentError(c.error);
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const matches = useMemo(
    () => (studentQuery.trim() ? data.students.filter((s) => matchesQuery(studentQuery, s.name, s.student_number)).slice(0, 8) : []),
    [studentQuery, data.students],
  );
  const studentById = useMemo(() => new Map(data.students.map((s) => [s.id, s])), [data.students]);

  // Okullar Haritası
  const approvedSchools = useMemo(() => {
    return data.schools.filter((s) => s.status === 'approved');
  }, [data.schools]);

  // Sınıf Seçenekleri (Seçili okula göre dinamik)
  const availableClasses = useMemo(() => {
    const pool = schoolFilter ? consents.filter((c) => c.school_id === schoolFilter) : consents;
    const set = new Set(pool.map((c) => c.class_name).filter(Boolean) as string[]);
    return [...set].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [consents, schoolFilter]);

  const resetForm = () => {
    setPicked(null); setStudentQuery(''); setKind('export'); setRequester(''); setContact(''); setNote('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) return notify('error', 'Lütfen talebin ilgili olduğu öğrenciyi seçiniz.');
    if (!requester.trim()) return notify('error', 'Lütfen talepte bulunan velinin adını yazınız.');
    setBusy('new');
    const res = await createDataRequest({
      schoolId: picked.school_id, studentId: picked.id, studentName: picked.name, studentNumber: picked.student_number,
      kind, requesterName: requester, requesterContact: contact, note,
    });
    setBusy(null);
    if (!res.ok) return notify('error', res.error);
    notify('ok', 'Talep kaydedildi. KVKK gereği en geç 30 gün içinde yanıtlanmalıdır.');
    resetForm();
    setFormOpen(false);
    load();
  };

  const handleExport = async (studentId: string, label: string) => {
    setBusy(`export-${studentId}`);
    const res = await exportStudentData(studentId, label);
    setBusy(null);
    if (!res.ok) notify('error', res.error);
  };

  const handleResolve = async (r: DataRequest, status: 'done' | 'rejected') => {
    const resolution = status === 'done'
      ? r.kind === 'export' ? 'Veri dosyası veliye teslim edildi.' : 'Talep yerine getirildi.'
      : 'Talep reddedildi.';
    setBusy(r.id);
    const res = await resolveDataRequest(r.id, status, resolution);
    setBusy(null);
    if (!res.ok) return notify('error', res.error);
    load();
  };

  const handleErase = async (r: DataRequest) => {
    if (!r.student_id) return;
    const ok = await confirm({
      title: 'Öğrencinin verisini kalıcı olarak sil',
      message: `"${r.student_name}" öğrencisinin hesabı, puanları, notları, ödevleri, mesajları ve ödev dosyaları kalıcı olarak silinecek. İşlem kayıtlarındaki kişisel bilgiler de boşaltılır.\nBu işlem geri alınamaz.`,
      confirmText: 'Kalıcı sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusy(r.id);
    const res = await eraseStudent(r.student_id, r.id);
    setBusy(null);
    if (!res.ok) return notify('error', res.error);
    notify(res.data.fileWarning ? 'error' : 'ok', res.data.fileWarning || 'Öğrencinin bütün verisi kalıcı olarak silindi; talep tamamlandı.');
    load();
    data.refresh();
  };

  const handleConsent = async (row: ConsentRow, given: boolean) => {
    setBusy(`consent-${row.id}`);
    const res = await setGuardianConsent(row.id, given);
    setBusy(null);
    if (!res.ok) return notify('error', res.error);
    setConsents((prev) => prev.map((c) => (c.id === row.id ? { ...c, guardian_consent_at: given ? new Date().toISOString() : null } : c)));
  };

  const daysOld = (iso: string) => Math.max(0, Math.floor((loadedAt - new Date(iso).getTime()) / 86_400_000));

  // --- Filtrelenmiş Veli Talepleri ---
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestStatusFilter === 'open' && r.status !== 'open') return false;
      if (requestStatusFilter === 'closed' && r.status === 'open') return false;
      if (requestKindFilter && r.kind !== requestKindFilter) return false;
      if (requestQuery && !matchesQuery(requestQuery, r.student_name, r.student_number, r.requester_name, r.note)) return false;
      return true;
    });
  }, [requests, requestStatusFilter, requestKindFilter, requestQuery]);

  const reqTotalPages = Math.max(1, Math.ceil(filteredRequests.length / requestPageSize));
  const reqCurrentPage = Math.min(Math.max(1, requestPage), reqTotalPages);
  const reqStartIndex = (reqCurrentPage - 1) * requestPageSize;
  const reqEndIndex = Math.min(reqStartIndex + requestPageSize, filteredRequests.length);
  const paginatedRequests = filteredRequests.slice(reqStartIndex, reqEndIndex);

  // --- Filtrelenmiş Veli Açık Rızaları ---
  const totalMissing = consents.filter((c) => !c.guardian_consent_at).length;
  const filteredConsents = useMemo(() => {
    return consents.filter((c) => {
      if (schoolFilter && c.school_id !== schoolFilter) return false;
      if (classFilter && c.class_name !== classFilter) return false;
      if (consentStatusFilter === 'missing' && c.guardian_consent_at) return false;
      if (consentStatusFilter === 'given' && !c.guardian_consent_at) return false;
      if (consentQuery && !matchesQuery(consentQuery, c.name, c.student_number, c.class_name)) return false;
      return true;
    });
  }, [consents, schoolFilter, classFilter, consentStatusFilter, consentQuery]);

  const consentTotalPages = Math.max(1, Math.ceil(filteredConsents.length / consentPageSize));
  const consentCurrentPage = Math.min(Math.max(1, consentPage), consentTotalPages);
  const consentStartIndex = (consentCurrentPage - 1) * consentPageSize;
  const consentEndIndex = Math.min(consentStartIndex + consentPageSize, filteredConsents.length);
  const paginatedConsents = filteredConsents.slice(consentStartIndex, consentEndIndex);

  const hasConsentFilters = Boolean(consentQuery || schoolFilter || classFilter || consentStatusFilter !== 'missing');

  const requestRow = (r: DataRequest) => {
    const age = daysOld(r.created_at);
    const student = r.student_id ? studentById.get(r.student_id) : undefined;
    return (
      <li key={r.id} className={styles.row}>
        <div className={styles.details}>
          <div className={styles.identity}>
            <span className={r.status === 'open' ? (age >= 25 ? styles.errorBadge : styles.warningBadge) : r.status === 'done' ? styles.activeBadge : styles.badge}>
              {r.status === 'open' ? `${age}. gün` : STATUS_LABEL[r.status]}
            </span>
            <span className={styles.name}>{REQUEST_KIND_LABEL[r.kind]} · {r.student_name}{r.student_number ? ` (No ${r.student_number})` : ''}</span>
          </div>
          <span className={styles.muted}>
            {formatDate(r.created_at)} · Talep eden: {r.requester_name}{r.requester_contact ? ` (${r.requester_contact})` : ''}
          </span>
          {r.note && <span className={styles.muted}>Not: {r.note}</span>}
          {r.resolution && r.status !== 'open' && <span className={styles.muted}>Sonuç: {r.resolution}</span>}
        </div>
        {r.status === 'open' && (
          <div className={styles.actions}>
            {r.student_id && (r.kind === 'export' || r.kind === 'other') && (
              <button type="button" className={styles.button} disabled={busy === `export-${r.student_id}`} onClick={() => handleExport(r.student_id!, student?.name || r.student_name)}>
                <Download className={styles.icon} /> Veriyi indir
              </button>
            )}
            {r.student_id && r.kind === 'erase' && (
              <button type="button" className={styles.danger} disabled={busy === r.id} onClick={() => handleErase(r)}>
                <Trash2 className={styles.icon} /> Kalıcı sil
              </button>
            )}
            {r.kind !== 'erase' && (
              <button type="button" className={styles.primary} disabled={busy === r.id} onClick={() => handleResolve(r, 'done')}>
                <Check className={styles.icon} /> Tamamlandı
              </button>
            )}
            <button type="button" className={styles.button} disabled={busy === r.id} onClick={() => handleResolve(r, 'rejected')}>
              <X className={styles.icon} /> Reddet
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={styles.stack}>
      {/* =========================================================================
          BÖLÜM 1: VELİ TALEPLERİ
         ========================================================================= */}
      <section className={styles.section} aria-labelledby="kvkk-requests-title">
        <div className={styles.between}>
          <h2 id="kvkk-requests-title" className={styles.sectionTitle}>
            Veli talepleri ({requests.filter((r) => r.status === 'open').length} açık)
          </h2>
          <button type="button" className={formOpen ? styles.button : styles.primary} aria-expanded={formOpen} onClick={() => { setFormOpen((v) => !v); if (formOpen) resetForm(); }}>
            {formOpen ? <><X className={styles.icon} /> Kapat</> : <><Plus className={styles.icon} /> Yeni talep</>}
          </button>
        </div>
        <p className={styles.muted}>
          Veli, çocuğunun verilerinin bir kopyasını, düzeltilmesini veya silinmesini isteyebilir (KVKK md. 11).
          Dilekçe, e-posta ya da yüz yüze gelen talebi buraya kaydedin; en geç <strong>30 gün</strong> içinde yanıtlayın.
          Verilerin nasıl işlendiği <Link href="/aydinlatma">aydınlatma metninde</Link> anlatılıyor.
        </p>

        {formOpen && (
          <form onSubmit={handleCreate} className={styles.studentForm}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.fieldLabel}>Öğrenci</span>
              {picked ? (
                <div className={styles.between}>
                  <span className={styles.name}>{picked.name} · No {picked.student_number} · {picked.class_name || 'Sınıfsız'}</span>
                  <button type="button" className={styles.button} onClick={() => setPicked(null)}>Değiştir</button>
                </div>
              ) : (
                <>
                  <SearchInput id="kvkk-student" value={studentQuery} onChange={setStudentQuery} placeholder="Öğrenci adı veya okul numarası" />
                  {matches.length > 0 && (
                    <div className={styles.actions}>
                      {matches.map((s) => (
                        <button key={s.id} type="button" className={styles.button} onClick={() => setPicked(s)}>
                          {s.name} ({s.class_name || 'sınıfsız'})
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Talep</span>
              <CustomSelect
                value={kind}
                onChange={(v) => setKind(v as DataRequestKind)}
                options={(Object.keys(REQUEST_KIND_LABEL) as DataRequestKind[]).map((k) => ({ value: k, label: REQUEST_KIND_LABEL[k] }))}
                placeholder="Talep türü"
              />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Talep eden veli</span>
              <input className={styles.input} value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Ad Soyad" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>İletişim (isteğe bağlı)</span>
              <input className={styles.input} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telefon veya e-posta" />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.fieldLabel}>Not (isteğe bağlı)</span>
              <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. Dilekçe 12.11.2026 tarihinde teslim alındı" />
            </label>
            <button type="submit" className={styles.primary} disabled={busy === 'new'}>
              <Plus className={styles.icon} /> {busy === 'new' ? 'Kaydediliyor…' : 'Talebi kaydet'}
            </button>
          </form>
        )}

        {/* Talep Filtreleri */}
        <div style={{ marginTop: '16px' }}>
          <FilterBar>
            <SearchInput
              id="request-search"
              value={requestQuery}
              onChange={(v) => { setRequestQuery(v); setRequestPage(1); }}
              placeholder="Öğrenci, veli veya not ara..."
            />
            <div className={styles.filterSelect}>
              <CustomSelect
                value={requestStatusFilter}
                onChange={(v) => { setRequestStatusFilter(v as 'all' | 'open' | 'closed'); setRequestPage(1); }}
                options={[
                  { value: 'open', label: 'Yalnızca Açık Talepler' },
                  { value: 'closed', label: 'Kapanan Talepler' },
                  { value: 'all', label: 'Tüm Talepler' },
                ]}
                placeholder="Durum"
              />
            </div>
            <div className={styles.filterSelect}>
              <CustomSelect
                value={requestKindFilter}
                onChange={(v) => { setRequestKindFilter(v); setRequestPage(1); }}
                options={[
                  { value: '', label: 'Tüm talep türleri' },
                  ...(Object.keys(REQUEST_KIND_LABEL) as DataRequestKind[]).map((k) => ({ value: k, label: REQUEST_KIND_LABEL[k] })),
                ]}
                placeholder="Talep türü"
              />
            </div>
            {(requestQuery || requestStatusFilter !== 'open' || requestKindFilter) && (
              <button
                type="button"
                className={styles.clearFilterButton}
                onClick={() => {
                  setRequestQuery('');
                  setRequestStatusFilter('open');
                  setRequestKindFilter('');
                  setRequestPage(1);
                }}
              >
                <X size={15} /> Temizle
              </button>
            )}
          </FilterBar>
        </div>

        {loading && <EmptyState>Yükleniyor…</EmptyState>}
        {!loading && reqError && <EmptyState>Talepler alınamadı: {reqError}</EmptyState>}
        {!loading && !reqError && filteredRequests.length === 0 && (
          <EmptyState>Aramanıza uyan veli talebi bulunamadı.</EmptyState>
        )}

        {filteredRequests.length > 0 && (
          <>
            <ul className={styles.list}>{paginatedRequests.map(requestRow)}</ul>

            {filteredRequests.length > requestPageSize && (
              <nav className={styles.pagination} aria-label="Veli talepleri sayfalama">
                <div className={styles.paginationInfo}>
                  Toplam <strong>{filteredRequests.length}</strong> talepten <strong>{reqStartIndex + 1}–{reqEndIndex}</strong> arası gösteriliyor
                </div>
                <div className={styles.paginationControls}>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={reqCurrentPage <= 1}
                    onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                  >
                    Önceki
                  </button>
                  {getPageNumbers(reqCurrentPage, reqTotalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`req-dots-${idx}`} className={styles.pageDots}>…</span>
                    ) : (
                      <button
                        key={`req-p-${p}`}
                        type="button"
                        className={`${styles.pageButton} ${p === reqCurrentPage ? styles.pageButtonActive : ''}`}
                        onClick={() => setRequestPage(Number(p))}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={reqCurrentPage >= reqTotalPages}
                    onClick={() => setRequestPage((p) => Math.min(reqTotalPages, p + 1))}
                  >
                    Sonraki
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      {/* =========================================================================
          BÖLÜM 2: VELİ AÇIK RIZASI (OKUL / SINIF / DURUM FİLTRELERİ İLE)
         ========================================================================= */}
      <section className={styles.section} aria-labelledby="kvkk-consent-title">
        <h2 id="kvkk-consent-title" className={styles.sectionTitle}>
          Veli açık rızası {consents.length > 0 && `(${consents.length - totalMissing} / ${consents.length} alındı)`}
        </h2>
        <p className={styles.muted}>
          Öğrencinin platformu kullanması için velinin <Link href="/aydinlatma">aydınlatma metnini</Link> okuyup onay vermesi gerekir.
          İmzalı onay formunu teslim aldığınızda burada işaretleyin; tarih ve işaretleyen kişi kaydedilir.
        </p>

        {/* Çoklu Filtre Çubuğu */}
        <FilterBar>
          <SearchInput
            id="consent-search"
            value={consentQuery}
            onChange={(v) => { setConsentQuery(v); setConsentPage(1); }}
            placeholder="Ad, okul numarası veya sınıf ara"
          />

          {approvedSchools.length > 1 && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={schoolFilter}
                onChange={(v) => { setSchoolFilter(v); setClassFilter(''); setConsentPage(1); }}
                options={[{ value: '', label: 'Tüm Okullar' }, ...approvedSchools.map((s) => ({ value: s.id, label: s.name }))]}
                placeholder="Okul"
              />
            </div>
          )}

          {availableClasses.length > 0 && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={classFilter}
                onChange={(v) => { setClassFilter(v); setConsentPage(1); }}
                options={[{ value: '', label: 'Tüm Sınıflar' }, ...availableClasses.map((c) => ({ value: c, label: c }))]}
                placeholder="Sınıf"
              />
            </div>
          )}

          <div className={styles.filterSelect}>
            <CustomSelect
              value={consentStatusFilter}
              onChange={(v) => { setConsentStatusFilter(v as 'missing' | 'given' | 'all'); setConsentPage(1); }}
              options={[
                { value: 'missing', label: `Rızası eksik (${totalMissing})` },
                { value: 'given', label: 'Rızası alınanlar' },
                { value: 'all', label: 'Tüm öğrenciler' },
              ]}
              placeholder="Rıza durumu"
            />
          </div>

          {hasConsentFilters && (
            <button
              type="button"
              className={styles.clearFilterButton}
              onClick={() => {
                setConsentQuery('');
                setSchoolFilter('');
                setClassFilter('');
                setConsentStatusFilter('missing');
                setConsentPage(1);
              }}
            >
              <X size={15} /> Temizle
            </button>
          )}
        </FilterBar>

        {consentError && <EmptyState>Rıza bilgisi alınamadı: {consentError}</EmptyState>}
        {!consentError && !loading && filteredConsents.length === 0 && (
          <EmptyState>
            {consentStatusFilter === 'missing' && consents.length > 0
              ? 'Filtrelere uyan rızası eksik öğrenci bulunmuyor (Tüm veli rızaları tamam).'
              : 'Aramanıza uyan öğrenci bulunamadı.'}
          </EmptyState>
        )}

        {filteredConsents.length > 0 && (
          <>
            <ul className={styles.list}>
              {paginatedConsents.map((c) => (
                <li key={c.id} className={styles.row}>
                  <div className={styles.details}>
                    <span className={styles.name}>{c.name}</span>
                    <span className={styles.muted}>
                      No {c.student_number} • {c.class_name || 'Sınıfsız'} •{' '}
                      {c.guardian_consent_at ? (
                        <strong style={{ color: '#25634b' }}>Rıza {formatDate(c.guardian_consent_at)} tarihinde alındı</strong>
                      ) : (
                        <span style={{ color: '#943747' }}>Rıza alınmadı</span>
                      )}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    {c.guardian_consent_at ? (
                      <button type="button" className={styles.button} disabled={busy === `consent-${c.id}`} onClick={() => handleConsent(c, false)}>
                        Rızayı geri çek
                      </button>
                    ) : (
                      <button type="button" className={styles.primary} disabled={busy === `consent-${c.id}`} onClick={() => handleConsent(c, true)}>
                        <Check className={styles.icon} /> Rıza alındı
                      </button>
                    )}
                    <button type="button" className={styles.button} disabled={busy === `export-${c.id}`} onClick={() => handleExport(c.id, c.name)} aria-label={`${c.name} verisini indir`}>
                      <Download className={styles.icon} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Veli Rızası Sayfalama */}
            {filteredConsents.length > consentPageSize && (
              <nav className={styles.pagination} aria-label="Veli rızası sayfalama">
                <div className={styles.paginationInfo}>
                  Toplam <strong>{filteredConsents.length}</strong> öğrenciden <strong>{consentStartIndex + 1}–{consentEndIndex}</strong> arası gösteriliyor
                </div>
                <div className={styles.paginationControls}>
                  <div className={styles.pageSizeSelector}>
                    <label htmlFor="consent-page-size-select">Sayfa başı:</label>
                    <CustomSelect
                      id="consent-page-size-select"
                      className={styles.pageSizeSelect}
                      value={String(consentPageSize)}
                      onChange={(value) => { setConsentPageSize(Number(value)); setConsentPage(1); }}
                      options={[{ value: '15', label: '15' }, { value: '20', label: '20' }, { value: '50', label: '50' }]}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={consentCurrentPage <= 1}
                    onClick={() => setConsentPage((p) => Math.max(1, p - 1))}
                  >
                    Önceki
                  </button>

                  {getPageNumbers(consentCurrentPage, consentTotalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`consent-dots-${idx}`} className={styles.pageDots}>…</span>
                    ) : (
                      <button
                        key={`consent-p-${p}`}
                        type="button"
                        className={`${styles.pageButton} ${p === consentCurrentPage ? styles.pageButtonActive : ''}`}
                        onClick={() => setConsentPage(Number(p))}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={consentCurrentPage >= consentTotalPages}
                    onClick={() => setConsentPage((p) => Math.min(consentTotalPages, p + 1))}
                  >
                    Sonraki
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
