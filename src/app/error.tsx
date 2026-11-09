'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportError } from '../lib/errorReporting';

/** Sayfa içinde beklenmedik hata: kaydedilir, kullanıcıya yeniden deneme sunulur. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { void reportError(error, 'render'); }, [error]);

  return (
    <main style={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', padding: 24, color: '#20352d' }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Bir şeyler ters gitti</h1>
        <p style={{ margin: '0 0 20px', color: '#58665f', lineHeight: 1.6 }}>
          Sayfa beklenmedik bir hatayla karşılaştı. Hata kaydedildi. Tekrar deneyebilir ya da ana sayfaya dönebilirsiniz.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 44, padding: '10px 18px', border: 0, borderRadius: 10, background: '#25634b', color: '#fff', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
          >
            Tekrar dene
          </button>
          <Link href="/" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '10px 18px', border: '1px solid #c8d3cc', borderRadius: 10, color: '#20352d', fontWeight: 600, textDecoration: 'none' }}>
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
