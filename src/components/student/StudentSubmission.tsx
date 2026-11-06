'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, ImageIcon, Paperclip, Send } from '../icons';
import { addSubmissionFiles, MAX_SUBMISSION_FILES, MyHomework, removeSubmissionFile, saveSubmission } from '../../lib/studentData';
import { ALLOWED_FILE_TYPES, homeworkIsOpen, SubmissionRow, SUBMISSION_BUCKET } from '../../lib/teacherData';
import { AttachmentList } from '../teacher/TeacherUi';
import { useDialog } from '../ConfirmDialog';
import styles from '../teacher/TeacherDashboard.module.css';
import s from './StudentPortal.module.css';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/**
 * Ödev teslim kutusu: taslak (dosya ekle/çıkar, açıklama) → "Teslim et".
 * Asıl kilit sunucuda; burada yalnızca uygun düğmeler gösterilir.
 */
export function StudentSubmission({ homework, studentId, onChange }: {
  homework: MyHomework;
  studentId: string;
  onChange: (homeworkId: string, submission: SubmissionRow) => void;
}) {
  const sub = homework.submission;
  const submitted = sub?.status === 'teslim';
  const open = homeworkIsOpen(homework);
  const editable = open && !submitted;
  const files = sub?.files || [];

  const [note, setNote] = useState(sub?.note || '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const { confirm } = useDialog();

  const apply = (res: { ok: true; data: SubmissionRow } | { ok: false; error: string }) => {
    if (res.ok) {
      onChange(homework.id, res.data);
      setError(null);
    } else setError(res.error);
    return res.ok;
  };

  const handleFiles = async (list: FileList | null, input: HTMLInputElement | null) => {
    const picked = Array.from(list || []);
    if (input) input.value = '';
    if (!picked.length) return;
    setBusy('Yükleniyor…');
    apply(await addSubmissionFiles(homework.id, studentId, picked));
    setBusy(null);
  };

  const handleRemove = async (path: string) => {
    if (!sub) return;
    setBusy('Çıkarılıyor…');
    apply(await removeSubmissionFile(homework.id, studentId, sub, path));
    setBusy(null);
  };

  const handleSaveDraft = async () => {
    setBusy('Kaydediliyor…');
    apply(await saveSubmission(homework.id, studentId, note, false));
    setBusy(null);
  };

  const handleSubmit = async () => {
    if (!files.length && !note.trim()) {
      setError('Teslim için en az bir dosya ya da açıklama ekle.');
      return;
    }
    const ok = await confirm({
      title: 'Ödevi Teslim Et',
      message: 'Teslim ettikten sonra dosya ekleyemez ya da değiştiremezsin. Teslim edilsin mi?',
      confirmText: 'Evet, Teslim Et',
      cancelText: 'Vazgeç',
    });
    if (!ok) return;
    setBusy('Teslim ediliyor…');
    apply(await saveSubmission(homework.id, studentId, note, true));
    setBusy(null);
  };

  if (submitted && sub) {
    return (
      <div className={s.submitBox}>
        <p className={s.submittedTag}><CheckCircle2 size={18} aria-hidden="true" />Teslim edildi{sub.submitted_at ? ` · ${dateTime(sub.submitted_at)}` : ''}</p>
        <AttachmentList attachments={files} bucket={SUBMISSION_BUCKET} label="Teslim ettiğin dosyalar" />
        {sub.note && <p className={styles.assignmentDescription}>{sub.note}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className={s.submitBox}>
        <p className={styles.homeworkPending}>
          {homework.closed_at ? 'Öğretmen ödevi kapattı; teslim alınmıyor.' : 'Teslim süresi doldu; teslim alınmıyor.'}
          {files.length > 0 && ' Taslağın teslim edilmedi.'}
        </p>
      </div>
    );
  }

  return (
    <div className={s.submitBox}>
      <h3 className={s.submitTitle}>Teslim et</h3>
      <AttachmentList
        attachments={files}
        bucket={SUBMISSION_BUCKET}
        label="Teslim dosyaların"
        onRemove={editable ? (a) => handleRemove(a.path) : undefined}
        disabled={!!busy}
      />
      <div className={s.submitActions}>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          className={styles.visuallyHidden}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => handleFiles(e.target.files, e.target)}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.visuallyHidden}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => handleFiles(e.target.files, e.target)}
        />
        <button type="button" className={styles.fileDropButton} disabled={!!busy || files.length >= MAX_SUBMISSION_FILES} onClick={() => cameraInput.current?.click()}>
          <ImageIcon size={18} aria-hidden="true" />Fotoğraf çek
        </button>
        <button type="button" className={styles.fileDropButton} disabled={!!busy || files.length >= MAX_SUBMISSION_FILES} onClick={() => fileInput.current?.click()}>
          <Paperclip size={18} aria-hidden="true" />Dosya ekle
        </button>
        <span className={styles.optionalHint}>PDF veya resim · en fazla {MAX_SUBMISSION_FILES} · her biri 10 MB</span>
      </div>
      <label className={styles.field}>Açıklama <span className={styles.optionalHint}>(isteğe bağlı)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} maxLength={500} placeholder="Öğretmenine not yazabilirsin." disabled={!!busy} />
      </label>
      {error && <p className={styles.noticeError} role="alert">{error}</p>}
      <div className={s.submitActions}>
        <button type="button" className={styles.primary} disabled={!!busy} onClick={handleSubmit}>
          <Send size={18} aria-hidden="true" />{busy === 'Teslim ediliyor…' ? busy : 'Teslim et'}
        </button>
        {note.trim() !== (sub?.note || '') && (
          <button type="button" className={styles.secondary} disabled={!!busy} onClick={handleSaveDraft}>Taslağı kaydet</button>
        )}
        {busy && busy !== 'Teslim ediliyor…' && <span className={styles.mutedText} aria-live="polite">{busy}</span>}
      </div>
    </div>
  );
}
