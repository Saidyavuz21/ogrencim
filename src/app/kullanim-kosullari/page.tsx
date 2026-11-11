import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';
import { CONTACT_EMAIL } from '../../components/site/siteLinks';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları · tofutr.com',
  description: 'tofutr.com okul portalının kullanım koşulları: hesaplar, kabul edilebilir kullanım, içerik ve sorumluluklar.',
};

export default function KullanimKosullariPage() {
  return (
    <SitePage
      title="Kullanım Koşulları"
      lead="tofutr.com’u kullanan herkes bu koşulları kabul etmiş sayılır. Koşullar kısa tutulmuştur; lütfen tamamını okuyun."
    >
      <div className={styles.prose}>
        <h2>1. Hizmet</h2>
        <p>
          tofutr.com; öğretmenlerin ödev, quiz, tahta, puan, not ve mesaj işlerini yürüttüğü, öğrencilerin bunları
          takip ettiği bir okul portalıdır. Hizmetin kapsamı <Link href="/ozellikler">Özellikler</Link> sayfasında anlatılır.
        </p>

        <h2>2. Hesaplar</h2>
        <ul>
          <li>Öğretmen hesabı, kayıt başvurusu okul yönetimi tarafından onaylandıktan sonra açılır. Kayıt sırasında doğru bilgi vermeniz gerekir.</li>
          <li>Öğrenci hesapları öğretmen tarafından oluşturulur; öğrenci okul numarası ve PIN ile giriş yapar.</li>
          <li>Şifrenizi ve PIN kodunuzu kimseyle paylaşmayın. Hesabınızla yapılan işlemlerden siz sorumlusunuz. Öğrencinin velisi, çocuğunun hesabını onunla birlikte kullanabilir.</li>
          <li>Hesabınızın izinsiz kullanıldığını düşünüyorsanız öğretmeninize, okul yönetiminize veya bize haber verin.</li>
        </ul>

        <h2>3. Kabul edilebilir kullanım</h2>
        <p>Aşağıdakiler yasaktır:</p>
        <ul>
          <li>Başkasının hesabına izinsiz girmek veya girmeye çalışmak.</li>
          <li>Öğrenci bilgilerini eğitim amacı dışında kullanmak, kopyalamak veya üçüncü kişilerle paylaşmak.</li>
          <li>Hakaret, tehdit, taciz, ayrımcılık içeren ya da çocuklar için uygun olmayan içerik göndermek.</li>
          <li>Sistemi bozmaya, yavaşlatmaya, güvenlik önlemlerini aşmaya veya otomatik araçlarla toplu veri çekmeye çalışmak.</li>
          <li>Yürürlükteki mevzuata aykırı herhangi bir amaçla kullanmak.</li>
        </ul>

        <h2>4. İçerikleriniz</h2>
        <p>
          Sisteme yüklediğiniz ödev, soru, tahta ve dosyaların sorumluluğu size aittir. Yalnızca kullanma hakkına sahip
          olduğunuz içerikleri yükleyin. İçeriklerinizin sahibi siz kalırsınız; bize yalnızca hizmeti sunabilmek için
          bu içerikleri saklama ve ilgili kişilere gösterme izni verirsiniz.
        </p>
        <p>
          Toplulukta paylaştığınız materyaller için ayrıca <Link href="/topluluk-kurallari">Topluluk kuralları</Link> geçerlidir.
        </p>

        <h2>5. Kişisel veriler</h2>
        <p>
          Kişisel verilerin nasıl işlendiği <Link href="/gizlilik">Gizlilik politikası</Link> ve{' '}
          <Link href="/aydinlatma">KVKK aydınlatma metninde</Link> açıklanır. Öğretmenler, öğrencilerini sisteme
          eklemeden önce veli onayının alınmasından okullarıyla birlikte sorumludur.
        </p>

        <h2>6. Hizmetin sürekliliği</h2>
        <p>
          Hizmeti kesintisiz ve hatasız sunmak için çalışırız; ancak bakım, güncelleme veya elimizde olmayan nedenlerle
          kesinti yaşanabilir. Özellikler zaman içinde değişebilir, eklenebilir veya kaldırılabilir. Önemli kayıtlarınızın
          (örneğin notların) okulunuzun resmi kayıtlarında da bulunmasını öneririz; tofutr.com resmi kayıt sisteminin
          yerine geçmez.
        </p>

        <h2>7. Hesabın askıya alınması</h2>
        <p>
          Bu koşullara veya topluluk kurallarına aykırı kullanım hâlinde ilgili içerik kaldırılabilir, hesap geçici
          olarak durdurulabilir veya kapatılabilir.
        </p>

        <h2>8. Değişiklikler ve iletişim</h2>
        <p>
          Koşullar güncellenirse yeni metin bu sayfada yayımlanır. Sorularınız için{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine yazabilirsiniz.
        </p>

        <p className={styles.updated}>Son güncelleme: 11 Kasım 2026</p>
      </div>
    </SitePage>
  );
}
