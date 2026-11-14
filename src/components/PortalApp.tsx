'use client';

import React, { useCallback, useEffect, useState } from 'react';
import teacherStyles from './teacher/TeacherDashboard.module.css';
import { restoreSession, signOutUser, supabase } from '../lib/supabaseClient';
import { disablePushOnLogout } from '../lib/pushData';
import { TeacherDashboard } from './teacher/TeacherDashboard';
import { AdminDashboard } from './admin/AdminDashboard';
import { StudentPortal } from './student/StudentPortal';
import { AnnouncementsPage } from './AnnouncementsPage';
import { AuthPage } from './auth/AuthPage';
import { InstallAppBanner } from './InstallAppBanner';
import { SiteFooter } from './site/SiteFooter';
import { Spinner } from './Spinner';
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
    // Bu cihaz çıkıştan sonra bu kişiye telefon bildirimi almasın (oturum kapanmadan önce)
    await disablePushOnLogout();
    await signOutUser();
    window.location.replace('/');
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
    return <Spinner fullScreen size="lg" showLogo label="Oturum kontrol ediliyor…" />;
  }

  if (restoreFailed && !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7f6f2',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '380px',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #dedad0',
            borderRadius: '20px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(32, 53, 45, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <p style={{ margin: 0, fontSize: '15px', color: '#58665f', lineHeight: 1.6 }}>
            Sunucuya bağlanılamadı. Oturumunuz kapatılmadı; bağlantınızı kontrol edip tekrar deneyin.
          </p>
          <button
            type="button"
            style={{
              backgroundColor: '#25634b',
              color: '#ffffff',
              border: 0,
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => {
              setIsRestoringSession(true);
              setRestoreAttempt((n) => n + 1);
            }}
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <><InstallAppBanner /><AuthPage onLoginSuccess={handleLoginSuccess} variant={variant} /><SiteFooter /></>;
  }

  return (
    <div className={`${teacherStyles.teacherShell} min-h-screen flex flex-col antialiased`}>
      <main className="w-full flex-1">
        {currentRole === 'admin' && <AdminDashboard onLogout={handleLogout} currentUser={currentUser} />}

        {currentRole === 'ogretmen' && (
          <TeacherDashboard
            activeSection={teacherSection}
            onSectionChange={setTeacherSection}
            announcementsContent={<AnnouncementsPage manager="teacher" />}
            onLogout={handleLogout}
            currentUser={currentUser}
            onUserUpdated={setCurrentUser}
          />
        )}

        {currentRole === 'ogrenci' && <StudentPortal user={currentUser} onLogout={handleLogout} />}
      </main>
    </div>
  );
}
