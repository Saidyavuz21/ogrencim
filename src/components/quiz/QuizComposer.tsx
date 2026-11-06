'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Plus, Search, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { GRADE_OPTIONS } from '../../lib/filesData';
import { CHOICE_LETTERS, listQuestions, QuestionInput, QuestionRow, QuizMode } from '../../lib/quizData';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { Modal, normalize } from '../files/FilesUi';
import { QuestionEditor } from './QuestionBankPage';
import f from '../files/Files.module.css';
import styles from './Quiz.module.css';
import ts from '../teacher/TeacherDashboard.module.css';

const ANY = '';
const NEW_QUESTION: QuestionInput = { body: '', image_path: null, choices: ['', '', '', ''], correct_index: -1, explanation: null, grade: null, subject: null, topic: null, tags: [] };

export interface QuizDraft { mode: QuizMode; questionIds: string[] }

/** Ödev formunda quiz bölümü: mod, sorular (bankadan seç / yeni yaz), sıralama */
export function QuizComposer({ value, onChange, subject }: {
  value: QuizDraft;
  onChange: (next: QuizDraft) => void;
  /** Ödevin dersi: soru seçicide ön süzgeç */
  subject: string;
}) {
  const [bank, setBank] = useState<QuestionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    let alive = true;
    listQuestions().then((res) => {
      if (!alive) return;
      if (res.ok) setBank(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => new Map((bank || []).map((q) => [q.id, q])), [bank]);
  const chosen = value.questionIds.map((id) => byId.get(id)).filter((q): q is QuestionRow => !!q);
  const move = (id: string, dir: -1 | 1) => {
    const ids = [...value.questionIds];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onChange({ ...value, questionIds: ids });
  };

  return (
    <div className={styles.quizBox}>
      <fieldset className={`${ts.field} ${ts.fullRow} ${ts.chipFieldset}`}>
        <legend>Quiz modu</legend>
        <div className={ts.subjectChips}>
          <button type="button" className={ts.subjectChip} aria-pressed={value.mode === 'practice'} onClick={() => onChange({ ...value, mode: 'practice' })}>Alıştırma</button>
          <button type="button" className={ts.subjectChip} aria-pressed={value.mode === 'exam'} onClick={() => onChange({ ...value, mode: 'exam' })}>Sınav</button>
        </div>
        <p className={ts.optionalHint} style={{ margin: '6px 0 0' }}>
          {value.mode === 'practice'
            ? 'Öğrenci her soruda hemen doğru/yanlış görür, 3 deneme hakkı vardır. Puan: 1. denemede tam, 2.de yarım, 3.de çeyrek.'
            : 'Öğrenci cevaplarını teslim tarihine kadar değiştirebilir; doğru cevaplar ve sonuç teslim tarihi geçince açıklanır. Teslim tarihi zorunlu.'}
          {' '}Sonuç Ödev kontrolü’ne işlenir: %70 ve üstü Yaptı, %40–69 Kısmen, altı Yapmadı.
        </p>
      </fieldset>

      <div className={ts.field}>
        <span>Sorular {chosen.length > 0 && <span className={ts.optionalHint}>({chosen.length} soru)</span>}</span>
        {error && <p className={f.error} role="alert">Soru bankası alınamadı: {error}</p>}
        {!bank && !error && <Spinner label="Soru bankası yükleniyor…" />}
        {chosen.length > 0 && (
          <ol className={styles.quizList}>
            {chosen.map((q, i) => (
              <li key={q.id}>
                <span title={q.body}><b>{i + 1}.</b>{q.body}</span>
                <span className={f.orderButtons} style={{ flex: 'none' }}>
                  <button type="button" className={f.iconButton} onClick={() => move(q.id, -1)} disabled={i === 0} aria-label={`${i + 1}. soruyu yukarı taşı`}><ChevronUp size={18} aria-hidden="true" /></button>
                  <button type="button" className={f.iconButton} onClick={() => move(q.id, 1)} disabled={i === chosen.length - 1} aria-label={`${i + 1}. soruyu aşağı taşı`}><ChevronDown size={18} aria-hidden="true" /></button>
                  <button type="button" className={f.iconButton} onClick={() => onChange({ ...value, questionIds: value.questionIds.filter((x) => x !== q.id) })} aria-label={`${i + 1}. soruyu çıkar`}><X size={18} aria-hidden="true" /></button>
                </span>
              </li>
            ))}
          </ol>
        )}
        {bank && (
          <div className={f.cardActions}>
            <button type="button" className={f.secondaryButton} onClick={() => setPicking(true)} disabled={!bank.length} title={bank.length ? undefined : 'Bankada henüz soru yok'}>
              <HelpCircle size={18} aria-hidden="true" />Bankadan soru seç{bank.length ? ` (${bank.length})` : ''}
            </button>
            <button type="button" className={f.secondaryButton} onClick={() => setWriting(true)}><Plus size={18} aria-hidden="true" />Yeni soru yaz</button>
          </div>
        )}
      </div>

      {picking && bank && (
        <QuestionPicker
          bank={bank}
          already={value.questionIds}
          defaultSubject={subject}
          onClose={() => setPicking(false)}
          onPick={(ids) => { onChange({ ...value, questionIds: [...value.questionIds, ...ids] }); setPicking(false); }}
        />
      )}
      {writing && (
        <QuestionEditor
          id={null}
          initial={{ ...NEW_QUESTION, choices: [...NEW_QUESTION.choices], subject: SUBJECT_OPTIONS.includes(subject) ? subject : null }}
          tagSuggestions={Array.from(new Set((bank || []).flatMap((q) => q.tags)))}
          onClose={() => setWriting(false)}
          onSaved={(row) => {
            setBank((prev) => [row, ...(prev || [])]);
            onChange({ ...value, questionIds: [...value.questionIds, row.id] });
            setWriting(false);
          }}
        />
      )}
    </div>
  );
}

function QuestionPicker({ bank, already, defaultSubject, onClose, onPick }: {
  bank: QuestionRow[];
  already: string[];
  defaultSubject: string;
  onClose: () => void;
  onPick: (ids: string[]) => void;
}) {
  const hasSubject = bank.some((q) => q.subject === defaultSubject);
  const [subject, setSubject] = useState(hasSubject ? defaultSubject : ANY);
  const [grade, setGrade] = useState(ANY);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const subjects = Array.from(new Set(bank.map((x) => x.subject).filter((s): s is string => !!s)));
  const n = normalize(q.trim());
  const list = bank.filter((x) => (!subject || x.subject === subject) && (!grade || x.grade === grade)
    && (!n || normalize([x.body, ...x.choices, x.topic || '', ...x.tags].join(' ')).includes(n)));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const free = list.filter((x) => !already.includes(x.id));
  const allPicked = free.length > 0 && free.every((x) => picked.includes(x.id));

  return (
    <Modal title="Bankadan soru seç" kicker={`${bank.length} soru`} onClose={onClose} wide>
      <div className={f.filters} style={{ gridTemplateColumns: 'minmax(200px, 2fr) repeat(2, minmax(140px, 1fr))' }}>
        <label className={f.search}>
          <span className={f.srOnly}>Ara</span>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Soru, şık, konu ya da etiket" data-autofocus />
        </label>
        <CustomSelect value={subject} onChange={setSubject} options={[{ value: ANY, label: 'Bütün dersler' }, ...subjects]} />
        <CustomSelect value={grade} onChange={setGrade} options={[{ value: ANY, label: 'Bütün kademeler' }, ...GRADE_OPTIONS]} />
      </div>
      {free.length > 0 && (
        <label className={f.muted} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" className={f.check} checked={allPicked} onChange={() => setPicked((p) => (allPicked ? p.filter((id) => !free.some((x) => x.id === id)) : Array.from(new Set([...p, ...free.map((x) => x.id)]))))} />
          Listelenenlerin hepsini seç ({free.length})
        </label>
      )}
      {list.length === 0 ? <p className={f.muted}>Süzgece uyan soru yok.</p> : (
        <ul className={f.pickList}>
          {list.map((x) => {
            const isIn = already.includes(x.id);
            return (
              <li key={x.id}>
                <label className={isIn ? f.pickDisabled : undefined}>
                  <input type="checkbox" className={f.check} checked={isIn || picked.includes(x.id)} disabled={isIn} onChange={() => toggle(x.id)} />
                  <span className={f.pickText}>
                    <strong title={x.body}>{x.body}</strong>
                    <small>{isIn ? 'Quizde zaten var' : `Doğru: ${CHOICE_LETTERS[x.correct_index]} · ${x.choices.length} şık${x.subject ? ` · ${x.subject}` : ''}${x.topic ? ` · ${x.topic}` : ''}`}</small>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div className={f.modalActions}>
        <button type="button" className={f.secondaryButton} onClick={onClose}>Vazgeç</button>
        <button type="button" className={f.primaryButton} onClick={() => onPick(picked)} disabled={!picked.length}>{picked.length ? `${picked.length} soruyu ekle` : 'Soru seçin'}</button>
      </div>
    </Modal>
  );
}
