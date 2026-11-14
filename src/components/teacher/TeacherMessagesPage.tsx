'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Users, ArrowLeft, MessageSquare, Plus, X } from '../icons';
import {
  classConversationId,
  isFamilyRole,
  markConversationRead,
  MessageRow,
  sendMessage,
  studentConversationId,
} from '../../lib/teacherData';
import { useLiveMessages } from '../../lib/useLiveMessages';
import { markNotificationGroupsRead, notificationGroups } from '../../lib/notificationData';
import { LiveBadge } from './TeacherUi';
import { Notice, NoticeState, formatDateTime, initialsOf, useClassStudents } from './TeacherUi';
import { listGroupReadReceipts, ReadReceipt } from '../../lib/schoolData';
import { Spinner } from '../Spinner';
import styles from './TeacherDashboard.module.css';

interface TeacherMessagesPageProps {
  selectedClass: string;
  /** Öğretmenin bütün sınıfları: grup mesajı diğer sınıflara da gönderilebilir */
  classNames: string[];
  schoolId: string | null;
  currentUserId?: string;
}

export function TeacherMessagesPage({ selectedClass, classNames, schoolId, currentUserId }: TeacherMessagesPageProps) {
  const { students, loading, error } = useClassStudents(selectedClass);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // Grup sohbeti: mesajın da gideceği diğer sınıflar (null = seçici kapalı)
  const [alsoClasses, setAlsoClasses] = useState<string[] | null>(null);
  const otherClasses = classNames.filter((c) => c !== selectedClass);
  const [notice, setNotice] = useState<NoticeState>(null);
  const threadEnd = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  // Masaüstü sohbet kutusu: üstündeki başlıklar ne kadar yer kaplarsa kaplasın pencerenin altına kadar uzanır
  useEffect(() => {
    const el = splitRef.current;
    if (!el) return;
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty('--split-height', `${Math.max(420, window.innerHeight - top - 32)}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    // Üstteki başlık/uyarı yüksekliği değişirse yeniden ölç
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => {
      window.removeEventListener('resize', fit);
      ro.disconnect();
    };
  }, []);

  const groupConv = selectedClass ? classConversationId(schoolId, selectedClass) : '';
  const conversations = useMemo(
    () => [
      ...(groupConv ? [{ id: groupConv, title: `${selectedClass} sınıf grubu`, subtitle: 'Sınıftaki öğrenciler okur', isGroup: true }] : []),
      ...students.map((s) => ({ id: studentConversationId(s.id), title: s.name, subtitle: `No ${s.student_number}`, isGroup: false })),
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

  // Grup sohbeti: kim, en son ne zaman okudu (açıkken 30 sn'de bir yenilenir)
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const activeIsGroup = !!active?.isGroup;
  useEffect(() => {
    if (!activeConv || !activeIsGroup) return;
    let alive = true;
    const load = () => listGroupReadReceipts(activeConv).then((res) => { if (alive && res.ok) setReceipts(res.data); });
    void load();
    const t = window.setInterval(load, 30000);
    return () => { alive = false; window.clearInterval(t); setReceipts([]); };
  }, [activeConv, activeIsGroup, thread.length]);

  // Yalnızca mesaj alanını aşağı kaydır (scrollIntoView tüm sayfayı da kaydırır)
  useEffect(() => {
    const box = threadEnd.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [thread.length, activeConv]);

  // Açık konuşmaya gelen öğrenci mesajlarını okundu yap (karşı taraf "Okundu" görür)
  const hasUnreadInThread = thread.some((m) => isFamilyRole(m.sender_role) && !m.is_read);
  useEffect(() => {
    if (activeConv && hasUnreadInThread) markConversationRead(activeConv);
  }, [activeConv, hasUnreadInThread]);

  // Açık konuşmanın zil bildirimi okundu olur (başka öğretmen mesajı okumuş olsa da)
  useEffect(() => {
    if (activeConv) void markNotificationGroupsRead(notificationGroups.conversation(activeConv));
  }, [activeConv, thread.length]);

  const openConv = (id: string) => {
    setActiveConv(id);
    setNotice(null);
    setAlsoClasses(null);
  };

  const toggleAlso = (c: string) =>
    setAlsoClasses((prev) => (prev?.includes(c) ? prev.filter((x) => x !== c) : [...(prev || []), c]));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !text.trim()) return;
    setBusy(true);
    const res = await sendMessage(activeConv, text);
    if (!res.ok) {
      setBusy(false);
      setNotice({ kind: 'error', text: `Mesaj gönderilemedi: ${res.error}` });
      return;
    }
    // Grup mesajı seçilen diğer sınıfların gruplarına da gider
    const extra = active?.isGroup ? alsoClasses || [] : [];
    const failed: string[] = [];
    for (const c of extra) {
      const r = await sendMessage(classConversationId(schoolId, c), text);
      if (!r.ok) failed.push(c);
    }
    setBusy(false);
    if (failed.length) {
      setNotice({ kind: 'error', text: `Mesaj ${selectedClass} grubuna gönderildi ama şu sınıflara gönderilemedi: ${failed.join(', ')}` });
    } else if (extra.length) {
      setNotice({ kind: 'ok', text: `Mesaj ${[selectedClass, ...extra].join(', ')} sınıf gruplarına gönderildi.` });
    }
    setText('');
    setAlsoClasses(null);
    refresh();
  };

  return (
    <div className={`${styles.pageBody} ${styles.messagesWorkspace}`}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {/* Masaüstü: solda konuşmalar, sağda sohbet. Dar ekran: liste ya da sohbet */}
      <div ref={splitRef} className={styles.messagesSplit} data-active={active ? 'true' : 'false'}>
        <section className={`${styles.panel} ${styles.convPane}`} aria-label="Konuşmalar">
          <div className={styles.listToolbar}><h2 className={styles.panelTitle}>Konuşmalar</h2><LiveBadge live={live} /></div>
          {msgError && <p className={styles.noticeError}>Mesajlar alınamadı: {msgError}</p>}
          {loading && <Spinner center label="Yükleniyor…" />}
          {error && <p className={styles.noticeError}>{error}</p>}
          {!loading && !error && students.length === 0 && (
            <p className={styles.mutedText}>{selectedClass} sınıfında kayıtlı öğrenci yok. Öğrenciler okul numarası ve PIN&apos;i ile giriş yapıp size yazabilir.</p>
          )}
          {[
            { key: 'group', title: '', items: conversations.filter((c) => c.isGroup) },
            // Öğrenci soruları yalnızca mesaj varsa listelenir
            { key: 'students', title: 'Öğrenciler', items: sortByLast(conversations.filter((c) => !c.isGroup)) },
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
                      <button type="button" className={styles.convItem} aria-current={c.id === activeConv ? 'true' : undefined} onClick={() => openConv(c.id)}>
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
        {active ? (
          <section className={styles.chatPanel} aria-label={active.title}>
            <div className={styles.chatHeader}>
              <button type="button" className={styles.backButton} onClick={() => setActiveConv(null)} aria-label="Konuşmalara dön"><ArrowLeft size={20} aria-hidden="true" /><span>Konuşmalar</span></button>
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
                // Grup: bu mesajdan sonra sohbeti açan öğrenciler
                const readers = active.isGroup ? receipts.filter((r) => r.last_read_at >= m.created_at) : [];
                const readTitle = readers.length ? `Okuyanlar: ${readers.map((r) => r.name).join(', ')}` : 'Henüz okuyan yok';
                return (
                  <div key={m.id} className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}>
                    {!mine && <strong>{m.sender_name}</strong>}
                    <p>{m.content}</p>
                    <span title={active.isGroup && mine ? readTitle : undefined}>
                      {formatDateTime(m.created_at)}
                      {mine && !active.isGroup ? (m.is_read ? ' · Okundu' : ' · İletildi') : ''}
                      {mine && active.isGroup ? ` · ${readers.length}/${students.length} okudu` : ''}
                    </span>
                    {mine && active.isGroup && readers.length > 0 && (
                      <details style={{ marginTop: 4, fontSize: 12 }}>
                        <summary style={{ cursor: 'pointer' }}>Kimler okudu</summary>
                        <span>{readers.map((r) => r.name).join(', ')}</span>
                      </details>
                    )}
                  </div>
                );
              })}
              <div ref={threadEnd} />
            </div>
            {active.isGroup && otherClasses.length > 0 && (
              <div className={styles.alsoSend}>
                {alsoClasses === null ? (
                  <button type="button" className={styles.alsoSendToggle} onClick={() => setAlsoClasses([])}>
                    <Plus size={16} aria-hidden="true" />Diğer sınıflara da gönder
                  </button>
                ) : (
                  <>
                    <button type="button" className={styles.alsoSendToggle} onClick={() => setAlsoClasses(null)}>
                      <X size={16} aria-hidden="true" />Yalnızca {selectedClass} grubuna gönder
                    </button>
                    <div className={styles.chipRow} role="group" aria-label="Mesajın da gönderileceği sınıflar">
                      <span className={`${styles.chip} ${styles.chipActive} ${styles.chipLocked}`}>{selectedClass}</span>
                      {otherClasses.map((c) => (
                        <label key={c} className={`${styles.chip} ${alsoClasses.includes(c) ? styles.chipActive : ''}`}>
                          <input type="checkbox" className={styles.visuallyHidden} checked={alsoClasses.includes(c)} onChange={() => toggleAlso(c)} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <form className={styles.chatComposer} onSubmit={handleSend}>
              <label className={styles.visuallyHidden} htmlFor="teacher-chat-input">Mesaj</label>
              <textarea id="teacher-chat-input" value={text} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={2} placeholder={active.isGroup ? 'Sınıf grubuna yazın' : 'Öğrenciye yazın'} />
              <button type="submit" className={styles.primary} disabled={busy || !text.trim()} aria-label="Gönder"><Send size={18} aria-hidden="true" /></button>
            </form>
          </section>
        ) : (
          <section className={styles.chatEmpty} aria-label="Sohbet">
            <MessageSquare size={28} aria-hidden="true" />
            <strong>Bir konuşma seçin</strong>
            <span>Soldaki listeden sınıf grubunu ya da bir öğrenciyi seçerek yazışmaya başlayın.</span>
          </section>
        )}
      </div>
    </div>
  );
}
