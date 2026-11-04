'use client';

import React, { useCallback, useEffect, useState } from 'react';
import teacherStyles from './teacher/TeacherDashboard.module.css';
import { restoreSession, signOutUser } from '../lib/supabaseClient';
import { TeacherDashboard } from './teacher/TeacherDashboard';
import { AdminDashboard } from './admin/AdminDashboard';
import { StudentPortal } from './student/StudentPortal';
import { AnnouncementsPage } from './AnnouncementsPage';
import { AuthPage } from './auth/AuthPage';
import { UserRole, UserAccount } from '../data/portalData';

const SIGNED_OUT_USER: UserAccount = {
  id: '',
  role: 'ogrenci',
  name: '',
  emailOrPhone: '',
  avatar: '',
  title: '',
};

// Bir kullanıcının arayüzde geçebileceği roller (veri yetkisi ayrıca veritabanında RLS ile korunur)
function allowedRolesFor(user: UserAccount): UserRole[] {
  if (user.role === 'admin') return ['admin'];
  if (user.role === 'ogretmen') return ['ogretmen'];
  return ['ogrenci', 'veli'];
}

interface PortalAppProps {
  /** public: ana giriş (öğrenci/veli/öğretmen) · admin: /yonetim (süper admin girişi) */
  variant?: 'public' | 'admin';
}

export function PortalApp({ variant = 'public' }: PortalAppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount>(SIGNED_OUT_USER);
  const [currentRole, setCurrentRole] = useState<UserRole>('ogrenci');
  // Öğretmen paneli: bildirimden duyurulara yönlendirme
  const [teacherSection, setTeacherSection] = useState<'dashboard' | 'announcements'>('dashboard');

  const handleLoginSuccess = useCallback((user: UserAccount) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setCurrentUser(SIGNED_OUT_USER);
    await signOutUser();
  };

  // Sayfa yenilendiğinde mevcut Supabase oturumunu geri yükle
  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((user) => {
        if (!cancelled && user) handleLoginSuccess(user);
      })
      .catch((err) => console.error('Oturum geri yüklenemedi:', err))
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handleLoginSuccess]);

  const allowedRoles = allowedRolesFor(currentUser);
  const handleRoleChange = (role: UserRole) => {
    // Kullanıcı yalnızca kendi hesabının izin verdiği görünümler arasında geçebilir
    if (allowedRoles.includes(role)) setCurrentRole(role);
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Oturum kontrol ediliyor...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} variant={variant} />;
  }

  return (
    <div className={`${teacherStyles.teacherShell} min-h-screen pb-12 flex flex-col antialiased`}>
      <main className={currentRole === 'ogretmen' ? 'w-full flex-1' : 'max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 w-full flex-1'}>
        {currentRole === 'admin' && <AdminDashboard onLogout={handleLogout} currentUser={currentUser} />}

        {currentRole === 'ogretmen' && (
          <TeacherDashboard
            activeSection={teacherSection}
            onSectionChange={setTeacherSection}
            announcementsContent={<AnnouncementsPage canManage />}
            onLogout={handleLogout}
            onOpenNotifications={() => setTeacherSection('announcements')}
            currentUser={currentUser}
          />
        )}

        {(currentRole === 'ogrenci' || currentRole === 'veli') && (
          <StudentPortal
            user={currentUser}
            role={currentRole}
            allowedRoles={allowedRoles}
            onRoleChange={handleRoleChange}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
