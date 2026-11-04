'use client';

import React, { useState } from 'react';
import { Megaphone } from '../icons';
import { classConversationId, sendMessage } from '../../lib/teacherData';
import { Notice, NoticeState } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

interface TeacherBulkMessagePageProps {
  classNames: string[];
  selectedClass: string;
  schoolId: string | null;
}

/** Seçilen sınıfların veli gruplarına aynı mesajı gönderir */
export function TeacherBulkMessagePage({ classNames, selectedClass, schoolId }: TeacherBulkMessagePageProps) {
  const [targets, setTargets] = useState<string[]>(selectedClass ? [selectedClass] : []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const toggle = (c: string) => setTargets((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!targets.length) {
      setNotice({ kind: 'error', text: 'En az bir sınıf seçin.' });
      return;
    }
    setBusy(true);
    const sent: string[] = [];
    const failed: string[] = [];
    for (const c of targets) {
      const res = await sendMessage(classConversationId(schoolId, c), text);
      if (res.ok) sent.push(c);
      else failed.push(`${c} (${res.error})`);
    }
    setBusy(false);
    if (failed.length) {
      setNotice({ kind: 'error', text: `Gönderilemedi: ${failed.join(', ')}${sent.length ? `. Gönderilen: ${sent.join(', ')}` : ''}` });
      return;
    }
    setNotice({ kind: 'ok', text: `Mesaj ${sent.join(', ')} veli gruplarına gönderildi. Veliler panelde "Sınıf grubu" konuşmasında görür.` });
    setText('');
  };

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className={styles.panel}>
        <form className={styles.formGrid} onSubmit={handleSend}>
          <fieldset className={`${styles.statusGroup} ${styles.fullRow}`}>
            <legend>Gönderilecek sınıflar</legend>
            {!classNames.length && <p className={styles.mutedText}>Önce &quot;Sınıflarım&quot; sayfasından sınıf ekleyin.</p>}
            <div className={styles.chipRow}>
              {classNames.map((c) => (
                <label key={c} className={`${styles.chip} ${targets.includes(c) ? styles.chipActive : ''}`}>
                  <input type="checkbox" className={styles.visuallyHidden} checked={targets.includes(c)} onChange={() => toggle(c)} />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={`${styles.field} ${styles.fullRow}`}>Mesaj
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={5} required placeholder="Örn: Yarın veli toplantımız saat 15.00'te sınıfımızda yapılacaktır." />
          </label>
          <div className={styles.formActions}>
            <span className={styles.mutedText}>{text.length}/2000</span>
            <button type="submit" className={styles.primary} disabled={busy || !text.trim() || !targets.length}><Megaphone size={18} aria-hidden="true" />{busy ? 'Gönderiliyor…' : `${targets.length} sınıfa gönder`}</button>
          </div>
        </form>
      </section>
      <p className={styles.hintText}>Mesaj uygulama içinde iletilir. SMS veya e-posta gönderimi henüz yok.</p>
    </div>
  );
}
