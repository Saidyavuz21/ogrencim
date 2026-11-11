import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 24): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const circle = (cx: number, cy: number, r: number, fill: string): BoardEl => ({ id: newId(), type: 'ellipse', x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r, color: ink, width: 2, fill });

// References: science.nasa.gov/earth/facts/ and science.nasa.gov/moon/moon-phases/.
export const EARTH_SKY_ITEMS: LibraryItem[] = [
  {
    id: 'science.earth-interior', name: 'Dünya’nın iç yapısı', category: 'fen',
    keywords: ['dünya', 'dunya', 'katman', 'yer kabuğu', 'manto', 'çekirdek', 'cekirdek', 'jeoloji'],
    build: () => {
      const layers = [{ r: 190, color: '#b6cbb8', name: 'Yer kabuğu' }, { r: 174, color: '#e6b981', name: 'Manto' }, { r: 105, color: '#ce7c55', name: 'Dış çekirdek' }, { r: 50, color: '#f4d36e', name: 'İç çekirdek' }];
      const els: BoardEl[] = layers.map(layer => circle(220, 220, layer.r, layer.color));
      layers.forEach((layer, i) => els.push({ id: newId(), type: 'rect', x1: 460, y1: 65 + i * 85, x2: 495, y2: 100 + i * 85, color: ink, width: 1.5, fill: layer.color, rx: 0 }, label(510, 56 + i * 85, 220, 55, layer.name, 26)));
      els.push(label(20, 440, 710, 60, 'Şematik kesit — katman kalınlıkları ölçekli değildir.', 22));
      return els;
    },
  },
  {
    id: 'science.moon-primary-phases', name: 'Ay’ın dört ana evresi', category: 'fen',
    keywords: ['ay', 'evre', 'yeniay', 'ilk dördün', 'dolunay', 'son dördün', 'uzay', 'gök bilimi'],
    build: () => {
      const names = ['Yeniay', 'İlk dördün', 'Dolunay', 'Son dördün'];
      const els: BoardEl[] = [];
      names.forEach((name, i) => {
        const cx = 100 + i * 210, cy = 130;
        els.push(circle(cx, cy, 70, i === 2 ? '#fff3d6' : '#46564d'));
        if (i === 1 || i === 3) {
          const points: number[] = [cx, cy - 70];
          for (let j = 0; j <= 40; j++) {
            const a = -Math.PI / 2 + j * Math.PI / 40;
            points.push(cx + (i === 1 ? 1 : -1) * 70 * Math.cos(a), cy + 70 * Math.sin(a));
          }
          els.push({ id: newId(), type: 'poly', points, color: ink, width: 1, fill: '#fff3d6' });
        }
        els.push(label(cx - 95, 225, 190, 65, name, 27));
        if (i < 3) els.push({ id: newId(), type: 'arrow', x1: cx + 85, y1: cy, x2: cx + 125, y2: cy, color: '#25634b', width: 2.5 });
      });
      els.push(label(20, 315, 800, 70, 'Kuzey Yarımküre için şematik görünüm; döngü tekrar eder.', 23));
      return els;
    },
  },
  {
    id: 'general.season-cycle', name: 'Mevsim döngüsü', category: 'genel',
    keywords: ['mevsim', 'ilkbahar', 'yaz', 'sonbahar', 'kış', 'kis', 'hayat bilgisi', 'zaman', 'döngü'],
    build: () => {
      const nodes = [{ x: 270, y: 20, title: 'İlkbahar', fill: '#d4e6da' }, { x: 500, y: 190, title: 'Yaz', fill: '#fff3d6' }, { x: 270, y: 360, title: 'Sonbahar', fill: '#ead0b5' }, { x: 40, y: 190, title: 'Kış', fill: '#cce5ed' }];
      const edges = [[470, 100, 530, 175], [530, 300, 470, 360], [250, 360, 190, 300], [190, 175, 250, 100]];
      const els: BoardEl[] = edges.map(([x1, y1, x2, y2]) => ({ id: newId(), type: 'arrow', x1, y1, x2, y2, color: '#25634b', width: 3 }));
      nodes.forEach(node => els.push({ id: newId(), type: 'rect', x1: node.x, y1: node.y, x2: node.x + 190, y2: node.y + 100, color: '#a4b1a6', width: 2, fill: node.fill, rx: 12 }, label(node.x + 10, node.y + 20, 170, 60, node.title, 29)));
      els.push(label(20, 495, 700, 60, 'Mevsimler sırayla tekrar eder.', 27));
      return els;
    },
  },
];
