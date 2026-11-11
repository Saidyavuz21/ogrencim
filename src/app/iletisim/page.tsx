import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';
import { CONTACT_EMAIL } from '../../components/site/siteLinks';
import { Building, MessageSquare, School, Users } from '../../components/icons';

export const metadata: Metadata = {
  title: 'İletişim · tofutr.com',
  description: 'tofutr.com okul portalı için iletişim: giriş ve hesap soruları, okul başvuruları, teknik sorunlar ve kişisel veri talepleri.',
};

export default function IletisimPage() {
  return (
    <SitePage
      title="İletişim"
      lead="Sorunuzun en hızlı çözüleceği yer, konusuna göre değişir. Aşağıdan size uyan başlığı bulabilirsiniz."
    >
      <section className={styles.panel} aria-labelledby="kime-baslik">
        <h2 id="kime-baslik">Kime başvurmalıyım?</h2>
        <ul className={styles.rows}>
          <li>
            <span className={styles.rowIcon} aria-hidden="true"><Users size={20} /></span>
            <div className={styles.rowText}>
              <strong>Öğrenci veya veliyim</strong>
              <span>Okul numarası, PIN ve ödevlerle ilgili sorular için sınıf öğretmeninize başvurun. PIN kodunuzu öğretmeniniz görebilir.</span>
            </div>
          </li>
          <li>
            <span className={styles.rowIcon} aria-hidden="true"><School size={20} /></span>
            <div className={styles.rowText}>
              <strong>Öğretmenim</strong>
              <span>Hesabınızın onayı ve okulunuzdaki sınıflarla ilgili konular için okul yöneticinize başvurun. Sistemle ilgili sorunları bize yazabilirsiniz.</span>
            </div>
          </li>
          <li>
            <span className={styles.rowIcon} aria-hidden="true"><Building size={20} /></span>
            <div className={styles.rowText}>
              <strong>Okul yöneticisiyim</strong>
              <span>Okulunuzu sisteme eklemek, hesap ve yetki konuları ya da teknik sorunlar için bize e-posta gönderin.</span>
            </div>
          </li>
          <li>
            <span className={styles.rowIcon} aria-hidden="true"><MessageSquare size={20} /></span>
            <div className={styles.rowText}>
              <strong>Kişisel veriler veya topluluktaki bir içerik hakkında yazıyorum</strong>
              <span>
                Veri görme, düzeltme ve silme talepleri ile toplulukta uygunsuz bulduğunuz paylaşımlar için bize e-posta gönderin.
                Ayrıntılar: <Link className={styles.textLink} href="/aydinlatma">KVKK aydınlatma metni</Link>,{' '}
                <Link className={styles.textLink} href="/topluluk-kurallari">Topluluk kuralları</Link>.
              </span>
            </div>
          </li>
        </ul>
      </section>

      <section className={styles.panel} aria-labelledby="eposta-baslik">
        <h2 id="eposta-baslik">E-posta</h2>
        <p className={styles.panelLead}>
          Yazarken okulunuzun adını ve sorunu kısaca belirtmeniz yanıtı hızlandırır. Güvenliğiniz için e-postada şifre veya PIN paylaşmayın.
        </p>
        <a className={styles.mail} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </section>

      <div className={styles.actions}>
        <Link className={styles.btnSecondary} href="/yardim">Sık sorulan sorulara bak</Link>
      </div>
    </SitePage>
  );
}
