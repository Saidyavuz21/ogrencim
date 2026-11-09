import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './Aydinlatma.module.css';

export const metadata: Metadata = {
  title: 'Aydınlatma Metni ve Veli Açık Rızası · tofutr.com',
  description: 'Öğrenci kişisel verilerinin işlenmesine ilişkin KVKK aydınlatma metni ve veli açık rıza beyanı.',
};

// Sürüm değişince src/lib/privacyData.ts içindeki CONSENT_VERSION da güncellenmeli.
const VERSION = 'v1-2026-11';

/**
 * KVKK aydınlatma metni (md. 10) ve veli açık rıza beyanı.
 * TASLAKTIR: yayına almadan önce okul yönetimi / hukuk danışmanı tarafından gözden geçirilmeli;
 * [köşeli parantez] içindeki bilgiler doldurulmalıdır.
 */
export default function AydinlatmaPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>← Ana sayfaya dön</Link>

        <p className={styles.draft} role="note">
          <strong>Taslak metin.</strong> Bu metin okul yönetimi ve hukuk danışmanı tarafından onaylanmadan
          veliye imzalatılmamalıdır. Köşeli parantez içindeki bilgiler doldurulmalıdır.
        </p>

        <h1>Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni</h1>
        <p className={styles.lead}>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) 10. maddesi uyarınca, çocuğunuzun tofutr.com
          okul portalında işlenen kişisel verileri hakkında sizi bilgilendirmek isteriz.
        </p>

        <h2>1. Veri sorumlusu</h2>
        <p>
          Veri sorumlusu, öğrencinin kayıtlı olduğu okuldur: <strong>[Okul adı, adresi]</strong>.
          Platformun teknik altyapısı <strong>[platform işletmecisi adı / unvanı]</strong> tarafından veri işleyen
          sıfatıyla sağlanır.
        </p>

        <h2>2. İşlenen kişisel veriler</h2>
        <ul>
          <li><strong>Kimlik:</strong> ad soyad, okul numarası, sınıf ve şube.</li>
          <li><strong>Eğitim:</strong> ödevler ve ödev teslimleri, quiz cevapları ve puanları, sınav notları, okuma yarışması sonuçları, öğretmenin verdiği artı/eksi puanlar.</li>
          <li><strong>İletişim:</strong> öğrenci ile öğretmen arasındaki mesajlar ve sınıf mesajları.</li>
          <li><strong>İşlem güvenliği:</strong> giriş denemeleri, oturum bilgileri; kayıtları kimin ne zaman değiştirdiği ve görüntülediği.</li>
        </ul>
        <p>
          T.C. kimlik numarası, sağlık bilgisi, fotoğraf veya konum gibi veriler platformda istenmez ve işlenmez.
        </p>

        <h2>3. İşleme amaçları</h2>
        <ul>
          <li>Ödev, quiz ve sınıf etkinliklerinin yürütülmesi; öğrenci gelişiminin takibi.</li>
          <li>Öğretmen ile öğrenci/veli arasındaki iletişimin sağlanması.</li>
          <li>Hesap güvenliğinin sağlanması, yetkisiz erişimin önlenmesi ve yasal yükümlülüklerin yerine getirilmesi.</li>
        </ul>

        <h2>4. Hukuki sebep ve toplama yöntemi</h2>
        <p>
          Veriler, öğretmen tarafından platforma girilmesi ve öğrencinin platformu kullanması yoluyla elektronik
          ortamda toplanır. Çocuğunuzun verileri, velisi olarak vereceğiniz <strong>açık rızaya</strong> (KVKK md. 5/1)
          dayanılarak işlenir; işlem güvenliği kayıtları ise veri sorumlusunun hukuki yükümlülüğü ve meşru menfaati
          (md. 5/2-ç, f) kapsamında tutulur.
        </p>

        <h2>5. Aktarım</h2>
        <p>
          Veriler yalnızca öğrencinin okulundaki yetkili öğretmenler ve okul yönetimi tarafından görülür;
          üçüncü kişilerle paylaşılmaz, reklam veya pazarlama amacıyla kullanılmaz. Platformun veritabanı ve dosya
          depolama hizmeti <strong>Supabase</strong> tarafından sağlanır ve sunucular <strong>[sunucu bölgesi, örn. AB / Frankfurt]</strong>
          bölgesindedir. Bu nedenle veriler, KVKK md. 9 kapsamında yurt dışına aktarılmaktadır; aktarım açık rızanıza
          dayanır.
        </p>

        <h2>6. Saklama süresi</h2>
        <ul>
          <li>Veriler, öğrenci okulda kayıtlı olduğu ve platformu kullandığı sürece saklanır.</li>
          <li>Öğrenci kaydı silindiğinde veriler, yanlışlıkla silmeye karşı <strong>30 gün</strong> saklanır, ardından kendiliğinden silinir.</li>
          <li>Silme talebinde bulunursanız bu 30 günlük süre beklenmeden bütün veriler kalıcı olarak silinir.</li>
        </ul>

        <h2>7. Haklarınız (KVKK md. 11)</h2>
        <p>Veli olarak çocuğunuz adına okul yönetimine başvurarak şunları isteyebilirsiniz:</p>
        <ul>
          <li>Kişisel verilerin işlenip işlenmediğini öğrenmek ve işlenen verilerin bir kopyasını almak,</li>
          <li>Eksik veya yanlış verilerin düzeltilmesini istemek,</li>
          <li>Verilerin silinmesini istemek,</li>
          <li>Verilerin aktarıldığı kişileri öğrenmek, işlemeye itiraz etmek ve zararın giderilmesini talep etmek,</li>
          <li>Verdiğiniz açık rızayı her zaman geri almak.</li>
        </ul>
        <p>
          Başvurunuzu yazılı olarak okul müdürlüğüne veya <strong>[e-posta adresi]</strong> adresine iletebilirsiniz.
          Başvurular en geç <strong>30 gün</strong> içinde ücretsiz olarak sonuçlandırılır.
        </p>

        <section className={styles.box} aria-labelledby="consent-title">
          <h2 id="consent-title">Veli Açık Rıza Beyanı</h2>
          <p>
            Yukarıdaki aydınlatma metnini okudum ve anladım. Velisi bulunduğum öğrencinin kişisel verilerinin,
            belirtilen amaçlarla tofutr.com okul portalında işlenmesine ve 5. maddede belirtilen şekilde yurt dışında
            bulunan sunucularda saklanmasına açık rıza veriyorum. Bu rızayı dilediğim zaman geri alabileceğimi biliyorum.
          </p>
          <p>
            Öğrencinin adı soyadı: ...................................................... &nbsp; Sınıfı: ............
            <br />
            Velinin adı soyadı: ...................................................... &nbsp; Tarih: ....../....../..........
            <br />
            İmza: ......................................
          </p>
        </section>

        <p className={styles.version}>Metin sürümü: {VERSION}</p>
      </div>
    </main>
  );
}
