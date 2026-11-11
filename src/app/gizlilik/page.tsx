import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';
import { CONTACT_EMAIL } from '../../components/site/siteLinks';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası · tofutr.com',
  description: 'tofutr.com okul portalında hangi bilgilerin tutulduğu, cihazınızda nelerin saklandığı ve haklarınız.',
};

export default function GizlilikPage() {
  return (
    <SitePage
      title="Gizlilik Politikası"
      lead="Bu sayfa, tofutr.com’u ziyaret ettiğinizde veya kullandığınızda hangi bilgilerin tutulduğunu sade bir dille anlatır. Öğrenci verilerine ilişkin ayrıntılı hukuki metin KVKK aydınlatma metnidir."
    >
      <div className={styles.prose}>
        <h2>1. Kimin için geçerli?</h2>
        <p>
          Bu politika siteyi ziyaret eden herkes, öğretmenler ve okul yöneticileri için geçerlidir. Öğrencilerin kişisel
          verileri bakımından veri sorumlusu öğrencinin okuludur; bu veriler için{' '}
          <Link href="/aydinlatma">KVKK aydınlatma metni ve veli açık rıza beyanı</Link> esas alınır.
        </p>

        <h2>2. Hangi bilgiler tutulur?</h2>
        <h3>Hesap açmadan gezenler</h3>
        <p>
          Ana sayfa, tanıtım sayfaları ve herkese açık topluluk sayfası hesap açmadan gezilebilir. Bu sırada sizden ad,
          e-posta gibi bir bilgi istenmez.
        </p>
        <h3>Öğretmenler ve okul yöneticileri</h3>
        <ul>
          <li>Kayıt sırasında verdiğiniz bilgiler: ad soyad, e-posta adresi, okul ve başvurunuzun onaylanması için sunduğunuz belge.</li>
          <li>Sistemde oluşturduğunuz içerikler: ödevler, sorular, tahtalar, dosyalar, notlar, puanlar ve mesajlar.</li>
          <li>Toplulukta paylaştıklarınız ve topluluk profilinizde görünmesini seçtiğiniz bilgiler.</li>
        </ul>
        <h3>Öğrenciler</h3>
        <p>
          Ad soyad, okul numarası, sınıf ve şube; ödev, quiz, not, okuma yarışması ve puan kayıtları; öğretmenle
          mesajlar. T.C. kimlik numarası, sağlık bilgisi, fotoğraf veya konum istenmez.
        </p>
        <h3>Güvenlik kayıtları</h3>
        <p>
          Hesapları korumak için giriş denemeleri, oturum bilgileri ve kayıtları kimin ne zaman değiştirdiği tutulur.
        </p>

        <h2>3. Cihazınızda saklananlar</h2>
        <p>Site reklam veya izleme amaçlı çerez kullanmaz. Tarayıcınızda yalnızca sitenin çalışması için gerekenler saklanır:</p>
        <ul>
          <li><strong>Oturum bilgisi:</strong> giriş yaptıktan sonra oturumunuzun açık kalması için.</li>
          <li><strong>Tercihler:</strong> öğrenci girişinde seçtiğiniz okul, sıralama ve görünüm seçimleri, sınıf araçlarının son durumu gibi kolaylıklar.</li>
          <li><strong>Güvenlik doğrulaması:</strong> giriş ve kayıt sırasında otomatik saldırıları önlemek için Cloudflare Turnstile doğrulaması çalışabilir.</li>
        </ul>
        <p>Bu bilgileri tarayıcınızın site verilerini temizleyerek silebilirsiniz; bu durumda yeniden giriş yapmanız gerekir.</p>

        <h2>4. Bilgiler ne için kullanılır?</h2>
        <ul>
          <li>Ödev, quiz, not, puan ve mesaj gibi özelliklerin çalışması.</li>
          <li>Hesap güvenliğinin sağlanması ve yetkisiz erişimin önlenmesi.</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
        </ul>
        <p>Bilgiler reklam veya pazarlama amacıyla kullanılmaz ve satılmaz.</p>

        <h2>5. Kimler görebilir?</h2>
        <ul>
          <li>Öğrenci bilgilerini yalnızca öğrencinin okulundaki yetkili öğretmenler ve okul yönetimi görür.</li>
          <li>Toplulukta herkese açık olarak paylaştığınız materyaller, hesabı olmayan ziyaretçiler dahil herkes tarafından görülebilir.</li>
          <li>Site altyapısı için barındırma ve güvenlik hizmeti sağlayıcıları kullanılır. Veriler yurt dışında bulunan sunucularda saklanır.</li>
        </ul>

        <h2>6. Ne kadar süre saklanır?</h2>
        <p>
          Bilgiler hesap kullanıldığı sürece saklanır. Bir öğrenci kaydı silindiğinde veriler, yanlışlıkla silmeye karşı
          30 gün tutulur ve ardından kendiliğinden silinir. Silme talebinde bulunulursa bu süre beklenmez.
        </p>

        <h2>7. Haklarınız</h2>
        <p>
          Hakkınızda tutulan bilgileri öğrenmek, düzeltilmesini veya silinmesini istemek için okul yönetiminize ya da{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine başvurabilirsiniz. Başvurular en geç 30 gün
          içinde ücretsiz olarak sonuçlandırılır.
        </p>

        <h2>8. Değişiklikler</h2>
        <p>Bu politika güncellenirse yeni metin bu sayfada yayımlanır ve aşağıdaki tarih değiştirilir.</p>

        <p className={styles.updated}>Son güncelleme: 11 Kasım 2026</p>
      </div>
    </SitePage>
  );
}
