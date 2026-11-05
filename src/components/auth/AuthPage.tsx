'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Check, ArrowRight, Eye, EyeOff, AlertCircle, BookOpen } from '../icons';
import styles from './AuthPage.module.css';
import { BrandLogo } from '../BrandLogo';
import { UserAccount, TURKEY_CITIES, TEACHER_BRANCH_OPTIONS, composeClassName } from '../../data/portalData';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { SchoolPicker, NEW_SCHOOL } from '../SchoolPicker';
import { CustomSelect } from '../CustomSelect';
import { StudentSchoolSelect, loadRememberedSchool, rememberSchool } from '../StudentSchoolSelect';
import { signInStaff, signInStudent, signUpTeacher, SchoolRecord } from '../../lib/supabaseClient';

type Audience = 'ogrenci' | 'ogretmen';
type TeacherMode = 'login' | 'register';

interface AuthPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  /**
   * public: ana giriş sayfası (Öğrenci / Öğretmen sekmeleri)
   * admin : /yonetim sayfası (yalnızca süper admin girişi)
   */
  variant?: 'public' | 'admin';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, variant = 'public' }) => {
  const isAdminPage = variant === 'admin';

  const [audience, setAudience] = useState<Audience>('ogrenci');
  const [teacherMode, setTeacherMode] = useState<TeacherMode>('login');
  useEffect(() => {
    if (variant !== 'public') return;
    const openRegistration = () => {
      if (window.location.hash === '#kayit') {
        setAudience('ogretmen');
        setTeacherMode('register');
      }
    };
    openRegistration();
    window.addEventListener('hashchange', openRegistration);
    return () => window.removeEventListener('hashchange', openRegistration);
  }, [variant]);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errorMsg || successMsg) feedbackRef.current?.focus();
  }, [errorMsg, successMsg]);

  // Öğrenci (okul bu cihazda hatırlanır)
  const [studentSchool, setStudentSchool] = useState<SchoolRecord | null>(() =>
    typeof window === 'undefined' ? null : loadRememberedSchool()
  );
  const [studentNo, setStudentNo] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);

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
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regStep, setRegStep] = useState<'hesap' | 'okul'>('hesap');

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const switchAudience = (next: Audience) => {
    setAudience(next);
    setShowPassword(false);
    clearFeedback();
  };

  const switchTeacherMode = (next: TeacherMode) => {
    setTeacherMode(next);
    setShowPassword(false);
    clearFeedback();
  };

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

  // ---------------- PIN kutucukları ----------------
  const handlePinDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...pinDigits];
    next[idx] = digit;
    setPinDigits(next);
    if (digit && idx < 3) document.getElementById(`student-pin-${idx + 1}`)?.focus();
  };

  const handlePinDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      document.getElementById(`student-pin-${idx - 1}`)?.focus();
    }
  };

  const handlePinPaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!digits) return;
    e.preventDefault();
    const next = [...pinDigits];
    digits.slice(0, 4 - idx).split('').forEach((value, offset) => {
      next[idx + offset] = value;
    });
    setPinDigits(next);
    document.getElementById(`student-pin-${Math.min(idx + digits.length, 3)}`)?.focus();
  };

  // ---------------- Gönderimler (tüm doğrulama sunucuda) ----------------
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearFeedback();

    const enteredNo = studentNo.trim();
    const enteredPin = pinDigits.join('');
    if (!studentSchool) return setErrorMsg('Lütfen önce okulunuzu seçiniz.');
    if (!enteredNo) return setErrorMsg('Lütfen okul numaranızı giriniz.');
    if (enteredPin.length !== 4) return setErrorMsg('Lütfen 4 haneli PIN kodunuzu eksiksiz giriniz.');

    setIsSubmitting(true);
    const res = await signInStudent(studentSchool.id, enteredNo, enteredPin);
    setIsSubmitting(false);

    if (res.ok) {
      rememberSchool(studentSchool);
      setSuccessMsg('PIN doğrulandı. Portal açılıyor…');
      setTimeout(() => onLoginSuccess(res.user), 400);
    } else {
      setPinDigits(['', '', '', '']);
      setErrorMsg(res.error);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearFeedback();

    if (!identifier.trim()) return setErrorMsg('Lütfen e-posta adresinizi giriniz.');
    if (!password) return setErrorMsg('Lütfen şifrenizi giriniz.');

    setIsSubmitting(true);
    const res = await signInStaff(identifier, password, isAdminPage ? 'admin' : 'ogretmen');
    setIsSubmitting(false);

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
    });
    setIsSubmitting(false);

    if (!res.ok) return setErrorMsg(res.error || 'Kayıt yapılamadı.');

    setRegPassword('');
    setRegPasswordConfirm('');
    setIdentifier(regEmail.trim());
    setRegStep('hesap');
    setTeacherMode('login');
    setShowPassword(false);
    setSuccessMsg('Kaydınız alındı. Okul yönetimi hesabınızı onayladıktan sonra buradan giriş yapabilirsiniz.');
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
            <BrandLogo height={44} priority />
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

  // ================= ANA GİRİŞ SAYFASI =================
  const isRegister = audience === 'ogretmen' && teacherMode === 'register';

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.brand}>
          <BrandLogo height={48} priority />
          <span className={styles.brandTagline}>Öğrenci Bilgi Portalı</span>
        </header>

        <div className={styles.intro}>
          <h1>{isRegister ? 'Öğretmen hesabınızı oluşturun.' : 'Yeniden merhaba.'}</h1>
          <p>{isRegister
            ? 'Hesabınız okul yönetiminin onayından sonra açılır.'
            : 'Ödevler, gelişim ve okuldan haberler. Hepsi bir arada.'}</p>
        </div>

        <section className={styles.panel} aria-label="Hesap işlemleri">
          {/* 1. Seviye: Kim giriş yapıyor? */}
          <div className={styles.modeSwitch} role="tablist" aria-label="Kullanıcı türü">
            {([
              ['ogrenci', 'Öğrenci', GraduationCap],
              ['ogretmen', 'Öğretmen', BookOpen],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={audience === id}
                aria-controls={`panel-${id}`}
                disabled={isSubmitting}
                onClick={() => switchAudience(id)}
              >
                <span className={styles.tabLabel}><Icon size={18} aria-hidden="true" />{label}</span>
              </button>
            ))}
          </div>

          {/* ---------- ÖĞRENCİ & VELİ ---------- */}
          {audience === 'ogrenci' && (
            <div id="panel-ogrenci" role="tabpanel" aria-labelledby="tab-ogrenci">
              {feedback}
              <form className={styles.form} onSubmit={handleStudentLogin} aria-busy={isSubmitting}>
                <fieldset disabled={isSubmitting}>
                  <StudentSchoolSelect value={studentSchool} onChange={setStudentSchool} disabled={isSubmitting} />
                  <AuthField label="Öğrenci okul numarası" id="student-number">
                    <input id="student-number" name="studentNumber" type="text" inputMode="numeric" autoComplete="username" placeholder="Örn. 1024" value={studentNo} onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ''))} />
                  </AuthField>
                  <div className={styles.pinGroup} role="group" aria-labelledby="pin-label" aria-describedby="pin-help">
                    <span id="pin-label" className={styles.fieldLabel}>4 haneli PIN kodu</span>
                    <div className={styles.pinInputs}>
                      {pinDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`student-pin-${idx}`}
                          aria-label={`PIN ${idx + 1}. hane`}
                          name={`pin-${idx}`}
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinDigitKeyDown(idx, e)}
                          onPaste={(e) => handlePinPaste(idx, e)}
                        />
                      ))}
                    </div>
                    <p id="pin-help" className={styles.hint}>Okul numaranızı ve PIN kodunuzu öğretmeninizden alabilirsiniz.</p>
                  </div>
                </fieldset>
                <button className={styles.submit} type="submit" disabled={isSubmitting}>
                  <span>{isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}</span>
                  {!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}
                </button>
                <div className={styles.notice}>
                  <GraduationCap size={20} aria-hidden="true" />
                  <p>Öğrenci hesaplarını okul oluşturur; kayıt olmanıza gerek yoktur. PIN kodunuzu bilmiyorsanız sınıf öğretmeninize başvurun.</p>
                </div>
              </form>
            </div>
          )}

          {/* ---------- ÖĞRETMEN ---------- */}
          {audience === 'ogretmen' && (
            <div id="panel-ogretmen" role="tabpanel" aria-labelledby="tab-ogretmen">
              {/* 2. Seviye: Giriş / Kayıt */}
              <div className={styles.subSwitch} role="tablist" aria-label="Giriş veya kayıt">
                {([
                  ['login', 'Giriş yap'],
                  ['register', 'Kayıt ol'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={teacherMode === id}
                    disabled={isSubmitting}
                    onClick={() => switchTeacherMode(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

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
                  </fieldset>
                  )}

                  {regStep === 'hesap' ? (
                    <button className={styles.submit} type="submit" disabled={isSubmitting}>
                      <span>Devam et</span>
                      <ArrowRight size={20} aria-hidden="true" />
                    </button>
                  ) : (
                    <div className={styles.stepActions}>
                      <button className={styles.secondary} type="button" disabled={isSubmitting} onClick={() => goToRegStep('hesap')}>
                        Geri
                      </button>
                      <button className={styles.submit} type="submit" disabled={isSubmitting}>
                        <span>{isSubmitting ? 'Hesap oluşturuluyor…' : 'Hesabı oluştur'}</span>
                        {!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
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
