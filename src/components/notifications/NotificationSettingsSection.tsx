'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  STUDENT_NOTIFICATION_KINDS,
  TEACHER_NOTIFICATION_KINDS,
  type NotificationKind,
  type NotificationSettings,
} from '../../lib/notificationData';
import {
  disablePush,
  enablePush,
  getPushStatus,
  sendTestPush,
  type PushStatus,
} from '../../lib/pushData';
import { Spinner } from '../Spinner';
import { Notice, type NoticeState } from '../teacher/TeacherUi';
import s from './Notifications.module.css';

const normalizeTime = (value: string | undefined, fallback: string) => {
  const trimmed = (value || '').trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : fallback;
};

export function NotificationSettingsSection({ role }: { role: 'teacher' | 'student' }) {
  const headingId = useId();
  const startId = useId();
  const endId = useId();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingKinds, setPendingKinds] = useState<Partial<Record<NotificationKind, boolean>>>({});
  const [togglingDevicePush, setTogglingDevicePush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [savingQuiet, setSavingQuiet] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setLoadError(null);
    setNotice(null);

    const [res, status] = await Promise.all([getNotificationSettings(), getPushStatus()]);
    setPushStatus(status);
    setLoading(false);

    if (!res.ok) {
      setLoadError(res.error);
      return;
    }

    setSettings({
      ...res.data,
      off_in_app: res.data.off_in_app || [],
      off_push: res.data.off_push || [],
      quiet_start: normalizeTime(res.data.quiet_start, '22:00'),
      quiet_end: normalizeTime(res.data.quiet_end, '07:00'),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setLoadError(null);

      const [res, status] = await Promise.all([getNotificationSettings(), getPushStatus()]);
      if (cancelled) return;
      setPushStatus(status);
      setLoading(false);

      if (!res.ok) {
        setLoadError(res.error);
        return;
      }

      setSettings({
        ...res.data,
        off_in_app: res.data.off_in_app || [],
        off_push: res.data.off_push || [],
        quiet_start: normalizeTime(res.data.quiet_start, '22:00'),
        quiet_end: normalizeTime(res.data.quiet_end, '07:00'),
      });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const kinds = role === 'teacher' ? TEACHER_NOTIFICATION_KINDS : STUDENT_NOTIFICATION_KINDS;
  const introText =
    role === 'teacher'
      ? 'Kapattığınız bildirimler zilde görünmez.'
      : 'Kapattığın bildirimler zilde görünmez.';

  // Bir kayıt sürerken bütün anahtarlar kilitli: kayıtlar sırayla gider, hata geri alması başka değişikliği silmez
  const anyPending = Object.values(pendingKinds).some(Boolean);

  const handleToggleDevicePush = async () => {
    if (!pushStatus || togglingDevicePush) return;

    setNotice(null);
    setTogglingDevicePush(true);

    const res = pushStatus.enabled ? await disablePush() : await enablePush();
    const nextStatus = await getPushStatus();
    setPushStatus(nextStatus);
    setTogglingDevicePush(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
    }
  };

  const handleSendTestPush = async () => {
    if (sendingTest || togglingDevicePush) return;

    setNotice(null);
    setSendingTest(true);

    const res = await sendTestPush();
    setSendingTest(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }

    setNotice({
      kind: 'ok',
      text:
        role === 'teacher'
          ? 'Deneme bildirimi gönderildi. Birkaç saniye içinde gelmezse telefonun bildirim ayarlarını kontrol edin.'
          : 'Deneme bildirimi gönderildi. Birkaç saniye içinde gelmezse telefonun bildirim ayarlarını kontrol et.',
    });
  };

  const handleToggleChannel = async (kind: NotificationKind, channel: 'in_app' | 'push') => {
    if (!settings || anyPending || savingQuiet) return;

    const prevOffInApp = settings.off_in_app;
    const prevOffPush = settings.off_push;

    if (channel === 'push' && prevOffInApp.includes(kind)) {
      return;
    }

    const nextOffInApp =
      channel === 'in_app'
        ? !prevOffInApp.includes(kind)
          ? [...prevOffInApp, kind]
          : prevOffInApp.filter((k) => k !== kind)
        : prevOffInApp;

    const nextOffPush =
      channel === 'push'
        ? !prevOffPush.includes(kind)
          ? [...prevOffPush, kind]
          : prevOffPush.filter((k) => k !== kind)
        : prevOffPush;

    setNotice(null);
    setPendingKinds((prev) => ({ ...prev, [kind]: true }));
    setSettings((prev) =>
      prev ? { ...prev, off_in_app: nextOffInApp, off_push: nextOffPush } : prev
    );

    const res = await saveNotificationSettings({
      off_in_app: nextOffInApp,
      off_push: nextOffPush,
    });

    setPendingKinds((prev) => ({ ...prev, [kind]: false }));

    if (!res.ok) {
      setSettings((prev) =>
        prev ? { ...prev, off_in_app: prevOffInApp, off_push: prevOffPush } : prev
      );
      setNotice({ kind: 'error', text: `Ayar kaydedilemedi: ${res.error}` });
    }
  };

  const handleSaveQuiet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || savingQuiet) return;

    setNotice(null);
    setSavingQuiet(true);

    const quietStart = settings.quiet_start.slice(0, 5);
    const quietEnd = settings.quiet_end.slice(0, 5);

    const res = await saveNotificationSettings({
      off_in_app: settings.off_in_app,
      off_push: settings.off_push,
      quiet_enabled: settings.quiet_enabled,
      quiet_start: quietStart,
      quiet_end: quietEnd,
    });

    setSavingQuiet(false);

    if (!res.ok) {
      setNotice({ kind: 'error', text: `Sessiz saatler kaydedilemedi: ${res.error}` });
      return;
    }

    setNotice({ kind: 'ok', text: 'Sessiz saat ayarları kaydedildi.' });
  };

  const iosInstallText =
    role === 'teacher'
      ? "iPhone'da bildirim almak için: Safari'de Paylaş düğmesine dokunun → Ana Ekrana Ekle → ana ekrandaki tofutr simgesinden açın."
      : "iPhone'da bildirim almak için: Safari'de Paylaş düğmesine dokun → Ana Ekrana Ekle → ana ekrandaki tofutr simgesinden aç.";

  const deniedText =
    role === 'teacher'
      ? 'Bildirim izni bu tarayıcıda engellenmiş. Tarayıcı ayarlarından tofutr.com için bildirimlere izin verin.'
      : 'Bildirim izni bu tarayıcıda engellenmiş. Tarayıcı ayarlarından tofutr.com için bildirimlere izin ver.';

  return (
    <div className={s.settingsWrap} aria-labelledby={headingId}>
      <div className={s.settingsHeader}>
        <h2 id={headingId} className={s.settingsTitle}>
          Bildirimler
        </h2>
        <p className={s.settingsIntro}>{introText}</p>
      </div>

      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}

      {loadError ? (
        <div className={s.stateBox}>
          <Notice notice={{ kind: 'error', text: loadError }} />
          <button type="button" className={s.secondaryBtn} onClick={() => void load()}>
            Tekrar dene
          </button>
        </div>
      ) : loading || !settings || !pushStatus ? (
        <Spinner center size="sm" label="Bildirim ayarları yükleniyor…" />
      ) : (
        <>
          <div className={s.deviceBox}>
            {pushStatus.support === 'unsupported' ? (
              <p className={s.deviceMuted}>Bu tarayıcı telefon bildirimlerini desteklemiyor.</p>
            ) : pushStatus.support === 'ios-needs-install' ? (
              <p className={s.deviceInfo}>{iosInstallText}</p>
            ) : pushStatus.permission === 'denied' ? (
              <p className={s.deviceInfo}>{deniedText}</p>
            ) : (
              <>
                <div className={s.settingsRowText}>
                  <span className={s.settingsRowLabel}>Telefon bildirimleri (bu cihaz)</span>
                  <span className={s.settingsRowDesc}>Uygulama kapalıyken de bildirim gelir.</span>
                </div>
                <div className={s.deviceActions}>
                  {pushStatus.enabled && (
                    <button
                      type="button"
                      className={s.testPushBtn}
                      disabled={sendingTest || togglingDevicePush}
                      onClick={() => void handleSendTestPush()}
                    >
                      {sendingTest ? 'Gönderiliyor…' : 'Deneme gönder'}
                    </button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pushStatus.enabled}
                    aria-label="Telefon bildirimleri (bu cihaz)"
                    className={s.switchBtn}
                    disabled={togglingDevicePush}
                    onClick={() => void handleToggleDevicePush()}
                  >
                    <span className={s.switchTrack} aria-hidden="true">
                      <span className={s.switchThumb} />
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={s.settingsList}>
            <div className={s.settingsListHead} aria-hidden="true">
              <span className={s.settingsColHead}>Zil</span>
              <span className={s.settingsColHead}>Telefon</span>
            </div>
            <ul className={s.list}>
              {kinds.map((item) => {
                const isInAppOn = !settings.off_in_app.includes(item.kind);
                const isPushOn = isInAppOn && !settings.off_push.includes(item.kind);
                const isBusy = anyPending || savingQuiet;
                return (
                  <li key={item.kind} className={s.settingsRow}>
                    <div className={s.settingsRowText}>
                      <span className={s.settingsRowLabel}>{item.label}</span>
                      <span className={s.settingsRowDesc}>{item.description}</span>
                    </div>
                    <div className={s.settingsSwitches}>
                      <div className={s.switchCol}>
                        <span className={s.switchColLabel} aria-hidden="true">
                          Zil
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isInAppOn}
                          aria-label={`${item.label} — Zil`}
                          className={s.switchBtn}
                          disabled={isBusy}
                          onClick={() => void handleToggleChannel(item.kind, 'in_app')}
                        >
                          <span className={s.switchTrack} aria-hidden="true">
                            <span className={s.switchThumb} />
                          </span>
                        </button>
                      </div>
                      <div className={s.switchCol}>
                        <span className={s.switchColLabel} aria-hidden="true">
                          Telefon
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isPushOn}
                          aria-label={`${item.label} — Telefon`}
                          className={s.switchBtn}
                          disabled={isBusy || !isInAppOn}
                          onClick={() => void handleToggleChannel(item.kind, 'push')}
                        >
                          <span className={s.switchTrack} aria-hidden="true">
                            <span className={s.switchThumb} />
                          </span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {role === 'teacher' && settings.can_edit_quiet ? (
            <form className={s.quietBox} onSubmit={handleSaveQuiet}>
              <div className={s.quietTopRow}>
                <div className={s.settingsRowText}>
                  <span className={s.settingsRowLabel}>Sessiz saatler</span>
                  <span className={s.settingsRowDesc}>
                    Telefon bildirimleri bu saatlerde gönderilmez; bildirimler zilde bekler.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.quiet_enabled}
                  aria-label="Sessiz saatler"
                  className={s.switchBtn}
                  disabled={savingQuiet}
                  onClick={() => {
                    setNotice(null);
                    setSettings((prev) =>
                      prev ? { ...prev, quiet_enabled: !prev.quiet_enabled } : prev
                    );
                  }}
                >
                  <span className={s.switchTrack} aria-hidden="true">
                    <span className={s.switchThumb} />
                  </span>
                </button>
              </div>

              <div className={s.quietControls}>
                <label className={s.timeField} htmlFor={startId}>
                  <span>Başlangıç</span>
                  <input
                    id={startId}
                    type="time"
                    className={s.timeInput}
                    value={settings.quiet_start}
                    disabled={!settings.quiet_enabled || savingQuiet}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 5);
                      setNotice(null);
                      setSettings((prev) => (prev ? { ...prev, quiet_start: val } : prev));
                    }}
                    required
                  />
                </label>

                <label className={s.timeField} htmlFor={endId}>
                  <span>Bitiş</span>
                  <input
                    id={endId}
                    type="time"
                    className={s.timeInput}
                    value={settings.quiet_end}
                    disabled={!settings.quiet_enabled || savingQuiet}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 5);
                      setNotice(null);
                      setSettings((prev) => (prev ? { ...prev, quiet_end: val } : prev));
                    }}
                    required
                  />
                </label>

                <button type="submit" className={s.saveBtn} disabled={savingQuiet}>
                  {savingQuiet ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>
          ) : (
            <p className={s.settingsNote}>
              Gece 22.00 ile 07.00 arasında telefona bildirim gönderilmez.
            </p>
          )}
        </>
      )}
    </div>
  );
}
