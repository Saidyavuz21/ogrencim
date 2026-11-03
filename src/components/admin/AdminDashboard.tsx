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
  UserPlus,
  Eye,
  EyeOff,
  Lock,
  Key,
  Check,
  X
} from '../icons';
import { 
  SCHOOL_CLASSES, 
  TEACHER_LIST, 
  ANNOUNCEMENTS, 
  INITIAL_USER_ACCOUNTS,
  TURKEY_CITIES,
  SchoolClass, 
  TeacherListItem, 
  Announcement,
  UserAccount
} from '../../data/portalData';
import { AccessManagement } from './AccessManagement';

// Standart Öğretmen Branşları Listesi
const TEACHER_BRANCHES = [
  'Matematik',
  'Türkçe',
  'Fen Bilimleri',
  'Sosyal Bilgiler',
  'İngilizce',
  'Din Kültürü ve Ahlak Bilgisi',
  'Bilişim Teknolojileri ve Yazılım',
  'Görsel Sanatlar',
  'Müzik',
  'Beden Eğitimi ve Spor',
  'Rehberlik & Psikolojik Danışmanlık',
  'Teknoloji ve Tasarım',
  'Almanca',
  'Fransızca',
  'Arapça',
  'Sınıf Öğretmenliği',
  'Okul Öncesi',
  'Özel Eğitim',
  'Diğer'
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'access' | 'classes' | 'teachers' | 'announcements' | 'settings'>('access');
  const [classes, setClasses] = useState<SchoolClass[]>(SCHOOL_CLASSES);
  
  // Öğretmen Listesi (TEACHER_LIST ve INITIAL_USER_ACCOUNTS ile senkronize başlangıç)
  const [teachers, setTeachers] = useState<TeacherListItem[]>(() => {
    const list = [...TEACHER_LIST];
    INITIAL_USER_ACCOUNTS.forEach((acc) => {
      if (acc.role === 'ogretmen' && !list.some((t) => t.id === acc.id || (t.email && acc.emailOrPhone && t.email.toLowerCase() === acc.emailOrPhone.toLowerCase()))) {
        list.push({
          id: acc.id,
          name: acc.name,
          email: acc.emailOrPhone,
          password: acc.password,
          schoolName: acc.schoolName || 'e-Okul Portalı',
          city: acc.city || 'Diyarbakır',
          district: acc.district || 'Kayapınar',
          branch: acc.branch || 'Genel',
          homeroomClass: acc.className,
          classes: acc.className ? [acc.className] : [],
          studentCount: 0,
          phone: '',
        });
      }
    });
    return list;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);

  // Yeni Sınıf Ekleme
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeacher, setNewClassTeacher] = useState('');
  const [newClassCount, setNewClassCount] = useState(25);

  // Öğretmen Ekleme / Düzenleme Modalı ve Form Durumları
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null); // null = Yeni Ekle, string = Düzenle
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherBranchFilter, setTeacherBranchFilter] = useState('all');

  // Form Alanları
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSchool, setFormSchool] = useState('Atatürk Bilim ve Sanat Ortaokulu');
  const [formCity, setFormCity] = useState('Diyarbakır');
  const [formDistrict, setFormDistrict] = useState('Kayapınar');
  const [formBranch, setFormBranch] = useState('Matematik');
  const [formHomeroom, setFormHomeroom] = useState('Yok');
  const [formClasses, setFormClasses] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [id: string]: boolean }>({});

  // Yeni Duyuru Ekleme
  const [isAddAnnOpen, setIsAddAnnOpen] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // İl değiştiğinde ilçeyi güncelle
  const handleFormCityChange = (city: string) => {
    setFormCity(city);
    const districts = TURKEY_CITIES[city] || ['Merkez'];
    setFormDistrict(districts[0] || 'Merkez');
  };

  // Yeni Öğretmen Ekleme Formunu Aç
  const handleOpenAddTeacher = () => {
    setEditingTeacherId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormSchool('Atatürk Bilim ve Sanat Ortaokulu');
    setFormCity('Diyarbakır');
    setFormDistrict('Kayapınar');
    setFormBranch('Matematik');
    setFormHomeroom('Yok');
    setFormClasses('');
    setFormPhone('');
    setShowPasswordInForm(false);
    setIsTeacherModalOpen(true);
  };

  // Var Olan Öğretmeni Düzenleme Formunu Aç
  const handleOpenEditTeacher = (t: TeacherListItem) => {
    setEditingTeacherId(t.id);
    setFormName(t.name);
    setFormEmail(t.email || '');
    setFormPassword(t.password || '');
    setFormSchool(t.schoolName || 'Atatürk Bilim ve Sanat Ortaokulu');
    setFormCity(t.city || 'Diyarbakır');
    const districts = TURKEY_CITIES[t.city || 'Diyarbakır'] || ['Merkez'];
    setFormDistrict(t.district || districts[0] || 'Merkez');
    setFormBranch(t.branch || 'Matematik');
    setFormHomeroom(t.homeroomClass || 'Yok');
    setFormClasses(t.classes ? t.classes.join(', ') : '');
    setFormPhone(t.phone || '');
    setShowPasswordInForm(false);
    setIsTeacherModalOpen(true);
  };

  // Öğretmen Kaydetme & Düzenleme Onayı
  const handleSaveTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      showToast('Lütfen Ad Soyad, E-Posta ve Şifre alanlarını eksiksiz doldurunuz.');
      return;
    }

    if (!formEmail.includes('@') || !formEmail.includes('.')) {
      showToast('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    if (formPassword.length < 6) {
      showToast('Şifre güvenlik amacıyla en az 6 karakter olmalıdır.');
      return;
    }

    const classList = formClasses
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (formHomeroom !== 'Yok' && !classList.includes(formHomeroom)) {
      classList.unshift(formHomeroom);
    }

    if (editingTeacherId) {
      // 1. DÜZENLEME (GÜNCELLEME)
      const updatedList = teachers.map((t) => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            name: formName.trim(),
            email: formEmail.trim(),
            password: formPassword.trim(),
            schoolName: formSchool.trim(),
            city: formCity,
            district: formDistrict,
            branch: formBranch,
            homeroomClass: formHomeroom,
            classes: classList,
            phone: formPhone.trim(),
          };
        }
        return t;
      });

      setTeachers(updatedList);

      // Global TEACHER_LIST Senkronizasyonu
      const tIdx = TEACHER_LIST.findIndex((t) => t.id === editingTeacherId);
      if (tIdx !== -1) {
        TEACHER_LIST[tIdx] = {
          ...TEACHER_LIST[tIdx],
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
          schoolName: formSchool.trim(),
          city: formCity,
          district: formDistrict,
          branch: formBranch,
          homeroomClass: formHomeroom,
          classes: classList,
          phone: formPhone.trim(),
        };
      }

      // INITIAL_USER_ACCOUNTS Senkronizasyonu (Yeni şifreyle anında giriş yapabilmesi için)
      const accIdx = INITIAL_USER_ACCOUNTS.findIndex(
        (a) => a.id === editingTeacherId || a.emailOrPhone.toLowerCase() === formEmail.trim().toLowerCase()
      );
      if (accIdx !== -1) {
        INITIAL_USER_ACCOUNTS[accIdx] = {
          ...INITIAL_USER_ACCOUNTS[accIdx],
          name: formName.trim(),
          emailOrPhone: formEmail.trim(),
          password: formPassword.trim(),
          branch: formBranch,
          schoolName: formSchool.trim(),
          className: formHomeroom,
          city: formCity,
          district: formDistrict,
          avatar: formName.trim().slice(0, 2).toUpperCase(),
          title: `${formBranch} Öğretmeni (${formSchool.trim()})`,
        };
      } else {
        INITIAL_USER_ACCOUNTS.push({
          id: editingTeacherId,
          role: 'ogretmen',
          name: formName.trim(),
          emailOrPhone: formEmail.trim(),
          password: formPassword.trim(),
          branch: formBranch,
          schoolName: formSchool.trim(),
          className: formHomeroom,
          city: formCity,
          district: formDistrict,
          avatar: formName.trim().slice(0, 2).toUpperCase(),
          title: `${formBranch} Öğretmeni (${formSchool.trim()})`,
        });
      }

      showToast(`Sn. ${formName} isimli öğretmenin bilgileri ve giriş şifresi güncellendi.`);
    } else {
      // 2. YENİ ÖĞRETMEN EKLEME
      const newId = `usr-tch-${Date.now()}`;
      const newTeacherObj: TeacherListItem = {
        id: newId,
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword.trim(),
        schoolName: formSchool.trim(),
        city: formCity,
        district: formDistrict,
        branch: formBranch,
        homeroomClass: formHomeroom,
        classes: classList,
        studentCount: 0,
        phone: formPhone.trim(),
      };

      setTeachers([newTeacherObj, ...teachers]);
      TEACHER_LIST.unshift(newTeacherObj);

      // INITIAL_USER_ACCOUNTS'a Ekle
      INITIAL_USER_ACCOUNTS.push({
        id: newId,
        role: 'ogretmen',
        name: formName.trim(),
        emailOrPhone: formEmail.trim(),
        password: formPassword.trim(),
        branch: formBranch,
        schoolName: formSchool.trim(),
        className: formHomeroom,
        city: formCity,
        district: formDistrict,
        avatar: formName.trim().slice(0, 2).toUpperCase(),
        title: `${formBranch} Öğretmeni (${formSchool.trim()} • ${formDistrict}/${formCity})`,
      });

      showToast(`Sn. ${formName} (${formBranch}) kadro listesine eklendi. Giriş hesabı için öğretmenin kendisi kayıt olmalı, ardından "Hesaplar & Onay" sekmesinden onaylayın.`);
    }

    setIsTeacherModalOpen(false);
  };

  // Öğretmen Silme İşlemi
  const handleDeleteTeacher = (id: string, name: string) => {
    if (!window.confirm(`"${name}" isimli öğretmeni ve sisteme giriş yetkisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    setTeachers(teachers.filter((t) => t.id !== id));
    const idx = TEACHER_LIST.findIndex((t) => t.id === id);
    if (idx !== -1) TEACHER_LIST.splice(idx, 1);

    const accIdx = INITIAL_USER_ACCOUNTS.findIndex((a) => a.id === id);
    if (accIdx !== -1) INITIAL_USER_ACCOUNTS.splice(accIdx, 1);

    showToast(`"${name}" sistemden başarıyla silindi.`);
  };

  // Şifre Göster / Gizle Toggle
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Şube Ekleme
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newCls: SchoolClass = {
      id: `cls-${Date.now()}`,
      name: newClassName.trim(),
      homeroomTeacher: newClassTeacher || 'Atanmadı',
      studentCount: Number(newClassCount) || 0,
      averageScore: 0,
      attendanceRate: 100,
    };

    setClasses([...classes, newCls]);
    setNewClassName('');
    setNewClassTeacher('');
    setIsAddClassOpen(false);
    showToast(`${newClassName} şubesi başarıyla sisteme eklendi.`);
  };

  // Duyuru Ekleme
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

  // Filtrelenmiş Öğretmen Listesi
  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearchQuery.toLowerCase();
    const matchesSearch = 
      t.name.toLowerCase().includes(q) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      t.branch.toLowerCase().includes(q) ||
      (t.schoolName && t.schoolName.toLowerCase().includes(q));
    const matchesBranch = teacherBranchFilter === 'all' || t.branch === teacherBranchFilter;
    return matchesSearch && matchesBranch;
  });

  const currentDistricts = TURKEY_CITIES[formCity] || ['Merkez'];

  return (
    <div className="space-y-4">
      
      {/* Toast Bildirimi */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Üst Bilgi Kartı */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Süper Admin Yönetim Paneli
              </h2>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                Okul Yönetimi & Yetki Merkezi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Öğretmen kadrosu, şifre tanımlama, şubeler ve sistem ayarları
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
          { id: 'access', label: 'Öğretmen & Öğrenci Hesapları' },
          { id: 'classes', label: 'Sınıflar & Şubeler', count: classes.length },
          // Eski "Öğretmen Kadrosu" sekmesi kaldırıldı: yalnızca tarayıcı belleğinde çalışıyor ve
          // öğretmen şifrelerini gösteriyordu. Gerçek hesap yönetimi "access" sekmesinde (AccessManagement).
          // Kalan ölü kod Aşama 4'te (kod düzeni) temizlenecek.
          { id: 'announcements', label: 'Okul Geneli Duyurular', count: announcements.length },
          { id: 'settings', label: 'Dönem & Sistem Ayarları' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
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

      {/* ======================================================== */}
      {/* MODÜL 0: GERÇEK HESAPLAR (öğretmen onayı, öğrenci PIN'leri) */}
      {/* ======================================================== */}
      {activeTab === 'access' && <AccessManagement />}

      {/* ======================================================== */}
      {/* MODÜL 1: SINIFLAR & ŞUBELER */}
      {/* ======================================================== */}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
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
                    placeholder="Örn: 7-B"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sınıf Rehber Öğretmeni</label>
                  <input
                    type="text"
                    placeholder="Örn: Zehra Aydın"
                    value={newClassTeacher}
                    onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Öğrenci Sayısı (Kapasite)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Şubeyi Kaydet
                </button>
              </div>
            </form>
          )}

          {classes.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 text-center space-y-2">
              <School className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Henüz Kayıtlı Şube Bulunmuyor</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Yukarıdaki "+ Yeni Şube Ekle" butonunu kullanarak okulunuzdaki şubeleri (örn: 7-A, 8-B) sisteme ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-900">{cls.name}</h4>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {cls.studentCount} Öğrenci
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Rehber Öğretmen: <span className="font-semibold text-slate-800">{cls.homeroomTeacher}</span></p>
                    <p>Başarı Ortalaması: <span className="font-semibold text-slate-800">{cls.averageScore} Puan</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODÜL 2: ÖĞRETMEN KADROSU & ŞİFRE YÖNETİMİ (GELİŞMİŞ) */}
      {/* ======================================================== */}
      {activeTab === 'teachers' && (
        <div className="space-y-3">
          
          {/* Üst Eylem ve Arama Çubuğu */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Öğretmen Kadrosu & Yetki Yönetimi</h3>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">
                  {filteredTeachers.length} Öğretmen
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğretmen ekleme, şifre belirleme, okul ve şube yetkilerini düzenleme
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Branş Filtresi */}
              <select
                value={teacherBranchFilter}
                onChange={(e) => setTeacherBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:bg-white"
              >
                <option value="all">Tüm Branşlar</option>
                {TEACHER_BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleOpenAddTeacher}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Yeni Öğretmen Ekle</span>
              </button>
            </div>
          </div>

          {/* Arama Inputu */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Öğretmen adı, branş, okul veya e-posta ile ara..."
              value={teacherSearchQuery}
              onChange={(e) => setTeacherSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400 shadow-2xs"
            />
          </div>

          {/* Öğretmen Listesi */}
          {filteredTeachers.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                {teacherSearchQuery || teacherBranchFilter !== 'all' ? 'Aramaya Uygun Öğretmen Bulunamadı' : 'Henüz Kayıtlı Öğretmen Bulunmuyor'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Yukarıdaki "+ Yeni Öğretmen Ekle" butonunu kullanarak öğretmenlerin okul, branş ve giriş şifrelerini tanımlayabilirsiniz.
              </p>
              {!(teacherSearchQuery || teacherBranchFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleOpenAddTeacher}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>İlk Öğretmeni Ekle</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTeachers.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3.5 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between">
                  
                  {/* Kart Başlığı */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{t.name}</h4>
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/60">
                            {t.branch}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block truncate mt-0.5">
                          {t.schoolName || 'Okul Belirtilmedi'} {t.district ? `• ${t.district}/${t.city}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Düzenle & Sil Eylemleri */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTeacher(t)}
                        title="Öğretmen Bilgilerini & Şifresini Düzenle"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Düzenle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTeacher(t.id, t.name)}
                        title="Öğretmeni Sistemden Sil"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Giriş Bilgileri & Şifre Alanı */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-slate-600">
                      <span className="text-[11px] text-slate-400 font-medium">Giriş E-Postası:</span>
                      <span className="font-semibold text-slate-800 select-all font-mono text-[11px]">
                        {t.email || 'Tanımlanmadı'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-slate-600">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Key className="w-3 h-3 text-slate-400" />
                        <span>Giriş Şifresi:</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="font-bold text-slate-800">
                          {revealedPasswords[t.id] ? (t.password || 'Şifre Yok') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRevealPassword(t.id)}
                          title={revealedPasswords[t.id] ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        >
                          {revealedPasswords[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sınıflar ve Rehberlik Bilgisi */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[11px]">Rehberlik: </span>
                      <span className="font-semibold text-slate-800">
                        {t.homeroomClass && t.homeroomClass !== 'Yok' ? t.homeroomClass : 'Rehberlik Yok'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px]">Ders Şubeleri: </span>
                      <span className="font-medium text-slate-700">
                        {t.classes && t.classes.length > 0 ? t.classes.join(', ') : 'Tanımlı değil'}
                      </span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ÖĞRETMEN EKLEME & DÜZENLEME MODALI */}
      {/* ======================================================== */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Başlığı */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingTeacherId ? 'Öğretmen Bilgilerini & Şifresini Düzenle' : 'Yeni Öğretmen Kaydı & Şifre Belirleme'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingTeacherId 
                      ? 'Öğretmenin giriş şifresi, okulu, branşı ve rehberlik sınıfını güncelleyin.'
                      : 'Öğretmenin sisteme giriş yapacağı e-posta ve şifresini tanımlayın.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Alanı */}
            <form onSubmit={handleSaveTeacherSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Ad Soyad */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Öğretmen Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kemal Demir"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium"
                  />
                </div>

                {/* 2. E-Posta (Giriş Kullanıcı Adı) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giriş E-Posta Adresi *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ad.soyad@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Öğretmen bu e-posta ile giriş yapacaktır.
                  </span>
                </div>

                {/* 3. Giriş Şifresi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giriş Şifresi *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordInForm ? 'text' : 'password'}
                      required
                      placeholder="En az 6 karakter"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPasswordInForm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Öğretmenin giriş yapacağı güvenlik şifresi.
                  </span>
                </div>

                {/* 4. Branş */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branşı *
                  </label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium cursor-pointer"
                  >
                    {TEACHER_BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Rehberlik Sınıfı */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rehberlik Sınıfı
                  </label>
                  <select
                    value={formHomeroom}
                    onChange={(e) => setFormHomeroom(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium cursor-pointer"
                  >
                    <option value="Yok">Şube Rehberliği Yok</option>
                    <option value="5-A">5-A</option>
                    <option value="5-B">5-B</option>
                    <option value="6-A">6-A</option>
                    <option value="6-B">6-B</option>
                    <option value="7-A">7-A</option>
                    <option value="7-B">7-B</option>
                    <option value="8-A">8-A</option>
                    <option value="8-B">8-B</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Okul Adı */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Görev Yaptığı Okul Adı
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Atatürk Bilim ve Sanat Ortaokulu"
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium"
                  />
                </div>

                {/* 7. İl Seçimi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    İl (Şehir)
                  </label>
                  <select
                    value={formCity}
                    onChange={(e) => handleFormCityChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium cursor-pointer"
                  >
                    {Object.keys(TURKEY_CITIES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 8. İlçe Seçimi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    İlçe
                  </label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium cursor-pointer"
                  >
                    {currentDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* 9. Ders Verdiği Şubeler */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ders Verdiği Şubeler
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 7-A, 7-B, 8-A (virgülle ayırınız)"
                    value={formClasses}
                    onChange={(e) => setFormClasses(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium"
                  />
                </div>

                {/* 10. İletişim Telefonu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    placeholder="Örn: 0532 123 45 67"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Alt Butonlar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTeacherId ? 'Değişiklikleri Kaydet' : 'Öğretmeni Kaydet & Şifre Oluştur'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODÜL 3: OKUL DUYURULARI */}
      {/* ======================================================== */}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 cursor-pointer"
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

      {/* ======================================================== */}
      {/* MODÜL 4: SİSTEM AYARLARI */}
      {/* ======================================================== */}
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
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 cursor-pointer"
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
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 cursor-pointer"
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
