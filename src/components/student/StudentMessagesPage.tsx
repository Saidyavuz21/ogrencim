'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, Send, Users } from '../icons';
import { MyStudent } from '../../lib/studentData';
import { classConversationId, isFamilyRole, markConversationRead, sendMessage, studentConversationId } from '../../lib/teacherData';
import { useLiveMessages } from '../../lib/useLiveMessages';
import { listMyGroups, markGroupRead } from '../../lib/schoolData';
import { markNotificationGroupsRead, notificationGroups } from '../../lib/notificationData';
import { LiveBadge, MessageTicks, Notice, NoticeState, formatDateTime } from '../teacher/TeacherUi';
import { useFitToViewport } from '../shell/PortalShell';
import sharedStyles from '../teacher/TeacherDashboard.module.css';

import s from '../student/StudentPortal.module.css';
const styles: Record<string, string> = {
  ...sharedStyles,
  pageBody: `${sharedStyles.pageBody} ${s.pageBody}`,
  panel: `${sharedStyles.panel} ${s.panel}`,
  panelTitle: `${sharedStyles.panelTitle} ${s.panelTitle}`,
  chatPanel: `${sharedStyles.chatPanel} ${s.chatPanel}`,
  chatHeader: `${sharedStyles.chatHeader} ${s.chatHeader}`,
  chatComposer: `${sharedStyles.chatComposer} ${s.chatComposer}`,
  chatEmpty: `${sharedStyles.chatEmpty} ${s.chatEmpty}`,
  convItem: `${sharedStyles.convItem} ${s.conversation}`,
};

/**
 * Öğrencinin mesajları: öğretmenlerle tek birebir konuşma (ogr:<id>) + sınıf grubu (yalnızca okunur).
 * Masaüstünde liste ve sohbet yan yana; dar ekranda önce liste, dokununca sohbet.
 */
export function StudentMessagesPage({ me, onRead, initialConversationId }: { me: MyStudent; onRead?: () => void; initialConversationId?: string | null }) {
  const directConv = studentConversationId(me.id);
  const groupConv = me.class_name ? classConversationId(me.school_id, me.class_name) : '';
  // Katıldığı ek grupların (seçmeli ders, etüt, kulüp) sohbetleri
  const [groups, setGroups] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    listMyGroups(me.id).then((res) => { if (alive && res.ok) setGroups(res.data.filter((g) => g.status === 'approved').map((g) => g.class_name)); });
    return () => { alive = false; };
  }, [me.id]);
  const convs = useMemo(() => [
    { id: directConv, title: 'Öğretmenlerim', subtitle: 'Öğretmenlerinle birebir yazışma', canWrite: true },
    ...(groupConv ? [{ id: groupConv, title: `${me.class_name} sınıf grubu`, subtitle: 'Öğretmen duyuruları (yalnızca okunur)', canWrite: false }] : []),
    ...groups.map((g) => ({ id: classConversationId(me.school_id, g), title: `${g} grubu`, subtitle: 'Grup duyuruları (yalnızca okunur)', canWrite: false })),
  ], [directConv, groupConv, me.class_name, me.school_id, groups]);

  const [manualConv, setManualConv] = useState<{
    forInitial: string | null | undefined;
    id: string | null;
  } | null>(null);
  const active =
    manualConv && manualConv.forInitial === initialConversationId
      ? manualConv.id
      : initialConversationId && convs.some((c) => c.id === initialConversationId)
        ? initialConversationId
        : null;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  useFitToViewport(splitRef);

  const convIds = useMemo(() => convs.map((c) => c.id), [convs]);
  const { messages, error: msgError, live, refresh } = useLiveMessages(convIds);

  const thread = messages.filter((m) => m.conversation_id === active);
  const activeConv = convs.find((c) => c.id === active);

  // Yalnızca mesaj alanını aşağı kaydır (scrollIntoView tüm sayfayı da kaydırır)
  useEffect(() => {
    const box = endRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [thread.length, active]);

  // Açık birebir konuşmadaki öğretmen mesajlarını okundu yap.
  // Sınıf grubu bütün sınıfta ortaktır: bir öğrencinin açması herkes için "okundu" yapmasın diye işaretlenmez.
  const hasUnreadInThread = thread.some((m) => !isFamilyRole(m.sender_role) && !m.is_read);
  useEffect(() => {
    if (active && active === directConv && hasUnreadInThread) {
      markConversationRead(active, 'family').then(() => onRead?.());
    }
  }, [active, directConv, hasUnreadInThread, onRead]);

  // Birebir konuşmanın zil bildirimi okundu olur (grup için mark_group_read sunucuda yapar)
  useEffect(() => {
    if (active && active === directConv) void markNotificationGroupsRead(notificationGroups.conversation(active));
  }, [active, directConv, thread.length]);

  // Grup sohbeti açılınca yalnızca bu öğrencinin "okudum" kaydı düşer (öğretmen kimin okuduğunu görür)
  useEffect(() => {
    if (active && active !== directConv) void markGroupRead(active);
  }, [active, directConv, thread.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setBusy(true);
    const res = await sendMessage(active, text);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Mesaj gönderilemedi: ${res.error}` });
      return;
    }
    setText('');
    refresh();
  };

  return (
    <div className={styles.pageBody}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <div ref={splitRef} className={styles.messagesSplit} data-active={activeConv ? 'true' : 'false'}>
        <section className={`${styles.panel} ${styles.convPane}`} aria-label="Konuşmalar">
          <div className={styles.listToolbar}><h2 className={styles.panelTitle}>Konuşmalar</h2><LiveBadge live={live} /></div>
          {msgError && <p className={styles.noticeError}>Mesajlar alınamadı: {msgError}</p>}
          <ul className={styles.convList}>
            {convs.map((c) => {
              const list = messages.filter((m) => m.conversation_id === c.id);
              const last = list[list.length - 1];
              const unread = c.canWrite ? list.filter((m) => !isFamilyRole(m.sender_role) && !m.is_read).length : 0;
              return (
                <li key={c.id}>
                  <button type="button" className={styles.convItem} aria-current={c.id === active ? 'true' : undefined} onClick={() => { setManualConv({ forInitial: initialConversationId, id: c.id }); setNotice(null); }}>
                    <span className={styles.studentAvatar} aria-hidden="true">{c.canWrite ? <MessageSquare size={18} /> : <Users size={18} />}</span>
                    <span className={styles.studentCardInfo}>
                      <strong>{c.title}</strong>
                      <span>{last ? `${isFamilyRole(last.sender_role) ? 'Sen' : last.sender_name}: ${last.deleted_at ? 'Mesaj silindi' : last.content}` : c.subtitle}</span>
                    </span>
                    {unread > 0 && <span className={styles.pageCardBadge} aria-label={`${unread} okunmamış`}>{unread}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {activeConv ? (
          <section className={styles.chatPanel} aria-label={activeConv.title}>
            <div className={styles.chatHeader}>
              <button type="button" className={styles.backButton} onClick={() => setManualConv({ forInitial: initialConversationId, id: null })}><ArrowLeft size={20} aria-hidden="true" /><span>Konuşmalar</span></button>
              <div><strong>{activeConv.title}</strong><span>{activeConv.subtitle}</span></div>
              <LiveBadge live={live} />
            </div>
            <div className={styles.chatThread}>
              {!thread.length && (
                <p className={styles.mutedText}>{activeConv.canWrite ? 'Henüz mesaj yok. Sorunu öğretmenine buradan yazabilirsin.' : 'Henüz duyuru yok.'}</p>
              )}
              {thread.map((m) => {
                const mine = isFamilyRole(m.sender_role);
                return (
                  <div key={m.id} className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`}>
                    {!mine && <strong>{m.sender_name}</strong>}
                    {m.deleted_at ? <p className={styles.bubbleDeleted}>Bu mesaj silindi</p> : <p>{m.content}</p>}
                    <span>{formatDateTime(m.created_at)}{mine && !m.deleted_at ? <> · <MessageTicks read={m.is_read} readAt={m.read_at} /></> : null}</span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            {activeConv.canWrite ? (
              <form className={styles.chatComposer} onSubmit={handleSend}>
                <label className={styles.visuallyHidden} htmlFor="student-chat-input">Mesaj</label>
                <textarea
                  id="student-chat-input"
                  value={text}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  onChange={(e) => setText(e.target.value.slice(0, 2000))}
                  rows={2}
                  placeholder="Öğretmenine yaz"
                />
                <button type="submit" className={styles.primary} disabled={busy || !text.trim()} aria-label="Gönder"><Send size={18} aria-hidden="true" /></button>
              </form>
            ) : (
              <p className={`${styles.mutedText} ${styles.listPad}`}>Bu grupta yalnızca öğretmenler yazar.</p>
            )}
          </section>
        ) : (
          <section className={styles.chatEmpty} aria-label="Sohbet">
            <MessageSquare size={28} aria-hidden="true" />
            <strong>Bir konuşma seç</strong>
            <span>Soldaki listeden öğretmenlerinle yazışmayı ya da sınıf grubunu aç.</span>
          </section>
        )}
      </div>
    </div>
  );
}
