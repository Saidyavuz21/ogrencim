'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, ShieldCheck, Check, ArrowRight, Eye, EyeOff, AlertCircle, BookOpen } from '../icons';
import styles from './AuthPage.module.css';
import { UserRole, UserAccount, TURKEY_CITIES } from '../../data/portalData';
import { signInStaff, signInStudent, signUpTeacher } from '../../lib/supabaseClient';

interface AuthPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  initialRole = 'ogrenci',
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  // Sadece 3 rol: ogrenci (Öğrenci & Veli), ogretmen, admin
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    initialRole === 'veli' ? 'ogrenci' : initialRole
  );
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errorMsg || successMsg) feedbackRef.current?.focus();
  }, [errorMsg, successMsg]);

  // 1. Öğrenci & Veli Giriş Form Alanları
  const [studentNo, setStudentNo] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']); // 4 Haneli PIN

  // 2. Öğretmen & Admin Giriş Alanları
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // 3. Öğretmen Kayıt Form Alanları (Yeni İstenen Özellikler)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState(''); // Normal e-posta
  const [regCity, setRegCity] = useState('Diyarbakır');
  const [regDistrict, setRegDistrict] = useState('Kayapınar');
  const [regSchool, setRegSchool] = useState('Atatürk Ortaokulu');
  const [regBranch, setRegBranch] = useState('Türkçe');
  const [regClass, setRegClass] = useState('7-B');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Şehir değiştiğinde ilçeyi otomatik güncelle
  const handleCityChange = (newCity: string) => {
    setRegCity(newCity);
    const districts = TURKEY_CITIES[newCity] || ['Merkez'];
    setRegDistrict(districts[0] || 'Merkez');
  };

  // 3 Sade Rol Kartı (Giriş Yap sekmesi için)
  const roleCards = [
    {
      id: 'ogrenci' as UserRole,
      title: 'Öğrenci & Veli',
      icon: GraduationCap,
    },
    {
      id: 'ogretmen' as UserRole,
      title: 'Öğretmen',
      icon: BookOpen,
    },
    {
      id: 'admin' as UserRole,
      title: 'Süper Admin',
      icon: ShieldCheck,
    },
  ];


  // 4 Haneli PIN Kutucukları Mantığı
  const handlePinDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[idx] = digit;
    setPinDigits(newDigits);

    // Sonraki kutucuğa otomatik odaklan
    if (digit && idx < 3) {
      const nextInput = document.getElementById(`student-pin-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      const prevInput = document.getElementById(`student-pin-${idx - 1}`);
      prevInput?.focus();
    }
  };

  // ========================================================
  // GİRİŞ YAP İŞLEMİ (Öğrenci & Veli PIN, Öğretmen, Admin)
  // Tüm doğrulama sunucuda (Supabase Auth + veritabanı fonksiyonları) yapılır.
  // ========================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Öğrenci & Veli Girişi (Okul No + 4 Haneli PIN)
    if (selectedRole === 'ogrenci' || selectedRole === 'veli') {
      const enteredNo = studentNo.trim();
      const enteredPin = pinDigits.join('');

      if (!enteredNo) {
        setErrorMsg('Lütfen okul numaranızı giriniz (Örn: 1024).');
        return;
      }

      if (enteredPin.length !== 4) {
        setErrorMsg('Lütfen 4 haneli PIN kodunuzu eksiksiz giriniz.');
        return;
      }

      setIsSubmitting(true);
      const res = await signInStudent(enteredNo, enteredPin);
      setIsSubmitting(false);

      if (res.ok) {
        setSuccessMsg('PIN doğrulandı! Öğrenci ve Veli Portalı açılıyor...');
        setTimeout(() => onLoginSuccess(res.user), 400);
      } else {
        setPinDigits(['', '', '', '']);
        setErrorMsg(res.error);
      }
      return;
    }

    // 2. Öğretmen veya Admin Girişi (E-Posta + Şifre)
    if (!identifier.trim()) {
      setErrorMsg('Lütfen e-posta adresinizi giriniz.');
      return;
    }

    if (!password) {
      setErrorMsg('Lütfen şifrenizi giriniz.');
      return;
    }

    setIsSubmitting(true);
    const res = await signInStaff(identifier, password, selectedRole === 'admin' ? 'admin' : 'ogretmen');
    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setPassword('');
    setSuccessMsg(
      res.user.role === 'admin'
        ? 'Süper Admin girişi başarılı! Panel açılıyor...'
        : 'Giriş başarılı! Hoş geldiniz, Sn. ' + res.user.name + '.'
    );
    setTimeout(() => onLoginSuccess(res.user), 400);
  };

  // ========================================================
  // ÖĞRETMEN KAYIT FORMU İŞLEMİ
  // Hesap, okul yönetimi (admin) onayından sonra aktifleşir.
  // ========================================================
  const handleTeacherRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Lütfen ad soyad, e-posta ve şifre alanlarını eksiksiz doldurunuz.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setErrorMsg('Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@gmail.com).');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMsg('Şifreniz güvenlik amacıyla en az 8 karakter olmalıdır.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setIsSubmitting(true);
    const res = await signUpTeacher({
      email: regEmail,
      password: regPassword,
      name: regName,
      branch: regBranch,
      city: regCity,
      district: regDistrict,
      school: regSchool,
      className: regClass,
    });
    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Kayıt yapılamadı.');
      return;
    }

    setRegPassword('');
    setRegPasswordConfirm('');
    setAuthMode('login');
    setSelectedRole('ogretmen');
    setIdentifier(regEmail.trim());
    setSuccessMsg(
      'Kaydınız alındı. Okul yönetimi hesabınızı onayladıktan sonra buradan giriş yapabilirsiniz.'
    );
  };

  const currentDistricts = TURKEY_CITIES[regCity] || ['Merkez'];
  const changeMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    if (mode === 'register') setSelectedRole('ogretmen');
    setShowPassword(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.brand}>
          <div className={styles.brandMark}><GraduationCap size={24} aria-hidden="true" /></div>
          <div><strong>e-Okul</strong><span>Öğrenci & Veli Bilgi Portalı</span></div>
        </header>

        <div className={styles.intro}>
          <h1>{authMode === 'login' ? 'Yeniden merhaba.' : 'Öğretmen hesabınızı oluşturun.'}</h1>
          <p>{authMode === 'login'
            ? 'Ödevler, gelişim ve okuldan haberler. Hepsi bir arada.'
            : 'Sınıfınızın gelişimini takip etmek için ilk adımı atın.'}</p>
        </div>

        <section className={styles.panel} aria-label="Hesap işlemleri">
          <div className={styles.modeSwitch} aria-label="Giriş veya kayıt">
            <button type="button" aria-pressed={authMode === 'login'} disabled={isSubmitting} onClick={() => changeMode('login')}>Giriş yap</button>
            <button type="button" aria-pressed={authMode === 'register'} disabled={isSubmitting} onClick={() => changeMode('register')}>Kayıt ol</button>
          </div>

          {authMode === 'login' && (
            <fieldset className={styles.roleGroup} disabled={isSubmitting}>
              <legend>Nasıl giriş yapmak istersiniz?</legend>
              <div className={styles.roles}>
                {roleCards.map(({ id, title, icon: Icon }) => (
                  <button key={id} type="button" className={styles.role} aria-pressed={selectedRole === id} onClick={() => {
                    setSelectedRole(id); setShowPassword(false); setErrorMsg(null); setSuccessMsg(null);
                  }}>
                    <span className={styles.roleIcon}><Icon size={22} aria-hidden="true" /></span>
                    <span className={styles.roleText}><strong>{title}</strong><small>{id === 'ogrenci' ? 'Okul numarası ve 4 haneli PIN' : 'E-posta adresi ve şifre'}</small></span>
                    <span className={styles.roleCheck} aria-hidden="true">{selectedRole === id && <Check size={14} />}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {errorMsg && <div ref={feedbackRef} tabIndex={-1} role="alert" className={`${styles.notice} ${styles.feedback} ${styles.error}`}><AlertCircle size={20} aria-hidden="true" /><p>{errorMsg}</p></div>}
          {successMsg && <div ref={feedbackRef} tabIndex={-1} role="status" className={`${styles.notice} ${styles.feedback} ${styles.success}`}><Check size={20} aria-hidden="true" /><p>{successMsg}</p></div>}

          {authMode === 'login' ? (
            <form className={styles.form} onSubmit={handleLoginSubmit} aria-busy={isSubmitting}>
              <fieldset disabled={isSubmitting}>
                {(selectedRole === 'ogrenci' || selectedRole === 'veli') ? <>
                  <AuthField label="Öğrenci okul numarası" id="student-number">
                    <input id="student-number" name="studentNumber" type="text" inputMode="numeric" autoComplete="username" placeholder="Örn. 1024" value={studentNo} onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ''))} />
                  </AuthField>
                  <div className={styles.pinGroup} role="group" aria-labelledby="pin-label" aria-describedby="pin-help">
                    <span id="pin-label" className={styles.fieldLabel}>4 haneli PIN kodu</span>
                    <div className={styles.pinInputs}>
                      {pinDigits.map((digit, idx) => <input key={idx} id={`student-pin-${idx}`} aria-label={`PIN ${idx + 1}. hane`} name={`pin-${idx}`} type="password" inputMode="numeric" autoComplete="off" maxLength={1} value={digit} onChange={(e) => handlePinDigitChange(idx, e.target.value)} onKeyDown={(e) => handlePinDigitKeyDown(idx, e)} onPaste={(e) => {
                        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                        if (!digits) return;
                        e.preventDefault();
                        const next = [...pinDigits];
                        digits.slice(0, 4 - idx).split('').forEach((value, offset) => { next[idx + offset] = value; });
                        setPinDigits(next);
                        document.getElementById(`student-pin-${Math.min(idx + digits.length, 3)}`)?.focus();
                      }} />)}
                    </div>
                    <p id="pin-help" className={styles.hint}>Okulunuzun sizinle paylaştığı PIN kodunu kullanın.</p>
                  </div>
                </> : <>
                  <AuthField label={selectedRole === 'admin' ? 'Yönetici e-posta adresi' : 'E-posta adresi'} id="login-email">
                    <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="adiniz@ornek.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                  </AuthField>
                  <AuthField label="Şifre" id="login-password">
                    <div className={styles.password}>
                      <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Şifrenizi girin" value={password} onChange={(e) => setPassword(e.target.value)} />
                      <button type="button" aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                  </AuthField>
                </>}
              </fieldset>
              <button className={styles.submit} type="submit" disabled={isSubmitting}><span>{isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}</span>{!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}</button>
              <div className={styles.alternate}><p className={styles.hint}>Henüz öğretmen hesabınız yok mu?</p><button className={styles.textButton} type="button" disabled={isSubmitting} onClick={() => changeMode('register')}>Öğretmen hesabı oluştur</button></div>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleTeacherRegisterSubmit} aria-busy={isSubmitting}>
              <div className={styles.notice}><BookOpen size={20} aria-hidden="true" /><p>Bu form öğretmenler içindir. Hesabınız okul yönetiminin onayından sonra açılır. Öğrenci ve veli hesaplarını okul oluşturur.</p></div>
              <fieldset disabled={isSubmitting}>
                <legend>Hesap bilgileri</legend>
                <AuthField id="register-name" label="Ad soyad"><input id="register-name" name="name" autoComplete="name" required placeholder="Adınız ve soyadınız" value={regName} onChange={(e) => setRegName(e.target.value)} /></AuthField>
                <AuthField id="register-email" label="E-posta adresi" hint="Kişisel e-posta adresinizi de kullanabilirsiniz."><input id="register-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="adiniz@ornek.com" aria-describedby="register-email-hint" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} /></AuthField>
                <AuthField id="register-password" label="Şifre" hint="En az 8 karakter kullanın."><div className={styles.password}><input id="register-password" name="newPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="Şifrenizi oluşturun" aria-describedby="register-password-hint" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} /><button type="button" aria-label={showPassword ? 'Şifreleri gizle' : 'Şifreleri göster'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></AuthField>
                <AuthField id="register-confirm" label="Şifre tekrarı"><input id="register-confirm" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required placeholder="Şifrenizi yeniden girin" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} /></AuthField>
              </fieldset>
              <fieldset disabled={isSubmitting}>
                <legend>Okul bilgileri</legend>
                <div className={styles.pair}>
                  <AuthField id="register-city" label="İl"><select id="register-city" name="city" value={regCity} onChange={(e) => handleCityChange(e.target.value)}>{Object.keys(TURKEY_CITIES).map((city) => <option key={city} value={city}>{city}</option>)}</select></AuthField>
                  <AuthField id="register-district" label="İlçe"><select id="register-district" name="district" value={regDistrict} onChange={(e) => setRegDistrict(e.target.value)}>{currentDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select></AuthField>
                </div>
                <AuthField id="register-school" label="Okul adı"><input id="register-school" name="school" required placeholder="Okulunuzun adı" value={regSchool} onChange={(e) => setRegSchool(e.target.value)} /></AuthField>
                <AuthField id="register-branch" label="Branş"><select id="register-branch" name="branch" value={regBranch} onChange={(e) => setRegBranch(e.target.value)}>{['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü ve Ahlak Bilgisi', 'Bilişim Teknolojileri', 'Görsel Sanatlar', 'Müzik', 'Beden Eğitimi', 'Rehberlik'].map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></AuthField>
                <AuthField id="register-class" label="Rehberlik sınıfı"><select id="register-class" name="className" value={regClass} onChange={(e) => setRegClass(e.target.value)}>{['7-B', '7-A', '8-A', '8-B', '8-C', '6-A', '6-B', '5-A', '5-B', 'Yok'].map((className) => <option key={className} value={className}>{className === 'Yok' ? 'Şube rehberliği yok' : className}</option>)}</select></AuthField>
              </fieldset>
              <button className={styles.submit} type="submit" disabled={isSubmitting}><span>{isSubmitting ? 'Hesap oluşturuluyor…' : 'Öğretmen hesabı oluştur'}</span>{!isSubmitting && <ArrowRight size={20} aria-hidden="true" />}</button>
              <div className={styles.alternate}><p className={styles.hint}>Zaten bir hesabınız var mı?</p><button className={styles.textButton} type="button" disabled={isSubmitting} onClick={() => changeMode('login')}>Giriş yap</button></div>
            </form>
          )}
        </section>
        <footer className={styles.footer}>e-Okul Öğrenci & Veli Bilgi Portalı</footer>
      </div>
    </main>
  );
};

function AuthField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div className={styles.field}><label className={styles.fieldLabel} htmlFor={id}>{label}</label>{children}{hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}</div>;
}
