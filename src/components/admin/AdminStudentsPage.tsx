'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { Key, Trash2, UserPlus, X, Eye, EyeOff } from '../icons';
import { composeClassName } from '../../data/portalData';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { CustomSelect } from '../CustomSelect';
import { StudentSchoolSelect } from '../StudentSchoolSelect';
import { useDialog } from '../ConfirmDialog';
import { createStudent, resetStudentPin, deleteStudent, listStudentPins, SchoolRecord } from '../../lib/supabaseClient';
import { AdminStudentRecord } from '../../lib/adminData';
import { AdminData, EmptyState, FilterBar, Notify, SearchInput, matchesQuery } from './adminShared';

interface Props {
  data: AdminData;
  notify: Notify;
}

const isValidPin = (pin: string) => /^[0-9]{4}$/.test(pin);
/** Sınıf adlarını doğal sırayla diz: 2-A, 3-A, 10-B */
const byClass = (a: string, b: string) => a.localeCompare(b, 'tr', { numeric: true });

/**
 * Öğrenciler: okul + sınıf filtresi, arama, ekleme, PIN yenileme, silme.
 * Giriş PIN'i hash ile doğrulanır; ayrıca şifreli saklanır ve "PIN'leri göster" ile admin tarafından görülebilir.
 */
export function AdminStudentsPage({ data, notify }: Props) {
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [className, setClassName] = useState('');

  // Ekleme formu
  const [formOpen, setFormOpen] = useState(false);
  const [newSchool, setNewSchool] = useState<SchoolRecord | null>(null);
  const [newNo, setNewNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newPin, setNewPin] = useState('');

  // PIN yenileme
  const [pinFor, setPinFor] = useState<AdminStudentRecord | null>(null);
  const [pinValue, setPinValue] = useState('');

  // Giriş PIN'leri: varsayılan gizli. Yalnızca "PIN'leri göster" ile istenir; her istek erişim kaydına yazılır.
  const [pins, setPins] = useState<Record<string, string | null>>({});
  const [showPins, setShowPins] = useState(false);
  useEffect(() => {
    if (!showPins) return;
    let alive = true;
    listStudentPins(data.students.map((st) => st.id)).then((res) => {
      if (!alive) return;
      if (res.ok) setPins(res.pins);
      else { setShowPins(false); notify('error', res.error); }
    });
    return () => { alive = false; };
  }, [data.students, showPins, notify]);

  const schoolOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.students.forEach((s) => { if (s.school_id) map.set(s.school_id, s.school_name || 'Adsız okul'); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'tr'));
  }, [data.students]);

  const inSchool = data.students.filter((s) => !schoolId || s.school_id === schoolId);
  const classOptions = [...new Set(inSchool.map((s) => s.class_name || ''))].filter(Boolean).sort(byClass);
  const filtered = inSchool.filter((s) =>
    (!className || s.class_name === className) && matchesQuery(query, s.name, s.student_number, s.class_name, s.school_name)
  );
  const showSchool = schoolOptions.length > 1;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool) return notify('error', 'Lütfen öğrencinin okulunu seçiniz.');
    if (!newNo.trim() || !newName.trim()) return notify('error', 'Okul numarası ve ad soyad zorunludur.');
    if (!newLevel) return notify('error', 'Lütfen öğrencinin sınıf seviyesini seçiniz.');
    if (!isValidPin(newPin)) return notify('error', 'PIN tam olarak 4 rakam olmalıdır.');

    setBusyId('new');
    const res = await createStudent({
      studentNumber: newNo,
      name: newName,
      className: composeClassName(newLevel, newSection),
      pin: newPin,
      schoolId: newSchool.id,
    });
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Öğrenci eklenemedi.');
    notify('ok', `${newName.trim()} eklendi. Giriş: okul no ${newNo.trim()}, PIN ${newPin}.`);
    setNewNo('');
    setNewName('');
    setNewPin('');
    data.refresh();
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinFor) return;
    if (!isValidPin(pinValue)) return notify('error', 'PIN tam olarak 4 rakam olmalıdır.');
    setBusyId(pinFor.id);
    const res = await resetStudentPin(pinFor.id, pinValue);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'PIN yenilenemedi.');
    notify('ok', `${pinFor.name} için yeni PIN: ${pinValue}. Açık oturumları kapatıldı.`);
    setPins((prev) => ({ ...prev, [pinFor.id]: pinValue }));
    setPinFor(null);
    setPinValue('');
  };

  const handleDelete = async (s: AdminStudentRecord) => {
    const ok = await confirm({
      title: 'Öğrenciyi Sil',
      message: `"${s.name}" (${s.student_number}) öğrencisini silmek istediğinize emin misiniz?\nÖğrenci 30 gün Silinenler sayfasında kalır; bu sürede puanları ve kayıtlarıyla geri alınabilir.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(s.id);
    const res = await deleteStudent(s.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', `${s.name} silindi. 30 gün içinde Silinenler sayfasından geri alabilirsiniz.`);
    data.refresh();
  };

  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-labelledby="add-student-title">
        <div className={styles.between}>
          <h2 id="add-student-title" className={styles.sectionTitle}>Öğrenci ekle</h2>
          <button type="button" className={formOpen ? styles.button : styles.primary} aria-expanded={formOpen} aria-controls="add-student-form" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? <><X className={styles.icon} /> Kapat</> : <><UserPlus className={styles.icon} /> Yeni öğrenci</>}
          </button>
        </div>
        <p className={styles.muted}>
          Öğrenci okul numarası ve 4 haneli PIN ile giriş yapar; 5 hatalı denemede hesap 15 dakika kilitlenir.
          Öğretmenler kendi sınıflarına öğrenciyi kendi panellerinden de ekleyebilir.
        </p>
        {formOpen && (
          <form id="add-student-form" onSubmit={handleCreate} className={styles.studentForm}>
            <div className={styles.fullWidth}>
              <StudentSchoolSelect value={newSchool} onChange={setNewSchool} disabled={busyId === 'new'} />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Okul numarası</span>
              <input value={newNo} onChange={(e) => setNewNo(e.target.value)} placeholder="Örn. 139" className={styles.input} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ad soyad</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ad Soyad" className={styles.input} />
            </label>
            <ClassLevelSelects
              idPrefix="admin-new-student-class"
              level={newLevel}
              section={newSection}
              onChange={({ level, section }) => { setNewLevel(level); setNewSection(section); }}
              emptyLabel="Sınıf seviyesi"
              selectClassName={styles.input}
              renderField={({ id, label, control }) => (
                <div className={styles.field}>
                  <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
                  {control}
                </div>
              )}
            />
            <label className={styles.field}>
              <span className={styles.fieldLabel}>4 haneli PIN</span>
              <input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                autoComplete="off"
                className={styles.input}
              />
            </label>
            <button type="submit" disabled={busyId === 'new'} className={styles.primary}>
              <UserPlus className={styles.icon} /> {busyId === 'new' ? 'Ekleniyor…' : 'Öğrenciyi ekle'}
            </button>
          </form>
        )}
      </section>

      <section className={styles.section} aria-labelledby="students-title">
        <h2 id="students-title" className={styles.sectionTitle}>
          Öğrenciler ({filtered.length === data.students.length ? data.students.length : `${filtered.length} / ${data.students.length}`})
        </h2>
        <FilterBar>
          <SearchInput id="student-search" value={query} onChange={setQuery} placeholder="Ad, okul numarası veya sınıf ara" />
          {showSchool && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={schoolId}
                onChange={(v) => { setSchoolId(v); setClassName(''); }}
                options={[{ value: '', label: 'Bütün okullar' }, ...schoolOptions.map(([id, name]) => ({ value: id, label: name }))]}
                placeholder="Okul"
              />
            </div>
          )}
          {data.students.length > 0 && (
            <button type="button" className={styles.button} aria-pressed={showPins} onClick={() => setShowPins((v) => !v)}>
              {showPins ? <EyeOff className={styles.icon} /> : <Eye className={styles.icon} />}
              {showPins ? "PIN'leri gizle" : "PIN'leri göster"}
            </button>
          )}
          {classOptions.length > 1 && (
            <div className={styles.filterSelect}>
              <CustomSelect
                value={className}
                onChange={setClassName}
                options={[{ value: '', label: 'Bütün sınıflar' }, ...classOptions.map((c) => ({ value: c, label: c }))]}
                placeholder="Sınıf"
              />
            </div>
          )}
        </FilterBar>

        {data.loading && <EmptyState>Öğrenciler yükleniyor…</EmptyState>}
        {!data.loading && data.students.length === 0 && <EmptyState>Henüz kayıtlı öğrenci yok.</EmptyState>}
        {!data.loading && data.students.length > 0 && filtered.length === 0 && <EmptyState>Aramanıza uyan öğrenci yok.</EmptyState>}

        {filtered.length > 0 && (
          <ul className={styles.list}>
            {filtered.map((s) => (
              <li key={s.id} className={styles.row}>
                <div className={styles.details}>
                  <span className={styles.name}>{s.name}</span>
                  <span className={styles.muted}>
                    {[`No ${s.student_number}`, s.class_name || 'Sınıfı yok', showSchool ? s.school_name : null, `${s.points} puan`].filter(Boolean).join(' • ')}
                  </span>
                  {showPins && (
                    <span className={pins[s.id] ? styles.pinShown : styles.pinUnknown}>PIN: {pins[s.id] || 'bilinmiyor'}</span>
                  )}
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => { setPinFor(s); setPinValue(''); }} className={styles.button}>
                    <Key className={styles.icon} /> Yeni PIN
                  </button>
                  <button type="button" disabled={busyId === s.id} onClick={() => handleDelete(s)} aria-label={`${s.name} öğrencisini sil`} className={styles.danger}>
                    <Trash2 className={styles.icon} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pinFor && (
        <div className={styles.backdrop}>
          <form onSubmit={handleResetPin} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="pin-title">
            <h3 id="pin-title" className={styles.sectionTitle}>Yeni PIN belirle</h3>
            <p className={styles.muted}>
              <strong>{pinFor.name}</strong> ({pinFor.student_number}) için yeni 4 haneli PIN. Eski PIN ve açık oturumlar geçersiz olur.
            </p>
            {pins[pinFor.id] && <p className={styles.muted}>Mevcut PIN: <strong>{pins[pinFor.id]}</strong></p>}
            <input
              autoFocus
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              aria-label="Yeni 4 haneli PIN"
              className={styles.pinInput}
            />
            <div className={styles.actions}>
              <button type="button" onClick={() => setPinFor(null)} className={styles.button}>Vazgeç</button>
              <button type="submit" disabled={busyId === pinFor.id} className={styles.primary}>Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
