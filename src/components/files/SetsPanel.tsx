'use client';

import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Layers, Plus, Search, Share2, Trash2, X } from '../icons';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { formatBytes } from '../../lib/teacherData';
import {
  ContentSetRow, createSet, deleteSet, FILES_BUCKET, fileKind, KIND_LABEL, saveSetItems, ShareRow, TeacherFileRow, updateSet,
} from '../../lib/filesData';
import { ShareDialog } from './FileDialogs';
import { FilePreview, KindIcon, Modal, normalize } from './FilesUi';
import styles from './Files.module.css';

/** Setler: birden çok dosyayı tek paket yapıp sınıfla paylaşma (ör. "8. Sınıf LGS Matematik Seti") */
export function SetsPanel({ sets, setSets, files, shares, classNames, onShareChange, onSetRemoved }: {
  sets: ContentSetRow[];
  setSets: React.Dispatch<React.SetStateAction<ContentSetRow[]>>;
  files: TeacherFileRow[];
  shares: ShareRow[];
  classNames: string[];
  onShareChange: (next: { added: ShareRow[]; removedId?: string }) => void;
  onSetRemoved: (id: string) => void;
}) {
  const { confirm } = useDialog();
  const [notice, setNotice] = useState<NoticeState>(null);
  const [editing, setEditing] = useState<ContentSetRow | 'new' | null>(null);
  const [picking, setPicking] = useState<ContentSetRow | null>(null);
  const [sharing, setSharing] = useState<ContentSetRow | null>(null);
  const [previewing, setPreviewing] = useState<TeacherFileRow | null>(null);
  const fileById = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);

  const remove = async (s: ContentSetRow) => {
    const ok = await confirm({
      title: 'Seti sil',
      message: `"${s.title}" seti silinsin mi?\nSetteki dosyalar silinmez; yalnızca paket ve sınıflarla paylaşımı kalkar.`,
      confirmText: 'Seti sil', cancelText: 'Vazgeç', variant: 'danger',
    });
    if (!ok) return;
    const res = await deleteSet(s.id);
    if (!res.ok) { setNotice({ kind: 'error', text: `Silinemedi: ${res.error}` }); return; }
    setSets((prev) => prev.filter((x) => x.id !== s.id));
    onSetRemoved(s.id);
    setNotice({ kind: 'ok', text: `"${s.title}" seti silindi.` });
  };

  return (
    <section className={styles.page} aria-label="Setler">
      <div className={styles.topBar}>
        <p className={styles.muted}>Bir konunun bütün dosyalarını tek paket yapın; öğrenciler seti tek kartta, sırasıyla görür.</p>
        <button type="button" className={styles.primaryButton} onClick={() => setEditing('new')} disabled={!files.length} title={files.length ? undefined : 'Önce Dosyalarım bölümüne dosya yükleyin'}>
          <Plus size={18} aria-hidden="true" />Yeni set
        </button>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {sets.length === 0 ? (
        <div className={styles.empty}>
          <Layers size={32} aria-hidden="true" />
          <h3>Henüz set yok</h3>
          <p>{files.length ? 'Örneğin "8. Sınıf LGS Matematik Seti" oluşturup ilgili çalışma kâğıtlarını ve sunumları içine ekleyin.' : 'Set oluşturmak için önce Dosyalarım bölümüne dosya yükleyin.'}</p>
        </div>
      ) : (
        <div className={styles.cards}>
          {sets.map((s) => {
            const items = s.items.map((i) => fileById.get(i.file_id)).filter((f): f is TeacherFileRow => !!f);
            const setShares = shares.filter((x) => x.set_id === s.id);
            const total = items.reduce((a, f) => a + f.size, 0);
            return (
              <article key={s.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.setIcon} aria-hidden="true"><Layers size={22} /></span>
                  <div>
                    <h3 className={styles.cardTitle}>{s.title}</h3>
                    <p className={styles.cardText}>{items.length} dosya{items.length ? ` · ${formatBytes(total)}` : ''}</p>
                  </div>
                </div>
                {s.description && <p className={styles.cardText}>{s.description}</p>}
                {setShares.length > 0 && <span className={styles.shared} style={{ width: 'fit-content' }}><Share2 size={12} aria-hidden="true" />{setShares.map((x) => x.class_name).join(', ')}</span>}
                {items.length > 0 ? (
                  <ul className={styles.miniList}>
                    {items.slice(0, 5).map((f) => (
                      <li key={f.id}>
                        <KindIcon mime={f.mime} />
                        <span title={f.name}>
                          <button type="button" className={styles.nameButton} onClick={() => setPreviewing(f)}>{f.name}</button>
                        </span>
                      </li>
                    ))}
                    {items.length > 5 && <li><span className={styles.muted}>ve {items.length - 5} dosya daha</span></li>}
                  </ul>
                ) : (
                  <p className={styles.muted}>Sette henüz dosya yok.</p>
                )}
                <div className={styles.cardActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setPicking(s)}><Layers size={18} aria-hidden="true" />Dosyalar</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => setSharing(s)} disabled={!items.length} title={items.length ? undefined : 'Paylaşmak için sete dosya ekleyin'}>
                    <Share2 size={18} aria-hidden="true" />Paylaş
                  </button>
                  <button type="button" className={styles.iconButton} onClick={() => setEditing(s)} aria-label={`${s.title} adını düzenle`} title="Adını düzenle"><Edit size={18} aria-hidden="true" /></button>
                  <button type="button" className={styles.iconButton} onClick={() => remove(s)} aria-label={`${s.title} setini sil`} title="Sil"><Trash2 size={18} aria-hidden="true" /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <SetFormDialog
          set={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            if (created) {
              setSets((prev) => [saved, ...prev]);
              setPicking(saved);
            } else {
              setSets((prev) => prev.map((x) => (x.id === saved.id ? { ...x, title: saved.title, description: saved.description } : x)));
              setNotice({ kind: 'ok', text: 'Set kaydedildi.' });
            }
          }}
        />
      )}
      {picking && (
        <SetItemsDialog
          set={picking}
          files={files}
          onClose={() => setPicking(null)}
          onSaved={(ids) => {
            setSets((prev) => prev.map((x) => (x.id === picking.id ? { ...x, items: ids.map((file_id, position) => ({ file_id, position })) } : x)));
            setPicking(null);
            setNotice({ kind: 'ok', text: `"${picking.title}" setinde ${ids.length} dosya var.` });
          }}
        />
      )}
      {sharing && (
        <ShareDialog
          title={sharing.title}
          target={{ setId: sharing.id }}
          classNames={classNames}
          shares={shares.filter((x) => x.set_id === sharing.id)}
          onClose={() => setSharing(null)}
          onChanged={onShareChange}
        />
      )}
      {previewing && <FilePreview bucket={FILES_BUCKET} path={previewing.path} name={previewing.name} mime={previewing.mime} onClose={() => setPreviewing(null)} />}
    </section>
  );
}

function SetFormDialog({ set, onClose, onSaved }: { set: ContentSetRow | null; onClose: () => void; onSaved: (s: ContentSetRow, created: boolean) => void }) {
  const titleId = useId();
  const descId = useId();
  const [title, setTitle] = useState(set?.title || '');
  const [description, setDescription] = useState(set?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (set) {
      const res = await updateSet(set.id, title, description);
      setBusy(false);
      if (!res.ok) { setError(res.error); return; }
      onSaved({ ...set, title: title.trim(), description: description.trim() || null }, false);
    } else {
      const res = await createSet(title, description);
      setBusy(false);
      if (!res.ok) { setError(res.error); return; }
      onSaved(res.data, true);
    }
  };
  return (
    <Modal title={set ? 'Seti düzenle' : 'Yeni set'} onClose={onClose} busy={busy}>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field} htmlFor={titleId}>
          Set adı
          <input id={titleId} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. 8. Sınıf LGS Matematik Seti" required data-autofocus />
        </label>
        <label className={styles.field} htmlFor={descId}>
          Açıklama <span className={styles.hint}>(isteğe bağlı)</span>
          <textarea id={descId} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Kaydediliyor…' : set ? 'Kaydet' : 'Oluştur ve dosya seç'}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Setin dosyaları: işaretle, sırala (yukarı/aşağı), kaydet */
function SetItemsDialog({ set, files, onClose, onSaved }: { set: ContentSetRow; files: TeacherFileRow[]; onClose: () => void; onSaved: (ids: string[]) => void }) {
  const before = set.items.map((i) => i.file_id).filter((id) => files.some((f) => f.id === id));
  const [ids, setIds] = useState<string[]>(before);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(files.map((f) => [f.id, f]));
  const n = normalize(q.trim());
  const candidates = files.filter((f) => !ids.includes(f.id) && (!n || normalize([f.name, f.topic || '', f.subject || '', ...f.tags].join(' ')).includes(n)));

  const moveItem = (id: string, dir: -1 | 1) => setIds((prev) => {
    const i = prev.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await saveSetItems(set.id, before, ids);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onSaved(ids);
  };

  return (
    <Modal title={set.title} kicker="Setin dosyaları" onClose={onClose} busy={busy} wide>
      <div className={styles.grid2}>
        <div className={styles.form}>
          <h3 className={styles.cardTitle}>Sette ({ids.length})</h3>
          {ids.length === 0 ? <p className={styles.muted}>Sağdaki listeden dosya ekleyin.</p> : (
            <ol className={styles.pickList}>
              {ids.map((id, i) => {
                const f = byId.get(id)!;
                return (
                  <li key={id} className={styles.pickRow}>
                    <KindIcon mime={f.mime} />
                    <span className={styles.pickText}><strong title={f.name}>{i + 1}. {f.name}</strong><small>{KIND_LABEL[fileKind(f.mime)]} · {formatBytes(f.size)}</small></span>
                    <span className={styles.orderButtons}>
                      <button type="button" className={styles.iconButton} onClick={() => moveItem(id, -1)} disabled={i === 0} aria-label={`${f.name} yukarı`}><ChevronUp size={18} aria-hidden="true" /></button>
                      <button type="button" className={styles.iconButton} onClick={() => moveItem(id, 1)} disabled={i === ids.length - 1} aria-label={`${f.name} aşağı`}><ChevronDown size={18} aria-hidden="true" /></button>
                      <button type="button" className={styles.iconButton} onClick={() => setIds((p) => p.filter((x) => x !== id))} aria-label={`${f.name} setten çıkar`}><X size={18} aria-hidden="true" /></button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <div className={styles.form}>
          <h3 className={styles.cardTitle}>Dosyalarım</h3>
          <label className={styles.search}>
            <span className={styles.srOnly}>Dosya ara</span>
            <Search size={18} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" data-autofocus />
          </label>
          {candidates.length === 0 ? <p className={styles.muted}>{files.length === ids.length ? 'Bütün dosyalarınız sette.' : 'Aramaya uyan dosya yok.'}</p> : (
            <ul className={styles.pickList}>
              {candidates.map((f) => (
                <li key={f.id} className={styles.pickRow}>
                  <KindIcon mime={f.mime} />
                  <span className={styles.pickText}><strong title={f.name}>{f.name}</strong><small>{[f.subject, f.topic].filter(Boolean).join(' · ') || formatBytes(f.size)}</small></span>
                  <button type="button" className={styles.iconButton} onClick={() => setIds((p) => [...p, f.id])} aria-label={`${f.name} sete ekle`} title="Sete ekle"><Plus size={18} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className={styles.primaryButton} onClick={save} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </div>
    </Modal>
  );
}
