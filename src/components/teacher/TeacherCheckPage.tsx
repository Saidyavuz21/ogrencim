'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, X, Save, BookOpen, Plus } from '../icons';
import { CheckStatus, HomeworkCheckRow, HomeworkRow, listHomeworkChecks, listMyHomeworks, saveHomeworkChecks } from '../../lib/teacherData';
import { CollapsiblePanel, Notice, NoticeState, initialsOf, StudentSortToggle, useClassStudents } from './TeacherUi';
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
  // Veritabanında kontrolü kayıtlı öğrenciler (işareti kaldırılınca silinmesi için)
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // Not kutusu açılan öğrenciler (not yoksa kutu gizli durur)
  const [openNotes, setOpenNotes] = useState<string[]>([]);
  // Not kutusunu kapat: yazılmış not da temizlenir (kaydedince veliye gitmez)
  const closeNote = (id: string) => {
    setOpenNotes((prev) => prev.filter((x) => x !== id));
    setDraft(id, { note: '' });
  };
  const [busy, setBusy] = useState(false);
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

  // Seçili ödevin kayıtlı kontrollerini çek
  useEffect(() => {
    if (!activeHwId) return;
    let alive = true;
    listHomeworkChecks(activeHwId).then((res) => {
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
  }, [activeHwId]);

  const counts = useMemo(() => {
    const c = { yapti: 0, kismen: 0, yapmadi: 0, bos: 0 };
    students.forEach((s) => {
      const st = drafts[s.id]?.status;
      if (st) c[st]++;
      else c.bos++;
    });
    return c;
  }, [students, drafts]);

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
    setNotice({ kind: 'ok', text: `${rows.length} öğrencinin kontrolü kaydedildi (${counts.yapti} yaptı, ${counts.kismen} kısmen, ${counts.yapmadi} yapmadı)${cleared.length ? `; ${cleared.length} öğrencinin işareti kaldırıldı` : ''}.` });
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
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={styles.pointsLayout}>
        <section className={styles.studentList} aria-label="Öğrenci kontrol listesi">
          {students.length > 1 && <div className={styles.listSortBar}><StudentSortToggle /></div>}
          {stLoading && <p className={`${styles.mutedText} ${styles.listPad}`}>Öğrenciler yükleniyor…</p>}
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
                    <label htmlFor={`note-${s.id}`}>Veliye not</label>
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
              </div>
            );
          })}
        </section>

        <aside className={styles.pointsAside}>
          <CollapsiblePanel
            title="Kontrol edilecek ödev"
            summary={activeHw ? `${activeHw.title} · ${counts.yapti} yaptı, ${counts.bos} bekliyor` : undefined}
          >
            <label className={styles.field}>Kontrol edilecek ödev
              <select value={activeHw?.id || ''} onChange={(e) => { setHomeworkId(e.target.value); setNotice(null); }}>
                {homeworks.map((h) => <option key={h.id} value={h.id}>{h.title} · {h.class_name}</option>)}
              </select>
            </label>
            {activeHw && (
              <p className={styles.mutedText}>
                {activeHw.subject} · {counts.yapti} yaptı, {counts.kismen} kısmen, {counts.yapmadi} yapmadı, {counts.bos} işaretlenmedi
              </p>
            )}
            <div className={styles.inlineRow}>
              <button type="button" className={styles.secondary} onClick={() => markAll('yapti')}>Hepsini &quot;Yaptı&quot; yap</button>
            </div>
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
