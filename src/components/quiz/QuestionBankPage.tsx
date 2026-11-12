'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Edit, Folder, HelpCircle, Plus, Search, Share2, Trash2, Upload, X } from '../icons';
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

interface QuestionGroup {
  key: string;
  subjectDisplay: string;
  topicDisplay: string;
  displayTitle: string;
  gradeDisplay: string | null;
  questions: QuestionRow[];
  isNoSubject: boolean;
  isNoTopic: boolean;
}

function GroupCheckbox({
  questionIds,
  picked,
  onToggle,
}: {
  questionIds: string[];
  picked: string[];
  onToggle: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const selectedCount = questionIds.filter((id) => picked.includes(id)).length;
  const isAll = selectedCount > 0 && selectedCount === questionIds.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < questionIds.length;

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={f.check}
      checked={isAll}
      onChange={(e) => onToggle(e.target.checked)}
      aria-label="Bu konudaki tüm soruları seç veya bırak"
      title="Konunun tüm sorularını seç"
    />
  );
}

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

  // Açık / kapalı grup ve soru durumları
  const [manualOpenGroups, setManualOpenGroups] = useState<Set<string>>(new Set());
  const [closedInFilter, setClosedInFilter] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const groupIdBase = useId();
  const hasFilter = Boolean(q.trim() || subject || grade || tag);
  const prevFilterActive = useRef(hasFilter);

  useEffect(() => {
    if (prevFilterActive.current !== hasFilter) {
      prevFilterActive.current = hasFilter;
      setClosedInFilter(new Set());
    }
  }, [hasFilter]);

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
  const distinctSubjects = useMemo(() => {
    const list = Array.from(new Set(all.map((x) => x.subject?.trim()).filter((s): s is string => !!s)));
    list.sort((a, b) => a.localeCompare(b, 'tr'));
    return list;
  }, [all]);
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of all) {
      const s = item.subject?.trim();
      if (s) counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [all]);
  const tags = useMemo(() => Array.from(new Set(all.flatMap((x) => x.tags))).sort((a, b) => a.localeCompare(b, 'tr')), [all]);
  const visible = useMemo(() => {
    const n = normalize(q.trim());
    return all.filter((x) => (!subject || x.subject === subject) && (!grade || x.grade === grade) && (!tag || x.tags.includes(tag))
      && (!n || n.split(/\s+/).every((w) => normalize([x.body, ...x.choices, x.topic || '', ...x.tags].join(' ')).includes(w))));
  }, [all, q, subject, grade, tag]);

  const groups = useMemo(() => {
    const map = new Map<string, {
      key: string;
      rawSubject: string;
      rawTopic: string;
      questions: QuestionRow[];
    }>();

    for (const item of visible) {
      const s = item.subject?.trim() || '';
      const t = item.topic?.trim() || '';
      const normSub = s.toLocaleLowerCase('tr');
      const normTop = t.toLocaleLowerCase('tr');
      const key = `${normSub}::${normTop}`;

      const existing = map.get(key);
      if (existing) {
        existing.questions.push(item);
      } else {
        map.set(key, {
          key,
          rawSubject: s,
          rawTopic: t,
          questions: [item],
        });
      }
    }

    const list: QuestionGroup[] = Array.from(map.values()).map((entry) => {
      const isNoSubject = !entry.rawSubject;
      const isNoTopic = !entry.rawTopic;
      const subjectDisplay = entry.rawSubject || 'Ders seçilmedi';
      const topicDisplay = entry.rawTopic || 'Konusuz sorular';
      const displayTitle = `${subjectDisplay} · ${topicDisplay}`;

      const distinctGrades = Array.from(
        new Set(entry.questions.map((x) => x.grade?.trim()).filter((g): g is string => !!g))
      );
      const gradeDisplay =
        distinctGrades.length === 1
          ? distinctGrades[0]
          : distinctGrades.length > 1
          ? 'Karışık'
          : null;

      return {
        key: entry.key,
        subjectDisplay,
        topicDisplay,
        displayTitle,
        gradeDisplay,
        questions: entry.questions,
        isNoSubject,
        isNoTopic,
      };
    });

    list.sort((a, b) => {
      if (a.isNoSubject !== b.isNoSubject) {
        return a.isNoSubject ? 1 : -1;
      }
      if (!a.isNoSubject) {
        const subComp = a.subjectDisplay.localeCompare(b.subjectDisplay, 'tr');
        if (subComp !== 0) return subComp;
      }
      if (a.isNoTopic !== b.isNoTopic) {
        return a.isNoTopic ? 1 : -1;
      }
      return a.topicDisplay.localeCompare(b.topicDisplay, 'tr');
    });

    return list;
  }, [visible]);

  const isGroupOpen = (key: string): boolean => {
    if (hasFilter) {
      return !closedInFilter.has(key);
    }
    return manualOpenGroups.has(key);
  };

  const toggleGroup = (key: string) => {
    if (hasFilter) {
      setClosedInFilter((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      setManualOpenGroups((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  };

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (hasFilter) {
      setClosedInFilter(new Set());
    } else {
      setManualOpenGroups(new Set(groups.map((g) => g.key)));
    }
  };

  const handleCollapseAll = () => {
    if (hasFilter) {
      setClosedInFilter(new Set(groups.map((g) => g.key)));
    } else {
      setManualOpenGroups(new Set());
    }
  };

  const handleClearFilters = () => {
    setQ('');
    setSubject(ANY);
    setGrade(ANY);
    setTag(ANY);
    setClosedInFilter(new Set());
  };

  const handleGroupCheckToggle = (groupQuestionIds: string[], checked: boolean) => {
    setPicked((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...groupQuestionIds])).slice(0, 100);
      }
      const set = new Set(groupQuestionIds);
      return prev.filter((id) => !set.has(id));
    });
  };

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
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {all.length === 0 ? (
        <div className={f.empty}>
          <HelpCircle size={32} aria-hidden="true" />
          <h3>Bankanızda henüz soru yok</h3>
          <p>Çoktan seçmeli sorular ekleyin: metin, isteğe bağlı görsel, 2–5 şık ve doğru cevap. Sorular ders, kademe ve konuya göre süzülebilir.</p>
          <button type="button" className={f.primaryButton} onClick={() => setEditing({ id: null, value: { ...EMPTY, choices: [...EMPTY.choices] } })}><Plus size={18} aria-hidden="true" />İlk soruyu ekle</button>
        </div>
      ) : (
        <div className={styles.bankLayout}>
          <aside className={styles.bankSidebar} aria-label="Soru bankası menüsü ve filtreler">
            {/* Mobilde görünen üst intro */}
            <div className={`${f.topBar} ${styles.bankIntro} ${styles.mobileIntro}`}>
              <p className={f.muted}>Soruları bir kez yazın, istediğiniz quizde tekrar kullanın. Quiz göndermek için Ödev gönder sayfasında türü “Quiz” seçin.</p>
              <button type="button" className={f.primaryButton} onClick={() => setEditing({ id: null, value: { ...EMPTY, choices: [...EMPTY.choices] } })}>
                <Plus size={18} aria-hidden="true" />Yeni soru
              </button>
            </div>

            {/* Desktopta menünün en üstündeki Yeni Soru butonu */}
            <button
              type="button"
              className={`${f.primaryButton} ${styles.desktopNewQuestionBtn}`}
              onClick={() => setEditing({ id: null, value: { ...EMPTY, choices: [...EMPTY.choices] } })}
            >
              <Plus size={18} aria-hidden="true" />Yeni soru
            </button>

            {/* Arama ve Filtreler */}
            <div className={styles.bankFilters}>
              <label className={f.search}>
                <span className={f.srOnly}>Sorularda ara</span>
                <Search size={18} aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Soru, şık, konu ya da etiket ara" />
              </label>

              {/* Mobilde açılır kutu (CustomSelect) */}
              <div className={`${styles.bankFilterField} ${styles.mobileSubjectField}`}>
                <label htmlFor="bank-subject">Ders</label>
                <CustomSelect id="bank-subject" value={subject} onChange={setSubject} options={[{ value: ANY, label: 'Bütün dersler' }, ...subjects]} />
              </div>

              {/* Desktopta dikey Dersler Menüsü */}
              <div className={styles.desktopSubjectNav}>
                <span className={styles.desktopNavLabel}>Dersler</span>
                <ul className={styles.desktopNavList}>
                  <li>
                    <button
                      type="button"
                      className={styles.desktopNavItem}
                      aria-pressed={subject === ANY}
                      onClick={() => setSubject(ANY)}
                    >
                      <span className={styles.desktopNavName}>Bütün dersler</span>
                      <span className={styles.desktopNavCount}>{all.length}</span>
                    </button>
                  </li>
                  {distinctSubjects.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className={styles.desktopNavItem}
                        aria-pressed={subject === s}
                        onClick={() => setSubject(subject === s ? ANY : s)}
                      >
                        <span className={styles.desktopNavName}>{s}</span>
                        <span className={styles.desktopNavCount}>{subjectCounts[s] || 0}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kademe & Etiket filtreleri */}
              <div className={styles.desktopFilterGroup}>
                <div className={styles.bankFilterField}>
                  <label htmlFor="bank-grade">Kademe</label>
                  <CustomSelect id="bank-grade" value={grade} onChange={setGrade} options={[{ value: ANY, label: 'Bütün kademeler' }, ...GRADE_OPTIONS]} />
                </div>
                <div className={styles.bankFilterField}>
                  <label htmlFor="bank-tag">Etiket</label>
                  <CustomSelect id="bank-tag" value={tag} onChange={setTag} options={[{ value: ANY, label: tags.length ? 'Bütün etiketler' : 'Etiket yok' }, ...tags]} disabled={!tags.length} />
                </div>
              </div>

              {hasFilter && (
                <div className={styles.desktopClearRow}>
                  <button type="button" onClick={handleClearFilters}>
                    Filtreleri temizle
                  </button>
                </div>
              )}

              {/* Desktop menü alt bilgi notu */}
              <p className={styles.desktopIntroNote}>
                Soruları bir kez yazın, istediğiniz quizde tekrar kullanın.
              </p>
            </div>
          </aside>

          {/* Soru ve Konu Listesi */}
          <main className={styles.bankMain}>
            <div className={styles.bankResultBar}>
              <p className={f.muted}>{visible.length} / {all.length} soru{picking ? ` · ${picked.length} seçili` : ''}</p>
              {hasFilter && <button type="button" onClick={handleClearFilters} className={styles.mobileClearBtn}>Filtreleri temizle</button>}
              {groups.length >= 2 && (
                <span className={styles.bankGroupToggles}>
                  <button type="button" onClick={handleExpandAll} className={styles.groupToggleBtn}>Tümünü aç</button>
                  <button type="button" onClick={handleCollapseAll} className={styles.groupToggleBtn}>Tümünü kapat</button>
                </span>
              )}
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
            <div className={styles.bankGroups}>
              {groups.map((g, gi) => {
                const isOpen = isGroupOpen(g.key);
                const btnId = `${groupIdBase}-btn-${gi}`;
                const panelId = `${groupIdBase}-panel-${gi}`;
                return (
                  <div
                    key={g.key}
                    className={`${styles.groupAccordion} ${isOpen ? styles.groupAccordionOpen : ''}`}
                  >
                    <div
                      className={`${styles.groupHeaderRow} ${isOpen ? styles.groupHeaderRowOpen : ''}`}
                    >
                      {picking && (
                        <div className={styles.groupCheckWrapper}>
                          <GroupCheckbox
                            questionIds={g.questions.map((q) => q.id)}
                            picked={picked}
                            onToggle={(checked) =>
                              handleGroupCheckToggle(
                                g.questions.map((q) => q.id),
                                checked
                              )
                            }
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        id={btnId}
                        className={styles.groupButton}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleGroup(g.key)}
                      >
                        <span className={styles.groupIcon} aria-hidden="true">
                          <Folder size={18} />
                        </span>
                        <span className={styles.groupMain}>
                          <span className={styles.groupTitle}>{g.displayTitle}</span>
                          {g.gradeDisplay && (
                            <span className={styles.groupGrade}>{g.gradeDisplay}</span>
                          )}
                        </span>
                        <span className={styles.groupMeta}>
                          <span className={styles.groupCount}>{g.questions.length} soru</span>
                          <ChevronDown
                            size={18}
                            className={`${styles.groupChevron} ${isOpen ? styles.groupChevronOpen : ''}`}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    </div>

                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={btnId}
                        className={styles.groupPanel}
                      >
                        {g.questions.map((x) => {
                          const isQExpanded = expandedQuestions.has(x.id);
                          const hasValidCorrect =
                            x.correct_index >= 0 && x.correct_index < x.choices.length;

                          return (
                            <article
                              key={x.id}
                              className={`${styles.qCard} ${isQExpanded ? styles.qCardExpanded : ''}`}
                            >
                              <div className={styles.qCompactRow}>
                                {picking && (
                                  <input
                                    type="checkbox"
                                    className={f.check}
                                    checked={picked.includes(x.id)}
                                    onChange={(e) =>
                                      setPicked((p) =>
                                        e.target.checked
                                          ? [...p, x.id].slice(0, 100)
                                          : p.filter((id) => id !== x.id)
                                      )
                                    }
                                    aria-label="Paylaşmak için seç"
                                  />
                                )}
                                <button
                                  type="button"
                                  className={styles.qExpandBtn}
                                  aria-expanded={isQExpanded}
                                  aria-controls={`q-details-${x.id}`}
                                  onClick={() => toggleQuestion(x.id)}
                                >
                                  {x.image_path && urls[x.image_path] && (
                                    // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı
                                    <img
                                      className={styles.qMiniThumb}
                                      src={urls[x.image_path]}
                                      alt=""
                                    />
                                  )}
                                  <span className={styles.qClampText}>
                                    <RichText text={x.body} inline />
                                  </span>
                                  {hasValidCorrect && (
                                    <span className={styles.qCorrectBadge}>
                                      Doğru: {CHOICE_LETTERS[x.correct_index]}
                                    </span>
                                  )}
                                  <ChevronDown
                                    size={16}
                                    className={`${styles.qChevron} ${isQExpanded ? styles.qChevronOpen : ''}`}
                                    aria-hidden="true"
                                  />
                                </button>
                                <div className={`${f.rowActions} ${styles.bankActions}`}>
                                  <button
                                    type="button"
                                    className={f.iconButton}
                                    onClick={() => setEditing({ id: x.id, value: asInput(x) })}
                                    aria-label="Soruyu düzenle"
                                    title="Düzenle"
                                  >
                                    <Edit size={18} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className={f.iconButton}
                                    onClick={() => setEditing({ id: null, value: asInput(x) })}
                                    aria-label="Sorunun kopyasını oluştur"
                                    title="Kopyasını oluştur"
                                  >
                                    <Copy size={18} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className={f.iconButton}
                                    onClick={() => remove(x)}
                                    aria-label="Soruyu sil"
                                    title="Sil"
                                  >
                                    <Trash2 size={18} aria-hidden="true" />
                                  </button>
                                </div>
                              </div>

                              {isQExpanded && (
                                <div id={`q-details-${x.id}`} className={styles.qExpandedDetails}>
                                  {x.image_path && urls[x.image_path] && (
                                    <div className={styles.qExpandedImageBox}>
                                      {/* eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı */}
                                      <img
                                        className={styles.questionImage}
                                        src={urls[x.image_path]}
                                        alt=""
                                      />
                                    </div>
                                  )}
                                  <div className={styles.qFullBody}>
                                    <RichText text={x.body} />
                                  </div>
                                  <ol className={styles.qChoices} aria-label="Şıklar">
                                    {x.choices.map((c, i) => (
                                      <li
                                        key={i}
                                        className={i === x.correct_index ? styles.qCorrect : undefined}
                                      >
                                        <b>{CHOICE_LETTERS[i]}) </b>
                                        <RichText text={c} inline />
                                        {i === x.correct_index && (
                                          <span className={f.srOnly}> (doğru cevap)</span>
                                        )}
                                        {i === x.correct_index && (
                                          <Check size={14} aria-hidden="true" />
                                        )}
                                      </li>
                                    ))}
                                  </ol>
                                  {x.explanation && (
                                    <div className={styles.qExplanation}>
                                      <span className={styles.qExplanationTitle}>Açıklama:</span>
                                      <RichText text={x.explanation} />
                                    </div>
                                  )}
                                  {[x.subject, x.grade, x.topic].filter(Boolean).length +
                                    x.tags.length >
                                    0 && (
                                    <div className={f.meta}>
                                      {[x.subject, x.grade, x.topic].filter(Boolean).length > 0 && (
                                        <span>
                                          {[x.subject, x.grade, x.topic].filter(Boolean).join(' · ')}
                                        </span>
                                      )}
                                      {x.tags.map((t) => (
                                        <span key={t} className={f.tag}>
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </main>
        </div>
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
          onPublished={() => { setSharing(false); setPicking(false); setPicked([]); setNotice({ kind: 'ok', text: 'Soru seti toplulukta paylaşıldı. Topluluk > Paylaştıklarım’da görebilirsiniz.' }); }}
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
