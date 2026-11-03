'use client';

import React, { useState, useEffect } from 'react';
import { 
  getLiveStudents, 
  getLiveMessages, 
  sendLiveMessage, 
  updateStudentScore,
  getLiveAnnouncements 
} from '../lib/supabaseClient';
import { 
  Navbar 
} from '../components/Navbar';
import { 
  MobileDrawer 
} from '../components/MobileDrawer';
import { 
  BottomNav 
} from '../components/BottomNav';
import { 
  StudentHero 
} from '../components/StudentHero';
import { 
  HomeworkSection 
} from '../components/HomeworkSection';
import { 
  GradesSection 
} from '../components/GradesSection';
import { 
  LeaderboardSection 
} from '../components/LeaderboardSection';
import { 
  TeacherMessageModal 
} from '../components/TeacherMessageModal';
import { 
  NotificationModal 
} from '../components/NotificationModal';
import { 
  TeacherDashboard 
} from '../components/teacher/TeacherDashboard';
import { 
  AdminDashboard 
} from '../components/admin/AdminDashboard';
import { 
  ParentPinLogin 
} from '../components/ParentPinLogin';
import { 
  ParentTeacherChat 
} from '../components/ParentTeacherChat';
import { 
  InAppNotificationToast, 
  ActiveNotification, 
  playNotificationChime 
} from '../components/InAppNotificationToast';
import { 
  AuthPage 
} from '../components/auth/AuthPage';
import { 
  StudentDashboard 
} from '../components/student/StudentDashboard';
import { 
  UserProfileModal 
} from '../components/UserProfileModal';

import { 
  CURRENT_STUDENT, 
  ASSIGNMENTS, 
  Assignment,
  COURSE_GRADES, 
  LEADERBOARD_STUDENTS, 
  ANNOUNCEMENTS,
  INITIAL_STUDENT_POINTS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_USER_ACCOUNTS,
  ChatMessage,
  Announcement,
  BulkMessage,
  StudentPointsSummary,
  LeaderboardStudent,
  UserRole,
  UserAccount 
} from '../data/portalData';

import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  Award, 
  Bell, 
  MessageSquare, 
  ChevronRight, 
  Clock,
  ShieldAlert,
  Users,
  Star,
  Check,
  X,
  Lock
} from '../components/icons';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USER_ACCOUNTS[0]);
  const [currentRole, setCurrentRole] = useState<UserRole>('ogrenci');
  const [isParentAuthenticated, setIsParentAuthenticated] = useState<boolean>(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotification, setActiveNotification] = useState<ActiveNotification | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>(ASSIGNMENTS);
  const [studentPoints, setStudentPoints] = useState<{ [studentId: string]: StudentPointsSummary }>(INITIAL_STUDENT_POINTS);
  const [leaderboardStudents, setLeaderboardStudents] = useState<LeaderboardStudent[]>(LEADERBOARD_STUDENTS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsAuthenticated(true);
    if (user.role === 'veli') {
      setIsParentAuthenticated(true);
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsProfileModalOpen(false);
    setIsParentAuthenticated(false);
  };

  // ========================================================
  // SUPABASE CANLI VERİ SENKRONİZASYONU (Realtime Polling)
  // ========================================================
  useEffect(() => {
    let isMounted = true;
    async function syncSupabase() {
      try {
        const [liveStudents, liveMsgs, liveAnns] = await Promise.all([
          getLiveStudents(),
          getLiveMessages(),
          getLiveAnnouncements(),
        ]);

        if (!isMounted) return;

        // 1. Canlı Öğrenci Listesi & Puan Sıralaması
        if (liveStudents) {
          setLeaderboardStudents(
            liveStudents.map((s, idx) => ({
              id: s.student_number === '4527-B' ? 'ogr-452' : `ogr-${s.student_number}`,
              studentNo: s.student_number,
              name: s.name,
              score: s.points,
              rank: idx + 1,
              badge: idx === 0 ? '🏆 1. Sıra' : idx === 1 ? '🥈 2. Sıra' : idx === 2 ? '🥉 3. Sıra' : `${idx + 1}. Sıra`,
              change: s.plus_count >= s.minus_count ? `+${s.plus_count - s.minus_count}` : `${s.plus_count - s.minus_count}`,
              isCurrentStudent: s.student_number === '4527-B',
              avatar: s.avatar || undefined,
            }))
          );
        }

        // 2. Canlı Mesajlar
        if (liveMsgs) {
          const mapped: ChatMessage[] = liveMsgs.map((m) => ({
            id: m.id,
            conversationId: m.conversation_id === 't1' ? 'za' : m.conversation_id === 'g1' ? 'grp-7b' : m.conversation_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role === 'teacher' ? 'ogretmen' : 'veli',
            text: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            timeOnly: new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            status: m.is_read ? 'read' : 'delivered',
            isRead: m.is_read,
            voiceNote: m.message_type === 'audio' ? { duration: m.audio_duration || '0:15', isPlaying: false } : undefined,
          }));
          setChatMessages(mapped);
        }

        // 3. Canlı Duyurular
        if (liveAnns) {
          setAnnouncements(
            liveAnns.map((a) => ({
              id: a.id,
              title: a.title,
              date: new Date(a.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
              sender: 'Okul Yönetimi',
              content: a.content,
              category: (a.category as any) || 'duyuru',
              priority: (a.priority as any) || 'normal',
            }))
          );
        }
      } catch (err) {
        console.error('Supabase senkronizasyon hatası:', err);
      }
    }

    syncSupabase();
    const interval = setInterval(syncSupabase, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleStudentPointsChange = (updatedMap: { [studentId: string]: StudentPointsSummary }) => {
    setStudentPoints(updatedMap);
    // Asenkron olarak Supabase'e yaz
    Object.values(updatedMap).forEach((st) => {
      if (st.studentNo && st.studentNo !== '---') {
        updateStudentScore(
          st.studentNo,
          st.netScore + 100,
          st.plusCount,
          st.minusCount,
          st.netScore,
          st.history[0]?.reason || 'Öğretmen değerlendirmesi',
          st.history[0]?.teacherName || 'Zehra Aydın'
        ).catch(() => {});
      }
    });
  };

  const handleSendChatMessage = (newMsg: ChatMessage) => {
    setChatMessages((prev) => [...prev, newMsg]);

    // Supabase'e canlı kaydet
    sendLiveMessage({
      conversation_id: newMsg.conversationId === 'za' ? 't1' : newMsg.conversationId === 'grp-7b' ? 'g1' : newMsg.conversationId,
      sender_id: newMsg.senderId,
      sender_name: newMsg.senderName,
      sender_role: newMsg.senderRole === 'ogretmen' ? 'teacher' : 'parent',
      content: newMsg.text || (newMsg.voiceNote ? 'Sesli mesaj' : 'Ek dosya'),
      message_type: newMsg.voiceNote ? 'audio' : 'text',
      audio_duration: newMsg.voiceNote?.duration,
    }).catch(() => {});

    // Eğer mesaj öğretmen tarafından iletildiyse (örn. panel veya toplu mesaj) veliye bildirim çal
    if (newMsg.senderRole === 'ogretmen') {
      playNotificationChime();
      setUnreadCount((prev) => prev + 1);
      setActiveNotification({
        id: newMsg.id,
        senderName: newMsg.senderName,
        senderRole: 'ogretmen',
        senderAvatar: newMsg.conversationId === 'grp-7b' ? '📢' : 'ZA',
        title: newMsg.conversationId === 'grp-7b' ? '7-B Sınıf Duyuru Grubu' : `${newMsg.senderName} (Öğretmen)`,
        message: newMsg.text ? newMsg.text.replace(/\n/g, ' ').slice(0, 85) : 'Yeni bir mesaj iletildi',
        time: newMsg.timeOnly,
        conversationId: newMsg.conversationId,
      });
    }
  };

  const handleTeacherReplyChatMessage = (replyMsg: ChatMessage) => {
    setChatMessages((prev) => [...prev, replyMsg]);
    playNotificationChime();
    setUnreadCount((prev) => prev + 1);
    setActiveNotification({
      id: replyMsg.id,
      senderName: replyMsg.senderName,
      senderRole: replyMsg.senderRole,
      senderAvatar: replyMsg.conversationId === 'grp-7b' ? '📢' : 'ZA',
      title: replyMsg.conversationId === 'grp-7b' ? '7-B Sınıf Duyuru Grubu 📢' : `${replyMsg.senderName} (Öğretmen)`,
      message: replyMsg.text ? replyMsg.text.replace(/\n/g, ' ').slice(0, 85) : (replyMsg.voiceNote ? '🎙️ Sesli mesaj gönderildi' : 'Dosya eki'),
      time: replyMsg.timeOnly,
      conversationId: replyMsg.conversationId,
    });
  };

  const handleSendBroadcastMessage = (bulkMsg: BulkMessage) => {
    playNotificationChime();
    setUnreadCount((prev) => prev + 1);
    setActiveNotification({
      id: bulkMsg.id,
      senderName: bulkMsg.senderName,
      senderRole: 'ogretmen',
      senderAvatar: '📢',
      title: `${bulkMsg.className} Veli Bilgilendirme (Toplu Mesaj)`,
      message: `${bulkMsg.title}: ${bulkMsg.content.slice(0, 60)}...`,
      time: bulkMsg.date,
      conversationId: 'grp-7b',
    });
  };

  const handleAddAnnouncement = (newAnn: Announcement) => {
    setAnnouncements((prev) => [newAnn, ...prev]);
    playNotificationChime();
    setUnreadCount((prev) => prev + 1);
    setActiveNotification({
      id: newAnn.id,
      senderName: newAnn.sender,
      senderRole: 'ogretmen',
      senderAvatar: '📢',
      title: `Yeni Duyuru: ${newAnn.title}`,
      message: newAnn.content.slice(0, 85),
      time: newAnn.date,
      conversationId: 'grp-7b',
    });
  };

  const handleNotificationClick = (notification: ActiveNotification) => {
    setActiveNotification(null);
    if (notification.conversationId) {
      setActiveTab('messages');
    } else {
      setActiveTab('announcements');
    }
  };

  const pendingHomeworkCount = assignments.filter((a) => a.status === 'bekliyor').length;

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    const matchedAccount = INITIAL_USER_ACCOUNTS.find((a) => a.role === role) || INITIAL_USER_ACCOUNTS[0];
    setCurrentUser(matchedAccount);
    if (role === 'veli') {
      setIsParentAuthenticated(true);
    }
    setActiveTab('dashboard'); // Rol değişince varsayılan panele dön
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
    setIsNotificationsOpen(false);
  };

  // Öğrenci Sekmeleri
  const ogrenciNavTabs = [
    { id: 'dashboard', label: 'Öğrenci Portalı', icon: LayoutDashboard },
    { 
      id: 'homeworks', 
      label: 'Ödevlerim & Teslim', 
      icon: FileText, 
      badge: pendingHomeworkCount > 0 ? `${pendingHomeworkCount}` : null 
    },
    { id: 'grades', label: 'Puanlarım & Karne', icon: TrendingUp },
    { 
      id: 'leaderboard', 
      label: 'Sınıf Sıralaması', 
      icon: Award,
      badge: '#3'
    },
    { 
      id: 'messages', 
      label: 'Öğretmene Soru Sor', 
      icon: MessageSquare, 
      badge: 'Canlı' 
    },
    { 
      id: 'announcements', 
      label: 'Duyurular', 
      icon: Bell, 
      badge: unreadCount > 0 ? `${unreadCount}` : null 
    },
  ];

  // Veli Sekmeleri
  const veliNavTabs = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
    { 
      id: 'homeworks', 
      label: 'Öğretmen Ödevleri', 
      icon: FileText, 
      badge: pendingHomeworkCount > 0 ? `${pendingHomeworkCount}` : null 
    },
    { id: 'grades', label: 'Puan Durumu', icon: TrendingUp },
    { 
      id: 'leaderboard', 
      label: 'Sınıf Sıralaması', 
      icon: Award,
      badge: '#3'
    },
    { 
      id: 'messages', 
      label: 'Öğretmenle Mesajlaşma', 
      icon: MessageSquare, 
      badge: 'Canlı' 
    },
    { 
      id: 'announcements', 
      label: 'Duyurular', 
      icon: Bell, 
      badge: unreadCount > 0 ? `${unreadCount}` : null 
    },
  ];

  // Öğretmen Sekmeleri
  const ogretmenNavTabs = [
    { id: 'dashboard', label: 'Öğretmen Paneli', icon: LayoutDashboard },
    { id: 'announcements', label: 'Okul Duyuruları', icon: Bell },
  ];

  // Admin Sekmeleri
  const adminNavTabs = [
    { id: 'dashboard', label: 'Süper Admin Paneli', icon: ShieldAlert },
    { id: 'announcements', label: 'Duyurular', icon: Bell },
  ];

  const currentNavTabs =
    currentRole === 'admin'
      ? adminNavTabs
      : currentRole === 'ogretmen'
      ? ogretmenNavTabs
      : currentRole === 'ogrenci'
      ? ogrenciNavTabs
      : veliNavTabs;

  if (!isAuthenticated) {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        initialRole={currentRole}
        initialMode="login"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-20 md:pb-12 flex flex-col antialiased">
      
      {/* 1. Üst Menü Çubuğu (Rol Değiştirici & Bildirimler) */}
      <Navbar
        student={CURRENT_STUDENT}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
        isParentAuthenticated={isParentAuthenticated}
        onLockParentPin={() => setIsParentAuthenticated(false)}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* 2. Masaüstü Yatay Sekme Menüsü (Sade & Düz) - Veli PIN ekranında gizlenir */}
      {!(currentRole === 'veli' && !isParentAuthenticated) && (
        <div className="hidden md:block bg-white border-b border-slate-200 sticky top-15 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav className="flex space-x-1 py-1.5">
              {currentNavTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-slate-200/80 text-slate-700">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* 3. Ana İçerik */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 w-full flex-1">
        
        {/* ===================== ROL: SÜPER ADMİN ===================== */}
        {currentRole === 'admin' && activeTab === 'dashboard' && (
          <AdminDashboard />
        )}

        {/* ===================== ROL: ÖĞRETMEN ===================== */}
        {currentRole === 'ogretmen' && activeTab === 'dashboard' && (
          <TeacherDashboard 
            currentUser={currentUser}
            assignments={assignments} 
            onAssignmentsChange={setAssignments}
            studentPoints={studentPoints}
            onStudentPointsChange={handleStudentPointsChange}
            leaderboardStudents={leaderboardStudents}
            onLeaderboardChange={setLeaderboardStudents}
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
            onSendBroadcastMessage={handleSendBroadcastMessage}
            onAddAnnouncement={handleAddAnnouncement}
          />
        )}

        {/* ===================== ROL: ÖĞRENCİ ===================== */}
        {currentRole === 'ogrenci' && (
          <>
            {activeTab === 'dashboard' && (
              <StudentDashboard
                student={CURRENT_STUDENT}
                assignments={assignments}
                onAssignmentsChange={setAssignments}
                studentPoints={studentPoints['ogr-452']}
                leaderboardStudents={leaderboardStudents}
                onNavigateToMessages={() => setActiveTab('messages')}
              />
            )}
            {activeTab === 'homeworks' && (
              <HomeworkSection assignments={assignments} onAssignmentsChange={setAssignments} />
            )}
            {activeTab === 'grades' && (
              <GradesSection 
                grades={COURSE_GRADES} 
                overallGpa={CURRENT_STUDENT.gpa} 
                studentPoints={studentPoints['ogr-452']}
              />
            )}
            {activeTab === 'leaderboard' && (
              <LeaderboardSection students={leaderboardStudents} />
            )}
            {activeTab === 'messages' && (
              <ParentTeacherChat
                student={CURRENT_STUDENT}
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
                onTeacherReply={handleTeacherReplyChatMessage}
                onNavigateToRole={(role) => handleRoleChange(role)}
              />
            )}
          </>
        )}

        {/* ===================== ROL: VELİ ===================== */}
        {currentRole === 'veli' && (
          !isParentAuthenticated ? (
            <ParentPinLogin
              student={CURRENT_STUDENT}
              onSuccess={() => setIsParentAuthenticated(true)}
              onCancelToRole={(role) => {
                setCurrentRole(role);
                setActiveTab('dashboard');
              }}
              correctPin="123456"
            />
          ) : (
            <>
              {/* Veli Güvenlik Girişi Rozeti & Kilitleme */}
              <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-950">
                        Veli Güvenlik Girişi Aktif ({CURRENT_STUDENT.parentName})
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                        6 Haneli PIN Doğrulandı
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      {CURRENT_STUDENT.name} öğrencisinin 7-B sınıfı ders ödevleri, karnesi ve sınıf başarı sıralaması güvenle görüntüleniyor.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsParentAuthenticated(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-emerald-900 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>PIN'i Kilitle / Çıkış</span>
                </button>
              </div>

              {/* Sekme 1: GENEL BAKIŞ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                
                {/* Öğrenci Özet Kartı */}
                <StudentHero
                  student={CURRENT_STUDENT}
                  studentPoints={studentPoints['ogr-452']}
                  onNavigateToLeaderboard={() => setActiveTab('leaderboard')}
                  onNavigateToHomeworks={() => setActiveTab('homeworks')}
                  onNavigateToGrades={() => setActiveTab('grades')}
                />

                {/* İki Kolonlu Sade Düzen */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* Sol: Son Ödevler */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Öğretmenin Gönderdiği Ödevler
                        </h3>

                        <button
                          type="button"
                          onClick={() => setActiveTab('homeworks')}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Tümünü Gör ({assignments.length})
                        </button>
                      </div>

                      {/* Ödev Özetleri */}
                      <div className="divide-y divide-slate-100 mt-1">
                        {assignments.slice(0, 3).map((hw) => (
                          <div
                            key={hw.id}
                            onClick={() => setActiveTab('homeworks')}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                                {hw.subject.substring(0, 3)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    {hw.subject} • {hw.teacher}
                                  </span>
                                  {hw.homeworkType === 'pdf' && (
                                    <span className="text-[9px] bg-red-50 text-red-700 font-semibold px-1 rounded-sm">
                                      PDF
                                    </span>
                                  )}
                                  {hw.homeworkType === 'resim' && (
                                    <span className="text-[9px] bg-amber-50 text-amber-700 font-semibold px-1 rounded-sm">
                                      Resim
                                    </span>
                                  )}
                                  {hw.homeworkType === 'not' && (
                                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-semibold px-1 rounded-sm">
                                      Not
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                  {hw.title}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {hw.status === 'bekliyor' && (
                                <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-500" /> {hw.remainingDays} gün
                                </span>
                              )}
                              {hw.status === 'teslim_edildi' && (
                                <span className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-md">
                                  İnceleniyor
                                </span>
                              )}
                              {hw.status === 'puanlandi' && (
                                <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {hw.score} puan
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="text-amber-600 font-medium">
                          {pendingHomeworkCount > 0 ? `${pendingHomeworkCount} bekleyen ödev teslimi var` : 'Tüm ödevler tamamlandı'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('homeworks')}
                          className="text-indigo-600 font-medium hover:underline"
                        >
                          Ödevleri İncele →
                        </button>
                      </div>
                    </div>

                    {/* Son Puanlar */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Öğrencinin Ders Puanları
                        </h3>

                        <button
                          type="button"
                          onClick={() => setActiveTab('grades')}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Tüm Notlar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                        {COURSE_GRADES.slice(0, 6).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setActiveTab('grades')}
                            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 cursor-pointer transition-colors"
                          >
                            <span className="text-xs font-medium text-slate-600 block truncate">
                              {c.subject}
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-base font-bold text-slate-900">
                                {c.overallAverage}
                              </span>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-sm font-medium">
                                +{(c.overallAverage - c.classAverage).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sağ: Sınıf Sıralaması Özeti (Kendi Öğrencisi Belirgin) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            Sınıf Başarı Sıralaması
                          </h3>
                          <p className="text-[11px] text-slate-400">7-B sınıfı ilk 5 öğrenci</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('leaderboard')}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Tüm Liste
                        </button>
                      </div>

                      {/* Sıralama Satırları */}
                      <div className="space-y-1.5 mt-3">
                        {LEADERBOARD_STUDENTS.slice(0, 5).map((st) => {
                          const isMyChild = st.isCurrentUser;

                          return (
                            <div
                              key={st.id}
                              onClick={() => setActiveTab('leaderboard')}
                              className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                                isMyChild
                                  ? 'bg-indigo-50/70 border-indigo-200'
                                  : 'bg-white border-slate-200/70 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                  isMyChild ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {st.rank}
                                </span>

                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs ${isMyChild ? 'font-bold text-indigo-950' : 'font-medium text-slate-800'}`}>
                                      {st.name}
                                    </span>
                                    {isMyChild && (
                                      <span className="bg-indigo-600 text-white text-[9px] font-medium px-1.5 py-0.2 rounded-sm">
                                        Öğrenciniz
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block">
                                    No: {st.studentNo}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`text-xs font-bold ${isMyChild ? 'text-indigo-700' : 'text-slate-900'}`}>
                                  {st.average}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Vurgu Kutusu */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                        <span>Öğrenciniz <strong>3. sırada</strong> bulunmaktadır.</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('leaderboard')}
                          className="text-indigo-600 font-medium hover:underline text-xs"
                        >
                          İncele →
                        </button>
                      </div>
                    </div>

                    {/* Öğrenci Artı / Eksi Özet Kartı */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                            +/-
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-900">Öğretmen Artı / Eksi Durumu</h4>
                            <p className="text-[11px] text-slate-400">Ders içi katılım ve davranış</p>
                          </div>
                        </div>

                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                          +{studentPoints['ogr-452']?.netScore ?? 4} Puan
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-emerald-700">✓ {studentPoints['ogr-452']?.plusCount ?? 5} Artı</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-rose-600">✕ {studentPoints['ogr-452']?.minusCount ?? 1} Eksi</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('grades')}
                          className="text-indigo-600 font-semibold hover:underline text-xs"
                        >
                          Karnesi &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Öğretmen İletişim Kartı */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900">Öğretmenle İletişim</h4>
                          <p className="text-[11px] text-slate-400">Rehber: {CURRENT_STUDENT.teacher}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        Dersler, ödevler veya öğrencinin motivasyonu hakkında rehber öğretmene anlık mesaj iletebilirsiniz.
                      </p>

                      <button
                        type="button"
                        onClick={() => setActiveTab('messages')}
                        className="w-full mt-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Canlı Mesajlaşmayı Başlat</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Sekme 2: ÖĞRETMENİN GÖNDERDİĞİ ÖDEVLER */}
            {activeTab === 'homeworks' && (
              <HomeworkSection assignments={assignments} onAssignmentsChange={setAssignments} />
            )}

            {/* Sekme 3: ÖĞRENCİNİN ALDIĞI PUANLAR */}
            {activeTab === 'grades' && (
              <GradesSection 
                grades={COURSE_GRADES} 
                overallGpa={CURRENT_STUDENT.gpa} 
                studentPoints={studentPoints['ogr-452']}
              />
            )}

            {/* Sekme 4: SINIF BAŞARI SIRALAMASI */}
            {activeTab === 'leaderboard' && (
              <LeaderboardSection students={leaderboardStudents} />
            )}

            {/* Sekme 5: ANLIK ÖĞRETMEN MESAJLAŞMA */}
            {activeTab === 'messages' && (
              <ParentTeacherChat
                student={CURRENT_STUDENT}
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
                onTeacherReply={handleTeacherReplyChatMessage}
                onNavigateToRole={(role) => handleRoleChange(role)}
              />
            )}
          </>
        )
      )}

        {/* ORTAK SEKME: DUYURULAR (Tüm rollerde görüntülenebilir) */}
        {activeTab === 'announcements' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Okul ve Sınıf Duyuruları
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Veli toplantıları, sınav tarihleri ve etkinlikler
              </p>
            </div>

            <div className="space-y-2.5">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                      {ann.category}
                    </span>
                    <span className="text-xs text-slate-400">{ann.date}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">
                    {ann.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ann.content}
                  </p>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Gönderen: {ann.sender}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* 4. Mobil Kayar Menü */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        student={CURRENT_STUDENT}
        unreadCount={unreadCount}
        pendingHomeworkCount={pendingHomeworkCount}
        isParentAuthenticated={isParentAuthenticated}
        onLockParentPin={() => setIsParentAuthenticated(false)}
      />

      {/* 5. Mobil Alt Navigasyon */}
      <BottomNav
        currentRole={currentRole}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        pendingHomeworkCount={pendingHomeworkCount}
        isParentAuthenticated={isParentAuthenticated}
      />

      {/* 6. Öğretmen Mesaj Modalı */}
      <TeacherMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        student={CURRENT_STUDENT}
        onSendToChat={(text, teacherId) => {
          const timeOnly = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          handleSendChatMessage({
            id: `cm-${Date.now()}`,
            conversationId: teacherId || 'tch-zehra',
            senderId: 'parent-ahmet',
            senderRole: 'veli',
            senderName: 'Ahmet Demir (Veli)',
            text,
            timestamp: `Bugün ${timeOnly}`,
            timeOnly,
            isRead: false,
            isDelivered: true,
          });
          setActiveTab('messages');
        }}
        onOpenLiveChat={() => setActiveTab('messages')}
      />

      {/* 7. Bildirimler Modalı */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        announcements={announcements}
        messages={chatMessages}
        onMarkAllRead={handleMarkAllRead}
        onNavigateToChat={(convId) => {
          setIsNotificationsOpen(false);
          setActiveTab('messages');
        }}
      />

      {/* 8. Ekranın Sağ Üstünde Kayan Anlık Bildirim Toast'ı & Zil Sesi */}
      <InAppNotificationToast
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
        onClick={handleNotificationClick}
      />

      {/* 9. Kullanıcı Profili & Güvenlik Ayarları Modalı */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateUser={(updated) => setCurrentUser(updated)}
      />

    </div>
  );
}
