import type { Metadata } from 'next';
import type { FC } from 'react';
import Link from 'next/link';
import { SitePage } from '../../components/site/SitePage';
import styles from '../../components/site/Site.module.css';
import type { IconProps } from '../../components/icons';
import {
  Award, BarChart3, Bell, BookOpen, Building, CheckSquare, FileText, Fish, Folder, Globe, HelpCircle,
  Layers, MessageSquare, School, Send, ShieldCheck, Shuffle, Star, TrendingUp, Users,
} from '../../components/icons';

export const metadata: Metadata = {
  title: 'Özellikler · tofutr.com',
  description: 'tofutr.com okul portalının öğretmen, öğrenci ve okul yönetimi için sunduğu özellikler: ödev, quiz, etkileşimli tahta, puan, not, mesaj ve daha fazlası.',
};

interface Feature {
  icon: FC<IconProps>;
  title: string;
  text: string;
}

interface FeatureGroup {
  id: string;
  title: string;
  lead: string;
  features: Feature[];
}

const GROUPS: FeatureGroup[] = [
  {
    id: 'ogretmen',
    title: 'Öğretmenler için',
    lead: 'Ödev vermekten not girmeye, derste kullanılan araçlardan öğrenciyle yazışmaya kadar günlük işler tek panelde.',
    features: [
      { icon: Send, title: 'Ödev gönderme', text: 'Ödev, quiz veya tahta etkinliği hazırlayıp bir ya da birden çok sınıfa gönderin.' },
      { icon: CheckSquare, title: 'Ödev kontrolü', text: 'Her öğrenci için yaptı, kısmen yaptı veya yapmadı olarak işaretleyin; teslimleri değerlendirin.' },
      { icon: HelpCircle, title: 'Soru bankası ve quiz', text: 'Sorularınızı yazın, düzenleyin, süzün; quizlerde yeniden kullanın.' },
      { icon: Layers, title: 'Etkileşimli tahta', text: 'Tahtada çizin, derste sunun, isterseniz ödev olarak gönderin.' },
      { icon: Shuffle, title: 'Sınıf araçları', text: 'Rastgele öğrenci seçici, grup oluşturma, kronometre ve geri sayım.' },
      { icon: BookOpen, title: 'Okuma yarışması', text: 'Bir dakikada okunan kelime sayısını kaydedin; sıralamayı ve gelişimi izleyin.' },
      { icon: Star, title: 'Artı ve eksi puan', text: 'Derse katılımı ve davranışı puanla ödüllendirin.' },
      { icon: Award, title: 'Puan sıralaması ve sınıf akvaryumu', text: 'Sınıfın puan sırası ve puanla büyüyen balıklar; tam ekranda sınıfa gösterilebilir.' },
      { icon: TrendingUp, title: 'Not girişi', text: 'Yazılı ve sözlü notları sınıf listesi üzerinden girin.' },
      { icon: BarChart3, title: 'Sınıf karnesi', text: 'Not ortalamaları, dağılım ve her öğrencinin gelişimi.' },
      { icon: Folder, title: 'Dosyalar', text: 'Ders materyallerini yükleyin, klasörleyin, etiketleyin ve sınıfla paylaşın.' },
      { icon: MessageSquare, title: 'Mesajlar', text: 'Öğrencilerle birebir yazışın; sınıf grubuna toplu mesaj gönderin.' },
      { icon: Users, title: 'Öğrenci ve sınıf yönetimi', text: 'Öğrenci ekleyin, düzenleyin, giriş PIN’lerini yönetin; ders verdiğiniz sınıfları seçin.' },
      { icon: ShieldCheck, title: 'Veli onayları', text: 'İmzalı KVKK onay formu gelen öğrencileri işaretleyin.' },
      { icon: Globe, title: 'Öğretmen topluluğu', text: 'Diğer öğretmenlerin paylaştığı tahta ve soru setlerini inceleyin, kendinizinkileri paylaşın.' },
    ],
  },
  {
    id: 'ogrenci',
    title: 'Öğrenciler için',
    lead: 'Öğrenci okul numarası ve PIN ile girer. Aileler de çocuklarının hesabından aynı bilgileri takip eder.',
    features: [
      { icon: FileText, title: 'Ödevler', text: 'Verilen ödevleri görün, teslim edin ve kontrol sonucunu izleyin.' },
      { icon: Folder, title: 'Ders materyalleri', text: 'Öğretmenlerin paylaştığı dosyalara ulaşın.' },
      { icon: TrendingUp, title: 'Notlar', text: 'Yazılı, sözlü ve performans notları.' },
      { icon: BookOpen, title: 'Okuma yarışması', text: 'Okuma hızınız, sıranız ve gelişiminiz.' },
      { icon: Star, title: 'Puanlar ve sınıf sırası', text: 'Artı ve eksi puan geçmişi ile sınıftaki sıra.' },
      { icon: Fish, title: 'Sınıf akvaryumu', text: 'Puan kazandıkça büyüyen balık.' },
      { icon: BarChart3, title: 'Gelişimim', text: 'Puan ve notların zaman içindeki değişimi.' },
      { icon: MessageSquare, title: 'Mesajlar', text: 'Öğretmenlere yazın, sınıf grubundaki mesajları okuyun.' },
      { icon: Bell, title: 'Duyurular', text: 'Okuldan gelen duyurular.' },
    ],
  },
  {
    id: 'okul',
    title: 'Okul yönetimi için',
    lead: 'Okul yöneticisi, okulundaki öğretmen hesaplarını ve sınıfları yönetir.',
    features: [
      { icon: ShieldCheck, title: 'Öğretmen onayı', text: 'Kayıt olan öğretmenlerin hesabı okul yönetimi onayladıktan sonra açılır.' },
      { icon: School, title: 'Sınıflar', text: 'Okuldaki bütün sınıfları tek yerden görün ve düzenleyin.' },
      { icon: Building, title: 'Kampüsler', text: 'Birden çok kampüsü olan okullar için kampüs yönetimi.' },
      { icon: Bell, title: 'Okul duyuruları', text: 'Okul duyuruları öğretmenlerin ve öğrencilerin panelinde görünür.' },
    ],
  },
];

export default function OzelliklerPage() {
  return (
    <SitePage
      wide
      title="Özellikler"
      lead="tofutr.com; ödevi, dersi, puanı, notu ve iletişimi öğretmenle öğrenci için aynı yerde toplar. Telefonda ve bilgisayarda tarayıcıdan çalışır, telefonun ana ekranına eklenebilir."
    >
      <ul className={styles.jump} aria-label="Bölümler">
        {GROUPS.map((group) => (
          <li key={group.id}><a href={`#${group.id}`}>{group.title}</a></li>
        ))}
      </ul>

      {GROUPS.map((group) => (
        <section key={group.id} id={group.id} className={`${styles.panel} ${styles.anchor}`} aria-labelledby={`${group.id}-baslik`}>
          <h2 id={`${group.id}-baslik`}>{group.title}</h2>
          <p className={styles.panelLead}>{group.lead}</p>
          <ul className={`${styles.rows} ${styles.twoColumns}`}>
            {group.features.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className={styles.rowIcon} aria-hidden="true"><Icon size={20} /></span>
                <div className={styles.rowText}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className={styles.actions}>
        <Link className={styles.btnPrimary} href="/giris#kayit">Öğretmen hesabı oluştur</Link>
        <Link className={styles.btnSecondary} href="/yardim">Nasıl başlanır?</Link>
      </div>
    </SitePage>
  );
}
