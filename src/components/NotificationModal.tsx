'use client';

import React, { useState } from 'react';
import { X, Bell, CheckCheck, MessageSquare, ArrowRight } from './icons';
import { Announcement, ChatMessage } from '../data/portalData';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  messages?: ChatMessage[];
  onMarkAllRead: () => void;
  onNavigateToChat?: (conversationId?: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  announcements,
  messages = [],
  onMarkAllRead,
  onNavigateToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'messages' | 'announcements'>('all');

  if (!isOpen) return null;

  // Öğretmenden gelen son mesajlar
  const incomingMessages = messages.filter((m) => m.senderRole === 'ogretmen');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Karartma */}
      <div 
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[82vh] shadow-xl animate-in fade-in">
        
        {/* Başlık */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Bildirimler & Mesajlar</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Canlı
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Öğretmen mesajları, okul duyuruları ve toplantılar
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtre Sekmeleri */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
          {[
            { id: 'all', label: 'Tüm Bildirimler' },
            { id: 'messages', label: `💬 Mesajlar (${incomingMessages.length})` },
            { id: 'announcements', label: `📢 Duyurular (${announcements.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bildirim ve Mesaj Akışı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          
          {/* Gelen Öğretmen Mesajları */}
          {(activeTab === 'all' || activeTab === 'messages') &&
            incomingMessages.slice(0, 4).map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  if (onNavigateToChat) {
                    onNavigateToChat(msg.conversationId);
                    onClose();
                  }
                }}
                className="p-3.5 rounded-xl border border-emerald-200/90 bg-emerald-50/40 hover:bg-emerald-50 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Öğretmen Mesajı</span>
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {msg.timeOnly}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  {msg.senderName} ({msg.senderBadge || 'Öğretmen'})
                </h4>

                <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                  {msg.text || (msg.voiceNote ? '🎙️ Sesli mesaj gönderildi' : '📎 Dosya eki')}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-emerald-100 text-[11px] text-emerald-700 font-semibold">
                  <span>Yanıtlamak için tıklayın</span>
                  <span className="inline-flex items-center gap-1">
                    <span>Sohbete Git</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

          {/* Duyurular */}
          {(activeTab === 'all' || activeTab === 'announcements') &&
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase bg-slate-200/70 px-2 py-0.5 rounded-md">
                    {ann.category}
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {ann.date}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mt-1">
                  {ann.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {ann.content}
                </p>

                <span className="text-[11px] text-slate-400 block pt-1 border-t border-slate-200/60">
                  Gönderen: {ann.sender}
                </span>
              </div>
            ))}

        </div>

        {/* Alt Butonlar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Okundu İşaretle
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
