import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const line = (x1: number, y1: number, x2: number, y2: number, arrow = false): BoardEl => ({ id: newId(), type: arrow ? 'arrow' : 'line', x1, y1, x2, y2, color: ink, width: 2.5 });
const text = (x: number, y: number, w: number, h: number, value: string, size = 24): BoardEl => createText(x, y, w, h, value, size, 'center', false, 'sans', ink);

function cycle(stages: { name: string; description: string }[]): BoardEl[] {
  const positions = [[20, 20], [390, 20], [390, 260], [20, 260]];
  const els: BoardEl[] = [];
  stages.forEach((stage, i) => {
    const [x, y] = positions[i];
    els.push(
      { id: newId(), type: 'rect', x1: x, y1: y, x2: x + 270, y2: y + 150, color: '#a4b1a6', width: 2, fill: i % 2 === 0 ? '#e6f1e9' : '#f4e8c9', rx: 12 },
      text(x + 10, y + 10, 250, 52, stage.name, 27),
      text(x + 15, y + 70, 240, 68, stage.description, 20),
    );
  });
  return [...els, line(305, 95, 375, 95, true), line(525, 185, 525, 245, true), line(375, 335, 305, 335, true), line(155, 245, 155, 185, true)];
}

export const BIOLOGY_ITEMS: LibraryItem[] = [
  {
    id: 'science.plant-parts', name: 'Çiçekli bitkinin bölümleri', category: 'fen',
    keywords: ['bitki', 'çiçek', 'cicek', 'kök', 'kok', 'gövde', 'govde', 'yaprak', 'biyoloji', 'canlılar'],
    build: () => {
      const els: BoardEl[] = [
        // Ground and stem, followed by schematic leaves and roots.
        line(180, 300, 500, 300),
        { id: newId(), type: 'line', x1: 340, y1: 110, x2: 340, y2: 330, color: '#25634b', width: 8 },
        { id: newId(), type: 'poly', points: [340, 220, 275, 160, 220, 170, 270, 220], color: '#25634b', width: 2, fill: '#d4e6da' },
        { id: newId(), type: 'poly', points: [340, 185, 400, 130, 455, 140, 405, 185], color: '#25634b', width: 2, fill: '#d4e6da' },
        line(340, 330, 300, 375), line(340, 330, 380, 375), line(340, 330, 340, 405), line(320, 352, 275, 360), line(360, 352, 410, 365),
      ];
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, x = 340 + 30 * Math.cos(a), y = 90 + 30 * Math.sin(a);
        els.push({ id: newId(), type: 'ellipse', x1: x - 22, y1: y - 22, x2: x + 22, y2: y + 22, color: '#805217', width: 2, fill: '#f4e8c9' });
      }
      els.push(
        { id: newId(), type: 'ellipse', x1: 320, y1: 70, x2: 360, y2: 110, color: '#805217', width: 2, fill: '#e9bd65' },
        line(200, 85, 280, 85), text(20, 59, 165, 52, 'Çiçek'),
        line(465, 155, 515, 155), text(525, 129, 160, 52, 'Yaprak'),
        line(190, 260, 330, 260), text(20, 234, 160, 52, 'Gövde'),
        line(420, 365, 515, 365), text(525, 339, 160, 52, 'Kök'),
      );
      return els;
    },
  },
  {
    id: 'science.butterfly-cycle', name: 'Kelebeğin yaşam döngüsü', category: 'fen',
    keywords: ['kelebek', 'yaşam döngüsü', 'yasam dongusu', 'başkalaşım', 'baskalasim', 'tırtıl', 'pupa', 'canlılar'],
    build: () => cycle([
      { name: 'Yumurta', description: 'Yaprak üzerine bırakılır.' },
      { name: 'Larva (tırtıl)', description: 'Beslenir ve büyür.' },
      { name: 'Pupa', description: 'Başkalaşım geçirir.' },
      { name: 'Ergin kelebek', description: 'Ürer ve yumurta bırakır.' },
    ]),
  },
  {
    id: 'science.frog-cycle', name: 'Kurbağanın yaşam döngüsü', category: 'fen',
    keywords: ['kurbağa', 'kurbaga', 'yaşam döngüsü', 'yasam dongusu', 'başkalaşım', 'iribaş', 'iribas', 'canlılar'],
    build: () => cycle([
      { name: 'Yumurta', description: 'Gelişim suda başlar.' },
      { name: 'İribaş', description: 'Kuyruğu ve solungaçları vardır.' },
      { name: 'Genç kurbağa', description: 'Bacakları gelişir, kuyruğu kısalır.' },
      { name: 'Ergin kurbağa', description: 'Ürer ve yumurta bırakır.' },
    ]),
  },
];
