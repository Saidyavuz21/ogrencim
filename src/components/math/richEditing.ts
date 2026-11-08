import { stripRich } from '../../lib/math/parseRich';

export interface EditResult {
  value: string;
  selStart: number;
  selEnd: number;
}

export type RichTag = 'b' | 'i' | 'u' | 'c' | 'h';

/**
 * Seçili metni (veya imleç konumunu) [b], [i], [u], [c=#hex], [h=#hex] ile sarar,
 * etiket zaten varsa kaldırır. Seçim yoksa boş etiket çifti ekler ve imleci arasına koyar.
 */
export function wrapSelection(
  value: string,
  selStart: number,
  selEnd: number,
  tag: RichTag,
  arg?: string | null
): EditResult {
  const start = Math.max(0, Math.min(selStart, value.length));
  const end = Math.max(start, Math.min(selEnd, value.length));

  if (tag === 'b' || tag === 'i' || tag === 'u') {
    const openTag = `[${tag}]`;
    const closeTag = `[/${tag}]`;

    if (start === end) {
      // Seçim yok: boş etiket çifti ekle, imleci arasına yerleştir
      const next = value.slice(0, start) + openTag + closeTag + value.slice(end);
      const cursor = start + openTag.length;
      return { value: next, selStart: cursor, selEnd: cursor };
    }

    const selected = value.slice(start, end);

    // 1. Seçim doğrudan [tag]...[/tag] ile mi sarılı?
    if (
      selected.toLowerCase().startsWith(openTag) &&
      selected.toLowerCase().endsWith(closeTag) &&
      selected.length >= openTag.length + closeTag.length
    ) {
      const inner = selected.slice(openTag.length, -closeTag.length);
      const next = value.slice(0, start) + inner + value.slice(end);
      return { value: next, selStart: start, selEnd: start + inner.length };
    }

    // 2. Seçimin hemen dışı [tag]...[/tag] mı?
    if (
      start >= openTag.length &&
      end + closeTag.length <= value.length &&
      value.slice(start - openTag.length, start).toLowerCase() === openTag &&
      value.slice(end, end + closeTag.length).toLowerCase() === closeTag
    ) {
      const next = value.slice(0, start - openTag.length) + selected + value.slice(end + closeTag.length);
      const newStart = start - openTag.length;
      return { value: next, selStart: newStart, selEnd: newStart + selected.length };
    }

    // 3. Etiketle sar
    const wrapped = `${openTag}${selected}${closeTag}`;
    const next = value.slice(0, start) + wrapped + value.slice(end);
    return { value: next, selStart: start, selEnd: start + wrapped.length };
  }

  if (tag === 'c') {
    const color = arg || '#1f2a24';
    const openTag = `[c=${color}]`;
    const closeTag = `[/c]`;

    if (start === end) {
      const next = value.slice(0, start) + openTag + closeTag + value.slice(end);
      const cursor = start + openTag.length;
      return { value: next, selStart: cursor, selEnd: cursor };
    }

    const selected = value.slice(start, end);
    const cMatch = /^\[c=#[0-9a-fA-F]{6}\]([\s\S]*)\[\/c\]$/i.exec(selected);
    if (cMatch) {
      const inner = cMatch[1];
      const wrapped = `${openTag}${inner}${closeTag}`;
      const next = value.slice(0, start) + wrapped + value.slice(end);
      return { value: next, selStart: start, selEnd: start + wrapped.length };
    }

    const before = value.slice(0, start);
    const after = value.slice(end);
    const beforeMatch = /\[c=#[0-9a-fA-F]{6}\]$/i.exec(before);
    if (beforeMatch && after.toLowerCase().startsWith('[/c]')) {
      const next = before.slice(0, -beforeMatch[0].length) + openTag + selected + closeTag + after.slice(4);
      const newStart = start - beforeMatch[0].length;
      const newEnd = newStart + openTag.length + selected.length + closeTag.length;
      return { value: next, selStart: newStart, selEnd: newEnd };
    }

    const wrapped = `${openTag}${selected}${closeTag}`;
    const next = value.slice(0, start) + wrapped + value.slice(end);
    return { value: next, selStart: start, selEnd: start + wrapped.length };
  }

  if (tag === 'h') {
    // Vurguyu kaldır
    if (!arg) {
      if (start === end) return { value, selStart: start, selEnd: end };
      const selected = value.slice(start, end);
      const hMatch = /^\[h=#[0-9a-fA-F]{6}\]([\s\S]*)\[\/h\]$/i.exec(selected);
      if (hMatch) {
        const inner = hMatch[1];
        const next = value.slice(0, start) + inner + value.slice(end);
        return { value: next, selStart: start, selEnd: start + inner.length };
      }
      const before = value.slice(0, start);
      const after = value.slice(end);
      const beforeMatch = /\[h=#[0-9a-fA-F]{6}\]$/i.exec(before);
      if (beforeMatch && after.toLowerCase().startsWith('[/h]')) {
        const next = before.slice(0, -beforeMatch[0].length) + selected + after.slice(4);
        const newStart = start - beforeMatch[0].length;
        return { value: next, selStart: newStart, selEnd: newStart + selected.length };
      }
      return { value, selStart: start, selEnd: end };
    }

    const openTag = `[h=${arg}]`;
    const closeTag = `[/h]`;

    if (start === end) {
      const next = value.slice(0, start) + openTag + closeTag + value.slice(end);
      const cursor = start + openTag.length;
      return { value: next, selStart: cursor, selEnd: cursor };
    }

    const selected = value.slice(start, end);
    const hMatch = /^\[h=#[0-9a-fA-F]{6}\]([\s\S]*)\[\/h\]$/i.exec(selected);
    if (hMatch) {
      const inner = hMatch[1];
      const wrapped = `${openTag}${inner}${closeTag}`;
      const next = value.slice(0, start) + wrapped + value.slice(end);
      return { value: next, selStart: start, selEnd: start + wrapped.length };
    }

    const before = value.slice(0, start);
    const after = value.slice(end);
    const beforeMatch = /\[h=#[0-9a-fA-F]{6}\]$/i.exec(before);
    if (beforeMatch && after.toLowerCase().startsWith('[/h]')) {
      const next = before.slice(0, -beforeMatch[0].length) + openTag + selected + closeTag + after.slice(4);
      const newStart = start - beforeMatch[0].length;
      const newEnd = newStart + openTag.length + selected.length + closeTag.length;
      return { value: next, selStart: newStart, selEnd: newEnd };
    }

    const wrapped = `${openTag}${selected}${closeTag}`;
    const next = value.slice(0, start) + wrapped + value.slice(end);
    return { value: next, selStart: start, selEnd: start + wrapped.length };
  }

  return { value, selStart: start, selEnd: end };
}

/**
 * Seçili satırları madde işaretli (•) ya da numaralı (1., 2.) listeye dönüştürür veya kaldırır.
 */
export function toggleList(
  value: string,
  selStart: number,
  selEnd: number,
  type: 'bullet' | 'number'
): EditResult {
  const start = Math.max(0, Math.min(selStart, value.length));
  const end = Math.max(start, Math.min(selEnd, value.length));

  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');

  if (type === 'bullet') {
    const allBullet = lines.every((l) => /^\s*•\s*/.test(l));
    let newLines: string[];
    if (allBullet) {
      newLines = lines.map((l) => l.replace(/^\s*•\s*/, ''));
    } else {
      newLines = lines.map((l) => {
        const clean = l.replace(/^\s*(?:•|\d+\.)\s*/, '');
        return `• ${clean}`;
      });
    }
    const newBlock = newLines.join('\n');
    const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    return { value: next, selStart: lineStart, selEnd: lineStart + newBlock.length };
  } else {
    const allNumber = lines.every((l) => /^\s*\d+\.\s*/.test(l));
    let newLines: string[];
    if (allNumber) {
      newLines = lines.map((l) => l.replace(/^\s*\d+\.\s*/, ''));
    } else {
      let count = 1;
      newLines = lines.map((l) => {
        const clean = l.replace(/^\s*(?:•|\d+\.)\s*/, '');
        return `${count++}. ${clean}`;
      });
    }
    const newBlock = newLines.join('\n');
    const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    return { value: next, selStart: lineStart, selEnd: lineStart + newBlock.length };
  }
}

/**
 * Metnin tamamında liste biçimini açar/kapatır (seçim olmadığında tahtada kullanılan yedek).
 */
export function toggleTextList(text: string, type: 'bullet' | 'number'): string {
  return toggleList(text, 0, text.length, type).value;
}

/**
 * Seçili veya imlecin bulunduğu konuma formül şablonunu yerleştirir ($...$ ile).
 * - Seçili metin varsa ilk ■ yerine yerleştirilir ve sonraki ■ odaklanır.
 * - Seçili metin yoksa ilk ■ odaklanır.
 * - İmleç zaten $...$ içindeyse fazladan $ eklemez.
 */
export function insertTemplate(
  value: string,
  selStart: number,
  selEnd: number,
  template: string
): EditResult {
  const start = Math.max(0, Math.min(selStart, value.length));
  const end = Math.max(start, Math.min(selEnd, value.length));
  const sel = value.slice(start, end);

  // İmlecin unescaped $...$ içinde olup olmadığını kontrol et
  let unescapedDollars = 0;
  for (let i = 0; i < start; i++) {
    if (value[i] === '\\' && value[i + 1] === '$') {
      i++;
      continue;
    }
    if (value[i] === '$') {
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

  const before = value.slice(0, start);
  const after = value.slice(end);
  const nextVal = before + fullInserted + after;

  if (targetPlaceholderIndex !== -1) {
    const pStart = start + offsetBeforeSnippet + targetPlaceholderIndex;
    return { value: nextVal, selStart: pStart, selEnd: pStart + 1 };
  } else {
    let cursor = start + fullInserted.length;
    if (!isInsideMath && snippet.length > 0 && sel.length === 0) {
      cursor = start + offsetBeforeSnippet + snippet.length;
    }
    return { value: nextVal, selStart: cursor, selEnd: cursor };
  }
}

/**
 * Listede Enter'a basıldığında liste devamını veya boş satırdan çıkışı yönetir.
 */
export function handleListEnter(
  value: string,
  selStart: number,
  selEnd: number
): { value: string; selStart: number; selEnd: number; handled: boolean } {
  const pos = Math.max(0, Math.min(selStart, value.length));
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  let lineEnd = value.indexOf('\n', pos);
  if (lineEnd === -1) lineEnd = value.length;
  const line = value.slice(lineStart, lineEnd);

  // Madde işaretli liste
  const bulletMatch = /^\s*•\s*(.*)$/.exec(line);
  if (bulletMatch) {
    const content = bulletMatch[1];
    if (content.trim() === '') {
      // Boş madde işareti: listeden çık (satırdaki • kaldırılır)
      const next = value.slice(0, lineStart) + value.slice(lineEnd);
      return { value: next, selStart: lineStart, selEnd: lineStart, handled: true };
    }
    const insert = '\n• ';
    const next = value.slice(0, pos) + insert + value.slice(pos);
    const newPos = pos + insert.length;
    return { value: next, selStart: newPos, selEnd: newPos, handled: true };
  }

  // Numaralı liste
  const numMatch = /^\s*(\d+)\.\s*(.*)$/.exec(line);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const content = numMatch[2];
    if (content.trim() === '') {
      // Boş numara: listeden çık
      const next = value.slice(0, lineStart) + value.slice(lineEnd);
      return { value: next, selStart: lineStart, selEnd: lineStart, handled: true };
    }
    const insert = `\n${num + 1}. `;
    const next = value.slice(0, pos) + insert + value.slice(pos);
    const newPos = pos + insert.length;
    return { value: next, selStart: newPos, selEnd: newPos, handled: true };
  }

  return { value, selStart, selEnd, handled: false };
}

/**
 * Düzenleme sonucunu ilgili textarea veya input elemanına uygular, imleci ayarlar ve olayı tetikler.
 */
export function applyEditToElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  edit: EditResult,
  onChange?: (val: string) => void
): void {
  element.value = edit.value;
  if (onChange) onChange(edit.value);

  try {
    const ev = new Event('input', { bubbles: true });
    element.dispatchEvent(ev);
  } catch {}

  element.focus();
  element.setSelectionRange(edit.selStart, edit.selEnd);
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      try {
        element.setSelectionRange(edit.selStart, edit.selEnd);
      } catch {}
    });
  }
}

/**
 * Tek satırlık tablo başlıkları, özetler ve title öznitelikleri için metindeki
 * tüm biçim etiketlerini ([b], [c], vb.) ve $...$ formül işaretlerini temizler.
 */
export function stripRichAndMath(text: string): string {
  if (!text) return '';
  const clean = stripRich(text);
  return clean
    .replace(/(?<!\\)\$([^$]+?)(?<!\\)\$/g, '$1')
    .replace(/\\\$/g, '$')
    .trim();
}

