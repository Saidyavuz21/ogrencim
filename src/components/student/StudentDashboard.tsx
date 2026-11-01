'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle2, 
  Upload, 
  Star, 
  BookOpen, 
  ChevronRight, 
  MessageSquare, 
  AlertCircle,
  X,
  Sparkles,
  Paperclip,
  Check
} from '../icons';
import { 
  Student, 
  Assignment, 
  CourseGrade, 
  StudentPointsSummary, 
  LeaderboardStudent, 
  ChatMessage,
  COURSE_GRADES 
} from '../../data/portalData';

interface StudentDashboardProps {
  student: Student;
  assignments: Assignment[];
  onAssignmentsChange: (assignments: Assignment[]) => void;
  studentPoints?: StudentPointsSummary;
  leaderboardStudents: LeaderboardStudent[];
  onNavigateToMessages: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  assignments,
  onAssignmentsChange,
  studentPoints,
  leaderboardStudents,
  onNavigateToMessages,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'homeworks' | 'points' | 'leaderboard'>('homeworks');
  
  // Ödev Teslim Modalı
  const [submittingHw, setSubmittingHw] = useState<Assignment | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const pendingAssignments = assignments.filter((a) => a.status === 'bekliyor');
  const submittedAssignments = assignments.filter((a) => a.status === 'teslim_edildi');
  const gradedAssignments = assignments.filter((a) => a.status === 'puanlandi');

  // Ödev Teslim Etme İşlemi
  const handleSubmitHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingHw) return;

    const fileName = uploadedFileName || 'emre_odev_cozumu.pdf';
    const updated = assignments.map((a) => {
      if (a.id === submittingHw.id) {
        return {
          ...a,
          status: 'teslim_edildi' as const,
          submittedDate: 'Bugün (31 Ekim 2026)',
          studentAttachment: {
            id: `att-${Date.now()}`,
            name: fileName,
            size: '2.4 MB',
            uploadDate: 'Az önce',
            type: fileName.endsWith('.pdf') ? ('pdf' as const) : ('resim' as const),
          },
        };
      }
      return a;
    });

    onAssignmentsChange(updated);
    showToast(`"${submittingHw.title}" ödeviniz başarıyla öğretmene teslim edildi!`);
    setSubmittingHw(null);
    setSubmissionNote('');
    setUploadedFileName('');
  };

  return (
    <div className="space-y-4 pb-12 antialiased">
      
      {/* 1. ÖĞRENCİ KAHRAMAN BAŞLIĞI */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xl text-white shadow-inner">
              {student.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">
                  {student.name}
                </h1>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-md border border-white/20">
                  No: {student.studentNo} • {student.class}
                </span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
                  Öğrenci Portalı
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 mt-1">
                Rehber Öğretmen: <strong>{student.teacher}</strong> • {student.school}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onNavigateToMessages}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 transition-colors shadow-2xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Öğretmenime Soru Sor</span>
            </button>
          </div>
        </div>

        {/* 3 Özet İstatistik Kartı */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
            <span className="text-[10px] text-indigo-100 font-medium block">Bekleyen Ödev</span>
            <span className="text-base sm:text-lg font-black mt-0.5 block">{pendingAssignments.length} Ödev</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
            <span className="text-[10px] text-indigo-100 font-medium block">Artı / Eksi Puan</span>
            <span className="text-base sm:text-lg font-black mt-0.5 block text-emerald-300">
              {studentPoints ? (studentPoints.netPoints >= 0 ? `+${studentPoints.netPoints}` : studentPoints.netPoints) : '+8'}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
            <span className="text-[10px] text-indigo-100 font-medium block">Sınıf Sıralaması</span>
            <span className="text-base sm:text-lg font-black mt-0.5 block text-amber-300">#{student.rank} / {student.totalStudents}</span>
          </div>
        </div>
      </div>

      {/* TOAST BİLGİLENDİRME */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. ALT SEKME MENÜSÜ */}
      <div className="flex space-x-1 p-1 bg-white border border-slate-200 rounded-2xl">
        {[
          { id: 'homeworks', label: 'Ödevlerim & Teslim', count: pendingAssignments.length, icon: FileText },
          { id: 'points', label: 'Artı / Eksi Puanlarım & Karne', icon: TrendingUp },
          { id: 'leaderboard', label: 'Sınıf Başarı Sıralaması', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================== SEKME 1: ÖDEVLERİM & TESLİM ===================== */}
      {activeSubTab === 'homeworks' && (
        <div className="space-y-4">
          
          {/* Bekleyen Ödevler Listesi */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Teslim Edilmeyi Bekleyen Ödevlerim ({pendingAssignments.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Öğretmenlerinizin gönderdiği ödevleri inceleyip dosya ekleyerek teslim edebilirsiniz.
                </p>
              </div>
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                🎉 Harika! Bekleyen hiçbir ödeviniz bulunmuyor, tüm ödevleri teslim ettiniz.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAssignments.map((hw) => (
                  <div
                    key={hw.id}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                          {hw.subject}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Öğretmen: {hw.teacher}
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-md">
                          Kalan: {hw.remainingDays} gün
                        </span>
                        {hw.homeworkType === 'pdf' && (
                          <span className="text-[10px] bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded-md">
                            PDF Ödevi
                          </span>
                        )}
                        {hw.homeworkType === 'resim' && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-md">
                            Resim / Şema
                          </span>
                        )}
                        {hw.homeworkType === 'not' && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md">
                            Ders Notu
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">
                        {hw.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {hw.description}
                      </p>

                      {/* Öğretmenin Eklediği Dosya */}
                      {hw.attachment && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 mt-1">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Öğretmen Eki: {hw.attachment.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSubmittingHw(hw)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Ödevi Teslim Et</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tamamlanmış ve Puanlanmış Ödevler */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Teslim Edilen ve Puanlanan Ödevler ({submittedAssignments.length + gradedAssignments.length})</span>
            </h3>

            <div className="divide-y divide-slate-100">
              {[...gradedAssignments, ...submittedAssignments].map((hw) => (
                <div key={hw.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">{hw.subject} • {hw.teacher}</span>
                    <h5 className="text-xs sm:text-sm font-semibold text-slate-900">{hw.title}</h5>
                    {hw.teacherFeedback && (
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Öğretmen Notu: "{hw.teacherFeedback}"
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {hw.status === 'puanlandi' ? (
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        {hw.score} / {hw.pointsPossible || 100} Puan
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
                        İnceleniyor
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ===================== SEKME 2: ARTI/EKSİ PUANLAR & KARNE ===================== */}
      {activeSubTab === 'points' && (
        <div className="space-y-4">
          
          {/* Artı / Eksi Puan Kartı */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Ders İçi Davranış & Katılım Puanlarım (+ / -)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Öğretmenlerinizin derslerde verdiği artı (+) ve eksi (-) kayıtları
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  +{studentPoints?.plusCount || 10} Artı
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                  -{studentPoints?.minusCount || 2} Eksi
                </span>
              </div>
            </div>

            {/* Puan Geçmişi Listesi */}
            <div className="space-y-2">
              {studentPoints?.records && studentPoints.records.length > 0 ? (
                studentPoints.records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                        rec.type === 'plus' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {rec.type === 'plus' ? '+1' : '-1'}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{rec.reason}</span>
                        <span className="text-[11px] text-slate-400 block">{rec.teacherName} • {rec.subject}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">{rec.date}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Henüz kayıtlı artı/eksi puan bulunmuyor.
                </div>
              )}
            </div>
          </div>

          {/* Ders Notları Karnesi */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Ders Yazılı & Proje Notlarım
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COURSE_GRADES.map((course) => (
                <div key={course.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 block truncate">{course.subject}</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-lg font-black text-slate-900">{course.overallAverage}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-bold">
                      Ort: {course.classAverage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ===================== SEKME 3: SINIF BAŞARI SIRALAMASI ===================== */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>7-B Sınıf Başarı Sıralaması (Liderlik)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ödevler, sınavlar ve ders içi puanlamaya göre sınıf sıralamanız
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl">
              Sıranız: #3
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {leaderboardStudents.map((st, idx) => {
              const isCurrent = st.id === student.id;
              return (
                <div
                  key={st.id}
                  className={`py-3 px-3 rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                    isCurrent ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isCurrent ? 'text-indigo-950 font-black' : 'text-slate-900'}`}>
                          {st.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-md">
                            Sen
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">No: {st.studentNo}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 block">{st.score} Puan</span>
                    <span className="text-[10px] text-slate-400 block">{st.homeworksDone} Ödev</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ÖDEV TESLİM ETME MODALI */}
      {submittingHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setSubmittingHw(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 z-10 space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{submittingHw.subject}</span>
                <h3 className="text-sm font-bold text-slate-900">{submittingHw.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmittingHw(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitHomework} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ödev Dosyanız (PDF, Fotoğraf veya Word)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors bg-slate-50">
                  <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    {uploadedFileName || 'Dosya seçmek için tıklayın veya sürükleyin'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Maksimum dosya boyutu: 25 MB (PDF, JPG, PNG)
                  </span>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setUploadedFileName(e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                    id="student-file-upload"
                  />
                  <label
                    htmlFor="student-file-upload"
                    className="inline-block mt-2 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    Dosya Seç
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Öğretmene Teslim Notu (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Hocam, soruların tümünü defterime çözdüm ve fotoğraflarını ekledim..."
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmittingHw(null)}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Ödevi Şimdi Gönder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

