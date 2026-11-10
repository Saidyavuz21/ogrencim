'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Eye, EyeOff, AlertCircle, FileText, Upload, X } from '../icons';
import styles from './AuthPage.module.css';
import { BrandLogo } from '../BrandLogo';
import { UserAccount, TURKEY_CITIES, TEACHER_BRANCH_OPTIONS, composeClassName } from '../../data/portalData';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { SchoolPicker, NEW_SCHOOL } from '../SchoolPicker';
import { CustomSelect } from '../CustomSelect';
import { signInStaff, signUpTeacher, teacherDocumentError } from '../../lib/supabaseClient';
import { useCaptcha, CAPTCHA_MISSING_MESSAGE } from './Captcha';

type TeacherMode = 'login' | 'register';

interface AuthPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  /**
   * public: öğretmen kaydı ve öğretmen girişi
   * admin : /yonetim sayfası (yalnızca süper admin girişi)
   */
  variant?: 'public' | 'admin';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, variant = 'public' }) => {
  const isAdminPage = variant === 'admin';

  // Önce giriş formu; "Kayıt olun" ya da /giris#kayit bağlantısı kayıt formunu açar
  const [teacherMode, setTeacherMode] = useState<TeacherMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackRef = useRef<HTMLDivElement>(null);
  const captcha = useCaptcha();
  useEffect(() => {
    if (errorMsg || successMsg) feedbackRef.current?.focus();
  }, [errorMsg, successMsg]);

  // Öğretmen & Admin girişi
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Öğretmen kaydı
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCity, setRegCity] = useState('Diyarbakır');
  const [regDistrict, setRegDistrict] = useState('Kayapınar');
  const [regSchoolId, setRegSchoolId] = useState(''); // onaylı okul id'si veya NEW_SCHOOL
  const [regNewSchool, setRegNewSchool] = useState(''); // "Okulum listede yok" ile yazılan ad
  const [regBranch, setRegBranch] = useState('Sınıf Öğretmenliği');
  const [regClassLevel, setRegClassLevel] = useState('');
  const [regClassSection, setRegClassSection] = useState('');
  const [regDocument, setRegDocument] = useState<File | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regStep, setRegStep] = useState<'hesap' | 'okul'>('hesap');

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const switchTeacherMode = (next: TeacherMode) => {
    setTeacherMode(next);
    setShowPassword(false);
    clearFeedback();
    // Adres çubuğu da kayıt/giriş durumunu göstersin (#kayit paylaşılabilir)
    const url = new URL(window.location.href);
    url.hash = next === 'register' ? 'kayit' : '';
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0 });
  };

  // "Ücretsiz kayıt ol" bağlantıları /giris#kayit adresine gelir
  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash === '#kayit') setTeacherMode('register');
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const resetSchool = () => {
    setRegSchoolId('');
    setRegNewSchool('');
  };

  const handleCityChange = (newCity: string) => {
    setRegCity(newCity);
    const districts = TURKEY_CITIES[newCity] || ['Merkez'];
    setRegDistrict(districts[0] || 'Merkez');
    resetSchool();
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearFeedback();

    if (!identifier.trim()) return setErrorMsg('Lütfen e-posta adresinizi giriniz.');
    if (!password) return setErrorMsg('Lütfen şifrenizi giriniz.');
    if (captcha.missing) return setErrorMsg(CAPTCHA_MISSING_MESSAGE);

    setIsSubmitting(true);
    const res = await signInStaff(identifier, password, isAdminPage ? 'admin' : 'ogretmen', captcha.token);
    setIsSubmitting(false);
    captcha.reset();

    if (!res.ok) return setErrorMsg(res.error);

    setPassword('');
    setSuccessMsg(isAdminPage ? 'Giriş başarılı. Yönetim paneli açılıyor…' : `Hoş geldiniz, ${res.user.name}.`);
    setTimeout(() => onLoginSuccess(res.user), 400);
  };

  /** 1. sekme (hesap bilgileri) geçerli mi? Değilse hata mesajını döner. */
  const accountStepError = (): string | null => {
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      return 'Lütfen ad soyad, e-posta ve şifre alanlarını eksiksiz doldurunuz.';
    }
    if (!regEmail.includes('@') || !regEmail.includes('.')) return 'Lütfen geçerli bir e-posta adresi giriniz.';
    if (regPassword.length < 8) return 'Şifreniz en az 8 karakter olmalıdır.';
    if (regPassword !== regPasswordConfirm) return 'Girdiğiniz şifreler birbiriyle uyuşmuyor.';
    return null;
  };

  const goToRegStep = (step: 'hesap' | 'okul') => {
    clearFeedback();
    if (step === 'okul') {
      const err = accountStepError();
      if (err) return setErrorMsg(err);
    }
    setRegStep(step);
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearFeedback();

    // 1. sekmedeyken Enter/Devam: 2. sekmeye geç
    if (regStep === 'hesap') return goToRegStep('okul');

    const accountErr = accountStepError();
    if (accountErr) {
      setRegStep('hesap');
      return setErrorMsg(accountErr);
    }
    if (!regSchoolId) return setErrorMsg('Lütfen okulunuzu listeden seçiniz ya da "Okulum listede yok" seçeneğini kullanınız.');
    if (regSchoolId === NEW_SCHOOL && regNewSchool.trim().length < 3) {
      return setErrorMsg('Lütfen okulunuzun tam adını yazınız.');
    }
    const docErr = teacherDocumentError(regDocument);
    if (docErr || !regDocument) return setErrorMsg(docErr || 'Lütfen belgenizi yükleyiniz.');
    if (captcha.missing) return setErrorMsg(CAPTCHA_MISSING_MESSAGE);

    setIsSubmitting(true);
    const res = await signUpTeacher({
      email: regEmail,
      password: regPassword,
      name: regName,
      branch: regBranch,
      city: regCity,
      district: regDistrict,
      schoolId: regSchoolId === NEW_SCHOOL ? undefined : regSchoolId,
      newSchoolName: regSchoolId === NEW_SCHOOL ? regNewSchool : undefined,
      className: composeClassName(regClassLevel, regClassSection),
      document: regDocument,
      captchaToken: captcha.token,
    });
    setIsSubmitting(false);
    captcha.reset();

    if (!res.ok) return setErrorMsg(res.error || 'Kayıt yapılamadı.');

    setRegPassword('');
    setRegPasswordConfirm('');
    setRegDocument(null);
    setIdentifier(regEmail.trim());
    setRegStep('hesap');
    setTeacherMode('login');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setShowPassword(false);
    if (res.docWarning) {
      setErrorMsg(res.docWarning);
    } else {
      setSuccessMsg('Kaydınız alındı. Okul yönetimi belgenizi inceleyip hesabınızı onayladıktan sonra buradan giriş yapabilirsiniz.');
    }
  };

  // ---------------- Görünüm parçaları ----------------
  const feedback = (
    <>
      {errorMsg && (
        <div ref={feedbackRef} tabIndex={-1} role="alert" className={`${styles.notice} ${styles.feedback} ${styles.error}`}>
          <AlertCircle size={20} aria-hidden="true" />
          <p>{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div ref={feedbackRef} tabIndex={-1} role="status" className={`${styles.notice} ${styles.feedback} ${styles.success}`}>
          <Check size={20} aria-hidden="true" />
          <p>{successMsg}</p>
        </div>
      )}
    </>
  );

  const passwordToggle = (label: string) => (
    <button type="button" aria-label={showPassword ? `${label} gizle` : `${label} göster`} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  const staffLoginForm = (
    <form className={styles.form} onSubmit={handleStaffLogin} aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting}>
        <AuthField label={isAdminPage ? 'Yönetici e-posta adresi' : 'E-posta adresi'} id="login-email">
          <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="adiniz@ornek.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </AuthField>
        <AuthField label="Şifre" id="login-password">
          <div className={styles.password}>
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Şifrenizi girin" value={password} onChange={(e) => setPassword(e.target.value)} />
            {passwordToggle('Şifreyi')}
          </div>
        </AuthField>
      </fieldset>
      {captcha.widget}
      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        <span>{isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}</span>
        {!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}
      </button>
    </form>
  );

  // ================= YÖNETİM (SÜPER ADMIN) SAYFASI =================
  if (isAdminPage) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.brand}>
            <Link href="/" className={styles.brandLink} aria-label="tofutr.com ana sayfasına git">
              <BrandLogo height={44} priority />
            </Link>
            <div><strong>Yönetim</strong><span>Yalnızca okul yönetimi içindir</span></div>
          </header>
          <div className={styles.intro}>
            <h1>Yönetim girişi</h1>
            <p>Öğretmen onayları, öğrenci hesapları ve okul ayarları.</p>
          </div>
          <section className={styles.panel} aria-label="Yönetici girişi">
            {feedback}
            {staffLoginForm}
          </section>
          <footer className={styles.footer}>
            <Link className={styles.textButton} href="/">Öğrenci veya öğretmen girişine dön</Link>
          </footer>
        </div>
      </main>
    );
  }

  // ================= ÖĞRETMEN KAYIT SAYFASI =================
  const isRegister = teacherMode === 'register';

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.brand}>
          <Link href="/" className={styles.brandLink} aria-label="tofutr.com ana sayfasına git">
            <BrandLogo height={48} priority />
          </Link>
          <span className={styles.brandTagline}>Öğrenci Bilgi Portalı</span>
        </header>

        <div className={styles.intro}>
          <h1>{isRegister ? 'Öğretmen hesabı oluştur' : 'Öğretmen girişi'}</h1>
          <p>{isRegister
            ? 'Hesabınız okul yönetiminin onayından sonra açılır.'
            : 'Ödevler, gelişim ve okuldan haberler. Hepsi bir arada.'}</p>
        </div>

        <section className={styles.panel} aria-label="Hesap işlemleri">
              {feedback}

              {teacherMode === 'login' ? (
                staffLoginForm
              ) : (
                <form className={styles.form} onSubmit={handleTeacherRegister} aria-busy={isSubmitting} noValidate>
                  {/* Kayıt adımları (sekmeli) */}
                  <div className={styles.stepTabs} role="tablist" aria-label="Kayıt adımları">
                    {([
                      ['hesap', '1', 'Hesap bilgileri'],
                      ['okul', '2', 'Okul bilgileri'],
                    ] as const).map(([id, num, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={regStep === id}
                        disabled={isSubmitting}
                        onClick={() => goToRegStep(id)}
                      >
                        <span className={styles.stepNum} aria-hidden="true">{num}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {regStep === 'hesap' && (
                  <fieldset disabled={isSubmitting}>
                    <AuthField id="register-name" label="Ad soyad">
                      <input id="register-name" name="name" autoComplete="name" required placeholder="Adınız ve soyadınız" value={regName} onChange={(e) => setRegName(e.target.value)} />
                    </AuthField>
                    <AuthField id="register-email" label="E-posta adresi" hint="Kişisel e-posta adresinizi de kullanabilirsiniz.">
                      <input id="register-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="adiniz@ornek.com" aria-describedby="register-email-hint" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                    </AuthField>
                    <AuthField id="register-password" label="Şifre" hint="En az 8 karakter kullanın.">
                      <div className={styles.password}>
                        <input id="register-password" name="newPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="Şifrenizi oluşturun" aria-describedby="register-password-hint" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                        {passwordToggle('Şifreleri')}
                      </div>
                    </AuthField>
                    <AuthField id="register-confirm" label="Şifre tekrarı">
                      <input id="register-confirm" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="Şifrenizi yeniden girin" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} />
                    </AuthField>
                  </fieldset>
                  )}

                  {regStep === 'okul' && (
                  <fieldset disabled={isSubmitting}>
                    <div className={styles.pair}>
                      <AuthField id="register-city" label="İl">
                        <CustomSelect
                          id="register-city"
                          value={regCity}
                          onChange={(val) => handleCityChange(val)}
                          options={Object.keys(TURKEY_CITIES).map((city) => ({ value: city, label: city }))}
                          placeholder="İl seçin"
                        />
                      </AuthField>
                      <AuthField id="register-district" label="İlçe">
                        <CustomSelect
                          id="register-district"
                          value={regDistrict}
                          onChange={(val) => { setRegDistrict(val); resetSchool(); }}
                          options={(TURKEY_CITIES[regCity] || ['Merkez']).map((d) => ({ value: d, label: d }))}
                          placeholder="İlçe seçin"
                        />
                      </AuthField>
                    </div>
                    <SchoolPicker
                      idPrefix="register"
                      city={regCity}
                      district={regDistrict}
                      schoolId={regSchoolId}
                      newSchoolName={regNewSchool}
                      onChange={({ schoolId, newSchoolName }) => {
                        setRegSchoolId(schoolId);
                        setRegNewSchool(newSchoolName);
                      }}
                      allowNew
                      disabled={isSubmitting}
                      renderField={({ id, label, control, hint }) => (
                        <AuthField id={id} label={label} hint={hint}>{control}</AuthField>
                      )}
                    />
                    <AuthField id="register-branch" label="Branş">
                      <CustomSelect
                        id="register-branch"
                        value={regBranch}
                        onChange={(val) => setRegBranch(val)}
                        options={TEACHER_BRANCH_OPTIONS.map((b) => ({ value: b, label: b }))}
                        placeholder="Branş seçin"
                      />
                    </AuthField>
                    <div className={styles.pair}>
                      <ClassLevelSelects
                        idPrefix="register-class"
                        level={regClassLevel}
                        section={regClassSection}
                        onChange={({ level, section }) => {
                          setRegClassLevel(level);
                          setRegClassSection(section);
                        }}
                        allowEmpty
                        emptyLabel="Sınıfım yok"
                        disabled={isSubmitting}
                        renderField={({ id, label, control }) => (
                          <AuthField id={id} label={label === 'Sınıf seviyesi' ? 'Sınıfınız (varsa)' : label}>{control}</AuthField>
                        )}
                      />
                    </div>
                    <p className={styles.hint}>Sınıf öğretmeniyseniz okuttuğunuz sınıfı, branş öğretmeniyseniz rehberliğini yaptığınız şubeyi seçin.</p>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel} id="register-doc-label">Öğretmenlik belgesi</span>
                      <input
                        ref={docInputRef}
                        id="register-doc"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        className={styles.fileInput}
                        aria-labelledby="register-doc-label"
                        aria-describedby="register-doc-hint"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          e.target.value = '';
                          if (!file) return;
                          const err = teacherDocumentError(file);
                          if (err) { setRegDocument(null); return setErrorMsg(err); }
                          clearFeedback();
                          setRegDocument(file);
                        }}
                      />
                      {regDocument ? (
                        <div className={styles.fileChosen}>
                          <FileText size={20} aria-hidden="true" />
                          <span className={styles.fileName}>
                            <strong>{regDocument.name}</strong>
                            <small>{(regDocument.size / 1024 / 1024).toFixed(2)} MB</small>
                          </span>
                          <button type="button" aria-label="Belgeyi kaldır" onClick={() => setRegDocument(null)}>
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="register-doc" className={styles.fileDrop}>
                          <Upload size={20} aria-hidden="true" />
                          <span>Belge seçin <small>PDF, JPG veya PNG · en fazla 5 MB</small></span>
                        </label>
                      )}
                      <p id="register-doc-hint" className={styles.hint}>
                        MEBBİS ekran görüntüsü, görev yeri belgesi veya öğretmenlik belgesi gibi öğretmen olduğunuzu gösteren bir belge. Yalnızca okul yönetimi görür.
                      </p>
                    </div>
                  </fieldset>
                  )}

                  {regStep === 'hesap' ? (
                    <button className={styles.submit} type="submit" disabled={isSubmitting}>
                      <span>Devam et</span>
                      <ArrowRight size={20} aria-hidden="true" />
                    </button>
                  ) : (
                    <>
                    {captcha.widget}
                    <div className={styles.stepActions}>
                      <button className={styles.secondary} type="button" disabled={isSubmitting} onClick={() => goToRegStep('hesap')}>
                        Geri
                      </button>
                      <button className={styles.submit} type="submit" disabled={isSubmitting}>
                        <span>{isSubmitting ? 'Hesap oluşturuluyor…' : 'Hesabı oluştur'}</span>
                        {!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}
                      </button>
                    </div>
                    </>
                  )}
                </form>
              )}
          <p className={styles.accountPrompt}>
            {isRegister ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}{' '}
            <button className={styles.textButton} type="button" disabled={isSubmitting} onClick={() => switchTeacherMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Giriş yap' : 'Kayıt olun'}
            </button>
          </p>
        </section>
        <footer className={styles.footer}>e-Okul Öğrenci Bilgi Portalı</footer>
      </div>
    </main>
  );
};

function AuthField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
    </div>
  );
}
