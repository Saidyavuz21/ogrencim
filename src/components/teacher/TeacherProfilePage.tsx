'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, LogOut, AlertCircle, CheckCircle2, Info } from '../icons';
import { UserAccount } from '../../data/portalData';
import { changeMyPassword } from '../../lib/supabaseClient';
import { CollapsiblePanel } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

interface TeacherProfilePageProps {
  user?: UserAccount;
  onLogout?: () => void;
}

export function TeacherProfilePage({ user, onLogout }: TeacherProfilePageProps) {
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const rows: { label: string; value?: string }[] = [
    { label: 'Ad soyad', value: user?.name },
    { label: 'E-posta', value: user?.emailOrPhone },
    { label: 'Branş', value: user?.branch },
    { label: 'Okul', value: user?.schoolName },
    { label: 'İl / ilçe', value: [user?.city, user?.district].filter(Boolean).join(' / ') },
    { label: 'Rehberlik sınıfı', value: user?.className && user.className !== 'Yok' ? user.className : '' },
  ];

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (password.length < 8) {
      setNotice({ kind: 'error', text: 'Yeni şifre en az 8 karakter olmalıdır.' });
      return;
    }
    if (password !== passwordAgain) {
      setNotice({ kind: 'error', text: 'Şifreler birbiriyle uyuşmuyor.' });
      return;
    }
    setSaving(true);
    const res = await changeMyPassword(password);
    setSaving(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Şifre değiştirilemedi: ${res.error}` });
      return;
    }
    setPassword('');
    setPasswordAgain('');
    setNotice({ kind: 'ok', text: 'Şifreniz değiştirildi.' });
  };

  return (
    <div className={styles.pageBody}>
      <div className={styles.pointsLayout}>
      <section className={styles.panel} aria-labelledby="profile-info-title">
        <div className={styles.profileHead}>
          <span className={styles.accountAvatar} aria-hidden="true">{user?.avatar || 'Ö'}</span>
          <div>
            <h2 id="profile-info-title" className={styles.panelTitle}>{user?.name || 'Öğretmen'}</h2>
            <p className={styles.mutedText}>{user?.title || 'Öğretmen'}</p>
          </div>
        </div>
        <dl className={styles.infoList}>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value || '—'}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.hintText}>
          <Info size={16} aria-hidden="true" />
          <span>Ad, branş, okul ve sınıf bilgileriniz okul yönetimi tarafından güncellenir. Bir yanlışlık varsa okul yönetimine bildirin.</span>
        </p>
      </section>

      <aside className={styles.pointsAside}>
      <CollapsiblePanel title="Şifre değiştir" summary="Giriş şifrenizi güncelleyin">
        <h2 id="profile-password-title" className={styles.panelTitle}>Şifre değiştir</h2>
        {notice && (
          <div role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'error' ? styles.noticeError : styles.noticeOk}>
            {notice.kind === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
            <span>{notice.text}</span>
          </div>
        )}
        <form className={styles.formGrid} onSubmit={handlePassword}>
          <div className={styles.field}>
            <label htmlFor="profile-new-password">Yeni şifre</label>
            <div className={styles.inlineRow}>
              <input id="profile-new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="En az 8 karakter" />
              <button type="button" className={styles.secondary} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <label className={styles.field}>Yeni şifre (tekrar)
            <input type={showPassword ? 'text' : 'password'} value={passwordAgain} onChange={(e) => setPasswordAgain(e.target.value)} autoComplete="new-password" />
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primary} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Şifreyi değiştir'}</button>
          </div>
        </form>
      </CollapsiblePanel>

      {onLogout && (
        <section className={styles.panel}>
          <button type="button" className={styles.dangerButton} onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />Çıkış yap
          </button>
        </section>
      )}
      </aside>
      </div>
    </div>
  );
}
