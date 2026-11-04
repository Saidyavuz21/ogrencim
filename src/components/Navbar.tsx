'use client';

import React, { useState } from 'react';
import { Menu, Bell, GraduationCap, Check, ChevronDown, Lock } from './icons';
import styles from './Navbar.module.css';
import { Student, UserRole, UserAccount, CURRENT_TEACHER } from '../data/portalData';

interface NavbarProps {
  student: Student;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  /** Bu kullanıcının geçebileceği roller; tek rol varsa seçici gizlenir */
  allowedRoles?: UserRole[];
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
  allowedRoles = [],
  onOpenMobileMenu,
  onOpenNotifications,
  unreadCount,
  isParentAuthenticated = true,
  onLockParentPin,
  currentUser,
  onOpenProfile,
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const allRoles: { id: UserRole; label: string; roleName: string; userDesc: string }[] = [
    { id: 'veli', label: 'Veli Girişi', roleName: 'Veli Paneli', userDesc: 'Öğrenci & Veli Takip Portalı' },
    { id: 'ogrenci', label: 'Öğrenci Girişi', roleName: 'Öğrenci Portalı', userDesc: 'Ders, Not ve Ödev Takibi' },
    { id: 'ogretmen', label: 'Öğretmen Girişi', roleName: 'Öğretmen Paneli', userDesc: 'Öğretmen ve Sınıf Yönetimi' },
    { id: 'admin', label: 'Süper Admin', roleName: 'Yönetici Paneli', userDesc: 'Süper Admin & Sistem İdaresi' },
  ];

  const roles = allRoles.filter((r) => allowedRoles.includes(r.id));
  const currentRoleObj = allRoles.find((r) => r.id === currentRole) || allRoles[0];

  const displayName = currentUser?.name || (currentRole === 'admin' ? 'Süper Admin' : currentRole === 'ogretmen' ? CURRENT_TEACHER.name : currentRole === 'ogrenci' ? student.name : student.parentName);
  const displayTitle = currentRole === 'ogretmen'
    ? `${currentUser?.branch || CURRENT_TEACHER.branch} Öğretmeni`
    : currentUser?.title || (currentRole === 'admin' ? 'Okul Müdürü' : currentRole === 'ogrenci' ? `${student.class} · No: ${student.studentNo}` : `${student.name} Velisi`);
  const schoolName = currentUser?.schoolName || student.school;
  const displayAvatar = currentUser?.avatar || (currentRole === 'admin' ? 'SA' : currentRole === 'ogretmen' ? CURRENT_TEACHER.avatar : student.avatar);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brandGroup}>
          <div className={styles.brand}>
            <span className={styles.mark}><GraduationCap size={24} aria-hidden="true" /></span>
            <div><span className={styles.brandTitle}>e-Okul Portalı</span><span className={styles.roleName}>{currentRoleObj.roleName}</span></div>
          </div>
          <button type="button" onClick={onOpenMobileMenu} aria-label="Menüyü aç" className={`${styles.iconButton} ${styles.mobileMenu}`}><Menu size={22} aria-hidden="true" /></button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.profile} onClick={onOpenProfile} aria-label={`${displayName}, profil ve hesap ayarları`}>
            <span className={styles.avatar} aria-hidden="true">{displayAvatar}</span>
            <span className={styles.profileText}><span className={styles.profileName}>{displayName}</span><span className={styles.profileTitle}>{displayTitle}</span>{schoolName && schoolName !== 'e-Okul Portalı' && <span className={styles.school}>{schoolName}</span>}</span>
          </button>
          <div className={styles.notifications}><button type="button" className={styles.iconButton} onClick={onOpenNotifications} aria-label={unreadCount > 0 ? `Duyurular, ${unreadCount} okunmamış` : 'Duyurular'}><Bell size={22} aria-hidden="true" />{unreadCount > 0 && <span className={styles.unread} aria-hidden="true" />}</button></div>
          {roles.length > 1 && <div className={styles.rolePicker}>
            <button type="button" className={styles.roleToggle} aria-expanded={isRoleDropdownOpen} aria-controls="portal-role-options" onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)} onKeyDown={(event) => { if (event.key === 'Escape') setIsRoleDropdownOpen(false); }}>
              {currentRoleObj.label}<ChevronDown size={18} aria-hidden="true" />
            </button>
            {isRoleDropdownOpen && <>
              <button type="button" className={styles.backdrop} aria-label="Rol seçimini kapat" onClick={() => setIsRoleDropdownOpen(false)} />
              <div id="portal-role-options" className={styles.dropdown} onKeyDown={(event) => { if (event.key === 'Escape') setIsRoleDropdownOpen(false); }}>
                {roles.map((role) => <button key={role.id} type="button" aria-pressed={currentRole === role.id} onClick={() => { onRoleChange(role.id); setIsRoleDropdownOpen(false); }}><span>{role.label}<small>{role.userDesc}</small></span>{currentRole === role.id && <Check size={18} aria-hidden="true" />}</button>)}
              </div>
            </>}
          </div>}



          {currentRole === 'veli' && (isParentAuthenticated && onLockParentPin
            ? <button type="button" className={styles.lock} onClick={onLockParentPin}><Lock size={18} aria-hidden="true" />PIN ile kilitle</button>
            : <span className={styles.locked}><Lock size={16} aria-hidden="true" /> Kilitli</span>)}


        </div>
      </div>
    </header>
  );
};
