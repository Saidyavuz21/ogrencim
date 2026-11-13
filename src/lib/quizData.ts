// Quiz motoru: soru bankası (öğretmen), quiz yayınlama, öğrencinin çözmesi ve sonuçlar.
// Doğru cevap öğrenciye asla gönderilmez: öğrenci soruları ve sonuçları yalnızca sunucu fonksiyonlarından alır.
import { supabase } from './supabaseClient';
import { compressImage, QUOTA_FULL_MESSAGE } from './imageCompress';
import { safeFileName, type Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message?.replace(/^.*?ERROR:\s*/, '') || 'Bilinmeyen hata',
});

export const QUIZ_IMAGE_BUCKET = 'quiz-images';
export const MAX_QUIZ_IMAGE_BYTES = 5 * 1024 * 1024;
export const QUIZ_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_CHOICES = 5;
export const MIN_CHOICES = 2;
export const PRACTICE_TRIES = 3;
export type QuizMode = 'practice' | 'exam';
export const QUIZ_MODE_LABEL: Record<QuizMode, string> = { practice: 'Alıştırma', exam: 'Sınav' };
/** Şık harfleri */
export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'];

// --------------------------------------------------------
// Soru bankası
// --------------------------------------------------------
export interface QuestionRow {
  id: string;
  body: string;
  image_path: string | null;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  grade: string | null;
  subject: string | null;
  topic: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}
const QUESTION_COLUMNS = 'id, body, image_path, choices, correct_index, explanation, grade, subject, topic, tags, created_at, updated_at';

export type QuestionInput = Omit<QuestionRow, 'id' | 'created_at' | 'updated_at'>;

export async function listQuestions(): Promise<Result<QuestionRow[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { data, error } = await supabase
    .from('quiz_questions')
    .select(QUESTION_COLUMNS)
    .eq('teacher_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return fail(error);
  return { ok: true, data: (data as QuestionRow[]) || [] };
}

/** Sorunun geçerli olup olmadığını denetler; sorun varsa açıklamasını döndürür */
export function validateQuestion(q: QuestionInput): string | null {
  if (!q.body.trim()) return 'Soru metnini yazın.';
  if (q.body.length > 2000) return 'Soru metni en fazla 2000 karakter olabilir.';
  const filled = q.choices.map((c) => c.trim());
  if (filled.length < MIN_CHOICES) return 'En az 2 şık gerekli.';
  if (filled.some((c) => !c)) return 'Boş şık bırakmayın (gerekmeyen şıkkı silin).';
  if (new Set(filled.map((c) => c.toLocaleLowerCase('tr-TR'))).size !== filled.length) return 'İki şık aynı olamaz.';
  if (q.correct_index < 0 || q.correct_index >= filled.length) return 'Doğru şıkkı işaretleyin.';
  return null;
}

export async function saveQuestion(id: string | null, q: QuestionInput): Promise<Result<QuestionRow>> {
  const problem = validateQuestion(q);
  if (problem) return { ok: false, error: problem };
  const row = {
    body: q.body.trim(),
    image_path: q.image_path,
    choices: q.choices.map((c) => c.trim()),
    correct_index: q.correct_index,
    explanation: q.explanation?.trim() || null,
    grade: q.grade || null,
    subject: q.subject || null,
    topic: q.topic?.trim() || null,
    tags: q.tags,
  };
  const query = id
    ? supabase.from('quiz_questions').update(row).eq('id', id)
    : supabase.from('quiz_questions').insert(row);
  const { data, error } = await query.select(QUESTION_COLUMNS).single();
  if (error || !data) return fail(error);
  return { ok: true, data: data as QuestionRow };
}

/**
 * Soruyu siler. Görsel, yayınlanmış bir quizde kullanılmıyorsa ve başka soruda yoksa depodan da silinir
 * (yayınlanmış quizler sorunun kopyasını taşır; görseli kaybolmasın).
 */
export async function deleteQuestion(q: Pick<QuestionRow, 'id' | 'image_path'>): Promise<Result> {
  const { error } = await supabase.from('quiz_questions').delete().eq('id', q.id);
  if (error) return fail(error);
  if (q.image_path) await removeImageIfUnused(q.image_path);
  return { ok: true, data: undefined };
}

/**
 * Birden fazla soruyu (örneğin bir konudaki tüm soruları) topluca siler.
 */
export async function deleteQuestions(questions: Pick<QuestionRow, 'id' | 'image_path'>[]): Promise<Result> {
  if (questions.length === 0) return { ok: true, data: undefined };
  const ids = questions.map((q) => q.id);
  const { error } = await supabase.from('quiz_questions').delete().in('id', ids);
  if (error) return fail(error);
  const imagePaths = Array.from(new Set(questions.map((q) => q.image_path).filter((p): p is string => Boolean(p))));
  await Promise.all(imagePaths.map((p) => removeImageIfUnused(p)));
  return { ok: true, data: undefined };
}

async function removeImageIfUnused(path: string) {
  const [inItems, inQuestions] = await Promise.all([
    supabase.from('quiz_items').select('id').eq('image_path', path).limit(1),
    supabase.from('quiz_questions').select('id').eq('image_path', path).limit(1),
  ]);
  if (inItems.error || inQuestions.error) return;
  if ((inItems.data || []).length || (inQuestions.data || []).length) return;
  await supabase.storage.from(QUIZ_IMAGE_BUCKET).remove([path]);
}

/** Görsel yükler (yalnızca JPG, PNG, WEBP, GIF; 5 MB) ve yolunu döndürür */
export async function uploadQuizImage(original: File): Promise<Result<string>> {
  // Yüklemeden önce küçültülür (uzun kenar 1600 px); GIF olduğu gibi kalır
  const file = await compressImage(original);
  if (file.size > MAX_QUIZ_IMAGE_BYTES) return { ok: false, error: 'Görsel 5 MB’tan büyük olamaz.' };
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));
  const type = b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg'
    : b[0] === 0x89 && ascii(1, 4) === 'PNG' ? 'image/png'
    : ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' ? 'image/webp'
    : ascii(0, 4) === 'GIF8' ? 'image/gif' : null;
  if (!type) return { ok: false, error: 'Yalnızca JPG, PNG, WEBP ya da GIF görsel eklenebilir.' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const path = `${auth.user.id}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(QUIZ_IMAGE_BUCKET).upload(path, file, { contentType: type, upsert: false });
  if (error) return fail(/row-level security/i.test(error.message) ? { message: QUOTA_FULL_MESSAGE } : error);
  return { ok: true, data: path };
}

/** Dosyalarım ya da ortak kütüphanedeki bir resmi soru görseli olarak kopyalar */
export async function copyImageToQuiz(bucket: string, sourcePath: string, name: string): Promise<Result<string>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const path = `${auth.user.id}/${safeFileName(name)}`;
  const { error } = await supabase.storage.from(bucket).copy(sourcePath, path, { destinationBucket: QUIZ_IMAGE_BUCKET });
  if (error) return fail(error);
  return { ok: true, data: path };
}

/** Yeni seçilen ama kaydedilmeyen görseli temizler */
export async function discardQuizImage(path: string) {
  await removeImageIfUnused(path);
}

/** Görseller için kısa süreli bağlantılar (yol → adres); açılamayanlar atlanır */
export async function quizImageUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {};
  const { data } = await supabase.storage.from(QUIZ_IMAGE_BUCKET).createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  (data || []).forEach((d) => { if (d.signedUrl && d.path) out[d.path] = d.signedUrl; });
  return out;
}

// --------------------------------------------------------
// Yayınlama (ödev oluşturulduktan sonra soruları dondurarak ekler)
// --------------------------------------------------------
export async function addQuizItems(homeworkId: string, questionIds: string[]): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('quiz_add_items', { p_hw: homeworkId, p_question_ids: questionIds });
  if (error) return fail(error);
  return { ok: true, data: Number(data) || 0 };
}

// --------------------------------------------------------
// Öğretmen: sonuçlar
// --------------------------------------------------------
export interface QuizItemRow { id: string; position: number; body: string; choices: string[]; correct_index: number; image_path: string | null }
export interface QuizAttemptRow { student_id: string; started_at: string; finished_at: string | null; score: number; item_count: number }
export interface QuizAnswerRow { student_id: string; item_id: string; choice: number | null; tries: number; correct: boolean; points: number }
export interface QuizReport { items: QuizItemRow[]; attempts: QuizAttemptRow[]; answers: QuizAnswerRow[] }

/** Süresi dolduysa quizi kapatır (yarım kalanlar biter, girmeyenler "yapmadı"); tekrar çağrılırsa bir şey yapmaz */
export async function settleQuiz(homeworkId: string): Promise<void> {
  await supabase.rpc('quiz_settle', { p_hw: homeworkId });
}

export async function getQuizReport(homeworkId: string): Promise<Result<QuizReport>> {
  const [items, attempts, answers] = await Promise.all([
    supabase.from('quiz_items').select('id, position, body, choices, correct_index, image_path').eq('homework_id', homeworkId).order('position'),
    supabase.from('quiz_attempts').select('student_id, started_at, finished_at, score, item_count').eq('homework_id', homeworkId),
    supabase.from('quiz_answers').select('student_id, item_id, choice, tries, correct, points').eq('homework_id', homeworkId),
  ]);
  if (items.error) return fail(items.error);
  if (attempts.error) return fail(attempts.error);
  if (answers.error) return fail(answers.error);
  return {
    ok: true,
    data: {
      items: (items.data as QuizItemRow[]) || [],
      attempts: ((attempts.data as QuizAttemptRow[]) || []).map((a) => ({ ...a, score: Number(a.score) })),
      answers: ((answers.data as QuizAnswerRow[]) || []).map((a) => ({ ...a, points: Number(a.points) })),
    },
  };
}

// --------------------------------------------------------
// Öğrenci
// --------------------------------------------------------
export interface QuizStateItem {
  id: string;
  position: number;
  body: string;
  image_path: string | null;
  choices: string[];
  /** Öğrencinin seçtiği (son) şık */
  choice: number | null;
  tries: number;
  /** Alıştırma: doğru bulundu ya da 3 deneme bitti */
  resolved: boolean;
  /** Yalnızca açıklanabiliyorsa dolu */
  correct: boolean | null;
  correct_index: number | null;
  explanation: string | null;
  points: number | null;
}
export interface QuizState {
  mode: QuizMode;
  open: boolean;
  due_at: string | null;
  started: boolean;
  finished: boolean;
  /** Bütün doğru cevaplar görünür mü */
  revealed: boolean;
  total: number;
  score: number | null;
  percent: number | null;
  items: QuizStateItem[];
}

export async function getQuizState(homeworkId: string): Promise<Result<QuizState>> {
  const { data, error } = await supabase.rpc('quiz_state', { p_hw: homeworkId });
  if (error || !data) return fail(error);
  const s = data as QuizState;
  return { ok: true, data: { ...s, score: s.score == null ? null : Number(s.score), items: s.items.map((i) => ({ ...i, points: i.points == null ? null : Number(i.points) })) } };
}

export interface PracticeAnswerResult {
  correct: boolean;
  tries: number;
  resolved: boolean;
  correct_index: number | null;
  explanation: string | null;
  points: number;
  finished: boolean;
}
export type AnswerResult = PracticeAnswerResult | { saved: true; choice: number };

export async function answerQuiz(homeworkId: string, itemId: string, choice: number): Promise<Result<AnswerResult>> {
  const { data, error } = await supabase.rpc('quiz_answer', { p_hw: homeworkId, p_item: itemId, p_choice: choice });
  if (error || !data) return fail(error);
  return { ok: true, data: data as AnswerResult };
}

export async function finishQuiz(homeworkId: string): Promise<Result> {
  const { error } = await supabase.rpc('quiz_finish', { p_hw: homeworkId });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export interface MyQuizSummary { homework_id: string; answered: number; total: number; finished: boolean; percent: number | null }
export async function listMyQuizzes(): Promise<Result<MyQuizSummary[]>> {
  const { data, error } = await supabase.rpc('my_quizzes');
  if (error) return fail(error);
  return { ok: true, data: (data as MyQuizSummary[]) || [] };
}

// --------------------------------------------------------
// Sınav modunda kaydedilemeyen cevaplar (bağlantı koparsa / sayfa kapanırsa) bu cihazda bekler,
// sayfa yeniden açılınca gönderilir
// --------------------------------------------------------
const pendingKey = (homeworkId: string) => `quiz-bekleyen:${homeworkId}`;
export function readPending(homeworkId: string): Record<string, number> {
  try { return JSON.parse(window.localStorage.getItem(pendingKey(homeworkId)) || '{}'); } catch { return {}; }
}
export function writePending(homeworkId: string, pending: Record<string, number>) {
  try {
    if (Object.keys(pending).length) window.localStorage.setItem(pendingKey(homeworkId), JSON.stringify(pending));
    else window.localStorage.removeItem(pendingKey(homeworkId));
  } catch { /* gizli sekme */ }
}
