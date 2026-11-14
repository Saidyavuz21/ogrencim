// ========================================================
// BİLDİRİMLER (zil, okunmamış sayısı, liste, ayarlar)
// Bütün kurallar sunucuda: supabase/migrations/20261117090000_notifications.sql
// Bildirimleri veritabanı tetikleyicileri üretir; istemci yalnızca okur ve okundu yapar.
// Öğrenci ve öğretmen aynı fonksiyonları kullanır (sunucu oturumdan kim olduğunu bilir).
// Plan: docs/BILDIRIM_PLANI.md
// ========================================================
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import type { Result } from './teacherData';
import type { TeacherPageId } from '../components/teacher/teacherPages';
import type { StudentPageId } from '../components/student/studentRoutes';

const fail = (error: { message: string } | null | undefined): { ok: false; error: string } => ({
  ok: false,
  error: error?.message || 'Bilinmeyen hata',
});

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return fail(error);
  return { ok: true, data: data as T };
}

// --------------------------------------------------------
// Tipler
// --------------------------------------------------------
export type NotificationKind =
  | 'mesaj'
  | 'odev_yeni'
  | 'odev_degerlendirildi'
  | 'odev_teslim'
  | 'canli_ders'
  | 'duyuru'
  | 'topluluk'
  // Aşama 3 (henüz üretilmiyor)
  | 'odev_hatirlatma'
  | 'odev_bitti'
  | 'quiz'
  | 'quiz_bitti'
  | 'soru_yeni'
  | 'soru_cevap'
  | 'tahta_paylasildi'
  | 'dosya_silinecek';

/** Topluluk bildiriminin alt türü (sub) */
export type CommunitySubKind = 'follow' | 'post' | 'copy' | 'thanks' | 'used' | 'comment' | 'moderation';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  /**
   * Ek bilgi: topluluk → CommunitySubKind; duyuru → 'normal' | 'urgent';
   * değerlendirme → 'yapti' | 'kismen' | 'yapmadi'; sınıf grubu mesajı → 'sinif'
   */
  sub: string | null;
  group_key: string;
  /** İlgili kayıt: ödev / duyuru / canlı ders kimliği, sohbet kimliği (ogr:… / sinif:…), topluluk gönderisi */
  ref_id: string | null;
  /** Bağlam: ödev başlığı, duyuru başlığı, gönderen adı, topluluk içeriğinin adı */
  title: string;
  /** Kısa önizleme: mesaj metni, ders adı, sınıf adı… (boş olabilir) */
  body: string | null;
  /** Olayı yapan kişinin görünen adı (öğretmen, öğrenci, topluluk üyesi) */
  actor_name: string | null;
  /** Toplanan olay sayısı (ör. 5 yeni teslim, 3 yeni mesaj) */
  count: number;
  /** Son olay zamanı (ISO) */
  at: string;
  unread: boolean;
}

export interface NotificationSettings {
  /** Zilde gösterilmeyen türler */
  off_in_app: NotificationKind[];
  /** Telefona gönderilmeyen türler (Aşama 2'de kullanılır) */
  off_push: NotificationKind[];
  quiet_enabled: boolean;
  /** "22:00" biçimi */
  quiet_start: string;
  quiet_end: string;
  /** Öğrencide false: sessiz saatler sabittir (22:00–07:00) */
  can_edit_quiet: boolean;
}

// --------------------------------------------------------
// Ayarlar ekranı için tür listeleri (yalnızca şu an üretilen türler)
// --------------------------------------------------------
export interface NotificationKindInfo {
  kind: NotificationKind;
  label: string;
  description: string;
}

export const TEACHER_NOTIFICATION_KINDS: NotificationKindInfo[] = [
  { kind: 'mesaj', label: 'Mesajlar', description: 'Öğrenciden gelen yeni mesaj' },
  { kind: 'odev_teslim', label: 'Ödev teslimleri', description: 'Öğrenci ödev teslim edince (ödev başına toplanır)' },
  { kind: 'duyuru', label: 'Okul duyuruları', description: 'Okul yönetiminden ya da öğretmenlerden duyuru' },
  { kind: 'topluluk', label: 'Topluluk', description: 'Yorum, takip, teşekkür, kopyalama' },
];

export const STUDENT_NOTIFICATION_KINDS: NotificationKindInfo[] = [
  { kind: 'mesaj', label: 'Mesajlar', description: 'Öğretmeninden ya da sınıf grubundan mesaj' },
  { kind: 'odev_yeni', label: 'Yeni ödev', description: 'Sınıfına ödev verilince' },
  { kind: 'odev_degerlendirildi', label: 'Ödev sonucu', description: 'Ödevin kontrol edilince' },
  { kind: 'canli_ders', label: 'Canlı ders', description: 'Sınıfında canlı ders başlayınca' },
  { kind: 'duyuru', label: 'Duyurular', description: 'Okuldan gelen duyurular' },
];

// --------------------------------------------------------
// Okuma ve okundu
// --------------------------------------------------------
/** Okunmamış bildirim sayısı (toplanmış satır sayısı; "5 yeni teslim" 1 sayılır) */
export async function countUnreadNotifications(): Promise<number> {
  const r = await rpc<number>('notifications_unread_count');
  return r.ok ? r.data || 0 : 0;
}

/** En yeni önce. Sonraki sayfa için son öğenin `at` değerini `before` olarak ver. */
export async function listNotifications(before?: string | null, limit = 30): Promise<Result<AppNotification[]>> {
  const r = await rpc<AppNotification[]>('notifications_list', { p_limit: limit, p_before: before ?? null });
  if (!r.ok) return r;
  return { ok: true, data: r.data || [] };
}

/** Verilen bildirimleri okundu yap; `ids` verilmezse hepsini. Okundu yapılan sayıyı döner. */
export async function markNotificationsRead(ids?: number[]): Promise<Result<number>> {
  const r = await rpc<number>('notifications_mark_read', { p_ids: ids && ids.length ? ids : null });
  if (r.ok) notifyUnreadChanged();
  return r;
}

/** İlgili sayfa açılınca: ör. notificationGroups.homework(id) */
export async function markNotificationGroupsRead(groups: string[]): Promise<void> {
  if (!groups.length) return;
  const r = await rpc<number>('notifications_mark_groups_read', { p_groups: groups.slice(0, 50) });
  if (r.ok && r.data) notifyUnreadChanged();
}

/** group_key üreticileri (sunucudaki tetikleyicilerle aynı biçim) */
export const notificationGroups = {
  conversation: (conversationId: string) => [`mesaj:${conversationId}`],
  /** Öğrenci ödevi açınca: yeni ödev + sonuç bildirimi */
  homework: (homeworkId: string) => [`odev:${homeworkId}`, `degerlendirme:${homeworkId}`],
  /** Öğretmen teslimleri açınca */
  submissions: (homeworkId: string) => [`teslim:${homeworkId}`],
  live: (sessionId: string) => [`canli:${sessionId}`],
  announcement: (announcementId: string) => [`duyuru:${announcementId}`],
};

// --------------------------------------------------------
// Ayarlar
// --------------------------------------------------------
export async function getNotificationSettings(): Promise<Result<NotificationSettings>> {
  const r = await rpc<NotificationSettings | null>('notification_settings_get');
  if (!r.ok) return r;
  if (!r.data) return { ok: false, error: 'Oturum bulunamadı.' };
  return { ok: true, data: r.data };
}

/** Öğrencide sessiz saat alanları sunucuda yok sayılır */
export async function saveNotificationSettings(
  s: Pick<NotificationSettings, 'off_in_app' | 'off_push'> & Partial<Pick<NotificationSettings, 'quiet_enabled' | 'quiet_start' | 'quiet_end'>>
): Promise<Result<null>> {
  const timeOk = (t?: string) => !t || /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  if (!timeOk(s.quiet_start) || !timeOk(s.quiet_end)) return { ok: false, error: 'Saat SS:DD biçiminde olmalı.' };
  const r = await rpc<null>('notification_settings_save', {
    p_off_in_app: s.off_in_app,
    p_off_push: s.off_push,
    p_quiet_enabled: s.quiet_enabled ?? null,
    p_quiet_start: s.quiet_start ?? null,
    p_quiet_end: s.quiet_end ?? null,
  });
  if (!r.ok) return r;
  return { ok: true, data: null };
}

// --------------------------------------------------------
// Metin ve hedef
// --------------------------------------------------------
const many = (n: number, one: string, more: string) => (n > 1 ? more.replace('{n}', String(n)) : one);

const COMMUNITY_TEXT: Record<string, (n: AppNotification) => string> = {
  comment: (n) => many(n.count, `${n.actor_name || 'Bir öğretmen'} paylaşımınıza yorum yaptı`, `Paylaşımınıza {n} yeni yorum`),
  follow: (n) => many(n.count, `${n.actor_name || 'Bir öğretmen'} sizi takip etmeye başladı`, `{n} öğretmen sizi takip etmeye başladı`),
  post: (n) => many(n.count, `${n.actor_name || 'Takip ettiğiniz öğretmen'} yeni bir paylaşım yaptı`, `${n.actor_name || 'Takip ettiğiniz öğretmen'} {n} yeni paylaşım yaptı`),
  copy: (n) => many(n.count, `${n.actor_name || 'Bir öğretmen'} içeriğinizi kopyaladı`, `İçeriğiniz {n} kez kopyalandı`),
  thanks: (n) => many(n.count, `${n.actor_name || 'Bir öğretmen'} paylaşımınıza teşekkür etti`, `Paylaşımınıza {n} teşekkür`),
  used: (n) => many(n.count, `${n.actor_name || 'Bir öğretmen'} paylaşımınızı derste kullandı`, `Paylaşımınız {n} kez derste kullanıldı`),
  moderation: () => 'Topluluk yönetiminden bir bildirim var',
};

/** Bildirimin ana cümlesi. `title` ve `body` ayrıca ikinci satırda gösterilebilir. */
export function notificationText(n: AppNotification): string {
  switch (n.kind) {
    case 'mesaj':
      return n.sub === 'sinif'
        ? many(n.count, `${n.actor_name || 'Öğretmenin'} sınıf grubuna yazdı`, `Sınıf grubunda {n} yeni mesaj`)
        : many(n.count, `${n.actor_name || 'Biri'} mesaj gönderdi`, `${n.actor_name || 'Biri'} {n} mesaj gönderdi`);
    case 'odev_yeni':
      return 'Yeni ödev';
    case 'odev_degerlendirildi':
      return 'Ödevin değerlendirildi';
    case 'odev_teslim':
      return many(n.count, `${n.actor_name || 'Bir öğrenci'} ödevini teslim etti`, `{n} yeni ödev teslimi`);
    case 'canli_ders':
      return 'Canlı ders başladı';
    case 'duyuru':
      return n.sub === 'urgent' ? 'Önemli duyuru' : 'Yeni duyuru';
    case 'topluluk':
      return (COMMUNITY_TEXT[n.sub || ''] || (() => 'Toplulukta yeni bir şey var'))(n);
    default:
      return 'Yeni bildirim';
  }
}

/**
 * Ana cümlenin altındaki satırlar (türe göre; ana cümlede geçen bilgiyi tekrar etmez).
 * detail: ikinci satır (ödev/duyuru başlığı, topluluk içeriği); preview: soluk üçüncü satır (mesaj metni, ders, sınıf).
 */
export function notificationLines(n: AppNotification): { detail: string | null; preview: string | null } {
  const t = n.title?.trim() || null;
  const b = n.body?.trim() || null;
  switch (n.kind) {
    case 'mesaj':
      return { detail: null, preview: b };
    case 'odev_degerlendirildi':
      return { detail: t, preview: null };
    case 'topluluk':
      if (n.sub === 'follow') return { detail: null, preview: null };
      if (n.sub === 'moderation') return { detail: null, preview: b };
      return { detail: t, preview: null };
    default:
      return { detail: t, preview: b };
  }
}

/** Bildirime tıklanınca gidilecek sayfa. refId ile sayfa ilgili kaydı açabilir (ör. sohbet, ödev). */
export type NotificationTarget =
  | { role: 'teacher'; page: TeacherPageId; refId: string | null }
  | { role: 'student'; page: StudentPageId; refId: string | null };

export function notificationTarget(n: AppNotification, role: 'teacher' | 'student'): NotificationTarget {
  if (role === 'teacher') {
    const page: TeacherPageId =
      n.kind === 'mesaj' ? 'messages'
      : n.kind === 'odev_teslim' || n.kind === 'odev_bitti' ? 'check_sheet'
      : n.kind === 'duyuru' ? 'announcements'
      : n.kind === 'topluluk' ? 'community'
      : n.kind === 'tahta_paylasildi' ? 'boards'
      : n.kind === 'dosya_silinecek' ? 'files'
      : n.kind === 'quiz_bitti' ? 'check_sheet'
      : 'home';
    return { role, page, refId: n.ref_id };
  }
  const page: StudentPageId =
    n.kind === 'mesaj' ? 'mesajlar'
    : n.kind === 'odev_yeni' || n.kind === 'odev_degerlendirildi' || n.kind === 'odev_hatirlatma' || n.kind === 'quiz' ? 'odevler'
    : n.kind === 'duyuru' ? 'duyurular'
    : 'home'; // canlı ders kartı ana sayfada
  return { role, page, refId: n.ref_id };
}

// --------------------------------------------------------
// Canlı okunmamış sayısı (zil için)
// --------------------------------------------------------
const UNREAD_EVENT = 'tofutr:notifications-changed';

/** Okundu yapınca bütün zillerin sayıyı yeniden okuması için */
export function notifyUnreadChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNREAD_EVENT));
}

/** Uygulama ikonu rozeti (destekleyen tarayıcıda; desteklemiyorsa sessizce geçer) */
function setAppBadge(count: number) {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) void nav.setAppBadge?.(count)?.catch(() => {});
    else void nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* desteklenmiyor */
  }
}

const uniqueChannel = (name: string) => `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Okunmamış sayısı: Realtime (yalnızca kendi satırları gelir) + 60 sn yedek + sekmeye dönünce + okundu yapılınca.
 * `enabled` false iken (giriş yokken) hiçbir şey yapmaz.
 */
export function useUnreadNotifications(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const n = await countUnreadNotifications();
    setCount(n);
    setAppBadge(n);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Toplu olaylarda (ör. 25 öğrenciye ödev) tek istek
    const load = () => {
      if (!alive) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { if (alive) void refresh(); }, 300);
    };
    load();
    const channel = supabase
      .channel(uniqueChannel('notifications'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, load)
      .subscribe((status) => { if (status === 'SUBSCRIBED') load(); });
    const poll = setInterval(load, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(UNREAD_EVENT, load);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(UNREAD_EVENT, load);
      supabase.removeChannel(channel);
    };
  }, [enabled, refresh]);

  return { count: enabled ? count : 0, refresh };
}
