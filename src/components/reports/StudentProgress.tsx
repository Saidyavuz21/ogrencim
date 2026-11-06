'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from '../icons';
import { Spinner } from '../Spinner';
import {
  downloadCsv, EXAM_ORDER, examLabel, fileSlug, fmt, GradeCell, listGradesFor, listPointEvents, mean, PointEvent, pointsTimeline, round1,
} from '../../lib/reportData';
import type { ExamId } from '../../lib/teacherData';
import { LineChart } from './Charts';
import styles from './Reports.module.css';

const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

/**
 * Öğrenci gelişimi: puanın zaman içindeki değişimi ve notların sınav sırasına göre değişimi.
 * Öğretmen (sınıf karnesinden) ve öğrenci (kendi sayfasından) aynı bileşeni kullanır; veri RLS ile sınırlı.
 */
export function StudentProgress({ studentId, studentName, currentPoints, self }: {
  studentId: string;
  studentName: string;
  currentPoints: number;
  /** Öğrencinin kendi sayfası (metinler "sen" diliyle) */
  self?: boolean;
}) {
  const [grades, setGrades] = useState<GradeCell[] | null>(null);
  const [events, setEvents] = useState<PointEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listGradesFor([studentId]), listPointEvents(studentId)]).then(([g, p]) => {
      if (!alive) return;
      if (!g.ok) { setError(g.error); return; }
      if (!p.ok) { setError(p.error); return; }
      setGrades(g.data);
      setEvents(p.data);
    });
    return () => { alive = false; };
  }, [studentId]);

  const timeline = useMemo(() => (events ? pointsTimeline(events, currentPoints) : []), [events, currentPoints]);

  const subjects = useMemo(() => {
    if (!grades) return [];
    const by = new Map<string, Map<ExamId, number>>();
    grades.forEach((g) => {
      if (!by.has(g.subject)) by.set(g.subject, new Map());
      by.get(g.subject)!.set(g.exam, g.score);
    });
    return Array.from(by.entries()).sort((a, b) => a[0].localeCompare(b[0], 'tr')).map(([subject, m]) => {
      const ordered = EXAM_ORDER.filter((e) => m.has(e)).map((e) => ({ exam: e, score: m.get(e)! }));
      const scores = ordered.map((o) => o.score);
      return { subject, scores: m, avg: round1(mean(scores)), trend: ordered.length >= 2 ? ordered[ordered.length - 1].score - ordered[0].score : null };
    });
  }, [grades]);

  // Sınav sırasına göre genel ortalama (o sınavı olan derslerin ortalaması)
  const usedExams = useMemo(() => EXAM_ORDER.filter((e) => subjects.some((s) => s.scores.has(e))), [subjects]);
  const examAverages = usedExams.map((e) => round1(mean(subjects.filter((s) => s.scores.has(e)).map((s) => s.scores.get(e)!))));
  const overall = round1(mean(subjects.map((s) => s.avg).filter((v): v is number => v != null)));

  if (error) return <p className={styles.error} role="alert">Gelişim bilgileri alınamadı: {error}</p>;
  if (!grades || !events) return <Spinner center label="Gelişim yükleniyor…" />;

  const exportCsv = () => {
    const header = ['Ders', ...usedExams.map(examLabel), 'Ortalama'];
    const rows = subjects.map((s) => [s.subject, ...usedExams.map((e) => s.scores.get(e) ?? null), s.avg]);
    rows.push([]);
    rows.push(['Tarih', 'Puan değişimi', 'Açıklama']);
    events.forEach((e) => rows.push([new Date(e.created_at).toLocaleString('tr-TR'), e.amount, e.reason]));
    downloadCsv(`${fileSlug(studentName)}-gelisim.csv`, header, rows);
  };

  const gained = timeline.length ? timeline[timeline.length - 1].value - timeline[0].value : 0;

  return (
    <div className={styles.page} data-print-area>
      <p className="print-only" style={{ margin: 0, fontWeight: 700 }}>{studentName} · Gelişim raporu · {new Date().toLocaleDateString('tr-TR')}</p>
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <span className={styles.spacer} />
        <button type="button" className={styles.button} onClick={exportCsv} disabled={!subjects.length && !events.length}><Download size={18} aria-hidden="true" />Excel’e aktar</button>
        <button type="button" className={styles.button} onClick={() => window.print()}><Printer size={18} aria-hidden="true" />Yazdır / PDF</button>
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}><span>Davranış puanı</span><strong>{currentPoints}</strong><small>{timeline.length > 1 ? `${gained >= 0 ? '+' : ''}${gained} (ilk kayıttan bu yana)` : 'Henüz değişim yok'}</small></div>
        <div className={styles.tile}><span>Not ortalaması</span><strong>{fmt(overall)}</strong><small>{subjects.length} ders</small></div>
        <div className={styles.tile}><span>Girilen not</span><strong>{grades.length}</strong><small>{usedExams.length ? usedExams.map(examLabel).join(', ') : 'Henüz yok'}</small></div>
      </div>

      <section className={styles.card} aria-label="Puan değişimi">
        {timeline.length > 1 ? (
          <LineChart
            title="Davranış puanının değişimi"
            labels={timeline.map((t) => shortDay(t.day))}
            series={[{ name: 'Puan', values: timeline.map((t) => t.value) }]}
            describe={`Puan ${timeline[0].value} ile başladı, şu an ${currentPoints}.`}
          />
        ) : <p className={styles.muted}>{self ? 'Puan geçmişin oluştukça burada grafik görünecek.' : 'Bu öğrencinin henüz puan geçmişi yok.'}</p>}
      </section>

      <section className={styles.card} aria-label="Notlar">
        {usedExams.length > 1 && (
          <LineChart
            title="Sınavlara göre not ortalaması"
            labels={usedExams.map(examLabel)}
            series={[{ name: 'Ortalama', values: examAverages }]}
            yMin={0}
            yMax={100}
          />
        )}
        {subjects.length === 0 ? <p className={styles.muted}>{self ? 'Henüz notun girilmedi.' : 'Bu öğrenciye henüz not girilmedi.'}</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Ders bazında notlar</caption>
              <thead>
                <tr><th scope="col">Ders</th>{usedExams.map((e) => <th key={e} scope="col" className={styles.num}>{examLabel(e)}</th>)}<th scope="col" className={styles.num}>Ortalama</th><th scope="col" className={styles.num}>Değişim</th></tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.subject}>
                    <th scope="row">{s.subject}</th>
                    {usedExams.map((e) => {
                      const v = s.scores.get(e);
                      return <td key={e} className={`${styles.num} ${v != null && v < 50 ? styles.low : ''}`}>{v == null ? '—' : fmt(v)}</td>;
                    })}
                    <td className={`${styles.num} ${s.avg != null && s.avg < 50 ? styles.low : ''}`}><b>{fmt(s.avg)}</b></td>
                    <td className={`${styles.num} ${s.trend != null && s.trend > 0 ? styles.trendUp : s.trend != null && s.trend < 0 ? styles.trendDown : ''}`}>
                      {s.trend == null ? '—' : `${s.trend > 0 ? '▲ +' : s.trend < 0 ? '▼ ' : ''}${fmt(s.trend)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.muted}>Değişim: dersteki ilk ve son not arasındaki fark. 50’nin altındaki notlar kırmızıyla gösterilir.</p>
      </section>
    </div>
  );
}
