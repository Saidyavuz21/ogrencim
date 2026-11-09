// ========================================================
// HATA KAYDI
// Tarayıcıda oluşan beklenmedik hatalar, kişisel veriler temizlenerek veritabanına
// (client_errors) yazılır; yönetim panelinde "İşlem ve erişim kaydı → Hatalar"da görünür.
// Dış servise (Sentry vb.) veri gitmez. Sunucu da aynı temizliği ayrıca yapar.
// ========================================================

import { supabase } from './supabaseClient';

export type ErrorKind = 'error' | 'promise' | 'render';

const MAX_PER_PAGE = 10; // bir sayfa açılışında en çok bu kadar hata gönderilir
const sent = new Set<string>();

/**
 * Hata metnindeki kişisel/gizli verileri maskeler: JWT ve anahtarlar, e-posta, kimlikler (uuid).
 * `numbers: true` ise 4+ haneli sayılar da (PIN, telefon, okul no) maskelenir; yığın izinde (stack)
 * satır:sütun numaraları bozulmasın diye yalnızca hata mesajında kullanılır.
 */
export function scrubPersonalData(text: string, opts: { numbers?: boolean } = {}): string {
  let out = text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/\bsb_(publishable|secret)_[\w-]+/g, '[anahtar]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-posta]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]');
  if (opts.numbers) out = out.replace(/\b\d{4,}\b/g, '[sayı]');
  return out;
}

function describe(err: unknown): { message: string; stack: string } {
  if (err instanceof Error) {
    const digest = (err as Error & { digest?: string }).digest;
    return { message: `${err.name}: ${err.message}${digest ? ` (digest ${digest})` : ''}`, stack: err.stack || '' };
  }
  if (typeof err === 'string') return { message: err, stack: '' };
  try {
    return { message: JSON.stringify(err).slice(0, 300), stack: '' };
  } catch {
    return { message: String(err), stack: '' };
  }
}

/** Hata kaydını gönderir; gönderilemezse sessizce vazgeçer (hata raporlama asla yeni hata üretmez). */
export async function reportError(err: unknown, kind: ErrorKind = 'error'): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const { message, stack } = describe(err);
    if (!message || /ResizeObserver loop|Script error\.?$|AbortError|Load failed|Failed to fetch/i.test(message)) return;
    const key = `${kind}|${message}`;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);
    await supabase.rpc('report_client_error', {
      p_kind: kind,
      p_message: scrubPersonalData(message, { numbers: true }).slice(0, 500),
      p_stack: scrubPersonalData(stack).slice(0, 4000),
      p_path: window.location.pathname.slice(0, 200), // sorgu dizesi (?…) bilerek gönderilmez
      p_user_agent: navigator.userAgent.slice(0, 200),
    });
  } catch {
    /* yut */
  }
}

let installed = false;

/** window hata dinleyicilerini bir kez kurar (src/instrumentation-client.ts çağırır). */
export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => { void reportError(e.error ?? e.message, 'error'); });
  window.addEventListener('unhandledrejection', (e) => { void reportError(e.reason, 'promise'); });
}
