'use client';

import { useEffect } from 'react';
import { reportError } from '../lib/errorReporting';

/** Kök düzende (layout) hata: kendi <html>/<body>'sini çizer, genel stiller yüklenmez. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { void reportError(error, 'render'); }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f6f2', color: '#20352d' }}>
        <title>Bir hata oluştu</title>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Bir şeyler ters gitti</h1>
            <p style={{ margin: '0 0 20px', color: '#58665f', lineHeight: 1.6 }}>
              Uygulama beklenmedik bir hatayla karşılaştı. Hata kaydedildi. Lütfen tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ minHeight: 44, padding: '10px 18px', border: 0, borderRadius: 10, background: '#25634b', color: '#fff', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
            >
              Tekrar dene
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
