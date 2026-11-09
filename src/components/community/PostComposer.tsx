'use client';

import React, { useId, useState } from 'react';
import { createPost, getPost, type FeedPost } from '../../lib/communitySocialData';
import { GRADE_OPTIONS } from '../../lib/filesData';
import { CustomSelect } from '../CustomSelect';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import { HelpCircle, Layers, Link2, Send } from '../icons';
import { Notice, type NoticeState } from '../teacher/TeacherUi';
import s from './CommunitySocial.module.css';

export interface PostComposerProps {
  onCreated: (post: FeedPost) => void;
  onOpenBoards?: () => void;
  onOpenQuestions?: () => void;
}

const SUBJECT_SELECT_OPTIONS = [
  { value: '', label: 'Branşım (varsayılan)' },
  ...SUBJECT_OPTIONS,
];

const GRADE_SELECT_OPTIONS = [
  { value: '', label: 'Bütün kademeler' },
  ...GRADE_OPTIONS,
];

export function PostComposer({
  onCreated,
  onOpenBoards,
  onOpenQuestions,
}: PostComposerProps) {
  const bodyId = useId();
  const subjectId = useId();
  const gradeId = useId();
  const linkUrlId = useId();
  const linkTitleId = useId();

  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const cleanBody = body.trim();
    const cleanUrl = linkUrl.trim();
    const cleanTitle = linkTitle.trim();
    const isLink = showLink && cleanUrl.length > 0;

    if (!cleanBody && !isLink) {
      setNotice({ kind: 'error', text: 'Lütfen bir metin ya da bağlantı yazın.' });
      return;
    }

    if (isLink && !/^https?:\/\//i.test(cleanUrl)) {
      setNotice({ kind: 'error', text: 'Bağlantı adresi https:// veya http:// ile başlamalıdır.' });
      return;
    }

    setBusy(true);
    const res = await createPost({
      kind: isLink ? 'link' : 'text',
      body: cleanBody,
      linkUrl: isLink ? cleanUrl : undefined,
      linkTitle: isLink && cleanTitle ? cleanTitle : undefined,
      subject: subject || null,
      grade: grade || null,
    });

    if (!res.ok) {
      setBusy(false);
      setNotice({ kind: 'error', text: res.error });
      return;
    }

    const postRes = await getPost(res.data);
    setBusy(false);

    setBody('');
    setLinkUrl('');
    setLinkTitle('');
    setShowLink(false);
    setNotice({ kind: 'ok', text: 'Paylaşımınız yayınlandı.' });

    if (postRes.ok && postRes.data) {
      onCreated(postRes.data);
    }
  };

  const canSubmit = !busy && (body.trim().length > 0 || (showLink && linkUrl.trim().length > 0));

  return (
    <form className={s.composerCard} onSubmit={handleSubmit}>
      <div className={s.field}>
        <label htmlFor={bodyId}>Toplulukla paylaş</label>
        <textarea
          id={bodyId}
          className={s.textarea}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          placeholder="Bir şey yaz…"
        />
        <span className={s.charCount}>{body.length} / 2000</span>
      </div>

      {showLink && (
        <div className={s.composerLinkFields}>
          <div className={s.field}>
            <label htmlFor={linkUrlId}>Bağlantı adresi (https://…)</label>
            <input
              id={linkUrlId}
              type="url"
              className={s.textInput}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              required={showLink}
            />
          </div>
          <div className={s.field}>
            <label htmlFor={linkTitleId}>Bağlantı başlığı (isteğe bağlı)</label>
            <input
              id={linkTitleId}
              type="text"
              className={s.textInput}
              maxLength={140}
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Örn. Kesirler çalışma kağıdı (Drive)"
            />
          </div>
        </div>
      )}

      <div className={s.composerMetaRow}>
        <div className={s.field}>
          <label htmlFor={subjectId}>Ders</label>
          <CustomSelect
            id={subjectId}
            value={subject}
            options={SUBJECT_SELECT_OPTIONS}
            onChange={setSubject}
          />
        </div>
        <div className={s.field}>
          <label htmlFor={gradeId}>Sınıf / Kademe (isteğe bağlı)</label>
          <CustomSelect
            id={gradeId}
            value={grade}
            options={GRADE_SELECT_OPTIONS}
            onChange={setGrade}
          />
        </div>
      </div>

      <p className={s.privacyNote}>
        Fotoğraf ve dosya paylaşılamaz; Drive ya da YouTube bağlantısı ekleyebilirsin.
      </p>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className={s.composerFooter}>
        <div className={s.composerTools}>
          <button
            type="button"
            className={s.btnSecondary}
            aria-pressed={showLink}
            onClick={() => setShowLink((v) => !v)}
          >
            <Link2 size={16} aria-hidden="true" />
            <span>Bağlantı ekle</span>
          </button>

          {onOpenBoards && (
            <button type="button" className={s.btnSecondary} onClick={onOpenBoards}>
              <Layers size={16} aria-hidden="true" />
              <span>Tahta paylaş</span>
            </button>
          )}

          {onOpenQuestions && (
            <button type="button" className={s.btnSecondary} onClick={onOpenQuestions}>
              <HelpCircle size={16} aria-hidden="true" />
              <span>Soru seti paylaş</span>
            </button>
          )}
        </div>

        <button type="submit" className={s.btnPrimary} disabled={!canSubmit}>
          <Send size={16} aria-hidden="true" />
          <span>{busy ? 'Paylaşılıyor…' : 'Paylaş'}</span>
        </button>
      </div>
    </form>
  );
}

