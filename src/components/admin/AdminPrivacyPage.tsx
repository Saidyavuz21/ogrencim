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

/**
 * KVKK: veli talepleri (verinin kopyası, silinmesi, düzeltilmesi) ve veli açık rızası.
 * Talepler 30 gün içinde yanıtlanmalıdır (KVKK md. 13).
 */
export function AdminPrivacyPage({ data, notify }: Props) {
  const { confirm } = useDialog();
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [reqError, setReqError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // Talebin kaçıncı günde olduğu: liste yüklendiği andaki saate göre (render saf kalsın)
  const [loadedAt, setLoadedAt] = useState(0);

  // Yeni talep
  const [formOpen, setFormOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [picked, setPicked] = useState<AdminStudentRecord | null>(null);
  const [kind, setKind] = useState<DataRequestKind>('export');
  const [requester, setRequester] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');

  // Rıza
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [consentQuery, setConsentQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(true);

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

  const open = requests.filter((r) => r.status === 'open');
  const closed = requests.filter((r) => r.status !== 'open');
  const missing = consents.filter((c) => !c.guardian_consent_at).length;
  const consentRows = consents.filter((c) =>
    (!onlyMissing || !c.guardian_consent_at) && matchesQuery(consentQuery, c.name, c.student_number, c.class_name));

  const daysOld = (iso: string) => Math.max(0, Math.floor((loadedAt - new Date(iso).getTime()) / 86_400_000));

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
      <section className={styles.section} aria-labelledby="kvkk-requests-title">
        <div className={styles.between}>
          <h2 id="kvkk-requests-title" className={styles.sectionTitle}>Veli talepleri ({open.length} açık)</h2>
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

        {loading && <EmptyState>Yükleniyor…</EmptyState>}
        {!loading && reqError && <EmptyState>Talepler alınamadı: {reqError}</EmptyState>}
        {!loading && !reqError && requests.length === 0 && <EmptyState>Kayıtlı talep yok.</EmptyState>}
        {open.length > 0 && <ul className={styles.list}>{open.map(requestRow)}</ul>}
        {closed.length > 0 && (
          <details>
            <summary className={styles.muted}>Kapanan talepler ({closed.length})</summary>
            <ul className={styles.list}>{closed.map(requestRow)}</ul>
          </details>
        )}
      </section>

      <section className={styles.section} aria-labelledby="kvkk-consent-title">
        <h2 id="kvkk-consent-title" className={styles.sectionTitle}>
          Veli açık rızası {consents.length > 0 && `(${consents.length - missing} / ${consents.length} alındı)`}
        </h2>
        <p className={styles.muted}>
          Öğrencinin platformu kullanması için velinin <Link href="/aydinlatma">aydınlatma metnini</Link> okuyup onay vermesi gerekir.
          İmzalı onay formunu teslim aldığınızda burada işaretleyin; tarih ve işaretleyen kişi kaydedilir.
        </p>
        <FilterBar>
          <SearchInput id="consent-search" value={consentQuery} onChange={setConsentQuery} placeholder="Ad, okul numarası veya sınıf ara" />
          <div className={styles.segmented} role="group" aria-label="Gösterilecek öğrenciler">
            <button type="button" aria-pressed={onlyMissing} onClick={() => setOnlyMissing(true)}>Rızası eksik ({missing})</button>
            <button type="button" aria-pressed={!onlyMissing} onClick={() => setOnlyMissing(false)}>Hepsi</button>
          </div>
        </FilterBar>
        {consentError && <EmptyState>Rıza bilgisi alınamadı: {consentError}</EmptyState>}
        {!consentError && !loading && consentRows.length === 0 && (
          <EmptyState>{onlyMissing && consents.length > 0 ? 'Bütün öğrencilerin veli rızası alınmış.' : 'Öğrenci yok.'}</EmptyState>
        )}
        {consentRows.length > 0 && (
          <ul className={styles.list}>
            {consentRows.slice(0, 200).map((c) => (
              <li key={c.id} className={styles.row}>
                <div className={styles.details}>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.muted}>
                    No {c.student_number} • {c.class_name || 'Sınıfsız'} •{' '}
                    {c.guardian_consent_at ? `Rıza ${formatDate(c.guardian_consent_at)} tarihinde alındı` : 'Rıza alınmadı'}
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
        )}
        {consentRows.length > 200 && <p className={styles.muted}>İlk 200 öğrenci gösteriliyor; aramayla daraltın.</p>}
      </section>
    </div>
  );
}
