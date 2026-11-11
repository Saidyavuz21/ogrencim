'use client';

import { Bell, User, MessageSquare, Globe, Shuffle, Layers } from '../icons';
import { BrandLogo } from '../BrandLogo';
import { CustomSelect } from '../CustomSelect';
import type { UserAccount } from '../../data/portalData';
import styles from './TeacherDashboard.module.css';

interface TeacherTopBarProps {
  user?: UserAccount;
  unreadCount: number;
  isProfile: boolean;
  onHome: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  classNames: string[];
  selectedClass: string;
  onSelectClass: (value: string) => void;
  onMessages: () => void;
  unreadMessages: number;
  isMessages: boolean;
  onCommunity: () => void;
  isCommunity: boolean;
  unreadCommunity?: number;
  onClassTools: () => void;
  isClassTools: boolean;
  onBoards: () => void;
  isBoards: boolean;
}

export function TeacherTopBar({ user, unreadCount, isProfile, onHome, onNotifications, onProfile, classNames, selectedClass, onSelectClass, onMessages, unreadMessages, isMessages, onCommunity, isCommunity, unreadCommunity = 0, onClassTools, isClassTools, onBoards, isBoards }: TeacherTopBarProps) {
  const initials = (user?.name || '').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('tr-TR')).join('') || 'Ö';
  return (
    <header className={styles.topBar}>
      <nav className={`${styles.topBarContainer} ${styles.teacherHeaderTabs}`} aria-label="Öğretmen üst menüsü">
        <div className={styles.topBarStart}>
          <div className={styles.topBarLeft}>
            <button type="button" className={styles.topBarLogo} onClick={onHome} aria-label="Ana sayfaya dön">
              <BrandLogo height={36} />
            </button>
          </div>
          <div className={styles.topBarClass}>
            <label htmlFor="teacher-top-class">Çalışılan sınıf</label>
            <CustomSelect
              id="teacher-top-class"
              value={selectedClass}
              onChange={onSelectClass}
              options={classNames}
              placeholder={classNames.length ? 'Sınıf seçin' : 'Henüz sınıf eklenmedi'}
              disabled={!classNames.length}
            />
          </div>
        </div>
        <div className={styles.topBarTabs} role="group" aria-label="Hızlı sayfalar">
          <button type="button" className={styles.topBarTab} onClick={onCommunity} aria-current={isCommunity ? 'page' : undefined} aria-label={unreadCommunity > 0 ? `Topluluk, ${unreadCommunity} okunmamış` : 'Topluluk'}>
            <Globe size={21} aria-hidden="true" />
            <span>Topluluk</span>
            {unreadCommunity > 0 && <span className={styles.topBarMessageCount} aria-hidden="true">{unreadCommunity > 99 ? '99+' : unreadCommunity}</span>}
          </button>
          <button type="button" className={styles.topBarTab} onClick={onClassTools} aria-current={isClassTools ? 'page' : undefined}>
            <Shuffle size={20} aria-hidden="true" /><span>Sınıf araçlarım</span>
          </button>
          <button type="button" className={styles.topBarTab} onClick={onBoards} aria-current={isBoards ? 'page' : undefined}>
            <Layers size={20} aria-hidden="true" /><span>Tahtalarım</span>
          </button>
        </div>
        <div className={styles.topBarActions}>
          <button type="button" className={`${styles.topBarMessages} ${styles.topBarIconAction}`} onClick={onMessages} aria-current={isMessages ? 'page' : undefined} aria-label={unreadMessages > 0 ? `Mesajlar, ${unreadMessages} okunmamış` : 'Mesajlar'} title="Mesajlar">
            <MessageSquare size={26} aria-hidden="true" />
            {unreadMessages > 0 && <span className={styles.topBarMessageCount} aria-hidden="true">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
          </button>
          <button type="button" className={`${styles.notificationButton} ${styles.topBarIconAction}`} onClick={onNotifications} aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'} title="Bildirimler">
            <Bell size={26} aria-hidden="true" />
            {unreadCount > 0 && <span className={styles.notificationCount} aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          <button type="button" className={styles.topBarProfile} onClick={onProfile} aria-label={user?.name ? `${user.name}, profilim` : 'Profilim'} aria-current={isProfile ? 'page' : undefined}>
            <span className={styles.accountAvatar} aria-hidden="true"><User className={styles.topBarMobileAvatar} size={22} /><span className={styles.topBarInitials}>{initials}</span></span>
            <span className={styles.topBarProfileText}>{user?.name || 'Profilim'}<span className={styles.topBarRole}>Öğretmen</span></span>
          </button>
        </div>
      </nav>
    </header>
  );
}
