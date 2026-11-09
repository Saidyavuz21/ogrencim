'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Copy, Edit, Folder, HelpCircle, Plus, Search, Share2, Trash2, Upload, X } from '../icons';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { Notice, NoticeState } from '../teacher/TeacherUi';
import { GRADE_OPTIONS } from '../../lib/filesData';
import {
  CHOICE_LETTERS, copyImageToQuiz, deleteQuestion, discardQuizImage, listQuestions, MAX_CHOICES, MIN_CHOICES, QuestionInput, QuestionRow,
  QUIZ_IMAGE_TYPES, saveQuestion, uploadQuizImage, validateQuestion,
} from '../../lib/quizData';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { HomeworkFilePicker } from '../files/HomeworkFilePicker';
import { Modal, normalize, TagInput } from '../files/FilesUi';
import f from '../files/Files.module.css';
import { useQuizImages } from './useQuizImages';
import { RichText } from '../math/RichText';
import { RichTextField } from '../math/RichTextField';
import styles from './Quiz.module.css';
import { PublishDialog } from '../community/PublishDialog';

const ANY = '';
const EMPTY: QuestionInput = { body: '', image_path: null, choices: ['', '', '', ''], correct_index: -1, explanation: null, grade: null, subject: null, topic: null, tags: [] };

/** Öğretmen: soru bankası (oluştur, düzenle, çoğalt, sil; ara ve süz) */
export function QuestionBankPage() {
  const { confirm } = useDialog();
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [editing, setEditing] = useState<{ id: string | null; value: QuestionInput } | null>(null);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState(ANY);
  const [grade, setGrade] = useState(ANY);
  const [tag, setTag] = useState(ANY);
  // Toplulukta paylaşmak için soru seçimi
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    listQuestions().then((res) => {
      if (!alive) return;
      if (res.ok) setQuestions(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, []);

  const all = useMemo(() => questions || [], [questions]);
  const urls = useQuizImages(all.map((x) => x.image_path));
  const subjects = useMemo(() => Array.from(new Set([...SUBJECT_OPTIONS, ...all.map((x) => x.subject).filter((s): s is string => !!s)])), [all]);
  const tags = useMemo(() => Array.from(new Set(all.flatMap((x) => x.tags))).sort((a, b) => a.localeCompare(b, 'tr')), [all]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return all.filter((x) => (!subject || x.subject === subject) && (!grade || x.grade === grade) && (!tag || x.tags.includes(tag))
      && (!n || n.split(/\s+/).every((w) => normalize([x.body, ...x.choices, x.topic || '', ...x.tags].join(' ')).includes(w))));
  }, [all, q, subject, grade, tag]);

  const remove = async (x: QuestionRow) => {
    const ok = await confirm({ title: 'Soruyu sil', message: 'Bu soru bankadan silinsin mi?\nDaha önce yayınladığınız quizler etkilenmez (sorunun kopyasını taşırlar).', confirmText: 'Sil', cancelText: 'Vazgeç', variant: 'danger' });
    if (!ok) return;
    const res = await deleteQuestion(x);
    if (!res.ok) { setNotice({ kind: 'error', text: `Silinemedi: ${res.error}` }); return; }
    setQuestions((prev) => (prev || []).filter((y) => y.id !== x.id));
    setNotice({ kind: 'ok', text: 'Soru silindi.' });
  };

  if (error) return <p className={f.error} role="alert">Sorular alınamadı: {error}</p>;
  if (!questions) return <Spinner center label="Sorular yükleniyor…" />;

  const asInput = (x: QuestionRow): QuestionInput => ({
    body: x.body, image_path: x.image_path, choices: [...x.choices], correct_index: x.correct_index, explanation: x.explanation,
    grade: x.grade, subject: x.subject, topic: x.topic, tags: [...x.tags],
  });

  return (
    <section className={`${f.page} ${styles.bankWorkspace}`} aria-label="Soru bankası">
      <div className={`${f.topBar} ${styles.bankIntro}`}>
        <p className={f.muted}>Soruları bir kez yazın, istediğiniz quizde tekrar kullanın. Quiz göndermek için Ödev gönder sayfasında türü “Quiz” seçin.</p>
        <button type="button" className={f.primaryButton} onClick={() => setEditing({ id: null, value: { ...EMPTY, choices: [...EMPTY.choices] } })}>
          <Plus size={18} aria-hidden="true" />Yeni soru
        </button>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {all.length === 0 ? (
        <div className={f.empty}>
          <HelpCircle size={32} aria-hidden="true" />
          <h3>Bankanızda henüz soru yok</h3>
          <p>Çoktan seçmeli sorular ekleyin: metin, isteğe bağlı görsel, 2–5 şık ve doğru cevap. Sorular ders, kademe ve konuya göre süzülebilir.</p>
          <button type="button" className={f.primaryButton} onClick={() => setEditing({ id: null, value: { ...EMPTY, choices: [...EMPTY.choices] } })}><Plus size={18} aria-hidden="true" />İlk soruyu ekle</button>
        </div>
      ) : (
        <>
          <div className={styles.bankFilters}>
            <label className={f.search}>
              <span className={f.srOnly}>Sorularda ara</span>
              <Search size={18} aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Soru, şık, konu ya da etiket ara" />
            </label>
            <div className={styles.bankFilterField}><label htmlFor="bank-subject">Ders</label><CustomSelect id="bank-subject" value={subject} onChange={setSubject} options={[{ value: ANY, label: 'Bütün dersler' }, ...subjects]} /></div>
            <div className={styles.bankFilterField}><label htmlFor="bank-grade">Kademe</label><CustomSelect id="bank-grade" value={grade} onChange={setGrade} options={[{ value: ANY, label: 'Bütün kademeler' }, ...GRADE_OPTIONS]} /></div>
            <div className={styles.bankFilterField}><label htmlFor="bank-tag">Etiket</label><CustomSelect id="bank-tag" value={tag} onChange={setTag} options={[{ value: ANY, label: tags.length ? 'Bütün etiketler' : 'Etiket yok' }, ...tags]} disabled={!tags.length} /></div>
          </div>
          <div className={styles.bankResultBar}><p className={f.muted}>{visible.length} / {all.length} soru{picking ? ` · ${picked.length} seçili` : ''}</p>
            {(q || subject || grade || tag) && <button type="button" onClick={() => { setQ(''); setSubject(ANY); setGrade(ANY); setTag(ANY); }}>Filtreleri temizle</button>}
            {picking ? (
              <span className={f.rowActions}>
                <button type="button" onClick={() => setPicked(Array.from(new Set([...picked, ...visible.map((x) => x.id)])).slice(0, 100))}>Görünenleri seç</button>
                <button type="button" onClick={() => { setPicking(false); setPicked([]); }}>Vazgeç</button>
                <button type="button" onClick={() => setSharing(true)} disabled={!picked.length}><Share2 size={16} aria-hidden="true" /> Seçilenleri paylaş ({picked.length})</button>
              </span>
            ) : (
              <button type="button" onClick={() => setPicking(true)} title="Soruları seçip set olarak diğer öğretmenlerle paylaşın"><Share2 size={16} aria-hidden="true" /> Toplulukta paylaş</button>
            )}
          </div>
          {visible.length === 0 ? <p className={f.muted}>Aramaya uyan soru yok.</p> : (
            <div className={styles.bankList}>
              {visible.map((x) => (
                <article key={x.id} className={styles.qCard}>
                  <div className={styles.qHead}>
                    {picking && (
                      <input
                        type="checkbox"
                        className={f.check}
                        checked={picked.includes(x.id)}
                        onChange={(e) => setPicked((p) => (e.target.checked ? [...p, x.id].slice(0, 100) : p.filter((id) => id !== x.id)))}
                        aria-label="Paylaşmak için seç"
                      />
                    )}
                    {x.image_path && urls[x.image_path] && (
                      // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
                      <img className={styles.qThumb} src={urls[x.image_path]} alt="" />
                    )}
                    <div className={styles.qBody}><RichText text={x.body} /></div>
                    <div className={`${f.rowActions} ${styles.bankActions}`}>
                      <button type="button" className={f.iconButton} onClick={() => setEditing({ id: x.id, value: asInput(x) })} aria-label="Soruyu düzenle" title="Düzenle"><Edit size={18} aria-hidden="true" /></button>
                      <button type="button" className={f.iconButton} onClick={() => setEditing({ id: null, value: asInput(x) })} aria-label="Sorunun kopyasını oluştur" title="Kopyasını oluştur"><Copy size={18} aria-hidden="true" /></button>
                      <button type="button" className={f.iconButton} onClick={() => remove(x)} aria-label="Soruyu sil" title="Sil"><Trash2 size={18} aria-hidden="true" /></button>
                    </div>
                  </div>
                  <ol className={styles.qChoices} aria-label="Şıklar">
                    {x.choices.map((c, i) => (
                      <li key={i} className={i === x.correct_index ? styles.qCorrect : undefined}>
                        <b>{CHOICE_LETTERS[i]}) </b><RichText text={c} inline />{i === x.correct_index && <span className={f.srOnly}> (doğru cevap)</span>}
                        {i === x.correct_index && <Check size={14} aria-hidden="true" />}
                      </li>
                    ))}
                  </ol>
                  {[x.subject, x.grade, x.topic].filter(Boolean).length + x.tags.length > 0 && (
                    <div className={f.meta}>
                      {[x.subject, x.grade, x.topic].filter(Boolean).length > 0 && <span>{[x.subject, x.grade, x.topic].filter(Boolean).join(' · ')}</span>}
                      {x.tags.map((t) => <span key={t} className={f.tag}>{t}</span>)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {sharing && (
        <PublishDialog
          source={{ kind: 'questions', questionIds: picked }}
          initial={(() => {
            const rows = all.filter((x) => picked.includes(x.id));
            const one = (k: 'grade' | 'subject') => { const v = Array.from(new Set(rows.map((r) => r[k]).filter(Boolean))); return v.length === 1 ? (v[0] as string) : ''; };
            const topic = Array.from(new Set(rows.map((r) => r.topic).filter(Boolean)));
            return { title: topic.length === 1 ? `${topic[0]} soruları` : '', grade: one('grade'), subject: one('subject') };
          })()}
          onClose={() => setSharing(false)}
          onPublished={() => { setSharing(false); setPicking(false); setPicked([]); setNotice({ kind: 'ok', text: 'Soru seti toplulukta paylaşıldı. Keşfet > Paylaştıklarım’da görebilirsiniz.' }); }}
        />
      )}
      {editing && (
        <QuestionEditor
          id={editing.id}
          initial={editing.value}
          tagSuggestions={tags}
          onClose={() => setEditing(null)}
          onSaved={(row, created) => {
            setQuestions((prev) => (created ? [row, ...(prev || [])] : (prev || []).map((y) => (y.id === row.id ? row : y))));
            setEditing(null);
            setNotice({ kind: 'ok', text: created ? 'Soru bankaya eklendi.' : 'Soru kaydedildi.' });
          }}
        />
      )}
    </section>
  );
}

/** Soru yaz / düzenle: metin, görsel (yükle ya da Dosyalarım'dan), 2–5 şık, doğru şık, açıklama, etiketler */
export function QuestionEditor({ id, initial, tagSuggestions, onClose, onSaved }: {
  id: string | null;
  initial: QuestionInput;
  tagSuggestions: string[];
  onClose: () => void;
  onSaved: (row: QuestionRow, created: boolean) => void;
}) {
  const ids = { body: useId(), expl: useId(), topic: useId(), tags: useId() };
  const [v, setV] = useState<QuestionInput>(initial);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Bu pencerede yüklenip kaydedilmeyen görseller vazgeçilince silinir
  const fresh = useRef<string[]>([]);
  const urls = useQuizImages([v.image_path]);

  const setChoice = (i: number, text: string) => setV((p) => ({ ...p, choices: p.choices.map((c, j) => (j === i ? text : c)) }));
  const removeChoice = (i: number) => setV((p) => ({
    ...p,
    choices: p.choices.filter((_, j) => j !== i),
    correct_index: p.correct_index === i ? -1 : p.correct_index > i ? p.correct_index - 1 : p.correct_index,
  }));

  const attachImage = (path: string) => {
    fresh.current.push(path);
    setV((p) => ({ ...p, image_path: path }));
  };
  const upload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setImageBusy(true);
    setError(null);
    const res = await uploadQuizImage(file);
    setImageBusy(false);
    if (!res.ok) { setError(res.error); return; }
    attachImage(res.data);
  };

  const close = () => {
    fresh.current.forEach((p) => { void discardQuizImage(p); });
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateQuestion(v);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    const res = await saveQuestion(id, v);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    // Kaydedilen görsel kalır; denenip bırakılanlar silinir
    fresh.current.filter((p) => p !== res.data.image_path).forEach((p) => { void discardQuizImage(p); });
    fresh.current = [];
    // Düzenlemede görsel değiştiyse eskisi (başka yerde kullanılmıyorsa) silinir
    if (id && initial.image_path && initial.image_path !== res.data.image_path) void discardQuizImage(initial.image_path);
    onSaved(res.data, !id);
  };

  return (
    <Modal title={id ? 'Soruyu düzenle' : 'Yeni soru'} onClose={close} busy={busy} wide>
      <form className={`${f.form} ${styles.bankEditor}`} onSubmit={submit}>
        <div className={f.field}>
          <label htmlFor={ids.body}>Soru</label>
          <RichTextField
            id={ids.body}
            value={v.body}
            maxLength={2000}
            rows={4}
            multiline
            onChange={(body) => setV({ ...v, body })}
            placeholder="Soru metnini yazın"
            data-autofocus
          />
        </div>

        <div className={f.field}>
          <span>Görsel <span className={f.hint}>(isteğe bağlı · JPG, PNG, WEBP, GIF · 5 MB)</span></span>
          <div className={styles.imageBox}>
            {v.image_path && (urls[v.image_path]
              // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
              ? <img className={styles.thumb} src={urls[v.image_path]} alt="Soru görseli" />
              : <span className={f.muted}>Görsel ekli</span>)}
            <input ref={fileInput} type="file" accept={QUIZ_IMAGE_TYPES.join(',')} className={f.srOnly} tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" className={f.secondaryButton} onClick={() => fileInput.current?.click()} disabled={imageBusy}>
              <Upload size={18} aria-hidden="true" />{imageBusy ? 'Yükleniyor…' : v.image_path ? 'Değiştir' : 'Görsel yükle'}
            </button>
            <button type="button" className={f.secondaryButton} onClick={() => setPicking(true)} disabled={imageBusy}>
              <Folder size={18} aria-hidden="true" />Dosyalarımdan seç
            </button>
            {v.image_path && (
              <button type="button" className={f.linkButton} onClick={() => setV({ ...v, image_path: null })}>
                <X size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Görseli kaldır
              </button>
            )}
          </div>
        </div>

        <fieldset className={f.field} style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ marginBottom: 6 }}>Şıklar <span className={f.hint}>(doğru şıkkın harfine basın · {MIN_CHOICES}–{MAX_CHOICES} şık)</span></legend>
          <div className={styles.choiceRows} role="radiogroup" aria-label="Doğru şık">
            {v.choices.map((c, i) => (
              <div key={i} className={styles.choiceRow}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={v.correct_index === i}
                  aria-label={`${CHOICE_LETTERS[i]} şıkkı doğru cevap`}
                  className={styles.correctToggle}
                  onClick={() => setV({ ...v, correct_index: i })}
                >
                  {v.correct_index === i ? <Check size={16} aria-hidden="true" /> : null}{CHOICE_LETTERS[i]}
                </button>
                <RichTextField
                  value={c}
                  maxLength={300}
                  multiline={false}
                  onChange={(val) => setChoice(i, val)}
                  aria-label={`${CHOICE_LETTERS[i]} şıkkı`}
                  placeholder={`${CHOICE_LETTERS[i]} şıkkı`}
                />
                <button type="button" className={f.iconButton} onClick={() => removeChoice(i)} disabled={v.choices.length <= MIN_CHOICES} aria-label={`${CHOICE_LETTERS[i]} şıkkını sil`} title="Şıkkı sil">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {v.choices.length < MAX_CHOICES && (
            <button type="button" className={f.linkButton} style={{ justifySelf: 'start' }} onClick={() => setV({ ...v, choices: [...v.choices, ''] })}>
              <Plus size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Şık ekle
            </button>
          )}
        </fieldset>

        <div className={f.field}>
          <label htmlFor={ids.expl}>
            Çözüm / açıklama <span className={f.hint}>(isteğe bağlı; öğrenci cevabı görünce gösterilir)</span>
          </label>
          <RichTextField
            id={ids.expl}
            value={v.explanation || ''}
            maxLength={1000}
            rows={2}
            multiline
            onChange={(explanation) => setV({ ...v, explanation })}
          />
        </div>

        <div className={f.grid2}>
          <div className={f.field}>
            <span>Ders</span>
            <CustomSelect value={v.subject || ANY} onChange={(x) => setV({ ...v, subject: x || null })} options={[{ value: ANY, label: 'Seçilmedi' }, ...SUBJECT_OPTIONS]} />
          </div>
          <div className={f.field}>
            <span>Kademe</span>
            <CustomSelect value={v.grade || ANY} onChange={(x) => setV({ ...v, grade: x || null })} options={[{ value: ANY, label: 'Seçilmedi' }, ...GRADE_OPTIONS]} />
          </div>
          <label className={f.field} htmlFor={ids.topic}>
            Konu
            <input id={ids.topic} value={v.topic || ''} maxLength={120} onChange={(e) => setV({ ...v, topic: e.target.value })} placeholder="Örn. Kesirler" />
          </label>
          <div className={f.field}>
            <label htmlFor={ids.tags}>Etiketler</label>
            <TagInput id={ids.tags} value={v.tags} onChange={(tags) => setV({ ...v, tags })} suggestions={tagSuggestions} />
          </div>
        </div>

        {error && <p className={f.error} role="alert">{error}</p>}
        <div className={f.modalActions}>
          <button type="button" className={f.secondaryButton} onClick={close} disabled={busy}>Vazgeç</button>
          <button type="submit" className={f.primaryButton} disabled={busy || imageBusy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </form>

      {picking && (
        <HomeworkFilePicker
          title="Soru görseli seç"
          remaining={1}
          already={[]}
          accept={(mime) => QUIZ_IMAGE_TYPES.includes(mime)}
          onClose={() => setPicking(false)}
          onPick={async (chosen) => {
            setPicking(false);
            const p = chosen[0];
            if (!p) return;
            setImageBusy(true);
            setError(null);
            const res = await copyImageToQuiz(p.bucket, p.path, p.name);
            setImageBusy(false);
            if (!res.ok) { setError(`Görsel eklenemedi: ${res.error}`); return; }
            attachImage(res.data);
          }}
        />
      )}
    </Modal>
  );
}
