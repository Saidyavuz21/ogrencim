'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Trash2, CheckSquare, Calendar, MoreVertical, Search, Paperclip, X } from '../icons';
import { ALLOWED_FILE_TYPES, createHomework, deleteHomework, formatBytes, HomeworkRow, listMyHomeworks, validateHomeworkFiles } from '../../lib/teacherData';
import { AttachmentList, CollapsiblePanel, Notice, NoticeState, formatDate } from './TeacherUi';
import { CustomSelect } from '../CustomSelect';
import { branchSubject, subjectHue, subjectShortLabel, subjectsForClass } from '../../data/subjects';
import styles from './TeacherDashboard.module.css';

/** Başlık ayrıca istenmez: "Hayat bilgisi ödevi · 6 Kasım" */
const autoTitle = (subject: string) => {
  const s = subject.trim() || 'Genel';
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return `${s.charAt(0).toLocaleUpperCase('tr-TR')}${s.slice(1)} ödevi · ${date}`;
};

const OTHER = '__diger__';
const MAX_FILES = 5;

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

/** Ders rengiyle küçük etiket (liste kartlarında) */
function SubjectTag({ subject }: { subject: string }) {
  return (
    <span className={styles.subjectTag} style={{ '--subject-hue': subjectHue(subject) } as CSSVars}>
      {subjectShortLabel(subject)}
    </span>
  );
}

/** İstanbul saatine göre bugünden itibaren gün ekler → 'YYYY-AA-GG' */
function addDays(today: string, days: number) {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('sv-SE');
}

/** Bugünden sonraki ilk belirtilen gün (0 = pazar … 5 = cuma) */
function nextWeekday(today: string, weekday: number) {
  const d = new Date(`${today}T12:00:00`);
  const diff = ((weekday - d.getDay() + 7) % 7) || 7;
  return addDays(today, diff);
}

interface TeacherAssignmentsPageProps {
  selectedClass: string;
  classNames: string[];
  defaultSubject: string;
  onOpenCheck: (homeworkId: string, className: string) => void;
}

export function TeacherAssignmentsPage({ selectedClass, classNames, defaultSubject, onOpenCheck }: TeacherAssignmentsPageProps) {
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState(false);

  const [description, setDescription] = useState('');
  const [className, setClassName] = useState(selectedClass || classNames[0] || '');
  // Ders kategorisi: sınıf seviyesine göre liste; branş öğretmenine kendi dersi hazır gelir
  const [subjectChoice, setSubjectChoice] = useState(() => branchSubject(defaultSubject, selectedClass || classNames[0] || ''));
  const [customSubject, setCustomSubject] = useState('');
  const subjectOptions = useMemo(() => subjectsForClass(className), [className]);
  const subject = subjectChoice === OTHER ? customSubject.trim() : subjectChoice;
  const changeClass = (next: string) => {
    setClassName(next);
    // Yeni sınıfın seviyesinde bu ders yoksa seçim sıfırlanır (branş dersi varsa o gelir)
    if (subjectChoice !== OTHER && !subjectsForClass(next).includes(subjectChoice)) {
      setSubjectChoice(branchSubject(defaultSubject, next));
    }
  };

  // Ödev listesi: arama ve ders süzgeci
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [link, setLink] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // Dosyalar eklenerek birikir (ikinci seçimde öncekiler silinmez); aynı dosya iki kez eklenmez
  const handleFiles = (list: FileList | null) => {
    const picked = Array.from(list || []);
    if (fileInput.current) fileInput.current.value = '';
    if (!picked.length) return;
    const merged = [...files];
    for (const f of picked) {
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
    }
    const problem = validateHomeworkFiles(merged);
    if (problem) {
      setNotice({ kind: 'error', text: problem });
      return;
    }
    setNotice(null);
    setFiles(merged);
  };
  const removeFile = (target: File) => setFiles((prev) => prev.filter((f) => f !== target));
  const [dragging, setDragging] = useState(false);

  const apply = (res: Awaited<ReturnType<typeof listMyHomeworks>>) => {
    setLoading(false);
    if (res.ok) setHomeworks(res.data);
    else setNotice({ kind: 'error', text: `Ödevler alınamadı: ${res.error}` });
  };
  const reload = useCallback(async () => apply(await listMyHomeworks()), []);

  useEffect(() => {
    let alive = true;
    listMyHomeworks().then((res) => { if (alive) apply(res); });
    return () => { alive = false; };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!subject) {
      setNotice({ kind: 'error', text: subjectChoice === OTHER ? 'Ders adını yazın.' : 'Ödevin hangi derse ait olduğunu seçin.' });
      return;
    }
    if (!description.trim() && !files.length && !link.trim()) {
      setNotice({ kind: 'error', text: 'Ödevin ne olduğunu yazın veya dosya / bağlantı ekleyin.' });
      return;
    }
    const title = autoTitle(subject);
    setBusy(true);
    const res = await createHomework({ title, subject, description, className, dueDate, points: 100, link, files });
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Ödev gönderilemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${title} ${className} sınıfına gönderildi${files.length ? ` (${files.length} dosya)` : ''}.` });
    setFiles([]);
    if (fileInput.current) fileInput.current.value = '';
    setDescription('');
    setDueDate('');
    setLink('');
    reload();
  };

  const handleDelete = async (hw: HomeworkRow) => {
    if (!window.confirm(`"${hw.title}" ödevi silinsin mi? Kontrol kayıtları da silinir.`)) return;
    const res = await deleteHomework(hw.id, hw.attachments || []);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Ödev silinemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `"${hw.title}" silindi.` });
    reload();
  };

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const tomorrowDate = new Date(`${today}T12:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString('sv-SE');
  const dueLabel = (date: string) => {
    const day = date.slice(0, 10);
    const prefix = day === today ? 'Bugün teslim' : day === tomorrow ? 'Yarın teslim' : day < today ? 'Teslim tarihi geçti' : 'Son teslim';
    return `${prefix} · ${formatDate(date)}`;
  };
  const dueOptions = [
    { label: 'Yarın', date: tomorrow },
    { label: 'Cuma', date: nextWeekday(today, 5) },
    { label: 'Pazartesi', date: nextWeekday(today, 1) },
    { label: '1 hafta', date: addDays(today, 7) },
  ].filter((o, i, all) => all.findIndex((x) => x.date === o.date) === i);
  const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });

  const classHomeworks = selectedClass ? homeworks.filter((h) => h.class_name === selectedClass) : homeworks;
  const listSubjects = Array.from(new Set(classHomeworks.map((h) => h.subject).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const matches = (h: HomeworkRow) =>
    (!subjectFilter || h.subject === subjectFilter) &&
    (!q || [h.subject, h.title, h.description, h.class_name, ...(h.attachments || []).map((a) => a.name)]
      .some((v) => (v || '').toLocaleLowerCase('tr-TR').includes(q)));
  const filtering = !!q || !!subjectFilter;
  const visible = classHomeworks
    .filter(matches)
    .sort((a, b) => {
      const priority = (h: HomeworkRow) => !h.due_date ? 2 : h.due_date.slice(0, 10) < today ? 1 : 0;
      return priority(a) - priority(b) || (a.due_date || '9999').localeCompare(b.due_date || '9999') || b.created_at.localeCompare(a.created_at);
    });

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.pointsLayout}>
        <section className={styles.panel} aria-labelledby="hw-list-title">
          <h2 id="hw-list-title" className={styles.panelTitle}>
            {selectedClass ? `${selectedClass} ödevleri` : 'Gönderdiğim ödevler'} <span className={styles.countPill}>{filtering ? `${visible.length} / ${classHomeworks.length}` : visible.length}</span>
          </h2>
          {classHomeworks.length > 0 && (
            <div className={styles.hwFilters}>
              <label className={styles.searchField}>
                <Search size={18} aria-hidden="true" />
                <span className={styles.visuallyHidden}>Ödev ara</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ödev ara: ders, konu, dosya adı" />
              </label>
              {listSubjects.length > 1 && (
                <CustomSelect
                  value={subjectFilter}
                  onChange={setSubjectFilter}
                  options={[{ value: '', label: 'Tüm dersler' }, ...listSubjects.map((s) => ({ value: s, label: s }))]}
                  placeholder="Tüm dersler"
                  className={styles.hwSubjectFilter}
                />
              )}
            </div>
          )}
          {loading && <p className={styles.mutedText}>Ödevler yükleniyor…</p>}
          {!loading && classHomeworks.length === 0 && <p className={styles.mutedText}>Henüz ödev göndermediniz.</p>}
          {!loading && classHomeworks.length > 0 && visible.length === 0 && (
            <p className={styles.mutedText}>
              Aramaya uyan ödev yok.{' '}
              <button type="button" className={styles.addNoteButton} onClick={() => { setQuery(''); setSubjectFilter(''); }}>Aramayı temizle</button>
            </p>
          )}
          <ul className={styles.studentCards}>
            {visible.map((hw) => (
              <li key={hw.id} className={`${styles.studentCard} ${styles.assignmentRow}`}>
                <div className={styles.assignmentContent}>
                  <h3 className={styles.assignmentTitle}>{hw.subject ? <SubjectTag subject={hw.subject} /> : hw.title}</h3>
                  <div className={styles.assignmentMeta}>
                    {!selectedClass && <span>{hw.class_name || 'Sınıf yok'}</span>}
                    {hw.due_date && <span className={styles.assignmentDue}><Calendar size={16} aria-hidden="true" />{dueLabel(hw.due_date)}</span>}
                  </div>
                  {hw.description && <p className={styles.assignmentDescription}>{hw.description}</p>}
                  <AttachmentList attachments={hw.attachments} />
                  {hw.file_url && <a href={hw.file_url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>Bağlantıyı aç</a>}
                </div>
                <div className={styles.assignmentActions}>
                  <details className={styles.assignmentMenu} onKeyDown={(event) => {
                    if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
                  }} onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
                  }}>
                    <summary aria-label={`${hw.subject || hw.title} ödev işlemleri`}><MoreVertical size={20} aria-hidden="true" /></summary>
                    <div className={styles.assignmentMenuItems}>
                      <button type="button" onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        handleDelete(hw);
                      }}><Trash2 size={16} aria-hidden="true" />Ödevi sil</button>
                    </div>
                  </details>
                  <button type="button" className={styles.primary} onClick={() => onOpenCheck(hw.id, hw.class_name || '')}><CheckSquare size={16} aria-hidden="true" />Kontrol et</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.pointsAside}>
            <CollapsiblePanel title="Yeni ödev" summary={className ? `${className} sınıfına gönder` : undefined}>
              <form className={styles.formGrid} onSubmit={handleCreate}>
                <h2 className={styles.panelTitle}>Yeni ödev</h2>
                <div className={styles.field}>
                  <span>Sınıf</span>
                  <CustomSelect
                    value={className}
                    onChange={changeClass}
                    options={classNames.map((c) => ({ value: c, label: c }))}
                    placeholder={classNames.length ? 'Sınıf seçin' : 'Önce sınıf ekleyin'}
                    disabled={!classNames.length}
                  />
                </div>
                <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
                  <legend>Ders</legend>
                  <div className={styles.subjectChips}>
                    {subjectOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={styles.subjectChip}
                        aria-pressed={subjectChoice === s}
                        title={s}
                        style={{ '--subject-hue': subjectHue(s) } as CSSVars}
                        onClick={() => setSubjectChoice(s)}
                      >
                        {subjectShortLabel(s)}
                      </button>
                    ))}
                    <button type="button" className={`${styles.subjectChip} ${styles.subjectChipOther}`} aria-pressed={subjectChoice === OTHER} onClick={() => setSubjectChoice(OTHER)}>
                      Diğer…
                    </button>
                  </div>
                  {subjectChoice === OTHER && (
                    <input
                      aria-label="Ders adı"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      maxLength={80}
                      placeholder="Ders adını yazın. Örn: Değerler eğitimi"
                      autoFocus
                    />
                  )}
                </fieldset>
                <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
                  <legend>Teslim tarihi <span className={styles.optionalHint}>(isteğe bağlı)</span></legend>
                  <div className={styles.subjectChips}>
                    {dueOptions.map((o) => (
                      <button key={o.label} type="button" className={styles.dueChip} aria-pressed={dueDate === o.date} onClick={() => setDueDate(dueDate === o.date ? '' : o.date)}>
                        {o.label}<small>{shortDate(o.date)}</small>
                      </button>
                    ))}
                  </div>
                  <div className={styles.dueRow}>
                    <input aria-label="Başka bir tarih seçin" type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    {dueDate && (
                      <button type="button" className={styles.noteRemove} onClick={() => setDueDate('')} aria-label="Teslim tarihini kaldır" title="Tarihi kaldır">
                        <X size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </fieldset>
                <label className={`${styles.field} ${styles.fullRow}`}>Ödev
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} placeholder="Öğrencinin ne yapacağını yazın. Örn: Ders kitabı sayfa 24-25'teki etkinlikleri yapın." />
                </label>
                <label className={styles.field}>Bağlantı (isteğe bağlı)
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                </label>
                <div className={`${styles.field} ${styles.fullRow}`}>
                  <span id="hw-files-label">Dosyalar <span className={styles.optionalHint}>(PDF veya resim · en fazla {MAX_FILES} · her biri 10 MB)</span></span>
                  <div
                    className={`${styles.fileDrop} ${dragging ? styles.fileDropActive : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                  >
                    <input
                      id="hw-files"
                      ref={fileInput}
                      type="file"
                      multiple
                      accept={ALLOWED_FILE_TYPES.join(',')}
                      className={styles.visuallyHidden}
                      aria-labelledby="hw-files-label"
                      tabIndex={-1}
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <button type="button" className={styles.fileDropButton} onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}>
                      <Paperclip size={18} aria-hidden="true" />{files.length ? 'Dosya ekle' : 'Dosya seç'}
                    </button>
                    <span className={styles.fileDropHint}>{files.length >= MAX_FILES ? 'En fazla dosya sayısına ulaşıldı' : 'veya buraya sürükleyin'}</span>
                  </div>
                  {files.length > 0 && (
                    <ul className={styles.fileList}>
                      {files.map((f) => (
                        <li key={f.name + f.size} className={styles.fileItem}>
                          <span>{f.name}</span>
                          <small>{formatBytes(f.size)}</small>
                          <button type="button" className={styles.fileRemove} onClick={() => removeFile(f)} aria-label={`${f.name} dosyasını çıkar`} title="Çıkar">
                            <X size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className={styles.formActions}>
                  <button type="submit" className={styles.primary} disabled={busy || !classNames.length}><Send size={18} aria-hidden="true" />{busy ? (files.length ? 'Dosyalar yükleniyor…' : 'Gönderiliyor…') : 'Ödevi gönder'}</button>
                </div>
              </form>
        </CollapsiblePanel>
      </aside>
    </div>
    </div >
  );
}
