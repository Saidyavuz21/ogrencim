'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer, TrendingUp } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { listClassStudents, type ClassStudent, type ExamId } from '../../lib/teacherData';
import {
  bandCounts, CheckCell, downloadCsv, EXAM_ORDER, examLabel, fileSlug, fmt, GRADE_BANDS, GradeCell, listClassChecks, listGradesFor, mean, round1,
} from '../../lib/reportData';
import { Modal } from '../files/FilesUi';
import { BarChart, LineChart } from './Charts';
import { StudentProgress } from './StudentProgress';
import styles from './Reports.module.css';

type Sort = 'no' | 'name' | 'avg' | 'points';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'no', label: 'Numaraya göre' },
  { value: 'name', label: 'Ada göre' },
  { value: 'avg', label: 'Not ortalamasına göre' },
  { value: 'points', label: 'Puana göre' },
];

/** Öğretmen: sınıf karnesi (ders bazında not ortalamaları ve dağılım, öğrenci özeti, dışa aktarma) */
export function ClassReportPage({ selectedClass }: { selectedClass: string }) {
  const [students, setStudents] = useState<ClassStudent[] | null>(null);
  const [grades, setGrades] = useState<GradeCell[]>([]);
  const [checks, setChecks] = useState<{ homeworkCount: number; checks: CheckCell[] }>({ homeworkCount: 0, checks: [] });
  const [error, setError] = useState<string | null>(null);
  const [subjectPick, setSubjectPick] = useState('');
  const [sort, setSort] = useState<Sort>('no');
  const [progressOf, setProgressOf] = useState<ClassStudent | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const st = await listClassStudents(selectedClass);
      if (!alive) return;
      if (!st.ok) { setError(st.error); return; }
      const [g, c] = await Promise.all([listGradesFor(st.data.map((s) => s.id)), listClassChecks(selectedClass)]);
      if (!alive) return;
      if (!g.ok) { setError(g.error); return; }
      setStudents(st.data);
      setGrades(g.data);
      if (c.ok) setChecks(c.data);
    })();
    return () => { alive = false; };
  }, [selectedClass]);

  const model = useMemo(() => {
    const list = students || [];
    // ders → öğrenci → sınav → not
    const by = new Map<string, Map<string, Map<ExamId, number>>>();
    grades.forEach((g) => {
      if (!by.has(g.subject)) by.set(g.subject, new Map());
      const m = by.get(g.subject)!;
      if (!m.has(g.student_id)) m.set(g.student_id, new Map());
      m.get(g.student_id)!.set(g.exam, g.score);
    });
    const subjects = Array.from(by.entries()).sort((a, b) => a[0].localeCompare(b[0], 'tr')).map(([subject, perStudent]) => {
      const avgs = Array.from(perStudent.values()).map((m) => mean(Array.from(m.values()))!).filter((v) => v != null);
      const exams = EXAM_ORDER.filter((e) => Array.from(perStudent.values()).some((m) => m.has(e)));
      return {
        subject,
        perStudent,
        avgs,
        avg: round1(mean(avgs)),
        min: avgs.length ? Math.min(...avgs) : null,
        max: avgs.length ? Math.max(...avgs) : null,
        failing: avgs.filter((v) => v < 50).length,
        exams,
        examAvgs: exams.map((e) => round1(mean(Array.from(perStudent.values()).filter((m) => m.has(e)).map((m) => m.get(e)!)))),
      };
    });
    const checksBy = new Map<string, { done: number; partial: number; total: number }>();
    checks.checks.forEach((c) => {
      const r = checksBy.get(c.student_id) || { done: 0, partial: 0, total: 0 };
      r.total++;
      if (c.status === 'yapti') r.done++;
      if (c.status === 'kismen') r.partial++;
      checksBy.set(c.student_id, r);
    });
    const rows = list.map((s) => {
      const subjAvgs = subjects.map((x) => x.perStudent.get(s.id)).filter((m): m is Map<ExamId, number> => !!m).map((m) => mean(Array.from(m.values()))!);
      const hw = checksBy.get(s.id);
      return {
        student: s,
        avg: round1(mean(subjAvgs)),
        hwRate: hw && hw.total ? Math.round(((hw.done + hw.partial * 0.5) * 100) / hw.total) : null,
        hw,
      };
    });
    const totalChecks = checks.checks.length;
    const doneWeighted = checks.checks.reduce((a, c) => a + (c.status === 'yapti' ? 1 : c.status === 'kismen' ? 0.5 : 0), 0);
    return {
      subjects,
      rows,
      classAvg: round1(mean(rows.map((r) => r.avg).filter((v): v is number => v != null))),
      hwRate: totalChecks ? Math.round((doneWeighted * 100) / totalChecks) : null,
      avgPoints: round1(mean(list.map((s) => s.points))),
    };
  }, [students, grades, checks]);

  if (error) return <p className={styles.error} role="alert">Sınıf karnesi alınamadı: {error}</p>;
  if (!students) return <Spinner center label="Sınıf karnesi hazırlanıyor…" />;
  if (!students.length) return <p className={styles.muted}>{selectedClass} sınıfında kayıtlı öğrenci yok.</p>;

  const subject = model.subjects.find((s) => s.subject === subjectPick) || model.subjects[0];
  const sortedRows = [...model.rows].sort((a, b) => {
    if (sort === 'name') return a.student.name.localeCompare(b.student.name, 'tr');
    if (sort === 'avg') return (b.avg ?? -1) - (a.avg ?? -1);
    if (sort === 'points') return b.student.points - a.student.points;
    return a.student.student_number.localeCompare(b.student.student_number, 'tr', { numeric: true });
  });

  const exportGrades = () => {
    const header = ['No', 'Ad Soyad', 'Ders', ...EXAMS_HEADER, 'Ortalama'];
    const rows: (string | number | null)[][] = [];
    for (const s of students) {
      for (const x of model.subjects) {
        const m = x.perStudent.get(s.id);
        if (!m) continue;
        rows.push([s.student_number, s.name, x.subject, ...EXAM_ORDER.map((e) => m.get(e) ?? null), round1(mean(Array.from(m.values())))]);
      }
    }
    downloadCsv(`${fileSlug(selectedClass)}-notlar.csv`, header, rows);
  };
  const exportPoints = () => {
    downloadCsv(`${fileSlug(selectedClass)}-puan-ve-odev.csv`, ['No', 'Ad Soyad', 'Davranış puanı', 'Artı', 'Eksi', 'Not ortalaması', 'Kontrol edilen ödev', 'Yaptı', 'Kısmen', 'Ödev yapma oranı (%)'],
      sortedRows.map((r) => [r.student.student_number, r.student.name, r.student.points, r.student.plus_count, r.student.minus_count, r.avg, r.hw?.total ?? 0, r.hw?.done ?? 0, r.hw?.partial ?? 0, r.hwRate]));
  };

  return (
    <div className={`${styles.page} ${styles.classReportWorkspace}`} {...(progressOf ? {} : { 'data-print-area': '' })}>
      <p className="print-only" style={{ margin: 0, fontWeight: 700 }}>{selectedClass} · Sınıf karnesi · {new Date().toLocaleDateString('tr-TR')}</p>
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <span className={styles.muted}>{selectedClass} · {students.length} öğrenci</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.button} onClick={exportGrades} disabled={!grades.length}><Download size={18} aria-hidden="true" />Notları Excel’e aktar</button>
        <button type="button" className={styles.button} onClick={exportPoints}><Download size={18} aria-hidden="true" />Puan ve ödev listesi</button>
        <button type="button" className={styles.button} onClick={() => window.print()}><Printer size={18} aria-hidden="true" />Yazdır / PDF</button>
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}><span>Sınıf not ortalaması</span><strong>{fmt(model.classAvg)}</strong><small>{model.subjects.length} ders · {grades.length} not</small></div>
        <div className={styles.tile}><span>Ödev yapma oranı</span><strong>{model.hwRate == null ? '—' : `%${model.hwRate}`}</strong><small>{checks.homeworkCount} ödeviniz · kısmen yarım sayılır</small></div>
        <div className={styles.tile}><span>Ortalama davranış puanı</span><strong>{fmt(model.avgPoints)}</strong><small>{students.length} öğrenci</small></div>
        <div className={styles.tile}><span>50’nin altında ders ortalaması</span><strong>{model.subjects.reduce((a, x) => a + x.failing, 0)}</strong><small>öğrenci-ders</small></div>
      </div>

      <section className={styles.card} aria-label="Ders bazında not ortalamaları">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Dersler</h2>
        </div>
        {model.subjects.length === 0 ? <p className={styles.muted}>Bu sınıfa henüz not girilmedi. Not girişi sayfasından not girdikçe karne dolar.</p> : (
          <>
            <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Ders sonuçları tablosu">
              <table className={styles.table}>
                <caption className={styles.srOnly}>Ders bazında not ortalamaları</caption>
                <thead><tr><th scope="col">Ders</th><th scope="col" className={styles.num}>Öğrenci</th><th scope="col" className={styles.num}>Ortalama</th><th scope="col" className={styles.num}>En düşük</th><th scope="col" className={styles.num}>En yüksek</th><th scope="col" className={styles.num}>50 altı</th></tr></thead>
                <tbody>
                  {model.subjects.map((x) => (
                    <tr key={x.subject} className={x.subject === subject?.subject ? styles.selected : undefined}>
                      <th scope="row"><button type="button" className={styles.rowButton} onClick={() => setSubjectPick(x.subject)} aria-pressed={x.subject === subject?.subject}>{x.subject}</button></th>
                      <td className={styles.num}>{x.avgs.length}</td>
                      <td className={`${styles.num} ${x.avg != null && x.avg < 50 ? styles.low : ''}`}><b>{fmt(x.avg)}</b></td>
                      <td className={styles.num}>{fmt(x.min)}</td>
                      <td className={styles.num}>{fmt(x.max)}</td>
                      <td className={`${styles.num} ${x.failing ? styles.low : ''}`}>{x.failing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subject && (
              <div className={styles.twoCol}>
                <BarChart
                  title={`${subject.subject} · not dağılımı`}
                  labels={GRADE_BANDS.map((b) => b.label)}
                  values={bandCounts(subject.avgs)}
                  describe={`${subject.subject} dersinde öğrenci ortalamalarının dağılımı: ${GRADE_BANDS.map((b, i) => `${b.name} ${bandCounts(subject.avgs)[i]} öğrenci`).join(', ')}`}
                />
                {subject.exams.length > 1 ? (
                  <LineChart
                    title={`${subject.subject} · sınavlara göre ortalama`}
                    labels={subject.exams.map(examLabel)}
                    series={[{ name: 'Sınıf ortalaması', values: subject.examAvgs }]}
                    yMin={0}
                    yMax={100}
                  />
                ) : (
                  <p className={styles.muted}>{subject.subject} dersinde {subject.exams.length ? `yalnızca ${examLabel(subject.exams[0])} notu var` : 'not yok'}; ikinci sınav girilince değişim grafiği görünür.</p>
                )}
              </div>
            )}
            <p className={styles.muted}>Dağılım öğrencilerin ders ortalamasına göredir (0–49 başarısız, 50–59 geçer, 60–69 orta, 70–84 iyi, 85–100 pekiyi). Grafiği görmek istediğiniz dersin adına basın.</p>
          </>
        )}
      </section>

      <section className={styles.card} aria-label="Öğrenciler">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Öğrenciler</h2>
          <span className={`${styles.noPrint} ${styles.reportSort}`}><CustomSelect value={sort} onChange={(v) => setSort(v as Sort)} options={SORTS} /></span>
        </div>
        <ul className={styles.mobileStudentReports} aria-label="Öğrenci özetleri">
          {sortedRows.map((r) => <li key={r.student.id}>
            <div className={styles.mobileReportStudent}><div><strong>{r.student.name}</strong><span>No {r.student.student_number}</span></div>
              <button type="button" className={styles.linkButton} onClick={() => setProgressOf(r.student)} aria-label={`${r.student.name} gelişimi`}><TrendingUp size={18} aria-hidden="true" />Gelişim</button>
            </div>
            <dl><div><dt>Not ort.</dt><dd className={r.avg != null && r.avg < 50 ? styles.low : undefined}>{fmt(r.avg)}</dd></div><div><dt>Puan</dt><dd>{r.student.points}</dd></div><div><dt>Ödev yapma</dt><dd>{r.hwRate == null ? '—' : `%${r.hwRate}`}</dd></div></dl>
          </li>)}
        </ul>
        <div className={`${styles.tableWrap} ${styles.studentReportTable}`}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Öğrenci özeti</caption>
            <thead><tr><th scope="col">No</th><th scope="col">Ad Soyad</th><th scope="col" className={styles.num}>Not ort.</th><th scope="col" className={styles.num}>Puan</th><th scope="col" className={styles.num}>Ödev yapma</th><th scope="col" className={styles.noPrint}><span className={styles.srOnly}>Gelişim</span></th></tr></thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.student.id}>
                  <td>{r.student.student_number}</td>
                  <th scope="row">{r.student.name}</th>
                  <td className={`${styles.num} ${r.avg != null && r.avg < 50 ? styles.low : ''}`}>{fmt(r.avg)}</td>
                  <td className={styles.num}>{r.student.points}</td>
                  <td className={styles.num}>{r.hwRate == null ? '—' : `%${r.hwRate}`}</td>
                  <td className={styles.noPrint}>
                    <button type="button" className={styles.linkButton} onClick={() => setProgressOf(r.student)} aria-label={`${r.student.name} gelişimi`}>
                      <TrendingUp size={16} aria-hidden="true" />Gelişim
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.muted}>Ödev yapma oranı yalnızca sizin bu sınıfa verdiğiniz ve kontrol ettiğiniz ödevlerden hesaplanır.</p>
      </section>

      {progressOf && (
        <Modal title={progressOf.name} kicker={`${selectedClass} · No ${progressOf.student_number} · Gelişim`} onClose={() => setProgressOf(null)} wide>
          <StudentProgress studentId={progressOf.id} studentName={progressOf.name} currentPoints={progressOf.points} />
        </Modal>
      )}
    </div>
  );
}

const EXAMS_HEADER = EXAM_ORDER.map(examLabel);
