'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Smartphone, X } from './icons';
import styles from './InstallAppBanner.module.css';

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isInStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandalone);

    // Check if dismissed before in session/local storage
    const wasDismissed = sessionStorage.getItem('tofutr_install_dismissed');
    if (wasDismissed || isInStandalone) {
      setDismissed(true);
      return;
    }

    setDismissed(false);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Chrome/Android PWA event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for browsers that don't trigger beforeinstallprompt (e.g. desktop Chrome already visited, or other browsers)
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('tofutr_install_dismissed', '1');
  };

  if (dismissed || isStandalone) return null;

  return (
    <>
      <div className={styles.bannerContainer}>
        <div className={styles.bannerContent}>
          <div className={styles.iconWrap}>
            <Image
              src="/icon.png"
              alt="tofutr"
              width={40}
              height={40}
              className={styles.appIcon}
            />
          </div>

          <div className={styles.textWrap}>
            <strong>tofutr uygulaması</strong>
            <span>Hızlı giriş yapın, ödev ve duyuruları kaçırmayın.</span>
          </div>

          <div className={styles.actionWrap}>
            <button
              type="button"
              className={styles.installBtn}
              onClick={handleInstallClick}
            >
              <Download size={16} aria-hidden="true" />
              <span>Yükle</span>
            </button>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleDismiss}
              aria-label="Kapat"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS & Desteklenmeyen Tarayıcılar İçin Yardım Modalı */}
      {showIOSInstructions && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <Smartphone size={24} className={styles.modalIcon} />
              <h3>Ana Ekrana Nasıl Eklenir?</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowIOSInstructions(false)}
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {isIOS ? (
                <ol>
                  <li>
                    Safari tarayıcısının altındaki <strong>Paylaş</strong> (
                    <span style={{ fontSize: '16px' }}>⎙ / ⎋</span>) simgesine
                    dokunun.
                  </li>
                  <li>
                    Açılan menüde aşağı kaydırıp{' '}
                    <strong>&quot;Ana Ekrana Ekle&quot;</strong> seçeneğini bulun.
                  </li>
                  <li>
                    Sağ üstteki <strong>&quot;Ekle&quot;</strong> butonuna
                    dokunun.
                  </li>
                </ol>
              ) : (
                <ol>
                  <li>
                    Tarayıcınızın sağ üstündeki <strong>üç nokta</strong> (⋮)
                    menüsüne dokunun.
                  </li>
                  <li>
                    <strong>&quot;Uygulamayı Yükle&quot;</strong> veya{' '}
                    <strong>&quot;Ana ekrana ekle&quot;</strong> seçeneğini seçin.
                  </li>
                </ol>
              )}
            </div>

            <button
              type="button"
              className={styles.modalDoneBtn}
              onClick={() => setShowIOSInstructions(false)}
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
}

