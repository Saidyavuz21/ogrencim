// ========================================================
// GÜVENLİK VE KVKK VERİLERİ
// Silinenler kutusu, işlem/erişim kayıtları, veri talepleri, dışa aktarma, veli rızası.
// Yetki kontrolleri veritabanında (supabase/migrations/20261109110000_*, 20261109120000_*).
// ========================================================

import { supabase } from './supabaseClient';
import type { Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'İşlem yapılamadı.',
});

/** Veli rızası metninin geçerli sürümü (aydınlatma metni değişince artırılır) */
export const CONSENT_VERSION = 'v1-2026-11';

// ---------------- Silinenler kutusu ----------------
export interface DeletedStudent {
  student_id: string;
  name: string;
  student_number: string;
  class_name: string | null;
  school_id: string | null;
  school_name: string | null;
  deleted_at: string;
  purge_after: string;
  deleted_by_name: string | null;
}

export async function listDeletedStudents(): Promise<Result<DeletedStudent[]>> {
  const { data, error } = await supabase.rpc('staff_deleted_students');
  if (error) return fail(error);
  return { ok: true, data: (data as DeletedStudent[]) || [] };
}

export async function restoreStudent(studentId: string): Promise<Result> {
  const { error } = await supabase.rpc('staff_restore_student', { p_student_id: studentId });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// ---------------- Erişim kaydı ----------------
export type AccessAction = 'profile' | 'report' | 'messages' | 'grades';

/** Personel bir öğrencinin verisini açtığında çağrılır (10 dakika içinde tekrarlar yazılmaz). Hata sessizce yutulur. */
export async function logStudentAccess(studentId: string, action: AccessAction): Promise<void> {
  try {
    await supabase.rpc('log_student_access', { p_student_id: studentId, p_action: action });
  } catch {
    /* kayıt yazılamazsa ekran çalışmaya devam eder */
  }
}

// ---------------- İşlem ve erişim kayıtları (admin / okul yöneticisi) ----------------
export interface AuditRow {
  id: number;
  at: string;
  actor_id: string | null;
  actor_kind: string;
  school_id: string | null;
  table_name: string;
  row_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'ERASE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export interface AccessRow {
  id: number;
  at: string;
  actor_id: string | null;
  actor_kind: string;
  school_id: string | null;
  student_id: string;
  action: string;
}

export const AUDIT_PAGE_SIZE = 50;

export async function listAuditLog(opts: { table?: string; action?: string; before?: number }): Promise<Result<AuditRow[]>> {
  let q = supabase.from('audit_log').select('*').order('id', { ascending: false }).limit(AUDIT_PAGE_SIZE);
  if (opts.table) q = q.eq('table_name', opts.table);
  if (opts.action) q = q.eq('action', opts.action);
  if (opts.before) q = q.lt('id', opts.before);
  const { data, error } = await q;
  if (error) return fail(error);
  return { ok: true, data: (data as AuditRow[]) || [] };
}

export async function listAccessLog(opts: { studentId?: string; before?: number }): Promise<Result<AccessRow[]>> {
  let q = supabase.from('access_log').select('*').order('id', { ascending: false }).limit(AUDIT_PAGE_SIZE);
  if (opts.studentId) q = q.eq('student_id', opts.studentId);
  if (opts.before) q = q.lt('id', opts.before);
  const { data, error } = await q;
  if (error) return fail(error);
  return { ok: true, data: (data as AccessRow[]) || [] };
}

/** Kayıtlardaki kişi kimliklerini ada çevirmek için: profil adları */
export async function profileNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', unique);
  const map: Record<string, string> = {};
  ((data as { id: string; full_name: string }[]) || []).forEach((p) => { map[p.id] = p.full_name; });
  return map;
}

// ---------------- Dışa aktarma ----------------
/** Öğrencinin bütün verisini JSON dosyası olarak indirir (KVKK bilgi talebi). */
export async function exportStudentData(studentId: string, fileLabel: string): Promise<Result> {
  const { data, error } = await supabase.rpc('staff_export_student', { p_student_id: studentId });
  if (error) return fail(error);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = fileLabel.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'ogrenci';
  a.href = url;
  a.download = `kvkk-veri-${safe}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, data: undefined };
}

// ---------------- Veri talepleri ----------------
export type DataRequestKind = 'export' | 'erase' | 'correct' | 'other';
export type DataRequestStatus = 'open' | 'done' | 'rejected';

export interface DataRequest {
  id: string;
  school_id: string | null;
  student_id: string | null;
  student_name: string;
  student_number: string | null;
  kind: DataRequestKind;
  requester_name: string;
  requester_contact: string | null;
  note: string | null;
  status: DataRequestStatus;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const REQUEST_KIND_LABEL: Record<DataRequestKind, string> = {
  export: 'Verilerin bir kopyası',
  erase: 'Verilerin silinmesi',
  correct: 'Verilerin düzeltilmesi',
  other: 'Diğer',
};

export async function listDataRequests(): Promise<Result<DataRequest[]>> {
  const { data, error } = await supabase.from('data_requests').select('*').order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as DataRequest[]) || [] };
}

export async function createDataRequest(input: {
  schoolId: string | null;
  studentId: string;
  studentName: string;
  studentNumber: string;
  kind: DataRequestKind;
  requesterName: string;
  requesterContact: string;
  note: string;
}): Promise<Result> {
  const { error } = await supabase.from('data_requests').insert({
    school_id: input.schoolId,
    student_id: input.studentId,
    student_name: input.studentName,
    student_number: input.studentNumber,
    kind: input.kind,
    requester_name: input.requesterName.trim(),
    requester_contact: input.requesterContact.trim() || null,
    note: input.note.trim() || null,
  });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function resolveDataRequest(id: string, status: DataRequestStatus, resolution: string): Promise<Result> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('data_requests')
    .update({
      status,
      resolution: resolution.trim() || null,
      resolved_at: status === 'open' ? null : new Date().toISOString(),
      resolved_by: status === 'open' ? null : auth.user?.id ?? null,
    })
    .eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/**
 * Kalıcı silme (unutulma hakkı): veritabanındaki bütün kayıtlar ve ödev dosyaları silinir. Geri alınamaz.
 * Depolamadaki dosyalar silinemezse uyarı döner (kayıtlar yine de silinmiştir).
 */
export async function eraseStudent(studentId: string, requestId?: string): Promise<Result<{ fileWarning?: string }>> {
  const { data, error } = await supabase.rpc('admin_erase_student', {
    p_student_id: studentId,
    p_request_id: requestId ?? null,
  });
  if (error) return fail(error);
  const res = (data || {}) as { bucket?: string; paths?: string[] };
  const paths = res.paths || [];
  if (!res.bucket || !paths.length) return { ok: true, data: {} };
  const { error: stErr } = await supabase.storage.from(res.bucket).remove(paths);
  return {
    ok: true,
    data: stErr ? { fileWarning: `Kayıtlar silindi ama ${paths.length} ödev dosyası depolamadan silinemedi: ${stErr.message}` } : {},
  };
}

// ---------------- Veli rızası ----------------
export interface ConsentRow {
  id: string;
  name: string;
  student_number: string;
  class_name: string | null;
  school_id: string | null;
  guardian_consent_at: string | null;
  guardian_consent_version: string | null;
}

export async function listConsents(): Promise<Result<ConsentRow[]>> {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, student_number, class_name, school_id, guardian_consent_at, guardian_consent_version')
    .order('class_name')
    .order('name');
  if (error) return fail(error);
  return { ok: true, data: (data as ConsentRow[]) || [] };
}

export async function setGuardianConsent(studentId: string, given: boolean): Promise<Result> {
  const { error } = await supabase.rpc('staff_set_guardian_consent', {
    p_student_id: studentId,
    p_given: given,
    p_version: CONSENT_VERSION,
  });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// ---------------- Tarayıcı hata kayıtları (yalnızca süper admin) ----------------
export interface ClientErrorRow {
  id: number;
  at: string;
  actor_kind: string | null;
  kind: 'error' | 'promise' | 'render';
  message: string;
  stack: string | null;
  path: string | null;
  user_agent: string | null;
}

export async function listClientErrors(before?: number): Promise<Result<ClientErrorRow[]>> {
  let q = supabase.from('client_errors').select('*').order('id', { ascending: false }).limit(AUDIT_PAGE_SIZE);
  if (before) q = q.lt('id', before);
  const { data, error } = await q;
  if (error) return fail(error);
  return { ok: true, data: (data as ClientErrorRow[]) || [] };
}
