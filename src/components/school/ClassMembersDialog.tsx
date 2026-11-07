'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Plus, Search, Trash2, X } from '../icons';
import { Spinner } from '../Spinner';
import {
  addClassMember, approveClassMember, createClassCode, deleteClassCode, formatCode, getClassCode, listClassMembers, MemberRow, removeClassMember,
  searchSchoolStudents,
} from '../../lib/schoolData';
import { Modal } from '../files/FilesUi';
import f from '../files/Files.module.css';

type Found = { id: string; name: string; student_number: string; class_name: string | null };

/**
 * Sınıf / grup üyeleri: katılım kodu, bekleyen istekleri onaylama, öğrenci ekleme/çıkarma.
 * Ana şubesi bu sınıf olan öğrenciler burada değil, Öğrenciler sayfasında yönetilir.
 */
export function ClassMembersDialog({ className, onClose }: { className: string; onClose: () => void }) {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found[]>([]);

  const load = useCallback(async () => {
    const [m, c] = await Promise.all([listClassMembers(className), getClassCode(className)]);
    if (!m.ok) { setError(m.error); return; }
    setMembers(m.data);
    setCode(c);
  }, [className]);

  useEffect(() => {
    let alive = true;
    Promise.all([listClassMembers(className), getClassCode(className)]).then(([m, c]) => {
      if (!alive) return;
      if (!m.ok) { setError(m.error); return; }
      setMembers(m.data);
      setCode(c);
    });
    return () => { alive = false; };
  }, [className]);

  // Öğrenci arama (yazmayı bırakınca)
  useEffect(() => {
    if (q.trim().length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => {
      searchSchoolStudents(q).then((res) => { if (alive && res.ok) setFound(res.data); });
    }, 300);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okText?: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) { setError(res.error || 'İşlem yapılamadı.'); return false; }
    if (okText) setInfo(okText);
    await load();
    return true;
  };

  const newCode = async () => {
    setBusy(true);
    setError(null);
    const res = await createClassCode(className);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setCode(res.data);
    setInfo('Yeni kod oluşturuldu; eski kod artık geçmez.');
  };

  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(formatCode(code)); setInfo('Kod kopyalandı.'); } catch { setInfo(`Kod: ${formatCode(code)}`); }
  };

  const pending = (members || []).filter((m) => m.status === 'pending');
  const approved = (members || []).filter((m) => m.status === 'approved');
  const memberIds = new Set((members || []).map((m) => m.student_id));
  const visibleFound = q.trim().length >= 2 ? found.filter((s) => s.class_name !== className) : [];

  return (
    <Modal title={className} kicker="Grup üyeleri ve katılım kodu" onClose={onClose} busy={busy} wide>
      {error && <p className={f.error} role="alert">{error}</p>}
      {info && <p className={f.progress} role="status">{info}</p>}
      {!members && !error && <Spinner center label="Yükleniyor…" />}
      {members && (
        <div className={f.grid2} style={{ alignItems: 'start' }}>
          <div className={f.form}>
            <section className={f.card}>
              <h3 className={f.cardTitle}>Katılım kodu</h3>
              {code ? (
                <>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '0.12em', fontVariantNumeric: 'tabular-nums' }} aria-label={`Kod ${code.split('').join(' ')}`}>{formatCode(code)}</p>
                  <p className={f.muted}>Öğrenciler panelde <b>Hesap → Sınıflarım</b> bölümüne bu kodu yazar; siz onaylayınca bu gruba katılır. Ana şubeleri değişmez.</p>
                  <div className={f.cardActions}>
                    <button type="button" className={f.secondaryButton} onClick={copy}><Copy size={18} aria-hidden="true" />Kopyala</button>
                    <button type="button" className={f.secondaryButton} onClick={newCode} disabled={busy}>Yeni kod üret</button>
                    <button type="button" className={f.linkButton} onClick={() => run(async () => deleteClassCode(className), 'Kod kapatıldı; artık kimse katılım isteyemez.').then((ok) => { if (ok) setCode(null); })} disabled={busy}>Kodu kapat</button>
                  </div>
                </>
              ) : (
                <>
                  <p className={f.muted}>Kod oluşturursanız öğrenciler kendileri katılım isteyebilir. Ya da aşağıdan öğrenciyi doğrudan ekleyebilirsiniz.</p>
                  <button type="button" className={f.primaryButton} onClick={newCode} disabled={busy} style={{ justifySelf: 'start' }}>Katılım kodu oluştur</button>
                </>
              )}
            </section>

            <section className={f.card}>
              <h3 className={f.cardTitle}>Öğrenci ekle</h3>
              <label className={f.search}>
                <span className={f.srOnly}>Okuldaki öğrencilerde ara</span>
                <Search size={18} aria-hidden="true" />
                <input type="search" value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setFound([]); }} placeholder="Ad ya da okul numarası" />
              </label>
              {visibleFound.length > 0 && (
                <ul className={f.pickList}>
                  {visibleFound.map((s) => (
                    <li key={s.id} className={f.pickRow}>
                      <span className={f.pickText}><strong>{s.name}</strong><small>No {s.student_number}{s.class_name ? ` · ${s.class_name}` : ''}</small></span>
                      {memberIds.has(s.id) ? <span className={f.muted}>Grupta</span> : (
                        <button type="button" className={f.iconButton} onClick={() => run(() => addClassMember(s.id, className), `${s.name} gruba eklendi.`)} disabled={busy} aria-label={`${s.name} gruba ekle`}><Plus size={18} aria-hidden="true" /></button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {q.trim().length >= 2 && !visibleFound.length && <p className={f.muted}>Eşleşen öğrenci yok.</p>}
            </section>
          </div>

          <div className={f.form}>
            {pending.length > 0 && (
              <section className={f.card}>
                <h3 className={f.cardTitle}>Katılım istekleri ({pending.length})</h3>
                <ul className={f.shareList}>
                  {pending.map((m) => (
                    <li key={m.student_id}>
                      <div><strong>{m.student?.name || 'Öğrenci'}</strong><span>No {m.student?.student_number}{m.student?.class_name ? ` · ${m.student.class_name}` : ''}</span></div>
                      <button type="button" className={f.iconButton} onClick={() => run(() => approveClassMember(m.student_id, className), `${m.student?.name} gruba katıldı.`)} disabled={busy} aria-label={`${m.student?.name} isteğini onayla`} title="Onayla"><Check size={18} aria-hidden="true" /></button>
                      <button type="button" className={f.iconButton} onClick={() => run(() => removeClassMember(m.student_id, className), 'İstek reddedildi.')} disabled={busy} aria-label={`${m.student?.name} isteğini reddet`} title="Reddet"><X size={18} aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className={f.card}>
              <h3 className={f.cardTitle}>Grup üyeleri ({approved.length})</h3>
              {approved.length === 0 ? <p className={f.muted}>Ana şubesi başka olup bu gruba katılan öğrenci yok.</p> : (
                <ul className={f.shareList}>
                  {approved.map((m) => (
                    <li key={m.student_id}>
                      <div><strong>{m.student?.name || 'Öğrenci'}</strong><span>No {m.student?.student_number}{m.student?.class_name ? ` · ana şube ${m.student.class_name}` : ''}</span></div>
                      <button type="button" className={f.iconButton} onClick={() => run(() => removeClassMember(m.student_id, className), `${m.student?.name} gruptan çıkarıldı.`)} disabled={busy} aria-label={`${m.student?.name} gruptan çıkar`} title="Gruptan çıkar"><Trash2 size={18} aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={f.muted}>Grup üyeleri bu sınıfa verilen ödev, quiz, materyal, okuma yarışması ve grup mesajlarını görür; puan ve not girişi listelerinde de yer alır.</p>
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}
