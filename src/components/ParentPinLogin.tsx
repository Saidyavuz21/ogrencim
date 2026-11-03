'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Backspace, 
  Check, 
  AlertCircle, 
  X,
  UserCheck,
  ChevronRight
} from './icons';
import { Student } from '../data/portalData';

const PIN_LENGTH = 4;
const EMPTY_PIN = () => Array<string>(PIN_LENGTH).fill('');

interface ParentPinLoginProps {
  student: Student;
  onSuccess: () => void;
  /** PIN'i sunucuda doğrular (aynı 5 deneme / 15 dk kilit kuralı geçerlidir) */
  verifyPin: (pin: string) => Promise<{ ok: boolean; error?: string }>;
}

export const ParentPinLogin: React.FC<ParentPinLoginProps> = ({
  student,
  onSuccess,
  verifyPin,
}) => {
  const [pin, setPin] = useState<string[]>(EMPTY_PIN());
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // İlk yüklemede ilk kutucuğa odaklan
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Tüm haneler tamamlandığında otomatik kontrol et
  useEffect(() => {
    const fullPin = pin.join('');
    if (fullPin.length === PIN_LENGTH && !isVerifying && !isSuccess) {
      validatePin(fullPin);
    }
  }, [pin]);

  const validatePin = async (inputPin: string) => {
    setIsVerifying(true);
    const res = await verifyPin(inputPin);
    setIsVerifying(false);

    if (res.ok) {
      setErrorMsg(null);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 650);
    } else {
      setIsShake(true);
      setErrorMsg(res.error || 'Girdiğiniz PIN kodu hatalıdır. Lütfen tekrar deneyiniz.');
      setTimeout(() => {
        setIsShake(false);
        setPin(EMPTY_PIN());
        inputRefs.current[0]?.focus();
      }, 700);
    }
  };

  // Klavye ile giriş yönetimi
  const handleInputChange = (index: number, value: string) => {
    // Sadece son girilen rakamı al
    const digit = value.replace(/\D/g, '').slice(-1);
    
    setErrorMsg(null);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);

    // Bir sonraki kutuya geç
    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        // Önceki kutuyu temizle ve ona geç
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Yapıştırma (Paste) desteği (örn. "123456" kopyalayıp yapıştırma)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pastedData) return;

    const newPin = EMPTY_PIN();
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i];
    }
    setPin(newPin);
    
    const nextIdx = Math.min(pastedData.length, PIN_LENGTH - 1);
    inputRefs.current[nextIdx]?.focus();
  };

  // Dokunmatik / Ekran Tuş Takımı Tıklama
  const handleKeypadPress = (num: string) => {
    setErrorMsg(null);
    const firstEmptyIndex = pin.findIndex((d) => d === '');
    if (firstEmptyIndex !== -1) {
      const newPin = [...pin];
      newPin[firstEmptyIndex] = num;
      setPin(newPin);
      if (firstEmptyIndex < PIN_LENGTH - 1) {
        inputRefs.current[firstEmptyIndex + 1]?.focus();
      }
    }
  };

  const handleKeypadBackspace = () => {
    setErrorMsg(null);
    // En son dolu olan haneyi bul ve sil
    let lastFilledIndex = -1;
    for (let i = PIN_LENGTH - 1; i >= 0; i--) {
      if (pin[i] !== '') {
        lastFilledIndex = i;
        break;
      }
    }
    if (lastFilledIndex !== -1) {
      const newPin = [...pin];
      newPin[lastFilledIndex] = '';
      setPin(newPin);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleKeypadClear = () => {
    setErrorMsg(null);
    setPin(EMPTY_PIN());
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-6 px-3 sm:px-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs relative">
        
        {/* Üst İkon & Başlık */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            {isSuccess ? (
              <Check className="w-7 h-7 text-emerald-600 scale-110 transition-transform duration-300" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Veli Güvenlik Girişi
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Öğrenci karnesi ve ödev takibine erişmek için <strong>4 haneli PIN kodunuzu</strong> giriniz.
            </p>
          </div>
        </div>

        {/* Öğrenci & Veli Özet Rozeti */}
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {student.avatar}
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {student.name}
                </span>
                <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-sm">
                  {student.class}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block truncate">
                Okul No: {student.studentNo}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
            🔒 PIN Korumalı
          </span>
        </div>

        {/* PIN Giriş Kutuları */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>4 Haneli PIN Kodu</span>
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-indigo-600 cursor-pointer"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPin ? 'Gizle' : 'Göster'}</span>
            </button>
          </div>

          <div
            className={`flex items-center justify-center gap-2 sm:gap-2.5 transition-transform ${
              isShake ? 'animate-pulse translate-x-1 duration-75 text-rose-600' : ''
            }`}
          >
            {pin.map((digit, idx) => {
              const isFilled = digit !== '';
              const isCurrent = idx === pin.findIndex((d) => d === '');

              return (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`w-11 h-13 sm:w-12 sm:h-14 rounded-xl text-center text-lg sm:text-xl font-bold transition-all border outline-hidden ${
                    isSuccess
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200'
                      : errorMsg
                      ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-100'
                      : isFilled
                      ? 'bg-indigo-50/50 text-slate-900 border-indigo-300 ring-2 ring-indigo-100'
                      : isCurrent
                      ? 'bg-white border-indigo-500 ring-2 ring-indigo-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'
                  }`}
                />
              );
            })}
          </div>

          {/* Hata & Başarı Bildirimleri */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>PIN Doğrulandı! Veli Paneline Giriş Yapılıyor...</span>
            </div>
          )}
        </div>

        {/* Ekran Tuş Takımı (Keypad - Mobil ve Dokunmatik İçin Kolaylık) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="h-11 sm:h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-base font-bold border border-slate-200/80 transition-colors cursor-pointer select-none"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-11 sm:h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-semibold border border-slate-200/80 transition-colors cursor-pointer select-none"
            >
              Temizle
            </button>

            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-11 sm:h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-base font-bold border border-slate-200/80 transition-colors cursor-pointer select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-11 sm:h-12 rounded-xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 text-slate-600 hover:text-rose-700 text-xs font-semibold border border-slate-200/80 transition-colors flex items-center justify-center cursor-pointer select-none"
              title="Son haneyi sil"
            >
              <Backspace className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alt Bağlantılar: PIN Unuttum & Diğer Rollere Geçiş */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => setIsForgotModalOpen(true)}
            className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer font-medium"
          >
            PIN Kodumu Unuttum?
          </button>

        </div>

      </div>

      {/* PIN Kodunu Unuttum Bilgilendirme Modalı */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Veli PIN Kodu Hatırlatma
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Güvenlik nedeniyle PIN kodları sistemde şifrelenmiş olarak saklanır ve kimseye gösterilmez.
              <strong> {student.name}</strong> için yeni bir PIN almak üzere sınıf öğretmeninize veya okul yönetimine başvurunuz.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

