import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const rule = (x1: number, y1: number, x2: number, y2: number, color = '#a4b1a6'): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color, width: 1.5 });
const box = (x: number, y: number, w: number, h: number): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, rx: 0, color: '#a4b1a6', width: 2, fill: '#ffffff' });
const count = (value: number | undefined, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value! : fallback)));

export const TURKISH_ITEMS: LibraryItem[] = [
  {
    id: 'turkish.handwriting-lines', name: 'Güzel yazı çizgileri', category: 'genel',
    keywords: ['Türkçe', 'turkce', 'yazı', 'yazi', 'el yazısı', 'harf', 'defter', 'çizgili'],
    params: [{ key: 'satir', label: 'Satır sayısı', type: 'number', min: 1, max: 6, default: 3 }],
    build: params => {
      const els: BoardEl[] = [];
      for (let row = 0; row < count(params?.satir, 3, 1, 6); row++) {
        for (let i = 0; i < 4; i++) els.push(rule(20, 20 + row * 110 + i * 25, 660, 20 + row * 110 + i * 25, i === 2 ? '#b86b6b' : '#a4b1a6'));
      }
      return els;
    },
  },
  {
    id: 'turkish.syllable-boxes', name: 'Hece kutuları', category: 'genel',
    keywords: ['Türkçe', 'turkce', 'hece', 'harf', 'kelime', 'okuma', 'yazma'],
    params: [{ key: 'kutu', label: 'Kutu sayısı', type: 'number', min: 2, max: 8, default: 4 }],
    build: params => Array.from({ length: count(params?.kutu, 4, 2, 8) }, (_, i) => box(20 + i * 92, 20, 80, 80)),
  },
  {
    id: 'turkish.story-sequence', name: 'Hikâye sıralama kartları', category: 'genel',
    keywords: ['Türkçe', 'turkce', 'hikaye', 'hikâye', 'olay', 'sıralama', 'önce', 'sonra', 'anlatım'],
    build: () => ['Önce', 'Sonra', 'Sonunda'].flatMap((title, i) => [box(20 + i * 220, 20, 200, 240), createText(30 + i * 220, 30, 180, 40, title, 25, 'center', false, 'sans', ink), rule(35 + i * 220, 80, 205 + i * 220, 80), rule(35 + i * 220, 200, 205 + i * 220, 200), rule(35 + i * 220, 235, 205 + i * 220, 235)]),
  },
  {
    id: 'turkish.sentence-elements', name: 'Cümlenin ögeleri şablonu', category: 'genel',
    keywords: ['Türkçe', 'turkce', 'cümle', 'cumle', 'öge', 'öğe', 'özne', 'yüklem', 'nesne', 'dil bilgisi'],
    build: () => ['Özne', 'Yüklem', 'Nesne', 'Yer tamlayıcısı', 'Zarf tamlayıcısı'].flatMap((title, i) => [box(20, 20 + i * 65, 600, 55), createText(30, 28 + i * 65, 290, 38, title, 22, 'left', false, 'sans', ink), rule(335, 20 + i * 65, 335, 75 + i * 65)]),
  },
];
