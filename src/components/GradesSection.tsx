'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  BookOpen, 
  Calculator, 
  FlaskConical, 
  Globe, 
  Languages, 
  HeartHandshake,
  BarChart3,
  FileCheck2,
  Star,
  Check,
  X,
  ThumbsUp,
  ThumbsDown
} from './icons';
import { CourseGrade, StudentPointsSummary, INITIAL_STUDENT_POINTS } from '../data/portalData';

interface GradesSectionProps {
  grades: CourseGrade[];
  overallGpa: number;
  studentPoints?: StudentPointsSummary;
}

export const GradesSection: React.FC<GradesSectionProps> = ({
  grades,
  overallGpa,
  studentPoints: propStudentPoints,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>('grd-mat');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [pointsTypeFilter, setPointsTypeFilter] = useState<'all' | 'plus' | 'minus'>('all');

  const studentPoints = propStudentPoints || INITIAL_STUDENT_POINTS['ogr-452'];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Calculator':
        return Calculator;
      case 'BookOpen':
        return BookOpen;
      case 'FlaskConical':
        return FlaskConical;
      case 'Globe':
        return Globe;
      case 'Languages':
        return Languages;
      default:
        return HeartHandshake;
    }
  };

  const filteredGrades = selectedFilter === 'all'
    ? grades
    : selectedFilter === '90plus'
    ? grades.filter((g) => g.overallAverage >= 90)
    : grades.filter((g) => g.overallAverage < 90);

  return (
    <div className="space-y-3">
      {/* 4 Özet Bilgi Kartı (Sade & Düz) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium block">Genel Ortalama</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-900">{overallGpa}</span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
              5.00 Üzerinden
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium block">Dönem Sonu Belgesi</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
              <span>Takdir Belgesi</span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">+6.40 puan baraj üstü</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium block">Artı / Eksi Katılımı</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              +/-
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
              <span>+{studentPoints.plusCount} Artı</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600">-{studentPoints.minusCount} Eksi</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Net: <strong className="text-slate-800 font-bold">+{studentPoints.netScore} Puan</strong> katkı
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium block">Sınıf Kıyası</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-600">
              +15.4 Puan
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">7-B ortalaması: 76.0</p>
          </div>
        </div>
      </div>

      {/* ÖĞRETMEN ARTI (+) / EKSİ (-) & DAVRANIŞ VE KATILIM ÇİZELGESİ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Öğretmen Artı (+) / Eksi (-) &amp; Davranış Karnesi
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Öğretmenlerimizin ders içi aktif katılım, soru çözme, ödev düzeni ve davranış değerlendirmeleri (1 Artı = +1 Puan, 1 Eksi = -1 Puan)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              Net Katkı: +{studentPoints.netScore} Puan
            </span>
          </div>
        </div>

        {/* 3 Küçük Özet Kutusu & Filtreleme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span>✓</span>
              <span>{studentPoints.plusCount} Adet Artı (+{studentPoints.plusCount} Puan)</span>
            </span>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <span>✕</span>
              <span>{studentPoints.minusCount} Adet Eksi (-{studentPoints.minusCount} Puan)</span>
            </span>
          </div>

          {/* Filtre */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPointsTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                pointsTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({studentPoints.history.length})
            </button>
            <button
              type="button"
              onClick={() => setPointsTypeFilter('plus')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                pointsTypeFilter === 'plus' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Artılar ({studentPoints.plusCount})
            </button>
            <button
              type="button"
              onClick={() => setPointsTypeFilter('minus')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                pointsTypeFilter === 'minus' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Eksiler ({studentPoints.minusCount})
            </button>
          </div>
        </div>

        {/* Artı / Eksi Zaman Çizelgesi Listesi */}
        <div className="space-y-2 mt-2">
          {studentPoints.history
            .filter((rec) => pointsTypeFilter === 'all' || rec.type === pointsTypeFilter)
            .map((rec) => (
              <div
                key={rec.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                  rec.type === 'plus' ? 'bg-emerald-50/30 border-emerald-200/80' : 'bg-rose-50/30 border-rose-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                    rec.type === 'plus' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {rec.type === 'plus' ? '+' : '-'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{rec.subject}</span>
                      <span className="text-[11px] text-slate-500">({rec.teacherName})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        rec.type === 'plus' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rec.points > 0 ? `+${rec.points}` : rec.points} Puan
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-0.5 font-medium leading-relaxed">
                      &ldquo;{rec.reason}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] text-slate-400 shrink-0 pl-10 sm:pl-0">
                  <span>{rec.date}</span>
                </div>
              </div>
            ))}

          {studentPoints.history.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              Henüz kaydedilmiş artı veya eksi puan bulunmuyor.
            </div>
          )}
        </div>
      </div>

      {/* Ders Listesi ve Filtreleme */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Ders Bazlı Puan Çizelgesi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sınavlar, sözlü notları, ödev ortalamaları ve öğretmen görüşleri
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tüm Dersler ({grades.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('90plus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === '90plus'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              90 ve Üzeri ({grades.filter((g) => g.overallAverage >= 90).length})
            </button>
          </div>
        </div>

        {/* Not Kartları (Açılır/Kapanır) */}
        <div className="mt-3.5 space-y-2.5">
          {filteredGrades.map((course) => {
            const isExpanded = expandedId === course.id;
            const IconComponent = getSubjectIcon(course.iconName);

            return (
              <div
                key={course.id}
                className={`border rounded-2xl transition-all duration-150 overflow-hidden ${
                  isExpanded ? 'border-slate-300 bg-white' : 'border-slate-200/90 bg-white'
                }`}
              >
                {/* Kart Başlığı */}
                <div
                  onClick={() => toggleExpand(course.id)}
                  className="p-3.5 sm:p-4 cursor-pointer select-none flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {course.subject}
                        </h4>
                        <span className="text-xs text-slate-300 hidden xs:inline">•</span>
                        <span className="text-xs text-slate-500 hidden xs:inline truncate">
                          {course.teacher}
                        </span>
                      </div>

                      {/* İlerleme Kıyaslama Barı */}
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className="w-32 sm:w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="bg-slate-800 h-full rounded-full"
                            style={{ width: `${course.overallAverage}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Sınıf: <strong className="text-slate-700">{course.classAverage}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sağ: Ortalama & Açma/Kapama */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-bold text-slate-900 block leading-none">
                        {course.overallAverage}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Ders Ort.
                      </span>
                    </div>

                    <div className="p-1 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Açılır Ayrıntılar */}
                {isExpanded && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3">
                    
                    {/* Not Kutucukları */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-[11px] text-slate-500 block">1. Yazılı</span>
                        <span className="text-base font-bold text-slate-900 mt-0.5 block">{course.exam1}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-[11px] text-slate-500 block">2. Yazılı</span>
                        <span className="text-base font-bold text-slate-900 mt-0.5 block">{course.exam2 ?? '-'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-[11px] text-slate-500 block">1. Sözlü</span>
                        <span className="text-base font-bold text-slate-900 mt-0.5 block">{course.oral1}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-[11px] text-slate-500 block">2. Sözlü</span>
                        <span className="text-base font-bold text-slate-900 mt-0.5 block">{course.oral2 ?? '-'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                        <span className="text-[11px] text-slate-500 block">Ödev Ort.</span>
                        <span className="text-base font-bold text-indigo-600 mt-0.5 block">{course.homeworkAvg}</span>
                      </div>
                    </div>

                    {/* Öğretmen Görüşü */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-slate-800">
                          {course.teacher}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-sm">
                          Görüş
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        &ldquo;{course.teacherNote}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Sınıf ortalaması: {course.classAverage}</span>
                      <span className="text-emerald-700 font-medium">
                        +{(course.overallAverage - course.classAverage).toFixed(1)} puan fark
                      </span>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
