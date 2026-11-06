'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Trash2, CheckSquare, Calendar, MoreVertical, Search, Paperclip, X } from '../icons';
import { ALLOWED_FILE_TYPES, countSubmitted, createHomework, deleteHomework, formatBytes, homeworkIsOpen, HomeworkRow, listMyHomeworks, validateHomeworkFiles } from '../../lib/teacherData';
import { AttachmentList, CollapsiblePanel, Notice, NoticeState, formatDate } from './TeacherUi';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
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
  const { confirm } = useDialog();
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const [description, setDescription] = useState('');
  // Ödev birden çok sınıfa aynı anda verilebilir; her sınıf için ayrı ödev kaydı oluşur
  const [targets, setTargets] = useState<string[]>(() => {
    const first = selectedClass && classNames.includes(selectedClass) ? selectedClass : classNames[0];
    return first ? [first] : [];
  });
  // Ders listesi ilk seçilen sınıfın seviyesine göre; branş öğretmenine kendi dersi hazır gelir
  const className = targets[0] || '';
  const [subjectChoice, setSubjectChoice] = useState(() => branchSubject(defaultSubject, selectedClass || classNames[0] || ''));
  const [customSubject, setCustomSubject] = useState('');
  const subjectOptions = useMemo(() => subjectsForClass(className), [className]);
  const subject = subjectChoice === OTHER ? customSubject.trim() : subjectChoice;
  const setTargetList = (next: string[]) => {
    // Sınıflar sınıf listesindeki sırayla tutulur
    const ordered = classNames.filter((x) => next.includes(x));
    setTargets(ordered);
    // İlk sınıf değiştiyse ve o seviyede bu ders yoksa seçim sıfırlanır (branş dersi varsa o gelir)
    const first = ordered[0];
    if (first && subjectChoice !== OTHER && !subjectsForClass(first).includes(subjectChoice)) {
      setSubjectChoice(branchSubject(defaultSubject, first));
    }
  };
  const toggleTarget = (c: string) => setTargetList(targets.includes(c) ? targets.filter((x) => x !== c) : [...targets, c]);

  // Ödev listesi: arama ve ders süzgeci
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dueDate, setDueDate] = useState('');
  // İsteğe bağlı teslim saati; boşsa teslim günün sonu (23:59)
  const [dueTime, setDueTime] = useState('');
  // Kontrol sonucu öğrenciye hemen mi görünsün, yoksa öğretmen sonra mı açıklasın (seçim gönderimler arasında korunur)
  const [releaseNow, setReleaseNow] = useState(true);
  // Öğrenci uygulamadan dosya/fotoğraf ile teslim etsin mi (yoksa ödev sınıfta kontrol edilir)
  const [acceptsSubmissions, setAcceptsSubmissions] = useState(false);
  // Teslim alan ödevlerde teslim eden öğrenci sayısı
  const [submittedCounts, setSubmittedCounts] = useState<Record<string, number>>({});
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

  const submissionIds = homeworks.filter((h) => h.accepts_submissions).map((h) => h.id).join(',');
  useEffect(() => {
    if (!submissionIds) return;
    let alive = true;
    countSubmitted(submissionIds.split(',')).then((res) => { if (alive && res.ok) setSubmittedCounts(res.data); });
    return () => { alive = false; };
  }, [submissionIds]);

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
    if (!targets.length) {
      setNotice({ kind: 'error', text: 'Ödevin gideceği en az bir sınıf seçin.' });
      return;
    }
    // Teslim anı geçmişte olamaz (veritabanı da denetler)
    if (dueDate) {
      const nowHM = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false });
      if (dueDate < today || (dueDate === today && dueTime && dueTime <= nowHM)) {
        setNotice({ kind: 'error', text: dueDate < today ? 'Teslim tarihi geçmişte olamaz.' : `Teslim saati geçti (şu an ${nowHM}). Daha ileri bir saat seçin.` });
        return;
      }
    }
    const title = autoTitle(subject);
    setBusy(true);
    // Her sınıf için ayrı kayıt (kontrol, puan ve teslim sınıf bazında ayrı kalır); dosyalar her birine yüklenir
    const sent: string[] = [];
    const failed: { cls: string; error: string }[] = [];
    for (const [i, c] of targets.entries()) {
      if (targets.length > 1) setProgress(`${c} sınıfına gönderiliyor (${i + 1}/${targets.length})…`);
      const res = await createHomework({ title, subject, description, className: c, dueDate, dueTime, points: 100, link, files, resultsReleased: releaseNow, acceptsSubmissions });
      if (res.ok) sent.push(c);
      else failed.push({ cls: c, error: res.error });
    }
    setProgress('');
    setBusy(false);
    const failText = failed.map((f) => `${f.cls} (${f.error})`).join(', ');
    if (!sent.length) {
      setNotice({ kind: 'error', text: `Ödev gönderilemedi: ${failText}` });
      return;
    }
    const fileNote = files.length ? ` (${files.length} dosya)` : '';
    if (failed.length) {
      // Form temizlenmez; yalnızca gönderilemeyen sınıflar seçili kalır, tekrar gönderilebilir
      setNotice({ kind: 'error', text: `${title} ${sent.join(', ')} sınıfına gönderildi${fileNote}. Gönderilemeyen: ${failText}. Form duruyor; tekrar gönderebilirsiniz.` });
      setTargetList(failed.map((f) => f.cls));
      reload();
      return;
    }
    setNotice({ kind: 'ok', text: `${title} ${sent.join(', ')} ${sent.length > 1 ? 'sınıflarına' : 'sınıfına'} gönderildi${fileNote}.` });
    setFiles([]);
    if (fileInput.current) fileInput.current.value = '';
    setDescription('');
    setDueDate('');
    setDueTime('');
    setLink('');
    reload();
  };

  const handleDelete = async (hw: HomeworkRow) => {
    const ok = await confirm({
      title: 'Ödevi Sil',
      message: `"${hw.title}" ödevi silinsin mi?\nKontrol kayıtları da kalıcı olarak silinir.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
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
  const dueLabel = (date: string, time?: string | null) => {
    const day = date.slice(0, 10);
    const prefix = day === today ? 'Bugün teslim' : day === tomorrow ? 'Yarın teslim' : day < today ? 'Teslim tarihi geçti' : 'Son teslim';
    return `${prefix} · ${formatDate(date)}${time ? ` · ${time.slice(0, 5)}` : ''}`;
  };
  const dueOptions = [
    { label: 'Yarın', date: tomorrow },
    { label: 'Cuma', date: nextWeekday(today, 5) },
    { label: 'Pazartesi', date: nextWeekday(today, 1) },
    { label: '1 hafta', date: addDays(today, 7) },
  ].filter((o, i, all) => all.findIndex((x) => x.date === o.date) === i).sort((a, b) => a.date.localeCompare(b.date));
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
            <div className={styles.hwSearchBar} role="search" aria-label="Ödev ara ve derse göre süz">
              <label className={styles.hwSearchInput}>
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
                  triggerClassName={styles.hwFilterTrigger}
                />
              )}
            </div>
          )}
          {loading && <Spinner center label="Ödevler yükleniyor…" />}
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
                    {hw.due_date && <span className={styles.assignmentDue}><Calendar size={16} aria-hidden="true" />{dueLabel(hw.due_date, hw.due_time)}</span>}
                    {!hw.results_released && <span>Sonuç gizli</span>}
                    {hw.accepts_submissions && <span>{submittedCounts[hw.id] || 0} teslim · {homeworkIsOpen(hw) ? 'teslim açık' : 'kapandı'}</span>}
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
            <CollapsiblePanel title="Yeni ödev" summary={targets.length ? `${targets.join(', ')} ${targets.length > 1 ? 'sınıflarına' : 'sınıfına'} gönder` : undefined}>
              <form className={`${styles.formGrid} ${styles.homeworkComposer}`} onSubmit={handleCreate}>
                <h2 className={styles.panelTitle}>Yeni ödev</h2>
                <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
                  <legend>
                    {classNames.length > 1 ? 'Sınıflar' : 'Sınıf'}{' '}
                    {classNames.length > 1 && <span className={styles.optionalHint}>(birden çok seçilebilir)</span>}
                  </legend>
                  {!classNames.length && <p className={styles.mutedText}>Önce Sınıflarım sayfasından sınıf ekleyin.</p>}
                  <div className={styles.subjectChips}>
                    {classNames.map((c) => (
                      <button key={c} type="button" className={styles.dueChip} aria-pressed={targets.includes(c)} onClick={() => toggleTarget(c)}>
                        {c}
                      </button>
                    ))}
                    {classNames.length > 2 && (
                      <button
                        type="button"
                        className={`${styles.subjectChip} ${styles.subjectChipOther}`}
                        onClick={() => setTargetList(targets.length === classNames.length ? classNames.slice(0, 1) : [...classNames])}
                      >
                        {targets.length === classNames.length ? 'Yalnızca ilki' : 'Hepsi'}
                      </button>
                    )}
                  </div>
                </fieldset>
                <label className={`${styles.field} ${styles.fullRow}`}>Ders
                  <select value={subjectChoice} onChange={(e) => setSubjectChoice(e.target.value)}>
                    <option value="" disabled>Ders seçin</option>
                    {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value={OTHER}>Diğer ders…</option>
                  </select>
                </label>
                {subjectChoice === OTHER && (
                  <label className={`${styles.field} ${styles.fullRow}`}>Ders adı
                    <input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} maxLength={80} placeholder="Ders adını yazın" autoFocus />
                  </label>
                )}
                <label className={`${styles.field} ${styles.fullRow}`}>Ödev
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} placeholder="Öğrencinin ne yapacağını yazın. Örn: Ders kitabı sayfa 24-25'teki etkinlikleri yapın." />
                </label>
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
                      <input
                        aria-label="Teslim saati (isteğe bağlı)"
                        title="Teslim saati (isteğe bağlı). Boş bırakılırsa gün sonu."
                        type="time"
                        step={300}
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                      />
                    )}
                    {dueDate && (
                      <button type="button" className={styles.noteRemove} onClick={() => { setDueDate(''); setDueTime(''); }} aria-label="Teslim tarihini kaldır" title="Tarihi kaldır">
                        <X size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {dueDate && (
                    <p className={styles.mutedText}>
                      {dueTime ? `Teslim: ${shortDate(dueDate)} saat ${dueTime}.` : `Saat seçilmezse teslim ${shortDate(dueDate)} gün sonudur (23:59).`}
                    </p>
                  )}
                </fieldset>
                <details className={styles.composerDetails}>
                  <summary><span>Dosya veya bağlantı ekle</span><small>{files.length || link.trim() ? `${files.length} dosya${link.trim() ? ' · bağlantı eklendi' : ''}` : 'İsteğe bağlı'}</small></summary>
                  <div className={styles.composerDetailBody}>
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
                  </div>
                </details>
                <details className={styles.composerDetails}>
                  <summary><span>Teslim ve sonuç ayarları</span><small>{acceptsSubmissions ? 'Uygulamadan teslim' : 'Sınıfta kontrol'} · {releaseNow ? 'Sonuçlar hemen görünür' : 'Sonuçlar gizli'}</small></summary>
                  <div className={styles.composerDetailBody}>
                <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
                  <legend>Teslim şekli</legend>
                  <div className={styles.subjectChips}>
                    <button type="button" className={styles.dueChip} aria-pressed={!acceptsSubmissions} onClick={() => setAcceptsSubmissions(false)}>
                      Sınıfta kontrol<small>Öğrenci bir şey yüklemez</small>
                    </button>
                    <button type="button" className={styles.dueChip} aria-pressed={acceptsSubmissions} onClick={() => setAcceptsSubmissions(true)}>
                      Uygulamadan teslim<small>Öğrenci dosya ya da fotoğraf yükler</small>
                    </button>
                  </div>
                  {acceptsSubmissions && (
                    <p className={styles.mutedText}>
                      {dueDate ? 'Teslim tarihi gelince ödev kendiliğinden kapanır; teslim eden öğrenci sonradan değişiklik yapamaz.' : 'Teslim tarihi seçmezseniz ödev siz "Ödevi kapat" diyene kadar açık kalır.'}
                    </p>
                  )}
                </fieldset>
                <fieldset className={`${styles.field} ${styles.fullRow} ${styles.chipFieldset}`}>
                  <legend>Kontrol sonucu</legend>
                  <div className={styles.subjectChips}>
                    <button type="button" className={styles.dueChip} aria-pressed={releaseNow} onClick={() => setReleaseNow(true)}>
                      Hemen göster<small>Kontrol edince öğrenci görür</small>
                    </button>
                    <button type="button" className={styles.dueChip} aria-pressed={!releaseNow} onClick={() => setReleaseNow(false)}>
                      Sonra açıkla<small>Siz açıklayana kadar gizli</small>
                    </button>
                  </div>
                  {!releaseNow && (
                    <p className={styles.mutedText}>Sonuç ve davranış puanı, &quot;Ödev kontrolü&quot; sayfasında &quot;Sonuçları açıkla&quot;ya basana kadar öğrenciye yansımaz.</p>
                  )}
                </fieldset>
                  </div>
                </details>
                <div className={styles.formActions}>
                  {progress && <span className={styles.mutedText} aria-live="polite">{progress}</span>}
                  <button type="submit" className={styles.primary} disabled={busy || !targets.length}>
                    <Send size={18} aria-hidden="true" />
                    {busy ? (files.length ? 'Dosyalar yükleniyor…' : 'Gönderiliyor…') : targets.length > 1 ? `${targets.length} sınıfa gönder` : 'Ödevi gönder'}
                  </button>
                </div>
              </form>
        </CollapsiblePanel>
      </aside>
    </div>
    </div >
  );
}
