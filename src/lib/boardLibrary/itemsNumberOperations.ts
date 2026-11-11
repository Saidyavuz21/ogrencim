import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 25): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const rect = (x: number, y: number, w: number, h: number, fill = '#ffffff'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: '#a4b1a6', width: 2, fill, rx: 8 });
const integer = (params: Record<string, number> | undefined, key: string, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

export const NUMBER_OPERATION_ITEMS: LibraryItem[] = [
  {
    id: 'math.division-groups', name: 'Bölme: gruplama ve kalan', category: 'matematik',
    keywords: ['bölme', 'bolme', 'gruplama', 'kalan', 'bölüm', 'bolum', 'eşit grup'],
    params: [{ key: 'toplam', label: 'Toplam nesne', type: 'number', min: 0, max: 24, default: 14 }, { key: 'grup', label: 'Her gruptaki nesne', type: 'number', min: 2, max: 6, default: 4 }],
    build: params => {
      const total = integer(params, 'toplam', 14, 0, 24), perGroup = integer(params, 'grup', 4, 2, 6);
      const quotient = Math.floor(total / perGroup), remainder = total % perGroup;
      const els: BoardEl[] = [label(20, 0, 600, 60, `${total} ÷ ${perGroup} = ${quotient} · Kalan: ${remainder}`, 28)];
      for (let group = 0; group < quotient + (remainder > 0 ? 1 : 0); group++) {
        const isRemainder = group === quotient, count = isRemainder ? remainder : perGroup;
        const x = 20 + group % 3 * 205, y = 80 + Math.floor(group / 3) * 165;
        els.push(rect(x, y, 185, 145, isRemainder ? '#fff3d6' : '#f7faf7'), label(x + 5, y + 5, 175, 44, isRemainder ? 'Kalan' : `${group + 1}. grup`, 21));
        for (let i = 0; i < count; i++) els.push({ id: newId(), type: 'ellipse', x1: x + 25 + i % 3 * 50, y1: y + 57 + Math.floor(i / 3) * 42, x2: x + 53 + i % 3 * 50, y2: y + 85 + Math.floor(i / 3) * 42, color: '#25634b', width: 2, fill: '#75ab8b' });
      }
      return els;
    },
  },
  {
    id: 'math.skip-counting', name: 'Ritmik sayma şeridi', category: 'matematik',
    keywords: ['ritmik sayma', 'sayma', 'sayı', 'sayi', 'örüntü', 'oruntu', 'artış', 'adım'],
    params: [{ key: 'baslangic', label: 'Başlangıç sayısı', type: 'number', min: 0, max: 50, default: 0 }, { key: 'adim', label: 'Artış miktarı', type: 'number', min: 1, max: 10, default: 5 }, { key: 'adet', label: 'Gösterilecek sayı adedi', type: 'number', min: 3, max: 10, default: 10 }],
    build: params => {
      const start = integer(params, 'baslangic', 0, 0, 50), step = integer(params, 'adim', 5, 1, 10), count = integer(params, 'adet', 10, 3, 10);
      const els: BoardEl[] = [label(20, 0, 580, 55, `Her adımda ${step} ekle`, 27)];
      for (let i = 0; i < count; i++) {
        const x = 20 + i % 5 * 115, y = 80 + Math.floor(i / 5) * 115;
        els.push(rect(x, y, 95, 80, '#e6f1e9'), label(x + 3, y + 10, 89, 60, String(start + i * step), 29));
      }
      return els;
    },
  },
  {
    id: 'math.number-comparison', name: 'Sayı karşılaştırma', category: 'matematik',
    keywords: ['karşılaştırma', 'karsilastirma', 'büyük', 'buyuk', 'küçük', 'kucuk', 'eşit', 'esit', 'sayı'],
    params: [{ key: 'sol', label: 'Soldaki sayı', type: 'number', min: 0, max: 999, default: 48 }, { key: 'sag', label: 'Sağdaki sayı', type: 'number', min: 0, max: 999, default: 36 }],
    build: params => {
      const left = integer(params, 'sol', 48, 0, 999), right = integer(params, 'sag', 36, 0, 999);
      const sign = left === right ? '=' : left > right ? '>' : '<';
      const words = left === right ? 'eşittir' : left > right ? 'büyüktür' : 'küçüktür';
      return [rect(20, 20, 190, 130, '#e6f1e9'), label(30, 45, 170, 80, String(left), 48), label(230, 40, 110, 95, sign, 60), rect(360, 20, 190, 130, '#e6f1e9'), label(370, 45, 170, 80, String(right), 48), label(20, 185, 530, 70, `${left} ${words} ${right}`, 29)];
    },
  },
];
