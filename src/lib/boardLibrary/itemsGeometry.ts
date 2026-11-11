import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';

const ink = '#20352d';
const fills = ['#e6f1e9', '#d4e6da', '#f4e8c9'];
const line = (x1: number, y1: number, x2: number, y2: number): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color: ink, width: 2.5 });
const face = (points: number[], fill = fills[0]): BoardEl => ({ id: newId(), type: 'poly', points, color: ink, width: 2.5, fill });
const rect = (x: number, y: number, w: number, h: number, fill = fills[0]): BoardEl => ({ id: newId(), type: 'rect', x1: x, y1: y, x2: x + w, y2: y + h, rx: 0, color: ink, width: 2.5, fill });
const ellipse = (x: number, y: number, w: number, h: number): BoardEl => ({ id: newId(), type: 'ellipse', x1: x, y1: y, x2: x + w, y2: y + h, color: ink, width: 2.5, fill: fills[0] });
const item = (id: string, name: string, build: () => BoardEl[], keywords: string[]): LibraryItem => ({ id: `math.${id}`, name, category: 'matematik', keywords: ['geometri', 'geometrik cisim', 'üç boyut', '3 boyut', ...keywords], build });

function prism(w: number, h: number, d: number): BoardEl[] {
  return [
    face([20, 20 + d, 20 + d, 20, 20 + d + w, 20, 20 + w, 20 + d], fills[2]),
    rect(20, 20 + d, w, h),
    face([20 + w, 20 + d, 20 + d + w, 20, 20 + d + w, 20 + h, 20 + w, 20 + d + h], fills[1]),
  ];
}

function prismNet(w: number, h: number, d: number): BoardEl[] {
  // Four lateral faces; top/bottom share the full width of the second face.
  return [rect(20, d + 20, d, h), rect(20 + d, d + 20, w, h), rect(20 + d + w, d + 20, d, h), rect(20 + 2 * d + w, d + 20, w, h), rect(20 + d, 20, w, d, fills[2]), rect(20 + d, d + h + 20, w, d, fills[2])];
}

export const GEOMETRY_ITEMS: LibraryItem[] = [
  item('cube', 'Küp', () => prism(160, 160, 65), ['küp', 'kup']),
  item('cuboid', 'Dikdörtgenler prizması', () => prism(220, 140, 65), ['prizma', 'dikdörtgenler prizması']),
  item('cylinder', 'Silindir', () => [
    ellipse(20, 230, 180, 70),
    // Cover the upper half of the bottom ellipse with the lateral surface.
    { ...rect(20, 55, 180, 210), width: 0 },
    line(20, 55, 20, 265), line(200, 55, 200, 265),
    { id: newId(), type: 'stroke', points: Array.from({ length: 33 }, (_, i) => { const a = i * Math.PI / 32; return [110 + 90 * Math.cos(a), 265 + 35 * Math.sin(a)]; }).flat(), color: ink, width: 2.5 },
    ellipse(20, 20, 180, 70),
  ], ['silindir']),
  item('cone', 'Koni', () => [
    { ...face([130, 20, 20, 260, 240, 260]), width: 0 },
    ellipse(20, 225, 220, 70),
    line(130, 20, 20, 260), line(130, 20, 240, 260),
  ], ['koni']),
  item('square-pyramid', 'Kare piramit', () => [
    face([150, 20, 20, 240, 170, 295]),
    face([150, 20, 170, 295, 290, 215], fills[1]),
  ], ['piramit', 'kare piramit']),
  item('cube-net', 'Küp açınımı', () => prismNet(90, 90, 90), ['küp', 'kup', 'açınım', 'acinim', 'katlama']),
  item('cuboid-net', 'Dikdörtgenler prizması açınımı', () => prismNet(130, 110, 65), ['prizma', 'açınım', 'acinim', 'katlama']),
  item('cylinder-net', 'Silindir açınımı', () => {
    const r = 45;
    return [rect(20, 110, 2 * Math.PI * r, 120), ellipse(20 + Math.PI * r - r, 20, 2 * r, 2 * r), ellipse(20 + Math.PI * r - r, 230, 2 * r, 2 * r)];
  }, ['silindir', 'açınım', 'acinim', 'daire', 'dikdörtgen']),
  item('cone-net', 'Koni açınımı', () => {
    const radius = 160;
    const points = [180, 20];
    for (let i = 0; i <= 48; i++) {
      const a = Math.PI / 6 + i * (2 * Math.PI / 3) / 48;
      points.push(180 + radius * Math.cos(a), 20 + radius * Math.sin(a));
    }
    // 120° sector: its arc length equals the base circle circumference.
    const r = radius / 3;
    return [face(points), ellipse(180 - r, 180, r * 2, r * 2)];
  }, ['koni', 'açınım', 'acinim', 'daire dilimi']),
  item('square-pyramid-net', 'Kare piramit açınımı', () => {
    const a = 100, b = 220, tip = 95;
    return [rect(a, a, b - a, b - a), face([a, a, b, a, 160, a - tip], fills[2]), face([b, a, b, b, b + tip, 160], fills[1]), face([b, b, a, b, 160, b + tip], fills[2]), face([a, b, a, a, a - tip, 160], fills[1])];
  }, ['piramit', 'açınım', 'acinim', 'katlama']),
];
