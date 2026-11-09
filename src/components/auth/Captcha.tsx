'use client';

import React, { useCallback, useRef, useState } from 'react';

// Cloudflare Turnstile ("insan mısınız" doğrulaması). Supabase Auth'ta CAPTCHA açılınca
// giriş, kayıt ve anonim öğrenci oturumu bu kutudan gelen tek kullanımlık jetonla yapılır.
// NEXT_PUBLIC_TURNSTILE_SITE_KEY tanımlı değilse kutu gösterilmez ve jeton gönderilmez.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
export const CAPTCHA_ENABLED = SITE_KEY.length > 0;

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export const CAPTCHA_MISSING_MESSAGE = 'Lütfen "insan olduğunuzu doğrulayın" kutusunun tamamlanmasını bekleyin.';

/**
 * Kullanım: const captcha = useCaptcha(); … {captcha.widget} …
 * Gönderimde captcha.token kullanılır, her denemeden sonra captcha.reset() çağrılır (jeton tek kullanımlık).
 */
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const widgetId = useRef<string | null>(null);

  // Kutu DOM'a eklendiğinde çizilir, kaldırıldığında temizlenir (sekme/rol değişiminde yeniden çizilir)
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!CAPTCHA_ENABLED) return;
    if (!node) {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      setToken(null);
      return;
    }
    loadTurnstile()
      .then(() => {
        if (!window.turnstile || !node.isConnected || widgetId.current) return;
        widgetId.current = window.turnstile.render(node, {
          sitekey: SITE_KEY,
          language: 'tr',
          size: 'flexible',
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        });
      })
      .catch(() => setLoadError(true));
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  const widget = CAPTCHA_ENABLED ? (
    <div style={{ minHeight: 65 }}>
      <div ref={containerRef} />
      {loadError && (
        <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#943747' }}>
          Doğrulama kutusu yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.
        </p>
      )}
    </div>
  ) : null;

  /** Jeton gerekli ama henüz yoksa true */
  const missing = CAPTCHA_ENABLED && !token;

  return { enabled: CAPTCHA_ENABLED, token: token ?? undefined, missing, reset, widget };
}
