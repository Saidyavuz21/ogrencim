'use client';

import React, { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, FileText, X } from '../icons';
import { ClassStudent, formatBytes, getAttachmentUrl, HomeworkAttachment, listClassStudents } from '../../lib/teacherData';
import styles from './TeacherDashboard.module.css';

export type NoticeState = { kind: 'ok' | 'error'; text: string } | null;

/** Başarı / hata bildirimi (yalnızca gerçek işlem sonucuna göre gösterilir) */
export function Notice({ notice, onClose }: { notice: NoticeState; onClose?: () => void }) {
  if (!notice) return null;
  return (
    <div role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'error' ? styles.noticeError : styles.noticeOk}>
      {notice.kind === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
      <span>{notice.text}</span>
      {onClose && (
        <button type="button" className={styles.noticeClose} onClick={onClose} aria-label="Bildirimi kapat">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Ödev dosyaları: tıklanınca 10 dakikalık özel bağlantıyla açılır */
export function AttachmentList({ attachments }: { attachments: HomeworkAttachment[] | null | undefined }) {
  const [error, setError] = useState<string | null>(null);
  if (!attachments?.length) return null;

  const open = async (a: HomeworkAttachment) => {
    setError(null);
    // Açılır pencere engelini aşmak için pencere tıklama anında açılır, adres sonra verilir
    const win = window.open('', '_blank');
    const res = await getAttachmentUrl(a.path);
    if (!res.ok) {
      win?.close();
      setError(`"${a.name}" açılamadı: ${res.error}`);
      return;
    }
    if (win) win.location.replace(res.data);
    else window.location.assign(res.data);
  };

  return (
    <div>
      <ul className={styles.fileList} aria-label="Ödev dosyaları">
        {attachments.map((a) => (
          <li key={a.path} className={styles.fileItem}>
            <FileText size={18} aria-hidden="true" />
            <span title={a.name}>{a.name}</span>
            <small>{formatBytes(a.size)}</small>
            <button type="button" className={`${styles.secondary} ${styles.fileButton}`} onClick={() => open(a)}>Aç</button>
          </li>
        ))}
      </ul>
      {error && <p className={styles.noticeError}>{error}</p>}
    </div>
  );
}

/** Canlı bağlantı göstergesi (Supabase Realtime) */
export function LiveBadge({ live }: { live: boolean }) {
  return (
    <span className={live ? styles.liveOn : styles.liveOff} role="status">
      <span aria-hidden="true" className={styles.liveDot} />
      {live ? 'Canlı' : 'Bağlanıyor…'}
    </span>
  );
}

/** Sınıf seçilmemişse gösterilen yönlendirme */
export function NeedClass({ onOpenClasses }: { onOpenClasses: () => void }) {
  return (
    <section className={styles.emptyState}>
      <h2>Önce bir sınıf seçin</h2>
      <p>Bu sayfa seçili sınıfın öğrencileriyle çalışır. Sınıfınız yoksa &quot;Sınıflarım&quot; sayfasından ekleyin.</p>
      <button type="button" className={styles.primary} onClick={onOpenClasses}>Sınıflarım</button>
    </section>
  );
}

/** Seçili sınıfın öğrencilerini veritabanından çeker */
// ===== Öğrenci listesi sıralaması (No / A–Z) — tercih bu cihazda hatırlanır, tüm sayfalarda ortaktır =====
export type StudentSort = 'no' | 'name';
const SORT_KEY = 'ogretmen-ogrenci-sirasi';
const SORT_EVENT = 'ogrenci-sirasi-degisti';

function readSort(): StudentSort {
  try {
    return window.localStorage.getItem(SORT_KEY) === 'name' ? 'name' : 'no';
  } catch {
    return 'no';
  }
}

function subscribeSort(onChange: () => void) {
  window.addEventListener(SORT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SORT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useStudentSort(): [StudentSort, (next: StudentSort) => void] {
  const sort = useSyncExternalStore(subscribeSort, readSort, () => 'no' as StudentSort);
  const setSort = useCallback((next: StudentSort) => {
    try {
      window.localStorage.setItem(SORT_KEY, next);
    } catch {
      /* depolama kapalıysa yalnızca bu oturumda geçerli olmaz; sorun değil */
    }
    window.dispatchEvent(new Event(SORT_EVENT));
  }, []);
  return [sort, setSort];
}

/** Okul numarası sayı gibi sıralanır (49 < 139); adlar Türkçe alfabeye göre */
export function sortStudents<T extends { name: string; student_number: string }>(list: T[], sort: StudentSort): T[] {
  const byNo = (a: T, b: T) => a.student_number.localeCompare(b.student_number, 'tr', { numeric: true });
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
  return [...list].sort((a, b) => (sort === 'name' ? byName(a, b) || byNo(a, b) : byNo(a, b) || byName(a, b)));
}

/** Liste üstündeki sıralama seçici */
export function StudentSortToggle() {
  const [sort, setSort] = useStudentSort();
  const options: { value: StudentSort; label: string; title: string }[] = [
    { value: 'no', label: 'No', title: 'Okul numarasına göre sırala' },
    { value: 'name', label: 'A–Z', title: 'Ada göre alfabetik sırala' },
  ];
  return (
    <div className={styles.sortToggle} role="group" aria-label="Öğrenci sıralaması">
      <span className={styles.sortToggleLabel}>Sırala</span>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={sort === o.value} title={o.title} onClick={() => setSort(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useClassStudents(className: string) {
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    listClassStudents(className).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok) {
        setStudents(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    });
    return () => { alive = false; };
  }, [className, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const [sort] = useStudentSort();
  const sorted = useMemo(() => sortStudents(students, sort), [students, sort]);
  return { students: sorted, setStudents, loading, error, reload };
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR');

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Mobilde (<1024px) başlığa dokunarak açılıp kapanan, masaüstünde her zaman açık duran yan kutu */
export function CollapsiblePanel({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className={styles.panel}>
      <button
        type="button"
        className={styles.mobileCollapseBar}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.mobileCollapseText}>
          <strong>{title}</strong>
          {summary && <span>{summary}</span>}
        </span>
        <ChevronDown size={20} aria-hidden="true" className={open ? styles.homeToggleOpen : undefined} />
      </button>
      <div id={contentId} className={`${styles.mobileCollapseBody} ${open ? '' : styles.mobileCollapseClosed}`}>
        {children}
      </div>
    </section>
  );
}
