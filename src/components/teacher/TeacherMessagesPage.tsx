'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Users, ArrowLeft } from '../icons';
import {
  classConversationId,
  isFamilyRole,
  markConversationRead,
  MessageRow,
  sendMessage,
  studentConversationId,
  questionConversationId,
} from '../../lib/teacherData';
import { useLiveMessages } from '../../lib/useLiveMessages';
import { LiveBadge } from './TeacherUi';
import { Notice, NoticeState, formatDateTime, initialsOf, useClassStudents } from './TeacherUi';
import styles from './TeacherDashboard.module.css';

interface TeacherMessagesPageProps {
  selectedClass: string;
  schoolId: string | null;
  currentUserId?: string;
}

export function TeacherMessagesPage({ selectedClass, schoolId, currentUserId }: TeacherMessagesPageProps) {
  const { students, loading, error } = useClassStudents(selectedClass);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  const groupConv = selectedClass ? classConversationId(schoolId, selectedClass) : '';
  const conversations = useMemo(
    () => [
      ...(groupConv ? [{ id: groupConv, title: `${selectedClass} sınıf grubu`, subtitle: 'Veliler ve öğrenciler okur', isGroup: true, isQuestion: false }] : []),
      ...students.map((s) => ({ id: studentConversationId(s.id), title: `${s.name} velisi`, subtitle: `No ${s.student_number}`, isGroup: false, isQuestion: false })),
      ...students.map((s) => ({ id: questionConversationId(s.id), title: `${s.name} (öğrenci)`, subtitle: 'Öğrencinin soruları', isGroup: false, isQuestion: true })),
    ],
    [groupConv, selectedClass, students]
  );
  const convIds = useMemo(() => conversations.map((c) => c.id), [conversations]);
  const { messages, error: msgError, live, refresh } = useLiveMessages(convIds);

  const byConv = useMemo(() => {
    const map: Record<string, MessageRow[]> = {};
    messages.forEach((m) => { (map[m.conversation_id] ||= []).push(m); });
    return map;
  }, [messages]);

  const thread = activeConv ? byConv[activeConv] || [] : [];
  // Son mesajı en yeni olan konuşma üstte; mesajı olmayanlar ad sırasıyla altta
  const sortByLast = <T extends { id: string; title: string }>(items: T[]) =>
    [...items].sort((a, b) => {
      const la = byConv[a.id]?.at(-1)?.created_at || '';
      const lb = byConv[b.id]?.at(-1)?.created_at || '';
      return lb.localeCompare(la) || a.title.localeCompare(b.title, 'tr');
    });
  const active = conversations.find((c) => c.id === activeConv);

  useEffect(() => { threadEnd.current?.scrollIntoView({ block: 'end' }); }, [thread.length, activeConv]);

  // Açık konuşmaya gelen veli mesajlarını okundu yap (karşı taraf "Okundu" görür)
  const hasUnreadInThread = thread.some((m) => isFamilyRole(m.sender_role) && !m.is_read);
  useEffect(() => {
    if (activeConv && hasUnreadInThread) markConversationRead(activeConv);
  }, [activeConv, hasUnreadInThread]);

  const openConv = (id: string) => {
    setActiveConv(id);
    setNotice(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !text.trim()) return;
    setBusy(true);
    const res = await sendMessage(activeConv, text);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Mesaj gönderilemedi: ${res.error}` });
      return;
    }
    setText('');
    refresh();
  };

  if (active) {
    return (
      <div className={styles.pageBody}>
        <Notice notice={notice} onClose={() => setNotice(null)} />
        <section className={styles.chatPanel} aria-label={active.title}>
          <div className={styles.chatHeader}>
            <button type="button" className={styles.backButton} onClick={() => setActiveConv(null)}><ArrowLeft size={20} aria-hidden="true" /><span>Konuşmalar</span></button>
            <div>
              <strong>{active.title}</strong>
              <span>{active.subtitle}</span>
            </div>
            <LiveBadge live={live} />
          </div>
          <div className={styles.chatThread}>
            {thread.length === 0 && <p className={styles.mutedText}>Henüz mesaj yok. İlk mesajı siz yazın.</p>}
            {thread.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}>
                  {!mine && <strong>{m.sender_name}</strong>}
                  <p>{m.content}</p>
                  <span>{formatDateTime(m.created_at)}{mine ? (m.is_read ? ' · Okundu' : ' · İletildi') : ''}</span>
                </div>
              );
            })}
            <div ref={threadEnd} />
          </div>
          <form className={styles.chatComposer} onSubmit={handleSend}>
            <label className={styles.visuallyHidden} htmlFor="teacher-chat-input">Mesaj</label>
            <textarea id="teacher-chat-input" value={text} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={2} placeholder={active.isGroup ? 'Sınıf grubuna yazın' : active.isQuestion ? 'Öğrenciye yazın' : 'Veliye yazın'} />
            <button type="submit" className={styles.primary} disabled={busy || !text.trim()} aria-label="Gönder"><Send size={18} aria-hidden="true" /></button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <section className={styles.panel} aria-label="Konuşmalar">
        <div className={styles.listToolbar}><h2 className={styles.panelTitle}>Konuşmalar</h2><LiveBadge live={live} /></div>
        {msgError && <p className={styles.noticeError}>Mesajlar alınamadı: {msgError}</p>}
        {loading && <p className={styles.mutedText}>Yükleniyor…</p>}
        {error && <p className={styles.noticeError}>{error}</p>}
        {!loading && !error && students.length === 0 && (
          <p className={styles.mutedText}>{selectedClass} sınıfında kayıtlı öğrenci yok. Veliler, öğrencinin okul numarası ve PIN&apos;i ile giriş yapıp size yazabilir.</p>
        )}
        {[
          { key: 'group', title: '', items: conversations.filter((c) => c.isGroup) },
          // Öğrenci soruları yalnızca mesaj varsa listelenir
          { key: 'questions', title: 'Öğrenci soruları', items: sortByLast(conversations.filter((c) => c.isQuestion && byConv[c.id]?.length)) },
          { key: 'parents', title: 'Veliler', items: sortByLast(conversations.filter((c) => !c.isGroup && !c.isQuestion)) },
        ].filter((g) => g.items.length).map((g) => (
          <div key={g.key}>
            {g.title && <h3 className={styles.convGroupTitle}>{g.title}</h3>}
            <ul className={styles.convList}>
              {g.items.map((c) => {
                const list = byConv[c.id] || [];
                const last = list[list.length - 1];
                const unread = list.filter((m) => isFamilyRole(m.sender_role) && !m.is_read).length;
                return (
                  <li key={c.id}>
                    <button type="button" className={styles.convItem} onClick={() => openConv(c.id)}>
                      <span className={styles.studentAvatar} aria-hidden="true">{c.isGroup ? <Users size={18} /> : initialsOf(c.title)}</span>
                      <span className={styles.studentCardInfo}>
                        <strong>{c.title}</strong>
                        <span>{last ? `${isFamilyRole(last.sender_role) ? '' : 'Siz: '}${last.content}` : c.subtitle}</span>
                      </span>
                      {unread > 0 && <span className={styles.pageCardBadge} aria-label={`${unread} okunmamış`}>{unread}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
