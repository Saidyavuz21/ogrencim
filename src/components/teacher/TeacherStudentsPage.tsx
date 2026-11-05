'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, UserPlus, Users, Edit, Key, Trash2, X, AlertCircle, CheckCircle2 } from '../icons';
import { TeacherBulkStudents } from './TeacherBulkStudents';
import { CollapsiblePanel, StudentSortToggle, sortStudents, useStudentSort } from './TeacherUi';
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

export function TeacherStudentsPage({ selectedClass, classNames, onOpenClasses }: TeacherStudentsPageProps) {
  const defaultClass = classNames.includes(selectedClass) ? selectedClass : classNames[0] || '';
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
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required>
      {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
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
    setNotice({ kind: 'ok', text: `${newName.trim()} ${newClass} sınıfına eklendi. Giriş bilgisi: okul no ${newNo.trim()}, PIN ${newPin}. Bu PIN'i veliye iletin; daha sonra tekrar gösterilmez.` });
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
    const typed = window.prompt(
      `${s.name} (No ${s.student_number}) ve bütün kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\nOnaylamak için öğrencinin okul numarasını yazın:`
    );
    if (typed === null) return;
    if (typed.trim() !== s.student_number) {
      setNotice({ kind: 'error', text: 'Numara eşleşmedi, öğrenci silinmedi.' });
      return;
    }
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
          <label className={styles.pageClassField}>
            <span>Sınıf</span>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              {classNames.length > 1 && <option value={ALL}>Tüm sınıflarım</option>}
              {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
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
                <div className={`${styles.formGrid} ${styles.studentEditForm}`}>
                  <label className={styles.field}>Ad soyad
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </label>
                  <div className={styles.field}>
                    <label htmlFor={`edit-class-${s.id}`}>Sınıf</label>
                    {classSelect(`edit-class-${s.id}`, editClass, setEditClass)}
                  </div>
                  <div className={styles.formActions}>
                    <button type="button" className={styles.secondary} onClick={() => setEditingId(null)}>Vazgeç</button>
                    <button type="button" className={styles.primary} disabled={busy} onClick={() => handleSaveEdit(s)}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`pin-${s.id}`}>PIN sıfırla</label>
                    <div className={`${styles.inlineRow} ${styles.studentPinControls}`}>
                      <input id={`pin-${s.id}`} value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="4 rakam" />
                      <button type="button" className={styles.secondary} onClick={() => setEditPin(randomPin())}>Üret</button>
                      <button type="button" className={styles.primary} disabled={busy || editPin.length !== 4} onClick={() => handleResetPin(s)}><Key size={16} aria-hidden="true" />Değiştir</button>
                    </div>
                  </div>
                  <div className={`${styles.field} ${styles.fullRow}`}>
                    <span>Öğrenciyi sil</span>
                    <p className={styles.mutedText}>Nakil veya hatalı kayıt için. Öğrencinin puanları, notları, ödev kontrolleri ve veli mesajları da kalıcı olarak silinir.</p>
                    <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => handleDelete(s)}><Trash2 size={16} aria-hidden="true" />Öğrenciyi sil</button>
                  </div>
                </div>
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
