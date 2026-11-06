'use client';

import React, { createContext, useContext, useState, useCallback, useId, useRef } from 'react';
import { AlertCircle, HelpCircle, Trash2, X } from './icons';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export interface PromptOptions extends ConfirmOptions {
  inputLabel?: string;
  defaultValue?: string;
  placeholder?: string;
  inputMatch?: string; // e.g. must match student number exactly
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    options: PromptOptions;
    value: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const promptInputRef = useRef<HTMLInputElement>(null);
  // Pencere kapanınca odak, pencereyi açan düğmeye geri döner
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();
  const inputId = useId();

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const options: ConfirmOptions =
        typeof opts === 'string'
          ? {
              message: opts,
              title: 'Onay Gerekiyor',
              confirmText: 'Onayla',
              cancelText: 'Vazgeç',
              variant: 'danger',
            }
          : {
              title: opts.title || 'Onay Gerekiyor',
              message: opts.message,
              confirmText: opts.confirmText || 'Onayla',
              cancelText: opts.cancelText || 'Vazgeç',
              variant: opts.variant || 'danger',
            };

      returnFocus.current = document.activeElement as HTMLElement | null;
      setConfirmState({ options, resolve });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions | string) => {
    return new Promise<string | null>((resolve) => {
      const options: PromptOptions =
        typeof opts === 'string'
          ? {
              message: opts,
              title: 'Bilgi Girişi',
              confirmText: 'Tamam',
              cancelText: 'Vazgeç',
              variant: 'primary',
            }
          : {
              title: opts.title || 'Bilgi Girişi',
              message: opts.message,
              confirmText: opts.confirmText || 'Tamam',
              cancelText: opts.cancelText || 'Vazgeç',
              variant: opts.variant || 'primary',
              defaultValue: opts.defaultValue || '',
              placeholder: opts.placeholder || '',
              inputLabel: opts.inputLabel,
              inputMatch: opts.inputMatch,
            };

      returnFocus.current = document.activeElement as HTMLElement | null;
      setPromptState({
        options,
        value: options.defaultValue || '',
        resolve,
      });
      setTimeout(() => promptInputRef.current?.focus(), 50);
    });
  }, []);

  const restoreFocus = () => {
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el && document.contains(el)) setTimeout(() => el.focus(), 0);
  };

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
      restoreFocus();
    }
  };

  const handlePromptAction = (confirm: boolean) => {
    if (promptState) {
      promptState.resolve(confirm ? promptState.value : null);
      setPromptState(null);
      restoreFocus();
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* CONFIRM DIALOG */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="alertdialog"
          aria-modal="true"
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleConfirmAction(false); } }}
          aria-labelledby={titleId}
          aria-describedby={messageId}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-200 scale-100 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmState.options.variant === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {confirmState.options.variant === 'danger' ? (
                  <Trash2 size={24} aria-hidden="true" />
                ) : confirmState.options.variant === 'warning' ? (
                  <AlertCircle size={24} aria-hidden="true" />
                ) : (
                  <HelpCircle size={24} aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3 id={titleId} className="text-lg font-bold text-slate-900 leading-snug">
                  {confirmState.options.title}
                </h3>
                <p id={messageId} className="mt-1 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {confirmState.options.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Kapat"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                autoFocus={confirmState.options.variant === 'danger'}
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-sm cursor-pointer"
              >
                {confirmState.options.cancelText}
              </button>
              <button
                type="button"
                autoFocus={confirmState.options.variant !== 'danger'}
                onClick={() => handleConfirmAction(true)}
                className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-sm transition-all duration-150 text-sm cursor-pointer ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : confirmState.options.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
                }`}
              >
                {confirmState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT DIALOG */}
      {promptState && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handlePromptAction(false); } }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                promptState.options.inputMatch &&
                promptState.value.trim() !== promptState.options.inputMatch.trim()
              ) {
                return;
              }
              handlePromptAction(true);
            }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id={titleId} className="text-lg font-bold text-slate-900">
                {promptState.options.title}
              </h3>
              <button
                type="button"
                onClick={() => handlePromptAction(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Kapat"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {promptState.options.message}
            </p>

            <div className="space-y-1.5 pt-1">
              {promptState.options.inputLabel && (
                <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 block">
                  {promptState.options.inputLabel}
                </label>
              )}
              <input
                ref={promptInputRef}
                id={inputId}
                aria-label={promptState.options.inputLabel ? undefined : promptState.options.message}
                type="text"
                value={promptState.value}
                placeholder={promptState.options.placeholder}
                onChange={(e) =>
                  setPromptState((prev) =>
                    prev ? { ...prev, value: e.target.value } : null
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 text-slate-900 font-medium text-sm outline-none transition-all"
              />
              {promptState.options.inputMatch && (
                <span className="text-xs text-slate-500 block">
                  Onaylamak için <strong>{promptState.options.inputMatch}</strong> yazın.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => handlePromptAction(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-sm cursor-pointer"
              >
                {promptState.options.cancelText}
              </button>
              <button
                type="submit"
                disabled={
                  Boolean(promptState.options.inputMatch) &&
                  promptState.value.trim() !== promptState.options.inputMatch?.trim()
                }
                className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-sm transition-all duration-150 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  promptState.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
                }`}
              >
                {promptState.options.confirmText}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return ctx;
}

