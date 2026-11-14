'use client';

import React, { useEffect, useId, useState } from 'react';
import { enablePush, getPushStatus } from '../../lib/pushData';
import { Bell } from '../icons';
import { Notice, type NoticeState } from '../teacher/TeacherUi';
import s from './Notifications.module.css';

const DISMISSED_KEY = 'tofutr:push-invite-dismissed';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isInviteAllowedByStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return true;
    const parsed = Date.parse(raw);
    const ts = Number.isNaN(parsed) ? Number(raw) : parsed;
    if (Number.isNaN(ts) || ts <= 0) return true;
    return Date.now() - ts >= THIRTY_DAYS_MS;
  } catch {
    return false;
  }
}

export function PushInviteCard({ role }: { role: 'teacher' | 'student' }) {
  const titleId = useId();
  const [mode, setMode] = useState<'supported' | 'ios-needs-install' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!isInviteAllowedByStorage()) return;

      const status = await getPushStatus();
      if (cancelled) return;

      if (status.support === 'supported' && status.permission === 'default' && !status.enabled) {
        setMode('supported');
      } else if (status.support === 'ios-needs-install') {
        setMode('ios-needs-install');
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    } catch {
      // Depolama erişilemezse yalnızca bu oturumda gizle
    }
    setNotice(null);
    setMode(null);
  };

  const handleEnable = async () => {
    if (busy) return;
    setNotice(null);
    setBusy(true);

    const res = await enablePush();
    setBusy(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }

    setMode(null);
    setNotice({
      kind: 'ok',
      text: 'Telefon bildirimleri açıldı.',
    });
  };

  if (!mode && !notice) return null;

  const title = role === 'teacher' ? 'Bildirimleri açın' : 'Bildirimleri aç';
  const description =
    mode === 'ios-needs-install'
      ? role === 'teacher'
        ? "iPhone'da bildirim almak için: Safari'de Paylaş düğmesine dokunun → Ana Ekrana Ekle → ana ekrandaki tofutr simgesinden açın."
        : "iPhone'da bildirim almak için: Safari'de Paylaş düğmesine dokun → Ana Ekrana Ekle → ana ekrandaki tofutr simgesinden aç."
      : role === 'teacher'
        ? 'Öğrenci mesajı ve ödev teslimi gelince telefonunuza bildirim gelsin.'
        : 'Yeni ödev, mesaj ve canlı ders başlayınca telefonuna bildirim gelsin.';

  return (
    <div className={s.inviteWrap}>
      {mode && (
        <section className={s.inviteCard} aria-labelledby={titleId}>
          <div className={s.inviteMain}>
            <span className={s.inviteIcon} aria-hidden="true">
              <Bell size={20} />
            </span>
            <div className={s.inviteText}>
              <h2 id={titleId} className={s.inviteTitle}>
                {title}
              </h2>
              <p className={s.inviteDesc}>{description}</p>
            </div>
          </div>
          <div className={s.inviteActions}>
            {mode === 'supported' && (
              <button
                type="button"
                className={s.invitePrimaryBtn}
                disabled={busy}
                onClick={() => void handleEnable()}
              >
                {busy ? 'Açılıyor…' : 'Aç'}
              </button>
            )}
            <button
              type="button"
              className={s.inviteSecondaryBtn}
              disabled={busy}
              onClick={handleDismiss}
            >
              Şimdi değil
            </button>
          </div>
        </section>
      )}
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
    </div>
  );
}
