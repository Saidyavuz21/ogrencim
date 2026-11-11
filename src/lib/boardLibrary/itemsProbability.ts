import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 23): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const box = (x: number, y: number, w: number, h: number, fill = '#ffffff'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: '#a4b1a6', width: 2, fill, rx: 0 });
const integer = (params: Record<string, number> | undefined, key: string, fallback: number) => Math.max(0, Math.min(5, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

export const PROBABILITY_ITEMS: LibraryItem[] = [
  {
    id: 'math.probability-bag', name: 'Olasılık: renkli toplar torbası', category: 'matematik',
    keywords: ['olasılık', 'olasilik', 'torba', 'top', 'renk', 'kesir', 'rastgele'],
    params: [{ key: 'kirmizi', label: 'Kırmızı top sayısı', type: 'number', min: 0, max: 5, default: 3 }, { key: 'mavi', label: 'Mavi top sayısı', type: 'number', min: 0, max: 5, default: 2 }, { key: 'yesil', label: 'Yeşil top sayısı', type: 'number', min: 0, max: 5, default: 1 }],
    build: params => {
      const groups = [
        { n: integer(params, 'kirmizi', 3), color: '#e8c4bf', mark: 'K', name: 'Kırmızı' },
        { n: integer(params, 'mavi', 2), color: '#cce5ed', mark: 'M', name: 'Mavi' },
        { n: integer(params, 'yesil', 1), color: '#d4e6da', mark: 'Y', name: 'Yeşil' },
      ];
      const total = groups.reduce((sum, group) => sum + group.n, 0);
      const els: BoardEl[] = [box(20, 70, 420, 270, '#f7faf7'), label(20, 0, 420, 55, `Torbadaki toplam top: ${total}`, 26)];
      let i = 0;
      groups.forEach(group => {
        for (let j = 0; j < group.n; j++, i++) {
          const x = 40 + i % 5 * 80, y = 90 + Math.floor(i / 5) * 80;
          els.push({ id: newId(), type: 'ellipse', x1: x, y1: y, x2: x + 60, y2: y + 60, color: ink, width: 2, fill: group.color }, label(x + 4, y + 6, 52, 48, group.mark, 23));
        }
      });
      if (total === 0) els.push(label(40, 160, 380, 70, 'Torba boş: çekiliş yapılamaz.', 24));
      groups.forEach((group, index) => els.push(label(20, 365 + index * 55, 420, 50, `${group.mark}: ${group.name} · ${group.n} top${total > 0 ? ` · P = ${group.n}/${total}` : ''}`, 23)));
      els.push(label(20, 550, 420, 75, 'Eş büyüklükte toplardan bir top rastgele çekilir.', 22));
      return els;
    },
  },
  {
    id: 'math.two-coin-tree', name: 'İki para atışı: ağaç şeması', category: 'matematik',
    keywords: ['olasılık', 'olasilik', 'para', 'yazı', 'tura', 'ağaç', 'agac', 'örnek uzay'],
    build: () => {
      const nodes = [
        { x: 20, y: 220, text: 'Başlangıç' },
        { x: 270, y: 100, text: 'Yazı' }, { x: 270, y: 340, text: 'Tura' },
        { x: 550, y: 40, text: 'Yazı – Yazı' }, { x: 550, y: 160, text: 'Yazı – Tura' },
        { x: 550, y: 280, text: 'Tura – Yazı' }, { x: 550, y: 400, text: 'Tura – Tura' },
      ];
      const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
      const els: BoardEl[] = edges.map(([from, to]) => ({ id: newId(), type: 'arrow', x1: nodes[from].x + 170, y1: nodes[from].y + 35, x2: nodes[to].x - 10, y2: nodes[to].y + 35, color: '#25634b', width: 2 }));
      nodes.forEach(node => els.push(box(node.x, node.y, 170, 70, '#e6f1e9'), label(node.x + 5, node.y + 9, 160, 52, node.text, 23)));
      els.push(label(245, -35, 220, 50, 'Birinci atış'), label(530, -35, 210, 50, 'İki atışın sonucu'));
      return els;
    },
  },
  {
    id: 'math.two-dice-outcomes', name: 'İki zar: örnek uzay', category: 'matematik',
    keywords: ['olasılık', 'olasilik', 'zar', 'örnek uzay', 'ornek uzay', 'sıralı ikili', 'sonuç'],
    build: () => {
      const els: BoardEl[] = [label(20, 0, 700, 60, 'Satır: 1. zar · Sütun: 2. zar', 27)];
      for (let row = 0; row <= 6; row++) {
        for (let col = 0; col <= 6; col++) {
          const x = 20 + col * 100, y = 80 + row * 65;
          const text = row === 0 && col === 0 ? 'Zar' : row === 0 ? String(col) : col === 0 ? String(row) : `(${row}, ${col})`;
          els.push(box(x, y, 100, 65, row === 0 || col === 0 ? '#e6f1e9' : '#ffffff'), label(x + 4, y + 9, 92, 48, text, 21));
        }
      }
      els.push(label(20, 555, 700, 55, 'İki altı yüzlü zar için 36 sıralı sonuç vardır.', 25));
      return els;
    },
  },
];
