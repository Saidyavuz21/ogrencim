'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Eye, EyeOff, LogOut, AlertCircle, CheckCircle2, Info, Edit, X, Save, MailCheck, User, Globe, ShieldCheck } from '../icons';
import { UserAccount, TEACHER_BRANCH_OPTIONS } from '../../data/portalData';
import { changeMyPassword, updateMyProfile, changeMyEmail } from '../../lib/supabaseClient';
import { CustomSelect } from '../CustomSelect';
import { CollapsiblePanel } from './TeacherUi';
import { CommunityProfileSettings } from '../community/CommunityProfileSettings';
import styles from './TeacherDashboard.module.css';
import profileStyles from './TeacherProfile.module.css';

interface TeacherProfilePageProps {
  user?: UserAccount;
  onLogout?: () => void;
  onUserUpdated?: (updated: UserAccount) => void;
}

const subscribeDesktop = (onChange: () => void) => {
  const media = window.matchMedia('(min-width: 1024px)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

export function TeacherProfilePage({ user, onLogout, onUserUpdated }: TeacherProfilePageProps) {
  // Şifre değiştirme state
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Profil düzenleme state (Ad Soyad & Branş)
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // E-posta değiştirme state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [profileSection, setProfileSection] = useState<'account' | 'community' | 'security'>('account');
  const [avatarTarget, setAvatarTarget] = useState<HTMLDivElement | null>(null);
  const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktop, () => false);

  // Görüntülenen satırlar
  const rows: { label: string; value?: string; editable?: boolean }[] = [
    { label: 'Ad soyad', value: user?.name, editable: true },
    { label: 'E-posta', value: user?.emailOrPhone, editable: true },
    { label: 'Branş', value: user?.branch, editable: true },
    { label: 'Okul', value: user?.schoolName },
    { label: 'İl / ilçe', value: [user?.city, user?.district].filter(Boolean).join(' / ') },
    { label: 'Rehberlik sınıfı', value: user?.className && user.className !== 'Yok' ? user.className : '' },
  ];

  // Ad & Branş kaydetme
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setProfileNotice({ kind: 'error', text: 'Ad soyad en az 2 karakter olmalıdır.' });
      return;
    }
    if (!branch) {
      setProfileNotice({ kind: 'error', text: 'Lütfen bir branş seçin.' });
      return;
    }

    setSavingProfile(true);
    const res = await updateMyProfile(trimmedName, branch);
    setSavingProfile(false);

    if (!res.ok) {
      setProfileNotice({ kind: 'error', text: res.error || 'Profil güncellenemedi.' });
      return;
    }

    setProfileNotice({ kind: 'ok', text: 'Profil bilgileriniz başarıyla güncellendi.' });
    setIsEditing(false);
    if (user && onUserUpdated) {
      onUserUpdated({
        ...user,
        name: trimmedName,
        branch,
        title: `${branch} Öğretmeni (${user.schoolName || ''})`,
      });
    }
  };

  // E-posta değiştirme (Supabase Auth doğrulama e-postası akışı)
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotice(null);
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setEmailNotice({ kind: 'error', text: 'Geçerli bir e-posta adresi giriniz.' });
      return;
    }
    if (trimmedEmail === user?.emailOrPhone?.toLowerCase()) {
      setEmailNotice({ kind: 'error', text: 'Yeni e-posta adresi mevcut adresinizle aynı olamaz.' });
      return;
    }

    setSavingEmail(true);
    const res = await changeMyEmail(trimmedEmail);
    setSavingEmail(false);

    if (!res.ok) {
      setEmailNotice({ kind: 'error', text: res.error || 'E-posta güncelleme talebi iletilemedi.' });
      return;
    }

    setEmailNotice({
      kind: 'ok',
      text: `${trimmedEmail} adresine bir onay e-postası gönderildi. Yeni e-postanız onaylandıktan sonra aktif olacaktır.`,
    });
    setNewEmail('');
    setIsEditingEmail(false);
  };

  // Şifre değiştirme
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    if (password.length < 8) {
      setPasswordNotice({ kind: 'error', text: 'Yeni şifre en az 8 karakter olmalıdır.' });
      return;
    }
    if (password !== passwordAgain) {
      setPasswordNotice({ kind: 'error', text: 'Şifreler birbiriyle uyuşmuyor.' });
      return;
    }
    setSavingPassword(true);
    const res = await changeMyPassword(password);
    setSavingPassword(false);
    if (!res.ok) {
      setPasswordNotice({ kind: 'error', text: `Şifre değiştirilemedi: ${res.error}` });
      return;
    }
    setPassword('');
    setPasswordAgain('');
    setPasswordNotice({ kind: 'ok', text: 'Şifreniz değiştirildi.' });
  };

  return (
    <div className={`${styles.pageBody} ${styles.profileWorkspace} ${profileStyles.profile}`} data-section={profileSection}>
      <aside className={profileStyles.profileSidebar} aria-label="Profil ve ayar bölümleri">
      <div ref={setAvatarTarget} className={profileStyles.avatarSlot} />
      <div className={profileStyles.sidebarIdentity}><strong>{user?.name || 'Hesabım'}</strong><span>{user?.branch || user?.title || ''}</span></div>
      <nav className={profileStyles.sectionNav} aria-label="Profil bölümleri">
        {([{ id: 'account', label: 'Hesap bilgileri', icon: User }, { id: 'community', label: 'Topluluk profili', icon: Globe }, { id: 'security', label: 'Güvenlik', icon: ShieldCheck }] as const).map((section) => (
          <button key={section.id} type="button" aria-pressed={profileSection === section.id} onClick={() => setProfileSection(section.id)}><section.icon size={19} aria-hidden="true" />{section.label}</button>
        ))}
      </nav>
      </aside>
      <div className={profileStyles.content}>
      <div className={`${styles.pointsLayout} ${profileStyles.layout}`}>
        <section className={`${styles.panel} ${profileStyles.account}`} aria-labelledby="profile-info-title">
          <div className={`${styles.profileIdentityBar} ${profileStyles.identity}`}>
            <h2 className={`${styles.panelTitle} ${profileStyles.desktopOnly}`}>Hesap bilgileri</h2>
            <div className={`${styles.profileHead} ${profileStyles.mobileIdentity}`}>
              <span className={styles.accountAvatar} aria-hidden="true">{user?.avatar || 'Ö'}</span>
              <div>
                <h2 id="profile-info-title" className={styles.panelTitle}>{user?.name || 'Öğretmen'}</h2>
                <p className={styles.mutedText}>{user?.title || 'Öğretmen'}</p>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setName(user?.name || '');
                  setBranch(user?.branch || '');
                  setProfileNotice(null);
                  setIsEditing(true);
                }}
              >
                <Edit size={16} aria-hidden="true" />
                <span>Bilgileri Düzenle</span>
              </button>
            )}
          </div>

          {profileNotice && (
            <div
              role={profileNotice.kind === 'error' ? 'alert' : 'status'}
              className={profileNotice.kind === 'error' ? styles.noticeError : styles.noticeOk}
            >
              {profileNotice.kind === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
              <span>{profileNotice.text}</span>
            </div>
          )}

          {emailNotice && (
            <div
              role={emailNotice.kind === 'error' ? 'alert' : 'status'}
              className={emailNotice.kind === 'error' ? styles.noticeError : styles.noticeOk}
            >
              {emailNotice.kind === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <MailCheck size={18} aria-hidden="true" />}
              <span>{emailNotice.text}</span>
            </div>
          )}

          {isEditing ? (
            /* DÜZENLEME FORMU: Sadece Ad Soyad ve Branş değiştirilebilir */
            <form onSubmit={handleSaveProfile} className={`${styles.profileEditFields} ${profileStyles.editForm}`}>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 leading-relaxed">
                Ad soyad ve branş bilginizi buradan güncelleyebilirsiniz. Okul, il/ilçe ve sınıf bilgileriniz okul yetkinizle ilişkili olduğu için yalnızca okul yönetimi tarafından değiştirilebilir.
              </div>

              <div className={styles.field}>
                <label htmlFor="teacher-profile-name">Ad Soyad</label>
                <input
                  id="teacher-profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="teacher-profile-branch">Branş</label>
                <CustomSelect
                  id="teacher-profile-branch"
                  value={branch}
                  onChange={(val) => setBranch(val)}
                  options={TEACHER_BRANCH_OPTIONS.map((b) => ({ value: b, label: b }))}
                  placeholder="Branş seçin"
                />
              </div>

              <div className={styles.profileFormActions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setIsEditing(false)}
                  disabled={savingProfile}
                >
                  <X size={16} aria-hidden="true" />
                  <span>Vazgeç</span>
                </button>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={savingProfile}
                >
                  <Save size={16} aria-hidden="true" />
                  <span>{savingProfile ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* MEVCUT GÖRÜNTÜLEME ALANI */
            <>
              <dl className={`${styles.infoList} ${profileStyles.details}`}>
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt className="flex items-center gap-2">
                      <span>{row.label}</span>
                      {row.label === 'E-posta' && !isEditingEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewEmail('');
                            setEmailNotice(null);
                            setIsEditingEmail(true);
                          }}
                          className="text-xs text-emerald-700 hover:underline font-normal inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit size={12} />
                          Değiştir
                        </button>
                      )}
                    </dt>
                    <dd>{row.value || '—'}</dd>
                  </div>
                ))}
              </dl>

              {/* E-posta Değiştirme Formu (Açılır kutu) */}
              {isEditingEmail && (
                <form onSubmit={handleSaveEmail} className={styles.profileEmailForm}>
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-slate-800">E-posta Adresini Güncelle</strong>
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(false)}
                      aria-label="E-posta düzenlemeyi kapat"
                      className="text-slate-400 hover:text-slate-600 p-1 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Yeni e-posta adresinizi girin. Güvenliğiniz için yeni adrese bir onay bağlantısı gönderilecek, bağlantı tıklandığında e-posta adresiniz güncellenecektir.
                  </p>
                  <div className={styles.field}>
                    <input
                      aria-label="Yeni e-posta adresi"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="yeni@ornek.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className={styles.profileFormActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setIsEditingEmail(false)}
                      disabled={savingEmail}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className={styles.primary}
                      disabled={savingEmail}
                    >
                      {savingEmail ? 'Gönderiliyor…' : 'Onay E-postası Gönder'}
                    </button>
                  </div>
                </form>
              )}

              <p className={styles.hintText}>
                <Info size={16} aria-hidden="true" />
                <span>
                  Ad ve branş bilgilerinizi kendiniz güncelleyebilirsiniz. Okul, il/ilçe ve sınıf bilgileriniz okul yönetimi tarafından güncellenir.
                </span>
              </p>
            </>
          )}
        </section>

        <aside className={`${styles.pointsAside} ${profileStyles.security}`}>
          <CollapsiblePanel title="Şifre değiştir" summary="Giriş şifrenizi güncelleyin">
            <h2 id="profile-password-title" className={styles.panelTitle}>Şifre değiştir</h2>
            {passwordNotice && (
              <div
                role={passwordNotice.kind === 'error' ? 'alert' : 'status'}
                className={passwordNotice.kind === 'error' ? styles.noticeError : styles.noticeOk}
              >
                {passwordNotice.kind === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
                <span>{passwordNotice.text}</span>
              </div>
            )}
            <form className={styles.formGrid} onSubmit={handlePassword}>
              <div className={styles.field}>
                <label htmlFor="profile-new-password">Yeni şifre</label>
                <div className={styles.inlineRow}>
                  <input
                    id="profile-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="En az 8 karakter"
                  />
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <label className={styles.field}>Yeni şifre (tekrar)
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primary} disabled={savingPassword}>
                  {savingPassword ? 'Kaydediliyor…' : 'Şifreyi değiştir'}
                </button>
              </div>
            </form>
          </CollapsiblePanel>

          {onLogout && (
            <section className={`${styles.panel} ${profileStyles.logoutPanel}`}>
              <h2 className={`${styles.panelTitle} ${profileStyles.desktopOnly}`}>Oturum</h2>
              <p className={`${styles.mutedText} ${profileStyles.desktopOnly}`}>Ortak bir cihaz kullanıyorsanız işiniz bittiğinde hesabınızdan çıkış yapın.</p>
              <button type="button" className={styles.dangerButton} onClick={onLogout}>
                <LogOut size={18} aria-hidden="true" />Çıkış yap
              </button>
            </section>
          )}
        </aside>
      </div>

      <section className={`${styles.panel} ${profileStyles.community}`} aria-labelledby="profile-community-title">
        <h2 id="profile-community-title" className={styles.panelTitle}>Topluluk profilim</h2>
        <CommunityProfileSettings desktopColumns avatarTarget={isDesktop ? avatarTarget : null} avatarFeedbackInSidebar={profileSection !== 'community'} />
      </section>
      </div>
    </div>
  );
}
