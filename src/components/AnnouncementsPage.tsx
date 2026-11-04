'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from './icons';
import { AnnouncementRow, listAnnouncements } from '../lib/studentData';
import { createAnnouncement, deleteAnnouncement } from '../lib/teacherData';
import { AnnouncementsList } from './student/StudentPortal';
import { Notice, NoticeState, formatDateTime } from './teacher/TeacherUi';
import styles from './teacher/TeacherDashboard.module.css';

/** Duyuruları veritabanından okur; canManage verilirse yeni duyuru yayınlama ve silme açılır */
export function AnnouncementsPage({ canManage = false }: { canManage?: boolean }) {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = (res: Awaited<ReturnType<typeof listAnnouncements>>) => {
    setLoaded(true);
    if (res.ok) setItems(res.data);
    else setNotice({ kind: 'error', text: `Duyurular alınamadı: ${res.error}` });
  };
  const reload = useCallback(async () => apply(await listAnnouncements()), []);

  useEffect(() => {
    let alive = true;
    listAnnouncements().then((res) => { if (alive) apply(res); });
    return () => { alive = false; };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await createAnnouncement(title, content, urgent ? 'urgent' : 'normal');
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Duyuru yayınlanamadı: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `"${title.trim()}" duyurusu yayınlandı.` });
    setTitle('');
    setContent('');
    setUrgent(false);
    reload();
  };

  const handleDelete = async (a: AnnouncementRow) => {
    if (!window.confirm(`"${a.title}" duyurusu silinsin mi?`)) return;
    const res = await deleteAnnouncement(a.id);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Duyuru silinemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: 'Duyuru silindi.' });
    reload();
  };

  if (!canManage) {
    return (
      <div className={styles.pageBody}>
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <AnnouncementsList announcements={items} loaded={loaded} />
      </div>
    );
  }

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className={styles.panel}>
        <form className={styles.formGrid} onSubmit={handleCreate}>
          <h2 className={styles.panelTitle}>Yeni duyuru</h2>
          <label className={`${styles.field} ${styles.fullRow}`}>Başlık
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} required />
          </label>
          <label className={`${styles.field} ${styles.fullRow}`}>Metin
            <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 4000))} rows={4} required />
          </label>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />Önemli olarak işaretle
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primary} disabled={busy || !title.trim() || !content.trim()}><Plus size={18} aria-hidden="true" />{busy ? 'Yayınlanıyor…' : 'Yayınla'}</button>
          </div>
        </form>
      </section>
      {loaded && !items.length && <p className={`${styles.panel} ${styles.mutedText}`}>Henüz duyuru yok.</p>}
      {items.map((a) => (
        <article key={a.id} className={styles.panel}>
          <h2 className={styles.panelTitle}>{a.priority === 'urgent' && <span className={styles.urgentPill}>Önemli</span>}{a.title}</h2>
          <p className={styles.announcementBody}>{a.content}</p>
          <div className={styles.listToolbar}>
            <p className={styles.mutedText}>{a.teacher_name} · {formatDateTime(a.created_at)}</p>
            <button type="button" className={styles.secondary} onClick={() => handleDelete(a)}><Trash2 size={16} aria-hidden="true" />Sil</button>
          </div>
        </article>
      ))}
    </div>
  );
}
