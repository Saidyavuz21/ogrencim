'use client';

import React from 'react';
import { 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  ArrowUpRight,
  Star 
} from './icons';
import { Student, StudentPointsSummary } from '../data/portalData';

interface StudentHeroProps {
  student: Student;
  studentPoints?: StudentPointsSummary;
  onNavigateToLeaderboard: () => void;
  onNavigateToHomeworks: () => void;
  onNavigateToGrades: () => void;
}

export const StudentHero: React.FC<StudentHeroProps> = ({
  student,
  studentPoints,
  onNavigateToLeaderboard,
  onNavigateToHomeworks,
  onNavigateToGrades,
}) => {
  const plus = studentPoints?.plusCount ?? 5;
  const minus = studentPoints?.minusCount ?? 1;
  const net = studentPoints?.netScore ?? 4;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 space-y-5">
      
      {/* Üst Kısım: Öğrenci ve Sıralama Bilgisi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        
        {/* Sol: Öğrenci Bilgileri */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-base text-slate-700 shrink-0">
            {student.avatar}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {student.name}
              </h1>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                No: {student.studentNo}
              </span>
              <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-medium">
                {student.class}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
              <span>{student.school}</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                {student.teacher}
              </span>
            </div>
          </div>
        </div>

        {/* Sağ: Sınıf Sıralaması Vurgusu (Sade & Zarif) */}
        <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-medium text-slate-500 block">
              Sınıf Başarı Sırası
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 flex items-baseline gap-1 sm:justify-end">
              <span className="text-indigo-600 font-extrabold">{student.rank}.</span>
              <span className="text-xs text-slate-500 font-normal">/ {student.totalStudents} öğrenci</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToLeaderboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
          >
            <span>Sıralama</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Alt Kısım: 4 Temel Metrik Kartı (Sade, Düz ve Net) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* Not Ortalaması */}
        <button
          type="button"
          onClick={onNavigateToGrades}
          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-colors"
        >
          <span className="text-[11px] font-medium text-slate-500 block">
            Genel Ortalama
          </span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {student.gpa}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
            Takdir Belgesi
          </span>
        </button>

        {/* Ödev Durumu */}
        <button
          type="button"
          onClick={onNavigateToHomeworks}
          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-colors"
        >
          <span className="text-[11px] font-medium text-slate-500 block">
            Ödev Durumu
          </span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {student.homeworkSummary.completed}
            <span className="text-xs font-normal text-slate-500 ml-1">/ {student.homeworkSummary.total}</span>
          </p>
          <span className="text-[11px] text-amber-600 font-medium block mt-0.5">
            {student.homeworkSummary.pending} bekleyen ödev
          </span>
        </button>

        {/* Artı / Eksi Durumu */}
        <button
          type="button"
          onClick={onNavigateToGrades}
          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 text-left transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 block">
            Öğretmen Artı / Eksi
          </span>
          <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">
            +{plus} <span className="text-slate-300 font-normal">/</span> <span className="text-rose-600">-{minus}</span>
          </p>
          <span className="text-[11px] text-indigo-700 font-semibold block mt-0.5">
            +{net} Puan Net Katkı
          </span>
        </button>

        {/* Devamsızlık & Sınıf Kıyası */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-left">
          <span className="text-[11px] font-medium text-slate-500 block">
            Devamsızlık &amp; Kıyas
          </span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {student.attendance.absentDays} <span className="text-xs font-normal text-slate-500">gün</span>
            <span className="text-xs font-bold text-emerald-600 ml-2">(+14.2)</span>
          </p>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {student.attendance.attendedDays} gün okulda
          </span>
        </div>

      </div>

    </div>
  );
};
