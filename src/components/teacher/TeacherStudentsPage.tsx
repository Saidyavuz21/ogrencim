'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, UserPlus, Users, Edit, Key, Trash2, X, AlertCircle, CheckCircle2 } from '../icons';
import { TeacherBulkStudents } from './TeacherBulkStudents';
import { CollapsiblePanel, StudentSortToggle, sortStudents, useStudentSort } from './TeacherUi';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { createStudent, deleteStudent, listStudents, resetStudentPin, updateStudentInfo, StudentListItem } from '../../lib/supabaseClient';
import styles from './TeacherDashboard.module.css';

interface TeacherStudentsPageProps {
  /** Varsayılan filtre ve yeni öğrencinin varsayılan sınıfı */
  selectedClass: string;
  /** Öğretmenin sınıfları (rehberlik + Sınıflarım). Öğrenci yalnızca bunlara eklenir/taşınır. */
  classNames: string[];
  onOpenClasses: () => void;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

const randomPin = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
const ALL = '__tum__';

function StudentEditModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(
    <div className={styles.studentModalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="student-edit-title" tabIndex={-1}
        className={styles.studentModal} onKeyDown={(e) => {
          if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); onClose(); }
          if (e.key !== 'Tab') return;
          const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [tabindex="0"]')).filter((el) => el.getClientRects().length);
          const first = controls[0], last = controls[controls.length - 1];
          if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first?.focus(); }
        }}>{children}</div>
    </div>, document.body);
}

export function TeacherStudentsPage({ selectedClass, classNames, onOpenClasses }: TeacherStudentsPageProps) {
  const defaultClass = classNames.includes(selectedClass) ? selectedClass : classNames[0] || '';
  const { prompt, confirm } = useDialog();
  // Düzenleme penceresi kapatılırken kaydedilmemiş değişiklik varsa onay sorulur
  const closeEditor = async (st: StudentListItem) => {
    const dirty = editName !== st.name || editClass !== st.class_name || !!editPin;
    if (dirty && !(await confirm({
      title: 'Kaydedilmemiş değişiklikler',
      message: 'Yaptığınız değişiklikler kaydedilmedi. Kaydetmeden kapatılsın mı?',
      confirmText: 'Kaydetmeden kapat',
      cancelText: 'Düzenlemeye dön',
      variant: 'warning',
    }))) return;
    setEditingId(null);
  };
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState(defaultClass || ALL);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  // Yeni öğrenci formu
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [newNo, setNewNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState(defaultClass);
  const [newPin, setNewPin] = useState(randomPin);
  const [adding, setAdding] = useState(false);

  // Düzenleme
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editPin, setEditPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [sort] = useStudentSort();

  const applyList = (res: Awaited<ReturnType<typeof listStudents>>) => {
    setLoading(false);
    if (!res.ok) {
      setLoadError(`Öğrenci listesi alınamadı: ${res.error}`);
      return;
    }
    setLoadError(null);
    setStudents(res.students);
  };

  // Ekleme/düzenleme sonrası listeyi yeniden çeker
  const load = useCallback(async () => {
    setLoading(true);
    applyList(await listStudents());
  }, []);

  // İlk açılışta listeyi çek
  useEffect(() => {
    let alive = true;
    listStudents().then((res) => { if (alive) applyList(res); });
    return () => { alive = false; };
  }, []);

  if (!classNames.length) {
    return (
      <section className={styles.emptyState}>
        <h2>Önce sınıfınızı ekleyin</h2>
        <p>Öğrenciler yalnızca sizin sınıflarınıza eklenebilir. &quot;Sınıflarım&quot; sayfasından ders verdiğiniz sınıfları ekleyin.</p>
        <button type="button" className={styles.primary} onClick={onOpenClasses}>Sınıflarım</button>
      </section>
    );
  }

  // Yalnızca öğretmenin kendi sınıflarındaki öğrenciler listelenir
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const filtered = students.filter((s) =>
    classNames.includes(s.class_name) &&
    (filterClass === ALL || s.class_name === filterClass) &&
    (!q || s.name.toLocaleLowerCase('tr-TR').includes(q) || s.student_number.toLocaleLowerCase('tr-TR').includes(q))
  );
  // Seçilen sıralama (No / A–Z); tüm sınıflar gösterilirken önce sınıfa göre gruplanır
  const visible = sortStudents(filtered, sort).sort((a, b) =>
    filterClass === ALL ? a.class_name.localeCompare(b.class_name, 'tr', { numeric: true }) : 0
  );

  const classSelect = (id: string, value: string, onChange: (v: string) => void) => (
    <CustomSelect
      id={id}
      value={value}
      onChange={onChange}
      options={classNames.map((c) => ({ value: c, label: c }))}
      placeholder="Sınıf seçin"
    />
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!classNames.includes(newClass)) {
      setNotice({ kind: 'error', text: 'Öğrenciyi yalnızca kendi sınıflarınızdan birine ekleyebilirsiniz.' });
      return;
    }
    if (!/^[0-9]{4}$/.test(newPin)) {
      setNotice({ kind: 'error', text: 'PIN tam olarak 4 rakam olmalıdır.' });
      return;
    }
    setAdding(true);
    const res = await createStudent({ studentNumber: newNo.trim(), name: newName.trim(), className: newClass, pin: newPin });
    setAdding(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Öğrenci eklenemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${newName.trim()} ${newClass} sınıfına eklendi. Giriş bilgisi: okul no ${newNo.trim()}, PIN ${newPin}. Bu PIN'i öğrenciye iletin; daha sonra tekrar gösterilmez.` });
    setNewNo('');
    setNewName('');
    setNewPin(randomPin());
    setIsAddOpen(false);
    load();
  };

  const startEdit = (s: StudentListItem) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditClass(s.class_name);
    setEditPin('');
    setNotice(null);
  };

  const handleSaveEdit = async (s: StudentListItem) => {
    if (!classNames.includes(editClass)) {
      setNotice({ kind: 'error', text: 'Öğrenciyi yalnızca kendi sınıflarınız arasında taşıyabilirsiniz.' });
      return;
    }
    setBusy(true);
    const res = await updateStudentInfo(s.id, { name: editName, class_name: editClass });
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Kaydedilemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${editName.trim()} bilgileri kaydedildi.` });
    setEditingId(null);
    load();
  };

  const handleResetPin = async (s: StudentListItem) => {
    if (!/^[0-9]{4}$/.test(editPin)) {
      setNotice({ kind: 'error', text: 'Yeni PIN tam olarak 4 rakam olmalıdır.' });
      return;
    }
    setBusy(true);
    const res = await resetStudentPin(s.id, editPin);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `PIN değiştirilemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${s.name} için yeni PIN: ${editPin}. Açık oturumları kapatıldı.` });
    setEditPin('');
  };

  const handleDelete = async (s: StudentListItem) => {
    const typed = await prompt({
      title: 'Öğrenciyi Sil',
      message: `${s.name} (No ${s.student_number}) ve bütün kayıtları kalıcı olarak silinecektir.\nBu işlem geri alınamaz.`,
      inputLabel: 'Onaylamak için öğrencinin okul numarasını yazın:',
      placeholder: s.student_number,
      inputMatch: s.student_number,
      confirmText: 'Öğrenciyi Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (typed === null) return;
    setBusy(true);
    const res = await deleteStudent(s.id);
    setBusy(false);
    if (!res.ok) {
      setNotice({ kind: 'error', text: `Öğrenci silinemedi: ${res.error}` });
      return;
    }
    setNotice({ kind: 'ok', text: `${s.name} silindi.` });
    setEditingId(null);
    load();
  };

  return (
    <div className={`${styles.pageBody} ${styles.studentsPage}`}>
      {notice && (
        <div role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'error' ? styles.noticeError : styles.noticeOk}>
          {notice.kind === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{notice.text}</span>
          <button type="button" className={styles.noticeClose} onClick={() => setNotice(null)} aria-label="Bildirimi kapat"><X size={16} aria-hidden="true" /></button>
        </div>
      )}

      <div className={styles.pointsLayout}>
      <section className={styles.panel} aria-labelledby="student-list-title">
        <div className={styles.listToolbar}>
          <h2 id="student-list-title" className={styles.panelTitle}>Öğrenci listesi <span className={styles.countPill}>{visible.length}</span></h2>
          <label className={styles.searchField}>
            <Search size={18} aria-hidden="true" />
            <span className={styles.visuallyHidden}>Ad veya numara ara</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad veya numara ara" />
          </label>
          <div className={styles.pageClassField}>
            <span>Sınıf</span>
            <div style={{ flex: 1, minWidth: 150, maxWidth: 240 }}>
              <CustomSelect
                value={filterClass}
                onChange={(val) => setFilterClass(val)}
                options={[
                  ...(classNames.length > 1 ? [{ value: ALL, label: 'Tüm sınıflarım' }] : []),
                  ...classNames.map((c) => ({ value: c, label: c }))
                ]}
                placeholder="Sınıf seçin"
              />
            </div>
          </div>
          <StudentSortToggle />
        </div>

        {loading && <p className={styles.mutedText}>Öğrenciler yükleniyor…</p>}
        {loadError && <p role="alert" className={styles.noticeError}><AlertCircle size={18} aria-hidden="true" /><span>{loadError}</span></p>}
        {!loading && !loadError && visible.length === 0 && (
          <p className={styles.mutedText}>{q ? 'Aramaya uyan öğrenci yok.' : 'Bu sınıfta henüz öğrenci yok. Yukarıdaki "Öğrenci ekle" veya "Toplu ekle" ile başlayın.'}</p>
        )}

        <ul className={styles.studentCards}>
          {visible.map((s) => (
            <li key={s.id} className={styles.studentCard}>
              <div className={styles.studentCardHead}>
                <span className={styles.studentAvatar} aria-hidden="true">{s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}</span>
                <div className={styles.studentCardInfo}>
                  <strong>{s.name}</strong>
                  <span>No {s.student_number} · {s.class_name || 'Sınıf yok'} · {s.points} puan</span>
                </div>
                {editingId !== s.id && (
                  <button type="button" className={styles.secondary} onClick={() => startEdit(s)} aria-label={`${s.name} düzenle`}>
                    <Edit size={16} aria-hidden="true" />Düzenle
                  </button>
                )}
              </div>

              {editingId === s.id && (
                <StudentEditModal onClose={() => {
                  if (busy) return;
                  void closeEditor(s);
                }}>
                <header className={styles.studentModalHeader}>
                  <div><h2 id="student-edit-title">Öğrenciyi düzenle</h2><p>{s.name} · No {s.student_number}</p></div>
                  <button type="button" className={styles.secondary} disabled={busy} aria-label="Düzenlemeyi kapat" onClick={() => { void closeEditor(s); }}><X size={20} aria-hidden="true" /></button>
                </header>
                <div className={styles.studentModalBody}>
                  {notice && <p role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'error' ? styles.noticeError : styles.noticeOk}>{notice.text}</p>}
                <div className={`${styles.formGrid} ${styles.studentEditForm}`}>
                  <label className={styles.field}>Ad soyad
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </label>
                  <div className={styles.field}>
                    <label htmlFor={`edit-class-${s.id}`}>Sınıf</label>
                    {classSelect(`edit-class-${s.id}`, editClass, setEditClass)}
                  </div>
                  <details className={styles.studentEditSection}>
                    <summary><Key size={16} aria-hidden="true" />Giriş PIN’ini sıfırla</summary>
                    <div className={styles.studentEditSectionBody}>
                    <p className={styles.mutedText}>Öğrencinin giriş yapması için yeni bir 4 haneli PIN belirleyin.</p>
                    <label htmlFor={`pin-${s.id}`}>Yeni PIN</label>
                    <div className={`${styles.inlineRow} ${styles.studentPinControls}`}>
                      <input id={`pin-${s.id}`} aria-label="Yeni PIN, 4 rakam" value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} autoComplete="off" placeholder="4 rakam" />
                      <button type="button" className={styles.secondary} disabled={busy} onClick={() => setEditPin(randomPin())}>PIN üret</button>
                      <button type="button" className={styles.secondary} disabled={busy || editPin.length !== 4} onClick={() => handleResetPin(s)}>PIN’i güncelle</button>
                    </div>
                    </div>
                  </details>
                </div>
                </div>
                <footer className={styles.studentModalFooter}>
                  <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => handleDelete(s)}><Trash2 size={16} aria-hidden="true" />Öğrenciyi sil</button>
                  <button type="button" className={styles.primary} disabled={busy || !editName.trim()} onClick={() => handleSaveEdit(s)}>{busy ? 'İşleniyor…' : 'Kaydet'}</button>
                </footer>
                </StudentEditModal>
              )}
            </li>
          ))}
        </ul>
      </section>

      <aside className={styles.pointsAside}>
      {isBulkOpen && <TeacherBulkStudents selectedClass={defaultClass} classNames={classNames} onClose={() => setIsBulkOpen(false)} onDone={load} />}

      <CollapsiblePanel title="Öğrenci ekle" summary={`Tekli veya toplu öğrenci ekleme (${classNames.join(', ')})`}>
        {!isAddOpen ? (
          <div className={styles.inlineRow}>
            <button type="button" className={styles.primary} onClick={() => { setIsAddOpen(true); setNotice(null); }}>
              <UserPlus size={18} aria-hidden="true" />Öğrenci ekle
            </button>
            {!isBulkOpen && (
              <button type="button" className={styles.secondary} onClick={() => { setIsBulkOpen(true); setNotice(null); }}>
                <Users size={18} aria-hidden="true" />Toplu ekle (liste yapıştır)
              </button>
            )}
          </div>
        ) : (
          <form className={styles.formGrid} onSubmit={handleAdd}>
            <h2 className={styles.panelTitle}>Yeni öğrenci</h2>
            <label className={styles.field}>Okul numarası
              <input value={newNo} onChange={(e) => setNewNo(e.target.value)} required inputMode="numeric" autoComplete="off" />
            </label>
            <label className={styles.field}>Ad soyad
              <input value={newName} onChange={(e) => setNewName(e.target.value)} required autoComplete="off" />
            </label>
            <div className={styles.field}>
              <label htmlFor="new-student-class">Sınıf</label>
              {classSelect('new-student-class', newClass, setNewClass)}
            </div>
            <div className={styles.field}>
              <label htmlFor="new-student-pin">Giriş PIN&apos;i (4 rakam)</label>
              <div className={styles.inlineRow}>
                <input id="new-student-pin" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" required />
                <button type="button" className={styles.secondary} onClick={() => setNewPin(randomPin())}>Yeni PIN üret</button>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.secondary} onClick={() => setIsAddOpen(false)}>Vazgeç</button>
              <button type="submit" className={styles.primary} disabled={adding}>{adding ? 'Ekleniyor…' : 'Öğrenciyi ekle'}</button>
            </div>
          </form>
        )}
        <p className={styles.hintText}>Öğrenciler yalnızca sizin sınıflarınıza ({classNames.join(', ')}) eklenebilir. Başka bir sınıf için &quot;Sınıflarım&quot; sayfasından o sınıfı ekleyin.</p>
      </CollapsiblePanel>
      </aside>
      </div>
    </div>
  );
}
