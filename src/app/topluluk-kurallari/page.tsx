import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';
import { CONTACT_EMAIL } from '../../components/site/siteLinks';

export const metadata: Metadata = {
  title: 'Topluluk Kuralları · tofutr.com',
  description: 'tofutr.com öğretmen topluluğunda tahta ve soru seti paylaşırken uyulacak kurallar.',
};

export default function ToplulukKurallariPage() {
  return (
    <SitePage
      title="Topluluk Kuralları"
      lead="Topluluk, öğretmenlerin hazırladığı tahtaları ve soru setlerini birbirleriyle paylaştığı alandır. Herkesin güvenle yararlanabilmesi için aşağıdaki kurallar geçerlidir."
    >
      <div className={styles.prose}>
        <h2>1. Ne paylaşılır?</h2>
        <p>
          Derste kullanılabilecek etkileşimli tahtalar ve soru setleri. Paylaşımınıza dersi ve sınıf düzeyini doğru
          yazmanız, diğer öğretmenlerin aradığını bulmasını kolaylaştırır.
        </p>

        <h2>2. Herkese açık paylaşım</h2>
        <p>
          Bir materyali paylaşırken herkese açık önizlemeye izin verip vermeyeceğinizi seçersiniz. İzin verdiğiniz
          materyaller, <Link href="/topluluk">herkese açık topluluk sayfasında</Link> hesabı olmayan ziyaretçiler
          tarafından da görülebilir. Bu seçimi sonradan değiştirebilirsiniz.
        </p>

        <h2>3. Öğrenci bilgisi paylaşmayın</h2>
        <p>
          Paylaştığınız materyallerde öğrenci adı, numarası, notu, fotoğrafı veya öğrenciyi tanıtabilecek başka bir
          bilgi bulunmamalıdır. Bu kuralın ihlali hâlinde içerik beklemeden kaldırılır.
        </p>

        <h2>4. Kendi emeğinizi paylaşın</h2>
        <ul>
          <li>Kendi hazırladığınız ya da paylaşma hakkına sahip olduğunuz içerikleri paylaşın.</li>
          <li>Ders kitabı, yayınevi soru bankası gibi telifli kaynaklardan toplu kopyalama yapmayın.</li>
          <li>Başka bir öğretmenin materyalinden yararlandıysanız bunu belirtin.</li>
        </ul>

        <h2>5. Saygılı ve amaca uygun olun</h2>
        <ul>
          <li>Yorumlarda ve paylaşımlarda meslektaşlarınıza saygılı bir dil kullanın.</li>
          <li>Hakaret, ayrımcılık, siyasi propaganda veya çocuklar için uygun olmayan içerik paylaşmayın.</li>
          <li>Reklam, satış ilanı ve konu dışı tekrar eden paylaşımlar yapmayın.</li>
        </ul>

        <h2>6. Uygunsuz içeriği bildirme</h2>
        <p>
          Giriş yapmış öğretmenler, kurallara aykırı buldukları bir paylaşımı topluluk içinden bildirebilir. Hesabınız
          yoksa <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine, içeriğin bağlantısını ve nedenini
          yazarak başvurabilirsiniz. Bildirimler yönetici tarafından incelenir.
        </p>

        <h2>7. Kurallara uyulmazsa</h2>
        <p>
          Kurallara aykırı içerik kaldırılabilir. Tekrarlayan veya ağır ihlallerde paylaşım yapma izni kısıtlanabilir
          ya da hesap kapatılabilir. Genel hükümler için <Link href="/kullanim-kosullari">Kullanım koşullarına</Link> bakın.
        </p>

        <p className={styles.updated}>Son güncelleme: 11 Kasım 2026</p>
      </div>
    </SitePage>
  );
}
