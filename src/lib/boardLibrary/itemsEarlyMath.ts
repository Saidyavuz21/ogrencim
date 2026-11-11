import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 26): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const line = (x1: number, y1: number, x2: number, y2: number): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color: '#a4b1a6', width: 3 });
const number = (params: Record<string, number> | undefined, key: string, fallback: number, max = 50) => Math.max(0, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

function brick(x: number, y: number, value: number): BoardEl[] {
  return [{ id: newId(), type: 'rect', x1: x, y1: y, x2: x + 150, y2: y + 70, color: '#a4b1a6', width: 2, fill: '#e6f1e9', rx: 0 }, label(x + 5, y + 8, 140, 54, String(value), 30)];
}

function bubble(cx: number, cy: number, value: number): BoardEl[] {
  return [{ id: newId(), type: 'ellipse', x1: cx - 55, y1: cy - 55, x2: cx + 55, y2: cy + 55, color: '#25634b', width: 3, fill: '#e6f1e9' }, label(cx - 45, cy - 27, 90, 54, String(value), 32)];
}

export const EARLY_MATH_ITEMS: LibraryItem[] = [
  {
    id: 'math.ten-frame', name: 'Onluk çerçeve', category: 'matematik',
    keywords: ['onluk', 'çerçeve', 'cerceve', 'sayma', 'sayı', 'sayi', 'toplama', 'ilk sınıf', 'boncuk'],
    params: [{ key: 'kapasite', label: 'Çerçeve kapasitesi (10 veya 20)', type: 'number', min: 10, max: 20, step: 10, default: 10 }, { key: 'dolu', label: 'Dolu hücre sayısı', type: 'number', min: 0, max: 20, maxFrom: 'kapasite', default: 7 }],
    build: params => {
      const capacity = number(params, 'kapasite', 10, 20) <= 10 ? 10 : 20;
      const filled = Math.min(capacity, number(params, 'dolu', 7, 20)), els: BoardEl[] = [];
      for (let i = 0; i < capacity; i++) {
        const x = 20 + i % 5 * 64, y = 20 + Math.floor(i / 10) * 170 + Math.floor(i % 10 / 5) * 64;
        els.push({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + 64, y2: y + 64, color: '#a4b1a6', width: 2, fill: '#ffffff', rx: 0 });
        if (i < filled) els.push({ id: newId(), type: 'ellipse', x1: x + 12, y1: y + 12, x2: x + 52, y2: y + 52, color: '#25634b', width: 2, fill: '#75ab8b' });
      }
      els.push(label(20, capacity === 10 ? 170 : 340, 320, 55, `${filled} dolu · ${capacity - filled} boş`, 24));
      return els;
    },
  },
  {
    id: 'math.number-bonds', name: 'Sayı bağları (parça–bütün)', category: 'matematik',
    keywords: ['sayı bağı', 'sayi bagi', 'parça', 'parca', 'bütün', 'butun', 'toplama', 'ayrıştırma', 'ayristirma'],
    params: [{ key: 'sol', label: 'Birinci parça', type: 'number', min: 0, max: 50, default: 7 }, { key: 'sag', label: 'İkinci parça', type: 'number', min: 0, max: 50, default: 3 }],
    build: params => {
      const a = number(params, 'sol', 7), b = number(params, 'sag', 3);
      return [line(260, 80, 130, 250), line(260, 80, 390, 250), ...bubble(260, 80, a + b), ...bubble(130, 250, a), ...bubble(390, 250, b), label(20, 330, 480, 55, `${a} + ${b} = ${a + b}`, 30)];
    },
  },
  {
    id: 'math.addition-pyramid', name: 'Toplama piramidi', category: 'matematik',
    keywords: ['toplama', 'piramit', 'sayı', 'sayi', 'işlem', 'islem', 'toplam'],
    params: ['sol', 'orta', 'sag'].map((key, i) => ({ key, label: ['Sol alt sayı', 'Orta alt sayı', 'Sağ alt sayı'][i], type: 'number' as const, min: 0, max: 50, default: i + 2 })),
    build: params => {
      const a = number(params, 'sol', 2), b = number(params, 'orta', 3), c = number(params, 'sag', 4);
      return [...brick(170, 20, a + 2 * b + c), ...brick(95, 90, a + b), ...brick(245, 90, b + c), ...brick(20, 160, a), ...brick(170, 160, b), ...brick(320, 160, c), label(20, 255, 450, 85, 'Her kutu, altındaki iki sayının toplamıdır.', 25)];
    },
  },
];
