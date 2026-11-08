import { splitMath } from './parseMath';

export interface RichRun {
  text?: string;
  math?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  highlight?: string;
}

export interface RichLine {
  list?: 'bullet' | 'number';
  marker?: string;
  runs: RichRun[];
}

interface TagToken {
  isClose: boolean;
  tagName: 'b' | 'i' | 'u' | 'c' | 'h';
  param?: string;
  start: number;
  end: number;
}

/**
 * 6 haneli onaltılık renk kodunu doğrular (#RRGGBB).
 */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Metindeki geçerli ve doğru yuvalanmış etiket çiftlerini tespit eder.
 * Formül ($...$) aralıklarındaki etiketler taranmaz.
 */
function findValidTags(text: string): Map<number, TagToken> {
  const validTags = new Map<number, TagToken>();
  if (!text) return validTags;

  // 1. Formül aralıklarını belirle (bu aralıklar etiket taramasına kapalı)
  const mathSegments = splitMath(text);
  const mathRanges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const seg of mathSegments) {
    if (seg.kind === 'math') {
      const mathRaw = `$${seg.value}$`;
      const found = text.indexOf(mathRaw, cursor);
      if (found !== -1) {
        mathRanges.push({ start: found, end: found + mathRaw.length });
        cursor = found + mathRaw.length;
      }
    } else {
      cursor += seg.value.length;
    }
  }

  const isInsideMath = (idx: number) => mathRanges.some((r) => idx >= r.start && idx < r.end);

  // 2. Aday etiketleri tara
  const candidateTags: TagToken[] = [];
  const tagRegex = /\[(\/)?([biu]|c=#[0-9a-fA-F]{6}|h=#[0-9a-fA-F]{6}|c|h)\]/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const start = match.index;
    const end = tagRegex.lastIndex;

    // Formül içindeyse etiket sayılmaz
    if (isInsideMath(start)) continue;

    const isClose = Boolean(match[1]);
    const rawTag = match[2];

    if (!isClose) {
      const lower = rawTag.toLowerCase();
      if (lower === 'b' || lower === 'i' || lower === 'u') {
        candidateTags.push({ isClose: false, tagName: lower as 'b' | 'i' | 'u', start, end });
      } else if (lower.startsWith('c=')) {
        const color = rawTag.slice(2);
        if (HEX_COLOR_RE.test(color)) {
          candidateTags.push({ isClose: false, tagName: 'c', param: color, start, end });
        }
      } else if (lower.startsWith('h=')) {
        const color = rawTag.slice(2);
        if (HEX_COLOR_RE.test(color)) {
          candidateTags.push({ isClose: false, tagName: 'h', param: color, start, end });
        }
      }
    } else {
      const lower = rawTag.toLowerCase();
      if (lower === 'b' || lower === 'i' || lower === 'u' || lower === 'c' || lower === 'h') {
        candidateTags.push({ isClose: true, tagName: lower as 'b' | 'i' | 'u' | 'c' | 'h', start, end });
      }
    }
  }

  // 3. Eşleştirme ve sıra kontrolü (Strict Stack)
  const stack: TagToken[] = [];
  for (const tag of candidateTags) {
    if (!tag.isClose) {
      stack.push(tag);
    } else {
      if (stack.length === 0) continue;
      const top = stack[stack.length - 1];
      if (top.tagName === tag.tagName) {
        // Doğru sırada kapandı
        stack.pop();
        validTags.set(top.start, top);
        validTags.set(tag.start, tag);
      } else {
        // Yanlış sıralı kapanış: yığın içinde varsa bu yuvalanma bozuktur
        const idx = stack.findIndex((t) => t.tagName === tag.tagName);
        if (idx !== -1) {
          // Bozuk yuvalanmış tüm etiketleri yığından çıkar (düz metin olarak kalsınlar)
          stack.splice(idx);
        }
      }
    }
  }

  return validTags;
}

/**
 * Zengin metni (biçim etiketleri, formüller ve liste satırları) ayrıştırır.
 */
export function parseRich(text: string): RichLine[] {
  if (!text) return [{ runs: [] }];

  const validTags = findValidTags(text);
  const mathSegments = splitMath(text);

  // Formül başlangıç konumlarını haritala
  const mathMap = new Map<number, { value: string; length: number }>();
  let curPos = 0;
  for (const seg of mathSegments) {
    if (seg.kind === 'math') {
      const mathRaw = `$${seg.value}$`;
      const found = text.indexOf(mathRaw, curPos);
      if (found !== -1) {
        mathMap.set(found, { value: seg.value, length: mathRaw.length });
        curPos = found + mathRaw.length;
      }
    } else {
      curPos += seg.value.length;
    }
  }

  const lines: RichLine[] = [];
  let currentRuns: RichRun[] = [];

  let boldCount = 0;
  let italicCount = 0;
  let underlineCount = 0;
  const colorStack: string[] = [];
  const highlightStack: string[] = [];

  const addTextToCurrentRuns = (char: string) => {
    const bold = boldCount > 0 ? true : undefined;
    const italic = italicCount > 0 ? true : undefined;
    const underline = underlineCount > 0 ? true : undefined;
    const color = colorStack.length > 0 ? colorStack[colorStack.length - 1] : undefined;
    const highlight = highlightStack.length > 0 ? highlightStack[highlightStack.length - 1] : undefined;

    const last = currentRuns[currentRuns.length - 1];
    if (
      last &&
      last.text !== undefined &&
      last.bold === bold &&
      last.italic === italic &&
      last.underline === underline &&
      last.color === color &&
      last.highlight === highlight
    ) {
      last.text += char;
    } else {
      currentRuns.push({
        text: char,
        bold,
        italic,
        underline,
        color,
        highlight,
      });
    }
  };

  let i = 0;
  while (i < text.length) {
    // 1. Satır sonu
    if (text[i] === '\n') {
      lines.push({ runs: currentRuns });
      currentRuns = [];
      i++;
      continue;
    }

    // 2. Geçerli etiket kontrolü
    const tag = validTags.get(i);
    if (tag) {
      if (!tag.isClose) {
        if (tag.tagName === 'b') boldCount++;
        else if (tag.tagName === 'i') italicCount++;
        else if (tag.tagName === 'u') underlineCount++;
        else if (tag.tagName === 'c' && tag.param) colorStack.push(tag.param);
        else if (tag.tagName === 'h' && tag.param) highlightStack.push(tag.param);
      } else {
        if (tag.tagName === 'b' && boldCount > 0) boldCount--;
        else if (tag.tagName === 'i' && italicCount > 0) italicCount--;
        else if (tag.tagName === 'u' && underlineCount > 0) underlineCount--;
        else if (tag.tagName === 'c' && colorStack.length > 0) colorStack.pop();
        else if (tag.tagName === 'h' && highlightStack.length > 0) highlightStack.pop();
      }
      i = tag.end;
      continue;
    }

    // 3. Formül kontrolü
    const math = mathMap.get(i);
    if (math) {
      currentRuns.push({
        math: math.value,
        bold: boldCount > 0 ? true : undefined,
        italic: italicCount > 0 ? true : undefined,
        underline: underlineCount > 0 ? true : undefined,
        color: colorStack.length > 0 ? colorStack[colorStack.length - 1] : undefined,
        highlight: highlightStack.length > 0 ? highlightStack[highlightStack.length - 1] : undefined,
      });
      i += math.length;
      continue;
    }

    // 4. Düz karakter
    addTextToCurrentRuns(text[i]);
    i++;
  }

  // Son satırı ekle
  lines.push({ runs: currentRuns });

  // Her satırda liste belirteçlerini (madde / numara) tespit et ve ayıkla
  for (const line of lines) {
    if (!line.runs.length || line.runs[0].text === undefined) continue;

    const firstText = line.runs[0].text;

    // Madde işareti: `• ` veya `•`
    const bulletMatch = /^\s*•\s?(.*)$/.exec(firstText);
    if (bulletMatch) {
      line.list = 'bullet';
      line.marker = '•';
      const remainder = bulletMatch[1];
      if (remainder.length > 0) {
        line.runs[0].text = remainder;
      } else {
        line.runs.shift();
      }
      continue;
    }

    // Numaralı liste: `1. ` veya `1.`
    const numMatch = /^\s*(\d+)\.\s*(.*)$/.exec(firstText);
    if (numMatch) {
      line.list = 'number';
      line.marker = `${numMatch[1]}.`;
      const remainder = numMatch[2];
      if (remainder.length > 0) {
        line.runs[0].text = remainder;
      } else {
        line.runs.shift();
      }
      continue;
    }
  }

  return lines;
}

/**
 * Metinde en az bir geçerli biçimlendirme etiketi ya da liste satırı olup olmadığını kontrol eder.
 */
export function hasRich(text: string): boolean {
  if (!text) return false;
  const lines = parseRich(text);
  for (const line of lines) {
    if (line.list) return true;
    for (const run of line.runs) {
      if (run.bold || run.italic || run.underline || run.color || run.highlight) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Metindeki tüm [b], [/b], [c=...], [h=...] biçim etiketlerini kaldırır.
 * Liste belirteçleri ve formüller korunur.
 */
export function stripRich(text: string): string {
  if (!text) return '';
  const lines = parseRich(text);
  return lines
    .map((line) => {
      const prefix = line.marker ? `${line.marker} ` : '';
      const content = line.runs
        .map((r) => (r.math !== undefined ? `$${r.math}$` : r.text || ''))
        .join('');
      return `${prefix}${content}`;
    })
    .join('\n');
}

