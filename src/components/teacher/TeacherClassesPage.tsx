'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Users } from '../icons';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { composeClassName } from '../../data/portalData';
import { addMyClass, removeMyClass, TeacherClassRow } from '../../lib/teacherData';
import { useDialog } from '../ConfirmDialog';
import { CollapsiblePanel, Notice, NoticeState } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

interface TeacherClassesPageProps {
  homeroomClass: string;
  classes: TeacherClassRow[];
  studentCounts: Record<string, number>;
  selectedClass: string;
  onSelectClass: (name: string) => void;
  onChanged: () => void;
  onOpenStudents: () => void;
}

export function TeacherClassesPage({ homeroomClass, classes, studentCounts, selectedClass, onSelectClass, onChanged, onOpenStudents }: TeacherClassesPageProps) {
  const [level, setLevel] = useState('');
  const [section, setSection] = useState('');
  const [busy, setBusy] = useState(false);
  const { confirm } = useDialog();
  const [notice, setNotice] = useState<NoticeState>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = composeClassName(level, section);
    if (!name) {
      setNotice({ kind: 'error', text: 'Sınıf seviyesi ve şube seçin.' });
      return;
    }
    if (name === homeroomClass) {
      setNotice({ kind: 'error', text: `${name} zaten rehberlik sınıfınız.` });
      return;
    }
    setBusy(true);
    const res = await addMyClass(name);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Sınıf eklenemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${name} sınıfı listenize eklendi.` });
    setLevel('');
    setSection('');
    onChanged();
    onSelectClass(name);
  };

  const handleRemove = async (row: TeacherClassRow) => {
    const ok = await confirm({
      title: 'Sınıfı Kaldır',
      message: `${row.class_name} sınıfı listenizden çıkarılsın mı?\nÖğrenciler silinmez.`,
      confirmText: 'Listeden Çıkar',
      cancelText: 'Vazgeç',
      variant: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    const res = await removeMyClass(row.id);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Sınıf çıkarılamadı: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${row.class_name} listenizden çıkarıldı.` });
    onChanged();
  };

  const rows: { key: string; name: string; homeroom: boolean; row?: TeacherClassRow }[] = [
    ...(homeroomClass ? [{ key: 'homeroom', name: homeroomClass, homeroom: true }] : []),
    ...classes.filter((c) => c.class_name !== homeroomClass).map((c) => ({ key: c.id, name: c.class_name, homeroom: false, row: c })),
  ];

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.pointsLayout}>
      <section className={styles.panel} aria-labelledby="classes-list-title">
        <h2 id="classes-list-title" className={styles.panelTitle}>Sınıflarım <span className={styles.countPill}>{rows.length}</span></h2>
        {rows.length === 0 && <p className={styles.mutedText}>Henüz sınıfınız yok. Yandaki alandan ders verdiğiniz sınıfları ekleyin.</p>}
        <ul className={styles.studentCards}>
          {rows.map((r) => (
            <li key={r.key} className={styles.studentCard}>
              <div className={styles.studentCardHead}>
                <span className={styles.studentAvatar} aria-hidden="true">{r.name}</span>
                <div className={styles.studentCardInfo}>
                  <strong>{r.name}{r.homeroom ? ' · Rehberlik sınıfı' : ''}</strong>
                  <span>{studentCounts[r.name] ?? 0} öğrenci{r.name === selectedClass ? ' · Şu an seçili' : ''}</span>
                </div>
                {r.name !== selectedClass && (
                  <button type="button" className={styles.secondary} onClick={() => onSelectClass(r.name)}>Seç</button>
                )}
                {r.row && (
                  <button type="button" className={styles.secondary} disabled={busy} onClick={() => handleRemove(r.row!)} aria-label={`${r.name} sınıfını listeden çıkar`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {homeroomClass && <p className={styles.mutedText}>Rehberlik sınıfınızı okul yönetimi belirler.</p>}
        <button type="button" className={styles.secondary} onClick={onOpenStudents}><Users size={18} aria-hidden="true" />Öğrenci ekle / düzenle</button>
      </section>

      <aside className={styles.pointsAside}>
      <CollapsiblePanel title="Sınıf ekle" summary="Yeni sınıf tanımla">
        <form className={styles.formGrid} onSubmit={handleAdd}>
          <h2 id="classes-add-title" className={styles.panelTitle}>Sınıf ekle</h2>
          <ClassLevelSelects
            idPrefix="add-class"
            level={level}
            section={section}
            onChange={(next) => { setLevel(next.level); setSection(next.section); }}
            renderField={({ id, label, control }) => <div key={id} className={styles.field}><label htmlFor={id}>{label}</label>{control}</div>}
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.primary} disabled={busy}><Plus size={18} aria-hidden="true" />Sınıfı ekle</button>
          </div>
        </form>
      </CollapsiblePanel>
      </aside>
      </div>
    </div>
  );
}
