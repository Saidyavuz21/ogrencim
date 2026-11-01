'use client';

import React, { useState } from 'react';
import { Menu, Bell, GraduationCap, ShieldAlert, User, Check, ChevronDown, Lock, LogIn, Settings } from './icons';
import { Student, UserRole, UserAccount, CURRENT_TEACHER } from '../data/portalData';

interface NavbarProps {
  student: Student;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  isParentAuthenticated?: boolean;
  onLockParentPin?: () => void;
  currentUser?: UserAccount | null;
  onOpenProfile?: () => void;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  student,
  currentRole,
  onRoleChange,
  onOpenMobileMenu,
  onOpenNotifications,
  unreadCount,
  isParentAuthenticated = true,
  onLockParentPin,
  currentUser,
  onOpenProfile,
  onOpenAuthModal,
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const roles: { id: UserRole; label: string; roleName: string; userDesc: string }[] = [
    { id: 'veli', label: 'Veli Girişi', roleName: 'Veli Paneli', userDesc: 'Ahmet Demir (Emre\'nin Velisi)' },
    { id: 'ogrenci', label: 'Öğrenci Girişi', roleName: 'Öğrenci Portalı', userDesc: 'Emre Demir (No: 452 - 7-B)' },
    { id: 'ogretmen', label: 'Öğretmen Girişi', roleName: 'Öğretmen Paneli', userDesc: 'Zehra Aydın (Türkçe & Rehberlik)' },
    { id: 'admin', label: 'Süper Admin', roleName: 'Yönetici Paneli', userDesc: 'Okul Müdürü / Sistem Yöneticisi' },
  ];

  const currentRoleObj = roles.find((r) => r.id === currentRole) || roles[0];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15">
          
          {/* Sol: Menü Butonu & Okul Başlığı */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Menüyü Aç"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 text-sm">
                    e-Okul Portalı
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md hidden sm:inline-block">
                    {currentRoleObj.roleName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-none">
                  {student.school}
                </p>
              </div>
            </div>
          </div>

          {/* Orta / Sağ: ROL DEĞİŞTİRİCİ (Super Admin, Öğretmen, Veli) */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Rol Seçici Açılır Menü (Role Switcher) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden xs:inline text-slate-500">Rol:</span>
                <span>{currentRoleObj.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isRoleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRoleDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 text-xs animate-in fade-in">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                      Giriş Rolünü Değiştir
                    </span>
                    {roles.map((r) => {
                      const isSelected = r.id === currentRole;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            onRoleChange(r.id);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full flex items-start justify-between p-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-slate-100 text-slate-900 font-semibold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div>
                            <span className="block font-medium">{r.label}</span>
                            <span className="text-[10px] text-slate-400 block">{r.userDesc}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Bildirim Zili */}
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="Duyurular"
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>

            {/* Veli PIN Kilidi Butonu / Durumu */}
            {currentRole === 'veli' && (
              isParentAuthenticated && onLockParentPin ? (
                <button
                  type="button"
                  onClick={onLockParentPin}
                  title="Veli Girişini PIN ile Kilitle"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">PIN'i Kilitle</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span className="hidden sm:inline">Kilitli</span>
                </span>
              )
            )}

            {/* Kullanıcı Rozeti & Profil / Çıkış Butonu */}
            <div 
              onClick={onOpenProfile}
              title="Profil & Hesap Ayarları"
              className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-100 cursor-pointer group hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shadow-2xs group-hover:bg-indigo-100">
                {currentUser?.avatar || (
                  currentRole === 'admin'
                    ? 'SA'
                    : currentRole === 'ogretmen'
                    ? CURRENT_TEACHER.avatar
                    : currentRole === 'ogrenci'
                    ? 'ED'
                    : student.avatar
                )}
              </div>
              
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">
                  {currentUser?.name || (
                    currentRole === 'admin'
                      ? 'Süper Admin'
                      : currentRole === 'ogretmen'
                      ? CURRENT_TEACHER.name
                      : currentRole === 'ogrenci'
                      ? student.name
                      : student.parentName
                  )}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  {currentUser?.title || (
                    currentRole === 'admin'
                      ? 'Okul Müdürü'
                      : currentRole === 'ogretmen'
                      ? `${CURRENT_TEACHER.branch} Öğrt.`
                      : currentRole === 'ogrenci'
                      ? `${student.class} (No: ${student.studentNo})`
                      : `${student.name} Velisi`
                  )}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
