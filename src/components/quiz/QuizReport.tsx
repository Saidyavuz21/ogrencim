'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from '../icons';
import { Spinner } from '../Spinner';
import { CHOICE_LETTERS, getQuizReport, QUIZ_MODE_LABEL, QuizAnswerRow, QuizMode, QuizReport as Report } from '../../lib/quizData';
import { downloadCsv, fileSlug } from '../../lib/reportData';
import { Modal } from '../files/FilesUi';
import { useQuizImages } from './useQuizImages';
import { RichText } from '../math/RichText';
import { stripRichAndMath } from '../math/richEditing';
import f from '../files/Files.module.css';
import styles from './Quiz.module.css';
import r from '../reports/Reports.module.css';
import ts from '../teacher/TeacherDashboard.module.css';

interface Student { id: string; name: string; student_number?: string }
type View = 'summary' | 'heat';

// Soru sütunu başlığı: başarı oranına göre mavi tonu (dataviz sıralı mavi, açık→koyu); oran yazıyla da var
const RATE_STEPS = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf'];
const rateColor = (rate: number) => RATE_STEPS[Math.min(RATE_STEPS.length - 1, Math.floor(rate / 20))];
const rateInk = (rate: number) => (rate >= 60 ? '#ffffff' : '#0b0b0b');

/** Öğretmen: quiz sonuçları (özet, ısı haritası, öğrencinin cevapları tek tek) */
export function QuizReport({ homeworkId, title, mode, dueAt, students }: { homeworkId: string; title?: string; mode: QuizMode; dueAt: string | null; students: Student[] }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [view, setView] = useState<View>('summary');
  const [inspect, setInspect] = useState<Student | null>(null);

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
    const answer = new Map(report.answers.map((a) => [`${a.student_id}|${a.item_id}`, a]));
    const correctBy = new Map<string, number>();
    report.answers.forEach((a) => { if (a.correct) correctBy.set(a.student_id, (correctBy.get(a.student_id) || 0) + 1); });
    const rows = students.map((s) => {
      const a = attempt.get(s.id);
      return {
        student: s,
        state: !a ? 'Girmedi' : a.finished_at ? 'Bitirdi' : 'Devam ediyor',
        correct: correctBy.get(s.id) || 0,
        percent: a ? Math.round((a.score * 100) / total) : null,
      };
    }).sort((x, y) => (y.percent ?? -1) - (x.percent ?? -1) || x.student.name.localeCompare(y.student.name, 'tr'));
    const items = report.items.map((it) => {
      const ans = report.answers.filter((a) => a.item_id === it.id && a.tries > 0);
      const right = ans.filter((a) => a.correct).length;
      const wrongCounts = new Map<number, number>();
      ans.filter((a) => !a.correct && a.choice != null).forEach((a) => wrongCounts.set(a.choice!, (wrongCounts.get(a.choice!) || 0) + 1));
      const topWrong = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      return { ...it, answered: ans.length, rate: ans.length ? Math.round((right * 100) / ans.length) : null, topWrong };
    });
    const joined = rows.filter((x) => x.percent != null);
    const avg = joined.length ? Math.round(joined.reduce((a, x) => a + (x.percent || 0), 0) / joined.length) : null;
    return { rows, items, answer, joined: joined.length, finished: rows.filter((x) => x.state === 'Bitirdi').length, avg };
  }, [report, students]);

  const exportCsv = () => {
    if (!data) return;
    const header = ['No', 'Ad Soyad', 'Durum', ...data.items.map((_, i) => `S${i + 1}`), 'Doğru', 'Başarı (%)'];
    const rows = data.rows.map((x) => [
      x.student.student_number ?? '', x.student.name, x.state,
      ...data.items.map((it) => {
        const a = data.answer.get(`${x.student.id}|${it.id}`);
        if (!a || !a.tries) return '';
        return `${a.choice != null ? CHOICE_LETTERS[a.choice] : ''}${a.correct ? ' (D)' : ' (Y)'}`;
      }),
      x.percent == null ? null : x.correct, x.percent,
    ]);
    rows.push([]);
    rows.push(['', 'Soru bazında doğru oranı', '', ...data.items.map((it) => (it.rate == null ? '' : `%${it.rate}`))]);
    rows.push(['', 'Doğru cevap', '', ...data.items.map((it) => CHOICE_LETTERS[it.correct_index])]);
    downloadCsv(`${fileSlug(title || 'quiz')}-sonuclar.csv`, header, rows);
  };

  return (
    <section className={ts.panel} aria-label="Quiz sonuçları" {...(inspect ? {} : { 'data-print-area': '' })}>
      <div className={r.cardHead}>
        <h2 className={ts.panelTitle}>Quiz sonuçları · {QUIZ_MODE_LABEL[mode]}</h2>
        {data && (
          <span className={`${r.toolbar} ${r.noPrint}`}>
            <span className={f.tabs} role="group" aria-label="Görünüm">
              <button type="button" aria-pressed={view === 'summary'} onClick={() => setView('summary')}>Özet</button>
              <button type="button" aria-pressed={view === 'heat'} onClick={() => setView('heat')}>Isı haritası</button>
            </span>
            <button type="button" className={r.button} onClick={exportCsv}><Download size={18} aria-hidden="true" />Excel’e aktar</button>
            <button type="button" className={r.button} onClick={() => window.print()}><Printer size={18} aria-hidden="true" />Yazdır / PDF</button>
          </span>
        )}
      </div>
      {error && <p className={f.error} role="alert">Sonuçlar alınamadı: {error}</p>}
      {!data && !error && <Spinner label="Sonuçlar yükleniyor…" />}
      {data && (
        <>
          <p className={f.muted} style={{ margin: '8px 0 12px' }}>
            {data.joined}/{students.length} öğrenci katıldı · {data.finished} bitirdi{data.avg != null ? ` · ortalama %${data.avg}` : ''}.
            {' '}Sonuçlar aşağıdaki kontrol listesine otomatik işlenir (%70+ Yaptı, %40–69 Kısmen, altı Yapmadı); dilerseniz değiştirip kaydedebilirsiniz.
            {mode === 'exam' && dueAt && new Date(dueAt).getTime() > now ? ` Öğrenciler sonucu ${new Date(dueAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} sonrasında görür.` : ''}
            {' '}Bir öğrencinin cevaplarını görmek için adına basın.
          </p>

          {view === 'summary' ? (
            <div className={styles.reportGrid}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className={f.srOnly}>Öğrenci sonuçları</caption>
                  <thead><tr><th scope="col">Öğrenci</th><th scope="col">Durum</th><th scope="col" className={styles.num}>Doğru</th><th scope="col" className={styles.num}>Başarı</th></tr></thead>
                  <tbody>
                    {data.rows.map((x) => (
                      <tr key={x.student.id}>
                        <th scope="row" style={{ fontWeight: 600 }}>
                          {x.percent == null ? x.student.name : <button type="button" className={r.rowButton} onClick={() => setInspect(x.student)}>{x.student.name}</button>}
                        </th>
                        <td>{x.state}</td>
                        <td className={styles.num}>{x.percent == null ? '—' : `${x.correct}/${data.items.length}`}</td>
                        <td className={styles.num}>{x.percent == null ? '—' : `%${x.percent}`}</td>
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
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stripRichAndMath(it.body)}>{i + 1}. {stripRichAndMath(it.body)}</span>
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
          ) : (
            <HeatMap data={data} mode={mode} onInspect={setInspect} />
          )}
        </>
      )}

      {inspect && report && (
        <AnswersDialog student={inspect} report={report} mode={mode} onClose={() => setInspect(null)} />
      )}
    </section>
  );
}

interface HeatModel {
  rows: { student: Student; state: string; correct: number; percent: number | null }[];
  items: { id: string; body: string; correct_index: number; rate: number | null; answered: number }[];
  answer: Map<string, QuizAnswerRow>;
}

/** Isı haritası: satırlar öğrenci, sütunlar soru; hücre doğru/yanlış/boş (işaret + renk), sütun başında doğru oranı */
function HeatMap({ data, mode, onInspect }: { data: HeatModel; mode: QuizMode; onInspect: (s: Student) => void }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <ul className={r.heatLegend} aria-label="Gösterge">
        <li><span className={`${r.heatCell} ${r.heatOk}`} aria-hidden="true">✓</span>Doğru</li>
        {mode === 'practice' && <li><span className={`${r.heatCell} ${r.heatOkLate}`} aria-hidden="true">✓2</span>2. ya da 3. denemede doğru</li>}
        <li><span className={`${r.heatCell} ${r.heatBad}`} aria-hidden="true">✗</span>Yanlış</li>
        <li><span className={`${r.heatCell} ${r.heatNone}`} aria-hidden="true">–</span>Boş</li>
        <li>Sütun başı: sorunun doğru oranı (koyu mavi = yüksek)</li>
      </ul>
      <div className={styles.tableWrap}>
        <table className={r.heat}>
          <caption className={f.srOnly}>Öğrenci ve soru bazında sonuçlar</caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left', paddingLeft: 4 }}>Öğrenci</th>
              {data.items.map((it, i) => (
                <th key={it.id} scope="col" title={stripRichAndMath(it.body)}>
                  {i + 1}
                  <small style={it.rate == null ? { background: '#f0efec', color: '#898781' } : { background: rateColor(it.rate), color: rateInk(it.rate) }}>
                    {it.rate == null ? '—' : `%${it.rate}`}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((x) => (
              <tr key={x.student.id}>
                <th scope="row">
                  {x.percent == null ? <span className={f.muted}>{x.student.name}</span> : <button type="button" className={r.rowButton} onClick={() => onInspect(x.student)}>{x.student.name}</button>}
                  {x.percent != null && <small className={f.muted} style={{ marginLeft: 6, fontSize: 12 }}>%{x.percent}</small>}
                </th>
                {data.items.map((it, i) => {
                  const a = data.answer.get(`${x.student.id}|${it.id}`);
                  const answered = !!a && a.tries > 0;
                  const late = mode === 'practice' && a?.correct && a.tries > 1;
                  const cls = !answered ? r.heatNone : a!.correct ? (late ? r.heatOkLate : r.heatOk) : r.heatBad;
                  const text = !answered ? '–' : a!.correct ? (late ? `✓${a!.tries}` : '✓') : '✗';
                  const label = `${x.student.name}, ${i + 1}. soru: ${!answered ? 'boş' : a!.correct ? `doğru${late ? ` (${a!.tries}. denemede)` : ''}` : `yanlış${a!.choice != null ? ` (${CHOICE_LETTERS[a!.choice]})` : ''}`}`;
                  return (
                    <td key={it.id}>
                      <span className={`${r.heatCell} ${cls}`} title={label} aria-label={label} role="img">{text}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Bir öğrencinin cevapları tek tek: seçtiği şık, deneme sayısı, doğru cevap, aldığı puan */
function AnswersDialog({ student, report, mode, onClose }: { student: Student; report: Report; mode: QuizMode; onClose: () => void }) {
  const urls = useQuizImages(report.items.map((i) => i.image_path));
  const mine = new Map(report.answers.filter((a) => a.student_id === student.id).map((a) => [a.item_id, a]));
  const attempt = report.attempts.find((a) => a.student_id === student.id);
  const total = report.items.length || 1;
  const percent = attempt ? Math.round((attempt.score * 100) / total) : 0;
  return (
    <Modal title={student.name} kicker={`Cevaplar · %${percent}${attempt?.finished_at ? '' : ' · bitirmedi'}`} onClose={onClose} wide>
      <div data-print-area style={{ display: 'grid', gap: 12 }}>
        <p className="print-only" style={{ margin: 0, fontWeight: 700 }}>{student.name} · quiz cevapları · %{percent}</p>
        <div className={`${r.toolbar} ${r.noPrint}`}>
          <span className={r.spacer} />
          <button type="button" className={r.button} onClick={() => window.print()}><Printer size={18} aria-hidden="true" />Yazdır / PDF</button>
        </div>
        <ol className={f.materials} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {report.items.map((it, i) => {
            const a = mine.get(it.id);
            const answered = !!a && a.tries > 0;
            return (
              <li key={it.id} className={f.matCard}>
                <p className={styles.qNumber}>
                  {i + 1}. soru · {!answered ? 'Boş' : a!.correct ? 'Doğru' : 'Yanlış'}
                  {answered && mode === 'practice' && ` · ${a!.tries} deneme · ${a!.points} puan`}
                </p>
                <div className={styles.qText} style={{ fontSize: 16 }}><RichText text={it.body} /></div>
                {it.image_path && urls[it.image_path] && (
                  // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
                  <img className={styles.questionImage} src={urls[it.image_path]} alt="Soru görseli" style={{ maxHeight: 160 }} />
                )}
                <ul className={styles.qChoices}>
                  {it.choices.map((c, ci) => (
                    <li key={ci} className={ci === it.correct_index ? styles.qCorrect : undefined} style={answered && ci === a!.choice && ci !== it.correct_index ? { color: '#8f2232', fontWeight: 600 } : undefined}>
                      <b>{CHOICE_LETTERS[ci]}) </b><RichText text={c} inline />
                      {ci === it.correct_index && <span> · doğru cevap</span>}
                      {answered && ci === a!.choice && <span> · öğrencinin {mode === 'practice' ? 'son ' : ''}cevabı</span>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </Modal>
  );
}
