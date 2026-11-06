'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, File as FileIconBase, FileText, Image as ImageIcon, X, ArrowUpRight, type IconProps } from '../icons';
import { canPreview, fileKind, FileKind, KIND_LABEL, signedFileUrl } from '../../lib/filesData';
import { Spinner } from '../Spinner';
import styles from './Files.module.css';

/** Ortak pencere: Esc ve arka plana tıklama kapatır, açılınca ilk alana odaklanır, kapanınca odağı geri verir */
export function Modal({ title, kicker, onClose, children, wide, busy }: {
  title: string;
  kicker?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** İşlem sürerken kapatılamaz */
  busy?: boolean;
}) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const first = boxRef.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button:not([data-close])');
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);
  // Gövdeye taşınır: bir formun içinden açılsa bile Enter o formu göndermez
  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={boxRef} className={`${styles.modal} ${wide ? styles.modalWide : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.modalHead}>
          <div>
            {kicker && <p className={styles.modalKicker}>{kicker}</p>}
            <h2 id={titleId} className={styles.modalTitle}>{title}</h2>
          </div>
          <button type="button" data-close className={styles.iconButton} onClick={onClose} disabled={busy} aria-label="Kapat">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

const KIND_ICON: Record<FileKind, React.FC<IconProps>> = {
  pdf: FileText, image: ImageIcon, word: FileText, slides: FileIconBase, sheet: FileIconBase, other: FileIconBase,
};

/** Türüne göre renkli küçük simge */
export function KindIcon({ mime }: { mime: string }) {
  const kind = fileKind(mime);
  const Icon = KIND_ICON[kind];
  return (
    <span className={`${styles.kindIcon} ${styles[`kind_${kind}`]}`} title={KIND_LABEL[kind]}>
      <Icon size={18} aria-hidden="true" />
    </span>
  );
}

/** Önizleme: PDF ve resim sayfada açılır; diğerleri indirilir */
export function FilePreview({ bucket, path, name, mime, onClose }: { bucket: string; path: string; name: string; mime: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewable = canPreview(mime);
  useEffect(() => {
    let alive = true;
    signedFileUrl(bucket, path).then((res) => {
      if (!alive) return;
      if (res.ok) setUrl(res.data);
      else setError(`Dosya açılamadı: ${res.error}`);
    });
    return () => { alive = false; };
  }, [bucket, path]);
  return (
    <Modal title={name} kicker={KIND_LABEL[fileKind(mime)]} onClose={onClose} wide>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!error && !url && <Spinner center label="Açılıyor…" />}
      {url && previewable && (
        mime === 'application/pdf'
          ? <iframe className={styles.previewFrame} src={url} title={name} />
          : (
            // eslint-disable-next-line @next/next/no-img-element -- özel, süreli bağlantı; next/image optimizasyonu uygun değil
            <img className={styles.previewImage} src={url} alt={name} />
          )
      )}
      {url && !previewable && <p className={styles.muted}>Bu dosya türü tarayıcıda önizlenemiyor. İndirip açabilirsiniz.</p>}
      <div className={styles.modalActions}>
        <DownloadButton bucket={bucket} path={path} name={name} primary={!previewable} />
        {url && previewable && (
          <a className={styles.secondaryButton} href={url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight size={18} aria-hidden="true" />Yeni sekmede aç
          </a>
        )}
      </div>
    </Modal>
  );
}

/** İndirme: dosya özgün adıyla iner */
export function DownloadButton({ bucket, path, name, primary, compact }: { bucket: string; path: string; name: string; primary?: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    const res = await signedFileUrl(bucket, path, name);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    window.location.assign(res.data);
  };
  return (
    <>
      <button
        type="button"
        className={compact ? styles.iconButton : primary ? styles.primaryButton : styles.secondaryButton}
        onClick={go}
        disabled={busy}
        aria-label={compact ? `${name} indir` : undefined}
        title={compact ? 'İndir' : undefined}
      >
        <Download size={18} aria-hidden="true" />{!compact && (busy ? 'Hazırlanıyor…' : 'İndir')}
      </button>
      {error && <span className={styles.error} role="alert">İndirilemedi: {error}</span>}
    </>
  );
}

/** Etiket girişi: Enter ya da virgül ekler, Geri sil son etiketi kaldırır */
export function TagInput({ id, value, onChange, suggestions = [], max = 12 }: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  max?: number;
}) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const t = raw.trim().replace(/,+$/, '').slice(0, 30);
    if (!t || value.length >= max || value.some((v) => v.toLocaleLowerCase('tr-TR') === t.toLocaleLowerCase('tr-TR'))) { setText(''); return; }
    onChange([...value, t]);
    setText('');
  };
  return (
    <div className={styles.tagInput}>
      {value.map((t) => (
        <span key={t} className={styles.tagChip}>
          {t}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`${t} etiketini kaldır`}>
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        list={suggestions.length ? listId : undefined}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(text); }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => { if (text.trim()) add(text); }}
        placeholder={value.length >= max ? 'Etiket sınırına ulaşıldı' : 'Etiket yazıp Enter’a basın'}
        disabled={value.length >= max}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}

/** Türkçe büyük/küçük harf ve aksan duyarsız arama */
export const normalize = (s: string) =>
  s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
