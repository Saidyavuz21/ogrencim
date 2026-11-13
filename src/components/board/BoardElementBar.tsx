'use client';

// Seçili tek öğenin (çizim, şekil, görsel, parça) ayarları: düzenleme alanının üst satırında gösterilir.
// Yazı ve notların çubuğu BoardFormatBars.tsx içindedir.

import React, { useState } from 'react';
import { Lock } from '../icons';
import { BoardEl, WIDGET_LABEL } from '../../lib/boardData';
import { BOX_FILLS } from './textLayout';
import styles from './Board.module.css';

const TYPE_LABEL: Record<string, string> = {
  stroke: 'Çizim', line: 'Çizgi', arrow: 'Ok', rect: 'Dikdörtgen', ellipse: 'Daire', poly: 'Çokgen', image: 'Görsel',
};
const WIDTH_PRESETS = [{ value: 2, label: 'İnce' }, { value: 6, label: 'Orta' }, { value: 12, label: 'Kalın' }];

const labelStyle: React.CSSProperties = { fontSize: 13, color: '#58665f', whiteSpace: 'nowrap' };
const wrapStyle: React.CSSProperties = { position: 'relative', display: 'inline-flex' };

export function ElementBar({
  el, colors, onPatch, onDuplicate, onOrder, onDelete, onLock, onConfigure, onSaveToLibrary, onSaveImage, onOpenSettings, busy,
}: {
  el: BoardEl;
  colors: string[];
  onPatch: (patch: Partial<BoardEl>) => void;
  onDuplicate: () => void;
  onOrder: (dir: 'front' | 'back') => void;
  onDelete: () => void;
  onLock?: () => void;
  /** Ayarlı kütüphane parçası (sayı doğrusu aralığı vb.) */
  onConfigure?: () => void;
  onSaveToLibrary?: () => void;
  /** Seçili resmi Dosyalarım'a kopyalar */
  onSaveImage?: () => void;
  /** Parçaların uzun ayarları sol panelde açılır */
  onOpenSettings?: () => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState<'color' | 'fill' | null>(null);
  const hasStroke = el.type === 'stroke' || el.type === 'line' || el.type === 'arrow' || el.type === 'rect' || el.type === 'ellipse' || el.type === 'poly';
  const hasFill = el.type === 'rect' || el.type === 'ellipse' || el.type === 'poly';
  const title = el.type === 'widget' ? WIDGET_LABEL[el.kind] : TYPE_LABEL[el.type] || 'Öğe';
  const tint = hasStroke ? `${el.color}33` : '';

  return (
    <div className={`${styles.formatBar} ${styles.formatBarDocked}`} role="toolbar" aria-label={`${title} ayarları`}>
      <span className={styles.multiSelectBadge}>{title}</span>

      {hasStroke && (
        <>
          <span style={labelStyle}>{hasFill ? 'Kenar' : 'Renk'}</span>
          <span style={wrapStyle}>
            <button
              type="button"
              className={styles.formatColorTrigger}
              onClick={() => setOpen((v) => (v === 'color' ? null : 'color'))}
              title={hasFill ? 'Kenar rengi' : 'Çizgi rengi'}
              aria-label={hasFill ? 'Kenar rengi' : 'Çizgi rengi'}
              aria-haspopup="true"
              aria-expanded={open === 'color'}
            >
              <span className={styles.formatColorDot} style={{ backgroundColor: el.color }} />
            </button>
            {open === 'color' && (
              <div className={styles.formatColorPopover}>
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.formatColorSwatch}
                    style={{ backgroundColor: c, outline: el.color === c ? '2px solid #25634b' : undefined, outlineOffset: 1 }}
                    aria-pressed={el.color === c}
                    onClick={() => { onPatch({ color: c }); setOpen(null); }}
                    aria-label={`Renk ${c}`}
                  />
                ))}
              </div>
            )}
          </span>
        </>
      )}

      {hasFill && (
        <>
          <span style={labelStyle}>Dolgu</span>
          <span style={wrapStyle}>
            <button
              type="button"
              className={styles.formatColorTrigger}
              onClick={() => setOpen((v) => (v === 'fill' ? null : 'fill'))}
              title="Dolgu rengi"
              aria-label="Dolgu rengi"
              aria-haspopup="true"
              aria-expanded={open === 'fill'}
            >
              <span
                className={styles.formatColorDot}
                style={el.fill ? { backgroundColor: el.fill } : { background: 'linear-gradient(to top right, #fff 45%, #d03b3b 45%, #d03b3b 55%, #fff 55%)' }}
              />
            </button>
            {open === 'fill' && (
              <div className={styles.formatColorPopover} style={{ flexWrap: 'wrap', alignItems: 'center', width: 236 }}>
                <button
                  type="button"
                  className={styles.formatBtn}
                  aria-pressed={!el.fill}
                  onClick={() => { onPatch({ fill: null }); setOpen(null); }}
                >
                  Dolgu yok
                </button>
                <button
                  type="button"
                  className={styles.formatColorSwatch}
                  style={{ backgroundColor: tint, outline: el.fill === tint ? '2px solid #25634b' : undefined, outlineOffset: 1 }}
                  aria-pressed={el.fill === tint}
                  onClick={() => { onPatch({ fill: tint }); setOpen(null); }}
                  title="Kenar renginin açık tonu"
                  aria-label="Dolgu: kenar renginin açık tonu"
                />
                {BOX_FILLS.map(({ c, label }) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.formatColorSwatch}
                    style={{ backgroundColor: c, outline: el.fill === c ? '2px solid #25634b' : undefined, outlineOffset: 1 }}
                    aria-pressed={el.fill === c}
                    onClick={() => { onPatch({ fill: c }); setOpen(null); }}
                    title={label}
                    aria-label={`Dolgu ${label}`}
                  />
                ))}
                <input
                  type="color"
                  value={el.fill && /^#[0-9a-f]{6}/i.test(el.fill) ? el.fill.slice(0, 7) : '#ffffff'}
                  onChange={(e) => onPatch({ fill: e.target.value })}
                  title="Başka bir dolgu rengi seç"
                  aria-label="Dolgu için başka renk"
                  style={{ width: 28, height: 28, padding: 0, border: '1px solid #c9c5b8', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                />
              </div>
            )}
          </span>
        </>
      )}

      {hasStroke && (
        <>
          <span className={styles.formatDivider} aria-hidden="true" />
          <span style={labelStyle}>Kalınlık</span>
          {WIDTH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={styles.formatBtn}
              aria-pressed={el.width === p.value}
              onClick={() => onPatch({ width: p.value })}
              title={`${p.label} (${p.value} px)`}
            >
              {p.label}
            </button>
          ))}
        </>
      )}

      {(onConfigure || onOpenSettings) && <span className={styles.formatDivider} aria-hidden="true" />}
      {onConfigure && (
        <button type="button" className={styles.formatBtn} onClick={onConfigure} title="Şeklin ayarlarını değiştir">Ayarla</button>
      )}
      {onOpenSettings && (
        <button type="button" className={styles.formatBtn} onClick={onOpenSettings} title="Parçanın ayarlarını sol panelde aç">Ayarlar</button>
      )}

      <span className={styles.formatDivider} aria-hidden="true" />
      <button type="button" className={styles.formatBtn} onClick={onDuplicate} title="Çoğalt (Ctrl+D)">Çoğalt</button>
      <button type="button" className={styles.formatBtn} onClick={() => onOrder('front')} title="En öne getir">Öne</button>
      <button type="button" className={styles.formatBtn} onClick={() => onOrder('back')} title="En arkaya gönder">Arkaya</button>
      {onSaveToLibrary && (
        <button type="button" className={styles.formatBtn} onClick={onSaveToLibrary} title="Şekil kütüphaneme kaydet">Kütüphaneye kaydet</button>
      )}
      {onSaveImage && (
        <button type="button" className={styles.formatBtn} onClick={onSaveImage} disabled={busy} title="Resmi Dosyalarım'a kopyala">Dosyalarıma kaydet</button>
      )}
      {onLock && (
        <button type="button" className={styles.formatBtn} onClick={onLock} title="Öğeyi kilitle" aria-label="Öğeyi kilitle">
          <Lock size={14} /> Kilitle
        </button>
      )}
      <button type="button" className={styles.formatBtn} onClick={onDelete} title="Sil (Delete)" style={{ color: '#a33342' }}>Sil</button>
    </div>
  );
}
