'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2, CheckSquare, Calendar } from '../icons';
import { ALLOWED_FILE_TYPES, createHomework, deleteHomework, formatBytes, HomeworkRow, listMyHomeworks, validateHomeworkFiles } from '../../lib/teacherData';
import { AttachmentList, CollapsiblePanel, Notice, NoticeState, formatDate } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

/** Başlık ayrıca istenmez: "Hayat bilgisi ödevi · 6 Kasım" */
const autoTitle = (subject: string) => {
  const s = subject.trim() || 'Genel';
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return `${s.charAt(0).toLocaleUpperCase('tr-TR')}${s.slice(1)} ödevi · ${date}`;
};

interface TeacherAssignmentsPageProps {
  selectedClass: string;
  classNames: string[];
  defaultSubject: string;
  onOpenCheck: (homeworkId: string, className: string) => void;
}

export function TeacherAssignmentsPage({ selectedClass, classNames, defaultSubject, onOpenCheck }: TeacherAssignmentsPageProps) {
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState(false);

  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState(selectedClass || classNames[0] || '');
  const [dueDate, setDueDate] = useState('');
  const [link, setLink] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    const next = Array.from(list || []);
    const problem = validateHomeworkFiles(next);
    if (problem) {
      setNotice({ kind: 'error', text: problem });
      setFiles([]);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setNotice(null);
    setFiles(next);
  };

  const apply = (res: Awaited<ReturnType<typeof listMyHomeworks>>) => {
    setLoading(false);
    if (res.ok) setHomeworks(res.data);
    else setNotice({ kind: 'error', text: `Ödevler alınamadı: ${res.error}` });
  };
  const reload = useCallback(async () => apply(await listMyHomeworks()), []);

  useEffect(() => {
    let alive = true;
    listMyHomeworks().then((res) => { if (alive) apply(res); });
    return () => { alive = false; };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!subject.trim()) {
      setNotice({ kind: 'error', text: 'Ders adını yazın.' });
      return;
    }
    if (!description.trim() && !files.length && !link.trim()) {
      setNotice({ kind: 'error', text: 'Ödevin ne olduğunu yazın veya dosya / bağlantı ekleyin.' });
      return;
    }
    const title = autoTitle(subject);
    setBusy(true);
    const res = await createHomework({ title, subject, description, className, dueDate, points: 100, link, files });
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Ödev gönderilemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${title} ${className} sınıfına gönderildi${files.length ? ` (${files.length} dosya)` : ''}.` });
    setFiles([]);
    if (fileInput.current) fileInput.current.value = '';
    setDescription('');
    setDueDate('');
    setLink('');
    reload();
  };

  const handleDelete = async (hw: HomeworkRow) => {
    if (!window.confirm(`"${hw.title}" ödevi silinsin mi? Kontrol kayıtları da silinir.`)) return;
    const res = await deleteHomework(hw.id, hw.attachments || []);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Ödev silinemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `"${hw.title}" silindi.` });
    reload();
  };

  const visible = selectedClass ? homeworks.filter((h) => h.class_name === selectedClass) : homeworks;

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.pointsLayout}>
        <section className={styles.panel} aria-labelledby="hw-list-title">
          <h2 id="hw-list-title" className={styles.panelTitle}>
            {selectedClass ? `${selectedClass} ödevleri` : 'Gönderdiğim ödevler'} <span className={styles.countPill}>{visible.length}</span>
          </h2>
          {loading && <p className={styles.mutedText}>Ödevler yükleniyor…</p>}
          {!loading && visible.length === 0 && <p className={styles.mutedText}>Henüz ödev göndermediniz.</p>}
          <ul className={styles.studentCards}>
            {visible.map((hw) => (
              <li key={hw.id} className={styles.studentCard}>
                <div className={styles.assignmentContent}>
                  <h3 className={styles.assignmentTitle}>{hw.title}</h3>
                  <div className={styles.assignmentMeta}>
                    <span>{hw.subject} · {hw.class_name || 'Sınıf yok'}</span>
                    {hw.due_date && <span className={styles.assignmentDue}><Calendar size={16} aria-hidden="true" />Son teslim: {formatDate(hw.due_date)}</span>}
                  </div>
                  {hw.description && <p className={styles.assignmentDescription}>{hw.description}</p>}
                  <AttachmentList attachments={hw.attachments} />
                  {hw.file_url && <a href={hw.file_url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>Bağlantıyı aç</a>}
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.secondary} onClick={() => handleDelete(hw)}><Trash2 size={16} aria-hidden="true" />Sil</button>
                  <button type="button" className={styles.primary} onClick={() => onOpenCheck(hw.id, hw.class_name || '')}><CheckSquare size={16} aria-hidden="true" />Kontrol et</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.pointsAside}>
            <CollapsiblePanel title="Yeni ödev" summary={className ? `${className} sınıfına gönder` : undefined}>
              <form className={styles.formGrid} onSubmit={handleCreate}>
                <h2 className={styles.panelTitle}>Yeni ödev</h2>
                <label className={styles.field}>Ders
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} required placeholder="Örn: Hayat bilgisi" />
                </label>
                <label className={styles.field}>Sınıf
                  <select value={className} onChange={(e) => setClassName(e.target.value)} required>
                    {!classNames.length && <option value="">Önce sınıf ekleyin</option>}
                    {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className={styles.field}>Teslim tarihi
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
                <label className={`${styles.field} ${styles.fullRow}`}>Ödev
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} placeholder="Öğrencinin ne yapacağını yazın. Örn: Ders kitabı sayfa 24-25'teki etkinlikleri yapın." />
                </label>
                <label className={styles.field}>Bağlantı (isteğe bağlı)
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                </label>
                <div className={`${styles.field} ${styles.fullRow}`}>
                  <label htmlFor="hw-files">Dosya ekle (PDF veya resim, en fazla 5 dosya, her biri 10 MB)</label>
                  <input id="hw-files" ref={fileInput} type="file" multiple accept={ALLOWED_FILE_TYPES.join(',')} className={styles.fileInput} onChange={(e) => handleFiles(e.target.files)} />
                  {files.length > 0 && (
                    <ul className={styles.fileList}>
                      {files.map((f) => <li key={f.name + f.size} className={styles.fileItem}><span>{f.name}</span><small>{formatBytes(f.size)}</small></li>)}
                    </ul>
                  )}
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={styles.primary} disabled={busy || !classNames.length}><Send size={18} aria-hidden="true" />{busy ? (files.length ? 'Dosyalar yükleniyor…' : 'Gönderiliyor…') : 'Ödevi gönder'}</button>
                </div>
              </form>
        </CollapsiblePanel>
      </aside>
    </div>
    </div >
  );
}
