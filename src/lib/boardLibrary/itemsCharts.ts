import { newId, type BoardEl } from '../boardData';
import type { LibraryItem, LibraryParam } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 23): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const line = (x1: number, y1: number, x2: number, y2: number, color = ink, width = 2): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color, width });
const box = (x: number, y: number, w: number, h: number, fill = '#ffffff'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: '#a4b1a6', width: 1.5, fill, rx: 0 });
const defaults = [4, 8, 6, 2];
const parameters = (step = 1): LibraryParam[] => ['A', 'B', 'C', 'D'].map((key, i) => ({ key, label: `${key} sayısı`, type: 'number', min: 0, max: 10, step, default: defaults[i] }));
const values = (params?: Record<string, number>) => ['A', 'B', 'C', 'D'].map((key, i) => Math.max(0, Math.min(10, Math.round(Number.isFinite(params?.[key]) ? params![key] : defaults[i]))));

export const CHART_ITEMS: LibraryItem[] = [
  {
    id: 'math.line-chart', name: 'Çizgi grafiği', category: 'matematik',
    keywords: ['çizgi grafiği', 'cizgi grafigi', 'veri', 'değişim', 'degisim', 'grafik'],
    params: parameters(),
    build: params => {
      const ns = values(params), els: BoardEl[] = [label(20, 0, 560, 55, 'Örnek veri — değerleri değiştirin', 24)];
      for (let n = 0; n <= 10; n += 2) {
        const y = 340 - n * 25;
        els.push(line(70, y, 560, y, '#dedad0', 1.5), label(15, y - 24, 45, 48, String(n), 20));
      }
      els.push(line(70, 75, 70, 340), line(70, 340, 565, 340));
      ns.forEach((n, i) => {
        const x = 110 + i * 140, y = 340 - n * 25;
        if (i > 0) els.push(line(x - 140, 340 - ns[i - 1] * 25, x, y, '#25634b', 3));
      });
      ns.forEach((n, i) => {
        const x = 110 + i * 140, y = 340 - n * 25;
        els.push({ id: newId(), type: 'ellipse', x1: x - 6, y1: y - 6, x2: x + 6, y2: y + 6, color: '#25634b', width: 2, fill: '#25634b' }, label(x - 35, 350, 70, 50, ['A', 'B', 'C', 'D'][i], 23), label(x - 30, y - 53, 60, 44, String(n), 21));
      });
      return els;
    },
  },
  {
    id: 'math.frequency-table', name: 'Sıklık tablosu', category: 'matematik',
    keywords: ['sıklık', 'siklik', 'tablo', 'veri', 'frekans', 'sayma', 'toplam'],
    params: parameters(),
    build: params => {
      const ns = values(params), els: BoardEl[] = [];
      const rows = [['Grup', 'Sıklık'], ...ns.map((n, i) => [['A', 'B', 'C', 'D'][i], String(n)]), ['Toplam', String(ns.reduce((a, b) => a + b, 0))]];
      rows.forEach((row, i) => row.forEach((text, col) => els.push(box(20 + col * 190, 20 + i * 65, 190, 65, i === 0 || i === rows.length - 1 ? '#e6f1e9' : '#ffffff'), label(25 + col * 190, 28 + i * 65, 180, 50, text, 25))));
      els.push(label(20, 435, 380, 60, 'Örnek veri — değerleri değiştirin', 22));
      return els;
    },
  },
  {
    id: 'math.pictograph', name: 'Nesne grafiği (bir sembol = 2)', category: 'matematik',
    keywords: ['nesne grafiği', 'şekil grafiği', 'sekil grafigi', 'piktogram', 'grafik', 'veri', 'sembol'],
    params: parameters(2),
    build: params => {
      // Whole symbols only; each represents exactly two objects.
      const ns = values(params).map(n => Math.min(10, Math.round(n / 2) * 2));
      const els: BoardEl[] = [label(20, 0, 600, 55, 'Bir daire = 2 nesne', 28)];
      ns.forEach((n, i) => {
        const y = 80 + i * 80;
        els.push(box(20, y, 80, 70, '#e6f1e9'), label(25, y + 10, 70, 50, ['A', 'B', 'C', 'D'][i], 27), box(100, y, 410, 70), box(510, y, 90, 70), label(515, y + 10, 80, 50, String(n), 25));
        for (let j = 0; j < n / 2; j++) els.push({ id: newId(), type: 'ellipse', x1: 120 + j * 75, y1: y + 18, x2: 154 + j * 75, y2: y + 52, color: '#25634b', width: 2, fill: '#75ab8b' });
      });
      els.push(label(20, 425, 600, 55, 'Örnek veri — yalnızca çift sayılar', 23));
      return els;
    },
  },
];
