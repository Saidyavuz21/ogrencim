'use client';

import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  FileText, 
  Award, 
  TrendingUp, 
  Bell, 
  ChevronRight,
  ShieldAlert,
  School,
  Settings,
  Users,
  MessageSquare,
  Check,
  Lock
} from './icons';
import { Student, UserRole, CURRENT_TEACHER } from '../data/portalData';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  allowedRoles?: UserRole[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  student: Student;
  unreadCount: number;
  pendingHomeworkCount: number;
  isParentAuthenticated?: boolean;
  onLockParentPin?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleChange,
  allowedRoles = [],
  activeTab,
  onSelectTab,
  student,
  unreadCount,
  pendingHomeworkCount,
  isParentAuthenticated = true,
  onLockParentPin,
}) => {
  if (!isOpen) return null;

  const veliItems = [
    { id: 'dashboard', label: 'Genel Panel', icon: LayoutDashboard },
    { id: 'homeworks', label: 'Öğretmen Ödevleri', icon: FileText, badge: pendingHomeworkCount > 0 ? `${pendingHomeworkCount}` : null },
    { id: 'grades', label: 'Puan & Karne Durumu', icon: TrendingUp },
    { id: 'leaderboard', label: 'Sınıf Başarı Sıralaması', icon: Award, badge: '#3' },
    { id: 'messages', label: 'Öğretmenle Canlı Sohbet', icon: MessageSquare, badge: 'Canlı' },
    { id: 'announcements', label: 'Duyurular & Toplantılar', icon: Bell },
  ];

  const ogrenciItems = [
    { id: 'dashboard', label: 'Öğrenci Ana Paneli', icon: LayoutDashboard },
    { id: 'homeworks', label: 'Ödevlerim & Teslim', icon: FileText, badge: pendingHomeworkCount > 0 ? `${pendingHomeworkCount}` : null },
    { id: 'grades', label: 'Puanlarım & Karne', icon: TrendingUp },
    { id: 'leaderboard', label: 'Sınıf Başarı Sıralaması', icon: Award, badge: '#3' },
    { id: 'messages', label: 'Öğretmene Soru Sor', icon: MessageSquare },
    { id: 'announcements', label: 'Duyurular & Etkinlikler', icon: Bell },
  ];

  const ogretmenItems = [
    { id: 'dashboard', label: 'Öğretmen Ana Paneli', icon: LayoutDashboard },
    { id: 'announcements', label: 'Okul Duyuruları', icon: Bell },
  ];

  const adminItems = [
    { id: 'dashboard', label: 'Süper Admin Paneli', icon: ShieldAlert },
    { id: 'announcements', label: 'Genel Duyurular', icon: Bell },
  ];

  const menuItems =
    currentRole === 'admin'
      ? adminItems
      : currentRole === 'ogretmen'
      ? ogretmenItems
      : currentRole === 'ogrenci'
      ? ogrenciItems
      : veliItems;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Karartma */}
      <div 
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
      />

      {/* Kayar Çekmece */}
      <div className="fixed inset-y-0 left-0 w-[82%] max-w-xs bg-white border-r border-slate-200 flex flex-col z-10 animate-in slide-in-from-left duration-200">
        
        {/* Çekmece Başlığı */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              {currentRole === 'admin' ? 'SA' : currentRole === 'ogretmen' ? CURRENT_TEACHER.avatar : student.avatar}
            </div>
            <div>
              <h3 className="font-semibold text-xs text-slate-900">
                {currentRole === 'admin' ? 'Süper Admin' : currentRole === 'ogretmen' ? CURRENT_TEACHER.name : student.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentRole === 'admin' ? 'Okul Yönetimi' : currentRole === 'ogretmen' ? `${CURRENT_TEACHER.branch} Öğrt.` : `No: ${student.studentNo} • ${student.class}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rol Değiştirme Butonları (yalnızca hesabın izin verdiği roller) */}
        {allowedRoles.length > 1 && (
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 px-1">
            Giriş Rolü
          </span>
          <div className="grid grid-cols-2 gap-1">
            {[
              { id: 'veli', label: 'Veli' },
              { id: 'ogrenci', label: 'Öğrenci' },
              { id: 'ogretmen', label: 'Öğretmen' },
              { id: 'admin', label: 'Admin' },
            ].filter((r) => allowedRoles.includes(r.id as UserRole)).map((r) => {
              const isSelected = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onRoleChange(r.id as UserRole);
                    onClose();
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Menü Linkleri */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {currentRole === 'veli' && !isParentAuthenticated ? (
            <div className="p-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200/80 my-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Veli Paneli Kilitli</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ödev ve karne takibi için ekrandaki 6 haneli veli PIN kodunu giriniz.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                PIN Ekranına Dön
              </button>
            </div>
          ) : (
            <>
              <span className="text-[10px] font-semibold text-slate-400 px-3 py-1 block uppercase tracking-wider">
                {currentRole === 'admin' ? 'Admin Modülleri' : currentRole === 'ogretmen' ? 'Öğretmen Modülleri' : 'Veli Modülleri'}
              </span>

              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-xs sm:text-sm">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {currentRole === 'veli' && isParentAuthenticated && onLockParentPin && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLockParentPin();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Veli Girişini Kilitle (PIN)</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Alt Bilgi */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-500 text-center">
          <span>{student.school || 'e-Okul Portalı'}</span>
        </div>

      </div>
    </div>
  );
};
