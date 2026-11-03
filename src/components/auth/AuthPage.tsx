'use client';

import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Lock, 
  Key, 
  User, 
  Check, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  School,
  BookOpen
} from '../icons';
import { UserRole, UserAccount, INITIAL_USER_ACCOUNTS, TEACHER_LIST, CURRENT_STUDENT, TURKEY_CITIES } from '../../data/portalData';

interface AuthPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  initialRole = 'ogrenci',
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  // Sadece 3 rol: ogrenci (Öğrenci & Veli), ogretmen, admin
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    initialRole === 'veli' ? 'ogrenci' : initialRole
  );
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Öğrenci & Veli Giriş Form Alanları
  const [studentNo, setStudentNo] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '']); // 4 Haneli PIN

  // 2. Öğretmen & Admin Giriş Alanları
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // 3. Öğretmen Kayıt Form Alanları (Yeni İstenen Özellikler)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState(''); // Normal e-posta
  const [regCity, setRegCity] = useState('Diyarbakır');
  const [regDistrict, setRegDistrict] = useState('Kayapınar');
  const [regSchool, setRegSchool] = useState('Atatürk Ortaokulu');
  const [regBranch, setRegBranch] = useState('Türkçe');
  const [regClass, setRegClass] = useState('7-B');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Şehir değiştiğinde ilçeyi otomatik güncelle
  const handleCityChange = (newCity: string) => {
    setRegCity(newCity);
    const districts = TURKEY_CITIES[newCity] || ['Merkez'];
    setRegDistrict(districts[0] || 'Merkez');
  };

  // 3 Sade Rol Kartı (Giriş Yap sekmesi için)
  const roleCards = [
    {
      id: 'ogrenci' as UserRole,
      title: 'Öğrenci & Veli',
      desc: 'Okul No ve 4 haneli PIN ile anında giriş',
      icon: GraduationCap,
      badge: '4 Haneli PIN',
      color: 'border-indigo-500 bg-indigo-50/50 text-indigo-900',
      activeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'ogretmen' as UserRole,
      title: 'Öğretmen',
      desc: 'E-posta ve şifre ile öğretmen paneli',
      icon: BookOpen,
      badge: 'Öğretmen Paneli',
      color: 'border-blue-500 bg-blue-50/50 text-blue-900',
      activeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'admin' as UserRole,
      title: 'Süper Admin',
      desc: 'Sistem, okul ve personel idaresi',
      icon: ShieldCheck,
      badge: 'Tam Yetki',
      color: 'border-slate-800 bg-slate-100 text-slate-900',
      activeColor: 'bg-slate-900 text-white',
    },
  ];


  // 4 Haneli PIN Kutucukları Mantığı
  const handlePinDigitChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[idx] = digit;
    setPinDigits(newDigits);

    // Sonraki kutucuğa otomatik odaklan
    if (digit && idx < 3) {
      const nextInput = document.getElementById(`student-pin-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      const prevInput = document.getElementById(`student-pin-${idx - 1}`);
      prevInput?.focus();
    }
  };

  // ========================================================
  // GİRİŞ YAP İŞLEMİ (Öğrenci & Veli PIN, Öğretmen, Admin)
  // ========================================================
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Öğrenci & Veli Girişi (Okul No + 4 Haneli PIN)
    if (selectedRole === 'ogrenci' || selectedRole === 'veli') {
      const enteredNo = studentNo.trim();
      const enteredPin = pinDigits.join('');

      if (!enteredNo) {
        setErrorMsg('Lütfen okul numaranızı giriniz (Örn: 1024).');
        return;
      }

      if (enteredPin.length !== 4) {
        setErrorMsg('Lütfen 4 haneli PIN kodunuzu eksiksiz giriniz.');
        return;
      }

      // Kayıtlı Öğrenci / Veli Kontrolü
      const matchedStudent = INITIAL_USER_ACCOUNTS.find(
        (acc) =>
          (acc.role === 'ogrenci' || acc.role === 'veli') &&
          acc.studentNo === enteredNo &&
          acc.pin === enteredPin
      );

      if (matchedStudent) {
        setSuccessMsg('PIN doğrulandı! Öğrenci ve Veli Portalı açılıyor...');
        setTimeout(() => onLoginSuccess(matchedStudent), 400);
      } else {
        setErrorMsg('Sistemde henüz kayıtlı öğrenci bulunmamaktadır. Lütfen öğretmeninizin veya okul yönetiminin sizi sisteme kaydetmesini bekleyiniz.');
      }
      return;
    }

    // 2. Öğretmen veya Admin Girişi (E-Posta + Şifre)
    if (!identifier.trim()) {
      setErrorMsg('Lütfen e-posta adresinizi giriniz.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Lütfen şifrenizi giriniz.');
      return;
    }

    // Admin Giriş Kontrolü (Sadece Süper Admin)
    if (selectedRole === 'admin') {
      if (
        identifier.trim().toLowerCase() === 'saidyvz21@gmail.com' &&
        password === 'Syv848112.'
      ) {
        const adminAcc = INITIAL_USER_ACCOUNTS.find((a) => a.role === 'admin') || {
          id: 'usr-admin-said',
          role: 'admin',
          name: 'Said Yavuz',
          emailOrPhone: 'saidyvz21@gmail.com',
          avatar: 'SY',
          title: 'Süper Admin & Sistem Yöneticisi',
        };
        setSuccessMsg('Süper Admin girişi başarılı! Panel açılıyor...');
        setTimeout(() => onLoginSuccess(adminAcc), 400);
        return;
      } else {
        setErrorMsg('Yönetici e-posta veya şifresi hatalı.');
        return;
      }
    }

    // Öğretmen Giriş Kontrolü
    const matchedTeacher = INITIAL_USER_ACCOUNTS.find(
      (acc) =>
        acc.role === 'ogretmen' &&
        acc.emailOrPhone.toLowerCase() === identifier.trim().toLowerCase()
    );

    if (!matchedTeacher) {
      setErrorMsg("Bu e-posta adresiyle kayıtlı öğretmen bulunamadı. Lütfen 'Öğretmen Kaydı' sekmesinden kaydolunuz.");
      return;
    }

    if (matchedTeacher.password && matchedTeacher.password !== password) {
      setErrorMsg('Girdiğiniz şifre hatalı. Lütfen kontrol edip tekrar deneyiniz.');
      return;
    }

    setSuccessMsg('Giriş başarılı! Hoş geldiniz, Sn. ' + matchedTeacher.name + '.');
    setTimeout(() => onLoginSuccess(matchedTeacher), 400);
  };

  // ========================================================
  // ÖĞRETMEN KAYIT FORMU İŞLEMİ (Yeni İstenen Özellikler)
  // ========================================================
  const handleTeacherRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Lütfen ad soyad, e-posta ve şifre alanlarını eksiksiz doldurunuz.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setErrorMsg('Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@gmail.com).');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Şifreniz güvenlik amacıyla en az 6 karakter olmalıdır.');
      return;
    }

    if (regPasswordConfirm && regPassword !== regPasswordConfirm) {
      setErrorMsg('Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    const newTeacher: UserAccount = {
      id: `usr-tch-${Date.now()}`,
      role: 'ogretmen',
      name: regName.trim(),
      emailOrPhone: regEmail.trim(),
      city: regCity,
      district: regDistrict,
      schoolName: regSchool.trim(),
      className: regClass,
      branch: regBranch,
      password: regPassword,
      avatar: regName.trim().slice(0, 2).toUpperCase(),
      title: `${regBranch} Öğretmeni (${regSchool.trim()} • ${regDistrict}/${regCity})`,
    };

    // Hafızadaki kullanıcı listesine ekle
    INITIAL_USER_ACCOUNTS.push(newTeacher);
    TEACHER_LIST.push({
      id: newTeacher.id,
      name: newTeacher.name,
      email: newTeacher.emailOrPhone,
      password: newTeacher.password,
      schoolName: newTeacher.schoolName,
      city: newTeacher.city,
      district: newTeacher.district,
      branch: newTeacher.branch || 'Genel',
      homeroomClass: newTeacher.className,
      classes: newTeacher.className && newTeacher.className !== 'Yok' ? [newTeacher.className] : [],
      studentCount: 0,
      phone: '',
    });

    // Supabase Auth kaydı dene (arka planda)
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pvxkyazarymowhbbhzgo.supabase.co';
      const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_w6U3bU8s6f9mwwdCvG1gfA_Xx805Utm';
      fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: regEmail.trim(),
          password: regPassword,
          data: {
            name: regName.trim(),
            role: 'teacher',
            branch: regBranch,
            city: regCity,
            district: regDistrict,
            school: regSchool.trim(),
            class_name: regClass,
          },
        }),
      }).catch(() => {});
    } catch {}

    setSuccessMsg(`Kaydınız tamamlandı! Hoş geldiniz, Sn. ${newTeacher.name}. Öğretmen paneli açılıyor...`);
    setTimeout(() => {
      onLoginSuccess(newTeacher);
    }, 500);
  };

  const currentDistricts = TURKEY_CITIES[regCity] || ['Merkez'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-md w-full mx-auto space-y-4">
        
        {/* LOGO & BAŞLIK */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            e-Okul & Veli Bilgilendirme Portalı
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Hızlı PIN girişi, ödev takibi, puanlama ve okul-veli iletişim sistemi
          </p>
        </div>

        {/* ANA KART */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-4.5">
          
          {/* 1. GİRİŞ YAP / ÖĞRETMEN KAYDI SEKMELERİ */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setSelectedRole('ogretmen');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Öğretmen Kaydı
            </button>
          </div>

          {/* 2. SADE 3 ROL KARTI (Yalnızca Giriş Yap modunda görünür) */}
          {authMode === 'login' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Giriş Yapılacak Rol
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roleCards.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(r.id);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className={`p-2 sm:p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                        isSelected
                          ? `${r.color} ring-2 ring-indigo-500/20 shadow-2xs`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? r.activeColor : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="mt-1.5">
                        <span className="text-[11px] sm:text-xs font-bold block leading-tight">{r.title}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">{r.badge}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BİLDİRİM / HATA KUTUSU */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================= GİRİŞ YAP FORMU ======================= */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* 1. ÖĞRENCİ & VELİ GİRİŞ FORMU (Okul No + 4 Haneli PIN) */}
              {(selectedRole === 'ogrenci' || selectedRole === 'veli') && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-center">
                    <span className="text-xs font-bold text-indigo-950 block">
                      🎒 Öğrenci & Veli Ortak Girişi
                    </span>
                    <span className="text-[11px] text-indigo-800/80 block mt-0.5">
                      Okul numaranız ve 4 haneli PIN kodunuz ile sisteme giriş yapabilirsiniz.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Öğrenci Okul Numarası *
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: 1024"
                      value={studentNo}
                      onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 text-center pt-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      4 Haneli Güvenlik PIN Kodu *
                    </label>
                    
                    {/* 4 Haneli ATM Tarzı PIN Kutuları */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {pinDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`student-pin-${idx}`}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinDigitKeyDown(idx, e.target.value ? e : e)}
                          className="w-12 h-12 text-center text-lg font-black bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 focus:outline-hidden transition-all shadow-2xs"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      
                    </span>
                  </div>
                </div>
              )}

              {/* 2. ÖĞRETMEN GİRİŞ FORMU (Normal E-Posta + Şifre) */}
              {selectedRole === 'ogretmen' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Öğretmen E-Posta Adresi
                    </label>
                    <input
                      type="email"
                      placeholder="ornek@gmail.com veya kurum e-postası"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Kişisel e-postanız (Gmail vb.) ile giriş yapabilirsiniz.
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Öğretmen Şifresi
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ADMİN GİRİŞ FORMU */}
              {selectedRole === 'admin' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Süper Admin E-Posta
                    </label>
                    <input
                      type="email"
                      placeholder="saidyvz21@gmail.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-800 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Süper Admin Şifresi
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Giriş Butonu */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>Güvenli Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Öğretmen Kaydına Yönlendirme Linki */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setSelectedRole('ogretmen');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Öğretmen misiniz ve henüz hesabınız yok mu?{' '}
                  <span className="text-blue-600 font-bold hover:underline">Öğretmen Kaydı Açın</span>
                </button>
              </div>
            </form>
          ) : (
            /* ======================= YALNIZCA ÖĞRETMEN KAYIT FORMU ======================= */
            <form onSubmit={handleTeacherRegisterSubmit} className="space-y-3">
              
              {/* Bilgilendirme Kutusu */}
              <div className="p-3 bg-blue-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-blue-950">Öğretmen Kayıt Portalı</h3>
                  <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                    Öğrenci ve veli hesapları okul tarafından açılır. Bu formdan <strong>yalnızca öğretmenlerimiz</strong> hızlıca kayıt oluşturabilir.
                  </p>
                </div>
              </div>

              {/* Ad Soyad */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Öğretmenin Adı ve Soyadı *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Zehra Aydın"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Normal E-Posta (Kurum zorunlu değil) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  E-Posta Adresi (Kişisel Gmail vb. geçerli) *
                </label>
                <input
                  type="email"
                  placeholder="ornek@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Kurum e-postası zorunlu değildir, herhangi bir kişisel e-posta girebilirsiniz.
                </span>
              </div>

              {/* İl ve İlçe Seçimi (Dinamik) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Görev İli *
                  </label>
                  <select
                    value={regCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                  >
                    {Object.keys(TURKEY_CITIES).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    İlçe *
                  </label>
                  <select
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                  >
                    {currentDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Okul Seçimi */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Okulunuzun Adı *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Atatürk Ortaokulu veya Bilim Sanat Mrk."
                  value={regSchool}
                  onChange={(e) => setRegSchool(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Branş ve Sınıf Seçimi */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ders Branşınız *
                  </label>
                  <select
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                  >
                    <option value="Türkçe">Türkçe</option>
                    <option value="Matematik">Matematik</option>
                    <option value="Fen Bilimleri">Fen Bilimleri</option>
                    <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Din Kültürü ve Ahlak Bilgisi">Din Kültürü</option>
                    <option value="Bilişim Teknolojileri">Bilişim Teknolojileri</option>
                    <option value="Görsel Sanatlar">Görsel Sanatlar</option>
                    <option value="Müzik">Müzik</option>
                    <option value="Beden Eğitimi">Beden Eğitimi</option>
                    <option value="Rehberlik">Rehberlik</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Rehberlik Sınıfı *
                  </label>
                  <select
                    value={regClass}
                    onChange={(e) => setRegClass(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                  >
                    <option value="7-B">7-B</option>
                    <option value="7-A">7-A</option>
                    <option value="8-A">8-A</option>
                    <option value="8-B">8-B</option>
                    <option value="8-C">8-C</option>
                    <option value="6-A">6-A</option>
                    <option value="6-B">6-B</option>
                    <option value="5-A">5-A</option>
                    <option value="5-B">5-B</option>
                    <option value="Yok">Şube Rehberliği Yok</option>
                  </select>
                </div>
              </div>

              {/* Şifre ve Şifre Tekrarı */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Giriş Şifresi *
                  </label>
                  <input
                    type="password"
                    placeholder="En az 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Şifre Tekrarı *
                  </label>
                  <input
                    type="password"
                    placeholder="Şifreyi doğrulayın"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Öğretmen Hesabını Oluştur & Başla</span>
                <Check className="w-4 h-4" />
              </button>

              <div className="text-center pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Zaten bir öğretmen hesabınız var mı?{' '}
                  <span className="text-blue-600 font-bold hover:underline">Giriş Yap</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* ALT GÜVENLİK BİLGİSİ */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>256-Bit SSL Uçtan Uca Şifreli Güvenli Okul Portalı</span>
          </p>
          <p>© 2026 e-Okul Bilgi Sistemi • Tüm hakları saklıdır.</p>
        </div>

      </div>
    </div>
  );
};
