'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Spinner } from '../Spinner';
import { CHOICE_LETTERS, getQuizReport, QUIZ_MODE_LABEL, QuizMode, QuizReport as Report } from '../../lib/quizData';
import f from '../files/Files.module.css';
import styles from './Quiz.module.css';
import ts from '../teacher/TeacherDashboard.module.css';

interface Student { id: string; name: string; student_number?: string }

/** Öğretmen: quiz sonuçları (öğrenci bazında puan, soru bazında doğru oranı) */
export function QuizReport({ homeworkId, mode, dueAt, students }: { homeworkId: string; mode: QuizMode; dueAt: string | null; students: Student[] }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    getQuizReport(homeworkId).then((res) => {
      if (!alive) return;
      if (res.ok) setReport(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, [homeworkId]);

  const data = useMemo(() => {
    if (!report) return null;
    const total = report.items.length || 1;
    const attempt = new Map(report.attempts.map((a) => [a.student_id, a]));
    const correctBy = new Map<string, number>();
    report.answers.forEach((a) => { if (a.correct) correctBy.set(a.student_id, (correctBy.get(a.student_id) || 0) + 1); });
    const rows = students.map((s) => {
      const a = attempt.get(s.id);
      return {
        id: s.id,
        name: s.name,
        state: !a ? 'Girmedi' : a.finished_at ? 'Bitirdi' : 'Devam ediyor',
        correct: correctBy.get(s.id) || 0,
        percent: a ? Math.round((a.score * 100) / total) : null,
      };
    }).sort((x, y) => (y.percent ?? -1) - (x.percent ?? -1) || x.name.localeCompare(y.name, 'tr'));
    const items = report.items.map((it) => {
      const ans = report.answers.filter((a) => a.item_id === it.id && a.tries > 0);
      const right = ans.filter((a) => a.correct).length;
      // En çok seçilen yanlış şık (sınavda son seçim; alıştırmada son deneme)
      const wrongCounts = new Map<number, number>();
      ans.filter((a) => !a.correct && a.choice != null).forEach((a) => wrongCounts.set(a.choice!, (wrongCounts.get(a.choice!) || 0) + 1));
      const topWrong = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      return { ...it, answered: ans.length, rate: ans.length ? Math.round((right * 100) / ans.length) : null, topWrong };
    });
    const joined = rows.filter((r) => r.percent != null);
    const avg = joined.length ? Math.round(joined.reduce((a, r) => a + (r.percent || 0), 0) / joined.length) : null;
    return { rows, items, joined: joined.length, finished: rows.filter((r) => r.state === 'Bitirdi').length, avg };
  }, [report, students]);

  return (
    <section className={ts.panel} aria-label="Quiz sonuçları">
      <h2 className={ts.panelTitle}>Quiz sonuçları · {QUIZ_MODE_LABEL[mode]}</h2>
      {error && <p className={f.error} role="alert">Sonuçlar alınamadı: {error}</p>}
      {!data && !error && <Spinner label="Sonuçlar yükleniyor…" />}
      {data && (
        <>
          <p className={f.muted} style={{ marginBottom: 12 }}>
            {data.joined}/{students.length} öğrenci katıldı · {data.finished} bitirdi{data.avg != null ? ` · ortalama %${data.avg}` : ''}.
            {' '}Sonuçlar aşağıdaki kontrol listesine otomatik işlenir (%70+ Yaptı, %40–69 Kısmen, altı Yapmadı); dilerseniz değiştirip kaydedebilirsiniz.
            {mode === 'exam' && dueAt && new Date(dueAt).getTime() > now ? ` Öğrenciler sonucu ${new Date(dueAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} sonrasında görür.` : ''}
          </p>
          <div className={styles.reportGrid}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={f.srOnly}>Öğrenci sonuçları</caption>
                <thead><tr><th scope="col">Öğrenci</th><th scope="col">Durum</th><th scope="col" className={styles.num}>Doğru</th><th scope="col" className={styles.num}>Başarı</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <th scope="row" style={{ fontWeight: 600 }}>{r.name}</th>
                      <td>{r.state}</td>
                      <td className={styles.num}>{r.percent == null ? '—' : `${r.correct}/${data.items.length}`}</td>
                      <td className={styles.num}>{r.percent == null ? '—' : `%${r.percent}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={f.srOnly}>Soru bazında doğru oranı</caption>
                <thead><tr><th scope="col">Soru</th><th scope="col">Doğru oranı</th><th scope="col">En çok yanlış</th></tr></thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={it.id}>
                      <th scope="row" style={{ fontWeight: 600, maxWidth: 220 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.body}>{i + 1}. {it.body}</span>
                        <small className={f.muted} style={{ fontSize: 12 }}>Doğru: {CHOICE_LETTERS[it.correct_index]}</small>
                      </th>
                      <td>
                        {it.rate == null ? '—' : (
                          <span style={{ display: 'grid', gap: 4 }}>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>%{it.rate} <small className={f.muted} style={{ fontSize: 12 }}>({it.answered} kişi)</small></span>
                            <span className={styles.rateBar} aria-hidden="true"><span style={{ width: `${it.rate}%` }} /></span>
                          </span>
                        )}
                      </td>
                      <td>{it.topWrong ? `${CHOICE_LETTERS[it.topWrong[0]]} (${it.topWrong[1]})` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
