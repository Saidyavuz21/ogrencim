import { newId, type BoardEl, type ShapeEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const line = (x1: number, y1: number, x2: number, y2: number): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color: ink, width: 2.5 });
const rect = (x: number, y: number, w: number, h: number, fill = '#ffffff'): ShapeEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: ink, width: 2, fill, rx: 0 });
const poly = (points: number[], fill = '#e6f1e9'): BoardEl => ({ id: newId(), type: 'poly', points, color: ink, width: 2, fill });
const text = (x: number, y: number, w: number, value: string, size = 22) => createText(x, y, w, 46, value, size, 'center', false, 'sans', ink);
function value(params: Record<string, number> | undefined, key: string, fallback: number, max: number) {
  const raw = params?.[key];
  return Math.max(0, Math.min(max, Math.round(typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback)));
}

function weight(x: number, y: number, grams: number): BoardEl[] {
  return [
    { id: newId(), type: 'ellipse', x1: x + 27, y1: y, x2: x + 53, y2: y + 24, color: ink, width: 3, fill: null },
    poly([x + 15, y + 18, x + 65, y + 18, x + 80, y + 83, x, y + 83]),
    text(x + 2, y + 36, 76, grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`, 16),
  ];
}

export const MEASUREMENT_ITEMS: LibraryItem[] = [
  {
    id: 'math.balance-scale', name: 'Eşit kollu terazi', category: 'matematik',
    keywords: ['ölçme', 'olcme', 'terazi', 'kütle', 'kutle', 'ağırlık', 'agirlik', 'gram', 'kilogram', 'denge', 'karşılaştırma'],
    params: [
      { key: 'sol', label: 'Sol kefe (g)', type: 'number', min: 0, max: 1000, step: 50, default: 250 },
      { key: 'sag', label: 'Sağ kefe (g)', type: 'number', min: 0, max: 1000, step: 50, default: 500 },
    ],
    build: params => {
      const left = value(params, 'sol', 250, 1000), right = value(params, 'sag', 500, 1000);
      // Qualitative comparison: the heavier side hangs lower, equal masses balance.
      const tilt = left === right ? 0 : left > right ? 30 : -30;
      const ly = 75 + tilt, ry = 75 - tilt;
      return [
        poly([260, 95, 225, 320, 295, 320]), rect(175, 320, 170, 20, '#d4e6da'),
        line(80, ly, 440, ry),
        ...[[80, ly], [440, ry]].flatMap(([x, y]) => [line(x, y, x - 65, y + 140), line(x, y, x + 65, y + 140), poly([x - 70, y + 140, x + 70, y + 140, x + 45, y + 170, x - 45, y + 170], '#f4e8c9')]),
        { id: newId(), type: 'ellipse', x1: 251, y1: 66, x2: 269, y2: 84, color: ink, width: 2, fill: '#ffffff' },
        text(15, ly + 172, 130, `${left} g`), text(375, ry + 172, 130, `${right} g`),
      ];
    },
  },
  {
    id: 'math.graduated-jug', name: 'Dereceli ölçü kabı', category: 'matematik',
    keywords: ['ölçme', 'olcme', 'ölçü kabı', 'sıvı', 'sivi', 'hacim', 'mililitre', 'ml', 'litre', 'dereceli'],
    params: [{ key: 'miktar', label: 'Sıvı miktarı (mL)', type: 'number', min: 0, max: 1000, step: 100, default: 600 }],
    build: params => {
      const ml = value(params, 'miktar', 600, 1000);
      const els: BoardEl[] = [poly([230, 85, 285, 85, 285, 215, 230, 215], '#ffffff')];
      if (ml > 0) els.push({ ...rect(31, 310 - ml * .26, 198, ml * .26, '#cce5ed'), width: 0 });
      els.push(line(30, 50, 30, 310), line(30, 310, 230, 310), line(230, 310, 230, 50), line(15, 50, 245, 50));
      for (let tick = 100; tick <= 1000; tick += 100) {
        const y = 310 - tick * .26;
        els.push(line(30, y, tick % 200 === 0 ? 65 : 50, y));
        if (tick % 200 === 0 && tick < 1000) els.push(createText(70, y - 16, 110, 32, String(tick), 19, 'left', false, 'sans', ink));
      }
      els.push(text(30, -10, 200, '1000 mL', 20), text(40, 330, 180, `${ml} mL`));
      return els;
    },
  },
  {
    id: 'math.litre-model', name: 'Litre ve mililitre modeli', category: 'matematik',
    keywords: ['ölçme', 'olcme', 'litre', 'mililitre', 'hacim', 'sıvı', 'sivi', 'dönüşüm', 'donusum', 'eşitlik'],
    params: [{ key: 'bolum', label: '1 litredeki eşit kap sayısı', type: 'number', min: 2, max: 4, step: 2, default: 4 }],
    build: params => {
      const n = value(params, 'bolum', 4, 4) <= 2 ? 2 : 4;
      const els: BoardEl[] = [rect(20, 30, 130, 240, '#cce5ed'), text(15, 285, 140, '1 L'), text(165, 130, 60, '=', 34)];
      for (let i = 0; i < n; i++) {
        const x = 250 + i * 105;
        // Same width/height ratio: each cup's area represents 1/n of the litre.
        const w = 130 / Math.sqrt(n), h = 240 / Math.sqrt(n);
        els.push(rect(x, 270 - h, w, h, '#cce5ed'), text(x - 8, 285, w + 16, `${1000 / n} mL`, 17));
      }
      return els;
    },
  },
  {
    id: 'math.kilogram-model', name: 'Kilogram ve gram modeli', category: 'matematik',
    keywords: ['ölçme', 'olcme', 'kilogram', 'gram', 'kg', 'kütle', 'kutle', 'ağırlık', 'agirlik', 'dönüşüm', 'donusum'],
    params: [{ key: 'parca', label: '1 kilogramdaki eşit ağırlık sayısı', type: 'number', min: 2, max: 4, step: 2, default: 4 }],
    build: params => {
      const n = value(params, 'parca', 4, 4) <= 2 ? 2 : 4;
      return [...weight(20, 30, 1000), text(112, 48, 55, '=', 34), ...Array.from({ length: n }, (_, i) => weight(190 + i * 100, 30, 1000 / n)).flat()];
    },
  },
];
