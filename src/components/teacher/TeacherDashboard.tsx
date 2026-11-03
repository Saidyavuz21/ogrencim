'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Users,
  Award,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  BookOpen,
  Sparkles,
  TrendingUp,
  Inbox,
  School,
  UserPlus,
  Copy,
  Check,
  Hash,
  ArrowRight,
  X,
  AlertCircle,
  Image as ImageIcon,
  File,
  StickyNote,
  Eye,
  Paperclip,
  Download,
  Printer,
  CheckSquare,
  MinusCircle,
  PlusCircle,
  Minus,
  Star,
  ThumbsUp,
  ThumbsDown,
  Megaphone
} from '../icons';
import {
  UserAccount,
  CURRENT_TEACHER,
  ASSIGNMENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_PARENT_MESSAGES,
  LEADERBOARD_STUDENTS,
  INITIAL_TEACHER_CLASSES,
  INITIAL_HOMEWORK_CHECKS,
  INITIAL_STUDENT_POINTS,
  TeacherClass,
  StudentSubmission,
  ParentMessage,
  ChatMessage,
  INITIAL_CHAT_MESSAGES,
  BulkMessage,
  Announcement,
  Assignment,
  HomeworkType,
  HomeworkAttachment,
  HomeworkCheckStatus,
  HomeworkCheckRecord,
  StudentPointRecord,
  StudentPointsSummary,
  PointType,
  LeaderboardStudent,
  getStudentPointsSummary
} from '../../data/portalData';
import { TeacherBulkMessageSection } from './TeacherBulkMessageSection';
import styles from './TeacherDashboard.module.css';

interface TeacherDashboardProps {
  currentUser?: UserAccount;
  assignments?: Assignment[];
  onAssignmentsChange?: (assignments: Assignment[]) => void;
  studentPoints?: { [studentId: string]: StudentPointsSummary };
  onStudentPointsChange?: (points: { [studentId: string]: StudentPointsSummary }) => void;
  leaderboardStudents?: LeaderboardStudent[];
  onLeaderboardChange?: (students: LeaderboardStudent[]) => void;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (msg: ChatMessage) => void;
  onSendBroadcastMessage?: (msg: BulkMessage) => void;
  onAddAnnouncement?: (ann: Announcement) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  assignments: externalAssignments,
  onAssignmentsChange,
  studentPoints: externalStudentPoints,
  onStudentPointsChange,
  leaderboardStudents: externalLeaderboardStudents,
  onLeaderboardChange,
  chatMessages: externalChatMessages,
  onSendChatMessage,
  onSendBroadcastMessage,
  onAddAnnouncement,
}) => {
  // Sınıf Yönetimi Durumları
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>(INITIAL_TEACHER_CLASSES);
  const [selectedClass, setSelectedClass] = useState<string>('7-B');
  const [activeSubTab, setActiveSubTab] = useState<'check_sheet' | 'plus_minus' | 'assignments' | 'classes' | 'grading' | 'grade_entry' | 'messages' | 'bulk_message' | 'leaderboard'>('check_sheet');

  // Ödev Kontrol Çizelgesi Durumları (Yaptı / Kısmen / Yapmadı & Puan)
  const [selectedCheckHwId, setSelectedCheckHwId] = useState<string>('hw-4');
  const [studentChecks, setStudentChecks] = useState<{ [assignmentId: string]: { [studentId: string]: HomeworkCheckRecord } }>({
    'hw-4': INITIAL_HOMEWORK_CHECKS,
    'hw-1': INITIAL_HOMEWORK_CHECKS,
  });
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [checkStatusFilter, setCheckStatusFilter] = useState<'all' | 'yapti' | 'kismen' | 'yapmadi'>('all');

  // Artı / Eksi Puan Durumları (Katılım ve Davranış)
  const [studentPoints, setStudentPoints] = useState<{ [studentId: string]: StudentPointsSummary }>(
    externalStudentPoints || INITIAL_STUDENT_POINTS
  );
  const [leaderboardStudents, setLeaderboardStudents] = useState<LeaderboardStudent[]>(
    externalLeaderboardStudents || LEADERBOARD_STUDENTS
  );
  const [pointModalStudent, setPointModalStudent] = useState<{ id: string; name: string; studentNo: string; type: PointType } | null>(null);
  const [pointReasonText, setPointReasonText] = useState('');
  const [pointSubject, setPointSubject] = useState(currentUser?.branch || CURRENT_TEACHER.branch);
  const [pointsFilter, setPointsFilter] = useState<'all' | 'plus' | 'minus' | 'emre'>('all');

  // Ders İçi Anlık Artı / Eksi Yoklama Durumları
  const [sessionDate, setSessionDate] = useState('31 Ekim 2026');
  const [sessionSubject, setSessionSubject] = useState('Türkçe - Sözcükte Anlam');
  const [sessionMarks, setSessionMarks] = useState<{ [studentId: string]: 'plus' | 'minus' | null }>({
    'ogr-452': 'plus',
    'ogr-108': 'plus',
    'ogr-312': 'minus',
  });
  const [sessionReasons, setSessionReasons] = useState<{ [studentId: string]: string }>({
    'ogr-452': '🌟 Ders İçi Katılım & Soru Çözümü',
    'ogr-108': '📓 Örnek Defter Düzeni',
    'ogr-312': '⚠️ Kitap / Defter Eksik',
  });

  // Yeni Sınıf Oluşturma Modal ve Form Durumları
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('7. Sınıf');
  const [newClassBranch, setNewClassBranch] = useState('Türkçe');
  const [newClassRoom, setNewClassRoom] = useState('Derslik 205');
  const [newClassCapacity, setNewClassCapacity] = useState(30);
  const [newClassJoinCode, setNewClassJoinCode] = useState('TRK-7C48');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newClassIsHomeroom, setNewClassIsHomeroom] = useState(false);

  // Ödev Gönderme Form Durumu
  const [isNewHwOpen, setIsNewHwOpen] = useState(false);
  const [newHwTitle, setNewHwTitle] = useState('');
  const [newHwSubject, setNewHwSubject] = useState('Türkçe');
  const [newHwDueDate, setNewHwDueDate] = useState('');
  const [newHwDesc, setNewHwDesc] = useState('');
  const [newHwType, setNewHwType] = useState<HomeworkType>('pdf');
  const [newHwPriority, setNewHwPriority] = useState<'normal' | 'yuksek'>('normal');
  const [newHwPointsPossible, setNewHwPointsPossible] = useState<number>(100);

  // PDF Ödevi Ekleri
  const [newHwPdfName, setNewHwPdfName] = useState('7B_Turkce_Paragraf_Calisma_Foyu.pdf');
  const [newHwPdfSize, setNewHwPdfSize] = useState('1.8 MB');

  // Resim / Fotoğraf Ödevi Ekleri
  const [newHwImageName, setNewHwImageName] = useState('Tahta_Notu_Cumlede_Anlam_Semasi.jpg');

  // Yazılı Not / Talimat
  const [newHwTeacherNote, setNewHwTeacherNote] = useState('Ders defterinizdeki 3. ünite konu özetini dikkatle okuyunuz. Altı çizili 15 anahtar kavramı sözlüğünüzden bularak karşılıklarını not ediniz.');

  // Veri Durumları
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>(externalAssignments || ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(INITIAL_SUBMISSIONS);
  const [messages, setMessages] = useState<ParentMessage[]>(INITIAL_PARENT_MESSAGES);

  // Önizleme Modalleri
  const [previewPdf, setPreviewPdf] = useState<{ title: string; fileName: string; size?: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ title: string; fileName: string; subject: string; note?: string } | null>(null);

  // Puanlama Durumu
  const [gradingScores, setGradingScores] = useState<{ [id: string]: number }>({ 'sub-1': 95 });
  const [gradingFeedbacks, setGradingFeedbacks] = useState<{ [id: string]: string }>({ 'sub-1': 'Metin kurgusu ve anlatım zenginliği çok başarılı.' });
  const [expandedSubId, setExpandedSubId] = useState<string | null>('sub-1');

  // Mesaj Yanıtlama ve Kopyalama Bildirimleri
  const [replyTexts, setReplyTexts] = useState<{ [id: string]: string }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [liveChatMessages, setLiveChatMessages] = useState<ChatMessage[]>(externalChatMessages || INITIAL_CHAT_MESSAGES);
  const [teacherChatInput, setTeacherChatInput] = useState('');
  const [messageViewMode, setMessageViewMode] = useState<'inbox' | 'live_chat'>('live_chat');
  const [teacherSelectedChatId, setTeacherSelectedChatId] = useState<string>('grp-7b');

  useEffect(() => {
    if (externalChatMessages) {
      setLiveChatMessages(externalChatMessages);
    }
  }, [externalChatMessages]);

  useEffect(() => {
    if (externalAssignments) {
      setTeacherAssignments(externalAssignments);
    }
  }, [externalAssignments]);

  useEffect(() => {
    if (externalStudentPoints) {
      setStudentPoints(externalStudentPoints);
    }
  }, [externalStudentPoints]);

  useEffect(() => {
    if (externalLeaderboardStudents) {
      setLeaderboardStudents(externalLeaderboardStudents);
    }
  }, [externalLeaderboardStudents]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Aktif kontrol edilen ödev
  const activeCheckingHw = teacherAssignments.find((a) => a.id === selectedCheckHwId) || teacherAssignments[0];
  const activeMaxPoints = activeCheckingHw?.pointsPossible || 100;

  // Aktif ödevin öğrenci kontrol haritası
  const currentAssignmentChecks = studentChecks[selectedCheckHwId] || INITIAL_HOMEWORK_CHECKS;

  // Öğrenci ödev durumunu değiştirme (Yaptı / Kısmen / Yapmadı) & Otomatik Puan
  const handleSetStudentStatus = (studentId: string, status: HomeworkCheckStatus) => {
    const defaultScore = status === 'yapti'
      ? activeMaxPoints
      : status === 'kismen'
        ? Math.round(activeMaxPoints / 2)
        : 0;

    setStudentChecks((prev) => {
      const hwChecks = prev[selectedCheckHwId] || { ...INITIAL_HOMEWORK_CHECKS };
      return {
        ...prev,
        [selectedCheckHwId]: {
          ...hwChecks,
          [studentId]: {
            ...hwChecks[studentId],
            status,
            score: defaultScore,
            maxScore: activeMaxPoints,
          },
        },
      };
    });
  };

  // Öğrenci ödev puanını doğrudan değiştirme
  const handleSetStudentScore = (studentId: string, score: number) => {
    setStudentChecks((prev) => {
      const hwChecks = prev[selectedCheckHwId] || { ...INITIAL_HOMEWORK_CHECKS };
      return {
        ...prev,
        [selectedCheckHwId]: {
          ...hwChecks,
          [studentId]: {
            ...hwChecks[studentId],
            score: Math.max(0, Math.min(activeMaxPoints, score)),
            maxScore: activeMaxPoints,
          },
        },
      };
    });
  };

  // Öğrenci ödev kontrol notunu değiştirme
  const handleSetStudentNote = (studentId: string, note: string) => {
    setStudentChecks((prev) => {
      const hwChecks = prev[selectedCheckHwId] || { ...INITIAL_HOMEWORK_CHECKS };
      return {
        ...prev,
        [selectedCheckHwId]: {
          ...hwChecks,
          [studentId]: {
            ...hwChecks[studentId],
            note,
          },
        },
      };
    });
  };

  // Tüm sınıfa toplu durum uygulama (Tümünü Yaptı İşaretle vb.)
  const handleMarkAllStudents = (status: HomeworkCheckStatus) => {
    const defaultScore = status === 'yapti'
      ? activeMaxPoints
      : status === 'kismen'
        ? Math.round(activeMaxPoints / 2)
        : 0;

    setStudentChecks((prev) => {
      const hwChecks = { ...(prev[selectedCheckHwId] || INITIAL_HOMEWORK_CHECKS) };
      leaderboardStudents.forEach((st) => {
        hwChecks[st.id] = {
          ...hwChecks[st.id],
          status,
          score: defaultScore,
          maxScore: activeMaxPoints,
        };
      });
      return {
        ...prev,
        [selectedCheckHwId]: hwChecks,
      };
    });
    const label = status === 'yapti' ? '"Yaptı (Tam Puan)"' : status === 'kismen' ? '"Kısmen (Yarı Puan)"' : '"Yapmadı (0 Puan)"';
    showToast(`Tüm sınıf (${leaderboardStudents.length} öğrenci) ${label} olarak işaretlendi.`);
  };

  // Kontrol çizelgesini kaydetme ve veli portalına yansıtma
  const handleSaveCheckSheet = () => {
    if (!activeCheckingHw) return;
    const checks = currentAssignmentChecks;
    let countYapti = 0;
    let countKismen = 0;
    let countYapmadi = 0;

    leaderboardStudents.forEach((st) => {
      const s = checks[st.id]?.status || 'yapti';
      if (s === 'yapti') countYapti++;
      else if (s === 'kismen') countKismen++;
      else if (s === 'yapmadi') countYapmadi++;
    });

    // Emre Demir'in ('ogr-452') durumunu ve puanını aktif ödeve güncelle
    const emreCheck = checks['ogr-452'] || { status: 'yapti', score: 95 };
    const emreFinalScore = emreCheck.score ?? (emreCheck.status === 'yapti' ? activeMaxPoints : emreCheck.status === 'kismen' ? Math.round(activeMaxPoints / 2) : 0);

    const updatedAssignments = teacherAssignments.map((a) => {
      if (a.id === selectedCheckHwId) {
        return {
          ...a,
          studentCheckStatus: emreCheck.status,
          studentCheckNote: emreCheck.note || 'Öğretmen kontrolü tamamlandı.',
          score: emreFinalScore,
          pointsPossible: activeMaxPoints,
        };
      }
      return a;
    });

    setTeacherAssignments(updatedAssignments);
    if (onAssignmentsChange) onAssignmentsChange(updatedAssignments);

    showToast(`"${activeCheckingHw.title}" ödev kontrolü & puanlaması kaydedildi: Emre: ${emreFinalScore}/${activeMaxPoints} Puan (${countYapti} Yaptı, ${countKismen} Kısmen, ${countYapmadi} Yapmadı).`);
  };

  // Öğrenciye Artı (+) / Eksi (-) verme işlemi
  const addPointRecord = (studentId: string, type: PointType, reason: string) => {
    const targetStudent = leaderboardStudents.find((s) => s.id === studentId) || {
      id: studentId,
      name: 'Öğrenci',
      studentNo: '---',
    };

    const pointChange = type === 'plus' ? 1 : -1;
    const currentSummary = studentPoints[studentId] || getStudentPointsSummary(studentPoints, studentId, targetStudent.name, targetStudent.studentNo);

    const newRecord: StudentPointRecord = {
      id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      studentName: targetStudent.name,
      studentNo: targetStudent.studentNo,
      type,
      points: pointChange,
      reason,
      teacherName: currentUser?.name || CURRENT_TEACHER.name,
      subject: currentUser?.branch || CURRENT_TEACHER.branch,
      date: 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedSummary: StudentPointsSummary = {
      ...currentSummary,
      studentId,
      studentName: targetStudent.name,
      studentNo: targetStudent.studentNo,
      plusCount: type === 'plus' ? currentSummary.plusCount + 1 : currentSummary.plusCount,
      minusCount: type === 'minus' ? currentSummary.minusCount + 1 : currentSummary.minusCount,
      netScore: currentSummary.netScore + pointChange,
      history: [newRecord, ...currentSummary.history],
    };

    const updatedMap = {
      ...studentPoints,
      [studentId]: updatedSummary,
    };

    setStudentPoints(updatedMap);
    if (onStudentPointsChange) onStudentPointsChange(updatedMap);

    // Leaderboard students senkronizasyonu
    const updatedLeaderboard = leaderboardStudents.map((st) => {
      if (st.id === studentId) {
        return {
          ...st,
          plusCount: updatedSummary.plusCount,
          minusCount: updatedSummary.minusCount,
          netBehaviorPoints: updatedSummary.netScore,
        };
      }
      return st;
    });
    setLeaderboardStudents(updatedLeaderboard);
    if (onLeaderboardChange) onLeaderboardChange(updatedLeaderboard);

    const label = type === 'plus' ? 'Artı (+) verildi (+1 Puan)' : 'Eksi (-) verildi (-1 Puan)';
    showToast(`${targetStudent.name}: ${label}`);
  };

  // Hızlı Artı verme (tek tık)
  const handleQuickAddPlus = (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addPointRecord(studentId, 'plus', 'Ders içi aktif katılım & soru çözümü');
  };

  // Hızlı Eksi verme (tek tık)
  const handleQuickAddMinus = (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addPointRecord(studentId, 'minus', 'Ders araç gereci eksik / derse hazırlıksız');
  };

  // Kayıt silme (Geri alma)
  const handleDeletePointRecord = (studentId: string, recordId: string) => {
    const currentSummary = studentPoints[studentId];
    if (!currentSummary) return;

    const recordToDelete = currentSummary.history.find((r) => r.id === recordId);
    if (!recordToDelete) return;

    const isPlus = recordToDelete.type === 'plus';
    const updatedSummary: StudentPointsSummary = {
      ...currentSummary,
      plusCount: isPlus ? Math.max(0, currentSummary.plusCount - 1) : currentSummary.plusCount,
      minusCount: !isPlus ? Math.max(0, currentSummary.minusCount - 1) : currentSummary.minusCount,
      netScore: currentSummary.netScore - (isPlus ? 1 : -1),
      history: currentSummary.history.filter((r) => r.id !== recordId),
    };

    const updatedMap = {
      ...studentPoints,
      [studentId]: updatedSummary,
    };

    setStudentPoints(updatedMap);
    if (onStudentPointsChange) onStudentPointsChange(updatedMap);

    showToast(`${currentSummary.studentName} için puan kaydı geri alındı.`);
  };

  // Ders içi anlık Artı / Eksi seçimi (Checkbox / Toggle düğmesi)
  const handleToggleStudentSessionMark = (studentId: string, markType: 'plus' | 'minus') => {
    const currentMark = sessionMarks[studentId];
    const targetStudent = leaderboardStudents.find((s) => s.id === studentId);
    const studentName = targetStudent ? targetStudent.name : 'Öğrenci';

    if (currentMark === markType) {
      // Seçim kaldırıldı / Nötr yapıldı
      setSessionMarks((prev) => ({ ...prev, [studentId]: null }));
      showToast(`${studentName}: ${markType === 'plus' ? 'Artı (+)' : 'Eksi (-)'} seçimi kaldırıldı.`);
    } else {
      // Yeni seçim yapıldı
      setSessionMarks((prev) => ({ ...prev, [studentId]: markType }));
      const reason = sessionReasons[studentId] || (markType === 'plus' ? '🌟 Ders İçi Katılım & Soru Çözümü' : '⚠️ Kitap / Defter Eksik');
      addPointRecord(studentId, markType, reason);
    }
  };

  // Tüm sınıfa toplu Artı verme
  const handleMarkAllClassPlus = () => {
    const updatedMarks: { [studentId: string]: 'plus' | 'minus' | null } = {};
    leaderboardStudents.forEach((st) => {
      updatedMarks[st.id] = 'plus';
      addPointRecord(st.id, 'plus', 'Tüm sınıf ders içi etkinlik ve aktif katılım ödülü');
    });
    setSessionMarks(updatedMarks);
    showToast(`Tüm sınıfa (${leaderboardStudents.length} öğrenci) +1 Artı (+1 Puan) verildi.`);
  };

  // Tüm ders içi işaretleri temizleme
  const handleClearAllSessionMarks = () => {
    setSessionMarks({});
    showToast('Tüm ders içi işaretlemeler temizlendi.');
  };

  // Ders içi çizelgeyi kaydetme ve velilere bildirim
  const handleSaveSessionMarks = () => {
    const plusCount = Object.values(sessionMarks).filter((m) => m === 'plus').length;
    const minusCount = Object.values(sessionMarks).filter((m) => m === 'minus').length;
    showToast(`Ders İçi Artı / Eksi Çizelgesi Kaydedildi: ${plusCount} öğrenci Artı, ${minusCount} öğrenci Eksi aldı. Velilere bildirim iletildi.`);
  };

  // Rastgele Sınıf Katılım Kodu Üretici
  const generateNewJoinCode = (prefix: string = 'TRK') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${prefix}-${rand}`;
    setNewClassJoinCode(code);
    return code;
  };

  // Sınıf Katılım Kodunu Panoya Kopyalama
  const handleCopyJoinCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    showToast(`Sınıf Katılım Kodu (${code}) panoya kopyalandı!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // Yeni Sınıf Oluşturma Form Gönderimi
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showToast('Lütfen sınıf veya şube adını giriniz.');
      return;
    }

    const createdClass: TeacherClass = {
      id: `tcls-${Date.now()}`,
      name: newClassName.trim(),
      grade: newClassGrade,
      branch: newClassBranch.trim() || 'Türkçe',
      room: newClassRoom.trim() || 'Derslik',
      studentCount: 0,
      capacity: Number(newClassCapacity) || 30,
      averageScore: 0,
      joinCode: newClassJoinCode.trim() || generateNewJoinCode('CLS'),
      description: newClassDesc.trim() || `${newClassName.trim()} ders çalışma ve ödev takip grubu.`,
      createdAt: 'Ekim 2026',
      isHomeroom: newClassIsHomeroom,
    };

    setTeacherClasses([createdClass, ...teacherClasses]);
    setSelectedClass(createdClass.name);
    setIsNewClassModalOpen(false);

    // Formu sıfırla
    setNewClassName('');
    setNewClassDesc('');
    setNewClassIsHomeroom(false);
    generateNewJoinCode('TRK');

    showToast(`"${createdClass.name}" sınıfı başarıyla oluşturuldu! Katılım Kodu: ${createdClass.joinCode}`);
  };

  // Hızlı Sınıf Şablonu
  const applyClassTemplate = (tpl: { name: string; grade: string; branch: string; room: string; desc: string }) => {
    setNewClassName(tpl.name);
    setNewClassGrade(tpl.grade);
    setNewClassBranch(tpl.branch);
    setNewClassRoom(tpl.room);
    setNewClassDesc(tpl.desc);
    generateNewJoinCode(tpl.name.substring(0, 3).toUpperCase());
  };

  // Hızlı Ödev Şablonu Seçimi (PDF, Resim, Not)
  const applyHomeworkTemplate = (type: HomeworkType) => {
    setNewHwType(type);
    if (type === 'pdf') {
      setNewHwTitle('Paragrafta Anlam ve Yapı Pekiştirme Föyü');
      setNewHwPdfName('7B_Paragrafta_Anlam_Test_3.pdf');
      setNewHwPdfSize('2.1 MB');
      setNewHwDesc('Eklenen PDF dokümanındaki 20 soruyu çözüp cevap anahtarıyla kontrol ediniz.');
    } else if (type === 'resim') {
      setNewHwTitle('Deyimler & Mecaz Anlam Tahta Şeması Tekrarı');
      setNewHwImageName('Deyimler_Tahta_Semasi_Derslik204.jpg');
      setNewHwDesc('Derste tahtaya çizdiğimiz deyimler kavram ağacını defterinize renkli kalemlerle aktarınız.');
    } else if (type === 'not') {
      setNewHwTitle('Haftalık Kitap Tahlili ve Karakter Analizi');
      setNewHwTeacherNote('Okuduğunuz romanın 70-110. sayfalarındaki baş kahramanın dönüm noktasını 1 sayfa olarak analiz edip cuma gününe kadar hazırlayınız.');
      setNewHwDesc('Türkçe okuma ve tahlil defterine kurallara uygun olarak yazılacaktır.');
    }
  };

  // Yeni Ödev Oluşturma ve Gönderme
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwTitle.trim() || !newHwDueDate) {
      showToast('Lütfen ödev başlığı ve son teslim tarihini giriniz.');
      return;
    }

    const attachmentsList: string[] = [];
    const attachmentDetailsList: HomeworkAttachment[] = [];

    if (newHwType === 'pdf' || newHwType === 'karma') {
      attachmentsList.push(newHwPdfName);
      attachmentDetailsList.push({
        id: `att-${Date.now()}-1`,
        type: 'pdf',
        name: newHwPdfName,
        size: newHwPdfSize || '1.8 MB',
      });
    }

    if (newHwType === 'resim' || newHwType === 'karma') {
      attachmentsList.push(newHwImageName);
      attachmentDetailsList.push({
        id: `att-${Date.now()}-2`,
        type: 'resim',
        name: newHwImageName,
        size: '2.4 MB',
      });
    }

    const newHw: Assignment = {
      id: `hw-${Date.now()}`,
      title: newHwTitle.trim(),
      subject: newHwSubject,
      subjectColor: 'from-amber-600 to-orange-600',
      teacher: currentUser?.name || CURRENT_TEACHER.name,
      className: selectedClass,
      assignedDate: 'Bugün',
      dueDate: newHwDueDate,
      status: 'bekliyor',
      priority: newHwPriority,
      description: newHwDesc.trim() || 'Öğretmen yönergesi doğrultusunda tamamlanacaktır.',
      homeworkType: newHwType,
      attachments: attachmentsList,
      attachmentDetails: attachmentDetailsList,
      teacherNote: (newHwType === 'not' || newHwType === 'karma') ? newHwTeacherNote.trim() : undefined,
      studentCheckStatus: 'yapti',
      pointsPossible: Number(newHwPointsPossible) || 100,
      remainingDays: 5,
    };

    const updated = [newHw, ...teacherAssignments];
    setTeacherAssignments(updated);
    if (onAssignmentsChange) onAssignmentsChange(updated);

    // Formu temizle
    setNewHwTitle('');
    setNewHwDueDate('');
    setNewHwDesc('');
    setNewHwPointsPossible(100);
    setIsNewHwOpen(false);

    const typeLabels: Record<HomeworkType, string> = {
      pdf: 'PDF Föyü',
      resim: 'Görsel / Fotoğraf',
      not: 'Yazılı Not',
      karma: 'Karma Ödev',
    };

    showToast(`"${newHw.title}" ödevi (${typeLabels[newHwType]}) "${selectedClass}" sınıfına başarıyla gönderildi!`);
  };

  const handleSaveGrade = (subId: string) => {
    const score = gradingScores[subId] ?? 90;
    const feedback = gradingFeedbacks[subId] || 'Tebrikler, ödev tesliminiz onaylandı.';

    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: 'puanlandi', score, teacherFeedback: feedback } : s))
    );
    showToast(`Öğrenci ödevi puanlandı (${score} puan) ve veliye bildirim iletildi.`);
  };

  const handleSendReply = (msgId: string) => {
    const replyText = replyTexts[msgId];
    if (!replyText?.trim()) return;

    const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
            ...m,
            status: 'yanitlandi',
            reply: replyText,
            replyDate: 'Bugün ' + timeStr,
          }
          : m
      )
    );

    // Eğer Ahmet Demir (Emre Demir'in Velisi) ise canlı sohbete de anında ekle
    if (msgId === 'msg-1') {
      const chatReply: ChatMessage = {
        id: `cm-tch-${Date.now()}`,
        conversationId: 'tch-zehra',
        senderId: 'tch-zehra',
        senderRole: 'ogretmen',
        senderName: currentUser?.name || CURRENT_TEACHER.name,
        text: replyText,
        timestamp: `Bugün ${timeStr}`,
        timeOnly: timeStr,
        isRead: true,
        isDelivered: true,
      };
      setLiveChatMessages((prev) => [...prev, chatReply]);
      if (onSendChatMessage) {
        onSendChatMessage(chatReply);
      }
    }

    setReplyTexts((prev) => ({ ...prev, [msgId]: '' }));
    showToast('Velinin mesajına yanıtınız başarıyla gönderildi ve canlı sohbete işlendi.');
  };

  const handleSendLiveTeacherMessage = (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : teacherChatInput).trim();
    if (!textToSend) return;

    const now = new Date();
    const timeOnly = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `cm-tch-${Date.now()}`,
      conversationId: teacherSelectedChatId,
      senderId: 'tch-zehra',
      senderRole: 'ogretmen',
      senderName: currentUser?.name || CURRENT_TEACHER.name,
      senderBadge: 'Sınıf Rehber Öğretmeni',
      text: textToSend,
      timestamp: `Bugün ${timeOnly}`,
      timeOnly,
      isRead: true,
      isDelivered: true,
    };

    setLiveChatMessages((prev) => [...prev, newMsg]);
    if (onSendChatMessage) {
      onSendChatMessage(newMsg);
    }
    setTeacherChatInput('');
    const dest = teacherSelectedChatId === 'grp-7b' ? '7-B Veli Duyuru Grubuna' : 'Ahmet Demir velisine';
    showToast(`${dest} mesajınız anında iletildi.`);
  };

  const currentClassObj = teacherClasses.find((c) => c.name === selectedClass) || teacherClasses[0];
  const pendingSubCount = submissions.filter((s) => s.status === 'bekliyor').length;
  const pendingMsgCount = messages.filter((m) => m.status === 'bekliyor').length;
  const totalStudents = teacherClasses.reduce((acc, curr) => acc + curr.studentCount, 0);

  // İstatistik hesaplama (Aktif ödev için)
  const currentChecks = currentAssignmentChecks;
  let statYapti = 0;
  let statKismen = 0;
  let statYapmadi = 0;

  leaderboardStudents.forEach((st) => {
    const s = currentChecks[st.id]?.status || 'yapti';
    if (s === 'yapti') statYapti++;
    else if (s === 'kismen') statKismen++;
    else if (s === 'yapmadi') statYapmadi++;
  });

  // Filtrelenmiş öğrenci listesi
  const filteredStudents = leaderboardStudents.filter((st) => {
    const status = currentChecks[st.id]?.status || 'yapti';
    const matchesFilter = checkStatusFilter === 'all' || status === checkStatusFilter;
    const matchesSearch =
      st.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
      st.studentNo.includes(searchStudentQuery);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className={styles.dashboard}>

      {/* Toast Bildirimi */}
      {toastMessage && (
        <div role="status" className={styles.toast}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.avatar} aria-hidden="true">{currentUser?.avatar || CURRENT_TEACHER.avatar}</span>
          <div>
            <h1>Öğretmen paneli</h1>
            <p>{currentUser?.name || CURRENT_TEACHER.name} · {currentUser?.branch || CURRENT_TEACHER.branch}</p>
          </div>
        </div>
        <p className={styles.intro}>Sınıfınızın gelişimini birlikte takip edelim.</p>
        <div className={styles.classToolbar}>
          <label className={styles.classField} htmlFor="teacher-class">Çalıştığınız sınıf
            <select id="teacher-class" value={teacherClasses.some((cls) => cls.name === selectedClass) ? selectedClass : ''} onChange={(e) => setSelectedClass(e.target.value)} disabled={!teacherClasses.length}>
              {!teacherClasses.length && <option value="">Henüz sınıf eklenmedi</option>}
              {teacherClasses.map((cls) => <option key={cls.id} value={cls.name}>{cls.name}{cls.isHomeroom ? ' · Rehberlik sınıfı' : ''}</option>)}
            </select>
          </label>
          <div className={styles.headerActions}>
            <button type="button" className={styles.secondary} onClick={() => setActiveSubTab('bulk_message')}><Megaphone size={18} aria-hidden="true" />Toplu mesaj</button>
            <button type="button" className={styles.primary} onClick={() => { generateNewJoinCode('TRK'); setIsNewClassModalOpen(true); }}><Plus size={18} aria-hidden="true" />Yeni sınıf</button>
          </div>
        </div>
        <div className={styles.overview} aria-label="Panel özeti">
          <span><strong>{teacherClasses.length}</strong> sınıf</span>
          <span><strong>{totalStudents}</strong> kayıtlı öğrenci</span>
          <button type="button" onClick={() => setActiveSubTab('grading')}><strong>{pendingSubCount}</strong> bekleyen değerlendirme<ArrowRight size={16} aria-hidden="true" /></button>
          <button type="button" onClick={() => setActiveSubTab('messages')}><strong>{pendingMsgCount}</strong> yeni mesaj<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </header>

      <div className={styles.mobileNavigation}>
        <label htmlFor="teacher-module">Ne yapmak istersiniz?</label>
        <select id="teacher-module" value={activeSubTab} onChange={(e) => setActiveSubTab(e.target.value as typeof activeSubTab)}>
          {teacherModules.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
      </div>
      <nav className={styles.modules} aria-label="Öğretmen modülleri">
        {teacherModules.map((tab) => <button key={tab.id} type="button" aria-current={activeSubTab === tab.id ? 'page' : undefined} onClick={() => setActiveSubTab(tab.id)}><tab.icon size={18} aria-hidden="true" />{tab.label}</button>)}
      </nav>

      {activeSubTab === 'check_sheet' && !activeCheckingHw && <section className={styles.emptyState}><BookOpen size={32} aria-hidden="true" /><h2>Kontrol edilecek ödev yok</h2><p>Önce bir ödev oluşturun. Öğrencilerinizin durumunu burada takip edebilirsiniz.</p><button type="button" className={styles.primary} onClick={() => { setActiveSubTab('assignments'); setIsNewHwOpen(true); }}>Ödev oluştur<Plus size={18} aria-hidden="true" /></button></section>}
      {/* ========================================================================= */}
      {/* MODÜL 1: ÖDEV KONTROL ÇİZELGESİ (ÖĞRENCİ LİSTESİ + Yaptı / Kısmen / Yapmadı) */}
      {/* ========================================================================= */}
      {activeSubTab === 'check_sheet' && activeCheckingHw && (
        <div className="space-y-3.5">

          {/* Üst Bar: Kontrol Edilen Ödev Seçimi & Açıklaması */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Sınıf Ödev Kontrol Çizelgesi ({selectedClass} Şubesi)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Öğrenci ödevlerini ders esnasında veya sonrasında tek tek kontrol edip <strong>Yaptı</strong>, <strong>Kısmen</strong> veya <strong>Yapmadı</strong> olarak işaretleyebilirsiniz.
                </p>
              </div>

              {/* Kontrol Çizelgesini Kaydet Butonu */}
              <button
                type="button"
                onClick={handleSaveCheckSheet}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs self-start md:self-auto"
              >
                <Save className="w-4 h-4" />
                <span>Kontrolü Kaydet &amp; Velilere İlet</span>
              </button>
            </div>

            {/* ÖDEV SEÇİCİ DROPDOWN / PİLL BAR */}
            <div className={`${styles.checkContext} pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-600 shrink-0">
                  Kontrol Edilen Ödev:
                </span>
                <select
                  aria-label="Kontrol edilecek ödev"
                  value={activeCheckingHw.id}
                  onChange={(e) => setSelectedCheckHwId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-400 max-w-full"
                >
                  {teacherAssignments.map((hw) => (
                    <option key={hw.id} value={hw.id}>
                      {hw.title} ({hw.subject} • Teslim: {hw.dueDate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ödev Türü ve Tarih Bilgisi */}
              <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                  {activeCheckingHw.subject}
                </span>
                <span>•</span>
                <span>Son Teslim: <strong>{activeCheckingHw.dueDate}</strong></span>
              </div>
            </div>
          </div>

          {/* İSTATİSTİK VE HIZLI TOPLU İŞLEM BAR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Canlı İstatistik Sayaçları */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-xs font-semibold text-slate-500 mr-1">Sonuç Özeti:</span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{statYapti} Yaptı</span>
                  <span className="text-[10px] font-normal text-emerald-600">
                    (%{leaderboardStudents.length > 0 ? Math.round((statYapti / leaderboardStudents.length) * 100) : 0})
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{statKismen} Kısmen</span>
                  <span className="text-[10px] font-normal text-amber-600">
                    (%{leaderboardStudents.length > 0 ? Math.round((statKismen / leaderboardStudents.length) * 100) : 0})
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/70 font-bold">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>{statYapmadi} Yapmadı</span>
                  <span className="text-[10px] font-normal text-rose-600">
                    (%{leaderboardStudents.length > 0 ? Math.round((statYapmadi / leaderboardStudents.length) * 100) : 0})
                  </span>
                </span>
              </div>

              {/* Hızlı Toplu İşlem Butonları */}
              <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto">
                <span className="text-[11px] text-slate-400 mr-1">Toplu İşlem:</span>
                <button
                  type="button"
                  onClick={() => handleMarkAllStudents('yapti')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                >
                  Tümünü &quot;Yaptı&quot; işaretle
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllStudents('kismen')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                >
                  Tümünü &quot;Kısmen&quot; Yap
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllStudents('yapmadi')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                >
                  Tümünü &quot;Yapmadı&quot; Yap
                </button>
              </div>
            </div>

            {/* Arama & Durum Filtre Çubuğu */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Öğrenci adı veya okul numarası ara"
                  placeholder="Öğrenci adı veya okul no ara..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] text-slate-400 mr-1">Filtrele:</span>
                {[
                  { id: 'all', label: `Tümü (${leaderboardStudents.length})` },
                  { id: 'yapti', label: `Yaptı (${statYapti})` },
                  { id: 'kismen', label: `Kısmen (${statKismen})` },
                  { id: 'yapmadi', label: `Yapmadı (${statYapmadi})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={checkStatusFilter === f.id}
                    onClick={() => setCheckStatusFilter(f.id as typeof checkStatusFilter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${checkStatusFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Öğrenci kontrolü: telefonda tek sütun, geniş ekranda rahat çalışma alanı. */}
          <section className={styles.studentList} aria-label="Öğrenci ödev kontrolleri">
            <div className={styles.listHeading}><h3>Öğrenciler</h3><span>{filteredStudents.length} öğrenci listeleniyor</span></div>
            {filteredStudents.length === 0 && <div className={styles.emptyState}><Search size={28} aria-hidden="true" /><h3>Öğrenci bulunamadı</h3><p>Aramanızı veya durum filtresini değiştirebilirsiniz.</p><button type="button" className={styles.secondary} onClick={() => { setSearchStudentQuery(''); setCheckStatusFilter('all'); }}>Filtreleri temizle</button></div>}
            {filteredStudents.map((st) => {
              const currentStatus = currentChecks[st.id]?.status || 'yapti';
              const currentNote = currentChecks[st.id]?.note || '';
              const currentScore = currentChecks[st.id]?.score ?? (currentStatus === 'yapti' ? activeMaxPoints : currentStatus === 'kismen' ? Math.round(activeMaxPoints / 2) : 0);
              const stPoints = studentPoints[st.id] || getStudentPointsSummary(studentPoints, st.id, st.name, st.studentNo);
              return <article key={st.id} className={styles.studentRow}>
                <div className={styles.studentIdentity}>
                  <span className={styles.studentAvatar} aria-hidden="true">{st.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                  <div><h4>{st.name}</h4><p>Okul no: {st.studentNo} · Sıra: {st.rank}</p></div>
                </div>
                <fieldset className={styles.statusGroup}>
                  <legend>Ödev durumu <span className={styles.visuallyHidden}>— {st.name}</span></legend>
                  <div className={styles.statusChoices}>
                    {([
                      { value: 'yapti', label: 'Yaptı', icon: Check, style: styles.done },
                      { value: 'kismen', label: 'Kısmen', icon: Minus, style: styles.partial },
                      { value: 'yapmadi', label: 'Yapmadı', icon: X, style: styles.missing },
                    ] as const).map(({ value, label, icon: StatusIcon, style }) => <label key={value} className={`${styles.statusChoice} ${currentStatus === value ? style : ''}`}>
                      <input type="radio" name={`homework-status-${st.id}`} value={value} checked={currentStatus === value} onChange={() => handleSetStudentStatus(st.id, value)} />
                      <StatusIcon size={16} aria-hidden="true" /><span>{label}</span>
                    </label>)}
                  </div>
                </fieldset>
                <div className={styles.rowDetails}>
                  <label className={styles.scoreField} htmlFor={`score-${st.id}`}>Ödev puanı
                    <span><input id={`score-${st.id}`} type="number" inputMode="numeric" min={0} max={activeMaxPoints} value={currentScore} onChange={(e) => handleSetStudentScore(st.id, Number(e.target.value))} aria-label={`${st.name} ödev puanı`} /> / {activeMaxPoints}</span>
                  </label>
                  <div className={styles.pointField}><span>Katılım puanı</span><div className={styles.pointActions}>
                    <button type="button" className={styles.plusButton} aria-label={`${st.name} için artı puan ver`} onClick={(e) => handleQuickAddPlus(st.id, e)}><Plus size={20} aria-hidden="true" /></button>
                    <button type="button" className={styles.pointDetails} aria-label={`${st.name} puan ayrıntıları`} onClick={() => setPointModalStudent({ id: st.id, name: st.name, studentNo: st.studentNo, type: 'plus' })}>+{stPoints.plusCount} / −{stPoints.minusCount}</button>
                    <button type="button" className={styles.minusButton} aria-label={`${st.name} için eksi puan ver`} onClick={(e) => handleQuickAddMinus(st.id, e)}><Minus size={20} aria-hidden="true" /></button>
                  </div></div>
                </div>
                <label className={styles.noteField} htmlFor={`note-${st.id}`}>Kontrol notu <span>(isteğe bağlı)</span><input id={`note-${st.id}`} type="text" placeholder="Öğrenciyle ilgili kısa bir not…" value={currentNote} onChange={(e) => handleSetStudentNote(st.id, e.target.value)} aria-label={`${st.name} kontrol notu`} /></label>
              </article>;
            })}
            {/* Alt Çubuk ve Kaydet */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Toplam <strong>{filteredStudents.length}</strong> öğrenci listeleniyor. Sonlandırmak için kontrolü kaydedin.
              </span>

              <button
                type="button"
                onClick={handleSaveCheckSheet}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Ödev Kontrol Çizelgesini Kaydet</span>
              </button>
            </div>
          </section>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL: ARTI / EKSİ & DAVRANIŞ PUANLAMA */}
      {/* ========================================================================= */}
      {activeSubTab === 'plus_minus' && (
        <div className="space-y-3.5">
          {/* Başlık ve Özet Kartı */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">
                    Öğrenci Artı (+) / Eksi (-) &amp; Davranış Puanlama Çizelgesi
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ders içi katılım, soru çözümü, defter düzeni vb. için <strong>(+) Artı (+1 Puan)</strong>; derse hazırlıksızlık veya olumsuz davranış için <strong>(-) Eksi (-1 Puan)</strong> veriniz.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-xl border border-indigo-100">
                  1 Artı = +1 Puan • 1 Eksi = -1 Puan
                </span>
              </div>
            </div>

            {/* 4 Özet İstatistik Kartı */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl">
                <span className="text-[11px] font-medium text-emerald-800 block">Sınıf Toplam Artı</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">
                  +{Object.values(studentPoints).reduce((acc, curr) => acc + (curr.plusCount || 0), 0)} Artı
                </p>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Aktif katılım ödülü</span>
              </div>

              <div className="bg-rose-50/60 border border-rose-100 p-3 rounded-xl">
                <span className="text-[11px] font-medium text-rose-800 block">Sınıf Toplam Eksi</span>
                <p className="text-lg font-bold text-rose-700 mt-0.5">
                  -{Object.values(studentPoints).reduce((acc, curr) => acc + (curr.minusCount || 0), 0)} Eksi
                </p>
                <span className="text-[10px] text-rose-600 block mt-0.5">Eksik araç-gereç/düzen</span>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl">
                <span className="text-[11px] font-medium text-indigo-800 block">Sınıf Net Puanı</span>
                <p className="text-lg font-bold text-indigo-700 mt-0.5">
                  +{Object.values(studentPoints).reduce((acc, curr) => acc + (curr.netScore || 0), 0)} Puan
                </p>
                <span className="text-[10px] text-indigo-600 block mt-0.5">Sözlü ve başarıya etki</span>
              </div>

              <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl">
                <span className="text-[11px] font-medium text-amber-800 block">Kendi Öğrenciniz (Emre)</span>
                <p className="text-lg font-bold text-amber-700 mt-0.5">
                  +{studentPoints['ogr-452']?.plusCount || 5} / -{studentPoints['ogr-452']?.minusCount || 1}
                </p>
                <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                  Net: +{studentPoints['ogr-452']?.netScore || 4} Puan
                </span>
              </div>
            </div>

            {/* Arama ve Filtreleme */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Öğrenci veya numara ara..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tüm Sınıf (28)' },
                  { id: 'plus', label: 'En Çok Artı Alanlar' },
                  { id: 'minus', label: 'Eksi Alanlar' },
                  { id: 'emre', label: 'Kendi Öğrenciniz (Emre)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPointsFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${pointsFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Oturum & Toplu İşlem Çubuğu */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 font-extrabold text-lg">
                ±
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Öğrenci Listesi ile Anlık Artı / Eksi Verme
                  </h4>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                    {sessionDate} • 7-B {sessionSubject}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Her öğrencinin numara ve adının hemen yanındaki <strong>[ + Artı (+1 Puan) ]</strong> veya <strong>[ - Eksi (-1 Puan) ]</strong> butonuna dokunarak yoklama ve katılımı anında işleyebilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleMarkAllClassPlus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Tüm sınıfa +1 puanlık artı ver"
              >
                <span>✨ Tüm Sınıfa Artı Ver</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllSessionMarks}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Bugünkü ders işaretlemelerini sıfırla"
              >
                <span>↺ Sıfırla</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSessionMarks}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                title="Çizelgeyi kaydet ve veli paneline yansıt"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Çizelgeyi Kaydet</span>
              </button>
            </div>
          </div>

          {/* Öğrenci Artı/Eksi Listesi */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold gap-2">
              <span className="flex-1">Öğrenci No &amp; İsim</span>
              <span className="w-56 sm:w-64 text-center">Ders İçi Seçim: [ + Artı ] veya [ - Eksi ]</span>
              <span className="w-32 text-center hidden md:inline-block">Sayaç &amp; Net Puan</span>
              <span className="w-48 text-right hidden lg:inline-block">Gerekçe &amp; Not</span>
            </div>

            <div className="divide-y divide-slate-100">
              {leaderboardStudents.filter((st) => {
                const pts = studentPoints[st.id] || getStudentPointsSummary(studentPoints, st.id, st.name, st.studentNo);
                const matchesSearch = st.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) || st.studentNo.includes(searchStudentQuery);
                if (!matchesSearch) return false;
                if (pointsFilter === 'plus') return pts.plusCount > 3;
                if (pointsFilter === 'minus') return pts.minusCount > 0;
                if (pointsFilter === 'emre') return st.isCurrentUser;
                return true;
              }).map((st) => {
                const pts = studentPoints[st.id] || getStudentPointsSummary(studentPoints, st.id, st.name, st.studentNo);
                const isMyStudent = st.isCurrentUser;
                const currentMark = sessionMarks[st.id];

                return (
                  <div
                    key={st.id}
                    className={`p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-colors ${isMyStudent ? 'bg-indigo-50/50 rounded-xl ring-1 ring-indigo-200/60' : 'hover:bg-slate-50/60'
                      }`}
                  >
                    {/* 1. ÖĞRENCİ NUMARASI VE ADI */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center font-bold text-xs text-slate-800 shrink-0">
                        <span className="text-[9px] text-slate-400 font-semibold tracking-wider">NO</span>
                        <span>{st.studentNo}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm ${isMyStudent ? 'font-bold text-indigo-950' : 'font-semibold text-slate-900'}`}>
                            {st.name}
                          </span>
                          {isMyStudent && (
                            <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs">
                              👑 Kendi Öğrenciniz (Emre)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          7-B Sınıfı • Başarı: #{st.rank} • Genel Not: {st.average}
                        </span>
                      </div>
                    </div>

                    {/* 2. YANINDAKİ ARTI VEYA EKSİ SEÇİMİ (CHECKBOX / DÜĞME) */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* + Artı Checkbox / Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleStudentSessionMark(st.id, 'plus')}
                        className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border select-none ${currentMark === 'plus'
                            ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 shadow-2xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                      >
                        <span className="text-sm font-black">{currentMark === 'plus' ? '✓' : '+'}</span>
                        <span>+ Artı (+1 Puan)</span>
                      </button>

                      {/* - Eksi Checkbox / Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleStudentSessionMark(st.id, 'minus')}
                        className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border select-none ${currentMark === 'minus'
                            ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-200 shadow-2xs'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                      >
                        <span className="text-sm font-black">{currentMark === 'minus' ? '✕' : '-'}</span>
                        <span>- Eksi (-1 Puan)</span>
                      </button>

                      {/* Seçim Varsa Sıfırlama Butonu */}
                      {currentMark && (
                        <button
                          type="button"
                          onClick={() => setSessionMarks((prev) => ({ ...prev, [st.id]: null }))}
                          title="Seçimi Nötrle / Temizle"
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 3. CANLI SAYAÇ & STEPPER (+ / -) */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleQuickAddMinus(st.id); }}
                        title="-1 Eksi Ekle (-1 Puan)"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 text-xs font-extrabold flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        -
                      </button>

                      <div className="text-center px-2 min-w-16">
                        <div className="flex items-center justify-center gap-1 text-xs font-bold">
                          <span className="text-emerald-700">+{pts.plusCount}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600">-{pts.minusCount}</span>
                        </div>
                        <span className={`text-[10px] font-extrabold block ${pts.netScore > 0 ? 'text-emerald-700' : pts.netScore < 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                          {pts.netScore > 0 ? `+${pts.netScore}` : pts.netScore}p Net
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleQuickAddPlus(st.id); }}
                        title="+1 Artı Ekle (+1 Puan)"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 text-xs font-extrabold flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        +
                      </button>
                    </div>

                    {/* 4. GEREKÇE SEÇİMİ VE DETAY BUTONU */}
                    <div className="flex items-center gap-2 flex-1 lg:flex-none">
                      <select
                        value={sessionReasons[st.id] || (currentMark === 'minus' ? '⚠️ Kitap / Defter Eksik' : '🌟 Ders İçi Katılım & Soru Çözümü')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSessionReasons((prev) => ({ ...prev, [st.id]: val }));
                        }}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:outline-hidden max-w-44 truncate font-medium cursor-pointer"
                      >
                        <option value="🌟 Ders İçi Katılım & Soru Çözümü">🌟 Ders İçi Katılım</option>
                        <option value="✏️ Tahtada Soru Çözümü">✏️ Tahtada Çözüm</option>
                        <option value="📓 Örnek Defter Düzeni">📓 Defter Düzeni</option>
                        <option value="🤝 Örnek Davranış & Dayanışma">🤝 Örnek Davranış</option>
                        <option value="⚠️ Kitap / Defter Eksik">⚠️ Araç Gereç Eksik</option>
                        <option value="💬 Dersi Bölme / Konuşma">💬 Dersi Bölme</option>
                        <option value="⏱️ Derse Geç Kalma">⏱️ Derse Geç Kalma</option>
                        <option value="❌ Verilen Ödevi Getirmeme">❌ Ödev Eksik</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setPointModalStudent({
                            id: st.id,
                            name: st.name,
                            studentNo: st.studentNo,
                            type: currentMark || 'plus',
                          });
                          setPointReasonText(sessionReasons[st.id] || '');
                        }}
                        title="Detaylı Puanlama & Açıklama Yaz"
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Alt Çubuk ve Kaydet */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Toplam <strong>{leaderboardStudents.length}</strong> öğrenci listeleniyor. Yapılan artı ve eksi değerlendirmeleri doğrudan öğrencinin başarı puanına ve veli karnesine işlenir.
              </span>

              <button
                type="button"
                onClick={handleSaveSessionMarks}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Artı / Eksi Çizelgesini Kaydet</span>
              </button>
            </div>
          </div>

          {/* Son Verilen Artı / Eksi Puanları Akışı (Tarihçe & Geri Alma) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Son Verilen Artı / Eksi Hareketleri
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Öğrencilere verilen son değerlendirmeler (Öğretmen, ders ve gerekçe bilgisi)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {Object.values(studentPoints)
                .flatMap((sp) => sp.history || [])
                .slice(0, 8)
                .map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${rec.type === 'plus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                        {rec.type === 'plus' ? '+' : '-'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{rec.studentName}</span>
                          <span className="text-[10px] text-slate-400">({rec.studentNo})</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${rec.type === 'plus' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                            {rec.points > 0 ? `+${rec.points}` : rec.points} Puan
                          </span>
                          <span className="text-[10px] text-slate-400">• {rec.subject} ({rec.teacherName})</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          Gerekçe: &ldquo;{rec.reason}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 hidden sm:inline">{rec.date}</span>
                      <button
                        type="button"
                        onClick={() => handleDeletePointRecord(rec.studentId, rec.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Bu kaydı sil / geri al"
                      >
                        Geri Al
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL 2: ÖDEV GÖNDERME (PDF, RESİM VEYA NOT) & ÖDEV YÖNETİMİ */}
      {/* ========================================================================= */}
      {activeSubTab === 'assignments' && (
        <div className="space-y-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {selectedClass} Sınıfına Verilen Ödevler
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğrencilerinize PDF alıştırma föyü, tahta fotoğrafı/resim veya özel yazılı yönerge notu gönderebilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewHwOpen(!isNewHwOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isNewHwOpen ? 'Formu Kapat' : 'Yeni Ödev Gönder'}</span>
            </button>
          </div>

          {/* YENİ ÖDEV GÖNDERME FORMU (PDF, RESİM VEYA NOT) */}
          {isNewHwOpen && (
            <form onSubmit={handleCreateAssignment} className="bg-white rounded-2xl p-4 sm:p-6 border border-indigo-200 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedClass} Sınıfına Yeni Ödev Tanımla</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ödev türünü seçiniz: PDF Dokümanı, Ders Tahtası / Soru Fotoğrafı veya Yazılı Ders Notu
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewHwOpen(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. ÖDEV TÜRÜ SEÇİMİ (PDF / RESİM / NOT / KARMA) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Ödev Formatı / Türünü Seçiniz:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'pdf', title: 'PDF Belgesi', desc: 'Çalışma föyü, test yaprağı', icon: File, color: 'text-red-600 bg-red-50 border-red-200' },
                    { id: 'resim', title: 'Resim / Fotoğraf', desc: 'Tahta fotoğrafı, soru görseli', icon: ImageIcon, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                    { id: 'not', title: 'Yazılı Ders Notu', desc: 'Ödev talimatı, sayfa aralığı', icon: StickyNote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { id: 'karma', title: 'Karma (PDF+Resim+Not)', desc: 'Tüm ekleri birleştir', icon: Paperclip, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
                  ].map((t) => {
                    const isSelected = newHwType === t.id;
                    const IconComp = t.icon;
                    return (
                      <div
                        key={t.id}
                        onClick={() => applyHomeworkTemplate(t.id as HomeworkType)}
                        className={`p-3 rounded-xl border cursor-pointer select-none transition-all duration-150 flex flex-col justify-between ${isSelected
                            ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100'
                            : 'border-slate-200/90 hover:border-slate-300 bg-white'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.color}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 leading-tight">
                            {t.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {t.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. TEMEL ÖDEV BİLGİLERİ */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ödev Başlığı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Cümlede Anlam ve Paragraf Tahlili Testi"
                    value={newHwTitle}
                    onChange={(e) => setNewHwTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ödev Puanı (Tam Puan) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    required
                    value={newHwPointsPossible}
                    onChange={(e) => setNewHwPointsPossible(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Son Teslim Tarihi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newHwDueDate}
                    onChange={(e) => setNewHwDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* 3. ÖDEV TÜRÜNE ÖZEL İÇERİK ALANLARI */}
              {(newHwType === 'pdf' || newHwType === 'karma') && (
                <div className="bg-red-50/40 border border-red-200/70 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <File className="w-4 h-4 text-red-600" />
                      <span>PDF Dosyası Eki (Öğrencinin İndireceği Çalışma Kağıdı)</span>
                    </span>
                    <span className="text-[10px] text-red-600 font-medium">PDF Belgesi</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">PDF Dosya Adı</label>
                      <input
                        type="text"
                        value={newHwPdfName}
                        onChange={(e) => setNewHwPdfName(e.target.value)}
                        placeholder="Örn: 7B_Turkce_Paragraf_Testi.pdf"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Tahmini Boyut</label>
                      <input
                        type="text"
                        value={newHwPdfSize}
                        onChange={(e) => setNewHwPdfSize(e.target.value)}
                        placeholder="1.8 MB"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(newHwType === 'resim' || newHwType === 'karma') && (
                <div className="bg-amber-50/40 border border-amber-200/70 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>Resim / Tahta Fotoğrafı Eki (Görsel Materyal)</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium">Fotoğraf / Şema</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Görsel / Fotoğraf Dosya Adı</label>
                    <input
                      type="text"
                      value={newHwImageName}
                      onChange={(e) => setNewHwImageName(e.target.value)}
                      placeholder="Örn: Tahta_Notu_Cumlede_Anlam_Semasi.jpg"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {(newHwType === 'not' || newHwType === 'karma') && (
                <div className="bg-emerald-50/40 border border-emerald-200/70 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <StickyNote className="w-4 h-4 text-emerald-600" />
                      <span>Öğretmen Özel Ders Notu &amp; Yönergesi</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">Yazılı Not</span>
                  </div>

                  <textarea
                    rows={3}
                    required={newHwType === 'not'}
                    placeholder="Örn: Sayfa 84-88 arası sorular çözülecek..."
                    value={newHwTeacherNote}
                    onChange={(e) => setNewHwTeacherNote(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ödev Genel Açıklaması
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Genel açıklama..."
                  value={newHwDesc}
                  onChange={(e) => setNewHwDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewHwOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Ödevi Sınıfa Gönder</span>
                </button>
              </div>
            </form>
          )}

          {/* VERİLEN ÖDEVLER LİSTESİ */}
          <div className="space-y-2.5">
            {teacherAssignments.map((hw) => (
              <div
                key={hw.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">{hw.title}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      {hw.subject}
                    </span>

                    {/* Format Rozeti */}
                    {hw.homeworkType === 'pdf' && (
                      <span className="text-[10px] bg-red-50 text-red-700 border border-red-200/60 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <File className="w-3 h-3 text-red-600" /> PDF Föyü
                      </span>
                    )}
                    {hw.homeworkType === 'resim' && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-amber-600" /> Görsel / Tahta Fotoğrafı
                      </span>
                    )}
                    {hw.homeworkType === 'not' && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <StickyNote className="w-3 h-3 text-emerald-600" /> Yazılı Not
                      </span>
                    )}
                    {hw.homeworkType === 'karma' && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-indigo-600" /> Karma Ödev
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {hw.description}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span>Son Teslim: <strong className="text-slate-600 font-medium">{hw.dueDate}</strong></span>
                    <span>•</span>
                    <span>Sınıf: <strong className="text-slate-600 font-medium">{hw.className || selectedClass}</strong></span>
                  </div>
                </div>

                {/* Eylemler: Kontrol Çizelgesini Aç */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCheckHwId(hw.id);
                      setActiveSubTab('check_sheet');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ödev Kontrol Çizelgesi →</span>
                  </button>

                  <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                    {hw.pointsPossible} Puan
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL 3: SINIFLARIM & YENİ SINIF OLUŞTURMA */}
      {/* ========================================================================= */}
      {activeSubTab === 'classes' && (
        <div className={styles.dashboard}>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Öğretmen Sınıflarım ve Gruplarım
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Yeni bir ders şubesi, LGS hazırlık grubu veya etüt sınıfı oluşturup öğrencilerin katılım kodunu almasını sağlayabilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                generateNewJoinCode('TRK');
                setIsNewClassModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Sınıf Oluştur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {teacherClasses.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200">
                <School className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Henüz kayıtlı sınıf veya şubeniz bulunmamaktadır.</p>
                <p className="text-[11px] text-slate-400 mt-1">Ders verdiğiniz sınıfları eklemek için yukarıdaki "Yeni Sınıf Oluştur" butonunu kullanabilirsiniz.</p>
              </div>
            ) : (
              teacherClasses.map((cls) => {
              const isSelected = selectedClass === cls.name;
              const occupancy = Math.round((cls.studentCount / (cls.capacity || 30)) * 100);

              return (
                <div
                  key={cls.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-150 relative ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-50 bg-indigo-50/10' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-slate-900">{cls.name}</h4>
                          <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {cls.grade}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                          {cls.branch} • {cls.room}
                        </span>
                      </div>

                      {cls.isHomeroom ? (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
                          Sınıf Rehberliği
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                          Ders Grubu
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 mb-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500">
                          Öğrenci &amp; Veli Katılım Kodu:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyJoinCode(cls.joinCode, e)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {copiedCode === cls.joinCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Kopyalandı!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kodu Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                          {cls.joinCode}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cls.createdAt}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                      {cls.description}
                    </p>

                    <div className="space-y-1.5 py-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Kayıtlı Öğrenci:</span>
                        <span className="font-semibold text-slate-800">
                          {cls.studentCount} / {cls.capacity} ({occupancy}%)
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${occupancy > 90 ? 'bg-amber-500' : 'bg-indigo-600'
                            }`}
                          style={{ width: `${Math.min(100, occupancy || 5)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span>Sınıf Not Ortalaması:</span>
                        <span className="font-bold text-slate-900">
                          {cls.averageScore > 0 ? `${cls.averageScore} Puan` : 'Henüz Sınav Yok'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-2">
                    {isSelected ? (
                      <span className="w-full text-center py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold">
                        ✓ Şu An Seçili Sınıf
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClass(cls.name);
                          showToast(`"${cls.name}" sınıfına geçildi.`);
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors"
                      >
                        Bu Sınıfı Yönet
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClass(cls.name);
                        setActiveSubTab('assignments');
                        setIsNewHwOpen(true);
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors shrink-0"
                    >
                      Ödev Ver
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL 4: YÜKLENEN ÖDEVLERİ PUANLAMA */}
      {/* ========================================================================= */}
      {activeSubTab === 'grading' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {selectedClass} Sınıfı - Teslim Edilen Öğrenci Ödevleri
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğrencilerin sisteme yüklediği ödevleri inceleyip puanlayabilir ve veliye pedagojik geri bildirimi iletebilirsiniz.
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-medium self-start sm:self-auto">
              Toplam {submissions.length} Teslim
            </span>
          </div>

          <div className="space-y-2.5">
            {submissions.map((sub) => {
              const isExpanded = expandedSubId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`bg-white rounded-2xl border transition-all duration-150 overflow-hidden ${isExpanded ? 'border-slate-300' : 'border-slate-200/90'
                    }`}
                >
                  <div
                    onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                    className="p-3.5 sm:p-4 cursor-pointer select-none flex items-center justify-between gap-3 hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                        {sub.studentNo}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                            {sub.studentName}
                          </h4>
                          {sub.status === 'bekliyor' ? (
                            <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md">
                              Puanlama Bekliyor
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                              Puanlandı: {sub.score} / 100
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {sub.assignmentTitle} • Teslim: {sub.submittedDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        {sub.submittedFile}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span>Teslim Dosyası: <strong>{sub.submittedFile}</strong></span>
                        <button
                          type="button"
                          onClick={() => alert(`"${sub.submittedFile}" dosyası incelenmek üzere indiriliyor.`)}
                          className="text-indigo-600 font-medium hover:underline text-xs"
                        >
                          Dosyayı Aç / İncele
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Puan (100 Üzerinden)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradingScores[sub.id] ?? (sub.score || 90)}
                            onChange={(e) =>
                              setGradingScores({ ...gradingScores, [sub.id]: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:border-slate-300"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Veli &amp; Öğrenci Değerlendirme Notu
                          </label>
                          <input
                            type="text"
                            placeholder="Öğretmen değerlendirme notunu buraya yazınız..."
                            value={gradingFeedbacks[sub.id] ?? (sub.teacherFeedback || '')}
                            onChange={(e) =>
                              setGradingFeedbacks({ ...gradingFeedbacks, [sub.id]: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-slate-300"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveGrade(sub.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Puanı Sisteme Kaydet</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL 5: NOT VE SINAV GİRİŞİ */}
      {/* ========================================================================= */}
      {activeSubTab === 'grade_entry' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedClass} Sınıfı Not ve Puan Giriş Çizelgesi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ders yazılı ve sözlü notlarını anlık güncelleyebilir, kaydedebilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={() => showToast('Not çizelgesi sisteme başarıyla kaydedildi.')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Tümünü Kaydet</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2 px-2">No</th>
                  <th className="py-2 px-3">Öğrenci Adı Soyadı</th>
                  <th className="py-2 px-2 text-center">1. Yazılı</th>
                  <th className="py-2 px-2 text-center">2. Yazılı</th>
                  <th className="py-2 px-2 text-center">1. Sözlü</th>
                  <th className="py-2 px-2 text-center">Ödev Ort.</th>
                  <th className="py-2 px-2 text-right">Ders Ort.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboardStudents.slice(0, 10).map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-medium text-slate-400">{st.studentNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {st.name}
                      {st.isCurrentUser && (
                        <span className="ml-1.5 text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded-sm">Öğrenci</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        defaultValue={Math.min(100, Math.round(st.average + 1))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-xs focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        defaultValue={Math.min(100, Math.round(st.average - 2))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-xs focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        defaultValue={Math.min(100, Math.round(st.average + 4))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-xs focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="font-semibold text-slate-700">{st.completedHomeworks * 4 + 12}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">{st.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL 6: VELİ MESAJLARI & CANLI SOHBET */}
      {/* ========================================================================= */}
      {activeSubTab === 'messages' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Veli İletişimi & Canlı Mesajlaşma</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Anlık Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğrenci velilerinden gelen ders ve rehberlik sorularını anlık olarak yanıtlayabilirsiniz.
              </p>
            </div>

            {/* Görünüm Modu Seçimi: Canlı Sohbet vs Gelen Kutusu */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setMessageViewMode('live_chat');
                  setTeacherSelectedChatId('grp-7b');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${messageViewMode === 'live_chat' && teacherSelectedChatId === 'grp-7b'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span>📢 7-B Veli Duyuru Grubu (28 Veli)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessageViewMode('live_chat');
                  setTeacherSelectedChatId('tch-zehra');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${messageViewMode === 'live_chat' && teacherSelectedChatId === 'tch-zehra'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span>💬 Ahmet Demir (452 Emre) Özel Sohbet</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageViewMode('inbox')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${messageViewMode === 'inbox'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                📋 Tüm Gelen Mesajlar ({messages.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('bulk_message')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1.5 border border-indigo-200"
              >
                <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>📢 Toplu Mesaj &rarr;</span>
              </button>
            </div>
          </div>

          {/* GÖRÜNÜM 1: CANLI SOHBET AKIŞI (WhatsApp Tarzı) */}
          {messageViewMode === 'live_chat' ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">

              {/* Sohbet Başlığı */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center text-white shadow-2xs ${teacherSelectedChatId === 'grp-7b' ? 'bg-emerald-600' : 'bg-indigo-600'
                    }`}>
                    {teacherSelectedChatId === 'grp-7b' ? '📢' : 'AD'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {teacherSelectedChatId === 'grp-7b' ? '7-B Resmi Veli Bilgilendirme Grubu' : 'Ahmet Demir'}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-sm ${teacherSelectedChatId === 'grp-7b' ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                        {teacherSelectedChatId === 'grp-7b' ? '28 Katılımcı (WhatsApp Sınıf Grubu)' : '452 Emre Demir Velisi (7-B)'}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {teacherSelectedChatId === 'grp-7b' ? 'Tüm 7-B velileri bu kanala bağlıdır' : 'Veli Paneli ile Çift Yönlü Canlı Bağlantı Açık'}
                    </span>
                  </div>
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  Öğretmen: Zehra Aydın
                </span>
              </div>

              {/* Mesaj Listesi */}
              <div className="p-4 max-h-[460px] overflow-y-auto space-y-3 bg-gradient-to-b from-slate-50/40 to-white">
                {liveChatMessages
                  .filter((m) => m.conversationId === teacherSelectedChatId)
                  .map((msg) => {
                    const isTeacher = msg.senderRole === 'ogretmen';

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isTeacher ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isTeacher && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mb-1 shadow-2xs">
                            AD
                          </div>
                        )}

                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs ${isTeacher
                              ? 'bg-slate-900 text-white rounded-br-xs shadow-2xs'
                              : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs shadow-2xs'
                            }`}
                        >
                          <span className={`text-[10px] font-bold block mb-0.5 ${isTeacher ? 'text-slate-300' : 'text-indigo-700'}`}>
                            {isTeacher ? 'Siz (Zehra Aydın)' : msg.senderName}
                          </span>

                          <p className="leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </p>

                          {msg.attachment && (
                            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span className="text-[11px] font-semibold truncate">{msg.attachment.name}</span>
                            </div>
                          )}

                          <div className={`text-[10px] text-right mt-1 ${isTeacher ? 'text-slate-400' : 'text-slate-400'}`}>
                            {msg.timeOnly}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Hızlı Öğretmen Şablonları */}
              <div className="px-3 pt-2 pb-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Hızlı Yanıt:</span>
                {(teacherSelectedChatId === 'grp-7b'
                  ? [
                    '📢 Yarınki ders ödevlerini hatırlatırım.',
                    '📅 Pazar günkü veli toplantımızı rica ederim.',
                    '📚 Kitap okuma saatini uygulamayı unutmayınız.',
                    '👍 Sınıfımızın bu haftaki başarısını tebrik ederim.',
                  ]
                  : [
                    '👍 Ödevi inceledim ve sisteme tam puan olarak kaydettim.',
                    '📅 Çarşamba günü saat 15:00\'te rehberlik odasında görüşebiliriz.',
                    '🌟 Emre\'nin ders içi gayreti ve performansı çok iyi, tebrik ederim.',
                    '📚 Yarın derste konunun alıştırmalarını tahtada çözeceğiz.',
                  ]
                ).map((resp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendLiveTeacherMessage(resp)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-600 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    {resp}
                  </button>
                ))}
              </div>

              {/* Mesaj Yazma Alanı */}
              <div className="p-3 bg-white border-t border-slate-200/80">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={
                      teacherSelectedChatId === 'grp-7b'
                        ? '7-B Veli Grubuna anlık grup mesajı yazın... (Enter ile gönder)'
                        : 'Ahmet Demir velisine anlık öğretmen yanıtınızı yazın... (Enter ile gönder)'
                    }
                    value={teacherChatInput}
                    onChange={(e) => setTeacherChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendLiveTeacherMessage();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendLiveTeacherMessage()}
                    disabled={!teacherChatInput.trim()}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${teacherChatInput.trim()
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Yanıtı Gönder</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* GÖRÜNÜM 2: GELEN KUTUSU LİSTESİ */
            <div className="space-y-2.5">
              {messages.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{m.parentName}</span>
                      <span className="text-xs text-slate-400 ml-1.5">({m.studentName} - No: {m.studentNo})</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{m.date}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      Konu: {m.topic}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {m.message}
                    </p>
                  </div>

                  {m.status === 'yanitlandi' && m.reply ? (
                    <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs">
                      <span className="font-semibold text-indigo-900 block mb-0.5">
                        Yanıtınız ({m.replyDate}):
                      </span>
                      <p className="text-indigo-950">{m.reply}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={2}
                        placeholder="Veliye iletilecek yanıtınızı buraya yazınız..."
                        value={replyTexts[m.id] || ''}
                        onChange={(e) => setReplyTexts({ ...replyTexts, [m.id]: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none"
                      />
                      <div className="flex items-center justify-between">
                        {m.id === 'msg-1' && (
                          <button
                            type="button"
                            onClick={() => setMessageViewMode('live_chat')}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            💬 Canlı Sohbet Odasında Aç &rarr;
                          </button>
                        )}
                        <div className="ml-auto">
                          <button
                            type="button"
                            onClick={() => handleSendReply(m.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Yanıtı Gönder</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODÜL 6.5: VELİLERE TOPLU MESAJ & SMS GÖNDERİMİ */}
      {/* ========================================================================= */}
      {activeSubTab === 'bulk_message' && (
        <TeacherBulkMessageSection
          onSendBroadcastMessage={onSendBroadcastMessage}
          onSendChatMessage={onSendChatMessage}
          onAddAnnouncement={onAddAnnouncement}
          className={selectedClass}
        />
      )}

      {/* ========================================================================= */}
      {/* MODÜL 7: SINIF BAŞARI SIRALAMASI */}
      {/* ========================================================================= */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedClass} Sınıfı Genel Başarı Sıralaması (28 Öğrenci)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sınıf öğretmeni yetkisiyle tüm öğrenci başarı karnesini görüntüleyebilirsiniz.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {leaderboardStudents.map((st) => (
              <div key={st.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                    {st.rank}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">{st.name}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">No: {st.studentNo}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500 hidden sm:inline">{st.completedHomeworks} ödev</span>
                  <span className="font-bold text-slate-900">{st.average}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* YENİ SINIF OLUŞTURMA MODALI */}
      {/* ========================================================================= */}
      {isNewClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-slate-200 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Yeni Sınıf / Grup Oluştur
                  </h3>
                  <p className="text-xs text-slate-500">
                    Öğretmen paneline yeni bir şube veya kurs grubu tanımlayın.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewClassModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Hızlı Şablon Seçimi:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: '7-C', grade: '7. Sınıf', branch: 'Türkçe', room: 'Derslik 205', desc: '7-C Şubesi haftalık Türkçe dersi ve okuma saati.' },
                  { name: '8-A LGS', grade: '8. Sınıf', branch: 'Türkçe (LGS)', room: 'Derslik 301', desc: '8-A LGS Paragraf taktikleri ve deneme analizi.' },
                  { name: 'DYK Kursu', grade: 'Destekleme Kursu', branch: 'Türkçe Destek', room: 'Bilişim Salonu', desc: 'Hafta sonu takviye ve etüt çalışma grubu.' },
                ].map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyClassTemplate(tpl)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg text-xs text-slate-700 font-medium transition-colors"
                  >
                    + {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sınıf / Şube Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 7-C veya 8-A LGS"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sınıf Düzeyi / Seviye
                  </label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  >
                    <option value="5. Sınıf">5. Sınıf</option>
                    <option value="6. Sınıf">6. Sınıf</option>
                    <option value="7. Sınıf">7. Sınıf</option>
                    <option value="8. Sınıf">8. Sınıf</option>
                    <option value="Destekleme Kursu">Destekleme &amp; Yetiştirme Kursu (DYK)</option>
                    <option value="Kulüp &amp; Proje">Kulüp &amp; Proje Grubu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ders / Branş
                  </label>
                  <input
                    type="text"
                    value={newClassBranch}
                    onChange={(e) => setNewClassBranch(e.target.value)}
                    placeholder="Örn: Türkçe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Derslik / Salon
                  </label>
                  <input
                    type="text"
                    value={newClassRoom}
                    onChange={(e) => setNewClassRoom(e.target.value)}
                    placeholder="Örn: Derslik 205"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kontenjan
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={newClassCapacity}
                    onChange={(e) => setNewClassCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Öğrenci &amp; Veli Katılım Kodu</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => generateNewJoinCode(newClassName.slice(0, 3).toUpperCase() || 'TRK')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Yeni Kod Üret ↻
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newClassJoinCode}
                    onChange={(e) => setNewClassJoinCode(e.target.value.toUpperCase())}
                    className="font-mono text-sm font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full focus:outline-hidden tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Öğrenciler ve veliler sisteme girerken bu kodu kullanarak doğrudan bu sınıfa kaydolurlar.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sınıf Açıklaması ve Öğrenci Yönergesi
                </label>
                <textarea
                  rows={2}
                  placeholder="Ders hedefleri, ders saati ve ödev kuralları..."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="homeroomCheck"
                  checked={newClassIsHomeroom}
                  onChange={(e) => setNewClassIsHomeroom(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="homeroomCheck" className="text-xs text-slate-700 select-none cursor-pointer">
                  Bu sınıfın <strong>Sınıf Rehber Öğretmeniyim</strong> (Rehberlik ve veli görüşmeleri yetkisi)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sınıfı Oluştur ve Yayınla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PDF ÖNİZLEME MODALI */}
      {/* ========================================================================= */}
      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <File className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {previewPdf.fileName}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Öğretmen PDF Önizleme • {previewPdf.size || '1.8 MB'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showToast(`"${previewPdf.fileName}" indirildi.`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 space-y-4">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4 text-xs text-slate-800">
                <div className="border-b pb-3 flex items-center justify-between text-slate-400 text-[10px]">
                  <span>{currentUser?.name || CURRENT_TEACHER.name} • {currentUser?.branch || CURRENT_TEACHER.branch} ZÜMRESİ</span>
                  <span>Sayfa: 1 / 2</span>
                </div>

                <div className="text-center py-2">
                  <h4 className="text-sm font-bold text-slate-900 uppercase">
                    {previewPdf.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Haftalık Ders Çalışma &amp; Soru Çözüm Föyü
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-800">Alıştırma Bölümü 1:</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Verilen metindeki altı çizili deyimleri tespit ediniz ve gerçek/mecaz anlam durumlarını belirtiniz.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-800">Alıştırma Bölümü 2 (LGS Paragraf Sorusunu Çözünüz):</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Bu parçada asıl anlatılmak istenen düşünce aşağıdakilerden hangisidir? Gerekçesiyle açıklayınız.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Öğretmen Materyal Kontrolü</span>
              <button
                type="button"
                onClick={() => setPreviewPdf(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESİM / GÖRSEL ÖNİZLEME MODALI */}
      {/* ========================================================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {previewImage.fileName}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Ders Tahtası / Soru Fotoğrafı Önizlemesi
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showToast(`"${previewImage.fileName}" indirildi.`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-900 flex flex-col items-center justify-center min-h-[260px] text-white">
              <div className="w-full max-w-md bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[10px] border-b border-slate-700 pb-2">
                  <span>DERSLİK 204 • TÜRKÇE TAHTASI</span>
                  <span>FOTOĞRAF #01</span>
                </div>

                <div className="text-amber-400 font-semibold text-center text-sm">
                  {previewImage.title}
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-[11px] space-y-2 text-slate-300">
                  <p className="text-emerald-400 font-bold">Deyim ve Atasözü Farkı:</p>
                  <p>1. Atasözleri genel kural ve öğüt bildirir: &quot;Damlaya damlaya göl olur.&quot;</p>
                  <p>2. Deyimler durum bildirir, ders verme amacı taşımaz: &quot;Göz boyamak&quot;, &quot;Etekleri zil çalmak&quot;</p>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-1">
                  Öğrenciler bu görseli inceleyerek defterlerine not alacaklardır.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Görsel Materyal</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTI / EKSİ VERME VE GEREKÇE MODALI */}
      {pointModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base ${pointModalStudent.type === 'plus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                  {pointModalStudent.type === 'plus' ? '+' : '-'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {pointModalStudent.name} (No: {pointModalStudent.studentNo})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {pointModalStudent.type === 'plus' ? 'Artı (+) Puanı Ekle (+1 Puan)' : 'Eksi (-) Puanı Ekle (-1 Puan)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPointModalStudent(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tür Seçimi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Değerlendirme Türü:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPointModalStudent({ ...pointModalStudent, type: 'plus' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${pointModalStudent.type === 'plus'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <span>✓</span>
                  <span>Artı (+) Ver (+1 Puan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPointModalStudent({ ...pointModalStudent, type: 'minus' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${pointModalStudent.type === 'minus'
                      ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-100'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <span>✕</span>
                  <span>Eksi (-) Ver (-1 Puan)</span>
                </button>
              </div>
            </div>

            {/* Hızlı Gerekçe Butonları */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hızlı Gerekçe Seçiniz:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(pointModalStudent.type === 'plus' ? [
                  '🌟 Ders İçi Aktif Katılım',
                  '✏️ Tahtada Soru Çözümü',
                  '📓 Örnek Defter Düzeni',
                  '🤝 Arkadaşlarına Yardım & Örnek Davranış',
                  '💡 Yaratıcı Proje Katkısı'
                ] : [
                  '⚠️ Ders Materyali / Kitap Eksik',
                  '💬 Dersi Bölme / Konuşma',
                  '⏱️ Derse Geç Kalma',
                  '❌ Verilen Ödevi Getirmeme'
                ]).map((reasonChip) => (
                  <button
                    key={reasonChip}
                    type="button"
                    onClick={() => setPointReasonText(reasonChip)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${pointReasonText === reasonChip
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {reasonChip}
                  </button>
                ))}
              </div>
            </div>

            {/* Özel Gerekçe Notu */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Öğretmen Açıklaması / Gözlemi
              </label>
              <textarea
                rows={2}
                value={pointReasonText}
                onChange={(e) => setPointReasonText(e.target.value)}
                placeholder="Özel açıklama notu giriniz..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none"
              />
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPointModalStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => {
                  addPointRecord(pointModalStudent.id, pointModalStudent.type, pointReasonText.trim() || (pointModalStudent.type === 'plus' ? 'Ders içi katılım' : 'Ders kurallarına uymama'));
                  setPointModalStudent(null);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs cursor-pointer ${pointModalStudent.type === 'plus' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                {pointModalStudent.type === 'plus' ? 'Artı (+) Puanını Kaydet' : 'Eksi (-) Puanını Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
const teacherModules = [
  { id: 'check_sheet', label: 'Ödev kontrolü', icon: CheckSquare },
  { id: 'plus_minus', label: 'Öğrenci puanları', icon: Star },
  { id: 'assignments', label: 'Ödevler', icon: FileText },
  { id: 'grading', label: 'Değerlendirme', icon: CheckCircle2 },
  { id: 'classes', label: 'Sınıflarım', icon: Users },
  { id: 'grade_entry', label: 'Not girişi', icon: TrendingUp },
  { id: 'messages', label: 'Veli mesajları', icon: MessageSquare },
  { id: 'bulk_message', label: 'Toplu mesaj', icon: Megaphone },
  { id: 'leaderboard', label: 'Sıralama', icon: Award },
] as const;
