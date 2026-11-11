import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

function card(x: number, y: number, w: number, h: number, title: string): BoardEl[] {
  return [
    { id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: '#a4b1a6', width: 2, fill: '#ffffff', rx: 8 },
    { id: newId(), type: 'rect', x1: x + 1, y1: y + 1, x2: x + w - 1, y2: y + 55, color: '#d4e6da', width: 0, fill: '#e6f1e9', rx: 0 },
    createText(x + 10, y + 7, w - 20, 44, title, 25, 'center', false, 'sans', '#20352d'),
    { id: newId(), type: 'line', x1: x + 15, y1: y + h - 28, x2: x + w - 15, y2: y + h - 28, color: '#dedad0', width: 1.5 },
  ];
}

export const LITERACY_ITEMS: LibraryItem[] = [
  {
    id: 'turkish.five-w-one-h', name: '5N1K şeması', category: 'genel',
    keywords: ['Türkçe', 'turkce', '5n1k', 'okuduğunu anlama', 'soru', 'kim', 'ne', 'nerede', 'ne zaman', 'nasıl', 'niçin'],
    build: () => ['Ne?', 'Nerede?', 'Ne zaman?', 'Nasıl?', 'Niçin?', 'Kim?'].flatMap((title, i) => card(20 + i % 3 * 245, 20 + Math.floor(i / 3) * 205, 225, 180, title)),
  },
  {
    id: 'turkish.story-map', name: 'Hikâye haritası', category: 'genel',
    keywords: ['Türkçe', 'turkce', 'hikâye', 'hikaye', 'harita', 'karakter', 'yer', 'zaman', 'olay', 'okuma', 'yazma'],
    build: () => [
      ...card(20, 20, 720, 110, 'Hikâyenin adı'),
      ...card(20, 150, 225, 160, 'Karakterler'),
      ...card(265, 150, 230, 160, 'Yer'),
      ...card(515, 150, 225, 160, 'Zaman'),
      ...card(20, 330, 350, 190, 'Sorun / olay'),
      ...card(390, 330, 350, 190, 'Çözüm / sonuç'),
    ],
  },
  {
    id: 'turkish.cause-effect', name: 'Neden–sonuç şablonu', category: 'genel',
    keywords: ['Türkçe', 'turkce', 'neden', 'sonuç', 'sonuc', 'sebep', 'ilişki', 'cümle', 'anlama'],
    build: () => [
      ...card(20, 20, 300, 230, 'Neden'),
      { id: newId(), type: 'arrow', x1: 340, y1: 135, x2: 420, y2: 135, color: '#25634b', width: 4 },
      ...card(440, 20, 300, 230, 'Sonuç'),
      createText(20, 280, 720, 55, 'Bir olayın nedenini ve sonucunu yaz.', 26, 'center', false, 'sans', '#20352d'),
    ],
  },
];
