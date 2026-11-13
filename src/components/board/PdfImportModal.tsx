'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from '../icons';
import {
  BOARD_H, BOARD_IMAGE_BUCKET, BOARD_W, BoardPage, imageKey, MAX_PAGES, newId, newPage, uploadBoardImage,
} from '../../lib/boardData';
import { signedFileUrl } from '../../lib/filesData';
import styles from './PdfImportModal.module.css';

const MAX_PDF_PAGES = 30;
const EST_MB_PER_PAGE = 0.28;

interface ThumbItem {
  pageNum: number;
  dataUrl: string;
  selected: boolean;
}

export function PdfImportModal({
  currentPageCount,
  onImported,
  onClose,
}: {
  currentPageCount: number;
  onImported: (pages: BoardPage[], urls: Record<string, string>) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const cancelRef = useRef(false);

  const [thumbs, setThumbs] = useState<ThumbItem[]>([]);
  const [totalPdfPages, setTotalPdfPages] = useState(0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      void pdfDocRef.current?.destroy();
    };
  }, []);

  const remainingSlots = Math.max(0, MAX_PAGES - currentPageCount);

  const loadPdf = async (file: File) => {
    setError(null);
    setWarning(null);
    setThumbs([]);
    setLoadingPdf(true);
    cancelRef.current = false;

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const buf = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
      const pdf = await loadingTask.promise;
      await pdfDocRef.current?.destroy();
      pdfDocRef.current = pdf;

      const total = pdf.numPages;
      setTotalPdfPages(total);
      const cap = Math.min(total, MAX_PDF_PAGES);
      if (total > MAX_PDF_PAGES) {
        setWarning(`Bu PDF ${total} sayfa içeriyor; en fazla ${MAX_PDF_PAGES} sayfa listelenir.`);
      }

      const list: ThumbItem[] = [];
      for (let i = 1; i <= cap; i += 1) {
        if (cancelRef.current) return;
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vp.width));
        canvas.height = Math.max(1, Math.round(vp.height));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          list.push({
            pageNum: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.72),
            selected: i <= remainingSlots,
          });
        }
      }
      setThumbs(list);
    } catch (err) {
      const name = (err as { name?: string })?.name || '';
      if (name === 'PasswordException') {
        setError('Şifreli PDF dosyaları içe aktarılamaz.');
      } else {
        setError('PDF dosyası okunamadı veya bozuk.');
      }
    } finally {
      setLoadingPdf(false);
    }
  };

  const selectedList = thumbs.filter((t) => t.selected);
  const estMb = Math.max(0.3, selectedList.length * EST_MB_PER_PAGE).toFixed(1).replace('.', ',');
  const overPageLimit = selectedList.length > remainingSlots;

  const startImport = async () => {
    const pdf = pdfDocRef.current;
    if (!pdf || selectedList.length === 0 || overPageLimit) return;
    setError(null);
    setImporting(true);
    cancelRef.current = false;
    setProgress({ done: 0, total: selectedList.length });

    const createdPages: BoardPage[] = [];
    const createdUrls: Record<string, string> = {};

    try {
      for (let i = 0; i < selectedList.length; i += 1) {
        if (cancelRef.current) {
          setImporting(false);
          return;
        }
        const item = selectedList[i];
        const pdfPage = await pdf.getPage(item.pageNum);
        const baseVp = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(2, 1600 / Math.max(1, baseVp.width));
        const vp = pdfPage.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vp.width));
        canvas.height = Math.max(1, Math.round(vp.height));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Sayfa çizilemedi.');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (!blob) throw new Error('Görsel oluşturulamadı.');

        const imgFile = new File([blob], `pdf-sayfa-${item.pageNum}.jpg`, { type: 'image/jpeg' });
        const uploaded = await uploadBoardImage(imgFile);
        if (!uploaded.ok) {
          setError(uploaded.error);
          setImporting(false);
          return;
        }

        const fitScale = Math.min(BOARD_W / uploaded.data.w, BOARD_H / uploaded.data.h);
        const w = Math.round(uploaded.data.w * fitScale);
        const h = Math.round(uploaded.data.h * fitScale);
        const x = Math.round((BOARD_W - w) / 2);
        const y = Math.round((BOARD_H - h) / 2);

        const page = newPage();
        page.elements.push({
          id: newId(),
          type: 'image',
          x,
          y,
          w,
          h,
          bucket: BOARD_IMAGE_BUCKET,
          path: uploaded.data.path,
          locked: true,
        });
        createdPages.push(page);

        const signed = await signedFileUrl(BOARD_IMAGE_BUCKET, uploaded.data.path);
        if (signed.ok) {
          createdUrls[imageKey({ bucket: BOARD_IMAGE_BUCKET, path: uploaded.data.path })] = signed.data;
        }
        setProgress({ done: i + 1, total: selectedList.length });
      }

      if (!cancelRef.current) {
        onImported(createdPages, createdUrls);
      }
    } catch {
      setError('Sayfalar aktarılırken bir hata oluştu.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !importing) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pdf-import-title">
        <div className={styles.head}>
          <h3 id="pdf-import-title">PDF’ten sayfa ekle</h3>
          <button type="button" className={styles.closeBtn} onClick={() => { if (importing) cancelRef.current = true; else onClose(); }} aria-label="Kapat">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void loadPdf(f);
            }}
          />

          {thumbs.length === 0 && !loadingPdf && (
            <div className={styles.dropBox}>
              <p style={{ margin: 0, fontSize: 14, color: '#4c5b53' }}>
                Her seçili PDF sayfası yeni bir tahta sayfası olarak kilitli arka plan görseli şeklinde eklenir.
              </p>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => fileRef.current?.click()}>
                PDF dosyası seç
              </button>
            </div>
          )}

          {loadingPdf && <p style={{ margin: 0, fontSize: 14 }}>PDF sayfaları hazırlanıyor…</p>}
          {warning && <p className={styles.warn} role="status">{warning}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}

          {thumbs.length > 0 && (
            <>
              <div className={styles.toolbar}>
                <span style={{ fontSize: 13, color: '#4c5b53' }}>
                  {totalPdfPages} sayfadan {selectedList.length} seçili · Yaklaşık {estMb} MB yer kaplayacak
                </span>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={importing}
                    onClick={() => setThumbs((prev) => prev.map((t, idx) => ({ ...t, selected: idx < remainingSlots })))}
                  >
                    Tümünü seç
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={importing}
                    onClick={() => setThumbs((prev) => prev.map((t) => ({ ...t, selected: false })))}
                  >
                    Temizle
                  </button>
                </div>
              </div>

              {overPageLimit && (
                <p className={styles.warn} role="alert">
                  En fazla {remainingSlots} sayfa daha eklenebilir (tahta sınırı {MAX_PAGES} sayfa).
                </p>
              )}

              <div className={styles.grid}>
                {thumbs.map((t) => (
                  <button
                    key={t.pageNum}
                    type="button"
                    disabled={importing}
                    className={`${styles.thumbCard} ${t.selected ? styles.thumbSelected : ''}`}
                    aria-pressed={t.selected}
                    onClick={() => setThumbs((prev) => prev.map((x) => (x.pageNum === t.pageNum ? { ...x, selected: !x.selected } : x)))}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.dataUrl} alt={`${t.pageNum}. sayfa önizlemesi`} className={styles.thumbImg} />
                    <div className={styles.thumbMeta}>
                      <span>{t.pageNum}. sayfa</span>
                      <span>{t.selected ? 'Seçili' : 'Seçilmedi'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {importing && (
            <div className={styles.progressWrap} role="status">
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Sayfalar yükleniyor: {progress.done} / {progress.total}
              </span>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className={styles.foot}>
          {thumbs.length > 0 && !importing && (
            <button type="button" className={styles.btn} onClick={() => fileRef.current?.click()}>
              Başka PDF seç
            </button>
          )}
          <div className={styles.actions} style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                if (importing) cancelRef.current = true;
                else onClose();
              }}
            >
              İptal
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={importing || loadingPdf || selectedList.length === 0 || overPageLimit}
              onClick={() => void startImport()}
            >
              {importing ? 'Aktarılıyor…' : `${selectedList.length} sayfayı ekle`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

