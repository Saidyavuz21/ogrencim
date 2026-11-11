/** Herkese açık sayfaların ortak bağlantıları (üst menü ve alt bilgi). */

export interface SiteLink {
  href: string;
  label: string;
}

/** Üst menü: kısa tutulur; diğer sayfalar alt bilgidedir. */
export const SITE_NAV: SiteLink[] = [
  { href: '/ozellikler', label: 'Özellikler' },
  { href: '/hakkinda', label: 'Hakkında' },
  { href: '/topluluk', label: 'Topluluk' },
  { href: '/iletisim', label: 'İletişim' },
];

export const SITE_FOOTER_GROUPS: { title: string; links: SiteLink[] }[] = [
  {
    title: 'Platform',
    links: [
      { href: '/ozellikler', label: 'Özellikler' },
      { href: '/hakkinda', label: 'Sistem hakkında' },
      { href: '/topluluk', label: 'Öğretmen topluluğu' },
    ],
  },
  {
    title: 'Destek',
    links: [
      { href: '/yardim', label: 'Yardım ve sık sorulanlar' },
      { href: '/iletisim', label: 'İletişim' },
    ],
  },
  {
    title: 'Kurallar ve gizlilik',
    links: [
      { href: '/gizlilik', label: 'Gizlilik politikası' },
      { href: '/aydinlatma', label: 'KVKK aydınlatma metni' },
      { href: '/kullanim-kosullari', label: 'Kullanım koşulları' },
      { href: '/topluluk-kurallari', label: 'Topluluk kuralları' },
    ],
  },
];

export const CONTACT_EMAIL = 'iletisim@tofutr.com';
