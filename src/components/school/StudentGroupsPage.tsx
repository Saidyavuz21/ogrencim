'use client';

import React, { useEffect, useState } from 'react';
import { School, Users } from '../icons';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { joinClassWithCode, leaveGroup, listMyGroups, MyGroupRow } from '../../lib/schoolData';
import f from '../files/Files.module.css';

/** Öğrenci: ana şube, katıldığı gruplar ve sınıf koduyla katılım */
export function StudentGroupsPage({ studentId, className, onChanged }: { studentId: string; className: string | null; onChanged?: () => void }) {
  const { confirm } = useDialog();
  const [groups, setGroups] = useState<MyGroupRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = async () => {
    const res = await listMyGroups(studentId);
    if (res.ok) setGroups(res.data);
    else setError(res.error);
  };

  useEffect(() => {
    let alive = true;
    listMyGroups(studentId).then((res) => {
      if (!alive) return;
      if (res.ok) setGroups(res.data);
      else setError(res.error);
    });
    return () => { alive = false; };
  }, [studentId]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/[\s-]/g, '').length !== 8) { setMsg({ kind: 'error', text: 'Kod 8 karakterdir (ör. ABCD-1234).' }); return; }
    setBusy(true);
    setMsg(null);
    const res = await joinClassWithCode(code);
    setBusy(false);
    if (!res.ok) { setMsg({ kind: 'error', text: res.error }); return; }
    setCode('');
    setMsg({
      kind: 'ok',
      text: res.data.status === 'approved' ? `${res.data.class_name} grubuna katıldın.` : `${res.data.class_name} grubuna katılım isteğin gönderildi. Öğretmenin onaylayınca grubun ödevlerini görürsün.`,
    });
    await load();
    onChanged?.();
  };

  const leave = async (g: MyGroupRow) => {
    const ok = await confirm({
      title: g.status === 'pending' ? 'İsteği geri çek' : 'Gruptan ayrıl',
      message: g.status === 'pending' ? `${g.class_name} grubuna katılım isteğin geri çekilsin mi?` : `${g.class_name} grubundan ayrılmak istiyor musun? Grubun ödevlerini artık göremezsin.`,
      confirmText: g.status === 'pending' ? 'Geri çek' : 'Ayrıl',
      cancelText: 'Vazgeç',
      variant: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    const res = await leaveGroup(studentId, g.class_name);
    setBusy(false);
    if (!res.ok) { setMsg({ kind: 'error', text: res.error }); return; }
    await load();
    onChanged?.();
  };

  return (
    <section className={f.page} aria-label="Sınıflarım">
      <div className={f.card}>
        <div className={f.cardHead}>
          <span className={f.setIcon} aria-hidden="true"><School size={22} /></span>
          <div>
            <h3 className={f.cardTitle}>Şuben: {className || 'Belirtilmemiş'}</h3>
            <p className={f.cardText}>Şubeni okul yönetimi ya da öğretmenin belirler.</p>
          </div>
        </div>
      </div>

      <form className={f.card} onSubmit={join}>
        <h3 className={f.cardTitle}>Sınıf koduyla gruba katıl</h3>
        <p className={f.cardText}>Seçmeli ders, etüt ya da kulüp öğretmeninin verdiği 8 karakterli kodu yaz. Öğretmen onaylayınca grubun ödevlerini, quizlerini ve mesajlarını görürsün.</p>
        <div className={f.cardActions}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
            placeholder="ABCD-1234"
            aria-label="Sınıf kodu"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{ flex: '1 1 180px', minHeight: 48, padding: '0 14px', border: '1px solid var(--teacher-border, #dedad0)', borderRadius: 12, font: 'inherit', fontSize: 20, fontWeight: 700, letterSpacing: '0.1em' }}
          />
          <button type="submit" className={f.primaryButton} disabled={busy}>{busy ? 'Gönderiliyor…' : 'Katıl'}</button>
        </div>
        {msg && <p className={msg.kind === 'error' ? f.error : f.progress} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      </form>

      <div className={f.card}>
        <h3 className={f.cardTitle}>Gruplarım</h3>
        {error && <p className={f.error} role="alert">Gruplar alınamadı: {error}</p>}
        {!groups && !error && <Spinner label="Yükleniyor…" />}
        {groups && groups.length === 0 && <p className={f.muted}>Henüz bir gruba katılmadın.</p>}
        {groups && groups.length > 0 && (
          <ul className={f.shareList}>
            {groups.map((g) => (
              <li key={g.class_name}>
                <span className={f.kindIcon} style={{ background: '#efe9fb', color: '#5b3d9c' }} aria-hidden="true"><Users size={18} /></span>
                <div><strong>{g.class_name}</strong><span>{g.status === 'approved' ? 'Üyesin' : 'Onay bekliyor'}</span></div>
                <button type="button" className={f.linkButton} onClick={() => leave(g)} disabled={busy}>{g.status === 'pending' ? 'İsteği geri çek' : 'Ayrıl'}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
