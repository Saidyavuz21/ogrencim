// Öğrenci paneli veri katmanı (Supabase, öğrenci oturumu).
// Yetkiler RLS ile: öğrenci yalnızca kendi kayıtlarını ve kendi sınıfının ödevlerini görür.
import { supabase } from './supabaseClient';
import { listMyQuizzes, type MyQuizSummary } from './quizData';
import type { CheckStatus, ExamId, HomeworkAttachment, Result, SubmissionRow } from './teacherData';
import {
  SUBMISSION_BUCKET, SUBMISSION_COLUMNS, safeFileName, validateHomeworkFiles, verifyFileContents,
} from './teacherData';
import { compressImages } from './imageCompress';

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
    .eq('is_read', false)
    .is('deleted_at', null);
  if (error) return 0;
  return count || 0;
}

export interface MyHomework {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  due_date: string | null;
  /** İsteğe bağlı teslim saati 'SS:DD:ss' (boşsa gün sonu) */
  due_time: string | null;
  points: number;
  file_url: string | null;
  attachments: HomeworkAttachment[] | null;
  teacher_name: string;
  created_at: string;
  /** false = öğretmen sonucu henüz açıklamadı (kontrol satırı RLS ile gizli) */
  results_released: boolean;
  /** true = uygulamadan teslim istenir */
  accepts_submissions: boolean;
  closed_at: string | null;
  due_at: string | null;
  check: { status: CheckStatus; score: number | null; note: string | null } | null;
  submission: SubmissionRow | null;
  /** Ödevin verildiği sınıf ya da grup */
  class_name: string | null;
  /** Ödeve etkileşimli tahta bağlı */
  has_board: boolean;
  /** Quiz ise mod ve öğrencinin durumu */
  quiz_mode: 'practice' | 'exam' | null;
  quiz: MyQuizSummary | null;
}

/** Sınıfın ödevleri + bu öğrencinin kontrol sonucu */
export async function listMyHomeworks(studentId: string): Promise<Result<MyHomework[]>> {
  const [hw, checks, subs, quizzes] = await Promise.all([
    supabase
      .from('homeworks')
      .select('id, title, subject, description, due_date, due_time, points, file_url, attachments, teacher_name, created_at, results_released, accepts_submissions, closed_at, due_at, quiz_mode, class_name, has_board')
      .order('created_at', { ascending: false }),
    supabase.from('homework_checks').select('homework_id, status, score, note').eq('student_id', studentId),
    supabase.from('homework_submissions').select(SUBMISSION_COLUMNS).eq('student_id', studentId),
    listMyQuizzes(),
  ]);
  const quizByHw = new Map((quizzes.ok ? quizzes.data : []).map((q) => [q.homework_id, q]));
  if (hw.error) return fail(hw.error);
  if (checks.error) return fail(checks.error);
  // Teslim tablosu henüz kurulmamışsa ödevler yine görünsün
  const subsByHw = new Map(((subs.data as SubmissionRow[] | null) || []).map((r) => [r.homework_id, r]));
  const byHw = new Map(
    ((checks.data as { homework_id: string; status: CheckStatus; score: number | null; note: string | null }[]) || []).map((c) => [c.homework_id, c])
  );
  return {
    ok: true,
    data: ((hw.data as Omit<MyHomework, 'check' | 'submission' | 'quiz'>[]) || []).map((h) => {
      const c = byHw.get(h.id);
      return {
        ...h,
        check: c ? { status: c.status, score: c.score, note: c.note } : null,
        submission: subsByHw.get(h.id) ?? null,
        quiz: quizByHw.get(h.id) ?? null,
      };
    }),
  };
}

// --------------------------------------------------------
// Ödev teslimi (taslak → teslim). Kilit kuralları sunucuda: süre dolunca ya da teslimden sonra değişiklik reddedilir.
// --------------------------------------------------------
export const MAX_SUBMISSION_FILES = 3;
/** Teslim dosyası başına sınır (resimler önce küçültülür) */
export const MAX_SUBMISSION_FILE_BYTES = 5 * 1024 * 1024;

/** Taslağı getirir; yoksa oluşturur */
async function ensureDraft(homeworkId: string, studentId: string): Promise<Result<SubmissionRow>> {
  const found = await supabase
    .from('homework_submissions')
    .select(SUBMISSION_COLUMNS)
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (found.error) return fail(found.error);
  if (found.data) return { ok: true, data: found.data as SubmissionRow };
  const created = await supabase
    .from('homework_submissions')
    .insert({ homework_id: homeworkId, student_id: studentId })
    .select(SUBMISSION_COLUMNS)
    .single();
  if (created.error || !created.data) return fail(created.error);
  return { ok: true, data: created.data as SubmissionRow };
}

/** Dosyaları yükleyip taslağa ekler */
export async function addSubmissionFiles(homeworkId: string, studentId: string, picked: File[]): Promise<Result<SubmissionRow>> {
  if (!picked.length) return { ok: false, error: 'Dosya seçilmedi.' };
  const draft = await ensureDraft(homeworkId, studentId);
  if (!draft.ok) return draft;
  if (draft.data.status === 'teslim') return { ok: false, error: 'Ödev teslim edildi; dosya eklenemez.' };
  const existing = draft.data.files || [];
  if (existing.length + picked.length > MAX_SUBMISSION_FILES) {
    return { ok: false, error: `En fazla ${MAX_SUBMISSION_FILES} dosya eklenebilir (şu an ${existing.length}).` };
  }
  // Telefon fotoğrafları yüklenmeden önce küçültülür (konum vb. EXIF bilgisi de silinir)
  const rawError = validateHomeworkFiles(picked, { maxBytes: MAX_SUBMISSION_FILE_BYTES, maxCount: MAX_SUBMISSION_FILES, raw: true });
  if (rawError) return { ok: false, error: rawError };
  const files = await compressImages(picked);
  const sizeError = validateHomeworkFiles(files, { maxBytes: MAX_SUBMISSION_FILE_BYTES, maxCount: MAX_SUBMISSION_FILES });
  if (sizeError) return { ok: false, error: sizeError };
  const checked = await verifyFileContents(files);
  if (!checked.ok) return checked;

  const uploaded: HomeworkAttachment[] = [];
  for (const [i, file] of files.entries()) {
    const path = `${homeworkId}/${studentId}/${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, { contentType: checked.data[i], upsert: false });
    if (error) {
      if (uploaded.length) await supabase.storage.from(SUBMISSION_BUCKET).remove(uploaded.map((u) => u.path));
      return { ok: false, error: `"${file.name}" yüklenemedi: ${error.message}` };
    }
    uploaded.push({ path, name: file.name.slice(0, 120), size: file.size, type: checked.data[i] });
  }
  const { data, error } = await supabase
    .from('homework_submissions')
    .update({ files: [...existing, ...uploaded] })
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)
    .select(SUBMISSION_COLUMNS)
    .single();
  if (error || !data) {
    await supabase.storage.from(SUBMISSION_BUCKET).remove(uploaded.map((u) => u.path));
    return fail(error);
  }
  return { ok: true, data: data as SubmissionRow };
}

/** Taslaktan bir dosyayı çıkarır (kayıttan ve depodan) */
export async function removeSubmissionFile(homeworkId: string, studentId: string, current: SubmissionRow, path: string): Promise<Result<SubmissionRow>> {
  const { data, error } = await supabase
    .from('homework_submissions')
    .update({ files: (current.files || []).filter((f) => f.path !== path) })
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)
    .select(SUBMISSION_COLUMNS)
    .single();
  if (error || !data) return fail(error);
  // Kayıt güncellendiyse dosyayı da sil (silinemezse yalnızca depoda kalır, öğretmene görünmez)
  await supabase.storage.from(SUBMISSION_BUCKET).remove([path]);
  return { ok: true, data: data as SubmissionRow };
}

/** Taslağı kaydeder ya da teslim eder */
export async function saveSubmission(homeworkId: string, studentId: string, note: string, submit: boolean): Promise<Result<SubmissionRow>> {
  const draft = await ensureDraft(homeworkId, studentId);
  if (!draft.ok) return draft;
  const { data, error } = await supabase
    .from('homework_submissions')
    .update({ note: note.trim().slice(0, 500) || null, status: submit ? 'teslim' : 'taslak' })
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)
    .select(SUBMISSION_COLUMNS)
    .single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as SubmissionRow };
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
  author_id: string | null;
  /** null = bütün okullara duyuru */
  school_id: string | null;
  school_name: string | null;
}

/** Görebildiği duyurular (RLS: kendi okulu + bütün okullara olanlar; admin hepsi) */
export async function listAnnouncements(): Promise<Result<AnnouncementRow[]>> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, teacher_name, priority, created_at, author_id, school_id, schools(name)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return fail(error);
  type Row = Omit<AnnouncementRow, 'school_name'> & { schools: { name: string } | { name: string }[] | null };
  return {
    ok: true,
    data: ((data as unknown as Row[]) || []).map(({ schools, ...a }) => ({
      ...a,
      school_name: Array.isArray(schools) ? schools[0]?.name ?? null : schools?.name ?? null,
    })),
  };
}
