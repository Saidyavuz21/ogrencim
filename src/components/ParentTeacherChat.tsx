'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Search, 
  CheckCheck, 
  Check, 
  PhoneCall, 
  X, 
  Clock, 
  ArrowLeft, 
  Smile, 
  Sparkles, 
  FileText, 
  User, 
  ShieldCheck, 
  AlertCircle,
  Play,
  Pause,
  Mic,
  Megaphone,
  Users,
  Bell
} from './icons';
import { 
  Student, 
  TeacherChatContact, 
  ChatMessage, 
  TEACHER_CONTACTS, 
  INITIAL_CHAT_MESSAGES 
} from '../data/portalData';

interface ParentTeacherChatProps {
  student: Student;
  messages: ChatMessage[];
  onSendMessage: (newMsg: ChatMessage) => void;
  onTeacherReply?: (replyMsg: ChatMessage) => void;
  initialTeacherId?: string;
  onNavigateToRole?: (role: 'ogretmen' | 'admin') => void;
}

// Web Audio API ile naif bildirim ve sesli mesaj sesleri
const playMessageTone = (type: 'send' | 'receive' | 'voice') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'receive') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'voice') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        g.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx + 1) * 0.09);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + idx * 0.09);
        o.stop(ctx.currentTime + (idx + 1) * 0.09);
      });
    }
  } catch {
    // Ses desteği yoksa sessiz devam
  }
};

export const ParentTeacherChat: React.FC<ParentTeacherChatProps> = ({
  student,
  messages,
  onSendMessage,
  onTeacherReply,
  initialTeacherId = 'grp-7b',
  onNavigateToRole,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'groups' | 'teachers'>('all');
  const [isTeacherTyping, setIsTeacherTyping] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTeacherInfoModal, setShowTeacherInfoModal] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'chat'>('chat');
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; type: string } | null>(null);

  // Sesli Mesaj Oynatma & Kaydetme Durumları
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // WhatsApp Tarzı Mesaj Tepkileri (Reactions)
  const [messageReactions, setMessageReactions] = useState<{ [msgId: string]: { [emoji: string]: number } }>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeTeacher = TEACHER_CONTACTS.find((t) => t.id === selectedTeacherId) || TEACHER_CONTACTS[0];

  // Aktif sohbete ait mesajlar
  const conversationMessages = messages.filter(
    (m) => m.conversationId === selectedTeacherId
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages.length, isTeacherTyping]);

  // Sesli mesaj kaydı simülasyon sayacı
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Filtrelenmiş Kişi & Grup Listesi
  const filteredTeachers = TEACHER_CONTACTS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.roleTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (contactFilter === 'groups') return t.isGroup;
    if (contactFilter === 'teachers') return !t.isGroup;
    return true;
  });

  const handleQuickPrompt = (promptText: string) => {
    setInputText(promptText);
    inputRef.current?.focus();
  };

  // Akıllı ve Gerçekçi Öğretmen Yanıtı
  const generateTeacherReply = (parentMsgText: string, teacher: TeacherChatContact): string => {
    const lower = parentMsgText.toLowerCase();

    if (lower.includes('ödev') || lower.includes('odev')) {
      return `Merhaba Ahmet Bey. Emre'nin ödev takibini ve gayretini takdir ediyorum. Yarınki ${teacher.subject} dersimizde çalışmasını sınıfla birlikte değerlendireceğiz. Teşekkürler!`;
    }
    if (lower.includes('randevu') || lower.includes('görüş') || lower.includes('gorusme')) {
      return `Sayın Ahmet Bey, tabii ki memnuniyetle görüşebiliriz. Okul rehberlik görüşme saatim: ${teacher.officeHours}. Size uygun bir saat aralığını bana bildirirseniz randevu defterime ekleyeyim.`;
    }
    if (lower.includes('sağlık') || lower.includes('hasta') || lower.includes('izin') || lower.includes('rapor')) {
      return `Geçmiş olsun dileklerimi iletiyorum Ahmet Bey. Emre sağlığına kavuşana kadar dinlensin. İşlediğimiz ders notlarını ve ödevleri buradan sizinle paylaşırım, hiç merak etmeyiniz.`;
    }
    if (lower.includes('kitap') || lower.includes('okuma') || lower.includes('proje')) {
      return `Harika bir haber! Emre'nin okuma alışkanlığı ve kelime dağarcığı her geçen gün gelişiyor. Bu ay için belirlediğimiz 2. kitabı da okul kütüphanemizden temin edebilir.`;
    }
    if (lower.includes('teşekkür') || lower.includes('sagol') || lower.includes('sağol') || lower.includes('kolay')) {
      return `Rica ederim Ahmet Bey, Emre gibi ilgili bir öğrenci ve sizler gibi destekleyici velilerimizle çalışmak bizim için de büyük bir mutluluk. İyi günler dilerim!`;
    }
    return `Merhaba Ahmet Bey, mesajınızı aldım. Emre'nin durumu ve ders takibi ile ilgili notlarımı aldım. Gereken durumlarda sizinle tekrar irtibata geçeceğim. İyi çalışmalar dilerim.`;
  };

  // Mesaj Gönderme
  const handleSendMessage = (
    customText?: string, 
    attachmentData?: { type: 'resim' | 'pdf' | 'belge'; name: string; size?: string },
    voiceNoteData?: { duration: string; audioText?: string }
  ) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend && !attachmentData && !voiceNoteData) return;

    const now = new Date();
    const timeOnly = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `cm-${Date.now()}`,
      conversationId: activeTeacher.id,
      senderId: 'parent-ahmet',
      senderRole: 'veli',
      senderName: 'Ahmet Demir (Veli)',
      senderBadge: '452 Emre Demir Velisi',
      text: textToSend,
      timestamp: `Bugün ${timeOnly}`,
      timeOnly,
      isRead: false,
      isDelivered: true,
      attachment: attachmentData,
      voiceNote: voiceNoteData,
    };

    onSendMessage(newMsg);
    playMessageTone('send');
    setInputText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);

    // Birebir öğretmen sohbetinde otomatik simüle yanıt
    if (!activeTeacher.isGroup && autoReplyEnabled && (activeTeacher.status === 'online' || activeTeacher.status === 'away')) {
      setTimeout(() => {
        setIsTeacherTyping(true);
      }, 1000);

      setTimeout(() => {
        setIsTeacherTyping(false);
        const replyTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const replyContent = generateTeacherReply(textToSend, activeTeacher);

        const replyMsg: ChatMessage = {
          id: `cm-reply-${Date.now()}`,
          conversationId: activeTeacher.id,
          senderId: activeTeacher.id,
          senderRole: 'ogretmen',
          senderName: activeTeacher.name,
          senderBadge: activeTeacher.roleTitle,
          text: replyContent,
          timestamp: `Bugün ${replyTime}`,
          timeOnly: replyTime,
          isRead: true,
          isDelivered: true,
        };

        if (onTeacherReply) {
          onTeacherReply(replyMsg);
        } else {
          onSendMessage(replyMsg);
        }
        playMessageTone('receive');
      }, 2600);
    }
  };

  // Sesli Mesaj Kaydı Gönderme (Mikrofon simülasyonu)
  const handleSendVoiceNote = () => {
    setIsRecording(false);
    const duration = `0:0${Math.max(3, recordSeconds)}`;
    handleSendMessage('', undefined, {
      duration,
      audioText: 'Sesli Mesaj (Ahmet Demir): "Zehra Hocam iyi günler, Emre\'nin ödevini kontrol ettik, her şey hazır. Teşekkür ederiz."',
    });
  };

  // Test Bildirimi Tetikleme (Zil sesi & Ekran bildirimi testi)
  const handleTriggerTestNotification = () => {
    const now = new Date();
    const timeOnly = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const isGrp = activeTeacher.isGroup;
    const testMsg: ChatMessage = {
      id: `cm-test-${Date.now()}`,
      conversationId: activeTeacher.id,
      senderId: activeTeacher.id,
      senderRole: 'ogretmen',
      senderName: activeTeacher.name,
      senderBadge: isGrp ? 'Sınıf Grubu' : activeTeacher.roleTitle,
      text: isGrp
        ? '📢 Sayın velilerimiz, yarınki fen bilimleri deneyi için malzemeleri kontrol etmeyi unutmayınız.'
        : `Sayın velimiz (${student.parentName}), ${activeTeacher.name} yeni bir mesaj gönderdi. Bildirim sistemi ve zil tonu devrede!`,
      timestamp: `Bugün ${timeOnly}`,
      timeOnly,
      isRead: false,
      isDelivered: true,
    };

    if (onTeacherReply) {
      onTeacherReply(testMsg);
    } else {
      onSendMessage(testMsg);
    }
  };

  // Sesli Mesaj Dinleme (Web Audio API ile yumuşak melodi)
  const handleTogglePlayVoice = (msgId: string) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      playMessageTone('voice');
      setTimeout(() => {
        setPlayingVoiceId(null);
      }, 3500);
    }
  };

  // WhatsApp Tarzı Emoji Tepkisi Verme
  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const msgReacts = prev[msgId] || {};
      const currentCount = msgReacts[emoji] || 0;
      return {
        ...prev,
        [msgId]: {
          ...msgReacts,
          [emoji]: currentCount + 1,
        },
      };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachItem = (type: 'resim' | 'pdf', name: string) => {
    handleSendMessage(`Sayın Hocam, Emre'nin ekteki ${name} dosyasını bilginize sunarım.`, {
      type,
      name,
      size: type === 'resim' ? '1.8 MB' : '750 KB',
    });
  };

  const quickPrompts = [
    { label: '📌 Ödev hakkında soru', text: 'Öğretmenim merhaba, verilen son ödev ile ilgili bir sorumuz vardı, müsait olduğunuzda danışabilir miyiz?' },
    { label: '📅 Görüşme randevusu', text: 'Zehra Öğretmenim merhaba, Emre\'nin genel ders motivasyonu hakkında yüz yüze veya telefonla kısa bir görüşme rica edebilir miyiz?' },
    { label: '📖 Kitap okuma projesi', text: 'Hocam iyi günler, Emre bu haftaki kitap okuma hedefini tamamladı, özet formunu teslim etmeye hazır.' },
    { label: '🩺 Sağlık / İzin bilgisi', text: 'Sayın Hocam, Emre hafif bir soğuk algınlığı geçirdiği için bugün ilk 2 derse katılamayacak, doktor raporunu ileteceğiz.' },
    { label: '👍 Teşekkürler', text: 'Bilgilendirmeniz ve Emre\'ye gösterdiğiniz özel ilgi için çok teşekkür ederiz öğretmenim.' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
      
      {/* ÜST BİLGİ BANDI (WhatsApp Web Tarzı Başlık) */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Okul İçi WhatsApp İletişim Portalı
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Canlı Bağlantı
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {student.name} ({student.class}) • Veli: Ahmet Demir • GSM No Gizli & Korumalı
            </p>
          </div>
        </div>

        {/* Canlı Yanıt & Öğretmen Paneli & Bildirim Test Butonları */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleTriggerTestNotification}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            title="Öğretmenden yeni mesaj geldiğinde çalan zil sesini ve ekran bildirim toast'ını test edin"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span>Zil & Bildirim Testi</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
              autoReplyEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Açıkken birebir mesajlarınıza öğretmen anında simüle yanıt verir"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anlık Yanıt: {autoReplyEnabled ? 'Açık' : 'Kapalı'}</span>
          </button>

          {onNavigateToRole && (
            <button
              type="button"
              onClick={() => onNavigateToRole('ogretmen')}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer"
            >
              <span>Öğretmen Paneli &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* ANA ÇİFT KOLONLU MESAJLAŞMA GÖVDESİ */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[580px] h-[70vh] max-h-[780px]">
        
        {/* SOL KOLON: Sohbet & Grup Listesi (WhatsApp Sol Kenar) */}
        <div
          className={`md:col-span-4 border-r border-slate-200/80 flex flex-col bg-slate-50/40 ${
            mobileActiveView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Arama Çubuğu */}
          <div className="p-3 border-b border-slate-200/80 bg-white space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Sohbet veya öğretmen ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-400"
              />
            </div>

            {/* WhatsApp Filtre Sekmeleri: Tümü, Gruplar, Birebir */}
            <div className="flex items-center gap-1 pt-0.5">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'groups', label: '📢 Sınıf Grubu' },
                { id: 'teachers', label: '👤 Öğretmenler' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setContactFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    contactFilter === f.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sohbet Listesi */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTeachers.map((teacher) => {
              const isSelected = teacher.id === selectedTeacherId;
              const teacherMsgs = messages.filter((m) => m.conversationId === teacher.id);
              const lastMsg = teacherMsgs[teacherMsgs.length - 1];

              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeacherId(teacher.id);
                    setMobileActiveView('chat');
                  }}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white border-l-4 border-emerald-600 shadow-2xs'
                      : 'hover:bg-slate-100/70 bg-transparent'
                  }`}
                >
                  {/* Avatar & Rozet */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-2xl ${teacher.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-2xs`}
                    >
                      {teacher.isGroup ? '📢' : teacher.avatar}
                    </div>
                    {teacher.status === 'online' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200" />
                    )}
                    {teacher.status === 'away' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                    )}
                  </div>

                  {/* İsim & Son Mesaj */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {teacher.name}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {lastMsg.timeOnly}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[11px] font-semibold text-emerald-800 block truncate">
                        {teacher.subject}
                      </span>
                      {teacher.unreadCount ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                          {teacher.unreadCount}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      {lastMsg?.voiceNote ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Mic className="w-3 h-3" />
                          <span>Sesli mesaj ({lastMsg.voiceNote.duration})</span>
                        </span>
                      ) : lastMsg ? (
                        <span>
                          {lastMsg.senderRole === 'veli' ? 'Siz: ' : ''}
                          {lastMsg.text || '📎 Dosya eki'}
                        </span>
                      ) : (
                        'Henüz mesaj yok'
                      )}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredTeachers.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                Aradığınız kriterde sohbet bulunamadı.
              </div>
            )}
          </div>

          {/* Sol Kolon Altı: Güvenlik Bilgisi */}
          <div className="p-3 bg-white border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Okul içi güvenli WhatsApp altyapısı aktiftir.</span>
          </div>
        </div>

        {/* SAĞ KOLON: Aktif Sohbet Penceresi */}
        <div
          className={`md:col-span-8 flex flex-col bg-slate-50/20 ${
            mobileActiveView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* SOHBET ÜST ÇUBUĞU (WhatsApp Header) */}
          <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              
              {/* Mobilde Geri Butonu */}
              <button
                type="button"
                onClick={() => setMobileActiveView('list')}
                className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Sohbet Listesine Dön"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-9 h-9 rounded-2xl ${activeTeacher.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-2xs`}
                >
                  {activeTeacher.isGroup ? '📢' : activeTeacher.avatar}
                </div>
                {activeTeacher.status === 'online' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>

              {/* Bilgi ve Durum */}
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {activeTeacher.name}
                  </h3>
                  {activeTeacher.isGroup ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm truncate">
                      Sınıf Grubu (28 Veli)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-sm truncate">
                      {activeTeacher.roleTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {isTeacherTyping ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                      Yazıyor...
                    </span>
                  ) : activeTeacher.status === 'online' ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {activeTeacher.isGroup ? '28 katılımcı aktif' : 'Çevrimiçi'}
                    </span>
                  ) : (
                    <span>{activeTeacher.statusText}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Üst Sağ Eylemler: Görüşme & Randevu */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowTeacherInfoModal(true)}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">
                  {activeTeacher.isGroup ? 'Grup Bilgisi' : 'Randevu & İletişim'}
                </span>
              </button>
            </div>
          </div>

          {/* MESAJ AKIŞI ALANI (WhatsApp Duvar Kağıdı Deseni) */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[#f8fafc]/70 relative">
            
            {/* Şifreleme ve Güvenlik Bildirimi */}
            <div className="text-center my-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
                🔒 Mesajlar okul rehberlik ve kayıt sistemi tarafından korunmaktadır
              </span>
            </div>

            {conversationMessages.map((msg, idx) => {
              const isMe = msg.senderRole === 'veli';
              const combinedReactions = {
                ...(msg.reactions || {}),
                ...(messageReactions[msg.id] || {}),
              };

              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Karşı Taraf Avatarı */}
                  {!isMe && (
                    <div
                      className={`w-7 h-7 rounded-lg ${activeTeacher.avatarBg} text-white font-bold text-[10px] flex items-center justify-center shrink-0 mb-1 shadow-2xs`}
                      title={msg.senderName}
                    >
                      {activeTeacher.avatar}
                    </div>
                  )}

                  {/* WhatsApp Mesaj Balonu */}
                  <div
                    className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-3.5 py-2.5 text-xs transition-all relative group ${
                      isMe
                        ? 'bg-emerald-700 text-white rounded-br-xs shadow-2xs'
                        : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {/* Grupta Gönderen Adı & Rozeti */}
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-emerald-800">
                          {msg.senderName}
                        </span>
                        {msg.senderBadge && (
                          <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded-sm">
                            {msg.senderBadge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* SESLİ MESAJ OYNATICI (Voice Note Player) */}
                    {msg.voiceNote && (
                      <div className="space-y-1.5 py-1">
                        <div
                          className={`flex items-center gap-2.5 p-2 rounded-xl border ${
                            isMe
                              ? 'bg-emerald-800/80 border-emerald-600 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleTogglePlayVoice(msg.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer shadow-2xs transition-transform active:scale-95 ${
                              isMe ? 'bg-white text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {playingVoiceId === msg.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 translate-x-0.5" />
                            )}
                          </button>

                          {/* Ses Dalgaları Görseli */}
                          <div className="flex-1 flex items-center gap-1 h-5">
                            {[12, 20, 16, 24, 18, 14, 22, 16, 12, 19, 15, 23, 17].map((h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h}px` }}
                                className={`w-1 rounded-full transition-all ${
                                  playingVoiceId === msg.id
                                    ? 'bg-emerald-400 animate-pulse'
                                    : isMe
                                    ? 'bg-emerald-300/80'
                                    : 'bg-slate-300'
                                }`}
                              />
                            ))}
                          </div>

                          <span className="text-[10px] font-mono font-bold opacity-80 shrink-0">
                            {playingVoiceId === msg.id ? 'Çalıyor...' : msg.voiceNote.duration}
                          </span>
                        </div>

                        {msg.voiceNote.audioText && (
                          <p className={`text-[11px] italic leading-relaxed ${isMe ? 'text-emerald-100' : 'text-slate-600'}`}>
                            "{msg.voiceNote.audioText}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Normal Mesaj Metni */}
                    {msg.text && (
                      <p className={`leading-relaxed whitespace-pre-wrap ${isMe ? 'text-white' : 'text-slate-800'}`}>
                        {msg.text}
                      </p>
                    )}

                    {/* Varsa Ek Dosya / Doküman */}
                    {msg.attachment && (
                      <div
                        onClick={() => setPreviewAttachment(msg.attachment || null)}
                        className={`mt-2 p-2 rounded-xl flex items-center justify-between gap-2 border cursor-pointer transition-colors ${
                          isMe
                            ? 'bg-emerald-800/80 border-emerald-600 text-white hover:bg-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {msg.attachment.type === 'resim' ? (
                            <ImageIcon className="w-4 h-4 text-amber-300 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <div className="min-w-0 text-left">
                            <span className="text-[11px] font-bold block truncate">
                              {msg.attachment.name}
                            </span>
                            {msg.attachment.size && (
                              <span className="text-[10px] opacity-75 block">
                                {msg.attachment.size}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold underline shrink-0">
                          İncele
                        </span>
                      </div>
                    )}

                    {/* Zaman & WhatsApp Çift Mavi Tik (✓✓) */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isMe ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.timeOnly}</span>
                      {isMe && (
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-200 inline" />
                      )}
                    </div>

                    {/* EMOJI TEPKİLERİ (WhatsApp Reactions Bar) */}
                    {Object.keys(combinedReactions).length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-black/5 flex-wrap">
                        {Object.entries(combinedReactions).map(([em, cnt]) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => handleAddReaction(msg.id, em)}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-transform active:scale-95 cursor-pointer ${
                              isMe
                                ? 'bg-emerald-800/90 border-emerald-600 text-emerald-100 hover:bg-emerald-800'
                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span>{em}</span>
                            <span className="font-bold text-[9px]">{cnt}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Hızlı Tepki Ekle Butonu */}
                    <div className="hidden group-hover:flex items-center gap-1 absolute -bottom-3 right-2 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-xs z-10">
                      {['👍', '❤️', '👏', '🙏'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleAddReaction(msg.id, em)}
                          className="hover:scale-125 transition-transform text-xs cursor-pointer p-0.5"
                        >
                          {em}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              );
            })}

            {/* Öğretmen Yazıyor Animasyonu */}
            {isTeacherTyping && (
              <div className="flex items-end gap-2 justify-start animate-fade-in">
                <div
                  className={`w-7 h-7 rounded-lg ${activeTeacher.avatarBg} text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs`}
                >
                  {activeTeacher.avatar}
                </div>
                <div className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-xs shadow-2xs flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {activeTeacher.name} yazıyor
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* HIZLI ŞABLONLAR (Ödev, Randevu, Sağlık) */}
          <div className="px-3 pt-2 pb-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 mr-0.5">
              Hızlı:
            </span>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickPrompt(qp.text)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-600 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* EMOJI VE DOSYA EK MENÜLERİ */}
          {showEmojiPicker && (
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Hızlı Emoji:</span>
              {['👍', '👏', '🙏', '❤️', '📚', '⭐', '😊', '✅', '🔥', '🎉'].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + ' ' + em);
                    setShowEmojiPicker(false);
                    inputRef.current?.focus();
                  }}
                  className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {showAttachMenu && (
            <div className="px-4 py-2.5 bg-emerald-50/70 border-t border-emerald-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-emerald-950">Dosya / Görsel Paylaşımı:</span>
              <button
                type="button"
                onClick={() => handleAttachItem('resim', 'Emre_Odev_Defteri_Sayfa114.jpg')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-800 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ödev Fotoğrafı (JPG)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAttachItem('pdf', 'Haftalik_Kitap_Okuma_Formu.pdf')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-800 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Okuma Çizelgesi (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAttachMenu(false)}
                className="text-slate-400 hover:text-slate-600 ml-auto p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* SES KAYIT EKRANI (Mikrofon Aktifken) */}
          {isRecording && (
            <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <span>Sesli Mesaj Kaydediliyor: 0:0{recordSeconds}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecording(false)}
                  className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
                >
                  Ses Kaydını Gönder
                </button>
              </div>
            </div>
          )}

          {/* MESAJ YAZMA ALANI (WhatsApp Tarzı Alt Bar) */}
          <div className="p-3 bg-white border-t border-slate-200/80">
            <div className="flex items-center gap-2">
              
              {/* Ek Dosya Butonu */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmojiPicker(false);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showAttachMenu
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Fotoğraf veya Doküman Paylaş"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Emoji Butonu */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachMenu(false);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showEmojiPicker
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Emoji Ekle"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Mesaj Girdi Kutusu */}
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  activeTeacher.isGroup
                    ? "7-B Veli Grubuna mesaj yazın... (Enter ile gönder)"
                    : `${activeTeacher.name} öğretmenimize mesaj yazın...`
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
              />

              {/* Metin Varsa Gönder (Uçak), Yoksa Ses Kaydı (Mikrofon) */}
              {inputText.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs active:scale-95 flex items-center justify-center cursor-pointer transition-all"
                  aria-label="Mesajı Gönder"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRecording(true)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 active:scale-95 flex items-center justify-center cursor-pointer transition-all"
                  title="Sesli Mesaj Kaydet"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>{activeTeacher.isGroup ? '28 katılımcılı resmi sınıf duyuru grubu' : `${activeTeacher.name} ile birebir özel sohbet`}</span>
              <span className="hidden sm:inline">WhatsApp gibi güvenli ve anlık</span>
            </div>
          </div>

        </div>

      </div>

      {/* ÖĞRETMEN / GRUP DETAY MODALI */}
      {showTeacherInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl ${activeTeacher.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-2xs`}>
                  {activeTeacher.isGroup ? '📢' : activeTeacher.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeTeacher.name}</h3>
                  <span className="text-[11px] text-emerald-700">{activeTeacher.roleTitle}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherInfoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {activeTeacher.isGroup ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="font-bold text-slate-700 block">👥 Grup Katılımcıları (28 Veli):</span>
                  <p className="text-slate-600">
                    Zehra Aydın (Yönetici), Mehmet Yılmaz, Ayşe Kaya ve 7-B sınıfındaki tüm öğrenci velileri kayıtlıdır.
                  </p>
                  <span className="text-[10px] text-emerald-700 block mt-1 font-semibold">
                    * Öğretmen duyuruları ve genel sınıf paylaşımları bu kanaldan yapılır.
                  </span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="font-bold text-slate-700 block">📅 Veli Görüşme & Randevu Saatleri:</span>
                    <p className="text-slate-600">{activeTeacher.officeHours}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      * Okul rehberlik ve zümre odasında randevuyla yapılmaktadır.
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-700 block">📞 Okul Dahili Telefonu:</span>
                      <span className="text-slate-600">{activeTeacher.phone}</span>
                    </div>
                    <a
                      href={`tel:${activeTeacher.phone}`}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Ara</span>
                    </a>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowTeacherInfoModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* EKLİ DOSYA ÖNİZLEME MODALI */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {previewAttachment.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-900 block">
                Doküman / Görsel Önizleme
              </span>
              <p className="text-[11px] text-slate-500">
                Öğretmeniniz veya sınıf grubundan iletilen bu dosya güvenle indirilmeye hazır.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
