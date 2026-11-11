import { BOARD_W, NoteEl } from '../../lib/boardData';
import { stripRich } from '../../lib/math/parseRich';
import { hasMath } from '../../lib/math/parseMath';

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

/**
 * Tuval (canvas) ölçümü için yazı tipi ailesi. Tuval `var(--font-geist-sans)` gibi CSS değişkenlerini
 * kabul etmez; böyle bir tanım verilince atamayı yok sayar ve ölçüm bir önceki (ya da 10 px'lik varsayılan)
 * yazı tipiyle yapılır. Bu yüzden değişken sayfadaki gerçek değeriyle değiştirilir.
 */
let resolvedSans: string | null = null;
function canvasFontFamily(fontFamily: string): string {
  if (!fontFamily.includes('var(')) return fontFamily;
  if (resolvedSans === null && typeof document !== 'undefined') {
    const read = (node: Element) => getComputedStyle(node).getPropertyValue('--font-geist-sans').trim();
    const value = (document.body && read(document.body)) || read(document.documentElement);
    if (value) resolvedSans = value;
  }
  return fontFamily.replace(/var\(--font-geist-sans\)\s*,?\s*/, resolvedSans ? `${resolvedSans}, ` : '');
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
  const fontFamily = canvasFontFamily(getFontFamily(family));
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

/** Yeni metin kutusunun yazarken kullandığı genişlik (tahta birimi) */
export const TEXT_EDIT_W = 520;

/**
 * Metin yazılırken kullanılacak genişlik. Genişliği yazıya göre ayarlanan kutu (autoW) dar olabilir;
 * yazarken satır hemen kırılmasın diye yazma alanı en az TEXT_EDIT_W (ya da tahtanın kenarına kadar) açılır.
 */
export function textEditWidth(el: NoteEl): number {
  if (el.variant !== 'text' || !el.autoW) return el.w;
  return Math.max(el.w, Math.min(TEXT_EDIT_W, BOARD_W - el.x));
}

/**
 * Genişliği yazıya göre ayarlanan metin kutusu (autoW) için yeni genişlik: yazı, yazma genişliğinde
 * satırlara bölünür ve kutu en uzun satıra oturtulur. Uygulanmayacaksa null döner
 * (autoW kapalı, ortalı/sağa yaslı yazı, formül içeren yazı ya da ölçüm yapılamıyorsa).
 *
 * Bu özellikten önce eklenmiş kutularda (autoW tanımsız) yalnızca güvenli durumda uygulanır:
 * kutunun zemini/kenarlığı yoksa ve yazı kutuda hiç alt satıra kırılmıyorsa. O zaman kutu yalnızca
 * daralır, yazının görünümü değişmez; çağıran taraf autoW'yi açar.
 */
export function fitTextWidth(el: NoteEl, text?: string): number | null {
  if (el.variant !== 'text' || el.autoW === false) return null;
  if (el.align && el.align !== 'left') return null;
  const value = text !== undefined ? text : el.text;
  if (hasMath(value || '')) return null;
  const ctx = getMeasureContext();
  if (!ctx) return null;
  const pad = textPad(el);
  const legacy = el.autoW === undefined;
  if (legacy && (el.boxFill || el.boxBorder)) return null;
  const limit = legacy ? el.w : textEditWidth(el);
  const lines = wrapTextLines(value || ' ', limit - pad * 2, el.fontSize, el.fontFamily, el.fontWeight, el.italic, el.letterSpacing);
  if (legacy && lines.length !== (value || ' ').split('\n').length) return null;
  ctx.font = `${el.italic ? 'italic ' : ''}${el.fontWeight || 400} ${el.fontSize}px ${canvasFontFamily(getFontFamily(el.fontFamily))}`;
  const spacing = el.letterSpacing ? el.letterSpacing * el.fontSize : 0;
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, ctx.measureText(line).width + Math.max(0, line.length - 1) * spacing);
  }
  // Ölçüm yazı tipine göre biraz şaşabilir: satır yeniden kırılmasın diye küçük bir pay bırakılır
  const fitted = Math.ceil(widest * 1.06 + el.fontSize * 0.2) + pad * 2;
  return Math.min(limit, Math.max(el.fontSize + pad * 2, fitted));
}

/** Metin kutusu zemin renkleri: önce açık tonlar, sonra koyular (koyu zeminde yazı beyaza çevrilir) */
export const BOX_FILLS: { c: string; label: string; dark?: boolean }[] = [
  { c: '#ffffff', label: 'Beyaz' },
  { c: '#f1f3f5', label: 'Gri' },
  { c: '#fff3bf', label: 'Sarı' },
  { c: '#ffe8cc', label: 'Turuncu' },
  { c: '#ffe3e3', label: 'Kırmızı' },
  { c: '#ffdeeb', label: 'Pembe' },
  { c: '#e5dbff', label: 'Mor' },
  { c: '#d0ebff', label: 'Mavi' },
  { c: '#c5f6fa', label: 'Turkuaz' },
  { c: '#d3f9d8', label: 'Yeşil' },
  { c: '#25634b', label: 'Koyu yeşil', dark: true },
  { c: '#1c3d6e', label: 'Lacivert', dark: true },
  { c: '#a3283a', label: 'Koyu kırmızı', dark: true },
  { c: '#1f2a24', label: 'Siyah', dark: true },
];
/** Metin kutusu kenarlık renkleri */
export const BOX_BORDERS: { c: string; label: string }[] = [
  { c: '#1f2a24', label: 'Siyah' },
  { c: '#868e96', label: 'Gri' },
  { c: '#25634b', label: 'Koyu yeşil' },
  { c: '#2f9e44', label: 'Yeşil' },
  { c: '#0c8599', label: 'Turkuaz' },
  { c: '#1971c2', label: 'Mavi' },
  { c: '#7048e8', label: 'Mor' },
  { c: '#d6336c', label: 'Pembe' },
  { c: '#e03131', label: 'Kırmızı' },
  { c: '#f08c00', label: 'Turuncu' },
  { c: '#fab005', label: 'Sarı' },
];
/** Zemin koyu mu? Hazır koyu tonlar ya da özel seçilmiş koyu bir renk (parlaklığa göre) */
export function isDarkFill(color?: string | null): boolean {
  if (!color) return false;
  const preset = BOX_FILLS.find((f) => f.c === color.toLowerCase());
  if (preset) return !!preset.dark;
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum < 0.5;
}
