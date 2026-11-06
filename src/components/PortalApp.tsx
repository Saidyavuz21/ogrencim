'use client';

import React, { useCallback, useEffect, useState } from 'react';
import teacherStyles from './teacher/TeacherDashboard.module.css';
import { restoreSession, signOutUser, supabase } from '../lib/supabaseClient';
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

interface PortalAppProps {
  /** public: ana giriş (öğrenci/öğretmen) · admin: /yonetim (süper admin girişi) */
  variant?: 'public' | 'admin';
}

export function PortalApp({ variant = 'public' }: PortalAppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  // Oturum geri yüklenirken bağlantı hatası olursa oturum silinmez; kullanıcı tekrar dener
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
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

  // Sayfa yenilendiğinde / tarayıcı yeniden açıldığında mevcut Supabase oturumunu geri yükle
  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((user) => {
        if (cancelled) return;
        setRestoreFailed(false);
        // /yonetim yalnızca admin oturumunu açar; tarayıcıda öğrenci/öğretmen oturumu varsa giriş formu gösterilir
        if (user && (variant !== 'admin' || user.role === 'admin')) handleLoginSuccess(user);
      })
      .catch((err) => {
        console.error('Oturum geri yüklenemedi:', err);
        if (!cancelled) setRestoreFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handleLoginSuccess, restoreAttempt, variant]);

  // Başka sekmede çıkış yapıldığında veya oturum yenilenemediğinde paneli kapat
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(SIGNED_OUT_USER);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Oturum kontrol ediliyor...
      </div>
    );
  }

  if (restoreFailed && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-sm text-slate-600">
        <p>Sunucuya bağlanılamadı. Oturumunuz kapatılmadı; bağlantınızı kontrol edip tekrar deneyin.</p>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
          onClick={() => {
            setIsRestoringSession(true);
            setRestoreAttempt((n) => n + 1);
          }}
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} variant={variant} />;
  }

  return (
    <div className={`${teacherStyles.teacherShell} min-h-screen pb-12 flex flex-col antialiased`}>
      <main className={currentRole === 'ogretmen' || currentRole === 'admin' ? 'w-full flex-1' : 'max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 w-full flex-1'}>
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

        {currentRole === 'ogrenci' && <StudentPortal user={currentUser} onLogout={handleLogout} />}
      </main>
    </div>
  );
}
