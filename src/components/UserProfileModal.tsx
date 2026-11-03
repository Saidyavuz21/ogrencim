'use client';

import React, { useState } from 'react';
import { 
  User, 
  X, 
  Lock, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  Check, 
  Eye, 
  EyeOff, 
  Smartphone,
  Sparkles
} from './icons';
import { UserAccount, UserRole } from '../data/portalData';
import { changeMyPassword } from '../lib/supabaseClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
  onUpdateUser: (updated: UserAccount) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  
  // Güvenlik
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isStaff = currentUser.role === 'admin' || currentUser.role === 'ogretmen';

  // Bildirim Ayarları
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastEnabled, setToastEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);

  if (!isOpen) return null;

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    if (newPassword.length < 8) {
      setSecurityError('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setSecurityError('Şifreler birbiriyle uyuşmuyor.');
      return;
    }
    setIsSaving(true);
    const res = await changeMyPassword(newPassword);
    setIsSaving(false);
    if (!res.ok) {
      setSecurityError(`Şifre değiştirilemedi: ${res.error}`);
      return;
    }
    setNewPassword('');
    setNewPasswordConfirm('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Karartma */}
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />

      {/* Modal Kutusu */}
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 overflow-hidden z-10 shadow-xl animate-in fade-in flex flex-col max-h-[85vh]">
        
        {/* Üst Bilgi Başlığı */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
              {currentUser.avatar}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{currentUser.name}</h3>
              <p className="text-[11px] text-slate-500">{currentUser.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex border-b border-slate-100 px-4 pt-2 gap-1 text-xs font-semibold">
          {[
            { id: 'profile', label: 'Profil Bilgileri' },
            { id: 'security', label: 'PIN & Güvenlik' },
            { id: 'notifications', label: 'Bildirimler' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* İçerik */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* SEKME 1: PROFİL BİLGİLERİ */}
          {activeTab === 'profile' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Kullanıcı Rolü</span>
                  <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-200 px-2 py-0.5 rounded-md">
                    {currentUser.role}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">İletişim</span>
                  <span className="font-semibold text-slate-800">{currentUser.emailOrPhone}</span>
                </div>
                {currentUser.studentNo && (
                  <div className="flex justify-between py-1 border-b border-slate-200/50">
                    <span className="text-slate-500">Öğrenci Numarası</span>
                    <span className="font-semibold text-slate-800">{currentUser.studentNo}</span>
                  </div>
                )}
                {currentUser.branch && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Branş / Alan</span>
                    <span className="font-semibold text-slate-800">{currentUser.branch}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                ✓ Hesabınız aktif ve güvenli. Tüm verileriniz MEB standartlarında korunmaktadır.
              </div>
            </div>
          )}

          {/* SEKME 2: PIN & GÜVENLİK */}
          {activeTab === 'security' && (
            <form onSubmit={handleSaveSecurity} className="space-y-3.5 text-xs">
              {savedSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Güvenlik ayarlarınız güncellendi!</span>
                </div>
              )}

              {securityError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-semibold">
                  {securityError}
                </div>
              )}

              {!isStaff ? (
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                  Öğrenci ve veli PIN kodu güvenlik nedeniyle yalnızca sınıf öğretmeni veya okul yönetimi tarafından değiştirilebilir.
                </p>
              ) : (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Yeni Şifre</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="En az 8 karakter"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Yeni Şifre (Tekrar)</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {isSaving ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* SEKME 3: BİLDİRİMLER */}
          {activeTab === 'notifications' && (
            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Zil Sesi (Çift Tonlu)</span>
                  <span className="text-[10px] text-slate-500">Mesaj geldiğinde melodik ses çal</span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Ekran Bildirim Toast'ı</span>
                  <span className="text-[10px] text-slate-500">Ekranın üstünde kayan bildirim göster</span>
                </div>
                <input
                  type="checkbox"
                  checked={toastEnabled}
                  onChange={(e) => setToastEnabled(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">SMS Bildirimleri</span>
                  <span className="text-[10px] text-slate-500">Acil okul duyurularını SMS ile ilet</span>
                </div>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-indigo-600"
                />
              </label>
            </div>
          )}

        </div>

        {/* Alt Çıkış Yap Butonu */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Oturumu Kapat / Çıkış Yap</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};

