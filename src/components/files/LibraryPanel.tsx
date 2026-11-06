'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Edit, Eye, Library, Search, Trash2, Upload } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { formatBytes } from '../../lib/teacherData';
import {
  deleteLibraryItem, fileKind, KIND_LABEL, LIBRARY_BUCKET, libraryFileName, LibraryItemRow, listLibrary, TEACHER_FILE_ACCEPT, updateLibraryItem, uploadLibraryItems,
} from '../../lib/filesData';
import { DownloadButton, FilePreview, KindIcon, Modal, normalize, TagInput } from './FilesUi';
import styles from './Files.module.css';

const ANY = '';
/** Önerilen kategoriler (yönetici yenisini de yazabilir) */
const CATEGORY_HINTS = ['Haritalar', 'Görseller', 'Afişler', 'Çalışma kâğıtları', 'Sunumlar', 'Belirli gün ve haftalar'];

/**
 * Ortak eğitim medya kütüphanesi: bütün öğretmenler görür, önizler, indirir ve ödeve ekler (kotaya sayılmaz).
 * manage: yönetici yükler, düzenler, siler.
 */
export function LibraryPanel({ manage = false }: { manage?: boolean }) {
  const { confirm } = useDialog();
  const [items, setItems] = useState<LibraryItemRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(ANY);
  const [previewing, setPreviewing] = useState<LibraryItemRow | null>(null);
  const [editing, setEditing] = useState<LibraryItemRow | null>(null);

  useEffect(() => {
    let alive = true;
    listLibrary().then((res) => {
      if (!alive) return;
      if (res.ok) setItems(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => Array.from(new Set((items || []).map((i) => i.category).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, 'tr')), [items]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return (items || []).filter((i) => (!category || i.category === category)
      && (!n || n.split(/\s+/).every((w) => normalize([i.title, i.category || '', ...i.tags].join(' ')).includes(w))));
  }, [items, q, category]);

  const remove = async (item: LibraryItemRow) => {
    const ok = await confirm({ title: 'Kütüphaneden sil', message: `"${item.title}" kütüphaneden kaldırılsın mı?\nÖdevlere eklenmiş kopyalar etkilenmez.`, confirmText: 'Sil', cancelText: 'Vazgeç', variant: 'danger' });
    if (!ok) return;
    const res = await deleteLibraryItem(item);
    if (!res.ok) { setNotice({ kind: 'error', text: `Silinemedi: ${res.error}` }); return; }
    setItems((prev) => (prev || []).filter((x) => x.id !== item.id));
    setNotice({ kind: 'ok', text: `"${item.title}" silindi.` });
  };

  if (error) return <p className={styles.error} role="alert">Kütüphane alınamadı: {error}</p>;
  if (!items) return <Spinner center label="Kütüphane yükleniyor…" />;

  return (
    <section className={styles.page} aria-label="Ortak kütüphane">
      {!manage && <p className={styles.muted}>Bütün öğretmenler için hazırlanmış görseller ve belgeler. Depolama alanınızdan yer kaplamaz; ödev gönderirken “Dosyalarımdan ekle” ile ödeve ekleyebilirsiniz.</p>}
      {manage && <LibraryUpload categories={Array.from(new Set([...CATEGORY_HINTS, ...categories]))} onUploaded={(rows, errors) => {
        if (rows.length) setItems((prev) => [...rows, ...(prev || [])]);
        setNotice(errors.length ? { kind: 'error', text: `${rows.length ? `${rows.length} dosya eklendi. ` : ''}Eklenemeyen: ${errors.join(' ')}` } : { kind: 'ok', text: `${rows.length} dosya kütüphaneye eklendi.` });
      }} />}
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Library size={32} aria-hidden="true" />
          <h3>Kütüphane henüz boş</h3>
          <p>{manage ? 'Bütün öğretmenlerin kullanacağı haritaları, görselleri ve hazır belgeleri yukarıdan yükleyin.' : 'Yönetici hazır görseller ve belgeler ekledikçe burada görünecek.'}</p>
        </div>
      ) : (
        <>
          <div className={styles.filters} style={{ gridTemplateColumns: 'minmax(200px, 2fr) minmax(160px, 1fr)' }}>
            <label className={styles.search}>
              <span className={styles.srOnly}>Kütüphanede ara</span>
              <Search size={18} aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, kategori ya da etiketle ara" />
            </label>
            <CustomSelect value={category} onChange={setCategory} options={[{ value: ANY, label: 'Bütün kategoriler' }, ...categories]} disabled={!categories.length} />
          </div>
          {visible.length === 0 ? <p className={styles.muted}>Aramaya uyan dosya yok.</p> : (
            <ul className={styles.list} aria-label="Kütüphane dosyaları">
              {visible.map((i) => (
                <li key={i.id} className={styles.row}>
                  <KindIcon mime={i.mime} />
                  <div className={styles.info}>
                    <p className={styles.name}><button type="button" className={styles.nameButton} onClick={() => setPreviewing(i)} title={i.title}>{i.title}</button></p>
                    <div className={styles.meta}>
                      <span>{KIND_LABEL[fileKind(i.mime)]} · {formatBytes(i.size)}</span>
                      {i.category && <span className={styles.dot}>{i.category}</span>}
                      {i.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.iconButton} onClick={() => setPreviewing(i)} aria-label={`${i.title} önizle`} title="Önizle"><Eye size={18} aria-hidden="true" /></button>
                    <DownloadButton bucket={LIBRARY_BUCKET} path={i.path} name={libraryFileName(i)} compact />
                    {manage && (
                      <>
                        <button type="button" className={styles.iconButton} onClick={() => setEditing(i)} aria-label={`${i.title} düzenle`} title="Düzenle"><Edit size={18} aria-hidden="true" /></button>
                        <button type="button" className={styles.iconButton} onClick={() => remove(i)} aria-label={`${i.title} sil`} title="Sil"><Trash2 size={18} aria-hidden="true" /></button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {previewing && <FilePreview bucket={LIBRARY_BUCKET} path={previewing.path} name={previewing.title} mime={previewing.mime} onClose={() => setPreviewing(null)} />}
      {editing && (
        <LibraryEditDialog
          item={editing}
          categories={Array.from(new Set([...CATEGORY_HINTS, ...categories]))}
          onClose={() => setEditing(null)}
          onSaved={(row) => { setItems((prev) => (prev || []).map((x) => (x.id === row.id ? row : x))); setEditing(null); }}
        />
      )}
    </section>
  );
}

function LibraryUpload({ categories, onUploaded }: { categories: string[]; onUploaded: (rows: LibraryItemRow[], errors: string[]) => void }) {
  const catId = useId();
  const tagsId = useId();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pick = async (list: FileList | null) => {
    const files = Array.from(list || []);
    if (input.current) input.current.value = '';
    if (!files.length) return;
    setBusy(true);
    const res = await uploadLibraryItems(files, { category, tags });
    setBusy(false);
    onUploaded(res.uploaded, res.errors);
  };
  return (
    <div className={styles.libraryUpload}>
      <div className={styles.grid2}>
        <label className={styles.field} htmlFor={catId}>
          Kategori
          <input id={catId} list={listId} value={category} maxLength={60} onChange={(e) => setCategory(e.target.value)} placeholder="Örn. Haritalar" />
          <datalist id={listId}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div className={styles.field}>
          <label htmlFor={tagsId}>Etiketler</label>
          <TagInput id={tagsId} value={tags} onChange={setTags} />
        </div>
      </div>
      <input ref={input} type="file" multiple accept={TEACHER_FILE_ACCEPT} className={styles.srOnly} tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files)} />
      <div className={styles.modalActions} style={{ justifyContent: 'flex-start' }}>
        <button type="button" className={styles.primaryButton} onClick={() => input.current?.click()} disabled={busy}>
          <Upload size={18} aria-hidden="true" />{busy ? 'Yükleniyor…' : 'Kütüphaneye dosya yükle'}
        </button>
        <span className={styles.muted}>PDF, resim, Word, PowerPoint, Excel · her biri en fazla 25 MB. Dosya adı başlık olur.</span>
      </div>
    </div>
  );
}

function LibraryEditDialog({ item, categories, onClose, onSaved }: { item: LibraryItemRow; categories: string[]; onClose: () => void; onSaved: (row: LibraryItemRow) => void }) {
  const titleId = useId();
  const catId = useId();
  const tagsId = useId();
  const listId = useId();
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState(item.category || '');
  const [tags, setTags] = useState<string[]>(item.tags);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Başlık yazın.'); return; }
    setBusy(true);
    const res = await updateLibraryItem(item.id, { title: title.trim().slice(0, 120), category: category.trim().slice(0, 60) || null, tags });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onSaved(res.data);
  };
  return (
    <Modal title="Kütüphane dosyası" onClose={onClose} busy={busy}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field} htmlFor={titleId}>Başlık<input id={titleId} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} required data-autofocus /></label>
        <label className={styles.field} htmlFor={catId}>
          Kategori
          <input id={catId} list={listId} value={category} maxLength={60} onChange={(e) => setCategory(e.target.value)} />
          <datalist id={listId}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div className={styles.field}><label htmlFor={tagsId}>Etiketler</label><TagInput id={tagsId} value={tags} onChange={setTags} /></div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </form>
    </Modal>
  );
}
