'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { Save } from '../icons';
import { EXAMS, ExamId, GradeRow, listClassGrades, saveGrades } from '../../lib/teacherData';
import { branchSubject, subjectHue, subjectShortLabel, subjectsForClass } from '../../data/subjects';
import { Notice, NoticeState, StudentSortToggle, useClassStudents } from './TeacherUi';
import { Spinner } from '../Spinner';
import styles from './TeacherDashboard.module.css';

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;
type Tab = 'gir' | 'liste';

const OTHER = '__diger__';
const ALL_SUBJECTS = '__tum__';
const examLabel = (id: ExamId) => EXAMS.find((e) => e.id === id)?.label || id;
const keyOf = (subject: string, exam: string, studentId: string) => `${subject}|${exam}|${studentId}`;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Not girişi: "Not gir" sekmesinde ders + not türü seçilir, her öğrenciye tek not yazılır.
 * "Öğrenci notları" sekmesinde girilen notlar ders ders (veya tüm derslerin ortalaması) görülür.
 */
export function TeacherGradesPage({ selectedClass, defaultSubject }: { selectedClass: string; defaultSubject: string }) {
  const tabsId = useId();
  const [tab, setTab] = useState<Tab>('gir');
  const { students, loading, error } = useClassStudents(selectedClass);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [gradesLoaded, setGradesLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState(false);

  // Seçimler (Not gir)
  const subjectOptions = useMemo(() => subjectsForClass(selectedClass), [selectedClass]);
  const [subjectChoice, setSubjectChoice] = useState(() => branchSubject(defaultSubject, selectedClass));
  const [customSubject, setCustomSubject] = useState('');
  const subject = subjectChoice === OTHER ? customSubject.trim() : subjectChoice;
  const [exam, setExam] = useState<ExamId | ''>('');
  // Yazılmış ama kaydedilmemiş notlar: "ders|tür|öğrenci" → değer
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Öğrenci notları sekmesi
  const [viewSubject, setViewSubject] = useState(ALL_SUBJECTS);

  const studentIdsKey = students.map((s) => s.id).join(',');
  useEffect(() => {
    const ids = studentIdsKey ? studentIdsKey.split(',') : [];
    let alive = true;
    listClassGrades(ids).then((res) => {
      if (!alive) return;
      setGradesLoaded(true);
      if (res.ok) setGrades(res.data);
      else setNotice({ kind: 'error', text: `Notlar alınamadı: ${res.error}` });
    });
    return () => { alive = false; };
  }, [studentIdsKey, version]);

  const savedValue = useMemo(() => {
    const map: Record<string, string> = {};
    grades.forEach((g) => { map[keyOf(g.subject, g.exam, g.student_id)] = fmt(g.score); });
    return map;
  }, [grades]);

  const valueFor = (studentId: string) => {
    const k = keyOf(subject, exam, studentId);
    return k in drafts ? drafts[k] : savedValue[k] || '';
  };
  const setValue = (studentId: string, raw: string) => {
    const v = raw.replace(/[^\d.,]/g, '').replace(',', '.').slice(0, 5);
    setDrafts((prev) => ({ ...prev, [keyOf(subject, exam, studentId)]: v }));
  };

  // Kaydedilmemiş değişiklikler (seçim değişse de kaybolmaz)
  const changes = Object.entries(drafts).filter(([k, v]) => v.trim() !== (savedValue[k] || ''));

  const handleSave = async () => {
    if (!changes.length) {
      setNotice({ kind: 'ok', text: 'Değişiklik yok, kaydedilecek bir şey bulunmadı.' });
      return;
    }
    // Ders bazında grupla (saveGrades ders başına çalışır)
    const bySubject = new Map<string, { upserts: GradeRow[]; deletes: { student_id: string; exam: ExamId }[] }>();
    for (const [k, raw] of changes) {
      const [subj, ex, studentId] = k.split('|') as [string, ExamId, string];
      const bucket = bySubject.get(subj) || { upserts: [], deletes: [] };
      const v = raw.trim();
      if (v === '') {
        bucket.deletes.push({ student_id: studentId, exam: ex });
      } else {
        const score = Number(v);
        if (Number.isNaN(score) || score < 0 || score > 100) {
          const name = students.find((s) => s.id === studentId)?.name || 'Öğrenci';
          setNotice({ kind: 'error', text: `${name} – ${subj} ${examLabel(ex)}: not 0 ile 100 arasında olmalı.` });
          return;
        }
        bucket.upserts.push({ student_id: studentId, subject: subj, exam: ex, score });
      }
      bySubject.set(subj, bucket);
    }
    setBusy(true);
    let saved = 0;
    let removed = 0;
    for (const [subj, b] of bySubject) {
      const res = await saveGrades(subj, b.upserts, b.deletes);
      if (!res.ok) {
        setBusy(false);
        setNotice({ kind: 'error', text: `Notlar kaydedilemedi: ${res.error}` });
        setVersion((v) => v + 1);
        return;
      }
      saved += b.upserts.length;
      removed += b.deletes.length;
    }
    setBusy(false);
    setDrafts({});
    setVersion((v) => v + 1);
    setNotice({ kind: 'ok', text: `Notlar kaydedildi (${saved} not${removed ? `, ${removed} not silindi` : ''}).` });
  };

  // ---- Öğrenci notları: ders listesi ve tablo ----
  const gradedSubjects = useMemo(
    () => Array.from(new Set(grades.map((g) => g.subject))).sort((a, b) => a.localeCompare(b, 'tr')),
    [grades]
  );
  const activeView = viewSubject === ALL_SUBJECTS || gradedSubjects.includes(viewSubject) ? viewSubject : ALL_SUBJECTS;
  const viewExams = EXAMS.filter((e) => grades.some((g) => g.subject === activeView && g.exam === e.id));
  const avg = (rows: GradeRow[]) => (rows.length ? fmt(rows.reduce((a, g) => a + g.score, 0) / rows.length) : '—');

  const ready = !!subject && !!exam;
  const filledCount = ready ? students.filter((s) => valueFor(s.id).trim() !== '').length : 0;

  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`${tabsId}-${id}`}
      aria-selected={tab === id}
      aria-controls={`${tabsId}-${id}-panel`}
      tabIndex={tab === id ? 0 : -1}
      className={styles.gradeTab}
      onClick={() => setTab(id)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const next = tab === 'gir' ? 'liste' : 'gir';
          setTab(next);
          document.getElementById(`${tabsId}-${next}`)?.focus();
        }
      }}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.gradeTabs} role="tablist" aria-label="Not sayfası">
        {tabButton('gir', 'Not gir')}
        {tabButton('liste', 'Öğrenci notları')}
      </div>

      {loading && <Spinner center label="Öğrenciler yükleniyor…" />}
      {error && <p className={styles.noticeError}>{error}</p>}
      {!loading && !error && students.length === 0 && <p className={styles.mutedText}>{selectedClass} sınıfında kayıtlı öğrenci yok.</p>}

      {/* ===== NOT GİR ===== */}
      {tab === 'gir' && students.length > 0 && (
        <div role="tabpanel" id={`${tabsId}-gir-panel`} aria-labelledby={`${tabsId}-gir`} className={styles.gradeEntry}>
          <section className={`${styles.panel} ${styles.formGrid}`}>
            <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
              <legend>1. Ders</legend>
              <div className={styles.subjectChips}>
                {subjectOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.subjectChip}
                    aria-pressed={subjectChoice === s}
                    title={s}
                    style={{ '--subject-hue': subjectHue(s) } as CSSVars}
                    onClick={() => setSubjectChoice(s)}
                  >
                    {subjectShortLabel(s)}
                  </button>
                ))}
                <button type="button" className={`${styles.subjectChip} ${styles.subjectChipOther}`} aria-pressed={subjectChoice === OTHER} onClick={() => setSubjectChoice(OTHER)}>
                  Diğer…
                </button>
              </div>
              {subjectChoice === OTHER && (
                <input
                  aria-label="Ders adı"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value.slice(0, 80))}
                  placeholder="Ders adını yazın"
                  autoFocus
                />
              )}
            </fieldset>
            <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
              <legend>2. Not türü</legend>
              <div className={styles.subjectChips}>
                {EXAMS.map((e) => (
                  <button key={e.id} type="button" className={styles.dueChip} aria-pressed={exam === e.id} onClick={() => setExam(e.id)}>
                    {e.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className={styles.studentList} aria-label="Öğrenci notları girişi">
            <div className={`${styles.listSortBar} ${styles.checkListBar}`}>
              <p className={styles.checkPointsHint}>
                {ready ? <><b>{subject}</b> · <b>{examLabel(exam as ExamId)}</b> · {filledCount}/{students.length} not</> : 'Önce ders ve not türünü seçin'}
              </p>
              {students.length > 1 && <StudentSortToggle />}
            </div>
            {!ready && <p className={`${styles.mutedText} ${styles.listPad}`}>Ders ve not türü seçilince öğrenci listesi not yazmaya açılır. Daha önce girilmiş notlar kutularda görünür.</p>}
            {ready && (
              <ul className={styles.gradeEntryList}>
                {students.map((s) => {
                  const val = valueFor(s.id);
                  const k = keyOf(subject, exam, s.id);
                  const changed = k in drafts && drafts[k].trim() !== (savedValue[k] || '');
                  return (
                    <li key={s.id} className={styles.gradeEntryRow}>
                      <label htmlFor={`grade-${s.id}`} className={styles.gradeEntryName}>
                        <span>{s.name}</span>
                        <small>No {s.student_number}</small>
                      </label>
                      <input
                        id={`grade-${s.id}`}
                        inputMode="decimal"
                        autoComplete="off"
                        className={`${styles.gradeEntryInput} ${changed ? styles.gradeEntryChanged : ''}`}
                        value={val}
                        placeholder="—"
                        onChange={(e) => setValue(s.id, e.target.value)}
                        onKeyDown={(e) => {
                          // Enter: bir alttaki öğrenciye geç (hızlı not girişi)
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`.${styles.gradeEntryInput}`));
                            inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
                          }
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className={styles.stickyActions}>
            <button type="button" className={styles.primary} disabled={busy || !changes.length} onClick={handleSave}>
              <Save size={18} aria-hidden="true" />
              {busy ? 'Kaydediliyor…' : changes.length ? `Notları kaydet (${changes.length})` : 'Notları kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* ===== ÖĞRENCİ NOTLARI ===== */}
      {tab === 'liste' && students.length > 0 && (
        <section role="tabpanel" id={`${tabsId}-liste-panel`} aria-labelledby={`${tabsId}-liste`} className={styles.panel}>
          {gradedSubjects.length === 0 ? (
            <p className={styles.mutedText}>{gradesLoaded ? `${selectedClass} sınıfına henüz not girilmedi. "Not gir" sekmesinden başlayın.` : 'Notlar yükleniyor…'}</p>
          ) : (
            <>
              <div className={styles.subjectChips} role="group" aria-label="Ders">
                <button type="button" className={`${styles.subjectChip} ${styles.subjectChipOther}`} aria-pressed={activeView === ALL_SUBJECTS} onClick={() => setViewSubject(ALL_SUBJECTS)}>
                  Tüm dersler
                </button>
                {gradedSubjects.map((s) => (
                  <button key={s} type="button" className={styles.subjectChip} aria-pressed={activeView === s} style={{ '--subject-hue': subjectHue(s) } as CSSVars} onClick={() => setViewSubject(s)}>
                    {subjectShortLabel(s)}
                  </button>
                ))}
              </div>
              <div className={`${styles.tableScroll} ${styles.gradeViewTable}`}>
                <table className={styles.gradeTable}>
                  <caption className={styles.visuallyHidden}>
                    {activeView === ALL_SUBJECTS ? `${selectedClass} – derslere göre not ortalamaları` : `${selectedClass} – ${activeView} notları`}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Öğrenci</th>
                      {activeView === ALL_SUBJECTS
                        ? gradedSubjects.map((s) => <th key={s} scope="col" title={s}>{subjectShortLabel(s)}</th>)
                        : viewExams.map((e) => <th key={e.id} scope="col">{e.label}</th>)}
                      <th scope="col">Ort.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => {
                      const mine = grades.filter((g) => g.student_id === st.id);
                      const scoped = activeView === ALL_SUBJECTS ? mine : mine.filter((g) => g.subject === activeView);
                      return (
                        <tr key={st.id}>
                          <th scope="row"><span>{st.name}</span><small>{st.student_number}</small></th>
                          {activeView === ALL_SUBJECTS
                            ? gradedSubjects.map((s) => <td key={s}>{avg(mine.filter((g) => g.subject === s))}</td>)
                            : viewExams.map((e) => {
                                const g = scoped.find((x) => x.exam === e.id);
                                return <td key={e.id}>{g ? fmt(g.score) : '—'}</td>;
                              })}
                          <td className={styles.gradeAvg}>
                            {activeView === ALL_SUBJECTS
                              ? (() => {
                                  // Genel ortalama: derslerin ortalamalarının ortalaması
                                  const subjAvgs = gradedSubjects
                                    .map((s) => mine.filter((g) => g.subject === s))
                                    .filter((r) => r.length)
                                    .map((r) => r.reduce((a, g) => a + g.score, 0) / r.length);
                                  return subjAvgs.length ? fmt(subjAvgs.reduce((a, b) => a + b, 0) / subjAvgs.length) : '—';
                                })()
                              : avg(scoped)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className={styles.mutedText}>Notları değiştirmek için &quot;Not gir&quot; sekmesinde ilgili ders ve not türünü seçin.</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
