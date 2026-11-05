'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, Lock, MessageSquare } from 'lucide-react';
import { signInStaff, signInStudent, SchoolRecord } from '../../lib/supabaseClient';
import styles from './HomePage.module.css';
import { BrandLogo } from '../BrandLogo';
import { StudentSchoolSelect, loadRememberedSchool, rememberSchool } from '../StudentSchoolSelect';

export default function HomePage() {
  const router = useRouter();
  const [role, setRole] = useState('Öğrenci');
  // Öğrencinin okulu bu cihazda hatırlanır (sunucu çiziminden sonra okunur)
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  useEffect(() => {
    const saved = loadRememberedSchool();
    if (saved) queueMicrotask(() => setSchool((current) => current ?? saved));
  }, []);
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState('Ana Sayfa');
  const [pin, setPin] = useState(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    const identifier = String(fields.get('identifier') || '').trim();
    const password = String(fields.get('password') || '');
    if (role === 'Öğrenci' && !school) { setNotice('Lütfen önce okulunuzu seçin.'); return; }
    if (!identifier) { setNotice('Lütfen giriş bilgilerinizi doldurun.'); return; }
    if (role === 'Öğrenci' && !/^\d{4}$/.test(pin.join(''))) {
      setNotice('Lütfen 4 haneli PIN kodunuzu eksiksiz girin.');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setNotice('');
    try {
      const result = role === 'Öğretmen'
        ? await signInStaff(identifier, password, 'ogretmen')
        : await signInStudent(school?.id || '', identifier, pin.join(''));
      if (!result.ok) { setNotice(result.error); return; }
      if (role === 'Öğrenci') rememberSchool(school);
      router.push('/giris');
    } catch {
      setNotice('Sunucuya bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="tofutr.com ana sayfa">
            <BrandLogo height={52} priority />
            <span className={styles.brandDescription}>Okulunla aynı yerde.</span>
          </Link>
          <nav className={styles.nav} aria-label="Ana menü">
            {['Ana Sayfa', 'Sistem Hakkında', 'İletişim'].map(item => <button key={item} type="button" aria-current={section === item ? 'page' : undefined} onClick={() => setSection(item)}>{item}</button>)}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {section === 'Ana Sayfa' ? <div className={styles.hero}>
          <section className={styles.story} aria-labelledby="welcome-title">
            <h1 id="welcome-title">Okulda başlayan bağ, <span>burada devam eder.</span></h1>
            <p>Öğretmen, öğrenci ve veli aynı yerde. Ödevleri takip edin, gelişimi birlikte destekleyin.</p>
            <div className={styles.illustration}>
              {/* This is an authored illustration, not a photograph or interface screenshot. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/okul-bagi.png" width="960" height="640" alt="Bir okulun çevresinde bağlantı kuran öğretmen, öğrenci ve veli illüstrasyonu" />
            </div>
            <div className={styles.features}><span><BookOpen size={17} /> Ödev takibi</span><span><GraduationCap size={19} /> Öğrenci gelişimi</span><span><MessageSquare size={17} /> Okul–aile iletişimi</span></div>
          </section>

          <section className={styles.login} aria-labelledby="login-title">
            <h2 id="login-title">Hoş geldiniz</h2>
            <p className={styles.intro}>Okulunuza açılan kapıdan giriş yapın.</p>
            <div className={styles.roles} aria-label="Giriş yapacağınız rol">
              {['Öğrenci', 'Öğretmen'].map(item => <button key={item} type="button" disabled={isSubmitting} aria-pressed={role === item} onClick={() => { setRole(item); setNotice(''); setPin(['', '', '', '']); }}>{item}</button>)}
            </div>
            <form onSubmit={handleLogin} aria-busy={isSubmitting}>
              <fieldset className={styles.loginFields} disabled={isSubmitting}>
              {role !== 'Öğretmen' && <StudentSchoolSelect value={school} onChange={setSchool} disabled={isSubmitting} />}
              <label htmlFor="identifier">{role === 'Öğretmen' ? 'E-posta adresi' : 'Öğrenci okul numarası'}</label>
              <input id="identifier" name="identifier" type={role === 'Öğretmen' ? 'email' : 'text'} inputMode={role === 'Öğretmen' ? 'email' : 'numeric'} autoComplete="username" placeholder={role === 'Öğretmen' ? 'ornek@okul.edu.tr' : 'Okul numaranızı yazın'} required />
              {role === 'Öğretmen' ? <>
                <label htmlFor="password">Şifre</label>
                <div className={styles.password}><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Şifrenizi yazın" required /><button type="button" aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
              </> : <fieldset className={styles.pinGroup}>
                <legend>4 haneli PIN kodu</legend>
                <div className={styles.pinInputs}>{pin.map((digit, index) => <input key={index} id={`home-pin-${index}`} aria-label={`PIN ${index + 1}. hane`} type="password" inputMode="numeric" pattern="[0-9]" maxLength={1} value={digit} required onChange={event => {
                  const value = event.target.value.replace(/\D/g, '').slice(-1);
                  setPin(previous => previous.map((item, position) => position === index ? value : item));
                  if (value && index < 3) document.getElementById(`home-pin-${index + 1}`)?.focus();
                }} onKeyDown={event => { if (event.key === 'Backspace' && !digit && index > 0) document.getElementById(`home-pin-${index - 1}`)?.focus(); }} onPaste={event => {
                  const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4 - index);
                  if (!digits) return;
                  event.preventDefault();
                  setPin(previous => previous.map((item, position) => position >= index && position < index + digits.length ? digits[position - index] : item));
                  document.getElementById(`home-pin-${Math.min(index + digits.length, 3)}`)?.focus();
                }} />)}</div>
              </fieldset>}
              <p className={styles.help}>{role === 'Öğretmen' ? 'Öğretmen hesabınızla giriş yapabilirsiniz.' : 'Okul numaranızı ve PIN kodunuzu öğretmeninizden alabilirsiniz.'}</p>
              <button className={styles.submit} type="submit">{isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'} <ArrowRight size={19} /></button>
              </fieldset>
              {notice && <p className={styles.notice} role="alert">{notice}</p>}
            </form>
            <div className={styles.register}><Link href="/giris#kayit">Kayıt ol <ArrowRight size={16} /></Link></div>
            <p className={styles.security}><Lock size={14} /> Size ait bilgilerle, size özel erişim.</p>
          </section>
        </div> : <section className={styles.info}>
          <h1>{section}</h1>
          {section === 'Sistem Hakkında' ? <><p>tofutr.com; öğretmen, öğrenci ve veliyi ödev takibi, öğrenci gelişimi ve okul–aile iletişimi etrafında bir araya getiren bir okul portalıdır.</p><p>Öğrenci ve veliler okul numarası ve PIN ile, öğretmenler kendi hesaplarıyla giriş yapar.</p></> : <><p>Giriş bilgileriniz ve okulunuza ilişkin sorularınız için sınıf öğretmeninizle iletişime geçebilirsiniz.</p><p>Hesabınızla ilgili sorunlarda okul yönetiminize başvurabilirsiniz.</p></>}
          <button type="button" className={styles.back} onClick={() => setSection('Ana Sayfa')}>Ana sayfaya dön <ArrowRight size={17} /></button>
        </section>}
      </main>

      <footer className={styles.footer}><div><span>tofutr.com · Birlikte öğrenir, birlikte gelişiriz.</span></div></footer>
    </div>
  );
}
