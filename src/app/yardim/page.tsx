import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';
import { CONTACT_EMAIL } from '../../components/site/siteLinks';

export const metadata: Metadata = {
  title: 'Yardım ve Sık Sorulanlar · tofutr.com',
  description: 'tofutr.com okul portalında giriş, PIN, öğretmen kaydı, ödev ve hesap konularında sık sorulan sorular.',
};

interface Question {
  q: string;
  a: ReactNode;
}

const SECTIONS: { id: string; title: string; questions: Question[] }[] = [
  {
    id: 'ogrenci',
    title: 'Öğrenciler ve aileler',
    questions: [
      {
        q: 'Nasıl giriş yaparım?',
        a: (
          <ol>
            <li>Ana sayfada “Öğrenci” seçili olsun.</li>
            <li>Okulunuzu seçin. Okul bu cihazda hatırlanır; sonraki girişte yeniden seçmeniz gerekmez.</li>
            <li>Okul numaranızı ve 4 haneli PIN kodunuzu yazıp “Giriş yap” düğmesine basın.</li>
          </ol>
        ),
      },
      { q: 'Okul numaramı veya PIN kodumu bilmiyorum.', a: <p>İkisini de sınıf öğretmeninizden alabilirsiniz. Öğretmeniniz PIN kodunuzu görebilir.</p> },
      { q: 'PIN kodumu unuttum.', a: <p>Sınıf öğretmeninize sorun; PIN kodunuzu size yeniden söyleyebilir.</p> },
      { q: 'Veli olarak ayrı bir hesap açabilir miyim?', a: <p>Ayrı bir veli hesabı yoktur. Çocuğunuzun okul numarası ve PIN kodu ile giriş yaparak ödevlerini, notlarını, puanlarını ve mesajlarını görebilirsiniz.</p> },
      { q: 'Ödevimi nasıl teslim ederim?', a: <p>Giriş yaptıktan sonra “Ödevler” sayfasını açın, ödevi seçin ve teslim edin. Öğretmeniniz kontrol ettiğinde sonucu aynı sayfada görürsünüz.</p> },
      { q: 'Çocuğumun verilerinin silinmesini nasıl isterim?', a: <p>Okul müdürlüğüne veya <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine yazabilirsiniz. Haklarınız <Link href="/aydinlatma">KVKK aydınlatma metninde</Link> açıklanmıştır.</p> },
    ],
  },
  {
    id: 'ogretmen',
    title: 'Öğretmenler',
    questions: [
      { q: 'Nasıl hesap açarım?', a: <p><Link href="/giris#kayit">Kayıt sayfasından</Link> ücretsiz kayıt olun. Hesabınız, okul yönetimi başvurunuzu onayladıktan sonra açılır.</p> },
      { q: 'Kayıt oldum ama giriş yapamıyorum.', a: <p>Hesabınız henüz onaylanmamış olabilir. Okul yöneticinize başvurun; onaydan sonra e-posta adresiniz ve şifrenizle giriş yapabilirsiniz.</p> },
      { q: 'Öğrencilerim sisteme nasıl girer?', a: <p>“Öğrenciler” sayfasından öğrencilerinizi ekleyin. Her öğrencinin bir okul numarası ve PIN kodu olur; bunları öğrencilerinize verin.</p> },
      { q: 'Öğrencilerin kişisel verileri için veli onayı gerekir mi?', a: <p>Evet. <Link href="/aydinlatma">Aydınlatma metni ve veli açık rıza beyanı</Link> yazdırılıp veliye imzalatılır; imzalı formu aldığınız öğrencileri “Veli onayları” sayfasında işaretlersiniz.</p> },
      { q: 'Hazırladığım tahta veya soruları başka öğretmenlerle paylaşabilir miyim?', a: <p>Evet, Topluluk üzerinden paylaşabilirsiniz. Paylaşmadan önce <Link href="/topluluk-kurallari">Topluluk kurallarını</Link> okuyun.</p> },
    ],
  },
  {
    id: 'genel',
    title: 'Genel',
    questions: [
      { q: 'Telefona uygulama olarak yükleyebilir miyim?', a: <p>Ayrı bir mağaza uygulaması yoktur. Siteyi telefonunuzun tarayıcısında açıp ana ekrana ekleyebilirsiniz; uygulama gibi açılır.</p> },
      { q: 'Kullanmak ücretli mi?', a: <p>Öğretmen kaydı ücretsizdir.</p> },
      { q: 'Sorum burada yok.', a: <p><Link href="/iletisim">İletişim</Link> sayfasından bize ulaşabilirsiniz.</p> },
    ],
  },
];

export default function YardimPage() {
  return (
    <SitePage
      title="Yardım ve Sık Sorulanlar"
      lead="Giriş, PIN, kayıt ve ödevle ilgili en sık sorulan sorular. Bir soruya dokunarak yanıtını açabilirsiniz."
    >
      <ul className={styles.jump} aria-label="Bölümler">
        {SECTIONS.map((section) => (
          <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
        ))}
      </ul>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className={`${styles.panel} ${styles.anchor}`} aria-labelledby={`${section.id}-baslik`}>
          <h2 id={`${section.id}-baslik`}>{section.title}</h2>
          <div className={`${styles.faq} ${styles.prose}`}>
            {section.questions.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                {item.a}
              </details>
            ))}
          </div>
        </section>
      ))}
    </SitePage>
  );
}
