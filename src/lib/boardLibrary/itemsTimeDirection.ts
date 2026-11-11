import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const box = (x: number, y: number, w: number, h: number, fill = '#ffffff'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: '#a4b1a6', width: 1.5, fill, rx: 0 });
const label = (x: number, y: number, w: number, h: number, text: string, size = 22): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
function integer(params: Record<string, number> | undefined, key: string, fallback: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));
}

export const TIME_DIRECTION_ITEMS: LibraryItem[] = [
  {
    id: 'general.compass', name: 'Yön pusulası', category: 'genel',
    keywords: ['yön', 'yon', 'pusula', 'kuzey', 'güney', 'doğu', 'batı', 'sosyal bilgiler', 'hayat bilgisi', 'coğrafya'],
    build: () => {
      const els: BoardEl[] = [{ id: newId(), type: 'ellipse', x1: 110, y1: 110, x2: 410, y2: 410, color: '#dedad0', width: 2, fill: null }];
      const directions = ['Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı'];
      directions.forEach((name, i) => {
        const a = (i * 45 - 90) * Math.PI / 180;
        const radius = i % 2 === 0 ? 165 : 130;
        els.push({ id: newId(), type: 'arrow', x1: 260, y1: 260, x2: 260 + radius * Math.cos(a), y2: 260 + radius * Math.sin(a), color: i === 0 ? '#25634b' : ink, width: i % 2 === 0 ? 4 : 2 });
        els.push(label(260 + 220 * Math.cos(a) - 80, 260 + 220 * Math.sin(a) - 25, 160, 50, name, i % 2 === 0 ? 25 : 20));
      });
      els.push({ id: newId(), type: 'ellipse', x1: 250, y1: 250, x2: 270, y2: 270, color: ink, width: 2, fill: '#e6f1e9' });
      return els;
    },
  },
  {
    id: 'general.month-calendar', name: 'Aylık takvim', category: 'genel',
    keywords: ['takvim', 'ay', 'yıl', 'yil', 'hafta', 'gün', 'gun', 'tarih', 'zaman', 'hayat bilgisi'],
    params: [{ key: 'yil', label: 'Yıl', type: 'number', min: 2000, max: 2100, default: 2026 }, { key: 'ay', label: 'Ay (1–12)', type: 'number', min: 1, max: 12, default: 11 }],
    build: params => {
      const year = integer(params, 'yil', 2026, 2000, 2100), month = integer(params, 'ay', 11, 1, 12);
      const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
      const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const rows = Math.ceil((offset + count) / 7);
      const els: BoardEl[] = [label(20, 0, 770, 60, `${months[month - 1]} ${year}`, 32)];
      days.forEach((day, col) => { els.push(box(20 + col * 110, 70, 110, 50, col < 5 ? '#e6f1e9' : '#f4e8c9'), label(22 + col * 110, 73, 106, 44, day, 17)); });
      for (let cell = 0; cell < rows * 7; cell++) {
        const x = 20 + cell % 7 * 110, y = 120 + Math.floor(cell / 7) * 70, date = cell - offset + 1;
        els.push(box(x, y, 110, 70));
        if (date >= 1 && date <= count) els.push(label(x + 5, y + 7, 100, 55, String(date), 26));
      }
      return els;
    },
  },
  {
    id: 'general.week-planner', name: 'Haftalık plan', category: 'genel',
    keywords: ['haftalık', 'haftalik', 'plan', 'program', 'ders', 'takvim', 'zaman', 'hafta'],
    params: [{ key: 'satir', label: 'Gün başına satır', type: 'number', min: 3, max: 8, default: 5 }],
    build: params => {
      const rows = integer(params, 'satir', 5, 3, 8);
      const els: BoardEl[] = [label(20, 0, 840, 60, 'Haftalık plan', 32)];
      days.forEach((day, col) => {
        const x = 20 + col * 120;
        els.push(box(x, 70, 120, 55, col < 5 ? '#e6f1e9' : '#f4e8c9'), label(x + 4, 76, 112, 44, day, 18));
        for (let row = 0; row < rows; row++) els.push(box(x, 125 + row * 65, 120, 65));
      });
      return els;
    },
  },
];
