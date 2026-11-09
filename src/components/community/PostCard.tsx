'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  KIND_LABEL,
  copyFromCommunity,
  favoriteCommunity,
  unpublishCommunity,
  type CommunityKind,
  type CommunitySummary,
} from '../../lib/communityData';
import {
  blockTeacher,
  deletePost,
  react as reactToPost,
  reportContent,
  thumbUrl,
  updatePost,
  type FeedPost,
} from '../../lib/communitySocialData';
import { GRADE_OPTIONS } from '../../lib/filesData';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { SUBJECT_OPTIONS } from '../files/FileDialogs';
import {
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  Copy,
  Edit,
  Eye,
  Flag,
  HeartHandshake,
  HelpCircle,
  Layers,
  MessageSquare,
  MoreHorizontal,
  Save,
  Star,
  Trash2,
  VolumeX,
  X,
} from '../icons';
import { Notice, formatDate, type NoticeState } from '../teacher/TeacherUi';
import { TeacherByline } from './TeacherAvatar';
import s from './CommunitySocial.module.css';

const KIND_ICON: Record<CommunityKind, React.ComponentType<{ size?: number }>> = {
  board: Layers,
  questions: HelpCircle,
};

function subjectThumbClass(subject: string | null | undefined): string {
  const v = (subject || '').toLocaleLowerCase('tr-TR');
  if (v.includes('matematik')) return `${s.thumbBox} ${s.thumbMath}`;
  if (v.includes('türkçe') || v.includes('edebiyat')) return `${s.thumbBox} ${s.thumbTurkish}`;
  if (v.includes('fen') || v.includes('fizik') || v.includes('kimya') || v.includes('biyoloji')) {
    return `${s.thumbBox} ${s.thumbScience}`;
  }
  if (v.includes('sosyal') || v.includes('tarih') || v.includes('coğrafya') || v.includes('hayat')) {
    return `${s.thumbBox} ${s.thumbSocial}`;
  }
  return s.thumbBox;
}

export function formatRelativeTime(iso: string, nowMs: number): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - created) / 1000));
  if (diffSec < 60) return 'Az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return formatDate(iso);
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function feedPostToSummary(post: FeedPost): CommunitySummary | null {
  if (!post.item) return null;
  const it = post.item;
  return {
    id: it.id,
    kind: it.kind,
    title: it.title,
    description: post.body || '',
    grade: it.grade,
    subject: it.subject,
    outcomes: it.outcomes || [],
    tags: it.tags || [],
    author_name: post.author.name,
    author_id: post.author.id,
    page_count: it.page_count,
    question_count: it.question_count,
    rating_avg: it.rating_avg,
    rating_count: it.rating_count,
    copy_count: it.copy_count,
    recent_copies: 0,
    featured: it.featured,
    hidden: false,
    is_mine: post.is_mine,
    is_favorite: it.is_favorite,
    my_rating: null,
    origin_author: it.origin_author,
    origin_title: it.origin_title,
    created_at: post.created_at,
  };
}

export interface PostCardProps {
  post: FeedPost;
  onOpenTeacher: (teacherId: string) => void;
  onOpenPreview: (summary: CommunitySummary) => void;
  onUpdated: (postId: string, patch: Partial<FeedPost>) => void;
  onDeleted: (postId: string) => void;
  onMutedAuthor?: (authorId: string) => void;
  onOpenComments?: (postId: string) => void;
}

const EDIT_SUBJECT_OPTIONS = [{ value: '', label: 'Branş seçilmedi' }, ...SUBJECT_OPTIONS];
const EDIT_GRADE_OPTIONS = [{ value: '', label: 'Kademe seçilmedi' }, ...GRADE_OPTIONS];

export function PostCard({
  post,
  onOpenTeacher,
  onOpenPreview,
  onUpdated,
  onDeleted,
  onMutedAuthor,
  onOpenComments,
}: PostCardProps) {
  const { confirm } = useDialog();
  const menuRef = useRef<HTMLDivElement>(null);
  const reportTitleId = useId();
  const reportReasonId = useId();

  const [nowMs] = useState(() => Date.now());
  const [expandedText, setExpandedText] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reactBusy, setReactBusy] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  // Düzenleme durumu (yalnızca kendi yazı/bağlantısı)
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body || '');
  const [editLinkTitle, setEditLinkTitle] = useState(post.link_title || '');
  const [editSubject, setEditSubject] = useState(post.subject || '');
  const [editGrade, setEditGrade] = useState(post.grade || '');
  const [editBusy, setEditBusy] = useState(false);

  // Şikâyet modalı
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  const relDate = formatRelativeTime(post.created_at, nowMs);
  const dateLabel = post.edited_at ? `${relDate} · düzenlendi` : relDate;

  const handleReact = async (kind: 'thanks' | 'used') => {
    if (post.is_mine || reactBusy) return;
    const prevThanks = post.my_thanks;
    const prevUsed = post.my_used;
    const prevThanksCount = post.thanks_count;
    const prevUsedCount = post.used_count;

    const nextOn = kind === 'thanks' ? !prevThanks : !prevUsed;
    const nextThanksCount =
      kind === 'thanks'
        ? Math.max(0, prevThanksCount + (nextOn ? 1 : -1))
        : prevThanksCount;
    const nextUsedCount =
      kind === 'used' ? Math.max(0, prevUsedCount + (nextOn ? 1 : -1)) : prevUsedCount;

    setNotice(null);
    setReactBusy(true);
    onUpdated(post.id, {
      my_thanks: kind === 'thanks' ? nextOn : prevThanks,
      my_used: kind === 'used' ? nextOn : prevUsed,
      thanks_count: nextThanksCount,
      used_count: nextUsedCount,
    });

    const res = await reactToPost(post.id, kind, nextOn);
    setReactBusy(false);
    if (!res.ok) {
      onUpdated(post.id, {
        my_thanks: prevThanks,
        my_used: prevUsed,
        thanks_count: prevThanksCount,
        used_count: prevUsedCount,
      });
      setNotice({ kind: 'error', text: res.error });
      return;
    }

    onUpdated(post.id, {
      thanks_count: res.data.thanks_count,
      used_count: res.data.used_count,
    });
  };

  const handleCopyItem = async () => {
    if (!post.item || copyBusy) return;
    setNotice(null);
    setCopyBusy(true);
    const res = await copyFromCommunity(post.item.id);
    setCopyBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    onUpdated(post.id, {
      item: {
        ...post.item,
        copy_count: post.item.copy_count + 1,
      },
    });
    setNotice({
      kind: 'ok',
      text: res.data.boardId
        ? `Tahta Tahtalarım’a eklendi${
            res.data.questionCount
              ? `; ${res.data.questionCount} Mini Test sorusu soru bankanıza eklendi`
              : ''
          }.`
        : `${res.data.questionCount} soru soru bankanıza eklendi (“Topluluk” etiketiyle).`,
    });
  };

  const handleToggleFavorite = async () => {
    if (!post.item || favBusy) return;
    const prevFav = post.item.is_favorite;
    const nextFav = !prevFav;
    setNotice(null);
    setFavBusy(true);
    onUpdated(post.id, {
      item: { ...post.item, is_favorite: nextFav },
    });
    const res = await favoriteCommunity(post.item.id, nextFav);
    setFavBusy(false);
    if (!res.ok) {
      onUpdated(post.id, {
        item: { ...post.item, is_favorite: prevFav },
      });
      setNotice({ kind: 'error', text: res.error });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editBusy) return;
    const cleanBody = editBody.trim();
    if (!cleanBody && post.kind === 'text') {
      setNotice({ kind: 'error', text: 'Gönderi metni boş olamaz.' });
      return;
    }
    setNotice(null);
    setEditBusy(true);
    const res = await updatePost(post.id, {
      body: cleanBody,
      linkTitle: post.kind === 'link' ? editLinkTitle.trim() : undefined,
      subject: editSubject || null,
      grade: editGrade || null,
    });
    setEditBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    onUpdated(post.id, {
      body: cleanBody,
      link_title: post.kind === 'link' ? editLinkTitle.trim() || null : post.link_title,
      subject: editSubject || null,
      grade: editGrade || null,
      edited_at: new Date().toISOString(),
    });
    setEditing(false);
    setNotice({ kind: 'ok', text: 'Gönderiniz güncellendi.' });
  };

  const handleDeletePost = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: 'Gönderiyi sil',
      message: 'Bu gönderiyi silmek istediğinize emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    const res = await deletePost(post.id);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    onDeleted(post.id);
  };

  const handleUnpublishItem = async () => {
    if (!post.item) return;
    setMenuOpen(false);
    const ok = await confirm({
      title: 'Paylaşımdan kaldır',
      message: `"${post.item.title}" topluluktan kaldırılsın mı?\nDaha önce kopyalamış öğretmenlerin kopyaları etkilenmez.`,
      confirmText: 'Kaldır',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    const res = await unpublishCommunity(post.item.id);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    onDeleted(post.id);
  };

  const handleMuteAuthor = async () => {
    setMenuOpen(false);
    setBusy(true);
    const res = await blockTeacher(post.author.id, 'mute');
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setNotice({ kind: 'ok', text: `${post.author.name} sessize alındı.` });
    onMutedAuthor?.(post.author.id);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportBusy) return;
    const clean = reportReason.trim();
    if (clean.length < 3 || clean.length > 500) {
      setNotice({ kind: 'error', text: 'Şikâyet nedeni 3 ile 500 karakter arasında olmalıdır.' });
      return;
    }
    setReportBusy(true);
    const res = await reportContent('post', post.id, clean);
    setReportBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setReportOpen(false);
    setReportReason('');
    setNotice({ kind: 'ok', text: 'Bildiriminiz yöneticiye iletildi. Teşekkürler.' });
  };

  const rawBody = post.body || '';
  const isLongText = rawBody.length > 320;
  const shownText = isLongText && !expandedText ? `${rawBody.slice(0, 320)}…` : rawBody;

  const it = post.item;
  const tUrl = it ? thumbUrl(it.thumb_path) : null;
  const showItemThumb = Boolean(it && it.kind === 'board' && tUrl && !thumbFailed);
  const ItemIcon = it ? KIND_ICON[it.kind] || Layers : Layers;

  return (
    <article className={s.postCard}>
      <div className={s.postHeader}>
        <TeacherByline
          card={post.author}
          date={dateLabel}
          size={40}
          onOpenTeacher={onOpenTeacher}
        />

        <div className={s.menuWrap} ref={menuRef}>
          <button
            type="button"
            className={s.btnIcon}
            aria-label="Gönderi işlemleri"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={busy}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className={s.menuDropdown} role="menu">
              {post.is_mine && (post.kind === 'text' || post.kind === 'link') && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={s.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      setEditBody(post.body || '');
                      setEditLinkTitle(post.link_title || '');
                      setEditSubject(post.subject || '');
                      setEditGrade(post.grade || '');
                      setEditing(true);
                    }}
                  >
                    <Edit size={16} aria-hidden="true" />
                    <span>Düzenle</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${s.menuItem} ${s.menuItemDanger}`}
                    onClick={handleDeletePost}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    <span>Sil</span>
                  </button>
                </>
              )}

              {post.is_mine && post.kind === 'item' && post.item && (
                <button
                  type="button"
                  role="menuitem"
                  className={`${s.menuItem} ${s.menuItemDanger}`}
                  onClick={handleUnpublishItem}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span>Paylaşımdan kaldır</span>
                </button>
              )}

              {!post.is_mine && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={s.menuItem}
                    onClick={handleMuteAuthor}
                  >
                    <VolumeX size={16} aria-hidden="true" />
                    <span>Yazarı sessize al</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${s.menuItem} ${s.menuItemDanger}`}
                    onClick={() => {
                      setMenuOpen(false);
                      setReportReason('');
                      setReportOpen(true);
                    }}
                  >
                    <Flag size={16} aria-hidden="true" />
                    <span>Şikâyet et</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Düzenleme modu */}
      {editing ? (
        <form className={s.composerLinkFields} onSubmit={handleSaveEdit}>
          <div className={s.field}>
            <label>Gönderi metni</label>
            <textarea
              className={s.textarea}
              maxLength={2000}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value.slice(0, 2000))}
            />
          </div>
          {post.kind === 'link' && (
            <div className={s.field}>
              <label>Bağlantı başlığı</label>
              <input
                type="text"
                className={s.textInput}
                maxLength={140}
                value={editLinkTitle}
                onChange={(e) => setEditLinkTitle(e.target.value)}
              />
            </div>
          )}
          <div className={s.composerMetaRow}>
            <div className={s.field}>
              <label>Ders</label>
              <CustomSelect
                value={editSubject}
                options={EDIT_SUBJECT_OPTIONS}
                onChange={setEditSubject}
              />
            </div>
            <div className={s.field}>
              <label>Kademe</label>
              <CustomSelect
                value={editGrade}
                options={EDIT_GRADE_OPTIONS}
                onChange={setEditGrade}
              />
            </div>
          </div>
          <div className={s.modalActions}>
            <button
              type="button"
              className={s.btnSecondary}
              disabled={editBusy}
              onClick={() => setEditing(false)}
            >
              Vazgeç
            </button>
            <button type="submit" className={s.btnPrimary} disabled={editBusy}>
              <Save size={16} aria-hidden="true" />
              <span>{editBusy ? 'Kaydediliyor…' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Gönderi metni */}
          {rawBody && (
            <div>
              <p className={s.postText}>{shownText}</p>
              {isLongText && (
                <button
                  type="button"
                  className={s.readMoreBtn}
                  onClick={() => setExpandedText((v) => !v)}
                >
                  {expandedText ? 'Daha az göster' : 'Devamını göster'}
                </button>
              )}
            </div>
          )}

          {/* Bağlantı kutusu (kind = 'link') */}
          {post.kind === 'link' && post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className={s.linkBox}
            >
              <div className={s.linkBoxText}>
                <span className={s.linkBoxTitle}>
                  {post.link_title || post.link_url}
                </span>
                <span className={s.linkBoxDomain}>{getHostname(post.link_url)}</span>
              </div>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}

          {/* Materyal kutusu (kind = 'item') */}
          {post.kind === 'item' && it && (
            <div className={s.itemBox}>
              <div className={subjectThumbClass(it.subject)}>
                {showItemThumb && tUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tUrl}
                    alt=""
                    className={s.thumbImg}
                    loading="lazy"
                    onError={() => setThumbFailed(true)}
                  />
                ) : (
                  <ItemIcon size={32} />
                )}
              </div>

              <div className={s.itemBoxBody}>
                <div className={s.field}>
                  <h3 className={s.itemBoxTitle}>{it.title}</h3>
                  <div className={s.itemBadges}>
                    <span className={`${s.itemBadge} ${s.itemBadgePrimary}`}>
                      {KIND_LABEL[it.kind]}
                    </span>
                    {[it.subject, it.grade].filter(Boolean).map((tag) => (
                      <span key={tag} className={s.itemBadge}>
                        {tag}
                      </span>
                    ))}
                    <span className={s.itemBadge}>
                      {it.kind === 'board'
                        ? `${it.page_count} sayfa`
                        : `${it.question_count} soru`}
                    </span>
                    <span className={s.itemBadge}>{it.copy_count} kopya</span>
                    <span className={s.itemBadge}>
                      <Star size={13} aria-hidden="true" />
                      <span>
                        {it.rating_avg != null
                          ? `${it.rating_avg.toLocaleString('tr-TR')} (${it.rating_count})`
                          : 'Puan yok'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className={s.itemActions}>
                  <button
                    type="button"
                    className={s.btnPrimary}
                    onClick={() => {
                      const sum = feedPostToSummary(post);
                      if (sum) onOpenPreview(sum);
                    }}
                  >
                    <Eye size={16} aria-hidden="true" />
                    <span>Önizle</span>
                  </button>

                  <button
                    type="button"
                    className={s.btnSecondary}
                    disabled={copyBusy}
                    onClick={handleCopyItem}
                  >
                    <Copy size={16} aria-hidden="true" />
                    <span>{copyBusy ? 'Kopyalanıyor…' : 'Kopyala'}</span>
                  </button>

                  <button
                    type="button"
                    className={s.btnSecondary}
                    aria-pressed={it.is_favorite}
                    disabled={favBusy}
                    onClick={handleToggleFavorite}
                  >
                    <Bookmark size={16} aria-hidden="true" />
                    <span>{it.is_favorite ? 'Kaydedildi' : 'Kaydet'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* Alt tepki çubuğu */}
      <div className={s.reactionBar}>
        <button
          type="button"
          className={s.reactBtn}
          aria-pressed={post.my_thanks}
          disabled={post.is_mine || reactBusy}
          title={post.is_mine ? 'Kendi gönderinize tepki veremezsiniz' : undefined}
          onClick={() => handleReact('thanks')}
        >
          <HeartHandshake size={16} aria-hidden="true" />
          <span>Teşekkürler ({post.thanks_count})</span>
        </button>

        <button
          type="button"
          className={s.reactBtn}
          aria-pressed={post.my_used}
          disabled={post.is_mine || reactBusy}
          title={post.is_mine ? 'Kendi gönderinize tepki veremezsiniz' : undefined}
          onClick={() => handleReact('used')}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Derste kullandım ({post.used_count})</span>
        </button>

        <button
          type="button"
          className={s.reactBtn}
          onClick={() => onOpenComments?.(post.id)}
        >
          <MessageSquare size={16} aria-hidden="true" />
          <span>Yorumlar ({post.comment_count})</span>
        </button>
      </div>

      {/* Şikâyet modalı */}
      {reportOpen && (
        <div
          className={s.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby={reportTitleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !reportBusy) {
              e.preventDefault();
              setReportOpen(false);
            }
          }}
        >
          <form className={s.modalCard} onSubmit={handleReportSubmit}>
            <div className={s.modalHead}>
              <h3 id={reportTitleId}>Gönderiyi şikâyet et</h3>
              <button
                type="button"
                className={s.btnIcon}
                aria-label="Kapat"
                disabled={reportBusy}
                onClick={() => setReportOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className={s.field}>
              <label htmlFor={reportReasonId}>
                Şikâyet nedeninizi kısaca yazın (3–500 karakter)
              </label>
              <textarea
                id={reportReasonId}
                className={s.textarea}
                minLength={3}
                maxLength={500}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value.slice(0, 500))}
                placeholder="Neden uygunsuz olduğunu belirtin…"
                required
                autoFocus
              />
              <span className={s.charCount}>{reportReason.length} / 500</span>
            </div>

            <div className={s.modalActions}>
              <button
                type="button"
                className={s.btnSecondary}
                disabled={reportBusy}
                onClick={() => setReportOpen(false)}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className={s.btnDanger}
                disabled={reportBusy || reportReason.trim().length < 3}
              >
                {reportBusy ? 'Gönderiliyor…' : 'Şikâyeti gönder'}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

