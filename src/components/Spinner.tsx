import React from 'react';
import { BrandLogo } from './BrandLogo';
import s from './Spinner.module.css';

export interface SpinnerProps {
  /** Boyut: 'sm' (20px), 'md' (32px), 'lg' (44px), 'xl' (56px) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Yükleme açıklaması (ör. "Oturum kontrol ediliyor…", "Öğrenciler yükleniyor…") */
  label?: string;
  /** Tüm ekranı kaplayan, ortalı kart görünümü (sayfa geçişleri, oturum kurtarma) */
  fullScreen?: boolean;
  /** Bir panel, tablo veya bileşen alanının ortasında yer alma */
  center?: boolean;
  /** Logo gösterilsin mi? (Özellikle fullScreen modunda) */
  showLogo?: boolean;
  className?: string;
}

export function Spinner({
  size = 'md',
  label,
  fullScreen = false,
  center = false,
  showLogo = false,
  className = '',
}: SpinnerProps) {
  const spinnerElement = (
    <div
      className={`${s.spinner} ${s[size]}`}
      role="status"
      aria-label={label || 'Yükleniyor…'}
    />
  );

  if (fullScreen) {
    return (
      <div className={`${s.fullScreen} ${className}`}>
        <div className={s.card}>
          {showLogo && (
            <div className={s.logoBox}>
              <BrandLogo height={42} priority />
            </div>
          )}
          <div className={s.spinnerContainer}>{spinnerElement}</div>
          {label && <p className={s.label}>{label}</p>}
        </div>
      </div>
    );
  }

  if (center) {
    return (
      <div className={`${s.center} ${className}`}>
        <div className={s.spinnerContainer}>{spinnerElement}</div>
        {label && <p className={s.label}>{label}</p>}
      </div>
    );
  }

  return (
    <div className={`${s.inline} ${className}`}>
      {spinnerElement}
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
}

