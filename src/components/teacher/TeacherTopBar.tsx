'use client';

import { Bell, User, Menu } from '../icons';
import { BrandLogo } from '../BrandLogo';
import type { UserAccount } from '../../data/portalData';
import styles from './TeacherDashboard.module.css';

interface TeacherTopBarProps {
  user?: UserAccount;
  unreadCount: number;
  isProfile: boolean;
  menuOpen: boolean;
  onMenu: () => void;
  onHome: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}

export function TeacherTopBar({ user, unreadCount, isProfile, menuOpen, onMenu, onHome, onNotifications, onProfile }: TeacherTopBarProps) {
  return (
    <header className={styles.topBar}>
      <nav className={styles.topBarContainer} aria-label="Öğretmen üst menüsü">
      <div className={styles.topBarLeft}>
        <button type="button" className={styles.menuButton} onClick={onMenu} aria-label="Menüyü aç" aria-expanded={menuOpen}>
          <Menu size={24} aria-hidden="true" />
        </button>
        <button type="button" className={styles.topBarLogo} onClick={onHome} aria-label="Ana sayfaya dön">
          <BrandLogo height={36} />
        </button>
      </div>
      <div className={styles.topBarActions}>
        <button type="button" className={styles.notificationButton} onClick={onNotifications} aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'}>
          <Bell size={22} aria-hidden="true" />
          {unreadCount > 0 && <span className={styles.notificationCount} aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        <button type="button" className={styles.topBarProfile} onClick={onProfile} aria-label={user?.name ? `${user.name}, profilim` : 'Profilim'} aria-current={isProfile ? 'page' : undefined}>
          <span className={styles.accountAvatar} aria-hidden="true"><User size={22} /></span>
          <span className={styles.topBarProfileText}>{user?.name || 'Profilim'}</span>
        </button>
      </div>
      </nav>
    </header>
  );
}
