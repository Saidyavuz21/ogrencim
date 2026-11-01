'use client';

import React, { useState, useRef } from 'react';
import { 
  Award, 
  Search, 
  Trophy, 
  Users, 
  ArrowDownCircle, 
  UserCheck 
} from './icons';
import { LeaderboardStudent } from '../data/portalData';

interface LeaderboardSectionProps {
  students: LeaderboardStudent[];
  classAverage?: number;
}

export const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({
  students,
  classAverage = 78.4,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'top10' | 'my_student'>('all');
  const myStudentRef = useRef<HTMLDivElement | null>(null);

  const scrollToMyStudent = () => {
    if (myStudentRef.current) {
      myStudentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      myStudentRef.current.classList.add('bg-indigo-100/80');
      setTimeout(() => {
        myStudentRef.current?.classList.remove('bg-indigo-100/80');
      }, 1500);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentNo.includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterView === 'top10') return s.rank <= 10;
    if (filterView === 'my_student') return s.isCurrentUser;
    return true;
  });

  const myStudent = students.find((s) => s.isCurrentUser);

  return (
    <div className="space-y-3">
      
      {/* Kendi Öğrencimiz Hızlı Bilgilendirme Çubuğu (Sade & Zarif) */}
      {myStudent && (
        <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
              #{myStudent.rank}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-indigo-900">
                  {myStudent.name}
                </span>
                <span className="text-[10px] bg-indigo-600 text-white font-medium px-1.5 py-0.2 rounded-md">
                  Öğrenciniz
                </span>
              </div>
              <p className="text-xs text-indigo-700/80 mt-0.5">
                7-B sınıfında 28 öğrenci arasında <strong>{myStudent.rank}. sırada</strong> (Ortalama: {myStudent.average})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToMyStudent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-colors self-start sm:self-auto"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Listede Konumuma Git</span>
          </button>
        </div>
      )}

      {/* İlk 3 Başarı Kürsüsü (Sade & Düz Kartlar) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {students.slice(0, 3).map((st) => {
          return (
            <div
              key={st.id}
              className={`rounded-2xl p-3.5 border transition-all ${
                st.isCurrentUser
                  ? 'bg-indigo-50/50 border-indigo-200'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  {st.rank === 1 ? '🥇 Sınıf 1.si' : st.rank === 2 ? '🥈 Sınıf 2.si' : '🥉 Sınıf 3.sü'}
                </span>
                {st.isCurrentUser && (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.2 rounded-md">
                    Sizin Öğrenciniz
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {st.name}
                  </h4>
                  <span className="text-xs text-slate-400">
                    No: {st.studentNo}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900 block leading-tight">
                    {st.average}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Ortalama</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sınıf Sıralama Tablosu / Kart Listesi */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              7-B Sınıf Başarı Sıralaması
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              28 öğrenci • Sınıf Genel Ortalaması: <strong className="text-slate-700">{classAverage}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Arama */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Öğrenci veya numara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
              />
            </div>

            {/* Filtre Butonları */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterView('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterView === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü (28)
              </button>
              <button
                type="button"
                onClick={() => setFilterView('top10')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterView === 'top10'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                İlk 10
              </button>
              <button
                type="button"
                onClick={() => setFilterView('my_student')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  filterView === 'my_student'
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-700 hover:text-indigo-900'
                }`}
              >
                Öğrencim
              </button>
            </div>
          </div>
        </div>

        {/* Masaüstü Tablo Görünümü */}
        <div className="hidden md:block overflow-x-auto mt-2">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Sıra</th>
                <th className="py-2.5 px-3">Öğrenci Adı Soyadı</th>
                <th className="py-2.5 px-3">Okul No</th>
                <th className="py-2.5 px-3 text-center">Ödev Başarısı</th>
                <th className="py-2.5 px-3 text-center">Artı / Eksi</th>
                <th className="py-2.5 px-3 text-right">Ortalama</th>
                <th className="py-2.5 px-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st) => {
                const isMyChild = st.isCurrentUser;

                return (
                  <tr
                    key={st.id}
                    ref={isMyChild ? (myStudentRef as any) : undefined}
                    className={`transition-colors duration-200 ${
                      isMyChild
                        ? 'bg-indigo-50/70 font-semibold text-indigo-950'
                        : 'hover:bg-slate-50/70 text-slate-700'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                        isMyChild ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {st.rank}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span>{st.name}</span>
                        {isMyChild && (
                          <span className="text-[10px] bg-indigo-600 text-white font-medium px-1.5 py-0.2 rounded-md">
                            Sizin Öğrenciniz
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-400">
                      {st.studentNo}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
                        <span>{st.completedHomeworks} ödev</span>
                        <span className="text-slate-300">•</span>
                        <strong className="text-indigo-700 font-bold">{st.homeworkPoints ?? 90} Pts</strong>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 text-xs font-bold">
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          +{st.plusCount ?? 3}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700">
                          -{st.minusCount ?? 0}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">
                          ({(st.netBehaviorPoints ?? ((st.plusCount ?? 3) - (st.minusCount ?? 0))) > 0 ? `+${st.netBehaviorPoints ?? ((st.plusCount ?? 3) - (st.minusCount ?? 0))}` : (st.netBehaviorPoints ?? 0)}p)
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {st.average}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {isMyChild ? (
                        <span className="text-xs font-semibold text-indigo-700">
                          3. Sırada
                        </span>
                      ) : st.badge ? (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {st.badge}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobil Kart Görünümü */}
        <div className="md:hidden space-y-2 mt-3">
          {filteredStudents.map((st) => {
            const isMyChild = st.isCurrentUser;

            return (
              <div
                key={st.id}
                ref={isMyChild ? (myStudentRef as any) : undefined}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  isMyChild
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isMyChild ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {st.rank}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-xs font-semibold ${isMyChild ? 'text-indigo-950 font-bold' : 'text-slate-900'}`}>
                          {st.name}
                        </h4>
                        {isMyChild && (
                          <span className="bg-indigo-600 text-white text-[9px] font-semibold px-1.5 py-0.2 rounded-sm">
                            Siz
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                        <span>No: {st.studentNo}</span>
                        <span>•</span>
                        <span>{st.completedHomeworks} ödev ({st.homeworkPoints ?? 90} P)</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">+{st.plusCount ?? 3}</span>
                        <span>/</span>
                        <span className="text-rose-700 font-semibold">-{st.minusCount ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold block leading-none ${isMyChild ? 'text-indigo-700' : 'text-slate-900'}`}>
                      {st.average}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Ort.
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
