'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Folder, Library, Search } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { formatBytes, HomeworkFilePick } from '../../lib/teacherData';
import {
  FILES_BUCKET, fileKind, FolderRow, KIND_LABEL, LIBRARY_BUCKET, libraryFileName, LibraryItemRow, listFolders, listLibrary, listMyFiles, TeacherFileRow,
} from '../../lib/filesData';
import { KindIcon, Modal, normalize } from './FilesUi';
import styles from './Files.module.css';

type Source = 'mine' | 'library';
const ALL = '__all__';
const NO_FOLDER = '__none__';


/**
 * "Dosyalarımdan ekle": öğretmenin dosyalarından ya da ortak kütüphaneden seçim.
 * Seçilenler ödev gönderilince ödeve kopyalanır (yeniden yükleme yok).
 */
export function HomeworkFilePicker({ remaining, already, onClose, onPick }: {
  /** Ödeve daha kaç dosya eklenebilir */
  remaining: number;
  /** Zaten seçilmiş olanlar (tekrar seçilmesin) */
  already: HomeworkFilePick[];
  onClose: () => void;
  onPick: (picks: HomeworkFilePick[]) => void;
}) {
  const [source, setSource] = useState<Source>('mine');
  const [files, setFiles] = useState<TeacherFileRow[] | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [library, setLibrary] = useState<LibraryItemRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState(ALL);
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<HomeworkFilePick[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([listMyFiles(), listFolders()]).then(([f, d]) => {
      if (!alive) return;
      if (!f.ok) { setError(f.error); return; }
      setFiles([...f.data].sort((a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at)));
      if (d.ok) setFolders(d.data);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (source !== 'library' || library) return;
    let alive = true;
    listLibrary().then((res) => {
      if (!alive) return;
      if (res.ok) setLibrary(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, [source, library]);

  const taken = (bucket: string, path: string) => already.some((a) => a.bucket === bucket && a.path === path);
  const isChosen = (bucket: string, path: string) => chosen.some((c) => c.bucket === bucket && c.path === path);
  const full = chosen.length >= remaining;
  const toggle = (pick: HomeworkFilePick) => setChosen((prev) => (
    prev.some((c) => c.bucket === pick.bucket && c.path === pick.path)
      ? prev.filter((c) => !(c.bucket === pick.bucket && c.path === pick.path))
      : prev.length >= remaining ? prev : [...prev, pick]
  ));

  const n = normalize(q.trim());
  const mine = useMemo(() => (files || []).filter((f) => (folder === ALL || (folder === NO_FOLDER ? !f.folder_id : f.folder_id === folder))
    && (!n || normalize([f.name, f.topic || '', f.subject || '', f.grade || '', ...f.tags].join(' ')).includes(n))), [files, folder, n]);
  const lib = useMemo(() => (library || []).filter((i) => !n || normalize([i.title, i.category || '', ...i.tags].join(' ')).includes(n)), [library, n]);

  const row = (key: string, pick: HomeworkFilePick, sub: string) => {
    const isTaken = taken(pick.bucket, pick.path);
    const on = isChosen(pick.bucket, pick.path);
    const disabled = isTaken || (!on && full);
    return (
      <li key={key}>
        <label className={disabled && !on ? styles.pickDisabled : undefined}>
          <input type="checkbox" className={styles.check} checked={on || isTaken} disabled={disabled} onChange={() => toggle(pick)} />
          <KindIcon mime={pick.type} />
          <span className={styles.pickText}>
            <strong title={pick.name}>{pick.name}</strong>
            <small>{isTaken ? 'Zaten eklendi' : sub}</small>
          </span>
        </label>
      </li>
    );
  };

  return (
    <Modal title="Dosyalarımdan ekle" kicker={remaining > 0 ? `En fazla ${remaining} dosya daha` : 'Dosya sınırı doldu'} onClose={onClose} wide>
      <div className={styles.tabs} role="group" aria-label="Kaynak">
        <button type="button" aria-pressed={source === 'mine'} onClick={() => setSource('mine')}><Folder size={18} aria-hidden="true" />Dosyalarım</button>
        <button type="button" aria-pressed={source === 'library'} onClick={() => setSource('library')}><Library size={18} aria-hidden="true" />Ortak kütüphane</button>
      </div>
      <div className={styles.filters} style={{ gridTemplateColumns: source === 'mine' && folders.length ? 'minmax(200px, 2fr) minmax(160px, 1fr)' : 'minmax(0, 1fr)' }}>
        <label className={styles.search}>
          <span className={styles.srOnly}>Ara</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, konu ya da etiketle ara" data-autofocus />
        </label>
        {source === 'mine' && folders.length > 0 && (
          <CustomSelect value={folder} onChange={setFolder} options={[{ value: ALL, label: 'Bütün klasörler' }, { value: NO_FOLDER, label: 'Klasörsüz' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]} />
        )}
      </div>

      {error && <p className={styles.error} role="alert">Liste alınamadı: {error}</p>}
      {!error && source === 'mine' && (
        !files ? <Spinner center label="Dosyalar yükleniyor…" />
          : files.length === 0 ? <p className={styles.muted}>Dosyalarım sayfasına henüz dosya yüklemediniz.</p>
            : mine.length === 0 ? <p className={styles.muted}>Aramaya uyan dosya yok.</p>
              : (
                <ul className={styles.pickList}>
                  {mine.map((f) => row(f.id, { bucket: FILES_BUCKET, path: f.path, name: f.name, size: f.size, type: f.mime },
                    [KIND_LABEL[fileKind(f.mime)], formatBytes(f.size), f.subject, f.topic].filter(Boolean).join(' · ')))}
                </ul>
              )
      )}
      {!error && source === 'library' && (
        !library ? <Spinner center label="Kütüphane yükleniyor…" />
          : library.length === 0 ? <p className={styles.muted}>Ortak kütüphanede henüz dosya yok.</p>
            : lib.length === 0 ? <p className={styles.muted}>Aramaya uyan dosya yok.</p>
              : (
                <ul className={styles.pickList}>
                  {lib.map((i) => row(i.id, { bucket: LIBRARY_BUCKET, path: i.path, name: libraryFileName(i), size: i.size, type: i.mime },
                    [KIND_LABEL[fileKind(i.mime)], formatBytes(i.size), i.category].filter(Boolean).join(' · ')))}
                </ul>
              )
      )}

      <div className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Vazgeç</button>
        <button type="button" className={styles.primaryButton} onClick={() => onPick(chosen)} disabled={!chosen.length}>
          {chosen.length ? `${chosen.length} dosyayı ekle` : 'Dosya seçin'}
        </button>
      </div>
    </Modal>
  );
}
