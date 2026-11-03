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

export type HomeworkType = 'pdf' | 'resim' | 'not' | 'karma';
export type HomeworkCheckStatus = 'yapti' | 'kismen' | 'yapmadi';
export type PointType = 'plus' | 'minus';

export interface HomeworkAttachment {
  id: string;
  type: 'pdf' | 'resim' | 'not';
  name: string;
  size?: string;
  url?: string;
  previewUrl?: string;
  textContent?: string;
}

export interface StudentHomeworkCheck {
  studentId: string;
  studentNo: string;
  studentName: string;
  status: HomeworkCheckStatus;
  score?: number; // Örn: 100, 50, 0 veya öğretmenin girdiği özel puan
  maxScore?: number; // Örn: 100
  note?: string;
}

export interface StudentPointRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNo: string;
  type: PointType; // 'plus' (+) veya 'minus' (-)
  points: number; // Örn: +1 veya -1 (Her artı +1, her eksi -1)
  reason: string; // Örn: "Ders içi aktif katılım & soru çözümü"
  teacherName: string;
  subject: string;
  date: string;
}

export interface StudentPointsSummary {
  studentId: string;
  studentNo: string;
  studentName: string;
  plusCount: number;
  minusCount: number;
  netScore: number;
  history: StudentPointRecord[];
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  teacher: string;
  className?: string;
  assignedDate: string;
  dueDate: string;
  status: 'bekliyor' | 'teslim_edildi' | 'puanlandi';
  priority: 'yuksek' | 'normal' | 'dusuk';
  description: string;
  homeworkType: HomeworkType;
  attachments?: string[];
  attachmentDetails?: HomeworkAttachment[];
  teacherNote?: string;
  studentCheckStatus?: HomeworkCheckStatus;
  studentCheckNote?: string;
  pointsPossible: number;
  score?: number;
  teacherFeedback?: string;
  submittedDate?: string;
  submittedFile?: string;
  remainingDays?: number;
}

export interface CourseGrade {
  id: string;
  subject: string;
  iconName: string;
  color: string;
  teacher: string;
  exam1: number;
  exam2?: number;
  oral1: number;
  oral2?: number;
  project?: number;
  homeworkAvg: number;
  overallAverage: number;
  classAverage: number;
  trend: 'up' | 'down' | 'neutral';
  teacherNote: string;
}

export interface LeaderboardStudent {
  id: string;
  rank: number;
  name: string;
  studentNo: string;
  average: number;
  isCurrentUser: boolean;
  avatarBg: string;
  badge?: string;
  completedHomeworks: number;
  homeworkPoints?: number;
  plusCount?: number;
  minusCount?: number;
  netBehaviorPoints?: number;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  sender: string;
  content: string;
  category: 'duyuru' | 'toplanti' | 'etkinlik';
  priority: 'normal' | 'onemli';
}

export const CURRENT_STUDENT: Student = {
  id: '',
  name: 'Kayıtlı Öğrenci Yok',
  studentNo: '---',
  class: '---',
  school: 'e-Okul Portalı',
  teacher: 'Atanmadı',
  avatar: 'ÖG',
  gpa: 0,
  rank: 0,
  totalStudents: 0,
  parentName: 'Veli',
  term: '2026-2027 Eğitim Öğretim Yılı',
  attendance: {
    totalDays: 0,
    attendedDays: 0,
    absentDays: 0,
    lateDays: 0,
  },
  homeworkSummary: {
    total: 0,
    completed: 0,
    pending: 0,
    late: 0,
  },
};

export const ASSIGNMENTS: Assignment[] = [];

export const COURSE_GRADES: CourseGrade[] = [];

export const LEADERBOARD_STUDENTS: LeaderboardStudent[] = [];

export const ANNOUNCEMENTS: Announcement[] = [];


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

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin-1',
    role: 'admin',
    name: 'Said Yavuz',
    emailOrPhone: 'saidyvz21@gmail.com',
    password: 'Syv848112.',
    avatar: 'SY',
    title: 'Süper Admin & Sistem Yöneticisi',
  },
];


export interface TeacherProfile {
  id: string;
  name: string;
  branch: string;
  classes: string[];
  homeroomClass: string;
  email: string;
  avatar: string;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  studentNo: string;
  className: string;
  submittedDate: string;
  submittedFile: string;
  status: 'bekliyor' | 'puanlandi';
  score?: number;
  teacherFeedback?: string;
}

export interface ParentMessage {
  id: string;
  parentName: string;
  studentName: string;
  studentNo: string;
  className: string;
  date: string;
  topic: string;
  message: string;
  status: 'yanitlandi' | 'bekliyor';
  reply?: string;
  replyDate?: string;
}

export interface TeacherChatContact {
  id: string;
  name: string;
  subject: string;
  roleTitle: string;
  avatar: string;
  avatarBg: string;
  status: 'online' | 'offline' | 'away';
  statusText: string;
  phone: string;
  officeHours: string;
  unreadCount?: number;
  isGroup?: boolean;
  memberCount?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string; // teacherId veya 'grp-7b'
  senderId: string; // 'parent-ahmet' veya 'tch-zehra'
  senderRole: 'veli' | 'ogretmen';
  senderName: string;
  senderBadge?: string; // örn. "Sınıf Rehber Öğretmeni" veya "Emre Demir Velisi"
  text: string;
  timestamp: string; // örn: "Bugün 09:10"
  timeOnly: string; // örn: "09:10"
  isRead: boolean;
  isDelivered: boolean;
  attachment?: {
    type: 'resim' | 'pdf' | 'belge';
    name: string;
    size?: string;
  };
  voiceNote?: {
    duration: string; // örn: "0:24"
    audioText?: string;
  };
  reactions?: { [emoji: string]: number };
}

export interface BulkMessage {
  id: string;
  senderName: string;
  senderTitle: string;
  className: string;
  title: string;
  content: string;
  date: string;
  recipientType: 'tum_sinif' | 'secili' | 'odev_bekleyen';
  recipientCount: number;
  totalRecipients: number;
  channels: ('portal' | 'sms')[];
  priority: 'normal' | 'onemli' | 'acil';
  attachmentName?: string;
  status: 'gonderildi' | 'taslak';
}

export interface SchoolClass {
  id: string;
  name: string;
  homeroomTeacher: string;
  studentCount: number;
  averageScore: number;
  attendanceRate: number;
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

export interface TeacherListItem {
  id: string;
  name: string;
  email?: string;
  password?: string;
  schoolName?: string;
  city?: string;
  district?: string;
  branch: string;
  homeroomClass?: string;
  classes: string[];
  studentCount: number;
  phone: string;
}

export const CURRENT_TEACHER: TeacherProfile = {
  id: '',
  name: 'Kayıtlı Öğretmen Yok',
  branch: 'Branş Atanmadı',
  classes: [],
  homeroomClass: 'Yok',
  email: '',
  avatar: 'ÖĞ',
};

export const INITIAL_TEACHER_CLASSES: TeacherClass[] = [];

export interface HomeworkCheckRecord {
  status: HomeworkCheckStatus;
  score?: number; // Her ödev bir puan olacak (0-100 veya özel puan)
  maxScore?: number;
  note?: string;
}

export const INITIAL_HOMEWORK_CHECKS: { [studentId: string]: HomeworkCheckRecord } = {};

export const INITIAL_STUDENT_POINTS: { [studentId: string]: StudentPointsSummary } = {};

export const getStudentPointsSummary = (
  pointsMap: { [studentId: string]: StudentPointsSummary },
  studentId: string,
  name?: string,
  no?: string
): StudentPointsSummary => {
  if (pointsMap[studentId]) return pointsMap[studentId];
  return {
    studentId,
    studentNo: no || '---',
    studentName: name || 'Öğrenci',
    plusCount: 0,
    minusCount: 0,
    netScore: 0,
    history: [],
  };
};


export const INITIAL_SUBMISSIONS: StudentSubmission[] = [];

export const INITIAL_PARENT_MESSAGES: ParentMessage[] = [];

export const TEACHER_CONTACTS: TeacherChatContact[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_BULK_MESSAGES: BulkMessage[] = [];

export const SCHOOL_CLASSES: SchoolClass[] = [];

export const TEACHER_LIST: TeacherListItem[] = [];


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
