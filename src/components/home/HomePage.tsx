'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Eye, EyeOff, Layers } from 'lucide-react';
import { restoreSession, signInStaff, signInStudent, SchoolRecord } from '../../lib/supabaseClient';
import styles from './HomePage.module.css';
import { SiteHeader } from '../site/SiteHeader';
import { SiteFooter } from '../site/SiteFooter';

import { StudentSchoolSelect, loadRememberedSchool, rememberSchool } from '../StudentSchoolSelect';
import { useCaptcha, CAPTCHA_MISSING_MESSAGE } from '../auth/Captcha';
import { getPublicGallery, thumbUrl, type PublicItem } from '../../lib/communitySocialData';

export default function HomePage() {
  const router = useRouter();


  // Açık oturum varsa (sekme/tarayıcı yeniden açıldığında) doğrudan panele geç
  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((user) => {
        if (user && !cancelled) router.replace('/giris');
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [router]);
  const [role, setRole] = useState('Öğrenci');
  // Öğrencinin okulu bu cihazda hatırlanır (sunucu çiziminden sonra okunur)
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  useEffect(() => {
    const saved = loadRememberedSchool();
    if (saved) queueMicrotask(() => setSchool((current) => current ?? saved));
  }, []);
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const captcha = useCaptcha();
  const [materials, setMaterials] = useState<PublicItem[]>([]);
  const [materialsState, setMaterialsState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    getPublicGallery({ limit: 3 }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setMaterials(result.data ?? []);
        setMaterialsState('ready');
      } else setMaterialsState('error');
    }).catch(() => { if (!cancelled) setMaterialsState('error'); });
    return () => { cancelled = true; };
  }, []);

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
    if (captcha.missing) { setNotice(CAPTCHA_MISSING_MESSAGE); return; }
    submitting.current = true;
    setIsSubmitting(true);
    setNotice('');
    try {
      const result = role === 'Öğretmen'
        ? await signInStaff(identifier, password, 'ogretmen', captcha.token)
        : await signInStudent(school?.id || '', identifier, pin.join(''), captcha.token);
      if (!result.ok) { setNotice(result.error); return; }
      if (role === 'Öğrenci') rememberSchool(school);
      router.push('/giris');
    } catch {
      setNotice('Sunucuya bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
      captcha.reset();
    }
  }

  return (
    <div className={styles.page}>
      <SiteHeader />

      <main className={styles.main}>
        <div className={styles.hero}>
          <section className={styles.story} aria-label="Okul topluluğu">
            <div className={styles.illustration}>
              {/* This is an authored illustration, not a photograph or interface screenshot. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/okul-bahcesi.png" width="1254" height="1254" alt="Okul girişinde bir kitabı birlikte inceleyen öğretmen, öğrenci ve veli" />
            </div>
            <div className={styles.features}>
              <Link href="/topluluk"><Layers size={20} aria-hidden="true" /> Ders tahtaları <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link href="/topluluk"><BookOpen size={20} aria-hidden="true" /> Soru setleri <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </section>

          <section className={styles.login} aria-labelledby="login-title">
            <h2 id="login-title">Hoş geldiniz</h2>
            <p className={styles.intro}>Devam etmek için hesabınıza giriş yapın.</p>
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
                {captcha.widget && <div className={styles.captcha}>{captcha.widget}</div>}
                <p className={styles.help}>{role === 'Öğretmen' ? 'Öğretmen hesabınızla giriş yapabilirsiniz.' : 'Okul numaranızı ve PIN kodunuzu öğretmeninizden alabilirsiniz.'}</p>
                <button className={styles.submit} type="submit">{isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'} <ArrowRight size={19} /></button>
              </fieldset>
              {notice && <p className={styles.notice} role="alert">{notice}</p>}
            </form>
            <div className={styles.register}>Hesabınız yok mu? <Link href="/giris#kayit">Ücretsiz kayıt ol</Link></div>
          </section>
        </div>
        <section className={styles.welcomeCard} aria-labelledby="home-welcome-title">
          <h1 id="home-welcome-title">Sınıfın için her şey bir arada.</h1>
          <p>Ödevleri paylaşın, gelişimi takip edin, derslerinize birlikte hayat verin.</p>
        </section>
        <Link className={styles.mobileCommunityLink} href="/topluluk">Topluluğu keşfet <ArrowRight size={18} aria-hidden="true" /></Link>
        <section className={styles.community} aria-labelledby="community-title">
          <div className={styles.communityHeading}>
            <h2 id="community-title">Öğretmenlerden ilham alın</h2>
            <Link href="/topluluk">Topluluğu keşfet <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className={styles.materials} aria-busy={materialsState === 'loading'}>
            {materials.map(item => <Link className={styles.material} key={item.id} href={`/topluluk?materyal=${encodeURIComponent(item.id)}`}>
              <div className={styles.materialThumb}>
                {thumbUrl(item.thumb_path) ? (
                  // Public thumbnails are served by the existing community storage URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl(item.thumb_path)!} alt="" loading="lazy" />
                ) : <BookOpen size={36} aria-hidden="true" />}
              </div>
              <div className={styles.materialInfo}><span>{item.kind === 'board' ? 'Ders tahtası' : 'Soru seti'}{item.subject ? ` · ${item.subject}` : ''}</span><h3>{item.title}</h3></div>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>)}
            {materials.length === 0 && <p className={styles.materialEmpty} role="status">{materialsState === 'loading' ? 'Topluluktaki materyaller yükleniyor…' : materialsState === 'error' ? 'Materyaller şu anda yüklenemedi. Topluluk sayfasını ziyaret edebilirsiniz.' : 'Paylaşılan ders tahtalarını ve soru setlerini toplulukta keşfedin.'}</p>}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
