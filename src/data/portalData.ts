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

export const ASSIGNMENTS: Assignment[] = [];

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
    plusCount: 2,
    minusCount: 0,
    netScore: 2,
    history: [],
  };
};


export const INITIAL_SUBMISSIONS: StudentSubmission[] = [];

export const INITIAL_PARENT_MESSAGES: ParentMessage[] = [];

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

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_BULK_MESSAGES: BulkMessage[] = [];

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
