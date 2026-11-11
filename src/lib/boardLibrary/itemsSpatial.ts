import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const line = (x1: number, y1: number, x2: number, y2: number, color = '#a4b1a6', width = 1.5): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color, width });
const rect = (x: number, y: number, w: number, h: number, fill = '#ffffff'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: ink, width: 2, fill, rx: 0 });
const label = (x: number, y: number, w: number, h: number, text: string, size = 24): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const integer = (params: Record<string, number> | undefined, key: string, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

export const SPATIAL_ITEMS: LibraryItem[] = [
  {
    id: 'math.abacus', name: 'Abaküs (basamak modeli)', category: 'matematik',
    keywords: ['abaküs', 'abakus', 'boncuk', 'basamak', 'sayı', 'sayi', 'binler', 'yüzler', 'onlar', 'birler'],
    params: [{ key: 'sayi', label: 'Gösterilecek sayı', type: 'number', min: 0, max: 9999, default: 2345 }],
    build: params => {
      const n = integer(params, 'sayi', 2345, 0, 9999), digits = String(n).padStart(4, '0').split('').map(Number);
      const names = ['Binler', 'Yüzler', 'Onlar', 'Birler'];
      const colors = ['#e5c783', '#d4e6da', '#cce5ed', '#e8c4bf'];
      const els: BoardEl[] = [label(20, 0, 520, 55, `Sayı: ${n}`, 30), rect(20, 380, 520, 24, '#d4e6da')];
      digits.forEach((digit, i) => {
        const x = 85 + i * 130;
        els.push(line(x, 75, x, 380, ink, 4));
        for (let bead = 0; bead < digit; bead++) els.push({ id: newId(), type: 'ellipse', x1: x - 37, y1: 350 - bead * 30, x2: x + 37, y2: 375 - bead * 30, color: ink, width: 1.5, fill: colors[i] });
        els.push(label(x - 62, 420, 124, 50, names[i], 23), label(x - 62, 470, 124, 50, String(digit), 27));
      });
      return els;
    },
  },
  {
    id: 'math.area-perimeter', name: 'Alan ve çevre modeli', category: 'matematik',
    keywords: ['alan', 'çevre', 'cevre', 'birim kare', 'dikdörtgen', 'dikdortgen', 'santimetre', 'cm'],
    params: [{ key: 'sutun', label: 'Yatay kare sayısı', type: 'number', min: 1, max: 10, default: 5 }, { key: 'satir', label: 'Dikey kare sayısı', type: 'number', min: 1, max: 8, default: 3 }],
    build: params => {
      const columns = integer(params, 'sutun', 5, 1, 10), rows = integer(params, 'satir', 3, 1, 8);
      const w = columns * 48, h = rows * 48, totalW = Math.max(420, w + 80), left = (totalW - w) / 2;
      const els: BoardEl[] = [label(0, 0, totalW, 55, 'Her karenin bir kenarı 1 cm', 24), rect(left, 85, w, h, '#e6f1e9')];
      for (let i = 1; i < columns; i++) els.push(line(left + i * 48, 85, left + i * 48, 85 + h));
      for (let i = 1; i < rows; i++) els.push(line(left, 85 + i * 48, left + w, 85 + i * 48));
      els.push(label(0, 85 + h + 8, totalW, 50, `${columns} cm`), label(0, 85 + h + 70, totalW, 55, `Alan: ${columns} × ${rows} = ${columns * rows} cm²`, 27), label(0, 85 + h + 130, totalW, 55, `Çevre: 2 × (${columns} + ${rows}) = ${2 * (columns + rows)} cm`, 24));
      return els;
    },
  },
  {
    id: 'math.symmetry-grid', name: 'Simetri tamamlama ızgarası', category: 'matematik',
    keywords: ['simetri', 'yansıma', 'yansima', 'eksen', 'ızgara', 'izgara', 'geometri', 'tamamlama'],
    build: () => {
      const els: BoardEl[] = [];
      for (let i = 0; i <= 10; i++) els.push(line(20 + i * 50, 70, 20 + i * 50, 370, '#dedad0'));
      for (let i = 0; i <= 6; i++) els.push(line(20, 70 + i * 50, 520, 70 + i * 50, '#dedad0'));
      for (let y = 65; y < 380; y += 20) els.push(line(270, y, 270, y + 12, '#a33342', 3));
      els.push(label(160, 0, 220, 50, 'Simetri ekseni', 23), { id: newId(), type: 'poly', points: [70, 120, 220, 120, 220, 170, 170, 220, 70, 220], color: '#25634b', width: 3, fill: '#d4e6da' }, label(20, 400, 500, 65, 'Şeklin simetriğini eksenin sağına çiz.', 25));
      return els;
    },
  },
];
