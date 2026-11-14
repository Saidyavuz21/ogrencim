'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  listNotifications,
  markNotificationsRead,
  notificationLines,
  notificationTarget,
  notificationText,
  type AppNotification,
  type NotificationKind,
  type NotificationTarget,
} from '../../lib/notificationData';
import {
  ArrowLeft,
  Bell,
  CheckSquare,
  FileText,
  Folder,
  Globe,
  HelpCircle,
  MessageSquare,
  Share2,
  Video,
  X,
  type IconProps,
} from '../icons';
import { Spinner } from '../Spinner';
import { Notice } from '../teacher/TeacherUi';
import s from './Notifications.module.css';

const PAGE_LIMIT = 30;

function formatRelativeTime(iso: string, nowMs: number): string {
  const timeMs = new Date(iso).getTime();
  if (Number.isNaN(timeMs)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
  if (diffSec < 60) return 'Az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return new Date(timeMs).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

function getKindIcon(kind: NotificationKind): React.FC<IconProps> {
  switch (kind) {
    case 'mesaj':
      return MessageSquare;
    case 'odev_yeni':
    case 'odev_hatirlatma':
      return FileText;
    case 'odev_degerlendirildi':
    case 'odev_teslim':
    case 'odev_bitti':
      return CheckSquare;
    case 'canli_ders':
      return Video;
    case 'duyuru':
      return Bell;
    case 'topluluk':
      return Globe;
    case 'quiz':
    case 'quiz_bitti':
    case 'soru_yeni':
    case 'soru_cevap':
      return HelpCircle;
    case 'tahta_paylasildi':
      return Share2;
    case 'dosya_silinecek':
      return Folder;
    default:
      return Bell;
  }
}

export function NotificationPanel(props: {
  role: 'teacher' | 'student';
  open: boolean;
  onClose: () => void;
  /** Bildirime tıklanınca: panel kapanır, sonra bu çağrılır */
  onOpenTarget: (target: NotificationTarget, n: AppNotification) => void;
  /** Zil düğmesi (kapanınca odak buraya döner; masaüstünde panel bunun altına hizalanır) */
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const { role, open, onClose, onOpenTarget, anchorRef } = props;
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
    anchorRef.current?.focus();
  }, [onClose, anchorRef]);

  const loadInitial = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    setActionError(null);
    setNowMs(Date.now());

    const res = await listNotifications(null, PAGE_LIMIT);
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setItems(res.data);
    setHasMore(res.data.length >= PAGE_LIMIT);
  }, []);

  // Panel açıldığında ilk sayfayı yükle; kapanınca odağı zile döndür
  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        anchorRef.current?.focus();
      }
      return;
    }

    wasOpenRef.current = true;
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setActionError(null);
      setNowMs(Date.now());

      const res = await listNotifications(null, PAGE_LIMIT);
      if (cancelled) return;
      setLoading(false);

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setItems(res.data);
      setHasMore(res.data.length >= PAGE_LIMIT);
    };

    void run();
    closeBtnRef.current?.focus();

    return () => {
      cancelled = true;
    };
  }, [open, anchorRef]);

  // Masaüstünde zilin altına hizala; mobilde arka plan kaymasını kilitle
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const panelEl = panelRef.current;
      const anchorEl = anchorRef.current;
      if (!panelEl || !anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const top = Math.max(8, Math.round(rect.bottom + 8));
      const rawRight = Math.round(vw - rect.right);
      const maxRight = Math.max(12, vw - 380 - 12);
      const right = Math.min(Math.max(12, rawRight), maxRight);
      panelEl.style.setProperty('--notif-top', `${top}px`);
      panelEl.style.setProperty('--notif-right', `${right}px`);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const prevOverflow = document.body.style.overflow;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (isMobile) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [open, anchorRef]);

  // Esc tuşu ve masaüstünde dışarı tıklama ile kapatma
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      handleClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, handleClose, anchorRef]);

  if (!open) return null;

  const hasUnread = items.some((x) => x.unread);

  const handleMarkAllRead = async () => {
    if (markingAll || loading || !hasUnread) return;
    setMarkingAll(true);
    setActionError(null);

    const res = await markNotificationsRead();
    setMarkingAll(false);

    if (!res.ok) {
      setActionError(res.error);
      return;
    }

    setItems((prev) => prev.map((item) => (item.unread ? { ...item, unread: false } : item)));
  };

  const handleLoadMore = async () => {
    if (loadingMore || items.length === 0) return;
    const last = items[items.length - 1];
    setLoadingMore(true);
    setActionError(null);

    const res = await listNotifications(last.at, PAGE_LIMIT);
    setLoadingMore(false);

    if (!res.ok) {
      setActionError(res.error);
      return;
    }

    setItems((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      return [...prev, ...res.data.filter((x) => !seen.has(x.id))];
    });
    setHasMore(res.data.length >= PAGE_LIMIT);
  };

  const handleRowClick = (n: AppNotification) => {
    if (n.unread) {
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item)));
      void markNotificationsRead([n.id]).catch(() => {});
    }
    const target = notificationTarget(n, role);
    onClose();
    onOpenTarget(target, n);
  };

  const emptyDescription =
    role === 'teacher'
      ? 'Mesaj, ödev teslimi ve duyurular burada görünür.'
      : 'Ödev, mesaj ve duyurular burada görünür.';

  return (
    <section
      ref={panelRef}
      className={s.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <header className={s.header}>
        <div className={s.headerLeft}>
          <button
            type="button"
            className={s.mobileBackBtn}
            onClick={handleClose}
            aria-label="Geri"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <h2 id={titleId} className={s.title}>
            Bildirimler
          </h2>
        </div>

        <div className={s.headerActions}>
          <button
            type="button"
            className={s.markAllBtn}
            disabled={markingAll || loading || !hasUnread}
            onClick={() => void handleMarkAllRead()}
          >
            {markingAll ? 'İşleniyor…' : 'Tümünü okundu yap'}
          </button>
          <button
            ref={closeBtnRef}
            type="button"
            className={s.closeBtn}
            onClick={handleClose}
            aria-label="Bildirimleri kapat"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {actionError && (
        <div className={s.noticeBanner}>
          <Notice
            notice={{ kind: 'error', text: actionError }}
            onClose={() => setActionError(null)}
          />
        </div>
      )}

      <div className={s.bodyScroll}>
        {error ? (
          <div className={s.stateBox}>
            <Notice notice={{ kind: 'error', text: error }} />
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() => void loadInitial()}
            >
              Tekrar dene
            </button>
          </div>
        ) : loading ? (
          <div className={s.stateBox}>
            <Spinner center size="sm" label="Bildirimler yükleniyor…" />
          </div>
        ) : items.length === 0 ? (
          <div className={s.emptyBox}>
            <p className={s.emptyTitle}>Henüz bildirim yok.</p>
            <p className={s.emptyDesc}>{emptyDescription}</p>
          </div>
        ) : (
          <>
            <ul className={s.list}>
              {items.map((n) => {
                const Icon = getKindIcon(n.kind);
                const mainText = notificationText(n);
                const { detail, preview } = notificationLines(n);
                const timeStr = formatRelativeTime(n.at, nowMs);
                const isUrgent = n.kind === 'duyuru' && n.sub === 'urgent';

                return (
                  <li key={n.id} className={s.item}>
                    <button
                      type="button"
                      className={`${s.rowBtn} ${n.unread ? s.rowUnread : ''}`}
                      onClick={() => handleRowClick(n)}
                    >
                      <span
                        className={`${s.iconBox} ${isUrgent ? s.iconBoxUrgent : ''}`}
                        aria-hidden="true"
                      >
                        <Icon size={18} />
                      </span>

                      <span className={s.rowContent}>
                        <span className={s.rowMainLine}>
                          <span className={s.rowText}>{mainText}</span>
                          {isUrgent && <span className={s.urgentBadge}>Önemli</span>}
                        </span>
                        {detail ? <span className={s.rowTitle}>{detail}</span> : null}
                        {preview ? <span className={s.rowBody}>{preview}</span> : null}
                      </span>

                      <span className={s.rowMeta}>
                        {timeStr ? <span className={s.rowTime}>{timeStr}</span> : null}
                        {n.unread ? (
                          <span className={s.unreadDot} title="Okunmamış" aria-hidden="true" />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <div className={s.moreRow}>
                <button
                  type="button"
                  className={s.secondaryBtn}
                  disabled={loadingMore}
                  onClick={() => void handleLoadMore()}
                >
                  {loadingMore ? 'Yükleniyor…' : 'Daha fazla'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
