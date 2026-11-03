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
  Smartphone, 
  AlertCircle,
  School,
  Sparkles,
  BookOpen,
  Users
} from '../icons';
import { UserRole, UserAccount, INITIAL_USER_ACCOUNTS } from '../../data/portalData';

interface AuthPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  initialRole = 'veli',
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Giriş Form Alanları
  const [identifier, setIdentifier] = useState(''); // e-posta, telefon veya okul no
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']); // Veli için 6 haneli PIN modu
  const [parentLoginMode, setParentLoginMode] = useState<'pin' | 'password'>('pin');

  // Kayıt Form Alanları
  const [regName, setRegName] = useState('');
  const [regPhoneOrEmail, setRegPhoneOrEmail] = useState('');
  const [regStudentNo, setRegStudentNo] = useState('');
  const [regBranch, setRegBranch] = useState('Türkçe');
  const [regClass, setRegClass] = useState('7-B');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('');

  // Şifremi Unuttum Modalı
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotContact, setForgotContact] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Rol tanımları ve açıklamaları
  const roleCards = [
    {
      id: 'veli' as UserRole,
      title: 'Veli Girişi',
      desc: '6 Haneli PIN veya Şifre ile öğrenci takibi',
      icon: Users,
      badge: 'PIN Destekli',
      color: 'border-emerald-500 bg-emerald-50/50 text-emerald-900',
      activeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'ogrenci' as UserRole,
      title: 'Öğrenci Girişi',
      desc: 'Okul No ve Şifre ile ödev teslimi & puanlar',
      icon: GraduationCap,
      badge: 'Ödev Portalı',
      color: 'border-indigo-500 bg-indigo-50/50 text-indigo-900',
      activeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'ogretmen' as UserRole,
      title: 'Öğretmen Girişi',
      desc: 'Ödev kontrolü, puanlama, toplu mesaj',
      icon: BookOpen,
      badge: 'E-Okul Yönetimi',
      color: 'border-blue-500 bg-blue-50/50 text-blue-900',
      activeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'admin' as UserRole,
      title: 'Yönetici / Admin',
      desc: 'Okul, şube ve personel sistem idaresi',
      icon: ShieldCheck,
      badge: 'Süper Yetki',
      color: 'border-slate-800 bg-slate-100 text-slate-900',
      activeColor: 'bg-slate-900 text-white',
    },
  ];

  // Hızlı Demo Giriş
  const handleQuickDemoLogin = (role: UserRole) => {
    const account = INITIAL_USER_ACCOUNTS.find((a) => a.role === role) || INITIAL_USER_ACCOUNTS[0];
    setErrorMsg(null);
    setSuccessMsg(`${account.name} (${account.title}) olarak giriş yapılıyor...`);
    setTimeout(() => {
      onLoginSuccess(account);
    }, 450);
  };

  // PIN girişi kutucukları
  const handlePinChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[idx] = digit;
    setPin(newPin);

    // Sonraki kutucuğa odaklan
    if (digit && idx < 5) {
      const nextInput = document.getElementById(`auth-pin-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      const prevInput = document.getElementById(`auth-pin-${idx - 1}`);
      prevInput?.focus();
    }
  };

  // Giriş Yap İşlemi
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Veli PIN Modu
    if (selectedRole === 'veli' && parentLoginMode === 'pin') {
      const enteredPin = pin.join('');
      if (enteredPin.length !== 6) {
        setErrorMsg('Lütfen 6 haneli güvenlik PIN kodunu eksiksiz giriniz.');
        return;
      }
      const match = INITIAL_USER_ACCOUNTS.find((u) => u.role === 'veli' && u.pin === enteredPin);
      if (match || enteredPin === '123456') {
        const veliAccount = match || INITIAL_USER_ACCOUNTS[0];
        setSuccessMsg('PIN doğrulandı! Veli Portalı açılıyor...');
        setTimeout(() => onLoginSuccess(veliAccount), 400);
      } else {
        setErrorMsg('Hatalı PIN kodu! (Varsayılan test PIN: 123456)');
      }
      return;
    }

    // Normal Şifreli Girişler
    if (!identifier.trim()) {
      setErrorMsg(
        selectedRole === 'ogrenci'
          ? 'Lütfen okul numaranızı giriniz (Örn: 452).'
          : 'Lütfen e-posta veya telefon bilginizi giriniz.'
      );
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Lütfen şifrenizi giriniz.');
      return;
    }

    // Kullanıcı eşleştirme
    const matched = INITIAL_USER_ACCOUNTS.find((acc) => {
      if (acc.role !== selectedRole) return false;
      if (selectedRole === 'ogrenci') {
        return (acc.studentNo === identifier.trim() || acc.emailOrPhone === identifier.trim()) && (acc.password === password || password === '1234');
      }
      return (acc.emailOrPhone.toLowerCase() === identifier.trim().toLowerCase() || identifier.trim() === 'demo') && (acc.password === password || password.length >= 4);
    });

    if (matched) {
      setSuccessMsg(`Giriş başarılı! Hoş geldiniz, ${matched.name}.`);
      setTimeout(() => onLoginSuccess(matched), 400);
    } else {
      // Test kolaylığı: Uygun bir hesap simüle edelim veya hata verelim
      if (password.length >= 4) {
        // Otomatik mock giriş
        const fallback = INITIAL_USER_ACCOUNTS.find((a) => a.role === selectedRole) || INITIAL_USER_ACCOUNTS[0];
        setSuccessMsg(`Doğrulandı! Hoş geldiniz.`);
        setTimeout(() => onLoginSuccess({ ...fallback, name: identifier }), 400);
      } else {
        setErrorMsg('Bilgiler veya şifre hatalı. Lütfen kontrol ediniz veya Hızlı Demo Giriş butonlarını kullanınız.');
      }
    }
  };

  // Kayıt Ol İşlemi
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim() || !regPhoneOrEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Lütfen zorunlu alanları eksiksiz doldurunuz.');
      return;
    }

    if (selectedRole === 'veli' && regPin && regPin.length !== 6) {
      setErrorMsg('Veli güvenlik PIN kodu tam olarak 6 haneli olmalıdır.');
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      role: selectedRole,
      name: regName,
      emailOrPhone: regPhoneOrEmail,
      studentNo: regStudentNo || '452',
      studentName: selectedRole === 'ogrenci' ? regName : 'Emre Demir (7-B)',
      pin: regPin || '123456',
      password: regPassword,
      branch: regBranch,
      avatar: regName.slice(0, 2).toUpperCase(),
      title:
        selectedRole === 'veli'
          ? `Öğrenci Velisi (${regName})`
          : selectedRole === 'ogrenci'
          ? `${regClass} Sınıfı Öğrencisi (No: ${regStudentNo || '452'})`
          : selectedRole === 'ogretmen'
          ? `${regBranch} Öğretmeni`
          : 'Okul Yöneticisi',
    };

    setSuccessMsg('Kaydınız başarıyla oluşturuldu! Sisteme yönlendiriliyorsunuz...');
    setTimeout(() => {
      onLoginSuccess(newUser);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-md w-full mx-auto space-y-5">
        
        {/* LOGO & BAŞLIK */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            e-Okul & Veli Bilgilendirme Portalı
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Ödev kontrolü, artı/eksi puanlama, canlı veli-öğretmen iletişimi ve okul başarı sistemi
          </p>
        </div>

        {/* ANA KART */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-5">
          
          {/* 1. GİRİŞ YAP / KAYIT OL GEÇİŞİ */}
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
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Yeni Kayıt Ol
            </button>
          </div>

          {/* 2. ROL SEÇİMİ BUTONLARI (4 Rol) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Giriş Rolünüzü Seçiniz
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${r.color} ring-2 ring-indigo-500/20 shadow-2xs`
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? r.activeColor : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/80 border border-slate-200/60 text-slate-600">
                        {r.badge}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-bold block">{r.title}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1 block">{r.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
              
              {/* Veli Rolünde: PIN ile Hızlı Giriş vs Şifreli Giriş Seçeneği */}
              {selectedRole === 'veli' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-emerald-50/70 p-1 rounded-xl border border-emerald-200/70 text-[11px] font-semibold text-emerald-900">
                    <button
                      type="button"
                      onClick={() => setParentLoginMode('pin')}
                      className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                        parentLoginMode === 'pin' ? 'bg-white shadow-2xs font-bold text-emerald-950' : 'hover:bg-emerald-100/60'
                      }`}
                    >
                      🔒 6 Haneli PIN ile Giriş
                    </button>
                    <button
                      type="button"
                      onClick={() => setParentLoginMode('password')}
                      className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                        parentLoginMode === 'password' ? 'bg-white shadow-2xs font-bold text-emerald-950' : 'hover:bg-emerald-100/60'
                      }`}
                    >
                      🔑 Telefon & Şifre
                    </button>
                  </div>

                  {parentLoginMode === 'pin' ? (
                    <div className="space-y-2 text-center pt-1">
                      <p className="text-xs text-slate-600 font-medium">
                        Veli Güvenlik PIN Kodunuzu Giriniz
                      </p>
                      
                      {/* 6 Haneli Kutu */}
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {pin.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`auth-pin-${idx}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handlePinChange(idx, e.target.value)}
                            onKeyDown={(e) => handlePinKeyDown(idx, e)}
                            className="w-10 h-12 text-center font-black text-base bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
                        <span>Varsayılan PIN: <strong className="text-emerald-700">123456</strong></span>
                        <button
                          type="button"
                          onClick={() => setForgotModalOpen(true)}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          PIN'i Unuttum?
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Veli Telefon & Şifre Formu */
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Veli Telefon Numarası
                        </label>
                        <input
                          type="text"
                          placeholder="0532 111 22 33"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Veli Şifresi
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Öğrenci Rolü Giriş Alanları */}
              {selectedRole === 'ogrenci' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Öğrenci Okul Numarası
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: 452"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Öğrenci Şifresi
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotModalOpen(true)}
                        className="text-[11px] text-indigo-600 font-semibold hover:underline"
                      >
                        Şifremi Unuttum?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Örn: 1234"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-400 focus:outline-hidden pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Öğretmen Rolü Giriş Alanları */}
              {selectedRole === 'ogretmen' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Öğretmen Kurum E-Postası
                    </label>
                    <input
                      type="email"
                      placeholder="zehra.aydin@okul.k12.tr"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Öğretmen Portalı Şifresi
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotModalOpen(true)}
                        className="text-[11px] text-indigo-600 font-semibold hover:underline"
                      >
                        Şifremi Unuttum?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Örn: ogretmen123"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-400 focus:outline-hidden pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Rolü Giriş Alanları */}
              {selectedRole === 'admin' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Yönetici Kullanıcı Adı / E-Posta
                    </label>
                    <input
                      type="email"
                      placeholder="saidyvz21@gmail.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Süper Admin Şifresi
                    </label>
                    <input
                      type="password"
                      placeholder="Syv848112."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Giriş Butonu */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Güvenli Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* ======================= KAYIT OL FORMU ======================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Adınız ve Soyadınız *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Demir"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {selectedRole === 'ogretmen' || selectedRole === 'admin' ? 'E-Posta Adresi *' : 'Telefon Numarası *'}
                </label>
                <input
                  type="text"
                  placeholder={selectedRole === 'ogretmen' ? 'ad.soyad@okul.k12.tr' : '0532 999 88 77'}
                  value={regPhoneOrEmail}
                  onChange={(e) => setRegPhoneOrEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              {selectedRole === 'veli' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Öğrencinin Okul No *
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: 452"
                        value={regStudentNo}
                        onChange={(e) => setRegStudentNo(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        6 Haneli PIN Belirleyin *
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="123456"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 text-center font-bold tracking-widest focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedRole === 'ogrenci' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Okul Numaranız *
                    </label>
                    <input
                      type="text"
                      placeholder="452"
                      value={regStudentNo}
                      onChange={(e) => setRegStudentNo(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Sınıf Şubeniz *
                    </label>
                    <select
                      value={regClass}
                      onChange={(e) => setRegClass(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                    >
                      <option value="7-A">7-A</option>
                      <option value="7-B">7-B</option>
                      <option value="8-A">8-A</option>
                      <option value="8-B">8-B</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedRole === 'ogretmen' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Ders Branşınız *
                  </label>
                  <select
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Türkçe">Türkçe</option>
                    <option value="Matematik">Matematik</option>
                    <option value="Fen Bilimleri">Fen Bilimleri</option>
                    <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                    <option value="İngilizce">İngilizce</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Şifre Belirleyin *
                </label>
                <input
                  type="password"
                  placeholder="En az 6 karakter"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Hesabı Oluştur & Giriş Yap</span>
                <Check className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* HIZLI TEST / DEMO GİRİŞ BUTONLARI (Kullanıcı için hayat kurtaran kısım) */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block text-center">
              ⚡ Hızlı Tek Tıkla Demo Giriş
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('veli')}
                className="p-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                👨‍👩‍👧 Veli (Ahmet)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ogrenci')}
                className="p-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                🎒 Öğrenci (Emre)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ogretmen')}
                className="p-1.5 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100 text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                👩‍🏫 Öğretmen (Zehra)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="p-1.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 text-[11px] font-bold transition-colors cursor-pointer text-center"
              >
                🏛️ Süper Admin (Said)
              </button>
            </div>
          </div>

        </div>

        {/* ALT GÜVENLİK BİLGİSİ */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>256-Bit SSL Şifreleme • MEB Uyumlu Veri Güvenliği</span>
        </div>

      </div>

      {/* ŞİFREMİ / PIN'İMİ UNUTTUM MODALI */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setForgotModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-5 z-10 space-y-3.5 shadow-xl animate-in fade-in">
            <h3 className="text-sm font-bold text-slate-900">
              Şifre / PIN Sıfırlama
            </h3>
            <p className="text-xs text-slate-500">
              Kayıtlı telefon numaranıza veya e-postanıza tek kullanımlık 6 haneli doğrulama kodu gönderilecektir.
            </p>

            {forgotSent ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium">
                ✓ Doğrulama kodu <strong>{forgotContact || 'telefonunuza'}</strong> başarıyla gönderildi. Geçici PIN kodunuz: <strong>123456</strong>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Telefon No veya E-Posta
                </label>
                <input
                  type="text"
                  placeholder="0532 111 22 33"
                  value={forgotContact}
                  onChange={(e) => setForgotContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotSent(false);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
              >
                Kapat
              </button>
              {!forgotSent && (
                <button
                  type="button"
                  onClick={() => setForgotSent(true)}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Kod Gönder
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

