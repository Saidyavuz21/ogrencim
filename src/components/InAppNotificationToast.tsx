'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, X, Check, Bell, ArrowRight } from './icons';

export interface ActiveNotification {
  id: string;
  senderName: string;
  senderRole: 'veli' | 'ogretmen' | 'sistem';
  senderAvatar?: string;
  title?: string;
  message: string;
  time: string;
  conversationId?: string;
}

interface InAppNotificationToastProps {
  notification: ActiveNotification | null;
  onClose: () => void;
  onClick: (notification: ActiveNotification) => void;
}

// Web Audio API ile naif ve temiz bildirim sesi
export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Klasik çift tonlu ding (A5 -> D6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.08);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.24);
  } catch {
    // Ses desteği yoksa sessizce devam
  }
};

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  notification,
  onClose,
  onClick,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 5000;
    const intervalTime = 50;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:top-4 z-50 max-w-sm w-full animate-in slide-in-from-top-3 duration-300">
      <div 
        onClick={() => onClick(notification)}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-3.5 sm:p-4 cursor-pointer hover:border-emerald-300 transition-all relative overflow-hidden group select-none"
      >
        {/* Üst İlerleme Çubuğu (5 saniyelik otomatik kapanış göstergesi) */}
        <div 
          style={{ width: `${progress}%` }} 
          className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-75"
        />

        <div className="flex items-start gap-3">
          
          {/* Avatar / İkon */}
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
            {notification.senderAvatar || '💬'}
          </div>

          {/* İçerik */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-900 truncate">
                {notification.senderName}
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {notification.time}
              </span>
            </div>

            {notification.title && (
              <span className="text-[11px] font-semibold text-emerald-800 block truncate mt-0.5">
                {notification.title}
              </span>
            )}

            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
              {notification.message}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                <span>Mesaja Git</span>
                <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-[10px] text-slate-400">
                Görmek için tıklayın
              </span>
            </div>
          </div>

          {/* Kapat Butonu */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

        </div>
      </div>
    </div>
  );
};

