import { NoteEl } from '../../lib/boardData';
import { stripRich } from '../../lib/math/parseRich';

export const BOARD_FONT = 'var(--font-geist-sans), system-ui, sans-serif';

export function getFontFamily(family?: 'sans' | 'hand' | 'display' | 'school'): string {
  if (family === 'hand') return "'Patrick Hand', cursive, sans-serif";
  if (family === 'display') return "'Fredoka', sans-serif";
  if (family === 'school') return "'Andika', sans-serif";
  return BOARD_FONT;
}

/** Not metnini kutuya sığacak satırlara böler (yaklaşık karakter genişliğiyle) */
export function wrapLines(text: string, width: number, fontSize: number): string[] {
  const perLine = Math.max(1, Math.floor(width / (fontSize * 0.58)));
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    if (!raw) {
      out.push('');
      continue;
    }
    const words = raw.split(/\s+/);
    let line = '';
    for (const word of words) {
      if (!line) {
        line = word;
        continue;
      }
      if ((line + ' ' + word).length <= perLine) {
        line += ' ' + word;
      } else {
        out.push(line);
        let w = word;
        while (w.length > perLine) {
          out.push(w.slice(0, perLine));
          w = w.slice(perLine);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCtx) {
    measureCanvas = document.createElement('canvas');
    measureCtx = measureCanvas.getContext('2d');
  }
  return measureCtx;
}

/** Metin öğesi için canvas measureText ile gerçek genişliğe göre satır böler */
export function wrapTextLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  family: 'sans' | 'hand' | 'display' | 'school' = 'sans',
  weight: number = 400,
  italic: boolean = false,
  letterSpacing?: number
): string[] {
  const clean = stripRich(text);
  const ctx = getMeasureContext();
  const fontFamily = getFontFamily(family);
  const targetWidth = Math.max(20, maxWidth);

  if (!ctx) {
    return wrapLines(clean, targetWidth, fontSize);
  }

  ctx.font = `${italic ? 'italic ' : ''}${weight} ${fontSize}px ${fontFamily}`;

  const letterSpacingPx = letterSpacing ? letterSpacing * fontSize : 0;
  const hasLetterSpacingProp = 'letterSpacing' in ctx;
  if (hasLetterSpacingProp) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacingPx}px`;
  }

  const measureW = (str: string): number => {
    const base = ctx.measureText(str).width;
    if (!hasLetterSpacingProp && letterSpacingPx > 0 && str.length > 1) {
      return base + (str.length - 1) * letterSpacingPx;
    }
    return base;
  };

  const out: string[] = [];
  const paragraphs = clean.split('\n');

  for (const para of paragraphs) {
    if (!para) {
      out.push('');
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const w = measureW(testLine);

      if (w <= targetWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          out.push(currentLine);
          currentLine = '';
        }
        if (measureW(word) > targetWidth) {
          let chunk = '';
          for (const char of word) {
            const testChunk = chunk + char;
            if (measureW(testChunk) <= targetWidth) {
              chunk = testChunk;
            } else {
              if (chunk) out.push(chunk);
              chunk = char;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) {
      out.push(currentLine);
    }
  }

  if (hasLetterSpacingProp) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  }

  return out;
}

/**
 * Not veya metin öğesinin kenar boşluğu (padding).
 * - Eski Not (variant !== 'text'): 20 px
 * - Metin kutusu (boxFill veya boxBorder tanımlı): 16 px
 * - Düz Metin: 8 px
 */
export function textPad(el: NoteEl): number {
  if (el.variant !== 'text') return 20;
  if (el.boxFill || el.boxBorder) return 16;
  return 8;
}

/**
 * Metin öğesinin satır yüksekliği çarpanı (varsayılan 1.3).
 */
export function lineHeightOf(el: NoteEl): number {
  return el.lineHeight ?? 1.3;
}

/**
 * Metin öğesinin içeriğe ve satır bölmesine göre yüksekliğini hesaplar.
 */
export function computeTextHeight(el: NoteEl, text?: string): number {
  const pad = textPad(el);
  const lh = lineHeightOf(el);
  const targetText = text !== undefined ? text : (el.text || ' ');
  const lines = wrapTextLines(
    targetText || ' ',
    el.w - pad * 2,
    el.fontSize,
    el.fontFamily,
    el.fontWeight,
    el.italic,
    el.letterSpacing
  );
  const lineCount = Math.max(1, lines.length);
  return Math.round(Math.max(el.fontSize + pad * 2, lineCount * el.fontSize * lh + pad * 2));
}
