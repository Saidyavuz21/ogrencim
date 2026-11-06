// Öğretmen paneli veri katmanı (Supabase). Tablo ve yetkiler:
// supabase/migrations/20261104120000_teacher_real_data.sql
import { supabase } from './supabaseClient';

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: { message: string } | null | undefined, fallback = 'Bilinmeyen hata'): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || fallback,
});

// --------------------------------------------------------
// Sınıflar
// --------------------------------------------------------
export interface TeacherClassRow {
  id: string;
  class_name: string;
  created_at: string;
}

export async function listMyClasses(): Promise<Result<TeacherClassRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('teacher_classes')
    .select('id, class_name, created_at')
    .eq('teacher_id', auth.user.id)
    .order('class_name');
  if (error) return fail(error);
  return { ok: true, data: (data as TeacherClassRow[]) || [] };
}

export async function addMyClass(className: string): Promise<Result> {
  const name = className.trim();
  if (!name) return { ok: false, error: 'Sınıf seçin.' };
  const { error } = await supabase.from('teacher_classes').insert({ class_name: name });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Bu sınıf zaten listenizde.' };
    return fail(error);
  }
  return { ok: true, data: undefined };
}

export async function removeMyClass(id: string): Promise<Result> {
  const { error, count } = await supabase.from('teacher_classes').delete({ count: 'exact' }).eq('id', id);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Sınıf silinemedi.' };
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Öğrenciler (sınıfa göre)
// --------------------------------------------------------
export interface ClassStudent {
  id: string;
  student_number: string;
  name: string;
  class_name: string;
  points: number;
  plus_count: number;
  minus_count: number;
}

export async function listClassStudents(className: string): Promise<Result<ClassStudent[]>> {
  if (!className) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('students')
    .select('id, student_number, name, class_name, points, plus_count, minus_count')
    .eq('class_name', className)
    .order('student_number');
  if (error) return fail(error);
  return { ok: true, data: (data as ClassStudent[]) || [] };
}

/** Sınıf akvaryumu için öğrenciler (class_leaderboard; balık/yumurta yalnızca puana göre) */
export interface AquariumStudent {
  id: string;
  name: string;
  points: number;
}

export async function listClassAquarium(className: string): Promise<Result<AquariumStudent[]>> {
  if (!className) return { ok: true, data: [] };
  const { data, error } = await supabase.rpc('class_leaderboard');
  if (error) return fail(error);
  const rows = (data as { id: string; name: string; class_name: string; points: number }[]) || [];
  return {
    ok: true,
    data: rows
      .filter((r) => r.class_name === className)
      .map((r) => ({ id: r.id, name: r.name, points: r.points ?? 0 })),
  };
}

// --------------------------------------------------------
// Puan (artı / eksi)
// --------------------------------------------------------
export async function givePoints(studentId: string, delta: number, reason: string): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('staff_give_points', {
    p_student_id: studentId,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) return fail(error);
  return { ok: true, data: data as number };
}

export interface PointHistoryRow {
  id: string;
  student_id: string;
  teacher_name: string;
  change_type: 'plus' | 'minus';
  amount: number;
  reason: string;
  created_at: string;
}

export async function listPointHistory(studentIds: string[], limit = 30): Promise<Result<PointHistoryRow[]>> {
  if (!studentIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('points_history')
    .select('id, student_id, teacher_name, change_type, amount, reason, created_at')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return fail(error);
  return { ok: true, data: (data as PointHistoryRow[]) || [] };
}

// --------------------------------------------------------
// Ödevler
// --------------------------------------------------------
export interface HomeworkRow {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  class_name: string | null;
  due_date: string | null;
  /** İsteğe bağlı teslim saati 'SS:DD:ss' (boşsa gün sonu) */
  due_time: string | null;
  points: number;
  file_url: string | null;
  attachments: HomeworkAttachment[] | null;
  teacher_id: string | null;
  teacher_name: string;
  created_at: string;
  /** false = "sonra açıkla": öğrenci kontrol sonucunu göremez, davranış puanı bekler */
  results_released: boolean;
  /** true = öğrenci uygulamadan dosya/açıklama ile teslim eder */
  accepts_submissions: boolean;
  /** Öğretmenin elle kapattığı an (null = açık) */
  closed_at: string | null;
  /** Kesin teslim anı (tarih + saat, sunucu hesaplar) */
  due_at: string | null;
}

/** Teslim alınıyor mu? (sunucudaki homework_is_open ile aynı kural; asıl kilit sunucuda) */
export function homeworkIsOpen(hw: { accepts_submissions: boolean; closed_at: string | null; due_at: string | null }, now = Date.now()) {
  return hw.accepts_submissions && !hw.closed_at && (!hw.due_at || new Date(hw.due_at).getTime() > now);
}

const HOMEWORK_COLUMNS = 'id, title, subject, description, class_name, due_date, due_time, points, file_url, attachments, teacher_id, teacher_name, created_at, results_released, accepts_submissions, closed_at, due_at';

export async function listMyHomeworks(className?: string): Promise<Result<HomeworkRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  let query = supabase.from('homeworks').select(HOMEWORK_COLUMNS).eq('teacher_id', auth.user.id);
  if (className) query = query.eq('class_name', className);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as HomeworkRow[]) || [] };
}

// --------------------------------------------------------
// Ödev dosyaları (Storage: homework-files, yol <okul|none>/<ödev>/<dosya>)
// --------------------------------------------------------
export const HOMEWORK_BUCKET = 'homework-files';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface HomeworkAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/**
 * Dosyanın gerçek türünü ilk baytlarından bulur (uzantısı/MIME'ı değiştirilmiş dosyaları yakalar).
 * Desteklenmeyen içerikte null döner.
 */
export async function detectFileType(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));
  if (ascii(0, 5) === '%PDF-') return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a) return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(brand)) return 'image/heif';
  }
  return null;
}

/** Dosyaların içeriğini doğrular; her dosyanın gerçek türünü (yükleme için) ya da hatayı döndürür */
export async function verifyFileContents(files: File[]): Promise<Result<string[]>> {
  const types: string[] = [];
  for (const f of files) {
    const type = await detectFileType(f).catch(() => null);
    if (!type) return { ok: false, error: `"${f.name}" geçerli bir PDF ya da resim değil (içeriği uzantısıyla uyuşmuyor ya da dosya bozuk).` };
    types.push(type);
  }
  return { ok: true, data: types };
}

/** Seçilen dosyaları denetler; hata varsa açıklamasını döndürür */
export function validateHomeworkFiles(files: File[]): string | null {
  for (const f of files) {
    if (!ALLOWED_FILE_TYPES.includes(f.type)) return `"${f.name}" desteklenmiyor. Yalnızca PDF ve resim (JPG, PNG, WEBP, HEIC) yüklenebilir.`;
    if (f.size > MAX_FILE_BYTES) return `"${f.name}" 10 MB'tan büyük (${formatBytes(f.size)}).`;
  }
  if (files.length > 5) return 'Bir ödeve en fazla 5 dosya eklenebilir.';
  return null;
}

export const safeFileName = (name: string) => {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'dosya';
  return `${Date.now().toString(36)}-${base}${ext}`;
};

/** Dosyaları yükler ve ödevin attachments alanına yazar */
async function uploadHomeworkFiles(homeworkId: string, files: File[]): Promise<Result<HomeworkAttachment[]>> {
  const checked = await verifyFileContents(files);
  if (!checked.ok) return checked;
  const schoolId = await getMySchoolId();
  const uploaded: HomeworkAttachment[] = [];
  for (const [i, file] of files.entries()) {
    const path = `${schoolId || 'none'}/${homeworkId}/${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(HOMEWORK_BUCKET).upload(path, file, { contentType: checked.data[i], upsert: false });
    if (error) {
      if (uploaded.length) await supabase.storage.from(HOMEWORK_BUCKET).remove(uploaded.map((u) => u.path));
      return { ok: false, error: `"${file.name}" yüklenemedi: ${error.message}` };
    }
    uploaded.push({ path, name: file.name.slice(0, 120), size: file.size, type: checked.data[i] });
  }
  const { error } = await supabase.from('homeworks').update({ attachments: uploaded }).eq('id', homeworkId);
  if (error) return fail(error);
  return { ok: true, data: uploaded };
}

/** Özel dosya için 10 dakikalık bağlantı üretir */
export async function getAttachmentUrl(path: string, bucket: string = HOMEWORK_BUCKET): Promise<Result<string>> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  if (error || !data) return fail(error);
  return { ok: true, data: data.signedUrl };
}

export async function createHomework(input: {
  title: string;
  subject: string;
  description: string;
  className: string;
  dueDate: string;
  /** İsteğe bağlı 'SS:DD' (yalnızca tarih seçiliyse) */
  dueTime?: string;
  points: number;
  link: string;
  files?: File[];
  /** false = sonuçlar öğretmen açıklayana kadar öğrenciden gizli (varsayılan: hemen göster) */
  resultsReleased?: boolean;
  /** true = öğrenci uygulamadan teslim eder */
  acceptsSubmissions?: boolean;
}): Promise<Result> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Ödev başlığı zorunludur.' };
  if (!input.className) return { ok: false, error: 'Sınıf seçin.' };
  const files = input.files || [];
  const fileError = validateHomeworkFiles(files);
  if (fileError) return { ok: false, error: fileError };
  // İçerik doğrulaması ödev kaydından önce (bozuk dosyada yarım ödev oluşmasın)
  const contents = await verifyFileContents(files);
  if (!contents.ok) return contents;
  const { data: created, error } = await supabase.from('homeworks').insert({
    title: title.slice(0, 200),
    subject: input.subject.trim().slice(0, 80) || 'Genel',
    description: input.description.trim().slice(0, 2000) || null,
    class_name: input.className,
    due_date: input.dueDate || null,
    due_time: input.dueDate && input.dueTime ? input.dueTime : null,
    points: input.points,
    file_url: input.link.trim() || null,
    file_type: files.length ? 'Dosya' : input.link.trim() ? 'Bağlantı' : 'Metin',
    results_released: input.resultsReleased ?? true,
    accepts_submissions: input.acceptsSubmissions ?? false,
    teacher_name: 'server',
  }).select('id').single();
  if (error || !created) return fail(error);
  if (files.length) {
    const up = await uploadHomeworkFiles((created as { id: string }).id, files);
    if (!up.ok) {
      // Dosyalar yüklenemediyse yarım ödev bırakma
      await supabase.from('homeworks').delete().eq('id', (created as { id: string }).id);
      return up;
    }
  }
  return { ok: true, data: undefined };
}

export async function deleteHomework(id: string, attachments: HomeworkAttachment[] = []): Promise<Result> {
  if (attachments.length) await supabase.storage.from(HOMEWORK_BUCKET).remove(attachments.map((a) => a.path));
  // Öğrenci teslim dosyaları (kayıtlar cascade ile silinir, dosyaları elle temizlenir)
  const subs = await supabase.from('homework_submissions').select('files').eq('homework_id', id);
  const subPaths = ((subs.data as { files: HomeworkAttachment[] }[] | null) || []).flatMap((r) => (r.files || []).map((f) => f.path));
  if (subPaths.length) await supabase.storage.from(SUBMISSION_BUCKET).remove(subPaths);
  const { error, count } = await supabase.from('homeworks').delete({ count: 'exact' }).eq('id', id);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Ödev silinemedi (yalnızca kendi ödevinizi silebilirsiniz).' };
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Ödev kontrolü
// --------------------------------------------------------
/** Kontrol sonuçlarını öğrenciye açıklar ya da yeniden gizler; açıklanınca bekleyen puanlar işlenir (veritabanı tetikleyicisi) */
export async function setHomeworkResultsReleased(id: string, released: boolean): Promise<Result> {
  const { error, count } = await supabase.from('homeworks').update({ results_released: released }, { count: 'exact' }).eq('id', id);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Ödev bulunamadı ya da bu ödevi değiştirme yetkiniz yok.' };
  return { ok: true, data: undefined };
}

/** Ödevi elle kapatır (öğrenci teslim/değişiklik yapamaz) ya da yeniden açar (teslim anı geçmediyse) */
export async function setHomeworkClosed(id: string, closed: boolean): Promise<Result> {
  const { error, count } = await supabase
    .from('homeworks')
    .update({ closed_at: closed ? new Date().toISOString() : null }, { count: 'exact' })
    .eq('id', id);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Ödev bulunamadı ya da bu ödevi değiştirme yetkiniz yok.' };
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Öğrenci teslimleri (Storage: homework-submissions, yol <ödev>/<öğrenci>/<dosya>)
// --------------------------------------------------------
export const SUBMISSION_BUCKET = 'homework-submissions';
export type SubmissionStatus = 'taslak' | 'teslim';

export interface SubmissionRow {
  homework_id: string;
  student_id: string;
  status: SubmissionStatus;
  files: HomeworkAttachment[];
  note: string | null;
  submitted_at: string | null;
  updated_at: string;
}

export const SUBMISSION_COLUMNS = 'homework_id, student_id, status, files, note, submitted_at, updated_at';

export async function listHomeworkSubmissions(homeworkId: string): Promise<Result<SubmissionRow[]>> {
  const { data, error } = await supabase.from('homework_submissions').select(SUBMISSION_COLUMNS).eq('homework_id', homeworkId);
  if (error) return fail(error);
  return { ok: true, data: (data as SubmissionRow[]) || [] };
}

/** Ödev başına teslim eden öğrenci sayısı (ödev listesindeki özet için) */
export async function countSubmitted(homeworkIds: string[]): Promise<Result<Record<string, number>>> {
  if (!homeworkIds.length) return { ok: true, data: {} };
  const { data, error } = await supabase
    .from('homework_submissions')
    .select('homework_id')
    .in('homework_id', homeworkIds)
    .eq('status', 'teslim');
  if (error) return fail(error);
  const out: Record<string, number> = {};
  ((data as { homework_id: string }[]) || []).forEach((r) => { out[r.homework_id] = (out[r.homework_id] || 0) + 1; });
  return { ok: true, data: out };
}

/** Teslimi öğrenciye iade eder (teslim → taslak); ödev açıksa öğrenci düzeltip yeniden teslim eder */
export async function returnSubmission(homeworkId: string, studentId: string): Promise<Result> {
  const { error, count } = await supabase
    .from('homework_submissions')
    .update({ status: 'taslak' }, { count: 'exact' })
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Teslim bulunamadı.' };
  return { ok: true, data: undefined };
}

export type CheckStatus = 'yapti' | 'kismen' | 'yapmadi';

export interface HomeworkCheckRow {
  homework_id: string;
  student_id: string;
  status: CheckStatus;
  score: number | null;
  note: string | null;
}

export async function listHomeworkChecks(homeworkId: string): Promise<Result<HomeworkCheckRow[]>> {
  const { data, error } = await supabase
    .from('homework_checks')
    .select('homework_id, student_id, status, score, note')
    .eq('homework_id', homeworkId);
  if (error) return fail(error);
  return { ok: true, data: (data as HomeworkCheckRow[]) || [] };
}

/** İşaretlenenleri kaydeder; işareti kaldırılan öğrencilerin kayıtlı kontrolünü siler */
export async function saveHomeworkChecks(rows: HomeworkCheckRow[], clear?: { homeworkId: string; studentIds: string[] }): Promise<Result> {
  if (clear?.studentIds.length) {
    const { error: delError } = await supabase
      .from('homework_checks')
      .delete()
      .eq('homework_id', clear.homeworkId)
      .in('student_id', clear.studentIds);
    if (delError) return fail(delError);
  }
  if (!rows.length) return { ok: true, data: undefined };
  const { error } = await supabase
    .from('homework_checks')
    .upsert(rows.map((r) => ({ ...r, note: r.note?.trim() || null, updated_at: new Date().toISOString() })), {
      onConflict: 'homework_id,student_id',
    });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Notlar
// --------------------------------------------------------
export const EXAMS = [
  { id: 'yazili1', label: '1. Yazılı' },
  { id: 'yazili2', label: '2. Yazılı' },
  { id: 'yazili3', label: '3. Yazılı' },
  { id: 'sozlu1', label: '1. Sözlü' },
  { id: 'sozlu2', label: '2. Sözlü' },
  { id: 'performans1', label: '1. Performans' },
  { id: 'performans2', label: '2. Performans' },
  { id: 'proje', label: 'Proje' },
] as const;
export type ExamId = (typeof EXAMS)[number]['id'];

export interface GradeRow {
  student_id: string;
  subject: string;
  exam: ExamId;
  score: number;
}

export async function listGrades(studentIds: string[], subject: string): Promise<Result<GradeRow[]>> {
  if (!studentIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('grades')
    .select('student_id, subject, exam, score')
    .in('student_id', studentIds)
    .eq('subject', subject);
  if (error) return fail(error);
  return { ok: true, data: ((data as GradeRow[]) || []).map((g) => ({ ...g, score: Number(g.score) })) };
}

/** Sınıftaki öğrencilerin tüm dersteki notları ("Öğrenci notları" sekmesi ve not girişi için) */
export async function listClassGrades(studentIds: string[]): Promise<Result<GradeRow[]>> {
  if (!studentIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('grades')
    .select('student_id, subject, exam, score')
    .in('student_id', studentIds);
  if (error) return fail(error);
  return { ok: true, data: ((data as GradeRow[]) || []).map((g) => ({ ...g, score: Number(g.score) })) };
}

/** Dolu notları kaydeder, boşaltılan notları siler */
export async function saveGrades(subject: string, upserts: GradeRow[], deletes: { student_id: string; exam: ExamId }[]): Promise<Result> {
  if (upserts.length) {
    const { error } = await supabase.from('grades').upsert(upserts, { onConflict: 'student_id,subject,exam' });
    if (error) return fail(error);
  }
  for (const d of deletes) {
    const { error } = await supabase.from('grades').delete().eq('student_id', d.student_id).eq('subject', subject).eq('exam', d.exam);
    if (error) return fail(error);
  }
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Mesajlar
//   ogr:<öğrenci id>              -> öğrenci ile öğretmenleri birebir
//   sinif:<okul id|none>:<sınıf>  -> sınıf grubu
// --------------------------------------------------------
export const studentConversationId = (studentId: string) => `ogr:${studentId}`;
/** Öğrenci tarafının mesajı mı? ('parent' eski kayıtlar için; migration sonrası yalnızca 'student') */
export const isFamilyRole = (role: string) => role === 'parent' || role === 'student';
export const classConversationId = (schoolId: string | null | undefined, className: string) =>
  `sinif:${schoolId || 'none'}:${className}`;

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'parent' | 'student' | 'teacher' | 'admin';
  content: string;
  is_read: boolean;
  created_at: string;
}

export async function getMySchoolId(): Promise<string | null> {
  const { data } = await supabase.rpc('my_school_id');
  return (data as string | null) ?? null;
}

export async function listMessages(conversationIds: string[]): Promise<Result<MessageRow[]>> {
  if (!conversationIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, sender_name, sender_role, content, is_read, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) return fail(error);
  return { ok: true, data: (data as MessageRow[]) || [] };
}

export async function sendMessage(conversationId: string, content: string): Promise<Result> {
  const text = content.trim();
  if (!text) return { ok: false, error: 'Mesaj boş olamaz.' };
  // Gönderen kimliği, rolü ve adı sunucuda (trigger) belirlenir
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: 'server',
    sender_name: 'server',
    sender_role: 'teacher',
    content: text.slice(0, 2000),
    message_type: 'text',
  });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------
// Duyurular: öğretmen kendi okuluna, süper admin bütün okullara ya da tek okula yazar.
// Yazar, yazar adı ve (öğretmen için) okul sunucuda atanır (announcements_set_author).
// --------------------------------------------------------
export async function createAnnouncement(
  title: string,
  content: string,
  priority: 'normal' | 'urgent',
  /** Yalnızca süper admin: null = bütün okullar. Öğretmende yok sayılır. */
  schoolId: string | null = null
): Promise<Result> {
  if (!title.trim() || !content.trim()) return { ok: false, error: 'Başlık ve metin zorunludur.' };
  const { error } = await supabase.from('announcements').insert({
    title: title.trim().slice(0, 200),
    content: content.trim().slice(0, 4000),
    priority,
    school_id: schoolId,
  });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function deleteAnnouncement(id: string): Promise<Result> {
  const { error, count } = await supabase.from('announcements').delete({ count: 'exact' }).eq('id', id);
  if (error) return fail(error);
  if (!count) return { ok: false, error: 'Duyuru silinemedi.' };
  return { ok: true, data: undefined };
}

/** Öğrencilerden gelen okunmamış mesaj sayısı (RLS: yalnızca erişilebilen konuşmalar) */
export async function countUnreadStudentMessages(): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('sender_role', ['parent', 'student'])
    .eq('is_read', false);
  return count || 0;
}

/** Sınıf başına öğrenci sayısı */
export async function countStudentsByClass(): Promise<Record<string, number>> {
  const { data } = await supabase.from('students').select('class_name');
  const counts: Record<string, number> = {};
  ((data as { class_name: string | null }[]) || []).forEach((r) => {
    const k = r.class_name || '';
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

/** Karşı tarafın mesajlarını okundu yapar (öğretmen: öğrenci mesajları, öğrenci: öğretmen mesajları) */
export async function markConversationRead(conversationId: string, reader: 'staff' | 'family' = 'staff'): Promise<void> {
  const fromRoles = reader === 'staff' ? ['parent', 'student'] : ['teacher', 'admin'];
  await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).in('sender_role', fromRoles).eq('is_read', false);
}
