'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  Award, 
  MessageSquare,
  ShieldAlert,
  Bell,
  Users
} from './icons';
import { UserRole } from '../data/portalData';

interface BottomNavProps {
  currentRole: UserRole;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingHomeworkCount: number;
  isParentAuthenticated?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentRole,
  activeTab,
  onSelectTab,
  pendingHomeworkCount,
  isParentAuthenticated = true,
}) => {
  if (currentRole === 'veli' && !isParentAuthenticated) {
    return null;
  }
  const veliTabs = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'homeworks', label: 'Ödevler', icon: FileText, badge: pendingHomeworkCount > 0 ? pendingHomeworkCount : null },
    { id: 'grades', label: 'Puanlar', icon: TrendingUp },
    { id: 'leaderboard', label: 'Sıralama', icon: Award, badge: '3.' },
    { id: 'messages', label: 'İletişim', icon: MessageSquare },
  ];

  const ogrenciTabs = [
    { id: 'dashboard', label: 'Öğrenci Paneli', icon: LayoutDashboard },
    { id: 'homeworks', label: 'Ödevlerim', icon: FileText, badge: pendingHomeworkCount > 0 ? pendingHomeworkCount : null },
    { id: 'grades', label: 'Puanlarım', icon: TrendingUp },
    { id: 'leaderboard', label: 'Sıralama', icon: Award, badge: '#3' },
    { id: 'messages', label: 'Öğretmenim', icon: MessageSquare },
  ];

  const ogretmenTabs = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'announcements', label: 'Duyurular', icon: Bell },
  ];

  const adminTabs = [
    { id: 'dashboard', label: 'Yönetim', icon: ShieldAlert },
    { id: 'announcements', label: 'Duyurular', icon: Bell },
  ];

  const tabs =
    currentRole === 'admin'
      ? adminTabs
      : currentRole === 'ogretmen'
      ? ogretmenTabs
      : currentRole === 'ogrenci'
      ? ogrenciTabs
      : veliTabs;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-1">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-lg transition-colors ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 rounded-full text-[9px] font-bold bg-slate-900 text-white flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[56px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
