'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  School, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Plus, 
  Search, 
  CheckCircle2, 
  Bell, 
  Settings, 
  Trash2, 
  Edit,
  Save,
  UserPlus
} from '../icons';
import { 
  SCHOOL_CLASSES, 
  TEACHER_LIST, 
  ANNOUNCEMENTS, 
  SchoolClass, 
  TeacherListItem, 
  Announcement 
} from '../../data/portalData';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers' | 'announcements' | 'settings'>('classes');
  const [classes, setClasses] = useState<SchoolClass[]>(SCHOOL_CLASSES);
  const [teachers, setTeachers] = useState<TeacherListItem[]>(TEACHER_LIST);
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);

  // Yeni Sınıf Ekleme
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeacher, setNewClassTeacher] = useState('');
  const [newClassCount, setNewClassCount] = useState(25);

  // Yeni Öğretmen Ekleme
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherBranch, setNewTeacherBranch] = useState('Matematik');

  // Yeni Duyuru Ekleme
  const [isAddAnnOpen, setIsAddAnnOpen] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newCls: SchoolClass = {
      id: `cls-${Date.now()}`,
      name: newClassName,
      homeroomTeacher: newClassTeacher || 'Atanmadı',
      studentCount: Number(newClassCount) || 0,
      averageScore: 75.0,
      attendanceRate: 95.0,
    };

    setClasses([...classes, newCls]);
    setNewClassName('');
    setNewClassTeacher('');
    setIsAddClassOpen(false);
    showToast(`${newClassName} şubesi başarıyla sisteme eklendi.`);
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    const newTch: TeacherListItem = {
      id: `tch-${Date.now()}`,
      name: newTeacherName,
      branch: newTeacherBranch,
      classes: [],
      studentCount: 0,
      phone: '',
    };

    setTeachers([...teachers, newTch]);
    setNewTeacherName('');
    setIsAddTeacherOpen(false);
    showToast(`${newTeacherName} (${newTeacherBranch}) sisteme kaydedildi.`);
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle,
      date: 'Bugün',
      sender: 'Süper Admin (Okul Müdürü)',
      category: 'duyuru',
      priority: 'onemli',
      content: newAnnContent,
    };

    setAnnouncements([newAnn, ...announcements]);
    setNewAnnTitle('');
    setNewAnnContent('');
    setIsAddAnnOpen(false);
    showToast('Okul geneli duyuru tüm veli ve öğretmenlere yayınlandı.');
  };

  return (
    <div className="space-y-4">
      
      {/* Toast Bildirimi */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Süper Admin Başlık Kartı */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Süper Admin Yönetim Paneli
              </h2>
              <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                Okul Yönetimi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Atatürk Bilim ve Sanat Ortaokulu • 2026-2027 Eğitim Öğretim Yılı
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-medium">
            Sistem Aktif & Senkronize
          </span>
        </div>
      </div>

      {/* 4 Özet Kartı */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-left">
          <span className="text-[11px] font-medium text-slate-500 block">Kayıtlı Öğrenci</span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {classes.reduce((acc, c) => acc + c.studentCount, 0)} Öğrenci
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Aktif öğrenim gören</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-left">
          <span className="text-[11px] font-medium text-slate-500 block">Öğretmen Kadrosu</span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{teachers.length} Öğretmen</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Aktif branş kadrosu</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-left">
          <span className="text-[11px] font-medium text-slate-500 block">Aktif Şubeler</span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{classes.length} Sınıf</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tanımlı şube sayısı</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-left">
          <span className="text-[11px] font-medium text-slate-500 block">Okul Başarı Ortalaması</span>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {classes.length > 0 ? (classes.reduce((acc, c) => acc + c.averageScore, 0) / classes.length).toFixed(1) : '0.0'} Puan
          </p>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Genel akademik durum</span>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'classes', label: 'Sınıflar & Şubeler', count: classes.length },
          { id: 'teachers', label: 'Öğretmen Kadrosu', count: teachers.length },
          { id: 'announcements', label: 'Okul Geneli Duyurular', count: announcements.length },
          { id: 'settings', label: 'Dönem & Sistem Ayarları' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MODÜL 1: SINIFLAR & ŞUBELER */}
      {activeTab === 'classes' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mevcut Şubeler ve Sınıflar</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sınıf rehber öğretmenleri ve başarı ortalamaları</p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddClassOpen(!isAddClassOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddClassOpen ? 'Kapat' : 'Yeni Şube Ekle'}</span>
            </button>
          </div>

          {/* Yeni Sınıf Ekle Formu */}
          {isAddClassOpen && (
            <form onSubmit={handleAddClass} className="bg-white rounded-2xl p-4 border border-slate-300 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Yeni Şube Tanımlama
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Şube Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 7-C"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rehber Öğretmen</label>
                  <input
                    type="text"
                    placeholder="Örn: Hasan Yurt"
                    value={newClassTeacher}
                    onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Öğrenci Kontenjanı</label>
                  <input
                    type="number"
                    value={newClassCount}
                    onChange={(e) => setNewClassCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                >
                  Şubeyi Kaydet
                </button>
              </div>
            </form>
          )}

          {/* Sınıf Kartları */}
          {classes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 text-center space-y-2">
              <School className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Henüz Eklenmiş Şube Bulunmuyor</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Yukarıdaki "+ Yeni Şube Ekle" butonuna tıklayarak okulunuzun şubelerini ve sınıflarını tanımlayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">{cls.name} Sınıfı</span>
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {cls.studentCount} Öğrenci
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    <span>Sınıf Rehberi: <strong>{cls.homeroomTeacher}</strong></span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Başarı Ortalaması:</span>
                    <span className="font-bold text-slate-900">{cls.averageScore} Puan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODÜL 2: ÖĞRETMEN KADROSU */}
      {activeTab === 'teachers' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Öğretmen Kadrosu</h3>
              <p className="text-xs text-slate-500 mt-0.5">Branş öğretmenleri ve sorumlu oldukları sınıflar</p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddTeacherOpen(!isAddTeacherOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddTeacherOpen ? 'Kapat' : 'Öğretmen Ekle'}</span>
            </button>
          </div>

          {/* Yeni Öğretmen Formu */}
          {isAddTeacherOpen && (
            <form onSubmit={handleAddTeacher} className="bg-white rounded-2xl p-4 border border-slate-300 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Yeni Öğretmen Kaydı
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kemal Demir"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Branşı</label>
                  <input
                    type="text"
                    required
                    value={newTeacherBranch}
                    onChange={(e) => setNewTeacherBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                >
                  Öğretmeni Kaydet
                </button>
              </div>
            </form>
          )}

          {teachers.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Henüz Kayıtlı Öğretmen Bulunmuyor</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Öğretmenler portaldan kayıt oldukça veya yukarıdaki "+ Öğretmen Ekle" butonu ile ekledikçe burada listelenir.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/90 p-2">
              {teachers.map((t) => (
                <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block text-xs sm:text-sm">{t.name}</span>
                      <span className="text-slate-400 text-[11px]">
                        {t.branch} • {t.homeroomClass ? `Rehberlik: ${t.homeroomClass}` : 'Rehberlik Yok'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block">{t.classes.join(', ')} Sınıfları</span>
                    <span className="text-[11px] text-slate-400">{t.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODÜL 3: OKUL DUYURULARI */}
      {activeTab === 'announcements' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Yayınlanan Okul Duyuruları</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tüm velilerin ve öğretmenlerin gördüğü resmi duyurular</p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddAnnOpen(!isAddAnnOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddAnnOpen ? 'Kapat' : 'Yeni Duyuru Yayınla'}</span>
            </button>
          </div>

          {/* Duyuru Ekle Formu */}
          {isAddAnnOpen && (
            <form onSubmit={handleAddAnnouncement} className="bg-white rounded-2xl p-4 border border-slate-300 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Genel Duyuru Yayını
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Duyuru Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 1. Dönem Genel Veli Toplantısı Hakkında"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Duyuru Metni</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Velilere ve öğretmenlere iletilecek duyuru içeriği..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddAnnOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                >
                  Duyuruyu Yayınla
                </button>
              </div>
            </form>
          )}

          {announcements.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Henüz Yayınlanmış Duyuru Bulunmuyor</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Yukarıdaki "+ Yeni Duyuru Yayınla" butonunu kullanarak okul geneline duyuru yayınlayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-600 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded-md">
                      {ann.category}
                    </span>
                    <span>{ann.date}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{ann.title}</h4>
                  <p className="text-xs text-slate-600">{ann.content}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">Yayınlayan: {ann.sender}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODÜL 4: SİSTEM AYARLARI */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Sistem ve Dönem Yapılandırması</h3>
          
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Aktif Eğitim Dönemi</span>
                <span className="text-slate-400">2026-2027 Eğitim Öğretim Yılı 1. Dönem</span>
              </div>
              <button
                type="button"
                onClick={() => showToast('Dönem bilgisi güncellendi.')}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                Dönemi Değiştir
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">e-Okul Veri Senkronizasyonu</span>
                <span className="text-slate-400">Son senkronizasyon: 31 Ekim 2026 05:00</span>
              </div>
              <button
                type="button"
                onClick={() => showToast('e-Okul verileri başarıyla senkronize edildi.')}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                Şimdi Eşitle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

