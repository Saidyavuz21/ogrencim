import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const label = (x: number, y: number, w: number, h: number, text: string, size = 23): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const line = (x1: number, y1: number, x2: number, y2: number, color = ink, arrow = false): BoardEl => ({ id: newId(), type: arrow ? 'arrow' : 'line', x1, y1, x2, y2, color, width: 3 });
const rect = (x: number, y: number, w: number, h: number, fill = '#e6f1e9'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: ink, width: 2, fill, rx: 0 });
const integer = (params: Record<string, number> | undefined, key: string, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

export const LIGHT_FORCE_ITEMS: LibraryItem[] = [
  {
    id: 'science.reflection', name: 'Işığın yansıması', category: 'fen',
    keywords: ['ışık', 'isik', 'yansıma', 'yansima', 'ayna', 'normal', 'gelme açısı', 'optik'],
    params: [{ key: 'aci', label: 'Normal ile gelme açısı (°)', type: 'number', min: 15, max: 70, step: 5, default: 45 }],
    build: params => {
      const angle = integer(params, 'aci', 45, 15, 70), a = angle * Math.PI / 180;
      const dx = Math.sin(a) * 240, dy = Math.cos(a) * 240;
      const els: BoardEl[] = [rect(20, 300, 600, 12, '#dedad0'), label(210, 325, 220, 50, 'Düzlem ayna')];
      for (let y = 25; y < 300; y += 24) els.push(line(320, y, 320, Math.min(y + 12, 295), '#a4b1a6'));
      els.push(line(320 - dx, 300 - dy, 320, 300, '#a33342', true), line(320, 300, 320 + dx, 300 - dy, '#25634b', true), label(235, -35, 170, 48, 'Normal'), label(10, 385, 300, 55, `Gelme açısı: ${angle}°`, 25), label(330, 385, 300, 55, `Yansıma açısı: ${angle}°`, 25));
      return els;
    },
  },
  {
    id: 'science.point-light-shadow', name: 'Noktasal ışıkla gölge oluşumu', category: 'fen',
    keywords: ['ışık', 'isik', 'gölge', 'golge', 'opak', 'perde', 'ışık kaynağı'],
    build: () => [
      rect(570, 20, 14, 320, '#dedad0'),
      { id: newId(), type: 'poly', points: [270, 140, 570, 40, 570, 340, 270, 240], color: 'transparent', width: 0, fill: '#cad1cb' },
      { id: newId(), type: 'poly', points: [120, 190, 270, 140, 270, 240], color: 'transparent', width: 0, fill: '#fff3d6' },
      line(120, 190, 270, 140, '#b48b35'), line(120, 190, 270, 240, '#b48b35'),
      line(270, 140, 570, 40, '#a4b1a6'), line(270, 240, 570, 340, '#a4b1a6'),
      { id: newId(), type: 'ellipse', x1: 105, y1: 175, x2: 135, y2: 205, color: '#805217', width: 2, fill: '#e9bd65' },
      rect(263, 140, 14, 100, '#20352d'),
      label(20, 250, 190, 80, 'Noktasal ışık kaynağı', 22),
      label(175, 45, 190, 65, 'Opak cisim'),
      label(390, 180, 150, 55, 'Gölge'),
      label(510, 365, 140, 50, 'Perde'),
    ],
  },
  {
    id: 'science.opposite-forces', name: 'Zıt yönlü kuvvetler', category: 'fen',
    keywords: ['kuvvet', 'bileşke', 'bileske', 'denge', 'zıt', 'zit', 'newton', 'net kuvvet'],
    params: [{ key: 'sol', label: 'Sola doğru kuvvet (N)', type: 'number', min: 0, max: 10, default: 3 }, { key: 'sag', label: 'Sağa doğru kuvvet (N)', type: 'number', min: 0, max: 10, default: 7 }],
    build: params => {
      const left = integer(params, 'sol', 3, 0, 10), right = integer(params, 'sag', 7, 0, 10), net = right - left;
      const els: BoardEl[] = [rect(280, 100, 120, 100), label(285, 125, 110, 50, 'Cisim'), label(10, 35, 260, 50, `Sola: ${left} N`), label(410, 35, 260, 50, `Sağa: ${right} N`)];
      if (left > 0) els.push(line(270, 150, 270 - left * 24, 150, '#a33342', true));
      if (right > 0) els.push(line(410, 150, 410 + right * 24, 150, '#25634b', true));
      els.push(label(10, 240, 660, 65, net === 0 ? 'Bileşke: 0 N — kuvvetler dengede' : `Bileşke: ${Math.abs(net)} N ${net > 0 ? 'sağa' : 'sola'}`, 27));
      if (net !== 0) els.push(line(340, 350, 340 + net * 24, 350, '#20352d', true));
      return els;
    },
  },
];
