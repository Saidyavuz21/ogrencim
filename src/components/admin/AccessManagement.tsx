'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Key, Trash2, UserPlus, Users, GraduationCap, AlertCircle, Edit } from '../icons';
import { TURKEY_CITIES, TEACHER_BRANCH_OPTIONS, composeClassName, parseClassName } from '../../data/portalData';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { SchoolPicker } from '../SchoolPicker';
import { StudentSchoolSelect } from '../StudentSchoolSelect';
import { SchoolManagement } from './SchoolManagement';
import {
  listProfiles,
  listPendingSchools,
  setTeacherApproved,
  setTeacherActive,
  updateTeacherProfile,
  deleteTeacher,
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

const SELECT_CLASS = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-slate-800';

/**
 * Hesap yönetimi (gerçek veritabanı):
 *  - Öğretmen hesaplarını onaylama/reddetme, düzenleme, pasif/aktif yapma, silme
 *  - Öğrenci ekleme (okul no + 4 haneli PIN), PIN sıfırlama, silme
 * PIN'ler veritabanında yalnızca hash olarak saklanır ve hiçbir yerde geri gösterilmez.
 */
export const AccessManagement: React.FC = () => {
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

  const handleDeleteTeacherAndRefreshSchools = () => setSchoolsRefreshKey((k) => k + 1);

  const handleToggleActive = async (p: ProfileRecord) => {
    const makeActive = !p.is_active;
    if (!makeActive && !window.confirm(`${displayName(p)} pasif yapılsın mı? Giriş yapamaz ve açık oturumu da hiçbir veriye erişemez.`)) return;
    setBusyId(p.id);
    const res = await setTeacherActive(p.id, makeActive);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'İşlem başarısız.');
    notify('ok', makeActive ? `${displayName(p)} yeniden aktif.` : `${displayName(p)} pasif yapıldı.`);
    refresh();
  };

  const handleDeleteTeacher = async (p: ProfileRecord) => {
    const action = p.approved ? 'kalıcı olarak silinsin' : 'başvurusu reddedilip silinsin';
    if (!window.confirm(`${displayName(p)} (${p.email}) hesabı ${action} mi? Bu işlem geri alınamaz.`)) return;
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

    notify('ok', `${newName.trim()} eklendi. PIN'i öğrenciye/veliye iletin; sistem PIN'i bir daha göstermez.`);
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
    if (!window.confirm(`"${s.name}" (${s.student_number}) öğrencisini ve tüm puan geçmişini silmek istediğinize emin misiniz?`)) return;
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
    return <div className="bg-white rounded-2xl p-6 border border-slate-200/90 text-xs text-slate-500">Hesaplar yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ÖĞRETMEN HESAPLARI */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Öğretmen Hesapları</h3>
        </div>
        <p className="text-xs text-slate-500">
          Öğretmenler giriş ekranındaki “Öğretmen Kaydı” ile kendileri kayıt olur. Onaylanmamış veya pasif hesaplar giriş yapamaz ve hiçbir veriye erişemez.
        </p>

        {pendingTeachers.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase text-amber-700">Onay bekleyen ({pendingTeachers.length})</span>
            {pendingTeachers.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 block truncate">{p.full_name || '(isimsiz)'}</span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {p.email} • {p.branch || 'Branş yok'} • {p.school_name || 'Okul yok'}
                    {p.district || p.city ? ` • ${[p.district, p.city].filter(Boolean).join('/')}` : ''}
                  </span>
                  {p.school_id && pendingSchoolIds.has(p.school_id) && (
                    <span className="mt-1 inline-block text-[10px] font-semibold px-1.5 rounded bg-amber-100 text-amber-800">
                      Yeni okul — aşağıdaki “Okullar” bölümünden onaylayın veya birleştirin
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleDeleteTeacher(p)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 text-slate-600 text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reddet
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleApprove(p)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Onayla
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {otherAccounts.length === 0 && <p className="text-xs text-slate-400 py-2">Henüz başka hesap yok.</p>}
          {otherAccounts.map((p) => {
            const isTeacher = p.role === 'ogretmen';
            const isBusy = busyId === p.id;
            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span className={`truncate ${isTeacher && !p.is_active ? 'text-slate-400 line-through' : ''}`}>{displayName(p)}</span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 rounded">
                      {p.role === 'admin' ? 'Admin' : 'Öğretmen'}
                    </span>
                    {isTeacher && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 rounded ${
                          p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {p.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {p.email}
                    {isTeacher && p.branch ? ` • ${p.branch}` : ''}
                    {isTeacher && p.school_name ? ` • ${p.school_name}` : ''}
                  </span>
                </div>
                {isTeacher && p.id !== myId && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-600 text-[11px] font-semibold cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Düzenle
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleActive(p)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border disabled:opacity-60 text-[11px] font-semibold cursor-pointer ${
                        p.is_active
                          ? 'border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {p.is_active ? 'Pasif yap' : 'Aktif yap'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeleteTeacher(p)}
                      aria-label={`${displayName(p)} hesabını sil`}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 text-slate-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Öğrenci & Veli Girişleri</h3>
        </div>
        <p className="text-xs text-slate-500">
          Öğrenci ve veli aynı okul numarası + 4 haneli PIN ile giriş yapar. 5 hatalı denemede hesap 15 dakika kilitlenir.
          PIN yalnızca şifrelenmiş saklanır; unutulursa buradan yenisi belirlenir.
        </p>

        <form onSubmit={handleCreateStudent} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <div className="col-span-2 sm:col-span-6">
            <StudentSchoolSelect value={newSchool} onChange={setNewSchool} disabled={busyId === 'new-student'} />
          </div>
          <input
            value={newNo}
            onChange={(e) => setNewNo(e.target.value)}
            placeholder="Okul No"
            aria-label="Okul numarası"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-slate-800"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ad Soyad"
            aria-label="Ad soyad"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-slate-800"
          />
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
                <label htmlFor={id} className="sr-only">{label}</label>
                {control}
              </div>
            )}
          />
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4 haneli PIN"
            aria-label="4 haneli PIN"
            inputMode="numeric"
            autoComplete="off"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:border-slate-800"
          />
          <button
            type="submit"
            disabled={busyId === 'new-student'}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Öğrenci Ekle
          </button>
        </form>

        <div className="divide-y divide-slate-100">
          {students.length === 0 && <p className="text-xs text-slate-400 py-2">Henüz kayıtlı öğrenci yok.</p>}
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-800 block truncate">{s.name}</span>
                <span className="text-[11px] text-slate-500 block truncate">
                  No: {s.student_number}
                  {s.class_name ? ` • ${s.class_name}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPinResetFor(s);
                    setResetPinValue('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-semibold cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" /> Yeni PIN
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => handleDeleteStudent(s)}
                  aria-label={`${s.name} öğrencisini sil`}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 text-slate-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ÖĞRETMEN DÜZENLEME MODALI */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Öğretmeni düzenle</h3>
              <button type="button" onClick={() => setEditing(null)} aria-label="Kapat" className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-500">{editing.email} (e-posta değiştirilemez)</p>

            {TEXT_FIELDS.map(([key, label]) => (
              <label key={key} className="block">
                <span className="font-semibold text-slate-700 block mb-1">{label}</span>
                <input
                  value={editForm[key]}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-slate-800"
                />
              </label>
            ))}

            <label className="block">
              <span className="font-semibold text-slate-700 block mb-1">Branş</span>
              <select
                value={editForm.branch}
                onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="">Seçiniz</option>
                {/* Listede olmayan eski bir branş kayıtlıysa onu da göster */}
                {editForm.branch && !TEACHER_BRANCH_OPTIONS.includes(editForm.branch) && (
                  <option value={editForm.branch}>{editForm.branch}</option>
                )}
                {TEACHER_BRANCH_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <ClassLevelSelects
                idPrefix="edit-teacher-class"
                level={editForm.class_level}
                section={editForm.class_section}
                onChange={({ level, section }) => setEditForm({ ...editForm, class_level: level, class_section: section })}
                allowEmpty
                emptyLabel="Sınıfı yok"
                selectClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="font-semibold text-slate-700 block mb-1">İl</span>
                <select
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm({ ...editForm, city: e.target.value, district: (TURKEY_CITIES[e.target.value] || [''])[0], school_id: '' })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="">Seçiniz</option>
                  {Object.keys(TURKEY_CITIES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 block mb-1">İlçe</span>
                <select
                  value={editForm.district}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value, school_id: '' })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="">Seçiniz</option>
                  {(TURKEY_CITIES[editForm.city] || (editForm.district ? [editForm.district] : [])).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <SchoolPicker
              idPrefix="edit-teacher"
              city={editForm.city}
              district={editForm.district}
              schoolId={editForm.school_id}
              newSchoolName=""
              currentSchoolName={editing.school_id === editForm.school_id ? editing.school_name : null}
              onChange={({ schoolId }) => setEditForm({ ...editForm, school_id: schoolId })}
              selectClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busyId === editing.id}
                className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PIN SIFIRLAMA MODALI */}
      {pinResetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <form onSubmit={handleResetPin} className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Yeni PIN belirle</h3>
            <p className="text-xs text-slate-600">
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
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:border-slate-800"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinResetFor(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={busyId === pinResetFor.id}
                className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
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
