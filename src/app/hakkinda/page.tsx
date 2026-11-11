import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';

export const metadata: Metadata = {
  title: 'Sistem Hakkında · tofutr.com',
  description: 'tofutr.com; öğretmen ve öğrenciyi ödev, ders, puan, not ve iletişim etrafında aynı yerde buluşturan okul portalıdır.',
};

export default function HakkindaPage() {
  return (
    <SitePage
      title="Sistem Hakkında"
      lead="tofutr.com, öğretmen ve öğrenciyi aynı yerde buluşturan bir okul portalıdır. Okulda başlayan iş burada devam eder: ödev verilir, teslim edilir, kontrol edilir ve gelişim birlikte izlenir."
    >
      <div className={styles.prose}>
        <h2>Ne işe yarar?</h2>
        <p>
          Öğretmen ödev, quiz ve tahta etkinliği hazırlar; öğrenci bunları kendi hesabından görür ve teslim eder.
          Puanlar, notlar, okuma yarışması sonuçları ve mesajlar aynı yerde durur. Böylece öğrencinin neyi yaptığı,
          nerede zorlandığı ve nasıl geliştiği hem öğretmen hem aile için açık olur.
        </p>
        <p>
          Bütün özelliklerin listesi için <Link href="/ozellikler">Özellikler</Link> sayfasına bakabilirsiniz.
        </p>

        <h2>Kimler kullanır?</h2>
        <ul>
          <li><strong>Öğretmenler</strong> kendi hesaplarıyla girer; sınıflarını, öğrencilerini, ödevlerini ve notlarını yönetir.</li>
          <li><strong>Öğrenciler</strong> okul numarası ve 4 haneli PIN ile girer; ödevlerini, puanlarını, notlarını ve mesajlarını görür.</li>
          <li><strong>Aileler</strong> için ayrı bir hesap yoktur; çocuklarının hesabından aynı bilgileri takip ederler.</li>
          <li><strong>Okul yönetimi</strong> öğretmen hesaplarını onaylar, sınıfları ve okul duyurularını yönetir.</li>
        </ul>

        <h2>Nasıl başlanır?</h2>
        <ol>
          <li>Öğretmen <Link href="/giris#kayit">ücretsiz kayıt olur</Link>; hesabı okul yönetiminin onayından sonra açılır.</li>
          <li>Öğretmen sınıflarını seçer, öğrencilerini ekler ve her öğrenciye giriş PIN’ini verir.</li>
          <li>Öğrenci ana sayfadan okulunu seçip okul numarası ve PIN’i ile giriş yapar.</li>
        </ol>

        <h2>Veriye yaklaşımımız</h2>
        <p>
          Sistem yalnızca eğitim için gereken bilgileri tutar. T.C. kimlik numarası, sağlık bilgisi, fotoğraf veya konum
          istenmez. Öğrenci bilgileri reklam ya da pazarlama için kullanılmaz ve yalnızca öğrencinin okulundaki yetkili
          öğretmenler ile okul yönetimi tarafından görülür.
        </p>
        <p>
          Ayrıntılar için <Link href="/gizlilik">Gizlilik politikası</Link> ve{' '}
          <Link href="/aydinlatma">KVKK aydınlatma metni</Link> sayfalarına bakabilirsiniz.
        </p>
      </div>

      <div className={styles.actions}>
        <Link className={styles.btnPrimary} href="/ozellikler">Özellikleri incele</Link>
        <Link className={styles.btnSecondary} href="/iletisim">İletişime geç</Link>
      </div>
    </SitePage>
  );
}
