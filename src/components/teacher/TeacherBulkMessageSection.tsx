'use client';

import React, { useState } from 'react';
import { 
  Megaphone, 
  Send, 
  Users, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Check, 
  X, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Paperclip,
  MessageSquare,
  MailCheck
} from '../icons';
import { 
  BulkMessage, 
  INITIAL_BULK_MESSAGES, 
  LEADERBOARD_STUDENTS, 
  CURRENT_TEACHER,
  ChatMessage,
  Announcement
} from '../../data/portalData';

interface TeacherBulkMessageSectionProps {
  onSendBroadcastMessage?: (bulkMsg: BulkMessage) => void;
  onSendChatMessage?: (msg: ChatMessage) => void;
  onAddAnnouncement?: (ann: Announcement) => void;
  className?: string;
}

export const TeacherBulkMessageSection: React.FC<TeacherBulkMessageSectionProps> = ({
  onSendBroadcastMessage,
  onSendChatMessage,
  onAddAnnouncement,
  className = '7-B',
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [bulkMessages, setBulkMessages] = useState<BulkMessage[]>(INITIAL_BULK_MESSAGES);

  // Form Durumları
  const [recipientMode, setRecipientMode] = useState<'tum_sinif' | 'secili' | 'odev_bekleyen'>('tum_sinif');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    LEADERBOARD_STUDENTS.map((s) => s.id)
  );
  const [studentSearch, setStudentSearch] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'onemli' | 'acil'>('normal');
  const [sendChannels, setSendChannels] = useState<{ portal: boolean; sms: boolean }>({
    portal: true,
    sms: true,
  });
  const [selectedAttachment, setSelectedAttachment] = useState<string>('Haftalik_Calisma_Programi_7B.pdf');
  const [hasAttachment, setHasAttachment] = useState(false);

  // Gönderim Animasyon & Bildirim Durumları
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<BulkMessage | null>(null);
  const [selectedHistoryMsg, setSelectedHistoryMsg] = useState<BulkMessage | null>(null);

  // 5 Popüler Öğretmen Toplu Mesaj Şablonu
  const templates = [
    {
      label: '📝 Hafta Sonu Ödev Hatırlatması',
      title: 'Hafta Sonu Ödev ve Çalışma Takvimi',
      priority: 'normal' as const,
      content: `Değerli 7-B Sınıfı Velilerimiz, bu haftaki Türkçe kompozisyon ve Matematik doğrusal denklemler ödevleri veli portalına yüklenmiştir. Öğrencilerimizin hafta sonu çalışmalarını takip etmenizi ve günlük 30 dakika kitap okuma çizelgesini onaylamanızı önemle rica ederim. İyi hafta sonları dilerim.`,
      attachment: 'Haftalik_Calisma_Programi_7B.pdf',
    },
    {
      label: '📅 Dönem Ortası Veli Toplantısı Daveti',
      title: '1. Dönem Veli Bilgilendirme Toplantısı',
      priority: 'onemli' as const,
      content: `Sayın Velilerimiz, 7-B sınıfımızın akademik başarı durumu, yeni dönem kazanımları ve rehberlik hedeflerini değerlendirmek üzere 1. Dönem Veli Toplantımız bu pazar günü saat 11:00'de okul konferans salonunda gerçekleştirilecektir. Katılımınız öğrencilerimizin motivasyonu açısından çok değerlidir.`,
      attachment: 'Veli_Toplanti_Gundemi_ve_Yer_Plani.pdf',
    },
    {
      label: '📊 Deneme Sınavı & Başarı Karnesi',
      title: 'Genel Değerlendirme Sınavı Sonuçları Açıklandı',
      priority: 'onemli' as const,
      content: `Sayın Velimiz, okulumuzda gerçekleştirilen 1. Dönem 1. Deneme Sınavı sonuçları ve ders ödev puanları veli portalına işlenmiştir. Öğrencimizin sınıf başarı sıralamasını ve ders bazlı analiz raporunu veli paneli üzerinden inceleyebilirsiniz.`,
      attachment: 'Deneme_Sinavi_Kazanim_Raporu.pdf',
    },
    {
      label: '📖 "Kitap Dostu Sınıf" Projesi',
      title: 'Kitap Dostu Sınıf Projesi ve Okuma Saati',
      priority: 'normal' as const,
      content: `Değerli Velilerimiz, 7-B sınıfı olarak başlattığımız 'Kitap Dostu Sınıf' projesi kapsamında her akşam 20:30 - 21:00 saatleri arasında evde tüm aile bireyleriyle birlikte kitap okuma saati planlanmıştır. Öğrencimizin kitap özet formunu haftalık olarak onaylamanızı rica ederiz.`,
      attachment: 'Kitap_Okuma_Takip_Cizelgesi.pdf',
    },
    {
      label: '🩺 Mevsimsel Sağlık & İzin Bilgilendirmesi',
      title: 'Mevsim Geçişi ve Sağlık Durumu Bilgilendirmesi',
      priority: 'acil' as const,
      content: `Sayın Velilerimiz, son günlerde mevsimsel soğuk algınlığı ve grip vakalarında artış gözlemlenmektedir. Rahatsızlığı olan öğrencilerimizin istirahat etmesi, okula gelmeden önce doktor raporlarının okul idaresine iletilmesi sınıf sağlığı açısından önem taşımaktadır. Tüm öğrencilerimize acil şifalar dileriz.`,
      attachment: '',
    },
  ];

  const handleApplyTemplate = (tmpl: typeof templates[0]) => {
    setTitle(tmpl.title);
    setContent(tmpl.content);
    setPriority(tmpl.priority);
    if (tmpl.attachment) {
      setHasAttachment(true);
      setSelectedAttachment(tmpl.attachment);
    } else {
      setHasAttachment(false);
    }
  };

  // Öğrenci / Veli Seçimi Yönetimi
  const filteredStudents = LEADERBOARD_STUDENTS.filter(
    (st) =>
      st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      st.studentNo.includes(studentSearch)
  );

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(LEADERBOARD_STUDENTS.map((s) => s.id));
  };

  const clearStudentSelection = () => {
    setSelectedStudentIds([]);
  };

  // Gönderim Hedef Sayısı Hesaplama
  const targetRecipientCount = 
    recipientMode === 'tum_sinif' 
      ? LEADERBOARD_STUDENTS.length 
      : recipientMode === 'odev_bekleyen' 
      ? 5 
      : selectedStudentIds.length;

  // Toplu Mesajı Gönder
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = `${now.getDate()} Ekim 2026 ${timeStr}`;

      const activeChannels: ('portal' | 'sms')[] = [];
      if (sendChannels.portal) activeChannels.push('portal');
      if (sendChannels.sms) activeChannels.push('sms');

      const newBulkMsg: BulkMessage = {
        id: `blk-${Date.now()}`,
        senderName: CURRENT_TEACHER.name,
        senderTitle: `${CURRENT_TEACHER.branch} & Sınıf Rehber Öğretmeni`,
        className,
        title,
        content,
        date: dateStr,
        recipientType: recipientMode,
        recipientCount: targetRecipientCount,
        totalRecipients: LEADERBOARD_STUDENTS.length,
        channels: activeChannels,
        priority,
        attachmentName: hasAttachment ? selectedAttachment : undefined,
        status: 'gonderildi',
      };

      // 1. Toplu Mesajlar Listesine Ekle
      setBulkMessages((prev) => [newBulkMsg, ...prev]);

      if (onSendBroadcastMessage) {
        onSendBroadcastMessage(newBulkMsg);
      }

      // 2. 7-B Sınıf Duyuru Grubuna ve Veli Canlı Sohbetine Toplu Mesaj Olarak Ekle
      if (onSendChatMessage) {
        const groupChatMsg: ChatMessage = {
          id: `cm-broadcast-grp-${Date.now()}`,
          conversationId: 'grp-7b',
          senderId: 'tch-zehra',
          senderRole: 'ogretmen',
          senderName: CURRENT_TEACHER.name,
          senderBadge: 'Sınıf Rehber Öğretmeni',
          text: `📢 [${className} Sınıfı Toplu Mesajı]\n📌 ${title}\n\n${content}`,
          timestamp: `Bugün ${timeStr}`,
          timeOnly: timeStr,
          isRead: false,
          isDelivered: true,
          attachment: hasAttachment
            ? {
                type: selectedAttachment.endsWith('.pdf') ? 'pdf' : 'resim',
                name: selectedAttachment,
                size: '1.5 MB',
              }
            : undefined,
          reactions: { '👍': 2 },
        };
        onSendChatMessage(groupChatMsg);

        const broadcastChatMsg: ChatMessage = {
          id: `cm-broadcast-${Date.now()}`,
          conversationId: 'tch-zehra',
          senderId: 'tch-zehra',
          senderRole: 'ogretmen',
          senderName: CURRENT_TEACHER.name,
          text: `📢 [${className} Sınıfı Toplu Mesajı]\n📌 ${title}\n\n${content}`,
          timestamp: `Bugün ${timeStr}`,
          timeOnly: timeStr,
          isRead: false,
          isDelivered: true,
          attachment: hasAttachment
            ? {
                type: selectedAttachment.endsWith('.pdf') ? 'pdf' : 'resim',
                name: selectedAttachment,
                size: '1.5 MB',
              }
            : undefined,
        };
        onSendChatMessage(broadcastChatMsg);
      }

      // 3. Veli Duyurularına ve Bildirimlerine Ekle
      if (onAddAnnouncement) {
        const newAnnouncement: Announcement = {
          id: `ann-bulk-${Date.now()}`,
          title: `[7-B Sınıf Duyurusu] ${title}`,
          date: 'Bugün',
          sender: `${CURRENT_TEACHER.name} (Sınıf Rehber Öğrt.)`,
          category: 'duyuru',
          priority: priority === 'acil' ? 'onemli' : 'normal',
          content,
        };
        onAddAnnouncement(newAnnouncement);
      }

      // Başarı Ekranını Göster
      setSendSuccess(newBulkMsg);

      // Formu Temizle
      setTitle('');
      setContent('');
    }, 700);
  };

  return (
    <div className="space-y-4">
      
      {/* Üst Başlık Kartı (Sade & Modern) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Megaphone className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Velilere Toplu Mesaj & SMS Gönderimi
              </h2>
              <p className="text-xs text-slate-500">
                {className} sınıfı velilerine tek tıkla toplu duyuru, ödev hatırlatması veya SMS iletin.
              </p>
            </div>
          </div>
        </div>

        {/* Sekme Değiştirici */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('compose');
              setSendSuccess(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'compose'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Yeni Toplu Mesaj Oluştur</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Gönderilen Mesaj Geçmişi ({bulkMessages.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKME 1: YENİ TOPLU MESAJ OLUŞTUR */}
      {/* ========================================================================= */}
      {activeTab === 'compose' && (
        <div className="space-y-4">
          
          {/* Gönderim Başarı Kartı (Gönderimden Sonra Belirir) */}
          {sendSuccess && (
            <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Toplu Mesajınız Başarıyla İletildi!
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      <strong>{sendSuccess.recipientCount} velinin</strong> veli portalına ve kayıtlı GSM numaralarına anında iletildi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSendSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/80 text-xs text-slate-800 space-y-1">
                <span className="font-bold block text-emerald-900">📌 İletilen Mesaj Özeti:</span>
                <span className="font-semibold block text-slate-900">{sendSuccess.title}</span>
                <p className="text-slate-600 line-clamp-2">{sendSuccess.content}</p>
                <div className="pt-1 flex items-center gap-3 text-[11px] text-emerald-700 font-medium">
                  <span>✓ Veli Portalı Bildirimi ({sendSuccess.recipientCount} Veli)</span>
                  <span>✓ GSM SMS Bildirimi ({sendSuccess.recipientCount} SMS)</span>
                  <span>✓ Veli Canlı Sohbet Akışına İşlendi</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSendSuccess(null)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  Yeni Bir Mesaj Daha Gönder
                </button>
              </div>
            </div>
          )}

          {/* Hızlı Şablonlar Çubuğu */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Hazır Öğretmen Şablonları (1-Tıkla Doldur)</span>
              </span>
              <span className="text-[11px] text-slate-400">Şablona tıklayarak formu otomatik doldurabilirsiniz</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {templates.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Alanı */}
          <form onSubmit={handleSendBroadcast} className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 space-y-5">
            
            {/* ADIM 1: ALICI SEÇİMİ */}
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>1. Alıcı Velileri Belirleyin</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mesajın hangi velilerin ekranına ve telefonuna iletileceğini seçiniz.
                  </p>
                </div>

                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                  {targetRecipientCount} Veli Seçildi
                </span>
              </div>

              {/* 3 Hızlı Seçim Butonu */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('tum_sinif');
                    selectAllStudents();
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    recipientMode === 'tum_sinif'
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">
                    👨‍👩‍👧 Tüm Sınıf Velileri (7-B)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Sınıftaki tüm 28 öğrencinin velisine toplu iletilir.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode('secili')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    recipientMode === 'secili'
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">
                    ☑️ Özel Veli Seçimi ({selectedStudentIds.length} Veli)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Öğrenci listesinden dilediğiniz velileri seçin.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('odev_bekleyen');
                    // Ödevi bekleyen öğrencileri seç
                    setSelectedStudentIds(['ogr-452', 'ogr-108', 'ogr-189', 'ogr-441', 'ogr-512']);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    recipientMode === 'odev_bekleyen'
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 block">
                    ⚠️ Ödevi Bekleyen Veliler (5 Veli)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Henüz son ödevi tamamlamamış olan veliler.
                  </span>
                </button>
              </div>

              {/* Özel Seçim Modu Açıkken Öğrenci Listesi */}
              {recipientMode === 'secili' && (
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Öğrenci veya veli ara..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={selectAllStudents}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Tümünü Seç (28)
                      </button>
                      <button
                        type="button"
                        onClick={clearStudentSelection}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/70">
                    {filteredStudents.map((st) => {
                      const isSelected = selectedStudentIds.includes(st.id);

                      return (
                        <label
                          key={st.id}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(st.id)}
                              className="rounded-md border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {st.name} <span className="font-normal text-slate-400">(No: {st.studentNo})</span>
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                Veli: {st.name.split(' ')[0]} Bey/Hanım • GSM: 0532 *** ** {st.studentNo.slice(-2)}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isSelected ? 'Seçildi' : 'Hariç'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ADIM 2: GÖNDERİM KANALLARI & ÖNCELİK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              {/* Kanallar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-900">
                  2. İletim Kanalları
                </label>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendChannels.portal}
                      onChange={(e) => setSendChannels({ ...sendChannels, portal: e.target.checked })}
                      className="rounded-md border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold">Veli Portalı & Anlık Sohbet Bildirimi</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 rounded-sm">Önerilen</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendChannels.sms}
                      onChange={(e) => setSendChannels({ ...sendChannels, sms: e.target.checked })}
                      className="rounded-md border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold">GSM SMS Bildirimi (Cep Telefonuna)</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 rounded-sm">Anında</span>
                  </label>
                </div>
              </div>

              {/* Öncelik Düzeyi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-900">
                  Mesaj Önceliği
                </label>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { id: 'normal', label: '🟢 Normal', desc: 'Genel Bilgi' },
                    { id: 'onemli', label: '🟠 Önemli', desc: 'Toplantı/Sınav' },
                    { id: 'acil', label: '🔴 Acil', desc: 'Sağlık/İptal' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as any)}
                      className={`p-2 rounded-xl text-center border text-xs transition-colors cursor-pointer ${
                        priority === p.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block">{p.label}</span>
                      <span className="text-[10px] opacity-75 block">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ADIM 3: MESAJ BAŞLIĞI VE METNİ */}
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  3. Mesaj Başlığı / Konu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Hafta Sonu Matematik Ödevi ve Kitap Okuma Hatırlatması"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900">
                    Mesaj İçeriği *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {content.length} karakter • {Math.ceil(content.length / 160) || 1} SMS
                  </span>
                </div>

                <textarea
                  rows={4}
                  required
                  placeholder="Velilere iletmek istediğiniz metni buraya yazınız..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-indigo-400 resize-none leading-relaxed"
                />
              </div>

              {/* Ek Dosya Ekleme */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasAttachment"
                    checked={hasAttachment}
                    onChange={(e) => setHasAttachment(e.target.checked)}
                    className="rounded-md border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="hasAttachment" className="text-xs font-bold text-slate-800 cursor-pointer">
                    📎 Mesaja Ek Dosya / Doküman Ekle
                  </label>
                </div>

                {hasAttachment && (
                  <select
                    value={selectedAttachment}
                    onChange={(e) => setSelectedAttachment(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  >
                    <option value="Haftalik_Calisma_Programi_7B.pdf">Haftalik_Calisma_Programi_7B.pdf (1.2 MB)</option>
                    <option value="Veli_Toplanti_Gundemi_ve_Yer_Plani.pdf">Veli_Toplanti_Gundemi_ve_Yer_Plani.pdf (850 KB)</option>
                    <option value="Deneme_Sinavi_Kazanim_Raporu.pdf">Deneme_Sinavi_Kazanim_Raporu.pdf (2.1 MB)</option>
                    <option value="Kitap_Okuma_Takip_Cizelgesi.pdf">Kitap_Okuma_Takip_Cizelgesi.pdf (620 KB)</option>
                  </select>
                )}
              </div>
            </div>

            {/* ADIM 4: GÖNDERİM BUTONU VE ÖZET */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700 block">
                  İletim Özeti: {targetRecipientCount} Veli
                </span>
                <span className="text-[11px] text-slate-400">
                  {sendChannels.portal ? 'Portal ' : ''}
                  {sendChannels.portal && sendChannels.sms ? '+ ' : ''}
                  {sendChannels.sms ? 'SMS' : ''} ile anında gönderilecek.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setContent('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Temizle
                </button>

                <button
                  type="submit"
                  disabled={isSending || !title.trim() || !content.trim() || targetRecipientCount === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>
                    {isSending
                      ? 'Velilere Gönderiliyor...'
                      : `Toplu Mesajı Şimdi Gönder (${targetRecipientCount} Veli)`}
                  </span>
                </button>
              </div>
            </div>

          </form>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKME 2: GÖNDERİLEN TOPLU MESAJLAR GEÇMİŞİ */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gönderilen Toplu Mesaj Raporları ({bulkMessages.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daha önce velilere gönderdiğiniz tüm toplu duyuruları ve iletim durumlarını inceleyebilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              + Yeni Toplu Mesaj
            </button>
          </div>

          <div className="space-y-3">
            {bulkMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      msg.priority === 'acil'
                        ? 'bg-rose-100 text-rose-800'
                        : msg.priority === 'onemli'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {msg.priority === 'acil' ? '🔴 Acil' : msg.priority === 'onemli' ? '🟠 Önemli' : '🟢 Normal'}
                    </span>

                    <span className="text-xs text-slate-400">
                      {msg.date}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {msg.className} Sınıfı
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    ✓ %100 İletildi ({msg.recipientCount}/{msg.totalRecipients} Veli)
                  </span>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {msg.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>

                {msg.attachmentName && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 inline-flex items-center gap-2 text-xs text-slate-700">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold">{msg.attachmentName}</span>
                    <span className="text-[10px] text-slate-400">(Ekli Doküman)</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Veli Portalı
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <MailCheck className="w-3.5 h-3.5" />
                      SMS Bildirimi
                    </span>
                    <span className="text-slate-400">
                      Gönderen: {msg.senderName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTitle(msg.title);
                      setContent(msg.content);
                      setPriority(msg.priority);
                      setActiveTab('compose');
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Bu Mesajı Yeniden Kullan &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

