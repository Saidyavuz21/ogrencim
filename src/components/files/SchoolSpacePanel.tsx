'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Search, Trash2, Users } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { formatBytes } from '../../lib/teacherData';
import { FILES_BUCKET, fileKind, KIND_LABEL, TeacherFileRow } from '../../lib/filesData';
import { copyStaffFileToMine, listStaffShares, removeStaffShare, shareToSchool, StaffScope, StaffShareRow } from '../../lib/schoolData';
import { SUBJECT_OPTIONS } from './FileDialogs';
import { DownloadButton, FilePreview, KindIcon, Modal, normalize } from './FilesUi';
import styles from './Files.module.css';

const ALL = '__all__';
const SCHOOL = '__okul__';
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Okul alanı: okul şablonları ve zümre klasörleri (okuldaki bütün öğretmenler görür) */
export function SchoolSpacePanel({ userId, isSchoolAdmin, onCopied }: { userId?: string; isSchoolAdmin?: boolean; onCopied: () => void }) {
  const { confirm } = useDialog();
  const [rows, setRows] = useState<StaffShareRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [view, setView] = useState(ALL);
  const [q, setQ] = useState('');
  const [previewing, setPreviewing] = useState<StaffShareRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listStaffShares().then((res) => {
      if (!alive) return;
      if (res.ok) setRows(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const subjects = useMemo(() => Array.from(new Set((rows || []).filter((r) => r.scope === 'zumre').map((r) => r.subject!))).sort((a, b) => a.localeCompare(b, 'tr')), [rows]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return (rows || []).filter((r) => (view === ALL || (view === SCHOOL ? r.scope === 'okul' : r.scope === 'zumre' && r.subject === view))
      && (!n || normalize([r.file!.name, r.file!.topic || '', r.file!.subject || '', r.shared_by_name, r.subject || '', ...(r.file!.tags || [])].join(' ')).includes(n)));
  }, [rows, view, q]);

  const copy = async (r: StaffShareRow) => {
    setBusy(r.id);
    const res = await copyStaffFileToMine(r.file!);
    setBusy(null);
    if (!res.ok) { setNotice({ kind: 'error', text: `Kopyalanamadı: ${res.error}` }); return; }
    setNotice({ kind: 'ok', text: `"${r.file!.name}" Dosyalarım'a kopyalandı.` });
    onCopied();
  };
  const remove = async (r: StaffShareRow) => {
    const ok = await confirm({ title: 'Okul alanından kaldır', message: `"${r.file!.name}" okul alanından kaldırılsın mı?\nDosya sahibinin Dosyalarım'ında kalır.`, confirmText: 'Kaldır', cancelText: 'Vazgeç', variant: 'warning' });
    if (!ok) return;
    const res = await removeStaffShare(r.id);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setRows((prev) => (prev || []).filter((x) => x.id !== r.id));
  };

  if (error) return <p className={styles.error} role="alert">Okul alanı alınamadı: {error}</p>;
  if (!rows) return <Spinner center label="Okul alanı yükleniyor…" />;

  return (
    <section className={styles.page} aria-label="Okul alanı">
      <p className={styles.muted}>Okulunuzdaki öğretmenlerin paylaştığı ortak dosyalar: okul şablonları (dilekçe, plan, form) ve zümre klasörleri. Kendi dosyanızı eklemek için Dosyalarım’da dosyanın menüsünden “Okul alanında paylaş”ı seçin.</p>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {rows.length === 0 ? (
        <div className={styles.empty}>
          <Users size={32} aria-hidden="true" />
          <h3>Okul alanı henüz boş</h3>
          <p>Zümre arkadaşlarınızla paylaşmak istediğiniz yıllık planları, ortak sınavları ve şablonları buraya ekleyin.</p>
        </div>
      ) : (
        <>
          <div className={styles.folderBar} role="group" aria-label="Klasörler">
            <button type="button" className={styles.folderChip} aria-pressed={view === ALL} onClick={() => setView(ALL)}>Tümü <small>{rows.length}</small></button>
            <button type="button" className={styles.folderChip} aria-pressed={view === SCHOOL} onClick={() => setView(SCHOOL)}>Okul şablonları <small>{rows.filter((r) => r.scope === 'okul').length}</small></button>
            {subjects.map((s) => (
              <button key={s} type="button" className={styles.folderChip} aria-pressed={view === s} onClick={() => setView(s)}>{s} zümresi <small>{rows.filter((r) => r.scope === 'zumre' && r.subject === s).length}</small></button>
            ))}
          </div>
          <label className={styles.search}>
            <span className={styles.srOnly}>Okul alanında ara</span>
            <Search size={18} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dosya, konu ya da öğretmen ara" />
          </label>
          {visible.length === 0 ? <p className={styles.muted}>Aramaya uyan dosya yok.</p> : (
            <ul className={styles.list}>
              {visible.map((r) => {
                const mine = r.shared_by === userId;
                return (
                  <li key={r.id} className={styles.row}>
                    <KindIcon mime={r.file!.mime} />
                    <div className={styles.info}>
                      <p className={styles.name}><button type="button" className={styles.nameButton} onClick={() => setPreviewing(r)} title={r.file!.name}>{r.file!.name}</button></p>
                      <div className={styles.meta}>
                        <span>{KIND_LABEL[fileKind(r.file!.mime)]} · {formatBytes(r.file!.size)}</span>
                        <span className={styles.dot}>{r.scope === 'okul' ? 'Okul şablonu' : `${r.subject} zümresi`}</span>
                        <span className={styles.dot}>{mine ? 'Siz' : r.shared_by_name} · {dateLabel(r.created_at)}</span>
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.iconButton} onClick={() => setPreviewing(r)} aria-label={`${r.file!.name} önizle`} title="Önizle"><Eye size={18} aria-hidden="true" /></button>
                      <DownloadButton bucket={FILES_BUCKET} path={r.file!.path} name={r.file!.name} compact />
                      {!mine && (
                        <button type="button" className={styles.iconButton} onClick={() => copy(r)} disabled={busy === r.id} aria-label={`${r.file!.name} Dosyalarım'a kopyala`} title="Dosyalarım'a kopyala"><Copy size={18} aria-hidden="true" /></button>
                      )}
                      {(mine || isSchoolAdmin) && (
                        <button type="button" className={styles.iconButton} onClick={() => remove(r)} aria-label={`${r.file!.name} okul alanından kaldır`} title="Okul alanından kaldır"><Trash2 size={18} aria-hidden="true" /></button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {previewing && <FilePreview bucket={FILES_BUCKET} path={previewing.file!.path} name={previewing.file!.name} mime={previewing.file!.mime} onClose={() => setPreviewing(null)} />}
    </section>
  );
}

/** Dosyayı okul alanına ekle: okul şablonu ya da zümre klasörü */
export function ShareToSchoolDialog({ file, defaultSubject, onClose, onShared }: { file: TeacherFileRow; defaultSubject?: string; onClose: () => void; onShared: (text: string) => void }) {
  const [scope, setScope] = useState<StaffScope>('zumre');
  const [subject, setSubject] = useState(file.subject || (defaultSubject && SUBJECT_OPTIONS.includes(defaultSubject) ? defaultSubject : '') || SUBJECT_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await shareToSchool(file.id, scope, scope === 'zumre' ? subject : null);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onShared(scope === 'okul' ? `"${file.name}" okul şablonlarına eklendi.` : `"${file.name}" ${subject} zümresiyle paylaşıldı.`);
  };
  return (
    <Modal title={file.name} kicker="Okul alanında paylaş" onClose={onClose} busy={busy}>
      <div className={styles.classChips} role="group" aria-label="Nereye">
        <button type="button" className={styles.classChip} aria-pressed={scope === 'zumre'} onClick={() => setScope('zumre')}>Zümre klasörü</button>
        <button type="button" className={styles.classChip} aria-pressed={scope === 'okul'} onClick={() => setScope('okul')}>Okul şablonları</button>
      </div>
      {scope === 'zumre' ? (
        <div className={styles.field}>
          <span>Zümre</span>
          <CustomSelect value={subject} onChange={setSubject} options={SUBJECT_OPTIONS} />
        </div>
      ) : (
        <p className={styles.muted}>Okuldaki bütün öğretmenler görür (dilekçe, plan, form gibi ortak belgeler için).</p>
      )}
      <p className={styles.muted}>Dosya sizin Dosyalarım’ınızda kalır; diğer öğretmenler önizler, indirir ve kendi Dosyalarım’ına kopyalayabilir. Öğrenciler görmez.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className={styles.primaryButton} onClick={submit} disabled={busy}>{busy ? 'Paylaşılıyor…' : 'Paylaş'}</button>
      </div>
    </Modal>
  );
}
