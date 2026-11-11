import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const line = (x1: number, y1: number, x2: number, y2: number, color = ink, arrow = false): BoardEl => ({ id: newId(), type: arrow ? 'arrow' : 'line', x1, y1, x2, y2, color, width: 3 });
const label = (x: number, y: number, w: number, h: number, text: string, size = 24): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const rect = (x: number, y: number, w: number, h: number, fill = '#e6f1e9'): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, color: ink, width: 2, fill, rx: 0 });

export const MACHINE_ITEMS: LibraryItem[] = [
  {
    id: 'science.lever', name: 'Kaldıraç (destek ortada)', category: 'fen',
    keywords: ['basit makine', 'kaldıraç', 'kaldirac', 'destek', 'yük', 'yuk', 'kuvvet'],
    build: () => [
      line(20, 300, 640, 300, '#a4b1a6'),
      { id: newId(), type: 'poly', points: [310, 200, 250, 300, 370, 300], color: ink, width: 2, fill: '#f4e8c9' },
      rect(70, 185, 480, 15, '#d4e6da'), rect(105, 115, 90, 70),
      label(100, 125, 100, 48, 'Yük'),
      line(500, 60, 500, 175, '#a33342', true), label(430, 0, 140, 48, 'Kuvvet'),
      label(235, 320, 150, 50, 'Destek'),
      label(20, 390, 620, 55, 'Destek, yük ile kuvvet arasındadır.', 25),
    ],
  },
  {
    id: 'science.inclined-plane', name: 'Eğik düzlem', category: 'fen',
    keywords: ['basit makine', 'eğik düzlem', 'egik duzlem', 'rampa', 'yük', 'yuk', 'kuvvet'],
    build: () => {
      const start = { x: 70, y: 330 }, end = { x: 540, y: 110 };
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const ux = (end.x - start.x) / length, uy = (end.y - start.y) / length;
      const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
      const ax = cx - ux * 48, ay = cy - uy * 48, bx = cx + ux * 48, by = cy + uy * 48;
      const nx = uy * 65, ny = -ux * 65;
      return [
        { id: newId(), type: 'poly', points: [start.x, start.y, end.x, start.y, end.x, end.y], color: ink, width: 2, fill: '#f4e8c9' },
        { id: newId(), type: 'poly', points: [ax, ay, bx, by, bx + nx, by + ny, ax + nx, ay + ny], color: ink, width: 2, fill: '#d4e6da' },
        label(160, 90, 110, 50, 'Yük'), line(215, 140, cx + nx / 2, cy + ny / 2),
        line(bx + nx / 2 + ux * 15, by + ny / 2 + uy * 15, bx + nx / 2 + ux * 130, by + ny / 2 + uy * 130, '#a33342', true),
        label(365, 25, 170, 50, 'Kuvvet'),
        label(235, 255, 240, 50, 'Eğik düzlem'),
        line(30, 340, 580, 340, '#a4b1a6'),
      ];
    },
  },
  {
    id: 'science.fixed-pulley', name: 'Sabit makara', category: 'fen',
    keywords: ['basit makine', 'sabit makara', 'makara', 'ip', 'yük', 'yuk', 'kuvvet', 'yön değiştirme'],
    build: () => {
      const els: BoardEl[] = [rect(120, 20, 320, 18, '#dedad0'), line(280, 38, 280, 145), { id: newId(), type: 'ellipse', x1: 225, y1: 90, x2: 335, y2: 200, color: ink, width: 3, fill: '#e6f1e9' }];
      const rope: number[] = [220, 325, 220, 145];
      for (let i = 0; i <= 40; i++) {
        const a = Math.PI - i * Math.PI / 40;
        rope.push(280 + 60 * Math.cos(a), 145 - 60 * Math.sin(a));
      }
      rope.push(340, 325);
      els.push(
        { id: newId(), type: 'stroke', points: rope, color: '#805217', width: 4 },
        { id: newId(), type: 'ellipse', x1: 272, y1: 137, x2: 288, y2: 153, color: ink, width: 2, fill: '#ffffff' },
        rect(175, 325, 90, 70), label(180, 336, 80, 48, 'Yük'),
        line(365, 250, 365, 365, '#a33342', true), label(385, 290, 145, 50, 'Kuvvet'),
        label(20, 425, 520, 60, 'Sabit makara kuvvetin yönünü değiştirir.', 25),
      );
      return els;
    },
  },
];
