export interface Student {
  id: string;
  name: string;
  studentNo: string;
  class: string;
  school: string;
  teacher: string;
  avatar: string;
  gpa: number;
  rank: number;
  totalStudents: number;
  parentName: string;
  term: string;
  attendance: {
    totalDays: number;
    attendedDays: number;
    absentDays: number;
    lateDays: number;
  };
  homeworkSummary: {
    total: number;
    completed: number;
    pending: number;
    late: number;
  };
}

export type UserRole = 'veli' | 'ogretmen' | 'ogrenci' | 'admin';

export interface UserAccount {
  id: string;
  role: UserRole;
  name: string;
  emailOrPhone: string;
  studentNo?: string;
  studentName?: string;
  pin?: string; // Öğrenci / Veli için 4 haneli PIN
  password?: string;
  branch?: string;
  city?: string;
  district?: string;
  schoolName?: string;
  className?: string;
  avatar: string;
  title: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  grade: string;
  branch: string;
  room: string;
  studentCount: number;
  capacity: number;
  averageScore: number;
  joinCode: string;
  description: string;
  createdAt: string;
  isHomeroom?: boolean;
}

export interface TeacherProfile {
  id: string;
  name: string;
  branch: string;
  classes: string[];
  homeroomClass: string;
  email: string;
  avatar: string;
}

/** Oturum yokken gösterilen boş öğretmen şablonu (örnek veri değil) */
export const CURRENT_TEACHER: TeacherProfile = {
  id: '',
  name: 'Kayıtlı Öğretmen Yok',
  branch: 'Branş Atanmadı',
  classes: [],
  homeroomClass: 'Yok',
  email: '',
  avatar: 'ÖĞ',
};

// ========================================================
// OKUL KADEMELERİ, SINIF SEVİYELERİ, ŞUBELER VE BRANŞLAR (MEB)
// Kayıt, öğrenci ekleme ve öğretmen düzenleme ekranlarında ortak kullanılır.
// ========================================================
export const CLASS_LEVEL_GROUPS: { label: string; levels: string[] }[] = [
  { label: 'Okul öncesi', levels: ['Anaokulu', 'Anasınıfı'] },
  { label: 'İlkokul', levels: ['1', '2', '3', '4'] },
  { label: 'Ortaokul', levels: ['5', '6', '7', '8'] },
  { label: 'Lise', levels: ['Hazırlık', '9', '10', '11', '12'] },
];

// Türk alfabesinin 29 harfi (e-Okul şube adlandırmasıyla uyumlu)
export const CLASS_SECTIONS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L',
  'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z',
];

/** Seviye listesinde gösterilecek ad: '3' → '3. sınıf' */
export const classLevelLabel = (level: string) => (/^\d+$/.test(level) ? `${level}. sınıf` : level);

/** Seviye + şube → kayıtlı sınıf adı: ('3','A') → '3-A', ('Anasınıfı','B') → 'Anasınıfı-B' */
export const composeClassName = (level: string, section: string) =>
  level ? (section ? `${level}-${section}` : level) : '';

/** Kayıtlı sınıf adını seviye ve şubeye ayırır: '3-A' → { level: '3', section: 'A' } */
export const parseClassName = (className?: string | null) => {
  const [level = '', section = ''] = (className || '').split('-');
  const knownLevel = CLASS_LEVEL_GROUPS.some((g) => g.levels.includes(level));
  return knownLevel ? { level, section: CLASS_SECTIONS.includes(section) ? section : '' } : { level: '', section: '' };
};

// MEB branşları (okul öncesi → ilkokul → ortaokul → lise)
export const TEACHER_BRANCH_OPTIONS = [
  'Okul Öncesi (Anaokulu)',
  'Sınıf Öğretmenliği',
  'Türkçe',
  'Matematik',
  'Fen Bilimleri',
  'Sosyal Bilgiler',
  'İngilizce',
  'Almanca',
  'Arapça',
  'Din Kültürü ve Ahlak Bilgisi',
  'Bilişim Teknolojileri ve Yazılım',
  'Teknoloji ve Tasarım',
  'Görsel Sanatlar',
  'Müzik',
  'Beden Eğitimi ve Spor',
  'Rehberlik ve Psikolojik Danışmanlık',
  'Özel Eğitim',
  'Türk Dili ve Edebiyatı',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Diğer',
];


// Türkiye 81 İl ve İlçe Veritabanı
export const TURKEY_CITIES: { [key: string]: string[] } = {
  'Diyarbakır': ['Kayapınar', 'Bağlar', 'Yenişehir', 'Sur', 'Bismil', 'Ergani', 'Silvan', 'Çınar', 'Dicle', 'Kulp', 'Hani', 'Hazro', 'Kocaköy', 'Lice', 'Eğil', 'Çermik', 'Çüngüş'],
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Şişli', 'Bakırköy', 'Maltepe', 'Ataşehir', 'Ümraniye', 'Pendik', 'Kartal', 'Fatih', 'Beylikdüzü', 'Sarıyer', 'Avcılar', 'Başakşehir', 'Esenyurt', 'Küçükçekmece', 'Bağcılar', 'Bahçelievler', 'Zeytinburnu', 'Tuzla', 'Çekmeköy', 'Sancaktepe', 'Eyüpsultan', 'Kağıthane', 'Beyoğlu', 'Silivri', 'Büyükçekmece', 'Arnavutköy'],
  'Ankara': ['Çankaya', 'Yenimahalle', 'Keçiören', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Gölbaşı', 'Pursaklar', 'Polatlı', 'Beypazarı', 'Kahramankazan', 'Çubuk', 'Elmadağ'],
  'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir', 'Karabağlar', 'Bayraklı', 'Menemen', 'Torbalı', 'Kemalpaşa', 'Menderes', 'Aliağa', 'Ödemiş', 'Bergama', 'Tire', 'Urla', 'Çeşme', 'Seferihisar'],
  'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan', 'Kozan', 'İmamoğlu', 'Karataş', 'Pozantı'],
  'Adıyaman': ['Merkez', 'Kahta', 'Besni', 'Gölbaşı', 'Gerger', 'Sincik'],
  'Afyonkarahisar': ['Merkez', 'Sandıklı', 'Dinar', 'Bolvadin', 'Emirdağ', 'Şuhut'],
  'Ağrı': ['Merkez', 'Doğubayazıt', 'Patnos', 'Diyadin', 'Eleşkirt'],
  'Aksaray': ['Merkez', 'Ortaköy', 'Eskil', 'Gülağaç'],
  'Amasya': ['Merkez', 'Merzifon', 'Suluova', 'Taşova'],
  'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Manavgat', 'Alanya', 'Serik', 'Döşemealtı', 'Kumluca', 'Kaş', 'Korkuteli', 'Gazipaşa', 'Finike'],
  'Ardahan': ['Merkez', 'Göle', 'Çıldır'],
  'Artvin': ['Merkez', 'Hopa', 'Borçka', 'Arhavi', 'Yusufeli', 'Şavşat'],
  'Aydın': ['Efeler', 'Nazilli', 'Söke', 'Kuşadası', 'Didim', 'İncirliova', 'Çine'],
  'Balıkesir': ['Karesi', 'Altıeylül', 'Bandırma', 'Edremit', 'Gönen', 'Ayvalık', 'Burhaniye', 'Susurluk'],
  'Bartın': ['Merkez', 'Ulus', 'Amasra'],
  'Batman': ['Merkez', 'Kozluk', 'Sason', 'Beşiri', 'Gercüş', 'Hasankeyf'],
  'Bayburt': ['Merkez', 'Demirözü', 'Aydıntepe'],
  'Bilecik': ['Merkez', 'Bozüyük', 'Osmaneli', 'Söğüt'],
  'Bingöl': ['Merkez', 'Genç', 'Solhan', 'Karlıova'],
  'Bitlis': ['Merkez', 'Tatvan', 'Ahlat', 'Güroymak', 'Adilcevaz'],
  'Bolu': ['Merkez', 'Gerede', 'Mudurnu', 'Göynük', 'Mengen'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya', 'Gürsu', 'Kestel', 'Karacabey', 'Mustafakemalpaşa'],
  'Çanakkale': ['Merkez', 'Biga', 'Çan', 'Gelibolu', 'Ayvacık', 'Yenice'],
  'Çankırı': ['Merkez', 'Çerkeş', 'Ilgaz'],
  'Çorum': ['Merkez', 'Sungurlu', 'Osmancık', 'İskilip', 'Alaca'],
  'Denizli': ['Pamukkale', 'Merkezefendi', 'Çivril', 'Acıpayam', 'Tavas', 'Honaz'],
  'Düzce': ['Merkez', 'Akçakoca', 'Kaynaşlı', 'Gölyaka', 'Çilimli'],
  'Edirne': ['Merkez', 'Keşan', 'Uzunköprü', 'İpsala'],
  'Elazığ': ['Merkez', 'Kovancılar', 'Karakoçan', 'Palu', 'Baskil'],
  'Erzincan': ['Merkez', 'Üzümlü', 'Tercan', 'İliç'],
  'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye', 'Oltu', 'Horasan', 'Pasinler'],
  'Eskişehir': ['Odunpazarı', 'Tepebaşı', 'Sivrihisar', 'Çifteler'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye', 'Nurdağı', 'Oğuzeli'],
  'Giresun': ['Merkez', 'Bulancak', 'Espiye', 'Görele', 'Tirebolu'],
  'Gümüşhane': ['Merkez', 'Kelkit', 'Şiran', 'Torul'],
  'Hakkari': ['Merkez', 'Yüksekova', 'Şemdinli', 'Çukurca'],
  'Hatay': ['Antakya', 'İskenderun', 'Defne', 'Dörtyol', 'Samandağ', 'Kırıkhan', 'Reyhanlı', 'Arsuz'],
  'Iğdır': ['Merkez', 'Tuzluca', 'Aralık'],
  'Isparta': ['Merkez', 'Yalvaç', 'Eğirdir', 'Şarkikaraağaç'],
  'Kahramanmaraş': ['Onikişubat', 'Dulkadiroğlu', 'Elbistan', 'Afşin', 'Türkoğlu', 'Pazarcık'],
  'Karabük': ['Merkez', 'Safranbolu', 'Yenice'],
  'Karaman': ['Merkez', 'Ermenek', 'Sarıveliler'],
  'Kars': ['Merkez', 'Kağızman', 'Sarıkamış', 'Digor'],
  'Kastamonu': ['Merkez', 'Tosya', 'Taşköprü', 'Cide', 'İnebolu'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas', 'Develi', 'Yahyalı', 'Bünyan'],
  'Kilis': ['Merkez', 'Musabeyli', 'Elbeyli'],
  'Kırıkkale': ['Merkez', 'Yahşihan', 'Keskin'],
  'Kırklareli': ['Merkez', 'Lüleburgaz', 'Babaeski', 'Vize'],
  'Kırşehir': ['Merkez', 'Kaman', 'Mucur'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Gölcük', 'Körfez', 'Derince', 'Kartepe', 'Çayırova', 'Başiskele', 'Karamürsel'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir', 'Cihanbeyli', 'Kulu', 'Seydişehir'],
  'Kütahya': ['Merkez', 'Tavşanlı', 'Simav', 'Gediz'],
  'Malatya': ['Battalgazi', 'Yeşilyurt', 'Doğanşehir', 'Akçadağ', 'Darende'],
  'Manisa': ['Yunusemre', 'Şehzadeler', 'Akhisar', 'Turgutlu', 'Salihli', 'Soma', 'Alaşehir'],
  'Mardin': ['Artuklu', 'Kızıltepe', 'Midyat', 'Nusaybin', 'Derik', 'Mazıdağı'],
  'Mersin': ['Yenişehir', 'Mezitli', 'Toroslar', 'Akdeniz', 'Tarsus', 'Erdemli', 'Silifke', 'Anamur'],
  'Muğla': ['Menteşe', 'Bodrum', 'Fethiye', 'Milas', 'Marmaris', 'Seydikemer', 'Ortaca'],
  'Muş': ['Merkez', 'Bulanık', 'Malazgirt', 'Varto'],
  'Nevşehir': ['Merkez', 'Ürgüp', 'Avanos', 'Gülşehir'],
  'Niğde': ['Merkez', 'Bor', 'Çiftlik'],
  'Ordu': ['Altınordu', 'Ünye', 'Fatsa', 'Kumru', 'Korgan'],
  'Osmaniye': ['Merkez', 'Kadirli', 'Düziçi', 'Bahçe'],
  'Rize': ['Merkez', 'Çayeli', 'Ardeşen', 'Pazar', 'Fındıklı'],
  'Sakarya': ['Adapazarı', 'Serdivan', 'Akyazı', 'Erenler', 'Hendek', 'Karasu', 'Sapanca'],
  'Samsun': ['İlkadım', 'Atakum', 'Bafra', 'Çarşamba', 'Canik', 'Vezirköprü', 'Terme'],
  'Şanlıurfa': ['Haliliye', 'Eyyübiye', 'Karaköprü', 'Siverek', 'Viranşehir', 'Suruç', 'Birecik', 'Akçakale', 'Ceylanpınar', 'Harran'],
  'Siirt': ['Merkez', 'Kurtalan', 'Pervari', 'Baykan'],
  'Sinop': ['Merkez', 'Boyabat', 'Gerze', 'Ayancık'],
  'Şırnak': ['Merkez', 'Cizre', 'Silopi', 'İdil', 'Uludere'],
  'Sivas': ['Merkez', 'Şarkışla', 'Yıldızeli', 'Suşehri', 'Zara'],
  'Tekirdağ': ['Süleymanpaşa', 'Çorlu', 'Çerkezköy', 'Kapaklı', 'Ergene', 'Malkara'],
  'Tokat': ['Merkez', 'Erbaa', 'Turhal', 'Niksar', 'Zile'],
  'Trabzon': ['Ortahisar', 'Akçaabat', 'Araklı', 'Of', 'Yomra', 'Arsin', 'Vakfıkebir'],
  'Tunceli': ['Merkez', 'Pertek', 'Mazgirt', 'Hozat'],
  'Uşak': ['Merkez', 'Banaz', 'Eşme'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş', 'Özalp', 'Başkale', 'Muradiye'],
  'Yalova': ['Merkez', 'Çiftlikköy', 'Çınarcık', 'Altınova'],
  'Yozgat': ['Merkez', 'Sorgun', 'Akdağmadeni', 'Yerköy'],
  'Zonguldak': ['Merkez', 'Ereğli', 'Çaycuma', 'Devrek', 'Kozlu', 'Kilimli']
};
