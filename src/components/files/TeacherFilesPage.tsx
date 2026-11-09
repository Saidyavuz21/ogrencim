'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Download, Edit, Eye, Folder, FolderPlus, GripVertical, Layers, Library, MoreVertical, School, Search, Share2, Trash2, Upload,
} from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { formatBytes } from '../../lib/teacherData';
import {
  checkUploadBatch, ContentSetRow, createFolder, deleteFiles, deleteFolder, FILE_QUOTA_BYTES, FILES_BUCKET, fileKind, FileKind, FolderRow,
  getFileUsage, GRADE_OPTIONS, KIND_LABEL, listFolders, listMyFiles, listMySets, listMyShares, moveFiles, renameFolder, reorderFiles,
  reorderFolders, ShareRow, signedFileUrl, TEACHER_FILE_ACCEPT, TeacherFileRow,
} from '../../lib/filesData';
import { EditFileDialog, ShareDialog, SUBJECT_OPTIONS, UploadDialog } from './FileDialogs';
import { FilePreview, KindIcon, Modal, normalize } from './FilesUi';
import { SetsPanel } from './SetsPanel';
import { LibraryPanel } from './LibraryPanel';
import { SchoolSpacePanel, ShareToSchoolDialog } from './SchoolSpacePanel';
import styles from './Files.module.css';

type Tab = 'files' | 'sets' | 'school' | 'library';
const ALL = '__all__';
const NO_FOLDER = '__none__';
const ANY = '';
const FILE_DRAG = 'application/x-ogrenci-file';
const FOLDER_DRAG = 'application/x-ogrenci-folder';

const sortFiles = (list: TeacherFileRow[]) =>
  [...list].sort((a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at));

/** Öğretmen: Dosyalarım (yükle, klasörle, etiketle, paylaş), Setler ve Ortak kütüphane */
export function TeacherFilesPage({ classNames, userId, isSchoolAdmin, branch }: {
  classNames: string[];
  userId?: string;
  isSchoolAdmin?: boolean;
  /** Zümre paylaşımında varsayılan */
  branch?: string;
}) {
  const [tab, setTab] = useState<Tab>('files');
  const [files, setFiles] = useState<TeacherFileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [sets, setSets] = useState<ContentSetRow[]>([]);
  const [used, setUsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshUsage = useCallback(() => {
    getFileUsage().then((res) => { if (res.ok) setUsed(res.data.used); });
  }, []);
  const reloadFiles = useCallback(() => {
    listMyFiles().then((res) => { if (res.ok) setFiles(res.data); });
    getFileUsage().then((res) => { if (res.ok) setUsed(res.data.used); });
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([listMyFiles(), listFolders(), listMyShares(), listMySets(), getFileUsage()]).then(([f, d, s, st, u]) => {
      if (!alive) return;
      setLoading(false);
      const firstError = [f, d, s, st].find((r) => !r.ok);
      if (firstError && !firstError.ok) { setLoadError(firstError.error); return; }
      if (f.ok) setFiles(f.data);
      if (d.ok) setFolders(d.data);
      if (s.ok) setShares(s.data);
      if (st.ok) setSets(st.data);
      if (u.ok) setUsed(u.data.used);
    });
    return () => { alive = false; };
  }, []);

  const sharesByFile = useMemo(() => {
    const m = new Map<string, ShareRow[]>();
    for (const s of shares) if (s.file_id) m.set(s.file_id, [...(m.get(s.file_id) || []), s]);
    return m;
  }, [shares]);

  const onShareChange = (next: { added: ShareRow[]; removedId?: string }) => {
    setShares((prev) => [...next.added, ...prev.filter((s) => s.id !== next.removedId)]);
  };

  if (loading) return <Spinner center label="Dosyalar yükleniyor…" />;
  if (loadError) return <p className={styles.error} role="alert">Dosyalar alınamadı: {loadError}</p>;

  return (
    <div className={`${styles.page} ${styles.teacherFilesPage}`}>
      <div className={styles.tabs} role="group" aria-label="Bölüm">
        <button type="button" aria-pressed={tab === 'files'} onClick={() => setTab('files')}><Folder size={18} aria-hidden="true" />Dosyalarım</button>
        <button type="button" aria-pressed={tab === 'sets'} onClick={() => setTab('sets')}><Layers size={18} aria-hidden="true" />Setler{sets.length ? ` (${sets.length})` : ''}</button>
        <button type="button" aria-pressed={tab === 'school'} onClick={() => setTab('school')}><School size={18} aria-hidden="true" />Okul alanı</button>
        <button type="button" aria-pressed={tab === 'library'} onClick={() => setTab('library')}><Library size={18} aria-hidden="true" />Ortak kütüphane</button>
      </div>

      {tab === 'files' && (
        <MyFilesPanel
          files={files}
          setFiles={setFiles}
          folders={folders}
          setFolders={setFolders}
          sharesByFile={sharesByFile}
          classNames={classNames}
          onShareChange={onShareChange}
          used={used}
          refreshUsage={refreshUsage}
          branch={branch}
          onFilesRemoved={(ids) => {
            setShares((prev) => prev.filter((s) => !s.file_id || !ids.includes(s.file_id)));
            setSets((prev) => prev.map((st) => ({ ...st, items: st.items.filter((i) => !ids.includes(i.file_id)) })));
          }}
        />
      )}
      {tab === 'sets' && (
        <SetsPanel
          sets={sets}
          setSets={setSets}
          files={files}
          shares={shares}
          classNames={classNames}
          onShareChange={onShareChange}
          onSetRemoved={(id) => setShares((prev) => prev.filter((s) => s.set_id !== id))}
        />
      )}
      {tab === 'school' && <SchoolSpacePanel userId={userId} isSchoolAdmin={isSchoolAdmin} onCopied={reloadFiles} />}
      {tab === 'library' && <LibraryPanel />}
    </div>
  );
}

// --------------------------------------------------------
// Dosyalarım
// --------------------------------------------------------
function MyFilesPanel({ files, setFiles, folders, setFolders, sharesByFile, classNames, onShareChange, used, refreshUsage, onFilesRemoved, branch }: {
  files: TeacherFileRow[];
  setFiles: React.Dispatch<React.SetStateAction<TeacherFileRow[]>>;
  folders: FolderRow[];
  setFolders: React.Dispatch<React.SetStateAction<FolderRow[]>>;
  sharesByFile: Map<string, ShareRow[]>;
  classNames: string[];
  onShareChange: (next: { added: ShareRow[]; removedId?: string }) => void;
  used: number | null;
  refreshUsage: () => void;
  onFilesRemoved: (ids: string[]) => void;
  branch?: string;
}) {
  const { confirm, prompt } = useDialog();
  const [toSchool, setToSchool] = useState<TeacherFileRow | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [view, setView] = useState<string>(ALL);
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState(ANY);
  const [subject, setSubject] = useState(ANY);
  const [tag, setTag] = useState(ANY);
  const [kind, setKind] = useState(ANY);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadFiles, setUploadFiles] = useState<File[] | null>(null);
  const [editing, setEditing] = useState<TeacherFileRow | null>(null);
  const [sharing, setSharing] = useState<TeacherFileRow | null>(null);
  const [previewing, setPreviewing] = useState<TeacherFileRow | null>(null);
  const [moving, setMoving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [dropFolder, setDropFolder] = useState<string | null>(null);
  const [osDrag, setOsDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;
  const allTags = useMemo(() => Array.from(new Set(files.flatMap((f) => f.tags))).sort((a, b) => a.localeCompare(b, 'tr')), [files]);
  const filtering = !!(q.trim() || grade || subject || tag || kind);
  const sorted = useMemo(() => sortFiles(files), [files]);
  const inView = useMemo(() => sorted.filter((f) => (view === ALL ? true : view === NO_FOLDER ? !f.folder_id : f.folder_id === view)), [sorted, view]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return inView.filter((f) => {
      if (grade && f.grade !== grade) return false;
      if (subject && f.subject !== subject) return false;
      if (tag && !f.tags.includes(tag)) return false;
      if (kind && fileKind(f.mime) !== kind) return false;
      if (n) {
        const hay = normalize([f.name, f.topic || '', f.subject || '', f.grade || '', ...f.tags].join(' '));
        if (!n.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [inView, q, grade, subject, tag, kind]);
  // Sıralama yalnızca filtre yokken (görünen liste klasörün tamamıyken) değiştirilebilir
  const canReorder = !filtering && visible.length > 1;
  const countIn = (id: string) => (id === ALL ? files.length : id === NO_FOLDER ? files.filter((f) => !f.folder_id).length : files.filter((f) => f.folder_id === id).length);

  const usedBytes = used ?? files.reduce((a, f) => a + f.size, 0);
  const usedRatio = Math.min(1, usedBytes / FILE_QUOTA_BYTES);

  // ---- Yükleme ----
  const startUpload = (list: FileList | File[] | null) => {
    const picked = Array.from(list || []);
    if (input.current) input.current.value = '';
    if (!picked.length) return;
    const problem = checkUploadBatch(picked, usedBytes);
    if (problem) { setNotice({ kind: 'error', text: problem }); return; }
    setNotice(null);
    setUploadFiles(picked);
  };
  const minPos = files.length ? Math.min(...files.map((f) => f.position)) : 0;

  // ---- Klasörler ----
  const addFolder = async () => {
    const name = await prompt({ title: 'Yeni klasör', message: 'Klasörün adını yazın.', inputLabel: 'Klasör adı', placeholder: 'Örn. 5. sınıf kesirler', confirmText: 'Oluştur', cancelText: 'Vazgeç', variant: 'primary' });
    if (!name?.trim()) return;
    const res = await createFolder(name, folders.length ? Math.max(...folders.map((f) => f.position)) + 1 : 0);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setFolders((prev) => [...prev, res.data]);
    setView(res.data.id);
    setNotice({ kind: 'ok', text: `"${res.data.name}" klasörü oluşturuldu. Dosyaları sürükleyip klasöre bırakabilirsiniz.` });
  };
  const renameCurrent = async () => {
    const f = folders.find((x) => x.id === view);
    if (!f) return;
    const name = await prompt({ title: 'Klasörü yeniden adlandır', message: 'Yeni adı yazın.', inputLabel: 'Klasör adı', defaultValue: f.name, confirmText: 'Kaydet', cancelText: 'Vazgeç', variant: 'primary' });
    if (!name?.trim() || name.trim() === f.name) return;
    const res = await renameFolder(f.id, name);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, name: name.trim() } : x)));
  };
  const deleteCurrent = async () => {
    const f = folders.find((x) => x.id === view);
    if (!f) return;
    const n = countIn(f.id);
    const ok = await confirm({
      title: 'Klasörü sil',
      message: n ? `"${f.name}" klasörü silinsin mi?\nİçindeki ${n} dosya silinmez, "Klasörsüz" bölümüne geçer.` : `"${f.name}" klasörü silinsin mi?`,
      confirmText: 'Klasörü sil', cancelText: 'Vazgeç', variant: 'danger',
    });
    if (!ok) return;
    const res = await deleteFolder(f.id);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setFolders((prev) => prev.filter((x) => x.id !== f.id));
    setFiles((prev) => prev.map((x) => (x.folder_id === f.id ? { ...x, folder_id: null } : x)));
    setView(ALL);
  };

  // ---- Taşıma / sıralama ----
  const move = async (ids: string[], folderId: string | null) => {
    const changing = ids.filter((id) => (files.find((f) => f.id === id)?.folder_id || null) !== folderId);
    if (!changing.length) return;
    const res = await moveFiles(changing, folderId);
    if (!res.ok) { setNotice({ kind: 'error', text: `Taşınamadı: ${res.error}` }); return; }
    setFiles((prev) => prev.map((f) => (changing.includes(f.id) ? { ...f, folder_id: folderId } : f)));
    setNotice({ kind: 'ok', text: `${changing.length} dosya ${folderId ? `"${folderName(folderId)}" klasörüne` : '"Klasörsüz" bölümüne'} taşındı.` });
  };
  const applyOrder = async (ids: string[]) => {
    const prevFiles = files;
    // Görünen sıraya göre yeni konumlar (ekranda hemen; hata olursa geri alınır)
    setFiles((prev) => prev.map((f) => { const i = ids.indexOf(f.id); return i >= 0 ? { ...f, position: i } : f; }));
    const res = await reorderFiles(ids);
    if (!res.ok) { setFiles(prevFiles); setNotice({ kind: 'error', text: `Sıra kaydedilemedi: ${res.error}` }); }
  };
  const moveBefore = (id: string, beforeId: string | null) => {
    const ids = visible.map((f) => f.id).filter((x) => x !== id);
    const at = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(at < 0 ? ids.length : at, 0, id);
    applyOrder(ids);
  };
  const nudge = (id: string, dir: -1 | 1) => {
    const ids = visible.map((f) => f.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    applyOrder(ids);
  };
  const reorderFolderChips = async (dragFolderId: string, beforeId: string) => {
    if (dragFolderId === beforeId) return;
    const ids = folders.map((f) => f.id).filter((x) => x !== dragFolderId);
    ids.splice(ids.indexOf(beforeId), 0, dragFolderId);
    const prev = folders;
    setFolders(ids.map((id, i) => ({ ...folders.find((f) => f.id === id)!, position: i })));
    const res = await reorderFolders(ids);
    if (!res.ok) { setFolders(prev); setNotice({ kind: 'error', text: `Klasör sırası kaydedilemedi: ${res.error}` }); }
  };

  // ---- Silme ----
  const remove = async (rows: TeacherFileRow[]) => {
    const sharedCount = rows.filter((r) => sharesByFile.get(r.id)?.length).length;
    const ok = await confirm({
      title: rows.length > 1 ? `${rows.length} dosyayı sil` : 'Dosyayı sil',
      message: `${rows.length > 1 ? `${rows.length} dosya` : `"${rows[0].name}"`} kalıcı olarak silinsin mi?${sharedCount ? '\nSınıflarla paylaşımı da kaldırılır.' : ''}\nÖdevlere eklenmiş kopyalar etkilenmez.`,
      confirmText: 'Evet, sil', cancelText: 'Vazgeç', variant: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    const res = await deleteFiles(rows);
    setBusy(false);
    if (!res.ok) { setNotice({ kind: 'error', text: `Silinemedi: ${res.error}` }); return; }
    const ids = rows.map((r) => r.id);
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
    setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    onFilesRemoved(ids);
    refreshUsage();
    setNotice({ kind: 'ok', text: rows.length > 1 ? `${rows.length} dosya silindi.` : `"${rows[0].name}" silindi.` });
  };

  const download = async (f: TeacherFileRow) => {
    const res = await signedFileUrl(FILES_BUCKET, f.path, f.name);
    if (!res.ok) { setNotice({ kind: 'error', text: `İndirilemedi: ${res.error}` }); return; }
    window.location.assign(res.data);
  };

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedRows = files.filter((f) => selected.has(f.id));
  const allVisibleSelected = visible.length > 0 && visible.every((f) => selected.has(f.id));

  const closeMenu = (el: HTMLElement) => { const d = el.closest('details'); if (d) d.open = false; };
  const currentFolder = folders.find((f) => f.id === view);

  // Klasör çipi: dosya bırakılınca taşır; klasör bırakılınca sırayı değiştirir
  const folderDropProps = (targetId: string | null, chipKey: string) => ({
    onDragOver: (e: React.DragEvent) => {
      const t = e.dataTransfer.types;
      if (t.includes(FILE_DRAG) || (t.includes(FOLDER_DRAG) && targetId)) { e.preventDefault(); setDropFolder(chipKey); }
    },
    onDragLeave: () => setDropFolder((cur) => (cur === chipKey ? null : cur)),
    onDrop: (e: React.DragEvent) => {
      setDropFolder(null);
      const fileId = e.dataTransfer.getData(FILE_DRAG);
      const folderId = e.dataTransfer.getData(FOLDER_DRAG);
      if (fileId) {
        e.preventDefault();
        e.stopPropagation();
        const ids = selected.has(fileId) ? Array.from(selected) : [fileId];
        move(ids, targetId);
      } else if (folderId && targetId) {
        e.preventDefault();
        reorderFolderChips(folderId, targetId);
      }
    },
  });

  return (
    <section className={`${styles.page} ${styles.personalWorkspace}`} aria-label="Dosyalarım">
      <div className={styles.topBar}>
        <div className={styles.usage}>
          <p><strong>{formatBytes(usedBytes)}</strong> / {formatBytes(FILE_QUOTA_BYTES)} kullanıldı · {files.length} dosya</p>
          <div
            className={`${styles.usageBar} ${usedRatio >= 0.95 ? styles.usageFull : usedRatio >= 0.8 ? styles.usageHigh : ''}`}
            role="meter"
            aria-label="Depolama kullanımı"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usedRatio * 100)}
            aria-valuetext={`%${Math.round(usedRatio * 100)} dolu`}
          >
            <span style={{ width: `${Math.max(usedRatio * 100, usedBytes ? 1 : 0)}%` }} />
          </div>
          <p>Tahta ve soru görselleri de bu alana sayılır. Dosya başına en fazla 10 MB; resimler yüklenirken küçültülür.</p>
        </div>
        <div className={styles.topActions}>
          <button type="button" className={styles.secondaryButton} onClick={addFolder}><FolderPlus size={18} aria-hidden="true" />Klasör</button>
          <input ref={input} type="file" multiple accept={TEACHER_FILE_ACCEPT} className={styles.srOnly} tabIndex={-1} aria-hidden="true" onChange={(e) => startUpload(e.target.files)} />
          <button type="button" className={styles.primaryButton} onClick={() => input.current?.click()}><Upload size={18} aria-hidden="true" />Dosya yükle</button>
        </div>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.folderBar} role="group" aria-label="Klasörler">
        <button type="button" className={styles.folderChip} aria-pressed={view === ALL} onClick={() => setView(ALL)}>
          Tümü <small>{countIn(ALL)}</small>
        </button>
        <button
          type="button"
          className={`${styles.folderChip} ${dragId ? styles.dropTarget : ''} ${dropFolder === NO_FOLDER ? styles.dropOver : ''}`}
          aria-pressed={view === NO_FOLDER}
          onClick={() => setView(NO_FOLDER)}
          {...folderDropProps(null, NO_FOLDER)}
        >
          Klasörsüz <small>{countIn(NO_FOLDER)}</small>
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            draggable
            onDragStart={(e) => { e.dataTransfer.setData(FOLDER_DRAG, f.id); e.dataTransfer.effectAllowed = 'move'; }}
            className={`${styles.folderChip} ${dragId ? styles.dropTarget : ''} ${dropFolder === f.id ? styles.dropOver : ''}`}
            aria-pressed={view === f.id}
            onClick={() => setView(f.id)}
            {...folderDropProps(f.id, f.id)}
          >
            <Folder size={16} aria-hidden="true" />{f.name} <small>{countIn(f.id)}</small>
          </button>
        ))}
        {currentFolder && (
          <span className={styles.folderTools}>
            <button type="button" className={styles.linkButton} onClick={renameCurrent}>Yeniden adlandır</button>
            <button type="button" className={styles.linkButton} onClick={deleteCurrent}>Klasörü sil</button>
          </span>
        )}
      </div>

      {files.length > 0 && (
        <div className={styles.filters}>
          <label className={styles.search}>
            <span className={styles.srOnly}>Dosyalarda ara</span>
            <Search size={18} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, konu ya da etiketle ara" />
          </label>
          <div className={styles.fileFilterField}><label htmlFor="files-grade">Kademe</label><CustomSelect id="files-grade" value={grade} onChange={setGrade} options={[{ value: ANY, label: 'Bütün kademeler' }, ...GRADE_OPTIONS]} /></div>
          <div className={styles.fileFilterField}><label htmlFor="files-subject">Branş</label><CustomSelect id="files-subject" value={subject} onChange={setSubject} options={[{ value: ANY, label: 'Bütün branşlar' }, ...SUBJECT_OPTIONS]} /></div>
          <div className={styles.fileFilterField}><label htmlFor="files-tag">Etiket</label><CustomSelect id="files-tag" value={tag} onChange={setTag} options={[{ value: ANY, label: allTags.length ? 'Bütün etiketler' : 'Etiket yok' }, ...allTags]} disabled={!allTags.length} /></div>
          <div className={styles.fileFilterField}><label htmlFor="files-kind">Dosya türü</label>
          <CustomSelect
            id="files-kind"
            value={kind}
            onChange={setKind}
            options={[{ value: ANY, label: 'Bütün türler' }, ...(['pdf', 'image', 'word', 'slides', 'sheet'] as FileKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))]}
          />
          </div>
        </div>
      )}

      <div
        className={`${styles.dropZone} ${osDrag ? styles.dragActive : ''}`}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOsDrag(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOsDrag(false); }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setOsDrag(false);
          startUpload(e.dataTransfer.files);
        }}
      >
        {files.length === 0 ? (
          <div className={styles.empty}>
            <Upload size={32} aria-hidden="true" />
            <h3>Henüz dosyanız yok</h3>
            <p>Çalışma kâğıdı, sunum, PDF ve resimlerinizi buraya yükleyin; klasörlere ayırın, etiketleyin, sınıfınızla paylaşın ve ödeve tek tıkla ekleyin. Dosyaları bu alana sürükleyip bırakabilirsiniz.</p>
            <button type="button" className={styles.primaryButton} onClick={() => input.current?.click()}><Upload size={18} aria-hidden="true" />Dosya yükle</button>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            <h3>{filtering ? 'Aramaya uyan dosya yok' : 'Bu klasör boş'}</h3>
            <p>{filtering ? 'Filtreleri değiştirin ya da temizleyin.' : 'Dosyaları sürükleyip bu klasörün adına bırakın ya da buraya yeni dosya yükleyin.'}</p>
            {filtering && (
              <button type="button" className={styles.secondaryButton} onClick={() => { setQ(''); setGrade(ANY); setSubject(ANY); setTag(ANY); setKind(ANY); }}>Filtreleri temizle</button>
            )}
          </div>
        ) : (
          <>
            <p className={styles.muted} style={{ marginBottom: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={allVisibleSelected}
                  onChange={() => setSelected((prev) => {
                    const n = new Set(prev);
                    if (allVisibleSelected) visible.forEach((f) => n.delete(f.id));
                    else visible.forEach((f) => n.add(f.id));
                    return n;
                  })}
                />
                Hepsini seç
              </label>
              {canReorder ? ' · Sırayı değiştirmek için satırı tutup sürükleyin; klasöre taşımak için klasörün adına bırakın.' : filtering ? ' · Filtre açıkken sıra değiştirilemez.' : ''}
            </p>
            <ul className={styles.list} aria-label="Dosyalar">
              {visible.map((f, i) => {
                const fileShares = sharesByFile.get(f.id) || [];
                return (
                  <li
                    key={f.id}
                    className={`${styles.row} ${selected.has(f.id) ? styles.rowSelected : ''} ${dragId === f.id ? styles.rowDragging : ''} ${dropBefore === f.id ? styles.rowDropBefore : ''}`}
                    draggable
                    onDragStart={(e) => { setDragId(f.id); e.dataTransfer.setData(FILE_DRAG, f.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragId(null); setDropBefore(null); setDropFolder(null); }}
                    onDragOver={(e) => { if (canReorder && e.dataTransfer.types.includes(FILE_DRAG)) { e.preventDefault(); setDropBefore(f.id); } }}
                    onDragLeave={() => setDropBefore((cur) => (cur === f.id ? null : cur))}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData(FILE_DRAG);
                      setDropBefore(null);
                      if (!id || !canReorder) return;
                      e.preventDefault();
                      e.stopPropagation();
                      if (id !== f.id) moveBefore(id, f.id);
                    }}
                  >
                    {canReorder && <span className={styles.grip} aria-hidden="true"><GripVertical size={18} /></span>}
                    <input type="checkbox" className={styles.check} checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} aria-label={`${f.name} seç`} />
                    <KindIcon mime={f.mime} />
                    <div className={styles.info}>
                      <p className={styles.name}>
                        <button type="button" className={styles.nameButton} onClick={() => setPreviewing(f)} title={f.name}>{f.name}</button>
                      </p>
                      <div className={styles.meta}>
                        <span>{KIND_LABEL[fileKind(f.mime)]} · {formatBytes(f.size)}</span>
                        {view === ALL && f.folder_id && <span className={styles.dot}><Folder size={13} aria-hidden="true" /> {folderName(f.folder_id)}</span>}
                        {[f.grade, f.subject, f.topic].filter(Boolean).length > 0 && <span className={styles.dot}>{[f.grade, f.subject, f.topic].filter(Boolean).join(' · ')}</span>}
                        {f.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                        {fileShares.length > 0 && <span className={styles.shared}><Share2 size={12} aria-hidden="true" />{fileShares.map((s) => s.class_name).join(', ')}</span>}
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.iconButton} onClick={() => setPreviewing(f)} aria-label={`${f.name} önizle`} title="Önizle">
                        <Eye size={18} aria-hidden="true" />
                      </button>
                      <details className={styles.menu} onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
                        <summary aria-label={`${f.name} işlemleri`}><MoreVertical size={20} aria-hidden="true" /></summary>
                        <div className={styles.menuList}>
                          <button type="button" onClick={(e) => { closeMenu(e.currentTarget); setSharing(f); }}><Share2 size={18} aria-hidden="true" />Sınıfla paylaş</button>
                          <button type="button" onClick={(e) => { closeMenu(e.currentTarget); setToSchool(f); }}><School size={18} aria-hidden="true" />Okul alanında paylaş</button>
                          <button type="button" onClick={(e) => { closeMenu(e.currentTarget); setEditing(f); }}><Edit size={18} aria-hidden="true" />Bilgileri düzenle / taşı</button>
                          <button type="button" onClick={(e) => { closeMenu(e.currentTarget); download(f); }}><Download size={18} aria-hidden="true" />İndir</button>
                          {canReorder && (
                            <>
                              <button type="button" disabled={i === 0} onClick={(e) => { closeMenu(e.currentTarget); nudge(f.id, -1); }}><ChevronUp size={18} aria-hidden="true" />Yukarı taşı</button>
                              <button type="button" disabled={i === visible.length - 1} onClick={(e) => { closeMenu(e.currentTarget); nudge(f.id, 1); }}><ChevronDown size={18} aria-hidden="true" />Aşağı taşı</button>
                            </>
                          )}
                          <button type="button" className={styles.menuDanger} onClick={(e) => { closeMenu(e.currentTarget); remove([f]); }}><Trash2 size={18} aria-hidden="true" />Sil</button>
                        </div>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {selectedRows.length > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Seçilen dosyalar">
          <strong>{selectedRows.length} dosya seçildi</strong>
          <button type="button" className={styles.secondaryButton} onClick={() => setMoving(true)} disabled={busy}><Folder size={18} aria-hidden="true" />Klasöre taşı</button>
          <button type="button" className={styles.dangerButton} onClick={() => remove(selectedRows)} disabled={busy}><Trash2 size={18} aria-hidden="true" />Sil</button>
          <button type="button" className={styles.linkButton} onClick={() => setSelected(new Set())}>Seçimi kaldır</button>
        </div>
      )}

      {uploadFiles && (
        <UploadDialog
          files={uploadFiles}
          folders={folders}
          defaultFolderId={currentFolder?.id || null}
          tagSuggestions={allTags}
          startPosition={minPos - uploadFiles.length}
          onClose={() => setUploadFiles(null)}
          onDone={(uploaded, errors) => {
            setUploadFiles(null);
            if (uploaded.length) setFiles((prev) => [...uploaded, ...prev]);
            refreshUsage();
            if (errors.length) setNotice({ kind: 'error', text: `${uploaded.length ? `${uploaded.length} dosya yüklendi. ` : ''}Yüklenemeyen: ${errors.join(' ')}` });
            else setNotice({ kind: 'ok', text: `${uploaded.length} dosya yüklendi.` });
          }}
        />
      )}
      {editing && (
        <EditFileDialog
          file={editing}
          folders={folders}
          tagSuggestions={allTags}
          onClose={() => setEditing(null)}
          onSaved={(row) => { setFiles((prev) => prev.map((f) => (f.id === row.id ? row : f))); setEditing(null); setNotice({ kind: 'ok', text: 'Dosya bilgileri kaydedildi.' }); }}
        />
      )}
      {sharing && (
        <ShareDialog
          title={sharing.name}
          target={{ fileId: sharing.id }}
          classNames={classNames}
          shares={sharesByFile.get(sharing.id) || []}
          onClose={() => setSharing(null)}
          onChanged={onShareChange}
        />
      )}
      {previewing && <FilePreview bucket={FILES_BUCKET} path={previewing.path} name={previewing.name} mime={previewing.mime} onClose={() => setPreviewing(null)} />}
      {toSchool && (
        <ShareToSchoolDialog
          file={toSchool}
          defaultSubject={branch}
          onClose={() => setToSchool(null)}
          onShared={(text) => { setToSchool(null); setNotice({ kind: 'ok', text }); }}
        />
      )}
      {moving && (
        <MoveDialog
          count={selectedRows.length}
          folders={folders}
          onClose={() => setMoving(false)}
          onMove={async (folderId) => { setMoving(false); await move(selectedRows.map((r) => r.id), folderId); setSelected(new Set()); }}
        />
      )}
    </section>
  );
}

function MoveDialog({ count, folders, onClose, onMove }: { count: number; folders: FolderRow[]; onClose: () => void; onMove: (folderId: string | null) => void }) {
  const [target, setTarget] = useState(NO_FOLDER);
  return (
    <Modal title={`${count} dosyayı taşı`} onClose={onClose}>
      <div className={styles.field}>
        <span>Hedef klasör</span>
        <CustomSelect value={target} onChange={setTarget} options={[{ value: NO_FOLDER, label: 'Klasörsüz' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]} />
      </div>
      <div className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Vazgeç</button>
        <button type="button" className={styles.primaryButton} onClick={() => onMove(target === NO_FOLDER ? null : target)}>Taşı</button>
      </div>
    </Modal>
  );
}
