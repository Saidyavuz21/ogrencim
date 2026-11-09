'use client';

// Tahta sürüm geçmişi: kayıtlı kopyaların listesi, önizleme ve geri dönme.

import React, { useEffect, useState } from 'react';
import { useDialog } from '../ConfirmDialog';
import { Spinner } from '../Spinner';
import { Modal } from '../files/FilesUi';
import { BoardContent, BoardVersion, getBoardVersion, listBoardVersions, restoreBoardVersion } from '../../lib/boardData';
import { BoardCanvas } from './BoardCanvas';
import f from '../files/Files.module.css';

const REASON: Record<string, string> = { auto: 'Otomatik', restore: 'Geri dönmeden önce' };

const fmtDate = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function BoardVersionsModal({ boardId, blocked, imageUrls, onRestored, onClose }: {
  boardId: string;
  /** Kaydedilmemiş değişiklik varken geri dönülmez */
  blocked: boolean;
  imageUrls: Record<string, string>;
  onRestored: (content: BoardContent) => void;
  onClose: () => void;
}) {
  const { confirm } = useDialog();
  const [versions, setVersions] = useState<BoardVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ id: number; content: BoardContent } | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listBoardVersions(boardId).then((res) => {
      if (!alive) return;
      if (res.ok) setVersions(res.data); else setError(res.error);
    });
    return () => { alive = false; };
  }, [boardId]);

  useEffect(() => {
    if (selected == null) return;
    let alive = true;
    getBoardVersion(selected).then((res) => {
      if (!alive) return;
      if (res.ok) { setPreview({ id: selected, content: res.data }); setPage(0); } else setError(res.error);
    });
    return () => { alive = false; };
  }, [selected]);

  const restore = async () => {
    if (!preview) return;
    const v = versions?.find((x) => x.id === preview.id);
    const ok = await confirm({
      title: 'Bu sürüme dön',
      message: `Tahta ${v ? fmtDate(v.created_at) : 'seçilen'} hâline döner. Şimdiki hâli de geçmişe kaydedilir; istersen ona geri dönebilirsin.`,
      confirmText: 'Sürüme dön',
      cancelText: 'Vazgeç',
      variant: 'warning',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await restoreBoardVersion(preview.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onRestored(res.data);
  };

  const shown = preview && preview.id === selected ? preview.content : null;
  const shownPage = shown?.pages[Math.min(page, shown.pages.length - 1)];

  return (
    <Modal title="Sürüm geçmişi" kicker="Tahta" onClose={onClose} wide busy={busy}>
      {error && <p className={f.error} role="alert">{error}</p>}
      {!versions ? <Spinner center label="Yükleniyor…" /> : !versions.length ? (
        <p className={f.muted}>Henüz kayıtlı sürüm yok. Tahtada çalıştıkça en çok 10 dakikada bir kopya alınır (son 20 sürüm, 90 gün).</p>
      ) : (
        <>
          <p className={f.muted}>Çalışırken en çok 10 dakikada bir kopya alınır; son 20 sürüm 90 gün saklanır. Önizlemek için bir sürüm seçin.</p>
          <div className={f.folderBar} role="group" aria-label="Sürümler">
            {versions.map((v) => (
              <button key={v.id} type="button" className={f.folderChip} aria-pressed={selected === v.id} onClick={() => setSelected(v.id)}>
                {fmtDate(v.created_at)} <small>{v.page_count} sayfa · {fmtSize(v.bytes)}{v.reason !== 'auto' ? ` · ${REASON[v.reason] || v.reason}` : ''}</small>
              </button>
            ))}
          </div>
          {selected != null && !shown && <Spinner center label="Sürüm açılıyor…" />}
          {shown && shownPage && (
            <>
              <BoardCanvas page={shownPage} imageUrls={imageUrls} thumbnail ariaLabel={`Sürüm önizlemesi, ${page + 1}. sayfa`} />
              <div className={f.cardActions} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span className={f.muted}>
                  <button type="button" className={f.secondaryButton} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Önceki</button>
                  {' '}Sayfa {page + 1} / {shown.pages.length}{' '}
                  <button type="button" className={f.secondaryButton} onClick={() => setPage((p) => Math.min(shown.pages.length - 1, p + 1))} disabled={page >= shown.pages.length - 1}>Sonraki</button>
                </span>
                <button type="button" className={f.primaryButton} onClick={restore} disabled={busy || blocked} title={blocked ? 'Önce değişikliklerin kaydedilmesini bekleyin' : undefined}>
                  {busy ? 'Dönülüyor…' : 'Bu sürüme dön'}
                </button>
              </div>
              {blocked && <p className={f.muted} role="status">Kaydedilmemiş değişiklik var; kayıt bitince geri dönebilirsiniz.</p>}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
