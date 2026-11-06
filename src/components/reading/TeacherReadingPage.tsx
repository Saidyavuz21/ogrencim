'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Flag, Lock, Plus, Trash2 } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState, initialsOf, useClassStudents } from '../teacher/TeacherUi';
import { Spinner } from '../Spinner';
import {
  createReadingContest, deleteReadingContest, listClassReading, rankContest, rankGains, ReadingContest, ReadingResult,
  saveReadingResult, setReadingContestFinished,
} from '../../lib/readingData';
import { ReadingTimerModal } from './ReadingTimerModal';
import styles from './Reading.module.css';

type Tab = 'olcum' | 'hiz' | 'gelisim' | 'tablo';

const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
const MEDALS = { 1: 'Altın madalya', 2: 'Gümüş madalya', 3: 'Bronz madalya' } as const;

export function MedalBadge({ rank, medal }: { rank: number; medal: 1 | 2 | 3 | null }) {
  return (
    <span className={`${styles.rankNo} ${medal ? styles[`medal${medal}`] : ''}`} title={medal ? MEDALS[medal] : undefined}>
      {rank}
      {medal && <span className={styles.srOnly}> ({MEDALS[medal]})</span>}
    </span>
  );
}

export function TeacherReadingPage({ selectedClass }: { selectedClass: string }) {
  const { students, loading: stLoading, error: stError } = useClassStudents(selectedClass);
  const [contests, setContests] = useState<ReadingContest[]>([]);
  const [results, setResults] = useState<ReadingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState('');
  const [tab, setTab] = useState<Tab>('olcum');
  const [measuring, setMeasuring] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const { confirm } = useDialog();

  useEffect(() => {
    let alive = true;
    listClassReading(selectedClass).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (!res.ok) { setNotice({ kind: 'error', text: `Okuma yarışmaları alınamadı: ${res.error}` }); return; }
      setContests(res.data.contests);
      setResults(res.data.results);
    });
    return () => { alive = false; };
  }, [selectedClass]);

  const active = contests.find((c) => c.id === activeId) || contests[0];
  const finished = !!active?.finished_at;
  const previous = active ? contests.find((c) => c.seq < active.seq) : undefined;
  const byContest = useMemo(() => {
    const m = new Map<string, ReadingResult[]>();
    results.forEach((r) => { const list = m.get(r.contest_id) || []; list.push(r); m.set(r.contest_id, list); });
    return m;
  }, [results]);
  const activeResults = useMemo(() => (active ? byContest.get(active.id) || [] : []), [active, byContest]);
  const resultOf = useMemo(() => new Map(activeResults.map((r) => [r.student_id, r])), [activeResults]);
  const ranked = useMemo(() => rankContest(activeResults), [activeResults]);
  const gains = useMemo(() => (previous ? rankGains(activeResults, byContest.get(previous.id) || []) : []), [activeResults, previous, byContest]);
  const nameOf = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const avg = activeResults.length ? Math.round(activeResults.reduce((a, r) => a + r.words, 0) / activeResults.length) : null;

  const handleCreate = async () => {
    const open = contests.find((c) => !c.finished_at);
    if (open) {
      const ok = await confirm({
        title: 'Yeni Okuma Yarışması',
        message: `${open.title} henüz bitirilmedi. Yine de yeni yarışma oluşturulsun mu?`,
        confirmText: 'Evet, Oluştur',
        cancelText: 'Vazgeç',
        variant: 'warning',
      });
      if (!ok) return;
    }
    setBusy(true);
    const res = await createReadingContest(selectedClass);
    setBusy(false);
    if (!res.ok) { setNotice({ kind: 'error', text: `Oluşturulamadı: ${res.error}` }); return; }
    setContests((prev) => [res.data, ...prev]);
    setActiveId(res.data.id);
    setTab('olcum');
    setNotice({ kind: 'ok', text: `${res.data.title} oluşturuldu (${shortDate(res.data.contest_date)}). Öğrenci seçip ölçüme başlayın.` });
  };

  const replaceContest = (c: ReadingContest) => setContests((prev) => prev.map((x) => (x.id === c.id ? c : x)));

  const handleFinish = async () => {
    if (!active) return;
    const missing = students.length - activeResults.length;
    const ok = await confirm({
      title: 'Okuma Yarışmasını Bitir',
      message: `${active.title} bitirilince bugünkü sıralama kesinleşir; ölçülen sonuçlar artık değiştirilemez.${missing > 0 ? `\n${missing} öğrenci ölçülmedi; onları sonradan ekleyebilirsiniz (madalya almazlar).` : ''}`,
      confirmText: 'Evet, Bitir',
      cancelText: 'Vazgeç',
      variant: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    const res = await setReadingContestFinished(active.id, true);
    setBusy(false);
    if (!res.ok) { setNotice({ kind: 'error', text: `Bitirilemedi: ${res.error}` }); return; }
    replaceContest(res.data);
    setTab('hiz');
    setNotice({ kind: 'ok', text: `${active.title} bitti; sıralama kesinleşti.` });
  };

  const handleDelete = async () => {
    if (!active) return;
    const ok = await confirm({
      title: 'Yarışmayı Sil',
      message: `${active.title} ve bütün sonuçları kalıcı olarak silinsin mi?`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    const res = await deleteReadingContest(active.id);
    setBusy(false);
    if (!res.ok) { setNotice({ kind: 'error', text: res.error }); return; }
    setContests((prev) => prev.filter((c) => c.id !== active.id));
    setResults((prev) => prev.filter((r) => r.contest_id !== active.id));
    setActiveId('');
    setNotice({ kind: 'ok', text: `${active.title} silindi.` });
  };

  const handleSave = useCallback(async (studentId: string, words: number) => {
    if (!active) return 'Yarışma seçilmedi.';
    const res = await saveReadingResult(active.id, studentId, words);
    if (!res.ok) return res.error;
    setResults((prev) => [...prev.filter((r) => !(r.contest_id === active.id && r.student_id === studentId)), res.data]);
    setMeasuring(null);
    setNotice({ kind: 'ok', text: `${nameOf.get(studentId) || 'Öğrenci'}: ${words} kelime kaydedildi${res.data.late ? ' (sonradan)' : ''}.` });
    return null;
  }, [active, nameOf]);

  const closeModal = useCallback(() => setMeasuring(null), []);

  if (loading || stLoading) return <Spinner center label="Yükleniyor…" />;

  if (!contests.length) {
    return (
      <div className={styles.page}>
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <section className={styles.empty}>
          <BookOpen size={32} aria-hidden="true" />
          <h2>Henüz okuma yarışması yok</h2>
          <p>Yarışma oluşturun; öğrencileri tek tek seçip 1 dakikada okudukları kelime sayısını ölçün. Sıralama kendiliğinden yapılır.</p>
          <button type="button" className={styles.primaryButton} onClick={handleCreate} disabled={busy || !selectedClass}>
            <Plus size={18} aria-hidden="true" />Okuma yarışması oluştur
          </button>
        </section>
      </div>
    );
  }

  const measuredCount = activeResults.length;
  const tabs: [Tab, string][] = [['olcum', `Ölçüm ${measuredCount}/${students.length}`], ['hiz', 'En hızlılar'], ['gelisim', 'En çok gelişenler'], ['tablo', 'Gelişim tablosu']];
  const sortedContests = [...contests].sort((a, b) => a.seq - b.seq);
  const measuringStudent = measuring ? students.find((s) => s.id === measuring) : undefined;

  return (
    <div className={styles.page}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.toolbar}>
        <div className={styles.contestPick}>
          <CustomSelect
            value={active?.id || ''}
            onChange={(v) => { setActiveId(v); setNotice(null); }}
            options={contests.map((c) => ({ value: c.id, label: c.title, description: shortDate(c.contest_date), badge: c.finished_at ? 'Bitti' : 'Sürüyor' }))}
          />
        </div>
        <span className={`${styles.statusChip} ${finished ? styles.statusDone : styles.statusLive}`}>
          {finished ? <><Lock size={14} aria-hidden="true" />Sıralama kesinleşti</> : 'Sürüyor'}
        </span>
        <div className={styles.toolbarActions}>
          {!finished && (
            <button type="button" className={styles.secondaryButton} onClick={handleFinish} disabled={busy}>
              <Flag size={18} aria-hidden="true" />Okuma yarışmasını bitir
            </button>
          )}
          <button type="button" className={styles.primaryButton} onClick={handleCreate} disabled={busy}>
            <Plus size={18} aria-hidden="true" />Okuma yarışması oluştur
          </button>
          <button type="button" className={styles.iconButton} onClick={handleDelete} disabled={busy} aria-label={`${active?.title} sil`} title="Yarışmayı sil">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.summary}>
        <div><strong>{measuredCount}</strong><span>ölçülen</span></div>
        <div><strong>{students.length - measuredCount}</strong><span>ölçülmeyen</span></div>
        <div><strong>{avg ?? '—'}</strong><span>sınıf ortalaması (kelime/dk)</span></div>
        <div><strong>{ranked[0]?.words ?? '—'}</strong><span>en yüksek</span></div>
      </div>

      <div className={styles.tabs} role="group" aria-label="Görünüm">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {stError && <p className={styles.error}>{stError}</p>}

      {tab === 'olcum' && (
        <ul className={styles.list} aria-label="Öğrenciler">
          {students.map((s) => {
            const r = resultOf.get(s.id);
            const locked = finished && !!r && !r.late;
            return (
              <li key={s.id} className={styles.row}>
                <span className={styles.avatar} aria-hidden="true">{initialsOf(s.name)}</span>
                <span className={styles.who}>
                  <strong>{s.name}</strong>
                  <span>No {s.student_number}</span>
                </span>
                {r ? (
                  <span className={styles.result}>
                    <strong>{r.words}</strong> kelime
                    {r.late && <span className={styles.lateTag}>sonradan</span>}
                  </span>
                ) : (
                  <span className={styles.pending}>Ölçülmedi</span>
                )}
                {locked ? (
                  <span className={styles.lockNote} title="Yarışma bitti; sonuç kesinleşti"><Lock size={16} aria-hidden="true" /></span>
                ) : (
                  <button type="button" className={r ? styles.secondaryButton : styles.primaryButton} onClick={() => setMeasuring(s.id)}>
                    {r ? 'Yeniden ölç' : finished ? 'Sonradan ekle' : 'Ölç'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'hiz' && (
        ranked.length === 0 ? <p className={styles.muted}>Henüz ölçülen öğrenci yok.</p> : (
          <ol className={styles.list} aria-label="En hızlılar">
            {ranked.map((r) => (
              <li key={r.studentId} className={`${styles.row} ${r.medal ? styles.podiumRow : ''}`}>
                <MedalBadge rank={r.rank} medal={r.medal} />
                <span className={styles.who}><strong>{nameOf.get(r.studentId) || 'Öğrenci'}</strong>{r.late && <span>sonradan ölçüldü · madalya almaz</span>}</span>
                <span className={styles.result}><strong>{r.words}</strong> kelime/dk</span>
              </li>
            ))}
          </ol>
        )
      )}

      {tab === 'gelisim' && (
        !previous ? <p className={styles.muted}>Gelişim, ikinci yarışmadan itibaren bir öncekine göre hesaplanır.</p>
          : gains.length === 0 ? <p className={styles.muted}>{previous.title} ile bu yarışmada birlikte ölçülen öğrenci yok.</p> : (
            <>
              <p className={styles.muted}>{previous.title} ile karşılaştırma. İki yarışmada da ölçülen öğrenciler.</p>
              <ol className={styles.list} aria-label="En çok gelişenler">
                {gains.map((g) => (
                  <li key={g.studentId} className={styles.row}>
                    <MedalBadge rank={g.rank} medal={g.gain > 0 && g.rank <= 3 ? (g.rank as 1 | 2 | 3) : null} />
                    <span className={styles.who}><strong>{nameOf.get(g.studentId) || 'Öğrenci'}</strong><span>{g.previous} → {g.words} kelime</span></span>
                    <span className={`${styles.gain} ${g.gain > 0 ? styles.gainUp : g.gain < 0 ? styles.gainDown : ''}`}>
                      {g.gain > 0 ? `+${g.gain}` : g.gain}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )
      )}

      {tab === 'tablo' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Öğrencilerin yarışmalara göre dakikada okudukları kelime sayısı</caption>
            <thead>
              <tr>
                <th scope="col">Öğrenci</th>
                {sortedContests.map((c) => <th key={c.id} scope="col">{c.seq}.<span className={styles.thDate}>{shortDate(c.contest_date)}</span></th>)}
                <th scope="col">Değişim</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const values = sortedContests.map((c) => byContest.get(c.id)?.find((r) => r.student_id === s.id)?.words ?? null);
                const filled = values.filter((v): v is number => v != null);
                const change = filled.length >= 2 ? filled[filled.length - 1] - filled[0] : null;
                return (
                  <tr key={s.id}>
                    <th scope="row">{s.name}</th>
                    {values.map((v, i) => <td key={sortedContests[i].id}>{v ?? '—'}</td>)}
                    <td className={change == null ? '' : change > 0 ? styles.gainUp : change < 0 ? styles.gainDown : ''}>
                      {change == null ? '—' : change > 0 ? `+${change}` : change}
                    </td>
                  </tr>
                );
              })}
              <tr className={styles.avgRow}>
                <th scope="row">Sınıf ortalaması</th>
                {sortedContests.map((c) => {
                  const list = byContest.get(c.id) || [];
                  return <td key={c.id}>{list.length ? Math.round(list.reduce((a, r) => a + r.words, 0) / list.length) : '—'}</td>;
                })}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {measuringStudent && active && (
        <ReadingTimerModal
          studentName={measuringStudent.name}
          initialWords={resultOf.get(measuringStudent.id)?.words}
          late={finished && !resultOf.get(measuringStudent.id)}
          onSave={(w) => handleSave(measuringStudent.id, w)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
