'use client';

import styles from './AdminManagement.module.css';
import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Key, Trash2, UserPlus, Users, GraduationCap, AlertCircle, Edit, FileText } from '../icons';
import { TURKEY_CITIES, TEACHER_BRANCH_OPTIONS, composeClassName, parseClassName } from '../../data/portalData';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { SchoolPicker } from '../SchoolPicker';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { StudentSchoolSelect } from '../StudentSchoolSelect';
import { SchoolManagement } from './SchoolManagement';
import {
  listProfiles,
  listPendingSchools,
  setTeacherApproved,
  setTeacherActive,
  updateTeacherProfile,
  deleteTeacher,
  getTeacherDocumentUrl,
  getLiveStudents,
  createStudent,
  resetStudentPin,
  deleteStudent,
  supabase,
  ProfileRecord,
  StudentRecord,
  SchoolRecord,
} from '../../lib/supabaseClient';

const isValidPin = (pin: string) => /^[0-9]{4}$/.test(pin);

const EMPTY_EDIT_FORM = {
  full_name: '',
  branch: '',
  school_id: '',
  city: '',
  district: '',
  class_level: '',
  class_section: '',
};

const TEXT_FIELDS = [['full_name', 'Ad Soyad']] as const;

const SELECT_CLASS = styles.input;

/**
 * Hesap yönetimi (gerçek veritabanı):
 *  - Öğretmen hesaplarını onaylama/reddetme, düzenleme, pasif/aktif yapma, silme
 *  - Öğrenci ekleme (okul no + 4 haneli PIN), PIN sıfırlama, silme
 * PIN'ler veritabanında yalnızca hash olarak saklanır ve hiçbir yerde geri gösterilmez.
 */
export const AccessManagement: React.FC = () => {
  const { confirm } = useDialog();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Yeni öğrenci formu
  const [newNo, setNewNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [newClassSection, setNewClassSection] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newSchool, setNewSchool] = useState<SchoolRecord | null>(null);

  // Öğretmen düzenleme
  const [editing, setEditing] = useState<ProfileRecord | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  // PIN sıfırlama
  const [pinResetFor, setPinResetFor] = useState<StudentRecord | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');

  // Okullar: bekleyen okul id'leri (öğretmen satırında "yeni okul" etiketi için) ve okul bölümü yenileme sayacı
  const [pendingSchoolIds, setPendingSchoolIds] = useState<Set<string>>(new Set());
  const [schoolsRefreshKey, setSchoolsRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    const [p, s, session, ps] = await Promise.all([
      listProfiles(),
      getLiveStudents(),
      supabase.auth.getSession(),
      listPendingSchools(),
    ]);
    setProfiles(p);
    setStudents(s);
    setPendingSchoolIds(new Set(ps.map((x) => x.id)));
    setMyId(session.data.session?.user.id ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // İlk yükleme: veriler geldikten sonra state güncellenir (efekt içinde senkron setState yok)
    queueMicrotask(refresh);
  }, [refresh]);

  const notify = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const displayName = (p: ProfileRecord) => p.full_name || p.email || 'Öğretmen';

  // ---------------- Öğretmen işlemleri ----------------
  const handleApprove = async (p: ProfileRecord) => {
    setBusyId(p.id);
    const res = await setTeacherApproved(p.id, true);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'İşlem başarısız.');
    const schoolNote = p.school_id && pendingSchoolIds.has(p.school_id) ? ' Okulu hâlâ onay bekliyor (Okullar bölümü).' : '';
    notify('ok', `${displayName(p)} onaylandı; artık giriş yapabilir.${schoolNote}`);
    refresh();
  };

  const handleViewDocument = async (p: ProfileRecord) => {
    if (!p.verification_doc) return;
    // Pencere tıklama anında açılır; await sonrası açılan pencereyi tarayıcı engelleyebilir
    const win = window.open('', '_blank');
    const url = await getTeacherDocumentUrl(p.verification_doc);
    if (!url) {
      win?.close();
      return notify('error', 'Belge açılamadı. Lütfen tekrar deneyin.');
    }
    if (win) {
      win.opener = null;
      win.location.href = url;
    } else {
      window.location.assign(url);
    }
  };

  const handleDeleteTeacherAndRefreshSchools = () => setSchoolsRefreshKey((k) => k + 1);

  const handleToggleActive = async (p: ProfileRecord) => {
    const makeActive = !p.is_active;
    if (!makeActive) {
      const ok = await confirm({
        title: 'Öğretmeni Pasife Al',
        message: `${displayName(p)} pasif yapılsın mı?\nGiriş yapamaz ve açık oturumu hiçbir veriye erişemez.`,
        confirmText: 'Pasif Yap',
        cancelText: 'Vazgeç',
        variant: 'warning',
      });
      if (!ok) return;
    }
    setBusyId(p.id);
    const res = await setTeacherActive(p.id, makeActive);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'İşlem başarısız.');
    notify('ok', makeActive ? `${displayName(p)} yeniden aktif.` : `${displayName(p)} pasif yapıldı.`);
    refresh();
  };

  const handleDeleteTeacher = async (p: ProfileRecord) => {
    const action = p.approved ? 'kalıcı olarak silinsin' : 'başvurusu reddedilip silinsin';
    const ok = await confirm({
      title: 'Öğretmen Hesabını Sil',
      message: `${displayName(p)} (${p.email}) hesabı ${action} mi?\nBu işlem geri alınamaz.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(p.id);
    const res = await deleteTeacher(p.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', `${displayName(p)} silindi.`);
    refresh();
    handleDeleteTeacherAndRefreshSchools();
  };

  const openEdit = (p: ProfileRecord) => {
    setEditing(p);
    const { level, section } = parseClassName(p.class_name);
    setEditForm({
      full_name: p.full_name || '',
      branch: p.branch || '',
      school_id: p.school_id || '',
      city: p.city || '',
      district: p.district || '',
      class_level: level,
      class_section: section,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.full_name.trim()) return notify('error', 'Ad soyad boş olamaz.');
    setBusyId(editing.id);
    const res = await updateTeacherProfile(editing.id, {
      full_name: editForm.full_name.trim(),
      branch: editForm.branch.trim() || null,
      school_id: editForm.school_id || null,
      city: editForm.city || null,
      district: editForm.district || null,
      class_name: composeClassName(editForm.class_level, editForm.class_section) || null,
    });
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Kaydedilemedi.');
    notify('ok', `${editForm.full_name.trim()} bilgileri güncellendi.`);
    setEditing(null);
    refresh();
  };

  // ---------------- Öğrenci işlemleri ----------------
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool) return notify('error', 'Lütfen öğrencinin okulunu seçiniz.');
    if (!newNo.trim() || !newName.trim()) return notify('error', 'Okul numarası ve ad soyad zorunludur.');
    if (!newClassLevel) return notify('error', 'Lütfen öğrencinin sınıf seviyesini seçiniz.');
    if (!isValidPin(newPin)) return notify('error', 'PIN tam olarak 4 rakam olmalıdır.');

    setBusyId('new-student');
    const res = await createStudent({
      studentNumber: newNo,
      name: newName,
      className: composeClassName(newClassLevel, newClassSection),
      pin: newPin,
      schoolId: newSchool.id,
    });
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Öğrenci eklenemedi.');

    notify('ok', `${newName.trim()} eklendi. PIN'i öğrenciye iletin; sistem PIN'i bir daha göstermez.`);
    setNewNo('');
    setNewName('');
    setNewPin('');
    refresh();
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetFor) return;
    if (!isValidPin(resetPinValue)) return notify('error', 'PIN tam olarak 4 rakam olmalıdır.');

    setBusyId(pinResetFor.id);
    const res = await resetStudentPin(pinResetFor.id, resetPinValue);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'PIN sıfırlanamadı.');

    notify('ok', `${pinResetFor.name} için yeni PIN kaydedildi; açık oturumları kapatıldı.`);
    setPinResetFor(null);
    setResetPinValue('');
  };

  const handleDeleteStudent = async (s: StudentRecord) => {
    const ok = await confirm({
      title: 'Öğrenciyi Sil',
      message: `"${s.name}" (${s.student_number}) öğrencisini ve tüm puan geçmişini silmek istediğinize emin misiniz?\nBu işlem geri alınamaz.`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(s.id);
    const res = await deleteStudent(s.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', `${s.name} silindi.`);
    refresh();
  };

  const pendingTeachers = profiles.filter((p) => p.role === 'ogretmen' && !p.approved);
  const otherAccounts = profiles
    .filter((p) => !(p.role === 'ogretmen' && !p.approved))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1));

  if (isLoading) {
    return <div className={styles.section}>Hesaplar yükleniyor...</div>;
  }

  return (
    <div className={styles.stack}>
      {message && (
        <div
          role="status"
          className={message.type === 'ok' ? styles.successNotice : styles.errorNotice}
        >
          {message.type === 'ok' ? <Check className={styles.icon} /> : <AlertCircle className={styles.icon} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ÖĞRETMEN HESAPLARI */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <Users className={styles.icon} />
          <h3 className={styles.sectionTitle}>Öğretmen Hesapları</h3>
        </div>
        <p className={styles.muted}>
          Öğretmenler giriş ekranındaki “Öğretmen Kaydı” ile kendileri kayıt olur. Onaylanmamış veya pasif hesaplar giriş yapamaz ve hiçbir veriye erişemez.
        </p>

        {pendingTeachers.length > 0 && (
          <div className={styles.formStack}>
            <span className={styles.pendingTitle}>Onay bekleyen ({pendingTeachers.length})</span>
            {pendingTeachers.map((p) => (
              <div key={p.id} className={styles.pendingRow}>
                <div className={styles.details}>
                  <span className={styles.name}>{p.full_name || '(isimsiz)'}</span>
                  <span className={styles.muted}>
                    {p.email} • {p.branch || 'Branş yok'} • {p.school_name || 'Okul yok'}
                    {p.district || p.city ? ` • ${[p.district, p.city].filter(Boolean).join('/')}` : ''}
                  </span>
                  {p.school_id && pendingSchoolIds.has(p.school_id) && (
                    <span className={styles.warningBadge}>
                      Yeni okul — aşağıdaki “Okullar” bölümünden onaylayın veya birleştirin
                    </span>
                  )}
                  {!p.verification_doc && (
                    <span className={styles.errorBadge}>
                      Belge yüklenmemiş
                    </span>
                  )}
                </div>
                <div className={styles.actions}>
                  {p.verification_doc && (
                    <button
                      type="button"
                      onClick={() => handleViewDocument(p)}
                      className={styles.button}
                    >
                      <FileText className={styles.icon} /> Belgeyi gör
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleDeleteTeacher(p)}
                    className={styles.danger}
                  >
                    <X className={styles.icon} /> Reddet
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleApprove(p)}
                    className={styles.primary}
                  >
                    <Check className={styles.icon} /> Onayla
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.list}>
          {otherAccounts.length === 0 && <p className={styles.muted}>Henüz başka hesap yok.</p>}
          {otherAccounts.map((p) => {
            const isTeacher = p.role === 'ogretmen';
            const isBusy = busyId === p.id;
            return (
              <div key={p.id} className={styles.row}>
                <div className={styles.details}>
                  <span className={styles.identity}>
                    <span className={isTeacher && !p.is_active ? styles.inactiveName : styles.name}>{displayName(p)}</span>
                    <span className={styles.badge}>
                      {p.role === 'admin' ? 'Admin' : 'Öğretmen'}
                    </span>
                    {isTeacher && (
                      <span
                        className={p.is_active ? styles.activeBadge : styles.errorBadge}
                      >
                        {p.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    )}
                  </span>
                  <span className={styles.muted}>
                    {p.email}
                    {isTeacher && p.branch ? ` • ${p.branch}` : ''}
                    {isTeacher && p.school_name ? ` • ${p.school_name}` : ''}
                  </span>
                </div>
                {isTeacher && p.id !== myId && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openEdit(p)}
                      className={styles.button}
                    >
                      <Edit className={styles.icon} /> Düzenle
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleActive(p)}
                      className={styles.button}
                    >
                      {p.is_active ? 'Pasif yap' : 'Aktif yap'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeleteTeacher(p)}
                      aria-label={`${displayName(p)} hesabını sil`}
                      className={styles.danger}
                    >
                      <Trash2 className={styles.icon} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* OKULLAR */}
      <SchoolManagement notify={notify} onChanged={refresh} refreshKey={schoolsRefreshKey} />

      {/* ÖĞRENCİ HESAPLARI */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <GraduationCap className={styles.icon} />
          <h3 className={styles.sectionTitle}>Öğrenci Girişleri</h3>
        </div>
        <p className={styles.muted}>
          Öğrenciler okul numarası + 4 haneli PIN ile giriş yapar. 5 hatalı denemede hesap 15 dakika kilitlenir.
          PIN yalnızca şifrelenmiş saklanır; unutulursa buradan yenisi belirlenir.
        </p>

        <form onSubmit={handleCreateStudent} className={styles.studentForm}>
          <div className={styles.fullWidth}>
            <StudentSchoolSelect value={newSchool} onChange={setNewSchool} disabled={busyId === 'new-student'} />
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Okul numarası</span>
            <input
            value={newNo}
            onChange={(e) => setNewNo(e.target.value)}
            placeholder="Okul No"
            aria-label="Okul numarası"
            className={styles.input}
          />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Ad soyad</span>
            <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ad Soyad"
            aria-label="Ad soyad"
            className={styles.input}
          />
          </label>
          <ClassLevelSelects
            idPrefix="new-student-class"
            level={newClassLevel}
            section={newClassSection}
            onChange={({ level, section }) => {
              setNewClassLevel(level);
              setNewClassSection(section);
            }}
            emptyLabel="Sınıf seviyesi"
            selectClassName={SELECT_CLASS}
            renderField={({ id, label, control }) => (
              <div>
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
            placeholder="4 haneli PIN"
            aria-label="4 haneli PIN"
            inputMode="numeric"
            autoComplete="off"
            className={styles.input}
          />
          </label>
          <button
            type="submit"
            disabled={busyId === 'new-student'}
            className={styles.primary}
          >
            <UserPlus className={styles.icon} /> Öğrenci Ekle
          </button>
        </form>

        <div className={styles.list}>
          {students.length === 0 && <p className={styles.muted}>Henüz kayıtlı öğrenci yok.</p>}
          {students.map((s) => (
            <div key={s.id} className={styles.row}>
              <div className={styles.details}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.muted}>
                  No: {s.student_number}
                  {s.class_name ? ` • ${s.class_name}` : ''}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setPinResetFor(s);
                    setResetPinValue('');
                  }}
                  className={styles.button}
                >
                  <Key className={styles.icon} /> Yeni PIN
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => handleDeleteStudent(s)}
                  aria-label={`${s.name} öğrencisini sil`}
                  className={styles.danger}
                >
                  <Trash2 className={styles.icon} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ÖĞRETMEN DÜZENLEME MODALI */}
      {editing && (
        <div className={styles.backdrop}>
          <form onSubmit={handleSaveEdit} className={styles.dialog}>
            <div className={styles.between}>
              <h3 className={styles.sectionTitle}>Öğretmeni düzenle</h3>
              <button type="button" onClick={() => setEditing(null)} aria-label="Kapat" className={styles.muted}>
                <X className={styles.icon} />
              </button>
            </div>
            <p className={styles.muted}>{editing.email} (e-posta değiştirilemez)</p>

            {TEXT_FIELDS.map(([key, label]) => (
              <label key={key} className={styles.field}>
                <span className={styles.fieldLabel}>{label}</span>
                <input
                  value={editForm[key]}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  className={styles.input}
                />
              </label>
            ))}

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Branş</span>
              <CustomSelect
                value={editForm.branch}
                onChange={(val) => setEditForm({ ...editForm, branch: val })}
                options={[
                  ...(editForm.branch && !TEACHER_BRANCH_OPTIONS.includes(editForm.branch) ? [{ value: editForm.branch, label: editForm.branch }] : []),
                  ...TEACHER_BRANCH_OPTIONS.map((b) => ({ value: b, label: b }))
                ]}
                placeholder="Seçiniz"
              />
            </div>

            <div className={styles.pair}>
              <ClassLevelSelects
                idPrefix="edit-teacher-class"
                level={editForm.class_level}
                section={editForm.class_section}
                onChange={({ level, section }) => setEditForm({ ...editForm, class_level: level, class_section: section })}
                allowEmpty
                emptyLabel="Sınıfı yok"
                selectClassName={styles.input}
              />
            </div>

            <div className={styles.pair}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>İl</span>
                <CustomSelect
                  value={editForm.city}
                  onChange={(val) =>
                    setEditForm({ ...editForm, city: val, district: (TURKEY_CITIES[val] || [''])[0], school_id: '' })
                  }
                  options={Object.keys(TURKEY_CITIES).map((c) => ({ value: c, label: c }))}
                  placeholder="Seçiniz"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>İlçe</span>
                <CustomSelect
                  value={editForm.district}
                  onChange={(val) => setEditForm({ ...editForm, district: val, school_id: '' })}
                  options={(TURKEY_CITIES[editForm.city] || (editForm.district ? [editForm.district] : [])).map((d) => ({ value: d, label: d }))}
                  placeholder="Seçiniz"
                />
              </div>
            </div>

            <SchoolPicker
              idPrefix="edit-teacher"
              city={editForm.city}
              district={editForm.district}
              schoolId={editForm.school_id}
              newSchoolName=""
              currentSchoolName={editing.school_id === editForm.school_id ? editing.school_name : null}
              onChange={({ schoolId }) => setEditForm({ ...editForm, school_id: schoolId })}
              selectClassName={styles.input}
            />

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className={styles.button}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busyId === editing.id}
                className={styles.primary}
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PIN SIFIRLAMA MODALI */}
      {pinResetFor && (
        <div className={styles.backdrop}>
          <form onSubmit={handleResetPin} className={styles.dialog}>
            <h3 className={styles.sectionTitle}>Yeni PIN belirle</h3>
            <p className={styles.muted}>
              <strong>{pinResetFor.name}</strong> ({pinResetFor.student_number}) için yeni 4 haneli PIN. Eski PIN ve açık oturumlar geçersiz olur.
            </p>
            <input
              autoFocus
              value={resetPinValue}
              onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              aria-label="Yeni 4 haneli PIN"
              className={styles.pinInput}
            />
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => setPinResetFor(null)}
                className={styles.button}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busyId === pinResetFor.id}
                className={styles.primary}
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
