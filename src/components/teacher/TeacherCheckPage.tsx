'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, X, Save, BookOpen, Plus, Eye, EyeOff } from '../icons';
import {
  CheckStatus, HomeworkCheckRow, homeworkIsOpen, HomeworkRow, listHomeworkChecks, listHomeworkSubmissions, listMyHomeworks,
  returnSubmission, saveHomeworkChecks, setHomeworkClosed, setHomeworkResultsReleased, SUBMISSION_BUCKET, SubmissionRow,
} from '../../lib/teacherData';
import { AttachmentList, CollapsiblePanel, Notice, NoticeState, initialsOf, StudentSortToggle, useClassStudents } from './TeacherUi';
import { useDialog } from '../ConfirmDialog';
import { CustomSelect } from '../CustomSelect';
import { Spinner } from '../Spinner';
import { settleQuiz } from '../../lib/quizData';
import { QuizReport } from '../quiz/QuizReport';
import { BoardDrawingsReview } from '../board/StudentBoardPlayer';
import styles from './TeacherDashboard.module.css';

interface TeacherCheckPageProps {
  selectedClass: string;
  /** Ödev listesinden "Kontrol et" ile gelindiyse açılacak ödev */
  initialHomeworkId?: string;
  onCreateHomework: () => void;
}

type Draft = { status: CheckStatus | ''; score: string; note: string };
const EMPTY_DRAFT: Draft = { status: '', score: '', note: '' };

const STATUS_OPTIONS: { value: CheckStatus; label: string; icon: typeof Check; style: string }[] = [
  { value: 'yapti', label: 'Yaptı', icon: Check, style: styles.done },
  { value: 'kismen', label: 'Kısmen', icon: Minus, style: styles.partial },
  { value: 'yapmadi', label: 'Yapmadı', icon: X, style: styles.missing },
];

export function TeacherCheckPage({ selectedClass, initialHomeworkId, onCreateHomework }: TeacherCheckPageProps) {
  const [homeworks, setHomeworks] = useState<HomeworkRow[]>([]);
  const [hwLoading, setHwLoading] = useState(true);
  const [homeworkId, setHomeworkId] = useState(initialHomeworkId || '');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loadedFor, setLoadedFor] = useState('');
  const [reviewBoard, setReviewBoard] = useState(false);
  // Veritabanında kontrolü kayıtlı öğrenciler (işareti kaldırılınca silinmesi için)
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // Not kutusu açılan öğrenciler (not yoksa kutu gizli durur)
  const [openNotes, setOpenNotes] = useState<string[]>([]);
  // Not kutusunu kapat: yazılmış not da temizlenir (kaydedince öğrenciye gitmez)
  const closeNote = (id: string) => {
    setOpenNotes((prev) => prev.filter((x) => x !== id));
    setDraft(id, { note: '' });
  };
  const [busy, setBusy] = useState(false);
  const [releasing, setReleasing] = useState(false);
  // Öğrenci teslimleri (yalnızca "uygulamadan teslim" ödevlerinde)
  const [submissions, setSubmissions] = useState<Record<string, SubmissionRow>>({});
  const [closing, setClosing] = useState(false);
  const [returning, setReturning] = useState('');
  const { confirm } = useDialog();
  const [notice, setNotice] = useState<NoticeState>(null);

  const { students, loading: stLoading, error: stError } = useClassStudents(selectedClass);

  useEffect(() => {
    let alive = true;
    listMyHomeworks(selectedClass || undefined).then((res) => {
      if (!alive) return;
      setHwLoading(false);
      if (res.ok) setHomeworks(res.data);
      else setNotice({ kind: 'error', text: `Ödevler alınamadı: ${res.error}` });
    });
    return () => { alive = false; };
  }, [selectedClass]);

  const activeHw = homeworks.find((h) => h.id === homeworkId) || homeworks[0];
  const activeHwId = activeHw?.id;
  const acceptsSubmissions = !!activeHw?.accepts_submissions;

  // Seçili ödevin teslimleri
  useEffect(() => {
    if (!activeHwId || !acceptsSubmissions) return;
    let alive = true;
    listHomeworkSubmissions(activeHwId).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        setNotice({ kind: 'error', text: `Teslimler alınamadı: ${res.error}` });
        return;
      }
      setSubmissions(Object.fromEntries(res.data.map((r) => [r.student_id, r])));
    });
    return () => { alive = false; setSubmissions({}); };
  }, [activeHwId, acceptsSubmissions]);

  // Seçili ödevin kayıtlı kontrollerini çek (quizde önce süresi dolduysa kapat: girmeyenler "yapmadı" olur)
  const activeQuiz = !!activeHw?.quiz_mode;
  useEffect(() => {
    if (!activeHwId) return;
    let alive = true;
    (activeQuiz ? settleQuiz(activeHwId) : Promise.resolve()).then(() => listHomeworkChecks(activeHwId)).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        setNotice({ kind: 'error', text: `Kontrol kayıtları alınamadı: ${res.error}` });
        return;
      }
      const next: Record<string, Draft> = {};
      res.data.forEach((c) => {
        next[c.student_id] = { status: c.status, score: c.score == null ? '' : String(c.score), note: c.note || '' };
      });
      setDrafts(next);
      setSavedIds(res.data.map((c) => c.student_id));
      setLoadedFor(activeHwId);
    });
    return () => { alive = false; };
  }, [activeHwId, activeQuiz]);

  const counts = useMemo(() => {
    const c = { yapti: 0, kismen: 0, yapmadi: 0, bos: 0 };
    students.forEach((s) => {
      const st = drafts[s.id]?.status;
      if (st) c[st]++;
      else c.bos++;
    });
    return c;
  }, [students, drafts]);

  const submissionCounts = useMemo(() => {
    const c = { teslim: 0, taslak: 0, yok: 0, missing: [] as string[] };
    students.forEach((s) => {
      const st = submissions[s.id]?.status;
      if (st === 'teslim') c.teslim++;
      else {
        if (st === 'taslak') c.taslak++;
        else c.yok++;
        c.missing.push(s.name);
      }
    });
    return c;
  }, [students, submissions]);

  const setDraft = (studentId: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? EMPTY_DRAFT), ...patch } }));

  const markAll = (status: CheckStatus) =>
    setDrafts((prev) => {
      const next = { ...prev };
      students.forEach((s) => { next[s.id] = { ...(prev[s.id] ?? EMPTY_DRAFT), status }; });
      return next;
    });

  const handleSave = async () => {
    if (!activeHw) return;
    const rows: HomeworkCheckRow[] = [];
    for (const s of students) {
      const d = drafts[s.id];
      if (!d?.status) continue;
      // Puan artık girilmiyor; eski kayıtlardaki değer korunur
      const score = d.score.trim() === '' ? null : Number(d.score);
      rows.push({ homework_id: activeHw.id, student_id: s.id, status: d.status, score, note: d.note });
    }
    const cleared = savedIds.filter((id) => !drafts[id]?.status);
    if (!rows.length && !cleared.length) {
      setNotice({ kind: 'error', text: 'Kaydedilecek işaretleme yok. Önce öğrencileri işaretleyin.' });
      return;
    }
    setBusy(true);
    const res = await saveHomeworkChecks(rows, { homeworkId: activeHw.id, studentIds: cleared });
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Kaydedilemedi: ${res.error}` });
      return;
    }
    setSavedIds(rows.map((r) => r.student_id));
    const tail = activeHw.results_released
      ? 'Davranış puanları buna göre güncellendi.'
      : 'Sonuçlar öğrenciden gizli; "Sonuçları açıkla"ya basınca öğrenci görür ve puanlar işlenir.';
    setNotice({ kind: 'ok', text: `${rows.length} öğrencinin kontrolü kaydedildi (${counts.yapti} yaptı, ${counts.kismen} kısmen, ${counts.yapmadi} yapmadı)${cleared.length ? `; ${cleared.length} öğrencinin işareti kaldırıldı` : ''}. ${tail}` });
  };

  const toggleRelease = async () => {
    if (!activeHw) return;
    const next = !activeHw.results_released;
    setReleasing(true);
    const res = await setHomeworkResultsReleased(activeHw.id, next);
    setReleasing(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Değiştirilemedi: ${res.error}` });
      return;
    }
    setHomeworks((prev) => prev.map((h) => (h.id === activeHw.id ? { ...h, results_released: next } : h)));
    setNotice({
      kind: 'ok',
      text: next
        ? `Sonuçlar açıklandı. Öğrenciler kayıtlı kontrolleri görüyor; bekleyen davranış puanları işlendi.`
        : 'Sonuçlar yeniden gizlendi. Önceden işlenen puanlar kalır; bundan sonraki değişiklikler açıklayınca işlenir.',
    });
  };

  const toggleClosed = async () => {
    if (!activeHw) return;
    const close = !activeHw.closed_at;
    if (close) {
      const ok = await confirm({
        title: 'Ödevi Kapat',
        message: 'Ödev kapatılınca öğrenciler teslim edemez ve taslaklarını değiştiremez. Kapatılsın mı?',
        confirmText: 'Evet, Kapat',
        cancelText: 'Vazgeç',
        variant: 'warning',
      });
      if (!ok) return;
    }
    setClosing(true);
    const res = await setHomeworkClosed(activeHw.id, close);
    setClosing(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Değiştirilemedi: ${res.error}` });
      return;
    }
    const closed_at = close ? new Date().toISOString() : null;
    setHomeworks((prev) => prev.map((h) => (h.id === activeHw.id ? { ...h, closed_at } : h)));
    const stillOpen = homeworkIsOpen({ ...activeHw, closed_at });
    setNotice({
      kind: 'ok',
      text: close ? 'Ödev kapatıldı; artık teslim alınmıyor.'
        : stillOpen ? 'Ödev yeniden açıldı; öğrenciler teslim edebilir.'
        : 'Kapatma kaldırıldı, ancak teslim tarihi geçtiği için ödev yine kapalı.',
    });
  };

  const handleReturn = async (studentId: string, name: string) => {
    if (!activeHw) return;
    const ok = await confirm({
      title: 'Teslimi İade Et',
      message: `${name} adlı öğrencinin teslimi taslağa döner; öğrenci düzeltip yeniden teslim edebilir${homeworkIsOpen(activeHw) ? '' : ' (ödev kapalı olduğu için önce ödevi yeniden açmanız gerekir)'}. İade edilsin mi?`,
      confirmText: 'Evet, İade Et',
      cancelText: 'Vazgeç',
    });
    if (!ok) return;
    setReturning(studentId);
    const res = await returnSubmission(activeHw.id, studentId);
    setReturning('');
    if (!res.ok) {
      setNotice({ kind: 'error', text: `İade edilemedi: ${res.error}` });
      return;
    }
    setSubmissions((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status: 'taslak', submitted_at: null } }));
    setNotice({ kind: 'ok', text: `${name} adlı öğrencinin teslimi iade edildi.` });
  };

  if (!hwLoading && homeworks.length === 0) {
    return (
      <section className={styles.emptyState}>
        <BookOpen size={32} aria-hidden="true" />
        <h2>Kontrol edilecek ödev yok</h2>
        <p>{selectedClass ? `${selectedClass} sınıfına henüz ödev göndermediniz.` : 'Henüz ödev göndermediniz.'}</p>
        <button type="button" className={styles.primary} onClick={onCreateHomework}>Ödev gönder<Plus size={18} aria-hidden="true" /></button>
      </section>
    );
  }

  return (
    <div className={`${styles.pageBody} ${styles.checkWorkspace}`}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {activeHw && loadedFor === activeHw.id && !stLoading && !stError && (
        <section className={styles.checkOverview} aria-label="Seçili ödevin kontrol özeti">
          <div className={styles.checkOverviewTitle}>
            <span className={styles.checkOverviewIcon}><BookOpen size={22} aria-hidden="true" /></span>
            <div><h2>{activeHw.title}</h2><p>{selectedClass}{activeHw.subject ? ` · ${activeHw.subject}` : ''}</p></div>
          </div>
          <dl className={styles.checkOverviewCounts}>
            <div><dt>Yaptı</dt><dd>{counts.yapti}</dd></div>
            <div><dt>Kısmen</dt><dd>{counts.kismen}</dd></div>
            <div><dt>Yapmadı</dt><dd>{counts.yapmadi}</dd></div>
            <div><dt>İşaretlenmedi</dt><dd>{counts.bos}</dd></div>
          </dl>
        </section>
      )}
      {activeHw?.has_board && (
        <section className={styles.panel} aria-label="Tahta">
          <h2 className={styles.panelTitle}>Etkileşimli tahta</h2>
          <p className={styles.mutedText}>Öğrenciler tahtanın kendi kopyası üzerine çizer; çizimler 30 sn’de bir kaydedilir.</p>
          <button type="button" className={styles.secondary} onClick={() => setReviewBoard(true)}>Öğrenci çizimlerini incele</button>
        </section>
      )}
      {reviewBoard && activeHw && (
        <BoardDrawingsReview homeworkId={activeHw.id} title={activeHw.title} students={students} onClose={() => setReviewBoard(false)} />
      )}
      {activeHw?.quiz_mode && loadedFor === activeHw.id && (
        <QuizReport key={activeHw.id} homeworkId={activeHw.id} title={activeHw.title} mode={activeHw.quiz_mode} dueAt={activeHw.due_at} students={students} />
      )}

      <div className={styles.pointsLayout}>
        <section className={styles.studentList} aria-label="Öğrenci kontrol listesi">
          <div className={styles.checkRosterHeading}><h2>Öğrenciler</h2><span>{stLoading ? 'Yükleniyor…' : `${students.length} öğrenci`}</span></div>
          {students.length > 0 && (
            <div className={`${styles.listSortBar} ${styles.checkListBar}`}>
              <p className={styles.checkPointsHint}>Puan: <b>Yaptı +1</b> · Kısmen 0 · <b>Yapmadı −1</b>{activeHw && !activeHw.results_released && ' · sonuçlar açıklanınca işlenir'}</p>
              {students.length > 1 && <StudentSortToggle />}
            </div>
          )}
          {stLoading && <Spinner center label="Öğrenciler yükleniyor…" />}
          {stError && <p className={`${styles.noticeError} ${styles.listPad}`}>{stError}</p>}
          {!stLoading && !stError && students.length === 0 && (
            <p className={`${styles.mutedText} ${styles.listPad}`}>{selectedClass} sınıfında kayıtlı öğrenci yok. &quot;Öğrenciler&quot; sayfasından ekleyin.</p>
          )}
          {activeHw && loadedFor === activeHw.id && students.map((s) => {
            const d = drafts[s.id] ?? EMPTY_DRAFT;
            return (
              <div key={s.id} className={styles.studentRow}>
                <div className={styles.studentIdentity}>
                  <span className={styles.studentAvatar} aria-hidden="true">{initialsOf(s.name)}</span>
                  <div>
                    <h4>{s.name}</h4>
                    <p>No {s.student_number}</p>
                  </div>
                </div>
                <fieldset className={styles.statusGroup}>
                  <legend>Ödev durumu</legend>
                  <div className={styles.statusChoices}>
                    {STATUS_OPTIONS.map((opt) => (
                      <label key={opt.value} className={`${styles.statusChoice} ${d.status === opt.value ? opt.style : ''}`}>
                        <input type="radio" name={`status-${s.id}`} value={opt.value} checked={d.status === opt.value} onChange={() => setDraft(s.id, { status: opt.value })} onClick={() => { if (d.status === opt.value) setDraft(s.id, { status: '' }); }} />
                        <opt.icon size={16} aria-hidden="true" />{opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {d.note || openNotes.includes(s.id) ? (
                  <div className={styles.noteField}>
                    <label htmlFor={`note-${s.id}`}>Öğrenciye not</label>
                    <div className={styles.noteInputRow}>
                      <input
                        id={`note-${s.id}`}
                        value={d.note}
                        onChange={(e) => setDraft(s.id, { note: e.target.value.slice(0, 300) })}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !d.note) closeNote(s.id); }}
                        placeholder="Örn: 3. sayfa eksik"
                        autoFocus={!d.note}
                      />
                      <button type="button" className={styles.noteRemove} onClick={() => closeNote(s.id)} aria-label={`${s.name} için notu kaldır`} title="Notu kaldır">
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={styles.addNoteButton} onClick={() => setOpenNotes((prev) => [...prev, s.id])}>+ Not ekle</button>
                )}
                {acceptsSubmissions && (() => {
                  const sub = submissions[s.id];
                  const delivered = sub?.status === 'teslim';
                  return (
                    <div className={styles.submissionBlock}>
                      <p className={`${styles.submissionBadge} ${delivered ? styles.submissionDone : sub ? styles.submissionDraft : styles.submissionNone}`}>
                        {delivered
                          ? `Teslim etti${sub.submitted_at ? ` · ${new Date(sub.submitted_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}`
                          : sub ? 'Taslakta, teslim etmedi' : 'Teslim etmedi'}
                      </p>
                      {delivered && (
                        <>
                          <AttachmentList attachments={sub.files} bucket={SUBMISSION_BUCKET} label={`${s.name} teslim dosyaları`} />
                          {sub.note && <p className={styles.assignmentDescription}>{sub.note}</p>}
                          <div>
                            <button type="button" className={styles.addNoteButton} disabled={returning === s.id} onClick={() => handleReturn(s.id, s.name)}>
                              {returning === s.id ? 'İade ediliyor…' : 'Teslimi iade et'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </section>

        <aside className={styles.pointsAside}>
          <CollapsiblePanel
            title="Kontrol edilecek ödev"
            summary={activeHw ? `${activeHw.title} · ${counts.yapti} yaptı, ${counts.bos} bekliyor` : undefined}
          >
            <div className={styles.field}>
              <span>Kontrol edilecek ödev</span>
              <CustomSelect
                value={activeHw?.id || ''}
                onChange={(val) => { setHomeworkId(val); setNotice(null); }}
                options={homeworks.map((h) => ({
                  value: h.id,
                  label: h.title,
                  badge: h.class_name || undefined,
                  description: h.due_date ? new Date(h.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : undefined,
                }))}
                placeholder="Ödev seçin..."
              />
            </div>
            {activeHw && (
              <p className={styles.mutedText}>
                {activeHw.subject} · {counts.yapti} yaptı, {counts.kismen} kısmen, {counts.yapmadi} yapmadı, {counts.bos} işaretlenmedi
              </p>
            )}
            <div className={styles.inlineRow}>
              <button type="button" className={styles.secondary} onClick={() => markAll('yapti')}>Hepsini &quot;Yaptı&quot; yap</button>
            </div>
            {activeHw && acceptsSubmissions && (
              <div className={styles.field}>
                <span>Teslim durumu</span>
                <p className={styles.mutedText}>
                  <b>{submissionCounts.teslim}</b> teslim etti · {submissionCounts.taslak} taslakta · {submissionCounts.yok} başlamadı
                  {' · '}{homeworkIsOpen(activeHw) ? 'teslim açık' : activeHw.closed_at ? 'elle kapatıldı' : 'süre doldu, kapandı'}
                </p>
                {submissionCounts.missing.length > 0 && students.length > 0 && (
                  <p className={styles.mutedText}>Teslim etmeyenler: {submissionCounts.missing.join(', ')}</p>
                )}
                <div className={styles.inlineRow}>
                  <button type="button" className={styles.secondary} disabled={closing} onClick={toggleClosed}>
                    {closing ? 'Değiştiriliyor…' : activeHw.closed_at ? 'Ödevi yeniden aç' : 'Ödevi kapat'}
                  </button>
                </div>
              </div>
            )}
            {activeHw && (
              <div className={styles.field}>
                <span>Öğrenciye sonuç</span>
                <p className={styles.mutedText}>
                  {activeHw.results_released
                    ? 'Açık: öğrenciler kaydedilen sonucu ve puanı hemen görür.'
                    : 'Gizli: öğrenciler sonucu görmez, davranış puanı bekler.'}
                </p>
                <div className={styles.inlineRow}>
                  <button type="button" className={activeHw.results_released ? styles.secondary : styles.primary} disabled={releasing} onClick={toggleRelease}>
                    {activeHw.results_released ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    {releasing ? 'Değiştiriliyor…' : activeHw.results_released ? 'Sonuçları gizle' : 'Sonuçları açıkla'}
                  </button>
                </div>
              </div>
            )}
          </CollapsiblePanel>

          {students.length > 0 && (
            <div className={styles.stickyActions}>
              <button type="button" className={styles.primary} disabled={busy} onClick={handleSave}><Save size={18} aria-hidden="true" />{busy ? 'Kaydediliyor…' : 'Kontrolleri kaydet'}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
