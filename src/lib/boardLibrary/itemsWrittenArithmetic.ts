import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
function integer(params: Record<string, number> | undefined, key: string, fallback: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));
}

function operation(symbol: '+' | '−' | '×', a: number, b: number, result: number, title: string): BoardEl[] {
  const columns = Math.max(String(a).length, String(b).length, String(result).length);
  const width = (columns + 1) * 70;
  const els: BoardEl[] = [createText(20, 0, width, 55, title, 27, 'center', false, 'sans', ink)];
  const row = (value: number, y: number) => {
    const chars = String(value).padStart(columns, ' ');
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] !== ' ') els.push(createText(90 + i * 70, y, 65, 65, chars[i], 40, 'center', false, 'sans', ink));
    }
  };
  row(a, 75); row(b, 155);
  els.push(createText(20, 155, 65, 65, symbol, 40, 'center', false, 'sans', ink));
  els.push({ id: newId(), type: 'line', x1: 20, y1: 235, x2: 20 + width, y2: 235, color: ink, width: 3 });
  row(result, 250);
  els.push(createText(20, 350, width, 75, `${a} ${symbol} ${b} = ${result}`, 25, 'center', false, 'sans', ink));
  return els;
}

export const WRITTEN_ARITHMETIC_ITEMS: LibraryItem[] = [
  {
    id: 'math.written-addition', name: 'Dikey toplama', category: 'matematik',
    keywords: ['dikey toplama', 'toplama', 'işlem', 'islem', 'basamak', 'alt alta', 'aritmetik'],
    params: [{ key: 'birinci', label: 'Birinci toplanan', type: 'number', min: 0, max: 999, default: 247 }, { key: 'ikinci', label: 'İkinci toplanan', type: 'number', min: 0, max: 999, default: 135 }],
    build: params => { const a = integer(params, 'birinci', 247, 999), b = integer(params, 'ikinci', 135, 999); return operation('+', a, b, a + b, 'Dikey toplama'); },
  },
  {
    id: 'math.written-subtraction', name: 'Dikey çıkarma', category: 'matematik',
    keywords: ['dikey çıkarma', 'cikarma', 'çıkarma', 'işlem', 'islem', 'basamak', 'alt alta', 'aritmetik'],
    params: [{ key: 'eksilen', label: 'Eksilen', type: 'number', min: 0, max: 999, default: 432 }, { key: 'cikan', label: 'Çıkan', type: 'number', min: 0, max: 999, maxFrom: 'eksilen', default: 158 }],
    build: params => { const a = integer(params, 'eksilen', 432, 999), b = Math.min(a, integer(params, 'cikan', 158, 999)); return operation('−', a, b, a - b, 'Dikey çıkarma'); },
  },
  {
    id: 'math.written-multiplication', name: 'Tek basamaklı sayıyla çarpma', category: 'matematik',
    keywords: ['çarpma', 'carpma', 'dikey çarpma', 'işlem', 'islem', 'basamak', 'alt alta', 'aritmetik'],
    params: [{ key: 'carpilan', label: 'Çarpılan', type: 'number', min: 0, max: 999, default: 126 }, { key: 'carpan', label: 'Çarpan', type: 'number', min: 0, max: 9, default: 4 }],
    build: params => { const a = integer(params, 'carpilan', 126, 999), b = integer(params, 'carpan', 4, 9); return operation('×', a, b, a * b, 'Dikey çarpma'); },
  },
];
