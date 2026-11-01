'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  MessageSquareQuote,
  Paperclip,
  Check,
  Image as ImageIcon,
  File,
  StickyNote,
  Eye,
  X,
  Printer
} from './icons';
import { Assignment, HomeworkType } from '../data/portalData';

interface HomeworkSectionProps {
  assignments: Assignment[];
  onAssignmentsChange?: (assignments: Assignment[]) => void;
}

export const HomeworkSection: React.FC<HomeworkSectionProps> = ({
  assignments: initialAssignments,
  onAssignmentsChange,
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bekliyor' | 'teslim_edildi' | 'puanlandi'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdf' | 'resim' | 'not'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('hw-1');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Önizleme Modalleri
  const [previewPdf, setPreviewPdf] = useState<{ title: string; fileName: string; size?: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ title: string; fileName: string; subject: string; note?: string } | null>(null);

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredAssignments = assignments.filter((hw) => {
    const matchesFilter = activeFilter === 'all' || hw.status === activeFilter;
    const matchesType = 
      typeFilter === 'all' || 
      hw.homeworkType === typeFilter || 
      (hw.homeworkType === 'karma' && (typeFilter === 'pdf' || typeFilter === 'resim' || typeFilter === 'not'));
    const matchesSearch = 
      hw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hw.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hw.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesType && matchesSearch;
  });

  const handleSimulatedSubmit = (id: string) => {
    setSubmittingId(id);
    setTimeout(() => {
      const updated = assignments.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: 'teslim_edildi' as const,
            submittedDate: 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            submittedFile: `${item.title.substring(0, 15)}_Cozum.pdf`,
          };
        }
        return item;
      });
      setAssignments(updated);
      if (onAssignmentsChange) onAssignmentsChange(updated);
      setSubmittingId(null);
      showToast('Ödev öğretmene başarıyla teslim edildi.');
    }, 800);
  };

  return (
    <div className="space-y-3">
      {/* Toast Bildirim */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Başlık ve Filtreleme */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Öğretmenin Gönderdiği Ödevler
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Öğretmenler tarafından gönderilen PDF alıştırmaları, tahta fotoğrafları ve ders notları
            </p>
          </div>

          {/* Arama Çubuğu */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ödev, ders veya öğretmen ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-300"
            />
          </div>
        </div>

        {/* 1. ÖDEV FORMATI / TÜRÜ FİLTRESİ (PDF, RESİM, NOT) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">Ödev Türü:</span>
          {[
            { id: 'all', label: 'Tüm Türler', icon: FileText },
            { id: 'pdf', label: 'PDF Belgesi', icon: File },
            { id: 'resim', label: 'Resim / Görsel', icon: ImageIcon },
            { id: 'not', label: 'Yazılı Not', icon: StickyNote },
          ].map((t) => {
            const isSelected = typeFilter === t.id;
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id as any)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. DURUM SEKMELERİ (Bekliyor, Teslim Edildi, Puanlandı) */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Tümü', count: assignments.length },
            { id: 'bekliyor', label: 'Bekleyenler', count: assignments.filter((a) => a.status === 'bekliyor').length },
            { id: 'teslim_edildi', label: 'Teslim Edilenler', count: assignments.filter((a) => a.status === 'teslim_edildi').length },
            { id: 'puanlandi', label: 'Puanlananlar', count: assignments.filter((a) => a.status === 'puanlandi').length },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ödev Kartları Listesi */}
      <div className="space-y-2.5">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80">
            <p className="text-xs text-slate-500">Seçilen filtrelere uygun ödev bulunamadı.</p>
          </div>
        ) : (
          filteredAssignments.map((hw) => {
            const isExpanded = expandedId === hw.id;

            return (
              <div
                key={hw.id}
                className={`bg-white rounded-2xl border transition-all duration-150 overflow-hidden ${
                  isExpanded ? 'border-slate-300' : 'border-slate-200/90'
                }`}
              >
                {/* Kart Başlığı (Açılır-Kapanır Tıklama Alanı) */}
                <div
                  onClick={() => toggleExpand(hw.id)}
                  className="p-3.5 sm:p-4 cursor-pointer select-none flex items-start sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    
                    {/* Sade Ders Rozeti */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {hw.subject.substring(0, 3)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                          {hw.subject}
                        </span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {hw.teacher}
                        </span>

                        {/* Ödev Türü Rozeti (PDF, Resim, Not) */}
                        {hw.homeworkType === 'pdf' && (
                          <span className="bg-red-50 text-red-700 border border-red-200/60 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <File className="w-3 h-3 text-red-600" /> PDF Föyü
                          </span>
                        )}
                        {hw.homeworkType === 'resim' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-amber-600" /> Görsel / Fotoğraf
                          </span>
                        )}
                        {hw.homeworkType === 'not' && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <StickyNote className="w-3 h-3 text-emerald-600" /> Öğretmen Notu
                          </span>
                        )}
                        {hw.homeworkType === 'karma' && (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-indigo-600" /> PDF + Resim + Not
                          </span>
                        )}

                        {/* Durum Rozeti (Sade Pastel) */}
                        {hw.status === 'bekliyor' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/70 text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" /> {hw.remainingDays} gün kaldı
                          </span>
                        )}
                        {hw.status === 'teslim_edildi' && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200/70 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            İnceleniyor
                          </span>
                        )}

                        {/* ÖDEV PUANI ROZETİ (HER ÖDEV BİR PUAN) */}
                        {hw.score !== undefined ? (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            🎯 {hw.score} / {hw.pointsPossible || 100} Puan
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            Değer: {hw.pointsPossible || 100} Puan
                          </span>
                        )}

                        {/* ÖĞRETMEN ÖDEV KONTROLÜ ROZETİ (Yaptı / Kısmen / Yapmadı) */}
                        {hw.studentCheckStatus === 'yapti' && (
                          <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-700" /> Yaptı (+)
                          </span>
                        )}
                        {hw.studentCheckStatus === 'kismen' && (
                          <span className="bg-amber-100/80 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-700" /> Kısmen (+/-)
                          </span>
                        )}
                        {hw.studentCheckStatus === 'yapmadi' && (
                          <span className="bg-rose-100/80 text-rose-900 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <X className="w-3 h-3 text-rose-700" /> Yapmadı (-)
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mt-1 leading-snug">
                        {hw.title}
                      </h3>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Son Teslim: <strong className="text-slate-600 font-medium">{hw.dueDate}</strong>
                        </span>
                        {hw.attachmentDetails && hw.attachmentDetails.length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
                            <Paperclip className="w-3 h-3" />
                            {hw.attachmentDetails.length} dosya eki
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ Ok ve Puan */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    {hw.status === 'puanlandi' && (
                      <span className="hidden sm:inline-block text-base font-bold text-slate-800">
                        {hw.score} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                      </span>
                    )}
                    <div className="p-1 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Açılır Kapanır Detay Bölümü */}
                {isExpanded && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3.5">
                    
                    {/* 1. Ödev Genel Talimatı */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Ödev Açıklaması
                      </span>
                      <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                        {hw.description}
                      </p>
                    </div>

                    {/* ÖĞRETMEN ÖDEV KONTROL SONUCU KUTUSU */}
                    {hw.studentCheckStatus && (
                      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        hw.studentCheckStatus === 'yapti'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : hw.studentCheckStatus === 'kismen'
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                          : 'bg-rose-50/80 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                            hw.studentCheckStatus === 'yapti'
                              ? 'bg-emerald-600 text-white'
                              : hw.studentCheckStatus === 'kismen'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-600 text-white'
                          }`}>
                            {hw.studentCheckStatus === 'yapti' ? '✓' : hw.studentCheckStatus === 'kismen' ? '!' : '✕'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold block">
                                Öğretmen Ödev Kontrolü: {hw.studentCheckStatus === 'yapti' ? 'Yaptı (+)' : hw.studentCheckStatus === 'kismen' ? 'Kısmen Yaptı (+/-)' : 'Yapmadı (-)'}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                                Ödev Puanı: {hw.score ?? (hw.studentCheckStatus === 'yapti' ? (hw.pointsPossible || 100) : hw.studentCheckStatus === 'kismen' ? Math.round((hw.pointsPossible || 100) / 2) : 0)} / {hw.pointsPossible || 100} Puan
                              </span>
                            </div>
                            <span className="text-[11px] opacity-80 block mt-0.5">
                              Öğrenciniz Emre Demir için öğretmen değerlendirme ve kontrol kaydı
                            </span>
                          </div>
                        </div>

                        {hw.studentCheckNote && (
                          <div className="sm:text-right pl-9 sm:pl-0">
                            <span className="text-[10px] uppercase font-semibold opacity-70 block">Kontrol Notu:</span>
                            <span className="text-xs font-medium italic">&ldquo;{hw.studentCheckNote}&rdquo;</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. EĞER YAZILI NOT VARSA (Öğretmen Özel Ders Notu) */}
                    {hw.teacherNote && (
                      <div className="bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2">
                          <StickyNote className="w-4 h-4 text-amber-700 shrink-0" />
                          <span className="text-xs font-bold text-amber-900">
                            Öğretmenin Özel Ders Notu & Yönergesi
                          </span>
                        </div>
                        <p className="text-xs text-amber-950 leading-relaxed font-sans pl-6">
                          &ldquo;{hw.teacherNote}&rdquo;
                        </p>
                        <span className="text-[10px] text-amber-800/80 block pl-6">
                          — {hw.teacher}
                        </span>
                      </div>
                    )}

                    {/* 3. EĞER PDF YA DA RESİM EKLERİ VARSA */}
                    {hw.attachmentDetails && hw.attachmentDetails.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Öğretmenin Eklediği Materyaller ({hw.attachmentDetails.length} Adet):
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {hw.attachmentDetails.map((att) => (
                            <div
                              key={att.id}
                              className="bg-white p-3 rounded-xl border border-slate-200/90 flex flex-col justify-between gap-2.5 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  att.type === 'pdf' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {att.type === 'pdf' ? (
                                    <File className="w-5 h-5" />
                                  ) : (
                                    <ImageIcon className="w-5 h-5" />
                                  )}
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-slate-800 truncate block">
                                      {att.name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 block mt-0.5">
                                    {att.type === 'pdf' ? 'PDF Çalışma Föyü' : 'Görsel / Tahta Fotoğrafı'} {att.size ? `• ${att.size}` : ''}
                                  </span>
                                </div>
                              </div>

                              {/* İncele ve İndir Butonları */}
                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                {att.type === 'pdf' ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPdf({ title: hw.title, fileName: att.name, size: att.size })}
                                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>PDF&apos;i Aç &amp; İncele</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ title: hw.title, fileName: att.name, subject: hw.subject, note: hw.teacherNote })}
                                    className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Görseli İncele</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => showToast(`"${att.name}" başarıyla indirildi.`)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors shrink-0"
                                  title="Dosyayı İndir"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Puanlanmışsa Öğretmen Görüşü */}
                    {hw.status === 'puanlandi' && hw.teacherFeedback && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-800">
                            Öğretmen Değerlendirmesi
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {hw.score} Puan
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic">
                          &ldquo;{hw.teacherFeedback}&rdquo;
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Değerlendiren: {hw.teacher}
                        </span>
                      </div>
                    )}

                    {/* 5. Teslim Edilmişse */}
                    {hw.status === 'teslim_edildi' && (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <span>Yüklenen Dosya: <strong>{hw.submittedFile}</strong> ({hw.submittedDate})</span>
                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          İnceleniyor
                        </span>
                      </div>
                    )}

                    {/* 6. Bekliyorsa Teslim Butonu */}
                    {hw.status === 'bekliyor' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                        <span className="text-xs text-slate-500">
                          Son teslim tarihine {hw.remainingDays} gün kaldı.
                        </span>

                        <button
                          type="button"
                          disabled={submittingId === hw.id}
                          onClick={() => handleSimulatedSubmit(hw.id)}
                          className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{submittingId === hw.id ? 'Yükleniyor...' : 'Çözümü / Ödevi Sisteme Yükle'}</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* PDF ÖNİZLEME MODALI */}
      {/* ========================================================================= */}
      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-sm overflow-hidden">
            {/* Modal Başlık */}
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
                    PDF Çalışma Kağıdı • {previewPdf.size || '1.8 MB'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showToast(`"${previewPdf.fileName}" yazdırılıyor...`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors"
                  title="Yazdır"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => showToast(`"${previewPdf.fileName}" indirildi.`)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors"
                  title="İndir"
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

            {/* Simüle Edilmiş PDF Sayfası */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 space-y-4">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4 text-xs text-slate-800">
                <div className="border-b pb-3 flex items-center justify-between text-slate-400 text-[10px]">
                  <span>MİLLÎ EĞİTİM BAKANLIĞI • 2026-2027</span>
                  <span>Sayfa: 1 / 3</span>
                </div>

                <div className="text-center py-2">
                  <h4 className="text-sm font-bold text-slate-900 uppercase">
                    {previewPdf.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Haftalık Ders Çalışma &amp; Pekiştirme Test Föyü
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-800">Soru 1:</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Verilen analitik düzlemde A(3, -2) ve B(-1, 4) noktalarından geçen doğrunun eğimini hesaplayınız ve denklemini yazınız.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-800">Soru 2:</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Aşağıdaki tabloda verilen x ve y değerleri arasındaki doğrusal ilişkiyi denklem olarak ifade ediniz.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-800">Soru 3 (Yeni Nesil Beceri Temelli):</p>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Bir su deposunda başlangıçta 120 litre su bulunmaktadır. Her saat başında depoya 15 litre su ilave edilmektedir. Zamana bağlı su miktarının grafiğini çiziniz.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t text-center text-[10px] text-slate-400">
                  Öğretmen Yönergesi: Tüm işlemler kareli deftere cetvelle çizilerek tamamlanacaktır.
                </div>
              </div>
            </div>

            {/* Modal Alt Çubuk */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Öğrenci &amp; Veli İnceleme Modu</span>
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
            {/* Modal Başlık */}
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
                    Öğretmenin Gönderdiği Tahta / Ders Görseli
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

            {/* Simüle Edilmiş Tahta / Şema Görseli */}
            <div className="p-4 sm:p-6 bg-slate-900 flex flex-col items-center justify-center min-h-[260px] text-white">
              <div className="w-full max-w-md bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[10px] border-b border-slate-700 pb-2">
                  <span>DERS: {previewImage.subject.toUpperCase()}</span>
                  <span>TAHTA NOTU #01</span>
                </div>

                <div className="text-emerald-400 font-semibold text-center text-sm">
                  {previewImage.title}
                </div>

                {/* Tahta İllüstrasyonu */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-[11px] space-y-2 text-slate-300">
                  <p className="text-amber-300 font-bold">1. Önemli Kural / Kavram:</p>
                  <p>• Cümlede anlam ilişkilerinde neden-sonuç ile amaç-sonuç arasındaki farkı ayırt etmek için &quot;amacıyla&quot; ifadesi denenir.</p>
                  <p className="text-amber-300 font-bold pt-1">2. Örnek Tahlil:</p>
                  <p>• &quot;Sınavı kazanmak için çok çalıştı.&quot; → (Amaç-Sonuç)</p>
                  <p>• &quot;Yağmur yağdığı için yollar kapandı.&quot; → (Neden-Sonuç)</p>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-1">
                  Öğretmen Yönergesi: Bu şemayı defterinize aynen geçirip benzer 3 örnek yazınız.
                </p>
              </div>
            </div>

            {/* Modal Alt Çubuk */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Yüksek Çözünürlüklü Görsel Önizleme</span>
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

    </div>
  );
};
