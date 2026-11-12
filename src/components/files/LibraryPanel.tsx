'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Edit, Eye, Library, Search, Trash2, Upload } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { formatBytes } from '../../lib/teacherData';
import {
  deleteLibraryItem, fileKind, KIND_LABEL, LIBRARY_BUCKET, libraryFileName, LibraryItemRow, listLibrary, signedFileUrl, TEACHER_FILE_ACCEPT, updateLibraryItem, uploadLibraryItems,
} from '../../lib/filesData';
import { DownloadButton, FilePreview, KindIcon, Modal, normalize, TagInput } from './FilesUi';
import sharedStyles from './Files.module.css';
import admin from '../admin/AdminDashboard.module.css';
import layout from './LibraryPanel.module.css';
const styles: Record<string, string> = {
 ...sharedStyles,
 page: `${sharedStyles.page} ${admin.libraryPage}`,
 libraryUpload: `${sharedStyles.libraryUpload} ${admin.libraryUpload}`,
 filters: `${sharedStyles.filters} ${admin.libraryFilters}`,
 list: `${sharedStyles.list} ${admin.libraryList}`,
 row: `${sharedStyles.row} ${admin.libraryRow}`,
 nameButton: `${sharedStyles.nameButton} ${admin.libraryName}`,
};

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
  const [view, setView] = useState<'gallery' | 'list'>('gallery');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

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
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const displayed = manage ? visible.slice((currentPage - 1) * pageSize, currentPage * pageSize) : visible;
  const gallery = manage && view === 'gallery';

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
    <section className={`${styles.page} ${manage ? layout.managed : ''}`} aria-label="Ortak kütüphane">
      {!manage && <p className={styles.muted}>Bütün öğretmenler için hazırlanmış görseller ve belgeler. Depolama alanınızdan yer kaplamaz; ödev gönderirken “Dosyalarımdan ekle” ile ödeve ekleyebilirsiniz.</p>}
      <div className={manage ? layout.controls : layout.passThrough}>
      {manage && <LibraryUpload categories={Array.from(new Set([...CATEGORY_HINTS, ...categories]))} onUploaded={(rows, errors) => {
        if (rows.length) setItems((prev) => [...rows, ...(prev || [])]);
        setNotice(errors.length ? { kind: 'error', text: `${rows.length ? `${rows.length} dosya eklendi. ` : ''}Eklenemeyen: ${errors.join(' ')}` } : { kind: 'ok', text: `${rows.length} dosya kütüphaneye eklendi.` });
      }} />}
      {items.length > 0 && <div className={manage ? `${sharedStyles.filters} ${layout.filters}` : styles.filters} style={manage ? undefined : { gridTemplateColumns: 'minmax(200px, 2fr) minmax(160px, 1fr)' }}>
        <label className={styles.search}>
          <span className={styles.srOnly}>Kütüphanede ara</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Ad, kategori ya da etiketle ara" />
        </label>
        <CustomSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[{ value: ANY, label: 'Bütün kategoriler' }, ...categories]} disabled={!categories.length} />
      </div>}
      </div>
      <div className={manage ? layout.results : layout.passThrough}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Library size={32} aria-hidden="true" />
          <h3>Kütüphane henüz boş</h3>
          <p>{manage ? 'Bütün öğretmenlerin kullanacağı haritaları, görselleri ve hazır belgeleri yükleme alanından ekleyin.' : 'Yönetici hazır görseller ve belgeler ekledikçe burada görünecek.'}</p>
        </div>
      ) : (
        <>
          {manage && <div className={layout.toolbar}>
            <p className={styles.muted} role="status">{visible.length} öğe</p>
            <div className={layout.viewSwitch} role="group" aria-label="Görünüm">
              <button type="button" aria-pressed={view === 'gallery'} onClick={() => setView('gallery')}>Galeri</button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</button>
            </div>
          </div>}
          {visible.length === 0 ? <p className={styles.muted}>Aramaya uyan dosya yok.</p> : (
            <ul className={gallery ? layout.gallery : styles.list} aria-label="Kütüphane dosyaları">
              {displayed.map((i) => (
                <li key={i.id} className={gallery ? layout.card : styles.row}>
                  {gallery ? <button type="button" className={layout.preview} onClick={() => setPreviewing(i)} aria-label={`${i.title} görselini önizle`}><LibraryThumbnail item={i} /></button> : <KindIcon mime={i.mime} />}
                  <div className={`${styles.info} ${gallery ? layout.cardInfo : ''}`}>
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
          {manage && visible.length > 0 && <nav className={layout.pagination} aria-label="Kütüphane sayfaları">
            <div className={layout.pageSize}>
              <label htmlFor="library-page-size">Sayfa başına</label>
              <CustomSelect id="library-page-size" value={String(pageSize)} onChange={(value) => { setPageSize(Number(value)); setPage(1); }} options={[12, 24, 48].map((size) => ({ value: String(size), label: String(size) }))} />
            </div>
            <div className={layout.pageButtons}>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Önceki</button>
              <span aria-live="polite">{currentPage} / {totalPages}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Sonraki</button>
            </div>
          </nav>}
        </>
      )}
      </div>

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

function LibraryThumbnail({ item }: { item: LibraryItemRow }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!item.mime.startsWith('image/')) return;
    let alive = true;
    signedFileUrl(LIBRARY_BUCKET, item.path).then((result) => {
      if (alive && result.ok) setUrl(result.data);
    }).catch(() => {});
    return () => { alive = false; };
  }, [item.mime, item.path]);
  if (!url || failed) return <KindIcon mime={item.mime} />;
  // eslint-disable-next-line @next/next/no-img-element -- Storage URLs are signed and expire.
  return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />;
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
    <div className={`${styles.libraryUpload} ${layout.upload}`}>
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
