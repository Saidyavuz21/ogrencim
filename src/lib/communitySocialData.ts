// ========================================================
// TOPLULUK (sosyal): profil, gizlilik, profil resmi, takip, akış, gönderi, tepki, yorum,
// bildirim, şikâyet/denetim, herkese açık önizleme.
// Bütün kurallar ve gizlilik süzmesi sunucuda: supabase/migrations/20261113090000_community_social.sql
// Bu dosya yalnızca o fonksiyonları çağırır; arayüz, kapalı bilgiyi gizlemek için hiçbir şey yapmak zorunda değildir
// (kapalı alan yanıtta hiç yoktur ya da null gelir).
// Plan: docs/TOPLULUK_PLANI.md
// ========================================================
import { supabase } from './supabaseClient';
import type { Result } from './teacherData';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return fail(error);
  return { ok: true, data: data as T };
}

export const AVATAR_BUCKET = 'avatars';
export const THUMB_BUCKET = 'community-thumbs';

/** Herkese açık depodaki dosyanın adresi (profil resmi, tahta önizlemesi) */
export function publicImageUrl(bucket: typeof AVATAR_BUCKET | typeof THUMB_BUCKET, path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
export const avatarUrl = (path: string | null | undefined) => publicImageUrl(AVATAR_BUCKET, path);
export const thumbUrl = (path: string | null | undefined) => publicImageUrl(THUMB_BUCKET, path);

/** Avatar yokken gösterilecek baş harfler */
export const initialsOfName = (name: string) =>
  name.replace(/\./g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR') || 'Ö';

// --------------------------------------------------------
// Tipler
// --------------------------------------------------------

/** Öğretmen kartı. Kapalı alanlar null gelir ya da hiç gelmez. */
export interface TeacherCard {
  id: string;
  name: string;
  avatar_path: string | null;
  branch: string | null;
  city: string | null;
  /** false ise profil sayfası açılmaz (yalnızca ad/resim gösterilir) */
  profile_visible: boolean;
  /** Yalnızca süper admin görür */
  real_name?: string;
  school?: string | null;
}

/** Profil sayfası (community_profile). profile_visible=false ise yalnızca TeacherCard alanları gelir. */
export interface TeacherProfile extends TeacherCard {
  bio?: string | null;
  school?: string | null;
  is_self?: boolean;
  is_following?: boolean;
  can_follow?: boolean;
  /** Bu öğretmenin her paylaşımında bildirim */
  notify?: boolean;
  /** Benim bu öğretmene uyguladığım: engel / sessiz */
  block?: 'block' | 'mute' | null;
  item_count?: number;
  copy_total?: number;
  thanks_total?: number;
  /** Öğretmen sayıları gizlediyse gelmez */
  followers?: number;
  following?: number;
}

export type DisplayMode = 'full' | 'short' | 'alias';
export type ProfileVisibility = 'public' | 'teachers' | 'followers' | 'nobody';

export const DISPLAY_MODE_LABEL: Record<DisplayMode, string> = { full: 'Tam adım', short: 'Kısaltılmış adım', alias: 'Takma ad' };
export const VISIBILITY_LABEL: Record<ProfileVisibility, string> = {
  public: 'Herkes (giriş yapmayanlar dahil)',
  teachers: 'Yalnızca öğretmenler',
  followers: 'Yalnızca takipçilerim',
  nobody: 'Kimse (gizli profil)',
};

export interface CommunitySettings {
  /** Okunur (profilden gelir; Profilim sayfasında değişir) */
  full_name: string;
  branch: string | null;
  city: string | null;
  school: string | null;
  /** Değiştirilebilir */
  display_mode: DisplayMode;
  alias: string | null;
  bio: string | null;
  avatar_path: string | null;
  show_avatar: boolean;
  show_school: boolean;
  show_city: boolean;
  show_branch: boolean;
  visibility: ProfileVisibility;
  allow_follow: boolean;
  show_follow_counts: boolean;
  public_preview: boolean;
  notify_follow_posts: boolean;
  /** Seçili ayarlara göre başkalarının göreceği ad */
  preview_name: string;
  /** Topluluktan uzaklaştırıldıysa bitiş anı */
  suspended_until: string | null;
}
export type EditableSettings = Omit<CommunitySettings, 'full_name' | 'branch' | 'city' | 'school' | 'avatar_path' | 'preview_name' | 'suspended_until'>;

export type PostKind = 'text' | 'link' | 'item';
export type FeedTab = 'following' | 'subject' | 'all';
export const FEED_TAB_LABEL: Record<FeedTab, string> = { following: 'Takip ettiklerim', subject: 'Branşım', all: 'Herkes' };
/** Akış süzgeci: gönderi türü ya da paylaşılan içeriğin türü */
export type FeedKindFilter = PostKind | 'board' | 'questions' | null;

export interface PostItem {
  id: string;
  kind: 'board' | 'questions';
  title: string;
  grade: string | null;
  subject: string | null;
  outcomes: string[];
  tags: string[];
  page_count: number;
  question_count: number;
  thumb_path: string | null;
  copy_count: number;
  featured: boolean;
  rating_avg: number | null;
  rating_count: number;
  is_favorite: boolean;
  origin_author: string | null;
  origin_title: string | null;
  /** Yalnızca yazara gelir: giriş yapmayanlara önizleme olarak görünüyor mu */
  is_public?: boolean | null;
}

export interface FeedPost {
  id: string;
  kind: PostKind;
  body: string | null;
  link_url: string | null;
  link_title: string | null;
  subject: string | null;
  grade: string | null;
  created_at: string;
  edited_at: string | null;
  thanks_count: number;
  used_count: number;
  comment_count: number;
  is_mine: boolean;
  my_thanks: boolean;
  my_used: boolean;
  author: TeacherCard;
  /** kind = 'item' ise paylaşılan tahta / soru seti (önizleme için ayrıntı: communityData.getCommunityItem) */
  item: PostItem | null;
}

export interface FeedComment {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  is_mine: boolean;
  can_delete: boolean;
  author: TeacherCard;
}

export type NotificationKind = 'follow' | 'post' | 'copy' | 'thanks' | 'used' | 'comment' | 'moderation';
/** Aynı gün aynı türden gelenler tek satırda: count / actors */
export interface CommunityNotification {
  key: string;
  kind: NotificationKind;
  at: string;
  count: number;
  actors: number;
  unread: boolean;
  /** Son işlemi yapan (moderasyonda null) */
  actor: TeacherCard | null;
  post_id: string | null;
  item_id: string | null;
  message: string | null;
  title: string | null;
}

/** Bildirim satırının metni ("Ayşe Y. ve 2 kişi daha seni takip etti") */
export function notificationText(n: CommunityNotification): string {
  const who = n.actor?.name || 'Bir öğretmen';
  const others = n.actors > 1 ? ` ve ${n.actors - 1} kişi daha` : '';
  const title = n.title ? `: "${n.title}"` : '';
  switch (n.kind) {
    case 'follow': return `${who}${others} seni takip etmeye başladı.`;
    case 'post': return n.count > 1 ? `Takip ettiğin ${n.actors} öğretmen bugün ${n.count} yeni şey paylaştı.` : `${who} yeni bir şey paylaştı${title}`;
    case 'copy': return `${who}${others} içeriğini kopyaladı${title}`;
    case 'thanks': return `${who}${others} paylaşımına teşekkür etti${title}`;
    case 'used': return `${who}${others} paylaşımını derste kullandı${title}`;
    case 'comment': return `${who}${others} paylaşımına yorum yaptı${title}`;
    case 'moderation': return n.message || 'Yöneticiden bir bildirim var.';
  }
}

export type ReportKind = 'post' | 'comment' | 'profile';
export interface CommunityReport {
  id: string;
  target_kind: ReportKind;
  target_id: string;
  /** Şikâyet anındaki içerik (silinse de kalır) */
  snapshot: Record<string, unknown> | null;
  reason: string;
  status: 'open' | 'removed' | 'dismissed';
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: { id: string; name: string; school: string | null } | null;
  author: { id: string; name: string; school: string | null; email: string | null } | null;
  resolver: string | null;
  same_target_reports: number;
  author_suspended_until: string | null;
}

/** Herkese açık önizleme kartı (giriş gerektirmez). İçerik, şık ve cevap içermez. */
export interface PublicItem {
  id: string;
  kind: 'board' | 'questions';
  title: string;
  grade: string | null;
  subject: string | null;
  description: string | null;
  page_count: number;
  question_count: number;
  thumb_path: string | null;
  copy_count: number;
  thanks_count: number;
  rating_avg: number | null;
  rating_count: number;
  featured: boolean;
  created_at: string;
  /** Yalnızca soru setinde: ilk sorunun metni */
  first_question: string | null;
  author: TeacherCard;
}
export type PublicSort = 'popular' | 'new' | 'rating';

// --------------------------------------------------------
// Profil ve ayarlar
// --------------------------------------------------------
export const getMySettings = () => rpc<CommunitySettings>('community_my_settings');

export const saveMySettings = (s: EditableSettings) => rpc<null>('community_save_settings', { p: s });

/** Ziyaretçi de çağırabilir. null = öğretmen yok ya da profil bu kişiye kapalı */
export const getTeacherProfile = (teacherId: string) => rpc<TeacherProfile | null>('community_profile', { p_teacher: teacherId });

export const listFollows = (teacherId: string, which: 'followers' | 'following', limit = 30, offset = 0) =>
  rpc<TeacherCard[]>('community_follow_list', { p_teacher: teacherId, p_which: which, p_limit: limit, p_offset: offset });

export const getSuggestions = (limit = 8) => rpc<TeacherCard[]>('community_suggestions', { p_limit: limit });

/** Kare kırpar ve küçültür (profil resmi 256 px) */
async function squareImage(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Resim işlenemedi.');
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Resim işlenemedi.');
    return blob;
  } finally {
    bitmap.close();
  }
}

const randomName = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Profil resmini yükler (kare, 256 px), kaydeder ve eskisini siler. Döner: yeni yol */
export async function uploadAvatar(file: File): Promise<Result<string>> {
  if (!file.type.startsWith('image/')) return { ok: false, error: 'Lütfen bir resim seçin.' };
  if (file.size > 30 * 1024 * 1024) return { ok: false, error: 'Resim çok büyük.' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  let blob: Blob;
  try { blob = await squareImage(file); } catch { return { ok: false, error: 'Bu resim açılamadı. JPG ya da PNG deneyin.' }; }
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${auth.user.id}/${randomName()}.${ext}`;
  const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (up.error) {
    return fail(/row-level security/i.test(up.error.message) ? { message: 'Profil resmi yüklenemedi. Sayfayı yenileyip yeniden deneyin.' } : up.error);
  }
  const set = await rpc<string | null>('community_set_avatar', { p_path: path });
  if (!set.ok) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return set;
  }
  if (set.data) await supabase.storage.from(AVATAR_BUCKET).remove([set.data]);
  return { ok: true, data: path };
}

export async function removeAvatar(): Promise<Result<null>> {
  const set = await rpc<string | null>('community_set_avatar', { p_path: null });
  if (!set.ok) return set;
  if (set.data) await supabase.storage.from(AVATAR_BUCKET).remove([set.data]);
  return { ok: true, data: null };
}

/**
 * Paylaşılan tahtanın önizleme resmini yükler (yalnızca yazar). blob: ilk sayfanın küçük resmi
 * (en fazla ~640 px genişlik, WEBP/JPEG, 200 KB altı). Eskisi silinir.
 */
export async function uploadItemThumb(itemId: string, blob: Blob): Promise<Result<string>> {
  if (blob.size > 200 * 1024) return { ok: false, error: 'Önizleme resmi 200 KB’tan büyük.' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Oturum bulunamadı.' };
  const type = blob.type === 'image/webp' || blob.type === 'image/png' ? blob.type : 'image/jpeg';
  const path = `${auth.user.id}/${itemId}-${randomName()}.${type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg'}`;
  const up = await supabase.storage.from(THUMB_BUCKET).upload(path, blob, { contentType: type, upsert: false });
  if (up.error) return fail(up.error);
  const set = await rpc<string | null>('community_set_thumb', { p_item: itemId, p_path: path });
  if (!set.ok) {
    await supabase.storage.from(THUMB_BUCKET).remove([path]);
    return set;
  }
  if (set.data) await supabase.storage.from(THUMB_BUCKET).remove([set.data]);
  return { ok: true, data: path };
}

// --------------------------------------------------------
// Takip, konu takibi, engelleme
// --------------------------------------------------------
/** notify: bu öğretmenin her paylaşımında bildirim (zil) */
export const followTeacher = (teacherId: string, on: boolean, notify?: boolean) =>
  rpc<null>('community_follow', { p_teacher: teacherId, p_on: on, p_notify: notify ?? null });

export const followTopic = (subject: string, grade: string | null, on: boolean) =>
  rpc<null>('community_topic_follow', { p_subject: subject, p_grade: grade || '', p_on: on });

export const listMyTopics = () => rpc<{ subject: string; grade: string }[]>('community_my_topics');

/** kind: 'block' (iki yönlü), 'mute' (yalnızca ben görmem), null (kaldır) */
export const blockTeacher = (teacherId: string, kind: 'block' | 'mute' | null) =>
  rpc<null>('community_block', { p_teacher: teacherId, p_kind: kind });

export const listMyBlocks = () => rpc<(TeacherCard & { block: 'block' | 'mute' })[]>('community_my_blocks');

// --------------------------------------------------------
// Akış ve gönderiler
// --------------------------------------------------------
export interface FeedQuery {
  tab?: FeedTab;
  kind?: FeedKindFilter;
  subject?: string | null;
  grade?: string | null;
  query?: string | null;
  /** Öğretmen sayfasındaki gönderiler (tab yok sayılır) */
  authorId?: string | null;
  /** Sayfalama: son görülen gönderinin created_at değeri */
  before?: string | null;
  limit?: number;
}

export const getFeed = (q: FeedQuery = {}) =>
  rpc<FeedPost[]>('community_feed', {
    p_tab: q.authorId ? 'author' : q.tab || 'all',
    p_kind: q.kind || null,
    p_subject: q.subject || null,
    p_grade: q.grade || null,
    p_query: q.query?.trim() || null,
    p_author: q.authorId || null,
    p_before: q.before || null,
    p_limit: q.limit || 20,
  });

export const getPost = (postId: string) => rpc<FeedPost | null>('community_post_get', { p_post: postId });

/** Yazı ya da bağlantı. subject boşsa öğretmenin branşı yazılır. Döner: gönderi id */
export const createPost = (input: { kind: 'text' | 'link'; body: string; linkUrl?: string; linkTitle?: string; subject?: string | null; grade?: string | null }) =>
  rpc<string>('community_post_create', {
    p_kind: input.kind, p_body: input.body, p_link_url: input.linkUrl || null, p_link_title: input.linkTitle || null,
    p_subject: input.subject || null, p_grade: input.grade || null,
  });

export const updatePost = (postId: string, input: { body: string; linkTitle?: string; subject?: string | null; grade?: string | null }) =>
  rpc<null>('community_post_update', {
    p_post: postId, p_body: input.body, p_link_title: input.linkTitle || null, p_subject: input.subject || null, p_grade: input.grade || null,
  });

/** Yalnızca yazı/bağlantı. Paylaşılan tahta/soru seti için communityData.unpublishCommunity */
export const deletePost = (postId: string) => rpc<null>('community_post_delete', { p_post: postId });

// --------------------------------------------------------
// Tepkiler ve yorumlar
// --------------------------------------------------------
export const react = (postId: string, kind: 'thanks' | 'used', on: boolean) =>
  rpc<{ thanks_count: number; used_count: number }>('community_react', { p_post: postId, p_kind: kind, p_on: on });

export const listComments = (postId: string, limit = 50, offset = 0) =>
  rpc<FeedComment[]>('community_comments_list', { p_post: postId, p_limit: limit, p_offset: offset });

export const addComment = (postId: string, body: string) => rpc<FeedComment>('community_comment_add', { p_post: postId, p_body: body });

export const deleteComment = (commentId: string) => rpc<null>('community_comment_delete', { p_comment: commentId });

// --------------------------------------------------------
// Bildirimler
// --------------------------------------------------------
export const listNotifications = (limit = 30, before?: string | null) =>
  rpc<CommunityNotification[]>('community_notifications', { p_limit: limit, p_before: before || null });

export async function countUnreadNotifications(): Promise<number> {
  const res = await rpc<number>('community_unread_count');
  return res.ok ? Number(res.data) || 0 : 0;
}

export const markNotificationsRead = () => rpc<null>('community_mark_read');

// --------------------------------------------------------
// Şikâyet ve denetim (yönetici)
// --------------------------------------------------------
export const reportContent = (kind: ReportKind, targetId: string, reason: string) =>
  rpc<null>('community_report', { p_kind: kind, p_target: targetId, p_reason: reason });

/** Yalnızca süper admin */
export const listReports = (status: 'open' | 'removed' | 'dismissed' | null = 'open', limit = 50, offset = 0) =>
  rpc<CommunityReport[]>('community_reports_list', { p_status: status, p_limit: limit, p_offset: offset });

/** Yalnızca süper admin. action: remove (gizle) / dismiss (reddet); suspendDays > 0 ise yazar uzaklaştırılır */
export const resolveReport = (reportId: string, action: 'remove' | 'dismiss', note?: string, suspendDays = 0) =>
  rpc<null>('community_resolve_report', { p_report: reportId, p_action: action, p_note: note || null, p_suspend_days: suspendDays });

export const unsuspendTeacher = (teacherId: string) => rpc<null>('community_unsuspend', { p_teacher: teacherId });

// --------------------------------------------------------
// Herkese açık önizleme (giriş gerektirmez)
// --------------------------------------------------------
export const getPublicGallery = (q: { query?: string; kind?: 'board' | 'questions' | null; subject?: string | null; grade?: string | null; authorId?: string | null; sort?: PublicSort; limit?: number; offset?: number } = {}) =>
  rpc<PublicItem[]>('community_public_gallery', {
    p_query: q.query?.trim() || null, p_kind: q.kind || null, p_subject: q.subject || null, p_grade: q.grade || null,
    p_author: q.authorId || null, p_sort: q.sort || 'popular', p_limit: q.limit || 24, p_offset: q.offset || 0,
  });

/** Yazar: paylaşılan tahta/soru seti giriş yapmayanlara önizleme olarak görünsün mü */
export const setItemPublic = (itemId: string, on: boolean) => rpc<null>('community_set_public', { p_item: itemId, p_on: on });

export const getPublicItem = (itemId: string) => rpc<PublicItem | null>('community_public_item', { p_item: itemId });

export const getPublicFacets = () => rpc<{ subjects: string[]; grades: string[]; total: number }>('community_public_facets');
