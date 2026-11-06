'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye, Layers, Search } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { formatBytes } from '../../lib/teacherData';
import { FILES_BUCKET, fileKind, KIND_LABEL, listMyMaterials, MaterialFile, MaterialShare } from '../../lib/filesData';
import { DownloadButton, FilePreview, KindIcon, normalize } from './FilesUi';
import styles from './Files.module.css';

const ANY = '';
const filesOf = (r: MaterialShare) => (r.file ? [r.file] : r.set?.files || []);
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Öğrenci: öğretmenlerinin sınıfıyla paylaştığı dosyalar ve setler */
export function StudentMaterialsPage() {
  const [rows, setRows] = useState<MaterialShare[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState(ANY);
  const [previewing, setPreviewing] = useState<MaterialFile | null>(null);

  useEffect(() => {
    let alive = true;
    listMyMaterials().then((res) => {
      if (!alive) return;
      if (res.ok) setRows(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const subjects = useMemo(() => Array.from(new Set((rows || []).flatMap((r) => filesOf(r).map((f) => f.subject)).filter((s): s is string => !!s))).sort((a, b) => a.localeCompare(b, 'tr')), [rows]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return (rows || []).filter((r) => {
      const fs = filesOf(r);
      if (subject && !fs.some((f) => f.subject === subject)) return false;
      if (!n) return true;
      const hay = normalize([r.teacher_name, r.note || '', r.set?.title || '', r.set?.description || '', ...fs.flatMap((f) => [f.name, f.topic || '', f.subject || ''])].join(' '));
      return n.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [rows, q, subject]);

  if (error) return <p className={styles.error} role="alert">Ders materyalleri alınamadı: {error}</p>;
  if (!rows) return <Spinner center label="Yükleniyor…" />;
  if (!rows.length) {
    return (
      <div className={styles.empty}>
        <BookOpen size={32} aria-hidden="true" />
        <h3>Henüz paylaşılan materyal yok</h3>
        <p>Öğretmenlerin sınıfınla çalışma kâğıdı, sunum ya da konu seti paylaştığında burada görünecek.</p>
      </div>
    );
  }

  const fileRow = (f: MaterialFile) => (
    <li key={f.id} className={styles.row}>
      <KindIcon mime={f.mime} />
      <div className={styles.info}>
        <p className={styles.name}><button type="button" className={styles.nameButton} onClick={() => setPreviewing(f)} title={f.name}>{f.name}</button></p>
        <div className={styles.meta}>
          <span>{KIND_LABEL[fileKind(f.mime)]} · {formatBytes(f.size)}</span>
          {[f.subject, f.topic].filter(Boolean).length > 0 && <span className={styles.dot}>{[f.subject, f.topic].filter(Boolean).join(' · ')}</span>}
        </div>
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.iconButton} onClick={() => setPreviewing(f)} aria-label={`${f.name} aç`} title="Aç"><Eye size={18} aria-hidden="true" /></button>
        <DownloadButton bucket={FILES_BUCKET} path={f.path} name={f.name} compact />
      </div>
    </li>
  );

  return (
    <section className={styles.page} aria-label="Ders materyalleri">
      <div className={styles.filters} style={{ gridTemplateColumns: subjects.length ? 'minmax(200px, 2fr) minmax(160px, 1fr)' : 'minmax(0, 1fr)' }}>
        <label className={styles.search}>
          <span className={styles.srOnly}>Materyallerde ara</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dosya, konu ya da öğretmen ara" />
        </label>
        {subjects.length > 0 && <CustomSelect value={subject} onChange={setSubject} options={[{ value: ANY, label: 'Bütün dersler' }, ...subjects]} />}
      </div>

      {visible.length === 0 ? <p className={styles.muted}>Aramaya uyan materyal yok.</p> : (
        <div className={styles.materials}>
          {visible.map((r) => (
            <article key={r.id} className={styles.matCard}>
              <div className={styles.matHead}>
                {r.set ? (
                  <strong><Layers size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />{r.set.title}</strong>
                ) : (
                  <strong>{r.file?.subject || 'Ders materyali'}</strong>
                )}
                <span>{r.teacher_name} · {dateLabel(r.created_at)}</span>
              </div>
              {r.set?.description && <p className={styles.cardText}>{r.set.description}</p>}
              {r.note && <p className={styles.note}>{r.note}</p>}
              <ul className={styles.list} aria-label={r.set ? `${r.set.title} dosyaları` : 'Dosya'}>
                {filesOf(r).map(fileRow)}
              </ul>
            </article>
          ))}
        </div>
      )}

      {previewing && <FilePreview bucket={FILES_BUCKET} path={previewing.path} name={previewing.name} mime={previewing.mime} onClose={() => setPreviewing(null)} />}
    </section>
  );
}
