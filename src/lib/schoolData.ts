// Sınıf ve okul yapısı: ek gruplar ve katılım kodu, okul yöneticisi, kampüsler,
// okul alanı (okul şablonları / zümre klasörleri), sınıf grubunda kişi başına "okundu".
import { supabase, type ProfileRecord } from './supabaseClient';
import { safeFileName, type Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export const MAX_CLASS_NAME = 20;

// --------------------------------------------------------
// Grup üyeleri ve katılım kodu (öğretmen)
// --------------------------------------------------------
export interface MemberRow {
  student_id: string;
  class_name: string;
  status: 'pending' | 'approved';
  created_at: string;
  student: { id: string; name: string; student_number: string; class_name: string | null } | null;
}

export async function listClassMembers(className: string): Promise<Result<MemberRow[]>> {
  const { data, error } = await supabase
    .from('class_members')
    .select('student_id, class_name, status, created_at, student:students(id, name, student_number, class_name)')
    .eq('class_name', className)
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as unknown as MemberRow[]) || [] };
}

export async function addClassMember(studentId: string, className: string): Promise<Result> {
  const { error } = await supabase.from('class_members').insert({ student_id: studentId, class_name: className });
  if (error) return fail(error.code === '23505' ? { message: 'Öğrenci zaten bu grupta.' } : error);
  return { ok: true, data: undefined };
}

export async function approveClassMember(studentId: string, className: string): Promise<Result> {
  const { error } = await supabase.from('class_members').update({ status: 'approved' }).eq('student_id', studentId).eq('class_name', className);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function removeClassMember(studentId: string, className: string): Promise<Result> {
  const { error } = await supabase.from('class_members').delete().eq('student_id', studentId).eq('class_name', className);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Okuldaki öğrenciler arasında arama (gruba eklemek için) */
export async function searchSchoolStudents(query: string): Promise<Result<{ id: string; name: string; student_number: string; class_name: string | null }[]>> {
  const q = query.trim();
  if (q.length < 2) return { ok: true, data: [] };
  const safe = q.replace(/[%_,()]/g, ' ');
  const { data, error } = await supabase
    .from('students')
    .select('id, name, student_number, class_name')
    .or(`name.ilike.%${safe}%,student_number.ilike.${safe}%`)
    .order('name')
    .limit(20);
  if (error) return fail(error);
  return { ok: true, data: (data as { id: string; name: string; student_number: string; class_name: string | null }[]) || [] };
}

export async function getClassCode(className: string): Promise<string | null> {
  const { data } = await supabase.from('class_join_codes').select('code').eq('class_name', className).maybeSingle();
  return (data as { code: string } | null)?.code ?? null;
}

export async function createClassCode(className: string): Promise<Result<string>> {
  const { data, error } = await supabase.rpc('create_class_code', { p_class: className });
  if (error || !data) return fail(error);
  return { ok: true, data: String(data) };
}

export async function deleteClassCode(className: string): Promise<Result> {
  const { error } = await supabase.from('class_join_codes').delete().eq('class_name', className);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Kod gösterimi: ABCD-EFGH */
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

// --------------------------------------------------------
// Öğrenci: gruplarım
// --------------------------------------------------------
export interface MyGroupRow { class_name: string; status: 'pending' | 'approved'; created_at: string }

export async function listMyGroups(studentId: string): Promise<Result<MyGroupRow[]>> {
  const { data, error } = await supabase.from('class_members').select('class_name, status, created_at').eq('student_id', studentId).order('class_name');
  if (error) return fail(error);
  return { ok: true, data: (data as MyGroupRow[]) || [] };
}

export async function joinClassWithCode(code: string): Promise<Result<{ class_name: string; status: 'pending' | 'approved' }>> {
  const { data, error } = await supabase.rpc('join_class_with_code', { p_code: code });
  if (error || !data) return fail(error);
  // Geçersiz kod hata olarak değil, { error } olarak döner: deneme sayısı (hız sınırı) geri alınmasın diye
  const res = data as { class_name?: string; status?: 'pending' | 'approved'; error?: string };
  if (res.error || !res.class_name) return fail({ message: res.error || 'Bu kod geçersiz.' });
  return { ok: true, data: { class_name: res.class_name, status: res.status ?? 'pending' } };
}

export async function leaveGroup(studentId: string, className: string): Promise<Result> {
  return removeClassMember(studentId, className);
}

// --------------------------------------------------------
// Okul yöneticisi
// --------------------------------------------------------
export type SchoolTeacher = Pick<ProfileRecord, 'id' | 'full_name' | 'email' | 'branch' | 'class_name' | 'approved' | 'is_active' | 'verification_doc' | 'created_at'> & { is_school_admin: boolean };

export async function listSchoolTeachers(schoolId: string): Promise<Result<SchoolTeacher[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, branch, class_name, approved, is_active, verification_doc, created_at, is_school_admin')
    .eq('school_id', schoolId)
    .eq('role', 'ogretmen')
    .order('approved')
    .order('full_name');
  if (error) return fail(error);
  return { ok: true, data: (data as SchoolTeacher[]) || [] };
}

export async function setSchoolTeacherFlags(profileId: string, patch: { approved?: boolean; is_active?: boolean }): Promise<Result> {
  const { error, count } = await supabase.from('profiles').update(patch, { count: 'exact' }).eq('id', profileId);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Bu öğretmeni değiştirme yetkiniz yok.' };
  return { ok: true, data: undefined };
}

export interface SchoolClassRow { class_name: string; student_count: number; member_count: number; teachers: string[]; campus_id: string | null }

export async function listSchoolClasses(): Promise<Result<SchoolClassRow[]>> {
  const { data, error } = await supabase.rpc('school_classes_overview');
  if (error) return fail(error);
  return { ok: true, data: ((data as SchoolClassRow[]) || []).map((r) => ({ ...r, teachers: (r.teachers || []).filter(Boolean) })) };
}

/** Süper admin: öğretmeni okul yöneticisi yapar ya da kaldırır */
export async function adminSetSchoolAdmin(profileId: string, value: boolean): Promise<Result> {
  const { error } = await supabase.rpc('admin_set_school_admin', { p_profile_id: profileId, p_value: value });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Kampüsler
// --------------------------------------------------------
export interface CampusRow { id: string; name: string }

export async function listCampuses(): Promise<Result<CampusRow[]>> {
  const { data, error } = await supabase.from('school_campuses').select('id, name').order('name');
  if (error) return fail(error);
  return { ok: true, data: (data as CampusRow[]) || [] };
}

export async function createCampus(name: string): Promise<Result<CampusRow>> {
  const n = name.trim().slice(0, 80);
  if (!n) return { ok: false, error: 'Kampüs adı yazın.' };
  const { data, error } = await supabase.from('school_campuses').insert({ name: n }).select('id, name').single();
  if (error || !data) return fail(error?.code === '23505' ? { message: 'Bu adla bir kampüs zaten var.' } : error);
  return { ok: true, data: data as CampusRow };
}

export async function renameCampus(id: string, name: string): Promise<Result> {
  const n = name.trim().slice(0, 80);
  if (!n) return { ok: false, error: 'Kampüs adı yazın.' };
  const { error } = await supabase.from('school_campuses').update({ name: n }).eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function deleteCampus(id: string): Promise<Result> {
  const { error } = await supabase.from('school_campuses').delete().eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Sınıfı kampüse bağlar (null = kampüssüz) */
export async function setClassCampus(schoolId: string, className: string, campusId: string | null): Promise<Result> {
  if (!campusId) {
    const { error } = await supabase.from('class_campuses').delete().eq('school_id', schoolId).eq('class_name', className);
    if (error) return fail(error);
    return { ok: true, data: undefined };
  }
  const { error } = await supabase.from('class_campuses').upsert({ school_id: schoolId, class_name: className, campus_id: campusId }, { onConflict: 'school_id,class_name' });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Okul alanı: okul şablonları ve zümre klasörleri
// --------------------------------------------------------
export type StaffScope = 'okul' | 'zumre';
export interface StaffShareRow {
  id: string;
  file_id: string;
  scope: StaffScope;
  subject: string | null;
  shared_by: string | null;
  shared_by_name: string;
  created_at: string;
  file: { id: string; name: string; path: string; size: number; mime: string; grade: string | null; subject: string | null; topic: string | null; tags: string[] } | null;
}

export async function listStaffShares(): Promise<Result<StaffShareRow[]>> {
  const { data, error } = await supabase
    .from('staff_shares')
    .select('id, file_id, scope, subject, shared_by, shared_by_name, created_at, file:teacher_files(id, name, path, size, mime, grade, subject, topic, tags)')
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: ((data as unknown as StaffShareRow[]) || []).filter((r) => r.file) };
}

export async function shareToSchool(fileId: string, scope: StaffScope, subject: string | null): Promise<Result<StaffShareRow>> {
  const { data, error } = await supabase
    .from('staff_shares')
    .insert({ file_id: fileId, scope, subject: scope === 'zumre' ? subject : null })
    .select('id, file_id, scope, subject, shared_by, shared_by_name, created_at, file:teacher_files(id, name, path, size, mime, grade, subject, topic, tags)')
    .single();
  if (error || !data) return fail(error?.code === '23505' ? { message: 'Bu dosya orada zaten paylaşılmış.' } : error);
  return { ok: true, data: data as unknown as StaffShareRow };
}

export async function removeStaffShare(id: string): Promise<Result> {
  const { error } = await supabase.from('staff_shares').delete().eq('id', id);
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Okul alanındaki bir dosyayı Dosyalarım'a kopyalar (kendi kotanıza sayılır) */
export async function copyStaffFileToMine(file: NonNullable<StaffShareRow['file']>): Promise<Result> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const to = `${auth.user.id}/${safeFileName(file.name)}`;
  const cp = await supabase.storage.from('teacher-files').copy(file.path, to);
  if (cp.error) return fail(cp.error);
  const { error } = await supabase.from('teacher_files').insert({
    name: file.name, path: to, size: file.size, mime: file.mime, grade: file.grade, subject: file.subject, topic: file.topic, tags: file.tags || [],
  });
  if (error) {
    await supabase.storage.from('teacher-files').remove([to]);
    return fail(error);
  }
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Sınıf grubu: kişi başına "okundu"
// --------------------------------------------------------
export async function markGroupRead(conversationId: string): Promise<void> {
  await supabase.rpc('mark_group_read', { p_conv: conversationId });
}

export interface ReadReceipt { student_id: string; name: string; last_read_at: string }
export async function listGroupReadReceipts(conversationId: string): Promise<Result<ReadReceipt[]>> {
  const { data, error } = await supabase.rpc('group_read_receipts', { p_conv: conversationId });
  if (error) return fail(error);
  return { ok: true, data: (data as ReadReceipt[]) || [] };
}
