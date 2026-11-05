'use client';

import React, { useEffect, useState } from 'react';
import { Save } from '../icons';
import { EXAMS, ExamId, GradeRow, listGrades, saveGrades } from '../../lib/teacherData';
import { CollapsiblePanel, Notice, NoticeState, StudentSortToggle, useClassStudents } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

type Cells = Record<string, Partial<Record<ExamId, string>>>;

export function TeacherGradesPage({ selectedClass, defaultSubject }: { selectedClass: string; defaultSubject: string }) {
  const { students, loading, error } = useClassStudents(selectedClass);
  const [subject, setSubject] = useState(defaultSubject);
  const [activeSubject, setActiveSubject] = useState(defaultSubject);
  const [saved, setSaved] = useState<Cells>({});
  const [cells, setCells] = useState<Cells>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const studentIdsKey = students.map((s) => s.id).join(',');
  useEffect(() => {
    const ids = studentIdsKey ? studentIdsKey.split(',') : [];
    if (!ids.length || !activeSubject) return;
    let alive = true;
    listGrades(ids, activeSubject).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        setNotice({ kind: 'error', text: `Notlar alınamadı: ${res.error}` });
        return;
      }
      const next: Cells = {};
      res.data.forEach((g) => { next[g.student_id] = { ...next[g.student_id], [g.exam]: String(g.score) }; });
      setSaved(next);
      setCells(next);
    });
    return () => { alive = false; };
  }, [studentIdsKey, activeSubject]);

  const setCell = (studentId: string, exam: ExamId, value: string) =>
    setCells((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [exam]: value.replace(/[^\d.,]/g, '').replace(',', '.').slice(0, 6) } }));

  const average = (studentId: string) => {
    const vals = EXAMS.map((e) => cells[studentId]?.[e.id]).filter((v): v is string => !!v && !Number.isNaN(Number(v))).map(Number);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const handleSave = async () => {
    const upserts: GradeRow[] = [];
    const deletes: { student_id: string; exam: ExamId }[] = [];
    for (const s of students) {
      for (const e of EXAMS) {
        const now = (cells[s.id]?.[e.id] || '').trim();
        const before = (saved[s.id]?.[e.id] || '').trim();
        if (now === before) continue;
        if (now === '') { deletes.push({ student_id: s.id, exam: e.id }); continue; }
        const score = Number(now);
        if (Number.isNaN(score) || score < 0 || score > 100) {
          setNotice({ kind: 'error', text: `${s.name} – ${e.label}: not 0 ile 100 arasında olmalı.` });
          return;
        }
        upserts.push({ student_id: s.id, subject: activeSubject, exam: e.id, score });
      }
    }
    if (!upserts.length && !deletes.length) {
      setNotice({ kind: 'ok', text: 'Değişiklik yok, kaydedilecek bir şey bulunmadı.' });
      return;
    }
    setBusy(true);
    const res = await saveGrades(activeSubject, upserts, deletes);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Notlar kaydedilemedi: ${res.error}` });
      return;
    }
    setSaved(cells);
    setNotice({ kind: 'ok', text: `${activeSubject} notları kaydedildi (${upserts.length} not güncellendi${deletes.length ? `, ${deletes.length} not silindi` : ''}).` });
  };

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.pointsLayout}>
        <section className={styles.panel} aria-label="Not çizelgesi">
          {loading && <p className={styles.mutedText}>Öğrenciler yükleniyor…</p>}
          {error && <p className={styles.noticeError}>{error}</p>}
          {!loading && !error && students.length === 0 && <p className={styles.mutedText}>{selectedClass} sınıfında kayıtlı öğrenci yok.</p>}
          {students.length > 1 && <div className={styles.listSortBar}><StudentSortToggle /></div>}
          {students.length > 0 && (
            <div className={styles.tableScroll}>
              <table className={styles.gradeTable}>
                <thead>
                  <tr>
                    <th scope="col">Öğrenci</th>
                    {EXAMS.map((e) => <th key={e.id} scope="col">{e.label}</th>)}
                    <th scope="col">Ort.</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <th scope="row"><span>{s.name}</span><small>{s.student_number}</small></th>
                      {EXAMS.map((e) => (
                        <td key={e.id}>
                          <input inputMode="decimal" value={cells[s.id]?.[e.id] || ''} onChange={(ev) => setCell(s.id, e.id, ev.target.value)} aria-label={`${s.name} ${e.label}`} />
                        </td>
                      ))}
                      <td className={styles.gradeAvg}>{average(s.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className={styles.pointsAside}>
          <CollapsiblePanel title="Ders seçimi" summary={activeSubject || 'Ders seçilmedi'}>
            <form className={styles.inlineRow} onSubmit={(e) => { e.preventDefault(); if (subject.trim()) { setActiveSubject(subject.trim()); setNotice(null); } }}>
              <label className={`${styles.field} ${styles.growField}`}>Ders
                <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 80))} placeholder="Örn: Matematik" />
              </label>
              <button type="submit" className={`${styles.secondary} ${styles.alignEnd}`}>Dersi aç</button>
            </form>
            <p className={styles.mutedText}>Şu an: <strong>{activeSubject || 'Ders seçilmedi'}</strong>. Boş bırakılan not kaydedilmez; sildiğiniz not veritabanından da silinir.</p>
          </CollapsiblePanel>

          {students.length > 0 && (
            <div className={styles.stickyActions}>
              <button type="button" className={styles.primary} disabled={busy || !activeSubject} onClick={handleSave}><Save size={18} aria-hidden="true" />{busy ? 'Kaydediliyor…' : 'Notları kaydet'}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
