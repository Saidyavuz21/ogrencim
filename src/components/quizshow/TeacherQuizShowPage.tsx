'use client';

// Öğretmen: Bilgi yarışması sayfası. Yarışmalarım listesi → hazırlık → oyun ekranı.

import React, { useEffect, useState } from 'react';
import { Play, Plus, RotateCcw, Trash2, Trophy } from '../icons';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { useClassStudents } from '../teacher/TeacherUi';
import { deleteQuizShow, listQuizShows, ranking, type QuizShowRow } from '../../lib/quizShowData';
import { QuizShowSetup } from './QuizShowSetup';
import { QuizShowStage } from './QuizShowStage';
import styles from '../teacher/TeacherDashboard.module.css';
import s from './QuizShow.module.css';

type View = { kind: 'list' } | { kind: 'setup'; template?: QuizShowRow } | { kind: 'play'; row: QuizShowRow };

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function summary(row: QuizShowRow): string {
  const rows = ranking(row.state.teams);
  const tied = rows.every((r) => r.rank === 1);
  const lead = rows.filter((r) => r.rank === 1).map((r) => r.team.name).join(', ');
  const scores = row.state.teams.map((t) => `${t.name} ${t.score}`).join(' · ');
  if (row.status === 'finished') return tied ? `Berabere · ${scores}` : `Kazanan: ${lead} · ${scores}`;
  const progress = row.mode === 'questions' ? `Soru ${Math.min(row.state.current + 1, row.state.questions.length)} / ${row.state.questions.length} · ` : '';
  return `${progress}${scores}`;
}

export function TeacherQuizShowPage({ selectedClass, onOpenQuestionBank }: { selectedClass: string; onOpenQuestionBank: () => void }) {
  const { confirm } = useDialog();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [shows, setShows] = useState<QuizShowRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Oynanan yarışmanın kendi sınıfı esas alınır (üstteki sınıf seçimi sonradan değişmiş olabilir)
  const activeClass = view.kind === 'play' ? view.row.class_name || '' : selectedClass;
  const { students, loading: studentsLoading } = useClassStudents(activeClass);

  useEffect(() => {
    let alive = true;
    listQuizShows().then((res) => {
      if (!alive) return;
      if (res.ok) setShows(res.data); else setError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const upsert = (row: QuizShowRow) => setShows((prev) => {
    const rest = (prev || []).filter((x) => x.id !== row.id);
    return [row, ...rest];
  });
  const remove = async (row: QuizShowRow) => {
    if (!await confirm({ title: 'Yarışmayı sil', message: `“${row.title}” silinsin mi? Bu işlem geri alınamaz.${row.awarded_at ? ' Verilmiş davranış puanları öğrencilerde kalır.' : ''}`, confirmText: 'Sil', cancelText: 'Vazgeç', variant: 'danger' })) return;
    const res = await deleteQuizShow(row.id);
    if (!res.ok) { setNotice(`Silinemedi: ${res.error}`); return; }
    setShows((prev) => (prev || []).filter((x) => x.id !== row.id));
    setNotice('Yarışma silindi.');
  };

  if (view.kind === 'setup') {
    return (
      <div className={styles.pageBody}>
        <QuizShowSetup
          key={`${selectedClass}:${view.template?.id || 'yeni'}`}
          className={selectedClass}
          students={students}
          studentsLoading={studentsLoading}
          template={view.template}
          onCancel={() => setView({ kind: 'list' })}
          onStart={(row) => { upsert(row); setView({ kind: 'play', row }); }}
          onOpenQuestionBank={onOpenQuestionBank}
        />
      </div>
    );
  }

  if (view.kind === 'play') {
    return (
      <div className={styles.pageBody}>
        <QuizShowStage
          key={view.row.id}
          row={view.row}
          students={students}
          onRowChange={upsert}
          onExit={() => setView({ kind: 'list' })}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.pageBody} ${s.listPage}`}>
      <section className={s.panel} aria-labelledby="show-new-title">
        <div className={s.newRow}>
          <div>
            <h2 id="show-new-title" className={s.panelTitle}>Yeni yarışma</h2>
            <p className={s.muted}>Takımları kurun; soru bankanızdan sorularla oynayın ya da yalnızca skor tutun. Yarışma tek ekranda, akıllı tahtada oynanır.</p>
          </div>
          <button type="button" className={s.primary} onClick={() => { setNotice(null); setView({ kind: 'setup' }); }}>
            <Plus size={20} aria-hidden="true" />Yeni yarışma
          </button>
        </div>
      </section>

      <section className={s.panel} aria-labelledby="show-list-title">
        <h2 id="show-list-title" className={s.panelTitle}>Yarışmalarım</h2>
        {notice && <p className={s.info} role="status">{notice}</p>}
        {error && <p className={s.error} role="alert">Yarışmalar yüklenemedi: {error}</p>}
        {!shows && !error && <Spinner label="Yarışmalar yükleniyor…" />}
        {shows && shows.length === 0 && <p className={s.muted}>Henüz yarışma yok. İlk yarışmanızı “Yeni yarışma” ile başlatın.</p>}
        {shows && shows.length > 0 && (
          <ul className={s.showList}>
            {shows.map((row) => (
              <li key={row.id}>
                <div className={s.showInfo}>
                  <strong>{row.title}</strong>
                  <span className={s.showMeta}>
                    {[row.class_name, row.mode === 'questions' ? 'Sorularla' : 'Sadece skor', formatDate(row.updated_at), row.status === 'finished' ? 'Bitti' : 'Sürüyor'].filter(Boolean).join(' · ')}
                  </span>
                  <span className={s.showSummary}>{summary(row)}</span>
                </div>
                <div className={s.showActions}>
                  <button type="button" className={s.secondary} onClick={() => setView({ kind: 'play', row })}>
                    {row.status === 'finished' ? <><Trophy size={18} aria-hidden="true" />Sonuçlar</> : <><Play size={18} aria-hidden="true" />Devam et</>}
                  </button>
                  <button type="button" className={s.secondary} onClick={() => setView({ kind: 'setup', template: row })} title="Aynı takım ve sorularla yeni yarışma">
                    <RotateCcw size={18} aria-hidden="true" />Tekrar oyna
                  </button>
                  <button type="button" className={s.iconDanger} onClick={() => remove(row)} aria-label={`${row.title} yarışmasını sil`} title="Sil">
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
