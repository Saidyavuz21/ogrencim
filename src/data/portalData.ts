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
  id: 'ogr-452',
  name: 'Emre Demir',
  studentNo: '452',
  class: '7-B',
  school: 'Atatürk Bilim ve Sanat Ortaokulu',
  teacher: 'Zehra Aydın (Türkçe & Sınıf Rehber Öğrt.)',
  avatar: 'ED',
  gpa: 91.4,
  rank: 3,
  totalStudents: 28,
  parentName: 'Ahmet Demir (Veli)',
  term: '2026-2027 Eğitim Öğretim Yılı 1. Dönem',
  attendance: {
    totalDays: 38,
    attendedDays: 36,
    absentDays: 2,
    lateDays: 1,
  },
  homeworkSummary: {
    total: 24,
    completed: 21,
    pending: 2,
    late: 1,
  },
};

export const ASSIGNMENTS: Assignment[] = [
  {
    id: 'hw-1',
    title: 'Doğrusal Denklemler ve Koordinat Sistemi Alıştırmaları',
    subject: 'Matematik',
    subjectColor: 'from-blue-600 to-indigo-600',
    teacher: 'Mehmet Yılmaz',
    className: '7-B',
    assignedDate: '28 Ekim 2026',
    dueDate: '2 Kasım 2026',
    status: 'bekliyor',
    priority: 'yuksek',
    homeworkType: 'pdf',
    description: 'Ders kitabı sayfa 112-115 arasındaki 15 adet alıştırma çözülecek. Grafik çizimleri mutlaka kareli deftere cetvelle yapılmalıdır.',
    attachments: ['Dogrusal_Denklemler_Ek_Calisma_7B.pdf'],
    attachmentDetails: [
      {
        id: 'att-1',
        type: 'pdf',
        name: 'Dogrusal_Denklemler_Ek_Calisma_7B.pdf',
        size: '2.4 MB',
      },
    ],
    pointsPossible: 100,
    remainingDays: 2,
    studentCheckStatus: 'yapti',
    studentCheckNote: 'Tüm sorular çözülü, koordinat çizimleri cetvelle yapılmış.',
  },
  {
    id: 'hw-2',
    title: 'Unit 3: Biographies - Görsel Poster ve Şema İncelemesi',
    subject: 'İngilizce',
    subjectColor: 'from-purple-600 to-pink-600',
    teacher: 'Selin Kaya',
    className: '7-B',
    assignedDate: '30 Ekim 2026',
    dueDate: '5 Kasım 2026',
    status: 'bekliyor',
    priority: 'normal',
    homeworkType: 'resim',
    description: 'Eklenen görsel şemadaki Aziz Sancar biyografi infografiğini inceleyip, 5 anahtar soruya İngilizce tam cümlelerle yanıt hazırlayınız.',
    attachments: ['Aziz_Sancar_Biyografi_Infografik.png'],
    attachmentDetails: [
      {
        id: 'att-2',
        type: 'resim',
        name: 'Aziz_Sancar_Biyografi_Infografik.png',
        size: '1.2 MB',
        previewUrl: '/sample-diagram.png',
      },
    ],
    pointsPossible: 100,
    remainingDays: 5,
    studentCheckStatus: 'yapti',
    studentCheckNote: 'Poster şablonu incelendi, sorular hazır.',
  },
  {
    id: 'hw-3',
    title: 'Hücre Bölünmesi ve Mitoz Aşamaları Deney Raporu',
    subject: 'Fen Bilimleri',
    subjectColor: 'from-emerald-600 to-teal-600',
    teacher: 'Fatma Şahin',
    className: '7-B',
    assignedDate: '22 Ekim 2026',
    dueDate: '29 Ekim 2026',
    status: 'puanlandi',
    priority: 'normal',
    homeworkType: 'not',
    description: 'Laboratuvar mikroskop incelemesi deney raporu ve öğretmen yönergesi.',
    teacherNote: 'Laboratuvarda mikroskop altında incelediğimiz soğan zarı hücrelerindeki profaz, metafaz ve anafaz safhalarını fen defterinize renkli kalemlerle çiziniz. Sitoplazma bölünmesinin hayvan hücresinden farkını 3 maddede özetleyiniz.',
    pointsPossible: 100,
    score: 95,
    teacherFeedback: 'Harika bir rapor Emre! Mitozun anafaz ve telofaz çizimleri son derece detaylı ve açıklamaların çok net. Tebrik ederim.',
    submittedDate: '28 Ekim 2026 20:15',
    submittedFile: 'Emre_Demir_Fen_Deney_Raporu.pdf',
    studentCheckStatus: 'yapti',
    studentCheckNote: 'Tüm aşamalar doğru çizilmiş, açıklama eksiksiz.',
  },
  {
    id: 'hw-4',
    title: 'Deyimler ve Atasözleri ile Kompozisyon',
    subject: 'Türkçe',
    subjectColor: 'from-amber-500 to-orange-600',
    teacher: 'Zehra Aydın',
    className: '7-B',
    assignedDate: '24 Ekim 2026',
    dueDate: '31 Ekim 2026',
    status: 'teslim_edildi',
    priority: 'normal',
    homeworkType: 'karma',
    description: 'İçerisinde en az 3 deyim ve 2 atasözü geçen serbest kompozisyon yazısı.',
    attachments: ['Kompozisyon_Yazma_Rehberi.pdf', 'Deyimler_Gorsel_Kartlar.png'],
    attachmentDetails: [
      {
        id: 'att-4a',
        type: 'pdf',
        name: 'Kompozisyon_Yazma_Rehberi.pdf',
        size: '1.8 MB',
      },
      {
        id: 'att-4b',
        type: 'resim',
        name: 'Deyimler_Gorsel_Kartlar.png',
        size: '850 KB',
      },
    ],
    teacherNote: 'Eklenen görsel kartlardaki deyimlerden en az üçünü olay örgüsü içerisinde mantıksal bir bütünlükle kullanınız.',
    pointsPossible: 100,
    teacherFeedback: 'Ödev zamanında teslim alındı. Değerlendirme süreci devam ediyor.',
    submittedDate: '30 Ekim 2026 18:40',
    submittedFile: 'Emre_Demir_Turkce_Kompozisyon.pdf',
    studentCheckStatus: 'yapti',
    studentCheckNote: 'Zamanında teslim, özenli yazı ve doğru deyim kullanımı.',
  },
  {
    id: 'hw-5',
    title: 'Milli Mücadele Dönemi Kronoloji Şeridi',
    subject: 'Sosyal Bilgiler',
    subjectColor: 'from-rose-600 to-red-600',
    teacher: 'Ali Çetin',
    className: '7-B',
    assignedDate: '16 Ekim 2026',
    dueDate: '23 Ekim 2026',
    status: 'puanlandi',
    priority: 'normal',
    homeworkType: 'resim',
    description: 'Derste tahtaya çıkarılan kronolojik tarih şeridinin deftere aktarımı ve genel değerlendirmesi.',
    attachments: ['Milli_Mucadele_Tahta_Fotoğrafı.jpg'],
    attachmentDetails: [
      {
        id: 'att-5',
        type: 'resim',
        name: 'Milli_Mucadele_Tahta_Fotoğrafı.jpg',
        size: '2.8 MB',
      },
    ],
    pointsPossible: 100,
    score: 92,
    teacherFeedback: 'Zaman şeridindeki görsel seçimlerin ve tarihsel sıra doğruluğun çok başarılı. Kongre kararları özetin çok temiz.',
    submittedDate: '22 Ekim 2026 16:30',
    submittedFile: 'Milli_Mucadele_Zaman_Seridi.pdf',
    studentCheckStatus: 'kismen',
    studentCheckNote: 'Son 2 kongre tarihi eksik tamamlanmış.',
  },
  {
    id: 'hw-6',
    title: 'Ahlaki Değerler ve Sosyal Sorumluluk Örnek Olay Analizi',
    subject: 'Din Kültürü',
    subjectColor: 'from-cyan-600 to-blue-600',
    teacher: 'Hasan Yurt',
    className: '7-B',
    assignedDate: '10 Ekim 2026',
    dueDate: '17 Ekim 2026',
    status: 'puanlandi',
    priority: 'dusuk',
    homeworkType: 'not',
    description: 'Yardımlaşma ve infak kültürünün toplumsal huzura etkisini anlatan araştırma notu.',
    teacherNote: 'Ailenizle veya mahallenizde gözlemlediğiniz bir yardımlaşma örneğini (Ramazan kolisi, askıda ekmek, sadaka taşı vb.) 1 sayfa olarak analiz edip cuma gününe kadar sisteme yükleyiniz.',
    pointsPossible: 100,
    score: 98,
    teacherFeedback: 'Çok samimi ve derinlikli bir araştırma. Örnek olay seçimlerin çok yerinde.',
    submittedDate: '16 Ekim 2026 19:10',
    submittedFile: 'Sosyal_Sorumluluk_Analiz.pdf',
    studentCheckStatus: 'yapti',
    studentCheckNote: 'Örnek olay analizi eksiksiz ve derinlikli.',
  },
];

export const COURSE_GRADES: CourseGrade[] = [
  {
    id: 'grd-mat',
    subject: 'Matematik',
    iconName: 'Calculator',
    color: 'border-l-blue-600 text-blue-600 bg-blue-50/50',
    teacher: 'Mehmet Yılmaz',
    exam1: 88,
    exam2: 92,
    oral1: 95,
    oral2: 90,
    project: 95,
    homeworkAvg: 96,
    overallAverage: 92.4,
    classAverage: 73.8,
    trend: 'up',
    teacherNote: 'Problem çözme yeteneği çok güçlü. Yazılı sınavlarda işlem hatasını en aza indirdiğinde rahatlıkla 100 seviyesine çıkacaktır.',
  },
  {
    id: 'grd-turk',
    subject: 'Türkçe',
    iconName: 'BookOpen',
    color: 'border-l-amber-600 text-amber-600 bg-amber-50/50',
    teacher: 'Zehra Aydın',
    exam1: 90,
    exam2: 95,
    oral1: 100,
    oral2: 95,
    project: 98,
    homeworkAvg: 94,
    overallAverage: 94.6,
    classAverage: 78.2,
    trend: 'up',
    teacherNote: 'Kitap okuma sevgisi ve metin tahlili çok üst seviyede. Paragraf sorularında ve kompozisyonlarda sınıfın en başarılı öğrencileri arasında.',
  },
  {
    id: 'grd-fen',
    subject: 'Fen Bilimleri',
    iconName: 'FlaskConical',
    color: 'border-l-emerald-600 text-emerald-600 bg-emerald-50/50',
    teacher: 'Fatma Şahin',
    exam1: 94,
    exam2: 88,
    oral1: 90,
    oral2: 95,
    homeworkAvg: 95,
    overallAverage: 91.8,
    classAverage: 75.4,
    trend: 'neutral',
    teacherNote: 'Deney derslerindeki dikkati ve grup çalışmasındaki liderliği çok kıymetli. Kavram yanılgılarına düşmüyor.',
  },
  {
    id: 'grd-sos',
    subject: 'Sosyal Bilgiler',
    iconName: 'Globe',
    color: 'border-l-rose-600 text-rose-600 bg-rose-50/50',
    teacher: 'Ali Çetin',
    exam1: 86,
    exam2: 90,
    oral1: 90,
    oral2: 92,
    homeworkAvg: 92,
    overallAverage: 89.2,
    classAverage: 76.0,
    trend: 'up',
    teacherNote: 'Tarihî olayları analiz etme ve neden-sonuç bağı kurma konusunda çok yetenekli. Ders içi katılımı yüksek.',
  },
  {
    id: 'grd-ing',
    subject: 'İngilizce',
    iconName: 'Languages',
    color: 'border-l-purple-600 text-purple-600 bg-purple-50/50',
    teacher: 'Selin Kaya',
    exam1: 85,
    exam2: 90,
    oral1: 92,
    oral2: 90,
    homeworkAvg: 90,
    overallAverage: 88.6,
    classAverage: 71.5,
    trend: 'up',
    teacherNote: 'Kelime haznesi çok zenginleşti. Konuşma pratiklerinde daha cesur olması dil gelişimini daha da hızlandıracaktır.',
  },
  {
    id: 'grd-din',
    subject: 'Din Kültürü ve Ahlak Bilgisi',
    iconName: 'HeartHandshake',
    color: 'border-l-teal-600 text-teal-600 bg-teal-50/50',
    teacher: 'Hasan Yurt',
    exam1: 96,
    exam2: 94,
    oral1: 100,
    oral2: 95,
    homeworkAvg: 98,
    overallAverage: 96.2,
    classAverage: 82.3,
    trend: 'neutral',
    teacherNote: 'Tavırları, arkadaşlarına saygısı ve ders ilgisiyle tüm öğretmenlerinin takdirini toplayan örnek bir öğrenci.',
  },
];

export const LEADERBOARD_STUDENTS: LeaderboardStudent[] = [
  {
    id: 'ogr-101',
    rank: 1,
    name: 'Elifnaz Yıldız',
    studentNo: '312',
    average: 95.2,
    isCurrentUser: false,
    avatarBg: 'bg-amber-100 text-amber-700 border-amber-300',
    badge: '🥇 Sınıf 1.si',
    completedHomeworks: 24,
    homeworkPoints: 98,
    plusCount: 7,
    minusCount: 0,
    netBehaviorPoints: 7,
  },
  {
    id: 'ogr-102',
    rank: 2,
    name: 'Kaan Öztürk',
    studentNo: '189',
    average: 93.1,
    isCurrentUser: false,
    avatarBg: 'bg-slate-200 text-slate-700 border-slate-300',
    badge: '🥈 Sınıf 2.si',
    completedHomeworks: 23,
    homeworkPoints: 96,
    plusCount: 6,
    minusCount: 1,
    netBehaviorPoints: 5,
  },
  {
    id: 'ogr-452',
    rank: 3,
    name: 'Emre Demir',
    studentNo: '452',
    average: 91.4,
    isCurrentUser: true, // BU KENDİ ÖĞRENCİSİ - BELİRGİN YAPILACAK
    avatarBg: 'bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-200',
    badge: '👑 SİZİN ÖĞRENCİNİZ',
    completedHomeworks: 21,
    homeworkPoints: 94,
    plusCount: 5,
    minusCount: 1,
    netBehaviorPoints: 4,
  },
  {
    id: 'ogr-104',
    rank: 4,
    name: 'Beren Su Aksoy',
    studentNo: '504',
    average: 89.8,
    isCurrentUser: false,
    avatarBg: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    badge: 'İlk 5 Öğrenci',
    completedHomeworks: 22,
    homeworkPoints: 92,
    plusCount: 4,
    minusCount: 0,
    netBehaviorPoints: 4,
  },
  {
    id: 'ogr-105',
    rank: 5,
    name: 'Burak Çelik',
    studentNo: '241',
    average: 88.5,
    isCurrentUser: false,
    avatarBg: 'bg-blue-100 text-blue-700 border-blue-300',
    badge: 'İlk 5 Öğrenci',
    completedHomeworks: 20,
    homeworkPoints: 89,
    plusCount: 4,
    minusCount: 1,
    netBehaviorPoints: 3,
  },
  {
    id: 'ogr-106',
    rank: 6,
    name: 'Ayşe Nur Yılmaz',
    studentNo: '115',
    average: 87.2,
    isCurrentUser: false,
    avatarBg: 'bg-rose-100 text-rose-700 border-rose-300',
    completedHomeworks: 21,
    homeworkPoints: 88,
    plusCount: 4,
    minusCount: 0,
    netBehaviorPoints: 4,
  },
  {
    id: 'ogr-107',
    rank: 7,
    name: 'Caner Arslan',
    studentNo: '377',
    average: 86.4,
    isCurrentUser: false,
    avatarBg: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    completedHomeworks: 19,
    homeworkPoints: 85,
    plusCount: 3,
    minusCount: 1,
    netBehaviorPoints: 2,
  },
  {
    id: 'ogr-108',
    rank: 8,
    name: 'Duru Aydın',
    studentNo: '420',
    average: 85.1,
    isCurrentUser: false,
    avatarBg: 'bg-violet-100 text-violet-700 border-violet-300',
    completedHomeworks: 20,
    homeworkPoints: 87,
    plusCount: 4,
    minusCount: 0,
    netBehaviorPoints: 4,
  },
  {
    id: 'ogr-109',
    rank: 9,
    name: 'Mert Kerem Şen',
    studentNo: '280',
    average: 84.6,
    isCurrentUser: false,
    avatarBg: 'bg-amber-100 text-amber-700 border-amber-300',
    completedHomeworks: 18,
    homeworkPoints: 82,
    plusCount: 2,
    minusCount: 2,
    netBehaviorPoints: 0,
  },
  {
    id: 'ogr-110',
    rank: 10,
    name: 'Zeynep Defne Koç',
    studentNo: '166',
    average: 83.9,
    isCurrentUser: false,
    avatarBg: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300',
    completedHomeworks: 20,
    homeworkPoints: 86,
    plusCount: 5,
    minusCount: 0,
    netBehaviorPoints: 5,
  },
  {
    id: 'ogr-111',
    rank: 11,
    name: 'Arda Korkmaz',
    studentNo: '542',
    average: 82.5,
    isCurrentUser: false,
    avatarBg: 'bg-teal-100 text-teal-700 border-teal-300',
    completedHomeworks: 19,
  },
  {
    id: 'ogr-112',
    rank: 12,
    name: 'İrem Naz Tunç',
    studentNo: '390',
    average: 81.7,
    isCurrentUser: false,
    avatarBg: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    completedHomeworks: 18,
  },
  {
    id: 'ogr-113',
    rank: 13,
    name: 'Yusuf Enes Karaca',
    studentNo: '488',
    average: 80.4,
    isCurrentUser: false,
    avatarBg: 'bg-slate-100 text-slate-700 border-slate-300',
    completedHomeworks: 17,
  },
  {
    id: 'ogr-114',
    rank: 14,
    name: 'Ecrin Polat',
    studentNo: '215',
    average: 79.8,
    isCurrentUser: false,
    avatarBg: 'bg-pink-100 text-pink-700 border-pink-300',
    completedHomeworks: 18,
  },
  {
    id: 'ogr-115',
    rank: 15,
    name: 'Hakan Güven',
    studentNo: '333',
    average: 78.2,
    isCurrentUser: false,
    avatarBg: 'bg-lime-100 text-lime-700 border-lime-300',
    completedHomeworks: 16,
  },
  {
    id: 'ogr-116',
    rank: 16,
    name: 'Selin Doğan',
    studentNo: '144',
    average: 77.5,
    isCurrentUser: false,
    avatarBg: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    completedHomeworks: 17,
  },
  {
    id: 'ogr-117',
    rank: 17,
    name: 'Barış Yaman',
    studentNo: '298',
    average: 76.1,
    isCurrentUser: false,
    avatarBg: 'bg-sky-100 text-sky-700 border-sky-300',
    completedHomeworks: 15,
  },
  {
    id: 'ogr-118',
    rank: 18,
    name: 'Ceren Balcı',
    studentNo: '412',
    average: 75.3,
    isCurrentUser: false,
    avatarBg: 'bg-orange-100 text-orange-700 border-orange-300',
    completedHomeworks: 16,
  },
  {
    id: 'ogr-119',
    rank: 19,
    name: 'Efe Alkan',
    studentNo: '561',
    average: 74.0,
    isCurrentUser: false,
    avatarBg: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    completedHomeworks: 15,
  },
  {
    id: 'ogr-120',
    rank: 20,
    name: 'Yağmur Tan',
    studentNo: '178',
    average: 73.2,
    isCurrentUser: false,
    avatarBg: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    completedHomeworks: 14,
  },
  {
    id: 'ogr-121',
    rank: 21,
    name: 'Batuhan Erdem',
    studentNo: '354',
    average: 71.8,
    isCurrentUser: false,
    avatarBg: 'bg-purple-100 text-purple-700 border-purple-300',
    completedHomeworks: 13,
  },
  {
    id: 'ogr-122',
    rank: 22,
    name: 'Miraç Öz',
    studentNo: '229',
    average: 70.4,
    isCurrentUser: false,
    avatarBg: 'bg-stone-100 text-stone-700 border-stone-300',
    completedHomeworks: 14,
  },
  {
    id: 'ogr-123',
    rank: 23,
    name: 'Ela Nur Keskin',
    studentNo: '467',
    average: 69.1,
    isCurrentUser: false,
    avatarBg: 'bg-rose-100 text-rose-700 border-rose-300',
    completedHomeworks: 12,
  },
  {
    id: 'ogr-124',
    rank: 24,
    name: 'Umut Kılıç',
    studentNo: '190',
    average: 67.8,
    isCurrentUser: false,
    avatarBg: 'bg-red-100 text-red-700 border-red-300',
    completedHomeworks: 11,
  },
  {
    id: 'ogr-125',
    rank: 25,
    name: 'Deniz Gök',
    studentNo: '315',
    average: 66.5,
    isCurrentUser: false,
    avatarBg: 'bg-teal-100 text-teal-700 border-teal-300',
    completedHomeworks: 10,
  },
  {
    id: 'ogr-126',
    rank: 26,
    name: 'Pelin Varol',
    studentNo: '502',
    average: 65.0,
    isCurrentUser: false,
    avatarBg: 'bg-blue-100 text-blue-700 border-blue-300',
    completedHomeworks: 12,
  },
  {
    id: 'ogr-127',
    rank: 27,
    name: 'Serkan Özer',
    studentNo: '277',
    average: 63.4,
    isCurrentUser: false,
    avatarBg: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    completedHomeworks: 9,
  },
  {
    id: 'ogr-128',
    rank: 28,
    name: 'Gizem Sezer',
    studentNo: '143',
    average: 61.2,
    isCurrentUser: false,
    avatarBg: 'bg-slate-100 text-slate-700 border-slate-300',
    completedHomeworks: 8,
  },
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '1. Dönem Veli Toplantısı Bildirimi',
    date: '31 Ekim 2026',
    sender: 'Okul Yönetimi',
    category: 'toplanti',
    priority: 'onemli',
    content: 'Değerli Velilerimiz; 1. Dönem ara değerlendirme ve genel veli bilgilendirme toplantımız 8 Kasım 2026 Pazar günü saat 11:00\'da 7-B sınıf salonumuzda gerçekleştirilecektir. Katılımınız önemle rica olunur.',
  },
  {
    id: 'ann-2',
    title: 'Bilim Fuarı ve Robotik Yarışması Başvuruları',
    date: '27 Ekim 2026',
    sender: 'Fen Zümresi & Fen Öğrt. Fatma Şahin',
    category: 'etkinlik',
    priority: 'normal',
    content: 'TÜBİTAK 4006 Bilim Şenliği için proje fikirleri toplanmaktadır. Katılmak isteyen öğrencilerimizin 10 Kasım tarihine kadar taslak fikirlerini fen öğretmenlerine iletmeleri gerekmektedir.',
  },
  {
    id: 'ann-3',
    title: 'Kasım Ayı Ara Tatili Bilgilendirmesi',
    date: '25 Ekim 2026',
    sender: 'Rehberlik Servisi',
    category: 'duyuru',
    priority: 'normal',
    content: '1. Dönem 1. Ara Tatili 14-22 Kasım 2026 tarihleri arasında uygulanacaktır. Tatil süresince öğrencilerin tekrar yapabilecekleri haftalık çalışma planı sisteme yüklenecektir.',
  },
];


export type UserRole = 'veli' | 'ogretmen' | 'ogrenci' | 'admin';

export interface UserAccount {
  id: string;
  role: UserRole;
  name: string;
  emailOrPhone: string;
  studentNo?: string;
  studentName?: string;
  pin?: string; // Veli için 6 haneli PIN (varsayılan: 123456)
  password?: string;
  branch?: string;
  avatar: string;
  title: string;
}

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-parent-1',
    role: 'veli',
    name: 'Ahmet Demir',
    emailOrPhone: '0532 111 22 33',
    studentNo: '452',
    studentName: 'Emre Demir (7-B)',
    pin: '123456',
    password: 'veli123',
    avatar: 'AD',
    title: 'Öğrenci Velisi (Emre Demir - 7-B)',
  },
  {
    id: 'usr-student-1',
    role: 'ogrenci',
    name: 'Emre Demir',
    emailOrPhone: 'emre.demir@okul.k12.tr',
    studentNo: '452',
    studentName: 'Emre Demir',
    password: '1234',
    avatar: 'ED',
    title: '7-B Sınıfı Öğrencisi (No: 452)',
  },
  {
    id: 'usr-teacher-1',
    role: 'ogretmen',
    name: 'Zehra Aydın',
    emailOrPhone: 'zehra.aydin@okul.k12.tr',
    password: 'ogretmen123',
    branch: 'Türkçe & Sınıf Rehberliği',
    avatar: 'ZA',
    title: 'Türkçe & 7-B Sınıf Rehber Öğretmeni',
  },
  {
    id: 'usr-admin-1',
    role: 'admin',
    name: 'Kemal Kaya',
    emailOrPhone: 'admin@okul.k12.tr',
    password: 'admin123',
    avatar: 'SA',
    title: 'Okul Müdürü & Sistem Yöneticisi',
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
  branch: string;
  homeroomClass?: string;
  classes: string[];
  studentCount: number;
  phone: string;
}

export const CURRENT_TEACHER: TeacherProfile = {
  id: 'tch-01',
  name: 'Zehra Aydın',
  branch: 'Türkçe',
  classes: ['7-B', '7-A', '8-C'],
  homeroomClass: '7-B',
  email: 'zehra.aydin@okul.meb.gov.tr',
  avatar: 'ZA',
};

export const INITIAL_TEACHER_CLASSES: TeacherClass[] = [
  {
    id: 'tcls-7b',
    name: '7-B',
    grade: '7. Sınıf',
    branch: 'Türkçe',
    room: 'Derslik 204',
    studentCount: 28,
    capacity: 30,
    averageScore: 78.4,
    joinCode: 'TRK-7B26',
    description: '7-B Şubesi ana ders grubu ve sınıf rehberliği.',
    createdAt: 'Eylül 2026',
    isHomeroom: true,
  },
  {
    id: 'tcls-7a',
    name: '7-A',
    grade: '7. Sınıf',
    branch: 'Türkçe',
    room: 'Derslik 203',
    studentCount: 26,
    capacity: 30,
    averageScore: 76.2,
    joinCode: 'TRK-7A88',
    description: 'Haftalık 5 saat Türkçe dersi ve paragraf analizi.',
    createdAt: 'Eylül 2026',
    isHomeroom: false,
  },
  {
    id: 'tcls-8c',
    name: '8-C',
    grade: '8. Sınıf',
    branch: 'Türkçe (LGS)',
    room: 'Derslik 302',
    studentCount: 24,
    capacity: 28,
    averageScore: 82.5,
    joinCode: 'LGS-8C15',
    description: 'LGS Hazırlık, paragraf taktikleri ve deneme tahlili grubu.',
    createdAt: 'Ekim 2026',
    isHomeroom: false,
  },
];

export interface HomeworkCheckRecord {
  status: HomeworkCheckStatus;
  score?: number; // Her ödev bir puan olacak (0-100 veya özel puan)
  maxScore?: number;
  note?: string;
}

export const INITIAL_HOMEWORK_CHECKS: { [studentId: string]: HomeworkCheckRecord } = {
  'ogr-101': { status: 'yapti', score: 100, maxScore: 100, note: 'Eksiksiz ve özenli' },
  'ogr-102': { status: 'yapti', score: 100, maxScore: 100, note: 'Tüm sorular çözülü' },
  'ogr-452': { status: 'yapti', score: 95, maxScore: 100, note: 'Zamanında teslim, özenli yazı' }, // Emre Demir (Kendi Öğrenciniz)
  'ogr-104': { status: 'kismen', score: 60, maxScore: 100, note: 'Son 2 soru boş bırakılmış' },
  'ogr-105': { status: 'yapmadi', score: 0, maxScore: 100, note: 'Defteri evde unutmuş' },
  'ogr-106': { status: 'yapti', score: 90, maxScore: 100, note: 'Tamamlandı' },
  'ogr-107': { status: 'kismen', score: 50, maxScore: 100, note: '1 sayfa eksik' },
  'ogr-108': { status: 'yapti', score: 95, maxScore: 100, note: 'Eksiksiz' },
  'ogr-109': { status: 'yapmadi', score: 0, maxScore: 100, note: 'Ödev getirilmedi' },
  'ogr-110': { status: 'yapti', score: 100, maxScore: 100, note: 'Gayet başarılı' },
  'ogr-111': { status: 'yapti', score: 85, maxScore: 100, note: 'Tamamlandı' },
  'ogr-112': { status: 'kismen', score: 50, maxScore: 100, note: 'Alıştırmalar yarım' },
  'ogr-113': { status: 'yapti', score: 90, maxScore: 100, note: 'Eksiksiz' },
  'ogr-114': { status: 'yapti', score: 95, maxScore: 100, note: 'Tamamlandı' },
  'ogr-115': { status: 'yapti', score: 90, maxScore: 100, note: 'Tamamlandı' },
  'ogr-116': { status: 'yapti', score: 100, maxScore: 100, note: 'Başarılı' },
  'ogr-117': { status: 'kismen', score: 55, maxScore: 100, note: 'Özet eksik' },
  'ogr-118': { status: 'yapti', score: 90, maxScore: 100, note: 'Tamamlandı' },
  'ogr-119': { status: 'yapmadi', score: 0, maxScore: 100, note: 'Yapılmamış' },
  'ogr-120': { status: 'yapti', score: 85, maxScore: 100, note: 'Tamamlandı' },
  'ogr-121': { status: 'yapti', score: 90, maxScore: 100, note: 'Eksiksiz' },
  'ogr-122': { status: 'yapti', score: 80, maxScore: 100, note: 'Tamamlandı' },
  'ogr-123': { status: 'yapti', score: 85, maxScore: 100, note: 'Tamamlandı' },
  'ogr-124': { status: 'yapti', score: 80, maxScore: 100, note: 'Tamamlandı' },
  'ogr-125': { status: 'yapti', score: 75, maxScore: 100, note: 'Tamamlandı' },
  'ogr-126': { status: 'yapti', score: 75, maxScore: 100, note: 'Tamamlandı' },
  'ogr-127': { status: 'yapti', score: 70, maxScore: 100, note: 'Tamamlandı' },
  'ogr-128': { status: 'yapti', score: 70, maxScore: 100, note: 'Tamamlandı' },
};

export const INITIAL_STUDENT_POINTS: { [studentId: string]: StudentPointsSummary } = {
  'ogr-452': {
    studentId: 'ogr-452',
    studentNo: '452',
    studentName: 'Emre Demir',
    plusCount: 5,
    minusCount: 1,
    netScore: 4, // (5 * 1) - (1 * 1) = +4 puan
    history: [
      {
        id: 'pt-1',
        studentId: 'ogr-452',
        studentName: 'Emre Demir',
        studentNo: '452',
        type: 'plus',
        points: 1,
        reason: 'Tahtada deyimler ve atasözleri kompozisyon tahlilinde harika sunum yaptı',
        teacherName: 'Zehra Aydın',
        subject: 'Türkçe',
        date: '30 Ekim 2026 10:15',
      },
      {
        id: 'pt-2',
        studentId: 'ogr-452',
        studentName: 'Emre Demir',
        studentNo: '452',
        type: 'plus',
        points: 1,
        reason: 'Koordinat sistemi zor analitik sorusunu tahtada hatasız çözdü',
        teacherName: 'Mehmet Yılmaz',
        subject: 'Matematik',
        date: '28 Ekim 2026 14:20',
      },
      {
        id: 'pt-3',
        studentId: 'ogr-452',
        studentName: 'Emre Demir',
        studentNo: '452',
        type: 'plus',
        points: 1,
        reason: 'Mikroskop deneyinde hücre bölünmesi safhalarını net çizdi ve arkadaşlarına rehberlik etti',
        teacherName: 'Fatma Şahin',
        subject: 'Fen Bilimleri',
        date: '26 Ekim 2026 11:30',
      },
      {
        id: 'pt-4',
        studentId: 'ogr-452',
        studentName: 'Emre Demir',
        studentNo: '452',
        type: 'plus',
        points: 1,
        reason: 'Milli Mücadele kronolojisi tartışmasında aktif parmak kaldırdı',
        teacherName: 'Ali Çetin',
        subject: 'Sosyal Bilgiler',
        date: '24 Ekim 2026 09:40',
      },
      {
        id: 'pt-5',
        studentId: 'ogr-452',
        studentName: 'Emre Demir',
        studentNo: '452',
        type: 'plus',
        points: 1,
        reason: 'Biyografi ünitesi konuşma pratiğinde akıcı ve kurallı cümleler kurdu',
        teacherName: 'Selin Kaya',
        subject: 'İngilizce',
        date: '21 Ekim 2026 13:10',
      },
      {
        id: 'pt-6',
        studentId: 'ogr-452',
        studentName: 'Emre Demir',
        studentNo: '452',
        type: 'minus',
        points: -1,
        reason: 'Geometri pergel ve cetvel ders araç gerecini evde unutmuş',
        teacherName: 'Mehmet Yılmaz',
        subject: 'Matematik',
        date: '17 Ekim 2026 10:00',
      },
    ],
  },
  'ogr-101': {
    studentId: 'ogr-101',
    studentNo: '312',
    studentName: 'Elifnaz Yıldız',
    plusCount: 7,
    minusCount: 0,
    netScore: 7,
    history: [
      {
        id: 'pt-101a',
        studentId: 'ogr-101',
        studentName: 'Elifnaz Yıldız',
        studentNo: '312',
        type: 'plus',
        points: 1,
        reason: 'Paragraf çözüm teknikleri soru tahlilinde kusursuz yanıt',
        teacherName: 'Zehra Aydın',
        subject: 'Türkçe',
        date: '29 Ekim 2026 09:20',
      },
    ],
  },
  'ogr-102': {
    studentId: 'ogr-102',
    studentNo: '189',
    studentName: 'Kaan Öztürk',
    plusCount: 6,
    minusCount: 1,
    netScore: 5,
    history: [
      {
        id: 'pt-102a',
        studentId: 'ogr-102',
        studentName: 'Kaan Öztürk',
        studentNo: '189',
        type: 'plus',
        points: 1,
        reason: 'Matematik deneme sınavı analizinde arkadaşlarına anlattı',
        teacherName: 'Mehmet Yılmaz',
        subject: 'Matematik',
        date: '27 Ekim 2026 11:15',
      },
    ],
  },
  'ogr-104': {
    studentId: 'ogr-104',
    studentNo: '504',
    studentName: 'Beren Su Aksoy',
    plusCount: 4,
    minusCount: 0,
    netScore: 4,
    history: [],
  },
  'ogr-105': {
    studentId: 'ogr-105',
    studentNo: '241',
    studentName: 'Burak Çelik',
    plusCount: 4,
    minusCount: 1,
    netScore: 3,
    history: [],
  },
  'ogr-106': {
    studentId: 'ogr-106',
    studentNo: '115',
    studentName: 'Ayşe Nur Yılmaz',
    plusCount: 4,
    minusCount: 0,
    netScore: 4,
    history: [],
  },
  'ogr-107': {
    studentId: 'ogr-107',
    studentNo: '377',
    studentName: 'Caner Arslan',
    plusCount: 3,
    minusCount: 1,
    netScore: 2,
    history: [],
  },
  'ogr-108': {
    studentId: 'ogr-108',
    studentNo: '420',
    studentName: 'Duru Aydın',
    plusCount: 4,
    minusCount: 0,
    netScore: 4,
    history: [],
  },
  'ogr-109': {
    studentId: 'ogr-109',
    studentNo: '280',
    studentName: 'Mert Kerem Şen',
    plusCount: 2,
    minusCount: 2,
    netScore: 0,
    history: [],
  },
  'ogr-110': {
    studentId: 'ogr-110',
    studentNo: '166',
    studentName: 'Zeynep Defne Koç',
    plusCount: 5,
    minusCount: 0,
    netScore: 5,
    history: [],
  },
};

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
    plusCount: 2,
    minusCount: 0,
    netScore: 2,
    history: [],
  };
};


export const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub-1',
    assignmentId: 'hw-4',
    assignmentTitle: 'Deyimler ve Atasözleri ile Kompozisyon',
    studentId: 'ogr-452',
    studentName: 'Emre Demir',
    studentNo: '452',
    className: '7-B',
    submittedDate: '30 Ekim 2026 18:40',
    submittedFile: 'Emre_Demir_Turkce_Kompozisyon.pdf',
    status: 'bekliyor',
  },
  {
    id: 'sub-2',
    assignmentId: 'hw-4',
    assignmentTitle: 'Deyimler ve Atasözleri ile Kompozisyon',
    studentId: 'ogr-101',
    studentName: 'Elifnaz Yıldız',
    studentNo: '312',
    className: '7-B',
    submittedDate: '30 Ekim 2026 16:20',
    submittedFile: 'Elifnaz_Yildiz_Odev.pdf',
    status: 'puanlandi',
    score: 98,
    teacherFeedback: 'Kusursuz anlatım ve harika atasözü bağlamları. Tebrik ederim Elifnaz.',
  },
  {
    id: 'sub-3',
    assignmentId: 'hw-4',
    assignmentTitle: 'Deyimler ve Atasözleri ile Kompozisyon',
    studentId: 'ogr-102',
    studentName: 'Kaan Öztürk',
    studentNo: '189',
    className: '7-B',
    submittedDate: '29 Ekim 2026 21:10',
    submittedFile: 'Kaan_Ozturk_Kompozisyon.pdf',
    status: 'puanlandi',
    score: 92,
    teacherFeedback: 'Giriş ve gelişme paragrafları çok akıcı.',
  },
  {
    id: 'sub-4',
    assignmentId: 'hw-4',
    assignmentTitle: 'Deyimler ve Atasözleri ile Kompozisyon',
    studentId: 'ogr-104',
    studentName: 'Beren Su Aksoy',
    studentNo: '504',
    className: '7-B',
    submittedDate: '30 Ekim 2026 20:05',
    submittedFile: 'Beren_Aksoy_Turkce.docx',
    status: 'bekliyor',
  },
];

export const INITIAL_PARENT_MESSAGES: ParentMessage[] = [
  {
    id: 'msg-1',
    parentName: 'Ahmet Demir (Veli)',
    studentName: 'Emre Demir',
    studentNo: '452',
    className: '7-B',
    date: '31 Ekim 2026 04:30',
    topic: 'Ödev & Ders Takibi',
    message: 'Hocam iyi günler, Emre\'nin kompozisyon ödevini sisteme yükledik. Hafta sonu kitap okuma projesi için önerdiğiniz listeyi de aldık, teşekkür ederiz.',
    status: 'bekliyor',
  },
  {
    id: 'msg-2',
    parentName: 'Fatma Yıldız (Veli)',
    studentName: 'Elifnaz Yıldız',
    studentNo: '312',
    className: '7-B',
    date: '28 Ekim 2026 14:15',
    topic: 'TÜBİTAK Bilim Şenliği Projesi',
    message: 'Zehra Öğretmenim merhaba, Elifnaz TÜBİTAK bilim projesi için hazırladığı metin özetini size sundu mu acaba? Bilgilendirirseniz çok seviniriz.',
    status: 'yanitlandi',
    reply: 'Merhaba Fatma Hanım, evet Elifnaz ile projenin taslağını inceledik. Gayet özgün bir çalışma oldu, haftaya resmi başvuru dosyasını sisteme gireceğiz.',
    replyDate: '28 Ekim 2026 17:30',
  },
  {
    id: 'msg-3',
    parentName: 'Murat Öztürk (Veli)',
    studentName: 'Kaan Öztürk',
    studentNo: '189',
    className: '7-B',
    date: '26 Ekim 2026 11:00',
    topic: 'Veli Toplantısı Saati',
    message: 'Toplantı günü pazar günü saat 11:00 olarak belirtilmiş, iş durumumdan dolayı 15 dakika gecikmeli katılabilirim, bilginize sunarım.',
    status: 'yanitlandi',
    reply: 'Sorun değil Murat Bey, katılımınız bizim için çok değerli. Görüşmek üzere.',
    replyDate: '26 Ekim 2026 12:20',
  },
];

export const TEACHER_CONTACTS: TeacherChatContact[] = [
  {
    id: 'grp-7b',
    name: '7-B Resmi Veli Bilgilendirme Grubu',
    subject: 'Sınıf Duyuru & Bilgilendirme Grubu',
    roleTitle: '28 Veli • Zehra Aydın, Mehmet Yılmaz...',
    avatar: '7B',
    avatarBg: 'bg-emerald-600',
    status: 'online',
    statusText: '28 katılımcı • Zehra Aydın, Mehmet Yılmaz...',
    phone: '0 (212) 555 01 00',
    officeHours: 'Resmi Sınıf Kanalı',
    unreadCount: 1,
    isGroup: true,
    memberCount: 28,
  },
  {
    id: 'tch-zehra',
    name: 'Zehra Aydın',
    subject: 'Türkçe & Sınıf Rehberliği',
    roleTitle: 'Sınıf Rehber Öğretmeni & Türkçe',
    avatar: 'ZA',
    avatarBg: 'bg-indigo-600',
    status: 'online',
    statusText: 'Çevrimiçi',
    phone: '0 (212) 555 01 24',
    officeHours: 'Pazartesi & Çarşamba 14:00 - 16:00',
    unreadCount: 0,
  },
  {
    id: 'tch-mehmet',
    name: 'Mehmet Yılmaz',
    subject: 'Matematik',
    roleTitle: 'Matematik Öğretmeni',
    avatar: 'MY',
    avatarBg: 'bg-blue-600',
    status: 'online',
    statusText: 'Çevrimiçi',
    phone: '0 (212) 555 01 25',
    officeHours: 'Salı & Perşembe 11:30 - 13:00',
    unreadCount: 0,
  },
  {
    id: 'tch-ayse',
    name: 'Ayşe Kaya',
    subject: 'Fen Bilimleri',
    roleTitle: 'Fen Bilimleri & Laboratuvar',
    avatar: 'AK',
    avatarBg: 'bg-emerald-600',
    status: 'away',
    statusText: 'Bugün 09:30 görüldü',
    phone: '0 (212) 555 01 26',
    officeHours: 'Cuma 13:30 - 15:00',
    unreadCount: 0,
  },
  {
    id: 'tch-ali',
    name: 'Ali Can',
    subject: 'Sosyal Bilgiler',
    roleTitle: 'Sosyal Bilgiler Öğretmeni',
    avatar: 'AC',
    avatarBg: 'bg-amber-600',
    status: 'offline',
    statusText: 'Çevrimdışı',
    phone: '0 (212) 555 01 27',
    officeHours: 'Pazartesi 10:00 - 11:30',
    unreadCount: 0,
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // 7-B Sınıf Grubu Yazışmaları
  {
    id: 'cm-grp-1',
    conversationId: 'grp-7b',
    senderId: 'tch-zehra',
    senderRole: 'ogretmen',
    senderName: 'Zehra Aydın',
    senderBadge: 'Sınıf Rehber Öğretmeni',
    text: 'Değerli 7-B Sınıfı Velilerimiz, 2026-2027 Eğitim Öğretim Yılımız tüm öğrencilerimize ve sizlere hayırlı olsun. Sınıfımıza ait haftalık ödevler, deneme sınavı takvimleri ve toplantı duyuruları bu resmi kanaldan iletilecektir. Öğrencimizle ilgili özel konular için ise Birebir Mesaj bölümünden dilediğiniz zaman yazabilirsiniz.',
    timestamp: '20 Ekim 09:00',
    timeOnly: '09:00',
    isRead: true,
    isDelivered: true,
    reactions: { '👍': 14, '🙏': 8, '❤️': 6 },
  },
  {
    id: 'cm-grp-2',
    conversationId: 'grp-7b',
    senderId: 'tch-zehra',
    senderRole: 'ogretmen',
    senderName: 'Zehra Aydın',
    senderBadge: 'Sınıf Rehber Öğretmeni',
    text: '🎙️ Sayın velilerimiz, bu haftaki Türkçe dersi ve hafta sonu kitap okuma çizelgemiz hakkında sesli not:',
    timestamp: '25 Ekim 18:30',
    timeOnly: '18:30',
    isRead: true,
    isDelivered: true,
    voiceNote: {
      duration: '0:26',
      audioText: 'Sayın velilerimiz merhaba. Bu haftaki Türkçe dersimizde okuduğumuz öykünün tahlilini sınıfta başarıyla tamamladık. Hafta sonu günlük 30 dakika kitap okuma saatini evde tüm aileyle birlikte uygulamanızı rica ediyorum. İyi tatiller dilerim.',
    },
    reactions: { '👏': 12, '👍': 15 },
  },
  {
    id: 'cm-grp-3',
    conversationId: 'grp-7b',
    senderId: 'tch-mehmet',
    senderRole: 'ogretmen',
    senderName: 'Mehmet Yılmaz',
    senderBadge: 'Matematik Öğretmeni',
    text: 'İyi günler sayın velilerimiz. Matematik Doğrusal Denklemler ve Koordinat Sistemi konu tekrar fasikülünü ekte paylaşıyorum. Öğrencilerimizin pazartesi gününe kadar tamamlamaları rica olunur.',
    timestamp: 'Dün 17:00',
    timeOnly: '17:00',
    isRead: true,
    isDelivered: true,
    attachment: {
      type: 'pdf',
      name: 'Dogrusal_Denklemler_Ek_Calisma_7B.pdf',
      size: '2.4 MB',
    },
    reactions: { '👍': 18 },
  },
  {
    id: 'cm-grp-4',
    conversationId: 'grp-7b',
    senderId: 'tch-zehra',
    senderRole: 'ogretmen',
    senderName: 'Zehra Aydın',
    senderBadge: 'Sınıf Rehber Öğretmeni',
    text: '📢 [ÖNEMLİ DUYURU - 1. Dönem Veli Toplantısı]\n\nDeğerli Velilerimiz, 1. Dönem ara değerlendirme ve genel veli bilgilendirme toplantımız bu pazar günü saat 11:00\'de 7-B sınıfımızda gerçekleştirilecektir. Gündem maddeleri ve yerleşim planı ekteki dosyada mevcuttur. Katılımınızı önemle rica ederiz.',
    timestamp: 'Bugün 08:30',
    timeOnly: '08:30',
    isRead: false,
    isDelivered: true,
    attachment: {
      type: 'pdf',
      name: 'Veli_Toplanti_Gundemi_ve_Yer_Plani.pdf',
      size: '850 KB',
    },
    reactions: { '👍': 9, '🙏': 5 },
  },

  // Zehra Aydın ile birebir yazışmalar
  {
    id: 'cm-1',
    conversationId: 'tch-zehra',
    senderId: 'tch-zehra',
    senderRole: 'ogretmen',
    senderName: 'Zehra Aydın',
    text: 'Sayın Ahmet Bey iyi günler. Emre\'nin bu haftaki Türkçe kompozisyon çalışması ve ders içi katılımı gayet başarılıydı.',
    timestamp: 'Dün 15:40',
    timeOnly: '15:40',
    isRead: true,
    isDelivered: true,
  },
  {
    id: 'cm-2',
    conversationId: 'tch-zehra',
    senderId: 'parent-ahmet',
    senderRole: 'veli',
    senderName: 'Ahmet Demir (Veli)',
    text: 'İyi günler Zehra Öğretmenim, ilginiz için çok teşekkür ederiz. Evde kitap okuma saatlerine düzenli devam ediyoruz.',
    timestamp: 'Dün 16:15',
    timeOnly: '16:15',
    isRead: true,
    isDelivered: true,
  },
  {
    id: 'cm-3',
    conversationId: 'tch-zehra',
    senderId: 'tch-zehra',
    senderRole: 'ogretmen',
    senderName: 'Zehra Aydın',
    text: 'Çok sevindim! Yarınki Türkçe dersinde ödevini sınıfla paylaşmasını isteyeceğim. Bir sorunuz veya görüşmek istediğiniz bir konu olursa buradan dilediğiniz zaman yazabilirsiniz.',
    timestamp: 'Dün 16:30',
    timeOnly: '16:30',
    isRead: true,
    isDelivered: true,
  },
  {
    id: 'cm-4',
    conversationId: 'tch-zehra',
    senderId: 'parent-ahmet',
    senderRole: 'veli',
    senderName: 'Ahmet Demir (Veli)',
    text: 'Hocam iyi günler, Emre\'nin kompozisyon ödevini sisteme yükledik. Hafta sonu kitap okuma projesi için önerdiğiniz listeyi de aldık, teşekkür ederiz.',
    timestamp: 'Bugün 04:30',
    timeOnly: '04:30',
    isRead: true,
    isDelivered: true,
  },
  {
    id: 'cm-5',
    conversationId: 'tch-zehra',
    senderId: 'tch-zehra',
    senderRole: 'ogretmen',
    senderName: 'Zehra Aydın',
    text: 'Rica ederim Ahmet Bey, ödevi inceledim ve sisteme tam puan olarak kaydettim. Emre\'ye selamlar!',
    timestamp: 'Bugün 08:15',
    timeOnly: '08:15',
    isRead: true,
    isDelivered: true,
  },

  // Mehmet Yılmaz ile yazışmalar
  {
    id: 'cm-6',
    conversationId: 'tch-mehmet',
    senderId: 'parent-ahmet',
    senderRole: 'veli',
    senderName: 'Ahmet Demir (Veli)',
    text: 'Mehmet Hocam iyi akşamlar, Emre Doğrusal Denklemler ödevinde koordinat düzlemi çizimlerini tamamladı. 12. sorudaki eksen kesim noktalarını doğrulamak istedi.',
    timestamp: 'Dün 20:10',
    timeOnly: '20:10',
    isRead: true,
    isDelivered: true,
    attachment: {
      type: 'resim',
      name: 'Koordinat_Grafigi_Emre.jpg',
      size: '1.2 MB',
    },
  },
  {
    id: 'cm-7',
    conversationId: 'tch-mehmet',
    senderId: 'tch-mehmet',
    senderRole: 'ogretmen',
    senderName: 'Mehmet Yılmaz',
    text: 'İyi akşamlar Ahmet Bey. Gönderdiğiniz grafiği inceledim, Emre denklemi ve orijini çok doğru kurmuş. Yarın derste o sorunun çözümünü sınıfta örnek göstereceğim.',
    timestamp: 'Dün 20:45',
    timeOnly: '20:45',
    isRead: true,
    isDelivered: true,
  },

  // Ayşe Kaya ile yazışmalar
  {
    id: 'cm-8',
    conversationId: 'tch-ayse',
    senderId: 'tch-ayse',
    senderRole: 'ogretmen',
    senderName: 'Ayşe Kaya',
    text: 'Ahmet Bey merhaba. Gelecek hafta Fen Bilimleri dersinde mikroskop ile hücre inceleme deneyimiz olacak. Malzeme listesini duyurulara ekledim.',
    timestamp: '28 Ekim 11:30',
    timeOnly: '11:30',
    isRead: true,
    isDelivered: true,
  },
  {
    id: 'cm-9',
    conversationId: 'tch-ayse',
    senderId: 'parent-ahmet',
    senderRole: 'veli',
    senderName: 'Ahmet Demir (Veli)',
    text: 'Teşekkürler Ayşe Öğretmenim, duyuruyu gördük ve malzemeleri hazırladık.',
    timestamp: '28 Ekim 12:10',
    timeOnly: '12:10',
    isRead: true,
    isDelivered: true,
  },
];

export const INITIAL_BULK_MESSAGES: BulkMessage[] = [
  {
    id: 'blk-1',
    senderName: 'Zehra Aydın',
    senderTitle: 'Türkçe & Sınıf Rehber Öğretmeni',
    className: '7-B',
    title: 'Hafta Sonu Ödev ve Kitap Okuma Hatırlatması',
    content: 'Değerli 7-B Sınıfı Velilerimiz, bu haftaki Türkçe kompozisyon ve Matematik koordinat sistemi ödevleri sisteme yüklenmiştir. Hafta sonu günlük 30 dakika kitap okuma çizelgesini takip etmenizi önemle rica ederim.',
    date: '30 Ekim 2026 16:30',
    recipientType: 'tum_sinif',
    recipientCount: 28,
    totalRecipients: 28,
    channels: ['portal', 'sms'],
    priority: 'normal',
    attachmentName: 'Haftalik_Calisma_Programi_7B.pdf',
    status: 'gonderildi',
  },
  {
    id: 'blk-2',
    senderName: 'Zehra Aydın',
    senderTitle: 'Türkçe & Sınıf Rehber Öğretmeni',
    className: '7-B',
    title: '1. Dönem Veli Bilgilendirme Toplantısı Daveti',
    content: 'Sayın Velilerimiz, öğrencilerimizin akademik başarıları, yeni sınav sistemi ve ders motivasyonlarını değerlendirmek üzere 1. Dönem veli toplantımız pazar günü saat 11:00\'de okul salonunda yapılacaktır.',
    date: '25 Ekim 2026 10:00',
    recipientType: 'tum_sinif',
    recipientCount: 28,
    totalRecipients: 28,
    channels: ['portal', 'sms'],
    priority: 'onemli',
    attachmentName: 'Veli_Toplanti_Gundemi_ve_Yer_Plani.pdf',
    status: 'gonderildi',
  },
];

export const SCHOOL_CLASSES: SchoolClass[] = [
  {
    id: 'cls-7b',
    name: '7-B',
    homeroomTeacher: 'Zehra Aydın (Türkçe)',
    studentCount: 28,
    averageScore: 78.4,
    attendanceRate: 96.2,
  },
  {
    id: 'cls-7a',
    name: '7-A',
    homeroomTeacher: 'Mehmet Yılmaz (Matematik)',
    studentCount: 30,
    averageScore: 76.8,
    attendanceRate: 95.0,
  },
  {
    id: 'cls-8a',
    name: '8-A',
    homeroomTeacher: 'Fatma Şahin (Fen Bilimleri)',
    studentCount: 26,
    averageScore: 81.2,
    attendanceRate: 97.5,
  },
  {
    id: 'cls-8b',
    name: '8-B',
    homeroomTeacher: 'Ali Çetin (Sosyal Bilgiler)',
    studentCount: 27,
    averageScore: 75.9,
    attendanceRate: 94.8,
  },
  {
    id: 'cls-6a',
    name: '6-A',
    homeroomTeacher: 'Selin Kaya (İngilizce)',
    studentCount: 29,
    averageScore: 79.1,
    attendanceRate: 96.0,
  },
];

export const TEACHER_LIST: TeacherListItem[] = [
  {
    id: 'tch-1',
    name: 'Zehra Aydın',
    branch: 'Türkçe',
    homeroomClass: '7-B',
    classes: ['7-B', '7-A', '8-C'],
    studentCount: 84,
    phone: '0532 000 11 22',
  },
  {
    id: 'tch-2',
    name: 'Mehmet Yılmaz',
    branch: 'Matematik',
    homeroomClass: '7-A',
    classes: ['7-A', '7-B', '8-A'],
    studentCount: 84,
    phone: '0533 111 22 33',
  },
  {
    id: 'tch-3',
    name: 'Fatma Şahin',
    branch: 'Fen Bilimleri',
    homeroomClass: '8-A',
    classes: ['8-A', '7-B', '6-A'],
    studentCount: 83,
    phone: '0535 222 33 44',
  },
  {
    id: 'tch-4',
    name: 'Ali Çetin',
    branch: 'Sosyal Bilgiler',
    homeroomClass: '8-B',
    classes: ['8-B', '7-B', '6-A'],
    studentCount: 82,
    phone: '0536 333 44 55',
  },
  {
    id: 'tch-5',
    name: 'Selin Kaya',
    branch: 'İngilizce',
    homeroomClass: '6-A',
    classes: ['6-A', '7-B', '8-A'],
    studentCount: 83,
    phone: '0537 444 55 66',
  },
];
