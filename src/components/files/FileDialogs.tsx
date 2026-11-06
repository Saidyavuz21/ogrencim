'use client';

import React, { useId, useState } from 'react';
import { Trash2, Upload } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { formatBytes } from '../../lib/teacherData';
import {
  FileMeta, FolderRow, GRADE_OPTIONS, removeShare, ShareRow, shareWithClasses, TeacherFileRow, updateFile, uploadTeacherFiles,
} from '../../lib/filesData';
import { subjectsForClass } from '../../data/subjects';
import { Modal, TagInput } from './FilesUi';
import styles from './Files.module.css';

const NONE = '';
/** Branş seçenekleri: bütün kademelerin dersleri */
export const SUBJECT_OPTIONS = subjectsForClass('');

/** Klasör, kademe, branş, konu ve etiket alanları (yükleme ve düzenleme ortak) */
function MetaFields({ folders, folderId, setFolderId, meta, setMeta, tagSuggestions }: {
  folders: FolderRow[];
  folderId: string;
  setFolderId: (v: string) => void;
  meta: Required<FileMeta>;
  setMeta: (m: Required<FileMeta>) => void;
  tagSuggestions: string[];
}) {
  const ids = { folder: useId(), grade: useId(), subject: useId(), topic: useId(), tags: useId() };
  return (
    <>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <span id={ids.folder}>Klasör</span>
          <CustomSelect
            value={folderId}
            onChange={setFolderId}
            options={[{ value: NONE, label: 'Klasörsüz' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
          />
        </div>
        <div className={styles.field}>
          <span id={ids.grade}>Kademe</span>
          <CustomSelect
            value={meta.grade || NONE}
            onChange={(v) => setMeta({ ...meta, grade: v || null })}
            options={[{ value: NONE, label: 'Seçilmedi' }, ...GRADE_OPTIONS]}
          />
        </div>
        <div className={styles.field}>
          <span id={ids.subject}>Branş</span>
          <CustomSelect
            value={meta.subject || NONE}
            onChange={(v) => setMeta({ ...meta, subject: v || null })}
            options={[{ value: NONE, label: 'Seçilmedi' }, ...SUBJECT_OPTIONS]}
          />
        </div>
        <label className={styles.field}>
          Konu
          <input id={ids.topic} value={meta.topic || ''} maxLength={120} onChange={(e) => setMeta({ ...meta, topic: e.target.value })} placeholder="Örn. Kesirler" />
        </label>
      </div>
      <div className={styles.field}>
        <label htmlFor={ids.tags}>Etiketler <span className={styles.hint}>(isteğe bağlı, en fazla 12)</span></label>
        <TagInput id={ids.tags} value={meta.tags} onChange={(tags) => setMeta({ ...meta, tags })} suggestions={tagSuggestions} />
      </div>
    </>
  );
}

/** Yükleme: seçilen dosyalar + hepsine uygulanacak klasör/etiketler */
export function UploadDialog({ files, folders, defaultFolderId, tagSuggestions, startPosition, onClose, onDone }: {
  files: File[];
  folders: FolderRow[];
  defaultFolderId: string | null;
  tagSuggestions: string[];
  startPosition: number;
  onClose: () => void;
  onDone: (uploaded: TeacherFileRow[], errors: string[]) => void;
}) {
  const [folderId, setFolderId] = useState(defaultFolderId || NONE);
  const [meta, setMeta] = useState<Required<FileMeta>>({ grade: null, subject: null, topic: '', tags: [] });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const total = files.reduce((a, f) => a + f.size, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await uploadTeacherFiles(files, folderId || null, meta, startPosition, (done, all) => setProgress(done < all ? `Yükleniyor: ${done + 1}/${all}` : 'Tamamlanıyor…'));
    setBusy(false);
    onDone(res.uploaded, res.errors);
  };

  return (
    <Modal title={`${files.length} dosya yükle`} kicker={`Toplam ${formatBytes(total)}`} onClose={onClose} busy={busy}>
      <form className={styles.form} onSubmit={submit}>
        <ul className={styles.fileChips} aria-label="Seçilen dosyalar">
          {files.map((f) => (
            <li key={f.name + f.size}><span title={f.name}>{f.name}</span><small>{formatBytes(f.size)}</small></li>
          ))}
        </ul>
        <MetaFields folders={folders} folderId={folderId} setFolderId={setFolderId} meta={meta} setMeta={setMeta} tagSuggestions={tagSuggestions} />
        {progress && <p className={styles.progress} role="status">{progress}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="submit" className={styles.primaryButton} disabled={busy} data-autofocus>
            <Upload size={18} aria-hidden="true" />{busy ? 'Yükleniyor…' : 'Yükle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Dosya bilgilerini düzenle: ad, klasör, kademe, branş, konu, etiketler */
export function EditFileDialog({ file, folders, tagSuggestions, onClose, onSaved }: {
  file: TeacherFileRow;
  folders: FolderRow[];
  tagSuggestions: string[];
  onClose: () => void;
  onSaved: (row: TeacherFileRow) => void;
}) {
  const nameId = useId();
  const [name, setName] = useState(file.name);
  const [folderId, setFolderId] = useState(file.folder_id || NONE);
  const [meta, setMeta] = useState<Required<FileMeta>>({ grade: file.grade, subject: file.subject, topic: file.topic || '', tags: file.tags || [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateFile(file.id, { name, folder_id: folderId || null, grade: meta.grade, subject: meta.subject, topic: meta.topic, tags: meta.tags });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onSaved(res.data);
  };

  return (
    <Modal title="Dosya bilgileri" kicker={formatBytes(file.size)} onClose={onClose} busy={busy}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field} htmlFor={nameId}>
          Dosya adı
          <input id={nameId} value={name} maxLength={160} onChange={(e) => setName(e.target.value)} required data-autofocus />
        </label>
        <MetaFields folders={folders} folderId={folderId} setFolderId={setFolderId} meta={meta} setMeta={setMeta} tagSuggestions={tagSuggestions} />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Sınıfla paylaş: dosya ya da set; mevcut paylaşımlar listelenir ve kaldırılabilir */
export function ShareDialog({ title, target, classNames, shares, onClose, onChanged }: {
  title: string;
  target: { fileId?: string; setId?: string };
  classNames: string[];
  /** Bu içeriğin mevcut paylaşımları */
  shares: ShareRow[];
  onClose: () => void;
  onChanged: (next: { added: ShareRow[]; removedId?: string }) => void;
}) {
  const noteId = useId();
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharedClasses = new Set(shares.map((s) => s.class_name));
  const available = classNames.filter((c) => !sharedClasses.has(c));

  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await shareWithClasses(target, picked, note);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setPicked([]);
    setNote('');
    onChanged({ added: res.data });
  };

  const unshare = async (s: ShareRow) => {
    setBusy(true);
    setError(null);
    const res = await removeShare(s.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onChanged({ added: [], removedId: s.id });
  };

  return (
    <Modal title={title} kicker="Sınıfla paylaş" onClose={onClose} busy={busy}>
      {classNames.length === 0 ? (
        <p className={styles.muted}>Paylaşmak için önce Sınıflarım sayfasından ders verdiğiniz sınıfları ekleyin.</p>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 6 }}>Sınıflar</legend>
            {available.length === 0 ? (
              <p className={styles.muted}>Bütün sınıflarınızla paylaşılmış.</p>
            ) : (
              <div className={styles.classChips}>
                {available.map((c) => (
                  <button key={c} type="button" className={styles.classChip} aria-pressed={picked.includes(c)} onClick={() => toggle(c)}>{c}</button>
                ))}
              </div>
            )}
          </fieldset>
          <label className={styles.field} htmlFor={noteId}>
            Öğrencilere not <span className={styles.hint}>(isteğe bağlı)</span>
            <textarea id={noteId} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Örn. Sınavdan önce tekrar edin." />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Kapat</button>
            <button type="submit" className={styles.primaryButton} disabled={busy || picked.length === 0}>
              {busy ? 'Paylaşılıyor…' : picked.length > 1 ? `${picked.length} sınıfla paylaş` : 'Paylaş'}
            </button>
          </div>
        </form>
      )}
      {shares.length > 0 && (
        <div className={styles.form}>
          <h3 className={styles.cardTitle}>Paylaşılan sınıflar</h3>
          <ul className={styles.shareList}>
            {shares.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>{s.class_name}</strong>
                  <span>{new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}{s.note ? ` · ${s.note}` : ''}</span>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => unshare(s)} disabled={busy} aria-label={`${s.class_name} paylaşımını kaldır`} title="Paylaşımı kaldır">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
