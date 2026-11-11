import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 23): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const particle = (x: number, y: number): BoardEl => ({ id: newId(), type: 'ellipse', x1: x - 9, y1: y - 9, x2: x + 9, y2: y + 9, color: '#25634b', width: 2, fill: '#d4e6da' });

function model(state: 'solid' | 'liquid' | 'gas'): BoardEl[] {
  const title = { solid: 'Katı', liquid: 'Sıvı', gas: 'Gaz' }[state];
  const description = { solid: 'Tanecikler yakın ve düzenlidir.', liquid: 'Tanecikler yakın ve düzensizdir.', gas: 'Tanecikler birbirinden uzaktır.' }[state];
  const els: BoardEl[] = [
    label(20, 0, 340, 50, title, 30),
    { id: newId(), type: 'rect', x1: 20, y1: 65, x2: 360, y2: 355, color: '#a4b1a6', width: 2, fill: '#ffffff', rx: 0 },
  ];
  // Twenty-four particles in each model; positions are deterministic.
  for (let i = 0; i < 24; i++) {
    if (state === 'solid') {
      els.push(particle(122 + i % 6 * 27, 230 + Math.floor(i / 6) * 27));
    } else if (state === 'liquid') {
      const row = Math.floor(i / 6), col = i % 6;
      els.push(particle(80 + col * 43 + [0, 11, -7, 6][row] + (col % 2 ? 5 : -3), 230 + row * 31 + [0, 5, -3, 3, -5, 1][col]));
    } else {
      const row = Math.floor(i / 6), col = i % 6;
      els.push(particle(50 + col * 54 + [0, 7, -5, 10, -3, 0][(col + row) % 6], 100 + row * 72 + [0, 11, -8, 5, -4, 9][(col + row * 2) % 6]));
    }
  }
  els.push(label(10, 375, 360, 65, description, 23), label(10, 445, 360, 45, 'Şematik tanecik modeli', 18));
  return els;
}

export const MATTER_ITEMS: LibraryItem[] = [
  { id: 'science.solid-particles', name: 'Katı tanecik modeli', category: 'fen', keywords: ['madde', 'katı', 'kati', 'tanecik', 'maddenin halleri', 'maddenin hâlleri'], build: () => model('solid') },
  { id: 'science.liquid-particles', name: 'Sıvı tanecik modeli', category: 'fen', keywords: ['madde', 'sıvı', 'sivi', 'tanecik', 'maddenin halleri', 'maddenin hâlleri'], build: () => model('liquid') },
  { id: 'science.gas-particles', name: 'Gaz tanecik modeli', category: 'fen', keywords: ['madde', 'gaz', 'tanecik', 'maddenin halleri', 'maddenin hâlleri'], build: () => model('gas') },
  {
    id: 'science.phase-changes', name: 'Erime, donma, buharlaşma ve yoğuşma', category: 'fen',
    keywords: ['madde', 'hâl değişimi', 'hal degisimi', 'erime', 'donma', 'buharlaşma', 'buharlasma', 'yoğuşma', 'yogusma', 'ısı'],
    build: () => {
      const els: BoardEl[] = [];
      ['Katı', 'Sıvı', 'Gaz'].forEach((state, i) => {
        const x = 20 + i * 330;
        els.push({ id: newId(), type: 'rect', x1: x, y1: 140, x2: x + 180, y2: 240, color: '#a4b1a6', width: 2, fill: '#e6f1e9', rx: 10 }, label(x + 10, 158, 160, 64, state, 32));
      });
      const pairs = [['Erime', 'Donma'], ['Buharlaşma', 'Yoğuşma']];
      pairs.forEach(([heating, cooling], i) => {
        const left = 145 + i * 330, right = 405 + i * 330;
        // Separate routes leave all labels and arrow directions unobstructed.
        els.push(
          { id: newId(), type: 'stroke', points: [left, 130, left, 70, right, 70], color: '#a33342', width: 3 },
          { id: newId(), type: 'arrow', x1: right, y1: 70, x2: right, y2: 130, color: '#a33342', width: 3 },
          label(left + 15, 8, 230, 52, heating, 25),
          { id: newId(), type: 'stroke', points: [right, 250, right, 315, left, 315], color: '#25634b', width: 3 },
          { id: newId(), type: 'arrow', x1: left, y1: 315, x2: left, y2: 250, color: '#25634b', width: 3 },
          label(left + 15, 325, 230, 52, cooling, 25),
        );
      });
      els.push(label(20, 395, 840, 50, 'Üst yollar: ısı alır · Alt yollar: ısı verir', 24));
      return els;
    },
  },
];
