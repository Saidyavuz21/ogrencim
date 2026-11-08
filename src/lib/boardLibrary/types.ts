import { BoardEl } from '../boardData';

export type LibraryCategory = 'matematik' | 'fen' | 'genel';

export interface LibraryParam {
  key: string;
  label: string;
  type: 'number';
  min: number;
  max: number;
  step?: number;
  default: number;
  maxFrom?: string; // üst sınır başka bir parametreden gelir (örneğin boyali.maxFrom = 'dilim')
  minFrom?: string; // alt sınır başka bir parametreden gelir (örneğin bitis.minFrom = 'baslangic')
}

export interface LibraryItem {
  id: string; // kalıcı, ör. 'math.number-line'
  name: string; // 'Sayı doğrusu'
  category: LibraryCategory;
  keywords?: string[]; // arama için: ['sayı', 'doğru', 'tam sayı']
  params?: LibraryParam[];
  build: (params?: Record<string, number>) => BoardEl[]; // (0,0) başlangıçlı öğeler; id'ler önemsiz, eklerken yenilenir
}

/**
 * Parametreleri çözer: varsayılanları doldurur, bağımlı sınırları uygular, step'e yuvarlar.
 */
export function resolveParams(
  item: LibraryItem,
  partial?: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!item.params || item.params.length === 0) {
    return result;
  }

  // 1. İlk değerleri al (verilen değer yoksa varsayılan)
  for (const p of item.params) {
    const raw = partial?.[p.key];
    result[p.key] = typeof raw === 'number' && !Number.isNaN(raw) ? raw : p.default;
  }

  // 2. Bağımlı sınırları uygula, min/max aralığına kırp, step'e yuvarla
  for (const p of item.params) {
    let min = p.min;
    let max = p.max;

    if (p.minFrom && p.minFrom in result) {
      min = Math.max(min, result[p.minFrom]);
    }
    if (p.maxFrom && p.maxFrom in result) {
      max = Math.min(max, result[p.maxFrom]);
    }
    if (min > max) {
      min = max;
    }

    let val = result[p.key];
    val = Math.max(min, Math.min(max, val));

    if (p.step && p.step > 0) {
      val = min + Math.round((val - min) / p.step) * p.step;
      val = Math.max(min, Math.min(max, val));
    }

    result[p.key] = Math.round(val * 100) / 100;
  }

  return result;
}

// Son kullanılan parametreler bellekte tutulur (localStorage kullanılmaz)
const lastUsedParamsMap = new Map<string, Record<string, number>>();

export function getLastUsedParams(itemId: string): Record<string, number> | undefined {
  return lastUsedParamsMap.get(itemId);
}

export function setLastUsedParams(itemId: string, params: Record<string, number>): void {
  lastUsedParamsMap.set(itemId, { ...params });
}

