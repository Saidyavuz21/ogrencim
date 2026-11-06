'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from './icons';
import { AnnouncementRow, listAnnouncements } from '../lib/studentData';
import { createAnnouncement, deleteAnnouncement } from '../lib/teacherData';
import { adminListSchools } from '../lib/adminData';
import { supabase, SchoolRecord } from '../lib/supabaseClient';
import { AnnouncementsList } from './student/StudentSections';
import { Notice, NoticeState, formatDateTime } from './teacher/TeacherUi';
import { CustomSelect } from './CustomSelect';
import { useDialog } from './ConfirmDialog';
import styles from './teacher/TeacherDashboard.module.css';
import own from './AnnouncementsPage.module.css';

const ALL_SCHOOLS = '__tum_okullar__';

interface AnnouncementsPageProps {
  /**
   * Yönetim yetkisi:
   *  - 'teacher': kendi okuluna yayınlar, yalnızca kendi duyurusunu siler
   *  - 'admin'  : bütün okullara ya da tek okula yayınlar, hepsini siler
   *  Verilmezse yalnızca okuma.
   */
  manager?: 'teacher' | 'admin';
}

/** Duyurular: okula göre ayrılır (RLS). Öğretmen ve süper admin yayınlar. */
export function AnnouncementsPage({ manager }: AnnouncementsPageProps) {
  const isAdmin = manager === 'admin';
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const { confirm } = useDialog();
  const [notice, setNotice] = useState<NoticeState>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [target, setTarget] = useState(ALL_SCHOOLS);
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
    supabase.auth.getSession().then(({ data }) => { if (alive) setMyId(data.session?.user.id ?? null); });
    if (isAdmin) adminListSchools().then((list) => { if (alive) setSchools(list.filter((s) => s.status === 'approved')); });
    return () => { alive = false; };
  }, [isAdmin]);

  const targetLabel = target === ALL_SCHOOLS ? 'bütün okullara' : `${schools.find((s) => s.id === target)?.name || 'seçilen okula'}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await createAnnouncement(title, content, urgent ? 'urgent' : 'normal', isAdmin && target !== ALL_SCHOOLS ? target : null);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Duyuru yayınlanamadı: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: isAdmin ? `"${title.trim()}" duyurusu ${targetLabel} yayınlandı.` : `"${title.trim()}" duyurusu okulunuzda yayınlandı.` });
    setTitle('');
    setContent('');
    setUrgent(false);
    reload();
  };

  const handleDelete = async (a: AnnouncementRow) => {
    const ok = await confirm({
      title: 'Duyuruyu Sil',
      message: `"${a.title}" duyurusu silinsin mi?\nBu işlem geri alınamaz.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await deleteAnnouncement(a.id);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Duyuru silinemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: 'Duyuru silindi.' });
    reload();
  };

  if (!manager) {
    return (
      <div className={styles.pageBody}>
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <AnnouncementsList announcements={items} loaded={loaded} />
      </div>
    );
  }

  /** Kime gittiği: admin her duyuruda görür; öğretmen yalnızca "bütün okullar" duyurularında */
  const audienceOf = (a: AnnouncementRow) => {
    if (a.school_id === null) return 'Bütün okullar';
    return isAdmin ? a.school_name || 'Okul' : null;
  };

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className={styles.panel}>
        <form className={styles.formGrid} onSubmit={handleCreate}>
          <h2 className={styles.panelTitle}>Yeni duyuru</h2>
          {isAdmin && (
            <div className={`${styles.field} ${styles.fullRow}`}>
              <label htmlFor="announcement-target">Kime</label>
              <CustomSelect
                id="announcement-target"
                value={target}
                onChange={setTarget}
                options={[
                  { value: ALL_SCHOOLS, label: 'Bütün okullar' },
                  ...schools.map((s) => ({ value: s.id, label: `${s.name} (${s.district}/${s.city})` })),
                ]}
                placeholder="Bütün okullar"
              />
            </div>
          )}
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
            <span className={styles.mutedText}>
              {isAdmin
                ? (target === ALL_SCHOOLS ? 'Bütün okulların öğretmen ve öğrencileri görür.' : 'Yalnızca seçilen okulun öğretmen ve öğrencileri görür.')
                : 'Okulunuzdaki öğretmenler ve öğrenciler görür.'}
            </span>
            <button type="submit" className={styles.primary} disabled={busy || !title.trim() || !content.trim()}><Plus size={18} aria-hidden="true" />{busy ? 'Yayınlanıyor…' : 'Yayınla'}</button>
          </div>
        </form>
      </section>
      {loaded && !items.length && <p className={`${styles.panel} ${styles.mutedText}`}>Henüz duyuru yok.</p>}
      {items.map((a) => {
        const audience = audienceOf(a);
        const canDelete = isAdmin || (a.author_id !== null && a.author_id === myId);
        return (
          <article key={a.id} className={styles.panel}>
            <h2 className={styles.panelTitle}>
              {a.priority === 'urgent' && <span className={styles.urgentPill}>Önemli</span>}
              {a.title}
            </h2>
            {audience && <span className={own.audience}>{audience}</span>}
            <p className={styles.announcementBody}>{a.content}</p>
            <div className={styles.listToolbar}>
              <p className={styles.mutedText}>{a.teacher_name} · {formatDateTime(a.created_at)}</p>
              {canDelete && (
                <button type="button" className={styles.secondary} onClick={() => handleDelete(a)}><Trash2 size={16} aria-hidden="true" />Sil</button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
