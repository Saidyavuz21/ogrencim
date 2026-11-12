'use client';

// Bilgi yarışması oyun ekranı: takım skorları, soru, süre, jokerler ve sonuçlar. Tam ekran çalışır.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Clock, Crown, Eye, Flag, Maximize, Minimize, Pause, Play, RotateCcw, Trophy, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { RichText } from '../math/RichText';
import { useDialog } from '../ConfirmDialog';
import { stripRich } from '../../lib/math/parseRich';
import type { ClassStudent } from '../../lib/teacherData';
import { CHOICE_LETTERS, quizImageUrls } from '../../lib/quizData';
import {
  adjustScore, answer, awardQuizShow, canUseHalf, currentQuestion, HISTORY_LIMIT, LEVEL_LABEL, nextQuestion, pickAnswer, playDouble, playDoubleFor, playHalf,
  questionsDone, ranking, reveal, revealAll, saveQuizShow, teamBackground, winnerMembers,
  type QuizShowRow, type ShowState, type ShowStatus,
} from '../../lib/quizShowData';
import { shuffled } from '../teacher/classtools/storage';
import { useFullscreen } from '../teacher/classtools/useFullscreen';
import s from './QuizShow.module.css';

type Snap = { state: ShowState; status: ShowStatus };

/** Kısa uyarı sesi (süre dolunca) */
function beep(ctx: AudioContext | null) {
  if (!ctx) return;
  const start = ctx.currentTime + 0.05;
  for (let i = 0; i < 3; i++) {
    const t = start + i * 0.28;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1175 : 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

/** Soru süresi: başlat / duraklat / sıfırla. Soru ya da cevap sırası değişince (key ile) baştan kurulur. */
function QuestionTimer({ seconds, stopped, onExpired }: { seconds: number; stopped: boolean; onExpired: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [endAt, setEndAt] = useState<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const expiredRef = useRef(onExpired);
  useEffect(() => { expiredRef.current = onExpired; });
  useEffect(() => () => { audioRef.current?.close().catch(() => {}); }, []);

  useEffect(() => {
    if (endAt === null) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setEndAt(null);
        beep(audioRef.current);
        expiredRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [endAt]);

  const running = endAt !== null && !stopped;
  const toggle = () => {
    if (endAt !== null) { setEndAt(null); return; }
    // Tarayıcılar sesi ancak bir dokunuştan sonra açar: başlat düğmesinde hazırlanır
    if (!audioRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    }
    setEndAt(Date.now() + (left || seconds) * 1000);
    if (!left) setLeft(seconds);
  };

  return (
    <div className={`${s.timer} ${left <= 5 && left > 0 && running ? s.timerWarn : ''} ${left === 0 ? s.timerDone : ''}`}>
      <Clock size={22} aria-hidden="true" />
      <output className={s.timerNumber} aria-label={`Kalan süre ${left} saniye`}>{left}</output>
      {!stopped && (
        <>
          <button type="button" className={s.stageButton} onClick={toggle} aria-label={running ? 'Süreyi duraklat' : 'Süreyi başlat'}>
            {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}<span>{running ? 'Duraklat' : left === 0 ? 'Yeniden başlat' : 'Süreyi başlat'}</span>
          </button>
          <button type="button" className={s.stageButton} onClick={() => { setEndAt(null); setLeft(seconds); }} disabled={left === seconds && endAt === null} aria-label="Süreyi sıfırla">
            <RotateCcw size={18} aria-hidden="true" /><span>Sıfırla</span>
          </button>
        </>
      )}
    </div>
  );
}

export function QuizShowStage({ row, students, onExit, onRowChange }: {
  row: QuizShowRow;
  students: ClassStudent[];
  onExit: () => void;
  onRowChange: (row: QuizShowRow) => void;
}) {
  const { confirm } = useDialog();
  const [snap, setSnap] = useState<Snap>({ state: row.state, status: row.status });
  const [history, setHistory] = useState<Snap[]>([]);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [expired, setExpired] = useState(false);
  const [awardPoints, setAwardPoints] = useState('1');
  const [awarded, setAwarded] = useState<{ at: string | null; points: number | null }>({ at: row.awarded_at, points: row.awarded_points });
  const [awardBusy, setAwardBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);
  const { state, status } = snap;
  const isQuestions = row.mode === 'questions';
  /** Her soruyu tüm takımlar cevaplar (eski kayıtlar sırayla) */
  const allMode = state.settings.format === 'all';
  const q = currentQuestion(state);
  const finished = status === 'finished';
  const byId = useMemo(() => new Map(students.map((st) => [st.id, st.name])), [students]);

  const apply = (next: ShowState, nextStatus: ShowStatus = status) => {
    if (next === state && nextStatus === status) return;
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), snap]);
    setSnap({ state: next, status: nextStatus });
    setSaveState('dirty');
    setExpired(false);
  };
  const undo = () => {
    if (!history.length) return;
    setSnap(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSaveState('dirty');
    setExpired(false);
  };

  // Otomatik kayıt (değişiklikten 1 sn sonra)
  useEffect(() => {
    if (saveState !== 'dirty') return;
    const t = window.setTimeout(async () => {
      setSaveState('saving');
      const res = await saveQuizShow(row.id, { state: snap.state, status: snap.status });
      if (res.ok) { setSaveState('saved'); setSaveError(null); }
      else { setSaveState('error'); setSaveError(res.error); }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [saveState, snap, row.id]);
  // Ekrandan çıkılırken (liste, sınıf değişimi) bekleyen değişiklik hemen kaydedilir
  const pendingRef = useRef<Snap | null>(null);
  useEffect(() => { pendingRef.current = saveState === 'saved' ? null : snap; }, [saveState, snap]);
  useEffect(() => () => {
    const pending = pendingRef.current;
    if (pending) void saveQuizShow(row.id, { state: pending.state, status: pending.status });
  }, [row.id]);
  useEffect(() => {
    if (saveState === 'saved') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // Soru görselleri
  const imageKey = useMemo(() => state.questions.map((x) => x.image_path).filter(Boolean).join('|'), [state.questions]);
  useEffect(() => {
    if (!imageKey) return;
    let alive = true;
    quizImageUrls(imageKey.split('|')).then((u) => { if (alive) setImageUrls(u); });
    return () => { alive = false; };
  }, [imageKey]);

  const exit = () => {
    onRowChange({ ...row, state: snap.state, status: snap.status, awarded_at: awarded.at, awarded_points: awarded.points });
    onExit();
  };
  /** Onay pencereleri tam ekranın dışında açılır; önce tam ekrandan çıkılır */
  const ask = async (options: Parameters<typeof confirm>[0]) => {
    if (full) await toggleFull();
    return confirm(options);
  };
  const finish = async () => {
    if (!await ask({ title: 'Yarışmayı bitir', message: 'Yarışma bitirilip sonuçlar gösterilsin mi? “Geri al” ile yarışmaya dönebilirsiniz.', confirmText: 'Bitir', cancelText: 'Vazgeç' })) return;
    apply(state, 'finished');
  };
  const goNext = () => {
    const next = nextQuestion(state);
    apply(next, questionsDone(next) ? 'finished' : status);
  };

  const winners = winnerMembers(state.teams);
  const award = async () => {
    const points = Number(awardPoints);
    if (!winners.length) return;
    if (saveState !== 'saved') { setMessage('Önce yarışmanın kaydedilmesini bekleyin.'); return; }
    if (!await ask({ title: 'Kazanan takıma davranış puanı', message: `Kazanan takımdaki ${winners.length} öğrenciye ${points} artı puan verilsin mi? Bu işlem bir yarışma için yalnızca bir kez yapılır ve puan geçmişine yazılır.`, confirmText: 'Puan ver', cancelText: 'Vazgeç' })) return;
    setAwardBusy(true);
    const res = await awardQuizShow(row.id, winners, points);
    setAwardBusy(false);
    if (!res.ok) { setMessage(`Puan verilemedi: ${res.error}`); return; }
    setAwarded({ at: new Date().toISOString(), points });
    setMessage(`${res.data} öğrenciye ${points} artı puan verildi.`);
  };

  const saveLabel = saveState === 'saved' ? 'Kaydedildi' : saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'error' ? `Kaydedilemedi: ${saveError}` : 'Değişiklik var';
  const rows = ranking(state.teams);
  const tied = rows.every((r) => r.rank === 1);

  const teamStrip = (
    <div className={s.teamStrip} data-teams={state.teams.length}>
      {state.teams.map((team, index) => {
        const active = isQuestions && !allMode && !finished && !!q && !state.round.revealed && state.round.turn === index;
        const picking = isQuestions && allMode && !finished && !!q;
        const pick = state.round.picks[index] ?? null;
        const result = picking && state.round.revealed ? state.answers.find((a) => a.q === state.current && a.team === index) : undefined;
        const doubled = state.round.doubles.includes(index);
        const leader = !tied && rows.find((r) => r.index === index)?.rank === 1;
        return (
          <section key={index} className={`${s.team} ${active ? s.teamActive : ''}`} style={{ '--team-bg': teamBackground(team.color) } as React.CSSProperties} aria-label={team.name}>
            <h3>{leader && <Crown size={18} aria-hidden="true" />}{team.name}</h3>
            <output className={s.teamScore} aria-label={`${team.name} puanı`}>{team.score}</output>
            {active && <p className={s.teamTurn}>Cevap sırası</p>}
            {picking && q && (
              state.round.revealed ? (
                <p className={`${s.teamResult} ${result?.correct ? s.teamResultOk : result?.choice != null ? s.teamResultBad : ''}`} role="status">
                  {result?.choice == null ? 'Boş' : `${CHOICE_LETTERS[result.choice]} · ${result.correct ? 'doğru' : 'yanlış'}`}
                  {result?.points ? ` · ${result.points > 0 ? '+' : '−'}${Math.abs(result.points)}` : ''}
                </p>
              ) : (
                <div className={s.teamPicks} role="group" aria-label={`${team.name} cevabı`}>
                  {q.choices.map((_, c) => (
                    <button key={c} type="button" aria-pressed={pick === c} onClick={() => apply(pickAnswer(state, index, c))} aria-label={`${team.name}: ${CHOICE_LETTERS[c]} şıkkı`}>
                      {CHOICE_LETTERS[c]}
                    </button>
                  ))}
                </div>
              )
            )}
            {picking && state.settings.jokers && (
              <button
                type="button"
                className={s.teamDouble}
                aria-pressed={doubled}
                disabled={state.round.revealed || (!!team.usedDouble && !doubled)}
                onClick={() => apply(playDoubleFor(state, index))}
                aria-label={doubled ? `${team.name} bu soruda çift puan kullanıyor` : team.usedDouble ? `${team.name} çift puan jokerini kullandı` : `${team.name} için çift puan jokerini aç`}
              >
                2× {doubled ? 'bu soruda' : team.usedDouble ? 'kullanıldı' : 'çift puan'}
              </button>
            )}
            {isQuestions && !allMode && state.settings.jokers && !finished && (
              <p className={s.teamJokers}>
                <span data-used={team.usedDouble || undefined}>2×</span>
                <span data-used={team.usedHalf || undefined}>½</span>
              </p>
            )}
            {!finished && (
              <div className={s.teamButtons}>
                <button type="button" onClick={() => apply(adjustScore(state, index, -1))} aria-label={`${team.name} 1 puan azalt`}>−1</button>
                <button type="button" onClick={() => apply(adjustScore(state, index, 1))} aria-label={`${team.name} 1 puan ekle`}>+1</button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );

  const activeTeam = state.teams[state.round.turn];
  const lastAnswer = state.answers[state.answers.length - 1];

  return (
    <div ref={stageRef} className={`${s.stage} ${full ? s.full : ''}`}>
      <div className={s.stageTop}>
        <button type="button" className={s.stageButton} onClick={exit} aria-label="Yarışmalarıma dön"><ArrowLeft size={18} aria-hidden="true" /><span>Yarışmalarım</span></button>
        <div className={s.stageTitle}>
          <strong>{row.title}</strong>
          <span>
            {finished ? 'Sonuçlar' : isQuestions && q ? `Soru ${state.current + 1} / ${state.questions.length}` : 'Skor'}
            {' · '}<span className={saveState === 'error' ? s.saveError : undefined} role="status">{saveLabel}</span>
          </span>
        </div>
        <div className={s.stageTopActions}>
          <button type="button" className={s.stageButton} onClick={undo} disabled={!history.length} aria-label="Son işlemi geri al"><RotateCcw size={18} aria-hidden="true" /><span>Geri al</span></button>
          {!finished && <button type="button" className={s.stageButton} onClick={finish} aria-label="Yarışmayı bitir"><Flag size={18} aria-hidden="true" /><span>Bitir</span></button>}
          <button type="button" className={s.stageButton} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}<span>{full ? 'Küçült' : 'Tam ekran'}</span>
          </button>
        </div>
      </div>

      {finished ? (
        <div className={s.results}>
          <div className={s.podium}>
            {rows.map((r) => (
              <section key={r.index} className={`${s.podiumRow} ${!tied && r.rank === 1 ? s.podiumFirst : ''}`} style={{ '--team-bg': teamBackground(r.team.color) } as React.CSSProperties}>
                <span className={s.podiumRank}>{!tied && r.rank === 1 ? <Trophy size={24} aria-hidden="true" /> : null}{r.rank}.</span>
                <div className={s.podiumName}>
                  <strong>{r.team.name}</strong>
                  {r.team.members.length > 0 && <small>{r.team.members.map((id) => byId.get(id)).filter(Boolean).join(', ')}</small>}
                </div>
                <output className={s.podiumScore}>{r.team.score}</output>
              </section>
            ))}
          </div>
          {tied && <p className={s.stageNote}>Puanlar eşit; kazanan takım yok.</p>}

          <section className={s.resultPanel} aria-labelledby="show-award-title">
            <h3 id="show-award-title">Kazanana davranış puanı</h3>
            {awarded.at ? (
              <p className={s.stageNote}><Check size={18} aria-hidden="true" /> Kazanan takımın öğrencilerine {awarded.points} artı puan verildi.</p>
            ) : tied ? (
              <p className={s.stageNote}>Kazanan takım olmadığı için puan verilemez.</p>
            ) : winners.length === 0 ? (
              <p className={s.stageNote}>Kazanan takımda öğrenci yok. Hazırlıkta “Bugünkü grupları aktar” ya da “Sınıfı rastgele dağıt” kullanılırsa puan verilebilir.</p>
            ) : (
              <div className={s.awardRow}>
                <div className={s.awardSelect}>
                  <label htmlFor="show-award-points">Öğrenci başına</label>
                  <CustomSelect id="show-award-points" value={awardPoints} onChange={setAwardPoints} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} artı puan` }))} />
                </div>
                <button type="button" className={s.primary} onClick={award} disabled={awardBusy}>
                  <Trophy size={18} aria-hidden="true" />{awardBusy ? 'Veriliyor…' : `${winners.length} öğrenciye puan ver`}
                </button>
              </div>
            )}
            {message && <p className={s.stageNote} role="status">{message}</p>}
          </section>

          {isQuestions && state.questions.length > 0 && (
            <section className={s.resultPanel} aria-labelledby="show-summary-title">
              <h3 id="show-summary-title">Soru özeti</h3>
              <ol className={s.summary}>
                {state.questions.map((item, index) => {
                  const given = state.answers.filter((a) => a.q === index);
                  return (
                    <li key={index}>
                      <span className={s.summaryText}>{stripRich(item.body).slice(0, 140)}</span>
                      <span className={s.summaryMeta}>
                        {LEVEL_LABEL[item.level]} · doğru cevap {CHOICE_LETTERS[item.correct_index]}
                        {index >= state.current && !given.length ? ' · sorulmadı' : ''}
                      </span>
                      {given.map((a, n) => (
                        <span key={n} className={a.correct ? s.summaryOk : s.summaryBad}>
                          {state.teams[a.team]?.name}: {a.choice === null ? 'süre doldu' : CHOICE_LETTERS[a.choice]} {a.correct ? 'doğru' : 'yanlış'}{a.points ? ` (${a.points > 0 ? '+' : '−'}${Math.abs(a.points)})` : ''}
                        </span>
                      ))}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      ) : !isQuestions || !q ? (
        <div className={s.scoreOnly}>{teamStrip}</div>
      ) : (
        <>
          {teamStrip}
          <div className={s.question}>
            <div className={s.questionHead}>
              <span className={s.levelBadge}>{LEVEL_LABEL[q.level]} · {q.level} puan{state.round.doubleFor !== null ? ' · çift puan açık' : ''}</span>
              {state.settings.seconds > 0 && (
                <QuestionTimer
                  key={`${state.current}-${state.round.turn}-${state.round.tried.length}`}
                  seconds={state.settings.seconds}
                  stopped={state.round.revealed}
                  onExpired={() => setExpired(true)}
                />
              )}
            </div>
            <div className={s.questionBody}><RichText text={q.body} /></div>
            {q.image_path && imageUrls[q.image_path] && (
              // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
              <img className={s.questionImage} src={imageUrls[q.image_path]} alt="Soru görseli" />
            )}
            <div className={s.choices} data-count={q.choices.length}>
              {q.choices.map((choice, index) => {
                const hidden = state.round.hidden.includes(index);
                const eliminated = state.round.eliminated.includes(index);
                const isCorrect = state.round.revealed && index === q.correct_index;
                const wrongPick = state.round.revealed && index !== q.correct_index && (allMode
                  ? state.round.picks.includes(index)
                  : lastAnswer?.q === state.current && lastAnswer.choice === index && !lastAnswer.correct);
                return (
                  <button
                    key={index}
                    type="button"
                    className={`${s.choice} ${isCorrect ? s.choiceCorrect : ''} ${wrongPick || eliminated ? s.choiceWrong : ''} ${hidden ? s.choiceHidden : ''}`}
                    disabled={allMode || state.round.revealed || hidden || eliminated}
                    onClick={() => apply(answer(state, index))}
                    aria-label={`${CHOICE_LETTERS[index]} şıkkı${isCorrect ? ', doğru cevap' : eliminated || wrongPick ? ', yanlış' : hidden ? ', gizlendi' : ''}`}
                  >
                    <span className={s.choiceLetter}>{isCorrect ? <Check size={20} aria-hidden="true" /> : wrongPick || eliminated ? <X size={20} aria-hidden="true" /> : CHOICE_LETTERS[index]}</span>
                    <span className={s.choiceText}>{hidden ? '' : <RichText text={choice} inline />}</span>
                  </button>
                );
              })}
            </div>

            {state.round.revealed ? (
              <div className={s.afterReveal}>
                <p className={s.stageNote} role="status">
                  {allMode ? (() => {
                    const right = state.answers.filter((a) => a.q === state.current && a.correct);
                    return right.length
                      ? `Doğru cevap ${CHOICE_LETTERS[q.correct_index]}. Bilenler: ${right.map((a) => `${state.teams[a.team]?.name} (+${a.points})`).join(', ')}.`
                      : `Doğru cevap ${CHOICE_LETTERS[q.correct_index]}. Bilen takım olmadı.`;
                  })() : lastAnswer?.q === state.current
                    ? lastAnswer.correct
                      ? `${state.teams[lastAnswer.team]?.name} doğru bildi: +${lastAnswer.points} puan.`
                      : `${state.teams[lastAnswer.team]?.name} bilemedi${lastAnswer.points ? `: −${Math.abs(lastAnswer.points)} puan` : ''}. Doğru cevap ${CHOICE_LETTERS[q.correct_index]}.`
                    : `Doğru cevap ${CHOICE_LETTERS[q.correct_index]}.`}
                </p>
                {q.explanation && <div className={s.explanation}><RichText text={q.explanation} /></div>}
                <button type="button" className={s.primary} onClick={goNext}>
                  {state.current + 1 >= state.questions.length ? <><Trophy size={20} aria-hidden="true" />Sonuçları göster</> : <><Play size={20} aria-hidden="true" />Sonraki soru</>}
                </button>
              </div>
            ) : allMode ? (
              <div className={s.controls}>
                <p className={s.stageNote} role="status">
                  {expired ? 'Süre doldu. ' : ''}Takımlar cevabını yazsın; her takımın şıkkını kendi kartından işaretleyin, sonra cevapları açın.
                  {' '}{state.round.picks.filter((v) => v !== null).length} / {state.teams.length} takım işaretlendi.
                </p>
                <div className={s.controlButtons}>
                  <button type="button" className={s.primary} onClick={() => apply(revealAll(state))}>
                    <Eye size={20} aria-hidden="true" />Cevapları aç
                  </button>
                </div>
              </div>
            ) : (
              <div className={s.controls}>
                <p className={s.stageNote} role="status">
                  {expired ? `Süre doldu. ${activeTeam?.name} cevap veremediyse “Süre doldu”ya basın.` : `${activeTeam?.name} cevabını söylesin; söylediği şıkka dokunun.`}
                </p>
                <div className={s.controlButtons}>
                  {state.settings.jokers && (
                    <>
                      <button type="button" className={s.stageButton} onClick={() => apply(playDouble(state))} disabled={!!activeTeam?.usedDouble || state.round.doubleFor !== null}>
                        <span className={s.jokerMark}>2×</span><span>Çift puan</span>
                      </button>
                      <button type="button" className={s.stageButton} onClick={() => apply(playHalf(state, shuffled))} disabled={!canUseHalf(state)}>
                        <span className={s.jokerMark}>½</span><span>Yarı yarıya</span>
                      </button>
                    </>
                  )}
                  {state.settings.seconds > 0 && (
                    <button type="button" className={`${s.stageButton} ${expired ? s.stageButtonAlert : ''}`} onClick={() => apply(answer(state, null))}>
                      <Clock size={18} aria-hidden="true" /><span>Süre doldu</span>
                    </button>
                  )}
                  <button type="button" className={s.stageButton} onClick={() => apply(reveal(state))}>
                    <Eye size={18} aria-hidden="true" /><span>Cevabı göster</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
