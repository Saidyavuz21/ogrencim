'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DISPLAY_MODE_LABEL,
  VISIBILITY_LABEL,
  getMySettings,
  removeAvatar,
  saveMySettings,
  uploadAvatar,
  type CommunitySettings,
  type DisplayMode,
  type EditableSettings,
  type ProfileVisibility,
} from '../../lib/communitySocialData';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { Spinner } from '../Spinner';
import { AlertCircle, Save, Trash2, Upload } from '../icons';
import { Notice, formatDate, type NoticeState } from '../teacher/TeacherUi';
import { TeacherAvatar } from './TeacherAvatar';
import s from './CommunitySocial.module.css';

function computePreviewName(fullName: string, mode: DisplayMode, alias: string): string {
  const cleanFull = (fullName || '').trim() || 'Öğretmen';
  if (mode === 'alias') {
    const cleanAlias = alias.trim();
    return cleanAlias.length > 0 ? cleanAlias : cleanFull;
  }
  if (mode === 'short') {
    const parts = cleanFull.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return cleanFull;
    const last = parts[parts.length - 1];
    const firstChar = (last[0] || '').toLocaleUpperCase('tr-TR');
    return `${parts.slice(0, -1).join(' ')} ${firstChar}.`;
  }
  return cleanFull;
}

const VISIBILITY_OPTIONS = (Object.keys(VISIBILITY_LABEL) as ProfileVisibility[]).map((v) => ({
  value: v,
  label: VISIBILITY_LABEL[v],
}));

const DISPLAY_MODES = Object.keys(DISPLAY_MODE_LABEL) as DisplayMode[];

export function CommunityProfileSettings({ desktopColumns = false, avatarTarget, avatarFeedbackInSidebar = false }: {
  desktopColumns?: boolean;
  avatarTarget?: HTMLElement | null;
  avatarFeedbackInSidebar?: boolean;
}) {
  const { confirm } = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aliasId = useId();
  const bioId = useId();
  const visibilityId = useId();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<CommunitySettings | null>(null);

  const [form, setForm] = useState<EditableSettings>({
    display_mode: 'full',
    alias: '',
    bio: '',
    show_avatar: true,
    show_school: false,
    show_city: true,
    show_branch: true,
    allow_follow: true,
    show_follow_counts: true,
    public_preview: true,
    notify_follow_posts: true,
    visibility: 'teachers',
  });

  const [serverPreview, setServerPreview] = useState<{
    mode: DisplayMode;
    alias: string;
    name: string;
  } | null>(null);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await getMySettings();
    setLoading(false);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    const st = res.data;
    setData(st);
    setForm({
      display_mode: st.display_mode,
      alias: st.alias || '',
      bio: st.bio || '',
      show_avatar: st.show_avatar,
      show_school: st.show_school,
      show_city: st.show_city,
      show_branch: st.show_branch,
      allow_follow: st.allow_follow,
      show_follow_counts: st.show_follow_counts,
      public_preview: st.public_preview,
      notify_follow_posts: st.notify_follow_posts,
      visibility: st.visibility,
    });
    setServerPreview({
      mode: st.display_mode,
      alias: (st.alias || '').trim(),
      name: st.preview_name,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice(null);
    setAvatarBusy(true);
    const res = await uploadAvatar(file);
    setAvatarBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setData((prev) => (prev ? { ...prev, avatar_path: res.data } : prev));
    setNotice({ kind: 'ok', text: 'Profil resminiz güncellendi.' });
  };

  const handleAvatarRemove = async () => {
    if (!data?.avatar_path) return;
    const ok = await confirm({
      title: 'Profil resmini kaldır',
      message: 'Topluluk profil resminizi kaldırmak istediğinize emin misiniz?',
      confirmText: 'Resmi kaldır',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setNotice(null);
    setAvatarBusy(true);
    const res = await removeAvatar();
    setAvatarBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    setData((prev) => (prev ? { ...prev, avatar_path: null } : prev));
    setNotice({ kind: 'ok', text: 'Profil resminiz kaldırıldı.' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const cleanAlias = (form.alias || '').trim();
    const cleanBio = (form.bio || '').trim();
    if (form.display_mode === 'alias') {
      if (cleanAlias.length < 2 || cleanAlias.length > 40) {
        setNotice({ kind: 'error', text: 'Takma ad 2 ile 40 karakter arasında olmalıdır.' });
        return;
      }
    }
    if (cleanBio.length > 200) {
      setNotice({ kind: 'error', text: 'Tanıtım yazısı en fazla 200 karakter olabilir.' });
      return;
    }
    setSaving(true);
    const res = await saveMySettings({
      ...form,
      alias: cleanAlias || null,
      bio: cleanBio || null,
    });
    if (!res.ok) {
      setSaving(false);
      setNotice({ kind: 'error', text: res.error });
      return;
    }
    const fresh = await getMySettings();
    setSaving(false);
    if (fresh.ok) {
      setData(fresh.data);
      setServerPreview({
        mode: fresh.data.display_mode,
        alias: (fresh.data.alias || '').trim(),
        name: fresh.data.preview_name,
      });
    }
    setNotice({ kind: 'ok', text: 'Topluluk profili ayarlarınız kaydedildi.' });
  };

  if (loading) {
    return <>{avatarTarget && createPortal(<Spinner center label="Profil yükleniyor…" />, avatarTarget)}<Spinner center label="Topluluk profili ayarları yükleniyor…" /></>;
  }

  if (loadError || !data) {
    const errorContent = (
      <div className={s.settingsWrap}>
        <Notice notice={{ kind: 'error', text: loadError || 'Ayarlar yüklenemedi.' }} />
        <div>
          <button type="button" className={s.btnSecondary} onClick={load}>
            Yeniden dene
          </button>
        </div>
      </div>
    );
    return avatarTarget ? createPortal(errorContent, avatarTarget) : errorContent;
  }

  const aliasText = form.alias || '';
  const bioText = form.bio || '';

  const livePreviewName =
    serverPreview &&
    serverPreview.mode === form.display_mode &&
    serverPreview.alias === aliasText.trim()
      ? serverPreview.name
      : computePreviewName(data.full_name, form.display_mode, aliasText);

  const toggleItems: {
    key: keyof Pick<
      EditableSettings,
      | 'show_avatar'
      | 'show_school'
      | 'show_city'
      | 'show_branch'
      | 'allow_follow'
      | 'show_follow_counts'
      | 'public_preview'
      | 'notify_follow_posts'
    >;
    label: string;
    currentValue?: string | null;
  }[] = [
    { key: 'show_avatar', label: 'Profil resmim görünsün' },
    { key: 'show_school', label: 'Okulum görünsün', currentValue: data.school },
    { key: 'show_city', label: 'İlim görünsün', currentValue: data.city },
    { key: 'show_branch', label: 'Branşım görünsün', currentValue: data.branch },
    { key: 'allow_follow', label: 'Beni takip edebilsinler' },
    { key: 'show_follow_counts', label: 'Takipçi sayılarım görünsün' },
    {
      key: 'public_preview',
      label: 'Yeni paylaşımlarımda "Herkese açık önizleme" seçili gelsin',
    },
    { key: 'notify_follow_posts', label: 'Takip ettiklerim paylaşınca bildirim al' },
  ];

  const avatarControls = (
      <div className={`${s.avatarRow} ${avatarTarget ? s.avatarSidebar : ''}`}>
        <TeacherAvatar
          card={{
            name: livePreviewName,
            avatar_path: form.show_avatar ? data.avatar_path : null,
          }}
          size={96}
        />
        <div className={s.avatarActions}>
          <p className={s.groupTitle}>Profil resmi</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={s.hiddenFileInput}
            onChange={handleAvatarUpload}
            disabled={avatarBusy}
          />
          <div className={s.avatarButtons}>
            <button
              type="button"
              className={s.btnSecondary}
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} aria-hidden="true" />
              <span>Resim yükle</span>
            </button>
            {data.avatar_path && (
              <button
                type="button"
                className={s.btnDanger}
                disabled={avatarBusy}
                onClick={handleAvatarRemove}
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>Resmi kaldır</span>
              </button>
            )}
            {avatarBusy && <Spinner size="sm" label="İşleniyor…" />}
          </div>
          <span className={s.privacyNote}>JPG, PNG veya WebP · Otomatik 256×256 kare</span>
        </div>
      </div>
  );

  return (
    <form className={`${s.settingsWrap} ${desktopColumns ? s.profileSettingsWide : ''}`} onSubmit={handleSave}>
      {data.suspended_until && (
        <div role="alert" className={s.suspendBanner}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>Topluluk hesabınız {formatDate(data.suspended_until)} tarihine kadar durduruldu.</span>
        </div>
      )}
      {avatarTarget ? createPortal(<>{avatarControls}{avatarFeedbackInSidebar && <Notice notice={notice} onClose={() => setNotice(null)} />}</>, avatarTarget) : avatarControls}

      {/* Görünen ad */}
      <div className={`${s.sectionGroup} ${s.settingsName}`}>
        <p className={s.groupTitle}>Görünen ad</p>
        <div className={s.radioList} role="radiogroup" aria-label="Görünen ad biçimi">
          {DISPLAY_MODES.map((m) => {
            const checked = form.display_mode === m;
            return (
              <label
                key={m}
                className={`${s.radioOption} ${checked ? s.radioOptionChecked : ''}`}
              >
                <input
                  type="radio"
                  name="community_display_mode"
                  value={m}
                  checked={checked}
                  onChange={() => setForm((f) => ({ ...f, display_mode: m }))}
                />
                <span>{DISPLAY_MODE_LABEL[m]}</span>
              </label>
            );
          })}
        </div>

        {form.display_mode === 'alias' && (
          <div className={s.field}>
            <label htmlFor={aliasId}>Takma ad (2–40 karakter)</label>
            <input
              id={aliasId}
              type="text"
              className={s.textInput}
              minLength={2}
              maxLength={40}
              value={aliasText}
              onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              placeholder="Örn. Matematikçi Öğretmen"
              required
            />
          </div>
        )}

        <p className={s.previewBox}>
          Diğer öğretmenler seni şöyle görecek: <strong>{livePreviewName}</strong>
        </p>
      </div>

      {/* Tanıtım (bio) */}
      <div className={`${s.sectionGroup} ${s.settingsBio}`}>
        <div className={s.field}>
          <label htmlFor={bioId}>Tanıtım (en fazla 200 karakter)</label>
          <textarea
            id={bioId}
            className={s.textarea}
            maxLength={200}
            value={bioText}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 200) }))}
            placeholder="Kısaca ilgi alanlarınız, hazırladığınız içerikler…"
          />
          <span className={s.charCount}>{bioText.length} / 200</span>
        </div>
      </div>

      {/* Görünürlük anahtarları */}
      <div className={`${s.sectionGroup} ${s.settingsPreferences}`}>
        <p className={s.groupTitle}>Paylaşılan bilgiler ve tercihler</p>
        <div className={s.toggleList}>
          {toggleItems.map((item) => {
            const valText =
              item.currentValue !== undefined
                ? ` — ${item.currentValue || 'Belirtilmemiş'}`
                : '';
            return (
              <label key={item.key} className={s.toggleItem}>
                <span className={s.toggleText}>
                  <span>
                    {item.label}
                    {valText && <span className={s.toggleValue}>{valText}</span>}
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={form[item.key]}
                  className={s.toggleInput}
                  checked={form[item.key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [item.key]: e.target.checked }))
                  }
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Profilimi kimler görsün */}
      <div className={`${s.sectionGroup} ${s.settingsVisibility}`}>
        <div className={s.field}>
          <label htmlFor={visibilityId}>Profilimi kimler görsün</label>
          <CustomSelect
            id={visibilityId}
            value={form.visibility}
            options={VISIBILITY_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, visibility: v as ProfileVisibility }))}
          />
        </div>
      </div>

      <p className={s.privacyNote}>
        Yönetici her zaman bütün bilgilerini görür. Kapattığın bilgiler diğer öğretmenlere ve
        ziyaretçilere gönderilmez.
      </p>

      {(!avatarTarget || !avatarFeedbackInSidebar) && <Notice notice={notice} onClose={() => setNotice(null)} />}

      <div className={s.settingsSaveRow}>
        <button type="submit" className={s.btnPrimary} disabled={saving}>
          <Save size={16} aria-hidden="true" />
          <span>{saving ? 'Kaydediliyor…' : 'Kaydet'}</span>
        </button>
      </div>
    </form>
  );
}
