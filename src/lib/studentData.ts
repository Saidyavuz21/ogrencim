// Öğrenci paneli veri katmanı (Supabase, öğrenci oturumu).
// Yetkiler RLS ile: öğrenci yalnızca kendi kayıtlarını ve kendi sınıfının ödevlerini görür.
import { supabase } from './supabaseClient';
import type { CheckStatus, ExamId, HomeworkAttachment, Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export interface MyStudent {
  id: string;
  student_number: string;
  name: string;
  class_name: string | null;
  school_id: string | null;
  school_name: string | null;
  points: number;
  plus_count: number;
  minus_count: number;
}

export async function getMyStudent(studentId: string): Promise<Result<MyStudent>> {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_number, name, class_name, school_id, points, plus_count, minus_count, schools(name)')
    .eq('id', studentId)
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return { ok: false, error: 'Öğrenci kaydı bulunamadı.' };
  const { schools, ...rest } = data as unknown as Omit<MyStudent, 'school_name'> & { schools: { name: string } | { name: string }[] | null };
  const school_name = Array.isArray(schools) ? schools[0]?.name ?? null : schools?.name ?? null;
  return { ok: true, data: { ...rest, school_name } };
}

/** Öğretmenlerden gelen, henüz okunmamış birebir mesaj sayısı (sınıf grubu herkesçe ortak okunduğu için sayılmaz) */
export async function countMyUnreadMessages(conversationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .in('sender_role', ['teacher', 'admin'])
    .eq('is_read', false);
  if (error) return 0;
  return count || 0;
}

export interface MyHomework {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  due_date: string | null;
  points: number;
  file_url: string | null;
  attachments: HomeworkAttachment[] | null;
  teacher_name: string;
  created_at: string;
  check: { status: CheckStatus; score: number | null; note: string | null } | null;
}

/** Sınıfın ödevleri + bu öğrencinin kontrol sonucu */
export async function listMyHomeworks(studentId: string): Promise<Result<MyHomework[]>> {
  const [hw, checks] = await Promise.all([
    supabase
      .from('homeworks')
      .select('id, title, subject, description, due_date, points, file_url, attachments, teacher_name, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('homework_checks').select('homework_id, status, score, note').eq('student_id', studentId),
  ]);
  if (hw.error) return fail(hw.error);
  if (checks.error) return fail(checks.error);
  const byHw = new Map(
    ((checks.data as { homework_id: string; status: CheckStatus; score: number | null; note: string | null }[]) || []).map((c) => [c.homework_id, c])
  );
  return {
    ok: true,
    data: ((hw.data as Omit<MyHomework, 'check'>[]) || []).map((h) => {
      const c = byHw.get(h.id);
      return { ...h, check: c ? { status: c.status, score: c.score, note: c.note } : null };
    }),
  };
}

export interface MyGrade {
  subject: string;
  exam: ExamId;
  score: number;
  updated_at: string;
}

export async function listMyGrades(studentId: string): Promise<Result<MyGrade[]>> {
  const { data, error } = await supabase
    .from('grades')
    .select('subject, exam, score, updated_at')
    .eq('student_id', studentId)
    .order('subject');
  if (error) return fail(error);
  return { ok: true, data: ((data as MyGrade[]) || []).map((g) => ({ ...g, score: Number(g.score) })) };
}

export interface MyPointRow {
  id: string;
  teacher_name: string;
  amount: number;
  reason: string;
  created_at: string;
}

export async function listMyPoints(studentId: string): Promise<Result<MyPointRow[]>> {
  const { data, error } = await supabase
    .from('points_history')
    .select('id, teacher_name, amount, reason, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return fail(error);
  return { ok: true, data: (data as MyPointRow[]) || [] };
}

export interface ClassmateRank {
  id: string;
  name: string;
  points: number;
}

/** Kendi sınıfının sıralaması (RLS: class_leaderboard yalnızca aynı sınıfı döndürür) */
export async function listMyClassRanking(): Promise<Result<ClassmateRank[]>> {
  const { data, error } = await supabase.rpc('class_leaderboard');
  if (error) return fail(error);
  return {
    ok: true,
    data: ((data as { id: string; name: string; points: number }[]) || []).map((s) => ({ id: s.id, name: s.name, points: s.points })),
  };
}

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  teacher_name: string;
  priority: 'normal' | 'urgent';
  created_at: string;
}

export async function listAnnouncements(): Promise<Result<AnnouncementRow[]>> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, teacher_name, priority, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return fail(error);
  return { ok: true, data: (data as AnnouncementRow[]) || [] };
}
