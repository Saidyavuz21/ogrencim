'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Key, Trash2, UserPlus, Users, GraduationCap, AlertCircle } from '../icons';
import {
  listProfiles,
  setTeacherApproved,
  getLiveStudents,
  createStudent,
  resetStudentPin,
  deleteStudent,
  supabase,
  ProfileRecord,
  StudentRecord,
} from '../../lib/supabaseClient';

const isValidPin = (pin: string) => /^[0-9]{4}$/.test(pin);

/**
 * Hesap yönetimi (gerçek veritabanı):
 *  - Öğretmen hesaplarını onaylama / yetkisini kaldırma
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
  const [newClass, setNewClass] = useState('');
  const [newPin, setNewPin] = useState('');

  // PIN sıfırlama
  const [pinResetFor, setPinResetFor] = useState<StudentRecord | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');

  const refresh = useCallback(async () => {
    const [p, s, session] = await Promise.all([listProfiles(), getLiveStudents(), supabase.auth.getSession()]);
    setProfiles(p);
    setStudents(s);
    setMyId(session.data.session?.user.id ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const notify = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleApprove = async (p: ProfileRecord, approved: boolean) => {
    setBusyId(p.id);
    const res = await setTeacherApproved(p.id, approved);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'İşlem başarısız.');
    notify('ok', approved ? `${p.full_name || p.email} onaylandı.` : `${p.full_name || p.email} hesabının yetkisi kaldırıldı.`);
    refresh();
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNo.trim() || !newName.trim()) return notify('error', 'Okul numarası ve ad soyad zorunludur.');
    if (!isValidPin(newPin)) return notify('error', 'PIN tam olarak 4 rakam olmalıdır.');

    setBusyId('new-student');
    const res = await createStudent({ studentNumber: newNo, name: newName, className: newClass, pin: newPin });
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

  const handleDelete = async (s: StudentRecord) => {
    if (!window.confirm(`"${s.name}" (${s.student_number}) öğrencisini ve tüm puan geçmişini silmek istediğinize emin misiniz?`)) return;
    setBusyId(s.id);
    const res = await deleteStudent(s.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', `${s.name} silindi.`);
    refresh();
  };

  const pendingTeachers = profiles.filter((p) => p.role === 'ogretmen' && !p.approved);
  const otherAccounts = profiles.filter((p) => !(p.role === 'ogretmen' && !p.approved));

  if (isLoading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-200/90 text-xs text-slate-500">Hesaplar yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
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
          Öğretmenler giriş ekranındaki “Öğretmen Kaydı” ile kendileri kayıt olur. Onaylamadığınız hesaplar giriş yapamaz ve hiçbir veriye erişemez.
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
                </div>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleApprove(p, true)}
                  className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Onayla
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {otherAccounts.length === 0 && <p className="text-xs text-slate-400 py-2">Henüz başka hesap yok.</p>}
          {otherAccounts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {p.full_name || p.email}{' '}
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 rounded">
                    {p.role === 'admin' ? 'Admin' : 'Öğretmen'}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 block truncate">{p.email}</span>
              </div>
              {p.role === 'ogretmen' && p.id !== myId && (
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => handleApprove(p, false)}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 text-slate-600 text-[11px] font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Yetkiyi kaldır
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

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

        <form onSubmit={handleCreateStudent} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input
            value={newNo}
            onChange={(e) => setNewNo(e.target.value)}
            placeholder="Okul No"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-slate-800"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ad Soyad"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-slate-800"
          />
          <input
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            placeholder="Sınıf (örn. 7-B)"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-slate-800"
          />
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4 haneli PIN"
            inputMode="numeric"
            autoComplete="off"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden focus:border-slate-800"
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
                  onClick={() => handleDelete(s)}
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
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:bg-white focus:outline-hidden focus:border-slate-800"
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
