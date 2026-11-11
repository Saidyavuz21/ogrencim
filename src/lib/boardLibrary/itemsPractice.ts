import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const box = (x: number, y: number, w: number, h: number, fill = '#ffffff'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: '#a4b1a6', width: 1.5, fill, rx: 0 });
const label = (x: number, y: number, w: number, h: number, text: string, size = 22): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const integer = (params: Record<string, number> | undefined, key: string, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

export const PRACTICE_ITEMS: LibraryItem[] = [
  {
    id: 'math.multiplication-table', name: 'Çarpım tablosu', category: 'matematik',
    keywords: ['çarpım', 'carpim', 'çarpma', 'carpma', 'tablo', 'işlem', 'islem'],
    params: [{ key: 'sinir', label: 'En büyük çarpan', type: 'number', min: 3, max: 10, default: 10 }],
    build: params => {
      const n = integer(params, 'sinir', 10, 3, 10), cell = 58;
      const els: BoardEl[] = [];
      for (let row = 0; row <= n; row++) {
        for (let col = 0; col <= n; col++) {
          const x = 20 + col * cell, y = 20 + row * cell;
          const text = row === 0 && col === 0 ? '×' : row === 0 ? String(col) : col === 0 ? String(row) : String(row * col);
          els.push(box(x, y, cell, cell, row === 0 || col === 0 ? '#e6f1e9' : '#ffffff'), label(x + 2, y + 5, cell - 4, cell - 10, text, 23));
        }
      }
      return els;
    },
  },
  {
    id: 'math.percent-grid', name: 'Yüzde modeli (100 kare)', category: 'matematik',
    keywords: ['yüzde', 'yuzde', 'yüzlük', 'yuzluk', 'kesir', 'ondalık', 'ondalik', 'oran', '100 kare'],
    params: [{ key: 'yuzde', label: 'Boyalı hücre sayısı (%)', type: 'number', min: 0, max: 100, default: 35 }],
    build: params => {
      const n = integer(params, 'yuzde', 35, 0, 100), els: BoardEl[] = [];
      for (let i = 0; i < 100; i++) els.push(box(20 + i % 10 * 32, 20 + Math.floor(i / 10) * 32, 32, 32, i < n ? '#75ab8b' : '#ffffff'));
      const decimal = (n / 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
      els.push(label(20, 355, 320, 58, `%${n} = ${n}/100 = ${decimal}`, 25));
      return els;
    },
  },
  {
    id: 'math.pattern-strip', name: 'Şekil örüntüsü', category: 'matematik',
    keywords: ['örüntü', 'oruntu', 'şekil', 'sekil', 'tekrar', 'sıralama', 'siralama', 'devam'],
    params: [{ key: 'uzunluk', label: 'Gösterilecek şekil sayısı', type: 'number', min: 4, max: 12, default: 7 }, { key: 'birim', label: 'Tekrar birimi (2 veya 3 şekil)', type: 'number', min: 2, max: 3, default: 3 }],
    build: params => {
      const n = integer(params, 'uzunluk', 7, 4, 12), unit = integer(params, 'birim', 3, 2, 3);
      const els: BoardEl[] = [];
      for (let i = 0; i < n; i++) {
        const x = 20 + i % 6 * 110, y = 20 + Math.floor(i / 6) * 125;
        switch (i % unit) {
          case 0: els.push({ id: newId(), type: 'ellipse', x1: x, y1: y + 5, x2: x + 75, y2: y + 80, color: ink, width: 2, fill: '#d4e6da' }); break;
          case 1: els.push(box(x, y + 5, 75, 75, '#f4e8c9')); break;
          default: els.push({ id: newId(), type: 'poly', points: [x + 38, y, x + 78, y + 80, x, y + 80], color: ink, width: 2, fill: '#cce5ed' });
        }
      }
      const bottom = 20 + Math.floor((n - 1) / 6) * 125 + 100;
      els.push(label(20, bottom, 660, 55, 'Örüntüyü devam ettir.', 27));
      return els;
    },
  },
];
