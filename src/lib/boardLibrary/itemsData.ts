import { newId, type BoardEl, type ShapeEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const line = (x1: number, y1: number, x2: number, y2: number, color = ink): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color, width: 2 });
const rect = (x: number, y: number, w: number, h: number, fill = '#ffffff'): ShapeEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: ink, width: 2, fill, rx: 0 });
const label = (x: number, y: number, w: number, text: string, size = 22) => createText(x, y, w, 48, text, size, 'center', false, 'sans', ink);
const integer = (params: Record<string, number> | undefined, key: string, fallback: number, max: number) => Math.max(0, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

export const DATA_ITEMS: LibraryItem[] = [
  {
    id: 'math.bar-chart', name: 'Sütun grafiği', category: 'matematik',
    keywords: ['veri', 'grafik', 'sütun', 'sutun', 'karşılaştırma', 'karsilastirma', 'istatistik'],
    params: ['A', 'B', 'C', 'D'].map((name, i) => ({ key: name, label: `${name} değeri`, type: 'number' as const, min: 0, max: 10, default: [4, 7, 3, 6][i] })),
    build: params => {
      const els: BoardEl[] = [label(60, 0, 460, 'Örnek veri — değerleri değiştirin', 20)];
      for (let n = 0; n <= 10; n += 2) {
        const y = 320 - n * 24;
        els.push(line(65, y, 520, y, '#dedad0'), label(10, y - 23, 45, String(n), 18));
      }
      els.push(line(65, 65, 65, 320), line(65, 320, 530, 320));
      ['A', 'B', 'C', 'D'].forEach((name, i) => {
        const n = integer(params, name, [4, 7, 3, 6][i], 10), x = 100 + i * 105;
        if (n > 0) els.push(rect(x, 320 - n * 24, 60, n * 24, '#d4e6da'));
        els.push(label(x - 5, 325, 70, name), label(x - 5, 320 - n * 24 - 46, 70, String(n), 18));
      });
      return els;
    },
  },
  {
    id: 'math.tally-marks', name: 'Çetele modeli', category: 'matematik',
    keywords: ['çetele', 'cetele', 'sayma', 'beşerli', 'beserli', 'veri', 'sıklık', 'siklik'],
    params: [{ key: 'sayi', label: 'Gösterilecek sayı', type: 'number', min: 0, max: 30, default: 17 }],
    build: params => {
      const n = integer(params, 'sayi', 17, 30);
      const els: BoardEl[] = [label(20, 0, 560, `Çetele: ${n}`, 28)];
      for (let i = 0; i < n; i++) {
        const group = Math.floor(i / 5), pos = i % 5;
        const x = 30 + (group % 3) * 190, y = 75 + Math.floor(group / 3) * 115;
        els.push(pos === 4 ? line(x - 8, y + 65, x + 92, y - 5) : line(x + pos * 28, y, x + pos * 28, y + 60));
      }
      if (n === 0) els.push(label(20, 70, 560, 'Henüz işaret yok', 22));
      return els;
    },
  },
  {
    id: 'math.place-value-table', name: 'Basamak değeri tablosu', category: 'matematik',
    keywords: ['basamak', 'sayı', 'sayi', 'çözümleme', 'cozumleme', 'birler', 'onlar', 'yüzler', 'binler'],
    params: [{ key: 'sayi', label: 'Çözümlenecek sayı', type: 'number', min: 0, max: 9999, default: 2345 }],
    build: params => {
      const n = integer(params, 'sayi', 2345, 9999);
      const digits = String(n).padStart(4, '0').split('').map(Number);
      const names = ['Binler', 'Yüzler', 'Onlar', 'Birler'];
      const els: BoardEl[] = [label(20, 0, 640, `Sayı: ${n}`, 28)];
      names.forEach((name, i) => {
        const x = 20 + i * 160, value = digits[i] * 10 ** (3 - i);
        els.push(rect(x, 60, 160, 55, '#e6f1e9'), label(x + 5, 63, 150, name), rect(x, 115, 160, 65), label(x + 5, 123, 150, String(digits[i]), 30), rect(x, 180, 160, 60), label(x + 5, 185, 150, String(value), 24));
      });
      els.push(label(20, 260, 640, `${n} = ${digits.map((d, i) => d * 10 ** (3 - i)).join(' + ')}`, 26));
      return els;
    },
  },
];
