'use client';

// Bilgi yarışması hazırlığı: ad, tür, takımlar, sorular ve kurallar.

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Play, Search, Shuffle, Trash2, Users } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { RichText } from '../math/RichText';
import { useDialog } from '../ConfirmDialog';
import type { ClassStudent } from '../../lib/teacherData';
import { listQuestions, type QuestionRow } from '../../lib/quizData';
import {
  createQuizShow, DEFAULT_SETTINGS, LEVEL_LABEL, MAX_SHOW_QUESTIONS, MAX_TEAMS, MIN_TEAMS, newShowState, newTeam,
  questionFromBank, readLegacyTeams, FORMAT_LABEL, SECONDS_OPTIONS, TEAM_COLORS, WRONG_RULE_LABEL,
  type QuizShowRow, type ShowLevel, type ShowMode, type ShowFormat, type ShowSettings, type ShowTeam, type WrongRule,
} from '../../lib/quizShowData';
import { readJson, shuffled, today } from '../teacher/classtools/storage';
import s from './QuizShow.module.css';

const defaultTitle = () => `Bilgi yarışması · ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`;

export function QuizShowSetup({ className, students, studentsLoading, template, onCancel, onStart, onOpenQuestionBank }: {
  className: string;
  students: ClassStudent[];
  studentsLoading: boolean;
  /** "Tekrar oyna": bu yarışmanın takımları, soruları ve kurallarıyla başlar */
  template?: QuizShowRow;
  onCancel: () => void;
  onStart: (row: QuizShowRow) => void;
  onOpenQuestionBank: () => void;
}) {
  const { confirm } = useDialog();
  const [title, setTitle] = useState(() => template?.title || defaultTitle());
  const [mode, setMode] = useState<ShowMode>(template?.mode || 'questions');
  const [teams, setTeams] = useState<ShowTeam[]>(() => (
    template ? template.state.teams.map((t) => ({ name: t.name, color: t.color, members: t.members, score: 0 })) : [newTeam(0), newTeam(1)]
  ));
  // Eski skor tabelasında bu sınıf için kayıtlı takımlar varsa (adlar, renkler, üyeler, puanlar) aktarılır
  const [legacy, setLegacy] = useState(false);
  useEffect(() => {
    if (template) return;
    const saved = readLegacyTeams(className);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı deposu yalnızca istemcide okunur
    if (saved) { setTeams(saved); setLegacy(true); }
  }, [className, template]);

  const [settings, setSettings] = useState<ShowSettings>(template?.state.settings || DEFAULT_SETTINGS);
  const [bank, setBank] = useState<QuestionRow[] | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  /** Seçilen sorular (sırasıyla) ve puan değerleri */
  const [picked, setPicked] = useState<{ id: string; level: ShowLevel }[]>([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    listQuestions().then((res) => {
      if (!alive) return;
      if (res.ok) setBank(res.data); else setBankError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => new Map(students.map((st) => [st.id, st.name])), [students]);
  const bankById = useMemo(() => new Map((bank || []).map((q) => [q.id, q])), [bank]);
  // "Tekrar oyna": önceki yarışmanın soruları (bankadan silinmiş olsa da kopyası durur)
  const templateQuestions = template?.state.questions || [];
  const useTemplateQuestions = templateQuestions.length > 0 && picked.length === 0;

  const subjects = useMemo(() => Array.from(new Set((bank || []).map((q) => q.subject).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'tr')), [bank]);
  const topics = useMemo(() => Array.from(new Set((bank || []).filter((q) => !subject || q.subject === subject).map((q) => q.topic).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'tr')), [bank, subject]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr-TR');
    return (bank || []).filter((q) => (
      (!subject || q.subject === subject) && (!topic || q.topic === topic)
      && (!term || `${q.body} ${q.topic || ''} ${q.tags.join(' ')}`.toLocaleLowerCase('tr-TR').includes(term))
    ));
  }, [bank, search, subject, topic]);
  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

  const patchTeam = (index: number, patch: Partial<ShowTeam>) => setTeams((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  const resize = async (value: string) => {
    const count = Number(value);
    if (count === teams.length) return;
    if (count < teams.length && teams.slice(count).some((t) => t.members.length || t.score) && !await confirm({ title: 'Takım sayısını azalt', message: 'Sondaki takımlar, üyeleri ve puanları kaldırılacak.', confirmText: 'Azalt', cancelText: 'Vazgeç' })) return;
    setTeams((prev) => Array.from({ length: count }, (_, i) => prev[i] || newTeam(i)));
  };
  const importGroups = () => {
    const saved = readJson<unknown>(`gruplar:${className}:${today()}`, []);
    const groups = Array.isArray(saved)
      ? saved.filter(Array.isArray).map((g) => [...new Set((g as unknown[]).filter((id): id is string => typeof id === 'string' && byId.has(id)))]).filter((g) => g.length)
      : [];
    if (groups.length < MIN_TEAMS || groups.length > MAX_TEAMS) {
      setNotice('Aktarmak için Sınıf araçları > Grup oluştur’da bu sınıfa ait 2–6 grup hazırlayın.');
      return;
    }
    setTeams(groups.map((members, i) => ({ ...newTeam(i), name: `Grup ${i + 1}`, members })));
    setNotice(`${groups.length} grup takımlara aktarıldı.`);
  };
  const distribute = () => {
    if (!students.length) { setNotice('Bu sınıfta öğrenci yok.'); return; }
    const order = shuffled(students.map((st) => st.id));
    setTeams((prev) => prev.map((t, i) => ({ ...t, members: order.filter((_, n) => n % prev.length === i) })));
    setNotice(`${students.length} öğrenci ${teams.length} takıma rastgele dağıtıldı.`);
  };

  const toggleQuestion = (id: string) => {
    setError(null);
    setPicked((prev) => {
      if (prev.some((p) => p.id === id)) return prev.filter((p) => p.id !== id);
      if (prev.length >= MAX_SHOW_QUESTIONS) { setError(`En fazla ${MAX_SHOW_QUESTIONS} soru seçilebilir.`); return prev; }
      return [...prev, { id, level: 1 }];
    });
  };
  const movePicked = (index: number, dir: -1 | 1) => setPicked((prev) => {
    const j = index + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  });

  const start = async () => {
    setError(null);
    if (!title.trim()) { setError('Yarışmaya bir ad verin.'); return; }
    const cleanTeams = teams.map((t, i) => ({ ...t, name: t.name.trim() || `Takım ${i + 1}`, score: mode === 'score' ? t.score : 0, usedDouble: undefined, usedHalf: undefined }));
    let questions = mode === 'questions'
      ? picked.flatMap((p) => { const q = bankById.get(p.id); return q ? [questionFromBank(q, p.level)] : []; })
      : [];
    if (mode === 'questions' && !questions.length && useTemplateQuestions) questions = templateQuestions;
    if (mode === 'questions' && !questions.length) { setError('Sorularla oynamak için en az bir soru seçin ya da “Sadece skor tut”u seçin.'); return; }
    setBusy(true);
    const res = await createQuizShow({ title, className: className || null, mode, state: newShowState(cleanTeams, questions, settings) });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onStart(res.data);
  };

  return (
    <div className={s.setup}>
      <div className={s.setupHead}>
        <button type="button" className={s.textButton} onClick={onCancel}><ArrowLeft size={18} aria-hidden="true" />Yarışmalarım</button>
      </div>

      <section className={s.panel} aria-labelledby="show-basic-title">
        <h2 id="show-basic-title" className={s.panelTitle}>Yarışma</h2>
        <div className={s.field}>
          <label htmlFor="show-title">Yarışmanın adı</label>
          <input id="show-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className={s.segment} role="group" aria-label="Yarışma türü">
          <button type="button" aria-pressed={mode === 'questions'} onClick={() => setMode('questions')}>Sorularla oyna</button>
          <button type="button" aria-pressed={mode === 'score'} onClick={() => setMode('score')}>Sadece skor tut</button>
        </div>
        <p className={s.muted}>
          {mode === 'questions'
            ? 'Sorular soru bankanızdan gelir. Takım cevabını söyler, siz şıkka dokunursunuz; puan kendiliğinden işlenir.'
            : 'Soru hazırlamadan kullanılır: yalnızca takım puanlarını tutar. Soruları sözlü sorabilirsiniz.'}
        </p>
      </section>

      <section className={s.panel} aria-labelledby="show-teams-title">
        <h2 id="show-teams-title" className={s.panelTitle}>Takımlar</h2>
        {legacy && (
          <p className={s.info} role="status">
            Skor tabelasındaki takımlarınız aktarıldı (adlar, renkler{teams.some((t) => t.score) ? ', puanlar' : ''}).
            {mode === 'questions' ? ' Sorularla oynarken puanlar sıfırdan başlar.' : ''}
            {mode === 'score' && teams.some((t) => t.score) && (
              <button type="button" className={s.inlineLink} onClick={() => setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })))}>Puanları sıfırla</button>
            )}
          </p>
        )}
        <div className={s.field}>
          <label htmlFor="show-team-count">Takım sayısı</label>
          <CustomSelect id="show-team-count" value={String(teams.length)} onChange={resize} options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} takım` }))} />
        </div>
        <div className={s.teamGrid}>
          {teams.map((team, index) => (
            <div key={index} className={s.teamCard}>
              <div className={s.field}>
                <label htmlFor={`show-team-${index}`}>Takım {index + 1} adı</label>
                <input id={`show-team-${index}`} value={team.name} maxLength={40} onChange={(e) => patchTeam(index, { name: e.target.value })} />
              </div>
              <fieldset className={s.colors}>
                <legend>Takım {index + 1} rengi</legend>
                <div>
                  {TEAM_COLORS.map((color) => (
                    <button key={color.id} type="button" aria-label={`Takım ${index + 1} için ${color.name}`} aria-pressed={team.color === color.id} title={color.name} style={{ '--team-bg': color.background } as React.CSSProperties} onClick={() => patchTeam(index, { color: color.id })}>
                      <span>{team.color === color.id && <Check size={16} aria-hidden="true" />}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {team.members.length > 0 && (
                <p className={s.muted}>{team.members.map((id) => byId.get(id)).filter(Boolean).join(', ') || `${team.members.length} öğrenci (bu sınıfın listesinde değil)`}</p>
              )}
              {mode === 'score' && team.score !== 0 && <p className={s.muted}>Başlangıç puanı: {team.score}</p>}
            </div>
          ))}
        </div>
        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={importGroups} disabled={studentsLoading || !className}><Users size={18} aria-hidden="true" />Bugünkü grupları aktar</button>
          <button type="button" className={s.secondary} onClick={distribute} disabled={studentsLoading || !className}><Shuffle size={18} aria-hidden="true" />Sınıfı rastgele dağıt</button>
          {teams.some((t) => t.members.length > 0) && (
            <button type="button" className={s.secondary} onClick={() => { setTeams((prev) => prev.map((t) => ({ ...t, members: [] }))); setNotice('Takımlardaki öğrenciler kaldırıldı.'); }}><Trash2 size={18} aria-hidden="true" />Öğrencileri kaldır</button>
          )}
        </div>
        <p className={s.muted} role="status">
          {notice || (className
            ? 'Takımlarda öğrenci olması zorunlu değildir. Öğrenciler eklenirse yarışma sonunda kazanan takıma davranış puanı verebilirsiniz.'
            : 'Sınıf seçilmedi: takımlara öğrenci eklenemez, ama yarışma oynanabilir.')}
        </p>
      </section>

      {mode === 'questions' && (
        <>
          <section className={s.panel} aria-labelledby="show-questions-title">
            <div className={s.panelHead}>
              <h2 id="show-questions-title" className={s.panelTitle}>Sorular</h2>
              <span className={s.count}>{useTemplateQuestions ? templateQuestions.length : picked.length} soru seçili</span>
            </div>
            {useTemplateQuestions && (
              <p className={s.info}>Önceki yarışmanın {templateQuestions.length} sorusu kullanılacak. Farklı sorular için aşağıdan seçim yapın.</p>
            )}
            {bankError && <p className={s.error} role="alert">Soru bankası açılamadı: {bankError}</p>}
            {!bank && !bankError && <Spinner label="Soru bankası yükleniyor…" />}
            {bank && bank.length === 0 && (
              <p className={s.muted}>
                Soru bankanız boş. <button type="button" className={s.inlineLink} onClick={onOpenQuestionBank}>Soru bankasına git</button> ya da “Sadece skor tut” ile başlayın.
              </p>
            )}
            {bank && bank.length > 0 && (
              <>
                <div className={s.filters}>
                  <div className={s.field}>
                    <label htmlFor="show-q-search">Soru ara</label>
                    <div className={s.searchBox}>
                      <Search size={18} aria-hidden="true" />
                      <input id="show-q-search" value={search} placeholder="Soru metni, konu ya da etiket" onChange={(e) => setSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className={s.field}>
                    <label htmlFor="show-q-subject">Ders</label>
                    <CustomSelect id="show-q-subject" value={subject} onChange={(v) => { setSubject(v); setTopic(''); }} options={[{ value: '', label: 'Bütün dersler' }, ...subjects.map((v) => ({ value: v, label: v }))]} />
                  </div>
                  <div className={s.field}>
                    <label htmlFor="show-q-topic">Konu</label>
                    <CustomSelect id="show-q-topic" value={topic} onChange={setTopic} options={[{ value: '', label: 'Bütün konular' }, ...topics.map((v) => ({ value: v, label: v }))]} disabled={!topics.length} />
                  </div>
                </div>
                {(search || subject || topic) && (
                  <button type="button" className={s.inlineLink} onClick={() => { setSearch(''); setSubject(''); setTopic(''); }}>Süzgeci temizle</button>
                )}
                {filtered.length === 0 ? (
                  <p className={s.muted}>Bu süzgeçle soru bulunamadı.</p>
                ) : (
                  <ul className={s.questionList} aria-label="Soru bankası">
                    {filtered.map((q) => (
                      <li key={q.id}>
                        <label className={s.questionRow}>
                          <input type="checkbox" checked={pickedIds.has(q.id)} onChange={() => toggleQuestion(q.id)} />
                          <span className={s.questionText}>
                            <RichText text={q.body} inline />
                            <small>{[q.subject, q.topic, `${q.choices.length} şık`].filter(Boolean).join(' · ')}</small>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {picked.length > 0 && (
              <div className={s.pickedBlock}>
                <h3 className={s.subTitle}>Yarışma sırası ve puan değeri</h3>
                <ol className={s.pickedList}>
                  {picked.map((p, index) => {
                    const q = bankById.get(p.id);
                    if (!q) return null;
                    return (
                      <li key={p.id}>
                        <span className={s.pickedNo}>{index + 1}</span>
                        <span className={s.pickedText}><RichText text={q.body} inline /></span>
                        <div className={s.levels} role="group" aria-label={`${index + 1}. sorunun puan değeri`}>
                          {([1, 2, 3] as ShowLevel[]).map((lv) => (
                            <button key={lv} type="button" aria-pressed={p.level === lv} onClick={() => setPicked((prev) => prev.map((x) => (x.id === p.id ? { ...x, level: lv } : x)))} title={`${LEVEL_LABEL[lv]}: ${lv} puan`}>
                              {LEVEL_LABEL[lv]} · {lv}
                            </button>
                          ))}
                        </div>
                        <div className={s.rowButtons}>
                          <button type="button" onClick={() => movePicked(index, -1)} disabled={index === 0} aria-label={`${index + 1}. soruyu yukarı taşı`}><ChevronUp size={18} aria-hidden="true" /></button>
                          <button type="button" onClick={() => movePicked(index, 1)} disabled={index === picked.length - 1} aria-label={`${index + 1}. soruyu aşağı taşı`}><ChevronDown size={18} aria-hidden="true" /></button>
                          <button type="button" onClick={() => toggleQuestion(p.id)} aria-label={`${index + 1}. soruyu çıkar`}><Trash2 size={18} aria-hidden="true" /></button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <button type="button" className={s.secondary} onClick={() => setPicked((prev) => shuffled(prev))} disabled={picked.length < 2}><Shuffle size={18} aria-hidden="true" />Sırayı karıştır</button>
              </div>
            )}
          </section>

          <section className={s.panel} aria-labelledby="show-rules-title">
            <h2 id="show-rules-title" className={s.panelTitle}>Kurallar</h2>
            <div className={s.filters}>
              <div className={s.field}>
                <label htmlFor="show-format">Cevaplama</label>
                <CustomSelect
                  id="show-format"
                  value={settings.format}
                  onChange={(v) => setSettings((p) => ({ ...p, format: v as ShowFormat, wrong: v === 'all' && p.wrong === 'pass' ? 'none' : p.wrong }))}
                  options={(Object.keys(FORMAT_LABEL) as ShowFormat[]).map((k) => ({ value: k, label: FORMAT_LABEL[k] }))}
                />
              </div>
              <div className={s.field}>
                <label htmlFor="show-seconds">Soru süresi</label>
                <CustomSelect id="show-seconds" value={String(settings.seconds)} onChange={(v) => setSettings((p) => ({ ...p, seconds: Number(v) }))} options={SECONDS_OPTIONS.map((n) => ({ value: String(n), label: n ? `${n} saniye` : 'Süre yok' }))} />
              </div>
              <div className={s.field}>
                <label htmlFor="show-wrong">Yanlış cevapta</label>
                <CustomSelect id="show-wrong" value={settings.wrong} onChange={(v) => setSettings((p) => ({ ...p, wrong: v as WrongRule }))} options={(Object.keys(WRONG_RULE_LABEL) as WrongRule[]).filter((k) => !(settings.format === 'all' && k === 'pass')).map((k) => ({ value: k, label: WRONG_RULE_LABEL[k] }))} />
              </div>
            </div>
            <label className={s.checkRow}>
              <input type="checkbox" checked={settings.jokers} onChange={(e) => setSettings((p) => ({ ...p, jokers: e.target.checked }))} />
              <span>{settings.format === 'all' ? 'Jokerler açık: her takımın bir “çift puan” hakkı olur' : 'Jokerler açık: her takımın bir “çift puan” ve bir “yarı yarıya” hakkı olur'}</span>
            </label>
            <p className={s.muted}>
              {settings.format === 'all'
                ? 'Her soruyu bütün takımlar cevaplar: takımlar cevabını kâğıda ya da mini tahtaya yazar, siz her takımın şıkkını işaretleyip cevapları açarsınız; bilen her takım puan alır. '
                : 'Her soruyu sırası gelen tek takım cevaplar; sıra her soruda bir sonraki takıma geçer. '}
              Doğru cevap sorunun puan değeri kadar kazandırır (kolay 1, orta 2, zor 3).
              {settings.wrong === 'minus' ? ' Yanlış cevap aynı değer kadar puan götürür.' : settings.wrong === 'pass' ? ' Yanlış cevapta soru, henüz denememiş sıradaki takıma geçer.' : ' Yanlış cevapta puan değişmez.'}
            </p>
          </section>
        </>
      )}

      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.startRow}>
        <button type="button" className={s.primary} onClick={start} disabled={busy}>
          <Play size={20} aria-hidden="true" />{busy ? 'Hazırlanıyor…' : 'Yarışmayı başlat'}
        </button>
      </div>
    </div>
  );
}
