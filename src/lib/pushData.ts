// ========================================================
// TELEFON BİLDİRİMİ (Web Push): bu cihazda aç / kapat / durum / deneme
// Sunucu: supabase/migrations/20261118090000_push.sql, gönderici supabase/functions/send-push
// Servis betiği: public/sw.js (önbellekleme yok, yalnızca bildirim)
// Plan: docs/BILDIRIM_PLANI.md (Aşama 2)
// ========================================================
import { supabase } from './supabaseClient';
import type { Result } from './teacherData';

const SW_URL = '/sw.js';

/**
 * unsupported      → tarayıcı desteklemiyor
 * ios-needs-install → iPhone/iPad: önce Paylaş → Ana Ekrana Ekle, sonra uygulamadan açılmalı
 * supported        → açılabilir
 */
export type PushSupport = 'unsupported' | 'ios-needs-install' | 'supported';

export interface PushStatus {
  support: PushSupport;
  /** Tarayıcı izni: 'default' (sorulmadı), 'granted', 'denied' (kullanıcı engelledi; ayarlardan açılmalı) */
  permission: NotificationPermission | 'unsupported';
  /** Bu cihaz şu an oturumdaki kişi için bildirim alıyor mu */
  enabled: boolean;
}

const isBrowser = () => typeof window !== 'undefined' && typeof navigator !== 'undefined';

function isIos(): boolean {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ masaüstü gibi görünür: dokunmatik Mac = iPad
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (!isBrowser()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

export function getPushSupport(): PushSupport {
  if (!isBrowser()) return 'unsupported';
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos() && (!hasApi || !isStandalone())) return 'ios-needs-install';
  return hasApi ? 'supported' : 'unsupported';
}

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(register: boolean): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing || !register) return existing ?? null;
  await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  return navigator.serviceWorker.ready;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await getRegistration(false);
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

async function saveSubscription(sub: PushSubscription): Promise<Result<null>> {
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return { ok: false, error: 'Abonelik bilgisi eksik.' };
  const { error } = await supabase.rpc('push_subscribe', {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

/** Bu cihazın durumu (ayarlar ekranı ve "Bildirimleri aç" kartı için) */
export async function getPushStatus(): Promise<PushStatus> {
  const support = getPushSupport();
  if (support !== 'supported') return { support, permission: 'unsupported', enabled: false };
  const permission = Notification.permission;
  if (permission !== 'granted') return { support, permission, enabled: false };
  const sub = await currentSubscription();
  if (!sub) return { support, permission, enabled: false };
  const { data } = await supabase.rpc('push_is_subscribed', { p_endpoint: sub.endpoint });
  return { support, permission, enabled: data === true };
}

/** Bildirim iznini ister ve bu cihazı oturumdaki kişiye bağlar. Kullanıcı tıklamasıyla çağrılmalı. */
export async function enablePush(): Promise<Result<null>> {
  const support = getPushSupport();
  if (support === 'ios-needs-install') {
    return { ok: false, error: 'iPhone ve iPad’de önce Paylaş → Ana Ekrana Ekle ile siteyi ekleyin, sonra ana ekrandaki simgeden açın.' };
  }
  if (support !== 'supported') return { ok: false, error: 'Bu tarayıcı telefon bildirimlerini desteklemiyor.' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        error: permission === 'denied'
          ? 'Bildirim izni engellenmiş. Tarayıcı ayarlarından bu site için bildirimlere izin verin.'
          : 'Bildirim izni verilmedi.',
      };
    }
    const reg = await getRegistration(true);
    if (!reg) return { ok: false, error: 'Bildirim servisi başlatılamadı.' };
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { data: key, error } = await supabase.rpc('push_public_key');
      if (error || !key) return { ok: false, error: 'Bildirim anahtarı alınamadı.' };
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(key as string) });
    }
    return await saveSubscription(sub);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Bildirimler açılamadı.' };
  }
}

/** Bu cihazda bildirimleri kapatır (sunucudan ve tarayıcıdan) */
export async function disablePush(): Promise<Result<null>> {
  const sub = await currentSubscription();
  if (!sub) return { ok: true, data: null };
  const { error } = await supabase.rpc('push_unsubscribe', { p_endpoint: sub.endpoint });
  try {
    await sub.unsubscribe();
  } catch {
    /* tarayıcı tarafı zaten kapalı olabilir */
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

/** Kendi cihazlarına deneme bildirimi (saatte en fazla 5) */
export async function sendTestPush(): Promise<Result<null>> {
  const { error } = await supabase.rpc('push_test');
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

/**
 * Uygulama açılınca: izin verilmiş ve tarayıcıda abonelik varsa sunucudaki kaydı yeniler
 * (anahtar değişmiş ya da kayıt silinmiş olabilir). İzin yoksa hiçbir şey sormaz.
 */
export async function syncPushSubscription(): Promise<void> {
  if (getPushSupport() !== 'supported' || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (sub) await saveSubscription(sub);
}

/** Çıkışta: bu cihaz artık bu kişiye bildirim almasın (ortak cihazlar için önemli). Oturum kapanmadan önce çağrılır. */
export async function disablePushOnLogout(): Promise<void> {
  try {
    await Promise.race([disablePush(), new Promise((r) => setTimeout(r, 3000))]);
  } catch {
    /* çıkışı engellemez */
  }
}
