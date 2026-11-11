import { newId, type BoardEl } from '../boardData';
import type { LibraryItem } from './types';
import { createText } from './itemsFen';

const ink = '#20352d';
const line = (x1: number, y1: number, x2: number, y2: number, width = 2): BoardEl => ({ id: newId(), type: 'line', x1, y1, x2, y2, color: ink, width });
const label = (x: number, y: number, w: number, h: number, text: string, size = 24): BoardEl => createText(x, y, w, h, text, size, 'center', false, 'sans', ink);
const integer = (params: Record<string, number> | undefined, key: string, fallback: number, max: number) => Math.max(1, Math.min(max, Math.round(Number.isFinite(params?.[key]) ? params![key] : fallback)));

function staff(x: number, y: number, w: number): BoardEl[] {
  return Array.from({ length: 5 }, (_, i) => line(x, y + i * 20, x + w, y + i * 20, 1.5));
}

function note(x: number, y: number, beats: 1 | 2 | 4): BoardEl[] {
  const els: BoardEl[] = [{ id: newId(), type: 'ellipse', x1: x - 14, y1: y - 9, x2: x + 14, y2: y + 9, color: ink, width: 2.5, fill: beats === 1 ? ink : '#ffffff' }];
  if (beats !== 4) els.push(line(x + 13, y, x + 13, y - 65, 3));
  return els;
}

export const MUSIC_ITEMS: LibraryItem[] = [
  {
    id: 'general.music-staff', name: 'Boş dizek (porte)', category: 'genel',
    keywords: ['müzik', 'muzik', 'nota', 'dizek', 'porte', 'beş çizgi', 'melodi'],
    params: [{ key: 'satir', label: 'Dizek sayısı', type: 'number', min: 1, max: 4, default: 2 }],
    build: params => Array.from({ length: integer(params, 'satir', 2, 4) }, (_, i) => staff(20, 20 + i * 155, 740)).flat(),
  },
  {
    id: 'general.note-durations', name: 'Nota süreleri (4/4)', category: 'genel',
    keywords: ['müzik', 'muzik', 'nota', 'süre', 'sure', 'vuruş', 'ritim', 'birlik', 'ikilik', 'dörtlük'],
    build: () => {
      const els: BoardEl[] = [label(20, 0, 690, 55, '4/4’lük ölçüde nota süreleri', 28)];
      ([4, 2, 1] as const).forEach((beats, i) => {
        const x = 135 + i * 230;
        els.push(...note(x, 155, beats), label(x - 100, 195, 200, 50, beats === 4 ? 'Birlik nota' : beats === 2 ? 'İkilik nota' : 'Dörtlük nota'), label(x - 100, 250, 200, 50, `${beats} vuruş`, 25));
      });
      return els;
    },
  },
  {
    id: 'general.rhythm-strip', name: 'Ritim şeridi (4/4)', category: 'genel',
    keywords: ['müzik', 'muzik', 'ritim', 'ölçü', 'olcu', 'vuruş', 'dörtlük', 'nota'],
    params: [{ key: 'olcu', label: 'Ölçü sayısı', type: 'number', min: 1, max: 4, default: 2 }],
    build: params => {
      const count = integer(params, 'olcu', 2, 4), width = 90 + count * 250;
      const els: BoardEl[] = [label(20, 0, width, 55, 'Her ölçüde dört dörtlük nota', 26), ...staff(20, 125, width), label(22, 122, 45, 46, '4', 30), label(22, 163, 45, 46, '4', 30)];
      for (let measure = 0; measure < count; measure++) {
        const x = 110 + measure * 250;
        for (let beat = 0; beat < 4; beat++) els.push(...note(x + beat * 55, 185, 1), label(x + beat * 55 - 20, 230, 40, 45, String(beat + 1), 22));
        els.push(line(x + 210, 125, x + 210, 205));
      }
      els.push(line(20, 125, 20, 205));
      return els;
    },
  },
];
