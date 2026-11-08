'use client';

import React from 'react';
import styles from './MathPalette.module.css';
import { MathText } from './MathText';

export interface MathTemplateItem {
  id: string;
  label: string;
  template: string;
  preview: string;
}

export const MATH_TEMPLATES: { category: string; items: MathTemplateItem[] }[] = [
  {
    category: 'Kesir ve Kökler',
    items: [
      { id: 'frac', label: 'Kesir', template: '\\frac{■}{■}', preview: '\\frac{a}{b}' },
      { id: 'mixed-frac', label: 'Tam Sayılı Kesir', template: '■\\frac{■}{■}', preview: '1\\frac{1}{2}' },
      { id: 'sup', label: 'Üs', template: '■^{■}', preview: 'x^2' },
      { id: 'sub', label: 'Alt indis', template: '■_{■}', preview: 'x_1' },
      { id: 'sqrt', label: 'Karekök', template: '\\sqrt{■}', preview: '\\sqrt{x}' },
      { id: 'nroot', label: 'n. Dereceden Kök', template: '\\sqrt[■]{■}', preview: '\\sqrt[n]{x}' },
      { id: 'paren', label: 'Parantez', template: '\\left( ■ \\right)', preview: '(x)' },
      { id: 'pm', label: 'Artı-Eksi', template: '\\pm ', preview: '\\pm' },
    ],
  },
  {
    category: 'İşlemler ve Karşılaştırma',
    items: [
      { id: 'times', label: 'Çarpı', template: '\\times ', preview: '\\times' },
      { id: 'div', label: 'Bölü', template: '\\div ', preview: '\\div' },
      { id: 'cdot', label: 'Nokta Çarpı', template: '\\cdot ', preview: '\\cdot' },
      { id: 'neq', label: 'Eşit Değil', template: '\\neq ', preview: '\\neq' },
      { id: 'approx', label: 'Yaklaşık', template: '\\approx ', preview: '\\approx' },
      { id: 'leq', label: 'Küçük Eşit', template: '\\leq ', preview: '\\leq' },
      { id: 'geq', label: 'Büyük Eşit', template: '\\geq ', preview: '\\geq' },
      { id: 'infty', label: 'Sonsuz', template: '\\infty ', preview: '\\infty' },
    ],
  },
  {
    category: 'Geometri ve Fen',
    items: [
      { id: 'pi', label: 'Pi', template: '\\pi ', preview: '\\pi' },
      { id: 'deg', label: 'Derece', template: '^\\circ ', preview: '30^\\circ' },
      { id: 'angle', label: 'Açı', template: '\\angle ', preview: '\\angle A' },
      { id: 'triangle', label: 'Üçgen', template: '\\triangle ', preview: '\\triangle' },
      { id: 'parallel', label: 'Paralel', template: '\\parallel ', preview: '\\parallel' },
      { id: 'perp', label: 'Dik', template: '\\perp ', preview: '\\perp' },
      { id: 'arrow', label: 'Ok', template: '\\rightarrow ', preview: '\\rightarrow' },
      { id: 'h2o', label: 'Su (H₂O)', template: '\\text{H}_2\\text{O}', preview: '\\text{H}_2\\text{O}' },
    ],
  },
];

/**
 * İmlecin veya seçimin bulunduğu textarea'ya formül şablonu yerleştirir.
 * - Seçili metin varsa ilk ■ yerine yerleştirilir ve sonraki ■ odaklanır.
 * - Seçili metin yoksa ilk ■ odaklanır.
 * - İmleç zaten $...$ içindeyse fazladan $ eklemez.
 */
export function insertMathTemplate(
  textarea: HTMLTextAreaElement,
  template: string,
  onUpdate?: (newText: string) => void
) {
  const val = textarea.value;
  const start = textarea.selectionStart ?? val.length;
  const end = textarea.selectionEnd ?? val.length;
  const sel = val.slice(start, end);

  // İmlecin unescaped $...$ içinde olup olmadığını kontrol et
  let unescapedDollars = 0;
  for (let i = 0; i < start; i++) {
    if (val[i] === '\\' && val[i + 1] === '$') {
      i++;
      continue;
    }
    if (val[i] === '$') {
      unescapedDollars++;
    }
  }
  const isInsideMath = unescapedDollars % 2 === 1;

  let snippet = template;
  let targetPlaceholderIndex = -1;

  if (sel.length > 0 && snippet.includes('■')) {
    const firstIdx = snippet.indexOf('■');
    snippet = snippet.slice(0, firstIdx) + sel + snippet.slice(firstIdx + 1);
    targetPlaceholderIndex = snippet.indexOf('■');
  } else if (snippet.includes('■')) {
    targetPlaceholderIndex = snippet.indexOf('■');
  }

  let fullInserted = snippet;
  let offsetBeforeSnippet = 0;

  if (!isInsideMath) {
    fullInserted = `$${snippet}$`;
    offsetBeforeSnippet = 1;
  }

  const before = val.slice(0, start);
  const after = val.slice(end);
  const nextVal = before + fullInserted + after;

  textarea.value = nextVal;
  if (onUpdate) onUpdate(nextVal);

  try {
    const ev = new Event('input', { bubbles: true });
    textarea.dispatchEvent(ev);
  } catch {}

  if (targetPlaceholderIndex !== -1) {
    const selStart = start + offsetBeforeSnippet + targetPlaceholderIndex;
    const selEnd = selStart + 1;
    textarea.focus();
    textarea.setSelectionRange(selStart, selEnd);
  } else {
    let cursor = start + fullInserted.length;
    if (!isInsideMath && snippet.length > 0 && sel.length === 0) {
      cursor = start + offsetBeforeSnippet + snippet.length;
    }
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  }
}

export interface MathPaletteProps {
  onInsert: (template: string) => void;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function MathPalette({ onInsert, onClose, className, style }: MathPaletteProps) {
  return (
    <div
      className={`${styles.palette} ${className || ''}`}
      style={style}
      role="region"
      aria-label="Formül paleti"
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <span className={styles.title}>Matematik Formülleri</span>
        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            title="Kapat"
            aria-label="Kapat"
          >
            ✕
          </button>
        )}
      </div>

      {MATH_TEMPLATES.map((section) => (
        <div key={section.category} className={styles.section}>
          <span className={styles.sectionLabel}>{section.category}</span>
          <div className={styles.grid}>
            {section.items.map((it) => (
              <button
                key={it.id}
                type="button"
                className={styles.btn}
                title={`${it.label} (${it.template})`}
                aria-label={it.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsert(it.template)}
              >
                <MathText text={`$${it.preview}$`} />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className={styles.footer}>
        Formüller <code>$...$</code> arasında yazılır.
      </div>
    </div>
  );
}
