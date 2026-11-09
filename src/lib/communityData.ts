// Topluluk / Keşfet: öğretmenler arası paylaşım (öğrenciler görmez).
// Kurallar sunucuda: içerik dondurulmuş kopya, kişisel veri taraması, kopyalamada kota ayırma, yıldız/favori.
import { supabase } from './supabaseClient';
import { safeFileName, type Result } from './teacherData';
import { BOARD_IMAGE_BUCKET, BoardContent, getBoard, mediaRefs, newId, normalizeContent } from './boardData';
import { QUIZ_IMAGE_BUCKET } from './quizData';

export const COMMUNITY_BUCKET = 'community';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

export type CommunityKind = 'board' | 'questions';
export const KIND_LABEL: Record<CommunityKind, string> = { board: 'Tahta', questions: 'Soru seti' };
export type CommunitySort = 'trend' | 'rating' | 'used' | 'new';
export const SORT_LABEL: Record<CommunitySort, string> = { trend: 'Trend', rating: 'En yüksek puan', used: 'En çok kullanılan', new: 'En yeni' };
export type CommunityScope = 'all' | 'featured' | 'favorites' | 'mine';
export const SCOPE_LABEL: Record<CommunityScope, string> = { all: 'Hepsi', featured: 'Editörün seçimi', favorites: 'Favorilerim', mine: 'Paylaştıklarım' };

export interface CommunitySummary {
  id: string;
  kind: CommunityKind;
  title: string;
  description: string | null;
  grade: string | null;
  subject: string | null;
  outcomes: string[];
  tags: string[];
  author_name: string;
  author_id: string;
  page_count: number;
  question_count: number;
  rating_avg: number | null;
  rating_count: number;
  copy_count: number;
  recent_copies: number;
  featured: boolean;
  hidden: boolean;
  is_mine: boolean;
  is_favorite: boolean;
  my_rating: number | null;
  origin_author: string | null;
  origin_title: string | null;
  created_at: string;
}

export interface CommunityQuestion {
  ref: string;
  body: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  grade: string | null;
  subject: string | null;
  topic: string | null;
  image_path: string | null;
}

export interface CommunityMeta {
  title: string;
  description: string;
  grade: string;
  subject: string;
  outcomes: string[];
  tags: string[];
}

/** "MAT.8.1.1.1, T.4.3.5" → ['MAT.8.1.1.1', 'T.4.3.5'] (sunucu da denetler) */
export const parseOutcomes = (s: string) => Array.from(new Set(s.split(/[\s,;]+/).map((x) => x.trim().toLocaleUpperCase('tr')).filter(Boolean)));
export const OUTCOME_PATTERN = /^[A-ZÇĞİÖŞÜ]{1,6}(\.[0-9A-Z]{1,3}){1,5}$/;

// --------------------------------------------------------
// Arama ve önizleme
// --------------------------------------------------------
export interface CommunityFilter {
  query?: string;
  kind?: CommunityKind | null;
  grade?: string | null;
  subject?: string | null;
  outcome?: string | null;
  sort?: CommunitySort;
  scope?: CommunityScope;
  offset?: number;
}
export const PAGE_SIZE = 24;

export async function searchCommunity(f: CommunityFilter): Promise<Result<CommunitySummary[]>> {
  const { data, error } = await supabase.rpc('community_search', {
    p_query: f.query?.trim() || null,
    p_kind: f.kind || null,
    p_grade: f.grade || null,
    p_subject: f.subject || null,
    p_outcome: f.outcome?.trim() || null,
    p_sort: f.sort || 'trend',
    p_scope: f.scope || 'all',
    p_limit: PAGE_SIZE,
    p_offset: f.offset || 0,
  });
  if (error) return fail(error);
  return { ok: true, data: ((data as CommunitySummary[]) || []).map((r) => ({ ...r, rating_avg: r.rating_avg == null ? null : Number(r.rating_avg) })) };
}

export async function getCommunityItem(id: string): Promise<Result<{ content: BoardContent | null; questions: CommunityQuestion[] }>> {
  const { data, error } = await supabase.from('community_items').select('content, questions').eq('id', id).single();
  if (error || !data) return fail(error);
  const r = data as { content: unknown; questions: CommunityQuestion[] | null };
  return { ok: true, data: { content: r.content ? normalizeContent(r.content) : null, questions: r.questions || [] } };
}

/** Topluluk dosyaları için süreli adresler: "community/yol" → adres */
export async function communityMediaUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {};
  const { data } = await supabase.storage.from(COMMUNITY_BUCKET).createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  (data || []).forEach((d, i) => { if (d.signedUrl && !d.error) out[`${COMMUNITY_BUCKET}/${d.path || unique[i]}`] = d.signedUrl; });
  return out;
}

export async function rateCommunity(id: string, stars: number): Promise<Result> {
  const { error } = await supabase.rpc('community_rate', { p_item: id, p_stars: stars });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function favoriteCommunity(id: string, on: boolean): Promise<Result> {
  const { error } = await supabase.rpc('community_favorite', { p_item: id, p_on: on });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function moderateCommunity(id: string, patch: { featured?: boolean; hidden?: boolean }): Promise<Result> {
  const { error } = await supabase.rpc('community_moderate', { p_item: id, p_featured: patch.featured ?? null, p_hidden: patch.hidden ?? null });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

export async function updateCommunityMeta(id: string, m: CommunityMeta): Promise<Result> {
  const { error } = await supabase.rpc('community_update', {
    p_id: id, p_title: m.title, p_description: m.description, p_grade: m.grade || null, p_subject: m.subject || null, p_outcomes: m.outcomes, p_tags: m.tags,
  });
  if (error) return fail(error);
  return { ok: true, data: undefined };
}

/** Paylaşımı kaldırır; topluluk deposundaki dosyalar da silinir. Kopyalar etkilenmez. */
export async function unpublishCommunity(id: string): Promise<Result> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const { error } = await supabase.rpc('community_unpublish', { p_id: id });
  if (error) return fail(error);
  const folder = `${auth.user.id}/${id}`;
  const list = await supabase.storage.from(COMMUNITY_BUCKET).list(folder, { limit: 1000 });
  const paths = (list.data || []).map((o) => `${folder}/${o.name}`);
  if (paths.length) await supabase.storage.from(COMMUNITY_BUCKET).remove(paths);
  return { ok: true, data: undefined };
}

/** Topluluktan kopyalanmış tahtalarımın kaynağı */
export async function listBoardSources(): Promise<Record<string, { author_name: string; title: string }>> {
  const { data } = await supabase.from('board_sources').select('board_id, author_name, title');
  const out: Record<string, { author_name: string; title: string }> = {};
  ((data as { board_id: string; author_name: string; title: string }[]) || []).forEach((r) => { out[r.board_id] = r; });
  return out;
}

// --------------------------------------------------------
// Paylaşma
// --------------------------------------------------------
export interface PublishSource { kind: 'board'; boardId: string }
export type PublishInput = PublishSource | { kind: 'questions'; questionIds: string[] };

function rpcArgs(id: string, src: PublishInput, m: CommunityMeta, media: Record<string, string>, confirm: boolean, dryRun: boolean) {
  return {
    p_id: id,
    p_kind: src.kind,
    p_board: src.kind === 'board' ? src.boardId : null,
    p_question_ids: src.kind === 'questions' ? src.questionIds : null,
    p_title: m.title,
    p_description: m.description,
    p_grade: m.grade || null,
    p_subject: m.subject || null,
    p_outcomes: m.outcomes,
    p_tags: m.tags,
    p_media: media,
    p_confirm: confirm,
    p_dry_run: dryRun,
  };
}

/** Kişisel veri taraması (hiçbir şey kaydedilmez) */
export async function scanForPublish(src: PublishInput, m: CommunityMeta): Promise<Result<{ findings: string[]; page_count: number; question_count: number }>> {
  const { data, error } = await supabase.rpc('community_publish', rpcArgs(newId(), src, m, {}, false, true));
  if (error || !data) return fail(error);
  const r = data as { findings: string[]; page_count: number; question_count: number };
  return { ok: true, data: { findings: r.findings || [], page_count: r.page_count || 0, question_count: r.question_count || 0 } };
}

/**
 * Paylaşır: görseller/sesler topluluk deposuna kopyalanır, içerik sunucuda dondurulur.
 * Bir adım başarısız olursa kopyalanan dosyalar silinir.
 */
export async function publishToCommunity(src: PublishInput, m: CommunityMeta, confirm: boolean): Promise<Result<string>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const id = newId();
  const prefix = `${auth.user.id}/${id}/`;

  // Kopyalanacak dosyalar: tahtanın görsel/sesleri + soruların görselleri
  const files: { bucket: string; path: string }[] = [];
  let questionIds: string[] = [];
  if (src.kind === 'board') {
    const b = await getBoard(src.boardId);
    if (!b.ok) return b;
    files.push(...mediaRefs(b.data.content.pages));
    questionIds = Array.from(new Set(b.data.content.pages.flatMap((p) => p.elements)
      .flatMap((e) => (e.type === 'widget' && e.kind === 'minitest' && e.data.questionId ? [e.data.questionId] : []))));
  } else {
    questionIds = src.questionIds;
  }
  if (questionIds.length) {
    const { data, error } = await supabase.from('quiz_questions').select('image_path').in('id', questionIds);
    if (error) return fail(error);
    ((data as { image_path: string | null }[]) || []).forEach((q) => { if (q.image_path) files.push({ bucket: QUIZ_IMAGE_BUCKET, path: q.image_path }); });
  }

  const media: Record<string, string> = {};
  const uploaded: string[] = [];
  const rollback = async () => { if (uploaded.length) await supabase.storage.from(COMMUNITY_BUCKET).remove(uploaded); };
  let n = 0;
  for (const f of files) {
    const key = `${f.bucket}/${f.path}`;
    if (media[key]) continue;
    if (f.bucket !== BOARD_IMAGE_BUCKET && f.bucket !== QUIZ_IMAGE_BUCKET) {
      await rollback();
      return { ok: false, error: 'Tahtada paylaşılamayan bir dosya var (ödevden gelen eski bir görsel olabilir). Görseli tahtaya yeniden ekleyin.' };
    }
    const to = `${prefix}${n++}-${safeFileName(f.path.split('/').pop() || 'dosya')}`;
    const { error } = await supabase.storage.from(f.bucket).copy(f.path, to, { destinationBucket: COMMUNITY_BUCKET });
    if (error) { await rollback(); return { ok: false, error: `Dosya kopyalanamadı: ${error.message}` }; }
    uploaded.push(to);
    media[key] = to;
  }

  const { error } = await supabase.rpc('community_publish', rpcArgs(id, src, m, media, confirm, false));
  if (error) { await rollback(); return fail(error); }
  return { ok: true, data: id };
}

// --------------------------------------------------------
// Kopyalama: kota ayır → dosyaları kopyala → tamamla (hata olursa geri al)
// --------------------------------------------------------
export async function copyFromCommunity(itemId: string): Promise<Result<{ boardId: string | null; questionCount: number }>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const begin = await supabase.rpc('community_copy_begin', { p_item: itemId });
  if (begin.error || !begin.data) return fail(begin.error);
  const r = begin.data as { reservation: string; board_files: string[]; question_files: string[] };

  const copied: { bucket: string; path: string }[] = [];
  const map: Record<string, string> = {};
  const rollback = async () => {
    const byBucket = new Map<string, string[]>();
    copied.forEach((c) => byBucket.set(c.bucket, [...(byBucket.get(c.bucket) || []), c.path]));
    await Promise.all(Array.from(byBucket.entries()).map(([b, paths]) => supabase.storage.from(b).remove(paths)));
    await supabase.rpc('community_copy_abort', { p_reservation: r.reservation });
  };
  const stamp = Date.now().toString(36);
  let n = 0;
  const copyOne = async (path: string, bucket: string) => {
    const to = `${auth.user!.id}/topluluk-${stamp}-${n++}-${safeFileName(path.split('/').pop() || 'dosya')}`;
    const { error } = await supabase.storage.from(COMMUNITY_BUCKET).copy(path, to, { destinationBucket: bucket });
    if (error) throw new Error(error.message);
    copied.push({ bucket, path: to });
    map[`${COMMUNITY_BUCKET}/${path}`] = to;
  };
  try {
    for (const p of r.board_files || []) await copyOne(p, BOARD_IMAGE_BUCKET);
    for (const p of r.question_files || []) if (!map[`${COMMUNITY_BUCKET}/${p}`]) await copyOne(p, QUIZ_IMAGE_BUCKET);
  } catch (e) {
    await rollback();
    return { ok: false, error: `Dosyalar kopyalanamadı; hiçbir şey eklenmedi. (${e instanceof Error ? e.message : 'hata'})` };
  }

  const fin = await supabase.rpc('community_copy_finish', { p_reservation: r.reservation, p_map: map });
  if (fin.error || !fin.data) { await rollback(); return fail(fin.error); }
  const d = fin.data as { board_id: string | null; question_count: number };
  return { ok: true, data: { boardId: d.board_id, questionCount: d.question_count || 0 } };
}
