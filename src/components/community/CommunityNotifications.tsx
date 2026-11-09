'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listNotifications,
  markNotificationsRead,
  notificationText,
  type CommunityNotification,
} from '../../lib/communitySocialData';
import { Spinner } from '../Spinner';
import { ShieldAlert, X } from '../icons';
import { Notice } from '../teacher/TeacherUi';
import { TeacherAvatar } from './TeacherAvatar';
import s from './CommunitySocial.module.css';

const PAGE_LIMIT = 30;

function formatRelativeTime(iso: string, nowMs: number): string {
  const diffSec = Math.floor((nowMs - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface CommunityNotificationsProps {
  onOpenPost: (postId: string) => void;
  onOpenTeacher: (teacherId: string) => void;
  onClose?: () => void;
  onMarkedRead?: () => void;
}

export function CommunityNotifications({
  onOpenPost,
  onOpenTeacher,
  onClose,
  onMarkedRead,
}: CommunityNotificationsProps) {
  const [nowMs] = useState(() => Date.now());
  const [items, setItems] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (before?: string | null) => {
      if (before) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const res = await listNotifications(PAGE_LIMIT, before || null);

      if (before) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setItems((prev) => {
        if (!before) return res.data;
        const seen = new Set(prev.map((x) => x.key));
        return [...prev, ...res.data.filter((x) => !seen.has(x.key))];
      });
      setHasMore(res.data.length >= PAGE_LIMIT);
    },
    []
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(null);
    void markNotificationsRead().then((res) => {
      if (res.ok) onMarkedRead?.();
    });
  }, [load, onMarkedRead]);

  const handleLoadMore = () => {
    if (loadingMore || items.length === 0) return;
    const last = items[items.length - 1];
    void load(last.at);
  };

  return (
    <section className={s.notifPanel} aria-label="Topluluk bildirimleri">
      <div className={s.notifHeader}>
        <h2 className={s.notifTitle}>Topluluk bildirimleri</h2>
        {onClose && (
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Bildirimleri kapat"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {error ? (
        <div className={s.emptyBox}>
          <Notice notice={{ kind: 'error', text: error }} />
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => load(null)}
          >
            Yeniden dene
          </button>
        </div>
      ) : loading ? (
        <Spinner center label="Bildirimler yükleniyor…" />
      ) : items.length === 0 ? (
        <div className={s.emptyBox}>
          <h3>Henüz bildirim yok</h3>
          <p>
            Paylaşımlarınıza teşekkür edildiğinde, yorum yazıldığında veya yeni takipçiniz
            olduğunda burada görünür.
          </p>
        </div>
      ) : (
        <>
          <ul className={s.notifList}>
            {items.map((n) => {
              const text = notificationText(n);
              const timeStr = formatRelativeTime(n.at, nowMs);
              const isModeration = n.kind === 'moderation';
              const hasAction =
                !isModeration &&
                Boolean(n.post_id || (n.kind === 'follow' && n.actor?.id));

              const content = (
                <>
                  {n.actor ? (
                    <TeacherAvatar card={n.actor} size={40} />
                  ) : (
                    <span className={s.notifIconBox} aria-hidden="true">
                      <ShieldAlert size={20} />
                    </span>
                  )}
                  <div className={s.notifBody}>
                    <span className={s.notifText}>{text}</span>
                    <span className={s.notifTime}>{timeStr}</span>
                  </div>
                </>
              );

              return (
                <li key={n.key} className={s.notifItem}>
                  {hasAction ? (
                    <button
                      type="button"
                      className={`${s.notifRowBtn} ${n.unread ? s.notifRowUnread : ''}`}
                      onClick={() => {
                        if (n.post_id) {
                          onOpenPost(n.post_id);
                        } else if (n.kind === 'follow' && n.actor?.id) {
                          onOpenTeacher(n.actor.id);
                        }
                      }}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      className={`${s.notifRowStatic} ${n.unread ? s.notifRowUnread : ''}`}
                    >
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className={s.moreRow}>
              <button
                type="button"
                className={s.btnSecondary}
                disabled={loadingMore}
                onClick={handleLoadMore}
              >
                {loadingMore ? 'Yükleniyor…' : 'Daha fazla'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

