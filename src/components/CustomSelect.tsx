'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from './icons';
import styles from './CustomSelect.module.css';

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options: (CustomSelectOption | string)[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function CustomSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Seçiniz...',
  disabled = false,
  className = '',
  triggerClassName = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Klavyeyle üzerinde durulan seçenek (oklar, Home/End, harf ile atlama)
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const listId = useId();

  // Normalize options to CustomSelectOption objects
  const normalizedOptions: CustomSelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === value);

  const open = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  // Açıkken üzerinde durulan seçeneği görünür alana kaydır
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  /** Harfe basınca o harfle başlayan seçeneğe atlar (ör. 81 il listesinde "İ" → İstanbul) */
  const jumpTo = (key: string) => {
    const now = Date.now();
    const t = typeahead.current;
    t.text = now - t.at > 700 ? key : t.text + key;
    t.at = now;
    const q = t.text.toLocaleLowerCase('tr-TR');
    const from = isOpen ? activeIndex : selectedIndex;
    const n = normalizedOptions.length;
    for (let step = t.text.length > 1 ? 0 : 1; step <= n; step++) {
      const i = (Math.max(from, 0) + step) % n;
      if (normalizedOptions[i].label.toLocaleLowerCase('tr-TR').startsWith(q)) {
        if (isOpen) setActiveIndex(i);
        else onChange(normalizedOptions[i].value);
        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const n = normalizedOptions.length;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) { open(); return; }
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((i) => Math.min(n - 1, Math.max(0, (i < 0 ? selectedIndex : i) + dir)));
        return;
      }
      case 'Home':
      case 'End':
        if (!isOpen) return;
        e.preventDefault();
        setActiveIndex(e.key === 'Home' ? 0 : n - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && normalizedOptions[activeIndex]) handleSelect(normalizedOptions[activeIndex].value);
        else if (isOpen) setIsOpen(false);
        else open();
        return;
      case 'Escape':
        if (isOpen) { e.preventDefault(); setIsOpen(false); }
        return;
      case 'Tab':
        setIsOpen(false);
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && n) {
          e.preventDefault();
          jumpTo(e.key);
        }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.customSelectWrap} ${className} ${disabled ? styles.disabled : ''}`}
    >
      <button
        id={id}
        type="button"
        className={`${styles.selectTrigger} ${triggerClassName} ${isOpen ? styles.open : ''}`}
        onClick={() => { if (disabled) return; if (isOpen) setIsOpen(false); else open(); }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
      >
        <span className={styles.selectedContent}>
          {selectedOption ? (
            <span className={styles.selectedLabelGroup}>
              <span className={styles.selectedLabel}>{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className={styles.badge}>{selectedOption.badge}</span>
              )}
            </span>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}
        />
      </button>

      {isOpen && (
        <ul ref={listRef} id={listId} className={styles.dropdownMenu} role="listbox">
          {normalizedOptions.length === 0 ? (
            <li className={styles.emptyOption}>Seçenek bulunamadı</li>
          ) : (
            normalizedOptions.map((opt, index) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.optionItem} ${isSelected ? styles.selectedItem : ''} ${index === activeIndex ? styles.activeItem : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className={styles.optionBody}>
                    <div className={styles.optionMainRow}>
                      <span className={styles.optionLabel}>{opt.label}</span>
                      {opt.badge && <span className={styles.badge}>{opt.badge}</span>}
                    </div>
                    {opt.description && (
                      <span className={styles.optionDesc}>{opt.description}</span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={16} aria-hidden="true" className={styles.checkIcon} />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
