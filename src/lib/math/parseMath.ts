export interface MathSegment {
  kind: 'text' | 'math';
  value: string;
}

/**
 * Metinde geçerli bir KaTeX formülü ($...$) olup olmadığını kontrol eder.
 * Kaçışlı (\$ ) ve kapanmamış ($ ) durumları formül sayılmaz.
 */
export function hasMath(text: string): boolean {
  if (!text || !text.includes('$')) return false;
  const segments = splitMath(text);
  return segments.some((s) => s.kind === 'math');
}

/**
 * Metni düz metin ve formül ($...$) parçalarına ayırır.
 * - Formüller tek dolar $...$ arasında yer alır.
 * - \$ düz bir dolar işaretine dönüştürülür.
 * - Kapanmamış $ varsa hata verilmez, metin düz olarak bırakılır.
 */
export function splitMath(text: string): MathSegment[] {
  if (!text) return [];
  const segments: MathSegment[] = [];
  let i = 0;
  let currentText = '';

  while (i < text.length) {
    // Kaçışlı dolar işareti: \$ -> düz $
    if (text[i] === '\\' && text[i + 1] === '$') {
      currentText += '$';
      i += 2;
      continue;
    }

    if (text[i] === '$') {
      // Kapanış $ işaretini ara
      let j = i + 1;
      let found = -1;
      while (j < text.length) {
        if (text[j] === '\\' && text[j + 1] === '$') {
          j += 2;
          continue;
        }
        if (text[j] === '$') {
          found = j;
          break;
        }
        j++;
      }

      if (found !== -1) {
        const mathContent = text.slice(i + 1, found);
        // Önceki birikmiş düz metni ekle
        if (currentText) {
          segments.push({ kind: 'text', value: currentText });
          currentText = '';
        }
        segments.push({ kind: 'math', value: mathContent });
        i = found + 1;
        continue;
      } else {
        // Kapanmamış $, düz metin olarak ele al
        currentText += '$';
        i++;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    segments.push({ kind: 'text', value: currentText });
  }

  return segments;
}

/**
 * Dışa aktarma veya yedek görünüm için metindeki $...$ işaretlerini temizler.
 */
export function stripMathDelimiters(text: string): string {
  if (!text) return '';
  const segments = splitMath(text);
  return segments.map((s) => s.value).join('');
}
