'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Printer } from '../icons';
import { Spinner } from '../Spinner';
import { useDialog } from '../ConfirmDialog';
import { CollapsiblePanel, Notice, NoticeState, formatDate, useClassStudents } from './TeacherUi';
import { listConsentsFor, setGuardianConsent } from '../../lib/privacyData';
import styles from './TeacherDashboard.module.css';
import own from './TeacherConsent.module.css';

/**
 * Veli açık rızası (KVKK): öğretmen, velinin imzaladığı onay formunu teslim alınca işaretler.
 * Tarih, işaretleyen kişi ve metin sürümü veritabanında tutulur (staff_set_guardian_consent).
 * Yönetici aynı kaydı Okul yönetimi → KVKK sayfasında görür.
 */
export function TeacherConsentPage({ selectedClass }: { selectedClass: string }) {
  const { confirm } = useDialog();
  const { students, loading, error } = useClassStudents(selectedClass);
  const [consents, setConsents] = useState<Record<string, string | null>>({});
  const [consentError, setConsentError] = useState<string | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const idsKey = students.map((s) => s.id).join(',');
  useEffect(() => {
    if (loading) return;
    let alive = true;
    listConsentsFor(idsKey ? idsKey.split(',') : []).then((res) => {
      if (!alive) return;
      setConsentLoading(false);
      if (res.ok) { setConsents(res.data); setConsentError(null); } else setConsentError(res.error);
    });
    return () => { alive = false; };
  }, [idsKey, loading]);

  const given = useMemo(() => students.filter((s) => consents[s.id]).length, [students, consents]);
  const missing = students.length - given;
  const rows = onlyMissing ? students.filter((s) => !consents[s.id]) : students;

  const mark = async (id: string, name: string, value: boolean) => {
    if (!value) {
      const ok = await confirm({
        title: 'Veli onayını geri al',
        message: `"${name}" için kaydedilen veli onayı silinecek. Bunu yalnızca veli onayını geri çektiyse veya yanlış işaretlediyseniz yapın.`,
        confirmText: 'Onayı geri al',
        cancelText: 'Vazgeç',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setBusy(id);
    setNotice(null);
    const res = await setGuardianConsent(id, value);
    setBusy(null);
    if (!res.ok) return setNotice({ kind: 'error', text: res.error });
    setConsents((prev) => ({ ...prev, [id]: value ? new Date().toISOString() : null }));
    setNotice({ kind: 'ok', text: value ? `${name}: veli onayı kaydedildi.` : `${name}: veli onayı geri alındı.` });
  };

  const busyList = loading || consentLoading;
  const listError = error || consentError;

  return (
    <div className={`${styles.pageBody} ${styles.leaderboardWorkspace}`}>
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <div className={styles.pointsLayout}>
        <section className={styles.studentList} aria-label={`${selectedClass} veli onayları`}>
          <div className={styles.listHeading}>
            <div>
              <h2>{selectedClass} sınıfı</h2>
              <p>Velinin imzaladığı onay formunu teslim aldığınızda işaretleyin.</p>
            </div>
            <div className={own.filter} role="group" aria-label="Gösterilecek öğrenciler">
              <button type="button" className={styles.dueChip} aria-pressed={!onlyMissing} onClick={() => setOnlyMissing(false)}>
                Hepsi ({students.length})
              </button>
              <button type="button" className={styles.dueChip} aria-pressed={onlyMissing} onClick={() => setOnlyMissing(true)}>
                Onayı eksik ({busyList ? '…' : missing})
              </button>
            </div>
          </div>
          {busyList && !listError && <Spinner center label="Yükleniyor…" />}
          {listError && <p className={`${styles.noticeError} ${styles.listPad}`}>{listError}</p>}
          {!busyList && !listError && students.length === 0 && <p className={`${styles.mutedText} ${styles.listPad}`}>Bu sınıfta kayıtlı öğrenci yok.</p>}
          {!busyList && !listError && students.length > 0 && rows.length === 0 && (
            <p className={`${styles.mutedText} ${styles.listPad}`}>Bu sınıftaki bütün öğrencilerin veli onayı alınmış.</p>
          )}
          {!busyList && !listError && rows.length > 0 && (
            <ul className={styles.rankList}>
              {rows.map((s) => {
                const at = consents[s.id];
                return (
                  <li key={s.id} className={`${styles.rankRow} ${own.row}`}>
                    <span className={styles.studentCardInfo}>
                      <strong>{s.name}</strong>
                      <span>
                        No {s.student_number} ·{' '}
                        <span className={at ? own.statusOk : own.statusMissing}>
                          {at ? `Onay ${formatDate(at)} tarihinde alındı` : 'Onay alınmadı'}
                        </span>
                      </span>
                    </span>
                    {at ? (
                      <button type="button" className={`${styles.secondary} ${own.action}`} disabled={busy === s.id} onClick={() => mark(s.id, s.name, false)}>
                        Geri al
                      </button>
                    ) : (
                      <button type="button" className={`${styles.primary} ${own.action}`} disabled={busy === s.id} onClick={() => mark(s.id, s.name, true)}>
                        <Check size={18} aria-hidden="true" /> {busy === s.id ? 'Kaydediliyor…' : 'Onay alındı'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className={styles.pointsAside}>
          <CollapsiblePanel title="Sınıf durumu" summary={busyList ? undefined : `${given} / ${students.length} onay alındı`}>
            <h2 className={styles.panelTitle}>Sınıf durumu</h2>
            <dl className={styles.infoList}>
              <div><dt>Öğrenci</dt><dd>{busyList ? '…' : students.length}</dd></div>
              <div><dt>Onay alındı</dt><dd>{busyList ? '…' : given}</dd></div>
              <div><dt>Onayı eksik</dt><dd>{busyList ? '…' : missing}</dd></div>
            </dl>
          </CollapsiblePanel>

          <CollapsiblePanel title="Onay formu" summary="Yazdır ve veliye ver">
            <h2 className={styles.panelTitle}>Onay formu</h2>
            <p className={own.help}>
              Aydınlatma metni ve altındaki onay formu tek sayfadadır. Yazdırıp veliye verin; imzalı formu
              teslim alınca öğrencinin yanındaki <strong>Onay alındı</strong> düğmesine basın. Kâğıt formu okulda saklayın.
            </p>
            <a className={`${styles.secondary} ${own.printLink}`} href="/aydinlatma" target="_blank" rel="noopener noreferrer">
              <Printer size={18} aria-hidden="true" /> Onay formunu aç
            </a>
            <p className={own.help}>Tarih ve işaretleyen kişi kaydedilir; okul yönetimi de bu bilgiyi görür.</p>
          </CollapsiblePanel>
        </aside>
      </div>
    </div>
  );
}
