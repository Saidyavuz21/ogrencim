'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './AdminManagement.module.css';
import { Key, Trash2, UserPlus, X, Eye, EyeOff, ArrowLeft, School, ChevronRight } from '../icons';
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
/** Sınıf adlarını doğal sırayla diz: 1-A, 2-A, 3-A, 10-B */
const byClass = (a: string, b: string) => a.localeCompare(b, 'tr', { numeric: true });

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/**
 * Öğrenciler: Katı Hiyerarşik Yapı (Okul ➔ Sınıf ➔ Öğrenci)
 * 1. Adım: Okul Seçimi (veya hızlı genel arama)
 * 2. Adım: Sınıf / Şube Seçimi
 * 3. Adım: Sınıfın Öğrenci Listesi, PIN Yönetimi ve İşlemler
 */
export function AdminStudentsPage({ data, notify }: Props) {
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Hiyerarşi durumu: Okul ➔ Sınıf ➔ Öğrenci
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);

  // Mod: 'hierarchy' (varsayılan katı hiyerarşi) veya 'quick_search' (tüm okullarda tek tıkla öğrenci bulma)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'quick_search'>('hierarchy');

  // Seviye 1 (Okul Seçimi) Filtreleri
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState('');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState<'all' | 'has_students' | 'no_students'>('all');
  const [schoolPage, setSchoolPage] = useState(1);
  const [schoolPageSize, setSchoolPageSize] = useState(15);

  // Seviye 3 (Öğrenci Listesi) Filtreleri
  const [studentQuery, setStudentQuery] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(25);

  // Hızlı Arama Sorgusu
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

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

  // Giriş PIN'leri: varsayılan gizli.
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

  // Onaylı okullar listesi
  const approvedSchools = useMemo(() => {
    return data.schools.filter((s) => s.status === 'approved');
  }, [data.schools]);

  // Her okulun öğrenci ve sınıf istatistikleri
  const schoolStats = useMemo(() => {
    const map: Record<string, { totalStudents: number; classes: Set<string> }> = {};
    data.students.forEach((st) => {
      if (!st.school_id) return;
      if (!map[st.school_id]) {
        map[st.school_id] = { totalStudents: 0, classes: new Set() };
      }
      map[st.school_id].totalStudents += 1;
      if (st.class_name) map[st.school_id].classes.add(st.class_name);
    });
    return map;
  }, [data.students]);

  // Mevcut ilçeler
  const availableDistricts = useMemo(() => {
    const set = new Set(approvedSchools.map((s) => s.district).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [approvedSchools]);

  // Seviye 1 Filtrelenmiş Okullar
  const filteredSchools = useMemo(() => {
    return approvedSchools.filter((s) => {
      if (schoolDistrictFilter && s.district !== schoolDistrictFilter) return false;
      const stats = schoolStats[s.id] || { totalStudents: 0, classes: new Set() };
      if (schoolStatusFilter === 'has_students' && stats.totalStudents === 0) return false;
      if (schoolStatusFilter === 'no_students' && stats.totalStudents > 0) return false;
      if (schoolQuery && !matchesQuery(schoolQuery, s.name, s.city, s.district)) return false;
      return true;
    }).sort((a, b) => {
      // Öğrencisi olan okulları en başta göster
      const countA = schoolStats[a.id]?.totalStudents || 0;
      const countB = schoolStats[b.id]?.totalStudents || 0;
      if (countA > 0 && countB === 0) return -1;
      if (countB > 0 && countA === 0) return 1;
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [approvedSchools, schoolDistrictFilter, schoolStatusFilter, schoolQuery, schoolStats]);

  // Seviye 1 Sayfalama
  const schoolTotalPages = Math.max(1, Math.ceil(filteredSchools.length / schoolPageSize));
  const schoolCurrentPage = Math.min(Math.max(1, schoolPage), schoolTotalPages);
  const schoolStartIndex = (schoolCurrentPage - 1) * schoolPageSize;
  const schoolEndIndex = Math.min(schoolStartIndex + schoolPageSize, filteredSchools.length);
  const paginatedSchools = filteredSchools.slice(schoolStartIndex, schoolEndIndex);

  // Seçilen Okul ve Seçilen Okulun Öğrencileri
  const selectedSchool = useMemo(() => {
    if (!selectedSchoolId) return null;
    return approvedSchools.find((s) => s.id === selectedSchoolId) || null;
  }, [approvedSchools, selectedSchoolId]);

  const schoolStudents = useMemo(() => {
    if (!selectedSchoolId) return [];
    return data.students.filter((st) => st.school_id === selectedSchoolId);
  }, [data.students, selectedSchoolId]);

  // Seviye 2: Seçilen Okulun Sınıfları
  const schoolClasses = useMemo(() => {
    const map = new Map<string, number>();
    schoolStudents.forEach((st) => {
      const cls = st.class_name || 'Sınıfsız';
      map.set(cls, (map.get(cls) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => byClass(a.name, b.name));
  }, [schoolStudents]);

  // Seviye 3: Seçilen Sınıfın Öğrencileri
  const classStudents = useMemo(() => {
    if (!selectedClassName) return [];
    return schoolStudents.filter((st) => (st.class_name || 'Sınıfsız') === selectedClassName);
  }, [schoolStudents, selectedClassName]);

  const filteredClassStudents = useMemo(() => {
    return classStudents.filter((st) => {
      if (!studentQuery) return true;
      return matchesQuery(studentQuery, st.name, st.student_number);
    });
  }, [classStudents, studentQuery]);

  // Seviye 3 Sayfalama
  const studentTotalPages = Math.max(1, Math.ceil(filteredClassStudents.length / studentPageSize));
  const studentCurrentPage = Math.min(Math.max(1, studentPage), studentTotalPages);
  const studentStartIndex = (studentCurrentPage - 1) * studentPageSize;
  const studentEndIndex = Math.min(studentStartIndex + studentPageSize, filteredClassStudents.length);
  const paginatedClassStudents = filteredClassStudents.slice(studentStartIndex, studentEndIndex);

  // Hızlı Arama Sonuçları (Tüm Okullar)
  const quickSearchResults = useMemo(() => {
    if (!quickSearchQuery.trim()) return [];
    return data.students.filter((st) => {
      return matchesQuery(quickSearchQuery, st.name, st.student_number, st.class_name, st.school_name);
    }).slice(0, 50);
  }, [data.students, quickSearchQuery]);

  // Formu geçerli hiyerarşi seviyesine göre akıllıca aç
  const handleOpenAddForm = () => {
    if (selectedSchool) {
      setNewSchool(selectedSchool);
    }
    if (selectedClassName && selectedClassName !== 'Sınıfsız') {
      const parts = selectedClassName.split('-');
      if (parts[0]) setNewLevel(parts[0]);
      if (parts[1]) setNewSection(parts[1]);
    }
    setFormOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchool = newSchool || selectedSchool;
    if (!targetSchool) return notify('error', 'Lütfen öğrencinin okulunu seçiniz.');
    if (!newNo.trim() || !newName.trim()) return notify('error', 'Okul numarası ve ad soyad zorunludur.');
    if (!newLevel) return notify('error', 'Lütfen öğrencinin sınıf seviyesini seçiniz.');
    if (!isValidPin(newPin)) return notify('error', 'PIN tam olarak 4 rakam olmalıdır.');

    setBusyId('new');
    const createdClassName = composeClassName(newLevel, newSection);
    const res = await createStudent({
      studentNumber: newNo,
      name: newName,
      className: createdClassName,
      pin: newPin,
      schoolId: targetSchool.id,
    });
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Öğrenci eklenemedi.');
    notify('ok', `${newName.trim()} eklendi. Giriş: okul no ${newNo.trim()}, PIN ${newPin}.`);
    setNewNo('');
    setNewName('');
    setNewPin('');
    // Eğer seviye 1'deysek ve eklediysek, o okula geç
    if (!selectedSchoolId) {
      setSelectedSchoolId(targetSchool.id);
      setSelectedClassName(createdClassName);
    } else if (!selectedClassName) {
      setSelectedClassName(createdClassName);
    }
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

  // Hiyerarşik navigasyon fonksiyonları
  const goToSchools = () => {
    setSelectedSchoolId(null);
    setSelectedClassName(null);
    setStudentQuery('');
  };

  const goToClasses = () => {
    setSelectedClassName(null);
    setStudentQuery('');
  };

  const jumpToStudentClass = (schoolId: string | null, className: string | null) => {
    if (!schoolId) return;
    setSelectedSchoolId(schoolId);
    setSelectedClassName(className || 'Sınıfsız');
    setViewMode('hierarchy');
    setQuickSearchQuery('');
  };

  return (
    <div className={styles.stack}>
      {/* =========================================================================
          EKLEME FORMU BÖLÜMÜ
         ========================================================================= */}
      <section className={styles.section} aria-labelledby="add-student-title">
        <div className={styles.between}>
          <h2 id="add-student-title" className={styles.sectionTitle}>
            {selectedClassName && selectedSchool
              ? `${selectedSchool.name} - ${selectedClassName} Sınıfına Öğrenci Ekle`
              : selectedSchool
              ? `${selectedSchool.name} Okuluna Öğrenci Ekle`
              : 'Öğrenci ekle'}
          </h2>
          <button
            type="button"
            className={formOpen ? styles.button : styles.primary}
            aria-expanded={formOpen}
            aria-controls="add-student-form"
            onClick={() => (formOpen ? setFormOpen(false) : handleOpenAddForm())}
          >
            {formOpen ? <><X className={styles.icon} /> Kapat</> : <><UserPlus className={styles.icon} /> Yeni öğrenci</>}
          </button>
        </div>
        <p className={styles.muted}>
          Öğrenci okul numarası ve 4 haneli PIN ile giriş yapar; 5 hatalı denemede hesap 15 dakika kilitlenir. Öğretmenler kendi
          sınıflarına öğrenciyi kendi panellerinden de ekleyebilir.
        </p>

        {formOpen && (
          <form id="add-student-form" onSubmit={handleCreate} className={styles.studentForm}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.fieldLabel}>Okul</span>
              {selectedSchool ? (
                <div className={styles.selectedContext}>
                  <span><strong>{selectedSchool.name}</strong> ({selectedSchool.district} / {selectedSchool.city})</span>
                  <button type="button" onClick={() => setNewSchool(null)} className={styles.button}>
                    Değiştir
                  </button>
                </div>
              ) : (
                <StudentSchoolSelect value={newSchool} onChange={setNewSchool} />
              )}
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

      {/* =========================================================================
          HİYERARŞİK NAVİGASYON VE İÇERİK BÖLÜMÜ
         ========================================================================= */}
      <section className={styles.section} aria-labelledby="students-hierarchy-title">
        {/* Mod Değiştirici: Hiyerarşik Gezinti vs Hızlı Arama */}
        <div className={styles.between} style={{ marginBottom: '14px' }}>
          <div className={styles.segmented} role="group" aria-label="Görüntüleme Modu">
            <button
              type="button"
              aria-pressed={viewMode === 'hierarchy'}
              onClick={() => setViewMode('hierarchy')}
            >
              Okul ve sınıf gezintisi
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'quick_search'}
              onClick={() => setViewMode('quick_search')}
            >
              Tüm öğrencilerde ara
            </button>
          </div>

          {selectedSchoolId && viewMode === 'hierarchy' && (
            <button type="button" onClick={goToSchools} className={styles.levelBackLink}>
              <ArrowLeft size={15} /> Tüm Okullara Dön
            </button>
          )}
        </div>

        {/* =========================================================================
            MOD 1: HIZLI ARAMA (Tüm Okullarda Arama)
           ========================================================================= */}
        {viewMode === 'quick_search' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <SearchInput
                id="quick-student-search"
                value={quickSearchQuery}
                onChange={setQuickSearchQuery}
                placeholder="Tüm okullarda öğrenci adı, okul numarası veya sınıf ara..."
              />
            </div>

            {quickSearchQuery.trim() === '' ? (
              <EmptyState>Tüm okullarda arama yapmak için yukarıya bir öğrenci adı veya okul numarası yazın.</EmptyState>
            ) : quickSearchResults.length === 0 ? (
              <EmptyState>&ldquo;{quickSearchQuery}&rdquo; aramasına uyan öğrenci bulunamadı.</EmptyState>
            ) : (
              <ul className={styles.list}>
                {quickSearchResults.map((s) => (
                  <li key={s.id} className={styles.row}>
                    <div className={styles.details}>
                      <span className={styles.name}>{s.name}</span>
                      <span className={styles.muted}>
                        No {s.student_number} • {s.class_name || 'Sınıfsız'} • {s.school_name || 'Okulsuz'} • {s.points} puan
                      </span>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => jumpToStudentClass(s.school_id, s.class_name)}
                        className={styles.button}
                        title="Bu öğrencinin okul ve sınıf sayfasına git"
                      >
                        Sınıfına Git <ChevronRight size={15} />
                      </button>
                      <button type="button" onClick={() => { setPinFor(s); setPinValue(''); }} className={styles.button}>
                        <Key className={styles.icon} /> PIN
                      </button>
                      <button type="button" disabled={busyId === s.id} onClick={() => handleDelete(s)} aria-label={`${s.name} sil`} className={styles.danger}>
                        <Trash2 className={styles.icon} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* =========================================================================
            MOD 2: KATI HİYERARŞİ (OKUL ➔ SINIF ➔ ÖĞRENCİ)
           ========================================================================= */}
        {viewMode === 'hierarchy' && (
          <>
            {/* Ekmek Kırıntısı (Breadcrumb) Navigasyonu */}
            <nav className={styles.hierarchyNav} aria-label="Hiyerarşik Gezinti">
              <button
                type="button"
                className={selectedSchoolId ? styles.hierarchyCrumb : styles.hierarchyCurrent}
                onClick={goToSchools}
              >
                <School size={16} /> Okullar ({approvedSchools.length})
              </button>

              {selectedSchool && (
                <>
                  <span className={styles.hierarchyDivider}>➔</span>
                  <button
                    type="button"
                    className={selectedClassName ? styles.hierarchyCrumb : styles.hierarchyCurrent}
                    onClick={goToClasses}
                  >
                    {selectedSchool.name} ({schoolStudents.length} öğrenci)
                  </button>
                </>
              )}

              {selectedClassName && (
                <>
                  <span className={styles.hierarchyDivider}>➔</span>
                  <span className={styles.hierarchyCurrent}>
                    {selectedClassName} Sınıfı ({classStudents.length} öğrenci)
                  </span>
                </>
              )}
            </nav>

            {/* -----------------------------------------------------------------------
                SEVİYE 1: OKUL SEÇİMİ (selectedSchoolId === null)
               ----------------------------------------------------------------------- */}
            {!selectedSchoolId && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <FilterBar>
                    <SearchInput
                      id="school-list-search"
                      value={schoolQuery}
                      onChange={(v) => { setSchoolQuery(v); setSchoolPage(1); }}
                      placeholder="Okul adı veya ilçe ara..."
                    />

                    {availableDistricts.length > 0 && (
                      <div className={styles.filterSelect}>
                        <CustomSelect
                          value={schoolDistrictFilter}
                          onChange={(v) => { setSchoolDistrictFilter(v); setSchoolPage(1); }}
                          options={[{ value: '', label: 'Tüm ilçeler' }, ...availableDistricts.map((d) => ({ value: d, label: d }))]}
                          placeholder="İlçe"
                        />
                      </div>
                    )}

                    <div className={styles.filterSelect}>
                      <CustomSelect
                        value={schoolStatusFilter}
                        onChange={(v) => { setSchoolStatusFilter(v as 'all' | 'has_students' | 'no_students'); setSchoolPage(1); }}
                        options={[
                          { value: 'all', label: 'Tüm Okullar' },
                          { value: 'has_students', label: 'Öğrencisi olanlar' },
                          { value: 'no_students', label: 'Öğrencisi olmayanlar' },
                        ]}
                        placeholder="Öğrenci durumu"
                      />
                    </div>

                    {(schoolQuery || schoolDistrictFilter || schoolStatusFilter !== 'all') && (
                      <button
                        type="button"
                        className={styles.clearFilterButton}
                        onClick={() => {
                          setSchoolQuery('');
                          setSchoolDistrictFilter('');
                          setSchoolStatusFilter('all');
                          setSchoolPage(1);
                        }}
                      >
                        <X size={15} /> Temizle
                      </button>
                    )}
                  </FilterBar>
                </div>

                {data.loading && <EmptyState>Okullar ve öğrenciler yükleniyor…</EmptyState>}
                {!data.loading && filteredSchools.length === 0 && (
                  <EmptyState>Aramanıza uyan okul bulunamadı.</EmptyState>
                )}

                {!data.loading && filteredSchools.length > 0 && (
                  <div>
                    {paginatedSchools.map((school) => {
                      const stats = schoolStats[school.id] || { totalStudents: 0, classes: new Set() };
                      const hasStudents = stats.totalStudents > 0;
                      return (
                        <button
                          key={school.id}
                          type="button"
                          className={styles.schoolRowClickable}
                          onClick={() => {
                            setSelectedSchoolId(school.id);
                            setSelectedClassName(null);
                          }}
                        >
                          <div className={styles.details}>
                            <span className={styles.name}>{school.name}</span>
                            <span className={styles.muted}>
                              {school.district} / {school.city} • {stats.classes.size} sınıf
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {hasStudents ? (
                              <span className={styles.schoolActiveBadge}>
                                {stats.totalStudents} öğrenci
                              </span>
                            ) : (
                              <span className={styles.schoolEmptyBadge}>
                                Öğrenci yok
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#25634b' }}>
                              Sınıflar <ChevronRight size={16} />
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Okul Sayfalama */}
                    {filteredSchools.length > schoolPageSize && (
                      <nav className={styles.pagination} aria-label="Okul seçimi sayfalama">
                        <div className={styles.paginationInfo}>
                          Toplam <strong>{filteredSchools.length}</strong> okuldan <strong>{schoolStartIndex + 1}–{schoolEndIndex}</strong> arası listeleniyor
                        </div>

                        <div className={styles.paginationControls}>
                          <div className={styles.pageSizeSelector}>
                            <label htmlFor="school-page-size-select">Sayfa başı:</label>
                            <CustomSelect id="school-page-size-select" className={styles.pageSizeSelect} value={String(schoolPageSize)} onChange={(value) => { setSchoolPageSize(Number(value)); setSchoolPage(1); }} options={[{ value: '10', label: '10' }, { value: '15', label: '15' }, { value: '25', label: '25' }, { value: '50', label: '50' }]} />
                          </div>

                          <button
                            type="button"
                            className={styles.pageButton}
                            disabled={schoolCurrentPage <= 1}
                            onClick={() => setSchoolPage((p) => Math.max(1, p - 1))}
                            aria-label="Önceki okul sayfası"
                          >
                            Önceki
                          </button>

                          {getPageNumbers(schoolCurrentPage, schoolTotalPages).map((p, idx) =>
                            p === '...' ? (
                              <span key={`dots-${idx}`} className={styles.pageDots}>…</span>
                            ) : (
                              <button
                                key={`page-${p}`}
                                type="button"
                                className={`${styles.pageButton} ${p === schoolCurrentPage ? styles.pageButtonActive : ''}`}
                                onClick={() => setSchoolPage(Number(p))}
                              >
                                {p}
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            className={styles.pageButton}
                            disabled={schoolCurrentPage >= schoolTotalPages}
                            onClick={() => setSchoolPage((p) => Math.min(schoolTotalPages, p + 1))}
                            aria-label="Sonraki okul sayfası"
                          >
                            Sonraki
                          </button>
                        </div>
                      </nav>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* -----------------------------------------------------------------------
                SEVİYE 2: SINIF SEÇİMİ (selectedSchoolId !== null && selectedClassName === null)
               ----------------------------------------------------------------------- */}
            {selectedSchool && !selectedClassName && (
              <div>
                <div className={styles.levelHeader}>
                  <div>
                    <h3 className={styles.sectionTitle} style={{ fontSize: '18px' }}>
                      {selectedSchool.name} — Sınıflar
                    </h3>
                    <span className={styles.muted}>
                      {selectedSchool.district} / {selectedSchool.city} • Toplam {schoolClasses.length} sınıfta {schoolStudents.length} kayıtlı öğrenci
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <button type="button" onClick={goToSchools} className={styles.levelBackLink}>
                      <ArrowLeft size={15} /> Okul Seçimine Dön
                    </button>
                    <button type="button" onClick={handleOpenAddForm} className={styles.primary}>
                      <UserPlus size={16} /> Bu Okula Öğrenci Ekle
                    </button>
                  </div>
                </div>

                {schoolClasses.length === 0 ? (
                  <EmptyState>
                    Bu okulda henüz kayıtlı öğrenci veya sınıf bulunmuyor.
                    <div style={{ marginTop: '12px' }}>
                      <button type="button" onClick={handleOpenAddForm} className={styles.primary}>
                        <UserPlus size={16} /> İlk Öğrenciyi Ekle
                      </button>
                    </div>
                  </EmptyState>
                ) : (
                  <div className={styles.classesGrid}>
                    {schoolClasses.map((cls) => (
                      <button
                        key={cls.name}
                        type="button"
                        className={styles.classCard}
                        onClick={() => setSelectedClassName(cls.name)}
                      >
                        <div className={styles.classCardLeft}>
                          <div className={styles.classBadgeBig}>
                            {cls.name}
                          </div>
                          <div className={styles.classMeta}>
                            <span className={styles.classTitle}>{cls.name} Şubesi</span>
                            <span className={styles.classCount}>{cls.count} Öğrenci</span>
                          </div>
                        </div>
                        <span className={styles.classArrow}>
                          <ChevronRight size={20} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* -----------------------------------------------------------------------
                SEVİYE 3: ÖĞRENCİ LİSTESİ (selectedSchoolId !== null && selectedClassName !== null)
               ----------------------------------------------------------------------- */}
            {selectedSchool && selectedClassName && (
              <div>
                <div className={styles.levelHeader}>
                  <div>
                    <h3 className={styles.sectionTitle} style={{ fontSize: '18px' }}>
                      {selectedClassName} Sınıfı Öğrencileri ({classStudents.length})
                    </h3>
                    <span className={styles.muted}>
                      {selectedSchool.name} • {selectedSchool.district} / {selectedSchool.city}
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <button type="button" onClick={goToClasses} className={styles.levelBackLink}>
                      <ArrowLeft size={15} /> Sınıflara Dön
                    </button>
                    <button type="button" onClick={handleOpenAddForm} className={styles.primary}>
                      <UserPlus size={16} /> {selectedClassName}&apos;ya Öğrenci Ekle
                    </button>
                  </div>
                </div>

                {/* Sınıf İçi Arama ve PIN Gösterim Butonu */}
                <div style={{ marginBottom: '16px' }}>
                  <FilterBar>
                    <SearchInput
                      id="class-student-search"
                      value={studentQuery}
                      onChange={(v) => { setStudentQuery(v); setStudentPage(1); }}
                      placeholder={`${selectedClassName} içinde öğrenci adı veya okul numarası ara...`}
                    />

                    {classStudents.length > 0 && (
                      <button
                        type="button"
                        className={styles.button}
                        aria-pressed={showPins}
                        onClick={() => setShowPins((v) => !v)}
                      >
                        {showPins ? <EyeOff className={styles.icon} /> : <Eye className={styles.icon} />}
                        {showPins ? "PIN'leri gizle" : "PIN'leri göster"}
                      </button>
                    )}

                    {studentQuery && (
                      <button
                        type="button"
                        className={styles.clearFilterButton}
                        onClick={() => setStudentQuery('')}
                      >
                        <X size={15} /> Temizle
                      </button>
                    )}
                  </FilterBar>
                </div>

                {filteredClassStudents.length === 0 ? (
                  <EmptyState>
                    {studentQuery ? 'Aramanıza uyan öğrenci bulunamadı.' : 'Bu sınıfta kayıtlı öğrenci yok.'}
                  </EmptyState>
                ) : (
                  <>
                    <ul className={styles.list}>
                      {paginatedClassStudents.map((s) => (
                        <li key={s.id} className={styles.row}>
                          <div className={styles.details}>
                            <span className={styles.name}>{s.name}</span>
                            <span className={styles.muted}>
                              No {s.student_number} • {s.points} puan
                            </span>
                            {showPins && (
                              <span className={pins[s.id] ? styles.pinShown : styles.pinUnknown}>
                                PIN: {pins[s.id] || 'bilinmiyor'}
                              </span>
                            )}
                          </div>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              onClick={() => { setPinFor(s); setPinValue(''); }}
                              className={styles.button}
                            >
                              <Key className={styles.icon} /> Yeni PIN
                            </button>
                            <button
                              type="button"
                              disabled={busyId === s.id}
                              onClick={() => handleDelete(s)}
                              aria-label={`${s.name} öğrencisini sil`}
                              className={styles.danger}
                            >
                              <Trash2 className={styles.icon} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Sınıf Öğrencileri Sayfalama */}
                    {filteredClassStudents.length > studentPageSize && (
                      <nav className={styles.pagination} aria-label="Sınıf öğrencileri sayfalama">
                        <div className={styles.paginationInfo}>
                          Toplam <strong>{filteredClassStudents.length}</strong> öğrenciden <strong>{studentStartIndex + 1}–{studentEndIndex}</strong> arası gösteriliyor
                        </div>

                        <div className={styles.paginationControls}>
                          <div className={styles.pageSizeSelector}>
                            <label htmlFor="student-page-size-select">Sayfa başı:</label>
                            <CustomSelect id="student-page-size-select" className={styles.pageSizeSelect} value={String(studentPageSize)} onChange={(value) => { setStudentPageSize(Number(value)); setStudentPage(1); }} options={[{ value: '15', label: '15' }, { value: '25', label: '25' }, { value: '50', label: '50' }]} />
                          </div>

                          <button
                            type="button"
                            className={styles.pageButton}
                            disabled={studentCurrentPage <= 1}
                            onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                            aria-label="Önceki öğrenci sayfası"
                          >
                            Önceki
                          </button>

                          {getPageNumbers(studentCurrentPage, studentTotalPages).map((p, idx) =>
                            p === '...' ? (
                              <span key={`std-dots-${idx}`} className={styles.pageDots}>…</span>
                            ) : (
                              <button
                                key={`std-page-${p}`}
                                type="button"
                                className={`${styles.pageButton} ${p === studentCurrentPage ? styles.pageButtonActive : ''}`}
                                onClick={() => setStudentPage(Number(p))}
                              >
                                {p}
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            className={styles.pageButton}
                            disabled={studentCurrentPage >= studentTotalPages}
                            onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                            aria-label="Sonraki öğrenci sayfası"
                          >
                            Sonraki
                          </button>
                        </div>
                      </nav>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* =========================================================================
          PIN YENİLEME MODALI
         ========================================================================= */}
      {pinFor && (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="reset-pin-title">
          <form onSubmit={handleResetPin} className={styles.dialog}>
            <div className={styles.between}>
              <h3 id="reset-pin-title" className={styles.sectionTitle}>Yeni PIN belirle</h3>
              <button type="button" onClick={() => setPinFor(null)} className={styles.iconButton} aria-label="Kapat">
                <X className={styles.icon} />
              </button>
            </div>
            <p className={styles.muted}>
              <strong>{pinFor.name}</strong> ({pinFor.student_number}) için yeni 4 haneli PIN yazın. Eski PIN geçersiz olur; açık oturumlar kapatılır.
            </p>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>4 haneli yeni PIN</span>
              <input
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                autoComplete="off"
                className={`${styles.input} ${styles.pinInput}`}
                autoFocus
              />
            </label>
            <div className={styles.actions}>
              <button type="button" onClick={() => setPinFor(null)} className={styles.button}>Vazgeç</button>
              <button type="submit" disabled={!isValidPin(pinValue) || busyId === pinFor.id} className={styles.primary}>
                {busyId === pinFor.id ? 'Kaydediliyor…' : 'PIN&apos;i güncelle'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
