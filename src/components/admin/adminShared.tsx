'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './AdminManagement.module.css';
import { Check, X, AlertCircle } from '../icons';
import { TURKEY_CITIES, TEACHER_BRANCH_OPTIONS, composeClassName, parseClassName } from '../../data/portalData';
import { ClassLevelSelects } from '../ClassLevelSelects';
import { SchoolPicker } from '../SchoolPicker';
import { CustomSelect } from '../CustomSelect';
import { useDialog } from '../ConfirmDialog';
import { Spinner } from '../Spinner';
import {
  listProfiles,
  setTeacherApproved,
  setTeacherActive,
  updateTeacherProfile,
  deleteTeacher,
  getTeacherDocumentUrl,
  supabase,
  ProfileRecord,
  SchoolRecord,
} from '../../lib/supabaseClient';
import { adminListSchools, adminListStudents, AdminStudentRecord } from '../../lib/adminData';

// ---------------- Ortak veri ----------------
export interface AdminData {
  profiles: ProfileRecord[];
  students: AdminStudentRecord[];
  schools: SchoolRecord[];
  myId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Admin panelinin bütün sayfalarının paylaştığı veriler (tek yerden yüklenir) */
export function useAdminData(): AdminData {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [p, s, sc, session] = await Promise.all([
      listProfiles(),
      adminListStudents(),
      adminListSchools(),
      supabase.auth.getSession(),
    ]);
    setProfiles(p);
    setStudents(s);
    setSchools(sc);
    setMyId(session.data.session?.user.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  return { profiles, students, schools, myId, loading, refresh };
}

// ---------------- Bildirim ----------------
export type Notify = (type: 'ok' | 'error', text: string) => void;
export type AdminMessage = { type: 'ok' | 'error'; text: string } | null;

export function useNotify(): [AdminMessage, Notify, () => void] {
  const [message, setMessage] = useState<AdminMessage>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback<Notify>((type, text) => {
    setMessage({ type, text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 5000);
  }, []);
  const clear = useCallback(() => setMessage(null), []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [message, notify, clear];
}

export function AdminNotice({ message, onClose }: { message: AdminMessage; onClose: () => void }) {
  if (!message) return null;
  return (
    <div role="status" className={message.type === 'ok' ? styles.successNotice : styles.errorNotice}>
      {message.type === 'ok' ? <Check className={styles.icon} /> : <AlertCircle className={styles.icon} />}
      <span className={styles.noticeText}>{message.text}</span>
      <button type="button" className={styles.noticeClose} onClick={onClose} aria-label="Bildirimi kapat">
        <X className={styles.icon} />
      </button>
    </div>
  );
}

// ---------------- Yardımcılar ----------------
export const displayName = (p: ProfileRecord) => p.full_name || p.email || 'Öğretmen';

/** Türkçe karakterlere duyarlı, büyük/küçük harf bağımsız arama */
export const matchesQuery = (query: string, ...values: (string | null | undefined)[]) => {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  if (!q) return true;
  return values.some((v) => (v || '').toLocaleLowerCase('tr-TR').includes(q));
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------------- Öğretmen işlemleri ----------------
/** Onay, red/silme, pasif/aktif ve belge görüntüleme: başvurular ve öğretmenler sayfası ortak kullanır */
export function useTeacherActions(notify: Notify, refresh: () => Promise<void>, pendingSchoolIds: Set<string>) {
  const { confirm } = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);

  const approve = async (p: ProfileRecord) => {
    setBusyId(p.id);
    const res = await setTeacherApproved(p.id, true);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'İşlem başarısız.');
    const schoolNote = p.school_id && pendingSchoolIds.has(p.school_id) ? ' Okulu hâlâ onay bekliyor (Okul başvuruları).' : '';
    notify('ok', `${displayName(p)} onaylandı; artık giriş yapabilir.${schoolNote}`);
    refresh();
  };

  const remove = async (p: ProfileRecord) => {
    const action = p.approved ? 'kalıcı olarak silinsin' : 'başvurusu reddedilip silinsin';
    const ok = await confirm({
      title: p.approved ? 'Öğretmen Hesabını Sil' : 'Başvuruyu Reddet',
      message: `${displayName(p)} (${p.email}) hesabı ${action} mi?\nBu işlem geri alınamaz.`,
      confirmText: p.approved ? 'Evet, Sil' : 'Evet, Reddet',
      cancelText: 'Vazgeç',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(p.id);
    const res = await deleteTeacher(p.id);
    setBusyId(null);
    if (!res.ok) return notify('error', res.error || 'Silinemedi.');
    notify('ok', p.approved ? `${displayName(p)} silindi.` : `${displayName(p)} başvurusu reddedildi.`);
    refresh();
  };

  const toggleActive = async (p: ProfileRecord) => {
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

  const viewDocument = async (p: ProfileRecord) => {
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

  return { busyId, approve, remove, toggleActive, viewDocument };
}

// ---------------- Öğretmen düzenleme penceresi ----------------
export function TeacherEditDialog({ teacher, onClose, onSaved, notify }: {
  teacher: ProfileRecord;
  onClose: () => void;
  onSaved: () => void;
  notify: Notify;
}) {
  const { level, section } = parseClassName(teacher.class_name);
  const [form, setForm] = useState({
    full_name: teacher.full_name || '',
    branch: teacher.branch || '',
    school_id: teacher.school_id || '',
    city: teacher.city || '',
    district: teacher.district || '',
    class_level: level,
    class_section: section,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return notify('error', 'Ad soyad boş olamaz.');
    setBusy(true);
    const res = await updateTeacherProfile(teacher.id, {
      full_name: form.full_name.trim(),
      branch: form.branch.trim() || null,
      school_id: form.school_id || null,
      city: form.city || null,
      district: form.district || null,
      class_name: composeClassName(form.class_level, form.class_section) || null,
    });
    setBusy(false);
    if (!res.ok) return notify('error', res.error || 'Kaydedilemedi.');
    notify('ok', `${form.full_name.trim()} bilgileri güncellendi.`);
    onSaved();
  };

  return (
    <div className={styles.backdrop}>
      <form onSubmit={handleSave} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-teacher-title">
        <div className={styles.between}>
          <h3 id="edit-teacher-title" className={styles.sectionTitle}>Öğretmeni düzenle</h3>
          <button type="button" onClick={onClose} aria-label="Kapat" className={styles.iconButton}>
            <X className={styles.icon} />
          </button>
        </div>
        <p className={styles.muted}>{teacher.email} (e-posta değiştirilemez)</p>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Ad soyad</span>
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={styles.input} />
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Branş</span>
          <CustomSelect
            value={form.branch}
            onChange={(val) => setForm({ ...form, branch: val })}
            options={[
              ...(form.branch && !TEACHER_BRANCH_OPTIONS.includes(form.branch) ? [{ value: form.branch, label: form.branch }] : []),
              ...TEACHER_BRANCH_OPTIONS.map((b) => ({ value: b, label: b })),
            ]}
            placeholder="Seçiniz"
          />
        </div>

        <div className={styles.pair}>
          <ClassLevelSelects
            idPrefix="edit-teacher-class"
            level={form.class_level}
            section={form.class_section}
            onChange={({ level: l, section: s }) => setForm({ ...form, class_level: l, class_section: s })}
            allowEmpty
            emptyLabel="Sınıfı yok"
            selectClassName={styles.input}
          />
        </div>

        <div className={styles.pair}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>İl</span>
            <CustomSelect
              value={form.city}
              onChange={(val) => setForm({ ...form, city: val, district: (TURKEY_CITIES[val] || [''])[0], school_id: '' })}
              options={Object.keys(TURKEY_CITIES).map((c) => ({ value: c, label: c }))}
              placeholder="Seçiniz"
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>İlçe</span>
            <CustomSelect
              value={form.district}
              onChange={(val) => setForm({ ...form, district: val, school_id: '' })}
              options={(TURKEY_CITIES[form.city] || (form.district ? [form.district] : [])).map((d) => ({ value: d, label: d }))}
              placeholder="Seçiniz"
            />
          </div>
        </div>

        <SchoolPicker
          idPrefix="edit-teacher"
          city={form.city}
          district={form.district}
          schoolId={form.school_id}
          newSchoolName=""
          currentSchoolName={teacher.school_id === form.school_id ? teacher.school_name : null}
          onChange={({ schoolId }) => setForm({ ...form, school_id: schoolId })}
          selectClassName={styles.input}
        />

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.button}>Vazgeç</button>
          <button type="submit" disabled={busy} className={styles.primary}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Arama / filtre çubuğu ----------------
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className={styles.filterBar}>{children}</div>;
}

export function SearchInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className={styles.searchField} htmlFor={id}>
      <span className={styles.visuallyHidden}>Ara</span>
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={styles.input} autoComplete="off" />
    </label>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  if (typeof children === 'string' && children.toLocaleLowerCase('tr-TR').includes('yükleniyor')) {
    return <Spinner center label={children} />;
  }
  return <p className={styles.emptyState}>{children}</p>;
}
