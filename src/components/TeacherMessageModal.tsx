'use client';

import React, { useState } from 'react';
import { X, Send, MessageSquare, CheckCircle2 } from './icons';
import { Student } from '../data/portalData';

interface TeacherMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onSendToChat?: (text: string, teacherId?: string) => void;
  onOpenLiveChat?: () => void;
}

export const TeacherMessageModal: React.FC<TeacherMessageModalProps> = ({
  isOpen,
  onClose,
  student,
  onSendToChat,
  onOpenLiveChat,
}) => {
  const [selectedTeacher, setSelectedTeacher] = useState('Zehra Aydın (Sınıf Rehber & Türkçe)');
  const [subjectTopic, setSubjectTopic] = useState('Ödev & Ders Takibi');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);

      if (onSendToChat) {
        const teacherId = selectedTeacher.includes('Zehra')
          ? 'tch-zehra'
          : selectedTeacher.includes('Mehmet')
            ? 'tch-mehmet'
            : 'tch-ayse';
        onSendToChat(message, teacherId);
      }

      setTimeout(() => {
        setIsSent(false);
        setMessage('');
        onClose();
      }, 1200);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Karartma */}
      <div
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Kutusu */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in duration-150">

        {/* Üst Başlık (Sade Beyaz) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Öğretmene Mesaj Gönder</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {student.name} ({student.class}) veli bilgilendirmesi
            </p>
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

        {/* Gövde Form */}
        <div className="p-4 sm:p-5">
          {isSent ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Mesajınız Öğretmene İletildi</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Öğretmenimiz mesajı incelediğinde sistem üzerinden ve SMS ile yanıt alacaksınız.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Öğretmen Seçimi */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Öğretmen
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-slate-300"
                >
                  <option value="Zehra Aydın (Sınıf Rehber & Türkçe)">
                    Zehra Aydın (Sınıf Rehber Öğrt. & Türkçe)
                  </option>
                  <option value="Mehmet Yılmaz (Matematik)">
                    Mehmet Yılmaz (Matematik Öğrt.)
                  </option>
                  <option value="Fatma Şahin (Fen Bilimleri)">
                    Fatma Şahin (Fen Bilimleri Öğrt.)
                  </option>
                  <option value="Selin Kaya (İngilizce)">
                    Selin Kaya (İngilizce Öğrt.)
                  </option>
                  <option value="Ali Çetin (Sosyal Bilgiler)">
                    Ali Çetin (Sosyal Bilgiler Öğrt.)
                  </option>
                </select>
              </div>

              {/* Konu */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Konu
                </label>
                <select
                  value={subjectTopic}
                  onChange={(e) => setSubjectTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-slate-300"
                >
                  <option value="Ödev & Ders Takibi">Ödev & Ders Takibi</option>
                  <option value="Sınav Notu İnceleme">Sınav Notu İnceleme Talebi</option>
                  <option value="Devamsızlık / İzin Bildirimi">Devamsızlık / İzin Bildirimi</option>
                  <option value="Yüz Yüze Görüşme Talebi">Yüz Yüze Görüşme Talebi</option>
                </select>
              </div>

              {/* Mesaj */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mesajınız
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="İletmek istediğiniz konuyu yazınız..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-300 resize-none"
                />
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {onOpenLiveChat ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLiveChat();
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    💬 Canlı Sohbeti Aç &rarr;
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || !message.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'İletiliyor...' : 'Gönder'}</span>
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
